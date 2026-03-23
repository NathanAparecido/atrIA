"""
CorpAI — Modelos de Conversa e Mensagem (SQLAlchemy).
Histórico de conversas persistido, vinculado ao user_id e setor.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Conversation(Base):
    """Tabela de conversas do chat."""

    __tablename__ = "conversations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    setor = Column(String(50), nullable=False, index=True)
    titulo = Column(String(300), nullable=False, default="Nova conversa")
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)
    atualizado_em = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False
    )

    # Relacionamento com mensagens
    mensagens = relationship("Message", back_populates="conversa", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Conversation(id='{self.id}', titulo='{self.titulo}')>"


class Message(Base):
    """Tabela de mensagens dentro de uma conversa."""

    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    role = Column(String(20), nullable=False)  # "user" ou "assistant"
    content = Column(Text, nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relacionamento com conversa
    conversa = relationship("Conversation", back_populates="mensagens")

    def __repr__(self):
        return f"<Message(role='{self.role}', conv='{self.conversation_id}')>"
