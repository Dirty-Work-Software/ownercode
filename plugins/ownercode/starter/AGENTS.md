# PROJECT_NAME

<!-- Fill in during Phase 3 of the start prompt. Keep this file under 200 lines. It is loaded every session by Claude Code (through CLAUDE.md) and by Codex. -->

One paragraph: what this is, who uses it, what version one does.

## Project State

Pre-launch. Nothing is live. Update this line when that changes (date, what shipped).

## How to run it on your computer

`pnpm run dev`, then open `http://localhost:PORT`. It builds first and serves the pages and the API together. It does not watch for changes: after an edit, stop it and run it again. Never `astro dev`: it shows the pages, but every `/api/...` call fails. (Task 001 fills in PORT. It is this project's own port; another project on this computer has a different one.)

Once login exists: `pnpm run owner <email>` makes the owner's sign-in account on this computer (or gives it a new password), and `pnpm run db:seed` fills the local database with invented demo rows. Both touch the local database only.

## Folder Map

- `src/pages/` — Astro pages. One file = one URL.
- `src/components/` — Astro components (static) and Preact islands (`.tsx`, interactive).
- `src/layouts/` — page shells.
- `src/styles/global.css` — Tailwind v4 import and `@theme` tokens. The only theme file.
- `src/lib/` — shared client-safe TypeScript.
- `functions/api/` — Worker API endpoints. `functions/api/contacts.ts` answers `/api/contacts`.
- `functions/_middleware.ts` — runs on every request (security headers, auth gate).
- `migrations/` — D1 SQL migrations, numbered. Never edit an applied one; add a new one.
- `tests/smoke/` — Playwright checks that pages and endpoints load.
- `docs/` — conventions, plan, handoffs. `docs/plan-v1.md` is the product plan.
- `tasks/` — one file per unit of work. How work survives across sessions. Format and workflow: `tasks/README.md`. `tasks/archive/` holds done and cancelled tasks.
- `tasks/lessons.md` — corrections that became rules. Grep it before non-trivial work.
- `.claude/`, `.codex/` — each tool's settings for this project. The skills and safety guards come from the Ownercode plugin, not from files here. See "Agent Setup" below.
- `.ownercode/` — the kit's record of the starter files it wrote, so a later sync never overwrites your edits. Commit it; do not edit it.

## Stack (fixed)

Astro static + Preact islands + Tailwind v4, served by one Cloudflare Worker that also runs `functions/api/`. D1 for data, R2 for files, KV for cache, Better Auth for login, Anthropic API from Workers for AI features. Details and gotchas: `docs/astro-cloudflare-conventions.md`. Read it before touching `src/`, `functions/`, or `wrangler.jsonc`.

## Working Rules

Each rule carries a tag. `[gate]` means a hook blocks you. `[check]` means a command exists but nobody forces it. `[advisory]` means it holds only if you hold it. When an advisory rule bites twice, write the hook.

Evidence:
- **Verify before declaring done.** Run the relevant check (`pnpm run build`, `pnpm run typecheck`, `pnpm run test`, `pnpm run smoke`) and show the output. Never "should work." `[advisory, and the most expensive one here]`
- **No claims about state you cannot see.** Deployed output, D1 contents, DNS, what a prior session did: cite a command run in this session or say "unverified." `[advisory]`
- **Never say "shipped" or "live" unless it is deployed.** When a decision is only partly built, say which part is built and which task builds the rest. `[advisory]`
- **Describe what you see in words.** The owner cannot see your screenshots. Keep screenshots out of the project folder. `[advisory]`
- **Root cause before fix.** Reproduce, isolate, hypothesize, test. Do not guess-and-fix. `[advisory]`
- **Non-trivial logic leaves one runnable check behind.** A branch, a loop, a parser, an auth or money path gets the smallest test that fails if it breaks. One check, not a suite. `[advisory]`

Process:
- **Every session works one task from `tasks/`.** Start with the `next-task` skill. Set `status: in_progress`. Tick criteria only with proof. If you stop before done, write a `NEXT:` note in the task and commit it with the work. Close with the `close-task` skill. Work found mid-task becomes a new task through the `new-task` skill, not a detour. `[advisory]`
- **Ask decisions through the question tool.** Product choices, naming, ambiguous fields, anything with two valid shapes. Present all real options with pros and cons and a recommendation. The owner is non-technical; never bury a decision in prose. If the question tool errors or is missing (Codex has none outside Plan mode), ask the same questions in your reply as a short numbered list with lettered options and your recommendation. Never ask the owner to allow or approve a tool. The question tool only works in the main session — a subagent that hits a real decision must stop and hand it back to the main session instead of guessing or trying to ask on its own. `[advisory]`
- **Anything about money is the owner's decision.** Prices, payments, balances, refunds, fees: ask, even when one answer looks obvious. `[advisory]`
- **Owner rules win.** A task's `## Owner rules` block holds what the owner decided in the interview (prices, what a button charges, schedules). Build exactly that. Where the task does not say, ask; do not choose. `close-task` lists every choice you made alone as a question. `[check: close-task]`
- **Login: sign-up stays off.** Nobody can make an account from the website. Accounts come only from `pnpm run owner <email>`, which puts the new password on the owner's clipboard or in their own terminal, never in the chat. Recipe: "Login (Better Auth)" in `docs/astro-cloudflare-conventions.md`. The login task is done only when the owner has signed in on this computer. `[check: the smoke test that sign-up is refused]`
- **Before the owner picks an option, name every outside account, key or monthly cost it needs** (an email company for login links, a payment company, a paid plan). Each one becomes a `config` task. `[advisory]`
- **Building a screen raises product questions** (a field that could mean two things, a workflow with two shapes, a name). Stop and ask them. Record the answer in the task's Notes. `[advisory]`
- **When the owner must run something:** say where (which app, which folder), give one command per line, and say what they should see. Better: offer "say 'show me' and I will start it and open it for you." `[advisory]`
- **A known go-live risk becomes a task** through the `new-task` skill, not a note in a handoff that the next handoff overwrites. `[advisory]`
- **Plain English.** Define each technical term the first time it appears in a reply. `[advisory]`
- Commit per working state. Never commit a broken build. Prefer `git add <paths>` over `-A`. `[advisory]`
- Never read or commit `.env`, `.dev.vars`, or anything that looks like a key. `[gate: Ownercode plugin, secret guard, for commands that name the file; in Claude Code also the .claude/settings.json deny list for the Read tool. .gitignore excludes them in both tools]`
- **Local secrets.** One that can be random (a login or session signing secret): run `node .ownercode/dev-secret.mjs NAME`. It adds a random value to `.dev.vars` and never shows it. A real key from a company (Stripe, Anthropic, an email service): tell the owner the exact line to add to `.dev.vars` in their own editor (`NAME=`, then the value from that company's dashboard). Never ask for the value in chat. Never put a secret or a fallback secret in code: when a secret is missing, the code stops with an error. `[gate for reading: secret guard; advisory for hard-coding]`
- **Real customer files** (a spreadsheet export, a member list) go in `imports/`, which git ignores. Never in the project root, never committed. `[gate: Ownercode plugin, secret guard blocks forcing them into git]`
- Never `--no-verify` on commit or push, and never switch git hooks off another way. `[gate: Ownercode plugin, no-verify guard]`
- Never `git reset --hard`, `git checkout -f` or `git switch -f` over unsaved edits, on any branch. `[gate: Ownercode plugin, reset guard]`
- Never merge a pull request without the owner's say. `[gate: Ownercode plugin, pr-merge guard]`
- Never throw work away: no `git branch -D`, `git restore <file>`, `git checkout -- <file>`, `git clean -f`, `git stash drop`, and no force-push to `main`. Stash it instead. Normal pushes are fine. `[gate: Ownercode plugin, discard guard]`
- Never destroy live data: no remote `DROP`, `TRUNCATE`, or `DELETE` or `UPDATE` with no `WHERE`, and no `wrangler ... delete`. Deploys, `secret put` and remote migrations ask the owner first. `[gate: Ownercode plugin, cloud guard]`
- Never stop processes by name or by a command-line match (`Stop-Process -Name`, `taskkill /IM`, `pkill`, `killall`). Stop only a process you started, by its PID, with its whole tree. In Git Bash: `taskkill //T //F //PID <pid>` (Git Bash turns `/T` into a folder path; `//T` reaches taskkill as `/T`). In PowerShell: `taskkill /T /F /PID <pid>`. Before any stop, check the process path is inside this project folder. A server from another folder is another project's or another AI session's: never stop it, pick another port instead. `[gate: Ownercode plugin, process guard, which blocks a stop of a process that does not run from this project]`
- **Never change machine-wide settings:** no `git config --global` or `--system`, no global installs, no system variables. They change every project on the computer. Use a setting for this project only (`git config` with no flag, or `git -c name=value`). When a command fails only inside your sandbox (Codex on Windows: `Permission denied` on `.git`, pnpm refused in the user folder, "dubious ownership"), say so in plain words: "this is a sandbox limit, your install is fine". On Windows, no Codex sandbox kind can build this stack today; the owner's choice (full access, or Claude Code) is in the Ownercode GUIDE, "Codex on Windows". Never edit the owner's Codex settings yourself. `[gate: Ownercode plugin, global-config guard, for git; advisory for the rest]`
- **When a guard blocks you:** do not look for another way to run it. If the owner truly wants it, ask them in chat. Only on a clear yes, re-run it once with the prefix the block message names. Never offer the owner a way around a guard they did not ask about. `[advisory]`
- The guards check themselves at the start of every session and say nothing when healthy. If a message says the Ownercode safety guards are off, stop and tell the owner before any other work. `[gate: plugin self-check, and .ownercode/check-guards.mjs from this project]`
- **Codex only:** a Codex session with working guards starts with the line `Ownercode safety guards: on.` If you did not get that line, the guards are off, most often because their hooks were never trusted. Tell the owner first: type `/hooks`, trust the Ownercode hooks, then restart. `[advisory: Codex runs no hook until it is trusted, so no hook can report this]`
- On Windows, keep the project in a short folder, such as `C:\Projects\<name>`. From a deep one the local database fails with `SQLITE_CANTOPEN`. It warns, it does not block. `[check: the plugin's self-check warns at session start, silent when the path is short]`
- Never `rm -rf` on project folders. `[gate: .claude/settings.json denies it for .git, .claude and the drive, and asks for every other rm -r or rm -f; in Codex, .codex/rules/ownercode.rules, start of a command only]`
- **Claude Code on Windows:** the PowerShell tool is off in this project, so every command goes through Bash, where the guards watch. Do not ask to turn it back on. `[gate: .claude/settings.json]`
- Live-site secrets go in with `npx wrangler secret put NAME`, run by the owner in their own terminal. Never ask for a key in chat. `[advisory]`
- **Cheapest model that can do the step.** Helper agents for search, listing, bulk edits, and test runs get the smallest model. Planning, data modeling, and hard bugs get the largest. When the owner is running a big model on trivial work, say so once and name the switch. `[advisory]`
- Simplest design with a six-month horizon. Call out shortcuts that will force rework and let the owner pick. `[advisory]`
- Keep this file current. Folder map, state line, and rules. It is the project's memory across sessions. `[advisory]`

## Self-Improvement Loop

After any owner correction, append to `tasks/lessons.md`:

```
### YYYY-MM-DD
mistake: [what went wrong]
rule: [one sentence that prevents recurrence]
enforced-by: [hook/skill/doc]   (or `advisory: true` if none exists yet)
```

A lesson that recurs twice with `advisory: true` is a missing hook. Write the hook.

## Architecture Rules (Do Not Drift)

- Tailwind v4: config in `src/styles/global.css` only; `@tailwindcss/vite`, never `@astrojs/tailwind`, never `tailwind.config.js`.
- No `@astrojs/cloudflare` adapter. Astro stays static. The static-assets binding in `wrangler.jsonc` is not an adapter.
- Preact islands: `client:visible` or `client:idle`. `client:load` needs a comment saying why.
- Workers runtime: Web APIs only (`fetch`, `crypto.subtle`, `URL`). No Node built-ins in `functions/`.
- Env split: `import.meta.env` at build time in Astro; `context.env` in `functions/`. Never `process.env` in a Worker.
- D1 schema changes are migrations under `migrations/`, applied with `npx wrangler d1 migrations apply DB --local` then `--remote`.
- Store every date and time in UTC. Keep the business's time zone as one constant and convert only for display.
- Every API endpoint validates its input at the boundary and returns JSON with a stable shape (`{ ok, data }` or `{ ok: false, error }`).
- Model calls: Anthropic Messages API via `fetch` from a Worker, key from `context.env.ANTHROPIC_API_KEY`, a named use, a time budget, and a fallback when the call fails. Never Workers AI for reasoning.

## Agent Setup

The Ownercode plugin supplies the skills and the safety guards, in Claude Code and in Codex. In Claude Code a skill runs as `/ownercode:<name>`. In Codex it runs as `$ownercode:<name>`. Either tool also picks a skill by itself when the work matches it.

- `next-task`, `new-task`, `close-task` — the task queue. See `tasks/README.md`.
- `commit` — stage the files you edited, write the message, commit locally.
- `handoff` — update the task file, then write a resume prompt for the next session.
- `sync` — bring in newer starter files after the plugin updates. Never overwrites a file you changed.
- `worker-endpoint` — how to add a `functions/api/` route.
- `component-builder` — Astro vs Preact rules and island patterns.
- `decision-interview-basic` — two data questions asked before the first table exists.
- The guards are written in Node, so both tools run the same code. `CLAUDE.md` only points here, so both tools read the same rules.
