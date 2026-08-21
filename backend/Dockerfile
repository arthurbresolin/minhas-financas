# Imagem do backend. Multi-estágio pra que o resultado não carregue o uv nem o
# cache de build — a imagem final tem só o Python, as dependências e o código.
FROM ghcr.io/astral-sh/uv:python3.13-bookworm-slim AS build

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# As dependências entram antes do código de propósito: elas mudam raramente, e
# assim cada deploy reaproveita esta camada em vez de reinstalar tudo.
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev

COPY . .
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev


FROM python:3.13-slim-bookworm

WORKDIR /app
COPY --from=build /app /app
ENV PATH="/app/.venv/bin:$PATH" PYTHONUNBUFFERED=1

# Usuário sem privilégio: se alguém escapar do processo, escapa pra um usuário
# que não pode escrever no sistema de arquivos da imagem.
RUN useradd --create-home --uid 1000 app && chown -R app:app /app
USER app

EXPOSE 8000

# As migrações rodam na subida, não num passo separado do deploy: um passo
# separado é um passo que se esquece, e aí a aplicação sobe contra um banco com
# o esquema velho.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
