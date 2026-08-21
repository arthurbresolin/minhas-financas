from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Goal(Base):
    """Um pote: um objetivo com nome, cara e alvo.

    O quanto já foi guardado NÃO fica aqui. Pelo mesmo motivo do saldo da conta,
    o guardado é sempre a soma dos depósitos (`GoalDeposit`) — apagar ou
    corrigir um depósito precisa corrigir o total sozinho.

    `done_at` é a exceção proposital: ele não é derivado, é *o instante* em que
    a meta bateu. Se fosse calculado, resgatar um pouco depois de bater apagaria
    a conquista do histórico, e é justamente ela que a tela de comemoração e a
    aba de atividade contam.
    """

    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(80))
    emoji: Mapped[str | None] = mapped_column(String(8), nullable=True)
    color: Mapped[str | None] = mapped_column(String(9), nullable=True)
    target_cents: Mapped[int] = mapped_column(Integer)
    done_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class GoalDeposit(Base):
    """Um movimento de um pote. Positivo é guardar, negativo é resgatar.

    Guardar os dois no mesmo lugar, separados só pelo sinal, é o que faz o
    extrato do pote sair de graça e o total continuar sendo uma soma simples.
    """

    __tablename__ = "goal_deposits"

    id: Mapped[int] = mapped_column(primary_key=True)
    goal_id: Mapped[int] = mapped_column(ForeignKey("goals.id", ondelete="CASCADE"), index=True)
    # Redundante com o dono da meta, e de propósito: toda query de dinheiro
    # neste projeto filtra por `user_id` direto, sem depender de join pra
    # garantir isolamento.
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    amount_cents: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
