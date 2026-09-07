# REPEAT-RECOMPUTE-6 — STOPPED at the recompute seam, and exactly why

**Date:** 2026-09-07
**Branch:** `feat/team-races-1` — ★ **no code was changed by this piece.** RACE-HISTORY-4's
warn-and-run behaviour is left exactly as it is, because what replaces it could not be built without
breaking one of the piece's own rules.
**Outcome:** ★ **STOP AND REPORT.** The worker gate passes. The comparison is well defined. The
three doors already have one seam. **What blocks it is the fourth thing: a stored race cannot be
recomputed without the race-init derivation that lives inside drawing code.**

---

## What was established, and what it cost to establish

Everything below was read at the line, not carried over from a report.

### 1. The engine CAN be loaded in a worker without changing engine code — the named gate PASSES

The piece's stop condition was "if the engine cannot be loaded in a worker without changing engine
code". It can.

- The engine closure is **64 client files** (`node scripts/engine-reach.mjs`). Grepping every one of
  them for `document.`, `window.`, `localStorage`, `HTMLCanvas`, `new Image` and `navigator.` finds
  real DOM use in exactly **three**: `racer-types/SpriteRacerType.js`, `racer-types/spriteLoader.js`
  and `racer-types/spriteTinter.js`.
- **All of it is call-time, not import-time.** Checked structurally (no top-level statement in any of
  the three touches the DOM) and confirmed by behaviour: `scripts/render-fingerprint.mjs` imports
  these modules under Node, where `document` and `Image` do not exist, and gets as far as printing
  `[warmup] snowmobile FAILED: Image is not defined` — a runtime failure inside a function, after the
  import succeeded.
- The engine already runs headless in Node twice over: the golden races
  (`scripts/golden/goldenRace.mjs`) and the parity arms (`scripts/parity/goldenRunner.mjs`).

**So a worker is not the obstacle, and nothing here asks for the engine to be changed to fit.**

### 2. RECOMPUTE-COST-1's no-side-effects finding, re-verified rather than trusted

Not re-run as a measurement — re-checked where it would show. The stepping path
(`createRaceFromIdentity` → `stepRacePhysics` → `runRaceHeadless`) writes no storage, opens no
socket, and reads no clock that decides anything: the race clock is `state.physicsTs`, advanced by a
fixed `DT` per step, and the finish accounting is `r.finishTimeMs = physicsTs`. That is what makes
the comparison below exact rather than approximate.

### 3. The comparison is well defined, and needs no tolerance

`finishTimeMs` is a strict `FIXED_DT` multiple (`raceCore.js`), and the stored record already carries
what the comparison needs: `RaceScreen/index.jsx:1176-1183` writes `finishOrder` as
`{name, icon, color, index, lap, progress, finishTimeMs}` per racer, in finishing order. So "the
finishing order and every finishing time" is an **exact integer comparison, position by position** —
no epsilon, no rounding rule to get wrong.

### 4. The three doors ALREADY converge on one function

This was the requirement most likely to need building, and it does not. All three end at
`SetupScreen.startRaceFromIdentifier`:

- the history row's button → `armRepeat` → `takeArmedRepeat` → `startRaceFromIdentifier`
  (`SetupScreen.jsx:419`)
- a typed **short key** → `resolveShortKey` → fetch → encode → the same call
- a typed **long identifier** → the same call

`repeatRace.js`'s header states this as a deliberate decision: *"A second starter would be a second
copy of all of that, and the copy would be the one that silently drifted."* A gate placed in front of
that one function is ONE PLACE serving ALL THREE DOORS, exactly as the piece requires.

---

## ★ THE BLOCKER: a recompute needs params that only drawing code knows how to build

To recompute a stored race you must call `createRaceFromIdentity(params)`. Its params are not the
stored inputs — they are a **derivation** from them, and that derivation lives at
`client/src/screens/RaceScreen/index.jsx:540-627`, inside the race-init effect. It is not a
formality. In those ~60 lines:

- `typeField('displaySize')`, `typeField('bodyFillX')`, `typeField('bodyFillY')` read racer-type
  fields, with `bodyFillNarrow` / `bodyFillLong` taken as the min and max of the two and defaulted to
  `1.0` when non-finite;
- `effectiveWidth = trackWidthPx * behaviorConfig.startSpreadRange`;
- `physicalSpriteSize` branches on `autoScaleConfig.enabled` **and** on whether this machine has a
  `displaySize` override — read live with `storageGet(KEYS.RACER_TYPE_OVERRIDES, {})`;
- when it does auto-scale, `computeRacerLayout(effectiveWidth, nRacers, displaySize, autoScaleConfig)`
  gives `physicalSpriteSize`, and a **separate** `computeBodyNarrowRef` call against
  `W_REF = Math.min(285, effectiveWidth)` gives `drawnBodyWidthRefPx`.

`physicalSpriteSize` drives `rowGapPx` and `rowCount`, which are **physics** — the file says so. Get
this derivation slightly wrong and the recompute produces a different race and refuses a race that
would have run identically, which is the one outcome REPEAT-REFUSE-5 already established as wrong.

**There is no seam.** The derivation is interleaved with the effect's render concerns and reads this
machine's storage directly.

### And it has already been copied twice, both times knowingly

- `scripts/camera-replay.mjs:164` — *"Every line below mirrors
  `client/src/screens/RaceScreen/index.jsx` race-init."*
- `scripts/parity/goldenRunner.mjs:655-692` — the "real browser arm", doing the same
  `computeRacerLayout` / `computeBodyNarrowRef` / `W_REF` derivation, whose entire job is to be
  byte-identical to the browser and which needs a four-track parity suite to prove it stays so.

Both live in `scripts/` and neither is importable from `client/src` — that is the layering
SHARED-CANONICAL-1 repaired one commit earlier, and re-crossing it here would reintroduce the defect
that piece existed to remove.

### So the piece's own rules collide

| Rule | Consequence here |
|---|---|
| "change no engine, camera or **drawing code**" | `RaceScreen/index.jsx` is drawing code, so the derivation cannot be extracted |
| "★ NOTHING IS BUILT TWICE" (chain rule) | a client-side copy would be the **third** mirror of race-init |
| "refuse only when the race would actually run differently" (REPEAT-REFUSE-5, owner) | a drifting mirror refuses races that still run identically — the defined failure |

Every route forward breaks one of them. **That is why this stops rather than choosing one.**

---

## What it would take

**Extract the race-init derivation out of `RaceScreen/index.jsx` into a shared module** — one
function from (stored inputs, geometry, racer type, config world) to `createRaceFromIdentity` params,
with the machine-state reads passed in rather than fetched. Then RaceScreen calls it, the worker
calls it, and `camera-replay.mjs` and `goldenRunner.mjs`'s real arm can stop mirroring it.

That is worth doing on its own merits — it would delete two existing mirrors, not add a third — but
it is **a piece of its own**: it changes drawing code, it moves the code path every race in the
product runs through, and its correctness proof is the parity suite plus the golden races plus the
owner's eye. **It needs his word before it is started**, which is precisely why it was not started
here.

Nothing else in piece 3 is blocked by anything else. Items 1, 2, 3 and 4 are all downstream of the
recompute existing; item 6 (removing warn-and-run) must not happen until its replacement does,
because the piece says it is *"replaced, not layered over"* — removing it first would leave the
product with neither.

---

## The limit that was to be reported anyway, and still stands

★ **Only the track's ID is stored, not its shape.** `inputs.geometryId` names a track; the geometry
is resolved from this device at repeat time. So a track that has been EDITED since the race ran is
indistinguishable from an engine change: the recompute would produce a different outcome and the
race would be refused, with a message saying a program change affects how races run — which would not
be true.

Stated plainly and **nothing is proposed**, as instructed. It is named here because it is a property
of the design the owner chose, not a defect introduced by it, and because whoever builds the
extraction above will meet it on the first edited track.

---

## What was NOT done, so nobody looks for it

- No worker was written. No comparison was wired. No door was changed.
- **RACE-HISTORY-4's warn-and-run is untouched and still shipping.** It is the current behaviour and
  removing it before its replacement exists would leave the product with no check at all.
- Neither sabotage was run: both are sabotages of code that does not exist.
- No browser proof was taken, for the same reason.
- `engine-reach --check` was not owed — no file changed.
