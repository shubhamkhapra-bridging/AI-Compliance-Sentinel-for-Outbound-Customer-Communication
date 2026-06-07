"""DraftPipeline — coordinates the draft generation workflow.

  1. IntentAgent          — extract intent + style overrides from user message
  2. RecipientAgent       — build recipient profile (parallel with step 1)
  3. GenerationAgent      — produce structured content (headline, paragraphs, CTA)
  4. Template engine      — render branded HTML + embed restyle recipe
  5. ComplianceAgent + DeliverabilityAgent — run in parallel
"""
import asyncio
from agents.intent_agent import IntentAgent
from agents.recipient_agent import RecipientAgent
from agents.generation_agent import GenerationAgent
from agents.compliance_agent import ComplianceAgent
from agents.deliverability_agent import DeliverabilityAgent
from models.agent_models import AgentInput
from tools.email_template import (
    DEFAULT_STYLE,
    render_with_recipe,
    plain_text_from_paragraphs,
)
from core.logger import logger


def _pick(brand_colors: dict, key: str, fallback: str) -> str:
    val = brand_colors.get(key) or brand_colors.get("primary")
    return (val or fallback).strip()


def _build_details(entities: dict | None) -> list[dict]:
    """Turn intent entities (amount, deadline) into footer-style detail rows."""
    if not entities:
        return []
    rows: list[dict] = []
    amount = entities.get("amount")
    if amount:
        rows.append({"label": "Amount", "value": f"${amount}" if str(amount).replace(".", "").isdigit() else str(amount)})
    deadline = entities.get("deadline")
    if deadline:
        rows.append({"label": "Due Date", "value": str(deadline)})
    return rows


class DraftPipeline:
    def __init__(self) -> None:
        self._intent        = IntentAgent()
        self._recipient     = RecipientAgent()
        self._generation    = GenerationAgent()
        self._compliance    = ComplianceAgent()
        self._deliverability = DeliverabilityAgent()

    async def run(self, payload: dict) -> dict:
        user_message    = payload.get("userMessage", "")
        product_slug    = payload.get("productSlug", "unknown")
        company_name    = payload.get("companyName") or product_slug.title()
        brand_voice     = payload.get("brandVoice") or {}
        brand_colors    = payload.get("brandColors") or {}
        logo_url        = payload.get("logoUrl", "")
        company_address = payload.get("companyAddress", "")
        website_url     = payload.get("websiteUrl", "")
        contact         = payload.get("contact")
        previous_drafts = payload.get("previousDrafts") or []
        compliance_rules = payload.get("complianceRules") or []
        regulations     = payload.get("regulations") or []

        logger.info("draft_pipeline_start", product=product_slug)

        # Step 1 + 2 — intent and recipient profile in parallel
        intent_out, recipient_out = await asyncio.gather(
            self._intent.run(AgentInput(context={
                "user_message": user_message, "product_slug": product_slug,
            })),
            self._recipient.run(AgentInput(context={
                "contact": contact, "email_history": payload.get("emailHistory"),
            })),
        )

        # Resolve style: brand kit defaults, then any chat-specified colors override
        style_overrides = intent_out.data.get("style_overrides") or {}
        style: dict[str, str] = {
            **DEFAULT_STYLE,
            "primary_color": _pick(brand_colors, "primary", DEFAULT_STYLE["primary_color"]),
            "accent_color":  _pick(brand_colors, "accent",  _pick(brand_colors, "primary", DEFAULT_STYLE["accent_color"])),
            "button_color":  _pick(brand_colors, "button",  _pick(brand_colors, "primary", DEFAULT_STYLE["button_color"])),
        }
        if style_overrides.get("primary_color"):
            style["primary_color"] = style_overrides["primary_color"]
            style["accent_color"]  = style_overrides["primary_color"]
        if style_overrides.get("button_color"):
            style["button_color"] = style_overrides["button_color"]

        # Step 3 — structured content generation
        gen_out = await self._generation.run(AgentInput(context={
            "user_message":      user_message,
            "product_slug":      product_slug,
            "company_name":      company_name,
            "brand_voice":       brand_voice,
            "intent":            intent_out.data,
            "tone":              intent_out.data.get("tone", "professional"),
            "recipient_profile": recipient_out.data.get("profile"),
            "previous_drafts":   previous_drafts,
            "compliance_rules":  compliance_rules,
            "style_overrides":   style_overrides.get("notes", ""),
        }))

        subject   = gen_out.data.get("subject", "")
        body_text = gen_out.data.get("body_text", "")
        headline  = gen_out.data.get("headline", subject)
        paragraphs = gen_out.data.get("body_paragraphs") or []
        cta_text  = gen_out.data.get("cta_text", "")
        cta_url   = gen_out.data.get("cta_url", "#")

        # Step 4 — build content dict + render branded HTML with embedded recipe
        content = {
            "subject":         subject,
            "preheader":       gen_out.data.get("preheader", ""),
            "intent":          intent_out.data.get("intent", ""),
            "headline":        headline,
            "body_paragraphs": paragraphs,
            "details":         _build_details(intent_out.data.get("entities")),
            "cta_text":        cta_text,
            "cta_url":         cta_url,
            "sender_name":     gen_out.data.get("sender_name", ""),
            "sender_title":    gen_out.data.get("sender_title", ""),
            "company_name":    company_name,
            "logo_url":        logo_url,
            "company_address": company_address,
            "unsubscribe_url": f"{website_url.rstrip('/')}/unsubscribe" if website_url else "#unsubscribe",
            "privacy_url":     f"{website_url.rstrip('/')}/privacy" if website_url else "#privacy",
        }

        body_html = render_with_recipe(content, style)

        if not body_text:
            body_text = plain_text_from_paragraphs(paragraphs, headline=headline, cta_text=cta_text, cta_url=cta_url)

        # Step 5 — compliance + deliverability in parallel
        compliance_out, delivery_out = await asyncio.gather(
            self._compliance.run(AgentInput(context={
                "subject": subject, "body_html": body_html, "product_slug": product_slug,
                "regulations": regulations,
                "forbidden_phrases": payload.get("forbiddenPhrases") or [],
                "required_footers": payload.get("requiredFooters") or [],
            })),
            self._deliverability.run(AgentInput(context={"subject": subject, "body_html": body_html})),
        )

        combined_usage: dict[str, int] = {}
        for out in (intent_out, recipient_out, gen_out, compliance_out, delivery_out):
            for k, v in out.usage.items():
                if isinstance(v, int):
                    combined_usage[k] = combined_usage.get(k, 0) + v

        logger.info("draft_pipeline_complete", product=product_slug)

        return {
            "subject":               subject,
            "body_html":             body_html,
            "body_text":             body_text,
            "compliance_report":     compliance_out.data,
            "deliverability_report": delivery_out.data,
            "intent":                intent_out.data,
            "brand":                 {"primaryColor": style["primary_color"], "buttonColor": style["button_color"], "logoUrl": logo_url},
            "usage":                 combined_usage,
            "warnings":              recipient_out.warnings + delivery_out.warnings,
        }
