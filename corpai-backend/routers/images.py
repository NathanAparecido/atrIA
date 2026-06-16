"""
CorpAI — Router de Imagens da base de conhecimento.

A imagem entra na base com uma descrição textual obrigatória; a descrição vira
um chunk do tipo `image` no Chroma (namespace do setor). Quando o retrieval do
RAG traz esse chunk, o chat anexa a imagem à resposta. O arquivo nunca é servido
publicamente — só via GET autenticado, com checagem de setor.

Segurança do upload (todas obrigatórias):
  - extensão na allowlist E formato real conferido pelo Pillow (magic bytes);
  - tamanho ≤ IMAGE_MAX_MB;
  - re-encode com Pillow antes de salvar (descarta EXIF/GPS e payloads embutidos);
  - nome físico = UUID gerado no servidor (nunca o filename do cliente);
  - setor SEMPRE do JWT, nunca do request.
"""

import io
import json
import logging
import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from PIL import Image as PILImage, UnidentifiedImageError

from config import settings
from middleware.auth import get_current_user, require_role, TokenData
from models.image import Image
from services.chroma import chroma_service
from services.ollama import ollama_service
from services.rag import DATA_ORD_SEM_VENCIMENTO

logger = logging.getLogger(__name__)
router = APIRouter()

# Formato real (Pillow) → (extensão física, mime). A allowlist de extensão do
# cliente é checada à parte; aqui o que vale é o que o Pillow identificou.
_FORMATO_INFO = {
    "PNG": (".png", "image/png"),
    "JPEG": (".jpg", "image/jpeg"),
    "WEBP": (".webp", "image/webp"),
    "GIF": (".gif", "image/gif"),
}

DESCRICAO_MIN = 10


# ─── Schema ──────────────────────────────────────────────────
class ImageResponse(BaseModel):
    id: str
    nome_arquivo: str
    descricao: str
    document_id: str | None = None
    mime: str
    criado_em: str


# ─── Dependência do banco (mesmo padrão de chat.py) ──────────
async def get_db():
    from main import async_session

    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


def _chroma_doc_id(image_id) -> str:
    """ID lógico do chunk de imagem no Chroma (também usado como document_id)."""
    return f"image_{image_id}"


def _validar_e_reencodar(conteudo: bytes, filename: str) -> tuple[bytes, str, str]:
    """
    Valida a imagem (magic bytes via Pillow) e re-encoda para descartar EXIF.

    Retorna (bytes_limpos, extensao_fisica, mime). Levanta HTTPException 400 em
    qualquer falha de validação.
    """
    if len(conteudo) == 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "O arquivo está vazio.")

    limite = settings.IMAGE_MAX_MB * 1024 * 1024
    if len(conteudo) > limite:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Imagem acima do limite de {settings.IMAGE_MAX_MB} MB.",
        )

    # Extensão declarada pelo cliente precisa estar na allowlist (defesa extra).
    ext_cliente = "." + filename.lower().rsplit(".", 1)[-1] if "." in filename else ""
    if ext_cliente not in settings.EXTENSOES_IMAGEM:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Formato não suportado. Aceitos: {', '.join(settings.EXTENSOES_IMAGEM)}",
        )

    # verify() valida a estrutura (magic bytes) mas consome o objeto.
    try:
        PILImage.open(io.BytesIO(conteudo)).verify()
        img = PILImage.open(io.BytesIO(conteudo))
        formato = img.format
    except (UnidentifiedImageError, OSError, ValueError):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Arquivo não é uma imagem válida (conteúdo não confere com a extensão).",
        )

    if formato not in _FORMATO_INFO:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Formato de imagem não suportado: {formato}.",
        )

    extensao, mime = _FORMATO_INFO[formato]

    # Re-encode SEM passar exif= → o arquivo gravado não carrega EXIF/GPS.
    out = io.BytesIO()
    try:
        if formato == "GIF" and getattr(img, "is_animated", False):
            img.save(out, format="GIF", save_all=True)
        else:
            img.save(out, format=formato)
    except OSError:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Não foi possível processar a imagem."
        )

    return out.getvalue(), extensao, mime


# ─── Endpoints ───────────────────────────────────────────────
@router.post("/upload", response_model=ImageResponse, summary="Upload de imagem")
async def upload_imagem(
    file: UploadFile = File(...),
    descricao: str = Form(...),
    document_id: str | None = Form(None),
    tags: str | None = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin", "gerente"])),
):
    """
    Sobe uma imagem para a base do setor do usuário. A descrição (obrigatória)
    é embedada no Chroma como chunk `image` — é assim que a IA recupera a imagem.
    """
    setor = current_user.setor  # nunca do request

    descricao = (descricao or "").strip()
    if len(descricao) < DESCRICAO_MIN:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"A descrição é obrigatória (mín. {DESCRICAO_MIN} caracteres).",
        )

    nome_arquivo = file.filename or "imagem"
    conteudo = await file.read()
    bytes_limpos, extensao, mime = _validar_e_reencodar(conteudo, nome_arquivo)

    # UUID gerado explicitamente AGORA — o default=uuid.uuid4 do model só é
    # aplicado no flush, e precisamos do id já para o nome físico e o Chroma.
    img_id = uuid.uuid4()
    img = Image(
        id=img_id,
        setor=setor,
        document_id=(document_id or "").strip() or None,
        nome_arquivo=nome_arquivo,
        arquivo=f"{img_id}{extensao}",
        mime=mime,
        descricao=descricao,
        criado_por=uuid.UUID(current_user.user_id),
    )

    # Gravar arquivo físico em {IMAGES_DIR}/{setor}/{uuid}.{ext}
    setor_dir = os.path.join(settings.IMAGES_DIR, setor)
    os.makedirs(setor_dir, exist_ok=True)
    caminho = os.path.join(setor_dir, img.arquivo)
    try:
        with open(caminho, "wb") as f:
            f.write(bytes_limpos)
    except OSError as e:
        logger.error("Erro ao gravar imagem em disco.", extra={"erro": str(e)})
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR, "Erro ao salvar a imagem."
        )

    # Embedding da descrição + indexação no Chroma (mesma collection dos docs).
    try:
        emb = await ollama_service.generate_embedding(descricao)
        chroma_service.add_documents(
            namespace=setor,
            documents=[f"[IMAGEM] {nome_arquivo}: {descricao}"],
            embeddings=[emb],
            metadatas=[{
                "type": "image",
                "image_id": str(img.id),
                "document_id": _chroma_doc_id(img.id),
                "nome_arquivo": nome_arquivo,
                "tags": (tags or "").strip(),
                "setor": setor,
                # Sentinela "nunca vence" — sem isso o filtro de vencidos do RAG
                # descartaria o chunk de imagem.
                "valido_ate_ord": DATA_ORD_SEM_VENCIMENTO,
            }],
            ids=[_chroma_doc_id(img.id)],
        )
    except Exception as e:
        # Rollback do arquivo físico para não deixar órfão sem índice.
        try:
            os.remove(caminho)
        except OSError:
            pass
        logger.error("Erro ao indexar imagem no Chroma.", extra={"erro": str(e)})
        raise HTTPException(
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "Erro ao indexar a imagem no banco vetorial.",
        )

    db.add(img)
    await db.commit()
    await db.refresh(img)

    logger.info(
        "Imagem indexada com sucesso.",
        extra={"image_id": str(img.id), "setor": setor, "arquivo": nome_arquivo},
    )

    return ImageResponse(
        id=str(img.id),
        nome_arquivo=img.nome_arquivo,
        descricao=img.descricao,
        document_id=img.document_id,
        mime=img.mime,
        criado_em=img.criado_em.isoformat(),
    )


async def _carregar_autorizada(image_id: str, db: AsyncSession, user: TokenData) -> Image:
    """
    Carrega a imagem e autoriza o acesso. Retorna 404 (não 403) quando não existe
    OU quando o usuário não pode vê-la — não confirmar a existência a quem não
    tem acesso. Visível se: mesmo setor, setor `global`, ou role admin.
    """
    try:
        img_uuid = uuid.UUID(image_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imagem não encontrada.")

    result = await db.execute(select(Image).where(Image.id == img_uuid))
    img = result.scalar_one_or_none()

    autorizado = img is not None and (
        user.role == "admin" or img.setor == user.setor or img.setor == "global"
    )
    if not autorizado:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imagem não encontrada.")
    return img


@router.get("/{image_id}", summary="Servir imagem (autenticado)")
async def obter_imagem(
    image_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(get_current_user),
):
    """Serve o arquivo da imagem se o usuário tiver acesso ao setor dela."""
    img = await _carregar_autorizada(image_id, db, current_user)
    caminho = os.path.join(settings.IMAGES_DIR, img.setor, img.arquivo)
    if not os.path.isfile(caminho):
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Arquivo da imagem não encontrado.")

    return FileResponse(
        caminho,
        media_type=img.mime,
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.get("", response_model=list[ImageResponse], summary="Listar imagens do setor")
async def listar_imagens(
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin", "gerente"])),
):
    """Lista as imagens do setor do usuário (admin vê o próprio setor por padrão)."""
    result = await db.execute(
        select(Image).where(Image.setor == current_user.setor).order_by(Image.criado_em.desc())
    )
    imagens = result.scalars().all()
    return [
        ImageResponse(
            id=str(i.id),
            nome_arquivo=i.nome_arquivo,
            descricao=i.descricao,
            document_id=i.document_id,
            mime=i.mime,
            criado_em=i.criado_em.isoformat(),
        )
        for i in imagens
    ]


@router.delete("/{image_id}", summary="Deletar imagem")
async def deletar_imagem(
    image_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: TokenData = Depends(require_role(["admin", "gerente"])),
):
    """Remove arquivo físico + registro + chunk do Chroma. Líder só do próprio setor."""
    try:
        img_uuid = uuid.UUID(image_id)
    except ValueError:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imagem não encontrada.")

    result = await db.execute(select(Image).where(Image.id == img_uuid))
    img = result.scalar_one_or_none()

    autorizado = img is not None and (
        current_user.role == "admin" or img.setor == current_user.setor
    )
    if not autorizado:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Imagem não encontrada.")

    # Remover chunk do Chroma (pelo document_id lógico).
    try:
        chroma_service.delete_document(img.setor, _chroma_doc_id(img.id))
    except Exception as e:
        logger.warning("Falha ao remover chunk de imagem do Chroma.", extra={"erro": str(e)})

    # Remover arquivo físico.
    caminho = os.path.join(settings.IMAGES_DIR, img.setor, img.arquivo)
    try:
        if os.path.isfile(caminho):
            os.remove(caminho)
    except OSError as e:
        logger.warning("Falha ao remover arquivo de imagem.", extra={"erro": str(e)})

    await db.delete(img)
    await db.commit()

    return {"mensagem": "Imagem removida com sucesso."}
