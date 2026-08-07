from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class TransactionCreate(BaseModel):
    account_id: int
    category_id: int | None = None
    # Só "expense" ou "income" entram por aqui. Transferência tem endpoint
    # próprio, porque criar só um dos dois lados deixaria o saldo errado.
    kind: str = "expense"
    amount_cents: int = Field(gt=0)
    description: str | None = Field(default=None, max_length=255)
    occurred_at: datetime | None = None


class TransactionUpdate(BaseModel):
    account_id: int | None = None
    category_id: int | None = None
    kind: str | None = None
    amount_cents: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=255)
    occurred_at: datetime | None = None


class TransferCreate(BaseModel):
    from_account_id: int
    to_account_id: int
    amount_cents: int = Field(gt=0)
    description: str | None = Field(default=None, max_length=255)
    occurred_at: datetime | None = None


class TransactionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    category_id: int | None
    kind: str
    amount_cents: int
    description: str | None
    occurred_at: datetime
    created_via: str
    transfer_group_id: str | None
    installment_no: int | None
    installment_total: int | None
