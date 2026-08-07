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


class WorkTime(BaseModel):
    """Quanto do seu tempo de trabalho aquele dinheiro custou.

    Nulo quando o usuário ainda não informou o valor da hora — melhor não
    mostrar nada do que mostrar um número inventado sobre o trabalho de alguém.
    """

    total_hours: float
    days: int
    hours: int


class SummaryRead(BaseModel):
    period: str
    start: date
    end: date
    balance_cents: int
    expense_cents: int
    income_cents: int
    by_category: list[CategoryTotal]
    by_day: list[DayTotal]
    expense_work_time: WorkTime | None
    balance_work_time: WorkTime | None
