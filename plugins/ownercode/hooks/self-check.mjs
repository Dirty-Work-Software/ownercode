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
// means this plugin's hooks never ran, so the guards are off.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOOKS = dirname(fileURLToPath(import.meta.url));
const PLUGIN = dirname(HOOKS);
const codex = process.argv.includes('--codex');
const byHand = process.argv.includes('--check');

let input = {};
if (!byHand && !process.stdin.isTTY) { try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {} }
if (input.session_id) { try { writeFileSync(join(tmpdir(), `ownercode-guards-${input.session_id}`), ''); } catch {} }

const problems = []; // the guards are not protecting this session
const notes = [];    // true, and the owner should hear it

const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
const matches = (matcher, tool) => !matcher || matcher === '*' || new RegExp(`^(?:${matcher})$`).test(tool);
const findHook = (wiring, event, file) => (wiring?.hooks?.[event] || []).flatMap((g) => (g.hooks || []).map((h) => ({ ...h, matcher: g.matcher })))
  .find((h) => typeof h.command === 'string' && h.command.includes(`hooks/${file}`));

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

// Everything above lives in the plugin's own files, which an update replaces.
const pluginFix = problems.length ? 'These are in the Ownercode plugin\'s own files, so do not edit them. Update the plugin, then restart. Claude Code: claude plugin update ownercode@ownercode. Codex: codex plugin marketplace upgrade ownercode. If it stays broken, reinstall the plugin.' : '';

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
  if (!codex && process.platform === 'win32' && process.env.CLAUDE_CODE_USE_POWERSHELL_TOOL !== '0') {
    notes.push('The PowerShell tool is on. The guards still watch it, but the deny list in .claude/settings.json (rm -rf, reading .env) does not. Add "env": { "CLAUDE_CODE_USE_POWERSHELL_TOOL": "0" } to .claude/settings.json, then restart. If that line is already there, the variable is set to 1 in the terminal or program that starts Claude Code, which wins over the settings file; remove it there.');
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

  // Wrangler keeps the local database about 130 characters further down, and
  // Windows refuses paths over 260. See docs/versions.md.
  if (process.platform === 'win32' && project.length > 120) {
    notes.push(`This project's folder path is ${project.length} characters long (${project}). On Windows, wrangler's local database fails to open from a path this deep, with SQLITE_CANTOPEN or "internal error; reference = ...". Tell the owner now, before any database work: move the project to a short folder, such as C:\\Projects\\<name>, and reopen it there.`);
  }

  // The plugin updates itself; the starter files only change when sync runs.
  let have = null;
  try { have = readFileSync(join(project, '.ownercode', 'version'), 'utf8').trim(); } catch {}
  const now = readJson(join(PLUGIN, '.claude-plugin', 'plugin.json'))?.version;
  if (have && now && have !== now) notes.push(`Ownercode was updated to ${now}. This project's starter files are from ${have}. Tell the owner, then run the Ownercode sync skill. It brings in the new files and never overwrites a file the owner changed.`);
}

// 5. Report.
const lines = [];
if (problems.length) {
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
