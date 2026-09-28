---
name: setup
description: Use when the owner asks to set up Ownercode in this project, or the start prompt says to. Writes the Ownercode starter files (AGENTS.md, CLAUDE.md, docs, tasks, each tool's settings) into the project one time.
---

# Set up Ownercode in this project

The plugin gives you the skills and the safety guards. This writes the files the
project itself keeps: `AGENTS.md` (the rules), `CLAUDE.md` (points to it),
`docs/`, `tasks/`, `.gitignore`, `.gitattributes`, and each tool's settings.

1. The plugin folder is two levels above this skill's folder (the folder that
   holds this SKILL.md). Run, from the project root:
   `node "<plugin folder>/scripts/starter.mjs" setup`
2. Show the owner the list of files it wrote.
3. If it prints `CHANGED BY YOU, NOT OVERWRITTEN`, a file with that name was
   already here. Nothing in it was touched. Show the owner the difference in
   plain words and ask, with the question tool, whether to keep theirs, take the
   kit's, or merge the two. After a merge or a keep, run
   `node "<plugin folder>/scripts/starter.mjs" accept <file>`.
4. Codex only: the project's `.codex/` settings load only in a trusted project.
   If Codex has not asked to trust this folder, tell the owner to trust it.
5. Commit the new files with the `commit` skill, including `.ownercode/`.

## Switching from the old Ownercode zip

A project made from the old zip has the guards in `.claude/hooks/`, the commands
in `.claude/commands/`, and the rules in `CLAUDE.md`. The plugin now supplies
the guards and the skills, so the old copies must go, or every guard runs twice
and the old copies never update. Do this only with the owner's go-ahead, and
commit before you start so every step can be undone.

1. Run setup as above. It stops on `CLAUDE.md`, `.claude/settings.json`,
   `.gitignore` and the docs the owner already has. Nothing is overwritten.
   For each stopped file under `docs/` and `tasks/`, check `git log` for it:
   if only the first commit touched it, the owner never edited it, so copy
   the kit's version over it from `<plugin folder>/starter/<file>`.
2. Rules: the kit's rules now live in `AGENTS.md`. Move every line the owner
   added to their old `CLAUDE.md` (project name, folder map, their own rules)
   into `AGENTS.md`, then make `CLAUDE.md` the single line `@AGENTS.md`. Show
   the owner the result before you save it.
3. Settings: in `.claude/settings.json`, delete the `hooks` block that runs
   `.claude/hooks/...` and keep the owner's own permissions. Take the kit's new
   lines from the difference setup printed.
4. Remove `.claude/hooks/` and `.claude/commands/` with `git rm -r`, so the
   removal is in history and can be undone.
5. For each file from step 1, run `node "<plugin folder>/scripts/starter.mjs" accept <file>`,
   then run setup again. It must finish with `Ownercode starter ... is in place`.
6. Start a new session. It must not say the safety guards are off. Commit.
