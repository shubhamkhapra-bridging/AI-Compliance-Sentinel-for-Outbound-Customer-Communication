# API — Prisma Studio

Open Prisma Studio — a visual database browser for PostgreSQL directly in the browser.

## Usage

```
/api-db-studio
```

## Steps

1. Verify `postgres_db` container is healthy:
   ```bash
   docker ps --filter "name=postgres_db" --format "{{.Status}}"
   ```

2. Launch Prisma Studio:
   ```bash
   cd apps/api && npx prisma studio
   ```

3. Opens automatically at: **`http://localhost:5555`**

## What You Can Do in Prisma Studio

- Browse all 10 database domains (Users, Teams, Products, Contacts, Templates, Campaigns, Emails, ApprovalRequests, AgentInvocations, AuditLogs)
- View, filter, and sort records
- Edit individual field values
- Add new records manually
- Delete records (use with caution)
- Follow relations between models

## Notes

- Prisma Studio runs against the `DATABASE_URL` in your `.env` — it connects to `localhost:5432` by default.
- Use pgAdmin (`http://localhost:5050`) for raw SQL queries, schema inspection, and bulk operations.
- Studio is for development only — do not expose port 5555 in production.
