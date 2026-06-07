"""Agent 1 — Intent Understanding: extracts structured intent and style overrides from a user message."""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat


_SYSTEM = """You are an intent extraction engine for an email platform.
Given a user's request, extract the email intent AND any styling preferences mentioned.

Color instructions examples: "use blue #1E40AF", "green header", "make it red", "#FF5733 button".

Respond ONLY with valid JSON:
{
  "intent": "follow_up | introduction | payment_reminder | compliance_notice | promotional | support",
  "goal": "one sentence describing the desired outcome",
  "tone": "professional | friendly | urgent | formal",
  "email_type": "transactional | marketing | compliance | support",
  "entities": {
    "contact_name": null,
    "product": null,
    "amount": null,
    "deadline": null
  },
  "style_overrides": {
    "primary_color": "#hexcode or null",
    "button_color": "#hexcode or null",
    "notes": "any other style instructions"
  }
}"""


class IntentAgent(BaseAgent):
    name = "intent_agent"
    description = "Extracts intent, tone, entities, and style overrides from a user message"

    async def run(self, input: AgentInput) -> AgentOutput:
        user_message = input.context.get("user_message", "")
        product_slug = input.context.get("product_slug", "unknown")

        raw, usage = await chat(
            system=_SYSTEM,
            messages=[{"role": "user", "content": f"Product: {product_slug}\nRequest: {user_message}"}],
            agent_type=self.name,
            max_tokens=512,
        )

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            parsed = json.loads(match.group()) if match else {}

        return AgentOutput(data=parsed, usage=usage)
