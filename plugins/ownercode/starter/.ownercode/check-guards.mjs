// Runs from this project, not from the plugin, so it still works when the
// plugin's own files are gone.
//
//   node .ownercode/check-guards.mjs        on every message the owner sends
//   node .ownercode/check-guards.mjs --pre  before every command (Codex)
//
// The plugin's session-start check leaves a heartbeat named by the session id,
// holding the plugin folder it ran from. No heartbeat means the plugin's hooks
// never ran: it is off, uninstalled, or its hooks were never trusted. A
// heartbeat whose folder is gone means the plugin updated itself during this
// session and its command guards may run from the removed copy, which lets
// every command through. Either way nothing else would say so. Prints nothing
// while the guards run.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

let id;
try { id = JSON.parse(readFileSync(0, 'utf8')).session_id; } catch {}
if (!id) process.exit(0);
const beat = join(tmpdir(), `ownercode-guards-${id}`);

if (process.argv.includes('--pre')) {
  let plugin = '';
  try { plugin = readFileSync(beat, 'utf8').trim(); } catch {}
  if (!plugin || existsSync(join(plugin, 'hooks', 'guards.mjs'))) process.exit(0);
  const reason = `OWNERCODE SAFETY GUARDS ARE OFF UNTIL A RESTART: Ownercode updated itself during this session and removed the copy its guards run from (${plugin}). Stopped this command, because it may not be checked now. Tell the owner, in plain words: close this session and start a new one. This happens once after an update; nothing is broken.`;
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
  process.exit(0);
}

if (existsSync(beat)) process.exit(0);
console.log(`OWNERCODE SAFETY GUARDS ARE OFF in this session. The Ownercode plugin's hooks did not run.
Tell the owner this first, in plain words, before any other work. Then help them fix it:
- First, close this session and start a new one. Right after a plugin update, Codex can start a session with no Ownercode hooks, and a restart fixes that. If this message comes back:
- Claude Code: run "claude plugin list" and check that ownercode@ownercode is enabled. If not: claude plugin enable ownercode@ownercode, then restart.
- Codex: type /plugins and check that Ownercode is installed and enabled, then type /hooks and trust its hooks. Then restart.`);
