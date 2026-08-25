"""Lançamentos que se repetem: quando eles viram transação de verdade.

Não há agendador neste projeto, e pôr um exigiria um processo a mais rodando o
tempo todo só pra criar meia dúzia de linhas por mês. Em vez disso a regra é
**materializada na leitura**: toda vez que o app pede extrato, resumo ou
contas, o que já venceu e ainda não foi criado é criado ali.

O efeito prático é o mesmo de um agendador — abrir o app é o gatilho, e ninguém
abre um app de finanças sem abrir o app. O que muda é que não existe processo
pra morrer de madrugada sem ninguém ver.

A idempotência mora em `last_applied_on`: ela guarda a última data já gerada,
então abrir o app cinco vezes no dia do vencimento gera a mesada uma vez só.
"""

from calendar import monthrange
from datetime import date, datetime, time

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import RecurringRule, Transaction

# Teto de segurança por chamada. Uma regra com `start_on` de anos atrás geraria
# uma enxurrada de linhas numa leitura só — e uma leitura que insere centenas
# de transações é um pedido que estoura o tempo e assusta quem abriu o app. Com
# o teto, o atraso é recuperado em algumas aberturas em vez de uma.
MAX_POR_CHAMADA = 36


def _dia_do_mes(ano: int, mes: int, dia: int) -> date:
    """O dia pedido, ou o último do mês quando ele não existe.

    "Todo dia 31" precisa acontecer em fevereiro também — senão a regra some
    silenciosamente nos meses curtos, que é o pior jeito de falhar: sem erro.
    """
    return date(ano, mes, min(dia, monthrange(ano, mes)[1]))


def _mes_seguinte(ano: int, mes: int) -> tuple[int, int]:
    return (ano + 1, 1) if mes == 12 else (ano, mes + 1)


def datas_devidas(regra: RecurringRule, hoje: date) -> list[date]:
    """As datas que já venceram e ainda não viraram transação.

    Nunca gera no futuro: o extrato não pode mostrar um gasto que ainda não
    aconteceu, senão o saldo de hoje passa a incluir dinheiro que ainda está lá.
    """
    if not regra.active:
        return []

    # De onde continuar: do dia seguinte ao último gerado, ou do início da regra.
    piso = regra.last_applied_on
    cursor = _dia_do_mes(regra.start_on.year, regra.start_on.month, regra.day_of_month)
    if cursor <= regra.start_on:
        # O dia deste mês já passou (ou é hoje) quando a regra começa: a
        # primeira ocorrência é a do mês que vem.
        #
        # O `<=` importa: cadastrar "todo dia 5" NO dia 5 não pode lançar na
        # hora. Quem faz isso normalmente acabou de receber e está registrando
        # dali pra frente — e um lançamento que aparece sozinho no mesmo
        # segundo vira duplicata com o que a pessoa já anotou à mão.
        cursor = _dia_do_mes(*_mes_seguinte(regra.start_on.year, regra.start_on.month), regra.day_of_month)

    datas: list[date] = []
    while cursor <= hoje and len(datas) < MAX_POR_CHAMADA:
        if piso is None or cursor > piso:
            datas.append(cursor)
        cursor = _dia_do_mes(*_mes_seguinte(cursor.year, cursor.month), regra.day_of_month)

    return datas


async def aplicar(db: AsyncSession, user_id: int, hoje: date) -> int:
    """Cria as transações que as regras do usuário já deviam ter criado.

    Devolve quantas criou. Roda nas leituras (extrato, resumo, contas), então
    precisa ser barata quando não há nada a fazer — e é: sem regra vencida, é
    um SELECT e nada mais.
    """
    regras = list(
        (
            await db.execute(
                select(RecurringRule).where(
                    RecurringRule.user_id == user_id,
                    RecurringRule.active.is_(True),
                )
            )
        )
        .scalars()
        .all()
    )

    criadas = 0
    for regra in regras:
        datas = datas_devidas(regra, hoje)
        if not datas:
            continue
        for dia in datas:
            db.add(
                Transaction(
                    user_id=regra.user_id,
                    account_id=regra.account_id,
                    category_id=regra.category_id,
                    kind=regra.kind,
                    amount_cents=regra.amount_cents,
                    description=regra.description,
                    # Meio-dia, não meia-noite: um lançamento em 00:00 cai no
                    # dia anterior em qualquer fuso a oeste do UTC, e o extrato
                    # passa a mostrar a mesada um dia antes do combinado.
                    occurred_at=datetime.combine(dia, time(12, 0)),
                    created_via="recorrente",
                )
            )
            criadas += 1
        regra.last_applied_on = datas[-1]
        db.add(regra)

    if criadas:
        await db.commit()
    return criadas
