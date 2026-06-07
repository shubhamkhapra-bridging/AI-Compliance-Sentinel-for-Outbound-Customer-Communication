from fastapi import APIRouter, Depends
from pydantic import BaseModel
from agents.sending_agent import SendingAgent
from models.agent_models import AgentInput
from core.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])

_agent = SendingAgent()


class SendPayload(BaseModel):
    emailId: str
    fromEmail: str = "noreply@bridgingtech.com"
    toEmail: str
    subject: str
    bodyHtml: str
    bodyText: str = ""
    productSlug: str = "unknown"


@router.post("")
async def send_email(payload: SendPayload):
    out = await _agent.run(AgentInput(context={
        "email_id": payload.emailId,
        "from_email": payload.fromEmail,
        "to_email": payload.toEmail,
        "subject": payload.subject,
        "body_html": payload.bodyHtml,
        "body_text": payload.bodyText,
        "product_slug": payload.productSlug,
    }))
    return {
        "success": out.data.get("success", False),
        "messageId": out.data.get("message_id", ""),
        "error": out.data.get("error", ""),
    }
