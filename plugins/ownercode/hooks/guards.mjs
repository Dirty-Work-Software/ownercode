#!/usr/bin/env node
// The Ownercode safety guards. One copy, for Claude Code and for Codex.
//
//   node guards.mjs           Claude Code PreToolUse hook (hooks.json)
//   node guards.mjs --codex   Codex PreToolUse hook (codex-hooks.json)
//
// Each tool hands the hook the shell command the agent is about to run, as
// JSON on stdin. The guards read it and stop the few commands that lose work
// or data with no way back. Claude Code: a block is exit 2 with the reason on
// stderr, and an ask is a permission prompt. Codex: both are a "deny", because
// on Windows Codex turns exit 2 into 1, which it treats as a failed hook.
//
// The nine guards, each with its own owner override. The agent adds the
// prefix only after the owner said yes to that exact command.
//   no-verify   skipping git hooks                     BYPASS_NO_VERIFY_GUARD=1
//   reset       reset --hard, checkout -f on edits      BYPASS_RESET_GUARD=1
//   discard     deleting work git cannot bring back     BYPASS_DISCARD_GUARD=1
//   pr-merge    merging a pull request                  BYPASS_PR_MERGE_GUARD=1
//   secret      reading or committing a secret file     BYPASS_SECRET_GUARD=1
//   cloud       live-site and live-database changes     BYPASS_CLOUD_GUARD=1
//   process     stopping programs by name, or another   BYPASS_PROCESS_GUARD=1
//               project's program by its number
//   global-config  git config for the whole computer   BYPASS_GLOBAL_CONFIG_GUARD=1
//   migration   committing an edit to a committed       BYPASS_MIGRATION_GUARD=1
//               (so applied) database migration
//
// A command can hide another one: `bash -c "..."`, `node -e "execSync('...')"`,
// `pnpm exec git ...`, a full path to git, `cd sub && ...`, a package script.
// So every quoted string is read as a command too, and `pnpm run x` is read
// from package.json. Commit messages and pull request text are dropped first,
// so a message that mentions a command is not mistaken for it.

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

const GUARDS = {
  'no-verify': { bypass: 'BYPASS_NO_VERIFY_GUARD', advice: 'Git hooks are the project\'s safety floor. Fix what the hook reports instead of skipping it.' },
  reset: { bypass: 'BYPASS_RESET_GUARD', advice: 'Keep the edits: git stash push -m "why", or commit them first (on a branch if they are not ready).' },
  discard: { bypass: 'BYPASS_DISCARD_GUARD', advice: 'Keep it recoverable: git stash push -m "why", delete only merged branches (git branch -d), or push normally.' },
  'pr-merge': { bypass: 'BYPASS_PR_MERGE_GUARD', advice: 'Merging ships the change. Tell the owner the pull request is ready, with its link, and wait.' },
  secret: { bypass: 'BYPASS_SECRET_GUARD', advice: 'Never read, print or commit a secret file. To make a local secret, run: node .ownercode/dev-secret.mjs NAME. For a real key, tell the owner the exact line to add to .dev.vars in their own editor. To unstage: git restore --staged <file>.' },
  cloud: { bypass: 'BYPASS_CLOUD_GUARD', advice: 'This changes the live site or the live database. Tell the owner what you want to run and why, with the result of the local run (--local), the build and the tests.' },
  process: { bypass: 'BYPASS_PROCESS_GUARD', advice: 'Stop only a process ID that runs from this project (kill <PID>; in Git Bash taskkill //T //F //PID <PID>; Stop-Process -Id <PID>). A program from another folder belongs to another project or another AI session: tell the owner what holds the port, and use a different port instead.' },
  migration: { bypass: 'BYPASS_MIGRATION_GUARD', advice: 'A committed migration has already run on this computer\'s database, and maybe on the live one. An edit to it never reaches a database that ran it. Set the edit aside, which also puts the file back as it was: git stash push -m "why" -- <the migration file>. Then put the change in a new migration with the next free number, and run pnpm run db:migrate.' },
  'global-config': { bypass: 'BYPASS_GLOBAL_CONFIG_GUARD', advice: 'This changes git for every project on this computer, not only this one. Use a setting for this project only (git config without --global, or git -c name=value <command>). If it is a sandbox limit, say so: the owner\'s install is fine.' },
};

// ---------- reading a command ----------

const OPS = new Set([';', '&', '|', '(', ')', '`', '{', '}']);
const SHELLS = /^(bash|sh|zsh|dash|pwsh|powershell|cmd)$/;

// Split a command into simple commands ("segments") of words, the way a shell
// would: quotes removed, split at ; & | ( ) $( and new lines. Each quoted word
// that could hold a command is split again, so nested commands are seen.
export function segments(command, depth = 0) {
  const out = [];
  let words = [], quoted = [], w = '', inWord = false, wasQuoted = false;
  let heredocs = [];
  const endWord = () => { if (inWord) { words.push(w); quoted.push(wasQuoted); } w = ''; inWord = false; wasQuoted = false; };
  const endSeg = () => { endWord(); if (words.length) out.push({ words, quoted }); words = []; quoted = []; };
  const s = String(command);
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\n') {
      const heads = heredocs; heredocs = [];
      const seg = { words, quoted };
      endSeg();
      // A here-document body is data (a commit message, a file being written),
      // unless it is fed to a shell.
      for (const h of heads) {
        const end = s.indexOf(`\n${h.tag}\n`, i) >= 0 ? s.indexOf(`\n${h.tag}\n`, i) : (s.endsWith(`\n${h.tag}`) ? s.length - h.tag.length - 1 : s.length);
        const body = s.slice(i + 1, end + 1);
        if (h.shell && depth < 4) out.push(...segments(body, depth + 1));
        i = Math.min(s.length, end + h.tag.length + 1);
      }
      void seg;
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') { endWord(); continue; }
    if (c === '\\' && i + 1 < s.length) {
      const n = s[i + 1];
      if (n === '\n') { i++; continue; }
      inWord = true;
      if (/[A-Za-z0-9._]/.test(n)) { w += c; continue; } // a Windows path, C:\Program Files
      w += n; i++; continue;
    }
    if (c === "'" || c === '"') {
      const close = c === "'" ? s.indexOf("'", i + 1) : findDoubleClose(s, i + 1);
      const end = close < 0 ? s.length : close;
      let body = s.slice(i + 1, end);
      if (c === '"') body = body.replace(/\\(["\\$`])/g, '$1');
      w += body; inWord = true; wasQuoted = true; i = end; continue;
    }
    if (c === '$' && s[i + 1] === '(') { endSeg(); i++; continue; }
    if (c === '<' && s[i + 1] === '<' && s[i + 2] !== '<') {
      const m = s.slice(i).match(/^<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/);
      if (m) {
        endWord();
        heredocs.push({ tag: m[2], shell: SHELLS.test(cmdWord(words)) });
        i += m[0].length - 1; continue;
      }
    }
    if (c === '>' || c === '<') { endWord(); words.push(c); quoted.push(false); continue; }
    if (OPS.has(c)) { endSeg(); continue; }
    w += c; inWord = true;
  }
  endSeg();
  // Nested commands: bash -c "...", node -e "execSync('...')", "$(...)".
  const all = [];
  for (const seg of out) {
    const words = dropMessages(seg);
    all.push({ words, nested: depth > 0 });
    if (depth >= 4) continue;
    seg.words.forEach((word, k) => {
      if (seg.quoted[k] && words.includes(word) && /[\s;&|()`$]/.test(word)) all.push(...segments(word, depth + 1).map((x) => ({ ...x, nested: true })));
    });
  }
  return all;
}

function findDoubleClose(s, from) {
  for (let i = from; i < s.length; i++) {
    if (s[i] === '\\') { i++; continue; }
    if (s[i] === '"') return i;
  }
  return -1;
}

// Commit messages, pull request titles and bodies are text, not commands.
function dropMessages({ words, quoted }) {
  const out = [];
  for (let k = 0; k < words.length; k++) {
    const w = words[k];
    if (/^(-[a-zA-Z]*m|--message|-b|--body|-t|--title|--notes|--subject)$/.test(w) && k + 1 < words.length) { out.push(w); k++; continue; }
    if (/^(--message|--body|--title|--notes|--subject)=/.test(w)) { out.push(w.split('=')[0]); continue; }
    if (quoted[k] && /^-m\S/.test(w)) { out.push('-m'); continue; }
    out.push(w);
  }
  return out;
}

const base = (w) => basename(String(w).replace(/\\/g, '/')).toLowerCase().replace(/\.(exe|cmd)$/, '');
const isAssign = (w) => /^[A-Za-z_][A-Za-z0-9_]*=/.test(w);
function cmdWord(words) {
  const k = words.findIndex((w) => !isAssign(w));
  return k < 0 ? '' : base(words[k]);
}
const shortFlags = (args) => args.filter((a) => /^-[a-zA-Z]+$/.test(a)).join('');
const has = (args, ...names) => args.some((a) => names.includes(a) || names.some((n) => n.startsWith('--') && a.startsWith(n + '=')));

function toPath(p) {
  // Git Bash writes C:\x as /c/x.
  if (process.platform === 'win32') { const m = String(p).match(/^\/([a-zA-Z])(\/.*|$)/); if (m) return `${m[1]}:${m[2] || '/'}`; }
  return String(p);
}

function git(dir, args) {
  const r = spawnSync('git', args, { cwd: dir, encoding: 'utf8', windowsHide: true });
  return { status: r.status, out: r.stdout || '' };
}
const dirtyTracked = (dir) => git(dir, ['status', '--porcelain', '--untracked-files=no']).out.trim() !== '';
function pathsDirty(dir, paths) {
  if (!paths.length) return false;
  const r = git(dir, ['diff', '--quiet', 'HEAD', '--', ...paths]);
  if (r.status === 1) return true;
  if (r.status !== 0) return git(dir, ['diff', '--quiet', '--', ...paths]).status === 1; // no commit yet
  return false;
}

// ---------- what counts as a secret or customer data ----------

const TEMPLATE = /\.(example|sample|template)$/i;
const SECRET_FILE = /(^|[\/\\])(\.env(\.[\w.-]+)?|\.dev\.vars(\.[\w.-]+)?|[\w.-]*(credentials|service-account)[\w.-]*\.json|[\w.-]+\.pem|id_(rsa|ed25519|ecdsa))$/i;
const SECRET_IN_TEXT = /(?:^|[\s'"`(=,:@\/\\])(\.env(?:\.[\w-]+)*|\.dev\.vars(?:\.[\w-]+)*|[\w.-]*(?:credentials|service-account)[\w.-]*\.json)(?=$|[\s'"`),;:\/\\])/gi;
const MIGRATION = /(^|\/)migrations\/[^/]+\.sql$/i;
const DATA_FILE = /(^|[\/\\])imports[\/\\]|\.(csv|tsv|xlsx|xls)$/i;
export const isSecretPath = (p) => SECRET_FILE.test(p) && !TEMPLATE.test(p);
// Commands that only name a file, never open it.
const NAMES_ONLY = new Set(['git', 'ls', 'dir', 'test', '[', '[[', 'echo', 'printf', 'test-path', 'touch', 'write-output', 'write-host']);

// ---------- the guards, one simple command at a time ----------

function checkGit(words, i, ctx, found) {
  let j = i + 1, dirArg = null;
  const config = [];
  while (j < words.length && words[j].startsWith('-')) {
    const w = words[j];
    if (w === '-C') { dirArg = words[j + 1]; j += 2; continue; }
    if (w === '-c') { config.push(words[j + 1] || ''); j += 2; continue; }
    if (/^--(git-dir|work-tree|namespace|exec-path|config-env)$/.test(w)) { j += 2; continue; }
    j++;
  }
  const sub = words[j] || '';
  const args = words.slice(j + 1);
  const dir = dirArg ? resolve(ctx.cwd, toPath(dirArg)) : ctx.cwd;
  const flags = shortFlags(args);
  const block = (guard, reason) => found.push({ guard, decision: 'block', reason });
  const positional = (valueFlags = []) => {
    const p = [];
    for (let k = 0; k < args.length; k++) {
      const a = args[k];
      if (a === '--') { p.push(...args.slice(k + 1)); break; }
      if (valueFlags.includes(a)) { k++; continue; }
      if (!a.startsWith('-') && a !== '>' && a !== '<') p.push(a);
    }
    return p;
  };

  // no-verify
  if (config.some((c) => /^alias\./i.test(c))) block('no-verify', 'a git alias set with -c can hide any command, including one that skips hooks.');
  // A hooks folder of the project's own is fine. /dev/null, or a folder with no hooks, switches them off.
  const realHooks = (p) => { try { return readdirSync(resolve(dir, toPath(p))).length > 0; } catch { return false; } };
  if (config.some((c) => /^core\.hookspath=/i.test(c) && !realHooks(c.slice(c.indexOf('=') + 1)))) block('no-verify', 'core.hooksPath switches the project\'s git hooks off.');
  if ((sub === 'commit' || sub === 'push') && args.some((a) => /^--no-veri/.test(a))) block('no-verify', '--no-verify skips the project\'s git hooks.');
  if (sub === 'commit' && /n/.test(flags)) block('no-verify', 'git commit -n is the short form of --no-verify.');
  if (sub === 'config' && args.some((a) => /^core\.hookspath$/i.test(a)) && !has(args, '--get', '--get-all', '--unset', '--unset-all', '--list', '-l')) {
    const k = args.findIndex((a) => /^core\.hookspath$/i.test(a));
    if (args[k + 1] !== undefined && !realHooks(args[k + 1])) block('no-verify', 'changing core.hooksPath switches the project\'s git hooks off.');
  }
  if (ctx.husky) block('no-verify', 'HUSKY=0 switches the project\'s git hooks off.');

  // global-config: a write to the computer's git settings, not this project's.
  if (sub === 'config' && has(args, '--global', '--system') && configWrites(args)) {
    block('global-config', `git config ${has(args, '--system') ? '--system' : '--global'} changes git for every project on this computer.`);
  }

  // reset: commands that overwrite unsaved edits to tracked files
  const overwrites = (sub === 'reset' && has(args, '--hard'))
    || (sub === 'checkout' && (has(args, '--force') || /f/.test(flags)))
    || (sub === 'switch' && (has(args, '--force', '--discard-changes') || /f/.test(flags)));
  if (overwrites && !ctx.stashed && dirtyTracked(dir)) block('reset', `git ${sub} would overwrite unsaved edits to tracked files.`);

  // discard
  if (sub === 'branch' && (/D/.test(flags) || ((has(args, '--delete') || /d/.test(flags)) && (has(args, '--force') || /f/.test(flags))))) block('discard', 'git branch -D force-deletes a branch even if its work was never merged.');
  if (sub === 'restore' && !((has(args, '--staged') || /S/.test(flags)) && !(has(args, '--worktree') || /W/.test(flags)))) {
    const paths = positional(['-s', '--source']);
    if (!paths.length || pathsDirty(dir, paths)) block('discard', 'git restore would throw away unsaved edits to those files.');
  }
  if (sub === 'checkout' && !overwrites) {
    const k = args.indexOf('--');
    const paths = k >= 0 ? args.slice(k + 1) : positional(['-b', '-B', '--orphan', '--conflict']);
    if (pathsDirty(dir, paths)) block('discard', 'git checkout <file> would throw away unsaved edits to that file.');
  }
  if (sub === 'rm' && (has(args, '--force') || /f/.test(flags)) && !has(args, '--cached') && pathsDirty(dir, positional())) block('discard', 'git rm -f deletes files that have unsaved edits.');
  if (sub === 'clean' && !has(args, '--dry-run') && !/n/.test(flags) && (has(args, '--force') || /f/.test(flags) || config.some((c) => /^clean\.requireforce=false$/i.test(c)))) block('discard', 'git clean -f deletes files that git has never saved, for good.');
  if (sub === 'stash' && ['drop', 'clear'].includes(args[0])) block('discard', 'git stash drop and clear delete work that was set aside to keep it safe.');
  if (sub === 'worktree' && args[0] === 'remove' && (has(args, '--force') || /f/.test(flags))) block('discard', 'git worktree remove --force deletes the folder with its unsaved work.');
  if (sub === 'update-ref' && has(args, '-d')) block('discard', 'git update-ref -d deletes a branch with no safety check.');
  if (sub === 'reflog' && args[0] === 'expire') block('discard', 'expiring the reflog deletes the last record of lost commits.');
  if (sub === 'gc' && args.some((a) => /^--prune/.test(a))) block('discard', 'git gc --prune deletes lost commits for good.');
  if (sub === 'push') checkPush(args, dir, block);
  if (sub === 'stash' && !['drop', 'clear', 'list', 'show', 'pop', 'apply'].includes(args[0])) ctx.stashed = true;

  // secret
  if (sub === 'add' && !has(args, '--dry-run') && !/n/.test(flags) && !has(args, '--patch', '--interactive', '--edit') && !/[pie]/.test(flags)) {
    const r = git(dir, ['add', '--dry-run', ...args]);
    const files = [...r.out.matchAll(/^add '(.*)'$/gm)].map((m) => m[1]);
    const secret = files.filter(isSecretPath);
    const forced = has(args, '--force') || /f/.test(flags);
    const data = forced ? files.filter((f) => DATA_FILE.test(f)) : [];
    if (secret.length) block('secret', `git add would stage secret files: ${secret.slice(0, 3).join(', ')}.`);
    else if (data.length) block('secret', `git add -f would stage customer data that .gitignore keeps out: ${data.slice(0, 3).join(', ')}.`);
  }
  if (sub === 'commit') {
    let files = git(dir, ['diff', '--cached', '--name-only']).out.split('\n');
    if (has(args, '--all') || /a/.test(flags)) files = files.concat(git(dir, ['diff', '--name-only']).out.split('\n'));
    files = files.concat(positional(['-F', '-C', '-c', '-t', '--author', '--date']));
    const secret = [...new Set(files.filter((f) => f && isSecretPath(f)))];
    if (secret.length) block('secret', `this commit would include secret files: ${secret.slice(0, 3).join(', ')}.`);
    // migration: a committed migration file changed, deleted or renamed. With
    // -a or paths, git commits the working copy, so compare that too.
    const paths = positional(['-F', '-C', '-c', '-t', '--author', '--date']);
    const worktree = has(args, '--all') || /a/.test(flags) || paths.length;
    const changed = git(dir, ['diff', '--cached', '--name-status', '--diff-filter=MDR', 'HEAD']).out
      + (worktree ? git(dir, ['diff', '--name-status', '--diff-filter=MDR', 'HEAD', '--', ...paths]).out : '');
    const edited = [...new Set(changed.split('\n').map((l) => l.split('\t')[1]).filter((f) => f && MIGRATION.test(f)))];
    if (edited.length) block('migration', `this commit changes a migration that is already committed: ${edited.slice(0, 3).join(', ')}.`);
  }
}

// `git config` reads with one name and writes with a name and a value, or
// with a write flag. Git 2.46 added subcommands (get, list, set, unset, ...).
function configWrites(args) {
  const verb = args.find((a) => !a.startsWith('-'));
  if (['get', 'list'].includes(verb)) return false;
  if (['set', 'unset', 'rename-section', 'remove-section', 'edit'].includes(verb)) return true;
  if (has(args, '--add', '--unset', '--unset-all', '--replace-all', '--rename-section', '--remove-section', '--edit', '-e')) return true;
  if (has(args, '--get', '--get-all', '--get-regexp', '--get-urlmatch', '--get-color', '--get-colorbool', '--list', '-l')) return false;
  const values = ['--type', '--default', '--file', '-f', '--blob', '--comment'];
  const names = [];
  for (let k = 0; k < args.length; k++) {
    if (values.includes(args[k])) { k++; continue; }
    if (!args[k].startsWith('-') && args[k] !== '>' && args[k] !== '<') names.push(args[k]);
  }
  return names.length >= 2;
}

const PROTECTED = /^(refs\/heads\/)?(main|master)$/;
function checkPush(args, dir, block) {
  let force = false, del = false, mirror = false, all = false;
  const pos = [];
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (a === '--') { pos.push(...args.slice(k + 1)); break; }
    if (/^--force(-with-lease)?(=|$)/.test(a)) force = true;
    else if (a === '--mirror') mirror = true;
    else if (a === '--delete') del = true;
    else if (a === '--all' || a === '--branches') all = true;
    else if (['-o', '--push-option', '--repo', '--receive-pack', '--exec'].includes(a)) k++;
    else if (/^-[a-zA-Z]+$/.test(a)) { if (a.includes('f')) force = true; if (a.includes('d')) del = true; }
    else if (!a.startsWith('-')) pos.push(a);
  }
  if (mirror) return block('discard', 'git push --mirror can overwrite or delete every branch on GitHub.');
  const current = () => git(dir, ['branch', '--show-current']).out.trim();
  const specs = pos.slice(1);
  if (!specs.length) {
    if ((force && PROTECTED.test(current())) || (force && all)) block('discard', 'a force push to main overwrites its saved history on GitHub.');
    return;
  }
  for (const spec of specs) {
    const plus = spec.startsWith('+');
    const s = spec.replace(/^\+/, '');
    const [src, dst] = s.includes(':') ? [s.slice(0, s.indexOf(':')), s.slice(s.indexOf(':') + 1)] : [s, s];
    const target = dst === 'HEAD' ? current() : dst;
    if (!PROTECTED.test(target)) continue;
    if (del || (s.includes(':') && src === '')) return block('discard', 'deleting main on GitHub deletes the project\'s saved history.');
    if (force || plus) return block('discard', 'a force push to main overwrites its saved history on GitHub.');
  }
}

function checkGh(words, i, found) {
  const rest = words.slice(i + 1);
  if (rest[0] === 'pr' && rest[1] === 'merge') found.push({ guard: 'pr-merge', decision: 'block', reason: 'gh pr merge ships the change, and it may go live within minutes.' });
  if (rest[0] === 'api' && rest.some((w) => /pulls\/\d+\/merge|mergePullRequest/.test(w))) found.push({ guard: 'pr-merge', decision: 'block', reason: 'this gh api call merges a pull request.' });
}

function sqlVerdict(sql) {
  const statements = sql.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ').split(';').map((x) => x.trim()).filter(Boolean);
  let verdict = null;
  for (const st of statements) {
    if (/\bdrop\s+(table|index|view|trigger|column|database|schema)\b|\btruncate\b/i.test(st)) return 'block';
    if (/\bdelete\s+from\b|\bupdate\s+\S+\s+set\b/i.test(st) && !/\bwhere\b/i.test(st)) return 'block';
    if (/\b(insert|replace|update|delete|alter|create)\b/i.test(st)) verdict = 'ask';
  }
  return verdict;
}

function checkWrangler(words, i, ctx, found) {
  const args = words.slice(i + 1);
  const sub = [];
  for (const a of args) { if (a.startsWith('-')) break; sub.push(a.toLowerCase()); }
  const remote = has(args, '--remote') && !args.includes('--remote=false');
  const add = (decision, reason) => found.push({ guard: 'cloud', decision, reason });
  const value = (flag) => { const k = args.indexOf(flag); if (k >= 0) return args[k + 1]; const e = args.find((a) => a.startsWith(flag + '=')); return e ? e.slice(flag.length + 1) : undefined; };

  if (sub.slice(0, 4).includes('delete')) return add('block', 'this deletes something on Cloudflare for good.');
  if (sub.includes('time-travel') && sub.includes('restore')) return add('block', 'this rolls the live database back and overwrites what changed since.');
  if (sub[0] === 'd1' && sub[1] === 'execute' && remote) {
    const sql = value('--command');
    const file = value('--file');
    let verdict = sql !== undefined ? sqlVerdict(sql) : null;
    if (file !== undefined) {
      const p = resolve(ctx.cwd, toPath(file));
      const v = existsSync(p) ? sqlVerdict(readFileSync(p, 'utf8')) : 'ask';
      verdict = verdict === 'block' || v === 'block' ? 'block' : (verdict || v);
    }
    if (sql === undefined && file === undefined) verdict = 'ask';
    if (verdict === 'block') return add('block', 'this wipes rows or tables in the live database (DROP, TRUNCATE, or DELETE / UPDATE with no WHERE).');
    if (verdict === 'ask') return add('ask', 'this changes the live database.');
    return;
  }
  if (sub[0] === 'd1' && sub[1] === 'migrations' && sub[2] === 'apply' && remote) return add('ask', 'this changes the live database\'s tables.');
  if (has(args, '--dry-run')) return;
  if (['deploy', 'publish', 'rollback'].includes(sub[0]) || (['pages', 'versions', 'triggers'].includes(sub[0]) && ['deploy', 'rollback'].includes(sub[1]))) return add('ask', 'this ships to the live site.');
  if (sub.includes('secret') && (sub.includes('put') || sub.includes('bulk'))) return add('ask', 'this changes a live secret.');
  if (remote && sub.some((s) => ['put', 'bulk'].includes(s))) return add('ask', 'this writes to live Cloudflare storage.');
}

// `pnpm run deploy` runs whatever package.json says. Read it.
function scriptFor(words, cwd) {
  const k = words.findIndex((w) => !isAssign(w));
  const tool = base(words[k] || '');
  if (!['pnpm', 'npm', 'yarn', 'bun'].includes(tool)) return null;
  let name = words[k + 1];
  if (['run', 'run-script'].includes(name)) name = words.slice(k + 2).find((w) => !w.startsWith('-'));
  else if (tool === 'npm' || ['install', 'add', 'exec', 'dlx', 'i', 'test', 'x'].includes(name)) return null;
  if (!name) return null;
  for (let d = cwd; ; d = dirname(d)) {
    const pj = join(d, 'package.json');
    if (existsSync(pj)) {
      try {
        const scripts = JSON.parse(readFileSync(pj, 'utf8')).scripts || {};
        return [scripts[`pre${name}`], scripts[name], scripts[`post${name}`]].filter(Boolean).join(' ; ') || null;
      } catch { return null; }
    }
    if (dirname(d) === d) return null;
  }
}

const FINDERS = new Set(['pgrep', 'pidof', 'ps', 'tasklist', 'get-process', 'gps', 'get-ciminstance', 'gcim', 'get-wmiobject', 'gwmi']);
const KILLERS = new Set(['kill', 'stop-process', 'spps', 'taskkill', 'invoke-cimmethod', 'remove-ciminstance', 'remove-wmiobject']);
function checkProcesses(segs, ctx, found) {
  const block = (reason) => found.push({ guard: 'process', decision: 'block', reason });
  let finder = false, killer = false;
  const pids = [];
  for (const { words } of segs) {
    const c = cmdWord(words);
    // Git Bash turns //PID into /PID on the way to a Windows program.
    const lower = words.map((w) => w.toLowerCase().replace(/^\/\/(?=[a-z])/, '/'));
    if (FINDERS.has(c)) finder = true;
    if (KILLERS.has(c) || (c === 'xargs' && lower.some((w) => KILLERS.has(base(w))))) killer = true;
    if (/\.(terminate|kill)\s*\(/i.test(words.join(' '))) killer = true;
    if (c === 'pkill' || c === 'killall') block(`${c} stops every process whose name matches.`);
    if (c === 'wmic' && lower.includes('process') && lower.some((w) => w === 'delete' || w === 'terminate')) block('wmic stops every process that matches.');
    if (c === 'taskkill') {
      if (lower.some((w) => w === '/im' || w === '-im') || !lower.some((w) => w === '/pid' || w === '-pid')) block('taskkill /IM stops every process with that name.');
      lower.forEach((w, k) => { if ((w === '/pid' || w === '-pid') && /^\d+$/.test(lower[k + 1] || '')) pids.push(Number(lower[k + 1])); });
    }
    if (c === 'stop-process' || c === 'spps') {
      if (lower.some((w) => w === '-name' || w === '-processname') || !lower.some((w) => w === '-id' || /^\d+$/.test(w) || /^\$\w+$/.test(w))) block('Stop-Process by name, or fed from Get-Process, stops every match.');
      // ponytail: an ID in a variable ($p.Id) is not checked; add it when a trial shows one stopping another project.
      lower.forEach((w) => { for (const n of w.split(',')) if (/^\d+$/.test(n)) pids.push(Number(n)); });
    }
    // Git Bash's kill takes its own process numbers, not Windows ones. In
    // PowerShell (Codex on Windows) kill is Stop-Process, with Windows numbers.
    if (c === 'kill' && (process.platform !== 'win32' || KILL_IS_POWERSHELL)) lower.slice(1).forEach((w) => { if (/^\d+$/.test(w)) pids.push(Number(w)); });
  }
  if (finder && killer) block('this finds processes by name or command line and stops them.');
  for (const pid of pids) {
    const why = notThisProject(pid, ctx.cwd);
    if (why) { block(why); break; }
  }
}

// ---------- whose process is it ----------

export let KILL_IS_POWERSHELL = false;
export const setKillIsPowershell = (v) => { KILL_IS_POWERSHELL = v; };
let TABLE; // one look per hook run; the list of running programs does not change that fast for this purpose
function processTable() {
  if (TABLE !== undefined) return TABLE;
  TABLE = null;
  if (process.platform === 'win32') {
    const r = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,ExecutablePath,CommandLine | ConvertTo-Json -Compress'],
    { encoding: 'utf8', windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    try { TABLE = JSON.parse(r.stdout).map((p) => ({ pid: p.ProcessId, ppid: p.ParentProcessId, text: `${p.ExecutablePath || ''} ${p.CommandLine || ''}` })); } catch {}
  } else {
    const r = spawnSync('ps', ['-A', '-o', 'pid=,ppid=,args='], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status === 0) TABLE = r.stdout.split('\n').map((l) => l.trim().match(/^(\d+)\s+(\d+)\s+(.*)$/)).filter(Boolean).map((m) => ({ pid: Number(m[1]), ppid: Number(m[2]), text: m[3] }));
  }
  return TABLE;
}

// A stop by process ID is fine when that process, or a program it started,
// runs from this project's folder: a wrangler server runs node_modules/wrangler.
// Anything else belongs to another project or another AI session.
function notThisProject(pid, cwd) {
  const table = processTable();
  if (!table) return `could not list the running programs, so there is no way to tell whether process ${pid} belongs to this project.`;
  const me = table.find((p) => p.pid === pid);
  if (!me) return null; // nothing to stop
  const top = git(cwd, ['rev-parse', '--show-toplevel']).out.trim() || cwd;
  const norm = (s) => s.replace(/\\/g, '/').toLowerCase();
  const root = norm(toPath(top)).replace(/\/$/, '') + '/';
  const tree = [me];
  for (let k = 0; k < tree.length && k < 500; k++) tree.push(...table.filter((p) => p.ppid === tree[k].pid && p.pid !== tree[k].pid && !tree.includes(p)));
  if (tree.some((p) => norm(p.text).includes(root))) return null;
  const what = me.text.trim().replace(/\s+/g, ' ').slice(0, 160);
  return `process ${pid} does not run from this project (${what}). It may be another project's server or another AI session.`;
}

function checkSecretRead(words, found) {
  if (NAMES_ONLY.has(cmdWord(words))) return;
  for (const w of words) {
    for (const m of String(w).matchAll(SECRET_IN_TEXT)) {
      if (TEMPLATE.test(m[1])) continue;
      return found.push({ guard: 'secret', decision: 'block', reason: `this command opens a secret file (${m[1]}). Its keys would end up in the chat.` });
    }
  }
}

// Every guard over one command. Returns the first block, else the first ask, else null.
export function analyze(command, cwd = process.cwd(), depth = 0) {
  const text = String(command);
  if (!/git|gh|wrangler|env|vars|credentials|service-account|pem|id_|kill|process|taskkill|wmic|spps|pnpm|npm|yarn|bun|husky/i.test(text)) return null;
  const segs = segments(text);
  const found = [];
  const ctx = { cwd: toPath(cwd), stashed: false, husky: false };
  const bypassed = (guard) => {
    const v = GUARDS[guard].bypass;
    return new RegExp(`^\\s*([A-Za-z_]\\w*=\\S*\\s+)*${v}=1(\\s|$)`).test(text);
  };
  ctx.husky = /(^|[\s;&|])(export\s+)?HUSKY=0\b|\$env:HUSKY\s*=\s*['"]?0/i.test(text) && segs.some(({ words }) => words.some((w) => base(w) === 'git'));
  for (const { words } of segs) {
    const c = cmdWord(words);
    if (['cd', 'pushd', 'set-location', 'sl', 'chdir'].includes(c)) {
      const k = words.findIndex((w) => base(w) === c);
      const to = words.slice(k + 1).find((w) => !w.startsWith('-') || w === '-');
      if (to && to !== '-') ctx.cwd = resolve(ctx.cwd, toPath(to.replace(/^~(?=[\/\\]|$)/, homedir())));
      continue;
    }
    words.forEach((w, i) => {
      const b = base(w);
      if (b === 'git' && i === words.findIndex((x) => base(x) === 'git')) checkGit(words, i, ctx, found);
      if (b === 'gh' && i === words.findIndex((x) => base(x) === 'gh')) checkGh(words, i, found);
      if (b === 'wrangler' && i === words.findIndex((x) => base(x) === 'wrangler')) checkWrangler(words, i, ctx, found);
    });
    checkSecretRead(words, found);
    const script = depth < 3 ? scriptFor(words, ctx.cwd) : null;
    if (script) {
      const r = analyze(script, ctx.cwd, depth + 1);
      if (r) found.push({ ...r, reason: `${r.reason} (inside the package script it runs: ${script})` });
    }
  }
  checkProcesses(segs, ctx, found);
  const live = found.filter((f) => !bypassed(f.guard));
  return live.find((f) => f.decision === 'block') || live.find((f) => f.decision === 'ask') || null;
}

export function message(r) {
  const g = GUARDS[r.guard];
  if (r.decision === 'ask') {
    return `Ownercode ${r.guard} guard: ${r.reason}\n${g.advice}\nApprove only if the owner wants this now.`;
  }
  return `BLOCK: ${r.reason} (Ownercode ${r.guard} guard)\n${g.advice}\n` +
    `If the owner said yes to this exact command, re-run it as:\n    ${g.bypass}=1 <the same command>\n` +
    'Do NOT add the prefix on your own, and do not offer it as a shortcut. Tell the owner in plain words what was stopped and why.';
}

function main() {
  const codex = process.argv.includes('--codex');
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch {}
  setKillIsPowershell(codex || input.tool_name === 'PowerShell');
  let command = input.tool_input?.command;
  if (Array.isArray(command)) command = command.join(' ');
  if (typeof command !== 'string' || !command.trim()) process.exit(0);
  let r;
  try {
    r = analyze(command, input.cwd || process.cwd());
  } catch (e) {
    // A guard that crashes must not fail open with no word.
    r = { guard: 'discard', decision: 'block', reason: `the Ownercode guard crashed (${e.message}), so this command was not checked. Tell the owner.` };
  }
  if (!r) process.exit(0);
  const text = message(r);
  if (codex) {
    // Codex hooks cannot ask the owner, so an ask becomes a stop that tells
    // the agent to ask in chat.
    const reason = r.decision === 'ask'
      ? `${text.split('\n').slice(0, 2).join('\n')}\nAsk the owner in chat first. Only on a clear yes, re-run it as:\n    ${GUARDS[r.guard].bypass}=1 <the same command>`
      : text;
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: reason } }));
    process.exit(0);
  }
  if (r.decision === 'ask') {
    console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'ask', permissionDecisionReason: text } }));
    process.exit(0);
  }
  process.stderr.write(text + '\n');
  process.exit(2);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
