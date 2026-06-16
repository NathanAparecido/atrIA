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
from services.ratelimit import aplicar_rate_limit
from models.conversation import Conversation, Message
from models.image import Image
from models.usage import UsageEvent
from services.rag import executar_pipeline_rag
from services.prompts import obter_prompt_efetivo

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
    # Imagens anexadas à resposta (lista de {image_id, nome_arquivo, descricao}).
    images: Optional[List[dict]] = None


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
    current_user: TokenData = Depends(aplicar_rate_limit),
):
    """
    Endpoint principal de chat com streaming SSE.
    O namespace é SEMPRE extraído do JWT do usuário.
    Combina busca no setor do usuário + namespace global.
    """
    # Teto de tamanho da entrada: rejeita prompts gigantes (proteção da GPU).
    if len(request.mensagem) > settings.MAX_INPUT_CHARS:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"Mensagem muito longa (máx. {settings.MAX_INPUT_CHARS} caracteres).",
        )

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

    # Resolver o prompt de sistema efetivo para o setor (override > padrão > built-in).
    # Feito aqui, com a sessão ainda aberta, antes de iniciar o streaming.
    system_prompt = await obter_prompt_efetivo(db, setor)

    # Gerar resposta via SSE streaming
    async def gerar_sse():
        """Generator SSE que streama a resposta e persiste no banco."""
        resposta_completa = ""
        imagens_resposta: List[dict] = []
        usage_data: Optional[dict] = None
        conversa_id = str(conversa.id)

        # Enviar o ID da conversa primeiro
        yield f"data: {json.dumps({'type': 'info', 'conversation_id': conversa_id})}\n\n"

        try:
            async for item in executar_pipeline_rag(
                query=request.mensagem,
                setor=setor,
                historico=historico,
                system_prompt=system_prompt,
            ):
                if item["kind"] == "image_ids":
                    # Resolver IDs → registros, re-autorizar e emitir antes do texto.
                    imagens_resposta = await _resolver_imagens(
                        item["data"], setor, current_user.role
                    )
                    if imagens_resposta:
                        yield f"data: {json.dumps({'type': 'images', 'images': imagens_resposta})}\n\n"
                elif item["kind"] == "usage":
                    # Não vai para o cliente — guardado p/ persistir após o stream.
                    usage_data = item["data"]
                else:  # kind == "text"
                    chunk = item["data"]
                    resposta_completa += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"

        except Exception as e:
            logger.error(
                "Erro durante streaming da resposta.",
                extra={"erro": str(e), "conversa_id": conversa_id},
            )
            yield f"data: {json.dumps({'type': 'error', 'content': 'Erro ao gerar resposta.'})}\n\n"

        # Persistir a resposta completa no banco (com imagens, se houver)
        async with (await _get_new_session()) as session:
            msg_assistente = Message(
                conversation_id=uuid.UUID(conversa_id),
                role="assistant",
                content=resposta_completa,
                images=json.dumps(imagens_resposta) if imagens_resposta else None,
            )
            session.add(msg_assistente)
            await session.commit()
            await session.refresh(msg_assistente)

            # Registrar consumo de tokens (append-only, desacoplado do chat).
            # Só grava se o Ollama devolveu o metadado (geração concluída).
            if usage_data:
                prompt_tokens = int(usage_data.get("prompt_tokens", 0) or 0)
                completion_tokens = int(usage_data.get("completion_tokens", 0) or 0)
                evento_uso = UsageEvent(
                    user_id=uuid.UUID(current_user.user_id),
                    username=current_user.username,
                    setor=setor,
                    conversation_id=uuid.UUID(conversa_id),
                    message_id=msg_assistente.id,
                    model=usage_data.get("model", ""),
                    prompt_tokens=prompt_tokens,
                    completion_tokens=completion_tokens,
                    total_tokens=prompt_tokens + completion_tokens,
                    duracao_ms=int((usage_data.get("total_duration_ns", 0) or 0) / 1_000_000),
                )
                session.add(evento_uso)
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


async def _resolver_imagens(image_ids: List[str], setor: str, role: str) -> List[dict]:
    """
    Resolve IDs de imagem (vindos do retrieval) para o payload do SSE, com
    re-autorização (defesa em profundidade): só inclui imagens do setor do
    usuário, do `global`, ou qualquer uma se admin. Preserva a ordem de entrada.
    """
    ids_uuid = []
    for x in image_ids:
        try:
            ids_uuid.append(uuid.UUID(x))
        except (ValueError, AttributeError):
            continue
    if not ids_uuid:
        return []

    async with (await _get_new_session()) as session:
        result = await session.execute(select(Image).where(Image.id.in_(ids_uuid)))
        por_id = {str(i.id): i for i in result.scalars().all()}

    payload: List[dict] = []
    for x in image_ids:
        img = por_id.get(str(x))
        if img and (role == "admin" or img.setor == setor or img.setor == "global"):
            payload.append({
                "image_id": str(img.id),
                "nome_arquivo": img.nome_arquivo,
                "descricao": img.descricao,
            })
    return payload


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
            images=json.loads(m.images) if m.images else None,
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
