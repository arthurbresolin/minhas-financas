from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

# Só as famílias que o app realmente carrega no `_layout.tsx`. Aceitar texto
# livre aqui deixaria o app com `fontFamily` inexistente, que no React Native
# não dá erro — ele silenciosamente cai numa fonte do sistema e o tema fica
# "quase certo" de um jeito difícil de diagnosticar.
ALLOWED_FONTS: tuple[str, ...] = (
    "SpaceGrotesk_700Bold",
    "SpaceGrotesk_500Medium",
    "IBMPlexMono_600SemiBold",
    "Inter_400Regular",
    "Inter_500Medium",
    "Archivo_900Black_Italic",
    "Anton_400Regular",
    "Caveat_700Bold",
)

# #RGB, #RRGGBB ou #RRGGBBAA.
HexColor = Annotated[str, Field(pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")]
FontName = Annotated[str, Field(pattern="^(?:" + "|".join(ALLOWED_FONTS) + ")$")]

# Os eixos de personalidade. Fechados de propósito: o app desenha um `switch`
# em cima de cada um, e um valor desconhecido cairia no default silenciosamente.
# Precisa espelhar as uniões de `src/theme/tokens.ts`.
StyleName = Literal["clean", "soft", "bold", "playful", "futuristic"]
ShapeName = Literal["sharp", "medium", "round"]
CardStyleName = Literal["filled", "outline", "glass", "line"]
ButtonStyleName = Literal["solid", "sticker", "outline", "glow"]
IconStyleName = Literal["glyph", "doodle", "geometric", "pixel"]
NavStyleName = Literal["floating", "dock", "minimal"]
BackgroundStyleName = Literal["plain", "grid", "glow", "gradient"]
DecorationStyleName = Literal["none", "minimal", "doodles", "glow", "outline"]
DensityName = Literal["compact", "regular", "roomy"]


def personalidade_padrao(outlined: bool, radius: int) -> dict[str, Any]:
    """O que um tema salvo antes dos tokens de personalidade deve virar.

    Adivinhar a partir do `outlined` e do `radius` faz o tema antigo continuar
    parecido com o que a pessoa escolheu, em vez de virar outro tema de repente.
    Precisa dar o mesmo resultado que o `resolveTokens` do app.
    """
    return {
        "style": "bold" if outlined else "clean",
        "shape": "sharp" if radius <= 8 else "medium" if radius <= 18 else "round",
        "cardStyle": "outline" if outlined else "filled",
        "buttonStyle": "sticker" if outlined else "solid",
        "iconStyle": "glyph",
        "navStyle": "floating",
        # O grid em perspectiva já era o fundo da Home antes deste token existir.
        "backgroundStyle": "grid",
        "decorationStyle": "outline" if outlined else "minimal",
        "density": "regular",
        "vibe": "",
    }


class ThemeTokens(BaseModel):
    """O tema inteiro. É este objeto que vira `tokens_json` na linha do banco."""

    bg: HexColor
    surface: HexColor
    surfaceAlt: HexColor
    border: HexColor
    text: HexColor
    textMuted: HexColor
    accent: HexColor
    onAccent: HexColor
    accentAlt: HexColor
    positive: HexColor
    negative: HexColor
    radius: int = Field(ge=0, le=40)
    # Herança do primeiro desenho, quando só existia "traço ou chapado". Continua
    # aqui porque é a partir dele que um tema antigo ganha `cardStyle` e
    # `buttonStyle` sem mudar de cara.
    outlined: bool = False
    # As duas cores da amostra na lista de temas.
    swatch: list[HexColor] = Field(min_length=2, max_length=2)
    fontDisplay: FontName
    fontMono: FontName
    fontSans: FontName

    # --- Personalidade: um tema é uma skin, não só uma paleta. ---
    # Todos com default preenchido pelo validador abaixo, para que um tema salvo
    # antes destes campos continue carregando.
    style: StyleName = "clean"
    shape: ShapeName = "medium"
    cardStyle: CardStyleName = "filled"
    buttonStyle: ButtonStyleName = "solid"
    iconStyle: IconStyleName = "glyph"
    navStyle: NavStyleName = "floating"
    backgroundStyle: BackgroundStyleName = "grid"
    decorationStyle: DecorationStyleName = "minimal"
    density: DensityName = "regular"
    # Uma palavra na miniatura da loja ("seco", "doce"). Vazio é válido.
    vibe: str = Field(default="", max_length=16)

    @model_validator(mode="before")
    @classmethod
    def _completar_personalidade(cls, data: Any) -> Any:
        """Preenche os eixos ausentes antes da validação.

        Roda tanto no JSON velho vindo do banco quanto no PATCH de um app
        desatualizado — nos dois casos o tema continua válido e parecido.
        """
        if not isinstance(data, dict):
            return data
        data = dict(data)
        try:
            radius = int(data.get("radius", 16))
        except (TypeError, ValueError):
            radius = 16
        for chave, valor in personalidade_padrao(bool(data.get("outlined", False)), radius).items():
            if data.get(chave) is None:
                data[chave] = valor
        return data


class ThemeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    tokens: ThemeTokens


class ThemeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    tokens: ThemeTokens | None = None


class ThemeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_preset: bool
    tokens: ThemeTokens
