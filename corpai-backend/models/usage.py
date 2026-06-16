"""
CorpAI — Modelo de Evento de Uso (SQLAlchemy).

Registro append-only de consumo de tokens, UMA linha por geração de resposta
do LLM. Desacoplado de `conversations`/`messages` DE PROPÓSITO: deletar uma
conversa NÃO apaga o histórico de uso — governança e capacidade não podem
depender da retenção do chat.

Os contadores vêm dos campos que o Ollama devolve no chunk final (`done: true`):
  - `prompt_eval_count`  -> prompt_tokens     (tokens de entrada)
  - `eval_count`         -> completion_tokens (tokens de saída)
São tokens REAIS do modelo, não estimativa.

Os campos user_id / username / setor são DENORMALIZADOS (cópia no momento do
evento) justamente para o registro sobreviver à exclusão do usuário ou da
conversa de origem.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from models import Base


class UsageEvent(Base):
    """Uma linha por geração de resposta do LLM (consumo de tokens)."""

    __tablename__ = "usage_events"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    # Quem consumiu — denormalizado (sobrevive à exclusão do user/conversa).
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    username = Column(String(100), nullable=False, default="")
    setor = Column(String(50), nullable=False, index=True)

    # Rastreabilidade — referência FRACA (sem ForeignKey/cascade de propósito):
    # pode apontar para uma conversa/mensagem que já foi deletada.
    conversation_id = Column(UUID(as_uuid=True), nullable=True, index=True)
    message_id = Column(UUID(as_uuid=True), nullable=True)

    # Qual modelo gerou (ex.: "qwen2.5:72b"). Importa quando você tiver >1 modelo.
    model = Column(String(100), nullable=False, default="")

    # Contadores REAIS vindos do Ollama.
    prompt_tokens = Column(Integer, nullable=False, default=0)       # prompt_eval_count
    completion_tokens = Column(Integer, nullable=False, default=0)   # eval_count
    total_tokens = Column(Integer, nullable=False, default=0)        # soma (gravada p/ não recalcular)

    # Duração total da chamada em ms (Ollama devolve em ns). Útil p/ capacidade.
    duracao_ms = Column(Integer, nullable=False, default=0)

    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    def __repr__(self):
        return (
            f"<UsageEvent(user='{self.username}', setor='{self.setor}', "
            f"total={self.total_tokens})>"
        )
