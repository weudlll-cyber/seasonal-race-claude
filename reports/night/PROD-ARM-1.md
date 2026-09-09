# PROD-ARM-1 — the harness can drive the production build now

**Day chain 2026-09-08, piece 4 of 7** · branch `night/2026-09-07` · **unmerged.**

---

## RE-ESTABLISHED AT SOURCE

| claim | checked | result |
|---|---|---|
| `baseURL` is the dev server | `playwright.config.js` `use:` | **true** — `baseURL: E2E.appUrl`, port 5399 |
| its `webServer` runs `npm run dev` | same file, `webServer[1]` | **true** — `command: 'npm run dev -- --port … --strictPort'` |
| **what blocked a production arm** | same block, `env:` | **`VITE_API_URL: E2E.apiUrl`** |

**That last line is the whole thing.** The dev arm hands the client its API address as a **build-time**
variable. Before RUNTIME-API-URL-1 that was the only way a client could learn its address, so a
production arm would have had to bake one into the bundle — the exact thing that piece removed.

### ★ IT NO LONGER BLOCKS, AND THE PICTURE IS BETTER THAN "UNBLOCKED"

`server/src/runtimeConfig.js:149` renders `window.__RA_RUNTIME_CONFIG__` from `RA_PUBLIC_ORIGIN` into
the one `index.html` the server serves; `services/api.js` reads it at runtime. So the production arm
needs **no build-time variable at all** — and because the same Node server serves the API *and* the
built client, it needs **one process instead of two**, and no `RA_CLIENT_ORIGIN` because there is no
cross-origin request to allow.

**The production arm is simpler than the dev arm, not harder.** Nothing else blocked it.

---

## WHAT WAS BUILT

**`client/playwright.prod.config.js`** — the same `testDir`, the same specs, `baseURL` pointed at the
Node server, one `webServer` entry with `RA_CLIENT_DIST` and `RA_PUBLIC_ORIGIN`.

**`client/e2e/prod-ports.js`** — points the shared e2e environment at this arm's single origin.

### Why that second file exists, rather than an assignment

`e2e-env.js` **already** reads `RA_E2E_API_PORT` and `RA_E2E_APP_PORT` from the environment and falls
back to 4399/5399 — the override mechanism existed and is **reused, not rebuilt**. But ESM import
declarations hoist above ordinary statements, so `process.env.X = …` written inside the config would
run *after* `e2e-env.js` had frozen its values. Importing a module first is what makes it land in
time.

**Both ports are the same number, and that is the production shape rather than a trick:** one server
serves API and client together, so they share an origin. `auth.setup.js` then reaches the API at that
origin **with no change to it whatsoever** — the arm required no edit to any existing spec or helper.

### It is an ARM

`playwright.config.js` is **untouched**. The dev arm is still the default and nothing that exists
changes meaning. This one is run deliberately:

```
npx playwright test --config=playwright.prod.config.js
```

It **refuses loudly** if `client/dist` is absent rather than falling back to dev, because a
production arm with no production build is a harness measuring nothing.

---

## ★ THE PROOF — the arm really serves the built bundle

Not an assertion. The server was started with the arm's own environment and asked:

```
SERVED BUNDLE      : assets/index-Dx9rj88y.js
DEV ENTRY PRESENT? : false            ← no /src/main.jsx: this is the BUILT package
INJECTED CONFIG    : <script>window.__RA_RUNTIME_CONFIG__={"apiBaseUrl":"http://localhost:4599"};</script>
BUILD IDENTITY IN THE SERVED BUNDLE: {commit:`19066888`, branch:`night/2026-09-07`, dirty:!0}
bundle bytes served: 911,073
```

Four independent things, each of which the dev arm could not produce: a **hashed** asset filename,
the **absence** of the dev entry point, an address the **server injected** rather than a bundle
baked, and a **build identity** naming the commit under test.

*(`dirty:!0` is the git-dirty flag, true because this piece's own files were uncommitted at build
time. Expected, and it is the stamp doing its job.)*

### And the specs pass on it

```
npx playwright test --config=playwright.prod.config.js e2e/d355-smoke.spec.js
  15 passed (25.0s)
```

Fifteen tests, including the `localStorage` override lifecycle, against the built package.

---

## WHAT RUNNING IT WOULD COST, AND WHERE IT WOULD BELONG

| | |
|---|---|
| `d355-smoke` on the production arm | **25.0 s** (15 tests) |
| the client build it needs | **0.7 s** |
| processes started | **1** (dev arm: 2) |

The arm has **no Vite** to start, so its per-spec cost is at worst the dev arm's and its startup is
cheaper. The full suite would be dominated by the same race-waiting specs as the dev arm — about
**33.6 min** at one worker, on the measurement in [E2E-ONE-WORKER-1](E2E-ONE-WORKER-1.md).

**Where it would belong, stated rather than decided:**

- **Not `verify`.** It needs a Chromium; CI installs none, and `verify` already refuses browser work
  for that reason (`audit-offline-render.mjs` carries the same note).
- **Not CI**, for the same reason, and `ci.yml` is untouched here.
- **Night work, beside the dev arm** is the honest home — the e2e suite is already night work by the
  owner's decision of 2026-08-16, and this arm costs about what that one costs.
- **A cheaper option worth naming:** the production arm on a *subset* — the specs that never wait for
  a race — would cost well under a minute and would catch the bundle-only failure class the dev
  transform hides. That is a decision, not a default, so it is named and not taken.

**They must not run at the same time:** both arms write `e2e/.auth/state.json`. Separate commands;
stated, not guarded.

---

## CHECKS

| | |
|---|---|
| production arm, `d355-smoke` | **15 passed, 25.0 s** |
| served bundle | hashed build, no dev entry, injected address, identity shown above |
| refusal with no build | throws before Playwright starts anything |
| dev arm | **untouched** — `playwright.config.js` unchanged by this piece |

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check client/playwright.prod.config.js client/e2e/prod-ports.js

ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): client/playwright.prod.config.js,
  client/e2e/prod-ports.js
```

---

## SOURCE HYGIENE

| file | before | after | what changed |
|---|---|---|---|
| `client/playwright.prod.config.js` | — | 118 | **new** — the arm |
| `client/e2e/prod-ports.js` | — | 31 | **new** — its origin, set before `e2e-env.js` resolves |

**Nothing was removed and nothing in the touched area was dead.** No existing spec, helper or config
was edited — `playwright.config.js`, `e2e-env.js` and `auth.setup.js` are all unchanged.

**Reused, not rebuilt:** `e2e-env.js`'s existing `RA_E2E_*_PORT` override mechanism; `auth.setup.js`
unmodified; the server's own `RA_CLIENT_DIST` / `RA_PUBLIC_ORIGIN` handling; the same `testDir` and
the same specs.

**Noticed and left:** the dev arm still passes `VITE_API_URL` into its build. It is not wrong there —
the dev server has no server-side HTML step to inject through — but it is now the only place in the
repository where a build-time address survives, and it is named here rather than changed.

**No scratch files entered the repository.** The proof server's data directory was created under the
session scratchpad and deleted. `git stash` was not used.
