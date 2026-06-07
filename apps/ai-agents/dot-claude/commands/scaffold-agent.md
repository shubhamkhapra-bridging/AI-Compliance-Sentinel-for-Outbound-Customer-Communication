# Scaffold Agent

Generate production-ready boilerplate for a new agent in the multi-agent pipeline.

## Usage

```
/scaffold-agent <agent_name> <responsibility>
```

## Examples

```
/scaffold-agent unsubscribe "Handle opt-out requests and update suppression lists"
/scaffold-agent ab-testing "Manage A/B test assignment and result tracking for email variants"
/scaffold-agent enrichment "Enrich contact records with firmographic data from external APIs"
```

## What Gets Generated

1. **`agents/<agent_name>_agent.py`** — Full agent class inheriting from `BaseAgent`:
   - `run()` async method with proper input/output typing
   - OpenTelemetry span instrumentation
   - Structured logging
   - Error handling with retry logic
   - `health_check()` method

2. **`models/agent_models.py`** — Pydantic v2 input/output models for the new agent (appended, not overwritten)

3. **`tests/unit/test_<agent_name>_agent.py`** — pytest unit test file:
   - Happy path test
   - Error/edge case test
   - Mock for external dependencies
   - Fixture for sample input

4. **`events/event_types.py`** — New event dataclass for the agent (e.g., `UnsubscribeProcessedEvent`)

5. **Registration** — Instructions to register the agent in `orchestrator/agent_orchestrator.py`

## Generated Code Template

```python
# agents/<agent_name>_agent.py

from opentelemetry import trace
from models.agent_models import <AgentName>Input, <AgentName>Output
from .base_agent import BaseAgent
import logging

tracer = trace.get_tracer(__name__)
logger = logging.getLogger(__name__)


class <AgentName>Agent(BaseAgent):
    """
    <responsibility>
    """
    name = "<agent_name>"
    description = "<responsibility>"

    async def run(self, input: <AgentName>Input) -> <AgentName>Output:
        with tracer.start_as_current_span(f"{self.name}.run") as span:
            span.set_attribute("agent.name", self.name)
            try:
                logger.info(f"[{self.name}] Starting", extra={"input": input.model_dump()})
                # TODO: implement agent logic here
                result = await self._process(input)
                span.set_attribute("agent.status", "success")
                return result
            except Exception as e:
                span.record_exception(e)
                span.set_attribute("agent.status", "error")
                logger.error(f"[{self.name}] Failed: {e}", exc_info=True)
                raise

    async def _process(self, input: <AgentName>Input) -> <AgentName>Output:
        raise NotImplementedError

    async def health_check(self) -> bool:
        return True
```

## Notes

- The generated agent is placed in `agents/` and immediately importable.
- Claude will ask for clarification on inputs/outputs if the responsibility is ambiguous.
- Run `/test-agent <agent_name>` after scaffolding to validate the generated tests pass.
