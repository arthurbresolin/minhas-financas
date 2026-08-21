from datetime import date

from pydantic import BaseModel


class CategoryTotal(BaseModel):
    category_id: int | None
    name: str
    emoji: str | None
    color: str | None
    total_cents: int


class DayTotal(BaseModel):
    day: date
    expense_cents: int
    income_cents: int


class TimeCost(BaseModel):
    """Quanto do seu dinheiro-que-entra aquele gasto custou.

    Nulo quando o usuário ainda não informou de onde vem o dinheiro dele —
    melhor não mostrar nada do que inventar um número sobre a vida de alguém.

    `label` é a frase pronta ("2 horas de trabalho", "8% da mesada"), e é ela
    que as telas mostram. Elas não sabem, nem precisam saber, se a pessoa
    trabalha ou recebe mesada.
    """

    # "work" ou "allowance".
    mode: str
    label: str
    # Só no modo trabalho.
    total_hours: float
    days: int
    hours: int
    # Só no modo mesada: a fração da mesada que aquilo custou. 0.08 = 8%.
    ratio: float


class SummaryRead(BaseModel):
    period: str
    start: date
    end: date
    balance_cents: int
    expense_cents: int
    income_cents: int
    by_category: list[CategoryTotal]
    by_day: list[DayTotal]
    expense_time_cost: TimeCost | None
    balance_time_cost: TimeCost | None
