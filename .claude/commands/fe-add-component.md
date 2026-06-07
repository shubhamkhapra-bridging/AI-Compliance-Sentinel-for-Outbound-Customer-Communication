# Frontend — Add Component

Scaffold a new reusable React component with TypeScript props interface and Tailwind styling.

## Usage

```
/fe-add-component <ComponentName> <description>
```

## Examples

```
/fe-add-component StatusBadge "Show a colored badge for email/campaign status"
/fe-add-component ComplianceScore "Display a circular score ring with color coding"
/fe-add-component EmailPreview "Render email subject and body preview in a card"
/fe-add-component RiskIndicator "Show LOW / MEDIUM / HIGH risk with icon and color"
```

## What Gets Generated

**`apps/web/src/components/<ComponentName>.tsx`**:
- TypeScript `Props` interface (exported)
- Tailwind-based styling
- Sensible defaults for all optional props
- JSX structure matching the existing component style in `Layout.tsx`

## Generated Template

```tsx
// apps/web/src/components/<ComponentName>.tsx

interface <ComponentName>Props {
  // TODO: define props
  className?: string
}

export function <ComponentName>({ className }: <ComponentName>Props) {
  return (
    <div className={`/* base styles */ ${className ?? ''}`}>
      {/* TODO: implement */}
    </div>
  )
}
```

## Conventions to Follow

- Named exports only (no default export for components)
- Props interface named `<ComponentName>Props` and exported
- Accept optional `className` for extension
- Use `clsx` for conditional class merging (already installed)
- No internal state unless truly necessary — prefer props
- Use `lucide-react` icons to match the existing design system
