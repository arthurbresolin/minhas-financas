from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Uma transferência entre contas vira DUAS linhas (transfer_out na origem,
# transfer_in no destino) ligadas pelo mesmo transfer_group_id. Elas mexem no
# saldo das contas mas não são receita nem despesa — dinheiro trocando de bolso
# não é dinheiro entrando nem saindo, e tratar assim é o que impede a
# transferência de inflar os dois lados do resumo.
TRANSACTION_KINDS = ("expense", "income", "transfer_out", "transfer_in")

# Sinal que cada tipo aplica ao saldo da conta.
KIND_SIGN: dict[str, int] = {
    "expense": -1,
    "income": +1,
    "transfer_out": -1,
    "transfer_in": +1,
}


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), index=True)
    category_id: Mapped[int | None] = mapped_column(ForeignKey("categories.id"), nullable=True)
    kind: Mapped[str] = mapped_column(String(15), default="expense")
    # Sempre positivo. O sinal vem do kind (ver KIND_SIGN) — guardar valor
    # negativo além do tipo daria duas fontes de verdade pro mesmo fato.
    amount_cents: Mapped[int] = mapped_column(Integer)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    # "app" ou "shortcut" — permite saber depois quanto do registro veio do
    # Atalho do iOS (Bloco 3) sem precisar de outra tabela.
    created_via: Mapped[str] = mapped_column(String(15), default="app")
    transfer_group_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    installment_no: Mapped[int | None] = mapped_column(Integer, nullable=True)
    installment_total: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
