# API — Add Route

Scaffold a new Express route handler with validation, auth middleware, and Prisma query wired up.

## Usage

```
/api-add-route <resource> <method> <path> <description>
```

## Examples

```
/api-add-route templates GET /api/v1/templates/:id "Get a single template by ID"
/api-add-route campaigns POST /api/v1/campaigns "Create a new campaign"
/api-add-route contacts DELETE /api/v1/contacts/:id "Soft-delete a contact"
```

## What Gets Generated

1. **Route handler** added to `apps/api/src/routes/<resource>.ts`:
   - `express-validator` input validation
   - Auth middleware applied (`requireAuth`)
   - Prisma query with proper error handling
   - Consistent JSON response shape

2. **Route registration** — instruction to add to `apps/api/src/app.ts` if the file is new

## Generated Handler Template

```typescript
// GET /api/v1/<resource>/:id
router.get(
  '/:id',
  requireAuth,
  [param('id').isUUID()],
  async (req: Request, res: Response) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() })
    }

    const record = await prisma.<resource>.findUnique({
      where: { id: req.params.id },
    })

    if (!record) {
      return res.status(404).json({ error: '<Resource> not found' })
    }

    res.json({ data: record })
  }
)
```

## Response Shape Convention

Always use this envelope — matches the existing routes:

```json
// Success
{ "data": { ... } }
{ "data": [ ... ], "total": 100, "page": 1, "limit": 20 }

// Error
{ "error": "Human-readable message", "code": "ERROR_CODE" }
```

## Notes

- Always apply `requireAuth` middleware unless the route is explicitly public (e.g., `/health`, `/auth/login`).
- Use `express-validator` for request validation — never trust raw `req.body`.
- Prisma throws `PrismaClientKnownRequestError` on constraint violations — catch and return 409.
- Log errors via `logger.error()` (Winston) — never use `console.log`.
