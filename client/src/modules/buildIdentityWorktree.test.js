// ============================================================
// File:        buildIdentityWorktree.test.js
// Project:     RaceArena — BUILD-PILL-WORKTREE
//
// THE DEFECT THIS EXISTS FOR: the build pill could not see a commit made in a linked WORKTREE, and
// said nothing about it. The mtime poll watched `<repo>/.git/HEAD` and `<repo>/.git/index`, paths
// CONSTRUCTED rather than asked for. In a worktree `.git` is a FILE holding a `gitdir:` pointer, so
// neither constructed path exists; `mtimeOf` returned null for both — correctly, a missing file
// being a legitimate reading — and the poll compared null with null on every tick forever. It could
// never fire. The badge froze at start-up and reported itself clean and current while doing it.
//
// It was found live rather than reasoned: 5173 served a four-commit-stale bundle, twice.
//
// WHY A REAL WORKTREE AND NOT A MOCK. The whole failure is about the SHAPE git puts on disk, which
// is the one thing a stub would get wrong-in-a-different-way — a hand-made `.git` file would be
// testing this file's idea of a worktree rather than git's. So each case builds a real repository,
// runs `git worktree add`, and evaluates the plugin's own copy inside it.
//
// L203 THROUGHOUT: every assertion about the fix is paired with the same assertion against the OLD
// CONSTRUCTION, which must still fail in the worktree. Without that pairing these tests would pass
// with the defect fully present, since a poll over two valid paths is indistinguishable from a poll
// over two invalid ones until something actually moves.
// ============================================================

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

/**
 * This file spawns real git processes — init, commit, worktree add, and further commits — in the
 * same class as buildIdentityReason.test.js, whose measured worst attempt on this Windows/OneDrive
 * checkout was ~13 s under full-suite contention. Same budget, same reason: a timeout sitting just
 * above the observed maximum is a flake generator.
 */
vi.setConfig({ testTimeout: 30_000, hookTimeout: 30_000 });

import { execFileSync } from 'node:child_process';
import {
  mkdtempSync,
  mkdirSync,
  copyFileSync,
  rmSync,
  writeFileSync,
  statSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const PLUGIN_SRC = join(process.cwd(), 'vite-plugin-ra-build.js');
const temps = [];

/**
 * Put the plugin at `<tree>/client/` so its REPO_ROOT resolves to `<tree>`, exactly as in this repo.
 * REPO_ROOT is derived from the plugin's OWN file location, so a copy is the only way to point it at
 * a tree of our choosing — importing the repository's copy would measure this repository.
 */
function installPluginIn(tree) {
  const clientDir = join(tree, 'client');
  mkdirSync(clientDir, { recursive: true });
  copyFileSync(PLUGIN_SRC, join(clientDir, 'vite-plugin-ra-build.js'));
  return pathToFileURL(join(clientDir, 'vite-plugin-ra-build.js')).href;
}

/**
 * Evaluate an expression against the plugin copy in a CHILD NODE PROCESS, and return its JSON.
 *
 * A child rather than a plain `import()`, for the same reason buildIdentityReason.test.js uses one:
 * vitest routes every dynamic specifier through Vite's resolver, which looks for the temp path
 * inside this project's module graph and fails with `Cannot find module` — `@vite-ignore` does not
 * change that. A child process also runs the plugin the way the dev server does, in plain node with
 * a real filesystem, which is the environment the whole defect lives in.
 *
 * `body` is the source of an async function whose return value is serialised. `m` is the module and
 * `mtimeOf` is re-created there because the plugin does not export it.
 */
function evalIn(pluginUrl, body) {
  const code = `const m = await import(${JSON.stringify(pluginUrl)});
const { statSync } = await import('node:fs');
const { execFileSync } = await import('node:child_process');
const mtimeOf = (p) => { try { return statSync(p).mtimeMs; } catch { return null; } };
const run = async () => { ${body} };
process.stdout.write(JSON.stringify(await run()));`;
  // The child's stderr is CARRIED, not discarded. A child that crashes otherwise fails this suite
  // with a bare `Command failed` and no cause — the same half-an-instrument failure BUILD-UNKNOWN-1
  // was written to end, and it cost a debugging round here before this line existed.
  let out;
  try {
    out = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (e) {
    throw new Error(
      `child failed: ${
        String(e?.stderr || e?.message)
          .trim()
          .split('\n')[0]
      }`
    );
  }
  return JSON.parse(out);
}

/** What the poll used to watch. Kept verbatim so the L203 pairings are against the real old shape. */
const constructedPaths = (tree) => [join(tree, '.git', 'HEAD'), join(tree, '.git', 'index')];

let mainTree;
let worktree;
let mainPluginUrl;
let worktreePluginUrl;

const gitIn = (cwd, args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

const commitIn = (cwd, name, body) => {
  writeFileSync(join(cwd, name), body);
  gitIn(cwd, ['add', '-A']);
  gitIn(cwd, ['commit', '-q', '-m', `commit ${name}`]);
};

beforeAll(async () => {
  mainTree = mkdtempSync(join(tmpdir(), 'ra-wt-main-'));
  temps.push(mainTree);
  execFileSync('git', ['init', '-q', '-b', 'sandbox-main'], { cwd: mainTree, stdio: 'pipe' });
  gitIn(mainTree, ['config', 'user.email', 'test@example.invalid']);
  gitIn(mainTree, ['config', 'user.name', 'Test']);
  commitIn(mainTree, 'a.txt', 'one\n');

  // A real linked worktree, made by git rather than by hand.
  worktree = join(tmpdir(), `ra-wt-linked-${process.pid}`);
  temps.push(worktree);
  gitIn(mainTree, ['worktree', 'add', '-q', '-b', 'sandbox-wt', worktree]);

  mainPluginUrl = installPluginIn(mainTree);
  worktreePluginUrl = installPluginIn(worktree);
});

afterAll(() => {
  for (const t of temps) rmSync(t, { recursive: true, force: true });
});

describe('the shape of a linked worktree, established before anything is asserted about it', () => {
  it('puts a FILE at .git in the worktree and a DIRECTORY at .git in the main tree', () => {
    expect(statSync(join(worktree, '.git')).isFile()).toBe(true);
    expect(statSync(join(mainTree, '.git')).isDirectory()).toBe(true);
  });

  it('leaves the CONSTRUCTED paths non-existent in the worktree — the whole defect in one line', () => {
    for (const p of constructedPaths(worktree)) expect(existsSync(p)).toBe(false);
    // Paired with the main tree, where the same construction is correct. That pairing is what makes
    // the line above a statement about worktrees rather than about temp directories.
    for (const p of constructedPaths(mainTree)) expect(existsSync(p)).toBe(true);
  });
});

describe('gitIdentityPaths — asked for, not constructed', () => {
  it('names files that EXIST in a worktree, where the construction named files that do not', () => {
    const asked = evalIn(worktreePluginUrl, 'return m.gitIdentityPaths();');
    expect(asked).toHaveLength(2);
    for (const p of asked) expect(existsSync(p)).toBe(true);
    // L203: the old construction, on the same tree, at the same moment.
    for (const p of constructedPaths(worktree)) expect(existsSync(p)).toBe(false);
  });

  it('still names files that exist in a MAIN tree — the fix must not trade one shape for the other', () => {
    const asked = evalIn(mainPluginUrl, 'return m.gitIdentityPaths();');
    for (const p of asked) expect(existsSync(p)).toBe(true);
  });

  it('returns ABSOLUTE paths in both shapes, since a relative answer would be read against the wrong cwd', () => {
    // `git rev-parse --git-path` answers relatively in a main tree and absolutely in a worktree; the
    // caller resolves against REPO_ROOT, so both come back absolute or the poll would watch nothing.
    const both = [
      ...evalIn(worktreePluginUrl, 'return m.gitIdentityPaths();'),
      ...evalIn(mainPluginUrl, 'return m.gitIdentityPaths();'),
    ];
    for (const p of both) {
      expect(join(p)).toBe(p);
      expect(p).toMatch(/^([A-Za-z]:[\\/]|\/)/);
    }
  });
});

describe('the poll fires on a commit made in a worktree — the behaviour the badge depends on', () => {
  it('sees a commit through the asked-for paths, and is BLIND to it through the constructed ones', () => {
    // The WHOLE sequence runs in one child, because a poll's state is in-process: it must be seeded,
    // ticked, then ticked again across a commit that happens between two ticks of the same object.
    const r = evalIn(
      worktreePluginUrl,
      `const wt = ${JSON.stringify(worktree)};
       const { join } = await import('node:path');
       const constructed = [join(wt, '.git', 'HEAD'), join(wt, '.git', 'index')];
       const askedPoll = m.makeMtimePoll(m.gitIdentityPaths(), mtimeOf);
       const constructedPoll = m.makeMtimePoll(constructed, mtimeOf);
       // Both are seeded to report a change on their FIRST tick, so that call proves nothing and is
       // consumed deliberately rather than asserted on.
       askedPoll(); constructedPoll();
       const quietAsked = askedPoll(), quietConstructed = constructedPoll();
       const { writeFileSync } = await import('node:fs');
       writeFileSync(join(wt, 'b.txt'), 'two\\n');
       const g = (a) => execFileSync('git', a, { cwd: wt, encoding: 'utf8', stdio: ['ignore','pipe','pipe'] });
       g(['add', '-A']); g(['commit', '-q', '-m', 'commit b.txt']);
       return { quietAsked, quietConstructed,
                sawAsked: askedPoll(), sawConstructed: constructedPoll(),
                head: g(['rev-parse', '--short', 'HEAD']).trim() };`
    );

    // Quiet before the commit, both ways — otherwise "it fired" below would mean nothing.
    expect(r.quietAsked).toBe(false);
    expect(r.quietConstructed).toBe(false);

    expect(r.sawAsked).toBe(true);
    // L203, and it is the entire point of this file: the old construction cannot see the commit that
    // just happened and reports quiet. That is what let the badge freeze while claiming to be clean.
    expect(r.sawConstructed).toBe(false);
  });

  it('reads the new commit back through readBuildInfo, so the poll and the identity agree', () => {
    const head = gitIn(worktree, ['rev-parse', '--short', 'HEAD']).trim();
    const info = evalIn(worktreePluginUrl, 'return m.readBuildInfo();');
    expect(info.commit).toBe(head);
    expect(info.branch).toBe('sandbox-wt');
    expect(info.reason).toBeNull();
  });
});
