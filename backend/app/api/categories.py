from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Category, Transaction, User
from app.schemas.category import (
    VALID_CATEGORY_KINDS,
    CategoryCreate,
    CategoryRead,
    CategoryUpdate,
)

router = APIRouter(prefix="/categories", tags=["categories"])


async def _get_owned_category(db: AsyncSession, user_id: int, category_id: int) -> Category:
    result = await db.execute(
        select(Category).where(Category.id == category_id, Category.user_id == user_id)
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="categoria não encontrada")
    return category


@router.get("", response_model=list[CategoryRead])
async def list_categories(
    kind: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Category).where(Category.user_id == user.id)
    if kind is not None:
        query = query.where(Category.kind == kind)
    result = await db.execute(query.order_by(Category.sort_order, Category.id))
    return list(result.scalars().all())


@router.post("", response_model=CategoryRead, status_code=201)
async def create_category(
    payload: CategoryCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.kind not in VALID_CATEGORY_KINDS:
        raise HTTPException(status_code=422, detail="tipo de categoria inválido")
    category = Category(user_id=user.id, **payload.model_dump())
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.patch("/{category_id}", response_model=CategoryRead)
async def update_category(
    category_id: int,
    payload: CategoryUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    category = await _get_owned_category(db, user.id, category_id)
    changes = payload.model_dump(exclude_unset=True)
    if "kind" in changes and changes["kind"] not in VALID_CATEGORY_KINDS:
        raise HTTPException(status_code=422, detail="tipo de categoria inválido")
    for field, value in changes.items():
        setattr(category, field, value)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
async def delete_category(
    category_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    category = await _get_owned_category(db, user.id, category_id)
    # As transações antigas continuam existindo, só ficam sem categoria — o
    # valor gasto é fato, a etiqueta é opinião. Apagar as transações junto
    # mudaria o total de meses já fechados.
    await db.execute(
        update(Transaction)
        .where(Transaction.category_id == category.id, Transaction.user_id == user.id)
        .values(category_id=None)
    )
    await db.delete(category)
    await db.commit()
