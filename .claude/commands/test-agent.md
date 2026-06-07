# Test Agent

Run unit and integration tests for a specific agent, or the full test suite.

## Usage

```
/test-agent [agent_name] [--integration] [--coverage]
```

## Examples

```
/test-agent                           # run all unit tests
/test-agent compliance                # test ComplianceAgent only
/test-agent deliverability --coverage
/test-agent sending --integration     # requires running services
```

## Steps

1. Resolve the test file path:
   - `apps/ai-agents/tests/unit/test_<agent_name>_agent.py` for unit tests
   - `apps/ai-agents/tests/integration/test_<agent_name>_agent.py` for integration

2. Activate the virtual environment if not already active:
   ```bash
   # Windows
   apps/ai-agents/.venv/Scripts/activate
   # macOS/Linux
   source apps/ai-agents/.venv/bin/activate
   ```

3. Run pytest with appropriate flags:
   ```bash
   # Unit tests only
   pytest apps/ai-agents/tests/unit/test_<agent_name>_agent.py -v

   # With coverage
   pytest apps/ai-agents/tests/unit/test_<agent_name>_agent.py -v \
     --cov=apps/ai-agents/agents/<agent_name>_agent \
     --cov-report=term-missing

   # Integration (requires running Docker infra)
   pytest apps/ai-agents/tests/integration/ -v --env=test
   ```

4. Display a clean test summary:
   ```
   TEST RESULTS — ComplianceAgent
   ================================
   test_gdpr_missing_unsubscribe  PASSED
   test_canspam_missing_address   PASSED
   test_brand_voice_violation     PASSED
   test_clean_email_passes        PASSED
   test_empty_body_raises_error   PASSED

   Results : 5 passed in 0.43s
   Coverage: 94%
   ```

5. If any test fails, show the full traceback and suggest a fix.
6. If `--coverage` and coverage < 80%, warn and list uncovered lines.

## Notes

- Always run unit tests before pushing agent changes.
- Integration tests require `DATABASE_URL`, `REDIS_URL` healthy in Docker.
- Claude automatically adds `-x` (fail-fast) when a previous run had failures.
