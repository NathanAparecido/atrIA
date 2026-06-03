"""Testes do parse de front-matter e normalização de datas (routers.documents)."""

from datetime import date

from routers.documents import separar_front_matter, normalizar_data
from services.rag import data_para_ordinal, DATA_ORD_SEM_VENCIMENTO


def test_separa_front_matter_valido():
    texto = (
        "---\n"
        "titulo: Procedimento de Backup\n"
        "setor: noc\n"
        "tipo: procedimento\n"
        "valido_ate: 2026-12-31\n"
        "---\n"
        "## Passo 1\nFaça o backup."
    )
    fm, corpo = separar_front_matter(texto)
    assert fm["titulo"] == "Procedimento de Backup"
    assert fm["setor"] == "noc"
    assert corpo.startswith("## Passo 1")
    assert "---" not in corpo


def test_sem_front_matter_retorna_texto_intacto():
    texto = "## Sem front-matter\nConteúdo qualquer."
    fm, corpo = separar_front_matter(texto)
    assert fm == {}
    assert corpo == texto


def test_front_matter_sem_fechamento_e_ignorado():
    texto = "---\ntitulo: incompleto\n\n## Conteúdo\nsem fechar o bloco."
    fm, corpo = separar_front_matter(texto)
    assert fm == {}
    assert corpo == texto


def test_normalizar_data_varios_formatos():
    assert normalizar_data("2026-12-31") == "2026-12-31"
    assert normalizar_data("31/12/2026") == "2026-12-31"
    assert normalizar_data(date(2026, 12, 31)) == "2026-12-31"  # PyYAML entrega date
    assert normalizar_data("") == ""
    assert normalizar_data(None) == ""
    assert normalizar_data("texto invalido") == ""


def test_data_para_ordinal():
    assert data_para_ordinal("2026-12-31") == 20261231
    assert data_para_ordinal("2026-06-02") == 20260602
    # Ausência de data => sentinela "nunca vence".
    assert data_para_ordinal("") == DATA_ORD_SEM_VENCIMENTO
    assert data_para_ordinal("lixo") == DATA_ORD_SEM_VENCIMENTO
