"""Agent 5 — Compliance Validation: checks email against product-specific regulations."""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat


def _html_to_text(html: str) -> str:
    """Reduce a branded HTML email to its visible text for compliance analysis.

    The branded template carries heavy inline CSS and the CAN-SPAM/GDPR footer
    (unsubscribe link, physical address, opt-in disclosure) lives at the very end
    of a ~6KB document. Evaluating raw HTML with a length cap silently truncates
    that footer, so the model keeps reporting the footer as "missing". Stripping
    to visible text keeps the whole email (footer included) in far fewer tokens.
    Anchor targets are surfaced as "label (url)" so real links can be verified.
    """
    if not html:
        return ""
    text = re.sub(r"<(head|style|script)[^>]*>.*?</\1>", " ", html,
                  flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(
        r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>',
        lambda m: f"{re.sub('<[^>]+>', '', m.group(2)).strip()} ({m.group(1)})",
        text, flags=re.DOTALL | re.IGNORECASE,
    )
    text = re.sub(r"<[^>]+>", " ", text)
    text = (text.replace("&nbsp;", " ").replace("&middot;", "·")
                .replace("&amp;", "&").replace("&zwnj;", "").replace("&copy;", "©"))
    return re.sub(r"\s+", " ", text).strip()


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

        # Evaluate the FULL email as visible text — raw-HTML truncation used to cut
        # off the footer (unsubscribe link, address, opt-in disclosure) and cause
        # false CAN-SPAM/GDPR violations that no fix could ever clear.
        body_text = _html_to_text(body_html)

        prompt = f"""Product: {product_slug}
Applicable regulations: {', '.join(regulations) if regulations else 'CAN-SPAM, GDPR'}
Forbidden phrases: {forbidden_phrases}
Required footers: {required_footers}

Email Subject: {subject}

Email Body (visible text, links shown as "label (url)"):
{body_text[:6000]}"""

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
