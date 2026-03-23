"""
CorpAI — Middleware de Autenticação JWT.
Validação de token, extração de setor e role do usuário.
O namespace é SEMPRE extraído do JWT, nunca do request.
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel

from config import settings

logger = logging.getLogger(__name__)

# Esquema de segurança Bearer
security = HTTPBearer()


class TokenData(BaseModel):
    """Dados extraídos do token JWT."""
    user_id: str
    username: str
    setor: str
    role: str


class TokenResponse(BaseModel):
    """Resposta de autenticação com tokens."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


def criar_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Cria um token JWT com os dados informados."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def criar_access_token(user_id: str, username: str, setor: str, role: str) -> str:
    """Cria access token com dados do usuário."""
    return criar_token(
        {
            "sub": user_id,
            "username": username,
            "setor": setor,
            "role": role,
            "type": "access",
        },
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def criar_refresh_token(user_id: str) -> str:
    """Cria refresh token com validade estendida."""
    return criar_token(
        {"sub": user_id, "type": "refresh"},
        timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def verificar_token(token: str) -> TokenData:
    """Verifica e decodifica o token JWT."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        username = payload.get("username")
        setor = payload.get("setor")
        role = payload.get("role")
        token_type = payload.get("type")

        if user_id is None or token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token inválido ou expirado.",
            )

        return TokenData(
            user_id=user_id,
            username=username,
            setor=setor,
            role=role,
        )

    except JWTError as e:
        logger.warning("Falha na verificação do token JWT.", extra={"erro": str(e)})
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
        )


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> TokenData:
    """Dependency que retorna os dados do usuário autenticado."""
    return verificar_token(credentials.credentials)


def require_role(allowed_roles: List[str]):
    """
    Dependency factory que verifica se o usuário tem um dos roles permitidos.
    
    Uso:
        @router.get("/admin", dependencies=[Depends(require_role(["admin"]))])
    """
    async def role_checker(
        current_user: TokenData = Depends(get_current_user),
    ) -> TokenData:
        if current_user.role not in allowed_roles:
            logger.warning(
                "Acesso negado por role insuficiente.",
                extra={
                    "username": current_user.username,
                    "role": current_user.role,
                    "roles_necessarios": allowed_roles,
                },
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Você não tem permissão para acessar este recurso.",
            )
        return current_user

    return role_checker
