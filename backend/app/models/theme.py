from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# Presets de fábrica. Ficam no código (e não numa migração de dados) porque são
# a identidade visual do app: mudar um deles é mudar o produto, não os dados do
# usuário. Cada conta recebe uma *cópia* deles como linha `is_preset=True`, que
# é o que permite duplicar e editar sem tocar no original.
#
# Um preset não é uma paleta: além das cores ele define forma, densidade, o
# desenho do cartão, do botão, do ícone e do fundo. É o que faz os seis serem
# apps diferentes em vez do mesmo app repintado.
#
# Precisa ser igual ao `FACTORY_PRESETS` de `src/theme/tokens.ts`.
FACTORY_THEMES: tuple[tuple[str, dict], ...] = (
    (
        "NOIR",
        {
            "bg": "#050505",
            "surface": "#0E0E0E",
            "surfaceAlt": "#171717",
            "border": "#333333",
            "text": "#FFFFFF",
            "textMuted": "#9A9A9A",
            "accent": "#FFFFFF",
            "onAccent": "#000000",
            "accentAlt": "#FF2D2D",
            "positive": "#FFFFFF",
            "negative": "#FF2D2D",
            "radius": 4,
            "outlined": True,
            "swatch": ["#FFFFFF", "#000000"],
            "fontDisplay": "Archivo_900Black_Italic",
            "fontMono": "IBMPlexMono_600SemiBold",
            "fontSans": "Inter_500Medium",
            "style": "bold",
            "shape": "sharp",
            "cardStyle": "outline",
            "buttonStyle": "sticker",
            "iconStyle": "geometric",
            "navStyle": "dock",
            "backgroundStyle": "plain",
            "decorationStyle": "outline",
            "density": "compact",
            "vibe": "seco",
        },
    ),
    (
        "CHERRY",
        {
            "bg": "#FFF7F2",
            "surface": "#FFFFFF",
            "surfaceAlt": "#FFEBE2",
            "border": "#F2D9CC",
            "text": "#2A1310",
            "textMuted": "#8B665C",
            "accent": "#D81E45",
            "onAccent": "#FFFFFF",
            "accentAlt": "#FF8FA8",
            "positive": "#1B8055",
            "negative": "#D81E45",
            "radius": 24,
            "outlined": False,
            "swatch": ["#D81E45", "#FFF7F2"],
            "fontDisplay": "SpaceGrotesk_700Bold",
            "fontMono": "IBMPlexMono_600SemiBold",
            "fontSans": "Inter_400Regular",
            "style": "playful",
            "shape": "round",
            "cardStyle": "filled",
            "buttonStyle": "solid",
            "iconStyle": "doodle",
            "navStyle": "floating",
            "backgroundStyle": "plain",
            "decorationStyle": "doodles",
            "density": "regular",
            "vibe": "doce",
        },
    ),
    (
        "ICE",
        {
            "bg": "#FBFDFF",
            "surface": "#F1F7FC",
            "surfaceAlt": "#E6F0F8",
            "border": "#D8E6F0",
            "text": "#0E1D29",
            "textMuted": "#66808F",
            "accent": "#1E7FC4",
            "onAccent": "#FFFFFF",
            "accentAlt": "#8FCDEE",
            "positive": "#128371",
            "negative": "#CF4560",
            "radius": 18,
            "outlined": False,
            "swatch": ["#1E7FC4", "#FBFDFF"],
            "fontDisplay": "SpaceGrotesk_500Medium",
            "fontMono": "IBMPlexMono_600SemiBold",
            "fontSans": "Inter_400Regular",
            "style": "clean",
            "shape": "medium",
            "cardStyle": "glass",
            "buttonStyle": "solid",
            "iconStyle": "glyph",
            "navStyle": "floating",
            "backgroundStyle": "plain",
            "decorationStyle": "none",
            "density": "roomy",
            "vibe": "limpo",
        },
    ),
    (
        "Y2K",
        {
            "bg": "#D5DBE4",
            "surface": "#EDF1F6",
            "surfaceAlt": "#C0C9D7",
            "border": "#9AA6B8",
            "text": "#0A1230",
            "textMuted": "#4E5B85",
            "accent": "#1B36D8",
            "onAccent": "#FFFFFF",
            "accentAlt": "#67D4FF",
            "positive": "#0A7F5E",
            "negative": "#D01050",
            "radius": 10,
            "outlined": False,
            "swatch": ["#C0C9D7", "#1B36D8"],
            "fontDisplay": "Anton_400Regular",
            "fontMono": "IBMPlexMono_600SemiBold",
            "fontSans": "Inter_500Medium",
            "style": "futuristic",
            "shape": "medium",
            "cardStyle": "filled",
            "buttonStyle": "glow",
            "iconStyle": "pixel",
            "navStyle": "dock",
            "backgroundStyle": "gradient",
            "decorationStyle": "glow",
            "density": "compact",
            "vibe": "chrome",
        },
    ),
    (
        "MATCHA",
        {
            "bg": "#F6F4EA",
            "surface": "#FFFDF6",
            "surfaceAlt": "#EBEBDB",
            "border": "#DCDECA",
            "text": "#212719",
            "textMuted": "#6F7A66",
            "accent": "#4F8F5F",
            "onAccent": "#FFFFFF",
            "accentAlt": "#BCD6A4",
            "positive": "#4F8F5F",
            "negative": "#BC5A4C",
            "radius": 26,
            "outlined": False,
            "swatch": ["#4F8F5F", "#F6F4EA"],
            "fontDisplay": "SpaceGrotesk_500Medium",
            "fontMono": "IBMPlexMono_600SemiBold",
            "fontSans": "Inter_400Regular",
            "style": "soft",
            "shape": "round",
            "cardStyle": "filled",
            "buttonStyle": "solid",
            "iconStyle": "doodle",
            "navStyle": "floating",
            "backgroundStyle": "plain",
            "decorationStyle": "minimal",
            "density": "roomy",
            "vibe": "calmo",
        },
    ),
    (
        "DIGITAL",
        {
            "bg": "#05060E",
            "surface": "#0B0D1A",
            "surfaceAlt": "#121529",
            "border": "#282E52",
            "text": "#E9ECFF",
            "textMuted": "#8189B5",
            "accent": "#7C5CFC",
            "onAccent": "#FFFFFF",
            "accentAlt": "#22E0FF",
            "positive": "#22E0FF",
            "negative": "#FF4D8D",
            "radius": 14,
            "outlined": False,
            "swatch": ["#7C5CFC", "#22E0FF"],
            "fontDisplay": "SpaceGrotesk_700Bold",
            "fontMono": "IBMPlexMono_600SemiBold",
            "fontSans": "Inter_400Regular",
            "style": "futuristic",
            "shape": "medium",
            "cardStyle": "line",
            "buttonStyle": "glow",
            "iconStyle": "geometric",
            "navStyle": "floating",
            "backgroundStyle": "grid",
            "decorationStyle": "glow",
            "density": "compact",
            "vibe": "neon",
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
