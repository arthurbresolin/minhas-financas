from decimal import Decimal

from pydantic import BaseModel, Field


class ShortcutTokenRead(BaseModel):
    """O token, devolvido inteiro uma vez.

    Ele fica guardado em claro no banco (não é hash) porque a tela de Atalho
    precisa poder mostrá-lo de novo: a pessoa monta o Atalho no iPhone dias
    depois de gerar, e não dá pra pedir que ela regenere e refaça o Atalho toda
    vez que quiser conferir. O risco é aceitável justamente porque o escopo
    dele é mínimo — só cria lançamento.
    """

    token: str


class GastoRapido(BaseModel):
    """Um gasto vindo do Atalho.

    O valor chega em **reais**, não em centavos, porque quem preenche é o
    "Pedir Entrada (Número)" do app Atalhos — ele devolve 38,9 e não 3890.
    A conversão pra centavos acontece aqui, uma vez, com Decimal: `38.9 * 100`
    em float dá 3889.9999... e viraria R$ 38,89.
    """

    valor: Decimal = Field(gt=0)
    # O nome da categoria, como veio do menu do Atalho. Não é o id: o Atalho
    # mostra texto pra pessoa escolher, e casar por nome evita que ela tenha
    # que digitar número nenhum.
    categoria: str | None = None
    descricao: str | None = Field(default=None, max_length=255)


class GastoRapidoRead(BaseModel):
    """A resposta que o Atalho mostra na notificação.

    `mensagem` vem pronta do servidor de propósito: montar a frase no app
    Atalhos exigiria três blocos de "Texto" e uma conta de divisão feita à mão.
    Uma linha só, pronta pra colar no "Mostrar Notificação".
    """

    mensagem: str
    amount_cents: int
    categoria: str | None
    saldo_cents: int
