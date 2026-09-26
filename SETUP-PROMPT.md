# Set up Ownercode

Open Claude Code or Codex in a new, empty folder with a short path, such as `C:\Projects\my-crm`.

Choose **Opus 5.5 or a newer Opus, High effort** in Claude Code, or **GPT-6 Astra, High effort** in Codex. These are Ownercode's defaults for setup, planning and building. Keep that model for the next session too. If it is not offered, ask the agent to check your tool's model list before you continue.

Copy everything inside this box into your agent:

```text
Set up the free Ownercode kit in this tool. Do the technical work; stop before the business interview.

1. Read https://github.com/Dirty-Work-Software/ownercode/blob/main/GUIDE.md. Give me five short bullets from sections 1, 3, 3b and 4; skim 2 and 3a. Complete section 5 with me. Confirm a new, empty project folder with a short path; create one if needed without overwriting work. Show its full path.

2. Check Git first; install it if missing. Check and install missing Node.js LTS (at least 22.12), pnpm and GitHub CLI from official sources or a trusted package manager. Verify versions. Install Node before the plugin. Request administrator approval if needed.

3. Confirm Opus 5.5 or a newer Opus at High effort in Claude Code, or GPT-6 Astra at High in Codex. If you cannot set or verify this, guide me through the controls and wait for confirmation. Keep this model for planning and building.

4. Install only for this tool. Claude Code: run claude plugin marketplace add Dirty-Work-Software/ownercode, then claude plugin install ownercode@ownercode. Codex: run codex plugin marketplace add Dirty-Work-Software/ownercode, then codex plugin add ownercode@ownercode. Verify the install. Save the repository's START-HERE-PROMPT.md in my project; do not run it.

5. Check GitHub and Cloudflare sign-in; help me complete missing account and browser steps. I handle passwords, payment and consent. Public plugin installation needs no GitHub login. Defer an Anthropic API key until my app needs AI; never ask for secrets in chat.

6. If a sandbox, permission or approval check blocks you, show the command and error. Request the specific approval through the normal tool flow. Do not disable safeguards or treat approval as overriding a policy refusal. If still blocked, give exact commands for my operating system, starting in the full project path, and wait for results. Say "sandbox-only" only when verified.

7. Show command output and a done/waiting checklist. Guide my final controls: Claude Code: /plugin > Marketplaces > ownercode > Enable auto-update. Codex: /hooks > review and trust Ownercode hooks. Tell me to restart, reopen the same folder, and check for "Ownercode safety guards: on." in a fresh Codex session. Then tell me to paste the saved start prompt and answer its questions myself. Do not start the interview or build the app.
```

## Last verified

2026-09-25. Model and effort controls checked against [Claude Code model configuration](https://code.claude.com/docs/en/model-config) and [Codex models](https://learn.chatgpt.com/docs/models). Hook review checked against [Codex hooks](https://learn.chatgpt.com/docs/hooks). This prompt has been read back against GUIDE section 5; a fresh-machine installation has not been run with this revision.
