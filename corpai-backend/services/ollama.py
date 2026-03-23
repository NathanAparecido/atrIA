"""
CorpAI — Serviço Ollama.
Chamadas ao LLM (qwen2.5:72b) e ao modelo de embedding (nomic-embed-text).
Comunicação via httpx async client — nunca expõe Ollama externamente.
"""

import logging
from typing import AsyncGenerator, List

import httpx

from config import settings

logger = logging.getLogger(__name__)


class OllamaService:
    """Serviço de comunicação com o Ollama local."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.embed_model = settings.OLLAMA_EMBED_MODEL

    async def generate_embedding(self, text: str) -> List[float]:
        """
        Gera embedding de um texto via nomic-embed-text.

        Args:
            text: Texto para gerar o embedding

        Returns:
            Lista de floats representando o vetor de embedding
        """
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{self.base_url}/api/embed",
                json={
                    "model": self.embed_model,
                    "input": text,
                },
            )
            response.raise_for_status()
            data = response.json()

            # A API retorna "embeddings" como lista de vetores
            embeddings = data.get("embeddings", [])
            if embeddings:
                return embeddings[0]

            raise ValueError("Resposta do Ollama não contém embeddings.")

    async def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Gera embeddings em lote para múltiplos textos.

        Args:
            texts: Lista de textos

        Returns:
            Lista de vetores de embedding
        """
        embeddings = []
        for text in texts:
            emb = await self.generate_embedding(text)
            embeddings.append(emb)
        return embeddings

    async def generate_response(
        self, prompt: str, system_prompt: str = "", stream: bool = True
    ) -> AsyncGenerator[str, None]:
        """
        Gera resposta do LLM via streaming.

        Args:
            prompt: Prompt do usuário com contexto RAG
            system_prompt: Prompt de sistema
            stream: Se True, retorna como generator (SSE)

        Yields:
            Chunks de texto da resposta
        """
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": messages,
                    "stream": True,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9,
                        "num_ctx": 8192,
                    },
                },
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line:
                        import json

                        try:
                            data = json.loads(line)
                            content = data.get("message", {}).get("content", "")
                            if content:
                                yield content

                            # Verificar se é a última mensagem
                            if data.get("done", False):
                                break
                        except json.JSONDecodeError:
                            continue

    async def generate_response_sync(
        self, prompt: str, system_prompt: str = ""
    ) -> str:
        """
        Gera resposta completa (sem streaming) do LLM.

        Args:
            prompt: Prompt do usuário
            system_prompt: Prompt de sistema

        Returns:
            Texto completo da resposta
        """
        full_response = ""
        async for chunk in self.generate_response(prompt, system_prompt, stream=True):
            full_response += chunk
        return full_response

    async def health_check(self) -> bool:
        """Verifica se o Ollama está acessível."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> list:
        """Lista os modelos disponíveis no Ollama."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.base_url}/api/tags")
                response.raise_for_status()
                data = response.json()
                return data.get("models", [])
        except Exception as e:
            logger.error("Erro ao listar modelos do Ollama.", extra={"erro": str(e)})
            return []


# Instância global do serviço
ollama_service = OllamaService()
