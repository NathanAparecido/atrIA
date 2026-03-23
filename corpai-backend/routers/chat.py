"""
CorpAI — Router de Chat.
Endpoint principal de chat com SSE streaming e histórico persistido.
"""

import logging
import json
import uuid
from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from middleware.auth import get_current_user, TokenData
from models.conversation import Conversation, Message
from services.rag import executar_pipeline_rag

logger = logging.getLogger(__name__)
router = APIRouter()


# ─── Schemas ─────────────────────────────────────────────────
class ChatRequest(BaseModel):
    mensagem: str
    conversation_id: Optional[str] = None


class ConversationResponse(BaseModel):
    id: str
    titulo: str
    criado_em: str
    atualizado_em: str


class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    criado_em: str


# ─── Dependência do banco ───────────────────────────────────
async def get_db():
    from main import async_session

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


# ─── Endpoints ───────────────────────────────────────────────
@router.post("/", summary="Enviar mensagem no chat (SSE)")
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """
    Endpoint principal de chat com streaming SSE.
    O namespace é SEMPRE extraído do JWT do usuário.
    Combina busca no setor do usuário + namespace global.
    """
    setor = current_user.setor  # Nunca do request, sempre do JWT

    # Buscar ou criar conversa
    conversa = None
    if request.conversation_id:
        result = await db.execute(
            select(Conversation).where(
                Conversation.id == uuid.UUID(request.conversation_id),
                Conversation.user_id == uuid.UUID(current_user.user_id),
            )
        )
        conversa = result.scalar_one_or_none()

        if conversa is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversa não encontrada.",
            )

    if conversa is None:
        # Criar nova conversa com título baseado na primeira mensagem
        titulo = request.mensagem[:80] + ("..." if len(request.mensagem) > 80 else "")
        conversa = Conversation(
            user_id=uuid.UUID(current_user.user_id),
            setor=setor,
            titulo=titulo,
        )
        db.add(conversa)
        await db.commit()
        await db.refresh(conversa)

    # Salvar mensagem do usuário
    msg_usuario = Message(
        conversation_id=conversa.id,
        role="user",
        content=request.mensagem,
    )
    db.add(msg_usuario)
    await db.commit()

    # Carregar histórico da conversa
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversa.id)
        .order_by(Message.criado_em.asc())
    )
    mensagens = result.scalars().all()

    historico = [
        {"role": m.role, "content": m.content}
        for m in mensagens[:-1]  # Excluir a própria mensagem recém-adicionada
    ]

    # Gerar resposta via SSE streaming
    async def gerar_sse():
        """Generator SSE que streama a resposta e persiste no banco."""
        resposta_completa = ""
        conversa_id = str(conversa.id)

        # Enviar o ID da conversa primeiro
        yield f"data: {json.dumps({'type': 'info', 'conversation_id': conversa_id})}\n\n"

        try:
            async for chunk in executar_pipeline_rag(
                query=request.mensagem,
                setor=setor,
                historico=historico,
            ):
                resposta_completa += chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

        except Exception as e:
            logger.error(
                "Erro durante streaming da resposta.",
                extra={"erro": str(e), "conversa_id": conversa_id},
            )
            yield f"data: {json.dumps({'type': 'error', 'content': 'Erro ao gerar resposta.'})}\n\n"

        # Persistir a resposta completa no banco
        async with (await _get_new_session()) as session:
            msg_assistente = Message(
                conversation_id=uuid.UUID(conversa_id),
                role="assistant",
                content=resposta_completa,
            )
            session.add(msg_assistente)
            await session.commit()

        # Sinalizar fim da resposta
        yield f"data: {json.dumps({'type': 'done', 'conversation_id': conversa_id})}\n\n"

    return StreamingResponse(
        gerar_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _get_new_session():
    """Retorna uma nova sessão de banco (para uso no generator SSE)."""
    from main import async_session
    return async_session()


@router.get(
    "/conversations",
    response_model=List[ConversationResponse],
    summary="Listar conversas do usuário",
)
async def listar_conversas(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Lista todas as conversas do usuário autenticado."""
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == uuid.UUID(current_user.user_id))
        .order_by(Conversation.atualizado_em.desc())
    )
    conversas = result.scalars().all()

    return [
        ConversationResponse(
            id=str(c.id),
            titulo=c.titulo,
            criado_em=c.criado_em.isoformat(),
            atualizado_em=c.atualizado_em.isoformat(),
        )
        for c in conversas
    ]


@router.get(
    "/conversations/{conversation_id}",
    response_model=List[MessageResponse],
    summary="Histórico de uma conversa",
)
async def obter_conversa(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Retorna o histórico completo de mensagens de uma conversa."""
    # Verificar que a conversa pertence ao usuário
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == uuid.UUID(current_user.user_id),
        )
    )
    conversa = result.scalar_one_or_none()

    if conversa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversa não encontrada.",
        )

    # Carregar mensagens
    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conversa.id)
        .order_by(Message.criado_em.asc())
    )
    mensagens = result.scalars().all()

    return [
        MessageResponse(
            id=str(m.id),
            role=m.role,
            content=m.content,
            criado_em=m.criado_em.isoformat(),
        )
        for m in mensagens
    ]


@router.delete(
    "/conversations/{conversation_id}",
    summary="Deletar conversa",
)
async def deletar_conversa(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Remove uma conversa e todas as suas mensagens."""
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == uuid.UUID(conversation_id),
            Conversation.user_id == uuid.UUID(current_user.user_id),
        )
    )
    conversa = result.scalar_one_or_none()

    if conversa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversa não encontrada.",
        )

    await db.delete(conversa)
    await db.commit()

    return {"mensagem": "Conversa removida com sucesso."}
