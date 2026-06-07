# API — Database Seed

Populate the database with initial data: products, roles, demo users, sample templates, and contacts.

## Usage

```
/api-db-seed
```

## Steps

1. Verify migrations are up to date:
   ```bash
   cd apps/api && npx prisma migrate status
   ```
   Warn if there are pending migrations.

2. Run the seed script:
   ```bash
   cd apps/api && npx tsx prisma/seed.ts
   ```

3. Report what was seeded:
   ```
   SEED RESULT
   ===========
   ✅ 7 Products created (Denefits, Practina, Lendee, CoolCredit, Credee, FinanceMutual, Recuvery)
   ✅ 3 Roles created (admin, manager, agent)
   ✅ 2 Demo users created
       admin@bridgingtech.com  / password: Admin@123456
       agent@bridgingtech.com  / password: Agent@123456
   ✅ 12 Email templates seeded
   ✅ 50 Sample contacts seeded
   ✅ 3 Sample campaigns seeded
   ```

## Re-seeding

The seed script is idempotent — running it again will upsert existing records without duplicates (uses `upsert` with `where: { id }` or unique fields).

To fully reset and re-seed:
```bash
cd apps/api
npx prisma migrate reset   # ⚠ drops all data — dev only
npx tsx prisma/seed.ts
```

## Notes

- Demo credentials are for **development only** — never deploy seed data to production.
- To add new seed data, edit `apps/api/prisma/seed.ts` directly.
- Seed order matters — seed Products and Roles before Users.
