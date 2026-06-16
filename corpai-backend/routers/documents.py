"""
CorpAI — Router de Documentos.
Upload, listagem e deleção de documentos por namespace.
Formatos aceitos: PDF, DOCX, XLSX, TXT, MD
"""

import json
import logging
import os
import re
import uuid
from datetime import date, datetime
from typing import List, Dict, Any, Optional, Tuple

import yaml
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from config import settings
from middleware.auth import get_current_user, require_role, TokenData
from models.image import Image
from services.chroma import chroma_service
from services.ollama import ollama_service
from services.prompts import construir_prompt_redacao
from services.rag import chunkear_texto, data_para_ordinal

# Referência de imagem Markdown: ![alt](caminho/arquivo.png). Captura o caminho;
# o match com a base de imagens é por nome de arquivo (basename).
_MD_IMG_RE = re.compile(r"!\[[^\]]*\]\(\s*([^)\s]+)")


def _refs_imagem(texto: str) -> List[str]:
    """Nomes de arquivo (basename) das imagens referenciadas em um trecho .md."""
    return [os.path.basename(m) for m in _MD_IMG_RE.findall(texto)]


# ─── Dependência do banco (mesmo padrão de chat.py) ──────────
async def get_db():
    from main import async_session

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

logger = logging.getLogger(__name__)
router = APIRouter()

# Extensões permitidas
EXTENSOES_PERMITIDAS = {".pdf", ".docx", ".xlsx", ".txt", ".md"}

# Front-matter YAML delimitado por --- no topo do arquivo.
_FRONT_MATTER_RE = re.compile(r"^---\s*\n(.*?)\n---\s*\n?", re.DOTALL)


def separar_front_matter(texto: str) -> Tuple[Dict[str, Any], str]:
    """
    Separa o front-matter YAML (entre `---`) do corpo do documento.

    Retorna `({}, texto)` quando não há front-matter válido — documento sem
    front-matter continua aceito normalmente.
    """
    if not texto.startswith("---"):
        return {}, texto

    m = _FRONT_MATTER_RE.match(texto)
    if not m:
        return {}, texto

    try:
        dados = yaml.safe_load(m.group(1)) or {}
    except yaml.YAMLError:
        return {}, texto

    if not isinstance(dados, dict):
        return {}, texto

    return dados, texto[m.end():]


def _fm_str(fm: Dict[str, Any], chave: str) -> str:
    """Lê um campo do front-matter como string limpa ('' se ausente/nulo)."""
    valor = fm.get(chave)
    return str(valor).strip() if valor is not None else ""


def normalizar_data(valor: Any) -> str:
    """
    Normaliza uma data para ISO ordenável `YYYY-MM-DD`.

    Aceita `date`/`datetime` (como o PyYAML já entrega) ou string em formatos
    comuns. Retorna '' quando ausente ou não reconhecível.
    """
    if valor is None or valor == "":
        return ""
    if isinstance(valor, datetime):
        return valor.date().isoformat()
    if isinstance(valor, date):
        return valor.isoformat()

    s = str(valor).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(s, fmt).date().isoformat()
        except ValueError:
            continue
    # Já vem em ISO com hora? Mantém só a parte da data.
    return s[:10] if re.match(r"^\d{4}-\d{2}-\d{2}", s) else ""


# ─── Schemas ─────────────────────────────────────────────────
class DocumentoResponse(BaseModel):
    document_id: str
    nome_arquivo: str
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    tags: Optional[str] = None
    total_chunks: int
    criado_em: str


class UploadResponse(BaseModel):
    mensagem: str
    document_id: str
    nome_arquivo: str
    titulo: Optional[str] = None
    total_chunks: int
    # Imagens referenciadas no .md (![](x.png)) que ainda não existem na base do
    # setor — avisa a líder do que falta subir para o vínculo fechar.
    imagens_nao_encontradas: List[str] = []


class RedigirRequest(BaseModel):
    texto: str
    tipo: Optional[str] = None  # procedimento | escalacao | faq | politica | referencia


# ─── Funções de extração de texto ────────────────────────────
async def extrair_texto_pdf(conteudo: bytes) -> str:
    """Extrai texto de um arquivo PDF."""
    from PyPDF2 import PdfReader
    import io

    reader = PdfReader(io.BytesIO(conteudo))
    texto = ""
    for page in reader.pages:
        texto_pagina = page.extract_text()
        if texto_pagina:
            texto += texto_pagina + "\n"
    return texto


async def extrair_texto_docx(conteudo: bytes) -> str:
    """Extrai texto de um arquivo DOCX."""
    from docx import Document
    import io

    doc = Document(io.BytesIO(conteudo))
    texto = ""
    for paragrafo in doc.paragraphs:
        if paragrafo.text:
            texto += paragrafo.text + "\n"
    return texto


async def extrair_texto_xlsx(conteudo: bytes) -> str:
    """Extrai texto de um arquivo XLSX."""
    from openpyxl import load_workbook
    import io

    wb = load_workbook(io.BytesIO(conteudo), read_only=True)
    texto = ""
    for sheet in wb.worksheets:
        texto += f"## Planilha: {sheet.title}\n"
        for row in sheet.iter_rows(values_only=True):
            valores = [str(cell) if cell is not None else "" for cell in row]
            texto += " | ".join(valores) + "\n"
    return texto


async def extrair_texto_txt(conteudo: bytes) -> str:
    """Extrai texto de um arquivo TXT ou MD."""
    try:
        return conteudo.decode("utf-8")
    except UnicodeDecodeError:
        return conteudo.decode("latin-1")


async def extrair_texto(nome_arquivo: str, conteudo: bytes) -> str:
    """Extrai texto de um arquivo baseado na extensão."""
    extensao = nome_arquivo.lower().rsplit(".", 1)[-1] if "." in nome_arquivo else ""

    extractors = {
        "pdf": extrair_texto_pdf,
        "docx": extrair_texto_docx,
        "xlsx": extrair_texto_xlsx,
        "txt": extrair_texto_txt,
        "md": extrair_texto_txt,
    }

    extractor = extractors.get(extensao)
    if extractor is None:
        raise ValueError(f"Formato não suportado: .{extensao}")

    return await extractor(conteudo)


# ─── Endpoints ───────────────────────────────────────────────
@router.post(
    "/upload",
    response_model=UploadResponse,
    summary="Upload de documento",
)
async def upload_documento(
    file: UploadFile = File(...),
    titulo: Optional[str] = Form(None),
    descricao: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["gerente", "admin"])),
):
    """
    Faz upload de um documento, extrai texto, chunkeia,
    gera embeddings e armazena no namespace do setor do usuário.
    """
    # Validar extensão
    nome = file.filename or "documento"
    extensao = "." + nome.lower().rsplit(".", 1)[-1] if "." in nome else ""

    if extensao not in EXTENSOES_PERMITIDAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato não suportado. Formatos aceitos: {', '.join(EXTENSOES_PERMITIDAS)}",
        )

    # Ler conteúdo do arquivo
    conteudo = await file.read()

    if len(conteudo) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="O arquivo está vazio.",
        )

    # Extrair texto
    try:
        texto = await extrair_texto(nome, conteudo)
    except Exception as e:
        logger.error(
            "Erro ao extrair texto do documento.",
            extra={"arquivo": nome, "erro": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Erro ao processar o documento: {str(e)}",
        )

    if not texto.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Não foi possível extrair texto do documento.",
        )

    # Front-matter (apenas para .md); o corpo segue para o chunking.
    front_matter: Dict[str, Any] = {}
    corpo = texto
    if extensao == ".md":
        front_matter, corpo = separar_front_matter(texto)

    # Chunkear
    chunks = chunkear_texto(corpo)

    if not chunks:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="O documento não gerou nenhum chunk de texto válido.",
        )

    # Gerar embeddings
    try:
        embeddings = await ollama_service.generate_embeddings_batch(chunks)
    except Exception as e:
        logger.error(
            "Erro ao gerar embeddings.",
            extra={"arquivo": nome, "erro": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao gerar embeddings. Verifique se o Ollama e o modelo nomic-embed-text estão disponíveis.",
        )

    # Armazenar no ChromaDB
    document_id = str(uuid.uuid4())

    # Setor: front-matter prevalece sobre o setor do JWT, se válido.
    setor_fm = _fm_str(front_matter, "setor")
    if setor_fm and setor_fm in settings.SETORES_VALIDOS:
        setor_efetivo = setor_fm
    else:
        if setor_fm:
            logger.warning(
                "Setor do front-matter inválido; usando o setor do usuário.",
                extra={"setor_fm": setor_fm, "setor_usuario": current_user.setor},
            )
        setor_efetivo = current_user.setor

    # Título: front-matter > formulário > nome do arquivo.
    titulo_final = _fm_str(front_matter, "titulo") or (titulo or "").strip() or nome

    # Datas em ISO ordenável + ordinal inteiro para o filtro de vencimento.
    revisado_em = normalizar_data(front_matter.get("revisado_em"))
    valido_ate = normalizar_data(front_matter.get("valido_ate"))

    ids = [f"{document_id}_chunk_{i}" for i in range(len(chunks))]
    metadata_base = {
        "document_id": document_id,
        "nome_arquivo": nome,
        "titulo": titulo_final,
        "descricao": (descricao or "").strip(),
        "tags": (tags or "").strip(),
        "total_chunks": len(chunks),
        "setor": setor_efetivo,
        "sistema": _fm_str(front_matter, "sistema"),
        "tipo": _fm_str(front_matter, "tipo"),
        "criticidade": _fm_str(front_matter, "criticidade"),
        "responsavel": _fm_str(front_matter, "responsavel"),
        "versao": _fm_str(front_matter, "versao"),
        "revisado_em": revisado_em,
        "valido_ate": valido_ate,
        # Ordinal YYYYMMDD para filtro de range no Chroma (string não suporta).
        # Sem valido_ate => sentinela 99991231 (nunca vence, sempre elegível).
        "valido_ate_ord": data_para_ordinal(valido_ate),
        "usuario": current_user.username,
        "criado_em": datetime.utcnow().isoformat(),
    }
    # Vínculo com imagens já subidas: para cada referência ![](arquivo.png) no
    # corpo, casar por nome_arquivo no setor e gravar `image_ids` (CSV) no
    # metadata dos chunks que contêm a referência — a IA passa a anexar a imagem
    # quando AQUELE trecho é recuperado (vínculo por chunk, não por documento).
    refs_corpo = set(_refs_imagem(corpo))
    mapa_imagens: Dict[str, str] = {}
    if refs_corpo:
        result_img = await db.execute(
            select(Image).where(
                Image.setor == setor_efetivo,
                Image.nome_arquivo.in_(refs_corpo),
            )
        )
        mapa_imagens = {img.nome_arquivo: str(img.id) for img in result_img.scalars().all()}
    imagens_nao_encontradas = sorted(refs_corpo - set(mapa_imagens.keys()))

    metadatas = []
    for i, chunk in enumerate(chunks):
        meta = {**metadata_base, "chunk_index": i}
        ids_chunk = [mapa_imagens[r] for r in _refs_imagem(chunk) if r in mapa_imagens]
        if ids_chunk:
            # Chroma só aceita primitivos em metadata → CSV de UUIDs.
            meta["image_ids"] = ",".join(dict.fromkeys(ids_chunk))
        metadatas.append(meta)

    try:
        chroma_service.add_documents(
            namespace=setor_efetivo,
            documents=chunks,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids,
        )
    except Exception as e:
        logger.error(
            "Erro ao armazenar no ChromaDB.",
            extra={"arquivo": nome, "erro": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao armazenar documento no banco vetorial.",
        )

    logger.info(
        "Documento processado e indexado com sucesso.",
        extra={
            "document_id": document_id,
            "arquivo": nome,
            "setor": setor_efetivo,
            "chunks": len(chunks),
        },
    )

    return UploadResponse(
        mensagem="Documento processado e indexado com sucesso.",
        document_id=document_id,
        nome_arquivo=nome,
        titulo=titulo_final,
        total_chunks=len(chunks),
        imagens_nao_encontradas=imagens_nao_encontradas,
    )


@router.post(
    "/redigir",
    summary="Redigir documento .md a partir de texto livre (SSE)",
)
async def redigir_documento(
    request: RedigirRequest,
    current_user: TokenData = Depends(require_role(["gerente", "admin"])),
):
    """
    Recebe texto livre do colaborador e usa o LLM para devolver, via SSE, um
    documento Markdown no padrão da base (front-matter + seções + perguntas).
    O setor é sempre o do JWT; nada é indexado aqui — é só a redação.
    """
    if not request.texto.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Envie o texto do documento.",
        )

    system_prompt = construir_prompt_redacao(setor=current_user.setor, tipo=request.tipo)
    user_prompt = request.texto.strip()

    async def gerar_sse():
        """Streama o Markdown gerado em chunks SSE (type: chunk | error | done)."""
        try:
            async for chunk in ollama_service.generate_response(
                prompt=user_prompt,
                system_prompt=system_prompt,
                stream=True,
            ):
                yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        except Exception as e:
            logger.error(
                "Erro ao redigir documento.",
                extra={"erro": str(e), "usuario": current_user.username},
            )
            yield f"data: {json.dumps({'type': 'error', 'content': 'Erro ao gerar o documento.'})}\n\n"

        yield f"data: {json.dumps({'type': 'done'})}\n\n"

    return StreamingResponse(
        gerar_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get(
    "/",
    response_model=List[DocumentoResponse],
    summary="Listar documentos do setor",
)
async def listar_documentos(
    current_user: TokenData = Depends(require_role(["gerente", "admin"])),
):
    """Lista todos os documentos indexados no namespace do setor do usuário."""
    # Admin pode listar de qualquer setor, mas por padrão lista do seu
    setor = current_user.setor

    try:
        docs = chroma_service.list_documents(setor)
    except Exception as e:
        logger.error(
            "Erro ao listar documentos.",
            extra={"setor": setor, "erro": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao listar documentos do setor.",
        )

    return [
        DocumentoResponse(
            document_id=d["document_id"],
            nome_arquivo=d["nome_arquivo"],
            titulo=d.get("titulo"),
            descricao=d.get("descricao"),
            tags=d.get("tags"),
            total_chunks=d["total_chunks"],
            criado_em=d.get("criado_em", ""),
        )
        for d in docs
    ]


@router.delete(
    "/{document_id}",
    summary="Deletar documento",
)
async def deletar_documento(
    document_id: str,
    current_user: TokenData = Depends(require_role(["gerente", "admin"])),
):
    """Remove um documento e todos os seus chunks do namespace do setor."""
    try:
        chroma_service.delete_document(
            namespace=current_user.setor,
            document_id=document_id,
        )
    except Exception as e:
        logger.error(
            "Erro ao deletar documento.",
            extra={"document_id": document_id, "erro": str(e)},
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro ao remover documento do banco vetorial.",
        )

    logger.info(
        "Documento removido.",
        extra={
            "document_id": document_id,
            "setor": current_user.setor,
            "usuario": current_user.username,
        },
    )

    return {"mensagem": "Documento removido com sucesso."}
