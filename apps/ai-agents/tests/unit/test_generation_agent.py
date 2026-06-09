import json
import pytest
from unittest.mock import AsyncMock, patch
from agents.generation_agent import GenerationAgent
from models.agent_models import AgentInput

_USAGE = {"provider": "gemini", "model": "openai/gemini-1.5-flash", "input_tokens": 200, "output_tokens": 150, "latency_ms": 300}
# GenerationAgent produces STRUCTURED content; the template engine renders the
# HTML (and the compliant unsubscribe footer) downstream in the orchestrator.
_DRAFT = json.dumps({
    "subject": "Follow-up on your loan application",
    "preheader": "A quick note about your application",
    "headline": "An update on your application",
    "body_paragraphs": [
        "Dear John,",
        "We wanted to follow up on your recent application.",
    ],
    "cta_text": "View Application",
    "cta_url": "{{cta_url}}",
    "body_text": "Dear John, We wanted to follow up on your recent application.",
})


@pytest.mark.asyncio
async def test_generates_complete_draft():
    with patch("agents.generation_agent.chat", new_callable=AsyncMock, return_value=(_DRAFT, _USAGE)):
        agent = GenerationAgent()
        out = await agent.run(AgentInput(context={
            "user_message": "Send a follow-up to John about his loan application",
            "product_slug": "recuvery",
            "brand_voice": {"tone": "professional", "style": "formal"},
            "recipient_profile": {"name": "John Doe", "email": "john@example.com"},
        }))

    assert out.data["subject"] != ""
    assert out.data["headline"] != ""
    assert out.data["body_paragraphs"]            # non-empty list of paragraphs
    assert out.data["body_text"] != ""
    assert out.data["cta_text"] != ""


@pytest.mark.asyncio
async def test_handles_malformed_llm_response():
    malformed = '```json\n{"subject": "Test", "headline": "Hi", "body_paragraphs": ["Hi"], "body_text": "Hi"}\n```'
    with patch("agents.generation_agent.chat", new_callable=AsyncMock, return_value=(malformed, _USAGE)):
        agent = GenerationAgent()
        out = await agent.run(AgentInput(context={
            "user_message": "Send a test email",
            "product_slug": "denefits",
        }))

    assert out.data.get("subject") != "" or out.data.get("body_paragraphs")


@pytest.mark.asyncio
async def test_includes_previous_draft_context():
    call_args = []

    async def capture_chat(**kwargs):
        call_args.append(kwargs)
        return (_DRAFT, _USAGE)

    with patch("agents.generation_agent.chat", side_effect=capture_chat):
        agent = GenerationAgent()
        await agent.run(AgentInput(context={
            "user_message": "Make the tone more urgent",
            "product_slug": "recuvery",
            "previous_drafts": [{"subject": "Old subject", "body_html": "<p>Old body</p>"}],
        }))

    messages = call_args[0]["messages"]
    assert len(messages) >= 2  # previous draft + new request
