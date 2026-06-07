"""Agent 9 — Event Tracking: aggregates email engagement events."""
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from core.logger import logger


class TrackingAgent(BaseAgent):
    name = "tracking_agent"
    description = "Aggregates and logs email engagement events (opens, clicks, bounces)"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        email_id = ctx.get("email_id", "unknown")
        events: list[dict] = ctx.get("events") or []

        summary = {
            "opens": sum(1 for e in events if e.get("type") == "open"),
            "clicks": sum(1 for e in events if e.get("type") == "click"),
            "bounces": sum(1 for e in events if e.get("type") == "bounce"),
            "unsubscribes": sum(1 for e in events if e.get("type") == "unsubscribe"),
            "spam_complaints": sum(1 for e in events if e.get("type") == "spam_complaint"),
            "total_events": len(events),
        }

        logger.info("tracking_summary", email_id=email_id, **summary)

        return AgentOutput(data={"email_id": email_id, "summary": summary})
