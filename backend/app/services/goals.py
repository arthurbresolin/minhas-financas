from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Goal, GoalDeposit, User
from app.schemas.goal import GoalRead
from app.services.timecost import time_cost


async def saved_by_goal(db: AsyncSession, user_id: int) -> dict[int, int]:
    """Quanto está guardado em cada pote, numa consulta só.

    Uma consulta agregada em vez de uma por pote: a lista de metas é a tela
    inteira, e somar em Python obrigaria a carregar todo depósito já feito.
    """
    result = await db.execute(
        select(GoalDeposit.goal_id, func.coalesce(func.sum(GoalDeposit.amount_cents), 0))
        .where(GoalDeposit.user_id == user_id)
        .group_by(GoalDeposit.goal_id)
    )
    return {goal_id: total for goal_id, total in result.all()}


async def saved_in_goal(db: AsyncSession, goal_id: int) -> int:
    total = await db.scalar(
        select(func.coalesce(func.sum(GoalDeposit.amount_cents), 0)).where(
            GoalDeposit.goal_id == goal_id
        )
    )
    return int(total or 0)


def to_read(goal: Goal, saved_cents: int, user: User) -> GoalRead:
    """Monta a meta como a tela precisa dela: com o guardado e o progresso.

    O tempo de trabalho entra aqui pelo mesmo motivo do resumo: o app inteiro
    fala em horas, e "R$ 5.000 guardados" diz muito menos que "13 dias de
    trabalho guardados".
    """
    data = GoalRead.model_validate(goal)
    data.saved_cents = saved_cents
    data.progress = min(1.0, max(0.0, saved_cents / goal.target_cents)) if goal.target_cents else 0.0
    data.saved_time_cost = time_cost(max(0, saved_cents), user)
    return data
