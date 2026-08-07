from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Category, Transaction, User
from app.schemas.summary import CategoryTotal, DayTotal, SummaryRead
from app.services.balance import total_balance
from app.services.worktime import work_time

router = APIRouter(prefix="/summary", tags=["summary"])

# Os mesmos períodos das abas do app.
PERIOD_DAYS = {"7d": 7, "30d": 30, "3m": 90, "6m": 180}


@router.get("", response_model=SummaryRead)
async def read_summary(
    period: str = "30d",
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if period not in PERIOD_DAYS:
        raise HTTPException(status_code=422, detail="período inválido")

    end = datetime.now(timezone.utc).replace(tzinfo=None)
    start = end - timedelta(days=PERIOD_DAYS[period])

    in_period = (
        Transaction.user_id == user.id,
        Transaction.occurred_at >= start,
        Transaction.occurred_at <= end,
    )

    # Transferência fica de fora dos totais de propósito: mover dinheiro entre
    # contas suas não é ganhar nem gastar, e incluí-la inflaria os dois lados.
    expense_cents = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            *in_period, Transaction.kind == "expense"
        )
    )
    income_cents = await db.scalar(
        select(func.coalesce(func.sum(Transaction.amount_cents), 0)).where(
            *in_period, Transaction.kind == "income"
        )
    )

    by_category_rows = await db.execute(
        select(
            Transaction.category_id,
            Category.name,
            Category.emoji,
            Category.color,
            func.sum(Transaction.amount_cents),
        )
        .outerjoin(Category, Category.id == Transaction.category_id)
        .where(*in_period, Transaction.kind == "expense")
        .group_by(Transaction.category_id, Category.name, Category.emoji, Category.color)
        .order_by(func.sum(Transaction.amount_cents).desc())
    )
    by_category = [
        CategoryTotal(
            category_id=category_id,
            name=name or "Sem categoria",
            emoji=emoji,
            color=color,
            total_cents=total,
        )
        for category_id, name, emoji, color, total in by_category_rows.all()
    ]

    # func.date() agrupa por dia no SQLite sem precisar trazer tudo pra memória.
    by_day_rows = await db.execute(
        select(
            func.date(Transaction.occurred_at),
            func.coalesce(
                func.sum(func.iif(Transaction.kind == "expense", Transaction.amount_cents, 0)), 0
            ),
            func.coalesce(
                func.sum(func.iif(Transaction.kind == "income", Transaction.amount_cents, 0)), 0
            ),
        )
        .where(*in_period)
        .group_by(func.date(Transaction.occurred_at))
        .order_by(func.date(Transaction.occurred_at))
    )
    by_day = [
        DayTotal(
            day=datetime.strptime(day, "%Y-%m-%d").date(),
            expense_cents=expense,
            income_cents=income,
        )
        for day, expense, income in by_day_rows.all()
    ]

    balance_cents = await total_balance(db, user.id)

    return SummaryRead(
        period=period,
        start=start.date(),
        end=end.date(),
        balance_cents=balance_cents,
        expense_cents=expense_cents or 0,
        income_cents=income_cents or 0,
        by_category=by_category,
        by_day=by_day,
        expense_work_time=work_time(
            expense_cents or 0, user.hourly_rate_cents, user.workday_hours
        ),
        # Só faz sentido falar em "tempo de trabalho guardado" com saldo
        # positivo — no vermelho, "0 horas guardadas" seria uma frase vazia
        # ocupando o lugar da informação que importa (o saldo negativo).
        balance_work_time=(
            work_time(balance_cents, user.hourly_rate_cents, user.workday_hours)
            if balance_cents > 0
            else None
        ),
    )
