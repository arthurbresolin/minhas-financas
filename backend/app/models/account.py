from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Tipos de conta. "credit_card" já existe aqui porque muda o cálculo de saldo
# (fatura, não caixa) — os campos de fechamento/vencimento só passam a ser
# usados no Bloco 4, mas a coluna nascer junto evita uma migração depois.
ACCOUNT_KINDS = ("checking", "cash", "savings", "credit_card")


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    kind: Mapped[str] = mapped_column(String(20), default="checking")
    institution: Mapped[str | None] = mapped_column(String(100), nullable=True)
    color: Mapped[str | None] = mapped_column(String(9), nullable=True)
    icon: Mapped[str | None] = mapped_column(String(8), nullable=True)
    # Saldo que a conta já tinha quando entrou no app. O saldo atual NUNCA é
    # guardado: é sempre este valor mais a soma das transações (ver
    # app/services/balance.py). Guardar saldo mutável é a origem clássica de
    # saldo dessincronizado quando uma transação é editada ou apagada.
    opening_balance_cents: Mapped[int] = mapped_column(Integer, default=0)
    credit_limit_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    closing_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
