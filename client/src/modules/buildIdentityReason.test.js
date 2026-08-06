// ============================================================
// File:        buildIdentityReason.test.js
// Project:     RaceArena — BUILD-UNKNOWN-1
//
// THE DEFECT THIS EXISTS FOR: the badge could detect that it had failed but could not say WHY.
// `git()` discarded stderr (`stdio: [_, _, 'ignore']`) and the catch returned `''`, so an amber
// `build unknown` was the whole of the message. When it fired for real, the diagnosis could refute
// six hypotheses by experiment and name none of them — because the evidence had been thrown away at
// the one moment it existed.
//
// HOW THESE TESTS RUN, and why it is not a mock. `readBuildInfo()` reads the repository the plugin
// LIVES in (`REPO_ROOT` comes from its own file location), so each case copies the plugin into a
// temporary tree and evaluates it in a CHILD NODE PROCESS with a chosen environment. Two reasons:
// the whole failure class is about what a spawned `git` actually does, which a stub would get
// wrong-in-a-different-way; and a child process cannot leave a broken PATH behind in the suite.
//
// L203 throughout: every assertion that a reason IS carried is paired with the working position, so
// none of them would pass with the reason plumbing disconnected.
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/**
 * THIS FILE SPAWNS REAL PROCESSES, so vitest's 5-second default is the wrong budget for it — and
 * that was measured, not guessed (ONE-TRUTH-1 stages 2 and 6).
 *
 * Every case here copies the plugin into a temp tree, runs `git init`/`add`/`commit`/`checkout`
 * against it, and evaluates the plugin in a CHILD NODE PROCESS. The detached-HEAD case alone is
 * five git spawns plus a node spawn. On this Windows/OneDrive checkout that costs ~5 s when the
 * machine is idle and ~13 s when the full suite is running beside it.
 *
 * The consequence, before this line existed: the retry ledger recorded the detached-HEAD case
 * burning all four attempts on `timeout — Test timed out in 5000ms` and FAILING the suite, while
 * the same test passed on attempt 2 or 3 when run alone. Nothing about the product was wrong; the
 * test was being asked to spawn a dozen processes inside five seconds.
 *
 * 30 s, because the worst measured attempt was ~13 s and a timeout that sits just above the
 * observed maximum is a flake generator. This buys latency on a genuinely failing run and nothing
 * else — a passing run still takes what it takes.
 */
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, copyFileSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PLUGIN_SRC = join(process.cwd(), 'vite-plugin-ra-build.js');
const temps = [];

/** A tree with the plugin at `<root>/client/`, so its own REPO_ROOT is `<root>` — as in this repo. */
function makeTree(prefix) {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temps.push(root);
  const clientDir = join(root, 'client');
  mkdirSync(clientDir, { recursive: true });
  copyFileSync(PLUGIN_SRC, join(clientDir, 'vite-plugin-ra-build.js'));
  return root;
}

/**
 * Evaluate `readBuildInfo()` from the copy in `root`, in a child process with `envPatch` applied.
 * A key set to `undefined` is REMOVED from the child's environment.
 */
function readBuildInfo(root, envPatch = {}) {
  const url = pathToFileURL(join(root, 'client', 'vite-plugin-ra-build.js')).href;
  const env = { ...process.env };
  for (const [k, v] of Object.entries(envPatch)) {
    if (v === undefined) delete env[k];
    else env[k] = v;
  }
  const code = `const m = await import(${JSON.stringify(url)});
process.stdout.write(JSON.stringify(m.readBuildInfo()));`;
  // node is invoked by absolute path, so an emptied PATH breaks `git` without breaking the harness.
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env,
  });
  return JSON.parse(out);
}

/** git is unreachable to a child that has no PATH — the one failure mode reproduced in the incident. */
const NO_PATH = { PATH: '', Path: '' };

let repo;
let plain;
const git = (args) =>
  execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

beforeAll(() => {
  repo = makeTree('ra-build-');
  execFileSync('git', ['init', '-q', '-b', 'sandbox-main'], { cwd: repo, stdio: 'pipe' });
  git(['config', 'user.email', 'test@example.invalid']);
  git(['config', 'user.name', 'Test']);
  writeFileSync(join(repo, 'a.txt'), 'one\n');
  git(['add', '-A']);
  git(['commit', '-q', '-m', 'first']);

  plain = makeTree('ra-nogit-'); // a tree that is deliberately NOT a repository
});

afterAll(() => {
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

describe('readBuildInfo — the working positions, so the failures below mean something', () => {
  it('reads a real identity, and reports NO reason when there is nothing to report', () => {
    const info = readBuildInfo(repo);
    expect(info.commit).toMatch(/^[0-9a-f]{7,12}$/);
    expect(info.branch).toBe('sandbox-main');
    expect(info.dirty).toBe(false);
    expect(info.reason).toBe(null);
  });

  it('sees a dirty tree as dirty — the half that would otherwise be a lie of omission', () => {
    writeFileSync(join(repo, 'a.txt'), 'two\n');
    const dirty = readBuildInfo(repo);
    expect(dirty.dirty).toBe(true);
    expect(dirty.reason).toBe(null);
    writeFileSync(join(repo, 'a.txt'), 'one\n');
    expect(readBuildInfo(repo).dirty).toBe(false);
  });

  it('a detached HEAD is a STATE, not a failure — it names no branch and no reason', () => {
    const sha = readBuildInfo(repo).commit;
    git(['checkout', '-q', '--detach', 'HEAD']);
    const info = readBuildInfo(repo);
    expect(info.commit).toBe(sha);
    expect(info.branch).toBe('detached');
    expect(info.reason).toBe(null); // the distinction the reason field must keep
    git(['checkout', '-q', 'sandbox-main']);
    expect(readBuildInfo(repo).branch).toBe('sandbox-main');
  });
});

describe('readBuildInfo — the failure carries its reason', () => {
  it('git unreachable: unknown identity AND a reason naming the command', () => {
    const broken = readBuildInfo(repo, NO_PATH);
    expect(broken.commit).toBe('unknown');
    expect(broken.branch).toBe('unknown');
    expect(broken.dirty).toBe(false);
    expect(broken.reason).toBeTruthy();
    expect(broken.reason).toContain('rev-parse');

    // L203: the SAME tree with the environment intact reports no reason at all. Without this pair
    // the assertion above would pass against a reason that was simply always set.
    expect(readBuildInfo(repo).reason).toBe(null);
  });

  it('the reason is ONE short line — it is read in a terminal beside a stack of Vite logs', () => {
    const broken = readBuildInfo(repo, NO_PATH);
    expect(broken.reason.split('\n')).toHaveLength(1);
    expect(broken.reason.length).toBeLessThan(300);
  });

  it('a directory that is not a repository is unknown WITH a reason, never a guess', () => {
    const info = readBuildInfo(plain);
    expect(info.commit).toBe('unknown');
    expect(info.branch).toBe('unknown');
    expect(info.dirty).toBe(false);
    expect(info.reason).toBeTruthy();
  });

  it('the reason distinguishes a git that REFUSED from a git that never ran', () => {
    // These are different problems with different fixes, and the old code rendered both as ''.
    const neverRan = readBuildInfo(repo, NO_PATH).reason;
    const refused = readBuildInfo(plain).reason;
    expect(neverRan).not.toBe(refused);
    // git's own complaint reaches the human verbatim — this is the stderr that used to be discarded.
    expect(refused.toLowerCase()).toMatch(/repository|repo/);
  });

  it('the unknown identity still RENDERS as unknown — the badge never guesses', async () => {
    const { formatBuildLabel, isBuildUncertain } = await import('./buildInfo.js');
    for (const info of [readBuildInfo(repo, NO_PATH), readBuildInfo(plain)]) {
      expect(formatBuildLabel(info)).toBe('build unknown');
      expect(isBuildUncertain(info)).toBe(true);
      // The reason travels with the identity but is NOT drawn: the badge gained an explanation, not
      // a new string on screen. A cause on the pill would be a second thing to keep true.
      expect(formatBuildLabel(info)).not.toContain(info.reason);
    }
  });
});

describe('readBuildInfo — an unreadable HALF is not reported as a confident whole', () => {
  it('a status that cannot be read makes the identity unknown, not "clean"', () => {
    // The original returned `dirty: false` whenever `status --porcelain` failed — it reported a
    // clean tree it had never managed to look at, which is exactly the lie of omission the dirty
    // flag exists to prevent.
    //
    // A CORRUPT INDEX is the honest lever: `rev-parse --short HEAD` reads HEAD and the ref and still
    // succeeds, while `status --porcelain` must read the index and refuses. So this reaches the
    // half-known state by the only route that actually produces it.
    const indexPath = join(repo, '.git', 'index');
    const saved = readFileSync(indexPath);
    let info;
    try {
      writeFileSync(indexPath, 'GARBAGE');
      info = readBuildInfo(repo);
    } finally {
      writeFileSync(indexPath, saved);
    }
    expect(info.commit).toBe('unknown');
    expect(info.branch).toBe('unknown');
    expect(info.dirty).toBe(false);
    expect(info.reason).toContain('status');

    // L203: same tree, same call, index restored → a complete identity and no reason. Without this
    // pair the test could pass against a readBuildInfo that had simply stopped working.
    const ok = readBuildInfo(repo);
    expect(ok.commit).toMatch(/^[0-9a-f]{7,12}$/);
    expect(ok.reason).toBe(null);
  });
});
