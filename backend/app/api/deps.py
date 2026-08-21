from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import SHORTCUT_TOKEN_PREFIX, decode_access_token
from app.db.session import get_db
from app.models import User

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve o usuário dono do token.

    Todo endpoint que toca em dado financeiro depende disto e filtra por
    `user.id`. Não existe endpoint "de admin" nem listagem global: se uma query
    não tiver `user_id` no WHERE, é bug.
    """
    user_id = decode_access_token(credentials.credentials, expected_role="user")
    if user_id is None:
        raise HTTPException(status_code=401, detail="token inválido ou expirado")
    user = await db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="token inválido ou expirado")
    return user


async def get_shortcut_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve o dono de um token de Atalho.

    Existe separado do `get_current_user` porque o escopo é outro, e o escopo
    precisa ser garantido pela *estrutura*, não pela boa memória de quem
    escreve o próximo endpoint: só as rotas que dependem disto aceitam o token
    do Atalho, e elas só criam lançamento.

    Um token de login não passa aqui, e um token de Atalho não passa lá — os
    dois formatos são diferentes e cada porta olha só o seu.
    """
    token = credentials.credentials
    result = await db.execute(select(User).where(User.shortcut_token == token))
    user = result.scalar_one_or_none()
    # A checagem do prefixo vem depois da consulta de propósito: comparar antes
    # abriria uma diferença de tempo entre "token malformado" e "token que não
    # existe", e as duas respostas precisam ser indistinguíveis.
    if user is None or not token.startswith(SHORTCUT_TOKEN_PREFIX):
        raise HTTPException(status_code=401, detail="token do atalho inválido ou revogado")
    return user
