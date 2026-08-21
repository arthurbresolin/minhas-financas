import secrets
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/media/ — arquivos enviados pelo usuário (avatar), fora do controle de
# versão.
MEDIA_DIR = Path(__file__).resolve().parent.parent.parent / "media"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_")

    # SQLite em desenvolvimento; em produção, a URL do Postgres do provedor.
    # Ver `normalized_database_url` — a forma como eles entregam essa URL não é
    # a que o SQLAlchemy async entende.
    database_url: str = "sqlite+aiosqlite:///./minhas_financas.db"

    # Vazio de propósito. Um segredo padrão que funcione é um segredo que vai
    # pra produção esquecido, e aí qualquer pessoa forja o token de qualquer
    # usuário. Sem `APP_JWT_SECRET_KEY`, o app gera um por processo: em dev
    # isso só desloga a cada reinício, e em produção o `production` abaixo
    # recusa subir.
    jwt_secret_key: str = ""

    # Ligue em produção. Ele não muda o comportamento do app — ele *recusa*
    # subir com configuração de desenvolvimento.
    production: bool = False

    # As origens que podem chamar a API. `*` só serve com o backend na sua
    # própria máquina.
    cors_origins: str = "*"

    @property
    def normalized_database_url(self) -> str:
        """Ajusta a URL do banco pro driver async.

        Provedores (Railway, Render, Fly, Heroku) entregam a URL como
        `postgres://` ou `postgresql://`, que o SQLAlchemy resolve pro driver
        *síncrono* — e aí a aplicação inteira, que é async, quebra na primeira
        consulta. Trocar isso na mão a cada deploy é o tipo de detalhe que se
        esquece exatamente uma vez.
        """
        url = self.database_url
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql://", 1)
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def cors_origin_list(self) -> list[str]:
        return [origem.strip() for origem in self.cors_origins.split(",") if origem.strip()]

    def resolve_secret(self) -> str:
        """O segredo do JWT, exigido em produção e improvisado em dev."""
        if self.jwt_secret_key:
            return self.jwt_secret_key
        if self.production:
            raise RuntimeError(
                "APP_JWT_SECRET_KEY é obrigatório em produção. "
                "Gere um com: python -c \"import secrets; print(secrets.token_urlsafe(48))\""
            )
        # Em dev, um segredo por processo: reiniciar desloga, e é só isso.
        return secrets.token_urlsafe(48)


settings = Settings()
# Resolvido uma vez, na subida: um segredo diferente a cada chamada invalidaria
# todo token no ato de conferi-lo.
JWT_SECRET = settings.resolve_secret()
