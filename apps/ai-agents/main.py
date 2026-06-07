from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.logger import logger
from routers import draft, compliance, risk, embeddings, fix, send, style


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ai_agents_starting", env=settings.ENV, model=settings.DEFAULT_MODEL)
    yield
    logger.info("ai_agents_shutting_down")


app = FastAPI(
    title="AI Compliance Sentinel — Agents",
    description="10-agent email generation, compliance, and deliverability pipeline for BridgingTech",
    version="1.0.0",
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url="/redoc" if settings.ENV != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000", "http://api:4000"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)

app.include_router(draft.router, prefix="/agents/draft", tags=["Draft"])
app.include_router(compliance.router, prefix="/agents/compliance", tags=["Compliance"])
app.include_router(risk.router, prefix="/agents/risk", tags=["Risk"])
app.include_router(embeddings.router, prefix="/embeddings", tags=["Embeddings"])
app.include_router(fix.router, prefix="/agents/fix", tags=["Fix"])
app.include_router(send.router, prefix="/agents/send", tags=["Send"])
app.include_router(style.router, prefix="/agents/style", tags=["Style"])


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "ok",
        "env": settings.ENV,
        "model": settings.DEFAULT_MODEL,
        "kafka_enabled": settings.KAFKA_ENABLED,
    }
