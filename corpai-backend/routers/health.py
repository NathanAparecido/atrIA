"""
CorpAI — Router de Health Check.
Verifica o status de todos os serviços dependentes.
"""

import logging

from fastapi import APIRouter
from pydantic import BaseModel
import httpx
import redis.asyncio as aioredis

from config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


class ServiceStatus(BaseModel):
    nome: str
    status: str  # "online" ou "offline"
    detalhes: str = ""


class HealthResponse(BaseModel):
    status: str  # "saudavel" ou "degradado"
    servicos: list[ServiceStatus]


@router.get("/health", response_model=HealthResponse, summary="Status dos serviços")
async def health_check():
    """
    Verifica o status de todos os serviços dependentes:
    Ollama, ChromaDB, PostgreSQL, Redis, Dify.
    """
    servicos = []
    todos_online = True

    # ─── Ollama ──────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{settings.OLLAMA_BASE_URL}/api/tags")
            if resp.status_code == 200:
                data = resp.json()
                modelos = [m.get("name", "") for m in data.get("models", [])]
                servicos.append(
                    ServiceStatus(
                        nome="Ollama",
                        status="online",
                        detalhes=f"Modelos disponíveis: {', '.join(modelos) if modelos else 'nenhum'}",
                    )
                )
            else:
                todos_online = False
                servicos.append(
                    ServiceStatus(
                        nome="Ollama",
                        status="offline",
                        detalhes=f"HTTP {resp.status_code}",
                    )
                )
    except Exception as e:
        todos_online = False
        servicos.append(
            ServiceStatus(nome="Ollama", status="offline", detalhes=str(e))
        )

    # ─── ChromaDB ────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                f"http://{settings.CHROMA_HOST}:{settings.CHROMA_PORT}/api/v1/heartbeat"
            )
            if resp.status_code == 200:
                servicos.append(
                    ServiceStatus(nome="ChromaDB", status="online", detalhes="Heartbeat OK")
                )
            else:
                todos_online = False
                servicos.append(
                    ServiceStatus(
                        nome="ChromaDB",
                        status="offline",
                        detalhes=f"HTTP {resp.status_code}",
                    )
                )
    except Exception as e:
        todos_online = False
        servicos.append(
            ServiceStatus(nome="ChromaDB", status="offline", detalhes=str(e))
        )

    # ─── PostgreSQL ──────────────────────────────────────
    try:
        from sqlalchemy import text
        from main import async_session

        async with async_session() as session:
            result = await session.execute(text("SELECT 1"))
            if result:
                servicos.append(
                    ServiceStatus(
                        nome="PostgreSQL",
                        status="online",
                        detalhes=f"Banco: {settings.POSTGRES_DB}",
                    )
                )
    except Exception as e:
        todos_online = False
        servicos.append(
            ServiceStatus(nome="PostgreSQL", status="offline", detalhes=str(e))
        )

    # ─── Redis ───────────────────────────────────────────
    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        pong = await r.ping()
        await r.aclose()
        if pong:
            servicos.append(
                ServiceStatus(nome="Redis", status="online", detalhes="PONG")
            )
        else:
            todos_online = False
            servicos.append(
                ServiceStatus(nome="Redis", status="offline", detalhes="Sem resposta ao PING")
            )
    except Exception as e:
        todos_online = False
        servicos.append(
            ServiceStatus(nome="Redis", status="offline", detalhes=str(e))
        )

    # ─── Dify ────────────────────────────────────────────
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get("http://dify-api:5001/health")
            if resp.status_code == 200:
                servicos.append(
                    ServiceStatus(nome="Dify", status="online", detalhes="API OK")
                )
            else:
                todos_online = False
                servicos.append(
                    ServiceStatus(
                        nome="Dify",
                        status="offline",
                        detalhes=f"HTTP {resp.status_code}",
                    )
                )
    except Exception as e:
        todos_online = False
        servicos.append(
            ServiceStatus(nome="Dify", status="offline", detalhes=str(e))
        )

    return HealthResponse(
        status="saudavel" if todos_online else "degradado",
        servicos=servicos,
    )
