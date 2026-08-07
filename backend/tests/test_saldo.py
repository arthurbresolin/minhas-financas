async def _conta(client, auth, nome: str, abertura: int = 0) -> int:
    response = await client.post(
        "/accounts", json={"name": nome, "opening_balance_cents": abertura}, headers=auth
    )
    return response.json()["id"]


async def _saldo(client, auth, conta_id: int) -> int:
    contas = await client.get("/accounts", headers=auth)
    return next(c["balance_cents"] for c in contas.json() if c["id"] == conta_id)


async def test_saldo_e_abertura_mais_transacoes(client, auth):
    conta = await _conta(client, auth, "Corrente", abertura=10_000)

    await client.post(
        "/transactions",
        json={"account_id": conta, "kind": "expense", "amount_cents": 2_500},
        headers=auth,
    )
    await client.post(
        "/transactions",
        json={"account_id": conta, "kind": "income", "amount_cents": 1_000},
        headers=auth,
    )

    assert await _saldo(client, auth, conta) == 8_500


async def test_saldo_volta_ao_original_quando_a_transacao_e_apagada(client, auth):
    conta = await _conta(client, auth, "Corrente", abertura=5_000)
    criada = await client.post(
        "/transactions", json={"account_id": conta, "amount_cents": 1_234}, headers=auth
    )
    assert await _saldo(client, auth, conta) == 3_766

    await client.delete(f"/transactions/{criada.json()['id']}", headers=auth)
    assert await _saldo(client, auth, conta) == 5_000


async def test_transferencia_move_saldo_e_nao_conta_como_gasto(client, auth):
    origem = await _conta(client, auth, "Corrente", abertura=20_000)
    destino = await _conta(client, auth, "Poupança")

    response = await client.post(
        "/transactions/transfer",
        json={"from_account_id": origem, "to_account_id": destino, "amount_cents": 7_000},
        headers=auth,
    )
    assert response.status_code == 201
    assert len(response.json()) == 2

    assert await _saldo(client, auth, origem) == 13_000
    assert await _saldo(client, auth, destino) == 7_000

    resumo = await client.get("/summary?period=30d", headers=auth)
    dados = resumo.json()
    # O ponto do teste: transferir não é gastar nem receber.
    assert dados["expense_cents"] == 0
    assert dados["income_cents"] == 0


async def test_apagar_uma_perna_apaga_a_transferencia_inteira(client, auth):
    origem = await _conta(client, auth, "Corrente", abertura=20_000)
    destino = await _conta(client, auth, "Poupança")
    pernas = await client.post(
        "/transactions/transfer",
        json={"from_account_id": origem, "to_account_id": destino, "amount_cents": 7_000},
        headers=auth,
    )

    await client.delete(f"/transactions/{pernas.json()[0]['id']}", headers=auth)

    assert await _saldo(client, auth, origem) == 20_000
    assert await _saldo(client, auth, destino) == 0
    assert (await client.get("/transactions", headers=auth)).json() == []


async def test_transferencia_para_a_mesma_conta_e_recusada(client, auth):
    conta = await _conta(client, auth, "Corrente")
    response = await client.post(
        "/transactions/transfer",
        json={"from_account_id": conta, "to_account_id": conta, "amount_cents": 100},
        headers=auth,
    )
    assert response.status_code == 422


async def test_conta_com_transacao_nao_pode_ser_excluida(client, auth):
    conta = await _conta(client, auth, "Corrente")
    await client.post(
        "/transactions", json={"account_id": conta, "amount_cents": 100}, headers=auth
    )

    response = await client.delete(f"/accounts/{conta}", headers=auth)
    assert response.status_code == 409


async def test_conta_arquivada_sai_do_saldo_total(client, auth):
    conta = await _conta(client, auth, "Antiga", abertura=50_000)
    resumo_antes = await client.get("/summary?period=30d", headers=auth)
    assert resumo_antes.json()["balance_cents"] == 50_000

    await client.patch(f"/accounts/{conta}", json={"archived": True}, headers=auth)

    resumo_depois = await client.get("/summary?period=30d", headers=auth)
    assert resumo_depois.json()["balance_cents"] == 0


async def test_apagar_categoria_preserva_a_transacao(client, auth):
    conta = await _conta(client, auth, "Corrente")
    categorias = await client.get("/categories", headers=auth)
    categoria = categorias.json()[0]["id"]

    await client.post(
        "/transactions",
        json={"account_id": conta, "category_id": categoria, "amount_cents": 3_000},
        headers=auth,
    )
    await client.delete(f"/categories/{categoria}", headers=auth)

    transacoes = (await client.get("/transactions", headers=auth)).json()
    assert len(transacoes) == 1
    assert transacoes[0]["category_id"] is None
    assert (await client.get("/summary?period=30d", headers=auth)).json()["expense_cents"] == 3_000
