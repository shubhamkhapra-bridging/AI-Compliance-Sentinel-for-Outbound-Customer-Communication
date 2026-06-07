"""Agent — Email Edit: turns a natural-language request into precise style AND content changes.

Handles, in chat, requests like:
  "make the header green"                          → style.primary_color
  "use #FF5733 for the button, bigger font"        → style.button_color + body_font_size
  "add this logo https://site.com/logo.svg"        → content.logo_url
  "remove the logo" / "remove the CTA button"      → content.logo_url="" / content.cta_text=""
  "change the headline to 'Welcome aboard'"        → content.headline
  "add a line about our 24/7 support"              → content.body_paragraphs (full new list)
  "set the button to 'Pay Now' linking to /pay"    → content.cta_text + cta_url

When the email has no re-render recipe (e.g. legacy draft), the router falls back
to edit_html(), which lets the LLM patch the HTML directly.
"""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat
from tools.email_template import DEFAULT_STYLE
from core.config import settings


_CONTENT_KEYS = [
    "logo_url", "headline", "body_paragraphs", "cta_text", "cta_url",
    "sender_name", "sender_title", "company_name", "company_address",
    "preheader", "unsubscribe_url", "privacy_url", "details",
]

_PARSE_SYSTEM = f"""You edit a marketing email based on the user's instruction.
You may change STYLE tokens and/or CONTENT fields. Return ONLY what the user asked to change.

STYLE token keys (colors as hex like "#1E40AF"; sizes as px strings like "30px"):
{json.dumps(list(DEFAULT_STYLE.keys()))}

CONTENT field keys:
- logo_url        : a full image URL (set to "" to REMOVE the logo)
- headline        : string
- body_paragraphs : array of strings (FULL replacement — include existing text plus any additions)
- cta_text        : button label (set to "" to REMOVE the button)
- cta_url         : button link
- sender_name, sender_title
- company_name, company_address
- preheader       : inbox preview text
- unsubscribe_url, privacy_url
- details         : array of {{"label": "...", "value": "..."}} rows (set to [] to remove)

Rules:
- Extract any URL, email, or quoted text EXACTLY from the instruction.
- Convert color names to hex (green→#16A34A, dark blue→#1E3A8A, red→#DC2626, purple→#7C3AED).
- For "bigger"/"smaller" adjust the current size value by ~2-3px.
- "header color" / "brand color" → style.primary_color (also set style.accent_color to match).
- "add a logo" with a URL → content.logo_url. "remove logo" → content.logo_url "".
- Only include keys the user actually wants changed. Leave everything else out.

Respond ONLY with JSON:
{{ "style": {{...}}, "content": {{...}}, "summary": "one short sentence describing the change" }}"""


_EDIT_SYSTEM = """You are an expert HTML email editor.
You receive a full HTML email and an instruction.
Apply the requested change (styling, adding/removing a logo or section, editing text or links).
Keep all inline CSS and table layout intact and the email valid.

Respond ONLY with the complete modified HTML document. No markdown fences, no commentary."""


def _parse_json(raw: str) -> dict:
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        return json.loads(match.group()) if match else {}


class StyleEditAgent(BaseAgent):
    name = "style_edit_agent"
    description = "Converts natural-language requests into precise style and content edits"

    async def run(self, input: AgentInput) -> AgentOutput:
        """Parse an instruction into style-token + content-field deltas."""
        ctx = input.context
        instruction = ctx.get("instruction", "")
        current_style = ctx.get("current_style") or DEFAULT_STYLE
        current_content = ctx.get("current_content") or {}

        # Trim large fields so the model sees structure without huge payloads
        content_summary = {
            k: current_content.get(k)
            for k in _CONTENT_KEYS
            if k in current_content
        }

        raw, usage = await chat(
            system=_PARSE_SYSTEM,
            messages=[{
                "role": "user",
                "content": (
                    f"Current style: {json.dumps(current_style)}\n"
                    f"Current content: {json.dumps(content_summary)}\n\n"
                    f"Instruction: {instruction}"
                ),
            }],
            agent_type=self.name,
            model=settings.GENERATION_MODEL or None,
            max_tokens=800,
        )

        parsed = _parse_json(raw)
        summary = parsed.pop("summary", "Email updated")

        style = {k: v for k, v in (parsed.get("style") or {}).items() if k in DEFAULT_STYLE}
        content = {k: v for k, v in (parsed.get("content") or {}).items() if k in _CONTENT_KEYS}

        return AgentOutput(
            data={"style": style, "content": content, "summary": summary},
            usage=usage,
        )

    async def edit_html(self, instruction: str, html: str) -> tuple[str, dict]:
        """Fallback — directly patch an email that has no recipe."""
        raw, usage = await chat(
            system=_EDIT_SYSTEM,
            messages=[{"role": "user", "content": f"Instruction: {instruction}\n\nHTML:\n{html}"}],
            agent_type=self.name,
            model=settings.GENERATION_MODEL or None,
            max_tokens=4096,
        )
        cleaned = re.sub(r"^```[a-zA-Z]*\n?|\n?```$", "", raw.strip())
        return cleaned, usage
