import json
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient, ASGITransport
from main import app


_COMPLIANCE_PASS = json.dumps({
    "passed": True,
    "risk_score": 10,
    "requires_approval": False,
    "violations": [],
    "recommendations": [],
})

_COMPLIANCE_FAIL = json.dumps({
    "passed": False,
    "risk_score": 80,
    "requires_approval": True,
    "violations": [{"rule": "CAN-SPAM", "severity": "high", "description": "Missing unsubscribe link", "suggestion": "Add unsubscribe footer"}],
    "recommendations": ["Add an unsubscribe link"],
})

_DRAFT_RESPONSE = json.dumps({
    "subject": "Follow-up on your account",
    "body_html": "<p>Hello, this is a follow-up.</p><a href='{{unsubscribe_url}}'>Unsubscribe</a>",
    "body_text": "Hello, this is a follow-up.",
})

_RISK_RESPONSE = json.dumps({
    "risk_score": 20,
    "risk_tier": "low",
    "rules_triggered": [],
    "requires_approval": False,
    "routing": "auto_send",
    "reasoning": "Single recipient, no violations",
})

_USAGE = {"provider": "anthropic", "model": "claude-sonnet-4-6", "input_tokens": 100, "output_tokens": 50, "latency_ms": 200}


@pytest.fixture
def mock_llm_pass():
    with patch("tools.llm_client.chat", new_callable=AsyncMock) as m:
        m.return_value = (_COMPLIANCE_PASS, _USAGE)
        yield m


@pytest.fixture
def mock_llm_fail():
    with patch("tools.llm_client.chat", new_callable=AsyncMock) as m:
        m.return_value = (_COMPLIANCE_FAIL, _USAGE)
        yield m


@pytest.fixture
def mock_llm_draft():
    with patch("tools.llm_client.chat", new_callable=AsyncMock) as m:
        m.return_value = (_DRAFT_RESPONSE, _USAGE)
        yield m


@pytest.fixture
def mock_llm_risk():
    with patch("tools.llm_client.chat", new_callable=AsyncMock) as m:
        m.return_value = (_RISK_RESPONSE, _USAGE)
        yield m


@pytest.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
