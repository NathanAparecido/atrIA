"""
CorpAI — Router de Autenticação.
Login, refresh token, logout.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.user import User
from middleware.auth import (
    criar_access_token,
    criar_refresh_token,
    verificar_token,
    TokenResponse,
    get_current_user,
    TokenData,
)

logger = logging.getLogger(__name__)
router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ─── Schemas ─────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


# ─── Dependência do banco ───────────────────────────────────
async def get_db():
    from main import async_session

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


# ─── Endpoints ───────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse, summary="Login do usuário")
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Autentica o usuário e retorna access_token + refresh_token."""

    # Buscar usuário no banco
    result = await db.execute(select(User).where(User.username == request.username))
    user = result.scalar_one_or_none()

    if user is None or not pwd_context.verify(request.password, user.hashed_password):
        logger.warning(
            "Tentativa de login inválida.",
            extra={"username": request.username},
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha inválidos.",
        )

    if not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Sua conta está desativada. Contate o administrador.",
        )

    # Gerar tokens
    access_token = criar_access_token(
        user_id=str(user.id),
        username=user.username,
        setor=user.setor,
        role=user.role,
    )
    refresh_token = criar_refresh_token(user_id=str(user.id))

    logger.info(
        "Login realizado com sucesso.",
        extra={"username": user.username, "setor": user.setor},
    )

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/refresh", response_model=TokenResponse, summary="Renovar token")
async def refresh_token(request: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Renova o access_token usando um refresh_token válido."""
    from jose import jwt, JWTError
    from config import settings

    try:
        payload = jwt.decode(
            request.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if user_id is None or token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido.",
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido ou expirado.",
        )

    # Buscar usuário atualizado
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    import uuid

    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()

    if user is None or not user.ativo:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado ou desativado.",
        )

    # Gerar novos tokens
    access_token = criar_access_token(
        user_id=str(user.id),
        username=user.username,
        setor=user.setor,
        role=user.role,
    )
    new_refresh_token = criar_refresh_token(user_id=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
    )


@router.post("/logout", summary="Logout do usuário")
async def logout(current_user: TokenData = Depends(get_current_user)):
    """
    Realiza o logout do usuário.
    Nota: Com JWT stateless, o logout é feito no lado do cliente
    removendo o token. Este endpoint apenas confirma a ação.
    """
    logger.info(
        "Logout realizado.",
        extra={"username": current_user.username},
    )
    return {"mensagem": "Logout realizado com sucesso."}
