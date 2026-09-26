---
name: handoff
description: Use when the session is running out of room, the owner asks for a handoff, or work must stop before the task is done. Updates the task and writes a resume prompt.
---

Write a resume prompt so a fresh session can continue this work with no memory of this one.

Gather first: `git status --short --branch`, `git log --oneline -5`, the task with `status: in_progress` in `tasks/`, what is done, what is not, what was tried and failed, and any decision waiting on the owner.

If no task is in progress (the end of the planning session), the handoff points at the next task from the `next-task` skill, and there is no task file to update.

Before writing the handoff, update the task file: add a dated Notes entry that starts with `NEXT:` and the exact next action, tick any criteria you have proof for, bump `updated`, and commit the task file with the work. The task file is the durable record; the handoff block is only the pointer to it.

Output ONE fenced block with these headings. Keep it under 60 lines. Reference file paths; do not paste file contents.

```
# Handoff: <task in five words>

## Task
tasks/NNN-KIND-slug.md   (read it first; its last NEXT: note is the next step)

## Goal
<one sentence: what done looks like>

## State
branch: <name>   last commit: <hash> <message>
dirty: <files or "clean">
deployed: <url or "not deployed">   verified: <yes/no, how>

## Done
- ...

## Not done
- ...

## Tried and failed
- <approach> failed because <reason>. Do not retry it.

## Waiting on owner
- <decision, with the options>

## Next step
<the single next action>

## Read first
- AGENTS.md
- docs/plan-v1.md
- <other relevant files>
```

Also save the same block to `docs/handoff-next.md`, overwriting. Do not show the owner the block. Your reply is exactly these three parts, in this order, with nothing technical before the first:

1. **In plain English**, two lines: what the owner can do now that they could not before, and what the next session does.
2. The model for the next session, in one line, by the tool you run in: pick the Claude or Codex default from `docs/versions.md` at **High** effort. Planning and building use the same strong model. In Claude Code, Sonnet is only for purely mechanical work where even Opus at Low would be excessive; a build from a clear plan does not qualify. In Codex, never name a Claude model. Name the model picker or `/model` and the effort control; do not claim a setting changed without checking.
3. The paste, in its own copy box, with one line before it: "Start a new session in this folder and paste this line:"
   ```
   Read docs/handoff-next.md and continue.
   ```
