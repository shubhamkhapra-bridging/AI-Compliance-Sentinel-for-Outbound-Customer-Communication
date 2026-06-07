"""Risk Assessment Agent — scores email risk and determines approval routing."""
import json
from dataclasses import dataclass
from core.llm import chat


SYSTEM_PROMPT = """You are a risk assessment AI for BridgingTech's email platform.
Score the risk of an outbound email based on:
- Recipient count (bulk vs 1-to-1)
- Product type (healthcare/financial = higher risk)
- Content sensitivity (payment, debt, personal info)
- Sending frequency to this contact
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
}
"""


@dataclass
class RiskRequest:
    product_slug: str
    recipient_count: int
    subject: str
    body_preview: str
    contact_email_history: dict | None = None
    compliance_violations: list[dict] | None = None


@dataclass
class RiskResult:
    risk_score: int
    risk_tier: str
    rules_triggered: list[str]
    requires_approval: bool
    routing: str
    reasoning: str
    usage: dict


async def assess_risk(req: RiskRequest) -> RiskResult:
    prompt = f"""
Product: {req.product_slug}
Recipients: {req.recipient_count}
Subject: {req.subject}
Body preview: {req.body_preview[:500]}
Contact history: {req.contact_email_history or 'No history'}
Compliance violations: {req.compliance_violations or 'None'}
"""

    raw, usage = await chat(
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
        agent_type="risk_agent",
        max_tokens=512,
    )

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}

    return RiskResult(
        risk_score=parsed.get("risk_score", 50),
        risk_tier=parsed.get("risk_tier", "medium"),
        rules_triggered=parsed.get("rules_triggered", []),
        requires_approval=parsed.get("requires_approval", True),
        routing=parsed.get("routing", "peer_review"),
        reasoning=parsed.get("reasoning", ""),
        usage=usage,
    )
