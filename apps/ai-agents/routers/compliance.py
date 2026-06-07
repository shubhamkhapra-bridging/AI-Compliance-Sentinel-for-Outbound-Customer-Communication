from fastapi import APIRouter, Depends
from pydantic import BaseModel
from agents.compliance_agent import ComplianceRequest, check_compliance
from core.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])


class CompliancePayload(BaseModel):
    draftId: str
    productId: str
    productSlug: str = "unknown"
    subject: str
    bodyHtml: str
    regulations: list[str] = []
    forbiddenPhrases: list[str] = []
    requiredFooters: list[str] = []


@router.post("")
async def run_compliance(payload: CompliancePayload):
    result = await check_compliance(
        ComplianceRequest(
            subject=payload.subject,
            body_html=payload.bodyHtml,
            product_slug=payload.productSlug,
            regulations=payload.regulations,
            forbidden_phrases=payload.forbiddenPhrases,
            required_footers=payload.requiredFooters,
        )
    )
    return {
        "draftId": payload.draftId,
        "passed": result.passed,
        "riskScore": result.risk_score,
        "requiresApproval": result.requires_approval,
        "violations": result.violations,
        "recommendations": result.recommendations,
        "usage": result.usage,
    }
