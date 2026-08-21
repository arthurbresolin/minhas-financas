from datetime import datetime, timedelta, timezone

from app.models import User
from app.services.timecost import time_cost


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
    assert sem_valor_hora["expense_time_cost"] is None

    # R$ 25,00/hora, dia de 8h: R$ 200,00 gastos = 8 horas = 1 dia.
    await client.patch("/auth/me", json={"hourly_rate_cents": 2_500}, headers=auth)
    com_valor_hora = (await client.get("/summary?period=30d", headers=auth)).json()
    custo = com_valor_hora["expense_time_cost"]
    assert (custo["days"], custo["hours"], custo["total_hours"]) == (1, 0, 8.0)
    assert custo["mode"] == "work"
    # A frase vem pronta do servidor — é ela que as telas mostram.
    assert custo["label"] == "1 dia de trabalho"


def _trabalhador(hourly_rate_cents: int | None, workday_hours: int = 8) -> User:
    return User(
        email="x@x", password_hash="x", income_mode="work",
        hourly_rate_cents=hourly_rate_cents, workday_hours=workday_hours,
        allowance_cents=None, allowance_period="month",
    )


def test_time_cost_quebra_em_dias_e_horas():
    # R$ 30,00/hora, dia de 8h → R$ 300,00 = 10 horas = 1 dia e 2 horas.
    resultado = time_cost(30_000, _trabalhador(3_000))
    assert (resultado.days, resultado.hours) == (1, 2)


def test_time_cost_nao_mostra_dia_incompleto_arredondado_pra_cima():
    # 7,9h num dia de 8h arredondaria pra "0 dias e 8 horas" — tem que virar 1 dia.
    resultado = time_cost(int(7.9 * 1_000), _trabalhador(1_000))
    assert (resultado.days, resultado.hours) == (1, 0)


def test_time_cost_sem_valor_da_hora_e_nulo():
    assert time_cost(10_000, _trabalhador(None)) is None
    assert time_cost(10_000, _trabalhador(0)) is None
