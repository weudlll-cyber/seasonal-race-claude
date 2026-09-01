# REGISTRY-LITERALS-1 — the copied racer literals are gone, the races did not move, and the closure doubled

**Date:** 2026-09-02 · **Branch:** `fix/registry-literals-1` off `master` at `6f2d780c`.
Piece 5 of the NIGHT-CENSUS-1 chain, and the **only** repair in it — ordered explicitly, on the
owner's reasoning that **a golden going red when a racer changes is the correct loud signal, where a
literal drifting silently is not.**

**NO MINTING PERMISSION was given and none was taken.** No fingerprint was re-minted.
`docs/fingerprints.json` is untouched.

---

## What changed

The four files that carried hardcoded `speedMultiplier` / `displaySize` / `bodyFillX` / `bodyFillY`
now read them from the racer-type registry through one new module.

| file | before | after |
|---|---|---|
| `scripts/sim-fairness.mjs` | 20-type table, 80 literals | `...racerFacts(id)` per type; `surfaceClasses` kept |
| `scripts/parity/goldenRunner.mjs` | 10-type table, 40 literals | `...racerFacts(id)` per type; `surfaceClasses` kept |
| `scripts/diag/acceptance-orders.mjs` | 4 manta constants | destructured from `racerFacts("manta")` |
| `scripts/diag/micro-divergence.mjs` | 4 manta constants | destructured from `racerFacts("manta")` |
| **`scripts/lib/racerFacts.mjs`** | — | **new**, 80 lines, carries the rule |

Net: **266 deletions against 221 insertions**, and 124 literal values removed from the tree.

## The rule, and a correction to the instruction that ordered it

The instruction said to read all four fields from `CONFIG_SNAPSHOT`, noting that `bodyFillX`/`bodyFillY`
are not tunable but should be read "the same way for one rule rather than two".

**`CONFIG_SNAPSHOT` does not contain `bodyFillX`/`bodyFillY`.** It is built from `TUNABLE_FIELDS`
(`index.js:244`), and measured on the tree:

```
TUNABLE: speedMultiplier=true displaySize=true bodyFillX=false bodyFillY=false
```

Reading them from the snapshot would have yielded `undefined` and moved every hash. So the *intent*
was honoured rather than the letter: `racerFacts` implements **one rule — prefer the frozen snapshot,
fall back to `.config` for the fields the snapshot does not carry.** Every field is read the same way
at every call site, and every field is override-immune, which is the property that actually matters:

- `speedMultiplier` and `displaySize` **are** tunable. `index.js:539` calls
  `_applyStoredTunableOverrides()` at module load, which mutates `type.config` **in place**. In jsdom
  `localStorage` exists, so a naive `.config.displaySize` would let local Dev-Screen tuning silently
  change what the harness measures. `CONFIG_SNAPSHOT` is frozen at line 244, before line 539.
- `bodyFillX`/`bodyFillY` are **not** tunable and are never mutated, so `.config` is already
  override-immune for them.

`racerFacts` also **throws on an unknown id**. `getRacerTypeById` falls back to horse with a
`console.error`, which is right for a running game and wrong for an instrument: a harness that
silently measures a horse where the operator asked for a duck produces a confident wrong number.

## PROOF THE RACES DID NOT MOVE

The tables had been corrected to match the registry earlier the same day, so this should be a pure
no-op. It is. **All four fingerprints were measured BEFORE the change on this branch and again
AFTER** — not merely compared against the record, so that a stale record could not manufacture a
false pass.

| fingerprint | before | after | record |
|---|---|---|---|
| world | matched | matched | matched (`--check` confirms the role) |
| world-off | matched | matched | matched |
| camera | matched | matched | matched |
| render | matched | matched | matched |

All four are **byte-identical before and after, and all four equal the record.** The values are not
restated here; `docs/fingerprints.json` is their one home.

**The goldens: 50 of 50 green, 7 files** — `goldenRealArm`, `goldenEquality`, `goldenNegative`,
`replay`, `configFingerprint`, `recordingContext`. Every pinned expectation held. Not one hash moved,
so no value still disagrees and nothing was re-pinned.

Two further checks before the fingerprints were run:

- The post-change `RACER_CONFIGS` in both files was diffed **against the literal values as they stood
  before the edit**: `goldenRunner` 10 types, **0 moved**; `sim-fairness` spot-check 6 types, **0
  moved**. All 20 `surfaceClasses` arrays intact in `sim-fairness`, all 10 in `goldenRunner`.
- `npm run verify`: **PASS 13 FAIL 0 SKIP 13**, including `script-suite` and `world-fingerprint`.

---

## THE ONE REAL COST, AND IT IS BIGGER THAN THE BRIEF EXPECTED

**The engine-reach closure grew from 36 files to 76.**

The brief predicted that `engine-reach --check` "will select nothing for `scripts/`". That is wrong,
and the tool says so plainly:

```
ENGINE REACH: 2 of 6 path(s) can change the race:
  scripts/lib/racerFacts.mjs
  scripts/sim-fairness.mjs
```

`scripts/sim-fairness.mjs` is a declared reach entry of the world fingerprint, so it was always in the
closure. What is new is that it now imports the racer-type registry, and that registry pulls in **40
modules** (the figure REGISTRY-IMPORT-FEASIBILITY-1 measured). 36 + 40 = 76, exactly.

Two generated blocks had to follow, and both were regenerated rather than typed:

- `docs/SIM.md` — the engine-reach table: **36 files → 76**, UNKNOWN purposes 13 → 14 (the new one is
  `modules/racer-types/SpriteRacerType.js`, whose header states no purpose).
- `docs/SHIP-CEREMONY.md` — the generated counts: closure **36 → 76**, "files that CANNOT reach the
  engine" **87 → 51**.

**This is a change to the verification regime, not just to five files, and it should be read as
one.** From now on, editing any of those 40 racer-type modules selects the world fingerprint in
`npm run verify` and asks for a mint. That is **the loud signal the owner asked for**, made explicit
rather than left to a golden going red later — but it is also a real cost: racer-type work now pays
the world fingerprint's duration where before it paid nothing. Nobody has judged whether that trade
is worth it at 40 modules rather than at one. **It is stated here rather than absorbed quietly.**

---

## A ROUTING GAP FOUND BY DOING THIS WORK — written down, NOT fixed

**`npm run verify` would have reported green on this change without running a single golden.**

`client-suite` declares `dirs=client/`. This change is entirely under `scripts/` and `docs/`, so
routing skipped it:

```
client-suite    nothing changed  ·  declares 0 file(s) by import closure · dirs=client/ · except=client/e2e/
```

But **four client vitest files import `scripts/parity/goldenRunner.mjs`** — `goldenEquality`,
`goldenNegative`, `goldenRealArm` and `replay` — which is the very file this change rewrote. A change
under `scripts/parity/` can move every golden hash in the client suite and select nothing that would
notice.

The 50/50 green above exists **only because the goldens were run by hand.** Had they moved, this
block's own gate would have said PASS.

This is the same shape as the two routing gaps already on record (the seed-record gap that turned
master red for a day, and the fingerprint routing that could not connect `server/seeds` to
`server/data`). Per the chain's rule it is **counted, not repaired.**

## Other things found and deliberately NOT fixed

1. **`scripts/sim-fairness.mjs:1036-1037`** keeps `bodyFillX = 0.75, bodyFillY = 0.75` as
   `runSingleRace` **parameter defaults**. No racer type carries 0.75/0.75 — these are a fallback for
   callers that omit the fields, not a copy of any racer's table, so they are outside the ordered
   scope. CENSUS-DUPES-1 group A11 already records them.
2. **`surfaceClasses` remains a literal in both tables**, and for two different reasons.
   `goldenRunner`'s is deliberately *not* the registry's field (one track-tag per type, never read,
   no other home in the tree — CENSUS-DUPES-1 group B3). `sim-fairness`'s 20 arrays *do* agree with
   the registry and are unguarded (group A3). Neither was swept along; the order was about the four
   physical fields.
3. **The fifth table nobody had counted.** CENSUS-DUPES-1 found `scripts/audit-sprite-crops.mjs`
   carrying a sixth 20-type table that has **never** agreed — 5 wrong display sizes, 16 wrong frame
   geometries, since 2026-06-03. It was not in the feasibility study, its values are pre-crop
   *inputs* rather than the same fact, and removing them would change what that tool measures.
   **Untouched.**
4. **`scripts/parity/goldenRunner.mjs:117` claimed GOLDEN-TABLE-REGISTRY-1 "built the guard".** It
   did not; the guard was proposed and held. That sentence sat inside the comment block this change
   rewrote, so it is gone as a side effect of the rewrite rather than as a repair — the replacement
   comment states what actually happened.

## The backlog

`docs/BACKLOG.md` — the **BUILD A DRIFT GUARD** proposal is closed rather than parked, with the
reason: **the copies it would have watched are gone**, so a guard there would now police nothing. The
entry records the two duplications that survive and are deliberately not covered, pointing at
CENSUS-DUPES-1 for both.

## Limits

**"The races did not move" is proven for what these instruments measure, not for everything.** The
four fingerprints and the 50 goldens cover the world, the camera, the render and the parity arms at
their pinned seeds and tracks. A racer type this corpus never instantiates could still be read
differently by `racerFacts` than by the old literal — though the value-level diff against the
pre-change literals (0 moved, all 30 rows) makes that close to impossible by construction.

**The closure figure is what the tool reports, not an independent count.** 76 comes from
`engine-reach.mjs`'s static import walk, which by its own documentation cannot follow dynamic imports
or values passed in as arguments. There are no dynamic imports in the closure today.

**No eye test.** This changes no shipped behaviour and no default, so nothing was put in front of the
owner. The dev server stayed on `feat/aim-levers-1` throughout and was never rebuilt from this branch.
