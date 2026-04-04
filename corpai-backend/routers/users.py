"""
CorpAI — Router de Usuários.
CRUD de usuários (admin vê tudo; lider_setor gerencia apenas seu setor).
"""

import logging
import uuid
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from models.user import User
from middleware.auth import get_current_user, require_role, TokenData

logger = logging.getLogger(__name__)
router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Schemas ─────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str
    password: str
    nome_completo: str
    setor: str
    role: str = "colaborador"


class UserUpdate(BaseModel):
    nome_completo: Optional[str] = None
    setor: Optional[str] = None
    role: Optional[str] = None
    ativo: Optional[bool] = None
    password: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    username: str
    nome_completo: str
    setor: str
    role: str
    ativo: bool
    criado_em: str

    class Config:
        from_attributes = True


class SetorInfo(BaseModel):
    nome: str
    total_usuarios: int


# ─── Dependência do banco ───────────────────────────────────
async def get_db():
    from main import async_session

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


# ─── Endpoints ───────────────────────────────────────────────
@router.get(
    "/",
    response_model=List[UserResponse],
    summary="Listar usuários",
)
async def listar_usuarios(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin", "lider_setor"])),
):
    """Lista usuários. Admin vê todos; líder de setor vê apenas seu setor."""
    query = select(User).order_by(User.criado_em.desc())

    if current_user.role == "lider_setor":
        query = query.where(User.setor == current_user.setor)

    result = await db.execute(query)
    users = result.scalars().all()

    return [
        UserResponse(
            id=str(u.id),
            username=u.username,
            nome_completo=u.nome_completo,
            setor=u.setor,
            role=u.role,
            ativo=u.ativo,
            criado_em=u.criado_em.isoformat(),
        )
        for u in users
    ]


@router.post(
    "/",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Criar novo usuário",
)
async def criar_usuario(
    data: UserCreate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin", "lider_setor"])),
):
    """Cria um novo usuário. Líder de setor só cria colaboradores no próprio setor."""

    # Líder de setor: restringir ao próprio setor e apenas colaboradores
    if current_user.role == "lider_setor":
        if data.setor != current_user.setor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode criar usuários no seu próprio setor.",
            )
        if data.role != "colaborador":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode criar usuários com o papel 'colaborador'.",
            )

    # Validar setor
    if data.setor not in settings.SETORES_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Setor inválido. Setores válidos: {', '.join(settings.SETORES_VALIDOS)}",
        )

    # Validar role
    if data.role not in settings.ROLES_VALIDOS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role inválido. Roles válidos: {', '.join(settings.ROLES_VALIDOS)}",
        )

    # Verificar se username já existe
    result = await db.execute(select(User).where(User.username == data.username))
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este nome de usuário já está em uso.",
        )

    # Criar usuário
    user = User(
        username=data.username,
        hashed_password=pwd_context.hash(data.password),
        nome_completo=data.nome_completo,
        setor=data.setor,
        role=data.role,
        ativo=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    logger.info(
        "Novo usuário criado.",
        extra={"username": data.username, "setor": data.setor, "role": data.role},
    )

    return UserResponse(
        id=str(user.id),
        username=user.username,
        nome_completo=user.nome_completo,
        setor=user.setor,
        role=user.role,
        ativo=user.ativo,
        criado_em=user.criado_em.isoformat(),
    )


@router.put("/{user_id}", response_model=UserResponse, summary="Editar usuário")
async def editar_usuario(
    user_id: str,
    data: UserUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin", "lider_setor"])),
):
    """Edita um usuário. Líder de setor só edita colaboradores do próprio setor."""
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )

    # Líder de setor: só edita usuários do seu setor, não pode promover
    if current_user.role == "lider_setor":
        if user.setor != current_user.setor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode editar usuários do seu setor.",
            )
        if data.role is not None and data.role != "colaborador":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode atribuir o papel 'colaborador'.",
            )
        if data.setor is not None and data.setor != current_user.setor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não pode mover usuários para outro setor.",
            )

    if data.nome_completo is not None:
        user.nome_completo = data.nome_completo
    if data.setor is not None:
        if data.setor not in settings.SETORES_VALIDOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Setor inválido. Setores válidos: {', '.join(settings.SETORES_VALIDOS)}",
            )
        user.setor = data.setor
    if data.role is not None:
        if data.role not in settings.ROLES_VALIDOS:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Role inválido. Roles válidos: {', '.join(settings.ROLES_VALIDOS)}",
            )
        user.role = data.role
    if data.ativo is not None:
        user.ativo = data.ativo
    if data.password is not None:
        user.hashed_password = pwd_context.hash(data.password)

    await db.commit()
    await db.refresh(user)

    logger.info(
        "Usuário editado.",
        extra={"user_id": user_id, "admin": current_user.username},
    )

    return UserResponse(
        id=str(user.id),
        username=user.username,
        nome_completo=user.nome_completo,
        setor=user.setor,
        role=user.role,
        ativo=user.ativo,
        criado_em=user.criado_em.isoformat(),
    )


@router.delete("/{user_id}", summary="Deletar usuário")
async def deletar_usuario(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin", "lider_setor"])),
):
    """Remove um usuário. Líder de setor só remove colaboradores do próprio setor."""
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )

    # Não permitir deletar a si mesmo
    if str(user.id) == current_user.user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Você não pode deletar seu próprio usuário.",
        )

    # Líder de setor: só deleta colaboradores do seu setor
    if current_user.role == "lider_setor":
        if user.setor != current_user.setor:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode remover usuários do seu setor.",
            )
        if user.role != "colaborador":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você só pode remover colaboradores.",
            )

    await db.delete(user)
    await db.commit()

    logger.info(
        "Usuário deletado.",
        extra={"user_id": user_id, "username": user.username},
    )

    return {"mensagem": f"Usuário '{user.username}' removido com sucesso."}


@router.get(
    "/setores",
    response_model=List[SetorInfo],
    summary="Listar setores com contagem de usuários",
)
async def listar_setores(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin", "lider_setor"])),
):
    """Lista todos os setores com a contagem de usuários em cada um."""
    result = await db.execute(
        select(User.setor, func.count(User.id).label("total"))
        .group_by(User.setor)
        .order_by(User.setor)
    )
    rows = result.all()

    setores = []
    for setor_nome in settings.SETORES_VALIDOS:
        total = 0
        for row in rows:
            if row[0] == setor_nome:
                total = row[1]
                break
        setores.append(SetorInfo(nome=setor_nome, total_usuarios=total))

    return setores


@router.get("/me", response_model=UserResponse, summary="Dados do usuário logado")
async def meu_perfil(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Retorna os dados do usuário atualmente autenticado."""
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(current_user.user_id))
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuário não encontrado.",
        )

    return UserResponse(
        id=str(user.id),
        username=user.username,
        nome_completo=user.nome_completo,
        setor=user.setor,
        role=user.role,
        ativo=user.ativo,
        criado_em=user.criado_em.isoformat(),
    )
