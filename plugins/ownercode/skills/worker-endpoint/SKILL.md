---
name: worker-endpoint
description: Use when adding or changing an API route under functions/api/ (a Cloudflare Worker endpoint that reads or writes D1, R2, KV, or calls the Anthropic API).
---

# Worker Endpoint

## Where

`functions/api/<name>.ts` answers `/api/<name>`. `functions/api/<name>/[id].ts` answers `/api/<name>/:id`. Shared helpers start with `_` (`functions/api/_db.ts`) so they do not become routes.

## Shape

```ts
import type { PagesFunction } from '@cloudflare/workers-types';
import type { Env } from './_env';          // one shared Env interface
import { json, bad } from './_response';    // { ok, data } / { ok:false, error }

export const onRequestGet: PagesFunction<Env> = async ({ env, request }) => {
  const url = new URL(request.url);
  const q = url.searchParams.get('q') ?? '';
  const { results } = await env.DB
    .prepare('SELECT id, name, email FROM contacts WHERE name LIKE ? ORDER BY name LIMIT 100')
    .bind(`%${q}%`)
    .all();
  return json(results);
};

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const body = await request.json().catch(() => null);
  if (!body || typeof body.name !== 'string' || body.name.length > 200) return bad('name required');
  const r = await env.DB
    .prepare('INSERT INTO contacts (name, email) VALUES (?, ?) RETURNING id')
    .bind(body.name, body.email ?? null)
    .first();
  return json({ id: r?.id });
};
```

## Rules

1. Validate every input at the top. Reject with 400 and a plain message. Never trust the shape of a JSON body.
2. Every SQL value goes through `.bind()`. Never build SQL from strings.
3. Return JSON with one stable shape: `{ ok: true, data }` or `{ ok: false, error }`. Islands depend on it.
4. Web APIs only. No `fs`, `path`, `Buffer`, `process`.
5. Secrets through the `secret(env, NAME)` helper in `docs/astro-cloudflare-conventions.md`, which stops with an error when the secret is missing. Never hardcoded, never a fallback value, never in `vars`.
6. Multi-row writes that must succeed together: `env.DB.batch([...])`.
7. Anything slow (AI call, external API): 20s timeout via `AbortController`, and a fallback response the island can show.
8. Auth-gated routes: check the session in `functions/_middleware.ts`, not in each endpoint.
9. Log failures with `console.error` and a short tag (`[contacts.post]`). Workers observability picks them up.
10. Add one smoke test in `tests/smoke/` that hits the endpoint and checks `ok: true`. Non-trivial logic gets one Vitest unit test with the D1 call stubbed.

## Test locally

```
pnpm run dev
```

Then `curl http://localhost:<port>/api/<name>`, with this project's port from `wrangler.jsonc` (`dev.port`). `.dev.vars` supplies local secrets. `npx wrangler d1 migrations apply DB --local` first if the schema changed. Stop the server when done (see "Running and stopping a local server" in the conventions doc).
