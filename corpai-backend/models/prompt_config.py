"""
CorpAI — Modelo de configuração de prompt de sistema (SQLAlchemy).

Guarda o prompt de sistema editável pela UI. Uma linha por escopo:
- `__default__`: prompt padrão, usado por todos os setores;
- `<setor>`: override opcional que prevalece sobre o padrão para aquele setor.

Ausência de linha => cai no padrão e, na ausência deste, no built-in do código.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from models import Base


class PromptConfig(Base):
    """Prompt de sistema por escopo (padrão ou setor)."""

    __tablename__ = "prompt_configs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    # "__default__" para o padrão global, ou o nome do setor para um override.
    setor = Column(String(50), unique=True, nullable=False, index=True)
    conteudo = Column(Text, nullable=False, default="")
    atualizado_por = Column(String(100), nullable=False, default="")
    atualizado_em = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    def __repr__(self):
        return f"<PromptConfig(setor='{self.setor}')>"
