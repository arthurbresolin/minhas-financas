"""Lançamentos que se repetem todo mês.

A mesada, a assinatura, o aluguel — os valores que a pessoa esquece de
registrar não por dar trabalho, mas por serem previsíveis demais pra lembrar.

Não há agendador: a regra vira transação **na leitura** (extrato, resumo,
contas). O que estes testes protegem, acima de tudo, é que ler duas vezes não
cria duas vezes.
"""

from datetime import date, datetime, timedelta, timezone

import pytest

from app.models import RecurringRule
from app.services.recorrentes import MAX_POR_CHAMADA, datas_devidas


def _regra(**extra) -> RecurringRule:
    base = dict(
        user_id=1,
        account_id=1,
        kind="expense",
        amount_cents=5_000,
        day_of_month=5,
        active=True,
        start_on=date(2026, 1, 1),
        last_applied_on=None,
    )
    return RecurringRule(**{**base, **extra})


# ---------------------------------------------------------------------------
# O calendário, sem banco
# ---------------------------------------------------------------------------


def test_gera_uma_data_por_mes_desde_o_inicio():
    datas = datas_devidas(_regra(), date(2026, 3, 10))

    assert datas == [date(2026, 1, 5), date(2026, 2, 5), date(2026, 3, 5)]


def test_nunca_gera_no_futuro():
    # Um gasto que ainda não aconteceu no extrato faria o saldo de hoje incluir
    # dinheiro que ainda está lá.
    datas = datas_devidas(_regra(), date(2026, 3, 4))

    assert datas == [date(2026, 1, 5), date(2026, 2, 5)]


def test_continua_de_onde_parou():
    datas = datas_devidas(_regra(last_applied_on=date(2026, 2, 5)), date(2026, 4, 10))

    assert datas == [date(2026, 3, 5), date(2026, 4, 5)]


def test_ler_de_novo_no_mesmo_dia_nao_gera_nada():
    """O coração da idempotência."""
    datas = datas_devidas(_regra(last_applied_on=date(2026, 3, 5)), date(2026, 3, 5))

    assert datas == []


def test_dia_31_cai_no_ultimo_dia_de_fevereiro():
    # Sem isto a regra sumiria em silêncio nos meses curtos, que é o pior jeito
    # de falhar: sem erro nenhum.
    datas = datas_devidas(
        _regra(day_of_month=31, start_on=date(2026, 1, 1)), date(2026, 3, 31)
    )

    assert datas == [date(2026, 1, 31), date(2026, 2, 28), date(2026, 3, 31)]


def test_regra_criada_depois_do_dia_comeca_no_mes_seguinte():
    # Criada dia 20 com vencimento dia 5: o dia 5 deste mês já passou, e cobrar
    # retroativo seria inventar um gasto que ninguém fez.
    datas = datas_devidas(
        _regra(day_of_month=5, start_on=date(2026, 1, 20)), date(2026, 2, 10)
    )

    assert datas == [date(2026, 2, 5)]


def test_regra_desligada_nao_gera():
    datas = datas_devidas(_regra(active=False), date(2026, 6, 1))

    assert datas == []


def test_atraso_enorme_e_recuperado_aos_poucos():
    """Uma leitura que insere centenas de linhas estoura o tempo e assusta."""
    datas = datas_devidas(_regra(start_on=date(2000, 1, 1)), date(2026, 3, 10))

    assert len(datas) == MAX_POR_CHAMADA


# ---------------------------------------------------------------------------
# Pela API
# ---------------------------------------------------------------------------


async def _conta(client, auth) -> int:
    r = await client.post(
        "/accounts",
        headers=auth,
        json={"name": "Carteira", "kind": "cash", "opening_balance_cents": 0},
    )
    return r.json()["id"]


def _hoje_utc() -> date:
    """A mesma data que o servidor usa.

    `date.today()` é local; o serviço trabalha em UTC. Entre 21h e meia-noite
    aqui (GMT-3) os dois discordam, e um teste que mistura os dois passa ou
    falha conforme a hora em que roda — foi assim que este arquivo escondeu um
    bug de verdade por um dia.
    """
    return datetime.now(timezone.utc).date()


async def _quantas_transacoes(client, auth) -> int:
    r = await client.get("/transactions?limit=500", headers=auth)
    return len(r.json())


@pytest.mark.asyncio
async def test_regra_de_hoje_nao_lanca_retroativo(client, auth):
    conta = await _conta(client, auth)

    r = await client.post(
        "/recurring",
        headers=auth,
        json={
            "account_id": conta,
            "kind": "income",
            "amount_cents": 30_000,
            "description": "Mesada",
            "day_of_month": _hoje_utc().day,
        },
    )

    assert r.status_code == 201, r.text
    # Começa hoje: o dia de hoje ainda não "venceu" pra uma regra que nasce agora.
    assert await _quantas_transacoes(client, auth) == 0


@pytest.mark.asyncio
async def test_regra_que_comeca_no_passado_lanca_o_atrasado(client, auth):
    conta = await _conta(client, auth)
    dois_meses_atras = _hoje_utc() - timedelta(days=62)

    await client.post(
        "/recurring",
        headers=auth,
        json={
            "account_id": conta,
            "kind": "income",
            "amount_cents": 30_000,
            "description": "Mesada",
            "day_of_month": 1,
            "start_on": dois_meses_atras.isoformat(),
        },
    )

    lancamentos = (await client.get("/transactions?limit=500", headers=auth)).json()
    assert len(lancamentos) >= 2
    assert all(t["created_via"] == "recorrente" for t in lancamentos)
    assert all(t["description"] == "Mesada" for t in lancamentos)


@pytest.mark.asyncio
async def test_ler_varias_vezes_nao_duplica(client, auth):
    """O teste que justifica a coluna `last_applied_on`."""
    conta = await _conta(client, auth)
    await client.post(
        "/recurring",
        headers=auth,
        json={
            "account_id": conta,
            "kind": "income",
            "amount_cents": 30_000,
            "day_of_month": 1,
            "start_on": (_hoje_utc() - timedelta(days=62)).isoformat(),
        },
    )
    depois_de_criar = await _quantas_transacoes(client, auth)

    # Todas as leituras que materializam, uma depois da outra.
    await client.get("/transactions?limit=500", headers=auth)
    await client.get("/summary?period=30d", headers=auth)
    await client.get("/accounts", headers=auth)
    await client.get("/recurring", headers=auth)

    assert await _quantas_transacoes(client, auth) == depois_de_criar


@pytest.mark.asyncio
async def test_o_lancamento_gerado_entra_no_saldo(client, auth):
    conta = await _conta(client, auth)
    await client.post(
        "/recurring",
        headers=auth,
        json={
            "account_id": conta,
            "kind": "income",
            "amount_cents": 30_000,
            "day_of_month": 1,
            "start_on": (_hoje_utc() - timedelta(days=40)).isoformat(),
        },
    )

    resumo = (await client.get("/summary?period=30d", headers=auth)).json()
    assert resumo["balance_cents"] >= 30_000


@pytest.mark.asyncio
async def test_desligar_para_de_gerar_e_nao_apaga_o_passado(client, auth):
    conta = await _conta(client, auth)
    criada = (
        await client.post(
            "/recurring",
            headers=auth,
            json={
                "account_id": conta,
                "kind": "income",
                "amount_cents": 30_000,
                "day_of_month": 1,
                "start_on": (_hoje_utc() - timedelta(days=62)).isoformat(),
            },
        )
    ).json()
    antes = await _quantas_transacoes(client, auth)

    r = await client.patch(f"/recurring/{criada['id']}", headers=auth, json={"active": False})

    assert r.status_code == 200
    assert r.json()["active"] is False
    assert r.json()["proxima_em"] is None
    assert await _quantas_transacoes(client, auth) == antes


@pytest.mark.asyncio
async def test_apagar_a_regra_mantem_o_que_ela_ja_lancou(client, auth):
    """O dinheiro entrou de verdade. Apagar reescreveria o histórico."""
    conta = await _conta(client, auth)
    criada = (
        await client.post(
            "/recurring",
            headers=auth,
            json={
                "account_id": conta,
                "kind": "income",
                "amount_cents": 30_000,
                "day_of_month": 1,
                "start_on": (_hoje_utc() - timedelta(days=62)).isoformat(),
            },
        )
    ).json()
    antes = await _quantas_transacoes(client, auth)

    r = await client.delete(f"/recurring/{criada['id']}", headers=auth)

    assert r.status_code == 204
    assert (await client.get("/recurring", headers=auth)).json() == []
    assert await _quantas_transacoes(client, auth) == antes


@pytest.mark.asyncio
async def test_diz_quando_e_a_proxima(client, auth):
    conta = await _conta(client, auth)
    criada = (
        await client.post(
            "/recurring",
            headers=auth,
            json={"account_id": conta, "kind": "expense", "amount_cents": 1_990, "day_of_month": 15},
        )
    ).json()

    assert criada["proxima_em"] is not None
    assert date.fromisoformat(criada["proxima_em"]) > _hoje_utc()


@pytest.mark.asyncio
async def test_transferencia_nao_pode_ser_recorrente(client, auth):
    """Ela nasce em par; uma regra que criasse só uma perna erraria dois saldos."""
    conta = await _conta(client, auth)

    r = await client.post(
        "/recurring",
        headers=auth,
        json={
            "account_id": conta,
            "kind": "transfer_out",
            "amount_cents": 1_000,
            "day_of_month": 5,
        },
    )

    assert r.status_code == 422


@pytest.mark.asyncio
async def test_nao_da_pra_criar_regra_na_conta_de_outro(client, auth, other_auth):
    conta = await _conta(client, auth)

    r = await client.post(
        "/recurring",
        headers=other_auth,
        json={"account_id": conta, "kind": "expense", "amount_cents": 1_000, "day_of_month": 5},
    )

    assert r.status_code == 404


@pytest.mark.asyncio
async def test_um_usuario_nao_ve_nem_edita_a_regra_do_outro(client, auth, other_auth):
    conta = await _conta(client, auth)
    minha = (
        await client.post(
            "/recurring",
            headers=auth,
            json={"account_id": conta, "kind": "expense", "amount_cents": 1_000, "day_of_month": 5},
        )
    ).json()

    listagem = (await client.get("/recurring", headers=other_auth)).json()
    editada = await client.patch(
        f"/recurring/{minha['id']}", headers=other_auth, json={"amount_cents": 1}
    )
    apagada = await client.delete(f"/recurring/{minha['id']}", headers=other_auth)

    assert listagem == []
    assert editada.status_code == 404
    assert apagada.status_code == 404
