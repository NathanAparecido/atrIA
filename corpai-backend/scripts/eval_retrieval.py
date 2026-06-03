#!/usr/bin/env python3
"""
CorpAI — Harness de avaliação offline do retrieval.

Lê um golden set (pergunta → seção/título esperado), roda cada pergunta pelo
mesmo pipeline de busca usado em produção (embedding via Ollama + busca no
ChromaDB, com exclusão de vencidos) e reporta recall@k: a seção esperada
apareceu entre os top-k resultados?

Uso (a partir de corpai-backend/):
    python -m scripts.eval_retrieval --golden golden.json
    python scripts/eval_retrieval.py --golden golden.csv --k 5 --setor noc

O modelo de embedding pode ser trocado para comparação, sem alterar produção:
    EVAL_EMBED_MODEL=bge-m3 python -m scripts.eval_retrieval --golden golden.json
    python -m scripts.eval_retrieval --golden golden.json --embed-model bge-m3

Formato do golden set:
  JSON: lista de objetos
    [{"pergunta": "...", "esperado": "Título ou trecho da seção",
      "setor": "noc", "tipo": "procedimento", "sistema": "zabbix"}, ...]
  CSV: cabeçalho com pelo menos `pergunta` e `esperado`
    (colunas opcionais: setor, tipo, sistema)

Sem dependências além das já usadas pelo backend. Saída em texto no stdout.
"""

import argparse
import asyncio
import csv
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

# Garante que a raiz do backend (corpai-backend/) está no path quando o script
# é executado diretamente (python scripts/eval_retrieval.py).
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings  # noqa: E402
from services.chroma import chroma_service  # noqa: E402
from services.ollama import ollama_service  # noqa: E402
from services.rag import montar_filtro_busca  # noqa: E402


def carregar_golden(caminho: str) -> List[Dict[str, Any]]:
    """Carrega o golden set de um arquivo .json ou .csv."""
    p = Path(caminho)
    if not p.exists():
        raise FileNotFoundError(f"Golden set não encontrado: {caminho}")

    if p.suffix.lower() == ".json":
        with p.open(encoding="utf-8") as f:
            dados = json.load(f)
        if not isinstance(dados, list):
            raise ValueError("Golden set JSON deve ser uma lista de objetos.")
        return dados

    if p.suffix.lower() == ".csv":
        with p.open(encoding="utf-8", newline="") as f:
            return list(csv.DictReader(f))

    raise ValueError("Formato de golden set não suportado (use .json ou .csv).")


def _norm(texto: str) -> str:
    return " ".join((texto or "").lower().split())


def acertou(esperado: str, resultados: List[Dict[str, Any]]) -> bool:
    """
    Decide se a seção esperada apareceu nos resultados.

    Casa por: igualdade de document_id, ou correspondência (substring em
    qualquer direção) entre o esperado e o título do documento ou a primeira
    linha do chunk (que carrega o heading da seção no chunking estrutural).
    """
    alvo = _norm(esperado)
    if not alvo:
        return False

    for r in resultados:
        meta = r.get("metadata", {})
        if esperado.strip() == str(meta.get("document_id", "")).strip():
            return True

        titulo = _norm(meta.get("titulo", ""))
        linhas = (r.get("documento", "") or "").splitlines()
        primeira_linha = _norm(linhas[0]) if linhas else ""

        for campo in (titulo, primeira_linha):
            if campo and (alvo in campo or campo in alvo):
                return True
    return False


async def avaliar(args: argparse.Namespace) -> int:
    # Troca o modelo de embedding apenas nesta execução (não toca produção).
    embed_model = args.embed_model or os.environ.get("EVAL_EMBED_MODEL")
    if embed_model:
        ollama_service.embed_model = embed_model

    golden = carregar_golden(args.golden)
    if not golden:
        print("Golden set vazio.")
        return 1

    k = args.k
    print("=" * 64)
    print("CorpAI — Avaliação de retrieval (recall@k)")
    print(f"  golden set      : {args.golden} ({len(golden)} perguntas)")
    print(f"  k               : {k}")
    print(f"  modelo embedding: {ollama_service.embed_model}")
    print(f"  incluir vencidos: {args.include_expired}")
    print("=" * 64)

    acertos = 0
    for idx, item in enumerate(golden, 1):
        pergunta = (item.get("pergunta") or "").strip()
        esperado = (item.get("esperado") or "").strip()
        setor = (item.get("setor") or args.setor).strip()

        if not pergunta or not esperado:
            print(f"[{idx:>3}] IGNORADA (pergunta/esperado vazio)")
            continue

        try:
            embedding = await ollama_service.generate_embedding(pergunta)
            where = montar_filtro_busca(
                tipo=(item.get("tipo") or None),
                sistema=(item.get("sistema") or None),
                incluir_vencidos=args.include_expired,
            )
            resultados = chroma_service.query(
                namespace=setor,
                query_embedding=embedding,
                n_results=k,
                where=where,
            )[:k]
        except Exception as e:  # noqa: BLE001 — script de diagnóstico
            print(f"[{idx:>3}] ERRO: {e}")
            continue

        hit = acertou(esperado, resultados)
        acertos += int(hit)
        marca = "HIT " if hit else "MISS"
        print(f"[{idx:>3}] {marca} | setor={setor:<12} | {pergunta[:60]}")
        if not hit:
            titulos = [r.get("metadata", {}).get("titulo", "?") for r in resultados]
            print(f"        esperado: {esperado!r} | top-{k}: {titulos}")

    total = len([i for i in golden if (i.get("pergunta") and i.get("esperado"))])
    recall = acertos / total if total else 0.0
    print("-" * 64)
    print(f"recall@{k}: {acertos}/{total} = {recall:.3f}")
    print("=" * 64)
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Avaliação offline do retrieval (recall@k).")
    parser.add_argument("--golden", required=True, help="Caminho do golden set (.json ou .csv).")
    parser.add_argument("--k", type=int, default=settings.RAG_TOP_K, help="top-k (default: RAG_TOP_K).")
    parser.add_argument("--setor", default="global", help="Setor padrão p/ entradas sem 'setor'.")
    parser.add_argument("--embed-model", default=None, help="Sobrescreve o modelo de embedding.")
    parser.add_argument("--include-expired", action="store_true", help="Inclui documentos vencidos.")
    args = parser.parse_args()

    sys.exit(asyncio.run(avaliar(args)))


if __name__ == "__main__":
    main()
