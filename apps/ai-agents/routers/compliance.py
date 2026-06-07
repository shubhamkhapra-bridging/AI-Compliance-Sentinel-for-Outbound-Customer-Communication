from fastapi import APIRouter, Depends
from pydantic import BaseModel
from agents.compliance_agent import ComplianceAgent
from models.agent_models import AgentInput
from core.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])

_agent = ComplianceAgent()


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
    out = await _agent.run(AgentInput(context={
        "subject": payload.subject,
        "body_html": payload.bodyHtml,
        "product_slug": payload.productSlug,
        "regulations": payload.regulations,
        "forbidden_phrases": payload.forbiddenPhrases,
        "required_footers": payload.requiredFooters,
    }))

    return {
        "draftId": payload.draftId,
        "passed": out.data.get("passed", False),
        "riskScore": out.data.get("risk_score", 50),
        "requiresApproval": out.data.get("requires_approval", True),
        "violations": out.data.get("violations", []),
        "recommendations": out.data.get("recommendations", []),
        "usage": out.usage,
    }
