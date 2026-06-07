"""Agent 4 — Template Selection: ranks available templates for a given intent."""
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from core.logger import logger


_EMAIL_TYPE_MAP = {
    "payment_reminder": ["payment", "billing", "invoice"],
    "follow_up": ["followup", "follow_up", "check_in"],
    "introduction": ["intro", "welcome", "onboarding"],
    "promotional": ["promo", "offer", "marketing"],
    "compliance_notice": ["compliance", "legal", "notice"],
    "support": ["support", "help", "ticket"],
}


class TemplateAgent(BaseAgent):
    name = "template_agent"
    description = "Ranks pre-loaded templates by relevance to the detected intent"

    async def run(self, input: AgentInput) -> AgentOutput:
        templates: list[dict] = input.context.get("available_templates") or []
        intent = input.context.get("intent", {})
        email_type = intent.get("email_type", "") if isinstance(intent, dict) else ""

        if not templates:
            logger.info("template_agent_no_templates")
            return AgentOutput(data={"ranked_template_ids": [], "selected_template": None})

        keywords = _EMAIL_TYPE_MAP.get(email_type, [])

        def _score(t: dict) -> int:
            name = (t.get("name") or "").lower()
            tags = [x.lower() for x in (t.get("tags") or [])]
            score = t.get("open_rate", 0) * 100
            for kw in keywords:
                if kw in name or kw in tags:
                    score += 50
            return int(score)

        ranked = sorted(templates, key=_score, reverse=True)
        ranked_ids = [t["id"] for t in ranked if "id" in t]

        return AgentOutput(
            data={
                "ranked_template_ids": ranked_ids,
                "selected_template": ranked[0] if ranked else None,
            }
        )
