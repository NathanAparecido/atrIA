"""
CorpAI Backend — Configurações via variáveis de ambiente.
Todas as configs sensíveis vêm do .env (nunca hardcoded).
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    """Configurações centralizadas do backend CorpAI."""

    # ─── PostgreSQL ──────────────────────────────────────
    POSTGRES_USER: str = "corpai"
    POSTGRES_PASSWORD: str = ""
    POSTGRES_DB: str = "corpai"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432

    @property
    def DATABASE_URL(self) -> str:
        """URL de conexão async com PostgreSQL."""
        return (
            f"postgresql+asyncpg://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    @property
    def DATABASE_URL_SYNC(self) -> str:
        """URL de conexão síncrona (para migrações)."""
        return (
            f"postgresql+psycopg2://{self.POSTGRES_USER}:{self.POSTGRES_PASSWORD}"
            f"@{self.POSTGRES_HOST}:{self.POSTGRES_PORT}/{self.POSTGRES_DB}"
        )

    # ─── Redis ───────────────────────────────────────────
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379
    REDIS_PASSWORD: str = ""

    @property
    def REDIS_URL(self) -> str:
        return f"redis://:{self.REDIS_PASSWORD}@{self.REDIS_HOST}:{self.REDIS_PORT}/0"

    # ─── Ollama ──────────────────────────────────────────
    OLLAMA_HOST: str = "ollama"
    OLLAMA_PORT: int = 11434
    OLLAMA_MODEL: str = "qwen2.5:72b"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"

    @property
    def OLLAMA_BASE_URL(self) -> str:
        return f"http://{self.OLLAMA_HOST}:{self.OLLAMA_PORT}"

    # ─── ChromaDB ────────────────────────────────────────
    CHROMA_HOST: str = "chromadb"
    CHROMA_PORT: int = 8000
    CHROMA_AUTH_TOKEN: str = ""

    # ─── JWT / Autenticação ──────────────────────────────
    SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ─── Admin Inicial ───────────────────────────────────
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = ""

    # ─── Setores Válidos ─────────────────────────────────
    SETORES_VALIDOS: List[str] = [
        "noc",
        "suporte_n2",
        "suporte_n3",
        "financeiro",
        "diretoria",
        "vendas",
        "marketing",
        "vendas_dc",
        "infra",
        "suporte_rua",
        "global",
    ]

    # ─── Roles Válidos ───────────────────────────────────
    ROLES_VALIDOS: List[str] = [
        "colaborador",
        "lider_setor",
        "admin",
    ]

    # ─── RAG ─────────────────────────────────────────────
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64
    RAG_TOP_K: int = 5

    class Config:
        env_file = ".env"
        case_sensitive = True


# Instância global de configurações
settings = Settings()
