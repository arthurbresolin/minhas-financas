from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.accounts import router as accounts_router
from app.api.auth import router as auth_router
from app.api.categories import router as categories_router
from app.api.summary import router as summary_router
from app.api.themes import router as themes_router
from app.api.transactions import router as transactions_router
from app.core.config import MEDIA_DIR

app = FastAPI(title="Minhas Finanças API")

MEDIA_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# Roda localmente, sem cookies nem credenciais — liberar origem evita
# reconfigurar a cada porta que o Expo (web/túnel/aparelho) resolver usar.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts_router)
app.include_router(auth_router)
app.include_router(categories_router)
app.include_router(summary_router)
app.include_router(themes_router)
app.include_router(transactions_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
