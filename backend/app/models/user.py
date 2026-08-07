from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # Quanto vale uma hora do seu trabalho, em centavos. É o que permite
    # mostrar um gasto como "2h de trabalho" em vez de só um número.
    # Nulo = o usuário ainda não informou, e o app omite o tempo de trabalho
    # em vez de inventar um valor padrão.
    hourly_rate_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Quantas horas tem um dia de trabalho seu — usado só pra quebrar um total
    # de horas em "X dias e Y horas" de um jeito que faça sentido pra você.
    workday_hours: Mapped[int] = mapped_column(Integer, default=8)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
