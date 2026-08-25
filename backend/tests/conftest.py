import os
import uuid

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.db.session import get_db
from app.main import app

# Por padrão os testes rodam em SQLite na memória: é instantâneo e não precisa
# de nada instalado.
#
# Só que produção é **Postgres**, e nem todo SQL vale nos dois. Um `func.iif()`
# (que só o SQLite tem) passou por 172 testes verdes e derrubou a tela inicial
# com 500 no primeiro deploy. Por isso a suíte inteira também sabe rodar contra
# Postgres, e é assim que se faz:
#
#     docker run -d --name pg-teste -p 5433:5432 \
#       -e POSTGRES_PASSWORD=teste -e POSTGRES_USER=teste -e POSTGRES_DB=teste \
#       postgres:16-alpine
#
#     TEST_DATABASE_URL=postgresql+asyncpg://teste:teste@localhost:5433/teste \
#       uv run pytest
#
# Vale rodar assim antes de qualquer deploy, e sempre que mexer numa consulta.
TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL")


@pytest_asyncio.fixture
async def session_factory():
    if TEST_DATABASE_URL:
        # Cada teste ganha um schema só dele: os testes rodam em sequência mas
        # compartilham o mesmo banco, e tabela de um vazando pro outro daria
        # falha fantasma difícil de ler.
        schema = f"t{uuid.uuid4().hex[:12]}"
        engine = create_async_engine(
            TEST_DATABASE_URL,
            connect_args={"server_settings": {"search_path": schema}},
        )
        async with engine.begin() as conn:
            await conn.exec_driver_sql(f'CREATE SCHEMA "{schema}"')
            await conn.run_sync(Base.metadata.create_all)

        yield async_sessionmaker(engine, expire_on_commit=False)

        async with engine.begin() as conn:
            await conn.exec_driver_sql(f'DROP SCHEMA "{schema}" CASCADE')
        await engine.dispose()
        return

    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield async_sessionmaker(engine, expire_on_commit=False)

    await engine.dispose()


@pytest_asyncio.fixture
async def client(session_factory):
    async def override_get_db():
        async with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


async def register(client: AsyncClient, email: str, password: str = "senha1234") -> dict[str, str]:
    """Cria uma conta e devolve o header de Authorization dela."""
    response = await client.post("/auth/register", json={"email": email, "password": password})
    assert response.status_code == 201, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest_asyncio.fixture
async def auth(client):
    return await register(client, "eu@example.com")


@pytest_asyncio.fixture
async def other_auth(client):
    """Uma segunda conta, pra provar que uma não enxerga a outra."""
    return await register(client, "outro@example.com")
