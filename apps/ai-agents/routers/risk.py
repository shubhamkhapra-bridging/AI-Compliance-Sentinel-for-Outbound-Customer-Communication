from fastapi import APIRouter, Depends
from pydantic import BaseModel
from agents.risk_agent import RiskRequest, assess_risk
from core.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])


class RiskPayload(BaseModel):
    emailId: str
    productSlug: str
    recipientCount: int = 1
    subject: str
    bodyPreview: str
    contactHistory: dict | None = None
    complianceViolations: list[dict] = []


@router.post("")
async def run_risk_assessment(payload: RiskPayload):
    result = await assess_risk(
        RiskRequest(
            product_slug=payload.productSlug,
            recipient_count=payload.recipientCount,
            subject=payload.subject,
            body_preview=payload.bodyPreview,
            contact_email_history=payload.contactHistory,
            compliance_violations=payload.complianceViolations,
        )
    )
    return {
        "emailId": payload.emailId,
        "riskScore": result.risk_score,
        "riskTier": result.risk_tier,
        "rulesTriggered": result.rules_triggered,
        "requiresApproval": result.requires_approval,
        "routing": result.routing,
        "reasoning": result.reasoning,
        "usage": result.usage,
    }
