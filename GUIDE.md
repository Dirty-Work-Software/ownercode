# Ownercode, Part 1: Get Your Bearings

This is not step-by-step. It is the map. Your agent (Claude Code or Codex) does the steps. One honest expectation up front: what you build with this free guide will work and look plain — clean and usable, not styled. Making it look good is a design skill this guide doesn't teach.

## 1. What you are actually doing

You are not going to write code. You are going to **direct an agent that writes code**, and you are going to make the decisions it cannot make: what the product is, who uses it, what "done" looks like.

The agent is Claude Code (from Anthropic) or Codex (from OpenAI). Pick one; Ownercode works the same way in both. It runs on your computer. It can read and write files, run commands, search the web, and deploy. You talk to it in plain English. It works in a **loop**: read your request, look at the project, plan, edit files, run checks, report back. Each loop is called a **turn**. A conversation of many turns is a **session**.

Your job in every turn: say what you want, say how you will know it worked. Its job: do it and prove it.

## 2. The five things you must know about your agent

*Skim this now. Read it properly after your first week.*

Three complaints you will hear, and what each one really means:

- "All I do is repeat the same words over and over." They are not using **skills**.
- "It deleted things. It did things I did not ask. It looked at things it should not have." They are not using **rules and permissions**.
- "It does not check its work. It says it did something and it did not." They are not using **hooks**.

The fourth complaint is quieter: "It forgot everything and I had to start over." They are not using **tasks**. All five are below.

**Context.** The agent only knows what is in its "context window": your messages, files it read, command output. Near the limit it "compacts": it squeezes the chat into a short summary and keeps going, and details are lost. A new session starts with only `AGENTS.md`, its own short notes, and what you give it. Two consequences:
- Long sessions get slow and sloppy. Start a new session per task. Use the handoff skill (section 3b) to carry state over.
- Anything it must always know goes in a file called `AGENTS.md` at the root of the project. Both tools read it at the start of every session. There is also a `CLAUDE.md` with one line in it, `@AGENTS.md`, so Claude Code reads the same rules. `AGENTS.md` is the single most important file. Ownercode writes it for you.

**Tools.** The agent acts through tools: read a file, edit a file, run a command, search, look something up on the web, start a helper. You do not call tools. You watch it call them. How often it asks you first depends on the **permission mode**, which you pick in the mode selector next to the send button in the Claude app (Codex has its own approval modes):
- **Manual** asks before each edit or command. Good for your first week: you learn the stack by watching.
- **Accept edits** lets it edit files without asking, and still asks before most commands.
- **Plan** lets it read and plan, but not edit.
- **Auto** lets a safety checker approve most actions. Use it once you trust the flow.

The Ownercode guards (below) and the project's deny rules work in every mode.

**Skills.** Ownercode is a **plugin**: an add-on you install once into Claude Code or Codex (section 5). It brings skills. A skill is a file that teaches the agent a repeatable job.
- You can call a skill by name. In Claude Code, type `/ownercode:commit`. In Codex, type `$ownercode:commit`. Short, procedural.
- The agent can also pick a skill by itself when the work matches. Example in the plugin: how to write an API endpoint the right way for this stack.
- When you correct the agent twice for the same thing, that is a skill or an `AGENTS.md` rule waiting to be written. Ask it to write one.

**Hooks and permissions.** Two layers keep the agent safe.
- **Guards** come from the plugin. A guard (a "hook") is a small program that checks a command before it runs and blocks it if it is dangerous. Both tools run the same nine guards. They block:
  - skipping git's safety checks (`--no-verify`);
  - throwing away unsaved work (`git reset --hard`, `git restore`, `git clean -f`, `git branch -D`, `git stash drop`, and the like);
  - force-pushing over `main` on GitHub (a normal push is fine);
  - merging a pull request by command;
  - reading or committing secret files (`.env`, `.dev.vars`), and committing your customer spreadsheets;
  - destroying live data: deleting the live database or its tables, or deleting the live site;
  - stopping programs by name, which can close other projects or the agent itself;
  - changing git settings for the whole computer (`git config --global`), which changes every project on it;
  - saving an edit to a database change file (a "migration") that already ran; the agent writes a new one instead.

  Before a deploy, before storing a live secret, and before a live database change, the agent asks you first. When a guard blocks something you really do want, say so in chat; only then does the agent run it once more with your OK.
- **Permissions** come from your project's settings (`.claude/settings.json` for Claude Code, the `.codex/` folder for Codex). They say what the agent may never do, such as read secret files or wipe out important folders with `rm -rf`. On Windows, they also switch off Claude Code's PowerShell tool, so every command goes through Bash, where both the guards and these rules apply. Nothing you need is lost: Git Bash runs everything the build needs.

These came from real incidents. Keep them. A guard is the difference between "please check your work" and "the command fails if you did not." The guards check themselves when a session starts. If they are not running, you will see `OWNERCODE SAFETY GUARDS ARE OFF`. Once, right after a plugin update, you may see `OWNERCODE SAFETY GUARDS ARE OFF UNTIL A RESTART`. Close the session and start a new one. If it shows again, the guards are really broken. In Codex, a healthy session also says `Ownercode safety guards: on.`

**What Codex does not cover.** Codex runs the same nine guards as Claude Code. You get less protection in four places:
- The guards are off until you trust them once in `/hooks` (section 5). A plugin update that changes the Codex hook file may ask you to trust it again.
- Codex cannot pause a command to ask you. So a deploy, a `secret put` or a change to the live database is stopped instead, and the agent must ask you in chat. On your yes, it runs the same command again with `BYPASS_CLOUD_GUARD=1` in front.
- The guards stop a command that names a secret file, such as `cat .env` or `Get-Content .env`. Nothing stops a read that does not name it, such as a search over the whole folder or a script that opens the file itself. Claude Code has one more rule, for its own file reader; Codex has none. Ownercode relies on `.gitignore` and the rule in `AGENTS.md` for the rest.
- The delete rules look only at the start of a command. `rm -rf src` is refused, and other `rm -r`, `rm -f` and `Remove-Item` commands ask you first. A delete run another way, such as from inside a script, is not stopped. Codex also skips these rules until you trust the project folder.

Neither tool stops a pipe that runs a script straight from the internet, like `curl ... | bash`.

**Tasks.** A session runs out of context. Any project bigger than a weekend will take many sessions. So work lives in files, not in the agent's head. `tasks/` holds one file per unit of work: what it is in plain English, what "done" means as a checklist, and dated notes on what happened. A session reads its task, works, updates the task, and ends. The next session picks up from the notes. Three skills run it: new-task, next-task, close-task. The project's `tasks/README.md` has the format. Full detail in section 3b.

## 3. How to work with it (the habits that matter)

- **One task per session.** Name the task in the first message. When it is done, start a new session.
- **Say the check up front.** "Add a contacts table. Done means: the page lists contacts from the database and `pnpm run build` passes." An agent with a finish line stops at the finish line.
- **Ask it to plan first on anything bigger than a small fix.** "Plan this, do not build yet." Read the plan. Then say go. In the Claude app, pick **Plan** in the mode selector next to the send button (in the terminal, Shift+Tab). In either tool, "plan only, do not edit files" works.
- **Make it verify.** After it says done, ask "show me the command output that proves it." Do this until it does it unprompted. Your `AGENTS.md` tells it to.
- **Use the question tool.** Tell it: "ask me questions with the question tool before you decide." It will present multiple-choice cards. This is how you make product decisions without knowing the code. If no cards appear (Codex shows them only in Plan mode), it asks the same questions as a numbered list. Answer with the letters.
- **Corrections become rules.** When you correct it, say "add that as a rule to AGENTS.md" or "add that to tasks/lessons.md." Next session it starts smarter.
- **Small commits, often.** Every working state gets saved to git (see section 4). Then a bad change is a one-line undo instead of a lost afternoon.
- **Watch how full the context is.** In the Claude app, click the usage ring next to the model picker (in the terminal, type `/context`). When it is past half, or the agent starts forgetting what you decided, run the handoff skill and start fresh.
- **Undo is there.** In Claude Code, press Esc twice with an empty message box, or type `/rewind`, to put files back the way they were before a message. It undoes the agent's file edits, not commands it ran and not a deploy. Git (section 4) is the real safety net.

## 3a. Pick the right model and effort (this is where the money goes)

*Skim this now. Come back when you look at your bill.*

Both tools let you pick which model does the work and how hard it thinks. Model and effort choices affect quality, time and usage. Check both before you start.

**Ownercode's default: keep the strong model for setup, planning and building.** This is our model policy, not the vendor's default setting.

| Tool | Pick | Effort |
|---|---|---|
| Claude Code | **Opus 5.5 or a newer Opus** | **High** |
| Codex | **GPT-6 Astra** | **High** |

**Where to set it.** Use the model picker and effort control in the app. In Claude Code's terminal, type `/model` to choose Opus, then `/effort high`. In the Codex terminal, type `/model` and select Astra and High. Check the displayed setting before you paste a prompt. If your account does not offer that model, ask the agent to check the available choices; do not let it silently substitute one.

**Sonnet is for mechanical work only.** An exact text lookup, a supplied typo replacement, or running a known test command and reporting its output can qualify. Use it only when even Opus at Low would be excessive. Building a screen, changing an endpoint, designing a test, reviewing code or diagnosing a failure stays on Opus. A clear plan is not a reason to switch down.

**Helpers follow the same rule.** Keep the strong model when a helper must make judgments. A helper that only returns exact search matches can use Sonnet. It must hand unexpected findings back to the strong model.

**Effort** controls how much reasoning the model uses. Start at High. The agent must not claim it changed the setting unless it can verify it. Strong models can use more of your allowance; check usage in your tool.

**Fast mode** is separate from effort. Leave it off unless you have checked its extra cost.

**A fresh session still helps.** End planning with a saved plan and task files. Start building in a new session on the same strong model at High. This keeps the interview history out of the build session and loads the Ownercode skills and guards.

Model and effort controls checked 2026-09-25 against [Claude Code model configuration](https://code.claude.com/docs/en/model-config) and [Codex models](https://learn.chatgpt.com/docs/models). Current choices and checks also live in `docs/versions.md`.

## 3b. Tasks: how work survives across sessions

This is the part most people skip, and it is why their second week is worse than their first.

**The problem.** A session has a hard ceiling on how much it can hold. The agent does not feel the ceiling coming. Near it, it gets vague, repeats itself, and forgets what it decided an hour ago. Then the session ends and everything it knew is gone. If the plan lived in the chat, the plan is gone too.

**The fix.** Work lives in `tasks/`. One file per unit of work. A task file has:

- A number and a kind in the filename, like `003-CODE-contacts-list-screen.md`. Numbers only go up.
- A header with status, priority, what it depends on, and which files it may touch.
- An "In Plain English" block. You read this. It says what you get when the task is done.
- Acceptance criteria. A checklist. Each box gets ticked only with proof.
- Dated notes. What was tried, what failed, what the next session should do first.

**The loop.** Every session:

1. Start with the next-task skill: type `/ownercode:next-task` in Claude Code or `$ownercode:next-task` in Codex. (The other skills work the same way; below we use the short name.) It finds the highest-priority task that is not blocked and shows it to you in plain English.
2. Say go. The agent marks it in progress and works only inside that task's file scope.
3. Either it finishes and runs close-task (checklist all ticked with proof, file moves to the archive, commit), or it runs out of room and runs handoff (writes a `NEXT:` note in the task, commits, gives you a paste-in for the next session).
4. New session. If the last session ended with a handoff, paste the one line it gave you: `Read docs/handoff-next.md and continue.` Otherwise run next-task. Both work: when the handoff's task is already closed, the file says so and points to next-task.

**What this buys you.**

- You can stop any time. Nothing is lost.
- You can read `tasks/` and know exactly where the project is without asking the agent.
- The agent stops sprawling. "While I was in there I also..." becomes a new task file (the new-task skill), not a detour.
- You can run two sessions on two tasks at once, when you are ready for that.

**Your part.** Read the plain-English block before you say go. Read the notes when something feels off. When the agent finds new work, make sure it becomes a task, not a tangent. When it says done, look at the checklist and ask for the proof on any box you doubt.

**Optional: Obsidian.** Everything above is Markdown files. Obsidian (obsidian.md, free) is a desktop app that opens a folder of Markdown files as a linked notebook. Point it at your project's `tasks/` and `docs/` folders and you get: a sidebar of every task, checkboxes you can click, a graph of what depends on what, and search across everything. It turns "a folder of text files" into a project dashboard you can read over coffee. You do not need it in week one. When `tasks/` passes twenty files, you will want it. You do not have to set it up yourself: say "install and configure Obsidian for this project's tasks and docs folders, use my Chrome for the download," and the agent does it, stopping only where an installer needs your click.

## 3c. Updates

Ownercode gets fixes. Two things can be out of date: the plugin, and your project's own files.

**The plugin.** Codex updates it by itself when a session starts. Claude Code does not, until you turn on auto-update once (section 5, step 4). To update by hand at any time, type these in a terminal:
- Claude Code: `claude plugin marketplace update ownercode`, then `claude plugin update ownercode@ownercode`, then restart Claude Code.
- Codex: `codex plugin marketplace upgrade ownercode`.

**Your project's files.** When the plugin is newer than your project's files, the session starts with a line that says so. Then run the sync skill. For files you never edited, it puts in the new version. For files you did edit, it shows you what Ownercode changed and asks before it merges. It never writes over your edits.

## 4. GitHub and git in one paragraph

**git** is a save-history for your files. A **commit** is one save point with a message. A **branch** is a parallel line of save points; `main` is the real one. **GitHub** is the website that stores a copy of the history and lets you see it in a browser. A **pull request** (PR) is "please put my branch into main." You will almost never type git commands. The agent does. You will run the commit skill, and later say "push this and open a PR." What you must understand: **committed and pushed means safe. Anything else can be lost.** Ask "is this committed?" whenever you are unsure.

## 5. One-time setup (let the agent help)

Open your tool in a new, empty short-path folder, choose the model from section 3a, and paste [SETUP-PROMPT.md](SETUP-PROMPT.md). The agent installs missing tools and walks through this list. You handle passwords, account consent, payments, administrator approval, and hook trust. But the agent can drive the browser for the clicking-around parts, and it is often better at it than you following a tutorial, because tutorials go stale and the agent reads the live page. See "Let the agent use your browser" at the end of this section.

1. **Git for Windows** (git-scm.com). The agent checks for Git first and installs it if missing, with your approval when needed. Both tools use git to download the plugin. It also gives you "Git Bash," the shell Claude Code runs commands in.
2. **Pick your tool.** One of these:
   - **Claude.** Get a Pro or Max subscription at claude.ai. Max is worth it once you use it daily; Pro hits limits fast. Then get the **Claude desktop app** (claude.ai/download). Open it, sign in, click the **Code** tab. That is Claude Code. There is also a terminal version; the app is easier to start with.
   - **Codex.** Install Codex from OpenAI and sign in with a ChatGPT account whose plan includes Codex. On Windows, OpenAI's page `learn.chatgpt.com/docs/windows/windows-app` names the install to use. On Windows, read "Codex on Windows" below first.
3. **Node.js** version 22 or newer (nodejs.org, the LTS button). The safety guards run on it. Then open PowerShell and run `corepack enable` so `pnpm` works. If that command errors ("corepack is not recognized" or similar — newer Node versions are dropping it), run `npm install -g pnpm` instead; same result. `pnpm` is the package installer this stack uses.
4. **Install the Ownercode plugin.** Node is now installed, so the safety guards can run. It comes from the public GitHub repo `Dirty-Work-Software/ownercode`.
   - **Claude Code:** in a session, type `/plugin marketplace add Dirty-Work-Software/ownercode`, then `/plugin install ownercode@ownercode`. In a terminal, the same thing is `claude plugin marketplace add Dirty-Work-Software/ownercode`, then `claude plugin install ownercode@ownercode`. In the desktop app, the plugin browser works too. Then turn on updates once: type `/plugin`, go to Marketplaces, pick ownercode, choose Enable auto-update.
   - **If a window asks you to sign in to Git or GitHub while this runs, close it.** Ownercode needs no account and no sign-in. Check the repository spelling and connection before trying again. GitHub sign-in is needed later for your own backups, not this public plugin.
   - **Codex:** in a terminal, run `codex plugin marketplace add Dirty-Work-Software/ownercode`, then `codex plugin add ownercode@ownercode`. Then open Codex, type `/hooks`, trust the Ownercode hooks, and restart Codex. **Until you do this, the safety guards are OFF.**
5. **GitHub account** (github.com). Free. Then install the GitHub CLI (cli.github.com) and run `gh auth login` in PowerShell. Follow the prompts in the browser. This lets the agent create repos and pull requests for you.
6. **Cloudflare account** (dash.cloudflare.com). Free tier covers a lot. Add a domain later; not needed to start.
7. **Wrangler login.** In PowerShell: `npx wrangler login`. A browser tab opens; click allow. This is how the agent deploys to Cloudflare.
8. **Anthropic API key** (console.anthropic.com). Only needed when your app itself calls Claude (an AI feature inside your CRM). Not needed to run Claude Code or Codex. Put a few dollars on it. You will paste this key ONE time when the agent says `run: npx wrangler secret put ANTHROPIC_API_KEY`. Never paste it into chat, never put it in a file.

Then: make an empty folder with a short path, for example `C:\Projects\my-app`. Not inside Documents, Desktop, or OneDrive: on Windows, the local database cannot open from a deep folder. Open your tool in that folder (in the Claude app: Code tab, pick the folder) and paste Part 2, the start prompt.

The start prompt runs two sessions. The first interviews you and writes the plan and the task list, on the big model. It builds nothing. It ends by telling you to start a new session, keep Opus or Astra at High effort, and paste one line. The second session builds the first page, puts it live, and tests the guards.

The start prompt runs the Ownercode setup skill. It writes your project's own files: `AGENTS.md` (the rules), `CLAUDE.md` (the one line that points Claude Code at `AGENTS.md`), `docs/`, `tasks/`, `.gitignore`, each tool's settings (`.claude/settings.json` and `.codex/`), and a `.ownercode/` folder. That last one records what setup wrote, so updates can tell which files you changed.

**The guard test.** The second session runs it for you, as the last check of its first task. To run it again at any time, paste this to the agent: "This is the Ownercode guard test and I approve it. Run `git commit --allow-empty --no-verify -m test` exactly once, with no prefix, and show me the result." It must be blocked. In Claude Code you will see a line starting `BLOCK:`. In Codex you will see a line starting `Command blocked by PreToolUse hook: BLOCK:`. If nothing blocks it, tell the agent "the Ownercode guards did not fire" and let it fix that before any other work. If the agent refuses to run it at all because its rules forbid the flag, that is fine too: the guards also check themselves at the start of every session.

### Codex on Windows

On Windows, Claude Code is the tool we tested end to end with this kit. If you use Codex on Windows, read this first.

Codex runs each command inside a **sandbox**: a fence that lets it change only your project folder. On Windows, no sandbox kind could build this kit's apps in our tests (2026-09-24):
- **Plain** (`unelevated`): in Codex 0.144.6 it refused every file edit. In Codex 0.156.1 file edits work, but every program that Node starts is refused (`spawn EPERM`), so the app cannot be created, and git cannot save work (the sandbox keeps the `.git` folder read-only).
- **Elevated** (the kind OpenAI prefers): it needs an administrator "Yes" (a User Account Control window for `codex-windows-sandbox-setup.exe`) and makes two Windows accounts, `CodexSandboxOffline` and `CodexSandboxOnline`, and firewall rules. With more than one Codex on the computer (the app and the terminal), that window can come back again and again. Inside it, `pnpm` was not found, so nothing could be built.
- **Full access** (`danger-full-access`, no sandbox) built the app, the login and the screens, with every check passing. It removes Codex's limits on files and network. The Ownercode guards still run (the guard test was blocked in that run), but nothing backs them up.

So a Codex owner on Windows chooses between full access for this project's work and Claude Code. If you pick full access, set it in Codex's settings file, `%USERPROFILE%\.codex\config.toml` (open it in Notepad; make it if it is missing), then restart Codex:

```
sandbox_mode = "danger-full-access"
```

Put it on the first line of the file, above any line in square brackets (a line below `[something]` belongs to that section and does nothing here). If the file already has a `sandbox_mode` line, change it instead of adding a second one: Codex refuses a file with the same setting twice.

**A box says `codex-windows-sandbox-setup.exe` and "The specified module could not be found".** The elevated sandbox's setup program failed to start. Your project and your Ownercode install are fine. Close it. OpenAI's own advice for this error: install the Microsoft Visual C++ Redistributable (x64), and update Codex. We saw the box once, with Codex 0.144.6; it did not come back in later tests, so we do not know which step fixes it.

**"Permission denied" on `.git`, "pnpm not found", `spawn EPERM`, or "dubious ownership".** These are sandbox limits, not a broken install. The agent must say so, and must never fix them with a setting for the whole computer, such as `git config --global` (a guard blocks that).

### Let the agent use your browser

The two browsers below are Claude features. If you use Codex, ask it what browser tools it has today. If it has none, it will give you the clicks to do yourself.

The agent has two browsers. Knowing which is which saves a lot of confusion.

- **Its own browser pane.** Built into the Claude app. No install. It opens as a panel next to the chat. It is NOT signed in to anything. Good for reading docs, checking your deployed site, testing a form.
- **Your Chrome.** Needs the **Claude in Chrome** extension from the Chrome Web Store. Search "Claude" — the store lists it simply as **Claude**, published by **Anthropic**; "Claude in Chrome" is the feature's name inside the listing, not its title, so don't skip a result just because it only says "Claude." Confirm the publisher reads Anthropic before installing. Install it, sign in to Claude inside it, keep Chrome open. Now the agent can drive tabs in your real Chrome, with your real logins. Good for the Cloudflare dashboard, GitHub settings, anything behind your account.

What it will do for you: navigate a dashboard, find the right page, create a database or bucket, copy an id back into the project, read an error page and explain it, fill in non-secret form fields.

What it will NOT do, by design, and you should never ask it to: type a password, paste an API key, enter a card number, create an account, accept terms, or click a final "pay" or "delete" button. It stops and hands those to you. Everything else it does in front of you; you watch the tab move.

How to use it: say "use my Chrome" or "use Chrome" and name the job. Examples that work well:

- "Use Chrome to open the Cloudflare dashboard and tell me what account and zones I have."
- "Use Chrome to go to the GitHub CLI download page and tell me which installer to click."
- "Use Chrome to walk the Cloudflare dashboard and find where D1 databases are listed; screenshot it."
- "Run the setup checklist from section 5 with me. For each step, open the right page in Chrome and stop when you need me."

The last one is the point. The list above is a map. The agent can drive it live.

If it says the Chrome tools are not available, the extension is not installed or Chrome is closed. Fix that, then say "try Chrome again."

## 6. The stack, and why

Copied from a live production site with a public marketing site, an internal console, a customer portal, and several background workers. It runs on the same pieces you will use.

| Piece | What it is | Why this one |
|---|---|---|
| **Astro** | Builds the website. Pages are files in `src/pages/`. Most output is plain HTML. | Fast sites, simple mental model, great with AI agents because it is mostly files. |
| **Preact islands** | Small interactive widgets (a form, a table, a search box) inside an Astro page. | Only the interactive parts ship JavaScript. Preact is a tiny React. |
| **Tailwind v4** | Styling with class names in the HTML. Theme lives in one CSS file. | Agents write Tailwind well. No separate config file. |
| **Cloudflare Workers** | Runs your server code at the edge. Serves the static site too. | One vendor for hosting, database, files, cron, AI. Free tier is generous. |
| **D1** | Cloudflare's SQL database (SQLite). Your CRM data lives here. | Free, simple, backed up, works with Workers with no setup. |
| **R2** | File storage (uploads, attachments). | Like S3 with no egress fees. |
| **KV** | Key-value cache. | Sessions, small settings, counters. |
| **Cloudflare Workflows / Queues / Cron** | Background and scheduled jobs. | "Send follow-up in 3 days" lives here. |
| **Better Auth** | Login and sessions. | Works on Workers with D1. Do not write your own auth. |
| **Anthropic API from a Worker** | Your app's AI features (summarize a call, draft an email, classify a lead). | Called from server code, key stored as a Cloudflare secret. |

**Architecture shape:** the website is built to static files. A single Worker serves those files AND runs the API under `functions/api/`. Interactive CRM screens are Preact islands that call that API. This is the shape the production site uses. It keeps "page" and "logic" apart, which keeps the agent from tangling them.

**One decision you should know exists.** For a login-walled CRM, there is a second valid shape: let Astro render pages on the server (the `@astrojs/cloudflare` adapter). Pros: pages can read the database directly, less API code. Cons: one more moving part, mixes page and logic, the kit's conventions were not written for it. The kit picks the static-plus-API shape. If your CRM ends up with dozens of data screens and the API layer feels like busywork, ask the agent to weigh the switch. Not before.

## 7. Vocabulary you will hear

- **Repo** — the project folder tracked by git.
- **Deploy** — push the built site and Worker to Cloudflare. `pnpm run deploy`.
- **Local dev** — run the app on your computer before you deploy it. The command is `pnpm run dev`, and the address is in your `AGENTS.md` under "How to run it on your computer". Easier: tell the agent "show me", and it starts the app and opens it for you.
- **Migration** — a file that changes the database structure. Adding a column is a migration.
- **Endpoint / route** — one URL your API answers, like `/api/contacts`.
- **Secret** — a password or key the Worker needs. Stored with `wrangler secret put`, never in files.
- **Binding** — how a Worker gets a handle to a database, bucket, or other Cloudflare thing. Set in `wrangler.jsonc`.
- **Island** — a Preact component inside an Astro page. Only it is interactive.
- **Smoke test** — a quick automated check that the main pages still load. Run before deploy.
- **Worktree** — a second copy of the repo for parallel work. Ignore until you run two agents at once.
- **Plugin** — an add-on for Claude Code or Codex. Ownercode is one.

## 8. When things go wrong

- **A window asks you to sign in to Git or GitHub.** Close it. Nothing in Ownercode needs a sign-in. It means a download address is wrong or cannot be reached. Ask the agent to check the address it used.
- **Build fails.** Paste the error to the agent. Say "root cause first, then fix." Do not accept a fix that only silences the error.
- **It says done but it is not.** "Show me the command output." If it cannot, it is not done.
- **It deleted or broke something.** Do not touch anything. Ask: "what is the last commit, and what changed since?" Git has it if it was committed. The Ownercode guards make the worst deletes hard.
- **A guard blocked something.** Read what it says. If you really want it, tell the agent so in chat. Do not ask it to find another way round.
- **You see `OWNERCODE SAFETY GUARDS ARE OFF`.** Stop and fix it before other work. In Claude Code, type `/plugin` and check that Ownercode is installed and on. In Codex, type `/hooks`, trust the Ownercode hooks, and restart.
- **It is going in circles.** Stop the session. Run handoff, start a new session, paste the handoff, add "the last approach failed because X, try a different approach." The failed approach is now in the task's notes, so the next session will not repeat it.
- **You do not know where the project is.** Open `tasks/`. Pending files are the future. The in-progress file is now. The archive is the past. If that does not answer it, ask the agent to "summarize tasks/ in plain English."
- **The local database will not open.** On Windows the error reads `SQLITE_CANTOPEN` or `unable to open database file`, or only `internal error; reference = ...`, from `npx wrangler d1 migrations apply DB --local`. The project folder path is too long. Move the whole project folder to a short one, such as `C:\Projects\my-app`, and open it again from there. Turning on Windows long paths does not fix it.
- **Cloudflare deploy fails.** Usually a missing binding or secret. Ask it to read `wrangler.jsonc` and the error together. If the error is about `_worker.js` and `.assetsignore`, the file `public/.assetsignore` must hold the line `_worker.js`. Never accept the fix that makes that file empty: it publishes your server code.
- **It asks for a key or password.** Never paste one into chat. Run the `wrangler secret put` command yourself in PowerShell.

## 9. What "good" looks like after a month

- Every session starts with next-task and ends with close-task or handoff. Always a commit.
- `tasks/archive/` has thirty files in it and you can explain each one in a sentence.
- `AGENTS.md` has grown ten or twenty rules, each one from a real mistake.
- You have two or three skills you use every day: commit, handoff, next-task.
- You can read a plan and spot the wrong assumption before it builds.
- You know what a migration, an endpoint, and an island are, and you can point at each in the folder tree.

You still do not write code. That is the point.

## Last verified

2026-09-24, on Windows 11 with Claude Code 2.1.159 and Codex CLI 0.144.6 (and 0.156.1 for the sandbox): plugin install, update, setup, sync and a guard block were run in both tools. "Codex on Windows": each sandbox kind was run with a throwaway Codex settings folder (git, pnpm, the admin window, the error box), and the second re-run's Codex build ran in the plain sandbox on 0.144.6 and 0.156.1 (both blocked) and in full access (built through the login task). OpenAI's pages on the Windows sandbox and the config file were read on the same date. The Claude Code facts in sections 2, 3 and 3a (permission modes, the mode selector, the usage ring, rewind, the starting model, effort levels, fast mode and Fable billing) were checked against code.claude.com on the same date; the model facts are also in `docs/versions.md`. Command names and menu paths can change; if one fails, ask the agent to read the tool's current docs.
