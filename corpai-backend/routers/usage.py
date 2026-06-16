"""
CorpAI — Router de Uso (consumo de tokens).

Relatórios agregados de consumo. Lê a tabela append-only `usage_events`.
Três recortes:

  GET /api/usage/by-user   -> consumo por usuário
  GET /api/usage/by-setor  -> consumo por setor (o "por empresa" mais próximo
                              que o modelo de dados atual permite)
  GET /api/usage/summary   -> total geral

Acesso por papel:
  - admin   -> vê o deploy inteiro (todos os setores).
  - gerente -> vê SOMENTE o próprio setor (recorte extraído do JWT, nunca do
               request). É o "admin de setor" enxergando o gasto do seu setor.

Todos aceitam janela de datas opcional:  ?desde=YYYY-MM-DD&ate=YYYY-MM-DD
(`ate` é inclusivo no dia).
"""

import logging
from datetime import datetime, date, time, timedelta
from typing import List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from middleware.auth import require_role, TokenData
from models.usage import UsageEvent

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Dependência do banco (mesmo padrão dos outros routers) ──
async def get_db():
    from main import async_session

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


# ─── Schemas de resposta ─────────────────────────────────────
class UsoPorUsuario(BaseModel):
    user_id: str
    username: str
    setor: str
    requisicoes: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class UsoPorSetor(BaseModel):
    setor: str
    usuarios: int
    requisicoes: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class UsoTotal(BaseModel):
    requisicoes: int
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    desde: Optional[str] = None
    ate: Optional[str] = None


# ─── Helpers de janela de datas ──────────────────────────────
def _intervalo(
    desde: Optional[str], ate: Optional[str]
) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    Converte ?desde / ?ate (YYYY-MM-DD) em [inicio, fim) datetime.

    `ate` é inclusivo no dia: vira o início do dia seguinte (limite exclusivo).
    Datas malformadas -> 400.
    """
    inicio: Optional[datetime] = None
    fim: Optional[datetime] = None
    try:
        if desde:
            inicio = datetime.combine(date.fromisoformat(desde), time.min)
        if ate:
            fim = datetime.combine(date.fromisoformat(ate) + timedelta(days=1), time.min)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Datas devem estar no formato YYYY-MM-DD.",
        )
    return inicio, fim


def _aplicar_janela(stmt, inicio: Optional[datetime], fim: Optional[datetime]):
    if inicio is not None:
        stmt = stmt.where(UsageEvent.criado_em >= inicio)
    if fim is not None:
        stmt = stmt.where(UsageEvent.criado_em < fim)
    return stmt


def _escopo_setor(current_user: TokenData) -> Optional[str]:
    """
    Define o recorte de setor conforme o papel:
      - admin   -> None (vê o deploy inteiro, todos os setores)
      - gerente -> o PRÓPRIO setor, extraído do JWT (nunca do request)

    Assim o mesmo endpoint serve a gestão geral (admin) e a gestão de setor
    (gerente) sem vazar dados de outros setores.
    """
    return None if current_user.role == "admin" else current_user.setor


def _aplicar_escopo(stmt, setor_filtro: Optional[str]):
    if setor_filtro is not None:
        stmt = stmt.where(UsageEvent.setor == setor_filtro)
    return stmt


# Somas reutilizadas (coalesce p/ nunca retornar NULL quando não há linhas).
_SUM_PROMPT = func.coalesce(func.sum(UsageEvent.prompt_tokens), 0)
_SUM_COMPLETION = func.coalesce(func.sum(UsageEvent.completion_tokens), 0)
_SUM_TOTAL = func.coalesce(func.sum(UsageEvent.total_tokens), 0)


# ─── Endpoints ───────────────────────────────────────────────
@router.get(
    "/by-user",
    response_model=List[UsoPorUsuario],
    summary="Consumo de tokens por usuário (admin: todos; gerente: próprio setor)",
)
async def uso_por_usuario(
    desde: Optional[str] = Query(None, description="YYYY-MM-DD"),
    ate: Optional[str] = Query(None, description="YYYY-MM-DD (inclusivo)"),
    current_user: TokenData = Depends(require_role(["admin", "gerente"])),
    db: AsyncSession = Depends(get_db),
):
    """Soma de tokens agrupada por usuário, do maior consumo para o menor."""
    inicio, fim = _intervalo(desde, ate)
    setor_filtro = _escopo_setor(current_user)

    stmt = (
        select(
            UsageEvent.user_id,
            func.max(UsageEvent.username).label("username"),
            func.max(UsageEvent.setor).label("setor"),
            func.count().label("requisicoes"),
            _SUM_PROMPT.label("prompt_tokens"),
            _SUM_COMPLETION.label("completion_tokens"),
            _SUM_TOTAL.label("total_tokens"),
        )
        .group_by(UsageEvent.user_id)
        .order_by(_SUM_TOTAL.desc())
    )
    stmt = _aplicar_janela(stmt, inicio, fim)
    stmt = _aplicar_escopo(stmt, setor_filtro)

    rows = (await db.execute(stmt)).all()
    return [
        UsoPorUsuario(
            user_id=str(r.user_id),
            username=r.username or "",
            setor=r.setor or "",
            requisicoes=r.requisicoes,
            prompt_tokens=r.prompt_tokens,
            completion_tokens=r.completion_tokens,
            total_tokens=r.total_tokens,
        )
        for r in rows
    ]


@router.get(
    "/by-setor",
    response_model=List[UsoPorSetor],
    summary="Consumo de tokens por setor (admin: todos; gerente: próprio setor)",
)
async def uso_por_setor(
    desde: Optional[str] = Query(None, description="YYYY-MM-DD"),
    ate: Optional[str] = Query(None, description="YYYY-MM-DD (inclusivo)"),
    current_user: TokenData = Depends(require_role(["admin", "gerente"])),
    db: AsyncSession = Depends(get_db),
):
    """
    Soma de tokens agrupada por setor. Para admin é o recorte mais próximo de
    "por empresa"; para gerente, retorna apenas a linha do seu próprio setor.
    """
    inicio, fim = _intervalo(desde, ate)
    setor_filtro = _escopo_setor(current_user)

    stmt = (
        select(
            UsageEvent.setor,
            func.count(func.distinct(UsageEvent.user_id)).label("usuarios"),
            func.count().label("requisicoes"),
            _SUM_PROMPT.label("prompt_tokens"),
            _SUM_COMPLETION.label("completion_tokens"),
            _SUM_TOTAL.label("total_tokens"),
        )
        .group_by(UsageEvent.setor)
        .order_by(_SUM_TOTAL.desc())
    )
    stmt = _aplicar_janela(stmt, inicio, fim)
    stmt = _aplicar_escopo(stmt, setor_filtro)

    rows = (await db.execute(stmt)).all()
    return [
        UsoPorSetor(
            setor=r.setor or "",
            usuarios=r.usuarios,
            requisicoes=r.requisicoes,
            prompt_tokens=r.prompt_tokens,
            completion_tokens=r.completion_tokens,
            total_tokens=r.total_tokens,
        )
        for r in rows
    ]


@router.get(
    "/summary",
    response_model=UsoTotal,
    summary="Consumo total (admin: deploy inteiro; gerente: próprio setor)",
)
async def uso_total(
    desde: Optional[str] = Query(None, description="YYYY-MM-DD"),
    ate: Optional[str] = Query(None, description="YYYY-MM-DD (inclusivo)"),
    current_user: TokenData = Depends(require_role(["admin", "gerente"])),
    db: AsyncSession = Depends(get_db),
):
    """Total geral — para admin é a instalação inteira; para gerente, só o seu setor."""
    inicio, fim = _intervalo(desde, ate)
    setor_filtro = _escopo_setor(current_user)

    stmt = select(
        func.count().label("requisicoes"),
        _SUM_PROMPT.label("prompt_tokens"),
        _SUM_COMPLETION.label("completion_tokens"),
        _SUM_TOTAL.label("total_tokens"),
    )
    stmt = _aplicar_janela(stmt, inicio, fim)
    stmt = _aplicar_escopo(stmt, setor_filtro)

    r = (await db.execute(stmt)).one()
    return UsoTotal(
        requisicoes=r.requisicoes,
        prompt_tokens=r.prompt_tokens,
        completion_tokens=r.completion_tokens,
        total_tokens=r.total_tokens,
        desde=desde,
        ate=ate,
    )
