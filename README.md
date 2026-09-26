# Ownercode

By Dirty Work Software. `ownercode.dev`

Build a business website and/or small business software (customers, bookings, jobs, members) by directing an AI agent. You make the decisions. The agent writes the code. Ownercode works in **Claude Code** and in **OpenAI Codex**.

Three parts:

- **[GUIDE.md](GUIDE.md)** — how this all works. Read once. Come back when lost.
- **The Ownercode plugin** — the rules, the task system, the safety guards, and the skills. You install it once. It updates itself.
- **[START-HERE-PROMPT.md](START-HERE-PROMPT.md)** — paste it as your first message in a new, empty project.

## Order of operations

1. Read GUIDE.md sections 1, 3, 3b and 4 (about 10 minutes). Skim sections 2 and 3a now; read them properly later.
2. Do the one-time setup in GUIDE.md section 5. Install **Git first**: both tools need it to download the plugin.
3. Install the plugin (below).
4. Make an empty folder with a short path, such as `C:\Projects\my-app` (GUIDE.md section 5 says why). Open your tool in it. Paste START-HERE-PROMPT.md. Answer its questions. This first session plans and writes the task list; it builds nothing.
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

**A window asks you to sign in to Git or GitHub?** Close it. Ownercode needs no account and no sign-in. That window means the address has a typo, or the repo cannot be reached. Check the spelling: `Dirty-Work-Software/ownercode`.

**Let the agent do it.** You can paste this to either agent instead:

> Install the Ownercode plugin for the tool you are running in, from the plugin marketplace `Dirty-Work-Software/ownercode` on GitHub. Claude Code: `claude plugin marketplace add Dirty-Work-Software/ownercode`, then `claude plugin install ownercode@ownercode`. Codex: `codex plugin marketplace add Dirty-Work-Software/ownercode`, then `codex plugin add ownercode@ownercode`. Check that Git is installed first. Show me the output, then tell me to restart, and tell me any step I must do myself: in Claude Code, turning on auto-update (`/plugin`, Marketplaces, ownercode, Enable auto-update); in Codex, trusting the hooks (`/hooks`). If a command fails only inside your sandbox, say so, and give me the two lines to type in my own terminal.

## Last verified

2026-09-24, on Windows 11 with Claude Code 2.1.159 and Codex CLI 0.144.6. Install, update and a safety-guard block were run in both tools against a local copy of this repository. Command names can change; if one fails, ask the agent to read the tool's current plugin docs.

Version 0.2.1: guard repair guidance uses the marketplace where Ownercode was installed, including a bundled distribution.

Version 0.2.2: the start prompt asks how customers find you (competitors, their search words, your area), and every public page gets the search basics.
