from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Account, KIND_SIGN, Transaction


def _signed_amount_sql():
    """Soma das transações já com o sinal do tipo aplicado, em SQL.

    Fazer isso no banco (e não em Python) importa porque o saldo é lido em toda
    listagem de conta e no resumo — trazer todas as transações pra memória só
    pra somar não escala e é fácil de esquecer de refazer em algum lugar.
    """
    return func.coalesce(
        func.sum(
            case(
                *[(Transaction.kind == kind, Transaction.amount_cents * sign) for kind, sign in KIND_SIGN.items()],
                else_=0,
            )
        ),
        0,
    )


async def account_balances(db: AsyncSession, user_id: int) -> dict[int, int]:
    """Saldo atual de cada conta do usuário: abertura + soma das transações.

    Contas sem nenhuma transação também aparecem (com o saldo de abertura), por
    isso o LEFT JOIN em vez de agrupar direto na tabela de transações.
    """
    result = await db.execute(
        select(
            Account.id,
            Account.opening_balance_cents + _signed_amount_sql(),
        )
        .select_from(Account)
        .outerjoin(Transaction, Transaction.account_id == Account.id)
        .where(Account.user_id == user_id)
        .group_by(Account.id)
    )
    return {account_id: balance for account_id, balance in result.all()}


async def total_balance(db: AsyncSession, user_id: int) -> int:
    """Quanto dinheiro a pessoa TEM: soma das contas de caixa não arquivadas.

    Conta arquivada fica de fora de propósito: ela existe pra preservar o
    histórico de transações antigas, não pra continuar contando como dinheiro
    disponível hoje.

    **Cartão de crédito também fica de fora**, e essa é a parte que não é
    óbvia. Passar o cartão não tira dinheiro seu — tira quando a fatura é paga.
    Somar o cartão aqui fazia o saldo cair na hora da compra, que é justamente
    a ilusão que o cartão cria na vida real e que este app existe pra desfazer.
    O que se deve aparece à parte, como fatura (ver `services/faturas.py`).
    """
    balances = await account_balances(db, user_id)
    result = await db.execute(
        select(Account.id).where(
            Account.user_id == user_id,
            Account.archived.is_(False),
            Account.kind != "credit_card",
        )
    )
    active_ids = {row[0] for row in result.all()}
    return sum(balance for account_id, balance in balances.items() if account_id in active_ids)
