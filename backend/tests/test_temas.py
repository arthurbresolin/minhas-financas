import json

import pytest
from sqlalchemy import select

from app.models import FACTORY_THEMES, Theme, User

# Um tema como era salvo quando o tema ainda era uma "skin": além das cores,
# raio, fontes e sete eixos de personalidade. Existe linha assim no banco de
# verdade, e ela precisa continuar carregando.
TOKENS_ANTIGOS = {
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
    "radius": 16,
    "outlined": True,
    "fontDisplay": "SpaceGrotesk_700Bold",
    "fontMono": "IBMPlexMono_600SemiBold",
    "fontSans": "Inter_400Regular",
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
}


async def _inserir_tema_cru(session_factory, email: str, name: str, tokens: dict, preset: bool) -> int:
    """Escreve direto no banco, sem passar pela API — é como simular o passado."""
    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == email))).scalar_one()
        theme = Theme(
            user_id=user.id, name=name, tokens_json=json.dumps(tokens), is_preset=preset
        )
        session.add(theme)
        await session.commit()
        return theme.id


async def _first_preset(client, auth) -> dict:
    response = await client.get("/themes", headers=auth)
    assert response.status_code == 200, response.text
    return response.json()[0]


@pytest.mark.asyncio
async def test_conta_nova_ja_vem_com_os_presets(client, auth):
    themes = (await client.get("/themes", headers=auth)).json()

    primeiro_nome, primeiro_tokens = FACTORY_THEMES[0]

    assert len(themes) == len(FACTORY_THEMES)
    assert all(theme["is_preset"] for theme in themes)
    # O primeiro do catálogo é o visual padrão do app. Qual é ele vem do
    # catálogo, não daqui: trocar de pack padrão não pode quebrar o teste.
    assert themes[0]["name"] == primeiro_nome
    assert themes[0]["tokens"]["bg"] == primeiro_tokens["bg"]


@pytest.mark.asyncio
async def test_preset_entrega_a_paleta_inteira(client, auth):
    """O app pinta a tela toda com estes onze campos — faltar um deixa buraco."""
    preset = await _first_preset(client, auth)

    esperados = {
        "bg", "surface", "surfaceAlt", "border", "text", "textMuted",
        "accent", "onAccent", "accentAlt", "positive", "negative", "swatch",
    }
    assert set(preset["tokens"]) == esperados


@pytest.mark.asyncio
async def test_ativar_tema_grava_no_usuario(client, auth):
    preset = await _first_preset(client, auth)

    await client.post(f"/themes/{preset['id']}/activate", headers=auth)
    me = (await client.get("/auth/me", headers=auth)).json()

    assert me["active_theme_id"] == preset["id"]


@pytest.mark.asyncio
async def test_um_usuario_nao_ativa_o_tema_do_outro(client, auth, other_auth):
    preset = await _first_preset(client, auth)

    ativado = await client.post(f"/themes/{preset['id']}/activate", headers=other_auth)

    # O id existe, mas é de outra conta: 404 e não 403, pra não confirmar que ele existe.
    assert ativado.status_code == 404


@pytest.mark.asyncio
async def test_tema_antigo_continua_carregando_so_com_as_cores(client, auth, session_factory):
    """Nenhuma migração de dados rodou: o JSON velho tem campos que sumiram.

    O Pydantic ignora chave desconhecida, então a linha antiga carrega e só as
    cores são lidas. Se um dia isso virar `extra="forbid"`, a conta de quem
    criou tema na versão do editor para de abrir a lista.
    """
    antigo = await _inserir_tema_cru(session_factory, "eu@example.com", "Meu antigo", TOKENS_ANTIGOS, False)

    themes = (await client.get("/themes", headers=auth)).json()
    lido = next(theme for theme in themes if theme["id"] == antigo)

    assert lido["tokens"]["accent"] == "#FFFFFF"
    # Os eixos de personalidade não voltam na resposta: eles não existem mais.
    assert "cardStyle" not in lido["tokens"]
    assert "fontDisplay" not in lido["tokens"]


@pytest.mark.asyncio
async def test_conta_antiga_troca_os_presets_e_mantem_os_temas_dela(client, auth, session_factory):
    # Um nome que garantidamente saiu de catálogo, seja qual for o catálogo de
    # hoje — fixar um nome real faria o teste quebrar quando ele voltasse.
    fora_de_catalogo = "Pack Descontinuado"
    velho = await _inserir_tema_cru(session_factory, "eu@example.com", fora_de_catalogo, TOKENS_ANTIGOS, True)
    meu = await _inserir_tema_cru(session_factory, "eu@example.com", "Meu", TOKENS_ANTIGOS, False)
    await client.post(f"/themes/{velho}/activate", headers=auth)

    themes = (await client.get("/themes", headers=auth)).json()
    nomes = [theme["name"] for theme in themes]
    me = (await client.get("/auth/me", headers=auth)).json()

    # O pack fora de catálogo sai; os de fábrica atuais entram; o tema que a
    # pessoa criou na versão do editor nunca é tocado.
    assert fora_de_catalogo not in nomes
    assert nomes[: len(FACTORY_THEMES)] == [name for name, _ in FACTORY_THEMES]
    assert meu in [theme["id"] for theme in themes]
    # Estava ativo o preset que sumiu: apontar pra id morto deixaria o app sem tema.
    assert me["active_theme_id"] is None


@pytest.mark.asyncio
async def test_criar_e_editar_tema_nao_existem_mais(client, auth):
    """O editor saiu junto com as rotas. Sobraram listar e ativar."""
    preset = await _first_preset(client, auth)

    criado = await client.post("/themes", headers=auth, json={"name": "x", "tokens": TOKENS_ANTIGOS})
    editado = await client.patch(f"/themes/{preset['id']}", headers=auth, json={"name": "x"})
    apagado = await client.delete(f"/themes/{preset['id']}", headers=auth)
    duplicado = await client.post(f"/themes/{preset['id']}/duplicate", headers=auth)

    # 405 onde o caminho ainda existe com outro método (GET /themes), 404 onde
    # o caminho inteiro sumiu.
    assert criado.status_code == 405
    assert editado.status_code == 404
    assert apagado.status_code == 404
    assert duplicado.status_code == 404
