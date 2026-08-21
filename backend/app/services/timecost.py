import math

from app.models import User
from app.schemas.summary import TimeCost

# Quantos dias tem cada período de mesada. Não é o calendário: é a conta que
# a pessoa faz de cabeça — "minha mesada dura o mês".
DIAS_POR_PERIODO = {"week": 7, "month": 30}


def time_cost(amount_cents: int, user: User) -> TimeCost | None:
    """Converte dinheiro no tempo que ele custou de você.

    É a ideia central do app: R$ 300 não diz muita coisa, "quase 2 dias de
    trabalho" diz. Mas nem todo mundo troca tempo por dinheiro — quem recebe
    mesada não trabalha por aquele dinheiro, e dizer "2 dias de trabalho" pra
    essa pessoa é mentira. Pra ela a pergunta certa é outra: "quanto da minha
    mesada isso foi?".

    Devolve None quando não dá pra saber (a pessoa ainda não informou nada).
    Chutar um valor aqui seria inventar um número sobre a vida de alguém, e o
    app inteiro trata None como "não mostrar".

    A frase pronta vai junto de propósito. Antes cada tela escrevia
    "de trabalho" na mão, e isso significava que trocar pra mesada exigiria
    caçar quatro telas. Quem sabe de onde o dinheiro vem monta a frase.
    """
    if user.income_mode == "allowance":
        return _mesada(amount_cents, user)
    return _trabalho(amount_cents, user)


def _trabalho(amount_cents: int, user: User) -> TimeCost | None:
    if not user.hourly_rate_cents or user.hourly_rate_cents <= 0:
        return None

    workday = max(1, user.workday_hours)
    total_hours = amount_cents / user.hourly_rate_cents
    days = int(total_hours // workday)
    hours = round(total_hours - days * workday)
    # O arredondamento pode empurrar as horas até fechar um dia inteiro
    # ("0 dias e 8 horas" quando o dia tem 8h) — normaliza pra não exibir isso.
    if hours >= workday:
        days += 1
        hours -= workday

    return TimeCost(
        mode="work",
        total_hours=round(total_hours, 2),
        days=days,
        hours=hours,
        ratio=0.0,
        label=f"{_frase_trabalho(days, hours)} de trabalho",
    )


def _frase_trabalho(days: int, hours: int) -> str:
    dia = "1 dia" if days == 1 else f"{days} dias"
    hora = "1 hora" if hours == 1 else f"{hours} horas"
    if days == 0:
        return hora
    if hours == 0:
        return dia
    return f"{dia} e {hora}"


def _mesada(amount_cents: int, user: User) -> TimeCost | None:
    if not user.allowance_cents or user.allowance_cents <= 0:
        return None

    dias_do_periodo = DIAS_POR_PERIODO.get(user.allowance_period, 30)
    por_dia = user.allowance_cents / dias_do_periodo
    dias = amount_cents / por_dia
    ratio = amount_cents / user.allowance_cents

    return TimeCost(
        mode="allowance",
        # Horas não significam nada aqui: ninguém trabalha uma hora de mesada.
        total_hours=0.0,
        days=int(dias),
        hours=0,
        ratio=round(ratio, 4),
        label=_frase_mesada(dias, ratio, user.allowance_period),
    )


def _frase_mesada(dias: float, ratio: float, periodo: str) -> str:
    """A frase que faz sentido pro tamanho do gasto.

    Um lanche não é "0 dias de mesada" — é "8% da mesada". Uma viagem não é
    "312% da mesada" — é "3 mesadas". A unidade muda com a ordem de grandeza,
    porque é assim que a pessoa pensa sobre o próprio dinheiro.
    """
    nome = "mesada" if periodo == "month" else "semanada"

    if ratio >= 1:
        quantas = ratio
        if quantas < 1.1:
            return f"1 {nome} inteira"
        arredondado = round(quantas, 1)
        texto = f"{arredondado:.1f}".replace(".", ",").replace(",0", "")
        return f"{texto} {nome}s"

    if dias >= 1:
        inteiros = int(dias)
        return f"{inteiros} dia de {nome}" if inteiros == 1 else f"{inteiros} dias de {nome}"

    # Menos de um dia: a porcentagem diz mais do que "0 dias".
    #
    # `round` do Python arredonda 2,5 pra 2 (arredondamento bancário), e numa
    # porcentagem mostrada pra alguém isso fica arbitrário — 2,5% viraria 2% e
    # 3,5% viraria 4%. Meio pra cima, sempre.
    porcento = max(1, math.floor(ratio * 100 + 0.5))
    return f"{porcento}% da {nome}"
