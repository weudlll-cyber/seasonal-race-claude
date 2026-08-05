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

/** One short git read. Never throws — a missing git is reported, not crashed on. */
function git(args) {
  try {
    return execSync(`git ${args}`, {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return '';
  }
}

/**
 * The build identity, read fresh from the repository.
 *
 * `dirty` is the honest half: a dirty tree means the screen shows something NO COMMIT DESCRIBES, so
 * the short sha alone would be a lie of omission.
 */
export function readBuildInfo() {
  const commit = git('rev-parse --short HEAD');
  if (!commit) return { commit: 'unknown', branch: 'unknown', dirty: false };
  const branch = git('rev-parse --abbrev-ref HEAD') || 'detached';
  const dirty = git('status --porcelain') !== '';
  return { commit, branch, dirty };
}

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
      // A commit or a branch switch can change the identity without touching a file Vite watches.
      // Watching these two closes that hole: HEAD moves on checkout, index moves on commit/stage.
      server.watcher.add([join(REPO_ROOT, '.git', 'HEAD'), join(REPO_ROOT, '.git', 'index')]);

      const recheck = () => {
        // Throttled: a branch switch fires hundreds of watcher events and each `git status` costs
        // real time on a synced disk. 400 ms is well under human reaction time.
        const now = Date.now();
        if (now - lastCheck < 400) return;
        lastCheck = now;

        const identity = identityOf(readBuildInfo());
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
