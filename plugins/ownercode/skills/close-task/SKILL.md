---
name: close-task
description: Use when every criterion of the task in progress is proven, or the owner asks to close a task. Ticks with proof, archives, commits.
---

Close the task the owner named, or the one with `status: in_progress` if they named none.

1. Read the task. Check whether this task also did work that belongs to another open task (a screen built early, an endpoint another task names). If so, tick what is proven in that task, add a dated note there, and tell the owner.
2. Read the task's `## Owner rules` and the owner's answers it points to. Check each rule against what was built, and fix any miss before closing. Then list every choice you made that the owner did not (a price, what a button charges, a schedule, a default, a wording the owner will see). Ask them as questions in your report, with your pick marked. Do not close a task that breaks an owner rule.
3. For the rest of this task, for every unticked acceptance criterion, either run the proof now and tick it, or stop and tell the owner it is not done. Do not close a task with an unticked criterion. To leave an item for later, move it to a new task with the `new-task` skill and note the new id here.
4. Add a final Notes entry dated today: what shipped, the commit hash, the deployed URL if any.
5. Set `status: done`, set `updated` to today.
6. Move the file to `tasks/archive/` with `git mv`.
7. If `docs/handoff-next.md` names this task, overwrite it with two lines: `# No handoff`, then `The task it named is closed. Run the next-task skill.` So an old paste never points a new session at finished work.
8. Commit: `chore(tasks): close NNN-KIND slug`.
9. Report, in this order. First **In plain English**, two lines: what the owner can do now (and how to see it: the address to open, or "say 'show me'"), and what the next task gives them. Then the questions from step 2, if any. Then, for the technically curious, the id, what shipped, and the check output in a few lines. Then the next pending task from the `next-task` skill, steps 2 to 5 (present only, do not start it). Say "shipped" only if it is deployed.
10. End by telling them how to start the next task: a new session in this folder, the model to pick (see the `handoff` skill), and the line to type: `/ownercode:next-task` in Claude Code, `$ownercode:next-task` in Codex.
