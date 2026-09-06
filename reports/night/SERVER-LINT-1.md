# SERVER-LINT-1 — the server was linted by nobody, and now it is red

**2026-09-06.** Branch `night/2026-09-05`, piece 4 of NIGHT-2026-09-05. **`ci.yml` was not touched.**
Nothing minted. **★ `npm run verify` is now RED on this branch, for a pre-existing reason, and that
is the intended outcome of this piece — see THE FORK below.**

---

## WHAT WAS TRUE, AT SOURCE

`server/package.json` declared exactly four scripts — `start`, `dev`, `restart`, `test` — and no
`lint` or `format:check` of any kind. `ci.yml`'s Server job runs neither. `verify` gained both on
2026-09-05 **for the client only**, and `scripts/lib/routing.mjs` said so in its own words:
*"`server/package.json` declares NO `lint` and NO `format` script of any kind."*

**So server code was linted by nobody, and had never been.**

## THE OBSTACLE, WHICH IS WHY THIS HAD NOT BEEN DONE

**ESLint and Prettier are installed in `client/node_modules` and nowhere else** — not at the
repository root (whose devDependencies are `acorn`, `pngjs`, `sharp`) and not under `server/`, which
has no `node_modules` at all. A server config that wrote `import globals from 'globals'` fails
outright; that was this piece's first error, kept here because it is the whole difficulty:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'globals' imported from …\server\eslint.config.js
```

**★ It is not an obstacle, and nothing was installed.** A bare specifier resolves relative to the
file that IMPORTS it, so `client/eslint.config.js`'s own `import js from '@eslint/js'` resolves from
`client/` no matter who imports that config. `server/eslint.config.js` therefore imports the client's
config **array** by relative path, and reaches `globals` by relative path too. The npm scripts invoke
the client's binaries the same way. **No package was added, no dependency moved.**

## WHAT WAS BUILT

| | |
| --- | --- |
| `server/eslint.config.js` (new, 54 lines) | imports the client's config array — not a copy of it — and overrides **only the environment**, Node globals instead of browser. A rule added on the client side applies here the next day without anyone remembering, and there is no second rule set to drift from the first. |
| `server/package.json` | `lint`, `lint:fix`, `format`, `format:check` — the same four names the client uses, running the client's binaries by path, with `--config ../client/.prettierrc` so there is **one style for the repository rather than two**. |
| `scripts/lib/routing.mjs` | `server-lint` and `server-format-check`, declared in the same shape as `client-lint` / `client-format-check`, scoped `dirs: ["server/"]`. The stale note that the server "declares no lint script at all" is corrected in place with the reason. |
| `scripts/verify.mjs` | two `commandFor` cases — same npm script names, different `cwd`, which is the whole difference and is why they cannot disagree about scope with the client pair. |

**Why the environment is the only override.** Inheriting `globals.browser` would report `process` and
`Buffer` as undefined while quietly allowing `window` — noise in both directions, which is worse than
no linting because it buries anything real.

## ★ THE FORK: THE SERVER DOES NOT PASS, AND THE FINDINGS ARE NOT FIXED

The order was explicit — if the server tree does not pass, do not fix the findings; report the count
and the files, leave the steps in place, and say plainly that `verify` is now red for a pre-existing
reason. It does not pass:

| check | result |
| --- | --- |
| `npm run lint` | **36 problems — 9 errors, 27 warnings** |
| `npm run format:check` | **35 files** with style issues |

**The seven files carrying the 9 errors:**

`src/auth/authRouter.js` · `src/auth/authRouter.test.js` · `src/auth/recoverAdmin.test.js` ·
`src/auth/session.test.js` · `src/index.js` · `src/seedRuntime.test.js` · `src/staticClient.js`

**Not one line of server source was changed.** These faults pre-date the guard that found them by
years — they are what "linted by nobody" looks like. **A server-wide cleanup is its own order and was
not taken tonight.**

**So `npm run verify` is RED on this branch whenever a `server/` path is in the diff**, and it is red
for that reason and no other. The guards are wired anyway, because a check that is not wired is a
check nobody runs.

## SABOTAGE

The tree is already red, so a sabotage had to prove the guards catch a *new, specific* fault rather
than merely staying red. One file was added with both kinds at once and both guards named it:

```
src/__sabotage.js
  3:7   error  Unexpected constant condition   no-constant-condition
  3:13  error  Empty block statement           no-empty
  4:15  error  'undefinedGlobalXyz' is not defined   no-undef
[warn] src/__sabotage.js          ← prettier --check
```

★ **`no-undef` firing is the extra proof that matters:** it shows the Node environment override is
live, because an undefined global is reported while ESM `export` syntax is not. The file was deleted.

## CHECKS

`node scripts/engine-reach.mjs --check` on this piece's paths, verbatim, is in the commit. **CI is
untouched and still runs neither for the server** — that was the instruction, and it means CI stays
green on master while `verify` is red here.
