"""Email provider abstraction — SendGrid primary, SES and Mailgun adapters available."""
from typing import Protocol
import httpx
from core.config import settings
from core.logger import logger


class SendResult:
    def __init__(self, success: bool, message_id: str = "", error: str = "") -> None:
        self.success = success
        self.message_id = message_id
        self.error = error


class EmailProvider(Protocol):
    async def send(
        self,
        *,
        from_email: str,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str = "",
    ) -> SendResult:
        ...


class SendGridProvider:
    _BASE = "https://api.sendgrid.com/v3/mail/send"

    async def send(
        self,
        *,
        from_email: str,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str = "",
    ) -> SendResult:
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": from_email},
            "subject": subject,
            "content": [
                {"type": "text/html", "value": html_body},
            ],
        }
        if text_body:
            payload["content"].insert(0, {"type": "text/plain", "value": text_body})

        async with httpx.AsyncClient() as client:
            resp = await client.post(
                self._BASE,
                json=payload,
                headers={"Authorization": f"Bearer {settings.SENDGRID_API_KEY}"},
                timeout=15,
            )

        if resp.status_code in (200, 202):
            message_id = resp.headers.get("X-Message-Id", "")
            logger.info("email_sent", provider="sendgrid", to=to_email, message_id=message_id)
            return SendResult(success=True, message_id=message_id)

        logger.error("email_send_failed", provider="sendgrid", status=resp.status_code, body=resp.text)
        return SendResult(success=False, error=resp.text)


class LogOnlyProvider:
    """Fallback provider for development — logs instead of sending."""

    async def send(
        self,
        *,
        from_email: str,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str = "",
    ) -> SendResult:
        logger.info(
            "email_send_dry_run",
            from_email=from_email,
            to_email=to_email,
            subject=subject,
        )
        return SendResult(success=True, message_id="dry-run-00000")


def get_provider() -> EmailProvider:
    if settings.SENDGRID_API_KEY:
        return SendGridProvider()
    return LogOnlyProvider()
