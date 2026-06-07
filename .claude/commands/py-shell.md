# Python — Interactive Shell

Open an async Python REPL with all agents, models, and database connections pre-imported for debugging and exploration.

## Usage

```
/py-shell
```

## Steps

1. Activate the venv:
   ```bash
   # Windows
   apps/ai-agents/.venv/Scripts/activate
   # macOS/Linux
   source apps/ai-agents/.venv/bin/activate
   ```

2. Launch IPython with auto-imports:
   ```bash
   cd apps/ai-agents && python -c "
   import asyncio
   from core.config import settings
   from core.logger import logger
   from agents.compliance_agent import ComplianceAgent
   from agents.generation_agent import GenerationAgent
   from agents.risk_agent import RiskAgent
   from tools.llm_client import LLMClient

   print('Agents loaded. Use asyncio.run(agent.run(input)) to test.')
   print(f'LLM provider: {settings.LLM_PROVIDER} / {settings.DEFAULT_MODEL}')

   import IPython; IPython.embed()
   "
   ```

   If IPython is not installed: `pip install ipython`

3. Example REPL usage:
   ```python
   # Test compliance agent directly
   from models.agent_models import ComplianceInput
   agent = ComplianceAgent()
   result = asyncio.run(agent.run(ComplianceInput(
       subject="Special offer!!!",
       body="Click now to claim your FREE prize. Guaranteed results!",
       email_type="marketing"
   )))
   print(result.model_dump_json(indent=2))
   ```

## Notes

- Useful for testing agent logic without going through the full HTTP stack.
- DB connections via `asyncpg` need `asyncio.run()` — don't call `await` at top level unless using `IPython` with `%autoawait asyncio`.
- Never run shell against production — it connects to whatever `DATABASE_URL` is in `.env`.
