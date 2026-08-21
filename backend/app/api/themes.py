import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models import FACTORY_NAMES, FACTORY_THEMES, Theme, User
from app.schemas.theme import ThemeRead, ThemeTokens

router = APIRouter(prefix="/themes", tags=["themes"])


def _to_read(theme: Theme) -> ThemeRead:
    return ThemeRead(
        id=theme.id,
        name=theme.name,
        is_preset=theme.is_preset,
        tokens=ThemeTokens(**json.loads(theme.tokens_json)),
    )


async def seed_presets(db: AsyncSession, user: User) -> None:
    """Dá ao usuário a cópia dele dos presets de fábrica. Roda no cadastro."""
    for name, tokens in FACTORY_THEMES:
        db.add(
            Theme(
                user_id=user.id,
                name=name,
                tokens_json=json.dumps(tokens),
                is_preset=True,
            )
        )


async def sync_presets(db: AsyncSession, user: User, existentes: list[Theme]) -> bool:
    """Alinha os presets da conta com o catálogo de fábrica atual.

    Preset é cópia só-leitura da identidade visual do app, e ela muda com o
    produto: quando um pack novo entra, a conta antiga precisa recebê-lo sem
    migração de dados; quando um sai, a cópia velha tem que ir junto, senão a
    lista de temas vira um cemitério de packs descontinuados.

    Temas criados pela pessoa na versão que tinha editor (`is_preset=False`)
    nunca são tocados aqui: continuam na lista, mesmo sem editor pra criar
    novos.

    Devolve se algo mudou, pra quem chamou saber se precisa commitar.
    """
    presets = [theme for theme in existentes if theme.is_preset]
    obsoletos = [theme for theme in presets if theme.name not in FACTORY_NAMES]
    ja_tem = {theme.name for theme in presets}
    faltando = [(name, tokens) for name, tokens in FACTORY_THEMES if name not in ja_tem]

    if not obsoletos and not faltando:
        return False

    # O tema ativo pode ser justamente um preset que saiu de catálogo. Zerar
    # antes de apagar evita o app apontar pra um id morto — sem `active_theme_id`
    # ele cai no primeiro da lista.
    if any(theme.id == user.active_theme_id for theme in obsoletos):
        user.active_theme_id = None
        db.add(user)
    for theme in obsoletos:
        await db.delete(theme)
    for name, tokens in faltando:
        db.add(Theme(user_id=user.id, name=name, tokens_json=json.dumps(tokens), is_preset=True))
    return True


async def _get_owned_theme(db: AsyncSession, user_id: int, theme_id: int) -> Theme:
    result = await db.execute(select(Theme).where(Theme.id == theme_id, Theme.user_id == user_id))
    theme = result.scalar_one_or_none()
    if theme is None:
        raise HTTPException(status_code=404, detail="tema não encontrado")
    return theme


@router.get("", response_model=list[ThemeRead])
async def list_themes(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query = select(Theme).where(Theme.user_id == user.id)
    themes = list((await db.execute(query)).scalars().all())
    # A listagem é o único lugar por onde todo mundo passa: é aqui que a conta
    # criada antes de um pack novo (ou antes da feature inteira) se alinha com o
    # catálogo, sem precisar de migração de dados.
    if await sync_presets(db, user, themes):
        await db.commit()
        themes = list((await db.execute(query)).scalars().all())
    # Presets primeiro, na ordem de fábrica; os criados pela pessoa vêm depois.
    themes.sort(key=lambda theme: (not theme.is_preset, theme.id))
    return [_to_read(theme) for theme in themes]


@router.post("/{theme_id}/activate", response_model=ThemeRead)
async def activate_theme(
    theme_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    theme = await _get_owned_theme(db, user.id, theme_id)
    user.active_theme_id = theme.id
    db.add(user)
    await db.commit()
    return _to_read(theme)
