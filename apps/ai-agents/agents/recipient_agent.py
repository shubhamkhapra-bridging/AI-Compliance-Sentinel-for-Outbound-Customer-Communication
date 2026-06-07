"""Agent 2 — Recipient Intelligence: builds a recipient profile from contact data."""
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from core.logger import logger


class RecipientAgent(BaseAgent):
    name = "recipient_agent"
    description = "Builds a structured recipient profile from pre-loaded contact data"

    async def run(self, input: AgentInput) -> AgentOutput:
        contact = input.context.get("contact") or {}
        history = input.context.get("email_history") or {}

        if not contact:
            logger.info("recipient_agent_no_contact")
            return AgentOutput(
                data={"profile": {}, "preferences": {}, "risk_factors": []},
                warnings=["No contact data provided — draft will be generic"],
            )

        risk_factors: list[str] = []
        if history.get("bounce_count", 0) > 2:
            risk_factors.append("High bounce history — verify email address")
        if history.get("unsubscribed"):
            risk_factors.append("Contact previously unsubscribed — do not send marketing emails")
        if history.get("complaint_count", 0) > 0:
            risk_factors.append("Spam complaint on record — proceed with caution")

        profile = {
            "name": contact.get("name", ""),
            "email": contact.get("email", ""),
            "language": contact.get("language", "en"),
            "timezone": contact.get("timezone", "UTC"),
            "segment": contact.get("segment", ""),
            "custom_fields": contact.get("custom_fields", {}),
        }

        preferences = {
            "preferred_send_time": history.get("preferred_send_time", ""),
            "avg_open_rate": history.get("avg_open_rate", 0),
            "last_interaction": history.get("last_interaction", ""),
        }

        return AgentOutput(
            data={"profile": profile, "preferences": preferences, "risk_factors": risk_factors},
            warnings=risk_factors,
        )
