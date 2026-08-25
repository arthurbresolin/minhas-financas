"""A fatura do cartão de crédito.

Passar o cartão **não** tira dinheiro seu. O dinheiro sai quando a fatura é
paga. Enquanto isso, o gasto é uma dívida que se acumula até o dia do
fechamento — e é por isso que um cartão não pode entrar no saldo junto com as
contas de caixa (ver `total_balance`).

O ciclo tem dois dias, os dois escolhidos pelo banco:

- **fechamento** (`closing_day`) — depois dele, o gasto já cai na fatura
  *seguinte*, não na que está prestes a vencer;
- **vencimento** (`due_day`) — quando a conta precisa ser paga.

Nada aqui guarda estado. A fatura é sempre **derivada** das transações, pelo
mesmo motivo do saldo: fatura guardada é fatura que dessincroniza quando alguém
edita ou apaga um lançamento antigo.
"""

from calendar import monthrange
from datetime import date, datetime, time, timedelta, timezone
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Transaction


def _dia_valido(ano: int, mes: int, dia: int) -> date:
    """O dia pedido, ou o último do mês quando ele não existe.

    Cartão que fecha dia 31 fecha dia 28 em fevereiro. Sem isto, todo fevereiro
    viraria um `ValueError` no meio da leitura de contas.
    """
    return date(ano, mes, min(dia, monthrange(ano, mes)[1]))


def _mes_seguinte(ano: int, mes: int) -> tuple[int, int]:
    return (ano + 1, 1) if mes == 12 else (ano, mes + 1)


def _mes_anterior(ano: int, mes: int) -> tuple[int, int]:
    return (ano - 1, 12) if mes == 1 else (ano, mes - 1)


@dataclass(frozen=True)
class Ciclo:
    """A janela de uma fatura, com os dois dias que importam."""

    inicio: date
    """Primeiro dia que cai nesta fatura."""
    fechamento: date
    """Último dia que cai nesta fatura."""
    vencimento: date
    """Quando ela precisa ser paga."""


def ciclo_aberto(hoje: date, closing_day: int, due_day: int) -> Ciclo:
    """A fatura que ainda está recebendo gastos.

    Um gasto feito **no** dia do fechamento ainda entra nele — é como os bancos
    daqui fazem, e é o que a pessoa espera de "fecha dia 10".
    """
    if hoje.day <= min(closing_day, monthrange(hoje.year, hoje.month)[1]):
        fechamento = _dia_valido(hoje.year, hoje.month, closing_day)
    else:
        fechamento = _dia_valido(*_mes_seguinte(hoje.year, hoje.month), closing_day)

    anterior = _dia_valido(*_mes_anterior(fechamento.year, fechamento.month), closing_day)
    inicio = anterior + timedelta(days=1)

    # O vencimento vem depois do fechamento. Quando o dia do vencimento é menor
    # (fecha dia 28, vence dia 5), ele é do mês seguinte.
    if due_day > fechamento.day:
        vencimento = _dia_valido(fechamento.year, fechamento.month, due_day)
    else:
        vencimento = _dia_valido(*_mes_seguinte(fechamento.year, fechamento.month), due_day)

    return Ciclo(inicio=inicio, fechamento=fechamento, vencimento=vencimento)


async def total_do_ciclo(db: AsyncSession, account_id: int, ciclo: Ciclo) -> int:
    """Quanto já entrou nesta fatura, em centavos positivos.

    Só `expense`. Um `transfer_in` no cartão é pagamento de fatura, e um
    pagamento não é uma compra — somá-lo aqui faria pagar a fatura aumentar a
    própria fatura.
    """
    inicio = datetime.combine(ciclo.inicio, time.min)
    fim = datetime.combine(ciclo.fechamento, time.max)

    total = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            Transaction.account_id == account_id,
            Transaction.kind == "expense",
            Transaction.occurred_at >= inicio,
            Transaction.occurred_at <= fim,
        )
    )
    return int(total or 0)


def hoje_utc() -> date:
    """A mesma convenção de data do resto da API: UTC, ingênuo."""
    return datetime.now(timezone.utc).replace(tzinfo=None).date()
