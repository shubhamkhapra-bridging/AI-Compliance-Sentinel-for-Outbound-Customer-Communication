"""Pre-send Email Validation agent.

Combines a deterministic heuristic layer (spam triggers, caps, links,
unsubscribe — reused from the deliverability checker) with an LLM layer that
detects harmful/toxic language, spammy phrasing, and general correctness, and
produces a corrected version of the email. Designed for the public, per-tenant
validation API where the caller supplies their own LLM key.
"""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.deliverability_checker import score_deliverability
from tools.llm_client import chat


_SYSTEM = """You are an email quality and safety reviewer.
Analyse the email and detect problems in three categories:
1. "harmful" — toxic, abusive, threatening, discriminatory, or otherwise harmful language.
2. "spam" — words/phrasing or structure that push the email into spam folders.
3. "correctness" — grammar, spelling, clarity, tone, or formatting problems.

Then rewrite the email to fix every problem while preserving the original intent.

Respond ONLY with a JSON object:
{
  "passed": true|false,
  "risk_score": 0-100,
  "issues": [
    {
      "type": "harmful|spam|correctness",
      "what": "short description of the problem",
      "why": "why it is a problem (e.g. spam risk, harm, unprofessional)",
      "how_to_fix": "concrete remediation step",
      "severity": "low|medium|high"
    }
  ],
  "corrected_subject": "the improved subject line",
  "corrected_body": "the improved email body"
}

Set "passed" to false if there is any high-severity issue."""


def _heuristic_issues(report: dict) -> list[dict]:
    """Map deliverability warnings into structured validation issues."""
    issues: list[dict] = []
    for warning in report.get("warnings", []):
        issues.append({
            "type": "spam",
            "what": warning,
            "why": "Increases the chance of landing in the spam folder.",
            "how_to_fix": "Adjust the wording/structure flagged above.",
            "severity": "medium",
        })
    return issues


class EmailValidationAgent(BaseAgent):
    name = "email_validation_agent"
    description = "Detects harmful words, spam triggers, and correctness issues before send and returns a corrected email"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        subject = ctx.get("subject", "")
        body = ctx.get("body") or ctx.get("body_html", "")
        llm_api_key = ctx.get("llm_api_key") or None
        model = ctx.get("model") or None

        # 1. Heuristic layer (deterministic, no LLM).
        delivery = score_deliverability(subject, body)
        heuristic_issues = _heuristic_issues(delivery)

        # 2. LLM layer (harmful/correctness + corrected email).
        prompt = f"""Email Subject: {subject}

Email Body:
{body[:4000]}"""

        raw, usage = await chat(
            system=_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            agent_type=self.name,
            model=model,
            max_tokens=2048,
            api_key_override=llm_api_key,
        )

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            parsed = json.loads(match.group()) if match else {}

        llm_issues = parsed.get("issues", []) or []
        issues = heuristic_issues + llm_issues

        # passed = no high-severity issue from either layer.
        has_high = any(i.get("severity") == "high" for i in issues)
        llm_passed = parsed.get("passed")
        passed = (llm_passed is not False) and not has_high

        risk_score = parsed.get("risk_score")
        if risk_score is None:
            # Fall back to the heuristic deliverability score (inverted).
            risk_score = 100 - int(delivery.get("score", 100))

        return AgentOutput(
            data={
                "passed": passed,
                "risk_score": risk_score,
                "issues": issues,
                "corrected_subject": parsed.get("corrected_subject", subject),
                "corrected_body": parsed.get("corrected_body", body),
                "inbox_prediction": delivery.get("inbox_prediction"),
            },
            usage=usage,
        )
