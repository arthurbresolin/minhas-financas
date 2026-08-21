from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.summary import TimeCost


class GoalCreate(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    emoji: str | None = None
    color: str | None = None
    target_cents: int = Field(gt=0)


class GoalUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=80)
    emoji: str | None = None
    color: str | None = None
    target_cents: int | None = Field(default=None, gt=0)
    archived: bool | None = None
    sort_order: int | None = None


class GoalDepositCreate(BaseModel):
    """Positivo guarda, negativo resgata. Zero não é movimento nenhum."""

    amount_cents: int

    @field_validator("amount_cents")
    @classmethod
    def nao_pode_ser_zero(cls, value: int) -> int:
        # Um depósito de zero criaria uma linha no histórico do pote que não
        # mudou nada — e ainda contaria como movimento na aba de atividade.
        if value == 0:
            raise ValueError("o valor não pode ser zero")
        return value


class GoalRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    emoji: str | None
    color: str | None
    target_cents: int
    done_at: datetime | None
    archived: bool
    sort_order: int
    # Derivado, nunca guardado: a soma dos depósitos.
    saved_cents: int = 0
    # Entre 0 e 1, já limitado — a barra da tela não precisa se defender de um
    # pote com mais dinheiro do que a meta pedia.
    progress: float = 0.0
    saved_time_cost: TimeCost | None = None


class GoalDepositRead(BaseModel):
    """A resposta de guardar ou resgatar.

    `just_completed` existe porque só o servidor sabe se *este* depósito foi o
    que bateu a meta: o app sozinho não distingue "chegou nos 100% agora" de
    "já estava nos 100%", e é essa diferença que dispara a tela de comemoração.
    """

    goal: GoalRead
    just_completed: bool
