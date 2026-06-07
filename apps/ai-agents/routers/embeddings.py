from fastapi import APIRouter, Depends
from pydantic import BaseModel
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import anthropic
from core.config import settings
from core.security import verify_api_key
import uuid

router = APIRouter(dependencies=[Depends(verify_api_key)])

_qdrant = AsyncQdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)
_anthropic = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

COLLECTION = "email_templates"
VECTOR_DIM = 1536


async def embed(text: str) -> list[float]:
    # Use OpenAI text-embedding-3-small via LiteLLM for cost efficiency
    import litellm
    response = await litellm.aembedding(model="text-embedding-3-small", input=[text])
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
    vector = await embed(payload.text)
    await _qdrant.upsert(
        collection_name=COLLECTION,
        points=[PointStruct(id=payload.id, vector=vector, payload=payload.metadata)],
    )
    return {"indexed": payload.id}


@router.post("/search")
async def search_similar(payload: SearchPayload):
    vector = await embed(payload.query)
    filter_cond = None
    if payload.productId:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
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
