---
name: close-task
description: Use when every criterion of the task in progress is proven, or the owner asks to close a task. Ticks with proof, archives, commits.
---

Close the task the owner named, or the one with `status: in_progress` if they named none.

1. Read the task. Check whether this task also did work that belongs to another open task (a screen built early, an endpoint another task names). If so, tick what is proven in that task, add a dated note there, and tell the owner.
2. For the rest of this task, for every unticked acceptance criterion, either run the proof now and tick it, or stop and tell the owner it is not done. Do not close a task with an unticked criterion. To leave an item for later, move it to a new task with the `new-task` skill and note the new id here.
3. Add a final Notes entry dated today: what shipped, the commit hash, the deployed URL if any.
4. Set `status: done`, set `updated` to today.
5. Move the file to `tasks/archive/` with `git mv`.
6. If `docs/handoff-next.md` names this task, overwrite it with two lines: `# No handoff`, then `The task it named is closed. Run the next-task skill.` So an old paste never points a new session at finished work.
7. Commit: `chore(tasks): close NNN-KIND slug`.
8. Report the id, what shipped, and the next pending task from the `next-task` skill, steps 2 to 5 (present only, do not start it). Say "shipped" only if it is deployed.
9. End with **In plain English**, two lines: what the owner can do now, and what the next task gives them. Then tell them how to start it: a new session in this folder, the model to pick (see the `handoff` skill), and the line to type: `/ownercode:next-task` in Claude Code, `$ownercode:next-task` in Codex.
