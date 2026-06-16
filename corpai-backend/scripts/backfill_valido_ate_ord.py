#!/usr/bin/env python3
"""
CorpAI — Backfill do campo `valido_ate_ord` no ChromaDB.

Documentos indexados antes da introdução do filtro de vencidos não têm o campo
inteiro `valido_ate_ord` nos metadados. Como o Chroma exclui registros sem a
chave em filtros `$gte`, esses documentos somem da busca. Este script percorre
todas as collections `corpai_*`, calcula `valido_ate_ord` a partir do
`valido_ate` existente (ou o sentinela "nunca vence" quando ausente) e atualiza
os metadados dos chunks que ainda não têm o campo.

Uso (a partir de corpai-backend/):
    python -m scripts.backfill_valido_ate_ord            # aplica
    python -m scripts.backfill_valido_ate_ord --dry-run  # só relata
    python -m scripts.backfill_valido_ate_ord --all      # recalcula todos

Seguro de re-executar: por padrão só toca em chunks sem `valido_ate_ord`.
"""

import argparse
import sys
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import settings  # noqa: E402
from services.chroma import chroma_service  # noqa: E402
from services.rag import data_para_ordinal, DATA_ORD_SEM_VENCIMENTO  # noqa: E402

LOTE = 500


def _listar_collections() -> List[str]:
    """
    Collections do CorpAI que existem no servidor.

    Os namespaces são determinísticos (`corpai_<setor>` para cada setor válido),
    então iteramos `SETORES_VALIDOS` em vez de `list_collections()` — que no
    Chroma 0.6.x não expõe mais o nome via atributo.
    """
    nomes = []
    for setor in settings.SETORES_VALIDOS:
        nome = f"corpai_{setor}"
        try:
            chroma_service.client.get_collection(name=nome)
        except Exception:
            continue  # collection ainda não criada para este setor
        nomes.append(nome)
    return nomes


def _processar_collection(nome: str, forcar_todos: bool, dry_run: bool) -> Dict[str, int]:
    collection = chroma_service.client.get_collection(name=nome)
    total = collection.count()
    if total == 0:
        return {"total": 0, "atualizados": 0}

    dados = collection.get(include=["metadatas"])
    ids = dados.get("ids", [])
    metadatas = dados.get("metadatas", [])

    ids_para_atualizar: List[str] = []
    metas_para_atualizar: List[Dict[str, Any]] = []

    for chunk_id, meta in zip(ids, metadatas):
        meta = dict(meta or {})
        tem_campo = "valido_ate_ord" in meta
        if tem_campo and not forcar_todos:
            continue
        meta["valido_ate_ord"] = data_para_ordinal(meta.get("valido_ate", ""))
        ids_para_atualizar.append(chunk_id)
        metas_para_atualizar.append(meta)

    if ids_para_atualizar and not dry_run:
        for i in range(0, len(ids_para_atualizar), LOTE):
            collection.update(
                ids=ids_para_atualizar[i:i + LOTE],
                metadatas=metas_para_atualizar[i:i + LOTE],
            )

    return {"total": total, "atualizados": len(ids_para_atualizar)}


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill de valido_ate_ord no ChromaDB.")
    parser.add_argument("--dry-run", action="store_true", help="Só relata, não escreve.")
    parser.add_argument("--all", dest="forcar_todos", action="store_true",
                        help="Recalcula valido_ate_ord para todos os chunks.")
    args = parser.parse_args()

    collections = _listar_collections()
    if not collections:
        print("Nenhuma collection corpai_* encontrada.")
        return

    print(f"sentinela 'nunca vence' = {DATA_ORD_SEM_VENCIMENTO}")
    print(f"modo: {'DRY-RUN' if args.dry_run else 'APLICAR'}"
          f"{' (--all)' if args.forcar_todos else ''}")
    print("-" * 56)

    total_chunks = 0
    total_atualizados = 0
    for nome in collections:
        r = _processar_collection(nome, args.forcar_todos, args.dry_run)
        total_chunks += r["total"]
        total_atualizados += r["atualizados"]
        print(f"{nome:<32} chunks={r['total']:<6} atualizados={r['atualizados']}")

    print("-" * 56)
    verbo = "seriam atualizados" if args.dry_run else "atualizados"
    print(f"Total: {total_atualizados} chunks {verbo} (de {total_chunks}).")


if __name__ == "__main__":
    main()
