"""
CorpAI — Router de Prompts de Sistema.
Edição do prompt de sistema (padrão + override por setor). Apenas admin.
Mudanças valem na próxima mensagem — não exigem rebuild.
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from middleware.auth import require_role, TokenData
from models.prompt_config import PromptConfig
from services.prompts import DEFAULT_SETOR, DEFAULT_SYSTEM_PROMPT

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────
class PromptItem(BaseModel):
    setor: str                      # "__default__" ou nome do setor
    conteudo: str                   # "" quando não há prompt armazenado
    definido: bool                  # há linha salva no banco?
    atualizado_por: Optional[str] = None
    atualizado_em: Optional[str] = None


class PromptsResponse(BaseModel):
    builtin_default: str            # prompt embutido no código (para "restaurar")
    default_setor: str              # sentinela do padrão ("__default__")
    itens: List[PromptItem]


class PromptUpdate(BaseModel):
    setor: str
    conteudo: str


# ─── Dependência do banco ───────────────────────────────────
async def get_db():
    from main import async_session

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


def _escopos_validos() -> List[str]:
    """Padrão + todos os setores válidos."""
    return [DEFAULT_SETOR] + list(settings.SETORES_VALIDOS)


# ─── Endpoints ───────────────────────────────────────────────
@router.get("/", response_model=PromptsResponse, summary="Listar prompts (padrão + setores)")
async def listar_prompts(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin"])),
):
    """Retorna o prompt built-in, o padrão e os overrides por setor."""
    result = await db.execute(select(PromptConfig))
    salvos = {p.setor: p for p in result.scalars().all()}

    itens: List[PromptItem] = []
    for escopo in _escopos_validos():
        p = salvos.get(escopo)
        itens.append(PromptItem(
            setor=escopo,
            conteudo=p.conteudo if p else "",
            definido=p is not None,
            atualizado_por=p.atualizado_por if p else None,
            atualizado_em=p.atualizado_em.isoformat() if p else None,
        ))

    return PromptsResponse(
        builtin_default=DEFAULT_SYSTEM_PROMPT,
        default_setor=DEFAULT_SETOR,
        itens=itens,
    )


@router.put("/", response_model=PromptItem, summary="Salvar/limpar prompt de um escopo")
async def salvar_prompt(
    data: PromptUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin"])),
):
    """
    Upsert do prompt de um escopo (`__default__` ou setor).

    Conteúdo vazio remove a linha: o padrão volta ao built-in; um setor volta a
    herdar o padrão. Vale já na próxima mensagem do chat.
    """
    if data.setor not in _escopos_validos():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Escopo inválido. Use '{DEFAULT_SETOR}' ou um setor válido.",
        )

    result = await db.execute(select(PromptConfig).where(PromptConfig.setor == data.setor))
    existente = result.scalar_one_or_none()

    # Conteúdo vazio => limpar (reverte ao padrão/built-in).
    if not data.conteudo.strip():
        if existente:
            await db.delete(existente)
            await db.commit()
        logger.info("Prompt limpo (revertido).", extra={"escopo": data.setor, "admin": current_user.username})
        return PromptItem(setor=data.setor, conteudo="", definido=False)

    if existente:
        existente.conteudo = data.conteudo
        existente.atualizado_por = current_user.username
    else:
        existente = PromptConfig(
            setor=data.setor,
            conteudo=data.conteudo,
            atualizado_por=current_user.username,
        )
        db.add(existente)

    await db.commit()
    await db.refresh(existente)

    logger.info("Prompt salvo.", extra={"escopo": data.setor, "admin": current_user.username})
    return PromptItem(
        setor=existente.setor,
        conteudo=existente.conteudo,
        definido=True,
        atualizado_por=existente.atualizado_por,
        atualizado_em=existente.atualizado_em.isoformat(),
    )
