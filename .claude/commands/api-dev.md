# API — Start Dev Server

Start the Node.js/Express API in development mode with hot reload via `tsx watch`.

## Usage

```
/api-dev
```

## Steps

1. Verify Docker infra is running:
   ```bash
   docker ps --filter "name=postgres_db" --filter "name=redis_server" \
     --format "{{.Names}}: {{.Status}}"
   ```
   Warn if either is not healthy.

2. Verify `.env` is present and `DATABASE_URL` is set:
   ```bash
   grep -q "DATABASE_URL" .env || echo "WARNING: .env not configured"
   ```

3. Ensure Prisma client is generated:
   ```bash
   cd apps/api && npx prisma generate
   ```

4. Start the API with hot reload:
   ```bash
   cd apps/api && npm run dev
   ```

5. Confirm startup:
   ```
   API server running at: http://localhost:4000
   Environment         : development
   Database            : ✅ Connected (postgresql://localhost:5432/ai_compliance)
   Redis               : ✅ Connected (redis://localhost:6379)

   Routes:
     POST /api/v1/auth/login
     POST /api/v1/auth/register
     GET  /api/v1/contacts
     GET  /api/v1/campaigns
     GET  /api/v1/templates
     GET  /api/v1/approvals
     GET  /api/v1/analytics
     GET  /health
   ```

## Notes

- Hot reload via `tsx watch` — file saves restart automatically.
- Prisma schema changes require `npx prisma generate` to regenerate the client.
- BullMQ workers start automatically with the API process.
