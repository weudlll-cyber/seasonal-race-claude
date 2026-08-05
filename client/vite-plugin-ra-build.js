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
//          INVALIDATED with a full page reload whenever the identity changes. Two watchers make that
//          complete: Vite's own file watcher catches every source edit (which is what makes the tree
//          dirty), and `.git/HEAD` + `.git/index` are added to it explicitly, because a commit or a
//          branch switch can change the identity without touching a single file Vite tracks.
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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VIRTUAL_ID = 'virtual:ra-build';
const RESOLVED_ID = '\0' + VIRTUAL_ID;

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '..');

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
      // Watching these two closes that hole: HEAD moves on checkout, index moves on commit/stage.
      server.watcher.add([join(REPO_ROOT, '.git', 'HEAD'), join(REPO_ROOT, '.git', 'index')]);

      // Seeded from the start-up read so a server that starts broken does not say so twice.
      let lastReason = atStartUp.reason;
      const recheck = () => {
        // Throttled: a branch switch fires hundreds of watcher events and each `git status` costs
        // real time on a synced disk. 400 ms is well under human reaction time.
        const now = Date.now();
        if (now - lastCheck < 400) return;
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
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        // A full reload, not HMR: the badge must be re-read from a re-loaded module, and the code it
        // names must be re-fetched in the same act. Anything finer could refresh one without the other.
        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.on('change', recheck);
      server.watcher.on('add', recheck);
      server.watcher.on('unlink', recheck);
    },
  };
}

export default raBuildInfo;
