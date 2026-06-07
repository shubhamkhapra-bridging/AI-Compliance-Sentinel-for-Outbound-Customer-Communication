"""Agent — Web Knowledge: fetches and caches product website content for compliance context."""
import asyncio
import json
import re
import uuid

import httpx
from qdrant_client import AsyncQdrantClient
from qdrant_client.models import Distance, PointStruct, VectorParams
import litellm

from agents.base import BaseAgent
from core.config import settings
from core.logger import logger
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat

COLLECTION = "product_knowledge"
VECTOR_SIZE = 1536

_qdrant = AsyncQdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY or None)


def _point_id(product_id: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"product-knowledge:{product_id}"))


async def _ensure_collection() -> None:
    collections = await _qdrant.get_collections()
    names = [c.name for c in collections.collections]
    if COLLECTION not in names:
        await _qdrant.create_collection(
            collection_name=COLLECTION,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )


async def _embed(text: str) -> list[float]:
    response = await litellm.aembedding(
        model="text-embedding-3-small",
        input=[text],
        api_key=settings.OPENAI_API_KEY or None,
    )
    return response.data[0]["embedding"]


async def _fetch_page(client: httpx.AsyncClient, url: str) -> str:
    try:
        resp = await client.get(url, timeout=8.0, follow_redirects=True)
        if resp.status_code == 200:
            text = re.sub(r"<[^>]+>", " ", resp.text)
            text = re.sub(r"\s+", " ", text).strip()
            return f"[{url}]\n{text[:3000]}"
    except Exception:
        pass
    return ""


_EXTRACT_SYSTEM = """You are a compliance data extractor for an email marketing platform.
Given scraped text from a company's website, extract structured knowledge for email compliance.

Respond ONLY with valid JSON:
{
  "brand_voice": "description of tone and style",
  "unsubscribe_method": "exact method or URL pattern for opting out",
  "contact_info": {"email": "...", "phone": "...", "address": "..."},
  "regulations": ["CAN-SPAM", "GDPR", ...],
  "required_footers": ["company address footer text", "unsubscribe text", ...],
  "forbidden_practices": ["do not use threatening language", ...],
  "mailing_practices": "description of official email communication policy"
}"""


class WebKnowledgeAgent(BaseAgent):
    name = "web_knowledge_agent"
    description = "Fetches and caches product website knowledge for compliance-aware email editing"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        product_id: str = ctx.get("product_id", "")
        product_slug: str = ctx.get("product_slug", "unknown")
        website_url: str | None = ctx.get("website_url")

        # Check Qdrant cache first
        try:
            await _ensure_collection()
            existing = await _qdrant.retrieve(
                collection_name=COLLECTION,
                ids=[_point_id(product_id)],
                with_payload=True,
            )
            if existing and existing[0].payload:
                knowledge = existing[0].payload.get("knowledge", {})
                logger.info("web_knowledge_cache_hit", product=product_slug)
                return AgentOutput(data={"knowledge": knowledge, "source": "cache"}, usage={})
        except Exception as exc:
            logger.warning("web_knowledge_cache_error", error=str(exc))

        if not website_url:
            return AgentOutput(data={"knowledge": {}, "source": "none"}, usage={})

        # Live fetch — all pages in parallel
        base = website_url.rstrip("/")
        urls_to_check = [
            base,
            f"{base}/privacy",
            f"{base}/privacy-policy",
            f"{base}/unsubscribe",
            f"{base}/legal",
            f"{base}/terms",
            f"{base}/contact",
        ]

        logger.info("web_knowledge_fetch_start", product=product_slug, url=base)
        headers = {"User-Agent": "Mozilla/5.0 (compatible; ComplianceSentinel/1.0)"}
        async with httpx.AsyncClient(headers=headers) as client:
            results = await asyncio.gather(
                *[_fetch_page(client, u) for u in urls_to_check],
                return_exceptions=True,
            )

        page_texts = [r for r in results if isinstance(r, str) and r.strip()]
        combined = "\n\n".join(page_texts)[:8000]

        if not combined.strip():
            return AgentOutput(data={"knowledge": {}, "source": "none"}, usage={})

        raw, usage = await chat(
            system=_EXTRACT_SYSTEM,
            messages=[{"role": "user", "content": f"Website content:\n{combined}"}],
            agent_type=self.name,
            max_tokens=1024,
        )

        try:
            knowledge = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            knowledge = json.loads(match.group()) if match else {}

        # Embed and store in Qdrant for future use
        try:
            vector = await _embed(json.dumps(knowledge))
            await _qdrant.upsert(
                collection_name=COLLECTION,
                points=[PointStruct(
                    id=_point_id(product_id),
                    vector=vector,
                    payload={
                        "product_id": product_id,
                        "product_slug": product_slug,
                        "website_url": website_url,
                        "knowledge": knowledge,
                    },
                )],
            )
            logger.info("web_knowledge_stored", product=product_slug)
        except Exception as exc:
            logger.warning("web_knowledge_store_error", error=str(exc))

        return AgentOutput(data={"knowledge": knowledge, "source": "live"}, usage=usage)
