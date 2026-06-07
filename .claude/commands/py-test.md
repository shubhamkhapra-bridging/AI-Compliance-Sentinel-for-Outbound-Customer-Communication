# Python — Run Tests

Run the Python AI Agents test suite using pytest.

## Usage

```
/py-test [path_or_agent] [--integration] [--coverage] [--fail-fast]
```

## Examples

```
/py-test                                  # all unit tests
/py-test compliance                       # tests matching "compliance"
/py-test tests/unit/test_risk_agent.py    # specific file
/py-test --coverage                       # with HTML coverage report
/py-test --integration                    # requires running Docker infra
/py-test --fail-fast                      # stop on first failure
```

## Steps

1. Activate the virtual environment:
   ```bash
   # Windows
   apps/ai-agents/.venv/Scripts/activate
   # macOS/Linux
   source apps/ai-agents/.venv/bin/activate
   ```

2. Run pytest:
   ```bash
   cd apps/ai-agents

   # Unit tests
   pytest tests/unit/ -v

   # Filtered
   pytest tests/unit/ -v -k <filter>

   # With coverage
   pytest tests/unit/ -v --cov=agents --cov=routers --cov-report=term-missing --cov-report=html

   # Integration (needs postgres_db + redis_server healthy)
   pytest tests/integration/ -v --env=test

   # Fail fast
   pytest tests/unit/ -v -x
   ```

3. Display summary:
   ```
   PYTHON TEST RESULTS
   ===================
   tests/unit/test_compliance_agent.py    : 5 passed
   tests/unit/test_generation_agent.py   : 4 passed
   tests/unit/test_risk_agent.py         : 6 passed

   Total   : 15 passed, 0 failed in 1.2s
   Coverage: agents/ 87%  routers/ 91%

   Coverage report: apps/ai-agents/htmlcov/index.html
   ```

4. On failure, show traceback, expected vs actual, and suggest a fix.

## Notes

- Unit tests mock the LLM client — no API key needed.
- Integration tests hit real Postgres and Redis — requires Docker infra up.
- Coverage target is 80% minimum per module.
- Run `pytest --co -q` to list all collected tests without running them.
