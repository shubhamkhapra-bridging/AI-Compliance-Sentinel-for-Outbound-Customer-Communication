# API — Run Tests

Run the Node.js API test suite using Vitest.

## Usage

```
/api-test [filter] [--watch] [--coverage]
```

## Examples

```
/api-test                          # run all tests
/api-test auth                     # run tests matching "auth"
/api-test --watch                  # watch mode
/api-test --coverage               # with coverage report
```

## Steps

1. Run Vitest:
   ```bash
   # All tests
   cd apps/api && npm test

   # Filter by name
   cd apps/api && npx vitest run --reporter=verbose <filter>

   # Watch mode
   cd apps/api && npm run test:watch

   # Coverage
   cd apps/api && npx vitest run --coverage
   ```

2. Display results:
   ```
   TEST RESULTS — API
   ==================
   ✅ auth.test.ts          — 8 passed
   ✅ templates.test.ts     — 12 passed
   ✅ campaigns.test.ts     — 6 passed
   ✅ contacts.test.ts      — 9 passed

   Total : 35 passed, 0 failed
   Time  : 2.4s
   ```

3. On failure, show test name, expected vs received, and file:line.

## Notes

- Tests use Vitest — similar to Jest but faster with native ESM support.
- Database tests require `postgres_db` to be running (integration tests).
- Unit tests mock Prisma client via `vi.mock('@prisma/client')`.
- Coverage report opens at `apps/api/coverage/index.html`.
