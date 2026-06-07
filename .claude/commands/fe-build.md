# Frontend — Production Build

Compile and bundle the React app for production deployment.

## Usage

```
/fe-build
```

## Steps

1. Run TypeScript type check before building:
   ```bash
   cd apps/web && npx tsc --noEmit
   ```
   Stop and show errors if type check fails.

2. Run Vite production build:
   ```bash
   cd apps/web && npm run build
   ```
   Output goes to `apps/web/dist/`.

3. Report build result:
   ```
   BUILD RESULT
   ============
   Status    : ✅ Success
   Output    : apps/web/dist/
   Bundle    :
     index.html       0.5 kB
     assets/index.js  284 kB (gzipped: 91 kB)
     assets/index.css  42 kB (gzipped: 8 kB)
   TypeScript: ✅ No errors
   ```

4. Optionally preview the production build locally:
   ```bash
   cd apps/web && npm run preview
   # Runs at http://localhost:4173
   ```

## Notes

- Production builds use `import.meta.env.VITE_API_URL` — set this in `.env` or CI.
- The Nginx `Dockerfile` (`apps/web/Dockerfile`) copies `dist/` automatically on `docker build`.
- Check `apps/web/vite.config.ts` for chunk splitting and alias configuration.
