---
name: next-task
description: Use when the owner starts a session, says "next task", or asks what to work on. Finds the next task in tasks/ and presents it without starting it.
---

Find the next task to work and present it. Do not start it until the owner says go.

1. If any task in `tasks/` has `status: in_progress`, that is the task. Present it, read its last `NEXT:` note, and stop. Do not pick a second one.
2. Otherwise list `tasks/*.md`, read each file's frontmatter, keep `status: pending`. Never offer a `blocked` or `skipped` task, unless the owner named it. List those under the offer in one line each: "Waiting on you: 014, the Cloudflare account.".
3. Drop any whose `depends_on` names a task that is not in `tasks/archive/` with `status: done`.
4. Sort: priority `high` > `medium` > `low`, then lowest number first.
5. Present the top one: id, title, priority, scope, dependencies (each with its status), and the `## In Plain English` block verbatim. Add one line on the model it needs: building from a clear task fits Sonnet; planning, a data-model change or a stuck bug fits the biggest model. If the session runs a bigger model than the task needs, say so once and name the switch (the model picker in the Claude app; `/model` in the terminal or in Codex). In Codex, name the Codex model from `docs/versions.md`, never a Claude model.
6. Ask with the question tool (or, if it is missing, as a numbered list in your reply): start this task, pick a different one, skip it for now, or stop. On "skip" (or "not now", "later"): if the task mixes work you can do now with an owner-only step (a deploy, an account, a real file), skip only that step: move it to a new task with the `new-task` skill, finish and close the rest, and say so in one line. Otherwise set its `status: skipped`, add a dated note with the owner's words, commit the task file alone, and offer the next one. Never leave the owner with "there is no unblocked next task" while app work waits behind a skipped step. A task that waits on something only the owner can do (an account, a key, a real file) gets `status: blocked` instead, with what it waits for.
7. On go: set `status: in_progress`, set `updated` to today, commit the task file alone, then begin. Stay inside `scope`. If you must touch a file outside scope, say so first.
