"""Testes do chunking estrutural de Markdown (services.rag.chunkear_texto)."""

from config import settings
from services.rag import chunkear_texto, _dividir_em_secoes


def test_divide_por_secoes_com_titulo():
    texto = "## Configuração\nPasso um.\n\n### Detalhe\nMais texto."
    secoes = _dividir_em_secoes(texto)
    assert [s["titulo"] for s in secoes] == ["## Configuração", "### Detalhe"]


def test_cada_chunk_carrega_o_titulo_da_secao():
    texto = "## VPN\nComo conectar na VPN.\n\n## Backup\nComo restaurar backup."
    chunks = chunkear_texto(texto)
    assert len(chunks) == 2
    assert chunks[0].startswith("## VPN")
    assert "Como conectar" in chunks[0]
    assert chunks[1].startswith("## Backup")


def test_preambulo_sem_heading_vira_secao_sem_titulo():
    texto = "Texto introdutório sem heading.\n\n## Seção\nConteúdo."
    chunks = chunkear_texto(texto)
    assert chunks[0] == "Texto introdutório sem heading."
    assert chunks[1].startswith("## Seção")


def test_txt_simples_sem_heading():
    texto = "Apenas um parágrafo curto, sem nenhum heading."
    assert chunkear_texto(texto) == ["Apenas um parágrafo curto, sem nenhum heading."]


def test_secao_grande_quebra_por_paragrafo_repetindo_titulo():
    paragrafo = ("Frase de teste com tamanho razoável para encher o espaço. " * 4).strip()
    # Vários parágrafos, somando bem acima do teto de CHUNK_SIZE.
    n = (settings.CHUNK_SIZE * 3) // len(paragrafo) + 2
    corpo = "\n\n".join(paragrafo for _ in range(n))
    texto = f"## Procedimento longo\n{corpo}"

    chunks = chunkear_texto(texto)

    assert len(chunks) > 1, "seção acima do teto deveria gerar múltiplos chunks"
    for c in chunks:
        assert c.startswith("## Procedimento longo"), "título deve repetir em cada sub-chunk"


def test_nunca_corta_no_meio_de_frase():
    # Parágrafo único, maior que o teto, composto só de frases curtas terminadas em ponto.
    frase = "Esta e uma frase curta de teste. "
    n = (settings.CHUNK_SIZE * 2) // len(frase) + 2
    corpo = (frase * n).strip()
    texto = f"## Detalhes\n{corpo}"

    chunks = chunkear_texto(texto)

    for c in chunks:
        corpo_chunk = c[len("## Detalhes"):].strip()
        # Todo sub-chunk de uma quebra por sentença termina em pontuação de frase.
        assert corpo_chunk.endswith((".", "!", "?")), f"chunk cortou no meio: {corpo_chunk!r}"
