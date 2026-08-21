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
    # De onde vem o seu dinheiro: "work" (você troca horas por ele) ou
    # "allowance" (mesada). Muda a pergunta que o app faz sobre cada gasto —
    # quem recebe mesada não trabalhou aquelas horas, e dizer que trabalhou é
    # mentira. Ver app/services/timecost.py.
    income_mode: Mapped[str] = mapped_column(String(12), default="work", server_default="work")
    # Quanto você recebe de mesada, em centavos, e de quanto em quanto tempo.
    allowance_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    allowance_period: Mapped[str] = mapped_column(String(8), default="month", server_default="month")
    # Tema ativo. Inteiro solto, sem ForeignKey de propósito: `themes.user_id`
    # já aponta pra cá, e as duas chaves juntas fariam um ciclo que o SQLite não
    # sabe ordenar na criação das tabelas. Nulo = ainda não escolheu, e a API
    # devolve o primeiro preset.
    active_theme_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    # Token do Atalho do iPhone. É uma credencial separada da senha de
    # propósito: ela vive dentro de um Atalho no aparelho, onde qualquer pessoa
    # com o celular na mão pode abrir e ler. Por isso ela só consegue *criar
    # lançamento* — nunca ler saldo, nunca apagar nada, nunca trocar a senha —
    # e pode ser revogada sozinha, sem mexer no login.
    # Nulo = a pessoa ainda não gerou o Atalho dela.
    shortcut_token: Mapped[str | None] = mapped_column(
        String(64), nullable=True, unique=True, index=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
