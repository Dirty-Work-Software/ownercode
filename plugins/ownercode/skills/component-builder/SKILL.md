---
name: component-builder
description: Use when creating or changing UI: an Astro page, an Astro component, or a Preact island (.tsx) that shows or edits data.
---

# Component Builder

## Astro or Preact? Decide first.

| Need | Use |
|---|---|
| Shows fixed text, images, links | `.astro` component. Zero JS. |
| Reacts to clicks, typing, timers, or fetches data | `.tsx` Preact island. |
| A page | `src/pages/<route>.astro`, wrapping a layout, placing islands. |

Never make a whole page an island. Islands are the interactive parts only.

## Island pattern

```tsx
// src/components/ContactList.tsx
import { useEffect, useState } from 'preact/hooks';

type Contact = { id: number; name: string; email: string | null };

export default function ContactList() {
  const [rows, setRows] = useState<Contact[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/contacts')
      .then(r => r.json())
      .then(j => (j.ok ? setRows(j.data) : setError(j.error)))
      .catch(() => setError('Could not load contacts'));
  }, []);

  if (error) return <p class="text-red-700">{error}</p>;
  if (!rows) return <p class="text-gray-500">Loading...</p>;
  if (rows.length === 0) return <p class="text-gray-500">No contacts yet.</p>;

  return (
    <ul class="divide-y">
      {rows.map(c => (
        <li key={c.id} class="py-2 flex justify-between">
          <span>{c.name}</span>
          <span class="text-gray-500">{c.email ?? ''}</span>
        </li>
      ))}
    </ul>
  );
}
```

Place it: `<ContactList client:visible />` in an `.astro` page. Give the wrapper a `min-h-` so `client:visible` fires.

## Rules

1. `client:visible` or `client:idle`. `client:load` needs a comment saying why.
2. Every island has four states: loading, error, empty, data. Write all four. Empty is the one people forget, and an empty list that looks like "no data" hides a broken endpoint.
3. Props must be JSON-serializable. No functions, no Dates (send ISO strings).
4. Islands talk to `/api/*` only. Never import server code.
5. Tailwind utilities in markup. Brand colors from `@theme` tokens (`bg-brand`, `text-brand`). No hex in components.
6. Forms: one Save, one Cancel, disable Save while submitting, show the server's error text on failure.
7. Accessibility floor: every input has a `<label>`, every icon-only button has `aria-label`, focus is visible, color is never the only signal.
8. Use `class`, not `className` (Preact accepts both; be consistent).
9. Icons: `lucide-preact`.
10. Add a smoke test in `tests/smoke/` that loads the page and finds the island's heading or first row.
11. Follow `docs/ui-basics.md` for spacing, type, color, forms and tables. Its four island states and its accessibility floor are not optional: an island missing loading, error, empty or data is not finished.
