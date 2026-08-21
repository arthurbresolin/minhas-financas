import pytest

from app.core.config import Settings


def _com(**kwargs) -> Settings:
    # `_env_file=None` isola do .env da máquina: senão o teste passa aqui e
    # falha no CI, ou o contrário.
    return Settings(_env_file=None, **kwargs)


# ---------------------------------------------------------------------------
# A URL do banco
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "entregue",
    [
        # É assim que Railway, Render, Fly e Heroku entregam a URL.
        "postgres://user:senha@host:5432/banco",
        "postgresql://user:senha@host:5432/banco",
    ],
)
def test_url_de_postgres_vira_driver_async(entregue: str):
    # Sem isto o SQLAlchemy escolhe o driver *síncrono* e a aplicação inteira,
    # que é async, quebra na primeira consulta — em produção, não aqui.
    url = _com(database_url=entregue).normalized_database_url

    assert url.startswith("postgresql+asyncpg://")
    assert "user:senha@host:5432/banco" in url


def test_url_ja_async_fica_como_esta():
    entregue = "postgresql+asyncpg://user:senha@host/banco"
    assert _com(database_url=entregue).normalized_database_url == entregue


def test_sqlite_de_desenvolvimento_nao_e_mexido():
    entregue = "sqlite+aiosqlite:///./minhas_financas.db"
    assert _com(database_url=entregue).normalized_database_url == entregue


# ---------------------------------------------------------------------------
# O segredo do JWT
# ---------------------------------------------------------------------------


def test_producao_sem_segredo_recusa_subir():
    # O jeito clássico de vazar tudo é um segredo padrão que funciona e vai
    # esquecido pra produção — aí qualquer pessoa forja o token de qualquer
    # usuário. Melhor a aplicação não subir.
    with pytest.raises(RuntimeError, match="APP_JWT_SECRET_KEY"):
        _com(production=True, jwt_secret_key="").resolve_secret()


def test_producao_com_segredo_usa_o_segredo():
    assert _com(production=True, jwt_secret_key="abc123").resolve_secret() == "abc123"


def test_desenvolvimento_sem_segredo_improvisa_um():
    segredo = _com(production=False, jwt_secret_key="").resolve_secret()

    # Improvisado, mas não fraco: em dev o efeito colateral é só deslogar a
    # cada reinício do servidor.
    assert len(segredo) >= 32
    assert segredo != _com(production=False, jwt_secret_key="").resolve_secret()


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------


def test_origens_viram_lista():
    settings = _com(cors_origins="https://app.exemplo.com, https://outro.com")
    assert settings.cors_origin_list == ["https://app.exemplo.com", "https://outro.com"]


def test_origem_curinga_continua_valendo_em_dev():
    assert _com(cors_origins="*").cors_origin_list == ["*"]


def test_espacos_e_virgulas_soltas_nao_viram_origem_vazia():
    # Uma origem vazia na lista casa com tudo em algumas implementações — é o
    # tipo de erro de digitação que abre o CORS sem ninguém notar.
    assert _com(cors_origins="https://a.com,, ,https://b.com").cors_origin_list == [
        "https://a.com",
        "https://b.com",
    ]
