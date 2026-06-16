"""
Testes da feature de imagens da base de conhecimento (Fase 1).

Unitários de lógica pura, no estilo dos demais testes (chromadb é stubado no
conftest). Os testes do `_validar_e_reencodar` exigem Pillow — pulados se ausente.
"""

import io

import pytest

from services.rag import coletar_image_ids
from routers.documents import _refs_imagem


# ─── coletar_image_ids (services.rag) ────────────────────────
def _ctx(meta):
    return {"documento": "x", "metadata": meta, "distancia": 0.1, "namespace": "noc"}


def test_coleta_de_chunk_imagem_e_de_image_ids_csv():
    contextos = [
        _ctx({"type": "image", "image_id": "a"}),
        _ctx({"image_ids": "b,c"}),
        _ctx({"titulo": "sem imagem"}),
    ]
    assert coletar_image_ids(contextos) == ["a", "b", "c"]


def test_dedup_preservando_ordem():
    contextos = [
        _ctx({"type": "image", "image_id": "a"}),
        _ctx({"image_ids": "a,b"}),
        _ctx({"type": "image", "image_id": "b"}),
    ]
    assert coletar_image_ids(contextos) == ["a", "b"]


def test_respeita_teto_rag_max_images():
    from config import settings
    contextos = [_ctx({"type": "image", "image_id": str(i)}) for i in range(10)]
    assert len(coletar_image_ids(contextos)) == settings.RAG_MAX_IMAGES


def test_sem_imagens_retorna_vazio():
    assert coletar_image_ids([_ctx({"titulo": "doc"})]) == []


# ─── _refs_imagem (routers.documents) ────────────────────────
def test_refs_extrai_nome_arquivo_basename():
    texto = "Veja ![topo](imgs/topologia_noc.png) e ![](b.jpg)."
    assert _refs_imagem(texto) == ["topologia_noc.png", "b.jpg"]


def test_refs_sem_imagem_retorna_vazio():
    assert _refs_imagem("texto sem imagem [link](x.md)") == []


# ─── _validar_e_reencodar (routers.images) — precisa de Pillow ─
def _png_bytes(size=(8, 8)):
    PILImage = pytest.importorskip("PIL.Image")
    buf = io.BytesIO()
    PILImage.new("RGB", size, (10, 20, 30)).save(buf, format="PNG")
    return buf.getvalue()


def test_valida_png_real_e_retorna_extensao_mime():
    from routers.images import _validar_e_reencodar
    dados, ext, mime = _validar_e_reencodar(_png_bytes(), "diagrama.png")
    assert ext == ".png" and mime == "image/png" and len(dados) > 0


def test_rejeita_conteudo_que_nao_e_imagem():
    from fastapi import HTTPException
    from routers.images import _validar_e_reencodar
    with pytest.raises(HTTPException):
        _validar_e_reencodar(b"isto nao e uma imagem", "fake.png")


def test_rejeita_extensao_fora_da_allowlist():
    from fastapi import HTTPException
    from routers.images import _validar_e_reencodar
    with pytest.raises(HTTPException):
        _validar_e_reencodar(_png_bytes(), "arquivo.bmp")


def test_rejeita_acima_do_limite():
    from fastapi import HTTPException
    from config import settings
    from routers.images import _validar_e_reencodar
    grande = b"x" * (settings.IMAGE_MAX_MB * 1024 * 1024 + 1)
    with pytest.raises(HTTPException):
        _validar_e_reencodar(grande, "grande.png")


def test_reencode_remove_exif():
    PILImage = pytest.importorskip("PIL.Image")
    from routers.images import _validar_e_reencodar

    # JPEG com EXIF embutido.
    exif = PILImage.Exif()
    exif[0x010E] = "segredo na imagem"  # ImageDescription
    buf = io.BytesIO()
    PILImage.new("RGB", (8, 8), (1, 2, 3)).save(buf, format="JPEG", exif=exif)
    assert PILImage.open(io.BytesIO(buf.getvalue())).getexif(), "fixture devia ter EXIF"

    limpo, _, _ = _validar_e_reencodar(buf.getvalue(), "foto.jpg")
    assert not dict(PILImage.open(io.BytesIO(limpo)).getexif()), "EXIF deveria ter sido removido"
