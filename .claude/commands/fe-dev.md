# Frontend — Start Dev Server

Start the React/Vite frontend in development mode with hot-module replacement.

## Usage

```
/fe-dev
```

## Steps

1. Verify dependencies are installed:
   ```bash
   ls apps/web/node_modules > /dev/null 2>&1 || npm install --workspace=apps/web
   ```

2. Check that the API is reachable (optional warning if not):
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:4000/health
   ```
   If API is not up, warn: "API is not running — login and data fetching will fail."

3. Start Vite dev server:
   ```bash
   cd apps/web && npm run dev
   ```

4. Confirm server started:
   ```
   Frontend running at: http://localhost:3000

   Pages:
     /login        — Authentication
     /             — Dashboard
     /compose      — AI Email Composer
     /campaigns    — Bulk Campaigns
     /contacts     — Contact Management
     /approvals    — Approval Queue
     /analytics    — Email Analytics

   Hot reload: enabled
   API target: http://localhost:4000/api/v1
   ```

## Notes

- Port is fixed at 3000 (set in `apps/web/package.json`).
- Environment variable `VITE_API_URL` controls the API base URL (set in root `.env`).
- Tailwind CSS rebuilds automatically on file save.
