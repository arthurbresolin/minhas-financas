from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field

# #RGB, #RRGGBB ou #RRGGBBAA.
HexColor = Annotated[str, Field(pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")]


class ThemeTokens(BaseModel):
    """As cores de um tema. É este objeto que vira `tokens_json` na linha do banco.

    Um tema é uma paleta. A versão anterior guardava aqui também forma,
    densidade, três fontes e sete eixos de personalidade (`cardStyle`,
    `buttonStyle`, `iconStyle`, `navStyle`, `backgroundStyle`,
    `decorationStyle`, `density`) — o app desenhava um `switch` em cima de cada
    um. Sumiram junto com os `switch`.

    Os campos velhos continuam no `tokens_json` das linhas já salvas. O Pydantic
    ignora chave desconhecida por padrão, então esse JSON antigo carrega
    normalmente e só as cores são lidas — nenhuma migração de dados precisou
    acontecer.
    """

    model_config = ConfigDict(extra="ignore")

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
    # As duas cores da amostra na lista de temas.
    swatch: list[HexColor] = Field(min_length=2, max_length=2)


class ThemeRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    is_preset: bool
    tokens: ThemeTokens
