// Runs from this project, not from the plugin, on every message the owner
// sends. The plugin's session-start check leaves a heartbeat named by the
// session id. No heartbeat means the plugin's hooks never ran: it is off,
// uninstalled, or its hooks were never trusted. Then every safety guard is
// gone, and nothing else would say so. Prints nothing while the guards run.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let id;
try { id = JSON.parse(readFileSync(0, 'utf8')).session_id; } catch {}
if (!id || existsSync(join(tmpdir(), `ownercode-guards-${id}`))) process.exit(0);

console.log(`OWNERCODE SAFETY GUARDS ARE OFF in this session. The Ownercode plugin's hooks did not run.
Tell the owner this first, in plain words, before any other work. Then help them fix it:
- First, close this session and start a new one. Right after a plugin update, Codex can start a session with no Ownercode hooks, and a restart fixes that. If this message comes back:
- Claude Code: run "claude plugin list" and check that ownercode@ownercode is enabled. If not: claude plugin enable ownercode@ownercode, then restart.
- Codex: type /plugins and check that Ownercode is installed and enabled, then type /hooks and trust its hooks. Then restart.`);
