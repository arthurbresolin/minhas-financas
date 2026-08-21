async def _primeira_conta(client, auth) -> int:
    """A conta que o cadastro já criou — é nela que o Atalho lança.

    O Atalho não pergunta conta (seriam mais dois toques no meio do caminho):
    ele usa a primeira, igual ao que a tela de lançar já pré-seleciona.
    """
    contas = (await client.get("/accounts", headers=auth)).json()
    assert contas, "o cadastro deveria ter criado uma conta"
    return contas[0]["id"]


async def _arquivar_todas(client, auth) -> None:
    for conta in (await client.get("/accounts", headers=auth)).json():
        await client.patch(f"/accounts/{conta['id']}", json={"archived": True}, headers=auth)


async def _token_atalho(client, auth) -> dict[str, str]:
    response = await client.post("/shortcut/token", headers=auth)
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['token']}"}


# ---------------------------------------------------------------------------
# O escopo — a razão de o token existir separado da senha
# ---------------------------------------------------------------------------


async def test_token_do_atalho_nao_le_saldo(client, auth):
    atalho = await _token_atalho(client, auth)

    # Ele vive dentro de um Atalho no aparelho, à vista de quem pegar o
    # celular. Se lesse saldo, perder o celular seria perder o extrato.
    assert (await client.get("/summary?period=30d", headers=atalho)).status_code == 401
    assert (await client.get("/accounts", headers=atalho)).status_code == 401
    assert (await client.get("/transactions", headers=atalho)).status_code == 401
    assert (await client.get("/auth/me", headers=atalho)).status_code == 401


async def test_token_do_atalho_nao_apaga_nada(client, auth):
    conta = await _primeira_conta(client, auth)
    atalho = await _token_atalho(client, auth)
    criada = await client.post(
        "/transactions", json={"account_id": conta, "amount_cents": 1_000}, headers=auth
    )

    apagar = await client.delete(f"/transactions/{criada.json()['id']}", headers=atalho)

    assert apagar.status_code == 401


async def test_token_de_login_nao_registra_pelo_atalho(client, auth):

    # A porta do Atalho só aceita token de Atalho. As duas credenciais não são
    # intercambiáveis em nenhuma direção.
    resposta = await client.post("/shortcut/gasto", json={"valor": 10}, headers=auth)

    assert resposta.status_code == 401


async def test_atalho_de_um_usuario_nao_registra_na_conta_do_outro(client, auth, other_auth):
    conta_do_outro = await _primeira_conta(client, other_auth)
    atalho = await _token_atalho(client, auth)

    await client.post("/shortcut/gasto", json={"valor": 25}, headers=atalho)

    do_outro = (await client.get(f"/transactions?account_id={conta_do_outro}", headers=other_auth)).json()
    assert do_outro == []


# ---------------------------------------------------------------------------
# Revogar
# ---------------------------------------------------------------------------


async def test_revogar_mata_o_token_na_hora(client, auth):
    atalho = await _token_atalho(client, auth)
    assert (await client.post("/shortcut/gasto", json={"valor": 5}, headers=atalho)).status_code == 200

    await client.delete("/shortcut/token", headers=auth)

    # É o botão de "perdi o celular": tem que valer imediatamente, não quando
    # algum prazo expirar.
    assert (await client.post("/shortcut/gasto", json={"valor": 5}, headers=atalho)).status_code == 401
    assert (await client.get("/shortcut/token", headers=auth)).status_code == 404


async def test_gerar_de_novo_invalida_o_anterior(client, auth):
    antigo = await _token_atalho(client, auth)

    novo = await _token_atalho(client, auth)

    assert (await client.post("/shortcut/gasto", json={"valor": 5}, headers=antigo)).status_code == 401
    assert (await client.post("/shortcut/gasto", json={"valor": 5}, headers=novo)).status_code == 200


async def test_token_inventado_nao_entra(client, auth):
    falso = {"Authorization": "Bearer mf_atl_naoexisteesseaquiviu"}

    assert (await client.post("/shortcut/gasto", json={"valor": 5}, headers=falso)).status_code == 401


# ---------------------------------------------------------------------------
# O registro em si
# ---------------------------------------------------------------------------


async def test_valor_em_reais_vira_centavos_exatos(client, auth):
    conta = await _primeira_conta(client, auth)
    atalho = await _token_atalho(client, auth)

    # O caso que o float estraga: 38.90 * 100 dá 3889.9999... em ponto
    # flutuante, e o gasto entraria um centavo menor do que a pessoa digitou.
    await client.post("/shortcut/gasto", json={"valor": 38.90}, headers=atalho)
    await client.post("/shortcut/gasto", json={"valor": 0.07}, headers=atalho)
    await client.post("/shortcut/gasto", json={"valor": 1234.56}, headers=atalho)

    valores = [t["amount_cents"] for t in (await client.get("/transactions", headers=auth)).json()]
    assert sorted(valores) == [7, 3_890, 123_456]
    assert all(t["account_id"] == conta for t in (await client.get("/transactions", headers=auth)).json())


async def test_gasto_do_atalho_fica_marcado_como_atalho(client, auth):
    atalho = await _token_atalho(client, auth)

    await client.post("/shortcut/gasto", json={"valor": 12}, headers=atalho)

    lancamento = (await client.get("/transactions", headers=auth)).json()[0]
    # É o que permite saber depois quanto do registro veio do bolso e quanto
    # veio de alguém sentado no app.
    assert lancamento["created_via"] == "shortcut"
    assert lancamento["kind"] == "expense"


async def test_categoria_casa_por_nome_sem_ligar_pra_caixa(client, auth):
    atalho = await _token_atalho(client, auth)
    categorias = (await client.get("/shortcut/categorias", headers=atalho)).json()
    assert "Alimentação" in categorias

    resposta = await client.post(
        "/shortcut/gasto", json={"valor": 10, "categoria": "  alimentação  "}, headers=atalho
    )

    assert resposta.json()["categoria"] == "Alimentação"


async def test_categoria_desconhecida_nao_derruba_o_registro(client, auth):
    atalho = await _token_atalho(client, auth)

    resposta = await client.post(
        "/shortcut/gasto", json={"valor": 10, "categoria": "Sei lá"}, headers=atalho
    )

    # Perder a categoria é chato; perder o gasto é o que faz a pessoa desistir
    # do app. O lançamento entra sem categoria e ela ajusta depois.
    assert resposta.status_code == 200
    assert resposta.json()["categoria"] is None
    assert resposta.json()["amount_cents"] == 1_000


async def test_mensagem_traz_valor_categoria_e_tempo_de_trabalho(client, auth):
    await client.patch("/auth/me", json={"hourly_rate_cents": 3_500}, headers=auth)
    atalho = await _token_atalho(client, auth)

    mensagem = (
        await client.post(
            "/shortcut/gasto", json={"valor": 38.90, "categoria": "Alimentação"}, headers=atalho
        )
    ).json()["mensagem"]

    assert "38,90" in mensagem
    assert "Alimentação" in mensagem
    assert "de trabalho" in mensagem


async def test_sem_valor_de_hora_a_mensagem_nao_inventa_tempo(client, auth):
    atalho = await _token_atalho(client, auth)

    mensagem = (await client.post("/shortcut/gasto", json={"valor": 10}, headers=atalho)).json()["mensagem"]

    assert "de trabalho" not in mensagem


async def test_valor_zero_ou_negativo_e_recusado(client, auth):
    atalho = await _token_atalho(client, auth)

    assert (await client.post("/shortcut/gasto", json={"valor": 0}, headers=atalho)).status_code == 422
    assert (await client.post("/shortcut/gasto", json={"valor": -5}, headers=atalho)).status_code == 422


async def test_sem_conta_o_atalho_explica_em_vez_de_quebrar(client, auth):
    atalho = await _token_atalho(client, auth)
    await _arquivar_todas(client, auth)

    resposta = await client.post("/shortcut/gasto", json={"valor": 10}, headers=atalho)

    assert resposta.status_code == 409
    assert "conta" in resposta.json()["detail"]


# ---------------------------------------------------------------------------
# O caminho curto: tudo na URL, pra caber numa ação só do app Atalhos
# ---------------------------------------------------------------------------


async def test_caminho_curto_registra_igual(client, auth):
    conta = await _primeira_conta(client, auth)
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    resposta = await client.post(f"/shortcut/{token}/gasto?valor=38.90&categoria=Alimentação")

    assert resposta.status_code == 200
    assert resposta.json()["amount_cents"] == 3_890
    assert resposta.json()["categoria"] == "Alimentação"
    lancamento = (await client.get("/transactions", headers=auth)).json()[0]
    assert lancamento["created_via"] == "shortcut"
    assert lancamento["account_id"] == conta


async def test_caminho_curto_funciona_so_com_o_valor(client, auth):
    # O Atalho mínimo é uma ação só: nem categoria, nem descrição.
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    resposta = await client.post(f"/shortcut/{token}/gasto?valor=7")

    assert resposta.status_code == 200
    assert resposta.json()["amount_cents"] == 700


async def test_caminho_curto_com_token_inventado_e_recusado(client, auth):
    await _primeira_conta(client, auth)

    resposta = await client.post("/shortcut/mf_atl_naoexisteesse/gasto?valor=10")

    assert resposta.status_code == 401
    assert (await client.get("/transactions", headers=auth)).json() == []


async def test_caminho_curto_com_token_de_login_e_recusado(client, auth):
    token_de_login = auth["Authorization"].removeprefix("Bearer ")

    resposta = await client.post(f"/shortcut/{token_de_login}/gasto?valor=10")

    # As duas credenciais continuam não sendo intercambiáveis, mesmo com o
    # token vindo da URL em vez do cabeçalho.
    assert resposta.status_code == 401


async def test_caminho_curto_revogado_para_de_funcionar(client, auth):
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]
    assert (await client.post(f"/shortcut/{token}/gasto?valor=5")).status_code == 200

    await client.delete("/shortcut/token", headers=auth)

    assert (await client.post(f"/shortcut/{token}/gasto?valor=5")).status_code == 401


async def test_caminho_curto_nao_vira_porta_pra_ler_nada(client, auth):
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    # A rota do caminho curto é só POST de gasto. Nenhum GET nasce junto com
    # ela — o escopo continua sendo garantido pela estrutura.
    assert (await client.get(f"/shortcut/{token}/gasto")).status_code == 405


async def test_caminho_curto_recusa_valor_zero(client, auth):
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    assert (await client.post(f"/shortcut/{token}/gasto?valor=0")).status_code == 422
    assert (await client.post(f"/shortcut/{token}/gasto?valor=-3")).status_code == 422


async def test_caminho_curto_aceita_virgula(client, auth):
    # Um brasileiro digita 38,90 no teclado do iPhone. Recusar isso seria
    # devolver um erro no meio do drive-thru.
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    resposta = await client.post(f"/shortcut/{token}/gasto?valor=38,90")

    assert resposta.status_code == 200
    assert resposta.json()["amount_cents"] == 3_890


async def test_caminho_curto_aceita_valor_colado_com_cifrao(client, auth):
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    resposta = await client.post(f"/shortcut/{token}/gasto?valor=R$ 12,50")

    assert resposta.status_code == 200
    assert resposta.json()["amount_cents"] == 1_250


async def test_caminho_curto_explica_valor_que_nao_e_numero(client, auth):
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    resposta = await client.post(f"/shortcut/{token}/gasto?valor=abc")

    assert resposta.status_code == 422
    assert "abc" in resposta.json()["detail"]


# ---------------------------------------------------------------------------
# O arquivo .shortcut pronto
# ---------------------------------------------------------------------------


async def _baixar(client, token: str):
    return await client.get(f"/shortcut/{token}/atalho.shortcut")


async def test_atalho_pronto_tem_o_fluxo_do_video(client, auth):
    import plistlib

    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    resposta = await _baixar(client, token)

    assert resposta.status_code == 200
    workflow = plistlib.loads(resposta.content)
    acoes = [a["WFWorkflowActionIdentifier"] for a in workflow["WFWorkflowActions"]]
    # Valor → categoria → chamada → confirmação. É o vídeo, nessa ordem.
    assert acoes == [
        "is.workflow.actions.ask",
        "is.workflow.actions.list",
        "is.workflow.actions.choosefromlist",
        "is.workflow.actions.downloadurl",
        "is.workflow.actions.getvalueforkey",
        "is.workflow.actions.notification",
    ]


async def test_atalho_pronto_pede_numero_e_nao_texto(client, auth):
    import plistlib

    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    workflow = plistlib.loads((await _baixar(client, token)).content)

    perguntar = workflow["WFWorkflowActions"][0]["WFWorkflowActionParameters"]
    # Teclado de letras pra digitar dinheiro é o atrito que faz alguém parar de
    # usar o atalho depois de três dias.
    assert perguntar["WFInputType"] == "Number"


async def test_atalho_pronto_traz_as_categorias_da_conta(client, auth):
    import plistlib

    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    workflow = plistlib.loads((await _baixar(client, token)).content)

    itens = workflow["WFWorkflowActions"][1]["WFWorkflowActionParameters"]["WFItems"]
    assert "Alimentação" in itens
    assert "Transporte" in itens


async def test_atalho_pronto_aponta_as_variaveis_pros_lugares_certos(client, auth):
    import plistlib

    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    workflow = plistlib.loads((await _baixar(client, token)).content)

    acoes = workflow["WFWorkflowActions"]
    url = acoes[3]["WFWorkflowActionParameters"]["WFURL"]["Value"]
    # Cada anexo aponta pra uma posição do texto, e errar um caractere quebra o
    # Atalho inteiro. Cada índice tem que cair exatamente num marcador.
    for intervalo in url["attachmentsByRange"]:
        inicio = int(intervalo.strip("{}").split(",")[0])
        assert url["string"][inicio] == "￼", intervalo

    # E as variáveis têm que vir das ações certas, não de qualquer uma.
    saidas = {a["OutputUUID"] for a in url["attachmentsByRange"].values()}
    assert saidas == {
        acoes[0]["WFWorkflowActionParameters"]["UUID"],
        acoes[2]["WFWorkflowActionParameters"]["UUID"],
    }


async def test_atalho_pronto_embute_o_token(client, auth):
    import plistlib

    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    workflow = plistlib.loads((await _baixar(client, token)).content)

    url = workflow["WFWorkflowActions"][3]["WFWorkflowActionParameters"]["WFURL"]["Value"]["string"]
    # Sem isso a pessoa teria que colar o token à mão — que é justamente o
    # passo que este arquivo existe pra eliminar.
    assert token in url


async def test_atalho_pronto_com_token_invalido_e_recusado(client, auth):
    assert (await _baixar(client, "mf_atl_naoexisteesse")).status_code == 401


async def test_atalho_pronto_vem_como_download(client, auth):
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    resposta = await _baixar(client, token)

    # Sem `attachment`, o Safari mostra o XML na tela em vez de oferecer o app
    # Atalhos.
    assert "attachment" in resposta.headers["content-disposition"]
    assert ".shortcut" in resposta.headers["content-disposition"]


async def test_categoria_com_emoji_ainda_casa(client, auth):
    # No app Atalhos a pessoa escreve "Alimentação🍔" porque fica bonito na
    # lista do iPhone. Perder a categoria por causa disso seria calado e
    # inexplicável.
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    resposta = await client.post(f"/shortcut/{token}/gasto?valor=10&categoria=Alimentação🍔")

    assert resposta.json()["categoria"] == "Alimentação"


async def test_categoria_com_espaco_e_caixa_diferente_casa(client, auth):
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]

    resposta = await client.post(f"/shortcut/{token}/gasto?valor=10&categoria= TRANSPORTE 🚗 ")

    assert resposta.json()["categoria"] == "Transporte"
