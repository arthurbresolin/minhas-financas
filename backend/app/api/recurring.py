from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Account, RecurringRule, User
from app.schemas.recurring import (
    VALID_RECURRING_KINDS,
    RecurringCreate,
    RecurringRead,
    RecurringUpdate,
)
from app.services.faturas import hoje_utc
from app.services.recorrentes import aplicar, datas_devidas

router = APIRouter(prefix="/recurring", tags=["recurring"])


async def _get_owned_rule(db: AsyncSession, user_id: int, rule_id: int) -> RecurringRule:
    """Busca a regra exigindo que ela seja do usuário do token.

    Filtrar por dono aqui, e não só pelo id, é o que impede alguém de ler ou
    editar a regra de outra pessoa trocando o número na URL.
    """
    result = await db.execute(
        select(RecurringRule).where(RecurringRule.id == rule_id, RecurringRule.user_id == user_id)
    )
    rule = result.scalar_one_or_none()
    if rule is None:
        raise HTTPException(status_code=404, detail="recorrência não encontrada")
    return rule


async def _exige_conta_propria(db: AsyncSession, user_id: int, account_id: int) -> None:
    dono = await db.scalar(
        select(Account.id).where(Account.id == account_id, Account.user_id == user_id)
    )
    if dono is None:
        raise HTTPException(status_code=404, detail="conta não encontrada")


def _para_leitura(rule: RecurringRule, hoje: date) -> RecurringRead:
    data = RecurringRead.model_validate(rule)
    if rule.active:
        # `datas_devidas` só olha pro passado. A próxima é a primeira data que
        # ainda não venceu — calculada rodando a mesma regra um mês à frente,
        # pra não existir uma segunda conta de calendário que possa divergir.
        futuras = datas_devidas(rule, _um_mes_depois(hoje))
        adiante = [d for d in futuras if d > hoje]
        data.proxima_em = adiante[0] if adiante else None
    return data


def _um_mes_depois(hoje: date) -> date:
    from calendar import monthrange

    ano, mes = (hoje.year + 1, 1) if hoje.month == 12 else (hoje.year, hoje.month + 1)
    return date(ano, mes, min(hoje.day, monthrange(ano, mes)[1]))


@router.get("", response_model=list[RecurringRead])
async def list_rules(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    hoje = hoje_utc()
    # Materializa antes de listar: é aqui que a pessoa vem conferir se a mesada
    # caiu, e listar sem aplicar mostraria "próxima em" de uma data já passada.
    await aplicar(db, user.id, hoje)
    result = await db.execute(
        select(RecurringRule).where(RecurringRule.user_id == user.id).order_by(RecurringRule.id)
    )
    return [_para_leitura(rule, hoje) for rule in result.scalars().all()]


@router.post("", response_model=RecurringRead, status_code=201)
async def create_rule(
    payload: RecurringCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.kind not in VALID_RECURRING_KINDS:
        raise HTTPException(status_code=422, detail="tipo inválido para recorrência")
    await _exige_conta_propria(db, user.id, payload.account_id)

    hoje = hoje_utc()
    rule = RecurringRule(
        user_id=user.id,
        account_id=payload.account_id,
        category_id=payload.category_id,
        kind=payload.kind,
        amount_cents=payload.amount_cents,
        description=payload.description,
        day_of_month=payload.day_of_month,
        start_on=payload.start_on or hoje,
        active=True,
    )
    db.add(rule)
    await db.commit()
    await db.refresh(rule)

    # Uma regra que começa no passado já nasce devendo lançamentos. Aplicar
    # agora evita a surpresa de eles aparecerem só na próxima abertura do app.
    await aplicar(db, user.id, hoje)
    await db.refresh(rule)
    return _para_leitura(rule, hoje)


@router.patch("/{rule_id}", response_model=RecurringRead)
async def update_rule(
    rule_id: int,
    payload: RecurringUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    rule = await _get_owned_rule(db, user.id, rule_id)
    dados = payload.model_dump(exclude_unset=True)

    if "kind" in dados and dados["kind"] not in VALID_RECURRING_KINDS:
        raise HTTPException(status_code=422, detail="tipo inválido para recorrência")
    if "account_id" in dados:
        await _exige_conta_propria(db, user.id, dados["account_id"])

    for campo, valor in dados.items():
        setattr(rule, campo, valor)

    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    return _para_leitura(rule, hoje_utc())


@router.delete("/{rule_id}", status_code=204)
async def delete_rule(
    rule_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Apaga a regra. As transações que ela já gerou ficam.

    Elas são lançamentos de verdade: o dinheiro entrou ou saiu. Apagá-las junto
    reescreveria o histórico por causa de uma decisão sobre o futuro.
    """
    rule = await _get_owned_rule(db, user.id, rule_id)
    await db.delete(rule)
    await db.commit()
