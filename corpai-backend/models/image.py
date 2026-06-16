"""
CorpAI — Modelo de Imagem da base de conhecimento (SQLAlchemy).

Uma imagem entra na base com uma DESCRIÇÃO textual obrigatória — é a descrição
que vira embedding (chunk do tipo `image`) no Chroma, no namespace do setor. O
arquivo em si nunca é servido publicamente: só via endpoint autenticado.
"""

import uuid
from datetime import datetime

from sqlalchemy import Column, String, Text, DateTime
from sqlalchemy.dialects.postgresql import UUID
from models import Base


class Image(Base):
    """Tabela de imagens recuperáveis pelo RAG."""

    __tablename__ = "images"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    setor = Column(String(50), nullable=False, index=True)
    # Vínculo opcional com um documento (não é FK do Chroma; é o document_id lógico).
    document_id = Column(String, nullable=True, index=True)
    nome_arquivo = Column(String, nullable=False)   # nome original (exibição/match com .md)
    arquivo = Column(String, nullable=False)        # nome físico no disco: {uuid}.{ext}
    mime = Column(String, nullable=False)
    descricao = Column(Text, nullable=False)        # obrigatória — é o que vira embedding
    criado_por = Column(UUID(as_uuid=True), nullable=False)
    criado_em = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return f"<Image(id='{self.id}', setor='{self.setor}', arquivo='{self.nome_arquivo}')>"
