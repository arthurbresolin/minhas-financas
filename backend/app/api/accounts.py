from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, Transaction, User
from app.schemas.account import (
    VALID_ACCOUNT_KINDS,
    AccountCreate,
    AccountRead,
    AccountUpdate,
)
from app.services.balance import account_balances

router = APIRouter(prefix="/accounts", tags=["accounts"])


async def _get_owned_account(db: AsyncSession, user_id: int, account_id: int) -> Account:
    """Busca a conta exigindo que ela seja do usuário do token.

    Filtrar por dono aqui, e não só pelo id, é o que impede alguém de ler ou
    editar a conta de outra pessoa trocando o número na URL.
    """
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if account is None:
        raise HTTPException(status_code=404, detail="conta não encontrada")
    return account


def _with_balance(account: Account, balances: dict[int, int]) -> AccountRead:
    data = AccountRead.model_validate(account)
    data.balance_cents = balances.get(account.id, account.opening_balance_cents)
    return data


@router.get("", response_model=list[AccountRead])
async def list_accounts(
    include_archived: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Account).where(Account.user_id == user.id)
    if not include_archived:
        query = query.where(Account.archived.is_(False))
    result = await db.execute(query.order_by(Account.id))
    accounts = list(result.scalars().all())
    balances = await account_balances(db, user.id)
    return [_with_balance(account, balances) for account in accounts]


@router.post("", response_model=AccountRead, status_code=201)
async def create_account(
    payload: AccountCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.kind not in VALID_ACCOUNT_KINDS:
        raise HTTPException(status_code=422, detail="tipo de conta inválido")
    account = Account(user_id=user.id, **payload.model_dump())
    db.add(account)
    await db.commit()
    await db.refresh(account)
    balances = await account_balances(db, user.id)
    return _with_balance(account, balances)


@router.patch("/{account_id}", response_model=AccountRead)
async def update_account(
    account_id: int,
    payload: AccountUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await _get_owned_account(db, user.id, account_id)
    changes = payload.model_dump(exclude_unset=True)
    if "kind" in changes and changes["kind"] not in VALID_ACCOUNT_KINDS:
        raise HTTPException(status_code=422, detail="tipo de conta inválido")
    for field, value in changes.items():
        setattr(account, field, value)
    db.add(account)
    await db.commit()
    await db.refresh(account)
    balances = await account_balances(db, user.id)
    return _with_balance(account, balances)


@router.delete("/{account_id}", status_code=204)
async def delete_account(
    account_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    account = await _get_owned_account(db, user.id, account_id)
    count = await db.scalar(
        select(func.count()).select_from(Transaction).where(Transaction.account_id == account.id)
    )
    # Apagar uma conta com histórico apagaria transações junto e mudaria
    # totais de meses já fechados. Arquivar preserva o passado e tira a conta
    # da frente — que é o que a pessoa quer em 99% dos casos.
    if count:
        raise HTTPException(
            status_code=409,
            detail="esta conta tem transações; arquive-a em vez de excluir",
        )
    await db.delete(account)
    await db.commit()
