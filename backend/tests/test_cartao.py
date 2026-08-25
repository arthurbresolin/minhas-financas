"""Cartão de crédito: fatura em vez de caixa.

O que estes testes protegem é uma ideia só, e ela é o motivo do app existir:
**passar o cartão não tira dinheiro seu**. O saldo só cai quando a fatura é
paga. Antes disso o gasto é dívida, e dívida aparece à parte.
"""

from datetime import date, datetime, timedelta, timezone

import pytest

from app.services.faturas import Ciclo, ciclo_aberto


# ---------------------------------------------------------------------------
# O ciclo, sem banco: é data pura
# ---------------------------------------------------------------------------


def test_gasto_antes_do_fechamento_cai_na_fatura_deste_mes():
    ciclo = ciclo_aberto(date(2026, 3, 5), closing_day=10, due_day=17)

    assert ciclo.fechamento == date(2026, 3, 10)
    assert ciclo.inicio == date(2026, 2, 11)
    assert ciclo.vencimento == date(2026, 3, 17)


def test_no_proprio_dia_do_fechamento_ainda_entra_nele():
    # É como os bancos daqui fazem, e é o que a pessoa espera de "fecha dia 10".
    ciclo = ciclo_aberto(date(2026, 3, 10), closing_day=10, due_day=17)

    assert ciclo.fechamento == date(2026, 3, 10)


def test_gasto_depois_do_fechamento_cai_na_fatura_seguinte():
    ciclo = ciclo_aberto(date(2026, 3, 11), closing_day=10, due_day=17)

    assert ciclo.fechamento == date(2026, 4, 10)
    assert ciclo.inicio == date(2026, 3, 11)


def test_vencimento_menor_que_fechamento_cai_no_mes_seguinte():
    # Fecha dia 28, vence dia 5: o dia 5 só existe depois virando o mês.
    ciclo = ciclo_aberto(date(2026, 3, 2), closing_day=28, due_day=5)

    assert ciclo.fechamento == date(2026, 3, 28)
    assert ciclo.vencimento == date(2026, 4, 5)


def test_cartao_que_fecha_dia_31_fecha_no_ultimo_dia_de_fevereiro():
    # Sem tratar isto, todo fevereiro viraria ValueError na leitura de contas.
    ciclo = ciclo_aberto(date(2026, 2, 10), closing_day=31, due_day=10)

    assert ciclo.fechamento == date(2026, 2, 28)


def test_ciclo_de_janeiro_comeca_em_dezembro_do_ano_anterior():
    ciclo = ciclo_aberto(date(2026, 1, 3), closing_day=10, due_day=20)

    assert ciclo.inicio == date(2025, 12, 11)
    assert ciclo.fechamento == date(2026, 1, 10)


@pytest.mark.parametrize("dia", range(1, 29))
def test_o_ciclo_sempre_contem_o_dia_de_hoje(dia: int):
    """Nenhum dia do mês pode cair fora da própria fatura aberta."""
    hoje = date(2026, 3, dia)
    ciclo = ciclo_aberto(hoje, closing_day=15, due_day=22)

    assert ciclo.inicio <= hoje <= ciclo.fechamento
    assert ciclo.vencimento > ciclo.fechamento


# ---------------------------------------------------------------------------
# Pela API
# ---------------------------------------------------------------------------


async def _cria_cartao(client, auth, **extra) -> dict:
    payload = {
        "name": "Cartão",
        "kind": "credit_card",
        "closing_day": 10,
        "due_day": 17,
        **extra,
    }
    r = await client.post("/accounts", headers=auth, json=payload)
    assert r.status_code == 201, r.text
    return r.json()


async def _cria_conta(client, auth, saldo: int) -> dict:
    r = await client.post(
        "/accounts",
        headers=auth,
        json={"name": "Carteira", "kind": "cash", "opening_balance_cents": saldo},
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _saldo(client, auth) -> int:
    r = await client.get("/summary?period=30d", headers=auth)
    return r.json()["balance_cents"]


@pytest.mark.asyncio
async def test_passar_o_cartao_nao_mexe_no_saldo(client, auth):
    """O coração da feature. Antes disto, comprar no cartão derrubava o saldo."""
    await _cria_conta(client, auth, 50_000)
    cartao = await _cria_cartao(client, auth)
    antes = await _saldo(client, auth)

    await client.post(
        "/transactions",
        headers=auth,
        json={"account_id": cartao["id"], "kind": "expense", "amount_cents": 12_000},
    )

    assert await _saldo(client, auth) == antes


@pytest.mark.asyncio
async def test_o_gasto_no_cartao_vira_divida_e_entra_na_fatura(client, auth):
    cartao = await _cria_cartao(client, auth)

    await client.post(
        "/transactions",
        headers=auth,
        json={"account_id": cartao["id"], "kind": "expense", "amount_cents": 12_000},
    )
    lido = next(
        c for c in (await client.get("/accounts", headers=auth)).json() if c["id"] == cartao["id"]
    )

    # Negativo no saldo da conta: é o total que se deve.
    assert lido["balance_cents"] == -12_000
    # Positivo na fatura: é uma conta a pagar, não um saldo.
    assert lido["fatura"]["total_cents"] == 12_000
    assert lido["fatura"]["dias_ate_fechar"] >= 0


@pytest.mark.asyncio
async def test_pagar_a_fatura_tira_do_caixa_e_zera_a_divida(client, auth):
    """Pagar é uma transferência: o conceito já existia, não inventamos outro."""
    conta = await _cria_conta(client, auth, 50_000)
    cartao = await _cria_cartao(client, auth)
    await client.post(
        "/transactions",
        headers=auth,
        json={"account_id": cartao["id"], "kind": "expense", "amount_cents": 12_000},
    )

    r = await client.post(
        "/transactions/transfer",
        headers=auth,
        json={
            "from_account_id": conta["id"],
            "to_account_id": cartao["id"],
            "amount_cents": 12_000,
        },
    )
    assert r.status_code == 201, r.text

    contas = {c["id"]: c for c in (await client.get("/accounts", headers=auth)).json()}
    assert contas[cartao["id"]]["balance_cents"] == 0
    assert contas[conta["id"]]["balance_cents"] == 38_000
    # Agora sim o dinheiro saiu.
    assert await _saldo(client, auth) == 38_000


@pytest.mark.asyncio
async def test_pagar_a_fatura_nao_aumenta_a_propria_fatura(client, auth):
    """O `transfer_in` no cartão é pagamento, não compra."""
    conta = await _cria_conta(client, auth, 50_000)
    cartao = await _cria_cartao(client, auth)
    await client.post(
        "/transactions",
        headers=auth,
        json={"account_id": cartao["id"], "kind": "expense", "amount_cents": 12_000},
    )
    await client.post(
        "/transactions/transfer",
        headers=auth,
        json={
            "from_account_id": conta["id"],
            "to_account_id": cartao["id"],
            "amount_cents": 12_000,
        },
    )

    lido = next(
        c for c in (await client.get("/accounts", headers=auth)).json() if c["id"] == cartao["id"]
    )
    assert lido["fatura"]["total_cents"] == 12_000


@pytest.mark.asyncio
async def test_gasto_de_ciclo_antigo_nao_entra_na_fatura_aberta(client, auth, session_factory):
    """Uma compra de dois meses atrás já foi cobrada; ela não volta."""
    from sqlalchemy import select

    from app.models import Transaction, User

    cartao = await _cria_cartao(client, auth)
    antigo = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=75)

    async with session_factory() as session:
        user = (await session.execute(select(User).where(User.email == "eu@example.com"))).scalar_one()
        session.add(
            Transaction(
                user_id=user.id,
                account_id=cartao["id"],
                kind="expense",
                amount_cents=9_900,
                occurred_at=antigo,
            )
        )
        await session.commit()

    lido = next(
        c for c in (await client.get("/accounts", headers=auth)).json() if c["id"] == cartao["id"]
    )

    assert lido["fatura"]["total_cents"] == 0
    # Mas continua sendo dívida: ninguém pagou.
    assert lido["balance_cents"] == -9_900


@pytest.mark.asyncio
async def test_cartao_sem_os_dois_dias_nao_inventa_fatura(client, auth):
    """Sem fechamento e vencimento não há ciclo — e inventar um dia seria mentir."""
    cartao = await _cria_cartao(client, auth, closing_day=None, due_day=None)

    lido = next(
        c for c in (await client.get("/accounts", headers=auth)).json() if c["id"] == cartao["id"]
    )
    assert lido["fatura"] is None


@pytest.mark.asyncio
async def test_conta_normal_nunca_tem_fatura(client, auth):
    conta = await _cria_conta(client, auth, 1_000)

    lido = next(
        c for c in (await client.get("/accounts", headers=auth)).json() if c["id"] == conta["id"]
    )
    assert lido["fatura"] is None


@pytest.mark.asyncio
async def test_o_resumo_ainda_conta_o_gasto_do_cartao_como_gasto(client, auth):
    """Não entrar no saldo não é sumir do resumo.

    Se o gasto no cartão saísse de "quanto saiu", o app deixaria de mostrar
    justamente o gasto que a pessoa menos sente — que é o do cartão.
    """
    cartao = await _cria_cartao(client, auth)
    await client.post(
        "/transactions",
        headers=auth,
        json={"account_id": cartao["id"], "kind": "expense", "amount_cents": 12_000},
    )

    resumo = (await client.get("/summary?period=30d", headers=auth)).json()
    assert resumo["expense_cents"] == 12_000
