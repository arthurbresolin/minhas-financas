import json

import pytest
from sqlalchemy import select

from app.models import FACTORY_THEMES, Theme, User

# Um tema como era salvo antes dos tokens de personalidade existirem: só cores,
# fontes, raio e o antigo `outlined`. Existe linha assim no banco de verdade.
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
    "radius": 16,
    "outlined": True,
    "swatch": ["#FFFFFF", "#000000"],
    "fontDisplay": "SpaceGrotesk_700Bold",
    "fontMono": "IBMPlexMono_600SemiBold",
    "fontSans": "Inter_400Regular",
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

    assert len(themes) == len(FACTORY_THEMES)
    assert all(theme["is_preset"] for theme in themes)
    # O NOIR é o primeiro: é o visual padrão do app.
    assert themes[0]["name"] == "NOIR"
    assert themes[0]["tokens"]["bg"] == "#050505"
    # Um preset não é só paleta — ele carrega a personalidade inteira.
    assert themes[0]["tokens"]["cardStyle"] == "outline"
    assert themes[0]["tokens"]["density"] == "compact"


@pytest.mark.asyncio
async def test_duplicar_preset_gera_tema_editavel(client, auth):
    preset = await _first_preset(client, auth)

    copy = (await client.post(f"/themes/{preset['id']}/duplicate", headers=auth)).json()

    assert copy["is_preset"] is False
    assert copy["name"] == "NOIR (meu)"
    # A cópia nasce idêntica: o editor sempre parte de algo que já funciona.
    assert copy["tokens"] == preset["tokens"]


@pytest.mark.asyncio
async def test_preset_nao_pode_ser_editado_nem_apagado(client, auth):
    preset = await _first_preset(client, auth)

    patched = await client.patch(f"/themes/{preset['id']}", headers=auth, json={"name": "outro"})
    deleted = await client.delete(f"/themes/{preset['id']}", headers=auth)

    assert patched.status_code == 403
    assert deleted.status_code == 403


@pytest.mark.asyncio
async def test_editar_tema_proprio_salva_os_tokens(client, auth):
    preset = await _first_preset(client, auth)
    copy = (await client.post(f"/themes/{preset['id']}/duplicate", headers=auth)).json()
    tokens = {**copy["tokens"], "accent": "#FF0000", "radius": 4}

    response = await client.patch(
        f"/themes/{copy['id']}", headers=auth, json={"name": "Meu tema", "tokens": tokens}
    )

    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Meu tema"
    assert response.json()["tokens"]["accent"] == "#FF0000"
    assert response.json()["tokens"]["radius"] == 4


@pytest.mark.asyncio
async def test_cor_invalida_e_recusada(client, auth):
    preset = await _first_preset(client, auth)
    copy = (await client.post(f"/themes/{preset['id']}/duplicate", headers=auth)).json()

    response = await client.patch(
        f"/themes/{copy['id']}",
        headers=auth,
        json={"tokens": {**copy["tokens"], "accent": "vermelho"}},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_fonte_fora_da_lista_e_recusada(client, auth):
    """Fonte inexistente não quebra o app — ele cai calado numa do sistema."""
    preset = await _first_preset(client, auth)
    copy = (await client.post(f"/themes/{preset['id']}/duplicate", headers=auth)).json()

    response = await client.patch(
        f"/themes/{copy['id']}",
        headers=auth,
        json={"tokens": {**copy["tokens"], "fontDisplay": "Comic Sans"}},
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_ativar_tema_grava_no_usuario(client, auth):
    preset = await _first_preset(client, auth)

    await client.post(f"/themes/{preset['id']}/activate", headers=auth)
    me = (await client.get("/auth/me", headers=auth)).json()

    assert me["active_theme_id"] == preset["id"]


@pytest.mark.asyncio
async def test_apagar_tema_ativo_volta_pro_padrao(client, auth):
    preset = await _first_preset(client, auth)
    copy = (await client.post(f"/themes/{preset['id']}/duplicate", headers=auth)).json()
    await client.post(f"/themes/{copy['id']}/activate", headers=auth)

    response = await client.delete(f"/themes/{copy['id']}", headers=auth)
    me = (await client.get("/auth/me", headers=auth)).json()

    assert response.status_code == 204
    # Ficar apontando pra um id morto deixaria o app sem tema nenhum.
    assert me["active_theme_id"] is None


@pytest.mark.asyncio
async def test_um_usuario_nao_ve_nem_edita_o_tema_do_outro(client, auth, other_auth):
    preset = await _first_preset(client, auth)
    meu = (await client.post(f"/themes/{preset['id']}/duplicate", headers=auth)).json()

    listagem = (await client.get("/themes", headers=other_auth)).json()
    lido = await client.patch(f"/themes/{meu['id']}", headers=other_auth, json={"name": "roubado"})
    ativado = await client.post(f"/themes/{meu['id']}/activate", headers=other_auth)

    assert meu["id"] not in [theme["id"] for theme in listagem]
    assert lido.status_code == 404
    assert ativado.status_code == 404


@pytest.mark.asyncio
async def test_tema_antigo_continua_carregando_e_ganha_personalidade(client, auth, session_factory):
    """Tema salvo antes dos tokens de skin não pode virar erro 500 nem outro tema."""
    theme_id = await _inserir_tema_cru(session_factory, "eu@example.com", "Antigo", TOKENS_ANTIGOS, False)

    themes = (await client.get("/themes", headers=auth)).json()
    antigo = next(theme for theme in themes if theme["id"] == theme_id)

    assert antigo["tokens"]["accent"] == "#FFFFFF"
    # `outlined=True` era exatamente "cartão de traço, botão adesivo": o tema
    # continua parecido com o que a pessoa escolheu em vez de virar outro.
    assert antigo["tokens"]["cardStyle"] == "outline"
    assert antigo["tokens"]["buttonStyle"] == "sticker"
    assert antigo["tokens"]["style"] == "bold"
    assert antigo["tokens"]["shape"] == "medium"
    assert antigo["tokens"]["density"] == "regular"


@pytest.mark.asyncio
async def test_patch_sem_os_campos_novos_e_aceito(client, auth):
    """App desatualizado manda só as cores — e isso tem que continuar salvando."""
    preset = await _first_preset(client, auth)
    copy = (await client.post(f"/themes/{preset['id']}/duplicate", headers=auth)).json()

    response = await client.patch(
        f"/themes/{copy['id']}", headers=auth, json={"tokens": {**TOKENS_ANTIGOS, "accent": "#00FF00"}}
    )

    assert response.status_code == 200, response.text
    assert response.json()["tokens"]["accent"] == "#00FF00"
    assert response.json()["tokens"]["cardStyle"] == "outline"


@pytest.mark.asyncio
async def test_conta_antiga_troca_os_presets_e_mantem_os_temas_dela(client, auth, session_factory):
    velho = await _inserir_tema_cru(session_factory, "eu@example.com", "Gamer", TOKENS_ANTIGOS, True)
    meu = await _inserir_tema_cru(session_factory, "eu@example.com", "Meu", TOKENS_ANTIGOS, False)
    await client.post(f"/themes/{velho}/activate", headers=auth)

    themes = (await client.get("/themes", headers=auth)).json()
    nomes = [theme["name"] for theme in themes]
    me = (await client.get("/auth/me", headers=auth)).json()

    # O pack fora de catálogo sai; os de fábrica atuais entram; o tema que a
    # pessoa criou nunca é tocado.
    assert "Gamer" not in nomes
    assert nomes[: len(FACTORY_THEMES)] == [name for name, _ in FACTORY_THEMES]
    assert meu in [theme["id"] for theme in themes]
    # Estava ativo o preset que sumiu: apontar pra id morto deixaria o app sem tema.
    assert me["active_theme_id"] is None


@pytest.mark.asyncio
async def test_eixo_de_personalidade_invalido_e_recusado(client, auth):
    """`cardStyle` vira um `switch` no app — valor desconhecido cai calado no default."""
    preset = await _first_preset(client, auth)
    copy = (await client.post(f"/themes/{preset['id']}/duplicate", headers=auth)).json()

    response = await client.patch(
        f"/themes/{copy['id']}",
        headers=auth,
        json={"tokens": {**copy["tokens"], "cardStyle": "banana"}},
    )

    assert response.status_code == 422
