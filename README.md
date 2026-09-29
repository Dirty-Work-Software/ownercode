# Ownercode

By Dirty Work Software. `ownercode.dev`

Build your own CRM, the software that keeps your customers, jobs and notes, by directing an AI agent. It sits behind your own safe login, with a simple home page that links to it. You make the decisions. The agent writes the code. Nine safety guards stop the mistakes you cannot undo. Ownercode works in **Claude Code** and in **OpenAI Codex**.

Want a public website that brings customers into your CRM, with search research and a quote form? That is Ownercode Pro: ownercode.dev/pro.

Three parts:

- **[GUIDE.md](GUIDE.md)** — how this all works. Read once. Come back when lost.
- **The Ownercode plugin** — the rules, the task system, the safety guards, and the skills. You install it once. It updates itself.
- **[START-HERE-PROMPT.md](START-HERE-PROMPT.md)** — paste it as your first message in a new, empty project.

## Order of operations

1. Read GUIDE.md sections 1, 3, 3b and 4 (about 10 minutes). Skim sections 2 and 3a now; read them properly later.
2. Open Claude Code or Codex in a new, empty folder with a short path. Choose **Opus 5.5 or a newer Opus, High effort**, or **GPT-6 Astra, High effort** in Codex.
3. Paste [SETUP-PROMPT.md](SETUP-PROMPT.md). The agent explains the guide, installs missing tools (Git first, then Node before the plugin), completes the setup it can, and shows the account and approval steps you must do. Restart when it tells you to.
4. Reopen that same folder, such as `C:\Projects\my-app`. Keep the same model at High effort. Paste START-HERE-PROMPT.md. Answer its questions. This first session plans and writes the task list; it builds nothing.
5. When it says it is done, start a new session in the same folder, pick the model it names, and paste the one line it gives you. That session builds the first page and puts it live.
6. Read GUIDE.md sections 6 to 9 later, when you hit the situation they describe.

## Install the plugin

**Claude Code.** Type these two lines in Claude Code, one at a time:

```
/plugin marketplace add Dirty-Work-Software/ownercode
/plugin install ownercode@ownercode
```

Then turn on updates, once: type `/plugin`, open **Marketplaces**, pick **ownercode**, choose **Enable auto-update**.

**Codex.** Run these two lines in a terminal:

```
codex plugin marketplace add Dirty-Work-Software/ownercode
codex plugin add ownercode@ownercode
```

Then open Codex, type `/hooks`, and trust the Ownercode hooks. Codex runs no safety guard until you do this once. Codex updates the plugin by itself.

Check it: in a new Codex session, the first message must be `Ownercode safety guards: on.` If it is not, the guards are off. Type `/hooks`, trust the Ownercode hooks, and restart Codex.

On Windows, Codex may show a box about `codex-windows-sandbox-setup.exe`. GUIDE.md section 5, "Codex on Windows", says what it is and what to do.

**A window asks you to sign in to Git or GitHub?** Close it. Ownercode needs no account and no sign-in. Check the address and connection before you try again. Check the spelling: `Dirty-Work-Software/ownercode`.

**Let the agent do it.** Copy the box in [SETUP-PROMPT.md](SETUP-PROMPT.md). It covers the guide, missing tools, installation, approvals and restart. You still handle account consent, hook trust, and the business interview.

## Latest release

1.0.4: updates reach every installed copy, and each release lists what changed and what you must do, in `plugins/ownercode/CHANGELOG.md`. A site with no database connected answers with a plain message instead of crashing, and Cloudflare can no longer add a script the site blocks.

## License

PolyForm Shield 1.0.0: use it for anything, run your business on it and share it, but do not sell a rival kit. The files it writes into your project are yours, with no conditions. See [LICENSE](LICENSE).

## Last verified

2026-09-24, on Windows 11 with Claude Code 2.1.159 and Codex CLI 0.144.6. Install, update and a safety-guard block were run in both tools against a local copy of this repository. Command names can change; if one fails, ask the agent to read the tool's current plugin docs.
