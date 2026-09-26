You are setting up a brand-new project for a non-technical founder. I am the founder. I will make product decisions. You will do everything technical. Treat this message as the spec for this session.

## What this session does

A business website and/or small business software (customers, bookings, jobs, members), on a fixed tech stack. What the software does and who it is for is NOT decided yet.

This session does three things: set up the project folder, interview me, and turn my answers into a plan and task files. Then it ends. It does not build anything. The next session starts fresh, on the same strong model at High effort, with the Ownercode skills and guards loaded, and builds from the task files.

## The stack (fixed, do not propose alternatives)

- Astro (latest stable), static output. Pages in `src/pages/`. No `@astrojs/cloudflare` adapter.
- Preact islands for anything interactive (`@astrojs/preact`). `client:visible` or `client:idle` only.
- Tailwind CSS v4 via `@tailwindcss/vite`. Theme in `src/styles/global.css` `@theme` block. No `tailwind.config.js`. Never `@astrojs/tailwind`.
- Cloudflare Workers for hosting. One Worker serves `dist/` through the static-assets binding AND runs API code from `functions/api/`. `wrangler.jsonc`, not `.toml`.
- Cloudflare D1 for the database, R2 for files, KV for cache, Cron Triggers / Queues / Workflows for background jobs.
- Better Auth for login when we need login.
- AI features inside the app call the Anthropic Messages API from a Worker with `fetch`, key in a Cloudflare secret named `ANTHROPIC_API_KEY`. The model ids are in `docs/versions.md`. Never Workers AI for anything that reasons.
- pnpm, Node 22+, TypeScript strict, Vitest for unit tests, Playwright for smoke tests.
- Windows. The exact build steps are in `docs/astro-cloudflare-conventions.md`, "Start a new project".

## Set up the folder

You are running in Claude Code or in Codex, with the Ownercode plugin installed. It gives you the rules, the task system, the safety guards and the skills. In Claude Code a skill runs as `/ownercode:<name>`; in Codex as `$ownercode:<name>`. Below I name skills by their short name.

If you have no Ownercode skills, the plugin is not installed. Stop and tell me to follow the install steps in the Ownercode README.

Stop and tell me first if either of these happened at the start of this session:
- A WARNING that this folder's path is too long. On Windows the local database cannot open from a deep folder. Tell me to move the project to a short folder, such as `C:\Projects\<name>`.
- A message that the Ownercode safety guards are off. In Codex, also stop if the session did not start with `Ownercode safety guards: on.` Tell me how to fix it, in plain words.

Then:
1. If this folder is not a git repository yet, run `git init -b main`. The branch must be `main`.
2. Run the `setup` skill. It writes this project's own files: `AGENTS.md` (the rules), `CLAUDE.md` (points to AGENTS.md), `docs/`, `tasks/`, `.gitignore`, and each tool's settings. Then read `AGENTS.md` in full. Those are the rules. If a rule there conflicts with something in this prompt, this prompt wins for today and you tell me about the conflict.
3. Run a quick check so we don't waste your time later: `git --version`, `node --version`, `pnpm --version`, `gh auth status`, and `npx wrangler whoami`. Tell me in one line what's missing or not signed in, if anything. It does not block the interview. If a tool is missing only inside your own sandbox, say that; do not tell me my install is broken.

## Phase 1: Interview me

Ask with your question tool (in Claude Code it is AskUserQuestion). If it errors or is missing, ask the same questions in your reply as a short numbered list with lettered options and your recommendation. Never ask me to allow or approve a tool. Ask in batches of 2 to 4 questions. Keep going until you can fill in every line of the plan in Phase 2. Do not guess. Topics you must cover, in roughly this order:

1. Website, business software, or both. If both, which first.
2. What my business does, in one sentence, and who my customers are.
3. For the website: what a visitor should do (call, fill a form, book, buy). How many pages, roughly. Do I have a domain, a logo, brand colors, existing copy or photos. How people find me: my two or three main competitors (names or websites); the exact words a customer would type into Google, or ask an AI assistant, to find a business like mine; and the towns or area I serve.
4. For the software: who uses it (just me, a team, customers too). What a "record" is for me (a person, a company, a job, a booking, a membership, a property, a lead). What I do with a record every day: the three or four actions that matter most. Where the data lives today (spreadsheet, another system, notebook, nowhere). Whether I need to import it.
5. What "done for version one" means to me: the one screen I would show a friend.
6. Login: do I need it in version one. Who logs in. Before I pick a login method, name every outside account, key or monthly cost each option needs (an email company for login links, for example).
7. AI features: is there one obvious repetitive thing I would love the app to do for me (draft a reply, summarize notes, sort leads). If nothing comes to mind, say so and skip it. Name any account or cost it needs before I pick it.
8. Things I care about that I have not been asked about.

Ask follow-ups when an answer is vague. When two answers conflict, point it out and ask which wins. Anything about money (prices, payments, balances) is always my decision.

Then run the `decision-interview-basic` skill before you write anything in Phase 2. It asks me two questions about how my contacts are stored. Both are cheap to answer now and expensive to change once I have real customers in there, and neither is a question I would know to ask you. Its answers go into `docs/data-model.md`, and the data model in the plan has to match them.

## Phase 2: Write the plan and get my OK

Write `docs/plan-v1.md` with:
- One paragraph: what we are building and for whom.
- The data model in plain English: a table of record types, what fields each has, how they link. Keep it to what version one needs. Use my words for things (if I say "members", say members).
- The screens of version one, one line each, and what a user does on each.
- The API endpoints version one needs, one line each.
- Every outside account, key or monthly cost version one needs.
- What is explicitly NOT in version one.
- Search, if there is a website: the customer's phrases in their own words, which page answers each, the service area, and the competitors I named.
- Open questions you still have.

Then also write a short `## In Plain English` section at the top for someone who does not code.

Then turn the plan into task files. Read `tasks/README.md`. Create one task per screen, one per endpoint group, one for the schema migration, one for auth if in scope, and one `config` task for each thing I must do myself, including every outside account from the plan. A task that brings in my real customer data says the file goes in the `imports/` folder, which git never saves. Number them in build order, set `depends_on` so nothing can be picked before what it needs, and give every task an `## In Plain English` block and an `## Owner rules` block: my answers that the task must follow, copied word for word (prices, what a button charges, schedules, who sees what), or "none". Put app work before the `config` tasks, so the building never waits on my accounts.

- Every public page task follows "Search basics" in `docs/astro-cloudflare-conventions.md`, and names the customer phrase that page answers.
- The schema task also writes `seed/demo.sql`, a few invented rows for each main record type, loaded with `pnpm run db:seed` into the local database only (see "Demo data" in `docs/astro-cloudflare-conventions.md`). So I see a working app before my real data is in.
- The login task, if login is in scope, follows "Login (Better Auth)" in `docs/astro-cloudflare-conventions.md`: sign-up is off, my account comes from `pnpm run owner <my email>`, and a smoke test proves a stranger cannot sign up. Its last criterion is exactly: "The owner has signed in locally, from the home page's link, and sees the demo data." It is closed only when I say I have.

Task 001 is "Set up the project and put a first page live". Its description says: follow "Start a new project" in `docs/astro-cloudflare-conventions.md`, step by step. Copy the steps' checks into its acceptance criteria: the app at the project root, this project's own port, build, typecheck, unit and smoke tests pass, the smoke test sees the page's live part show the server's answer, the home page links to the app, `pnpm run deploy:check` passes, the live URL works, the guard test is blocked.

Show me the plan and the task list: id, title, one plain line each. Ask me every open question from the plan now, not later. Then ask whether to proceed, change something, or start over.

## End of this session

Once I say go:
1. Commit the plan, the data model and the tasks with the `commit` skill.
2. Run the `handoff` skill. Its next step is: start task 001.
3. In place of the handoff skill's usual ending, end your reply with exactly this, filled in:

> **Session 1 is done.** The plan is saved, and nothing is built yet.
> Next: start a new session in this same folder. <Claude Code: Pick the **Opus** model named in `docs/versions.md`, with **High** effort. Codex: Pick the **Astra** model named in `docs/versions.md`, with **High** effort. Write only the line for the tool you run in.> Then paste this line:
> ```
> Read docs/handoff-next.md and continue.
> ```
> Before then, if the check above found something missing, fix it: <the one or two things, or "nothing">.

Do not start task 001 in this session, even if I ask you to keep going. Explain in one line that a fresh session loads the kit's skills and guards and starts from the saved plan.

## Why two sessions

Planning and building both use the strong model in `docs/versions.md` at High effort. A fresh session reads the saved decisions without carrying the full interview into every build step. It also starts with every Ownercode skill and guard loaded. Sonnet is reserved for purely mechanical work where even Opus at Low would be excessive.

## Working rules for you, today and always

- Follow `AGENTS.md`. It is the project's memory, and it has the rules for questions, money, secrets, and what to say when I must run something.
- Plain English first. When you must use a technical word, define it in the same sentence the first time.
- When I correct you, add a one-line rule to `tasks/lessons.md` in the format that file shows.
- If you are unsure whether something needs my decision, it does. Ask.

Begin: set up the folder, then start the interview.

## Last verified

Model policy updated 2026-09-25: Opus or Astra at High for both sessions; model controls checked against official docs. The earlier build evidence below does not verify this new model policy end to end.

2026-09-24, with Claude Code 2.1.159 and Codex CLI 0.144.6: the skill names and the start-of-session messages above, and the build sessions from a plan this prompt wrote (the second re-run). The build steps it points to were run on this date (see the Last verified line in `docs/astro-cloudflare-conventions.md`). If a skill name does not work, list the Ownercode skills your tool shows and use the matching one.
