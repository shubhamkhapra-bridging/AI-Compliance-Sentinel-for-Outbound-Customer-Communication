"""Agent 5 — Compliance Validation: checks email against product-specific regulations."""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat


_SYSTEM = """You are a compliance officer AI for BridgingTech.
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
5. Threatening or abusive language (FDCPA violation)

Respond ONLY with a JSON object:
{
  "passed": true|false,
  "risk_score": 0-100,
  "requires_approval": true|false,
  "violations": [
    {"rule": "...", "severity": "low|medium|high", "description": "...", "suggestion": "..."}
  ],
  "recommendations": ["..."]
}"""


class ComplianceAgent(BaseAgent):
    name = "compliance_agent"
    description = "Validates email content against FDCPA, HIPAA, GDPR, CAN-SPAM and brand rules"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        subject = ctx.get("subject", "")
        body_html = ctx.get("body_html", "")
        product_slug = ctx.get("product_slug", "unknown")
        regulations = ctx.get("regulations") or []
        forbidden_phrases = ctx.get("forbidden_phrases") or []
        required_footers = ctx.get("required_footers") or []

        prompt = f"""Product: {product_slug}
Applicable regulations: {', '.join(regulations) if regulations else 'CAN-SPAM, GDPR'}
Forbidden phrases: {forbidden_phrases}
Required footers: {required_footers}

Email Subject: {subject}

Email Body (HTML):
{body_html[:3000]}"""

        raw, usage = await chat(
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            agent_type=self.name,
            max_tokens=1024,
        )

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            parsed = json.loads(match.group()) if match else {}

        return AgentOutput(
            data={
                "passed": parsed.get("passed", False),
                "risk_score": parsed.get("risk_score", 50),
                "requires_approval": parsed.get("requires_approval", True),
                "violations": parsed.get("violations", []),
                "recommendations": parsed.get("recommendations", []),
            },
            usage=usage,
        )
