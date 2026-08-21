# Minhas Finanças

App de finanças pessoais com conta própria, backend e sincronização entre
aparelhos. Substitui o protótipo `~/controle-mesada`, que era HTML solto com
dados presos no `localStorage` de um navegador só.

A ideia central: **registrar tem que ser instantâneo** (é o atrito que mata todo
app de finanças) e **dinheiro é tempo** — o app mostra cada gasto também em horas
e dias do seu trabalho.

## Rodar

Dois processos, em terminais separados:

```bash
# 1. backend
cd backend
uv run alembic upgrade head
uv run fastapi dev app/main.py --port 8001

# 2. app
npx expo start                    # celular via Expo Go
npx expo start --web              # navegador
```

A URL da API vem de `EXPO_PUBLIC_API_URL` no `.env` (veja `.env.example`). Ela é
lida na hora de montar o bundle — **mudou o `.env`, reinicie o Expo**, senão o
app continua chamando o endereço antigo.

Pra abrir no celular, `localhost` não serve: precisa de `npx expo start --tunnel`
e de um túnel público apontando pro backend.

## Estrutura

```
backend/          FastAPI + SQLAlchemy async + Alembic + SQLite  (ver backend/README.md)
src/api/          client HTTP e tipos da API
src/app/          telas (expo-router): (auth), (tabs), pix, meta, meta-batida,
                  nova-transacao, atalho, navegar, perfil
src/components/   kit de UI próprio + barra de abas flutuante
src/theme/        tokens do tema e useTheme()
src/lib/          formatação de dinheiro/datas e guarda do token
```

## Estado

**Bloco 1 (feito)** — contas com login, contas bancárias/carteiras, categorias,
lançamento de gasto e entrada, extrato, resumo por período (7d/30d/3m/6m) e
tempo de trabalho.

**Bloco 2 (feito)** — editor de temas e temas como "skins".

**Desenho novo (feito)** — a partir do canvas do Claude Design: Home compacta
com profundidade e movimento, metas (potes) com guardar/resgatar, tela de meta
batida, aba "você" com nível/XP/sequência, Pix e lançamento em gaveta.

**Atalho do iPhone (feito)** — dois toques nas costas do celular registram o
gasto sem abrir o app. Ver a seção abaixo.

**Mesada (feito)** — quem não trabalha pelo dinheiro pode dizer isso, e o app
inteiro troca de língua. Ver a seção abaixo.

**Hub "navegar" (feito)** — o menu de tudo que não é aba: peles, contas,
Atalho, Pix, perfil. Chega pelo "navegar →" da aba você.

**Deploy preparado** — `Dockerfile`, Postgres e configuração de produção
prontos. Falta só escolher onde hospedar: ver `backend/DEPLOY.md`.

**A fazer** — cartão de crédito e recorrentes · publicar o backend de fato.

## Decisões que valem lembrar

- **Dinheiro é `int` de centavos**, do banco até a tela. Formatação só na borda
  (`src/lib/format.ts`).
- **Saldo é sempre derivado**, nunca guardado — ver `backend/README.md`.
- **`useTheme()` é o único acesso ao tema.** Nenhuma tela importa as cores
  direto, pra que o editor do Bloco 2 não precise tocar em nenhuma delas.
- **O "+" da barra de abas não é uma aba**, é a ação principal do app.
- **`saved_cents` de uma meta é derivado** dos depósitos, pelo mesmo motivo do
  saldo. A exceção é `done_at`, que é o *instante* em que a meta bateu —
  resgatar depois não apaga a conquista.
- **`just_completed` vem do servidor.** Só ele distingue "bateu agora" de "já
  estava batida", e é essa diferença que dispara a tela de comemoração.
- **XP é por cuidar do dinheiro, não por ter dinheiro.** Ver
  `backend/app/services/gamification.py`.
- **O endereço do backend é deduzido, não configurado.** `src/api/client.ts` usa
  o `hostUri` do Expo — trocar de Wi-Fi não exige editar nada. O `.env` só vale
  no `--tunnel` e com o backend em outra máquina.
- **`npm test` roda só a lógica pura de `src/lib`** (vitest, sem jsdom). O que é
  visual continua sendo verificado abrindo o app.
- **`APP_PRODUCTION=true` recusa subir sem `APP_JWT_SECRET_KEY`.** Um segredo
  padrão que funciona é um segredo que vai esquecido pra produção.
- **A URL do banco é normalizada** (`normalized_database_url`): provedores
  entregam `postgres://`, que escolheria o driver síncrono e quebraria o app.

## Navegação

Quatro abas e o "+": **carteira · extrato · [+] · metas · você** — os lugares
onde se passa o dia. Tudo o mais (peles, contas, Atalho, perfil) é coisa de uma
vez por mês e mora no hub `/navegar`, que abre pelo "navegar →" da aba você.

Disputar uma aba com uma tela de configuração empurraria pra fora algo que se
usa todo dia. Mas "uma vez por mês" não é "escondido": no hub essas telas são
quadrados grandes, não botões empilhados no fim de um formulário.

## Os packs de tema

Oito, em `backend/app/models/theme.py` e `src/theme/tokens.ts` — os dois
**precisam estar idênticos**, e são gerados da mesma fonte pra isso. Seis são os
packs originais do projeto (Padrão, NG preto & branco, Cyberpunk, Doce,
Streetwear, Gamer); dois vieram do canvas do Claude Design (Neón, Vaporwave).

Um pack não é uma paleta: ele carrega forma, densidade e o desenho do cartão, do
botão, do ícone e do fundo. É o que faz os oito serem apps diferentes em vez do
mesmo app repintado — e é justamente o que faltava nos originais, que nasceram
antes desses tokens existirem e por isso pareciam todos iguais.

⚠️ **`sync_presets` apaga preset que saiu do catálogo.** Mexer em
`FACTORY_THEMES` é destrutivo pros presets de todas as contas (temas criados
pela pessoa nunca são tocados). Já apagou os packs de uma conta uma vez.

## Movimento é tema — até onde

O movimento é dividido em dois, e só um deles é opcional:

- **Essencial** — saldo contando de zero, barra preenchendo, gaveta subindo, o
  "pop" de uma conquista. Isso mostra *de onde o número veio* e *quanto a barra
  andou*: é informação, não enfeite. Roda em todo tema, sempre.
- **Ambiente** — orbe flutuando, pulso, shimmer, o "+" quicando. É atmosfera, e
  quem decide é o `decorationStyle` (`loops` em `src/theme/motion.ts`).

A primeira versão deixava um tema desligar *tudo*, e o resultado foi um tema em
que nada se mexia — não ficou sóbrio, ficou morto. **Um tema pode ser quieto;
nenhum pode ser morto.** A única chave que desliga o essencial é o "Reduzir
movimento" do aparelho, que é escolha da pessoa e não de design.

Toda peça de movimento renderiza o **estado final** quando não pode animar:
animação interrompida no meio nunca deixa a tela num estado errado.

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

## O teclado com conta

`src/lib/calc.ts` — soma, subtração, multiplicação, divisão e porcentagem, tudo
em **centavos inteiros**, sem parênteses e sem precedência: lido da esquerda pra
direita, como quem faz de cabeça. Resolve os dois casos reais de quem vai lançar
um gasto — somar duas compras num lançamento só e rachar a conta.

Uma conta deixada pela metade ("38,90 +") vale o que já dá pra saber dela, não
zero: quem esquecer de apertar `=` não pode perder o gasto.

## Pix, aproximação e guardar dinheiro de verdade

Hoje a tela de Pix **registra** o lançamento no app — ela não move dinheiro, e
diz isso na própria tela. O que falta pra cada peça ser real:

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
