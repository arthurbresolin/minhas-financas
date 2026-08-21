from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

INCOME_MODES = ("work", "allowance")
ALLOWANCE_PERIODS = ("week", "month")


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str | None = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    name: str | None
    avatar_url: str | None
    hourly_rate_cents: int | None
    workday_hours: int
    income_mode: str
    allowance_cents: int | None
    allowance_period: str
    active_theme_id: int | None


class UserUpdate(BaseModel):
    name: str | None = None
    hourly_rate_cents: int | None = Field(default=None, ge=0)
    workday_hours: int | None = Field(default=None, ge=1, le=24)
    income_mode: str | None = None
    allowance_cents: int | None = Field(default=None, ge=0)
    allowance_period: str | None = None

    @field_validator("income_mode")
    @classmethod
    def modo_conhecido(cls, value: str | None) -> str | None:
        # Recusar em vez de aceitar calado: um modo desconhecido cairia no
        # `else` do cálculo e a pessoa veria "horas de trabalho" sem entender
        # por quê.
        if value is not None and value not in INCOME_MODES:
            raise ValueError(f"modo inválido; use um de {INCOME_MODES}")
        return value

    @field_validator("allowance_period")
    @classmethod
    def periodo_conhecido(cls, value: str | None) -> str | None:
        if value is not None and value not in ALLOWANCE_PERIODS:
            raise ValueError(f"período inválido; use um de {ALLOWANCE_PERIODS}")
        return value


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str
