"""Agent 7 — Content Optimization: rewrites email to improve deliverability and readability."""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat


_SYSTEM = """You are an email optimization specialist for BridgingTech.
Improve the provided email to achieve:
- Flesch-Kincaid reading grade 8-10 (clear and accessible)
- Remove spam trigger words from subject and body
- Strengthen the call-to-action
- Fix passive voice
- Maintain brand voice and compliance requirements

Respond ONLY with JSON:
{
  "subject": "...",
  "body_html": "...",
  "body_text": "...",
  "changes": ["list of specific changes made"]
}"""


class OptimizationAgent(BaseAgent):
    name = "optimization_agent"
    description = "Optimizes email content for deliverability and readability"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        deliverability_score = ctx.get("deliverability_score", 100)
        warnings = ctx.get("deliverability_warnings", [])

        if deliverability_score >= 75:
            return AgentOutput(
                data={
                    "subject": ctx.get("subject", ""),
                    "body_html": ctx.get("body_html", ""),
                    "body_text": ctx.get("body_text", ""),
                    "changes": [],
                    "optimized": False,
                },
                warnings=[],
            )

        prompt = f"""Current deliverability score: {deliverability_score}/100
Issues detected: {warnings}

Subject: {ctx.get('subject', '')}

Body HTML:
{ctx.get('body_html', '')[:3000]}"""

        raw, usage = await chat(
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            agent_type=self.name,
        )

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            parsed = json.loads(match.group()) if match else {}

        return AgentOutput(
            data={
                "subject": parsed.get("subject", ctx.get("subject", "")),
                "body_html": parsed.get("body_html", ctx.get("body_html", "")),
                "body_text": parsed.get("body_text", ctx.get("body_text", "")),
                "changes": parsed.get("changes", []),
                "optimized": True,
            },
            usage=usage,
        )
