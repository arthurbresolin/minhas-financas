from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# backend/media/ — arquivos enviados pelo usuário (avatar), fora do controle de
# versão. Caminho fixo, já que o backend roda sempre localmente.
MEDIA_DIR = Path(__file__).resolve().parent.parent.parent / "media"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="APP_")

    database_url: str = "sqlite+aiosqlite:///./minhas_financas.db"
    # Valor fixo serve em dev; em uso real precisa vir de APP_JWT_SECRET_KEY.
    jwt_secret_key: str = "dev-secret-troque-em-producao-0123456789"


settings = Settings()
