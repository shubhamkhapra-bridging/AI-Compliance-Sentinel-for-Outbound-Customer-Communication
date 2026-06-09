"""LLM client — OpenAI and Gemini only (via litellm).

Model selection:
  - Pass an explicit model name to chat() to override.
  - Default provider is determined by LLM_PROVIDER env var (openai | gemini).
  - litellm requires provider-prefixed model names:
      openai/gpt-4o-mini   → OpenAI
      gemini/gemini-1.5-flash → Google Gemini
"""
import os
import time
import litellm
from core.config import settings
from core.logger import logger

_OPENAI_DEFAULT = "openai/gpt-4o-mini"
# Use Gemini's OpenAI-compatible REST endpoint to avoid gRPC issues
_GEMINI_DEFAULT = "openai/gemini-1.5-flash"
_GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/openai/"

litellm.set_verbose = False

if settings.GEMINI_API_KEY:
    os.environ.setdefault("GEMINI_API_KEY", settings.GEMINI_API_KEY)


def _is_gemini(model: str) -> bool:
    return "gemini" in model


def _resolve_model(model: str | None) -> str:
    """Return a litellm-compatible provider-prefixed model name."""
    if model:
        # Already fully qualified
        if model.startswith("openai/") or model.startswith("gemini/"):
            # Normalise gemini/ → openai/ via REST endpoint
            if model.startswith("gemini/"):
                return f"openai/{model[len('gemini/'):]}"
            return model
        if model.startswith("gpt") or model.startswith("o1") or model.startswith("o3"):
            return f"openai/{model}"
        if model.startswith("gemini-"):
            return f"openai/{model}"
        return model

    if settings.LLM_PROVIDER == "gemini":
        return _GEMINI_DEFAULT

    return _OPENAI_DEFAULT


async def chat(
    *,
    system: str,
    messages: list[dict],
    model: str | None = None,
    max_tokens: int = 2048,
    agent_type: str = "unknown",
    api_key_override: str | None = None,
) -> tuple[str, dict]:
    """Call LLM and return (response_text, usage_dict).

    Pass ``api_key_override`` to use a caller-supplied key (e.g. a tenant's own
    OpenAI/Gemini key) instead of the service default. The key is never logged.
    """
    chosen_model = _resolve_model(model)
    start = time.monotonic()

    is_gemini = _is_gemini(chosen_model)
    api_key = api_key_override or (settings.GEMINI_API_KEY if is_gemini else settings.OPENAI_API_KEY) or None

    kwargs: dict = {
        "model": chosen_model,
        "messages": [{"role": "system", "content": system}] + messages,
        "max_tokens": max_tokens,
    }
    if api_key:
        kwargs["api_key"] = api_key
    if is_gemini:
        kwargs["api_base"] = _GEMINI_BASE_URL

    response = await litellm.acompletion(**kwargs)
    text = response.choices[0].message.content or ""

    provider = chosen_model.split("/")[0]
    usage = {
        "provider": provider,
        "model": chosen_model,
        "input_tokens": response.usage.prompt_tokens,
        "output_tokens": response.usage.completion_tokens,
        "latency_ms": int((time.monotonic() - start) * 1000),
    }
    logger.info("llm_call", agent=agent_type, **usage)
    return text, usage


async def vision_chat(
    *,
    system: str,
    text: str,
    image_url: str,
    model: str | None = None,
    max_tokens: int = 500,
    agent_type: str = "vision",
) -> tuple[str, dict]:
    """Call a vision-capable LLM with one image (data URL or http URL)."""
    chosen_model = _resolve_model(model)
    start = time.monotonic()

    is_gemini = _is_gemini(chosen_model)
    api_key = (settings.GEMINI_API_KEY if is_gemini else settings.OPENAI_API_KEY) or None

    kwargs: dict = {
        "model": chosen_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": [
                {"type": "text", "text": text},
                {"type": "image_url", "image_url": {"url": image_url}},
            ]},
        ],
        "max_tokens": max_tokens,
    }
    if api_key:
        kwargs["api_key"] = api_key
    if is_gemini:
        kwargs["api_base"] = _GEMINI_BASE_URL

    response = await litellm.acompletion(**kwargs)
    out = response.choices[0].message.content or ""
    usage = {
        "provider": chosen_model.split("/")[0],
        "model": chosen_model,
        "input_tokens": response.usage.prompt_tokens,
        "output_tokens": response.usage.completion_tokens,
        "latency_ms": int((time.monotonic() - start) * 1000),
    }
    logger.info("vision_call", agent=agent_type, **usage)
    return out, usage
