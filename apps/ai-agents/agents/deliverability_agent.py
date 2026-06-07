"""Agent 6 — Deliverability Scoring: predicts inbox placement using heuristics + LLM."""
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.deliverability_checker import score_deliverability


class DeliverabilityAgent(BaseAgent):
    name = "deliverability_agent"
    description = "Scores email deliverability and predicts inbox placement"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        subject = ctx.get("subject", "")
        body_html = ctx.get("body_html", "")

        report = score_deliverability(subject, body_html)

        return AgentOutput(
            data=report,
            warnings=report.get("warnings", []),
        )
