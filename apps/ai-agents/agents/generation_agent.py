"""Agent 3 — Email Generation: produces structured email content for the branded template."""
import json
import re
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.llm_client import chat
from core.config import settings


_SYSTEM = """You are an expert email copywriter for BridgingTech.
Write outbound customer emails that are professional, on-brand, and conversion-focused.

Rules:
- Match the specified tone and intent
- Keep the headline punchy (8–12 words max)
- Body: 2–4 short paragraphs, each 1–3 sentences
- CTA should be action-oriented (e.g. "Pay Now", "Get Started", "Schedule a Call")
- Include {{unsubscribe_url}} as a literal placeholder in cta_url if there is no real URL
- body_text is the plain-text fallback — no HTML tags

Respond ONLY with valid JSON (no markdown, no extra text):
{
  "subject": "compelling subject line under 55 chars",
  "preheader": "inbox preview text 60-85 chars",
  "headline": "Bold main heading shown at top of email",
  "body_paragraphs": [
    "First paragraph — hook or context.",
    "Second paragraph — value proposition or details.",
    "Third paragraph — next step or urgency (optional)."
  ],
  "cta_text": "Action Label",
  "cta_url": "{{cta_url}}",
  "sender_name": "First Last",
  "sender_title": "Job Title at Company",
  "body_text": "Plain text version with all the same information."
}"""


class GenerationAgent(BaseAgent):
    name = "generation_agent"
    description = "Generates structured email content — headline, paragraphs, CTA — for the branded template"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        parts = [
            f"Product: {ctx.get('product_slug', 'unknown')}",
            f"Company: {ctx.get('company_name', 'BridgingTech')}",
            f"Brand voice: {ctx.get('brand_voice', {})}",
            f"Intent: {ctx.get('intent', {})}",
            f"Tone: {ctx.get('tone', 'professional')}",
        ]
        if ctx.get("recipient_profile"):
            parts.append(f"Recipient: {ctx['recipient_profile']}")
        if ctx.get("compliance_rules"):
            parts.append(f"Compliance rules: {ctx['compliance_rules']}")
        if ctx.get("style_overrides"):
            parts.append(f"Style notes: {ctx['style_overrides']}")

        messages: list[dict] = []
        for prev in (ctx.get("previous_drafts") or [])[-2:]:
            messages.append({"role": "assistant", "content": str(prev)})
        messages.append({
            "role": "user",
            "content": f"{chr(10).join(parts)}\n\nRequest: {ctx.get('user_message', '')}",
        })

        raw, usage = await chat(
            system=_SYSTEM,
            messages=messages,
            agent_type=self.name,
            model=settings.GENERATION_MODEL or None,
        )

        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            parsed = json.loads(match.group()) if match else {}

        return AgentOutput(
            data={
                "subject":          parsed.get("subject", ""),
                "preheader":        parsed.get("preheader", ""),
                "headline":         parsed.get("headline", ""),
                "body_paragraphs":  parsed.get("body_paragraphs", []),
                "cta_text":         parsed.get("cta_text", ""),
                "cta_url":          parsed.get("cta_url", "#"),
                "sender_name":      parsed.get("sender_name", ""),
                "sender_title":     parsed.get("sender_title", ""),
                "body_text":        parsed.get("body_text", ""),
            },
            usage=usage,
        )
