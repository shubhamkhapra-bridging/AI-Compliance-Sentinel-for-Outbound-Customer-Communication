"""Embeddings router — Qdrant-backed vector index and semantic search for email templates."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import PointStruct, Filter, FieldCondition, MatchValue
import litellm
from core.config import settings
from core.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])

_qdrant = AsyncQdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)
COLLECTION = "email_templates"


async def _embed(text: str) -> list[float]:
    response = await litellm.aembedding(
        model="text-embedding-3-small",
        input=[text],
        api_key=settings.OPENAI_API_KEY or None,
    )
    return response.data[0]["embedding"]


class IndexPayload(BaseModel):
    id: str
    text: str
    metadata: dict = {}


class SearchPayload(BaseModel):
    query: str
    productId: str | None = None
    limit: int = 5


@router.post("/index")
async def index_document(payload: IndexPayload):
    vector = await _embed(payload.text)
    await _qdrant.upsert(
        collection_name=COLLECTION,
        points=[PointStruct(id=payload.id, vector=vector, payload=payload.metadata)],
    )
    return {"indexed": payload.id}


@router.post("/search")
async def search_similar(payload: SearchPayload):
    vector = await _embed(payload.query)
    filter_cond = None
    if payload.productId:
        filter_cond = Filter(
            must=[FieldCondition(key="product_id", match=MatchValue(value=payload.productId))]
        )
    results = await _qdrant.search(
        collection_name=COLLECTION,
        query_vector=vector,
        limit=payload.limit,
        query_filter=filter_cond,
        with_payload=True,
    )
    return [{"id": r.id, "score": r.score, "metadata": r.payload} for r in results]
