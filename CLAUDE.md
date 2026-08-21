# minhas-financas

## Como falar comigo

- Responda em português.
- Frases curtas. Sem tabela e sem textão.
- Uma ação por mensagem: faça uma coisa, mostre o resultado, espere.
- Ao escrever código, explique em seguida o que cada pedaço faz, em português simples.

## Regras do projeto

- Nunca commite `.env` nem chaves de API.
- Antes de criar um arquivo novo, procure se já existe algo parecido.
- Siga o estilo do código que já está aqui (nomes, aspas, indentação), não o seu preferido.
- Não instale dependência nova sem me avisar antes.
- Não faça `git push` sem eu pedir.

## Comandos

```bash
npm install                                   # dependências do app
npx expo start                                # app (Expo Go, mesmo Wi-Fi)
npm test                                      # testes do app (vitest)
npx tsc --noEmit                              # typecheck
npx expo export --platform android            # bundla de verdade; pega erro de import

cd backend
uv sync                                       # dependências do backend
uv run alembic upgrade head                   # migrações
uv run fastapi dev app/main.py --port 8001    # backend
uv run pytest                                 # testes do backend
```

Antes de dizer que acabou: `npm test`, `uv run pytest` e `npx tsc --noEmit`.

## Stack

App em Expo/React Native (SDK 54, expo-router) e backend em FastAPI +
SQLAlchemy async + Alembic. As dependências reais estão no `package.json` e no
`backend/pyproject.toml` — consulte antes de sugerir biblioteca nova.

Detalhes de arquitetura e as decisões que valem lembrar estão no `README.md`.
