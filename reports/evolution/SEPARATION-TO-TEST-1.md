# SEPARATION-TO-TEST-1 — the criterion moves to where it is actually used

**Branch:** `fix/separation-to-test-1`, off master `068ec9b6`. **No behaviour changed. No tolerance,
no window, no re-blessed assertion.** All four instruments measured and byte-identical.

---

## THE COUNT THAT ESTABLISHED IT IS TEST-ONLY

Re-counted on this tree rather than taken from the brief — `grep -rn checkSeparation` over the whole
repository, excluding `node_modules` and the lab journal:

| where | lines |
| --- | --- |
| `client/src/modules/heroCurveGenerator.js` | **1** — the definition |
| `client/src/modules/heroCurveGenerator.test.js` | **7** — 1 import, 5 call sites, 1 comment |
| anywhere else | **0** |

`racePlanner.js` imports `generateHeroCurves` and `GENERATOR_CONFIG` from that module and nothing
else. Nothing was rejected, retried or replaced when it returned `false`. **Two specs in a row were
written on the assumption that it gated something.**

---

## WHAT MOVED

`checkSeparation` is now a plain function inside `heroCurveGenerator.test.js`, and the `export` is
gone from the production module. **Not deprecated, not left behind a comment: moved.** Its body is
byte-for-byte what it was — same 0.2 tolerance, same anchor-to-finish window, same 0.5-rank nearness.

**The reason travelled with it**, in the test's own words, so the next reader finds it where the
check now lives: why it is kept (nothing else would notice two heroes running the same script — two
racers in lockstep, which the owner would see immediately), and why it covers the **standard cast**
(the three B2 attackers share one `b2AttackFinalRank` and reach it well before their band's release,
so they are one act by design; SEPARATION-WINDOW-1 built the narrowing this seems to invite, measured
it at 98 % → 95 % across 120 plans, and reverted it).

**What is now unguarded in production, in one line:** *nothing checks, at run time, that two heroes
are on different scripts* — which is exactly what was true before the move, now said out loud in the
place the function used to sit.

---

## FINGERPRINTS

`heroCurveGenerator.js` is inside **all three** instruments' closures, walked rather than assumed:

```
fingerprint-default.mjs  closure 36 | contains heroCurveGenerator.js
camera-fingerprint.mjs   closure 36 | contains heroCurveGenerator.js
render-fingerprint.mjs   closure 55 | contains heroCurveGenerator.js
```

So all four were owed and all four were run:

| instrument | before | after |
| --- | --- | --- |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` |
| CAMERA | `d9f45a4aea0e5778` | `d9f45a4aea0e5778` |
| RENDER | `1274c7e8444238e3` | `1274c7e8444238e3` |

**Unmoved — the proof that nothing was reading it after all.**

---

## THE SAME SHAPE ELSEWHERE — 19, AND NONE WAS MOVED

The shape is precise, and the first scan got it wrong in a way worth recording: excluding only the
defining file reported **153** hits, because a helper that a module uses internally *and* exports for
a unit test looks identical from outside. That is a different and legitimate thing.

**The real shape is an export used by nothing — including its own module — and referenced only by
that module's own test.** With the in-module check added, **19**:

| file | export |
| --- | --- |
| `modules/exportRaceConfig.js` | `worldHashShort` |
| `modules/heroCurveGenerator.js` | `bandMultiset`, `relationalWaypoints` |
| `modules/parity/configFingerprint.js` | `configFingerprintSummary` |
| `modules/racer-types/spriteTinter.js` | `_clearPatternedVariantCache`, `_patternedVariantCacheSize` |
| `modules/track-editor/trackStorage.js` | `saveTrack` |
| `modules/track-effects/bgImageCache.js` | `_clearBackgroundImageCache` |
| `modules/utils/RandomHelper.js` | `randomInt` |
| `screens/RaceScreen/drawing/startBoardRendering.js` | `startBoardBackdrop` |
| `screens/RaceScreen/hudLayout.js` | `rowsOverlap` |
| `screens/RaceScreen/overlayGeometry.js` | `overlayRectCssPx`, `overlayRectCssPxShipped`, `rectsOverlap` |
| `services/racerApi.js` | `deleteRacerSprite` |
| `scripts/lib/ceremonySamples.mjs` | `CEREMONY_SAMPLE_BEATS` |
| `scripts/sim/observers/cohesion.mjs` | `makeCohesionObserver` |
| `scripts/sim/observers/pulk-contest.mjs` | `RUNAWAY_LEAD_THRESHOLDS_LEN` — **referenced nowhere at all** |
| `server/src/auth/guards.js` | `isPublicPath` |

**Nothing else was moved, per the brief**, and the list should not be read as a to-do: the two
`_`-prefixed cache helpers are deliberate test hooks by naming convention, and several others are
plausibly public API that simply has no second caller yet. **`deleteRacerSprite` and
`RUNAWAY_LEAD_THRESHOLDS_LEN` are the two that look like genuinely unused product code**, and neither
was touched.

---

## DOCUMENTS

**No living document names this criterion.** `docs/FAIRNESS.md` and every other document in `docs/`
were searched: the only "separation" text is `hardSeparation*` in `ARCHITECTURE.md`, which is the
unrelated physical non-penetration mechanism between racer bodies during a race.

**So nothing was corrected and nothing was added.** An unenforced rule does not get a home in the
documents it never had — the reason now lives in the test, which is its one home.

---

## THE OPEN PRODUCT QUESTION, LEFT FOR THE OWNER

**Should the three B2 attackers fall back to different ranks rather than all to rank 7?**

`b2AttackFinalRank` is one number shared by all three. Measured on seed 8: all three curves end at
exactly `7.00` and reach it between progress 0.15 and 0.63, well before their band's release at 0.80.
That is why mutual separation is unsatisfiable for them at any window, and it is a question about
what the race should look like — three racers converging on one place, or three landing on three.

**It is not a defect and nothing here forces it.** It changes what he sees, so it is his.

---

## VERIFICATION

`npm run verify` green; client suite green with the moved function in place; `eslint` clean. The
guard suites are untouched — `checkSeparation` was never referenced by any guard.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `client/src/modules/heroCurveGenerator.js` | function + `export` removed; a 5-line note in its place recording where it went and what is unguarded |
| `client/src/modules/heroCurveGenerator.test.js` | function added with its reason; import list loses one name |

Tests added: 0. Tests deleted: 0. Tests re-blessed: 0. Assertions unchanged: all 5 call sites behave
exactly as before, which is what the unchanged fingerprints and the green suite together show.

---

## PROPOSALS

### Proposal A — decide the two that look like dead product code, and leave the rest alone

Of the 19, seventeen are explicable: deliberate test hooks, or exports with one caller that happens
to be a test. **Two are not**: `services/racerApi.js` `deleteRacerSprite` — a client API call for an
endpoint nothing invokes — and `scripts/sim/observers/pulk-contest.mjs`
`RUNAWAY_LEAD_THRESHOLDS_LEN`, which is referenced **nowhere in the repository at all**, not even by a
test.

**Each is a two-minute question with a real answer** — either a feature was never wired up, or the
code outlived its use. Answering them is cheap; leaving them is how a 19-item list becomes a 40-item
one.

### Proposal B — say in the module header which exports exist FOR the test

The scan needed two attempts because "exported for testing" and "exported for use" look identical
from outside, and only the in-module usage count separates them. That distinction is real, useful,
and currently written down nowhere.

**A one-line convention would carry it** — the `_`-prefix that `spriteTinter.js` and
`bgImageCache.js` already use for exactly this, applied consistently. It costs a rename and it makes
the next scan of this kind answerable by eye instead of by script. **Deliberately not proposed as a
guard:** this is a readability convention, and R13's first question — which existing guard already
looks at this ground — has no answer, which is usually the sign that a rule is for people.
