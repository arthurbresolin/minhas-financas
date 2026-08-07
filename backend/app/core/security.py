from datetime import datetime, timedelta, timezone

import bcrypt
import jwt

from app.core.config import settings

JWT_ALGORITHM = "HS256"
# Sem refresh token: "fica logado até deslogar" é resolvido com um token de
# validade longa guardado no expo-secure-store, em vez de infra de refresh.
ACCESS_TOKEN_EXPIRE_DAYS = 365


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def create_access_token(subject_id: int, role: str = "user") -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    payload = {"sub": str(subject_id), "role": role, "exp": expires_at}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str, expected_role: str = "user") -> int | None:
    # A claim "role" existe pra que tokens de papéis diferentes com o mesmo id
    # numérico nunca sejam intercambiáveis — sem ela, dois tokens gerados com o
    # mesmo segredo e algoritmo seriam indistinguíveis.
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[JWT_ALGORITHM])
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
