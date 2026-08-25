from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.services.faturas import hoje_utc
from app.services.recorrentes import aplicar
from app.models import Account, Category, Transaction, User
from app.schemas.transaction import (
    TransactionCreate,
    TransactionRead,
    TransactionUpdate,
    TransferCreate,
)

router = APIRouter(prefix="/transactions", tags=["transactions"])

# Só estes dois podem ser criados/editados diretamente. As pernas de
# transferência nascem e morrem em par, pelo endpoint /transactions/transfer.
DIRECT_KINDS = {"expense", "income"}


def _now_naive() -> datetime:
    # SQLite devolve DateTime sem timezone mesmo em colunas timezone=True, então
    # comparar exige naive dos dois lados — misturar aware e naive dá TypeError.
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _as_naive(value: datetime | None) -> datetime:
    if value is None:
        return _now_naive()
    return value.astimezone(timezone.utc).replace(tzinfo=None) if value.tzinfo else value


async def _assert_owns_account(db: AsyncSession, user_id: int, account_id: int) -> Account:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="conta não encontrada")
    return account


async def _assert_owns_category(db: AsyncSession, user_id: int, category_id: int | None) -> None:
    if category_id is None:
        return
    result = await db.execute(
        select(Category.id).where(Category.id == category_id, Category.user_id == user_id)
    )
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="categoria não encontrada")


@router.get("", response_model=list[TransactionRead])
async def list_transactions(
    account_id: int | None = None,
    category_id: int | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # O que se repete vira transação aqui: sem agendador, a leitura é o
    # gatilho. Ver services/recorrentes.py.
    await aplicar(db, user.id, hoje_utc())

    query = select(Transaction).where(Transaction.user_id == user.id)
    if account_id is not None:
        query = query.where(Transaction.account_id == account_id)
    if category_id is not None:
        query = query.where(Transaction.category_id == category_id)
    if since is not None:
        query = query.where(Transaction.occurred_at >= _as_naive(since))
    if until is not None:
        query = query.where(Transaction.occurred_at <= _as_naive(until))
    query = query.order_by(Transaction.occurred_at.desc(), Transaction.id.desc())
    result = await db.execute(query.limit(limit).offset(offset))
    return list(result.scalars().all())


@router.post("", response_model=TransactionRead, status_code=201)
async def create_transaction(
    payload: TransactionCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.kind not in DIRECT_KINDS:
        raise HTTPException(
            status_code=422, detail="use /transactions/transfer para transferências"
        )
    await _assert_owns_account(db, user.id, payload.account_id)
    await _assert_owns_category(db, user.id, payload.category_id)

    transaction = Transaction(
        user_id=user.id,
        account_id=payload.account_id,
        category_id=payload.category_id,
        kind=payload.kind,
        amount_cents=payload.amount_cents,
        description=payload.description,
        occurred_at=_as_naive(payload.occurred_at),
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.post("/transfer", response_model=list[TransactionRead], status_code=201)
async def create_transfer(
    payload: TransferCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria as duas pernas de uma transferência de uma vez.

    Nunca expor um endpoint que crie só um dos lados: se a segunda perna
    falhasse depois da primeira, o dinheiro sumiria do app sem ter saído da
    vida real.
    """
    if payload.from_account_id == payload.to_account_id:
        raise HTTPException(status_code=422, detail="escolha duas contas diferentes")
    await _assert_owns_account(db, user.id, payload.from_account_id)
    await _assert_owns_account(db, user.id, payload.to_account_id)

    group_id = str(uuid4())
    occurred_at = _as_naive(payload.occurred_at)
    legs = [
        Transaction(
            user_id=user.id,
            account_id=payload.from_account_id,
            kind="transfer_out",
            amount_cents=payload.amount_cents,
            description=payload.description,
            occurred_at=occurred_at,
            transfer_group_id=group_id,
        ),
        Transaction(
            user_id=user.id,
            account_id=payload.to_account_id,
            kind="transfer_in",
            amount_cents=payload.amount_cents,
            description=payload.description,
            occurred_at=occurred_at,
            transfer_group_id=group_id,
        ),
    ]
    db.add_all(legs)
    await db.commit()
    for leg in legs:
        await db.refresh(leg)
    return legs


@router.patch("/{transaction_id}", response_model=TransactionRead)
async def update_transaction(
    transaction_id: int,
    payload: TransactionUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user.id
        )
    )
    transaction = result.scalar_one_or_none()
    if transaction is None:
        raise HTTPException(status_code=404, detail="transação não encontrada")
    if transaction.transfer_group_id is not None:
        raise HTTPException(
            status_code=409,
            detail="transferência não é editável; exclua e lance de novo",
        )

    changes = payload.model_dump(exclude_unset=True)
    if "kind" in changes and changes["kind"] not in DIRECT_KINDS:
        raise HTTPException(status_code=422, detail="tipo inválido")
    if "account_id" in changes:
        await _assert_owns_account(db, user.id, changes["account_id"])
    if "category_id" in changes:
        await _assert_owns_category(db, user.id, changes["category_id"])
    if "occurred_at" in changes:
        changes["occurred_at"] = _as_naive(changes["occurred_at"])

    for field, value in changes.items():
        setattr(transaction, field, value)
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)
    return transaction


@router.delete("/{transaction_id}", status_code=204)
async def delete_transaction(
    transaction_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == transaction_id, Transaction.user_id == user.id
        )
    )
    transaction = result.scalar_one_or_none()
    if transaction is None:
        raise HTTPException(status_code=404, detail="transação não encontrada")

    # Apagar uma perna de transferência sozinha deixaria o dinheiro duplicado
    # ou sumido — as duas saem juntas, como entraram.
    if transaction.transfer_group_id is not None:
        legs = await db.execute(
            select(Transaction).where(
                Transaction.transfer_group_id == transaction.transfer_group_id,
                Transaction.user_id == user.id,
            )
        )
        for leg in legs.scalars().all():
            await db.delete(leg)
    else:
        await db.delete(transaction)
    await db.commit()
