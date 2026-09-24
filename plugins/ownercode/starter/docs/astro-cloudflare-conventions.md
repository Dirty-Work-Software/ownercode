# Astro + Cloudflare Workers Conventions

Read before touching `src/`, `functions/`, `public/`, or `wrangler.jsonc`. Trimmed from a production site's conventions doc; every gotcha here was hit for real. Version numbers live in `docs/versions.md`.

## Start a new project (task 001)

Task 001 follows these steps in order. Every command here was run on Windows in a folder that already held the Ownercode files. Use the Bash tool (Git Bash) for all of them. Tick task 001's criteria as you prove them.

1. **Setup check.** Run `git --version`, `node --version`, `pnpm --version`, `gh auth status`, `npx wrangler whoami`. For anything missing or not signed in, offer to drive it: if you can control the owner's browser (in Claude Code, the Claude in Chrome extension), open the right page, walk them to the exact click, and stop at every password, key, payment or terms screen for them to do. If you cannot, name the one page to open and what to click. If a tool is missing only inside your own sandbox, say that. Do not tell the owner their install is broken.
2. **Branch.** `git branch --show-current` must print `main`. If it prints `master`, run `git branch -m master main`. The guards and the docs assume `main`.
3. **Scaffold beside the kit files, not over them.** This folder is not empty, so a plain `pnpm create astro@latest .` silently builds the app in a random subfolder. Build it in `.scaffold` and move it up:
   ```
   pnpm create astro@latest .scaffold --yes --template minimal --no-install --no-git
   rm .scaffold/AGENTS.md .scaffold/CLAUDE.md .scaffold/README.md .scaffold/.gitignore
   (shopt -s dotglob && mv -n .scaffold/* .)
   rmdir .scaffold
   ```
   The template ships its own `AGENTS.md`, `CLAUDE.md`, `README.md` and `.gitignore`. The `rm` line removes them, so the kit's rules file stays the only one. The kit's `.gitignore` already covers the template's lines. If `rmdir` fails, a file was left behind because the root already had one with that name: list it and ask the owner. Then set `"name"` in `package.json` to the project name (the template writes `scaffold`).
4. **Install.**
   ```
   pnpm add @astrojs/preact preact @astrojs/sitemap tailwindcss @tailwindcss/vite
   pnpm add -D wrangler vitest @playwright/test @cloudflare/workers-types typescript@^6 @astrojs/check
   pnpm approve-builds esbuild workerd
   pnpm exec playwright install chromium
   ```
   `typescript@^6`: `astro check` refuses TypeScript 7. `pnpm approve-builds`: pnpm 11 ends each `pnpm add` with `ERR_PNPM_IGNORED_BUILDS` and exit code 1, although the packages did install. That is expected here; the next line approves esbuild and workerd. From here on, `npx wrangler` runs the project's own wrangler, not an older global copy.
5. **Pick this project's port.** A number from 8800 to 8999 that nothing uses (`netstat -ano | grep :<port>` prints nothing). Put it in `wrangler.jsonc` (`dev.port`) and `playwright.config.ts` (`PORT`). A second project on the same computer then never answers this project's tests.
6. **Write the files** exactly as the sections below show: `astro.config.mjs`, both `tsconfig.json` files, `wrangler.jsonc`, `public/.assetsignore`, `src/styles/global.css`, `functions/_middleware.ts`, `functions/api/health.ts`, the Preact island and page under "The first page" below, `playwright.config.ts`, the smoke test, `vitest.config.ts` with one unit test, and the `package.json` scripts.
7. **Database.** `npx wrangler d1 create <project>-db` and paste the id into `wrangler.jsonc`. Create `migrations/0001_init.sql` for the record types in `docs/plan-v1.md`, shaped by `docs/data-model.md`: for each recorded entry, follow its `## Notes for the agent` (the entry files are in the `decision-interview-basic` skill's `entries/` folder). If the paid decision-interview skill is installed, run its step 6 instead (it runs `plan.mjs --verify` first). Apply it with `npx wrangler d1 migrations apply DB --local`, then `--remote` (the guard asks the owner first).
8. **Checks.** Run `pnpm run build`, `pnpm run typecheck`, `pnpm run test`, `pnpm run smoke`, `pnpm run deploy:check`. Show the output. Fix anything red at its root cause. The smoke test must see the island show the server's answer, not only a page that loads.
9. **Commit** with the `commit` skill.
10. **Deploy.** `pnpm run deploy`. The guard asks the owner first; tell them one line on what it does. Give the `*.workers.dev` URL, open it in your browser tool, and confirm the island shows the server's answer. Say it in words: the owner cannot see your screenshots.
11. **GitHub.** `gh repo create <project> --private --source=. --remote=origin --push`.
12. **Guard test.** Run `git commit --allow-empty --no-verify -m test` once, with no prefix. It must print a line starting `BLOCK:`. Tell the owner in one plain sentence that the safety guard stopped it. Do not offer a way around it. If it is not blocked, stop and tell the owner the guards are off.
13. **AGENTS.md.** Fill in the project name, the one-paragraph description, the folder map, the D1 binding name and the port in "How to run it on your computer". Delete anything that does not apply. Leave `CLAUDE.md` as the one line `@AGENTS.md`. Commit.
14. **Close and stop.** Run the `close-task` skill on task 001. Then stop and report in plain English: what works, the check output, the live URL, and the next task. Do not start the next task in this session.

## Scripts (`package.json`)

```json
"scripts": {
  "dev": "pnpm run build && wrangler dev",
  "build": "astro build && wrangler pages functions build --outdir=./dist/_worker.js/",
  "typecheck": "astro check && tsc -p functions",
  "test": "vitest run",
  "smoke": "pnpm run build && playwright test",
  "deploy:check": "pnpm run build && wrangler deploy --dry-run",
  "deploy": "pnpm run build && wrangler deploy",
  "astro": "astro"
}
```

- `pnpm run dev` is how the app runs on this computer: pages and API together, at `http://localhost:<port>`. It does not watch for changes. After an edit, stop it and run it again.
- Never use `astro dev` (the template's old `dev`) to look at the app. It serves the pages but not `functions/`, so every `/api/...` call returns 404 and the screens show errors.
- The functions build is chained inside `build`, so every script that builds also builds the Worker. Keep it in one line; do not split it into a `postbuild` script.
- `deploy:check` finds deploy errors with no Cloudflare account and uploads nothing. Run it before any real deploy.

## Running and stopping a local server

- Start a server with your tool's background option, and stop it with the same tool.
- If a port is still held: find its PID (`netstat -ano | grep :<port>`), check that the process path is inside this project, then follow its parent PIDs up to the top process you started, and stop that one with `taskkill /T /F /PID <pid>`. Stopping only the process on the port is not enough: wrangler starts a new one.
- Never stop processes by name or by a command-line match (`Stop-Process -Name`, `taskkill /IM`, `pkill`, `killall`). That kills other projects and other AI sessions on the computer, and it can kill your own session.

## astro.config.mjs

```js
import { defineConfig } from 'astro/config';
import preact from '@astrojs/preact';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  output: 'static',
  site: 'https://example.com',
  integrations: [preact(), sitemap()],
  vite: { plugins: [tailwindcss()] },
  security: { csp: true },
});
```

Do NOT add `@astrojs/cloudflare`. Do NOT add `@astrojs/tailwind` (deprecated, breaks on v4). `security: { csp: true }` is the script security policy: see Middleware below. The build then warns that Shiki syntax highlighting is not compatible with it. Ignore that unless the site shows code blocks.

`tsconfig.json` (root):

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "functions"],
  "compilerOptions": { "jsx": "react-jsx", "jsxImportSource": "preact" }
}
```

`functions/tsconfig.json` (the Worker types stay out of the islands' typing):

```json
{
  "compilerOptions": {
    "target": "ES2022", "module": "ES2022", "moduleResolution": "Bundler",
    "strict": true, "noEmit": true, "skipLibCheck": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["./**/*.ts"]
}
```

Path aliases (`@components/*`, `@layouts/*`, `@lib/*`) go in the root file when you want them.

## Tailwind v4

`src/styles/global.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand: #1a56db;
  --font-body: "Inter", system-ui, sans-serif;
}
```

Import it once in the base layout. No `postcss.config`, no `autoprefixer`.

Gotcha: `@apply` inside an Astro scoped `<style>` fails with "unknown utility class." Add `@reference "../styles/global.css";` at the top of that style block, or use utility classes in markup instead.

## Astro vs Preact: the hard rule

- Static content: `.astro` component. Zero JS shipped.
- Needs state, events, fetch, timers: `.tsx` Preact island.
- Island directives: `client:visible` (default) or `client:idle`. `client:load` only with a comment explaining why.
- Gotcha: `client:visible` never fires on a zero-height element. Give the island a min-height or use `client:idle`.
- Islands cannot import `.astro` files. Pass data as props (must be JSON-serializable).
- Preact islands fetch data from `/api/...`. They never touch D1 directly.
- No inline `style="..."` attributes: the script security policy blocks them. Use Tailwind classes.

## Content collections (if the site has blog/docs pages)

Schema in `src/content.config.ts`, `loader: glob(...)`, `z` from `astro/zod`, everything else from `astro:content`. Use `entry.id`, not `entry.slug`.

## Cloudflare Functions (source in `functions/`, runs as one Worker)

**URL mapping:** `functions/api/contacts.ts` answers `/api/contacts`. `functions/api/contacts/[id].ts` answers `/api/contacts/123`. `functions/_middleware.ts` runs on every request.

**Export shape:** `PagesFunction` and `D1Database` are global types from `functions/tsconfig.json`, so no import is needed.

```ts
interface Env {
  DB: D1Database;
  PROJECT_NAME: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM contacts').first<{ n: number }>();
  return Response.json({ ok: true, data: { project: env.PROJECT_NAME, rows: row?.n ?? 0, time: new Date().toISOString() } });
};
```

That is `functions/api/health.ts`. It returns the project name, so a check can tell this project's server from another one on the same port.

**Env split (critical):** `import.meta.env.X` in Astro at build time. `context.env.X` in functions at request time. Never `process.env` in a Worker. Never read a secret at build time.

**Runtime:** Web APIs only. `fetch`, `crypto.subtle`, `URL`, `TextEncoder`. No `fs`, `path`, `Buffer` (unless `nodejs_compat` and you know why).

**Secrets:** read each one through a helper that stops with an error when it is missing. Never a fallback value in code: a fallback that is in git is public, and the live site would use it with no warning.

```ts
export function secret(env: object, name: string): string {
  const v = (env as Record<string, unknown>)[name];
  if (typeof v !== 'string' || v === '') throw new Error(`Missing secret ${name}. Run: npx wrangler secret put ${name}`);
  return v;
}
```

On this computer, `wrangler dev` reads secrets from `.dev.vars` (gitignored). A secret that can be random (a login or session signing secret): run `node .ownercode/dev-secret.mjs NAME`, which adds a random value and never shows it. A real key from a company: tell the owner the exact line to add to `.dev.vars` in their own editor. Never ask for the value in chat. For the live site, the owner runs `npx wrangler secret put NAME`.

**Build:** `astro build`, then `wrangler pages functions build --outdir=./dist/_worker.js/`. The result at `dist/_worker.js/index.js` is what `wrangler deploy` ships.

**`public/.assetsignore` holds one line, `_worker.js`.** `dist/` is both the public files folder and where the Worker is built. Without this file, wrangler refuses to deploy (`Uploading a Pages _worker.js directory as an asset`). Its error offers two fixes. Never take the one that says to add an empty `.assetsignore`: with an empty file, the server code is served to anyone at `/_worker.js/index.js` (tested: HTTP 200 with the code). Astro copies `public/.assetsignore` into `dist/` at build time.

## The first page

`src/components/Health.tsx`:

```tsx
import { useEffect, useState } from 'preact/hooks';

export default function Health() {
  const [text, setText] = useState('Checking...');
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((j) => setText(j.ok ? `Server OK: ${j.data.project}, ${j.data.rows} rows` : 'Server error'))
      .catch(() => setText('Server unreachable'));
  }, []);
  return <p data-testid="health">{text}</p>;
}
```

`src/pages/index.astro` imports `../styles/global.css` and `../components/Health.tsx`, and puts `<Health client:idle />` in the body.

## wrangler.jsonc

```jsonc
{
  "name": "my-project",
  "main": "./dist/_worker.js/index.js",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS",
    "run_worker_first": true,
    "html_handling": "auto-trailing-slash",
    "not_found_handling": "404-page"
  },
  "d1_databases": [
    { "binding": "DB", "database_name": "my-project-db", "database_id": "PASTE_FROM_wrangler_d1_create" }
  ],
  "vars": { "PROJECT_NAME": "my-project" },
  "dev": { "port": 8811 },
  "observability": { "enabled": true }
}
```

- `run_worker_first: true` is mandatory. Without it, static HTML is served before the Worker and `_middleware.ts` never runs on pages.
- `html_handling: "auto-trailing-slash"` matches Astro's `dist/foo/index.html` output.
- `not_found_handling: "404-page"` serves `dist/404.html` with HTTP 404. Without it: blank body.
- `dev.port` is this project's own port (step 5 above).
- `vars` are public. Never put a secret there.
- Add `kv_namespaces`, `r2_buckets`, `triggers.crons`, `queues` as needed. Create each with the matching `npx wrangler <kind> create` and paste the id.

## Middleware

`functions/_middleware.ts` sets security headers on every response and, once auth exists, gates `/app/*` and `/api/*` behind a session check. Public pages and `/api/health` stay open.

```ts
export const onRequest: PagesFunction = async ({ next }) => {
  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('X-Content-Type-Options', 'nosniff');
  out.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  out.headers.set('X-Frame-Options', 'DENY');
  // script-src and style-src come from the <meta> tag Astro writes (security.csp in astro.config.mjs).
  // Never add default-src or script-src here: the two policies stack, and it would block every island.
  out.headers.set('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
  return out;
};
```

Why: Astro starts each Preact island with a small inline script. A header with `script-src 'self'` blocks those scripts, so no island runs, and a page-load test stays green. `'unsafe-inline'` makes it work but throws away most of the protection. With `security: { csp: true }`, Astro writes a `<meta>` policy that allows exactly its own scripts by their hash.

## Smoke tests (`playwright.config.ts`)

```ts
import { defineConfig } from '@playwright/test';

// This project's own port (also in wrangler.jsonc "dev.port"). Never reuse a server:
// another project on the same port would answer, and the test would pass against the wrong app.
const PORT = 8811;

export default defineConfig({
  testDir: 'tests/smoke',
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    command: `wrangler dev --port ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
```

`tests/smoke/home.spec.ts`:

```ts
import { test, expect } from '@playwright/test';

test('health endpoint answers for this project', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBe(true);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(body.data.project).toBe('my-project');
});

test('home page island runs and shows the server result', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('/');
  await expect(page.getByTestId('health')).toContainText('Server OK: my-project');
  expect(errors).toEqual([]);
});
```

- If the port is busy, the run stops with `is already used`. Find out what holds it (see "Running and stopping a local server"). Do not switch to `reuseExistingServer: true`.
- Never remove `webServer` to work around a sandbox. Then the tests pass only when someone remembers to start a server first.
- Every new screen gets a smoke test that waits for its island's data, not only for the page.

`vitest.config.ts`: `export default defineConfig({ test: { include: ['tests/unit/**/*.test.ts'] } })`, with `defineConfig` from `vitest/config`.

## D1

- Migrations in `migrations/NNNN_name.sql`. `npx wrangler d1 migrations apply DB --local` for dev, `--remote` for production.
- Never edit an applied migration. Add a new one.
- On Windows, `--local` fails from a deep project folder. The error reads `SQLITE_CANTOPEN` / `unable to open database file`, or only `internal error; reference = ...`. Nothing in it mentions the path. Fix: move the project to a short folder, such as `C:\Projects\<name>`. The Ownercode plugin's self-check warns at session start. The measured limit is in `docs/versions.md`.
- Use `prepare().bind()` for every value. Never string-concatenate SQL.
- Batch related writes with `env.DB.batch([...])` for atomicity.
- **Times:** store every date and time in UTC (ISO text, `2026-09-23T14:00:00Z`). The Worker's clock is UTC. Keep the business's time zone as one constant (`'Europe/London'`) and convert only for display and for reading what a person typed. A time stored as local time is off by an hour for half the year, and nobody reports it.
- Limits to know: 100k rows per query result, 1MB per row, 10GB per database on paid. Plenty for a small CRM.

## Calling Claude from a Worker

The model ids are in `docs/versions.md`.

```ts
async function ask(env: Env, use: string, prompt: string, model = 'claude-sonnet-5') {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: ctrl.signal,
      headers: {
        'content-type': 'application/json',
        'x-api-key': secret(env, 'ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({ model, max_tokens: 1024, messages: [{ role: 'user', content: prompt }] }),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}`);
    const j = await r.json();
    return j.content?.[0]?.text ?? '';
  } finally {
    clearTimeout(t);
  }
}
```

Every call has: a named `use` (for logging), a model choice, a timeout, and a caller that handles failure (show "AI unavailable," not a crash). Log each call's use, model, and token counts to a D1 table so cost is visible. For structured output, ask for JSON and validate it; do not trust the shape.

## Common mistakes

- Running `pnpm create astro` into a folder that is not empty.
- Adding the Cloudflare adapter because a tutorial did.
- `client:load` everywhere. Ship less JS.
- Reading D1 from an Astro page at build time. Build has no D1. Data comes through the API at runtime.
- Editing an applied migration.
- A Windows project folder so deep that the local database cannot open (`SQLITE_CANTOPEN`).
- Forgetting `run_worker_first`.
- An empty `public/.assetsignore`, or none.
- A `script-src` in the middleware header.
- Putting a secret in `wrangler.jsonc` `vars`, or a fallback secret in code.
- Node built-ins in `functions/`.
- Trailing-slash mismatch between links and `html_handling`.

## Last verified

2026-09-23, on Windows 11 with Node 22.15.0, pnpm 11.1.2, create-astro 5.2.4, astro 7.3.4, wrangler 4.136.3, TypeScript 6.0.3, Playwright 1.63.0. The "Start a new project" steps 2 to 8 were run in a scratch folder that held the Ownercode files: the app landed at the root, the kit's `AGENTS.md` stayed, build, typecheck, unit, smoke and `wrangler deploy --dry-run` passed, and the smoke test failed when the middleware header had `script-src 'self'`. A second run in a fresh folder, by a Sonnet agent with only this doc, passed steps 2 to 8 the same way. Steps 7's `--remote`, 10 and 11 were not run (no real deploy, no cloud command).
