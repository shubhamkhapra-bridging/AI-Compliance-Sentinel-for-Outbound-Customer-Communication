"""Risk assessment router — scores email risk and determines approval routing."""
import json
import re
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from models.agent_models import AgentInput, AgentOutput
from agents.base import BaseAgent
from tools.llm_client import chat
from core.security import verify_api_key
from core.logger import logger

router = APIRouter(dependencies=[Depends(verify_api_key)])


_SYSTEM = """You are a risk assessment AI for BridgingTech's email platform.
Score the risk of an outbound email based on:
- Recipient count (bulk vs 1-to-1)
- Product type (healthcare/financial = higher risk)
- Content sensitivity (payment, debt, personal info)
- Compliance violations detected

Risk tiers:
- LOW (0-30): Auto-send approved
- MEDIUM (31-60): Peer review recommended
- HIGH (61-100): Manager approval required

Respond ONLY with JSON:
{
  "risk_score": 0-100,
  "risk_tier": "low|medium|high",
  "rules_triggered": ["..."],
  "requires_approval": true|false,
  "routing": "auto_send|peer_review|manager_approval",
  "reasoning": "..."
}"""


class _RiskAgent(BaseAgent):
    name = "risk_agent"
    description = "Scores email risk and determines approval routing"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        prompt = f"""Product: {ctx.get('product_slug', 'unknown')}
Recipients: {ctx.get('recipient_count', 1)}
Subject: {ctx.get('subject', '')}
Body preview: {ctx.get('body_preview', '')[:500]}
Contact history: {ctx.get('contact_history') or 'No history'}
Compliance violations: {ctx.get('compliance_violations') or 'None'}"""

        raw, usage = await chat(
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            agent_type=self.name,
            max_tokens=512,
        )
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            parsed = json.loads(match.group()) if match else {}

        return AgentOutput(
            data={
                "risk_score": parsed.get("risk_score", 50),
                "risk_tier": parsed.get("risk_tier", "medium"),
                "rules_triggered": parsed.get("rules_triggered", []),
                "requires_approval": parsed.get("requires_approval", True),
                "routing": parsed.get("routing", "peer_review"),
                "reasoning": parsed.get("reasoning", ""),
            },
            usage=usage,
        )


_agent = _RiskAgent()


class RiskPayload(BaseModel):
    emailId: str
    productSlug: str = "unknown"
    recipientCount: int = 1
    subject: str
    bodyPreview: str = ""
    contactHistory: dict | None = None
    complianceViolations: list[dict] = []


@router.post("")
async def run_risk_assessment(payload: RiskPayload):
    # Fast-path: bulk sends above 100 are always HIGH risk without an LLM call
    if payload.recipientCount > 100:
        logger.info("risk_fast_path_bulk", count=payload.recipientCount)
        return {
            "emailId": payload.emailId,
            "riskScore": 75,
            "riskTier": "high",
            "rulesTriggered": ["bulk_send_threshold"],
            "requiresApproval": True,
            "routing": "manager_approval",
            "reasoning": f"Bulk send to {payload.recipientCount} recipients requires manager approval",
            "usage": {},
        }

    out = await _agent.run(AgentInput(context={
        "product_slug": payload.productSlug,
        "recipient_count": payload.recipientCount,
        "subject": payload.subject,
        "body_preview": payload.bodyPreview,
        "contact_history": payload.contactHistory,
        "compliance_violations": payload.complianceViolations,
    }))

    return {
        "emailId": payload.emailId,
        "riskScore": out.data.get("risk_score", 50),
        "riskTier": out.data.get("risk_tier", "medium"),
        "rulesTriggered": out.data.get("rules_triggered", []),
        "requiresApproval": out.data.get("requires_approval", True),
        "routing": out.data.get("routing", "peer_review"),
        "reasoning": out.data.get("reasoning", ""),
        "usage": out.usage,
    }
