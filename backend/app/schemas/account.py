from datetime import date

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


class Fatura(BaseModel):
    """A fatura aberta de um cartão. Derivada, nunca guardada."""

    total_cents: int
    """Quanto já entrou nela. Positivo — é dívida, não saldo."""
    fecha_em: date
    vence_em: date
    """Depois do fechamento; pode ser no mês seguinte."""
    dias_ate_fechar: int
    """0 quando fecha hoje. É o número que faz a pessoa segurar a compra."""


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
    # Derivado, nunca guardado: opening_balance + soma das transações. Num
    # cartão isto é negativo e significa "quanto se deve no total".
    balance_cents: int = 0
    # Só em cartão de crédito, e só quando ele tem fechamento e vencimento
    # configurados — sem os dois dias não há ciclo pra calcular.
    fatura: Fatura | None = None


VALID_ACCOUNT_KINDS = set(ACCOUNT_KINDS)
