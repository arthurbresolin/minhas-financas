# Minhas Finanças

App de finanças pessoais com conta própria, backend e sincronização entre
aparelhos. Substitui o protótipo `~/controle-mesada`, que era HTML solto com
dados presos no `localStorage` de um navegador só.

A ideia central: **registrar tem que ser instantâneo** (é o atrito que mata todo
app de finanças) e **dinheiro é tempo** — o app mostra cada gasto também em horas
e dias do seu trabalho, ou em dias da sua mesada.

## Rodar

Dois processos, em terminais separados:

```bash
# 1. backend
cd backend
uv run alembic upgrade head
uv run fastapi dev app/main.py --port 8001

# 2. app
npx expo start                    # celular via Expo Go, no mesmo Wi-Fi
npx expo start --web              # navegador
```

O endereço do backend é **deduzido**, não configurado: `src/api/client.ts` usa o
`hostUri` do Expo, então trocar de Wi-Fi não exige editar nada. O
`EXPO_PUBLIC_API_URL` do `.env` só entra em dois casos — `--tunnel` ou backend em
outra máquina — e é lido na hora de montar o bundle, então **mudou o `.env`,
reinicie o Expo**.

## Estrutura

```
backend/          FastAPI + SQLAlchemy async + Alembic + SQLite  (ver backend/README.md)
src/api/          client HTTP e tipos da API
src/app/          telas (expo-router): (auth), (tabs), nova-transacao, meta,
                  contas, atalho, temas
src/components/   kit de UI próprio + barra de abas flutuante
src/theme/        as cores do tema e useTheme()
src/lib/          formatação de dinheiro/datas e guarda do token
```

## Estado

**Bloco 1 (feito)** — contas com login, contas bancárias/carteiras, categorias,
lançamento de gasto e entrada, extrato, resumo por período (7d/30d/3m/6m) e
tempo de trabalho.

**Metas (feito)** — potes com nome e emoji, guardar e resgatar, e quanto já foi
guardado traduzido em tempo.

**Atalho do iPhone (feito)** — dois toques nas costas do celular registram o
gasto sem abrir o app. Ver a seção abaixo.

**Mesada (feito)** — quem não trabalha pelo dinheiro pode dizer isso, e o app
inteiro troca de língua. Ver a seção abaixo.

**Simplificação (feita, 20/08/2026)** — o app tinha crescido pra fora: tema como
"skin" com editor próprio, hub de navegação, tela de Pix, gamificação com
nível/XP/sequência, teclado numérico com calculadora, comemoração em tela cheia.
Tudo isso saiu. O que ficou está descrito neste README, e o porquê está na seção
[Um tema é uma paleta](#um-tema-é-uma-paleta).

**Deploy preparado** — `Dockerfile`, Postgres e configuração de produção
prontos. Falta só escolher onde hospedar: ver `backend/DEPLOY.md`.

**A fazer** — cartão de crédito e recorrentes · publicar o backend de fato.

## Decisões que valem lembrar

- **Dinheiro é `int` de centavos**, do banco até a tela. Formatação só na borda
  (`src/lib/format.ts`).
- **Saldo é sempre derivado**, nunca guardado — ver `backend/README.md`.
- **`useTheme()` é o único acesso ao tema.** Nenhuma tela importa uma cor
  direto, pra que trocar de paleta não precise tocar em tela nenhuma.
- **O "+" da barra de abas não é uma aba**, é a ação principal do app.
- **`saved_cents` de uma meta é derivado** dos depósitos, pelo mesmo motivo do
  saldo. A exceção é `done_at`, que é o *instante* em que a meta bateu —
  resgatar depois não apaga a conquista.
- **`just_completed` vem do servidor.** Só ele distingue "bateu agora" de "já
  estava batida", e é essa diferença que dispara a comemoração.
- **O endereço do backend é deduzido, não configurado** (acima).
- **`npm test` roda a lógica pura de `src/lib` e `src/theme`** (vitest, sem
  jsdom). O que é visual continua sendo verificado abrindo o app.
- **`APP_PRODUCTION=true` recusa subir sem `APP_JWT_SECRET_KEY`.** Um segredo
  padrão que funciona é um segredo que vai esquecido pra produção.
- **A URL do banco é normalizada** (`normalized_database_url`): provedores
  entregam `postgres://`, que escolheria o driver síncrono e quebraria o app.

## Navegação

Quatro abas e o "+": **carteira · extrato · [+] · metas · você**.

"Você" é o perfil, e é de lá que saem os três destinos que não são do dia a dia:
contas, aparência e o Atalho do iPhone. Houve uma versão com um hub separado
(`/navegar`) pra essas telas, com a aba "você" ocupada por nível e sequência —
mas era uma tela a mais no caminho de tudo, e a gamificação não era o app.
Três botões no fim do perfil dizem a mesma coisa sem tela intermediária.

## Um tema é uma paleta

Onze cores e a amostra da lista. Só isso — `src/theme/tokens.ts`.

Houve uma versão em que o tema também decidia forma, densidade e o desenho do
cartão, do botão, do ícone, do fundo e da decoração, mais três fontes
escolhíveis, com um editor de 564 linhas por cima. A intenção era boa (oito
packs que parecem apps diferentes, não o mesmo app repintado) e o custo foi
alto: cada tela virou um `switch` em cima de um eixo de personalidade, e eram
oito desenhos pra manter e testar em vez de um.

Hoje o desenho do app é um só, escrito uma vez, e o que muda entre temas é a
cor. Raio (`RADIUS`) e fontes (`FONTS`) são constantes no mesmo arquivo.

Os oito packs vivem em `backend/app/models/theme.py` e `src/theme/tokens.ts`, e
os dois **precisam estar idênticos** — `backend/tests/test_catalogo_de_temas.py`
lê o arquivo TypeScript e compara, pra que divergir quebre um teste em vez de
quebrar o app de alguém.

⚠️ **`sync_presets` apaga preset que saiu do catálogo.** Mexer em
`FACTORY_THEMES` é destrutivo pros presets de todas as contas (temas criados
pela pessoa nunca são tocados). Já apagou os packs de uma conta uma vez.

Quem tiver tema próprio salvo da época do editor continua com ele na lista: o
`tokens_json` antigo tem campos que não existem mais, e tanto o Pydantic quanto
o `resolveTheme` os descartam em silêncio. Não houve migração de dados.

## Movimento

Três peças, em `src/components/ui/motion.tsx`: o saldo contando de zero
(`useCountUp`), a barra preenchendo (`Fill`) e a gaveta subindo (`Rise`).

Todas carregam informação — mostram *de onde o número veio* e *quanto a barra
andou*. As de ambiente (orbe flutuando, pulso, shimmer, o "+" quicando, confete)
saíram junto com os eixos de personalidade do tema: eram atmosfera, e atmosfera
não paga o custo de manter.

Nenhuma pergunta nada ao tema. A única chave que desliga é o "Reduzir movimento"
do aparelho, que é escolha da pessoa e não de design.

Toda peça renderiza o **estado final** quando não pode animar: animação
interrompida no meio nunca deixa a tela num estado errado.

## O campo de valor

`src/components/ui/money-input.tsx` — a pessoa digita só números e os centavos
preenchem da direita pra esquerda: 5 vira R$ 0,05, 500 vira R$ 5,00. É como todo
app de banco faz, e é o que evita a briga com a vírgula no meio da digitação.

O `TextInput` de verdade cobre o bloco inteiro com texto transparente e sem
cursor; quem aparece é o número grande formatado embaixo. Ele precisa ter área
de verdade — um campo escondido em altura zero não recebe toque com confiança.

Houve um teclado numérico desenhado à mão, com calculadora (`src/lib/calc.ts`):
somava duas compras num lançamento só e rachava a conta. Era bom e era caro —
143 linhas de teclado, 21 de teste da calculadora, e o teclado do sistema faz o
essencial de graça, com acessibilidade junto. Se a conta voltar a fazer falta, o
lugar dela é aqui.

⚠️ Onde o campo aparece dentro de gaveta (`Sheet`, `nova-transacao`), a gaveta
precisa de `KeyboardAvoidingView` — sem isso o teclado do sistema cobre
justamente o botão de confirmar.

## O Atalho do iPhone

Dois toques nas costas do celular → "Qual o valor?" → categoria → pronto. O app
não é aberto.

O Atalho não faz login: ele usa um **token próprio** (`users.shortcut_token`),
que só consegue criar lançamento — nunca ler saldo, nunca apagar nada. Ele vive
dentro de um Atalho no aparelho, à vista de quem pegar o celular, e por isso o
escopo mínimo é o ponto: perder o celular não pode ser perder o extrato. Gerar
um novo invalida o anterior na hora; revogar mata imediatamente.

O escopo é garantido pela *estrutura*, não pela memória de quem escreve o
próximo endpoint: `get_shortcut_user` é uma dependência separada de
`get_current_user`, e só as rotas de `/shortcut` dependem dela. Token de login
não passa lá, token de Atalho não passa aqui.

A tela `/atalho` entrega o endereço, o token e o passo a passo — o iPhone não
deixa um app criar Atalho sozinho, então o máximo que dá é tirar da frente tudo
que a pessoa teria que adivinhar.

⚠️ O endereço é o da máquina na rede local: hoje o Atalho só funciona no mesmo
Wi-Fi. Pra usar na rua, o backend precisa estar publicado — ver
`backend/DEPLOY.md`, que já está pronto e só espera a escolha do provedor.

## De onde vem o seu dinheiro

O app traduz todo gasto em tempo. Só que **nem todo mundo troca tempo por
dinheiro**: dizer "2 horas de trabalho" pra quem recebe mesada é mentira. Então
o usuário tem um `income_mode`:

- **`work`** — informa quanto vale a hora. "R$ 240 = 1 dia de trabalho".
- **`allowance`** — informa a mesada e o período. "R$ 60 = 6 dias de mesada".

Quem faz a conta é `backend/app/services/timecost.py`, e ele devolve a **frase
pronta** no campo `label`. Isso é o ponto: antes cada tela escrevia
"de trabalho" na mão, e trocar de modo teria exigido caçar quatro telas. Hoje
nenhuma tela sabe qual é o modo — ela mostra o `label` e pronto.

No modo mesada a unidade muda com a ordem de grandeza, porque é assim que a
pessoa pensa sobre o próprio dinheiro: um lanche é "3% da mesada", uma compra é
"6 dias de mesada", uma viagem é "3,1 mesadas".

`previewTimeCost` em `src/lib/format.ts` é a cópia da mesma conta no app, pro
botão de salvar acompanhar cada tecla sem ida à rede. Os dois lados têm testes
travando os mesmos casos, que é o que impede a cópia de divergir.

## Mover dinheiro de verdade — o que faltaria

Houve uma tela de Pix que **registrava** o lançamento e dizia na própria tela
que não movia dinheiro. Ela saiu na simplificação: era uma tela inteira pra
fazer o que o "+" já faz. O levantamento continua aqui porque o caminho não
mudou — só a tela.

**Receber por Pix** é o passo mais perto. Um PSP (Efí, Asaas, Mercado Pago,
Celcoin, Starkbank) emite QR Code dinâmico por API e avisa por webhook quando
alguém paga. Todos têm sandbox gratuito: dá pra construir o fluxo inteiro hoje,
com dinheiro de mentira e exatamente o mesmo código de produção. Ligar em
produção exige CNPJ e conta no PSP.

**Enviar por Pix** usa a mesma API, com burocracia maior (limites, aprovação
de saída, às vezes certificado mTLS). Vale fazer depois de receber funcionar.

**Aproximar o celular na maquininha** não é acessível: pagar por aproximação
exige o cartão estar num wallet (Apple Pay / Google Pay), e isso exige ser
emissor de cartão. O que dá pra fazer é NFC entre dois celulares (HCE, só no
Android) ou QR Code — que funciona em todo aparelho e resolve o mesmo caso:
aproximar de alguém pra cobrar ou pagar.

**Guardar rendendo CDI** exige ser conta de pagamento com investimento, via
BaaS (Celcoin, Dock, Swap). É o mais pesado dos três. O caminho intermediário
honesto é o Open Finance por leitura (Pluggy, Belvo): o app passa a ver saldo e
extrato reais das contas da pessoa, sem custodiar dinheiro nenhum. Os potes
continuam sendo o controle — o dinheiro fica onde já está.

Ordem sugerida: Open Finance (leitura) → receber Pix em sandbox → receber Pix
em produção → enviar Pix → cobrança por QR entre celulares.
