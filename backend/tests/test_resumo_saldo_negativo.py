async def test_saldo_negativo_nao_reporta_tempo_de_trabalho_guardado(client, auth):
    await client.patch("/auth/me", json={"hourly_rate_cents": 2_500}, headers=auth)
    conta = (await client.post("/accounts", json={"name": "Corrente"}, headers=auth)).json()["id"]
    await client.post(
        "/transactions", json={"account_id": conta, "amount_cents": 4_590}, headers=auth
    )

    dados = (await client.get("/summary?period=30d", headers=auth)).json()

    assert dados["balance_cents"] < 0
    # Nada de "0 horas guardadas" quando a pessoa está no vermelho.
    assert dados["balance_time_cost"] is None
    # O que ela gastou continua aparecendo em tempo de trabalho.
    assert dados["expense_time_cost"] is not None


async def test_saldo_positivo_reporta_tempo_de_trabalho_guardado(client, auth):
    await client.patch("/auth/me", json={"hourly_rate_cents": 2_500}, headers=auth)
    await client.post(
        "/accounts",
        json={"name": "Corrente", "opening_balance_cents": 20_000},
        headers=auth,
    )

    dados = (await client.get("/summary?period=30d", headers=auth)).json()

    custo = dados["balance_time_cost"]
    assert (custo["days"], custo["hours"], custo["total_hours"]) == (1, 0, 8.0)
