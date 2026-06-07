"""Draft Generation Agent — turns user intent into a brand-compliant email draft."""
from dataclasses import dataclass
from core.llm import chat


SYSTEM_PROMPT = """You are an expert email copywriter for BridgingTech.
Your job is to write outbound customer emails that are:
- On-brand for the specified product (use the brand voice provided)
- Compliant with all relevant regulations (FDCPA, HIPAA, GDPR as applicable)
- Clear, professional, and concise
- Personalised with contact details when provided

Always respond with a JSON object:
{
  "subject": "...",
  "body_html": "...",
  "body_text": "..."
}
Do NOT include any other text outside the JSON.
"""


@dataclass
class DraftRequest:
    user_message: str
    product_slug: str
    brand_voice: dict
    contact: dict | None = None
    previous_drafts: list[dict] | None = None
    compliance_rules: list[str] | None = None


@dataclass
class DraftResult:
    subject: str
    body_html: str
    body_text: str
    usage: dict


async def generate_draft(req: DraftRequest) -> DraftResult:
    context_parts = [
        f"Product: {req.product_slug}",
        f"Brand voice: {req.brand_voice}",
    ]
    if req.contact:
        context_parts.append(f"Recipient: {req.contact}")
    if req.compliance_rules:
        context_parts.append(f"Compliance rules to follow: {req.compliance_rules}")

    messages = []
    if req.previous_drafts:
        for d in req.previous_drafts[-3:]:  # last 3 drafts for context
            messages.append({"role": "assistant", "content": str(d)})

    messages.append({
        "role": "user",
        "content": f"{chr(10).join(context_parts)}\n\nRequest: {req.user_message}",
    })

    import json
    raw, usage = await chat(
        system=SYSTEM_PROMPT,
        messages=messages,
        agent_type="draft_agent",
    )

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        # Fallback: extract JSON block if model wraps it
        import re
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        parsed = json.loads(match.group()) if match else {}

    return DraftResult(
        subject=parsed.get("subject", ""),
        body_html=parsed.get("body_html", ""),
        body_text=parsed.get("body_text", ""),
        usage=usage,
    )
