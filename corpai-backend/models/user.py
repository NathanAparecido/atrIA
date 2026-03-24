"""
CorpAI — Modelo de Usuário (SQLAlchemy).
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from models import Base


class User(Base):
    """Tabela de usuários do sistema CorpAI."""

    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username = Column(String(100), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    nome_completo = Column(String(200), nullable=False, default="")
    setor = Column(String(50), nullable=False, index=True)
    role = Column(String(20), nullable=False, default="colaborador")
    ativo = Column(Boolean, default=True, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<User(username='{self.username}', setor='{self.setor}', role='{self.role}')>"
