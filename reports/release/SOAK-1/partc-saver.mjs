// ============================================================
// File:        partc-saver.mjs
// Path:        reports/release/SOAK-1/partc-saver.mjs
// Project:     RaceArena
// Created:     2026-10-07
// Description: SOAK-1 part C — drives a Vite dev server (client/vite-plugin-ra-build.js) all night:
//              one client source save every 2 s, one commit every hour, and the build badge read
//              against git's own answer at the start, after every commit and at the end.
//
// Usage (in a THROWAWAY clone — it commits there; nothing is pushed):
//   node partc-saver.mjs prepare <cloneRoot>                    create and commit the touch file
//   node partc-saver.mjs run <cloneRoot> <devPort> <rawDir> <hours>
//
// The dev server is started separately with GIT_TRACE2_EVENT pointing at a file, so every git it
// runs is recorded. THIS script's own git calls must not be recorded, so it removes that variable
// from its own children's environment.
// Records, in <rawDir>:
//   saver.jsonl — one line per event: save (every 50th, plus a running count), commit, badge,
//                 gitmove (HEAD or index mtime changed, sampled every 250 ms)
// ============================================================

import { execFileSync } from 'node:child_process';
import { appendFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [mode, rootArg, portArg, rawDir, hoursArg] = process.argv.slice(2);
const root = resolve(rootArg);
const TOUCH = join(root, 'client', 'src', 'modules', 'soakTouch.js');
const env = { ...process.env };
delete env.GIT_TRACE2_EVENT;
const git = (...args) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8', windowsHide: true }).trim();
const touchBody = (n) => `// SOAK-1 part C touch file — rewritten every 2 s by partc-saver.mjs.\nexport const SOAK_TOUCH = ${n};\n`;

if (mode === 'prepare') {
  writeFileSync(TOUCH, touchBody(0));
  git('add', TOUCH);
  git('-c', 'user.name=soak', '-c', 'user.email=soak@localhost', 'commit', '--no-verify', '-q', '-m', 'soak-c: touch file');
  console.log('prepared at', git('rev-parse', '--short', 'HEAD'));
  process.exit(0);
}
if (mode !== 'run') throw new Error('mode is prepare or run');

const port = Number(portArg);
const hours = Number(hoursArg ?? 9);
const out = join(rawDir, 'saver.jsonl');
const log = (o) => appendFileSync(out, JSON.stringify({ t: new Date().toISOString(), ...o }) + '\n');

const gitDir = resolve(root, git('rev-parse', '--git-dir'));
const watched = { HEAD: join(gitDir, 'HEAD'), index: join(gitDir, 'index') };
const mtime = (p) => {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return null;
  }
};
const last = Object.fromEntries(Object.entries(watched).map(([k, p]) => [k, mtime(p)]));
const mover = setInterval(() => {
  for (const [k, p] of Object.entries(watched)) {
    const m = mtime(p);
    if (m !== last[k]) {
      log({ ev: 'gitmove', file: k, mtimeMs: m });
      last[k] = m;
    }
  }
}, 250);

function truth() {
  return {
    commit: git('rev-parse', '--short', 'HEAD'),
    branch: git('rev-parse', '--abbrev-ref', 'HEAD'),
    dirty: git('status', '--porcelain') !== '',
  };
}

async function badge(when) {
  const t0 = new Date().toISOString();
  let got = null;
  let error = null;
  for (const path of ['/@id/__x00__virtual:ra-build', '/@id/virtual:ra-build']) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}${path}`, { signal: AbortSignal.timeout(20_000) });
      const text = await r.text();
      const m = /export default (\{.*?\});/s.exec(text);
      if (r.ok && m) {
        got = JSON.parse(m[1]);
        break;
      }
      error = `${path}: ${r.status} ${text.slice(0, 120)}`;
    } catch (e) {
      error = `${path}: ${e.message}`;
    }
  }
  const t = truth();
  const match = !!got && got.commit === t.commit && got.branch === t.branch;
  log({ ev: 'badge', when, fetchedAt: t0, badge: got, truth: t, commitAndBranchMatch: match, error });
  return match;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const startedAt = Date.now();
const endAt = startedAt + hours * 3600_000;
log({ ev: 'start', hours, port });
await sleep(30_000);
await badge('start');

let saves = 0;
let commits = 0;
let nextCommit = startedAt + 3600_000;
while (Date.now() < endAt) {
  const t0 = Date.now();
  saves += 1;
  writeFileSync(TOUCH, touchBody(saves));
  if (saves % 50 === 0) log({ ev: 'save', saves });
  if (Date.now() >= nextCommit) {
    nextCommit += 3600_000;
    git('add', TOUCH);
    git('-c', 'user.name=soak', '-c', 'user.email=soak@localhost', 'commit', '--no-verify', '-q', '-m', `soak-c: hourly commit ${commits + 1}`);
    commits += 1;
    log({ ev: 'commit', n: commits, sha: git('rev-parse', '--short', 'HEAD'), saves });
    await sleep(10_000);
    await badge(`after commit ${commits}`);
  }
  const left = 2000 - (Date.now() - t0);
  if (left > 0) await sleep(left);
}
await sleep(5000);
await badge('end');
clearInterval(mover);
log({ ev: 'end', saves, commits });
