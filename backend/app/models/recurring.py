from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Só o que se repete de verdade todo mês. Transferência fica de fora: ela nasce
# em par, e uma regra que criasse só uma perna deixaria dois saldos errados.
RECURRING_KINDS = ("expense", "income")


class RecurringRule(Base):
    """Um lançamento que se repete todo mês.

    A mesada, a assinatura, o aluguel. São justamente os valores que a pessoa
    esquece de registrar — não porque dão trabalho, mas porque são invisíveis
    de tão previsíveis.

    A regra **não é** a transação. Ela é a receita de como criar uma, e as
    transações que ela gera são linhas comuns em `transactions`: aparecem no
    extrato, entram no resumo e podem ser apagadas uma a uma. Guardar o valor
    recorrente como um tipo especial de transação faria toda tela do app ter
    que saber que ele existe.
    """

    __tablename__ = "recurring_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(15), default="expense")
    amount_cents: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # 1 a 31. Num mês curto cai no último dia (ver services/recorrentes.py):
    # "todo dia 31" precisa continuar acontecendo em fevereiro.
    day_of_month: Mapped[int] = mapped_column(Integer)
    # Desligar não é apagar: a assinatura pausada volta, e o histórico do que
    # ela já gerou continua fazendo sentido no extrato.
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    start_on: Mapped[date] = mapped_column(Date)
    # A última data JÁ gerada. É o que torna a materialização idempotente: sem
    # ela, abrir o app duas vezes no dia 5 criaria a mesada duas vezes.
    last_applied_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
