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
src/app/          telas (expo-router): (auth), (tabs), nova-transacao, contas
src/components/   kit de UI próprio + barra de abas flutuante
src/theme/        tokens do tema e useTheme()
src/lib/          formatação de dinheiro/datas e guarda do token
```

## Estado

**Bloco 1 (feito)** — contas com login, contas bancárias/carteiras, categorias,
lançamento de gasto e entrada, extrato, resumo por período (7d/30d/3m/6m) e
tempo de trabalho.

**A fazer** — Bloco 2: editor de temas · Bloco 3: Atalho do iOS pra lançar sem
abrir o app · Bloco 4: cartão de crédito e recorrentes · Bloco 5: metas e
gráficos. O plano completo está em `~/.claude/plans/recursive-dancing-dongarra.md`.

## Decisões que valem lembrar

- **Dinheiro é `int` de centavos**, do banco até a tela. Formatação só na borda
  (`src/lib/format.ts`).
- **Saldo é sempre derivado**, nunca guardado — ver `backend/README.md`.
- **`useTheme()` é o único acesso ao tema.** Nenhuma tela importa as cores
  direto, pra que o editor do Bloco 2 não precise tocar em nenhuma delas.
- **O "+" da barra de abas não é uma aba**, é a ação principal do app.
