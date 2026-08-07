async def test_register_cria_conta_carteira_e_categorias(client, auth):
    accounts = await client.get("/accounts", headers=auth)
    assert accounts.status_code == 200
    assert [a["name"] for a in accounts.json()] == ["Dinheiro"]

    categories = await client.get("/categories", headers=auth)
    names = [c["name"] for c in categories.json()]
    assert "Alimentação" in names
    assert "Salário" in names


async def test_email_duplicado_da_conflito(client, auth):
    response = await client.post(
        "/auth/register", json={"email": "eu@example.com", "password": "outrasenha"}
    )
    assert response.status_code == 409


async def test_login_com_senha_errada_falha(client, auth):
    response = await client.post(
        "/auth/login", json={"email": "eu@example.com", "password": "errada12"}
    )
    assert response.status_code == 401


async def test_endpoint_sem_token_e_rejeitado(client):
    assert (await client.get("/accounts")).status_code == 401


async def test_patch_me_salva_valor_da_hora(client, auth):
    response = await client.patch(
        "/auth/me", json={"hourly_rate_cents": 3000, "workday_hours": 6}, headers=auth
    )
    assert response.status_code == 200
    assert response.json()["hourly_rate_cents"] == 3000

    me = await client.get("/auth/me", headers=auth)
    assert me.json()["workday_hours"] == 6
