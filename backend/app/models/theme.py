from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Presets de fábrica. Ficam no código (e não numa migração de dados) porque são
# a identidade visual do app: mudar um deles é mudar o produto, não os dados do
# usuário. Cada conta recebe uma *cópia* deles como linha `is_preset=True`.
#
# Um preset é uma paleta. Ele já definiu também forma, densidade e o desenho do
# cartão, do botão, do ícone e do fundo — oito apps diferentes pra manter, com
# um `switch` em cada tela. Agora o desenho do app é um só e o preset diz a cor.
#
# Precisa ser igual ao `FACTORY_PRESETS` de `src/theme/tokens.ts`.
FACTORY_THEMES: tuple[tuple[str, dict], ...] = (
    (
        "Padrão",
        {
            "bg": "#0A0A0F",
            "surface": "#14141C",
            "surfaceAlt": "#1B1B26",
            "border": "#23232E",
            "text": "#F4F4F6",
            "textMuted": "#8A8A99",
            "accent": "#C6F24E",
            "onAccent": "#0A0A0F",
            "accentAlt": "#8B5CF6",
            "positive": "#63D6A0",
            "negative": "#FF6FB3",
            "swatch": ["#CDFF46", "#8B5CF6"],
        },
    ),
    (
        "Neón",
        {
            "bg": "#080B0A",
            "surface": "#101613",
            "surfaceAlt": "#161E1A",
            "border": "#1C2622",
            "text": "#EAF2EE",
            "textMuted": "#5F6B65",
            "accent": "#2BF58C",
            "onAccent": "#04140B",
            "accentAlt": "#8FE0B5",
            "positive": "#2BF58C",
            "negative": "#FF6FB3",
            "swatch": ["#2BF58C", "#080B0A"],
        },
    ),
    (
        "NG preto & branco",
        {
            "bg": "#000000",
            "surface": "#0A0A0A",
            "surfaceAlt": "#141414",
            "border": "#2A2A2A",
            "text": "#FFFFFF",
            "textMuted": "#8A8A8A",
            "accent": "#FFFFFF",
            "onAccent": "#000000",
            "accentAlt": "#B14BFF",
            "positive": "#00E676",
            "negative": "#FF4D6D",
            "swatch": ["#FFFFFF", "#000000"],
        },
    ),
    (
        "Cyberpunk",
        {
            "bg": "#07060D",
            "surface": "#0A0512",
            "surfaceAlt": "#120A1F",
            "border": "#241640",
            "text": "#F0E9FF",
            "textMuted": "#8B7BB0",
            "accent": "#FF2E88",
            "onAccent": "#0A0512",
            "accentAlt": "#22E0FF",
            "positive": "#22E0FF",
            "negative": "#FF2E88",
            "swatch": ["#FF2E88", "#22E0FF"],
        },
    ),
    (
        "Doce",
        {
            "bg": "#1A1622",
            "surface": "#241C2E",
            "surfaceAlt": "#2E2439",
            "border": "#3A2740",
            "text": "#FBF3FF",
            "textMuted": "#A99BB8",
            "accent": "#FFB3D9",
            "onAccent": "#241C2E",
            "accentAlt": "#C9B8FF",
            "positive": "#B6F5D8",
            "negative": "#FF8FA8",
            "swatch": ["#FFB3D9", "#C9B8FF"],
        },
    ),
    (
        "Vaporwave",
        {
            "bg": "#140A20",
            "surface": "#2A0F2E",
            "surfaceAlt": "#3A1642",
            "border": "#4A2456",
            "text": "#FDEBFF",
            "textMuted": "#A87FB8",
            "accent": "#FF6EC7",
            "onAccent": "#2A1140",
            "accentAlt": "#FFB86C",
            "positive": "#FFB86C",
            "negative": "#FF5C8A",
            "swatch": ["#FF6EC7", "#FFB86C"],
        },
    ),
    (
        "Streetwear",
        {
            "bg": "#0E0E0C",
            "surface": "#17170F",
            "surfaceAlt": "#1F1F16",
            "border": "#33331F",
            "text": "#F7F5EC",
            "textMuted": "#8F8C7A",
            "accent": "#F5C542",
            "onAccent": "#1A1A1A",
            "accentAlt": "#E0653A",
            "positive": "#F5C542",
            "negative": "#E0653A",
            "swatch": ["#F5C542", "#1A1A1A"],
        },
    ),
    (
        "Gamer",
        {
            "bg": "#060A14",
            "surface": "#0C1322",
            "surfaceAlt": "#121C30",
            "border": "#1D2B47",
            "text": "#E8F4FF",
            "textMuted": "#7590B5",
            "accent": "#22E0FF",
            "onAccent": "#060A14",
            "accentAlt": "#7C5CFC",
            "positive": "#22E0FF",
            "negative": "#FF5C7A",
            "swatch": ["#22E0FF", "#7C5CFC"],
        },
    ),
)

FACTORY_NAMES: frozenset[str] = frozenset(name for name, _ in FACTORY_THEMES)


class Theme(Base):
    __tablename__ = "themes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(60))
    # Os tokens vão como JSON de texto, não como colunas. O conjunto de tokens
    # muda junto com o design (hoje tem `cardStyle` e `density`, amanhã pode ter
    # outro) — em colunas, cada ajuste de design viraria migração de schema.
    tokens_json: Mapped[str] = mapped_column(Text)
    # Preset de fábrica: some do editor (só leitura) e não pode ser apagado.
    # Duplicar cria uma linha nova com is_preset=False.
    is_preset: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
