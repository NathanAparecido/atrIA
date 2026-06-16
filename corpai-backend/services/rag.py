"""
CorpAI — Pipeline RAG (Retrieval-Augmented Generation).
Embed query → busca ChromaDB (setor + global) → monta prompt com contexto → gera resposta via Ollama.
"""

import logging
import re
from datetime import date, timedelta
from typing import AsyncGenerator, List, Dict, Any, Optional

from services.chroma import chroma_service
from services.ollama import ollama_service
from services.prompts import DEFAULT_SYSTEM_PROMPT
from config import settings

logger = logging.getLogger(__name__)

# Linha de heading Markdown (# até ######). A unidade de chunk é a seção.
_HEADING_RE = re.compile(r"^(#{1,6})\s+(.*\S)\s*$")
# Fronteira de sentença: ponto/!/? seguido de espaço. Usada só como último
# recurso, quando um único parágrafo excede o teto — nunca corta no meio.
_SENTENCA_RE = re.compile(r"(?<=[.!?])\s+")

# Ordinal de data (YYYYMMDD) usado para "nunca vence": documentos sem
# `valido_ate` recebem este valor em `valido_ate_ord`, ficando sempre elegíveis
# no filtro `$gte hoje` (o Chroma só aplica range a campos numéricos e exclui
# registros sem a chave — por isso o sentinela em vez de campo ausente).
DATA_ORD_SEM_VENCIMENTO = 99991231

# Janela (em dias) para considerar uma revisão "próxima do vencimento" e
# sinalizá-la na resposta.
DIAS_ALERTA_VENCIMENTO = 30


def data_para_ordinal(iso: str) -> int:
    """Converte uma data ISO `YYYY-MM-DD` no ordinal inteiro YYYYMMDD.

    Strings vazias ou inválidas viram `DATA_ORD_SEM_VENCIMENTO` (nunca vence).
    """
    if not iso:
        return DATA_ORD_SEM_VENCIMENTO
    try:
        ano, mes, dia = iso.split("-")
        return int(ano) * 10000 + int(mes) * 100 + int(dia)
    except (ValueError, AttributeError):
        return DATA_ORD_SEM_VENCIMENTO


def _data_ordinal(d: date) -> int:
    return d.year * 10000 + d.month * 100 + d.day


def _hoje_ordinal() -> int:
    return _data_ordinal(date.today())


def montar_filtro_busca(
    setor: Optional[str] = None,
    tipo: Optional[str] = None,
    sistema: Optional[str] = None,
    incluir_vencidos: bool = False,
) -> Optional[Dict[str, Any]]:
    """
    Monta a cláusula `where` do Chroma para a busca.

    Por padrão exclui documentos vencidos (`valido_ate_ord >= hoje`); documentos
    sem `valido_ate` carregam o sentinela `DATA_ORD_SEM_VENCIMENTO` e continuam
    elegíveis. Filtros opcionais por `setor`, `tipo` e `sistema` são aplicados
    quando informados. Retorna `None` quando não há nenhuma condição.
    """
    condicoes: List[Dict[str, Any]] = []

    if not incluir_vencidos:
        condicoes.append({"valido_ate_ord": {"$gte": _hoje_ordinal()}})
    if setor:
        condicoes.append({"setor": setor})
    if tipo:
        condicoes.append({"tipo": tipo})
    if sistema:
        condicoes.append({"sistema": sistema})

    if not condicoes:
        return None
    if len(condicoes) == 1:
        return condicoes[0]
    return {"$and": condicoes}


# Prompt de sistema built-in. O texto canônico vive em services/prompts.py
# (fonte única, usada como fallback e como "restaurar padrão" na UI).
SYSTEM_PROMPT = DEFAULT_SYSTEM_PROMPT


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
        hoje_ord = _hoje_ordinal()
        alerta_ord = _data_ordinal(date.today() + timedelta(days=DIAS_ALERTA_VENCIMENTO))
        contexto_texto = "### DOCUMENTOS RELEVANTES:\n\n"
        for i, ctx in enumerate(contextos, 1):
            meta = ctx.get("metadata", {})
            titulo_doc = meta.get("titulo") or meta.get("nome_arquivo", "Documento")
            namespace = ctx.get("namespace", "desconhecido")
            tipo = (meta.get("tipo") or "").strip()
            revisado_em = (meta.get("revisado_em") or "").strip()
            valido_ate = (meta.get("valido_ate") or "").strip()

            # Linha de metadados visível ao modelo.
            campos_meta = [f"setor: {namespace}"]
            if tipo:
                campos_meta.append(f"tipo: {tipo}")
            if revisado_em:
                campos_meta.append(f"revisado_em: {revisado_em}")
            if valido_ate:
                campos_meta.append(f"válido até: {valido_ate}")

            # Sinaliza revisão vencida / próxima do vencimento para o modelo.
            alerta = ""
            if valido_ate:
                vence_ord = data_para_ordinal(valido_ate)
                if vence_ord < hoje_ord:
                    alerta = " [ATENÇÃO: revisão vencida]"
                elif vence_ord <= alerta_ord:
                    alerta = " [ATENÇÃO: revisão próxima do vencimento]"

            contexto_texto += f"**[{i}] {titulo_doc}** ({', '.join(campos_meta)}){alerta}:\n"
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


def coletar_image_ids(contextos: List[Dict[str, Any]]) -> List[str]:
    """
    Coleta os IDs de imagem dos contextos recuperados, deduplicando e limitando
    a `RAG_MAX_IMAGES`. Duas origens:
      - chunks de imagem (`metadata.type == "image"`) → `metadata.image_id`;
      - chunks de texto que referenciam imagens → `metadata.image_ids` (CSV).
    Preserva a ordem de relevância (os contextos já vêm ordenados por distância).
    """
    ids: List[str] = []
    for ctx in contextos:
        meta = ctx.get("metadata", {}) or {}
        if meta.get("type") == "image" and meta.get("image_id"):
            ids.append(str(meta["image_id"]))
        csv = meta.get("image_ids")
        if csv:
            ids.extend(x for x in str(csv).split(",") if x)
    # Dedup preservando ordem + teto.
    return list(dict.fromkeys(ids))[: settings.RAG_MAX_IMAGES]


async def executar_pipeline_rag(
    query: str,
    setor: str,
    historico: List[Dict[str, str]] = None,
    filtros: Optional[Dict[str, str]] = None,
    system_prompt: Optional[str] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Executa o pipeline RAG completo com streaming.

    1. Gera embedding da query via Ollama (nomic-embed-text)
    2. Busca no ChromaDB (namespace do setor + global), excluindo vencidos
    3. Monta o prompt com contexto
    4. Gera resposta via Ollama (qwen2.5:72b) com streaming

    Args:
        query: Pergunta do usuário
        setor: Setor do usuário (extraído do JWT)
        historico: Histórico de mensagens da conversa
        filtros: Filtros opcionais de metadado (`setor`, `tipo`, `sistema`).
            A exclusão de documentos vencidos é sempre aplicada.
        system_prompt: Prompt de sistema a usar. Se None, usa o built-in
            (`DEFAULT_SYSTEM_PROMPT`). O caller (chat) resolve o prompt efetivo
            por setor no banco e passa aqui.

    Yields:
        Chunks de texto da resposta
    """
    filtros = filtros or {}
    system_prompt = system_prompt or DEFAULT_SYSTEM_PROMPT
    logger.info(
        "Iniciando pipeline RAG.",
        extra={"setor": setor, "query_length": len(query)},
    )

    # 1. Gerar embedding da query
    try:
        query_embedding = await ollama_service.generate_embedding(query)
    except Exception as e:
        logger.error("Erro ao gerar embedding da query.", extra={"erro": str(e)})
        yield {"kind": "text", "data": "Desculpe, ocorreu um erro ao processar sua pergunta. Tente novamente."}
        return

    # 2. Buscar documentos relevantes no ChromaDB (exclui vencidos por padrão)
    where = montar_filtro_busca(
        setor=filtros.get("setor"),
        tipo=filtros.get("tipo"),
        sistema=filtros.get("sistema"),
    )
    try:
        contextos = chroma_service.query(
            namespace=setor,
            query_embedding=query_embedding,
            n_results=settings.RAG_TOP_K,
            where=where,
        )
    except Exception as e:
        logger.warning(
            "Erro ao buscar no ChromaDB, respondendo sem contexto.",
            extra={"erro": str(e)},
        )
        contextos = []

    # 2b. Imagens recuperáveis: emite os IDs ANTES do texto. O caller (chat)
    # resolve para registros, re-autoriza e anexa à resposta.
    image_ids = coletar_image_ids(contextos)
    if image_ids:
        yield {"kind": "image_ids", "data": image_ids}

    # 3. Montar prompt com contexto
    prompt = montar_prompt_rag(query, contextos, historico)

    # 4. Gerar resposta com streaming
    try:
        async for item in ollama_service.generate_response(
            prompt=prompt,
            system_prompt=system_prompt,
            stream=True,
        ):
            if item["type"] == "text":
                yield {"kind": "text", "data": item["content"]}
            elif item["type"] == "usage":
                # Repassa o consumo de tokens para o caller (chat) persistir.
                yield {"kind": "usage", "data": item}
    except Exception as e:
        logger.error("Erro ao gerar resposta do LLM.", extra={"erro": str(e)})
        yield {"kind": "text", "data": "\n\nDesculpe, ocorreu um erro ao gerar a resposta. Tente novamente."}


def _dividir_em_secoes(texto: str) -> List[Dict[str, str]]:
    """
    Divide o texto em seções delimitadas por headings Markdown (## / ###).

    Cada seção é {"titulo": <linha do heading ou "">, "conteudo": <corpo>}.
    O texto antes do primeiro heading vira uma seção sem título. Documentos
    sem nenhum heading resultam em uma única seção sem título.
    """
    secoes: List[Dict[str, str]] = []
    titulo_atual = ""
    linhas_atuais: List[str] = []

    def _fechar():
        conteudo = "\n".join(linhas_atuais).strip()
        if conteudo or titulo_atual:
            secoes.append({"titulo": titulo_atual, "conteudo": conteudo})

    for linha in texto.splitlines():
        m = _HEADING_RE.match(linha)
        if m:
            # Fecha a seção anterior e abre uma nova a partir deste heading.
            _fechar()
            titulo_atual = f"{m.group(1)} {m.group(2)}"
            linhas_atuais = []
        else:
            linhas_atuais.append(linha)

    _fechar()
    return secoes


def _quebrar_por_paragrafo(corpo: str, teto: int, prefixo: str) -> List[str]:
    """
    Quebra um corpo longo em sub-chunks por parágrafo, repetindo `prefixo`
    (o título da seção) em cada sub-chunk e respeitando o `teto`.

    Parágrafos são agrupados gulosamente até encostar no teto. Um parágrafo
    que sozinho exceda o teto é quebrado por sentença — nunca no meio de uma
    frase. Se uma única sentença ainda exceder o teto, ela é emitida inteira
    (o teto é uma salvaguarda, não uma régua rígida).
    """
    paragrafos = [p.strip() for p in re.split(r"\n\s*\n", corpo) if p.strip()]
    sub_chunks: List[str] = []
    buffer = ""

    def _flush():
        nonlocal buffer
        if buffer.strip():
            sub_chunks.append(f"{prefixo}{buffer.strip()}")
        buffer = ""

    for paragrafo in paragrafos:
        # Parágrafo que cabe no buffer corrente.
        candidato = f"{buffer}\n\n{paragrafo}" if buffer else paragrafo
        if len(prefixo) + len(candidato) <= teto:
            buffer = candidato
            continue

        # Não coube: fecha o buffer atual antes de tratar este parágrafo.
        _flush()

        if len(prefixo) + len(paragrafo) <= teto:
            buffer = paragrafo
            continue

        # Parágrafo grande demais: quebra por sentença, sem cortar frases.
        sentenca_buffer = ""
        for sentenca in _SENTENCA_RE.split(paragrafo):
            cand_s = f"{sentenca_buffer} {sentenca}".strip() if sentenca_buffer else sentenca
            if len(prefixo) + len(cand_s) <= teto:
                sentenca_buffer = cand_s
            else:
                if sentenca_buffer:
                    sub_chunks.append(f"{prefixo}{sentenca_buffer.strip()}")
                sentenca_buffer = sentenca
        if sentenca_buffer:
            sub_chunks.append(f"{prefixo}{sentenca_buffer.strip()}")

    _flush()
    return sub_chunks


def chunkear_texto(texto: str) -> List[str]:
    """
    Divide o texto em chunks por estrutura de Markdown.

    A unidade de chunk é a seção (delimitada por headings ## / ###). Cada
    chunk carrega o título da sua seção no início, para não perder contexto.
    `CHUNK_SIZE` deixa de ser a régua e passa a ser apenas um teto de
    segurança: seções que o excedem são quebradas por parágrafo (e, em último
    caso, por sentença), repetindo o título em cada sub-chunk. Documentos sem
    heading (txt simples) caem no comportamento de parágrafo com teto.

    Args:
        texto: Texto completo do documento (sem front-matter)

    Returns:
        Lista de chunks de texto
    """
    teto = settings.CHUNK_SIZE
    chunks: List[str] = []

    for secao in _dividir_em_secoes(texto):
        titulo = secao["titulo"]
        corpo = secao["conteudo"]
        prefixo = f"{titulo}\n\n" if titulo else ""

        if not corpo:
            # Seção só com título (sem corpo): preserva o título como chunk.
            if titulo:
                chunks.append(titulo)
            continue

        candidato = f"{prefixo}{corpo}"
        if len(candidato) <= teto:
            chunks.append(candidato)
        else:
            chunks.extend(_quebrar_por_paragrafo(corpo, teto, prefixo))

    return chunks
