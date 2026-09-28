---
name: new-task
description: Use when new work turns up, or the owner asks to add a task. Writes one task file in tasks/ and does not start the work.
---

Create a new task file in `tasks/` from the short description the owner gave. Do not start the work.

1. Read `tasks/README.md` for the format.
2. Find the next number: the highest three-digit number across `tasks/*.md` and `tasks/archive/*.md`, plus one. Never reuse a number.
3. Pick the kind (`code`, `content`, `config`, `chore`) and priority. If either is unclear, ask with the question tool.
4. Work out `depends_on` by scanning open tasks for anything this one needs first.
5. Write `tasks/NNN-KIND-slug.md` with every section in the template. The `## In Plain English` block is mandatory and must be readable by a non-coder. Acceptance criteria must be checkable, not vague.
6. Show the owner the id, title, plain-English block, and criteria. Ask if anything is wrong.
7. Commit the task file alone: `chore(tasks): add NNN-KIND slug`.
