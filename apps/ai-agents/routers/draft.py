from fastapi import APIRouter, Depends
from pydantic import BaseModel
from agents.draft_agent import DraftRequest, generate_draft
from core.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])


class DraftPayload(BaseModel):
    conversationId: str
    userMessage: str
    productId: str
    productSlug: str = "unknown"
    brandVoice: dict = {}
    contact: dict | None = None
    previousDrafts: list[dict] = []
    complianceRules: list[str] = []


@router.post("")
async def create_draft(payload: DraftPayload):
    result = await generate_draft(
        DraftRequest(
            user_message=payload.userMessage,
            product_slug=payload.productSlug,
            brand_voice=payload.brandVoice,
            contact=payload.contact,
            previous_drafts=payload.previousDrafts,
            compliance_rules=payload.complianceRules,
        )
    )
    return {
        "conversationId": payload.conversationId,
        "subject": result.subject,
        "bodyHtml": result.body_html,
        "bodyText": result.body_text,
        "usage": result.usage,
    }
