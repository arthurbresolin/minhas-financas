from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.accounts import router as accounts_router
from app.api.auth import router as auth_router
from app.api.categories import router as categories_router
from app.api.goals import router as goals_router
from app.api.recurring import router as recurring_router
from app.api.shortcut import router as shortcut_router
from app.api.summary import router as summary_router
from app.api.themes import router as themes_router
from app.api.transactions import router as transactions_router
from app.core.config import MEDIA_DIR, settings

app = FastAPI(title="Minhas Finanças API")

MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# Em desenvolvimento a origem é liberada: o Expo troca de porta entre web,
# túnel e aparelho, e reconfigurar a cada vez só gera atrito. Em produção a
# lista vem de APP_CORS_ORIGINS — sem cookies nem credenciais em jogo, o CORS
# aqui é higiene, não a fronteira de segurança (essa é o token).
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts_router)
app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(goals_router)
app.include_router(recurring_router)
app.include_router(shortcut_router)
app.include_router(summary_router)
app.include_router(themes_router)
app.include_router(transactions_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
