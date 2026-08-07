from pydantic import BaseModel, ConfigDict, Field

from app.models import ACCOUNT_KINDS


class AccountCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    kind: str = "checking"
    institution: str | None = None
    color: str | None = None
    icon: str | None = None
    opening_balance_cents: int = 0
    credit_limit_cents: int | None = None
    closing_day: int | None = Field(default=None, ge=1, le=31)
    due_day: int | None = Field(default=None, ge=1, le=31)


class AccountUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=100)
    kind: str | None = None
    institution: str | None = None
    color: str | None = None
    icon: str | None = None
    opening_balance_cents: int | None = None
    credit_limit_cents: int | None = None
    closing_day: int | None = Field(default=None, ge=1, le=31)
    due_day: int | None = Field(default=None, ge=1, le=31)
    archived: bool | None = None


class AccountRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    kind: str
    institution: str | None
    color: str | None
    icon: str | None
    opening_balance_cents: int
    credit_limit_cents: int | None
    closing_day: int | None
    due_day: int | None
    archived: bool
    # Derivado, nunca guardado: opening_balance + soma das transações.
    balance_cents: int = 0


VALID_ACCOUNT_KINDS = set(ACCOUNT_KINDS)
