from app.models import User
from app.services.timecost import time_cost


def _mesada(cents: int | None, periodo: str = "month") -> User:
    return User(
        email="x@x",
        password_hash="x",
        income_mode="allowance",
        hourly_rate_cents=None,
        workday_hours=8,
        allowance_cents=cents,
        allowance_period=periodo,
    )


# ---------------------------------------------------------------------------
# A frase muda com o tamanho do gasto
# ---------------------------------------------------------------------------


def test_gasto_pequeno_demais_pra_um_dia_vira_porcentagem():
    # "0 dias de mesada" não diz nada sobre um lanche. Abaixo de um dia, a
    # porcentagem é a única unidade que sobra.
    custo = time_cost(500, _mesada(20_000))  # R$ 5 de uma mesada de R$ 200

    assert custo is not None
    assert custo.label == "3% da mesada"
    assert custo.days == 0


def test_a_partir_de_um_dia_a_unidade_e_o_dia():
    # R$ 20 de R$ 200/mês são 10% — mas "3 dias de mesada" é mais concreto.
    custo = time_cost(2_000, _mesada(20_000))

    assert custo is not None
    assert custo.label == "3 dias de mesada"
    assert custo.ratio == 0.1


def test_gasto_de_alguns_dias_vira_dias():
    # R$ 60 de uma mesada de R$ 300/mês = R$ 10/dia = 6 dias.
    custo = time_cost(6_000, _mesada(30_000))

    assert custo is not None
    assert custo.label == "6 dias de mesada"
    assert custo.days == 6


def test_um_dia_no_singular():
    custo = time_cost(1_000, _mesada(30_000))
    assert custo is not None
    assert custo.label == "1 dia de mesada"


def test_gasto_do_tamanho_da_mesada():
    custo = time_cost(30_000, _mesada(30_000))
    assert custo is not None
    assert custo.label == "1 mesada inteira"


def test_gasto_maior_que_a_mesada_vira_mesadas():
    # Uma viagem não é "312% da mesada" — é "3,1 mesadas".
    custo = time_cost(93_000, _mesada(30_000))
    assert custo is not None
    assert custo.label == "3,1 mesadas"


def test_semanada_tem_nome_proprio():
    # Quem recebe por semana não chama aquilo de mesada.
    custo = time_cost(5_000, _mesada(10_000, periodo="week"))
    assert custo is not None
    assert "semanada" in custo.label


# ---------------------------------------------------------------------------
# O contrato com as telas
# ---------------------------------------------------------------------------


def test_modo_mesada_nao_finge_horas_de_trabalho():
    custo = time_cost(6_000, _mesada(30_000))

    assert custo is not None
    assert custo.mode == "allowance"
    # Ninguém trabalha uma hora de mesada. Preencher isso seria mentir.
    assert custo.total_hours == 0.0
    assert custo.hours == 0
    assert "trabalho" not in custo.label


def test_sem_mesada_informada_e_nulo():
    assert time_cost(10_000, _mesada(None)) is None
    assert time_cost(10_000, _mesada(0)) is None


# ---------------------------------------------------------------------------
# Pela API
# ---------------------------------------------------------------------------


async def test_trocar_pra_mesada_muda_a_frase_do_resumo(client, auth):
    conta = (await client.get("/accounts", headers=auth)).json()[0]["id"]
    await client.post(
        "/transactions", json={"account_id": conta, "amount_cents": 6_000}, headers=auth
    )

    await client.patch(
        "/auth/me",
        json={"income_mode": "allowance", "allowance_cents": 30_000, "allowance_period": "month"},
        headers=auth,
    )

    resumo = (await client.get("/summary?period=30d", headers=auth)).json()
    assert resumo["expense_time_cost"]["label"] == "6 dias de mesada"


async def test_voltar_pra_trabalho_volta_a_frase(client, auth):
    conta = (await client.get("/accounts", headers=auth)).json()[0]["id"]
    await client.post(
        "/transactions", json={"account_id": conta, "amount_cents": 6_000}, headers=auth
    )
    await client.patch(
        "/auth/me",
        json={"income_mode": "allowance", "allowance_cents": 30_000},
        headers=auth,
    )

    await client.patch(
        "/auth/me",
        json={"income_mode": "work", "hourly_rate_cents": 3_000},
        headers=auth,
    )

    resumo = (await client.get("/summary?period=30d", headers=auth)).json()
    assert "trabalho" in resumo["expense_time_cost"]["label"]


async def test_conta_nova_comeca_no_modo_trabalho(client, auth):
    me = (await client.get("/auth/me", headers=auth)).json()
    assert me["income_mode"] == "work"
    assert me["allowance_cents"] is None


async def test_modo_desconhecido_e_recusado(client, auth):
    resposta = await client.patch("/auth/me", json={"income_mode": "herança"}, headers=auth)
    assert resposta.status_code == 422


async def test_periodo_desconhecido_e_recusado(client, auth):
    resposta = await client.patch("/auth/me", json={"allowance_period": "quinzena"}, headers=auth)
    assert resposta.status_code == 422


async def test_atalho_usa_a_mesada_na_notificacao(client, auth):
    await client.patch(
        "/auth/me",
        json={"income_mode": "allowance", "allowance_cents": 30_000},
        headers=auth,
    )
    token = (await client.post("/shortcut/token", headers=auth)).json()["token"]
    atalho = {"Authorization": f"Bearer {token}"}

    resposta = await client.post("/shortcut/gasto", json={"valor": 60}, headers=atalho)

    # A notificação do Atalho fala a língua de quem recebe mesada também.
    assert resposta.json()["mensagem"] == "R$ 60,00 · 6 dias de mesada"


async def test_meta_guardada_conta_em_mesadas(client, auth):
    await client.patch(
        "/auth/me",
        json={"income_mode": "allowance", "allowance_cents": 30_000},
        headers=auth,
    )
    meta = (
        await client.post("/goals", json={"name": "Fone", "target_cents": 90_000}, headers=auth)
    ).json()
    await client.post(f"/goals/{meta['id']}/deposit", json={"amount_cents": 30_000}, headers=auth)

    guardado = (await client.get("/goals", headers=auth)).json()[0]
    assert guardado["saved_time_cost"]["label"] == "1 mesada inteira"
