# CLIENT-BUILD-VERIFIED-1 — nothing built the client

**Night chain 2026-09-07, piece 2 of 9** · branch `night/2026-09-07` · **unmerged.**

---

## RE-ESTABLISHED AT SOURCE, not carried from the brief

| claim | how it was checked | result |
|---|---|---|
| `npm run verify` never builds the client | searched `scripts/verify.mjs` for `vite build`, `npm run build`, `client.*build` | **0 matches — true** |
| `.github/workflows/ci.yml` never builds it | same search over the workflow | **0 matches — true** |
| lint cannot stand in | read `client/eslint.config.js` | **true — see below** |

`client/eslint.config.js` loads `@eslint/js`, `eslint-plugin-react`, `eslint-plugin-react-hooks`,
`eslint-plugin-react-refresh` and `eslint-config-prettier`. **There is no import plugin.** Nothing in
that configuration resolves a module specifier, so no rule it runs can notice that a name is not
exported by the file it is imported from. That was settled by reading the config — and then
*measured* by the sabotage below, where ESLint exits **0** on the exact fault the bundler rejects.

**The class is real, not theoretical:** a missing named export is `undefined` under the dev transform
and a hard failure in a bundle, so a tree can be green everywhere this project looks and still be a
broken package.

---

## WHAT WAS BUILT

**`scripts/check-client-build.mjs`** — builds the client with `npm run build` in `client/` (so this
file cannot disagree with anybody about what "the build" means), then runs the bundle-address audit
against what it just produced.

### The declaration is DERIVED, not a hand-written list

`dirs: ["client/"]`, `notDirs: ["client/e2e/"]`.

Derived from what the build actually reads: Vite's root **is** `client/` — it takes
`client/vite.config.js` and `client/package.json` for how to build, `client/index.html` for the
entry, walks the import graph from `src/main.jsx`, and copies `client/public/` verbatim. So the
declaration is the directory. It is `client/` and **not** `client/src/` for the reason `client-suite`
already records against itself: that guard's misses 1 and 2 were both naming the source subdirectory
and going blind to the configuration that decides how it runs. `client/e2e/` is excluded because
Playwright specs are never bundled.

**The consequence is the one asked for**, confirmed with `verify --dry`:

```
WILL RUN:
  check-client-build   4 changed (client/src/modules/raceParams.js, client/src/modules/rowLayout.test.js, …)
                       ·  dirs=client/ · except=client/e2e/
```

A change under `client/` selects it. A change to `docs/` or `reports/` does not — `client/` is the
only directory it declares.

### ★ `audit-bundle-address.mjs` is now wired — as a STEP, and the reason is a race

Its own header explains why it was named `audit-` rather than `check-`: it judges `client/dist`, an
artefact `verify` does not build, so routing it *"would redden `verify` on any tree without a fresh
client build"*. **That objection is gone** — the build now happens.

But a second objection is not, and it would have been easy to miss: **`verify` runs its guards
concurrently, up to 14 at once.** A separately-routed audit could read `client/dist` while this guard
is still writing it — failing for a reason that is not a defect, which is exactly what the `audit-`
naming was protecting against. So the audit is **step 2 of the guard that produces the artefact**,
which removes the race rather than relying on an ordering convention nothing enforces.

It is **spawned, not imported**: `audit-bundle-address.mjs` does its work at module top level and
exits 1 itself, so running it as a child reuses it exactly as CI or a person would — no refactor, and
no second copy of its allow-list.

**Not added to `.github/workflows/ci.yml`.** That file is untouched by this piece, as instructed.

---

## ★ THE SABOTAGES — twice, and the first one is the argument for the whole piece

### (a) A named export only the bundler can see

Added to `client/src/screens/RaceScreen/renderState.js`:
`import { thisExportDoesNotExist } from '../../modules/raceParams.js';` and a use of it.

```
### eslint
  19:1  warning  Unexpected console statement …  no-console
  ✖ 1 problem (0 errors, 1 warning)
  ESLINT EXIT=0            ← lint is BLIND to it

### check-client-build
  FAIL: check-client-build — THE CLIENT DOES NOT BUILD (exit 1).
  [MISSING_EXPORT] "thisExportDoesNotExist" is not exported by "src/modules/raceParams.js".
   2 │ import { thisExportDoesNotExist } from "../../modules/raceParams.js";
     │                     ╰──────────── Missing export
  GUARD EXIT=1
```

**ESLint exits 0 on the fault; the build exits 1.** The only thing lint had to say was an unrelated
`no-console` warning. That is the claim of this piece, measured rather than argued.

### (b) A baked deployment address

**The first attempt did not go red, and that is worth recording.** Adding
`export const SABOTAGE_BAKED = 'https://races.acme-deployment.example.net';` to
`client/src/services/api.js` left the audit green — the constant is **unused**, so the bundler
tree-shakes it out and it never reaches the package. The audit judges the *bundle*, not the source,
which is the correct thing for it to judge: an address that cannot reach the artefact cannot tie the
artefact to a host.

A faithful sabotage has to bake the address where the code actually uses it, as the original defect
did — the live fallback:

```
- export const DEFAULT_API_BASE_URL = 'http://localhost:4000';
+ export const DEFAULT_API_BASE_URL = 'https://races.acme-deployment.example.net';

FAIL: check-client-build — the package names a deployment address.
audit-bundle-address: FAIL — the package names 1 host(s) it must not:
  races.acme-deployment.example.net  —  assets\index-BsDfzYlQ.js x1
GUARD EXIT=1
```

Both sabotages were reverted; `git diff` over the two files is empty and the guard is green again.

---

## THE COST, measured

| | |
|---|---|
| the guard alone, both steps | **1.9 – 2.1 s** (build ~1.7 s, audit ~0.26 s), over five runs |
| **the guard INSIDE `verify`** | **20.2 s** |
| `verify` wall clock, without it (piece 1) | 357 s |
| `verify` wall clock, with it (this piece) | **357 s** |
| **cost to the run** | **~0 s** |

★ **The two guard timings differ by ten times, and reporting only the first would have been
misleading.** Alone the build takes 2 s; inside `verify` it takes 20.2 s, because `verify` runs up to
14 guards at once and a bundler is CPU-hungry under that contention. The brief's estimate of ~2.3 s is
right for the isolated case and wrong for the one that matters.

**What matters is the wall clock, and that did not move**: 357.1 s with the guard against 357.1 s in
the previous run without it. The guard declares `exclusive: false` and finishes far inside the
critical path, which `client-suite` (219 s, runs alone) and `check-runin-frame` (137.8 s) own. So the
honest statement is not "it costs 0.55% of a run" — it is **"it costs 20 s of machine time and 0 s of
waiting"**.

**One consequence worth naming:** the guard writes `client/dist`, which is gitignored, so `verify`
still writes no tracked file. It is also the directory the owner's preview on 4173 serves; the
content is identical to what any build of this tree produces, only the build-identity stamp differs.

---

## CHECKS

| | |
|---|---|
| the guard itself | **PASS** — 4 assets, 948.6 kB |
| golden races | **PASS** — 2 races, every position and time as recorded |
| `npm run verify` (plain) | **PASS 23 · FAIL 0 · SKIP 11**, 357.1 s — `check-client-build` among the passes |
| routing | selected by a `client/` change; not by a `docs/` change |

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check scripts/check-client-build.mjs

ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): scripts/check-client-build.mjs
```

---

## SOURCE HYGIENE

| file | before | after | what changed |
|---|---|---|---|
| `scripts/check-client-build.mjs` | — | 161 | **new** — the build guard and the audit's wiring |
| `docs/SHIP-CEREMONY.md` | 509 | 509 | the GENERATED engine-reach count block, regenerated |

★ **`docs/SHIP-CEREMONY.md` had to be regenerated, and the reason is piece 1 arriving late.** Its
generated block counts *"tracked non-test files under `client/src/modules/` outside `camera/`"*.
When piece 1's `verify` ran, `raceParams.js` was still **untracked**, so the count was correct at
116/57 and `ceremony-counts` passed. Committing piece 1 made the file tracked, and this piece's first
`verify` went red on it — 116 → **117**, 57 → **58**. Regenerated with
`node scripts/gen-ceremony-costs.mjs --counts`; the count is arithmetic and no prose changed.

**This is worth keeping as a lesson about the guard, not about the file:** a generated count over
*tracked* files cannot see a new file until it is committed, so the run that adds it is always green
and the next run is always red. Nothing is wrong with either.

Nothing else was touched. **Nothing was dead in the touched area**, and nothing was removed:
`audit-bundle-address.mjs` is unchanged and still runs standalone exactly as before.

**Reused, not rebuilt:** `audit-bundle-address.mjs` in full (spawned, not reimplemented);
`client/package.json`'s own `build` script; `routing.mjs`'s existing declaration mechanism.

**Noticed and left:** `.github/workflows/ci.yml` still does not build the client — deliberately out
of scope for this piece and named as its own order.
