---
name: commit
description: Use when the owner asks to commit or save the work. Stages only this session's files and commits locally. Never pushes.
---

Create a git commit for the current changes. Local only. Never push, never open a PR from this command.

1. Run in parallel: `git status`, `git diff`, `git diff --staged`, `git log --oneline -10`.
2. Decide which dirty files are YOUR change this session. Stage those by name with `git add <paths>`. Never `git add -A`. Never stage `.env`, `.dev.vars`, or anything that looks like a key. If there are dirty files you did not edit, leave them and tell the owner.
3. If the change touches `src/` or `functions/`, confirm `pnpm run build` and `pnpm run typecheck` passed this session. If not, run them now. Do not commit a broken build.
4. Write the message: a scope prefix (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`), then one or two sentences on WHY, not what. Match the style of recent commits. No em dashes.
5. Commit with a heredoc so the message is exact. End the message with a `Co-Authored-By:` line for the current model.
6. Run `git status` to confirm the commit landed. If a hook failed, fix the cause and make a NEW commit. Never amend, never `--no-verify`.
7. Report: the commit hash, the one-line message, and the files included.
