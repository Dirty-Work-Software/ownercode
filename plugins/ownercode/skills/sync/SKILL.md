---
name: sync
description: Use when a message says Ownercode was updated, or the owner asks to update the kit's files in this project. Brings in newer starter files and never overwrites a file the owner changed.
---

# Sync the starter files

The plugin updates itself. The files it wrote into this project (`AGENTS.md`,
the settings, `docs/`, `tasks/README.md`) change only when this runs.

1. The plugin folder is two levels above this skill's folder (the folder that
   holds this SKILL.md). Run, from the project root:
   `node "<plugin folder>/scripts/starter.mjs" sync`
2. Files the owner never edited are replaced, and new files are added. Tell the
   owner which, in one line each.
3. For each `CHANGED BY YOU, NOT OVERWRITTEN` file, the output shows exactly
   what the kit changed. Explain each change in plain words. Ask with the
   question tool whether to bring it into their copy. Make only the edits they
   approve, by hand, keeping everything they wrote. Then run
   `node "<plugin folder>/scripts/starter.mjs" accept <file>`
   so sync stops reporting it.
4. Run sync again. It must print `Up to date`. Commit with the `commit` skill.
