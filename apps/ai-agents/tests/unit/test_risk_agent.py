import pytest
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch
import json
from main import app

_API_KEY = "internal-secret"
_HEADERS = {"X-API-Key": _API_KEY, "Content-Type": "application/json"}
_USAGE = {"provider": "openai", "model": "openai/gpt-4o-mini", "input_tokens": 50, "output_tokens": 30, "latency_ms": 100}


@pytest.mark.asyncio
async def test_bulk_send_is_always_high_risk():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/agents/risk", headers=_HEADERS, json={
            "emailId": "email-001",
            "productSlug": "recuvery",
            "recipientCount": 500,
            "subject": "Monthly newsletter",
            "bodyPreview": "Here is this month's update...",
        })

    assert resp.status_code == 200
    data = resp.json()
    assert data["riskTier"] == "high"
    assert data["requiresApproval"] is True
    assert data["routing"] == "manager_approval"


@pytest.mark.asyncio
async def test_single_send_no_violations_is_low_risk():
    llm_response = json.dumps({
        "risk_score": 15,
        "risk_tier": "low",
        "rules_triggered": [],
        "requires_approval": False,
        "routing": "auto_send",
        "reasoning": "Single recipient, no violations",
    })
    with patch("routers.risk.chat", new_callable=AsyncMock, return_value=(llm_response, _USAGE)):
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            resp = await client.post("/agents/risk", headers=_HEADERS, json={
                "emailId": "email-002",
                "productSlug": "denefits",
                "recipientCount": 1,
                "subject": "Your account statement",
                "bodyPreview": "Please find your monthly statement attached.",
            })

    assert resp.status_code == 200
    data = resp.json()
    assert data["riskTier"] == "low"
    assert data["requiresApproval"] is False
    assert data["routing"] == "auto_send"


@pytest.mark.asyncio
async def test_missing_api_key_returns_403():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/agents/risk", json={
            "emailId": "email-003",
            "productSlug": "recuvery",
            "subject": "Test",
        })
    assert resp.status_code == 403
