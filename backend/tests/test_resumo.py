from datetime import datetime, timedelta, timezone

from app.services.worktime import work_time


async def _conta(client, auth) -> int:
    return (await client.post("/accounts", json={"name": "Corrente"}, headers=auth)).json()["id"]


async def test_resumo_agrupa_por_categoria(client, auth):
    conta = await _conta(client, auth)
    categorias = {c["name"]: c["id"] for c in (await client.get("/categories", headers=auth)).json()}

    for categoria, valor in [("Alimentação", 3_000), ("Alimentação", 2_000), ("Transporte", 1_500)]:
        await client.post(
            "/transactions",
            json={
                "account_id": conta,
                "category_id": categorias[categoria],
                "amount_cents": valor,
            },
            headers=auth,
        )

    dados = (await client.get("/summary?period=30d", headers=auth)).json()
    assert dados["expense_cents"] == 6_500
    # Vem ordenado do maior gasto pro menor, que é como a tela desenha.
    assert [(c["name"], c["total_cents"]) for c in dados["by_category"]] == [
        ("Alimentação", 5_000),
        ("Transporte", 1_500),
    ]


async def test_periodo_recorta_o_que_entra_na_conta(client, auth):
    conta = await _conta(client, auth)
    antigo = datetime.now(timezone.utc) - timedelta(days=20)

    await client.post(
        "/transactions",
        json={"account_id": conta, "amount_cents": 1_000, "occurred_at": antigo.isoformat()},
        headers=auth,
    )
    await client.post("/transactions", json={"account_id": conta, "amount_cents": 500}, headers=auth)

    assert (await client.get("/summary?period=7d", headers=auth)).json()["expense_cents"] == 500
    assert (await client.get("/summary?period=30d", headers=auth)).json()["expense_cents"] == 1_500


async def test_periodo_invalido_e_recusado(client, auth):
    assert (await client.get("/summary?period=1a", headers=auth)).status_code == 422


async def test_tempo_de_trabalho_so_aparece_com_valor_da_hora(client, auth):
    conta = await _conta(client, auth)
    await client.post(
        "/transactions", json={"account_id": conta, "amount_cents": 20_000}, headers=auth
    )

    sem_valor_hora = (await client.get("/summary?period=30d", headers=auth)).json()
    assert sem_valor_hora["expense_work_time"] is None

    # R$ 25,00/hora, dia de 8h: R$ 200,00 gastos = 8 horas = 1 dia.
    await client.patch("/auth/me", json={"hourly_rate_cents": 2_500}, headers=auth)
    com_valor_hora = (await client.get("/summary?period=30d", headers=auth)).json()
    assert com_valor_hora["expense_work_time"] == {"total_hours": 8.0, "days": 1, "hours": 0}


def test_work_time_quebra_em_dias_e_horas():
    # R$ 30,00/hora, dia de 8h → R$ 300,00 = 10 horas = 1 dia e 2 horas.
    assert work_time(30_000, 3_000, 8) == work_time(30_000, 3_000, 8)
    resultado = work_time(30_000, 3_000, 8)
    assert (resultado.days, resultado.hours) == (1, 2)


def test_work_time_nao_mostra_dia_incompleto_arredondado_pra_cima():
    # 7,9h num dia de 8h arredondaria pra "0 dias e 8 horas" — tem que virar 1 dia.
    resultado = work_time(int(7.9 * 1_000), 1_000, 8)
    assert (resultado.days, resultado.hours) == (1, 0)


def test_work_time_sem_valor_da_hora_e_nulo():
    assert work_time(10_000, None, 8) is None
    assert work_time(10_000, 0, 8) is None
