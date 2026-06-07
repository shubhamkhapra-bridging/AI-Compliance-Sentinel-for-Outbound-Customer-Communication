# Test Agent

Run unit and integration tests for a specific agent, or the full test suite.

## Usage

```
/test-agent [agent_name] [--integration] [--coverage]
```

## Examples

```
/test-agent                          # run all unit tests
/test-agent compliance               # test ComplianceAgent only
/test-agent deliverability --coverage
/test-agent sending --integration    # requires running services
```

## Steps

1. Resolve the test file path:
   - `tests/unit/test_<agent_name>_agent.py` for unit tests
   - `tests/integration/test_<agent_name>_agent.py` for integration tests

2. Run pytest with appropriate flags:
   ```bash
   pytest tests/unit/test_<agent_name>_agent.py -v
   pytest tests/unit/test_<agent_name>_agent.py -v --cov=agents/<agent_name>_agent --cov-report=term-missing
   pytest tests/integration/test_<agent_name>_agent.py -v --env=test
   ```

3. Display a clean test summary:
   ```
   TEST RESULTS — ComplianceAgent
   ================================
   tests/unit/test_compliance_agent.py::test_gdpr_missing_unsubscribe  PASSED
   tests/unit/test_compliance_agent.py::test_canspam_missing_address    PASSED
   tests/unit/test_compliance_agent.py::test_brand_voice_violation      PASSED
   tests/unit/test_compliance_agent.py::test_clean_email_passes         PASSED
   tests/unit/test_compliance_agent.py::test_empty_body_raises_error    PASSED

   Results: 5 passed in 0.43s
   Coverage: 94%
   ```

4. If any test fails, show the full traceback and suggest a fix.

5. If `--coverage` and coverage < 80%, warn and suggest which lines to cover.

## Notes

- Always run unit tests before pushing any agent changes.
- Integration tests require `DATABASE_URL`, `REDIS_URL`, and email provider credentials in `.env.test`.
- Use `pytest -x` flag (fail fast) when debugging — Claude adds this automatically when a previous run had failures.
