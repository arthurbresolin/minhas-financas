from pydantic import BaseModel, ConfigDict, Field

from app.models import CATEGORY_KINDS


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    emoji: str | None = None
    color: str | None = None
    kind: str = "expense"
    sort_order: int = 0


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    emoji: str | None = None
    color: str | None = None
    kind: str | None = None
    sort_order: int | None = None


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    emoji: str | None
    color: str | None
    kind: str
    sort_order: int


VALID_CATEGORY_KINDS = set(CATEGORY_KINDS)
