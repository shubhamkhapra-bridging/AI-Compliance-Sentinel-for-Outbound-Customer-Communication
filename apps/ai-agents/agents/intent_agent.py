"""Agent 1 — Intent Understanding: extracts structured intent from a user message."""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat


_SYSTEM = """You are an intent extraction engine for an email platform.
Given a user's request, extract the email intent as structured JSON.

Respond ONLY with JSON:
{
  "intent": "follow_up | introduction | payment_reminder | compliance_notice | promotional | support",
  "goal": "one sentence describing the desired outcome",
  "tone": "professional | friendly | urgent | formal",
  "email_type": "transactional | marketing | compliance | support",
  "entities": {
    "contact_name": "...",
    "product": "...",
    "amount": null,
    "deadline": null
  }
}"""


class IntentAgent(BaseAgent):
    name = "intent_agent"
    description = "Extracts intent, goal, tone, and entities from a user message"

    async def run(self, input: AgentInput) -> AgentOutput:
        user_message = input.context.get("user_message", "")
        product_slug = input.context.get("product_slug", "unknown")

        prompt = f"Product: {product_slug}\nUser request: {user_message}"
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

        return AgentOutput(data=parsed, usage=usage)
