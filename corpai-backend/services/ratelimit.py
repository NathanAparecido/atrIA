"""
CorpAI — Rate limiting (proteção contra abuso / sobrecarga da GPU).

Limite por JANELA FIXA no Redis, em dois níveis:
  - por usuário   (rl:user:{user_id}:{minuto})  -> justiça entre usuários
  - por instância (rl:inst:{minuto})            -> teto agregado do deploy

Exposto como dependency do FastAPI (`aplicar_rate_limit`) que também autentica
(encadeia `get_current_user`), então pode SUBSTITUIR o `Depends(get_current_user)`
no endpoint de chat sem perder o usuário.

IMPORTANTE — isto é só UMA camada. O que de fato protege a placa de fritar é o
teto de concorrência da própria Ollama (OLLAMA_NUM_PARALLEL / OLLAMA_MAX_QUEUE)
e o teto de saída (num_predict). Rate limit por contagem trata VOLUME, não
concorrência. Veja PROTECAO_SOBRECARGA.md.

Decisão consciente: FALHA ABERTA. Se o Redis cair, o chat continua funcionando
(apenas loga um aviso) — rate limit é anti-abuso, não autorização, e as camadas
de Ollama/nginx seguem protegendo o hardware. Não derrubamos o produto por causa
de um Redis intermitente.
"""

import logging
import time

import redis.asyncio as aioredis
from fastapi import Depends, HTTPException, status

from config import settings
from middleware.auth import get_current_user, TokenData

logger = logging.getLogger(__name__)

# Cliente Redis assíncrono, criado sob demanda (singleton de módulo).
_redis_client = None


def get_redis() -> aioredis.Redis:
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
        )
    return _redis_client


async def _consumir(r: aioredis.Redis, chave: str, limite: int, janela_seg: int):
    """
    Incrementa o contador da janela e diz se ainda está dentro do limite.

    Seta o EXPIRE só quando a chave nasce (atual == 1), pra janela resetar
    sozinha. Retorna (permitido: bool, contagem_atual: int).
    """
    atual = await r.incr(chave)
    if atual == 1:
        await r.expire(chave, janela_seg)
    return atual <= limite, atual


async def aplicar_rate_limit(
    current_user: TokenData = Depends(get_current_user),
) -> TokenData:
    """
    Dependency: autentica E aplica rate limit por usuário e por instância.

    Levanta 429 (com Retry-After) se algum dos dois tetos estourar. Em qualquer
    falha de infraestrutura do Redis, libera a requisição (falha aberta) e loga.
    """
    minuto = int(time.time() // 60)  # bucket de 60s

    try:
        r = get_redis()
        ok_user, n_user = await _consumir(
            r,
            f"rl:user:{current_user.user_id}:{minuto}",
            settings.RATE_LIMIT_USER_PER_MIN,
            60,
        )
        ok_inst, n_inst = await _consumir(
            r,
            f"rl:inst:{minuto}",
            settings.RATE_LIMIT_INSTANCE_PER_MIN,
            60,
        )
    except Exception as e:
        # Falha aberta: não derruba o chat por causa do Redis.
        logger.warning(
            "Rate limit indisponível (Redis); liberando a requisição.",
            extra={"erro": str(e)},
        )
        return current_user

    if not ok_user:
        logger.info(
            "Rate limit por usuário estourado.",
            extra={"username": current_user.username, "contagem": n_user},
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Você fez muitas requisições. Aguarde um instante e tente novamente.",
            headers={"Retry-After": "60"},
        )

    if not ok_inst:
        logger.warning(
            "Rate limit da instância estourado (sistema sob carga).",
            extra={"contagem": n_inst},
        )
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="O sistema está com muitas requisições no momento. Tente novamente em instantes.",
            headers={"Retry-After": "30"},
        )

    return current_user
