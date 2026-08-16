from pydantic import BaseModel, ConfigDict, EmailStr, Field


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
    active_theme_id: int | None


class UserUpdate(BaseModel):
    name: str | None = None
    hourly_rate_cents: int | None = Field(default=None, ge=0)
    workday_hours: int | None = Field(default=None, ge=1, le=24)


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str
