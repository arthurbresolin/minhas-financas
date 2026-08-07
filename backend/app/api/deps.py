from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
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
