"""LLM client — provider-agnostic via LiteLLM.

Set LLM_PROVIDER=openai  + OPENAI_API_KEY   to use OpenAI.
Set LLM_PROVIDER=anthropic + ANTHROPIC_API_KEY to use Anthropic (default).
"""
import time
import litellm
from core.config import settings
from core.logger import logger

# OpenAI model to use when LLM_PROVIDER=openai
_OPENAI_DEFAULT = "gpt-4o"


def _resolve_model(model: str | None) -> tuple[str, str]:
    """Return (provider, model_name) based on config and override."""
    if model:
        # Explicit override — detect provider from model name prefix
        if model.startswith("gpt") or model.startswith("o1") or model.startswith("o3"):
            return "openai", model
        if model.startswith("claude"):
            return "anthropic", model
        return settings.LLM_PROVIDER, model

    if settings.LLM_PROVIDER == "openai" or (not settings.ANTHROPIC_API_KEY and settings.OPENAI_API_KEY):
        return "openai", _OPENAI_DEFAULT

    return "anthropic", settings.DEFAULT_MODEL


async def chat(
    *,
    system: str,
    messages: list[dict],
    model: str | None = None,
    max_tokens: int = 2048,
    agent_type: str = "unknown",
) -> tuple[str, dict]:
    """Call LLM and return (response_text, usage_dict).

    Provider is selected automatically from LLM_PROVIDER env var.
    Falls back to OpenAI if ANTHROPIC_API_KEY is absent.
    """
    provider, chosen_model = _resolve_model(model)
    start = time.monotonic()

    if provider == "anthropic":
        return await _call_anthropic(system, messages, chosen_model, max_tokens, agent_type, start)
    return await _call_openai(system, messages, chosen_model, max_tokens, agent_type, start)


async def _call_anthropic(
    system: str,
    messages: list[dict],
    model: str,
    max_tokens: int,
    agent_type: str,
    start: float,
) -> tuple[str, dict]:
    import anthropic as _anthropic
    client = _anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    try:
        response = await client.messages.create(
            model=model,
            system=system,
            messages=messages,
            max_tokens=max_tokens,
        )
        text = response.content[0].text
        usage = {
            "provider": "anthropic",
            "model": model,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "latency_ms": int((time.monotonic() - start) * 1000),
        }
        logger.info("llm_call", agent=agent_type, **usage)
        return text, usage

    except Exception as exc:
        if settings.OPENAI_API_KEY:
            logger.warning("anthropic_failed_falling_back_to_openai", error=str(exc))
            return await _call_openai(system, messages, _OPENAI_DEFAULT, max_tokens, agent_type, start)
        raise


async def _call_openai(
    system: str,
    messages: list[dict],
    model: str,
    max_tokens: int,
    agent_type: str,
    start: float,
) -> tuple[str, dict]:
    response = await litellm.acompletion(
        model=model,
        messages=[{"role": "system", "content": system}] + messages,
        max_tokens=max_tokens,
        api_key=settings.OPENAI_API_KEY,
    )
    text = response.choices[0].message.content or ""
    usage = {
        "provider": "openai",
        "model": model,
        "input_tokens": response.usage.prompt_tokens,
        "output_tokens": response.usage.completion_tokens,
        "latency_ms": int((time.monotonic() - start) * 1000),
    }
    logger.info("llm_call", agent=agent_type, **usage)
    return text, usage
