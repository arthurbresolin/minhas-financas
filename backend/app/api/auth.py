from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.api.themes import seed_presets
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models import Account, Category, DEFAULT_CATEGORIES, User
from app.schemas.user import (
    AuthResponse,
    ChangePasswordRequest,
    MessageResponse,
    UserLogin,
    UserRead,
    UserRegister,
    UserUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])


async def _seed_new_user(db: AsyncSession, user: User) -> None:
    """Deixa a conta utilizável no primeiro login.

    Sem isso o usuário cai num app vazio onde nem dá pra lançar um gasto (toda
    transação precisa de uma conta). A carteira "Dinheiro" e as categorias
    padrão são linhas normais — dá pra renomear ou apagar tudo depois.
    """
    db.add(Account(user_id=user.id, name="Dinheiro", kind="cash", icon="💵"))
    for order, (name, emoji, color, kind) in enumerate(DEFAULT_CATEGORIES):
        db.add(
            Category(
                user_id=user.id, name=name, emoji=emoji, color=color, kind=kind, sort_order=order
            )
        )
    await seed_presets(db, user)


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none() is not None:
        raise HTTPException(status_code=409, detail="já existe uma conta com este e-mail")

    user = User(
        email=payload.email, password_hash=hash_password(payload.password), name=payload.name
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    await _seed_new_user(db, user)
    await db.commit()

    return AuthResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=AuthResponse)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    # Mesma mensagem para e-mail inexistente e senha errada, de propósito:
    # diferenciar entrega de graça a informação de quais e-mails têm conta.
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="e-mail ou senha incorretos")
    return AuthResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserRead)
async def read_me(user: User = Depends(get_current_user)):
    return user


@router.patch("/me", response_model=UserRead)
async def update_me(
    payload: UserUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/change-password", response_model=MessageResponse)
async def change_password(
    payload: ChangePasswordRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="senha atual incorreta")
    user.password_hash = hash_password(payload.new_password)
    db.add(user)
    await db.commit()
    return MessageResponse(message="senha alterada")
