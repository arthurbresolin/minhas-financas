from datetime import datetime, timezone
from decimal import ROUND_HALF_UP, Decimal, InvalidOperation

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_shortcut_user
from app.core.security import SHORTCUT_TOKEN_PREFIX, create_shortcut_token
from app.db.session import get_db
from app.models import Account, Category, Transaction, User
from app.schemas.shortcut import GastoRapido, GastoRapidoRead, ShortcutTokenRead
from app.services.atalho_ios import montar_atalho
from app.services.balance import total_balance
from app.services.timecost import time_cost

router = APIRouter(prefix="/shortcut", tags=["shortcut"])


# ---------------------------------------------------------------------------
# O token — estas rotas usam o login normal
# ---------------------------------------------------------------------------


@router.post("/token", response_model=ShortcutTokenRead)
async def gerar_token(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Cria o token do Atalho, ou troca o que já existia.

    Gerar de novo invalida o anterior na hora — é o botão de "perdi o celular"
    e o de "quero um novo" ao mesmo tempo, e um só é mais fácil de entender do
    que dois.
    """
    user.shortcut_token = create_shortcut_token()
    db.add(user)
    await db.commit()
    return ShortcutTokenRead(token=user.shortcut_token)


@router.get("/token", response_model=ShortcutTokenRead)
async def ler_token(user: User = Depends(get_current_user)):
    """Devolve o token atual, pra tela poder mostrá-lo de novo."""
    if not user.shortcut_token:
        raise HTTPException(status_code=404, detail="você ainda não criou o atalho")
    return ShortcutTokenRead(token=user.shortcut_token)


@router.delete("/token", status_code=204)
async def revogar_token(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user.shortcut_token = None
    db.add(user)
    await db.commit()


# ---------------------------------------------------------------------------
# O que o Atalho chama — daqui pra baixo, só o token do Atalho entra
# ---------------------------------------------------------------------------


@router.get("/categorias", response_model=list[str])
async def listar_categorias(
    user: User = Depends(get_shortcut_user),
    db: AsyncSession = Depends(get_db),
):
    """Só os nomes, na ordem em que aparecem no app.

    Uma lista de textos, não de objetos: é exatamente o que o bloco "Escolher
    em Menu" do app Atalhos consome. Devolver os ids obrigaria a pessoa a
    montar um mapa à mão dentro do Atalho.
    """
    result = await db.execute(
        select(Category.name)
        .where(Category.user_id == user.id, Category.kind == "expense")
        .order_by(Category.sort_order, Category.id)
    )
    return [nome for (nome,) in result.all()]


@router.post("/gasto", response_model=GastoRapidoRead)
async def registrar_gasto(
    payload: GastoRapido,
    user: User = Depends(get_shortcut_user),
    db: AsyncSession = Depends(get_db),
):
    """Registra o gasto e devolve a frase pronta pra notificação.

    Token no cabeçalho e valor no corpo — a forma correta. A rota gêmea lá
    embaixo aceita tudo na URL, porque montar isto no app Atalhos é o que faz
    as pessoas desistirem.

    Nada aqui lê saldo alheio nem apaga coisa alguma: é o teto do que aquele
    token consegue fazer.
    """
    return await _registrar(db, user, payload)


async def _usuario_do_token(db: AsyncSession, token: str) -> User:
    """A mesma checagem do `get_shortcut_user`, com o token vindo da URL.

    Não dá pra reusar a dependência: ela lê do cabeçalho, e aqui o token está
    no caminho. O que não pode divergir é a *decisão* — por isso as duas passam
    pelo mesmo par de condições e devolvem a mesma resposta indistinguível.
    """
    result = await db.execute(select(User).where(User.shortcut_token == token))
    user = result.scalar_one_or_none()
    if user is None or not token.startswith(SHORTCUT_TOKEN_PREFIX):
        raise HTTPException(status_code=401, detail="token do atalho inválido ou revogado")
    return user


async def _registrar(db: AsyncSession, user: User, payload: GastoRapido) -> GastoRapidoRead:
    """O registro em si, compartilhado pelas duas portas.

    As duas rotas diferem só em *como o token chega*. O que elas fazem com ele
    é idêntico, e mora aqui — duas cópias divergiriam, e a que divergisse seria
    a que ninguém testou.
    """
    conta = await db.scalar(
        select(Account)
        .where(Account.user_id == user.id, Account.archived.is_(False))
        .order_by(Account.id)
        .limit(1)
    )
    if conta is None:
        raise HTTPException(status_code=409, detail="crie uma conta no app antes de usar o atalho")

    # Reais → centavos, em Decimal. `float(38.9) * 100` dá 3889.999... e o
    # gasto entraria um centavo menor do que a pessoa digitou.
    amount_cents = int((payload.valor * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))
    if amount_cents <= 0:
        raise HTTPException(status_code=422, detail="o valor precisa ser maior que zero")

    categoria = None
    if payload.categoria:
        # A comparação acontece em Python, não em SQL, porque o que chega do
        # menu do Atalho não é o nome cru: a pessoa escreve "Alimentação🍔"
        # porque fica bonito na lista do iPhone. Exigir o nome exato faria a
        # categoria se perder calada — o gasto entraria, sem categoria, e
        # ninguém entenderia por quê.
        #
        # São sete categorias por conta; carregá-las custa menos que a ginástica
        # de normalizar texto dentro do banco.
        das_saidas = await db.execute(
            select(Category).where(Category.user_id == user.id, Category.kind == "expense")
        )
        procurado = _so_letras(payload.categoria)
        categoria = next(
            (c for c in das_saidas.scalars().all() if _so_letras(c.name) == procurado),
            None,
        )

    db.add(
        Transaction(
            user_id=user.id,
            account_id=conta.id,
            category_id=categoria.id if categoria else None,
            kind="expense",
            amount_cents=amount_cents,
            description=payload.descricao,
            occurred_at=datetime.now(timezone.utc).replace(tzinfo=None),
            # É por este campo que dá pra saber, depois, quanto do registro veio
            # do bolso e quanto veio de alguém sentado no app.
            created_via="shortcut",
        )
    )
    await db.commit()

    saldo = await total_balance(db, user.id)
    tempo = time_cost(amount_cents, user)

    valor_texto = f"R$ {amount_cents / 100:,.2f}".replace(",", "_").replace(".", ",").replace("_", ".")
    partes = [valor_texto]
    if categoria:
        partes.append(f"em {categoria.name}")
    if tempo:
        # A frase vem pronta do servidor: "1 hora de trabalho" ou "6 dias de
        # mesada". Montá-la aqui era o que fazia a notificação dizer "trabalho"
        # pra quem recebe mesada.
        partes.append(f"· {tempo.label}")

    return GastoRapidoRead(
        mensagem=" ".join(partes),
        amount_cents=amount_cents,
        categoria=categoria.name if categoria else None,
        saldo_cents=saldo,
    )

# ---------------------------------------------------------------------------
# O caminho curto — um toque no app Atalhos, sem cabeçalho e sem JSON
# ---------------------------------------------------------------------------


def _so_letras(texto: str) -> str:
    """O nome reduzido ao que dá pra comparar: sem emoji, sem espaço, minúsculo.

    "Alimentação🍔" e " alimentação " viram a mesma coisa. Acento fica — ele
    distingue palavras de verdade em português, e os dois lados são digitados
    pela mesma pessoa.
    """
    return "".join(c for c in texto.lower() if c.isalnum())


def _valor_em_decimal(bruto: str) -> Decimal:
    """Aceita o valor como a pessoa digita, não como a máquina prefere.

    O Atalho manda o que foi digitado no teclado do iPhone, e um brasileiro
    digita `38,90`. `Decimal("38,90")` estoura, e o gasto viraria um erro 422 no
    meio do drive-thru — que é exatamente o momento em que a pessoa desiste do
    app pra sempre.

    Também tira `R$` e espaços: colar um valor de outro lugar é comum.
    """
    limpo = bruto.strip().replace("R$", "").replace(" ", "").replace(",", ".")
    try:
        valor = Decimal(limpo)
    except InvalidOperation:
        raise HTTPException(status_code=422, detail=f"não entendi o valor {bruto!r}") from None
    if valor <= 0:
        raise HTTPException(status_code=422, detail="o valor precisa ser maior que zero")
    return valor


@router.post("/{token}/gasto", response_model=GastoRapidoRead)
async def registrar_gasto_simples(
    token: str,
    # Texto, não Decimal: o FastAPI recusaria "38,90" antes de a gente ter
    # chance de entender. Quem converte é `_valor_em_decimal`.
    valor: str = Query(),
    categoria: str | None = Query(default=None),
    descricao: str | None = Query(default=None, max_length=255),
    db: AsyncSession = Depends(get_db),
):
    """O mesmo registro, com tudo na URL.

    Existe porque montar o Atalho é a parte que realmente falha. A rota de cima
    é a correta — token no cabeçalho, valor no corpo — e exige, no app Atalhos
    do iPhone: mudar o método, abrir a seção de cabeçalhos, digitar
    `Authorization`, colar `Bearer <token>`, escolher JSON no corpo e criar dois
    campos. São sete telas num aparelho, e é aí que a pessoa desiste.

    Com tudo na URL, o Atalho vira **uma ação só**: colar o endereço e enfiar a
    variável do valor no meio.

    O que se paga por isso: o token passa a viajar na URL, e URL entra em log de
    servidor e em histórico de proxy. É um risco real, e é aceitável exatamente
    aqui — este token só cria lançamento, não lê nada, e morre num toque na tela
    do Atalho. O que ele protege é a conveniência de registrar um café em três
    segundos, que é o recurso inteiro.

    Quem preferir o caminho certo continua tendo: `POST /shortcut/gasto`.
    """
    user = await _usuario_do_token(db, token)
    return await _registrar(
        db,
        user,
        GastoRapido(valor=_valor_em_decimal(valor), categoria=categoria, descricao=descricao),
    )


@router.get("/{token}/atalho.shortcut")
async def baixar_atalho(token: str, request: Request, db: AsyncSession = Depends(get_db)):
    """Entrega o Atalho pronto, com o token e as categorias da conta dentro.

    A pessoa abre este endereço no Safari do iPhone e toca em adicionar. É a
    diferença entre um recurso que existe e um recurso que é usado.

    O endereço da API vai embutido, deduzido de como esta requisição chegou: se
    o telefone alcançou o servidor por aqui, o Atalho também vai alcançar.
    """
    user = await _usuario_do_token(db, token)

    result = await db.execute(
        select(Category.name)
        .where(Category.user_id == user.id, Category.kind == "expense")
        .order_by(Category.sort_order, Category.id)
    )
    categorias = [nome for (nome,) in result.all()]

    base_url = str(request.base_url).rstrip("/")
    arquivo = montar_atalho(base_url, token, categorias)

    return Response(
        content=arquivo,
        media_type="application/x-shortcut",
        # `attachment` é o que faz o iOS oferecer abrir no app Atalhos em vez de
        # mostrar o XML na tela do Safari.
        headers={"Content-Disposition": 'attachment; filename="minhas-financas.shortcut"'},
    )
