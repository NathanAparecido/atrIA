"""
CorpAI Backend — Aplicação principal FastAPI.
Ponto de entrada da API, configuração de CORS, routers e startup.
"""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pythonjsonlogger import jsonlogger

from config import settings
from models import Base
from models.user import User           # noqa: F401 — registra na metadata
from models.conversation import Conversation, Message  # noqa: F401
from routers import auth, users, documents, chat, health

# ─── Configuração de Logs em JSON ───────────────────────────
logger = logging.getLogger()
handler = logging.StreamHandler(sys.stdout)
formatter = jsonlogger.JsonFormatter(
    fmt="%(asctime)s %(name)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
handler.setFormatter(formatter)
logger.addHandler(handler)
logger.setLevel(logging.INFO)


# ─── Dependência do banco de dados ──────────────────────────
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

engine = create_async_engine(settings.DATABASE_URL, echo=False)
async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db():
    """Dependency que fornece uma sessão de banco de dados."""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


# ─── Criação do admin inicial ────────────────────────────────
async def criar_admin_inicial():
    """Cria o usuário administrador se não existir."""
    from sqlalchemy import select
    from models.user import User
    from passlib.context import CryptContext

    pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

    async with async_session() as session:
        result = await session.execute(
            select(User).where(User.username == settings.ADMIN_USERNAME)
        )
        admin = result.scalar_one_or_none()

        if admin is None:
            admin = User(
                username=settings.ADMIN_USERNAME,
                hashed_password=pwd_context.hash(settings.ADMIN_PASSWORD),
                nome_completo="Administrador",
                setor="global",
                role="admin",
                ativo=True,
            )
            session.add(admin)
            await session.commit()
            logging.info(
                "Usuário administrador criado com sucesso.",
                extra={"username": settings.ADMIN_USERNAME},
            )
        else:
            # Sincroniza a senha do admin com o valor atual do .env
            if not pwd_context.verify(settings.ADMIN_PASSWORD, admin.hashed_password):
                admin.hashed_password = pwd_context.hash(settings.ADMIN_PASSWORD)
                await session.commit()
                logging.info(
                    "Senha do administrador atualizada conforme variável de ambiente.",
                    extra={"username": settings.ADMIN_USERNAME},
                )
            else:
                logging.info("Usuário administrador já existe.")


# ─── Lifecycle (startup/shutdown) ───────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Eventos de startup e shutdown da aplicação."""
    # Startup: criar tabelas e admin
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await criar_admin_inicial()
    logging.info("CorpAI Backend iniciado com sucesso.")

    yield

    # Shutdown
    await engine.dispose()
    logging.info("CorpAI Backend finalizado.")


# ─── Aplicação FastAPI ──────────────────────────────────────
app = FastAPI(
    title="CorpAI API",
    description="API do sistema de IA interna corporativa.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan,
)

# ─── CORS ────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, restringir aos domínios específicos
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Routers ────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(users.router, prefix="/api/users", tags=["Usuários"])
app.include_router(documents.router, prefix="/api/documents", tags=["Documentos"])
app.include_router(chat.router, prefix="/api/chat", tags=["Chat"])
app.include_router(health.router, prefix="/api", tags=["Saúde"])


@app.get("/api", summary="Raiz da API")
async def root():
    """Endpoint raiz da API CorpAI."""
    return {
        "mensagem": "CorpAI API está operacional.",
        "versao": "1.0.0",
    }
