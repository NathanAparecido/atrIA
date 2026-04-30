"""
CorpAI — Pipeline RAG (Retrieval-Augmented Generation).
Embed query → busca ChromaDB (setor + global) → monta prompt com contexto → gera resposta via Ollama.
"""

import logging
from typing import AsyncGenerator, List, Dict, Any

from services.chroma import chroma_service
from services.ollama import ollama_service
from config import settings

logger = logging.getLogger(__name__)

# Prompt de sistema para o assistente corporativo
SYSTEM_PROMPT = """Você é a liminai, assistente de inteligência artificial interna da empresa.
Sua função é responder perguntas dos colaboradores com base na documentação interna da empresa.

REGRAS IMPORTANTES:
1. Responda SEMPRE em português brasileiro (PT-BR).
2. Use APENAS as informações do contexto fornecido para responder.
3. Se a informação não estiver no contexto, diga claramente: "Não encontrei essa informação na base de conhecimento."
4. Nunca invente informações que não estejam no contexto.
5. Seja objetivo, claro e profissional nas respostas.
6. Sempre cite o título do documento de onde veio cada informação, usando o formato: *Fonte: [Título do Documento]*.
7. Use formatação Markdown para estruturar suas respostas quando apropriado.
8. Se a pergunta for ambígua, peça esclarecimento ao usuário."""


def montar_prompt_rag(
    query: str,
    contextos: List[Dict[str, Any]],
    historico: List[Dict[str, str]] = None,
) -> str:
    """
    Monta o prompt final com o contexto RAG.

    Args:
        query: Pergunta do usuário
        contextos: Documentos recuperados do ChromaDB
        historico: Mensagens anteriores da conversa (opcional)

    Returns:
        Prompt formatado com contexto
    """
    # Montar seção de contexto
    contexto_texto = ""
    if contextos:
        contexto_texto = "### DOCUMENTOS RELEVANTES:\n\n"
        for i, ctx in enumerate(contextos, 1):
            meta = ctx.get("metadata", {})
            titulo_doc = meta.get("titulo") or meta.get("nome_arquivo", "Documento")
            namespace = ctx.get("namespace", "desconhecido")
            contexto_texto += f"**[{i}] {titulo_doc}** (setor: {namespace}):\n"
            contexto_texto += f"{ctx['documento']}\n\n"
    else:
        contexto_texto = "### DOCUMENTOS RELEVANTES:\nNenhum documento relevante encontrado na base de conhecimento.\n\n"

    # Montar histórico se houver
    historico_texto = ""
    if historico and len(historico) > 0:
        historico_texto = "### HISTÓRICO DA CONVERSA:\n\n"
        # Últimas 5 mensagens para não exceder o contexto
        for msg in historico[-10:]:
            role_label = "Usuário" if msg["role"] == "user" else "liminai"
            historico_texto += f"**{role_label}:** {msg['content']}\n\n"

    # Montar prompt final
    prompt = f"""{contexto_texto}{historico_texto}### PERGUNTA DO USUÁRIO:
{query}

### INSTRUÇÃO:
Com base nos documentos relevantes acima, responda a pergunta do usuário de forma clara e objetiva em PT-BR."""

    return prompt


async def executar_pipeline_rag(
    query: str,
    setor: str,
    historico: List[Dict[str, str]] = None,
) -> AsyncGenerator[str, None]:
    """
    Executa o pipeline RAG completo com streaming.

    1. Gera embedding da query via Ollama (nomic-embed-text)
    2. Busca no ChromaDB (namespace do setor + global)
    3. Monta o prompt com contexto
    4. Gera resposta via Ollama (qwen2.5:72b) com streaming

    Args:
        query: Pergunta do usuário
        setor: Setor do usuário (extraído do JWT)
        historico: Histórico de mensagens da conversa

    Yields:
        Chunks de texto da resposta
    """
    logger.info(
        "Iniciando pipeline RAG.",
        extra={"setor": setor, "query_length": len(query)},
    )

    # 1. Gerar embedding da query
    try:
        query_embedding = await ollama_service.generate_embedding(query)
    except Exception as e:
        logger.error("Erro ao gerar embedding da query.", extra={"erro": str(e)})
        yield "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente."
        return

    # 2. Buscar documentos relevantes no ChromaDB
    try:
        contextos = chroma_service.query(
            namespace=setor,
            query_embedding=query_embedding,
            n_results=settings.RAG_TOP_K,
        )
    except Exception as e:
        logger.warning(
            "Erro ao buscar no ChromaDB, respondendo sem contexto.",
            extra={"erro": str(e)},
        )
        contextos = []

    # 3. Montar prompt com contexto
    prompt = montar_prompt_rag(query, contextos, historico)

    # 4. Gerar resposta com streaming
    try:
        async for chunk in ollama_service.generate_response(
            prompt=prompt,
            system_prompt=SYSTEM_PROMPT,
            stream=True,
        ):
            yield chunk
    except Exception as e:
        logger.error("Erro ao gerar resposta do LLM.", extra={"erro": str(e)})
        yield "\n\nDesculpe, ocorreu um erro ao gerar a resposta. Tente novamente."


def chunkear_texto(texto: str) -> List[str]:
    """
    Divide o texto em chunks com overlap.

    Args:
        texto: Texto completo do documento

    Returns:
        Lista de chunks de texto
    """
    chunk_size = settings.CHUNK_SIZE
    overlap = settings.CHUNK_OVERLAP
    chunks = []

    if len(texto) <= chunk_size:
        return [texto] if texto.strip() else []

    inicio = 0
    while inicio < len(texto):
        fim = inicio + chunk_size
        chunk = texto[inicio:fim]

        if chunk.strip():
            chunks.append(chunk.strip())

        inicio += chunk_size - overlap

    return chunks
