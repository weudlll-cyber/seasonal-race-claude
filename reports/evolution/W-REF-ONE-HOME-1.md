# W-REF-ONE-HOME-1 — the world fingerprint stops being blind to the number that sets every start position

2026-09-10 · night chain 2026-09-09, piece 1 · branch `fix/hull-1` · **nothing minted, no fingerprint
moved, no engine behaviour changed.**

**The one-sentence outcome.** `scripts/sim-fairness.mjs` — the file that DRIVES the world fingerprint —
carried its own `Math.min(285, effectiveWidth)` copy of `raceParams.js`'s `W_REF_MAX`. It now reads the
one home, and ten other re-typings with it. ★ **Proven in both directions by control: with the old
sim, sabotaging `W_REF_MAX` left the world hash byte-identical to its record while both golden races
went RED; with the new sim, the same sabotage fails the world hash.** The detector was blind and is
not any more.

---

## 1 · BOTH SITES RE-VERIFIED AT SOURCE, before anything was touched

- `client/src/modules/raceParams.js:60` — `export const W_REF_MAX = 285;`, applied at `:107` as
  `computeBodyNarrowRef(Math.min(W_REF_MAX, effectiveWidth), …)`. Its docstring calls it **"THE ONE
  HOME OF THE NUMBER"** and records that `rowLayout.test.js` once declared its own copy "with the
  comment *must match the constant in RaceScreen/index.jsx*; a constant that has to be kept in step by
  a comment is the shape this module exists to remove."
- `scripts/sim-fairness.mjs:1120` — `const W_REF = Math.min(285, effectiveWidth);` under the comment
  **"W_REF cap at 285 matches the game's cap for the camera reference width."** A constant kept in step
  by a comment, in the one file where it mattered most.

**Why it matters more here than anywhere else.** `W_REF_MAX` decides `drawnBodyWidthRefPx`, which
`raceBehavior.js` reads as the avoidance body size — so it decides where every racer starts and how
they separate. HULL-FIX-1 proved by sabotage that moving it moves both golden races. The world
fingerprint runs through `sim-fairness.mjs`, which never imported `raceParams.js`, so the project's
primary change-detector for the RACE could not see it.

---

## 2 · ★ THE SHAPE SEARCHED, NOT THE NAME — and the briefed count was wrong again

`raceParams.js:19-21` states the derivation's signature was found at **FOURTEEN sites, one in `client/`
and thirteen under `scripts/`** — a search of 2026-09-07. **That is not the count today**, and this
report did not carry it forward. Five search forms, whole tree, uncapped, over every tracked
`.js/.jsx/.mjs/.cjs`:

| form | what it was for |
|---|---|
| `285` (literal, all tracked source and docs) | the constant however it is written |
| `W_REF` | the binding's name in any spelling |
| `Math\.min\(\s*285` | the cap in its exact shape |
| `computeBodyNarrowRef` | every consumer of the capped width |
| `computeRacerLayout` | the other half of the derivation's signature, to find sites that carry one and not the other |
| `deriveSpriteGeometry` | the converted sites, so "converted" is a count and not a hope |

### The census: ELEVEN live re-typings, of which two had never been named

| # | site | what became of it |
|---|---|---|
| 1 | **`scripts/sim-fairness.mjs:1120`** — the world fingerprint's driver | **converted** — the reason for this piece |
| 2 | **`client/src/modules/headlessRaceSimulator.js:175`** | **converted** — ★ never named by any report |
| 3 | `scripts/diag/start-formation.mjs:196` | converted |
| 4 | `scripts/endgame-width-truth.mjs:108` | converted |
| 5 | `scripts/exp-anchor-truth-ab.mjs:140` | converted |
| 6 | `scripts/finish-band-truth.mjs:232` | converted |
| 7 | `scripts/floor-reach-truth.mjs:102` | converted |
| 8 | `scripts/label-names-truth.mjs:163` | converted |
| 9 | `scripts/line-visible-truth.mjs:117` | converted |
| 10 | `scripts/sprite-size-truth.mjs:134` (and its printed report line `:406`) | converted |
| 11 | **`client/src/modules/camera/zoomUnit.test.js:347`** — `2 * (285 / n)`, the auto-scale's own body-narrow formula at the ceiling | **converted** — ★ never named by any report |
| 12 | `client/src/modules/rowLayout.test.js:583` — `const W_REF = 285;` | **converted** (see below) |
| 13 | `client/src/modules/rowLayout.test.js:645` — `Math.min(285, w)` in the FAILURE PROOF | **converted** |

★ **`headlessRaceSimulator.js` is the one worth pausing on.** Its imports carry, three lines above the
copy: *"MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying
it."* It then wrote the number out. A file can state the rule and break it in the same screenful.

**Eight sites had already been converted** to `deriveSpriteGeometry` by ONE-HOME-RACE-PARAMS-1 —
`RaceScreen/index.jsx`, `camera-fingerprint.mjs`, `camera-replay.mjs`, `check-ending-frame.mjs`,
`golden/goldenRace.mjs`, `lib/raceDriver.mjs`, `parity/goldenRunner.mjs`, `render-fingerprint.mjs`.
That piece converted the callers that build a race and left the ones that only *measure* one — which
is exactly where the world fingerprint's driver sat.

### ★ WHAT WAS LEFT, AND WHY — named rather than quietly passed

- **`rowLayout.test.js` still passes `285`, `570` and `1140` as FIXTURE TRACK WIDTHS** (`:649`, `:650`,
  `:668`, `:854`). Those are *inputs to a property* — "double the track, double the reference" — not
  copies of the ceiling, and rewriting them as arithmetic on the home would make the arithmetic less
  legible than the property being proved. The same file reads `W_REF_MAX` for every cap-role use.
- **`rowLayout.test.js:607/:614` keep the pinned expectations `28.5` and `22.8`.** Deliberate, and
  stated in the file: if the home ever moves, those FAIL, which is the loud outcome a shared constant
  should produce.
- **`rowLayout.test.js:817-820` keep `300 * 0.95`.** That is a *track's* width times the spread — the
  real-world derivation the ceiling was chosen to match, not a copy of it.
- **Three header comments still quote `Math.min(285, …)`** while explaining what was removed. A guard
  that made those illegal would delete the record of its own reason, and the guard below says so.

### A stale claim found and corrected on the way

`rowLayout.test.js:624-630` justified not fixing the cap's design flaw with: *"the same expression
lives in RaceScreen, headlessRaceSimulator.js AND sim-fairness.mjs … changing it in one place alone
would break sim/browser parity."* True when written; **false now**, and the block would have gone on
citing a reason that no longer exists. It now says so, and says what actually remains (the engine
ceremony, which is a decision, not a search-and-replace). `raceParams.js`'s FOURTEEN is dated and the
new census recorded beside it rather than overwritten.

---

## 3 · ★ THE VALUE DID NOT CHANGE — measured, not asserted

The piece's STOP CONDITION was all four fingerprints measured and unmoved. All four were run against
the record on the built tree, in one parallel pass:

| role | record | measured | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | **matches** (87.9 s) |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | **matches** (84.9 s) |
| camera | `75aef5cd474c54e5` | `75aef5cd474c54e5` | **matches** (101.3 s) |
| render | `40b2de6fcc5bafd8` | `40b2de6fcc5bafd8` | **matches** (103.9 s) |

Golden races green before and after. **This removes a duplicate; it retunes nothing.**

### The test, not the assurance

`scripts/w-ref-one-home.test.mjs` (new) asserts the rule as a property of the SOURCE:

- **no tracked file but `raceParams.js` re-types the ceiling** — three patterns, matched against
  comment-stripped code: `Math.min(285`, a `W_REF*` binding assigned `285`, and `285` passed straight
  into `computeBodyNarrowRef`;
- ★ **the scanner is proved able to FIRE** on synthetic sources carrying each pattern, and proved *not*
  to fire on the four shapes deliberately allowed (a fixture width, an unrelated 285, prose, the
  correct form) — because a search that finds nothing is indistinguishable from a search that is
  broken;
- **discovery**: at least 8 tracked files must actually read `W_REF_MAX`, and `sim-fairness.mjs` must
  be one of them by name — so a broken file walk cannot pass as a clean tree.

3 tests, 0.4 s, run by `script-suite`.

---

## 4 · ★ THE SABOTAGE, WITH ITS CONTROL — this is the piece

Sabotage: `raceParams.js` `W_REF_MAX` **285 → 200**. One change, at the one home.

| arm | golden races | world fingerprint |
|---|---|---|
| **CONTROL — the OLD `sim-fairness.mjs`** (restored from `HEAD~1`) + sabotaged home | **RED** | ★ **`check: WORLD matches the record (8a1977187e9c99b4)`** |
| **AFTER — the new `sim-fairness.mjs`** + the same sabotaged home | **RED** | ★ **`FAIL: WORLD fingerprint does not match the record.`** |

**Read the control row again.** The race moved — both golden races said so — and the world fingerprint
came back **byte-identical to its record**. That is not an argument that the detector was blind; it is
the detector saying "unchanged" about a changed race, once, on demand. After the fix the same sabotage
fails it.

Both files restored through git and the restore **re-verified rather than trusted**: the first restore
looked clean to `git diff --quiet` while the index still held the old `sim-fairness.mjs` — because
`git checkout HEAD~1 -- <path>` STAGES what it restores. `git checkout HEAD -- <path>` and a
`git diff HEAD --stat` are what actually confirmed it. Recorded because the same shape would hide a
sabotage in any later piece.

---

## 5 · CHECKS

```
node scripts/engine-reach.mjs --check <the 14 changed paths>

ENGINE REACH: client/src/modules/raceParams.js is in the hull but INERT — same tokens, same line breaks between them — comments only
ENGINE REACH: 4 of 14 path(s) can change the race:
  scripts/diag/start-formation.mjs
  scripts/exp-anchor-truth-ab.mjs
  scripts/finish-band-truth.mjs
  scripts/sim-fairness.mjs
```

`raceParams.js` reported INERT is correct and worth noting: this piece's only change to the home is
comment text.

| check | result |
|---|---|
| four fingerprints | **all match the record** — §3 |
| golden races | **PASS**, 2 races, every position and time as recorded |
| `scripts/w-ref-one-home.test.mjs` | **PASS** 3/3 |
| `npm run verify` (plain) | see the morning sheet |

---

## 6 · SOURCE HYGIENE

| file | change |
|---|---|
| `scripts/sim-fairness.mjs` | +1 import (with the reason), `285` → `W_REF_MAX`, stale comment corrected |
| `client/src/modules/headlessRaceSimulator.js` | +1 import, `285` → `W_REF_MAX` |
| `scripts/{diag/start-formation, endgame-width-truth, exp-anchor-truth-ab, finish-band-truth, floor-reach-truth, label-names-truth, line-visible-truth, sprite-size-truth}.mjs` | +1 dynamic import each, `285` → `W_REF_MAX` |
| `client/src/modules/camera/zoomUnit.test.js` | +1 import, `2 * (285 / n)` → `2 * (W_REF_MAX / n)` |
| `client/src/modules/rowLayout.test.js` | fixture const and the FAILURE PROOF read the home; the stale three-file justification corrected |
| `client/src/modules/raceParams.js` | **comments only** — the FOURTEEN claim dated, today's census recorded |
| `scripts/w-ref-one-home.test.mjs` | **NEW**, with a header saying what it owns and what it deliberately does not do |

**REMOVED:** eleven re-typings of the ceiling; the sentence in `rowLayout.test.js` naming three files
that no longer carry the expression.

**NOTICED AND LEFT, outside this piece:** `rowLayout.test.js:624-636` still records that the cap
**freezes** the camera's body reference above a ~300 px track — CAMERA-PROJECTION-1 Part E, diagnosed
and never shipped. This piece did not touch that: it is a design decision about the number, needs the
engine ceremony, and is the owner's. What changed is only that there is now one place to change.

**No record was created by hand. `git stash` was not used** — `lint-staged`'s own internal backup ran
during the commit hook and cleaned up after itself; `git stash list` is empty.
