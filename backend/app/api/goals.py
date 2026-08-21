from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import Goal, GoalDeposit, User
from app.schemas.goal import (
    GoalCreate,
    GoalDepositCreate,
    GoalDepositRead,
    GoalRead,
    GoalUpdate,
)
from app.services.goals import saved_by_goal, saved_in_goal, to_read

router = APIRouter(prefix="/goals", tags=["goals"])


async def _get_owned_goal(db: AsyncSession, user_id: int, goal_id: int) -> Goal:
    result = await db.execute(select(Goal).where(Goal.id == goal_id, Goal.user_id == user_id))
    goal = result.scalar_one_or_none()
    if goal is None:
        raise HTTPException(status_code=404, detail="meta não encontrada")
    return goal


@router.get("", response_model=list[GoalRead])
async def list_goals(
    include_archived: bool = False,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Goal).where(Goal.user_id == user.id)
    if not include_archived:
        query = query.where(Goal.archived.is_(False))
    result = await db.execute(query.order_by(Goal.sort_order, Goal.id))
    goals = list(result.scalars().all())
    saved = await saved_by_goal(db, user.id)
    return [to_read(goal, saved.get(goal.id, 0), user) for goal in goals]


@router.post("", response_model=GoalRead, status_code=201)
async def create_goal(
    payload: GoalCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = Goal(user_id=user.id, **payload.model_dump())
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    return to_read(goal, 0, user)


@router.patch("/{goal_id}", response_model=GoalRead)
async def update_goal(
    goal_id: int,
    payload: GoalUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await _get_owned_goal(db, user.id, goal_id)
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    db.add(goal)
    await db.commit()
    await db.refresh(goal)
    saved = await saved_in_goal(db, goal.id)
    # Aumentar o alvo de uma meta já batida a "desbate": sem isso ela ficaria
    # marcada como concluída exibindo 60%.
    if goal.done_at is not None and saved < goal.target_cents:
        goal.done_at = None
        db.add(goal)
        await db.commit()
        await db.refresh(goal)
    return to_read(goal, saved, user)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await _get_owned_goal(db, user.id, goal_id)
    # Os depósitos vão junto: diferente de uma conta, o histórico de um pote não
    # entra em total nenhum de mês fechado — só existe dentro do próprio pote.
    await db.execute(
        GoalDeposit.__table__.delete().where(GoalDeposit.goal_id == goal.id)
    )
    await db.delete(goal)
    await db.commit()


@router.post("/{goal_id}/deposit", response_model=GoalDepositRead)
async def deposit(
    goal_id: int,
    payload: GoalDepositCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    goal = await _get_owned_goal(db, user.id, goal_id)
    saved_before = await saved_in_goal(db, goal.id)

    if payload.amount_cents < 0 and saved_before + payload.amount_cents < 0:
        raise HTTPException(status_code=409, detail="não há tudo isso guardado neste pote")

    db.add(GoalDeposit(goal_id=goal.id, user_id=user.id, amount_cents=payload.amount_cents))
    saved_after = saved_before + payload.amount_cents

    # A comemoração é deste depósito, não do estado: quem já estava em 100% e
    # guarda mais um pouco não ganha a tela de novo.
    just_completed = (
        goal.done_at is None and saved_before < goal.target_cents <= saved_after
    )
    if just_completed:
        goal.done_at = datetime.now(timezone.utc).replace(tzinfo=None)
        db.add(goal)

    await db.commit()
    await db.refresh(goal)
    return GoalDepositRead(goal=to_read(goal, saved_after, user), just_completed=just_completed)
