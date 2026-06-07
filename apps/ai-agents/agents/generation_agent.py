"""Agent 3 — Email Generation: produces brand-compliant email drafts using LLM."""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat


_SYSTEM = """You are an expert email copywriter for BridgingTech.
Write outbound customer emails that are:
- On-brand for the specified product (use the brand voice provided)
- Compliant with applicable regulations (FDCPA, HIPAA, GDPR, CAN-SPAM)
- Clear, professional, and concise
- Personalised with contact details when provided
- Always include an unsubscribe link placeholder: {{unsubscribe_url}}

Respond ONLY with JSON:
{
  "subject": "...",
  "body_html": "...",
  "body_text": "..."
}"""


class GenerationAgent(BaseAgent):
    name = "generation_agent"
    description = "Generates a complete email draft from intent + recipient context"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        parts = [
            f"Product: {ctx.get('product_slug', 'unknown')}",
            f"Brand voice: {ctx.get('brand_voice', {})}",
        ]
        if ctx.get("recipient_profile"):
            parts.append(f"Recipient: {ctx['recipient_profile']}")
        if ctx.get("intent"):
            parts.append(f"Intent analysis: {ctx['intent']}")
        if ctx.get("compliance_rules"):
            parts.append(f"Compliance rules: {ctx['compliance_rules']}")

        messages: list[dict] = []
        for prev in (ctx.get("previous_drafts") or [])[-3:]:
            messages.append({"role": "assistant", "content": str(prev)})
        messages.append({
            "role": "user",
            "content": f"{chr(10).join(parts)}\n\nRequest: {ctx.get('user_message', '')}",
        })

        raw, usage = await chat(
            system=_SYSTEM,
            messages=messages,
            agent_type=self.name,
        )

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            parsed = json.loads(match.group()) if match else {}

        return AgentOutput(
            data={
                "subject": parsed.get("subject", ""),
                "body_html": parsed.get("body_html", ""),
                "body_text": parsed.get("body_text", ""),
            },
            usage=usage,
        )
