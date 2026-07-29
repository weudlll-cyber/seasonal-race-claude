// ============================================================
// File:        scripts/audit-local.mjs
// Project:     RaceArena
// Description: Repeatable LOCAL hygiene audit — the CLEAN-SWEEP Stage-0 inventory as ONE command.
//              Read-only: it never mutates the repo. Prints, categorized:
//                • git status --short (untracked + modified)
//                • git stash list
//                • non-master local branches
//                • local-only tags (present locally, absent on origin)
//                • untracked *.md anywhere (living-doc candidates that should be committed)
//                • scratch/tmp size (the reproducible-artifact pile)
//              Run from the repo root: `node scripts/audit-local.mjs`.
//              Exit code is 0 always (informational); a non-empty finding is printed, not failed.
// ============================================================

import { execSync } from 'node:child_process';
import { existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const ROOT = process.cwd();
const sh = (cmd) => {
  try {
    return execSync(cmd, { cwd: ROOT, encoding: 'utf8' }).trimEnd();
  } catch (e) {
    return (e.stdout || '').toString().trimEnd();
  }
};
const section = (title) => console.log(`\n=== ${title} ===`);
const bytesToH = (n) => (n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : n < 1024 ** 3 ? `${(n / 1024 ** 2).toFixed(1)} MB` : `${(n / 1024 ** 3).toFixed(2)} GB`);
function dirSize(dir) {
  let total = 0, files = 0;
  const walk = (d) => {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(d, e.name);
      if (e.isDirectory()) walk(p);
      else { try { total += statSync(p).size; files++; } catch { /* ignore */ } }
    }
  };
  walk(dir);
  return { total, files };
}

console.log('RaceArena — local hygiene audit (read-only)');

section('git status --short (untracked + modified)');
const status = sh('git status --short');
console.log(status || '(clean)');

section('git stash list');
const stash = sh('git stash list');
console.log(stash || '(no stashes)');

section('non-master local branches');
const branches = sh('git branch --format="%(refname:short)"')
  .split('\n').map((b) => b.trim()).filter((b) => b && b !== 'master');
console.log(branches.length ? branches.join('\n') : '(master only)');

section('local-only tags (present locally, absent on origin)');
const localTags = sh('git tag').split('\n').map((t) => t.trim()).filter(Boolean).sort();
const originTags = new Set(
  sh('git ls-remote --tags origin')
    .split('\n')
    .map((l) => l.replace(/^.*refs\/tags\//, '').replace(/\^\{\}$/, '').trim())
    .filter(Boolean)
);
const localOnly = localTags.filter((t) => !originTags.has(t));
console.log(localOnly.length ? localOnly.join('\n') : '(none — all local tags are on origin)');

section('untracked *.md anywhere (living-doc candidates — commit or delete)');
// git status --porcelain shows untracked non-ignored; also sweep ignored dirs for stray .md.
const untrackedMd = sh('git ls-files --others --exclude-standard "*.md"')
  .split('\n').map((f) => f.trim()).filter(Boolean);
console.log(untrackedMd.length ? untrackedMd.join('\n') : '(none)');

section('scratch / tmp size (reproducible artifacts — safe to purge)');
const scratch = process.env.RA_SCRATCH_DIR || join(tmpdir(), 'racearena-scratch');
for (const dir of [scratch, join(ROOT, 'client', 'tmp'), join(ROOT, 'results')]) {
  if (existsSync(dir)) {
    const { total, files } = dirSize(dir);
    console.log(`${dir}  —  ${bytesToH(total)} across ${files} files`);
  } else {
    console.log(`${dir}  —  (absent)`);
  }
}
console.log('\nTip: `node scripts/sim-fairness.mjs --purge-tmp …` wipes the sweep OUT_DIR; scratch defaults off the OneDrive tree.');
