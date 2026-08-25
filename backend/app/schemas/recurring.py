from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from app.models import RECURRING_KINDS


class RecurringCreate(BaseModel):
    account_id: int
    category_id: int | None = None
    kind: str = "expense"
    amount_cents: int = Field(gt=0)
    description: str | None = Field(default=None, max_length=255)
    day_of_month: int = Field(ge=1, le=31)
    # Quando a regra passa a valer. O padrão é hoje: criar uma regra não pode
    # gerar retroativo sem alguém ter pedido.
    start_on: date | None = None


class RecurringUpdate(BaseModel):
    account_id: int | None = None
    category_id: int | None = None
    kind: str | None = None
    amount_cents: int | None = Field(default=None, gt=0)
    description: str | None = Field(default=None, max_length=255)
    day_of_month: int | None = Field(default=None, ge=1, le=31)
    active: bool | None = None


class RecurringRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    account_id: int
    category_id: int | None
    kind: str
    amount_cents: int
    description: str | None
    day_of_month: int
    active: bool
    start_on: date
    last_applied_on: date | None
    # Derivado: quando ela vai gerar a próxima. Nulo quando está desligada.
    proxima_em: date | None = None


VALID_RECURRING_KINDS = set(RECURRING_KINDS)
