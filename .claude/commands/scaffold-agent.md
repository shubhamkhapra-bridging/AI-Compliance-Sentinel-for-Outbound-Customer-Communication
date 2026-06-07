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

1. **`apps/ai-agents/agents/<agent_name>_agent.py`** — Full agent class inheriting from `BaseAgent`:
   - `run()` async method with proper input/output typing
   - OpenTelemetry span instrumentation
   - Structured logging via `structlog`
   - Error handling with `tenacity` retry logic
   - `health_check()` method

2. **`apps/ai-agents/models/agent_models.py`** — Pydantic v2 input/output models appended for the new agent

3. **`apps/ai-agents/tests/unit/test_<agent_name>_agent.py`** — pytest unit test file:
   - Happy path test
   - Error/edge case test
   - Mock for external dependencies
   - Fixture for sample input

4. **`apps/ai-agents/events/event_types.py`** — New event dataclass (e.g., `UnsubscribeProcessedEvent`)

5. **Registration note** — Instructions to register the agent in `orchestrator/agent_orchestrator.py`

## Generated Code Template

```python
# agents/<agent_name>_agent.py

from opentelemetry import trace
from models.agent_models import <AgentName>Input, <AgentName>Output
from .base import BaseAgent
import structlog

tracer = trace.get_tracer(__name__)
logger = structlog.get_logger(__name__)


class <AgentName>Agent(BaseAgent):
    name = "<agent_name>"
    description = "<responsibility>"

    async def run(self, input: <AgentName>Input) -> <AgentName>Output:
        with tracer.start_as_current_span(f"{self.name}.run") as span:
            span.set_attribute("agent.name", self.name)
            try:
                logger.info("agent_start", agent=self.name)
                result = await self._process(input)
                span.set_attribute("agent.status", "success")
                return result
            except Exception as e:
                span.record_exception(e)
                span.set_attribute("agent.status", "error")
                logger.error("agent_failed", agent=self.name, error=str(e))
                raise

    async def _process(self, input: <AgentName>Input) -> <AgentName>Output:
        raise NotImplementedError

    async def health_check(self) -> bool:
        return True
```

## Notes

- Run `/test-agent <agent_name>` after scaffolding to validate the generated tests pass.
- Claude will ask for clarification on inputs/outputs if the responsibility is ambiguous.
- All agents must be registered in `orchestrator/agent_orchestrator.py` to be reachable via the pipeline.
