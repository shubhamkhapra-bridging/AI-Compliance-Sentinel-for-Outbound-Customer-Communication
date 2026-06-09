from fastapi import APIRouter, Depends
from pydantic import BaseModel
from agents.email_validation_agent import EmailValidationAgent
from models.agent_models import AgentInput
from core.security import verify_api_key

router = APIRouter(dependencies=[Depends(verify_api_key)])

_agent = EmailValidationAgent()


class ValidatePayload(BaseModel):
    subject: str
    body: str
    llmApiKey: str | None = None
    provider: str | None = None
    model: str | None = None


@router.post("")
async def run_validation(payload: ValidatePayload):
    out = await _agent.run(AgentInput(context={
        "subject": payload.subject,
        "body": payload.body,
        "llm_api_key": payload.llmApiKey,
        "provider": payload.provider,
        "model": payload.model,
    }))

    return {
        "passed": out.data.get("passed", False),
        "riskScore": out.data.get("risk_score", 50),
        "issues": out.data.get("issues", []),
        "correctedSubject": out.data.get("corrected_subject", payload.subject),
        "correctedBody": out.data.get("corrected_body", payload.body),
        "inboxPrediction": out.data.get("inbox_prediction"),
        "usage": out.usage,
    }
