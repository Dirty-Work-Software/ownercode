# UI Basics

## In plain English
A free screen should not look ugly. It should also not look like the paid tier's screens. This page is the short list of rules that stops the worst mistakes and does no more.

## Spacing
One scale: `1 2 3 4 6 8 12 16` (Tailwind's spacing steps, used as `p-4`, `gap-2`, `space-y-6`).
Nothing outside this list. No `p-5`, no `p-7`, no arbitrary values like `p-[13px]`.
Not sure which size fits? Pick the next one up. Too much space is safer than too little.

## Type
One scale of five sizes: `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`.
One page uses at most three of them. More than three sizes on one screen means the design has drifted.
Two weights: `font-normal` for body text, `font-semibold` for headings. (Weight means how thick the letters look.)
Two line heights: `leading-normal` for paragraphs, `leading-tight` for headings. (Line height is the space between lines of text.)

## Color
A neutral ramp (a ramp is a set of shades from light to dark) plus one brand color. The neutral ramp is Tailwind's built-in gray scale: `gray-50` (near white) to `gray-900` (near black). The brand color comes from the `@theme` block in `src/styles/global.css`:

```css
@theme {
  --color-brand: #1a56db;
  --font-body: "Inter", system-ui, sans-serif;
}
```

Use it as `bg-brand` or `text-brand` in markup. Never type a hex code into a component.
Color is never the only signal. An error also says "Error," not just red text. A required field also says "required," not just a red star.

## The four island states
An island is a small interactive piece of a page, any `.tsx` file. Every island shows exactly one of four states:

| State | What the user sees | Rule |
|---|---|---|
| Loading | "Loading..." in gray | Show it the instant the island appears |
| Error | The problem, in plain words | No stack traces, no error codes |
| Empty | "No [items] yet," in gray | Never leave the space blank |
| Data | The real content | |

A screen missing any of these four is not finished. No exceptions.

```tsx
if (error) return <p class="text-red-700">{error}</p>;
if (!data) return <p class="text-gray-500">Loading...</p>;
if (data.length === 0) return <p class="text-gray-500">No results yet.</p>;
return <DataView data={data} />;
```

## Forms
Every input has a visible `<label>`. A placeholder is not a label.
One Save button, one Cancel button. Save first, then Cancel, left to right.
A server error shows next to the field that caused it. More than one error? Add a short summary at the top too.
A disabled Save button must always say why, right next to it. Never disable it and leave the user guessing.

## Tables
Numbers are right-aligned. Everything else is left-aligned.
One action column (Edit, Delete), on the right.
No rows? Show the same empty state as an island (see above), not a blank table.

## Page shell
One layout for every page: a header, one column of content, and a max width so text does not stretch too wide.
No sidebars. No dashboards. No grid system.

## Accessibility floor
This list is never simplified away, not even for a tiny screen:
- Every input has a `<label>`.
- Every image has `alt` text (words that describe it for someone who cannot see it).
- Text meets the contrast minimum (contrast is how much text stands out from its background; aim for 4.5:1).
- Everything clickable works with the keyboard alone, no mouse needed.
- Focus is always visible (focus is the highlight that shows which element is selected when you press Tab).

## What this guide is not
- Not a component library, and not a set of reference screenshots.
- Not a design system: no shadow scale, no motion, no icon set.
- The paid tier has the full design system. This guide only stops the worst mistakes.

## Last verified
2026-09-21, against the `@theme` block in `docs/astro-cloudflare-conventions.md`.
