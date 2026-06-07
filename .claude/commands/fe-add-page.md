# Frontend — Add Page

Scaffold a new page in the React app with routing, layout, and API data fetching wired up.

## Usage

```
/fe-add-page <PageName> <route> <description>
```

## Examples

```
/fe-add-page Templates /templates "Browse and manage email templates"
/fe-add-page Settings /settings "User account and notification settings"
/fe-add-page CampaignDetail /campaigns/:id "View a single campaign with stats"
```

## What Gets Generated

1. **`apps/web/src/pages/<PageName>.tsx`** — Full page component:
   - React Query `useQuery` for data fetching
   - Loading skeleton state
   - Error boundary state
   - Empty state
   - Responsive layout using existing Tailwind classes

2. **Route registration** — Instructions to add to `apps/web/src/App.tsx`:
   ```tsx
   <Route path="<route>" element={<PageName />} />
   ```

3. **Nav link** — Instructions to add to `apps/web/src/components/Layout.tsx` sidebar

4. **API client method** — Skeleton added to `apps/web/src/api/client.ts` if a new endpoint is needed

## Generated Page Template

```tsx
// apps/web/src/pages/<PageName>.tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '../api/client'

export default function <PageName>() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['<pageName>'],
    queryFn: () => api.get('<route>'),
  })

  if (isLoading) return <div className="animate-pulse">Loading...</div>
  if (error) return <div className="text-red-500">Failed to load data.</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4"><PageName></h1>
      {/* TODO: implement page content */}
    </div>
  )
}
```

## Conventions to Follow

- Use `@tanstack/react-query` for all server state — no raw `useEffect` fetching
- Use `lucide-react` for icons (matches existing pages)
- Use Tailwind utility classes — no custom CSS files
- Co-locate page-specific types inline unless shared across 2+ pages
- Protected pages: wrap with auth check from `useAuthStore` hook
