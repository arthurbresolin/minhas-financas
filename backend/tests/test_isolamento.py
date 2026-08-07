"""O teste que mais importa neste app: o dinheiro de uma conta nunca aparece
para outra. Cada endpoint que lê dado financeiro tem que filtrar por user_id —
se algum esquecer, é aqui que aparece."""


async def _conta_com_gasto(client, headers, nome: str, valor: int) -> tuple[int, int]:
    conta = await client.post("/accounts", json={"name": nome}, headers=headers)
    conta_id = conta.json()["id"]
    gasto = await client.post(
        "/transactions",
        json={"account_id": conta_id, "amount_cents": valor, "description": nome},
        headers=headers,
    )
    return conta_id, gasto.json()["id"]


async def test_listagens_nao_vazam_entre_usuarios(client, auth, other_auth):
    await _conta_com_gasto(client, auth, "Minha", 5000)
    await _conta_com_gasto(client, other_auth, "Dela", 9900)

    minhas_contas = await client.get("/accounts", headers=auth)
    assert "Dela" not in [c["name"] for c in minhas_contas.json()]

    minhas_transacoes = await client.get("/transactions", headers=auth)
    descricoes = [t["description"] for t in minhas_transacoes.json()]
    assert descricoes == ["Minha"]

    resumo = await client.get("/summary?period=30d", headers=auth)
    assert resumo.json()["expense_cents"] == 5000


async def test_nao_da_pra_ler_ou_editar_conta_alheia(client, auth, other_auth):
    conta_alheia, transacao_alheia = await _conta_com_gasto(client, other_auth, "Dela", 9900)

    assert (
        await client.patch(f"/accounts/{conta_alheia}", json={"name": "roubada"}, headers=auth)
    ).status_code == 404
    assert (await client.delete(f"/accounts/{conta_alheia}", headers=auth)).status_code == 404
    assert (
        await client.patch(
            f"/transactions/{transacao_alheia}", json={"amount_cents": 1}, headers=auth
        )
    ).status_code == 404
    assert (
        await client.delete(f"/transactions/{transacao_alheia}", headers=auth)
    ).status_code == 404


async def test_nao_da_pra_lancar_gasto_na_conta_de_outro(client, auth, other_auth):
    conta_alheia, _ = await _conta_com_gasto(client, other_auth, "Dela", 100)

    response = await client.post(
        "/transactions", json={"account_id": conta_alheia, "amount_cents": 500}, headers=auth
    )
    assert response.status_code == 404


async def test_nao_da_pra_usar_categoria_de_outro(client, auth, other_auth):
    categorias_alheias = await client.get("/categories", headers=other_auth)
    categoria_alheia = categorias_alheias.json()[0]["id"]

    conta = await client.post("/accounts", json={"name": "Minha"}, headers=auth)
    response = await client.post(
        "/transactions",
        json={
            "account_id": conta.json()["id"],
            "category_id": categoria_alheia,
            "amount_cents": 500,
        },
        headers=auth,
    )
    assert response.status_code == 404
