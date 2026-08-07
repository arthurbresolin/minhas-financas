from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

CATEGORY_KINDS = ("expense", "income")

# Categorias criadas junto com a conta, iguais às do app de referência. Ficam
# como linhas normais no banco (não uma lista fixa no código) pra que renomear,
# trocar emoji ou apagar seja só um UPDATE — sem isso, qualquer personalização
# viraria migração.
DEFAULT_CATEGORIES: tuple[tuple[str, str, str, str], ...] = (
    ("Alimentação", "🍔", "#F4A63D", "expense"),
    ("Transporte", "🚗", "#5B8DEF", "expense"),
    ("Lazer", "🎮", "#B36BE8", "expense"),
    ("Saúde", "❤️", "#E8556B", "expense"),
    ("Shopping", "🛍️", "#E87BB0", "expense"),
    ("Serviços", "🔧", "#4FC7A1", "expense"),
    ("Outros", "💠", "#8B8FA3", "expense"),
    ("Salário", "💰", "#2FD98A", "income"),
    ("Extra", "✨", "#7BE8C4", "income"),
)


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    emoji: Mapped[str | None] = mapped_column(String(8), nullable=True)
    color: Mapped[str | None] = mapped_column(String(9), nullable=True)
    kind: Mapped[str] = mapped_column(String(10), default="expense")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
