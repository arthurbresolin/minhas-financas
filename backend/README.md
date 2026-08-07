# Backend — Minhas Finanças

FastAPI + SQLAlchemy async + Alembic + SQLite.

## Rodar

```bash
uv run alembic upgrade head          # aplica as migrações
uv run fastapi dev app/main.py --port 8000
```

Docs interativas em http://localhost:8000/docs

## Testes

```bash
uv run pytest -q
```

## Configuração

Variáveis em `backend/.env`, todas com prefixo `APP_`:

| Variável | Padrão | Para quê |
|---|---|---|
| `APP_DATABASE_URL` | `sqlite+aiosqlite:///./minhas_financas.db` | Banco |
| `APP_JWT_SECRET_KEY` | valor de dev | Assinatura do token. **Troque antes de expor a API.** |

## Decisões que valem lembrar

- **Dinheiro é `int` de centavos.** Nunca float — `0.1 + 0.2` não é `0.3`, e num
  app de dinheiro isso aparece como centavo faltando no extrato.
- **Saldo é derivado**, nunca guardado: `opening_balance_cents` + soma das
  transações com sinal (`app/services/balance.py`). Some a classe inteira de bug
  de saldo dessincronizado quando alguém edita ou apaga uma transação.
- **Transferência são duas linhas** (`transfer_out` + `transfer_in`) com o mesmo
  `transfer_group_id`. Mexem no saldo das contas, mas não entram como receita
  nem despesa em nenhum resumo.
- **Todo endpoint filtra por `user_id`** vindo do token (`app/api/deps.py`). Não
  existe listagem global. `tests/test_isolamento.py` existe pra provar isso a
  cada mudança.
