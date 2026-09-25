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
5. **Pick this project's own port.** Every project on this computer needs a different one, so never copy a port from an example or from another project. Work it out from the folder name:
   ```
   node -e "let h=0;for(const c of require('path').basename(process.cwd()))h=(h*31+c.charCodeAt(0))%200;console.log(8800+h)"
   ```
   It prints a number from 8800 to 8999. Check nothing uses it: `netstat -ano | grep :<port>` prints nothing. If something does, add 1 and check again. Put the number in `wrangler.jsonc` (`dev.port`) and `playwright.config.ts` (`PORT`), and tell the owner in one line: "This project runs at http://localhost:<port>. Another project on this computer uses a different number." A second project then never answers this project's tests.
6. **Write the files** exactly as the sections below show: `astro.config.mjs`, both `tsconfig.json` files, `wrangler.jsonc`, `public/.assetsignore`, `src/styles/global.css`, `functions/_middleware.ts`, `functions/api/health.ts`, the Preact island and the two pages under "The first page" below, `playwright.config.ts`, `tests/smoke/setup.mjs`, the smoke test, `vitest.config.ts` with one unit test, and the `package.json` scripts.
7. **Database.** `npx wrangler d1 create <project>-db` and paste the id into `wrangler.jsonc`. Create `migrations/0001_init.sql` for the record types in `docs/plan-v1.md`, shaped by `docs/data-model.md`: for each recorded entry, follow its `## Notes for the agent` (the entry files are in the `decision-interview-basic` skill's `entries/` folder). If the paid decision-interview skill is installed, run its step 6 instead (it runs `plan.mjs --verify` first). Apply it with `npx wrangler d1 migrations apply DB --local`, then `--remote` (the guard asks the owner first). Write `seed/demo.sql` with a few invented rows for each main record type and run `pnpm run db:seed` (see "Demo data" below), so the owner sees a working app before their real data is in.
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
  "db:migrate": "wrangler d1 migrations apply DB --local",
  "db:seed": "wrangler d1 execute DB --local --yes --file seed/demo.sql",
  "owner": "node scripts/make-owner.mjs",
  "deploy:check": "pnpm run build && wrangler deploy --dry-run",
  "deploy": "pnpm run build && wrangler deploy",
  "astro": "astro"
}
```

- `pnpm run dev` is how the app runs on this computer: pages and API together, at `http://localhost:<port>`. It does not watch for changes. After an edit, stop it and run it again.
- Never use `astro dev` (the template's old `dev`) to look at the app. It serves the pages but not `functions/`, so every `/api/...` call returns 404 and the screens show errors.
- The functions build is chained inside `build`, so every script that builds also builds the Worker. Keep it in one line; do not split it into a `postbuild` script.
- `deploy:check` finds deploy errors with no Cloudflare account and uploads nothing. Run it before any real deploy.
- `db:migrate` and `db:seed` touch this computer's database only. `owner` works once login exists (see "Login (Better Auth)").
- `wrangler pages functions build` warns that `node:async_hooks` and `node:crypto` need `nodejs_compat`. It does not read `wrangler.jsonc`, where the flag is set. Ignore that warning.

## Running and stopping a local server

- Start a server with your tool's background option, and stop it with the same tool.
- If a port is still held: find its PID (`netstat -ano | grep :<port>`). Then check whose it is:
  ```
  powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter 'ProcessId=<pid>' | Select-Object ProcessId,ParentProcessId,CommandLine"
  ```
  If the command line does not name this project's folder, it is another project's server or another AI session. Do not stop it. Tell the owner in one line, and use this project's own port. If it is this project's, follow its parent PIDs up to the top process you started and stop that one with its tree. In Git Bash: `taskkill //T //F //PID <pid>` (Git Bash turns `/T` into a folder path; `//T` reaches taskkill as `/T`). In PowerShell: `taskkill /T /F /PID <pid>`. Stopping only the process on the port is not enough: wrangler starts a new one. The process guard blocks a stop of a process that does not run from this project.
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

`src/pages/index.astro` imports `../styles/global.css` and `../components/Health.tsx`, and puts `<Health client:idle />` in the body, with a link above it: `<a href="/app/">Open the app</a>`. Every app screen must be reachable from the home page: an owner who types only the address must find the app.

`src/pages/app/index.astro` holds one line until the first screen replaces it: "The app's screens come here, one task at a time." The first screen task makes `/app/` its page (or links every screen from it), and the login task puts it behind sign-in.

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
  // AUTH_HOSTS (once login exists): where people may sign in. Add the live host at go-live.
  "vars": { "PROJECT_NAME": "my-project", "AUTH_HOSTS": "localhost:PORT_FROM_STEP_5,127.0.0.1:PORT_FROM_STEP_5" },
  "dev": { "port": PORT_FROM_STEP_5 },
  "observability": { "enabled": true }
}
```

- `run_worker_first: true` is mandatory. Without it, static HTML is served before the Worker and `_middleware.ts` never runs on pages.
- `html_handling: "auto-trailing-slash"` matches Astro's `dist/foo/index.html` output.
- `not_found_handling: "404-page"` serves `dist/404.html` with HTTP 404. Without it: blank body.
- `dev.port` is this project's own port from step 5. `PORT_FROM_STEP_5` is not valid on purpose: nothing runs until it is replaced.
- `vars` are public. Never put a secret there.
- Add `kv_namespaces`, `r2_buckets`, `triggers.crons`, `queues` as needed. Create each with the matching `npx wrangler <kind> create` and paste the id.

## Middleware

`functions/_middleware.ts` sets security headers on every response. Once login exists, it also gates `/app/*` and `/api/*` behind a session check (the version in "Login (Better Auth)" below). Public pages, `/api/health` and `/api/auth/*` stay open.

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

## Login (Better Auth)

The login task follows this section. What it gives the owner: nobody can make an account from the website (sign-up is off), the owner's account comes from a command on this computer, and the owner signs in at both addresses wrangler prints. **The login task's last criterion is: "The owner has signed in locally, from the home page's link, and sees the demo data."** If the task file does not have it (a plan written before this rule), add it. Only the owner can tick it: ask them to try, and close the task when they say it worked. If they see an empty screen, the task is not done.

Why sign-up is off: with sign-up on, the first stranger who finds the live site makes an account and reads every customer. A login screen protects nothing while anyone can sign up. When the owner wants staff accounts, `pnpm run owner <their email>` makes each one.

1. `pnpm add better-auth`. Make the signing secret: `node .ownercode/dev-secret.mjs BETTER_AUTH_SECRET`.
2. Add `AUTH_HOSTS` to `vars` in `wrangler.jsonc` (shown there), with this project's port. Both `localhost` and `127.0.0.1` must be in it: wrangler prints `127.0.0.1`, and a host that is not in the list gets HTTP 500 on every sign-in.
3. Write the files below. Put the auth tables in the next free migration number and apply them with `pnpm run db:migrate`.
4. Add the `owner` script to `package.json`, and switch on the smoke owner in `tests/smoke/setup.mjs` (the two commented lines).
5. Run the checks: `pnpm run build`, `pnpm run typecheck`, `pnpm run test`, `pnpm run smoke`.
6. Run `pnpm run db:migrate` and `pnpm run db:seed` yourself, so the owner's database has every table and the demo rows (a reset or a new migration can leave it empty). Then make the owner's account: `pnpm run owner <the owner's email>`. Run by you (no terminal), it puts the new password on the owner's clipboard and prints a line saying so. It never shows the password to you, and stores it nowhere. Tell the owner: "Your password is on your clipboard. Open http://localhost:<port>, click Open the app, and paste it in. Save it in your password manager." Offer "say 'show me' and I will start it for you". If the clipboard fails, the command says so: tell the owner to run the same line in their own terminal, where it prints the password once. Running it again gives a new password and signs out old sessions. Never ask for the password in chat.
7. Ask the owner to sign in. Close the task only when they say they see their app with the demo rows.

`functions/lib/auth.ts`:

```ts
import { betterAuth } from 'better-auth';

export interface Env {
  DB: D1Database;
  PROJECT_NAME: string;
  AUTH_HOSTS: string; // comma list in wrangler.jsonc vars, such as "localhost:8850,127.0.0.1:8850"
  BETTER_AUTH_SECRET: string; // .dev.vars here; npx wrangler secret put BETTER_AUTH_SECRET for the live site
}

export function secret(env: object, name: string): string {
  const v = (env as Record<string, unknown>)[name];
  if (typeof v !== 'string' || v === '') throw new Error(`Missing secret ${name}. Run: npx wrangler secret put ${name}`);
  return v;
}

function makeAuth(env: Env, https: boolean) {
  return betterAuth({
    database: env.DB, // Better Auth reads a D1 binding directly.
    secret: secret(env, 'BETTER_AUTH_SECRET'),
    // Only these hosts may sign in. Each one also becomes a trusted origin.
    // Any other host throws (no fallback), so a forged Host header cannot pick the URL.
    baseURL: { allowedHosts: env.AUTH_HOSTS.split(',').map((h) => h.trim()).filter(Boolean), protocol: 'auto' },
    // Secure cookies on https (the live site). Left unset, Better Auth decides by NODE_ENV,
    // which a Worker does not set, so live cookies would lack the Secure flag.
    advanced: { useSecureCookies: https },
    emailAndPassword: {
      enabled: true,
      disableSignUp: true, // Sign-up is always off. Accounts come only from: pnpm run owner <email>
    },
  });
}

// Env bindings do not change between requests: one instance per protocol per isolate.
const cache = new Map<boolean, ReturnType<typeof makeAuth>>();
export function getAuth(env: Env, request: Request) {
  const https = new URL(request.url).protocol === 'https:';
  if (!cache.has(https)) cache.set(https, makeAuth(env, https));
  return cache.get(https)!;
}
```

`functions/api/auth/[[path]].ts`:

```ts
import { getAuth, type Env } from '../../lib/auth';

// Every /api/auth/* request (sign-in, sign-out, get-session) goes to Better Auth.
export const onRequest: PagesFunction<Env> = ({ request, env }) => getAuth(env, request).handler(request);
```

`functions/_middleware.ts`, in place of the one in "Middleware" above:

```ts
import { getAuth, type Env } from './lib/auth';

const isOpenApi = (p: string) => p === '/api/health' || p.startsWith('/api/auth/');

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const gated = url.pathname === '/app' || url.pathname.startsWith('/app/') || (url.pathname.startsWith('/api/') && !isOpenApi(url.pathname));
  if (gated) {
    const session = await getAuth(env, request).api.getSession({ headers: request.headers });
    if (!session) {
      if (url.pathname.startsWith('/api/')) return Response.json({ ok: false, error: 'Sign in first' }, { status: 401 });
      return Response.redirect(`${url.origin}/login/`, 302);
    }
  }

  const res = await next();
  const out = new Response(res.body, res);
  out.headers.set('X-Content-Type-Options', 'nosniff');
  out.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  out.headers.set('X-Frame-Options', 'DENY');
  // script-src and style-src come from the <meta> tag Astro writes (security.csp in astro.config.mjs).
  // Never add default-src or script-src here: the two policies stack, and it would block every island.
  out.headers.set('Content-Security-Policy', "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'");
  if (gated) out.headers.set('Cache-Control', 'no-store');
  return out;
};
```

The auth tables, `migrations/NNNN_auth.sql` (Better Auth 1.7.5; never edit it once applied):

```sql
create table "user" ("id" text not null primary key, "name" text not null, "email" text not null unique, "emailVerified" integer not null, "image" text, "createdAt" date not null, "updatedAt" date not null);
create table "session" ("id" text not null primary key, "expiresAt" date not null, "token" text not null unique, "createdAt" date not null, "updatedAt" date not null, "ipAddress" text, "userAgent" text, "userId" text not null references "user" ("id") on delete cascade);
create table "account" ("id" text not null primary key, "accountId" text not null, "providerId" text not null, "userId" text not null references "user" ("id") on delete cascade, "accessToken" text, "refreshToken" text, "idToken" text, "accessTokenExpiresAt" date, "refreshTokenExpiresAt" date, "scope" text, "password" text, "createdAt" date not null, "updatedAt" date not null);
create table "verification" ("id" text not null primary key, "identifier" text not null, "value" text not null, "expiresAt" date not null, "createdAt" date not null, "updatedAt" date not null);
create index "session_userId_idx" on "session" ("userId");
create index "account_userId_idx" on "account" ("userId");
create index "verification_identifier_idx" on "verification" ("identifier");
```

If `node_modules/better-auth/package.json` shows a version other than 1.7.x, make the SQL from the installed version instead. The Better Auth CLI fails here (it cannot reach D1), so use its documented `getMigrations` from a short script, `scripts/auth-schema.mjs`, and paste what it prints into the migration:

```js
import { getMigrations } from 'better-auth/db/migration';
import { getPlatformProxy } from 'wrangler';
const { env, dispose } = await getPlatformProxy({ persist: { path: '.wrangler/schema-tmp' } });
const m = await getMigrations({ database: env.DB, emailAndPassword: { enabled: true, disableSignUp: true } });
process.stdout.write(await m.compileMigrations());
await dispose();
```

`scripts/make-owner.mjs`, the only way an account is made (`pnpm run owner <email>`):

```js
// Make a sign-in account, or give an existing one a new password.
//
//   node scripts/make-owner.mjs <email> [--name "Name"] [--persist-to <dir>]   this computer
//   node scripts/make-owner.mjs <email> [--name "Name"] --sql-out <file>        the live site
//
// Sign-up is off in functions/lib/auth.ts, so this is the only way an account is made.
// It makes a random password, hashes it the way Better Auth checks it, and stores the
// password nowhere. A person at a terminal sees it once. An AI agent (no terminal) never
// sees it: it goes to the clipboard.
// This computer: it writes the rows with `npx wrangler d1 execute DB --local`.
// Live site (go-live task): --sql-out only writes the SQL, which holds the hash, never the
// password. Then run `npx wrangler d1 execute DB --remote --file <file>` as its own command,
// so the cloud guard asks the owner first, and delete the file.
import { hashPassword } from 'better-auth/crypto';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const sq = (s) => `'${String(s).replaceAll("'", "''")}'`;

function checkEmail(email) {
  email = email.trim().toLowerCase(); // Better Auth looks emails up in lower case
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error(`Not an email address: ${email}`);
  return email;
}

export async function ownerSql({ email, password, name = 'Owner' }) {
  email = checkEmail(email);
  const now = sq(new Date().toISOString());
  const hash = await hashPassword(password);
  const userId = `(SELECT id FROM "user" WHERE email = ${sq(email)})`;
  return `
INSERT INTO "user" (id, name, email, emailVerified, createdAt, updatedAt)
  VALUES (${sq(randomUUID())}, ${sq(name)}, ${sq(email)}, 1, ${now}, ${now})
  ON CONFLICT(email) DO UPDATE SET updatedAt = excluded.updatedAt;
DELETE FROM "account" WHERE providerId = 'credential' AND userId = ${userId};
INSERT INTO "account" (id, accountId, providerId, userId, password, createdAt, updatedAt)
  SELECT ${sq(randomUUID())}, id, 'credential', id, ${sq(hash)}, ${now}, ${now} FROM "user" WHERE email = ${sq(email)};
DELETE FROM "session" WHERE userId = ${userId};
`;
}

// Also used by the smoke setup with a fixed test password (smoke database only).
export async function makeOwner({ email, password, name, persistTo }) {
  const sql = await ownerSql({ email, password, name });
  const dir = mkdtempSync(join(tmpdir(), 'make-owner-'));
  const file = join(dir, 'owner.sql');
  try {
    writeFileSync(file, sql);
    const args = ['wrangler', 'd1', 'execute', 'DB', '--local', '--yes', '--file', `"${file}"`];
    if (persistTo) args.push('--persist-to', `"${persistTo}"`);
    const r = spawnSync('npx', args, { shell: true, encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`wrangler d1 execute failed:\n${r.stdout}\n${r.stderr}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function toClipboard(text) {
  const tries = { win32: [['clip']], darwin: [['pbcopy']] }[process.platform]
    ?? [['wl-copy'], ['xclip', '-selection', 'clipboard']];
  return tries.some(([cmd, ...args]) => spawnSync(cmd, args, { input: text }).status === 0);
}

async function main(argv) {
  if (argv.includes('--remote')) {
    console.error('Refused: no --remote here. For the live site, use --sql-out <file>, then run wrangler yourself so the guard asks the owner.');
    process.exit(1);
  }
  const usage = 'usage: node scripts/make-owner.mjs <email> [--name "Name"] [--persist-to <dir> | --sql-out <file>]';
  let email, name, persistTo, sqlOut;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--name') name = argv[++i];
    else if (argv[i] === '--persist-to') persistTo = argv[++i];
    else if (argv[i] === '--sql-out') sqlOut = argv[++i];
    else if (argv[i] === '--') continue; // pnpm run owner -- <email>
    else if (!argv[i].startsWith('--') && !email) email = argv[i];
    else { console.error(usage); process.exit(2); }
  }
  if (!email || [name, persistTo, sqlOut].includes('') || (persistTo && sqlOut)) { console.error(usage); process.exit(2); }
  email = checkEmail(email);

  const password = randomBytes(18).toString('base64url');
  const person = process.stdout.isTTY;
  // Deliver first when no person is watching: if the clipboard fails, nothing has changed yet.
  if (!person && !toClipboard(password)) {
    console.error(`Run this in your own terminal: node scripts/make-owner.mjs ${email}`);
    process.exit(1);
  }
  if (sqlOut) {
    writeFileSync(sqlOut, await ownerSql({ email, password, name }));
    console.log(`Wrote ${sqlOut} for ${email} (the password's hash, not the password). Next, as its own command: npx wrangler d1 execute DB --remote --file ${sqlOut}. The guard asks the owner first. Then delete ${sqlOut}.`);
  } else {
    await makeOwner({ email, password, name, persistTo });
    console.log(`Account ready for ${email} (this computer's database). Any old sessions for it are signed out.`);
  }
  if (person) console.log(`Password (shown once, store it in your password manager now): ${password}`);
  else console.log('The password is on your clipboard. Paste it into the sign-in page now, and into your password manager.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((e) => { console.error(e.message); process.exit(1); });
}
```

`hashPassword` from `better-auth/crypto` is a package export that Better Auth's docs do not list. Sign-in with a password hashed by it was tested (see Last verified). If a new version drops it, stop and tell the owner; do not write your own hashing.

`src/components/LoginForm.tsx`:

```tsx
import { useState } from 'preact/hooks';

export default function LoginForm() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(e.currentTarget as HTMLFormElement);
    try {
      const r = await fetch('/api/auth/sign-in/email', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: form.get('email'), password: form.get('password') }),
      });
      if (r.ok) return location.assign('/app/');
      setError(r.status === 401 ? 'Wrong email or password.' : `Sign-in failed (${r.status}).`);
    } catch {
      setError('Server unreachable.');
    }
    setBusy(false);
  }

  // method="post" + action: if someone submits before the island loads, the password
  // goes in a POST body to Better Auth, never into the page URL.
  return (
    <form method="post" action="/api/auth/sign-in/email" onSubmit={onSubmit} class="flex flex-col gap-3">
      <label class="flex flex-col">Email<input name="email" type="email" autocomplete="username" required class="border p-2" /></label>
      <label class="flex flex-col">Password<input name="password" type="password" autocomplete="current-password" required class="border p-2" /></label>
      <button type="submit" disabled={busy} class="bg-brand p-2 text-white">{busy ? 'Signing in...' : 'Sign in'}</button>
      {error && <p role="alert" class="text-red-700">{error}</p>}
    </form>
  );
}
```

`src/pages/login/index.astro` shows a "Sign in" heading and `<LoginForm client:idle />`. After sign-in the form goes to `/app/`, the first app screen. An island on a gated screen that gets 401 from `/api/...` sends the browser to `/login/`.

`tests/smoke/auth.spec.ts`. The first test is the one that matters: it fails the day sign-up opens.

```ts
import { test, expect } from '@playwright/test';
import { SMOKE_OWNER, userCount } from './setup.mjs';

test('sign-up is refused and adds no user', async ({ request, baseURL }) => {
  const before = userCount();
  const res = await request.post('/api/auth/sign-up/email', {
    headers: { origin: baseURL! },
    data: { name: 'Stranger', email: 'stranger@example.com', password: 'stranger-password-123' },
  });
  expect(res.ok()).toBe(false);
  expect(userCount()).toBe(before);
});

test('signed out: /app/ goes to the sign-in page', async ({ page }) => {
  await page.goto('/app/');
  await expect(page).toHaveURL(/\/login\/$/);
});

test('owner signs in from the home page and sees the demo data', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Open the app' }).click();
  await page.getByLabel('Email').fill(SMOKE_OWNER.email);
  await page.getByLabel('Password').fill(SMOKE_OWNER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/app\/$/);
  await expect(page.locator('body')).toContainText('A NAME FROM seed/demo.sql');
});
```

Put one invented name from `seed/demo.sql` in place of `A NAME FROM seed/demo.sql`. Also add one test per API route: signed out, it answers 401.

### Live site (the go-live task, not before)

- `npx wrangler secret put BETTER_AUTH_SECRET`, run by the owner in their own terminal, with a new random value (not the one in `.dev.vars`).
- Add the live host (such as `my-project.<account>.workers.dev`) to `AUTH_HOSTS`. Without it, every sign-in on the live site is HTTP 500.
- The owner's live account: `pnpm run owner <email> --sql-out .wrangler/owner-live.sql`, then `npx wrangler d1 execute DB --remote --file .wrangler/owner-live.sql` as its own command (the guard asks the owner), then delete that file. Never put `--remote` inside a script: the guard cannot see into it.

## Demo data

`seed/demo.sql` holds a few invented rows for each main record type, so every screen has something to show on the first day. Invent names that fit the owner's business (not the ones in the example below). Use `example.com` emails and `555-01xx` phone numbers. Never real customers: the file is committed. Use `INSERT OR REPLACE` with fixed ids, so running it twice changes nothing:

```sql
-- Invented demo rows. This computer only: pnpm run db:seed. Safe to run again.
INSERT OR REPLACE INTO customers (id, name, email, phone) VALUES
  (1, 'Maple Street Bakery', 'maple@example.com', '555-0101'),
  (2, 'Riverside Bike Repair', 'riverside@example.com', '555-0102');
```

`pnpm run db:seed` loads it into this computer's database only. Never run it with `--remote`: the live database gets the owner's real data (the import task). When a migration adds a table that a screen shows, add rows for it here in the same task.

## Smoke tests (`playwright.config.ts`)

```ts
import { defineConfig } from '@playwright/test';

// This project's own port (also in wrangler.jsonc "dev.port"). Never reuse a server:
// another project on the same port would answer, and the test would pass against the wrong app.
const PORT = PORT_FROM_STEP_5;

export default defineConfig({
  testDir: 'tests/smoke',
  use: { baseURL: `http://localhost:${PORT}` },
  webServer: {
    // The smoke tests get their own database (.wrangler/smoke), made fresh each run.
    // The owner's database (.wrangler/state) is never touched.
    command: `node tests/smoke/setup.mjs && wrangler dev --port ${PORT} --persist-to .wrangler/smoke`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
```

`tests/smoke/setup.mjs` builds that database. It runs inside `webServer.command`, because Playwright starts the server before any `globalSetup`:

```js
import { execSync } from 'node:child_process';
import { existsSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export const SMOKE_DIR = '.wrangler/smoke';
// Fixed test password: smoke database only, never a real account.
export const SMOKE_OWNER = { email: 'smoke-owner@example.com', password: 'smoke-test-password-123' };

const wrangler = (args) => execSync(`npx wrangler ${args} --local --persist-to ${SMOKE_DIR}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });

export function userCount() {
  const out = wrangler('d1 execute DB --json --command "SELECT COUNT(*) AS n FROM \\"user\\""');
  return JSON.parse(out)[0].results[0].n;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  rmSync(SMOKE_DIR, { recursive: true, force: true });
  wrangler('d1 migrations apply DB');
  if (existsSync('seed/demo.sql')) wrangler('d1 execute DB --yes --file seed/demo.sql');
  // Once login exists, add the smoke owner (see "Login (Better Auth)"):
  // const { makeOwner } = await import('../../scripts/make-owner.mjs');
  // await makeOwner({ ...SMOKE_OWNER, name: 'Smoke Owner', persistTo: SMOKE_DIR });
  console.log('smoke database ready');
}
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
  await expect(page.getByRole('link', { name: 'Open the app' })).toHaveAttribute('href', '/app/');
  expect(errors).toEqual([]);
});
```

- Smoke tests never write to the owner's database. Before this rule, a trial's smoke runs left 67 junk rows and made-up debts on the owner's screens.
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

- Sign-up left on. Anyone who finds the live site makes an account and reads every customer.
- Copying a port from an example or another project. Two projects then fight over one port.
- Smoke tests on the owner's database.
- Stopping a server by PID without checking that it is this project's.
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

2026-09-24, for "Login (Better Auth)", "Demo data", the smoke tests' own database and the port rule, on Windows 11 with Node 22.15.0, pnpm 11.1.2, astro 7.3.5, wrangler 4.137.0, better-auth 1.7.5, Playwright 1.63.0. The code in those sections was run as written in a scratch project: sign-up refused (HTTP 400) at `localhost` and `127.0.0.1`, the owner signed in at both with a password from `pnpm run owner` (clipboard path), the `--sql-out` file applied locally and signed in, build, typecheck, unit and smoke tests passed, the smoke test failed when `disableSignUp` was set to false, and the owner's database files were byte-for-byte the same after `pnpm run smoke`. Better Auth pages read that day: installation, email-password, options, database, CLI. The terminal path of `make-owner.mjs` (printing the password) and every live-site step were not run.

2026-09-23, on Windows 11 with Node 22.15.0, pnpm 11.1.2, create-astro 5.2.4, astro 7.3.4, wrangler 4.136.3, TypeScript 6.0.3, Playwright 1.63.0. The "Start a new project" steps 2 to 8 were run in a scratch folder that held the Ownercode files: the app landed at the root, the kit's `AGENTS.md` stayed, build, typecheck, unit, smoke and `wrangler deploy --dry-run` passed, and the smoke test failed when the middleware header had `script-src 'self'`. A second run in a fresh folder, by a Sonnet agent with only this doc, passed steps 2 to 8 the same way. Steps 7's `--remote`, 10 and 11 were not run (no real deploy, no cloud command).
