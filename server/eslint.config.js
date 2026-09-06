// ============================================================
// File:        server/eslint.config.js
// Path:        server/eslint.config.js
// Project:     RaceArena — SERVER-LINT-1
//
// THE SERVER WAS LINTED BY NOBODY. `server/package.json` declared `start`, `dev`, `restart` and
// `test` and nothing else; `ci.yml`'s server job runs neither a linter nor a format check; and
// `verify` gained both for the CLIENT only. This file is the server half.
//
// ── ★ IT REUSES THE CLIENT'S CONFIGURATION RATHER THAN DECLARING A SECOND ONE ───────────────────
//
// The rules, the plugins and the Prettier compatibility layer are imported from
// `client/eslint.config.js` — the array itself, not a copy of it. Two consequences, and both are the
// point: a rule added there applies here the next day without anyone remembering, and there is no
// second rule set to drift from the first.
//
// ── WHY IT RESOLVES WITH NO NEW DEPENDENCY ──────────────────────────────────────────────────────
//
// ESLint and Prettier are installed in `client/node_modules` and NOWHERE ELSE — not at the root, not
// under `server/`. That was the obstacle to linting the server at all. It is not one: a bare
// specifier is resolved relative to the file that IMPORTS it, so `client/eslint.config.js`'s own
// `import js from '@eslint/js'` resolves from `client/`, whatever imports it. The npm scripts run
// the client's binary by path for the same reason. Nothing is installed and no dependency moves.
//
// ── WHAT IS OVERRIDDEN, AND WHY ONLY THIS ───────────────────────────────────────────────────────
//
// THE ENVIRONMENT, and nothing else. The client is a browser bundle and its config says so; the
// server is Node. Inheriting `globals.browser` here would report `process` and `Buffer` as undefined
// while quietly allowing `window` — environment noise in both directions, which is worse than no
// linting because it buries anything real.
// ============================================================

// ★ BOTH IMPORTS ARE RELATIVE PATHS, and that is not a style choice. A BARE specifier here would
// resolve from `server/`, which has no `node_modules` at all — that is precisely the error this file
// hit first. A relative path resolves against this file, so it reaches the client's installation
// without anything being installed. (The client's config's OWN bare imports are fine: they resolve
// from `client/`, where the packages are.)
import globals from '../client/node_modules/globals/index.js';
import clientConfig from '../client/eslint.config.js';

export default [
  // The client's own ignores name `dist/` and `coverage/`; the server's runtime data directory is
  // its equivalent and is gitignored for the same reason.
  { ignores: ['node_modules/**', 'coverage/**', 'data/**'] },

  // Every rule the client enforces, in the client's own order — including Prettier last.
  ...clientConfig.filter((c) => !c.ignores),

  // ...then the environment correction, applied AFTER the imported array so it wins.
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: { ...globals.node },
    },
    // React has no meaning on the server. The plugins stay loaded (they are inherited) but their
    // rules cannot fire on code with no JSX, so nothing is disabled here that could hide a finding.
  },
];
