"""Compliance Agent — validates email content against product-specific regulatory rules."""
import json
from dataclasses import dataclass, field
from core.llm import chat


SYSTEM_PROMPT = """You are a compliance officer AI for BridgingTech.
Analyse the provided email content against the given compliance rules.

Rules may include:
- FDCPA (Fair Debt Collection Practices Act) for Recuvery
- HIPAA for FinanceMutual
- PCI-DSS for Denefits and Credee
- GDPR for EU contacts
- CAN-SPAM for all products

Check for:
1. Required footers / unsubscribe links
2. Forbidden phrases
3. Misleading claims
4. Required disclosures

Respond ONLY with a JSON object:
{
  "passed": true|false,
  "risk_score": 0-100,
  "requires_approval": true|false,
  "violations": [
    {"rule": "...", "severity": "low|medium|high", "description": "...", "suggestion": "..."}
  ],
  "recommendations": ["..."]
}
"""


@dataclass
class ComplianceRequest:
    subject: str
    body_html: str
    product_slug: str
    regulations: list[str]
    forbidden_phrases: list[str] = field(default_factory=list)
    required_footers: list[str] = field(default_factory=list)


@dataclass
class ComplianceResult:
    passed: bool
    risk_score: int
    requires_approval: bool
    violations: list[dict]
    recommendations: list[str]
    usage: dict


async def check_compliance(req: ComplianceRequest) -> ComplianceResult:
    prompt = f"""
Product: {req.product_slug}
Applicable regulations: {', '.join(req.regulations)}
Forbidden phrases: {req.forbidden_phrases}
Required footers: {req.required_footers}

Email Subject: {req.subject}

Email Body (HTML):
{req.body_html[:3000]}
"""

    raw, usage = await chat(
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": prompt}],
        agent_type="compliance_agent",
        max_tokens=1024,
    )

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}

    return ComplianceResult(
        passed=parsed.get("passed", False),
        risk_score=parsed.get("risk_score", 50),
        requires_approval=parsed.get("requires_approval", True),
        violations=parsed.get("violations", []),
        recommendations=parsed.get("recommendations", []),
        usage=usage,
    )
