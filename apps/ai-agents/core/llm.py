"""LLM router — wraps Anthropic (primary) with OpenAI fallback via LiteLLM."""
import time
import anthropic
import litellm
from core.config import settings
from core.logger import logger


_anthropic_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def chat(
    *,
    system: str,
    messages: list[dict],
    model: str | None = None,
    max_tokens: int = 2048,
    agent_type: str = "unknown",
) -> tuple[str, dict]:
    """Returns (response_text, usage_dict)."""
    chosen_model = model or settings.DEFAULT_MODEL
    start = time.monotonic()

    try:
        response = await _anthropic_client.messages.create(
            model=chosen_model,
            system=system,
            messages=messages,
            max_tokens=max_tokens,
        )
        text = response.content[0].text
        usage = {
            "provider": "anthropic",
            "model": chosen_model,
            "input_tokens": response.usage.input_tokens,
            "output_tokens": response.usage.output_tokens,
            "latency_ms": int((time.monotonic() - start) * 1000),
        }
        logger.info("llm_call", agent=agent_type, **usage)
        return text, usage

    except Exception as exc:
        logger.warning("anthropic_failed_falling_back", error=str(exc))
        # Fallback to OpenAI via LiteLLM
        fallback = await litellm.acompletion(
            model="gpt-4o",
            messages=[{"role": "system", "content": system}] + messages,
            max_tokens=max_tokens,
        )
        text = fallback.choices[0].message.content or ""
        usage = {
            "provider": "openai",
            "model": "gpt-4o",
            "input_tokens": fallback.usage.prompt_tokens,
            "output_tokens": fallback.usage.completion_tokens,
            "latency_ms": int((time.monotonic() - start) * 1000),
        }
        return text, usage
