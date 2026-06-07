# Python — Lint & Format

Run Ruff linter and formatter across the AI Agents service.

## Usage

```
/py-lint [--fix] [path]
```

## Examples

```
/py-lint                        # lint check only (no changes)
/py-lint --fix                  # auto-fix safe issues
/py-lint agents/compliance_agent.py   # lint a single file
```

## Steps

1. Activate the venv:
   ```bash
   # Windows
   apps/ai-agents/.venv/Scripts/activate
   ```

2. Run Ruff lint check:
   ```bash
   cd apps/ai-agents

   # Check only
   ruff check . --select=E,W,F,I

   # Auto-fix
   ruff check . --select=E,W,F,I --fix

   # Format check
   ruff format . --check

   # Auto-format
   ruff format .
   ```

3. Optionally run mypy for type checking:
   ```bash
   mypy agents/ routers/ --ignore-missing-imports
   ```

4. Display results:
   ```
   LINT RESULTS
   ============
   Ruff lint   : ✅ 0 issues
   Ruff format : ✅ All files formatted
   Mypy        : ✅ No type errors

   --- or if issues found ---

   Ruff lint   : ❌ 3 issues

   agents/compliance_agent.py:45:12  E501  Line too long (92 > 88)
   routers/draft.py:23:1             F401  'os' imported but unused
   routers/risk.py:67:5              E711  Comparison to None (use 'is None')
   ```

5. If `--fix` was used, list what was auto-fixed vs what needs manual attention.

## Ruff Rules Used

| Code | Category |
|---|---|
| E | pycodestyle errors |
| W | pycodestyle warnings |
| F | Pyflakes (unused imports, undefined names) |
| I | isort (import ordering) |

## Notes

- Ruff is 10–100x faster than flake8/black — runs in milliseconds even on large codebases.
- The `dot-claude/settings.json` hook runs Ruff automatically after every `Write`/`Edit` on `.py` files.
- If Ruff is not installed: `pip install ruff` inside the venv.
