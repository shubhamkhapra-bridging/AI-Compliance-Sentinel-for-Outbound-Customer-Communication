"""Agent 10 — Continuous Learning: runs on a cron schedule to update performance models.

This agent is NOT in the hot path. It should be triggered by a scheduler (Celery beat / cron).
"""
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from core.logger import logger


class LearningAgent(BaseAgent):
    name = "learning_agent"
    description = "Analyses historical performance data to surface improvement recommendations (cron-only)"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        performance_data: dict = ctx.get("performance_data") or {}

        if not performance_data:
            logger.info("learning_agent_no_data")
            return AgentOutput(data={"insights": [], "recommendations": []})

        open_rate = performance_data.get("avg_open_rate", 0)
        click_rate = performance_data.get("avg_click_rate", 0)
        bounce_rate = performance_data.get("avg_bounce_rate", 0)

        insights: list[str] = []
        recommendations: list[str] = []

        if open_rate < 0.20:
            insights.append(f"Low open rate ({open_rate:.1%}) — subject lines may need improvement")
            recommendations.append("A/B test subject lines with /optimize-email --focus subject")
        if click_rate < 0.02:
            insights.append(f"Low click rate ({click_rate:.1%}) — CTA may be weak")
            recommendations.append("Strengthen call-to-action and reduce competing links")
        if bounce_rate > 0.05:
            insights.append(f"High bounce rate ({bounce_rate:.1%}) — list hygiene needed")
            recommendations.append("Run list verification and remove stale contacts")

        logger.info(
            "learning_agent_complete",
            insights_count=len(insights),
            recommendations_count=len(recommendations),
        )

        return AgentOutput(
            data={"insights": insights, "recommendations": recommendations},
        )
