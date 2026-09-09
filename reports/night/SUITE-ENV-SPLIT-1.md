# SUITE-ENV-SPLIT-1 — the unit suite builds a browser it does not need

**Day chain 2026-09-08, piece 2 of 7** · branch `night/2026-09-07` · **unmerged.**

---

## RE-ESTABLISHED, from a run that happens anyway

`client/vitest.config.js` sets `environment: 'jsdom'` for everything and does not set `isolate`,
which defaults to **true** — so vitest builds **one jsdom per test file**. Taken off the ordinary
`npm test` output, no special run:

| | before |
|---|---|
| test files | **254** |
| **environment** | **503.7 s** |
| tests | 211.2 s |
| wall clock | 232.2 s |

**More than twice as long spent constructing browsers as running assertions.** The brief's shape is
confirmed; its file count is not — see below.

---

## MEMBERSHIP, ESTABLISHED PER FILE

Two passes, and a file had to survive **both**.

**1 — static, and TRANSITIVE.** A file is a candidate only if neither it nor **any module it imports
from `src/`** names a DOM object, a browser-only global, or a library that reaches for one. Markers:
`document`, `window`, `navigator`, `localStorage`, `sessionStorage`, `history`, `HTMLElement`,
`HTMLCanvasElement`, `SVGElement`, `Element`, `getComputedStyle`, `requestAnimationFrame`,
`matchMedia`, `IntersectionObserver`, `ResizeObserver`, `MutationObserver`, `getContext`,
`createElement(NS)`, `ImageData`, `OffscreenCanvas`, `FileReader`, `createObjectURL`, `Blob`,
`DOMParser`, `XMLHttpRequest`, `fetch`, `alert`, `confirm`, `prompt`, `CustomEvent`,
`addEventListener` — plus any import of `@testing-library`, `react-dom`, `react-router`, `jsdom` or
`happy-dom`, and any `.jsx` file. Comments and string literals are stripped first, so a marker
mentioned in prose does not condemn a file.

**2 — empirical.** Every candidate was then run in **both** environments and kept only if it produced
the **identical number of passing AND skipped tests**.

### ★ THE SECOND COUNT IS THE ONE THAT MATTERS, and the sabotage proves why

Forcing `storage.test.js` — which needs `localStorage` — into node did **not** produce a clean
failure. It produced **11 failed and 2 PASSED**, and one of the two survivors is called
*"HAPPY PATH: an ABSENT key is not a failure — fallback, and still silent"*. In node there is no
`localStorage`, so the key is absent, so the fallback fires, so the test is green — **for exactly the
wrong reason.**

A pass/fail check would have accepted that file at 2/13. The identical-count check rejects it,
because 13 ≠ 2. That is the difference between "it went green" and "it still proves what it proved".

### The result

| | files | why |
|---|---|---|
| **need a browser** | **184** | 62 are `.jsx` · 51 `localStorage` · 28 `document` · 20 `window` · 12 import jsdom · 3 `fetch` · 3 `OffscreenCanvas` · 2 `@testing-library` · 1 each `HTMLCanvasElement`, `ImageData`, `getContext` |
| **confirmed node-safe** | **69** | passed both gates: no marker anywhere in the transitive closure, and identical counts in both environments |
| rejected at gate 2 | **0** | every static candidate also survived the empirical run |

### ★ 69, NOT THE 137 THE BRIEF EXPECTED

The brief said 137 files need no browser. **This piece moved 69.** The difference is the transitive
rule: a test whose own text is clean but which *imports* a module naming `localStorage` stays where
it is. That is the brief's own instruction — *"if a file's membership is not clear, it stays"* —
applied strictly, and it is why gate 2 rejected nothing: gate 1 had already been conservative enough.

**A second, less conservative pass could reclaim more of the remaining 189 s**, and is left as a
named opportunity rather than taken on a guess.

---

## HOW IT IS EXPRESSED

`// @vitest-environment node` at the top of each of the 69 files, with a two-line note saying why.

**`jsdom` remains the default in `vitest.config.js` and that is deliberate.** A file gets a browser
unless it has opted out, so a *new* test file is safe by construction, and the only way to lose an
environment is to write the line on purpose. The alternative — a glob in the config — would have made
membership a matter of where a file sits, which is what the brief ruled out.

---

## THE MEASUREMENT

Same command both times (`npm test`), same machine, nothing else running.

| | before | after | delta |
|---|---|---|---|
| **wall clock** | **232.2 s** | **172.0 s** | **−60.2 s (−25.9%)** |
| environment | 503.7 s | **314.2 s** | −189.5 s (−37.6%) |
| tests | 211.2 s | 186.0 s | −25.2 s |
| import | 65.6 s | 54.4 s | −11.2 s |
| setup | 45.6 s | 43.6 s | −2.0 s |
| **test files** | 254 | **254** | — |
| **tests passed** | **4630** | **4630** | **—** |

**Every test still runs and still passes.** N: one `npm test` run each side; a second earlier
baseline on the same tree measured 254.5 s wall clock / 521.4 s environment, so the before figure is
the *faster* of the two available and the saving is not flattered.

**An independent third data point:** `client-suite` measured from inside `npm run verify` came in at
**161.9 s**, against **219.1 s** and **221.3 s** in the two most recent verify runs on this branch
before the split. That is the same saving seen by a different caller, and it was not arranged for.

`maxWorkers: 4` was not touched — it is measured and owner-agreed, and this piece has no business
with it.

---

## CHECKS

| | |
|---|---|
| client suite | **PASS** — 254 files, 4630 tests, 172.0 s |
| sabotage | **RED** — 11/13 failed, exit 1, and the 2 hollow passes are recorded above |
| `npm run verify` (plain) | **PASS 18 · FAIL 0 · SKIP 16**, 241.3 s |

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check client/vitest.config.js \
  client/src/modules/buildIdentityReason.test.js client/src/modules/buildIdentitySource.test.js \
  client/src/modules/buildIdentityWorktree.test.js

ENGINE REACH: none of 4 path(s) carry a change that can reach the race engine.
  4 outside the hull (cannot reach the engine at all): client/vitest.config.js,
  client/src/modules/buildIdentityReason.test.js, client/src/modules/buildIdentitySource.test.js,
  client/src/modules/buildIdentityWorktree.test.js
```

Sampled from the 69; all are test files or the suite's configuration, and no test file is in the
engine's import closure.

---

## SOURCE HYGIENE

| file | before | after | what changed |
|---|---|---|---|
| `client/vitest.config.js` | 81 | 104 | the note: what was measured, how membership was decided, why jsdom stays the default |
| 69 × `client/src/**/*.test.js` | +3 each | | the docblock and its two-line reason |

**Nothing was removed and nothing in the touched area was dead.** No test was edited, skipped,
deleted or reordered — the only change to a test file is three comment lines at the top.

**Reused, not rebuilt:** vitest's own per-file `@vitest-environment` mechanism, the existing
`npm test` script, and the suite's own JSON reporter for the per-file comparison.

**Noticed and left:** `src/test/setup.js` already guards its SVG mock with
`if (typeof document === 'undefined') return;`, so it was node-safe before this piece and needed no
change. The remaining 184 files are named above with their reason; 189 s of environment time still
sits in them.

**No scratch files entered the repository** — the classifier and the comparison ran from the session
scratchpad. `git stash` was not used.
