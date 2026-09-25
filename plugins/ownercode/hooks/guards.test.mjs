#!/usr/bin/env node
// The attack list for guards.mjs, in throwaway git repos. It prints nothing
// when every case holds, and one line per hole or false block when not.
//
//   node guards.test.mjs          prints failures, exit 1 if any
//   node guards.test.mjs --all    prints every case with its result
//
// The list started as the 100 commands of the 2026-09-23 guard review
// (docs/audit/reviews/guards-review.md in the Ownercode repo), plus the cloud
// guard's 21. A few expectations follow the owner's later decisions: normal
// pushes to main are allowed, and deploys ask instead of being blocked.
// A block the owner would not expect is a failure too: a guard that blocks
// normal work gets switched off, which is the same as having none.

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, cpSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { analyze, isSecretPath } from './guards.mjs';

const B = 'block', A = 'allow', Q = 'ask';

// [expect, state, command]. States: clean (main, no edits), dirty (main, an
// unsaved edit to a tracked file), feature (branch feat, dirty), ahead (main
// one commit ahead of origin/main, dirty), staged (.env force-staged).
export const CASES = [
  // no-verify
  [B, 'clean', 'git commit --no-verify -m x'],
  [B, 'clean', 'git -c x=y commit --no-verify -m x'],
  [B, 'clean', 'git commit -n -m x'],
  [B, 'clean', 'git commit -nm msg'],
  [B, 'clean', 'git commit -anm msg'],
  [B, 'clean', 'GIT_AUTHOR_NAME=a git commit --no-verify -m x'],
  [B, 'clean', 'cd sub && git commit --no-verify -m x'],
  [B, 'clean', 'git push --no-verify'],
  [B, 'clean', 'git push --no-verif'],
  [B, 'clean', 'git commit --no-verif -m x'],
  [B, 'clean', 'git -c core.hooksPath=/dev/null commit -m x'],
  [B, 'clean', 'git -c core.hooksPath=/dev/null push'],
  [B, 'clean', 'git config core.hooksPath /dev/null && git commit -m x'],
  [B, 'clean', 'git --git-dir=.git commit --no-verify -m x'],
  [B, 'clean', 'git --no-pager commit --no-verify -m x'],
  [B, 'clean', 'bash -c "git commit --no-verify -m x"'],
  [B, 'clean', 'powershell -Command "git commit --no-verify -m x"'],
  [B, 'clean', 'git add . &&\ngit commit --no-verify -m x'],
  [B, 'clean', '/mingw64/bin/git commit --no-verify -m x'],
  [B, 'clean', 'git.exe commit --no-verify -m x'],
  [B, 'clean', 'git -c alias.ci="commit --no-verify" ci -m x'],
  [B, 'clean', 'HUSKY=0 git commit -m x'],
  [B, 'clean', 'git commit "--no-verify" -m x'],
  [B, 'clean', "node -e \"require('child_process').execSync('git commit --no-verify -m x')\""],
  [B, 'clean', 'pnpm exec git commit --no-verify -m x'],
  [B, 'clean', '"C:\\Program Files\\Git\\cmd\\git.exe" commit --no-verify -m x'],
  [A, 'clean', 'git config core.hooksPath .githooks'],
  [A, 'clean', 'git config --get core.hooksPath'],
  // reset: overwriting unsaved edits
  [B, 'dirty', 'git reset --hard'],
  [B, 'dirty', 'git reset --hard HEAD~1'],
  [B, 'dirty', 'git reset --hard origin/main'],
  [B, 'ahead', 'git reset --hard origin/main'],
  [B, 'feature', 'git reset --hard'],
  [B, 'feature', 'git checkout main && git reset --hard'],
  [B, 'dirty', 'cd sub && git reset --hard'],
  [B, 'dirty', 'bash -c "git reset --hard"'],
  [B, 'dirty', 'git -c x=y reset --hard'],
  [A, 'dirty', 'git reset --merge HEAD~0'], // git itself refuses to lose edits
  [B, 'dirty', 'git checkout -f main'],
  [B, 'dirty', 'git switch -f main'],
  [B, 'dirty', 'git switch --discard-changes main'],
  [B, 'dirty', 'git checkout src/app.ts'],
  [B, 'dirty', 'git checkout HEAD src/app.ts'],
  [B, 'dirty', 'git stash && git stash drop'],
  [A, 'dirty', 'git stash && git reset --hard origin/main'],
  [A, 'clean', 'git reset --hard origin/main'],
  [A, 'clean', 'git reset --soft HEAD~1'],
  [A, 'ahead', 'git reset --keep HEAD~1'],
  // discard
  [B, 'dirty', 'git checkout .'],
  [B, 'dirty', 'git checkout -- src/app.ts'],
  [B, 'dirty', 'git restore .'],
  [B, 'dirty', 'git restore --staged --worktree .'],
  [B, 'dirty', 'git restore --source=HEAD src/app.ts'],
  [B, 'dirty', 'git clean -fdx'],
  [B, 'dirty', 'git clean -f -d'],
  [B, 'dirty', 'git clean --force'],
  [B, 'dirty', 'git -c clean.requireForce=false clean -dx'],
  [B, 'clean', 'git branch -D x'],
  [B, 'clean', 'git branch --delete --force x'],
  [B, 'clean', 'git -c x=y branch -D x'],
  [B, 'clean', 'git --no-pager branch -D x'],
  [B, 'clean', 'git stash clear'],
  [B, 'clean', 'git stash drop'],
  [B, 'clean', 'git worktree remove --force ../wt'],
  [B, 'clean', 'git update-ref -d refs/heads/x'],
  [B, 'clean', 'git reflog expire --expire=now --all && git gc --prune=now'],
  [A, 'clean', 'git rebase --onto HEAD~1 HEAD'], // the reflog keeps the commits
  [B, 'dirty', 'git rm -rf src'],
  [B, 'dirty', 'bash -c "git branch -D x"'],
  [B, 'dirty', 'git status\ngit restore .'],
  [A, 'clean', 'git restore src/app.ts'],
  [A, 'clean', 'git checkout feat -- src/app.ts'],
  [A, 'dirty', 'git rm --cached src/app.ts'],
  // force push: main only (owner decision D3)
  [B, 'clean', 'git push --force origin main'],
  [B, 'clean', 'git push -f origin main'],
  [B, 'clean', 'git push origin +main'],
  [B, 'clean', 'git push --force-with-lease origin main'],
  [B, 'clean', 'git push --force'],
  [B, 'clean', 'git push origin --delete main'],
  [B, 'clean', 'git push origin :main'],
  [B, 'clean', 'git push --mirror'],
  [B, 'feature', 'git push -f origin HEAD:main'],
  [A, 'clean', 'git push'],
  [A, 'clean', 'git push origin main'],
  [A, 'clean', 'git push origin feat:main'],
  [A, 'clean', 'git checkout main && git merge feat && git push'],
  [A, 'dirty', 'git push -u origin feat'],
  [A, 'clean', 'git push --force origin feat'],
  [A, 'feature', 'git push --force'],
  [A, 'clean', 'git push origin --delete old-branch'],
  [A, 'clean', 'git push -n'],
  // pr-merge
  [B, 'clean', 'gh pr merge 1 --merge'],
  [B, 'clean', 'gh pr merge 1 --admin'],
  [B, 'clean', 'gh api -X PUT repos/o/r/pulls/1/merge'],
  [B, 'clean', 'gh api graphql -f query="mutation{mergePullRequest(input:{pullRequestId:\\"x\\"}){clientMutationId}}"'],
  [B, 'clean', 'gh pr merge --auto --squash 1'],
  [B, 'clean', 'bash -c "gh pr merge 1"'],
  [A, 'clean', 'gh pr view 1'],
  [A, 'clean', 'gh pr create --title "x" --body "after review, gh pr merge it"'],
  // secret
  [B, 'clean', 'git add -f -A'],
  [B, 'clean', 'git add --force .dev.vars'],
  [B, 'clean', 'git add -f customers.csv'],
  [B, 'staged', 'git commit -m "add config"'],
  [B, 'clean', 'git commit -m x .env'],
  [B, 'clean', 'cat .env'],
  [B, 'clean', 'type .dev.vars'],
  [B, 'clean', 'Get-Content .env'],
  [B, 'clean', 'cat sub/.env.local'],
  [B, 'clean', "node -e \"console.log(require('fs').readFileSync('.env','utf8'))\""],
  [B, 'clean', 'node --env-file=.env -e "console.log(process.env.SECRET)"'],
  [B, 'clean', "python -c \"print(open('.dev.vars').read())\""],
  [B, 'clean', 'grep SECRET .env'],
  [B, 'clean', 'echo "$(cat .env)"'],
  [B, 'clean', 'cp env.example .dev.vars'],
  [A, 'clean', 'git add -A'],
  [A, 'dirty', 'git add src/app.ts'],
  [A, 'clean', 'cat env.example'],
  [A, 'clean', 'cat .env.example'],
  [A, 'clean', 'echo ".env" >> .gitignore'],
  [A, 'clean', 'git rm --cached .env'],
  [A, 'clean', 'node .ownercode/dev-secret.mjs BETTER_AUTH_SECRET'],
  [A, 'clean', 'node -e "console.log(process.env.HOME)"'],
  [A, 'clean', 'cat src/env.ts'],
  // cloud (owner decision D2: ask for deploys, block what wipes live data)
  [B, 'clean', 'npx wrangler d1 execute DB --remote --command "DROP TABLE contacts"'],
  [B, 'clean', 'wrangler d1 execute DB --remote --command="delete from contacts"'],
  [B, 'clean', 'npx wrangler d1 execute DB --remote --command "UPDATE contacts SET name = 1"'],
  [B, 'clean', 'npx wrangler d1 execute DB --remote --command "ALTER TABLE contacts DROP COLUMN phone"'],
  [B, 'clean', 'pnpm exec wrangler d1 execute DB --remote --file=./wipe.sql'],
  [B, 'clean', 'npx wrangler d1 delete DB -y'],
  [B, 'clean', 'npx wrangler delete --force'],
  [B, 'clean', 'npx wrangler secret delete API_KEY'],
  [B, 'clean', 'npx wrangler r2 bucket delete uploads'],
  [B, 'clean', 'npx wrangler kv namespace delete --binding KV'],
  [B, 'clean', 'npx wrangler d1 time-travel restore DB --timestamp=1'],
  [B, 'clean', 'bash -c "npx wrangler d1 delete DB"'],
  [Q, 'clean', 'npx wrangler d1 execute DB --remote --command "DELETE FROM contacts WHERE id = 3"'],
  [Q, 'clean', 'npx wrangler d1 execute DB --remote --command "INSERT INTO contacts (name) VALUES (1)"'],
  [Q, 'clean', 'npx wrangler d1 execute DB --remote --file=./seed.sql'],
  [Q, 'clean', 'npx wrangler d1 execute DB --remote --file=./missing.sql'],
  [Q, 'clean', 'npx wrangler d1 migrations apply DB --remote'],
  [Q, 'clean', 'npx wrangler deploy'],
  [Q, 'clean', 'pnpm run build && npx wrangler pages deploy dist'],
  [Q, 'clean', 'npx wrangler secret put API_KEY'],
  [Q, 'clean', 'pnpm run deploy'],
  [Q, 'clean', 'npm run deploy'],
  [Q, 'clean', 'pnpm deploy'],
  [A, 'clean', 'pnpm run deploy:check'],
  [A, 'clean', 'npx wrangler deploy --dry-run'],
  [A, 'clean', 'BYPASS_CLOUD_GUARD=1 npx wrangler d1 delete DB -y'],
  [A, 'clean', 'npx wrangler d1 execute DB --local --command "DROP TABLE contacts"'],
  [A, 'clean', 'npx wrangler d1 migrations apply DB --local'],
  [A, 'clean', 'npx wrangler d1 execute DB --remote --command "SELECT count(*) FROM contacts"'],
  [A, 'clean', 'npx wrangler dev'],
  [A, 'clean', 'npx wrangler --version'],
  [A, 'clean', 'npx wrangler d1 migrations list DB --remote'],
  [A, 'clean', 'npx wrangler tail'],
  [A, 'clean', 'git commit -m "add wrangler deploy notes"'],
  [A, 'clean', 'pnpm run build'],
  // process
  [B, 'clean', 'pkill -f wrangler'],
  [B, 'clean', 'killall node'],
  [B, 'clean', 'taskkill /IM node.exe /F'],
  [B, 'clean', 'Stop-Process -Name node -Force'],
  [B, 'clean', 'Get-Process node | Stop-Process -Force'],
  [B, 'clean', "Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -match 'wrangler' } | Stop-Process"],
  [B, 'clean', 'kill $(pgrep -f wrangler)'],
  [B, 'clean', "ps aux | grep wrangler | awk '{print $2}' | xargs kill"],
  [B, 'clean', 'wmic process where "name=\'node.exe\'" delete'],
  [B, 'clean', 'powershell -Command "Get-Process node | Stop-Process"'],
  [A, 'clean', 'kill 99999999'], // 99999999 is never a real process ID, so there is nothing to check
  [A, 'clean', 'taskkill /PID 99999999 /T /F'],
  [A, 'clean', 'Stop-Process -Id 99999999'],
  // Git Bash spelling (2026-09-24 re-run: //PID was blocked as if it were /IM)
  [A, 'clean', 'taskkill //T //F //PID 99999999'],
  [A, 'clean', 'cmd.exe /C "taskkill /T /F /PID 99999999"'],
  [B, 'clean', 'taskkill //IM node.exe //F'],
  [B, 'clean', 'taskkill //F //IM node.exe'],
  [B, 'clean', 'cmd //c "taskkill /F /IM node.exe"'],
  [A, 'clean', 'ps aux'],
  [A, 'clean', 'npx kill-port 8788'],
  // global-config (2026-09-24 re-run: a builder ran this on the owner's computer, unasked)
  [B, 'clean', 'git config --global --add safe.directory C:/Scratch/app'],
  [B, 'clean', 'git config --global user.name x'],
  [B, 'clean', 'git config --system core.autocrlf true'],
  [B, 'clean', 'git config --global --unset-all safe.directory'],
  [B, 'clean', 'git config set --global user.email a@example.com'],
  [B, 'clean', 'git config --global --edit'],
  [B, 'clean', 'bash -c "git config --global --add safe.directory *"'],
  [B, 'clean', 'git -C sub config --global core.editor vim'],
  [A, 'clean', 'git config --global user.name'],
  [A, 'clean', 'git config --global --get user.name'],
  [A, 'clean', 'git config --global -l'],
  [A, 'clean', 'git config get --global user.name'],
  [A, 'clean', 'git config user.name x'],
  [A, 'clean', 'git -c safe.directory=C:/Scratch/app status'],
  [A, 'clean', 'git commit -m "never run git config --global --add safe.directory"'],
  // messages and text are not commands
  [A, 'clean', 'git commit -m "docs: explain --no-verify"'],
  [A, 'clean', 'git commit -m "support the -n flag"'],
  [A, 'clean', 'git commit -m x && git log -n 3'],
  [A, 'clean', 'git branch -d merged-work'],
  [A, 'dirty', 'git restore --staged src/app.ts'],
  [A, 'clean', 'git checkout -b new'],
  [A, 'clean', 'git checkout merged-work'],
  [A, 'clean', 'git commit -m "stop using git branch -D in docs"'],
  [A, 'clean', 'git commit -m "explain why git restore . is dangerous"'],
  [A, 'clean', 'git commit -m "document gh pr merge policy"'],
  [A, 'clean', 'git commit -F - <<\'EOF\'\nnever run git reset --hard or git branch -D\nEOF'],
  [A, 'clean', 'git commit -m "$(cat <<\'EOF\'\nfix: stop git push --force to main\nEOF\n)"'],
  [A, 'clean', 'git stash push -m wip'],
  [A, 'clean', 'git stash list'],
  [A, 'clean', 'git clean -n'],
  [A, 'clean', 'git clean -fn'],
  [A, 'clean', 'git commit-tree HEAD^{tree} -n 1'],
  [A, 'clean', 'git checkout feat -- .github/workflows/ci.yml'],
  [A, 'clean', 'git status && git log -n 5 --oneline'],
  [A, 'dirty', 'git checkout -b wip'],
  [A, 'clean', 'git commit -m "fix: handle --force and -f flags"'],
  [A, 'clean', 'ls -la && pnpm run test'],
];

const sh = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8', windowsHide: true });

// One small repo, copied once per state.
export function makeRepos(root) {
  const base = join(root, 'base');
  mkdirSync(join(base, 'src'), { recursive: true });
  mkdirSync(join(base, 'sub'), { recursive: true });
  mkdirSync(join(base, '.githooks'), { recursive: true });
  const files = {
    'src/app.ts': 'export const x = 1;\n',
    'sub/x.txt': 'x\n',
    '.github/workflows/ci.yml': 'on: push\n',
    '.githooks/pre-commit': 'exit 0\n',
    '.gitignore': '.env\n.env.*\n!.env.example\n.dev.vars\n*.csv\nimports/\n',
    'env.example': 'API_KEY=\n',
    '.env.example': 'API_KEY=\n',
    'package.json': JSON.stringify({ scripts: { build: 'astro build', deploy: 'pnpm run build && wrangler deploy', 'deploy:check': 'pnpm run build && wrangler deploy --dry-run' } }),
    'seed.sql': 'INSERT INTO contacts (name) VALUES (\'a\');\n',
    'wipe.sql': '-- clear it\nDELETE FROM contacts;\n',
  };
  for (const [f, text] of Object.entries(files)) { mkdirSync(join(base, f, '..'), { recursive: true }); writeFileSync(join(base, f), text); }
  sh(base, 'init', '-q', '-b', 'main');
  sh(base, 'config', 'user.email', 'test@local'); sh(base, 'config', 'user.name', 'test');
  sh(base, 'config', 'core.autocrlf', 'false');
  sh(base, 'add', '-A'); sh(base, 'commit', '-qm', 'first');
  sh(base, 'update-ref', 'refs/remotes/origin/main', 'HEAD');
  sh(base, 'branch', 'feat'); sh(base, 'branch', 'merged-work');
  for (const f of ['.env', '.dev.vars', 'customers.csv', 'sub/.env.local']) writeFileSync(join(base, f), 'SECRET=not-a-real-key\n');
  const repos = {};
  const edit = (d) => writeFileSync(join(d, 'src/app.ts'), 'export const x = 2;\n');
  for (const state of ['clean', 'dirty', 'feature', 'ahead', 'staged']) {
    const d = join(root, state);
    cpSync(base, d, { recursive: true });
    if (state === 'dirty') edit(d);
    if (state === 'feature') { sh(d, 'checkout', '-q', 'feat'); edit(d); }
    if (state === 'ahead') { writeFileSync(join(d, 'sub/x.txt'), 'y\n'); sh(d, 'commit', '-qam', 'ahead'); edit(d); }
    if (state === 'staged') sh(d, 'add', '-f', '.env');
    repos[state] = d;
  }
  return repos;
}

// Whose program is it (2026-09-24 re-run: a builder tried to stop the other
// project's server by its number). Two real programs: a "server" that runs from
// the clean repo, and a parent outside every repo that started a copy of it.
// Stopping either is fine from the clean repo and blocked from another one.
function startPrograms(root, repos) {
  writeFileSync(join(repos.clean, 'server.cjs'), 'setTimeout(() => {}, 60000);\n');
  writeFileSync(join(root, 'parent.cjs'), "const c = require('child_process').spawn(process.execPath, [process.env.CHILD], { stdio: 'ignore' }); require('fs').writeFileSync(process.env.READY, String(c.pid)); setTimeout(() => {}, 60000);\n");
  const ready = join(root, 'ready');
  const own = spawn(process.execPath, [join(repos.clean, 'server.cjs')], { stdio: 'ignore', windowsHide: true });
  const parent = spawn(process.execPath, [join(root, 'parent.cjs')], { stdio: 'ignore', windowsHide: true, env: { ...process.env, CHILD: join(repos.clean, 'server.cjs'), READY: ready } });
  const pause = new Int32Array(new SharedArrayBuffer(4));
  for (let k = 0; k < 100 && !existsSync(ready); k++) Atomics.wait(pause, 0, 0, 50);
  Atomics.wait(pause, 0, 0, 200);
  const pids = [own.pid, parent.pid, Number(existsSync(ready) ? readFileSync(ready, 'utf8') : 0)].filter(Boolean);
  const stop = process.platform === 'win32' ? (pid) => `taskkill //T //F //PID ${pid}` : (pid) => `kill ${pid}`;
  const cases = [
    [A, 'clean', stop(own.pid)],
    [B, 'dirty', stop(own.pid)],
    [A, 'clean', stop(parent.pid)],
    [B, 'dirty', stop(parent.pid)],
  ];
  if (process.platform === 'win32') cases.push([B, 'dirty', `cmd.exe /C "taskkill /T /F /PID ${own.pid}"`], [B, 'dirty', `Stop-Process -Id ${own.pid}`]);
  return { cases, end: () => { for (const pid of pids) { try { process.kill(pid); } catch {} } } };
}

export function runCases() {
  const root = mkdtempSync(join(tmpdir(), 'ownercode-guards-'));
  const results = [];
  let programs;
  try {
    const repos = makeRepos(root);
    // Before any case runs: the guard reads the list of running programs once.
    programs = startPrograms(root, repos);
    for (const [expect, state, command] of [...CASES, ...programs.cases]) {
      let got;
      try { got = analyze(command, repos[state])?.decision || A; } catch (e) { got = `crash: ${e.message}`; }
      const verdict = got === expect ? 'ok' : expect === A ? 'FALSE BLOCK' : (got === A ? 'HOLE' : 'WRONG KIND');
      results.push({ verdict, expect, got, state, command });
    }
    for (const [p, want] of [['.env', true], ['sub/.env.local', true], ['.dev.vars', true], ['gcp-service-account.json', true], ['.env.example', false], ['env.example', false], ['src/env.ts', false]]) {
      if (isSecretPath(p) !== want) results.push({ verdict: want ? 'HOLE' : 'FALSE BLOCK', expect: want ? B : A, got: want ? A : B, state: '-', command: `isSecretPath(${p})` });
    }
  } finally {
    programs?.end();
    // Windows keeps a stopped program's folder locked for a moment.
    for (let k = 0; k < 20; k++) { try { rmSync(root, { recursive: true, force: true }); break; } catch { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100); } }
  }
  return results;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const results = runCases();
  const bad = results.filter((r) => r.verdict !== 'ok');
  const show = process.argv.includes('--all') ? results : bad;
  for (const r of show) console.log(`${r.verdict}\t${r.state}\texpect ${r.expect}, got ${r.got}\t${r.command.replace(/\n/g, '\\n')}`);
  if (process.argv.includes('--all')) console.log(`${results.length} cases, ${bad.length} wrong`);
  process.exit(bad.length ? 1 : 0);
}
