# Frontend — Type Check

Run TypeScript type checking across the entire frontend without emitting files.

## Usage

```
/fe-typecheck
```

## Steps

1. Run tsc in no-emit mode:
   ```bash
   cd apps/web && npx tsc --noEmit
   ```

2. Also check the shared package types:
   ```bash
   cd packages/shared && npx tsc --noEmit
   ```

3. Report results:
   ```
   TYPE CHECK RESULTS
   ==================
   apps/web      : ✅ No errors
   packages/shared: ✅ No errors
   ```

   Or if errors found:
   ```
   TYPE CHECK RESULTS
   ==================
   apps/web: ❌ 2 errors

   src/pages/Compose.tsx:34:12
     Type 'string | undefined' is not assignable to type 'string'

   src/api/client.ts:78:5
     Property 'data' does not exist on type 'AxiosError'
   ```

4. For each error, suggest the fix inline.

## Notes

- Run before every commit or PR — CI will fail on type errors.
- `tsconfig.json` in `apps/web` uses strict mode — no implicit `any`.
- Shared types from `packages/shared/src` are available as `@ai-sentinel/shared`.
