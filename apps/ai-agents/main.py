from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from core.logger import logger
from routers import draft, compliance, risk, embeddings


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("AI Agents service starting", env=settings.ENV)
    yield
    logger.info("AI Agents service shutting down")


app = FastAPI(
    title="AI Compliance Sentinel — Agents",
    version="1.0.0",
    docs_url="/docs" if settings.ENV != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(draft.router, prefix="/agents/draft", tags=["Draft Agent"])
app.include_router(compliance.router, prefix="/agents/compliance", tags=["Compliance Agent"])
app.include_router(risk.router, prefix="/agents/risk", tags=["Risk Agent"])
app.include_router(embeddings.router, prefix="/embeddings", tags=["Embeddings"])


@app.get("/health")
def health():
    return {"status": "ok"}
