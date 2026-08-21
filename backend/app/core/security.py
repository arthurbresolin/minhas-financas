import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import JWT_SECRET

JWT_ALGORITHM = "HS256"
# Sem refresh token: "fica logado até deslogar" é resolvido com um token de
# validade longa guardado no expo-secure-store, em vez de infra de refresh.
ACCESS_TOKEN_EXPIRE_DAYS = 365


# Prefixo no token pra que ele seja reconhecível de relance — num print de
# tela, num log, numa colagem errada — e pra que um varredor de segredo
# consiga achá-lo. "mf" de Minhas Finanças, "atl" de atalho.
SHORTCUT_TOKEN_PREFIX = "mf_atl_"


def create_shortcut_token() -> str:
    """Gera o token do Atalho.

    Aleatório e opaco, não um JWT: ele não precisa carregar informação nenhuma,
    e ser opaco é o que permite revogá-lo de verdade — apagar a linha do banco
    o mata na hora. Um JWT continuaria valendo até expirar.
    """
    return SHORTCUT_TOKEN_PREFIX + secrets.token_urlsafe(24)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(subject_id: int, role: str = "user") -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(subject_id), "role": role, "exp": expires_at}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str, expected_role: str = "user") -> int | None:
    # A claim "role" existe pra que tokens de papéis diferentes com o mesmo id
    # numérico nunca sejam intercambiáveis — sem ela, dois tokens gerados com o
    # mesmo segredo e algoritmo seriam indistinguíveis.
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    if payload.get("role") != expected_role:
        return None
    subject = payload.get("sub")
    if subject is None:
        return None
    try:
        return int(subject)
    except ValueError:
        return None
