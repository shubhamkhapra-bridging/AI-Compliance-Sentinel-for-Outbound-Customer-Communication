# API — Database Migration

Run Prisma migrations to apply schema changes to the PostgreSQL database.

## Usage

```
/api-db-migrate [migration_name]
```

- No argument → applies all pending migrations
- With name → creates and applies a new migration

## Examples

```
/api-db-migrate                              # apply pending migrations
/api-db-migrate add_campaign_status_field    # create + apply new migration
/api-db-migrate --prod                       # production-safe deploy (no prompt)
```

## Steps

### Development (default)

```bash
# Verify postgres_db container is healthy first
docker ps --filter "name=postgres_db" --format "{{.Status}}"

# Create + apply migration
cd apps/api && npx prisma migrate dev --name <migration_name>

# Regenerate Prisma client
npx prisma generate
```

### Production

```bash
# Uses deploy (no interactive prompts, no schema drift check)
cd apps/api && npx prisma migrate deploy
```

## Output

```
MIGRATION RESULT
================
Status       : ✅ Applied
Migration    : 20260607120000_add_campaign_status_field
Database     : postgresql://localhost:5432/ai_compliance
Applied at   : 2026-06-07 12:00:00 UTC

Prisma client regenerated ✅
```

## Common Errors & Fixes

| Error | Fix |
|---|---|
| `P1001: Can't reach database` | Run `docker compose -f docker-compose.infra.yml up -d` |
| `P3006: Migration failed to apply` | Check SQL in `prisma/migrations/` for syntax errors |
| `Drift detected` | Run `prisma migrate reset` in dev only — destroys all data |

## Notes

- Never run `migrate dev` against production — use `migrate deploy`.
- Migration files in `apps/api/prisma/migrations/` must be committed to git.
- After adding a new model, always run `prisma generate` before starting the API.
