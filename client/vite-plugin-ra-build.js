// ============================================================
// File:        vite-plugin-ra-build.js
// Path:        client/vite-plugin-ra-build.js
// Project:     RaceArena — BUILD-TRUTH-1
//
// WHY THIS EXISTS. `__RA_COMMIT__` was a `define` constant, and a `define` is resolved ONCE when Vite
// loads its config — i.e. when the dev server STARTS. The dev server then runs for days while the
// working tree moves under it. On 2026-08-04 the owner's live marker reported build `be649aa9`
// because the dev server had been started at 00:24:15, 36 seconds after that commit; by 21:59 the
// tree was at `3b857d05`, twenty-two hours and nine commits later, and the badge had no way to know.
// It was not stale by accident — it was structurally incapable of being anything else.
//
// THE RULE THIS ENFORCES: the build identity may never be older than the code it names.
//
//   DEV    the value is read from git when the virtual module is loaded, and the module is
//          INVALIDATED with a full page reload whenever the identity changes. Two signals make that
//          complete: Vite's own file watcher catches every source edit (which is what makes the tree
//          dirty), and a mtime POLL over git's OWN `HEAD` + `index` catches a commit or a branch
//          switch, which can change the identity without touching a single file Vite tracks.
//   BUILD-PILL-WORKTREE corrected WHERE those two files are. They were CONSTRUCTED as
//          `<repo>/.git/HEAD` and `.../index`, which is true in a main tree and false in a linked
//          WORKTREE — there `.git` is a file, neither path exists, and the poll compared null with
//          null forever and could never fire. The paths are now ASKED FOR with
//          `git rev-parse --git-path`. See gitIdentityPaths.
//   BUILD-PILL-TRUTH corrected the second half. It used to say those two files were "added to"
//          Vite's watcher — and that line had never fired, because Vite's watcher ignores `.git`.
//          The reload after a branch switch was arriving from the SOURCE FILES the switch rewrote, so
//          the mechanism worked for a different reason than the one written here, and failed exactly
//          when no file changed. See makeMtimePoll.
//   BUILD  the value is read once, at build time, which is honest by construction: the constant and
//          the bundle are made in the same act and ship together.
//
// BUILD-UNKNOWN-1 added the SECOND half of the same rule: when the identity cannot be read, the
// instrument must say WHY. The badge still reads `build unknown` and still never guesses — but the
// reason now travels with it (`info.reason`) and is printed by the dev server, once at start-up and
// again whenever the reason changes. The first version could detect its own failure and not explain
// it, which left the owner with a colour and no next step; a diagnosis afterwards could refute
// hypotheses but never name the cause, because the evidence had been discarded at the moment it
// existed. See reports/evolution/BUILD-UNKNOWN-1.md.
//
// The virtual module is imported by ONE file (RaceScreen/index.jsx). It is deliberately NOT imported
// by anything under `modules/`, because `scripts/render-fingerprint.mjs` drives the real drawing code
// directly in node, outside Vite, where a bare `virtual:` specifier cannot resolve. The build badge
// reaches the renderer as frame data, exactly like `cfgBadge`.
// ============================================================

import { execSync } from 'node:child_process';
import { statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const VIRTUAL_ID = 'virtual:ra-build';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

// How often the two git files are stat-ed. Well under the time it takes to switch branch and look at
// the screen, and two stat calls a second are not a cost. It is NOT how often the identity is read —
// see makeMtimePoll: `readBuildInfo()` still runs only when a mtime actually moved.
const GIT_POLL_MS = 500;

/**
 * WHY THE FAILURE CARRIES A REASON (BUILD-UNKNOWN-1).
 *
 * This helper used to discard `stderr` and swallow the exception, so `readBuildInfo()` could detect
 * that it had failed but could never say WHY — the owner got an amber `build unknown` and no next
 * step, and a diagnosis afterwards could only refute hypotheses, never name the cause. An instrument
 * whose failure mode carries no information is only half an instrument.
 *
 * `git` also cannot report on stderr and exit 0, so capturing stderr costs nothing on the happy path.
 *
 * @returns {{out: string, reason: string|null}} `reason` is null on success, and a SHORT one-line
 *   cause on failure — never the whole output, because this is read in a terminal beside a stack of
 *   Vite logs.
 */
function git(args) {
  try {
    const out = execSync(`git ${args}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
    return { out, reason: null };
  } catch (e) {
    return { out: '', reason: describeFailure(args, e) };
  }
}

/** The shortest sentence that still identifies WHICH failure this was. */
function describeFailure(args, e) {
  const firstLine = (s) =>
    String(s ?? '')
      .trim()
      .split('\n')[0]
      .trim();
  const stderr = firstLine(e?.stderr);
  // A spawn failure (git missing, cwd gone, permission denied) has a code and no exit status; a git
  // that ran and refused has a status and usually says why on stderr. Both matter, and they are
  // different problems, so the reason names which one happened.
  const what = e?.code
    ? `${e.code}${e.syscall ? ` (${e.syscall})` : ''}`
    : `exit ${e?.status ?? '?'}`;
  const detail = stderr || firstLine(e?.message) || 'no output';
  return `git ${args}: ${what} — ${detail}`;
}

/**
 * The build identity, read fresh from the repository.
 *
 * `dirty` is the honest half: a dirty tree means the screen shows something NO COMMIT DESCRIBES, so
 * the short sha alone would be a lie of omission.
 *
 * EVERY failure returns the unknown identity WITH its reason. That includes a failing
 * `status --porcelain`, which the first version treated as `dirty: false` — i.e. it reported a clean
 * tree it had not been able to look at. That is precisely the lie of omission the dirty flag exists
 * to prevent, so a status that cannot be read makes the whole identity unknown rather than
 * confidently clean. `unknown` is the right answer when it is the true one; it is not a right answer
 * for the half we could not see.
 *
 * @returns {{commit: string, branch: string, dirty: boolean, reason: string|null}}
 */
export function readBuildInfo() {
  const head = git('rev-parse --short HEAD');
  if (!head.out) return unknownBuild(head.reason ?? 'git rev-parse --short HEAD: empty output');

  const branch = git('rev-parse --abbrev-ref HEAD');
  if (branch.reason) return unknownBuild(branch.reason);
  // A detached HEAD is a legitimate STATE, not a failure. git succeeds and prints the literal
  // `HEAD`, which on a badge reads like a branch called HEAD — so it is named for what it is. The
  // previous `|| 'detached'` was reaching for this and could never fire: git does not return empty
  // here, and BUILD-UNKNOWN-1's tests are what showed the fallback was dead.
  const branchName = branch.out === 'HEAD' || !branch.out ? 'detached' : branch.out;

  const status = git('status --porcelain');
  if (status.reason) return unknownBuild(status.reason);

  return { commit: head.out, branch: branchName, dirty: status.out !== '', reason: null };
}

const unknownBuild = (reason) => ({
  commit: 'unknown',
  branch: 'unknown',
  dirty: false,
  reason: reason ?? 'unknown',
});

/** The identity as one comparable string — what "has the build changed?" means. */
const identityOf = (i) => `${i.commit}|${i.branch}|${i.dirty ? 'dirty' : 'clean'}`;

/**
 * BUILD-PILL-TRUTH — a mtime poll over the two git files, because WATCHING THEM DOES NOT WORK.
 *
 * The line this replaces was `server.watcher.add(['.git/HEAD', '.git/index'])`, and it was DEAD:
 * Vite's dev watcher is configured with `ignored: ['**‍/.git/**', …]`, and chokidar applies `ignored`
 * to paths added later just as it does to the initial globs. Adding a file inside an ignored
 * directory adds nothing. The plugin's header claimed those two watches were what made a branch
 * switch visible; they never fired once.
 *
 * It LOOKED like it worked because a branch switch normally rewrites source files, and Vite's own
 * watcher reports those — so the reload arrived for a different reason than the one written down.
 * The two cases with no file churn are exactly the ones that broke:
 *   - switching between branches whose trees are identical (the badge kept the old BRANCH name),
 *   - committing, which moves HEAD and index and touches no working file.
 *
 * Polling mtimes rather than re-reading the identity: `git status --porcelain` on this repo is not
 * free, and running it every second would be a real cost for a value that changes a few times a day.
 * Two `statSync` calls are not measurable. `readBuildInfo()` still runs only when something moved.
 *
 * Kept as a pure function of an injected `stat` so it can be tested without a git repository, a dev
 * server, or a clock.
 *
 * @param {string[]} paths files whose mtime signals a possible identity change
 * @param {(p: string) => number|null} stat mtime in ms, or null when the file cannot be read
 * @returns {() => boolean} tick: true when at least one path changed since the previous tick
 */
export function makeMtimePoll(paths, stat) {
  // Seeded on construction so the first tick reports a CHANGE, not the initial state. A missing file
  // is a legitimate reading (`.git/index` does not exist in a fresh clone until the first stage) and
  // is remembered as null, so its appearance later is itself a change.
  let last = paths.map(stat);
  return () => {
    const now = paths.map(stat);
    const changed = now.some((v, i) => v !== last[i]);
    last = now;
    return changed;
  };
}

/**
 * WHERE THE TWO GIT FILES ACTUALLY ARE — ASKED FOR, NOT CONSTRUCTED.
 *
 * BUILD-PILL-WORKTREE. These paths used to be built as `join(REPO_ROOT, '.git', 'HEAD')` and
 * `…'index'`, which is true in a MAIN tree and false in a LINKED WORKTREE, where `.git` is a FILE
 * holding a `gitdir:` pointer:
 *
 *     C:/ra-n1/.git  →  gitdir: …/Seasonal race claude/.git/worktrees/ra-n1
 *
 * So in a worktree neither constructed path exists. `mtimeOf` returns null for both — correctly, by
 * its own contract, a missing file being a legitimate reading — and the poll then compares
 * `null, null` against `null, null` on every tick FOREVER. **It can never fire.** The badge froze at
 * whatever the server read at start-up, and reported itself clean and current while doing it.
 *
 * That is precisely the failure this file's header says it exists to abolish: a build identity that
 * is "not stale by accident" but "structurally incapable of being anything else". BUILD-TRUTH-1 shut
 * it for the main tree; this shape reopened it for worktrees — and R10 tells us to work in a worktree
 * whenever a judgement is pending, so the more correctly the process was followed, the more certainly
 * the badge lied.
 *
 * `git rev-parse --git-path` answers correctly in both shapes. It returns a path RELATIVE to the git
 * invocation's cwd in a main tree (`.git/HEAD`) and an ABSOLUTE one in a worktree, so the answer is
 * resolved against REPO_ROOT — `resolve` takes an absolute right-hand side as-is and joins a relative
 * one, which is exactly the required behaviour for both.
 *
 * THE FALLBACK IS THE OLD CONSTRUCTION, deliberately. If git cannot be asked at all, the identity is
 * already `unknown` for a reason the badge reports, and the poll has nothing useful to watch; falling
 * back keeps a git-less checkout behaving as it did rather than watching nothing at all.
 *
 * @returns {string[]} the two paths whose mtime signals a possible identity change
 */
export function gitIdentityPaths() {
  const head = git('rev-parse --git-path HEAD');
  const index = git('rev-parse --git-path index');
  if (!head.out || !index.out) {
    return [join(REPO_ROOT, '.git', 'HEAD'), join(REPO_ROOT, '.git', 'index')];
  }
  return [resolve(REPO_ROOT, head.out), resolve(REPO_ROOT, index.out)];
}

/** mtime in ms, or null when the path cannot be read. Never throws — a missing file is an answer. */
const mtimeOf = (p) => {
  try {
    return statSync(p).mtimeMs;
  } catch {
    return null;
  }
};

export function raBuildInfo() {
  let lastIdentity = null;
  let lastCheck = 0;

  return {
    name: 'ra-build-info',

    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },

    load(id) {
      if (id !== RESOLVED_ID) return null;
      const info = readBuildInfo();
      lastIdentity = identityOf(info);
      return `export default ${JSON.stringify(info)};`;
    },

    configureServer(server) {
      // THE START-UP LINE (BUILD-UNKNOWN-1). Both failures this badge has had were noticed by the
      // owner seeing something wrong on screen, never by anything we built. One line at start-up
      // states the identity this server WILL serve, so the terminal that launched it is a record of
      // what it was serving — and an unreadable identity is loud at second zero instead of amber
      // fifteen hours later.
      const report = (info, when) => {
        if (info.reason) {
          server.config.logger.warn(
            `[ra-build] ${when}: build identity UNREADABLE — ${info.reason}\n` +
              `[ra-build] the badge will read "build unknown", which is correct but not useful.\n` +
              `[ra-build] this is re-read on every file change, so a cause that clears fixes ` +
              `itself. But a Windows process-creation failure (exit 3221225794 = 0xC0000142, git ` +
              `never started) is bound to THIS node process and no amount of retrying inside it ` +
              `will help — STOP the dev server and start it again. Saving a file is not enough.`
          );
        } else {
          server.config.logger.info(
            `[ra-build] ${when}: serving build ${info.commit} · ${info.branch}` +
              (info.dirty ? ' +dirty' : '')
          );
        }
      };
      const atStartUp = readBuildInfo();
      report(atStartUp, 'start-up');

      // A commit or a branch switch can change the identity without touching a file Vite watches.
      // `server.watcher.add()` on these two CANNOT close that hole — Vite ignores `.git` — so they
      // are polled instead. See makeMtimePoll for the whole argument, and gitIdentityPaths for why
      // the two paths are ASKED FOR rather than constructed.
      const gitMoved = makeMtimePoll(gitIdentityPaths(), mtimeOf);

      // Seeded from the start-up read so a server that starts broken does not say so twice.
      let lastReason = atStartUp.reason;
      const recheck = (force = false) => {
        // Throttled: a branch switch fires hundreds of watcher events and each `git status` costs
        // real time on a synced disk. 400 ms is well under human reaction time.
        //
        // THE POLL BYPASSES THE THROTTLE, and it has to. This is a LEADING-edge throttle with no
        // trailing call: within a burst, only the first event is served and every later one is
        // dropped for good. A branch switch is exactly a burst — so the poll's call, arriving in the
        // middle of one, would be dropped, and nothing would ever call again because a mtime only
        // changes once. The poll fires at most a few times a day and only when a git file genuinely
        // moved, so there is no burst for it to be throttled against.
        const now = Date.now();
        if (!force && now - lastCheck < 400) return;
        lastCheck = now;

        const info = readBuildInfo();
        // Report a CHANGE of reason, not every failed read: a broken identity re-reads on every
        // watcher event and would otherwise bury the terminal. The transition into and out of a
        // failure is the part a human needs.
        if (info.reason !== lastReason) {
          lastReason = info.reason;
          if (info.reason) report(info, 're-check');
        }

        const identity = identityOf(info);
        if (lastIdentity === null || identity === lastIdentity) return;
        lastIdentity = identity;
        // THE TERMINAL LINE MUST NOT OUTLIVE THE COMMIT IT NAMES (BUILD-PILL-TRUTH). Before this,
        // `start-up: serving build X` was printed once and never corrected, so a terminal that had
        // been open across two branch switches asserted a commit the server had stopped serving
        // hours earlier — and every block that read the pill from that line read a stale one.
        // Announcing the CHANGE is what makes the terminal a record instead of a snapshot.
        if (!info.reason) report(info, 'changed');
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        // A full reload, not HMR: the badge must be re-read from a re-loaded module, and the code it
        // names must be re-fetched in the same act. Anything finer could refresh one without the other.
        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('change', () => recheck());
      server.watcher.on('add', () => recheck());
      server.watcher.on('unlink', () => recheck());

      // The poll is the ONLY thing that sees a branch switch with no file churn, or a commit. It runs
      // beside the watcher rather than replacing it: the watcher is still the fastest signal when
      // source files do change, and `recheck` is idempotent, so both firing costs one extra compare.
      // `unref()` so this timer can never be the reason the dev server refuses to exit.
      const timer = setInterval(() => {
        if (gitMoved()) recheck(true);
      }, GIT_POLL_MS);
      timer.unref?.();
      server.httpServer?.once('close', () => clearInterval(timer));
    },
  };
}

export default raBuildInfo;
