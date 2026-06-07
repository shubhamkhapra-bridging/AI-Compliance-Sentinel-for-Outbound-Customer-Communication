"""Agent — Fix Draft: resolves compliance violations while preserving the branded template.

Two modes:
  • run()       — fixes the STRUCTURED CONTENT (headline, paragraphs, links) so the
                  orchestrator/router can re-render the same branded template. Branding intact.
  • fix_html()  — fallback for emails with no recipe: patches the HTML directly while
                  explicitly preserving all inline CSS and layout.
"""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat


def _knowledge_block(knowledge: dict) -> str:
    if not knowledge:
        return ""
    return f"""
Product Website Knowledge (use these exact values for accurate fixes):
  • Unsubscribe method: {knowledge.get('unsubscribe_method', 'Not available')}
  • Contact info: {json.dumps(knowledge.get('contact_info', {}))}
  • Required footers: {knowledge.get('required_footers', [])}
  • Regulations: {knowledge.get('regulations', [])}
  • Mailing practices: {knowledge.get('mailing_practices', 'Standard')}
  • Forbidden practices: {knowledge.get('forbidden_practices', [])}
"""


def _violations_text(violations: list[dict]) -> str:
    return "\n".join(
        f"  • [{v.get('severity', '').upper()}] {v.get('rule', '')}: "
        f"{v.get('description', '')} → Fix: {v.get('suggestion', '')}"
        for v in violations
    ) or "  (none)"


def _parse_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        return json.loads(match.group()) if match else {}


_CONTENT_SYSTEM = """You are a compliance-aware email editor for BridgingTech.
You receive the STRUCTURED CONTENT of an email (not HTML) plus a list of compliance
violations and knowledge from the product's official website.

Fix EVERY violation by editing the content fields only:
- Remove forbidden phrases, threatening/abusive language, and misleading claims
- Use the exact unsubscribe URL and company address from the website knowledge
- Keep the original intent, tone, and value of the message
- Keep the copy concise and professional

Respond ONLY with valid JSON (omit any field you are not changing):
{
  "subject": "...",
  "headline": "...",
  "body_paragraphs": ["...", "..."],
  "cta_text": "...",
  "cta_url": "...",
  "unsubscribe_url": "...",
  "company_address": "...",
  "changes": ["Specific change 1", "Specific change 2"]
}"""


_HTML_SYSTEM = """You are a compliance-aware HTML email editor for BridgingTech.
You receive a full HTML email with compliance violations and product website knowledge.
Fix EVERY violation but you MUST preserve the visual design exactly:
- Keep ALL inline CSS, colors, fonts, table layout, and structure unchanged
- Only change wording and links needed to fix violations
- Use the exact unsubscribe URL / address from the website knowledge

Respond ONLY with valid JSON:
{ "subject": "...", "body_html": "<full html, styling intact>", "body_text": "...", "changes": ["..."] }"""


class FixDraftAgent(BaseAgent):
    name = "fix_draft_agent"
    description = "Resolves compliance violations while preserving the branded email template"

    async def run(self, input: AgentInput) -> AgentOutput:
        """Fix structured content fields — branding is preserved by re-rendering."""
        ctx = input.context
        content: dict = ctx.get("content", {})
        violations: list[dict] = ctx.get("violations", [])
        knowledge: dict = ctx.get("product_knowledge", {})
        product_slug: str = ctx.get("product_slug", "unknown")

        current = {
            "subject":         content.get("subject", ""),
            "headline":        content.get("headline", ""),
            "body_paragraphs": content.get("body_paragraphs", []),
            "cta_text":        content.get("cta_text", ""),
            "cta_url":         content.get("cta_url", ""),
            "unsubscribe_url": content.get("unsubscribe_url", ""),
            "company_address": content.get("company_address", ""),
        }

        prompt = f"""Product: {product_slug}
{_knowledge_block(knowledge)}
Violations to fix:
{_violations_text(violations)}

Current email content (JSON):
{json.dumps(current, indent=2)}

Return the corrected fields needed to fix all violations."""

        raw, usage = await chat(
            system=_CONTENT_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            agent_type=self.name,
            max_tokens=1500,
        )
        parsed = _parse_json(raw)

        # Only keep recognised content fields that were actually returned
        fixed: dict = {}
        for key in ("subject", "headline", "body_paragraphs", "cta_text", "cta_url",
                    "unsubscribe_url", "company_address"):
            if parsed.get(key):
                fixed[key] = parsed[key]

        return AgentOutput(
            data={"fixed_content": fixed, "changes": parsed.get("changes", [])},
            usage=usage,
        )

    async def fix_html(
        self, *, subject: str, body_html: str, body_text: str,
        violations: list[dict], knowledge: dict, product_slug: str,
    ) -> AgentOutput:
        """Fallback — patch raw HTML directly while preserving all styling."""
        prompt = f"""Product: {product_slug}
{_knowledge_block(knowledge)}
Violations to fix:
{_violations_text(violations)}

Current draft:
Subject: {subject}

Body (HTML) — PRESERVE ALL STYLING:
{body_html}

Body (Text):
{body_text[:1000]}"""

        raw, usage = await chat(
            system=_HTML_SYSTEM,
            messages=[{"role": "user", "content": prompt}],
            agent_type=self.name,
            max_tokens=4096,
        )
        parsed = _parse_json(raw)

        return AgentOutput(
            data={
                "subject":   parsed.get("subject", subject),
                "body_html": parsed.get("body_html", body_html),
                "body_text": parsed.get("body_text", body_text),
                "changes":   parsed.get("changes", []),
            },
            usage=usage,
        )
