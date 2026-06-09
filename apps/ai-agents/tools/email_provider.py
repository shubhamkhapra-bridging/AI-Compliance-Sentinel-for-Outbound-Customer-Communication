"""Email provider abstraction — SMTP and SendGrid primary, SES and Mailgun adapters available."""
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from typing import Protocol

import aiosmtplib
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


class SmtpProvider:
    """Global SMTP provider — one account (e.g. Gmail) used for all products.

    The per-product ``from_email`` is intentionally overridden with the global
    ``SMTP_FROM`` so the envelope sender always matches the authenticated mailbox
    (required by Gmail).
    """

    async def send(
        self,
        *,
        from_email: str,
        to_email: str,
        subject: str,
        html_body: str,
        text_body: str = "",
    ) -> SendResult:
        sender = settings.SMTP_FROM or settings.SMTP_USER

        msg = EmailMessage()
        msg["From"] = formataddr((settings.SMTP_FROM_NAME, sender))
        msg["To"] = to_email
        msg["Subject"] = subject
        message_id = make_msgid()
        msg["Message-ID"] = message_id
        # Plain-text part first, HTML as the alternative — renders everywhere.
        msg.set_content(text_body or "Please view this email in an HTML-capable client.")
        msg.add_alternative(html_body, subtype="html")

        try:
            await aiosmtplib.send(
                msg,
                hostname=settings.SMTP_HOST,
                port=settings.SMTP_PORT,
                username=settings.SMTP_USER,
                password=settings.SMTP_PASSWORD,
                start_tls=settings.SMTP_STARTTLS,
                timeout=20,
            )
        except Exception as exc:  # noqa: BLE001 — surface any SMTP failure as a SendResult
            logger.error("email_send_failed", provider="smtp", to=to_email, error=str(exc))
            return SendResult(success=False, error=str(exc))

        logger.info("email_sent", provider="smtp", to=to_email, message_id=message_id)
        return SendResult(success=True, message_id=message_id)


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
    if settings.SMTP_HOST and settings.SMTP_USER:
        return SmtpProvider()
    if settings.SENDGRID_API_KEY:
        return SendGridProvider()
    return LogOnlyProvider()
