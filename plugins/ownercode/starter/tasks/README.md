# Tasks

One file per task. This folder is how work survives across sessions. A session's memory dies when it ends; the task file does not.

## Why

A Claude Code session has a context limit. Medium and large projects will not fit in one session. So: every piece of work gets a task file. A session reads its task, does the work, updates the task, and ends. The next session reads the updated task and continues. No session needs to remember what another session did.

## File format

`tasks/NNN-KIND-short-slug.md`. `NNN` is a three-digit number that only goes up. `KIND` is `CODE`, `CONTENT`, `CONFIG`, or `CHORE`. The slug is three to six words.

```markdown
---
id: 003-CODE
title: "Contacts list screen"
kind: code               # code | content | config | chore
status: pending          # pending | in_progress | done | cancelled
priority: high           # high | medium | low
depends_on: [002-CODE]   # task ids that must be done first, or []
scope: "src/components/ContactList.tsx, src/pages/app/contacts.astro, functions/api/contacts.ts"
created: 2026-09-21
updated: 2026-09-21
---

## In Plain English
Two or three sentences a non-coder understands. What this gives the owner when done.

## Description
What needs to happen and why. Enough that a fresh session with no memory can start.

## Acceptance Criteria
- [ ] Each line is one checkable thing. Tick it only with proof (a command that passed, a URL that renders).
- [ ] `pnpm run build` and `pnpm run typecheck` pass.
- [ ] One smoke test covers the new screen or endpoint.

## Notes
### 2026-09-21
Dated entries. What was tried, what failed, what was decided, what the next session should do first.
```

## Kinds

| kind | Covers |
|---|---|
| `code` | Screens, endpoints, migrations, scripts, skills, hooks. The artifact is source code. |
| `content` | Website pages, copy, images. The artifact is words or media. |
| `config` | Things outside the repo: Cloudflare dashboard, DNS, a third-party account. Usually needs the owner. |
| `chore` | Cleanup, docs, dependency bumps. No new feature. |

## Statuses

| status | Meaning |
|---|---|
| `pending` | Ready to pick up, or waiting on `depends_on`. |
| `in_progress` | A session is on it now. Only one task is in progress at a time. |
| `done` | Every acceptance criterion is ticked with proof. File moves to `tasks/archive/`. |
| `cancelled` | Not wanted any more. Say why in Notes. File moves to `tasks/archive/`. |

## Workflow

1. Start a session. Run the `next-task` skill. It picks the highest-priority pending task with no unmet dependencies and shows it to you.
2. The session sets `status: in_progress`, bumps `updated`, and works only inside `scope`.
3. As it works, it ticks criteria with proof and adds a dated Notes entry for anything a future session must know.
4. If the session must stop before done (context is full, a decision is needed, a blocker appeared): it writes a Notes entry that starts with `NEXT:` and the exact next action, leaves status `in_progress`, commits the task file with the work, and runs the `handoff` skill.
5. When every criterion is ticked, The `close-task` skill moves the file to `tasks/archive/` with `status: done`, and commits.
6. New work found mid-task does not get done mid-task. It gets a new task file through the `new-task` skill, and the current task carries on.

## Rules

- One task per session. Two tasks in one session is how context runs out with both half done.
- A criterion is ticked with proof or it is not ticked.
- Never edit a task's `id` or filename. Numbers only go up. Next number = highest number in `tasks/` and `tasks/archive/` plus one.
- Never delete a task file. Cancel it.
- `tasks/lessons.md` is for corrections that became rules. It is not a task.
- `tasks/archive/` is history. Read it when you wonder why something is the way it is.
