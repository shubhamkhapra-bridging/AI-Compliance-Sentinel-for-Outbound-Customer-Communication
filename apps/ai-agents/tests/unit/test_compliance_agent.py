import json
import pytest
from unittest.mock import AsyncMock, patch
from agents.compliance_agent import ComplianceAgent
from models.agent_models import AgentInput

_USAGE = {"provider": "anthropic", "input_tokens": 50, "output_tokens": 20, "latency_ms": 100}


@pytest.mark.asyncio
async def test_clean_email_passes():
    response = json.dumps({
        "passed": True, "risk_score": 5, "requires_approval": False,
        "violations": [], "recommendations": [],
    })
    with patch("tools.llm_client.chat", new_callable=AsyncMock, return_value=(response, _USAGE)):
        agent = ComplianceAgent()
        out = await agent.run(AgentInput(context={
            "subject": "Account update",
            "body_html": "<p>Hello</p><a href='https://example.com/unsub'>Unsubscribe</a>",
            "product_slug": "recuvery",
            "regulations": ["CAN-SPAM"],
        }))

    assert out.data["passed"] is True
    assert out.data["violations"] == []
    assert out.data["risk_score"] <= 30


@pytest.mark.asyncio
async def test_missing_unsubscribe_fails():
    response = json.dumps({
        "passed": False, "risk_score": 75, "requires_approval": True,
        "violations": [{"rule": "CAN-SPAM", "severity": "high", "description": "Missing unsubscribe link", "suggestion": "Add footer"}],
        "recommendations": ["Add unsubscribe link"],
    })
    with patch("tools.llm_client.chat", new_callable=AsyncMock, return_value=(response, _USAGE)):
        agent = ComplianceAgent()
        out = await agent.run(AgentInput(context={
            "subject": "Special Offer!!!",
            "body_html": "<p>BUY NOW FREE MONEY</p>",
            "product_slug": "credee",
            "regulations": ["CAN-SPAM", "GDPR"],
        }))

    assert out.data["passed"] is False
    assert len(out.data["violations"]) > 0
    assert out.data["requires_approval"] is True


@pytest.mark.asyncio
async def test_forbidden_phrase_triggers_violation():
    response = json.dumps({
        "passed": False, "risk_score": 60, "requires_approval": True,
        "violations": [{"rule": "FDCPA", "severity": "high", "description": "Forbidden phrase detected", "suggestion": "Remove threatening language"}],
        "recommendations": [],
    })
    with patch("tools.llm_client.chat", new_callable=AsyncMock, return_value=(response, _USAGE)):
        agent = ComplianceAgent()
        out = await agent.run(AgentInput(context={
            "subject": "Pay now or face legal action",
            "body_html": "<p>We will sue you if you do not pay immediately.</p>",
            "product_slug": "recuvery",
            "regulations": ["FDCPA"],
            "forbidden_phrases": ["sue", "legal action"],
        }))

    assert out.data["passed"] is False
    assert any("FDCPA" in v.get("rule", "") for v in out.data["violations"])
