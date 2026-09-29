# Ownercode changelog

Newest first. Each release says what changed and what you must do. After an update, ask the agent: "What changed in Ownercode, and what must I do?"

## 1.0.4 (2026-09-29)

- Updates now reach every installed copy. Claude Code updates one copy of a plugin at a time, so a second copy could stay old. The guide's update steps (section 3c) now update each copy, and the session start says when two copies disagree. **You:** if the session start says so, run the lines it gives you, then restart.
- A site with no database connected answers "The database is not connected" (503) instead of crashing. **You:** run the sync skill, then ask the agent to apply the new login check from `docs/astro-cloudflare-conventions.md` to `functions/_middleware.ts`, with its test.
- Every answer now says `no-transform`, so Cloudflare cannot add its Web Analytics script, which the site's own security rules block (a console error). Comes with the same middleware change. **You:** nothing more. If you want Cloudflare's analytics, ask the agent.
- The session start warns when a project file names a plugin folder by its full path. That path breaks at the next update. **You:** let the agent replace it.
- This changelog.

## 1.0.3 (2026-09-28)

- The safety guards ask fewer needless questions. **You:** nothing.

## 1.0.2 (2026-09-28)

- Security: the login check refuses encoded slashes and dots in an address, which could reach a private page without sign-in. **You:** the session start says if your project has the old check. Then follow what it says, the same day.

## 1.0.1 (2026-09-28)

- The login keeps you signed in while you use the app. Before, it signed you out 7 days after sign-in. **You:** the session start says if your project has the old check. Then follow what it says.
