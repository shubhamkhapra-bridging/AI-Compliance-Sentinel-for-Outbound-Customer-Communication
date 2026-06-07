"""Agent 8 — Email Delivery: dispatches emails via configured provider."""
from agents.base import BaseAgent
from models.agent_models import AgentInput, AgentOutput
from tools.email_provider import get_provider
from events.kafka_producer import publish_event
from events.event_types import EmailSentEvent
from core.logger import logger


class SendingAgent(BaseAgent):
    name = "sending_agent"
    description = "Dispatches emails via the configured email provider (SendGrid, SES, Mailgun)"

    async def run(self, input: AgentInput) -> AgentOutput:
        ctx = input.context
        email_id = ctx.get("email_id", "unknown")
        from_email = ctx.get("from_email", "noreply@bridgingtech.com")
        to_email = ctx.get("to_email", "")
        subject = ctx.get("subject", "")
        body_html = ctx.get("body_html", "")
        body_text = ctx.get("body_text", "")
        product_slug = ctx.get("product_slug", "unknown")

        if not to_email:
            return AgentOutput(
                data={"success": False, "error": "No recipient email address"},
                warnings=["to_email is required"],
            )

        provider = get_provider()
        result = await provider.send(
            from_email=from_email,
            to_email=to_email,
            subject=subject,
            html_body=body_html,
            text_body=body_text,
        )

        if result.success:
            await publish_event(EmailSentEvent(
                email_id=email_id,
                recipient=to_email,
                provider=type(provider).__name__,
                product_slug=product_slug,
            ))
            logger.info("email_dispatched", email_id=email_id, to=to_email)

        return AgentOutput(
            data={
                "success": result.success,
                "message_id": result.message_id,
                "error": result.error,
            }
        )
