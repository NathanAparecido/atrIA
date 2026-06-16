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
        "gerente",
        "admin",
    ]

    # ─── RAG ─────────────────────────────────────────────
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 64
    RAG_TOP_K: int = 5

    # Embedding em batch (CPU-only): tamanho do sub-lote enviado ao Ollama
    # por requisição e teto de concorrência do fallback. Mantidos baixos
    # de propósito — não dispare dezenas de requisições simultâneas.
    EMBED_BATCH_SIZE: int = 16
    EMBED_CONCURRENCY: int = 4

    # Máximo de imagens anexadas a uma resposta (coletadas do retrieval).
    RAG_MAX_IMAGES: int = 3

    # ─── Imagens da base de conhecimento ─────────────────────
    # Armazenamento físico fora do StaticFiles (servido só via endpoint
    # autenticado). Subpasta por setor: {IMAGES_DIR}/{setor}/{uuid}.{ext}.
    IMAGES_DIR: str = "/data/images"
    IMAGE_MAX_MB: int = 5
    EXTENSOES_IMAGEM: List[str] = [".png", ".jpg", ".jpeg", ".webp", ".gif"]

    # ─── Proteção / limites de uso ───────────────────────────
    # Rate limit por janela de 60s.
    RATE_LIMIT_USER_PER_MIN: int = 12       # por usuário
    RATE_LIMIT_INSTANCE_PER_MIN: int = 30   # agregado do deploy inteiro

    # Teto de tamanho da mensagem de entrada (caracteres). Bloqueia prompts
    # gigantes que pinariam o modelo. ~8000 chars ≈ alguns milhares de tokens.
    MAX_INPUT_CHARS: int = 8000

    # Teto de tokens de saída por resposta (num_predict da Ollama). Impede o
    # "me escreva 50 mil palavras" de segurar a GPU por minutos.
    LLM_MAX_OUTPUT_TOKENS: int = 1024

    class Config:
        env_file = ".env"
        case_sensitive = True


# Instância global de configurações
settings = Settings()
