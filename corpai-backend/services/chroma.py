"""
CorpAI — Serviço ChromaDB.
Isolamento de namespaces por setor, ingestão e busca vetorial.
Cada setor tem sua própria collection. A collection 'global' é sempre incluída nas buscas.
"""

import logging
from typing import List, Optional, Dict, Any

import chromadb
from chromadb.config import Settings as ChromaSettings

from config import settings

logger = logging.getLogger(__name__)


class ChromaService:
    """Serviço de gerenciamento do ChromaDB com isolamento de namespaces."""

    def __init__(self):
        """Inicializa o client ChromaDB."""
        self.client = chromadb.HttpClient(
            host=settings.CHROMA_HOST,
            port=settings.CHROMA_PORT,
            headers={"Authorization": f"Bearer {settings.CHROMA_AUTH_TOKEN}"},
        )
        logger.info(
            "ChromaDB conectado.",
            extra={"host": settings.CHROMA_HOST, "port": settings.CHROMA_PORT},
        )

    def _get_collection(self, namespace: str):
        """Obtém ou cria uma collection para o namespace."""
        return self.client.get_or_create_collection(
            name=f"corpai_{namespace}",
            metadata={"hnsw:space": "cosine"},
        )

    def add_documents(
        self,
        namespace: str,
        documents: List[str],
        embeddings: List[List[float]],
        metadatas: List[Dict[str, Any]],
        ids: List[str],
    ) -> None:
        """
        Adiciona documentos chunkeados ao namespace especificado.

        Args:
            namespace: Nome do setor (ex: 'noc', 'financeiro')
            documents: Lista de chunks de texto
            embeddings: Lista de vetores de embedding
            metadatas: Lista de metadados por chunk
            ids: Lista de IDs únicos por chunk
        """
        collection = self._get_collection(namespace)
        collection.add(
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas,
            ids=ids,
        )
        logger.info(
            "Documentos adicionados ao ChromaDB.",
            extra={"namespace": namespace, "total_chunks": len(documents)},
        )

    def query(
        self,
        namespace: str,
        query_embedding: List[float],
        n_results: int = 5,
    ) -> List[Dict[str, Any]]:
        """
        Busca vetorial no namespace do setor + namespace global.
        Sempre combina resultados de ambos os namespaces.

        Args:
            namespace: Namespace do setor do usuário
            query_embedding: Vetor de embedding da query
            n_results: Número de resultados por namespace

        Returns:
            Lista combinada de resultados relevantes
        """
        resultados = []

        # Buscar no namespace do setor
        try:
            collection_setor = self._get_collection(namespace)
            if collection_setor.count() > 0:
                results_setor = collection_setor.query(
                    query_embeddings=[query_embedding],
                    n_results=min(n_results, collection_setor.count()),
                    include=["documents", "metadatas", "distances"],
                )
                for i, doc in enumerate(results_setor["documents"][0]):
                    resultados.append({
                        "documento": doc,
                        "metadata": results_setor["metadatas"][0][i],
                        "distancia": results_setor["distances"][0][i],
                        "namespace": namespace,
                    })
        except Exception as e:
            logger.warning(
                "Erro ao buscar no namespace do setor.",
                extra={"namespace": namespace, "erro": str(e)},
            )

        # Buscar no namespace global (sempre incluído)
        if namespace != "global":
            try:
                collection_global = self._get_collection("global")
                if collection_global.count() > 0:
                    results_global = collection_global.query(
                        query_embeddings=[query_embedding],
                        n_results=min(n_results, collection_global.count()),
                        include=["documents", "metadatas", "distances"],
                    )
                    for i, doc in enumerate(results_global["documents"][0]):
                        resultados.append({
                            "documento": doc,
                            "metadata": results_global["metadatas"][0][i],
                            "distancia": results_global["distances"][0][i],
                            "namespace": "global",
                        })
            except Exception as e:
                logger.warning(
                    "Erro ao buscar no namespace global.",
                    extra={"erro": str(e)},
                )

        # Ordenar por relevância (menor distância = mais relevante)
        resultados.sort(key=lambda x: x["distancia"])

        return resultados[:n_results * 2]

    def delete_document(self, namespace: str, document_id: str) -> None:
        """
        Remove todos os chunks de um documento específico do namespace.

        Args:
            namespace: Namespace do setor
            document_id: ID do documento (usado como prefixo nos IDs dos chunks)
        """
        collection = self._get_collection(namespace)

        # Buscar todos os IDs que começam com o document_id
        all_ids = collection.get(
            where={"document_id": document_id},
            include=[],
        )

        if all_ids["ids"]:
            collection.delete(ids=all_ids["ids"])
            logger.info(
                "Documento removido do ChromaDB.",
                extra={
                    "namespace": namespace,
                    "document_id": document_id,
                    "chunks_removidos": len(all_ids["ids"]),
                },
            )
        else:
            logger.warning(
                "Documento não encontrado no ChromaDB.",
                extra={"namespace": namespace, "document_id": document_id},
            )

    def list_documents(self, namespace: str) -> List[Dict[str, Any]]:
        """
        Lista os documentos indexados em um namespace.
        Agrupa por document_id nos metadados.

        Returns:
            Lista de documentos com seus metadados
        """
        collection = self._get_collection(namespace)

        if collection.count() == 0:
            return []

        # Obter todos os metadados
        all_data = collection.get(include=["metadatas"])

        # Agrupar por document_id
        docs = {}
        for metadata in all_data["metadatas"]:
            doc_id = metadata.get("document_id", "desconhecido")
            if doc_id not in docs:
                docs[doc_id] = {
                    "document_id": doc_id,
                    "nome_arquivo": metadata.get("nome_arquivo", "desconhecido"),
                    "total_chunks": 0,
                    "criado_em": metadata.get("criado_em", ""),
                }
            docs[doc_id]["total_chunks"] += 1

        return list(docs.values())

    def health_check(self) -> bool:
        """Verifica se o ChromaDB está acessível."""
        try:
            self.client.heartbeat()
            return True
        except Exception:
            return False


# Instância global do serviço
chroma_service = ChromaService()
