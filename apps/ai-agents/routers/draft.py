from fastapi import APIRouter, Depends
from pydantic import BaseModel
from orchestrator.agent_orchestrator import DraftPipeline
from core.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])

_pipeline = DraftPipeline()


class DraftPayload(BaseModel):
    conversationId: str
    userMessage: str
    productId: str
    productSlug: str = "unknown"
    brandVoice: dict = {}
    contact: dict | None = None
    emailHistory: dict | None = None
    previousDrafts: list[dict] = []
    complianceRules: list[str] = []
    regulations: list[str] = []
    forbiddenPhrases: list[str] = []
    requiredFooters: list[str] = []


@router.post("")
async def create_draft(payload: DraftPayload):
    result = await _pipeline.run(payload.model_dump())
    return {
        "conversationId": payload.conversationId,
        "subject": result["subject"],
        "bodyHtml": result["body_html"],
        "bodyText": result["body_text"],
        "complianceReport": result["compliance_report"],
        "deliverabilityReport": result["deliverability_report"],
        "intent": result["intent"],
        "usage": result["usage"],
        "warnings": result["warnings"],
    }
