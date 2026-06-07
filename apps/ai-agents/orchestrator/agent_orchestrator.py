"""DraftPipeline — coordinates the 5-step draft generation workflow.

Pipeline:
  1. IntentAgent       — extract intent from user message
  2. RecipientAgent    — build recipient profile (parallel with step 1)
  3. GenerationAgent   — produce email draft
  4. ComplianceAgent + DeliverabilityAgent — run in parallel
  5. OptimizationAgent — rewrite if deliverability score < 75
"""
import asyncio
from agents.intent_agent import IntentAgent
from agents.recipient_agent import RecipientAgent
from agents.generation_agent import GenerationAgent
from agents.compliance_agent import ComplianceAgent
from agents.deliverability_agent import DeliverabilityAgent
from agents.optimization_agent import OptimizationAgent
from models.agent_models import AgentInput
from core.logger import logger


class DraftPipeline:
    def __init__(self) -> None:
        self._intent = IntentAgent()
        self._recipient = RecipientAgent()
        self._generation = GenerationAgent()
        self._compliance = ComplianceAgent()
        self._deliverability = DeliverabilityAgent()
        self._optimization = OptimizationAgent()

    async def run(self, payload: dict) -> dict:
        user_message = payload.get("userMessage", "")
        product_slug = payload.get("productSlug", "unknown")
        brand_voice = payload.get("brandVoice") or {}
        contact = payload.get("contact")
        previous_drafts = payload.get("previousDrafts") or []
        compliance_rules = payload.get("complianceRules") or []
        regulations = payload.get("regulations") or []

        logger.info("draft_pipeline_start", product=product_slug)

        # Step 1 + 2 in parallel
        intent_input = AgentInput(context={"user_message": user_message, "product_slug": product_slug})
        recipient_input = AgentInput(context={"contact": contact, "email_history": payload.get("emailHistory")})

        intent_out, recipient_out = await asyncio.gather(
            self._intent.run(intent_input),
            self._recipient.run(recipient_input),
        )

        # Step 3 — generation
        gen_input = AgentInput(context={
            "user_message": user_message,
            "product_slug": product_slug,
            "brand_voice": brand_voice,
            "intent": intent_out.data,
            "recipient_profile": recipient_out.data.get("profile"),
            "previous_drafts": previous_drafts,
            "compliance_rules": compliance_rules,
        })
        gen_out = await self._generation.run(gen_input)

        subject = gen_out.data.get("subject", "")
        body_html = gen_out.data.get("body_html", "")
        body_text = gen_out.data.get("body_text", "")

        # Step 4 — compliance + deliverability in parallel
        compliance_input = AgentInput(context={
            "subject": subject,
            "body_html": body_html,
            "product_slug": product_slug,
            "regulations": regulations,
            "forbidden_phrases": payload.get("forbiddenPhrases") or [],
            "required_footers": payload.get("requiredFooters") or [],
        })
        deliverability_input = AgentInput(context={
            "subject": subject,
            "body_html": body_html,
        })

        compliance_out, delivery_out = await asyncio.gather(
            self._compliance.run(compliance_input),
            self._deliverability.run(deliverability_input),
        )

        # Step 5 — optimize if score < 75
        d_score = delivery_out.data.get("score", 100)
        if d_score < 75:
            opt_input = AgentInput(context={
                "subject": subject,
                "body_html": body_html,
                "body_text": body_text,
                "deliverability_score": d_score,
                "deliverability_warnings": delivery_out.data.get("warnings", []),
            })
            opt_out = await self._optimization.run(opt_input)
            subject = opt_out.data.get("subject", subject)
            body_html = opt_out.data.get("body_html", body_html)
            body_text = opt_out.data.get("body_text", body_text)
            logger.info("draft_optimized", original_score=d_score, changes=opt_out.data.get("changes"))

        # Merge usage across all agents
        combined_usage: dict[str, int] = {}
        for out in (intent_out, recipient_out, gen_out, compliance_out, delivery_out):
            for k, v in out.usage.items():
                if isinstance(v, int):
                    combined_usage[k] = combined_usage.get(k, 0) + v

        logger.info("draft_pipeline_complete", product=product_slug)

        return {
            "subject": subject,
            "body_html": body_html,
            "body_text": body_text,
            "compliance_report": compliance_out.data,
            "deliverability_report": delivery_out.data,
            "intent": intent_out.data,
            "usage": combined_usage,
            "warnings": recipient_out.warnings + delivery_out.warnings,
        }
