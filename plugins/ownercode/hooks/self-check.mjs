#!/usr/bin/env node
// Session start for Ownercode, in both tools. Checks that the safety guards
// still fire, and says a few things the owner needs to know. Silent when
// everything is healthy.
//
//   node self-check.mjs           Claude Code SessionStart hook (hooks.json)
//   node self-check.mjs --codex   Codex SessionStart hook (codex-hooks.json)
//   node self-check.mjs --check   by hand: the plugin checks only, exit 1 on a problem
//
// A guard that stopped working looks exactly like a guard that was never
// needed: both are silent. So this runs the whole attack list against the
// guards, and then runs each tool's real hook command from its wiring file,
// because a guard nothing calls is a file, not a guard.
//
// It reports to Claude (additionalContext) and to the owner (systemMessage),
// with exit 0. A hook that exits 1 with stderr shows the owner one easy line
// and shows the agent nothing.
//
// It also leaves a heartbeat named by the session id in the temp folder. The
// project's own hook (.ownercode/check-guards.mjs) looks for it: no heartbeat
// means this plugin's hooks never ran, so the guards are off. It holds this
// plugin's folder: if an update removes that folder mid-session, the project
// hook stops each command until a restart.

import { readFileSync, writeFileSync, existsSync, readdirSync, unlinkSync } from 'node:fs';
import { join, dirname, basename, resolve } from 'node:path';
import { tmpdir, homedir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOKS = dirname(fileURLToPath(import.meta.url));
const PLUGIN = dirname(HOOKS);
const codex = process.argv.includes('--codex');
const byHand = process.argv.includes('--check');

let input = {};
if (!byHand && !process.stdin.isTTY) { try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {} }
if (input.session_id) { try { writeFileSync(join(tmpdir(), `ownercode-guards-${input.session_id}`), PLUGIN); } catch {} }

const problems = []; // the guards are not protecting this session
const notes = [];    // true, and the owner should hear it

const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const matches = (matcher, tool) => !matcher || matcher === '*' || new RegExp(`^(?:${matcher})$`).test(tool);
const findHook = (wiring, event, file) => (wiring?.hooks?.[event] || []).flatMap((g) => (g.hooks || []).map((h) => ({ ...h, matcher: g.matcher })))
  .find((h) => typeof h.command === 'string' && h.command.includes(`hooks/${file}`));

// Claude Code updates one installed copy of a plugin at a time (the most specific
// scope for this project), so a user copy and a project copy can drift apart, and
// only one of them loads. Each line names a plugin whose copies here disagree.
function copiesDisagree(file, project) {
  const norm = (p) => resolve(p).replaceAll('\\', '/').toLowerCase();
  const out = [];
  for (const [id, list] of Object.entries(readJson(file)?.plugins || {})) {
    if (!/^ownercode(-pro)?@/.test(id) || !Array.isArray(list)) continue;
    const here = list.filter((c) => ['user', 'managed'].includes(c.scope) || (c.projectPath && norm(c.projectPath) === norm(project)));
    if (new Set(here.map((c) => c.version)).size > 1) out.push(`${id}: ${here.map((c) => `${c.scope} ${c.version}`).join(', ')}. Tell the owner, and give them these lines for a terminal in this project folder, then a restart: ${here.map((c) => `claude plugin update ${id} --scope ${c.scope}`).join(' ; ')}`);
  }
  return out;
}
// A plugin folder named by its full path goes stale at the next update or move.
// Project files name it by a lookup instead (two levels above the loaded skill).
const pluginPaths = (text) => [...new Set(text.match(/(?<![\w./\\-])(?:[A-Za-z]:[\\/]|~[\\/]|\/)[^\s`'"<>()]*?[\\/]plugins[\\/][^\s`'"<>()]*?ownercode(?:-pro)?/gi) || [])];

// 1. The wiring. Claude Code reads hooks/hooks.json; Codex reads the file its
// manifest names. Each must call the guards, for every shell tool it has.
const claude = readJson(join(HOOKS, 'hooks.json'));
const codexWiring = readJson(join(HOOKS, 'codex-hooks.json'));
const claudePre = findHook(claude, 'PreToolUse', 'guards.mjs');
const codexPre = findHook(codexWiring, 'PreToolUse', 'guards.mjs');
if (!claudePre) problems.push('hooks/hooks.json does not run guards.mjs before tool calls, so Claude Code has no guards.');
else {
  for (const tool of ['Bash', 'PowerShell']) if (!matches(claudePre.matcher, tool)) problems.push(`hooks/hooks.json: the guards do not watch the ${tool} tool (matcher "${claudePre.matcher}"). Use "Bash|PowerShell".`);
  if (claudePre.if) problems.push(`hooks/hooks.json: the guards have an "if" filter (${claudePre.if}), which skips wrapped commands such as bash -c "git ...". Remove it.`);
}
if (!findHook(claude, 'SessionStart', 'self-check.mjs')) problems.push('hooks/hooks.json does not run self-check.mjs at session start, so nobody hears when the guards break.');
if (readJson(join(PLUGIN, '.codex-plugin', 'plugin.json'))?.hooks !== './hooks/codex-hooks.json') problems.push('.codex-plugin/plugin.json does not point at ./hooks/codex-hooks.json, so Codex loads no guards.');
if (!codexPre || !/--codex/.test(codexPre.command)) problems.push('hooks/codex-hooks.json does not run guards.mjs --codex before tool calls, so Codex has no guards.');
else if (!matches(codexPre.matcher, 'Bash')) problems.push(`hooks/codex-hooks.json: the guards do not watch Codex's shell tool (matcher "${codexPre.matcher}"). Use "Bash".`);
if (!findHook(codexWiring, 'SessionStart', 'self-check.mjs')) problems.push('hooks/codex-hooks.json does not run self-check.mjs at session start.');

// 2. Each tool's real hook command, run the way the tool runs it, must block.
const probe = JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git commit --allow-empty --no-verify -m test' }, cwd: tmpdir() });
function runWired(hook) {
  const command = hook.command.replaceAll('${CLAUDE_PLUGIN_ROOT}', PLUGIN).replaceAll('$CLAUDE_PLUGIN_ROOT', PLUGIN);
  return spawnSync(command, { shell: true, input: probe, encoding: 'utf8', windowsHide: true, env: { ...process.env, CLAUDE_PLUGIN_ROOT: PLUGIN, PLUGIN_ROOT: PLUGIN } });
}
if (claudePre) {
  const r = runWired(claudePre);
  if (r.status !== 2 || !/^BLOCK:/m.test(r.stderr)) problems.push(`Claude Code's guard command let git commit --no-verify through (exit ${r.status}${r.stderr ? `: ${r.stderr.trim().split('\n')[0]}` : ''}).`);
}
if (codexPre) {
  const r = runWired(codexPre);
  if (!/"permissionDecision":"deny"/.test(r.stdout)) problems.push(`Codex's guard command let git commit --no-verify through (exit ${r.status}${r.stderr ? `: ${r.stderr.trim().split('\n')[0]}` : ''}).`);
}

// 3. The attack list, in throwaway repos. A wrong allow is a hole; a wrong
// block is a guard that will get switched off.
try {
  const { runCases } = await import('./guards.test.mjs');
  const bad = runCases().filter((r) => r.verdict !== 'ok');
  for (const r of bad.slice(0, 8)) problems.push(`guard ${r.verdict === 'HOLE' ? 'hole' : r.verdict.toLowerCase()}: "${r.command.replace(/\n/g, ' ')}" gave ${r.got}, expected ${r.expect}.`);
  if (bad.length > 8) problems.push(`and ${bad.length - 8} more guard cases wrong.`);
} catch (e) {
  problems.push(`the guards could not be tested: ${e.message}`);
}

// The two checks above, proved on made-up input, when run by hand.
if (byHand) {
  const t = join(tmpdir(), `ownercode-copies-${process.pid}.json`);
  writeFileSync(t, JSON.stringify({ plugins: { 'ownercode@ownercode': [{ scope: 'user', version: '1.0.2' }, { scope: 'project', projectPath: '/p/A', version: '1.0.3' }, { scope: 'project', projectPath: '/p/B', version: '1.0.2' }], 'other@x': [{ scope: 'user', version: '1' }, { scope: 'project', projectPath: '/p/A', version: '2' }] } }));
  if (copiesDisagree(t, '/p/a').length !== 1 || copiesDisagree(t, '/p/b').length) problems.push('self-check: the installed-copies check gives a wrong answer.');
  try { unlinkSync(t); } catch {}
  if (pluginPaths('C:\\Scratch\\kit-pro\\plugins\\ownercode-pro and `~/.claude/plugins/cache/ownercode/ownercode/1.0.3` but not free/plugins/ownercode or <pro-root>/skills').length !== 2) problems.push('self-check: the plugin-path check gives a wrong answer.');
}

// Everything above lives in the plugin's own files, which an update replaces.
const pluginFix = problems.length ? 'These are in the Ownercode plugin\'s own files, so do not edit them. Update the plugin, then restart. Use the marketplace where you installed Ownercode. Claude Code: update that marketplace and its Ownercode plugin. Codex: upgrade that marketplace. If it stays broken, reinstall the plugin.' : '';

// 4. The project this session runs in. Not when run by hand from the kit repo.
const git = (dir, ...args) => spawnSync('git', args, { cwd: dir, encoding: 'utf8', windowsHide: true });
if (!byHand) {
  const start = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();
  const top = git(start, 'rev-parse', '--show-toplevel').stdout?.trim();
  const project = top || start;

  for (const f of ['.claude/settings.json', '.claude/settings.local.json']) {
    const s = readJson(join(project, f));
    if (!s) continue;
    if (s.disableAllHooks) problems.push(`${f} has "disableAllHooks": true, which turns every guard off.`);
    const wide = (s.permissions?.allow || []).filter((r) => ['Bash', 'Bash(*)', 'Bash(node *)', 'Bash(pnpm exec *)', 'Bash(npx *)', 'Bash(npx wrangler *)', 'Bash(pnpm dlx *)'].includes(r));
    if (wide.length) notes.push(`${f} allows ${wide.join(', ')} with no question. That lets the agent run any code, past the deny list. Remove ${wide.length > 1 ? 'those lines' : 'that line'}.`);
  }
  // A new folder has no settings file until the setup skill writes one, so
  // the tool is on in the first session by design: say only that.
  if (!codex && process.platform === 'win32' && process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL !== '0') {
    const inFile = readJson(join(project, '.claude/settings.json'))?.env?.CLAUDE_CODE_USE_POWERSHELL_TOOL;
    if (!existsSync(join(project, '.claude/settings.json'))) notes.push('For your information: the PowerShell tool is on in this session. The Ownercode setup turns it off for this project. Restart after setup.');
    else if (String(inFile) === '0') notes.push('The PowerShell tool is on although .claude/settings.json turns it off. So CLAUDE_CODE_USE_POWERSHELL_TOOL is set to 1 outside this project, in the terminal or program that starts Claude Code, and that wins. The guards still watch the tool, but the deny list (rm -rf, reading .env) does not. Tell the owner, once, to remove that variable there and restart.');
    else notes.push('The PowerShell tool is on, and .claude/settings.json does not turn it off. The guards still watch the tool, but the deny list (rm -rf, reading .env) does not. With the owner\'s yes, add "env": { "CLAUDE_CODE_USE_POWERSHELL_TOOL": "0" } to .claude/settings.json, then restart.');
  }

  // A new repo made with plain `git init` is on master, and the kit's steps
  // push main. A side branch in a linked worktree (the desktop app makes
  // those) is on purpose, so it is not reported.
  const branch = git(project, 'branch', '--show-current').stdout?.trim();
  const linked = git(project, 'rev-parse', '--git-dir').stdout?.trim() !== git(project, 'rev-parse', '--git-common-dir').stdout?.trim();
  if (branch && branch !== 'main' && !linked) {
    notes.push(branch === 'master'
      ? 'This project\'s branch is master, but the Ownercode steps push main. Rename it now, before the first push: git branch -m master main'
      : `This project is on branch ${branch}, not main. If that is not on purpose, tell the owner before committing: git switch main`);
  }

  // The router finds functions/api/jobs.ts for /API/jobs too, so a login check
  // on the path as typed lets anyone read the customers. Nobody sees a hole like
  // that until a stranger uses it, so look for it at every start.
  let gate = '';
  try { gate = readFileSync(join(project, 'functions', '_middleware.ts'), 'utf8'); } catch {}
  // Two more ways the check and the router can see different paths: a check that
  // decodes %2F and then resolves "..", or one that never refuses %2f, %5c and %2e.
  if (/getSession/.test(gate) && /toLowerCase\(\)/.test(gate) && (/\.pop\(\)/.test(gate) || !/2f\|5c\|2e/i.test(gate))) {
    notes.push('SECURITY: functions/_middleware.ts decodes the path but does not refuse encoded slashes and dots (%2f, %5c, %2e), or it resolves "..". The router keeps ..%2Fauth%2Fx inside one segment, so /api/<route>/..%2Fauth%2Fx can reach a private route with no sign-in. Tell the owner first, in plain words, before any other work. Then run the Ownercode sync skill, copy gatePath from "Login (Better Auth)" in docs/astro-cloudflare-conventions.md, update the smoke test "signed out: every spelling of a private path is refused", and run pnpm run smoke. If the live site has this middleware, ask the owner to deploy the fix today.');
  }
  if (/getSession/.test(gate) && !/toLowerCase\(\)/.test(gate)) {
    notes.push('SECURITY: functions/_middleware.ts checks the login on the path exactly as typed. The router ignores upper and lower case, so a request to /API/... skips the check and anyone can read or change the customers. Tell the owner first, in plain words, before any other work. Then run the Ownercode sync skill, change the check to use gatePath as "Login (Better Auth)" in docs/astro-cloudflare-conventions.md shows, add its smoke test "signed out: every spelling of a private path is refused", and run pnpm run smoke. If the live site has this middleware, ask the owner to deploy the fix today.');
  }

  // A deploy with no database binding: without this guard, every private page and the
  // quote form crash the Worker (Cloudflare error 1101) instead of a plain 503.
  if (/getSession/.test(gate) && !/!env\.DB\b/.test(gate)) {
    notes.push('functions/_middleware.ts has no answer for a missing database binding, so a deploy without one crashes the Worker (error 1101) or loops to sign-in instead of a plain 503. Tell the owner in one line. On a free CRM: run the Ownercode sync skill and add the check and the try/catch as "Login (Better Auth)" in docs/astro-cloudflare-conventions.md shows, with its unit test "no database binding: a 503, not a crash". On an app built from the Ownercode Pro starter: take the check from the starter app\'s functions/_middleware.ts and its "no database binding" unit tests.');
  }

  // Better Auth sends a new session cookie when it extends a session in use. A
  // middleware that drops it signs the owner out 7 days after sign-in, and it
  // looks like a random logout, so nobody would trace it here.
  if (/getSession/.test(gate) && !/returnHeaders/.test(gate)) {
    notes.push('functions/_middleware.ts drops the new cookie Better Auth sends when it extends a session, so the owner is signed out 7 days after signing in, however often they use the app. Tell the owner in one line, then run the Ownercode sync skill and change the login check as "Login (Better Auth)" in docs/astro-cloudflare-conventions.md shows (getSession with returnHeaders: true, and pass each Set-Cookie on). Add its smoke test "a session in use gets a fresh cookie" and run pnpm run smoke.');
  }

  // Wrangler keeps the local database about 130 characters further down, and
  // Windows refuses paths over 260. See docs/versions.md.
  if (process.platform === 'win32' && project.length > 120) {
    notes.push(`This project's folder path is ${project.length} characters long (${project}). On Windows, wrangler's local database fails to open from a path this deep, with SQLITE_CANTOPEN or "internal error; reference = ...". Tell the owner now, before any database work: move the project to a short folder, such as C:\\Projects\\<name>, and reopen it there.`);
  }

  // The plugin updates itself; the starter files only change when sync runs.
  let have = null;
  try { have = readFileSync(join(project, '.ownercode', 'version'), 'utf8').trim(); } catch {}
  const now = readJson(join(PLUGIN, '.claude-plugin', 'plugin.json'))?.version;
  if (have && now && have !== now) notes.push(`Ownercode was updated to ${now}. This project's starter files are from ${have}. Read ${join(PLUGIN, 'CHANGELOG.md')} from ${now} down to ${have}, and tell the owner in plain words what changed and what they must do. Then run the Ownercode sync skill. It brings in the new files and never overwrites a file the owner changed.`);

  if (!codex) {
    const installed = join(process.env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude'), 'plugins', 'installed_plugins.json');
    for (const d of copiesDisagree(installed, project)) notes.push(`Two installed copies of an Ownercode plugin disagree, and only one loads. ${d}`);
  }
  for (const f of ['AGENTS.md', 'CLAUDE.md', ...(existsSync(join(project, 'docs')) ? readdirSync(join(project, 'docs')).filter((n) => n.endsWith('.md')).map((n) => `docs/${n}`) : [])]) {
    let text = '';
    try { text = readFileSync(join(project, f), 'utf8'); } catch {}
    const paths = pluginPaths(text);
    if (paths.length) notes.push(`${f} names a plugin folder by its full path (${paths.join(', ')}). That folder changes with every update, so the path goes stale. Replace it with <pro-root> (the ownercode-pro plugin folder) or <plugin folder> (the ownercode one): each session finds it two levels above the loaded skill's folder.`);
  }
}

// 5. Report.
// A tool installs a plugin update by swapping the version folder, and Codex
// can do it at session start while this check runs from the old folder (seen
// in a 2026-09-24 trial). Then every check fails at once. That is an update,
// not a break, but this session's hooks may still point at the removed folder.
const swapped = problems.length && !['.codex-plugin', '.claude-plugin'].some((d) => existsSync(join(PLUGIN, d, 'plugin.json')));
const lines = [];
if (swapped) {
  let other = [];
  try { other = readdirSync(dirname(PLUGIN)).filter((v) => v !== basename(PLUGIN)); } catch {}
  lines.push(`OWNERCODE SAFETY GUARDS ARE OFF UNTIL A RESTART: Ownercode updated itself${other.length ? ` (to ${other.join(', ')})` : ''} while this session started, and removed the copy this session's guards run from (${PLUGIN}). This happens once after an update; nothing is broken. Tell the owner this first, in plain words, before any other work: close this session and start a new one. If this message comes back after the restart, the guards are really broken: update or reinstall the Ownercode plugin.`);
} else if (problems.length) {
  lines.push(`OWNERCODE SAFETY GUARDS ARE OFF OR BROKEN: ${problems.length} problem(s). Tell the owner this first, in plain words, before any other work, and help fix it.`);
  for (const p of problems) lines.push(`- ${p}`);
  if (pluginFix) lines.push(pluginFix);
}
if (notes.length) {
  if (problems.length) lines.push('Also:');
  for (const n of notes) lines.push(`- ${n}`);
}

if (byHand) {
  if (lines.length) console.log(lines.join('\n'));
  process.exit(problems.length ? 1 : 0);
}
if (codex) {
  // Codex runs no hook until the owner trusts it once in /hooks, and says
  // nothing about that. So a healthy start says one line, and AGENTS.md tells
  // the agent to raise the alarm when the line is missing.
  if (!problems.length) lines.push('Ownercode safety guards: on.');
  console.log(lines.join('\n'));
  process.exit(0);
}
if (lines.length) {
  const text = lines.join('\n');
  console.log(JSON.stringify({ systemMessage: `Ownercode: ${text}`, hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: text } }));
}
process.exit(0);
