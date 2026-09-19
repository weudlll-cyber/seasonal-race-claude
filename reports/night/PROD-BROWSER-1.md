# PROD-BROWSER-1 — the production arm already existed; running it whole for the first time found no bundle defect and one fragility

Branch `night/2026-09-19`, piece 4. Date: 2026-09-19.
**Nothing was wired. No source changed, nothing minted, no shipped default touched.** This piece is a
measurement and a refusal, and the refusal is argued rather than asserted.

---

## ★★★ THE ONE LINE

> **`scripts/serve-production.mjs` is the wrong thing to wire into the browser checks, and the right
> thing already exists** — `client/playwright.prod.config.js` (PROD-ARM-1), which serves the built
> bundle from the Node server, the way the package actually ships.
>
> ★★ **Nobody had ever run it whole. It was run tonight: 115 passed, 10 failed, 35.0 min — and NOT
> ONE of the ten is a production-only failure.**

---

## 1 · ★★ THE PREMISE, CORRECTED — WITH ADDRESSES

The brief says `scripts/serve-production.mjs` *"is referenced nowhere outside itself"*, which is
**true**, and asks for it to be wired into `client/playwright.config.js:110`, which boots the dev
server. ★ **The conclusion does not follow, and here is why, measured at source rather than argued
from taste.**

### 1.1 A production arm exists, in the shape the package ships in

`client/playwright.prod.config.js` — PROD-ARM-1 — runs the **same specs** against **one Node server
serving the API and `client/dist` on one origin**, which is exactly what `docker compose up -d`
produces. It is not wired into `verify` or CI, deliberately, and its own report says so.

### 1.2 Wiring the static server would point the browser checks at the owner's API

`scripts/serve-production.mjs` is a **static file server**. It injects nothing.
`client/src/services/api.js:86` resolves the API address as
`runtimeApiBaseUrl() ?? buildTimeApiBaseUrl() ?? DEFAULT_API_BASE_URL`, and
`:84` sets that default to **`http://localhost:4000`** — the owner's API, his data, his login.

★★ **That is precisely the failure `client/e2e/e2e-env.js:19-21` names**, from the configuration this
project already retired: *"PORTS ARE DELIBERATELY NOT 4000/5173/4173. Those belong to the owner's dev
server, his API and the production build he judges on. The old config used 5173 with
`reuseExistingServer: true`, so a run on this machine silently tested whatever was already up — with
his data and his login."* The production arm avoids it by
having the SERVER hand the page its address (`server/src/runtimeConfig.js:164`, `injectRuntimeConfig`)
— which a static file server cannot do.

### 1.3 And it would delete the build he is judging

`scripts/serve-production.mjs:61` — `await rm(TARGET, {recursive: true, force: true})` — **replaces
its target directory on every run**, and the default target is `%LOCALAPPDATA%\racearena-preview`,
the directory serving port **4173**. An e2e run would wipe the production build the owner has open
for an eye test, mid-judgement.

★ **The `--dir=` flag makes that avoidable and not the point**: a second production arm, in a
different shape, whose default is destructive, standing beside one that already works.

**→ Not wired. The arm that exists was run instead.**

---

## 2 · WHAT THE BROWSER CHECKS RUN AGAINST

| | dev arm (`playwright.config.js`) | ★ production arm (`playwright.prod.config.js`) |
|---|---|---|
| the page | Vite dev server, unminified modules, one file at a time | ★ **the built bundle, one tree-shaken chunk** |
| who serves it | Vite, on its own port | ★ **the Node server, same origin as the API** |
| the API address | `VITE_API_URL`, **baked into the build** | ★ **injected at runtime**, `RA_PUBLIC_ORIGIN` → `window.__RA_RUNTIME_CONFIG__` |
| processes | **2** | **1** |
| ports | 4399 API + 5399 app | **4599, both** |
| data | its own directory, per run | its own directory, per run, `-prod` suffixed |

---

## 3 · ★★ THE PRODUCTION SUITE, RUN WHOLE FOR THE FIRST TIME

```
Running 125 tests using 1 worker
  10 failed
  115 passed (35.0m)
```

★ **PROD-ARM-1 estimated "about 33.6 min at one worker" from the dev arm's per-spec costs. It came
out at 35.0 min.** The estimate stands.

★ **`docs/NIGHT-RUN.md` still says "the suite is 105 tests".** It is **125**. Reported, not edited —
that document is the one home for that figure and moving it is its owner's call.

---

## 4 · ★★★ EVERY FAILURE CLASSIFIED, WITH AN ADDRESS

**The classification was not read off the production run.** Each failing spec was re-run on the
**production arm** and on the **dev arm**, so "production-only" is a comparison rather than an
inference.

| # | spec | production, full run | ★ production, re-run | ★ dev arm | verdict |
|---|---|---|---|---|---|
| 1 | `arrival-shape.spec.js:40` | FAIL — *"he must be left alone inside his block"* | ★ **FAIL** | ★ **FAIL** | ★★ **PRE-EXISTING** — fails identically on both arms |
| 2 | `comeback-precedence.spec.js:41` | FAIL — *"no comeback cut happened inside the 7500 ms hold"* | ★ **pass** | ★ **FAIL** | ★ **FLAKY, both arms** |
| 3 | `garden-path-finishes.spec.js:28` | FAIL — *"a crossing must put a finish time on the board"* | ★ **pass** | ★ **pass** | ★ **FLAKE** |
| 4 | `race-identifier.spec.js:208` | FAIL — `ERR_CONNECTION_REFUSED at .../dev` | — | ★ **pass** | ★★ **CASCADE** |
| 5 | `race-identifier.spec.js:248` | FAIL — `ERR_CONNECTION_REFUSED` | — | ★ **pass** | ★★ **CASCADE** |
| 6 | `race-save.spec.js:39` | FAIL — `ERR_CONNECTION_REFUSED at .../setup` | — | ★ **pass** | ★★ **CASCADE** |
| 7 | `seed-field-typing.spec.js:80` | FAIL — `GET /api/tracks → 401` | — | ★ **pass** | ★★ **CASCADE** |
| 8 | `seed-field-typing.spec.js:104` | FAIL — `GET /api/tracks → 401` | — | ★ **pass** | ★★ **CASCADE** |
| 9 | `teams-session.spec.js:85` | FAIL — *"sign-in did not leave /login"* | — | ★ **pass (6.2 s)** | ★★ **CASCADE** |
| 10 | `teams-session.spec.js:137` | FAIL — *"sign-in did not leave /login"* | — | ★ **pass (3.4 s)** | ★★ **CASCADE** |

★★★ **Not one failure is a bundle difference.** The class PROD-ARM-1 was built to catch — *"the dev
transform resolves a missing named export to `undefined` where a bundle refuses outright"* — **did not
appear once in 125 tests.**

### 4.1 ★★ The cascade, and what it really says

Failures 4–10 are **one event, not seven findings**. The signature is unmistakable in the timings:

| test | production | ★ dev |
|---|---|---|
| `race-identifier:208` | **7.2 s — failed** | **11.0 s — passed** |
| `race-identifier:248` | **2.9 s — failed** | **6.7 s — passed** |
| `race-save:39` | **2.9 s — failed** | ★ **2.0 m — passed** |
| `seed-field-typing:80` | **2.4 s — failed** | ★ **3.8 m — passed** |
| `seed-field-typing:104` | **1.7 s — failed** | ★ **1.9 m — passed** |

★ **A test that fails in two seconds where it normally takes two to four minutes did not run and fail
— it never started.** The first three say why in so many words: `net::ERR_CONNECTION_REFUSED` on
`http://localhost:4599`. **The production arm's server went away mid-run**, and when it returned the
session had not survived it: `GET /api/tracks → 401`, then *"sign-in did not leave /login"*.

★★★ **AND THAT IS THE ONE REAL DIFFERENCE BETWEEN THE ARMS, which is about their SHAPE and not about
the bundle.** On the production arm **one process serves the API and the page**, so when it goes,
*the page goes with it* and every later spec fails at `page.goto`. On the dev arm Vite keeps serving
the page whatever the API does, so the same event would cost only the assertions that need the API.

★ **The honest limit of this finding:** *why* the server went away is **not established here**. The
run's log carries no crash, no `EADDRINUSE`, no heap message. What is established is the shape of the
consequence, and that the failures it produced are not the bundle's.

### 4.2 ★ The one that is genuinely broken, on both arms

`arrival-shape.spec.js:40` — *"he must be left alone inside his block"* — **fails on the production
arm twice and on the dev arm once, with the same assertion**. It is **not** production-only, it is
**not** flake, and it is **not new tonight**: this piece did not change a line of product code before
running it. ★ **It is a standing red in the browser suite that nobody has been looking at, because
the browser suite is night work and the night rarely gets to it.**

### 4.3 ★ The dev-arm control, in one line

**Four spec files — `race-identifier`, `race-save`, `seed-field-typing`, `teams-session` — re-run
whole on the dev arm: `12 passed (13.4m)`, nothing failed.** Every test the production arm reported as
one of those seven failures passes on the dev arm, in the same tree, minutes later.

★ **That is what makes "cascade" a measurement rather than a reading of error text.** I had expected
to have to caveat `teams-session` — this project's record has TEAMS-1 living on a branch — and the
control removes the need: both its tests pass on master today.

---

## 5 · WHAT IT COSTS, AND WHERE IT BELONGS

| | |
|---|---|
| the production suite, whole, one worker | ★ **35.0 min — measured tonight** |
| PROD-ARM-1's prediction for it, from the dev arm's per-spec costs | **~33.6 min** |
| the client build it needs first | **~1.1 s** |
| processes it starts | **1**, against the dev arm's 2 |
| ★ the DEV suite, whole | ★ **NOT MEASURED TONIGHT** — only four spec files were re-run on it, for the comparison in §4 |

★ **The arm came in within 5% of the prediction, and the prediction was built from the dev arm's own
per-spec costs — so on that evidence the two cost about the same.** That is an inference from a
measured production run and a predicted dev one, and it is labelled as such rather than presented as
two measurements.

**Where it belongs, and this is a recommendation rather than a change:**

- **Not `verify`, not CI.** It needs a Chromium; CI installs none. Unchanged from PROD-ARM-1.
- ★ **Night work, beside the dev arm** — but **not instead of it**. §4.1 is the argument: the two arms
  fail differently, and the production arm's single origin makes one environment event look like
  seven defects. An arm that turns one hiccup into a seven-line failure list is one you must read
  carefully, which is a reason to run it deliberately rather than by default.
- ★ **The cheapest useful form, if only one thing is taken from this report:** the production arm on
  the specs that never wait for a race. It is under a minute, and it is where the bundle-only class
  would appear if it ever did.

---

## 6 · A SIDE FINDING, SMALL AND REAL

★ **The e2e harness never removes its data directories.** `client/e2e/e2e-env.js:54` gives every run a
fresh `${tmpdir}/racearena-e2e-<uuid>` and nothing ever deletes it. Counted tonight:

| | |
|---|---|
| leftover `racearena-e2e-*` directories | ★ **103** |
| total size | ★ **262 MB** |
| created by tonight's runs | **4** (removed in the sweep) |

Not documented anywhere — searched `docs/` and `reports/night/`. **Cosmetic, and it grows by one
directory per run for ever.**

---

## WHAT THIS DOES NOT SETTLE

- ★ **Why the production arm's server became unreachable.** The consequence is measured; the cause is
  not. A second whole run would say whether it repeats — **it was not run, and this report does not
  claim it would not repeat.**
- **`arrival-shape` is red on both arms and is not diagnosed here.** It is a standing failure this
  piece found, not one it caused, and not one it fixed.
- **Nothing was wired.** `playwright.config.js` is untouched, `serve-production.mjs` is untouched, and
  `playwright.prod.config.js` is untouched. The decision in §5 is the owner's.

---

## THE RUNS, COMMITTED

All four are in `prod-browser-data/`, ANSI stripped, exactly as the reporter wrote them:

| file | what it is |
|---|---|
| `prod-arm.txt` | the production suite, whole — **125 tests, 115 passed, 10 failed, 35.0 min** |
| `prod-three.txt` | the three race-behaviour failures, re-run on the production arm — **1 failed, 3 passed (6.2m)** |
| `dev-three.txt` | the same three on the dev arm — **2 failed, 2 passed (6.1m)** |
| `dev-four.txt` | the four cascade-window spec files on the dev arm — ★ **12 passed (13.4m), nothing failed** |
