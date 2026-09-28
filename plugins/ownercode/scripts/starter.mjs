#!/usr/bin/env node
// Write the Ownercode starter files into a project, and later bring their
// updates in without ever overwriting a file the owner changed.
//
//   node starter.mjs setup [project]        first time
//   node starter.mjs sync [project]         after the plugin updated
//   node starter.mjs accept <file> [project]  "I merged the kit's change by hand"
//   node starter.mjs selftest               prints nothing when healthy
//
// How it knows what the owner changed: every file it writes is also saved,
// exactly as shipped, under .ownercode/base/. A project file that still
// matches its base copy was never touched, so a new version may replace it.
// A file that differs was edited, and sync only shows what the kit changed.
// It never deletes a file, and never restores one the owner deleted.

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const PLUGIN = join(dirname(fileURLToPath(import.meta.url)), '..');
const STATE = '.ownercode';

const read = (p) => (existsSync(p) ? readFileSync(p) : null);
const same = (a, b) => a !== null && b !== null && a.equals(b);
const put = (p, data) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, data); };

function files(dir, base = dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name), base) : [relative(base, join(dir, e.name)).replaceAll('\\', '/')]);
}

// What the kit changed, as a unified diff. Git is already required by the kit.
function diff(fromLabel, from, to) {
  const tmp = mkdtempSync(join(tmpdir(), 'ownercode-'));
  try {
    put(join(tmp, 'a'), from ?? Buffer.alloc(0));
    put(join(tmp, 'b'), to);
    try {
      execFileSync('git', ['-c', 'core.autocrlf=false', 'diff', '--no-index', '--no-color', 'a', 'b'], { cwd: tmp, encoding: 'utf8', stdio: 'pipe' });
      return '';
    } catch (e) {
      return String(e.stdout || '').split('\n').slice(4).join('\n').replace(/^/, `--- ${fromLabel}\n+++ new kit version\n`);
    }
  } finally { rmSync(tmp, { recursive: true, force: true }); }
}

function apply(starter, project) {
  const report = { written: [], kept: [], conflicts: [] };
  for (const f of files(starter)) {
    const next = read(join(starter, f));
    const base = read(join(project, STATE, 'base', f));
    const cur = read(join(project, f));
    if (same(next, base)) continue;                           // kit did not change it
    if (cur === null && base !== null) { report.kept.push(f); continue; } // owner deleted it
    if (cur === null || same(cur, base)) {                    // new, or never touched
      put(join(project, f), next);
      put(join(project, STATE, 'base', f), next);
      report.written.push(f);
    } else if (same(cur, next)) {
      put(join(project, STATE, 'base', f), next);             // already matches
    } else {
      report.conflicts.push({ f, diff: base ? diff('kit version you have', base, next) : diff('your file', cur, next) });
    }
  }
  return report;
}

function accept(starter, project, f) {
  const next = read(join(starter, f));
  if (!next) throw new Error(`${f} is not a starter file.`);
  put(join(project, STATE, 'base', f), next);
}

function version() {
  return JSON.parse(readFileSync(join(PLUGIN, '.claude-plugin', 'plugin.json'), 'utf8')).version;
}

function run(cmd, args) {
  const starter = join(PLUGIN, 'starter');
  if (cmd === 'accept') {
    accept(starter, args[1] || process.cwd(), args[0]);
    console.log(`${args[0]}: marked as merged. Run sync again to finish.`);
    return 0;
  }
  const project = args[0] || process.cwd();
  if (cmd === 'setup' && existsSync(join(project, STATE, 'version'))) {
    console.log('Ownercode is already set up in this project. Run sync instead.');
    return 1;
  }
  const r = apply(starter, project);
  // Only a finished sync counts as current, so the session-start reminder
  // keeps coming back until every changed file is merged or accepted.
  if (!r.conflicts.length) put(join(project, STATE, 'version'), version() + '\n');
  for (const f of r.written) console.log(`wrote     ${f}`);
  for (const f of r.kept) console.log(`skipped   ${f} (you deleted it; not restored)`);
  for (const c of r.conflicts) {
    console.log(`\nCHANGED BY YOU, NOT OVERWRITTEN: ${c.f}`);
    console.log(c.diff || '(no text difference)');
  }
  if (r.conflicts.length) {
    console.log(`\nSTOPPED on ${r.conflicts.length} file(s) you changed. Nothing in them was touched.`);
    console.log('Merge the kit lines you want by hand, then run: node <plugin>/scripts/starter.mjs accept <file>');
    return 1;
  }
  console.log(r.written.length ? `Ownercode starter ${version()} is in place.` : `Up to date: Ownercode starter ${version()}.`);
  return 0;
}

// The one rule this script must never break is "never overwrite an owner's
// edit". This proves it on throwaway folders, and says nothing when it holds.
function selftest() {
  const tmp = mkdtempSync(join(tmpdir(), 'ownercode-selftest-'));
  const fail = [];
  const check = (ok, msg) => ok || fail.push(msg);
  try {
    const v1 = join(tmp, 'v1'), v2 = join(tmp, 'v2'), p = join(tmp, 'project');
    for (const [f, a, b] of [['AGENTS.md', 'rules 1\n', 'rules 2\n'], ['docs/x.md', 'x 1\n', 'x 2\n'],
      ['docs/gone.md', 'g 1\n', 'g 2\n'], ['tasks/same.md', 's\n', 's\n']]) {
      put(join(v1, f), a); put(join(v2, f), b);
    }
    put(join(v2, 'docs/new.md'), 'brand new\n');
    put(join(p, 'docs/x.md'), 'the owner already had this\n');

    let r = apply(v1, p);
    check(r.conflicts.map((c) => c.f).join() === 'docs/x.md', 'setup overwrote or ignored a file that was already there');
    check(String(read(join(p, 'docs/x.md'))) === 'the owner already had this\n', 'setup changed a file it did not write');
    rmSync(join(p, 'docs/x.md')); r = apply(v1, p);
    check(r.written.join() === 'docs/x.md' && !r.conflicts.length, 'setup did not finish once the clash was gone');

    writeFileSync(join(p, 'AGENTS.md'), 'rules 1\nmy own rule\n');   // owner edits
    rmSync(join(p, 'docs/gone.md'));                                // owner deletes
    r = apply(v2, p);
    check(String(read(join(p, 'AGENTS.md'))) === 'rules 1\nmy own rule\n', 'SYNC OVERWROTE AN OWNER EDIT');
    check(r.conflicts.length === 1 && /-rules 1\n\+rules 2/.test(r.conflicts[0].diff), 'sync did not show what the kit changed');
    check(String(read(join(p, 'docs/x.md'))) === 'x 2\n', 'sync did not update an untouched file');
    check(String(read(join(p, 'docs/new.md'))) === 'brand new\n', 'sync did not add a new kit file');
    check(!existsSync(join(p, 'docs/gone.md')) && r.kept.includes('docs/gone.md'), 'sync restored a file the owner deleted');

    accept(v2, p, 'AGENTS.md');
    r = apply(v2, p);
    check(!r.conflicts.length && !r.written.length, 'sync kept reporting a file after accept');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  if (!fail.length) return 0;
  console.error(`STARTER SYNC: ${fail.length} problem(s).`);
  for (const f of fail) console.error(`  ${f}`);
  return 1;
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'selftest') process.exit(selftest());
if (!['setup', 'sync', 'accept'].includes(cmd)) {
  console.error('usage: node starter.mjs setup|sync [project] | accept <file> [project] | selftest');
  process.exit(2);
}
process.exit(run(cmd, args));
