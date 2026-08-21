async def _meta(client, auth, nome: str = "Trip dos cria", alvo: int = 500_000) -> dict:
    response = await client.post(
        "/goals", json={"name": nome, "target_cents": alvo, "emoji": "🏝️"}, headers=auth
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _guardar(client, auth, meta_id: int, valor: int):
    return await client.post(
        f"/goals/{meta_id}/deposit", json={"amount_cents": valor}, headers=auth
    )


async def test_guardado_e_a_soma_dos_depositos(client, auth):
    meta = await _meta(client, auth)

    await _guardar(client, auth, meta["id"], 100_000)
    await _guardar(client, auth, meta["id"], 50_000)
    await _guardar(client, auth, meta["id"], -20_000)

    lista = (await client.get("/goals", headers=auth)).json()
    assert lista[0]["saved_cents"] == 130_000
    assert lista[0]["progress"] == 0.26


async def test_resgatar_mais_do_que_tem_e_recusado(client, auth):
    meta = await _meta(client, auth)
    await _guardar(client, auth, meta["id"], 10_000)

    response = await _guardar(client, auth, meta["id"], -10_001)

    assert response.status_code == 409
    lista = (await client.get("/goals", headers=auth)).json()
    assert lista[0]["saved_cents"] == 10_000


async def test_bater_a_meta_avisa_uma_vez_so(client, auth):
    meta = await _meta(client, auth, alvo=100_000)

    parcial = await _guardar(client, auth, meta["id"], 60_000)
    assert parcial.json()["just_completed"] is False

    batida = await _guardar(client, auth, meta["id"], 40_000)
    assert batida.json()["just_completed"] is True
    assert batida.json()["goal"]["done_at"] is not None

    # Guardar de novo em cima de uma meta já batida não repete a comemoração.
    depois = await _guardar(client, auth, meta["id"], 5_000)
    assert depois.json()["just_completed"] is False


async def test_resgatar_nao_apaga_a_conquista(client, auth):
    meta = await _meta(client, auth, alvo=100_000)
    await _guardar(client, auth, meta["id"], 100_000)

    await _guardar(client, auth, meta["id"], -90_000)

    lista = (await client.get("/goals", headers=auth)).json()
    assert lista[0]["saved_cents"] == 10_000
    # A meta continua marcada como batida: ela *foi* batida, e o histórico
    # disso não pode sumir porque a pessoa usou o dinheiro depois.
    assert lista[0]["done_at"] is not None


async def test_aumentar_o_alvo_desbate_a_meta(client, auth):
    meta = await _meta(client, auth, alvo=100_000)
    await _guardar(client, auth, meta["id"], 100_000)

    await client.patch(f"/goals/{meta['id']}", json={"target_cents": 300_000}, headers=auth)

    lista = (await client.get("/goals", headers=auth)).json()
    assert lista[0]["done_at"] is None


async def test_progresso_nunca_passa_de_um(client, auth):
    meta = await _meta(client, auth, alvo=100_000)
    await _guardar(client, auth, meta["id"], 250_000)

    lista = (await client.get("/goals", headers=auth)).json()
    assert lista[0]["progress"] == 1.0
    assert lista[0]["saved_cents"] == 250_000


async def test_meta_de_um_usuario_nao_aparece_pro_outro(client, auth, other_auth):
    meta = await _meta(client, auth)

    assert (await client.get("/goals", headers=other_auth)).json() == []
    assert (await _guardar(client, other_auth, meta["id"], 1_000)).status_code == 404
    assert (
        await client.patch(f"/goals/{meta['id']}", json={"name": "roubada"}, headers=other_auth)
    ).status_code == 404


async def test_deposito_de_zero_e_recusado(client, auth):
    meta = await _meta(client, auth)
    assert (await _guardar(client, auth, meta["id"], 0)).status_code == 422


async def test_apagar_a_meta_leva_os_depositos_junto(client, auth):
    meta = await _meta(client, auth)
    await _guardar(client, auth, meta["id"], 30_000)

    assert (await client.delete(f"/goals/{meta['id']}", headers=auth)).status_code == 204

    outra = await _meta(client, auth, nome="Outra")
    lista = (await client.get("/goals", headers=auth)).json()
    # O guardado da meta nova não herda nada da apagada.
    assert [g["saved_cents"] for g in lista] == [0]
    assert lista[0]["id"] == outra["id"]
