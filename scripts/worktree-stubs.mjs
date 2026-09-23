// ============================================================
// File:        worktree-stubs.mjs
// Path:        scripts/worktree-stubs.mjs
// Project:     RaceArena — POLISH-2026-09-24B piece 4(a)
// Description: List, and on request remove, the dead registrations left in `.git/worktrees/`.
//
// ── ★★ WHAT A "STUB" IS, AND WHY IT IS NOT THE WORKTREE ────────────────────────────────────────
// A git worktree has TWO parts: the checkout somewhere on disk, and a registration directory under
// `.git/worktrees/<name>` holding its HEAD, refs and logs. Remove the checkout by hand — which is
// what happens when a night's scratch worktree is cleaned up — and the registration survives. It is
// a stub: a few kilobytes of metadata pointing at nothing.
//
// ★★★ THIS SCRIPT ONLY EVER TOUCHES `.git/worktrees/<name>`. IT NEVER DELETES A CHECKOUT, and that
// restriction is the whole safety argument. This repository has already been bitten by the
// alternative: a scratch worktree's `node_modules` is a JUNCTION to the real one, and `rm -rf` on
// the checkout FOLLOWS the junction and hollows out the real `node_modules`. Nothing here removes
// anything outside `.git/`, so that failure is not reachable from this script.
//
// ── WHY NOT `git worktree prune` ───────────────────────────────────────────────────────────────
// It is the right tool and it does not work here: on Windows under OneDrive it fails with EPERM on
// the very directories that need removing, leaving the stubs in place and the operator with an
// error and no list. This does the same job, reports what it cannot remove instead of failing, and
// prints the count either way.
//
// ── ★ AND WHY `git worktree list` DOES NOT SHOW THEM ───────────────────────────────────────────
// It lists worktrees whose checkout still EXISTS. A stub whose checkout is gone is invisible to it —
// which is exactly why they accumulate unnoticed. `--list` here reads the directory, not git's view.
//
// ── USAGE ──────────────────────────────────────────────────────────────────────────────────────
//   node scripts/worktree-stubs.mjs            # list; changes nothing (the default, deliberately)
//   node scripts/worktree-stubs.mjs --remove   # remove the DEAD ones
// ============================================================

import { readdirSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '..');
const WORKTREES = join(REPO, '.git', 'worktrees');

/**
 * Inspect every registration. A stub is DEAD when the checkout it points at is gone.
 *
 * The pointer is `.git/worktrees/<name>/gitdir`, which holds the path of the checkout's own `.git`
 * FILE. Some stubs have lost even that — those are dead by definition, and are reported with the
 * reason rather than skipped, because a stub with no `gitdir` is the most orphaned kind there is.
 */
export function readStubs(worktreesDir = WORKTREES) {
  if (!existsSync(worktreesDir)) return [];
  let names;
  try {
    names = readdirSync(worktreesDir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name);
  } catch {
    return [];
  }
  return names.map((name) => {
    const dir = join(worktreesDir, name);
    const gitdirFile = join(dir, 'gitdir');
    let target = null;
    let reason = null;
    if (!existsSync(gitdirFile)) {
      reason = 'no gitdir pointer';
    } else {
      try {
        target = readFileSync(gitdirFile, 'utf8').trim();
      } catch {
        reason = 'gitdir unreadable';
      }
    }
    // `gitdir` names the checkout's `.git` file; the checkout is its parent.
    const checkout = target ? dirname(target) : null;
    const alive = !!checkout && existsSync(checkout);
    if (!reason && !alive) reason = 'checkout is gone';
    return { name, dir, target, checkout, alive, reason };
  });
}

export function removeStub(stub) {
  try {
    rmSync(stub.dir, { recursive: true, force: true });
    return { ok: true };
  } catch (err) {
    // OneDrive answers EPERM or UNKNOWN(-4094) on a placeholder. Reported, never thrown.
    return { ok: false, reason: err.code ?? String(err.message ?? err) };
  }
}

function bytesOf(dir) {
  let total = 0;
  const walk = (d) => {
    let es;
    try {
      es = readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of es) {
      const abs = join(d, e.name);
      if (e.isDirectory()) walk(abs);
      else
        try {
          total += statSync(abs).size;
        } catch {
          /* a size we cannot read is not worth failing over */
        }
    }
  };
  walk(dir);
  return total;
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(HERE, 'worktree-stubs.mjs');
if (isMain) {
  const remove = process.argv.includes('--remove');
  const stubs = readStubs();
  if (stubs.length === 0) {
    console.log('worktree-stubs: .git/worktrees is empty — nothing registered.');
    process.exit(0);
  }
  const dead = stubs.filter((s) => !s.alive);
  const live = stubs.filter((s) => s.alive);

  console.log(`worktree-stubs: ${stubs.length} registration(s) — ${live.length} live, ${dead.length} DEAD`);
  for (const s of live) console.log(`  live  ${s.name}  -> ${s.checkout}`);
  for (const s of dead) console.log(`  DEAD  ${s.name}  (${s.reason})`);

  if (!remove) {
    if (dead.length)
      console.log(
        `\n${dead.length} dead stub(s), ${bytesOf(WORKTREES)} bytes under .git/worktrees. ` +
          'Run with --remove to delete them. Nothing outside .git/ is ever touched.'
      );
    process.exit(0);
  }

  let removed = 0;
  const failed = [];
  for (const s of dead) {
    const r = removeStub(s);
    if (r.ok) removed++;
    else failed.push(`${s.name} (${r.reason})`);
  }
  console.log(`\nremoved ${removed} of ${dead.length} dead stub(s)`);
  if (failed.length) {
    console.log(`could not remove ${failed.length}: ${failed.join(', ')}`);
    console.log('That is usually a OneDrive placeholder holding the directory; try again when it syncs.');
  }
  // ★ A stub it could not remove is not a failure of the run: the list is still correct and the
  // operator has been told. Exiting non-zero here would make this unusable in a chain.
  process.exit(0);
}
