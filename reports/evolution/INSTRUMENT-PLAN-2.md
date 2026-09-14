# INSTRUMENT-PLAN-2 — three of the six were fixable, and three are blind for a different reason

2026-09-12 · branch `night/2026-09-12b` · night chain 2026-09-12 piece 3 · **instruments only. No
product source touched, nothing minted, no recorded value moved.**

★ **THE ANSWER IN ONE LINE.** CAMERA-PLAN-BLIND-1 named six instruments that still build a camera the
product does not run. **Three of them can be fixed through the shared helper and now are. The other
three cannot, and the reason is structural rather than an oversight** — naming them as "still blind"
in one list made them look like one job, and they are two.

| instrument | fixed? | did its output move? |
|---|---|---|
| `scripts/check-ending-frame.mjs` | ★ **yes** | **no — byte-identical, still PASS** |
| `scripts/finish-band-truth.mjs` | ★ **yes** | **no — byte-identical** |
| `scripts/exp-anchor-truth-ab.mjs` | ★ **yes** | ★ **YES — 3 of 10 tracks** |
| `scripts/diag/start-formation.mjs` | **no — cannot** | — |
| `scripts/exp-camera-bisect.mjs` | **no — cannot** | — |
| `scripts/sim-race-visual.mjs` | **no — cannot** | — |

---

## 1 · THE THREE THAT WERE FIXED

All three now call `makeCameraPlanDelivery` from `scripts/lib/cameraPlanDelivery.mjs`, once per frame
before `cd.update(...)` — **the same helper the three already-fixed instruments use, with the same
static import spelling `camera-fingerprint.mjs` uses.** ★ **Nothing was built twice**: no instrument
grew its own copy of the delivery rule.

### ★ WHAT MOVED, AND WHAT DID NOT

**`check-ending-frame.mjs` — a verify GUARD, so this one mattered most.**
Output **byte-identical** before and after, and it still reports
`nothing covers the race picture during the ending. PASS`. ★ **Its verdict is a recorded value in
everything but name, and it did not move, so no stop condition fired and nothing needs his
permission.**

**`finish-band-truth.mjs` — byte-identical.** Expected on reflection: it measures where the finish
BAND is drawn relative to the racers, and that geometry is not gated on a racer being cast.

**★ `exp-anchor-truth-ab.mjs` — MOVED.**

| | before | after |
|---|---|---|
| `dumpHash` | `714d1cc1491c2ea4` | ★ `ae72523ffb80e39c` |
| tracks whose frames changed | — | ★ **city-circuit, garden-path, luger-hill** (3 of 10) |

★ **NO PERMISSION WAS NEEDED AND NONE WAS TAKEN.** Searched before deciding: `714d1cc1491c2ea4`
appears in **no** document, record or source file in the tree. It is an experiment that writes to an
`--out` file the caller names, so it carries no recorded value — the brief's rule is that only an
instrument WITH one needs stopping. **Nothing was minted.**

★ **AND THIS IS THE WHOLE POINT OF THE PIECE.** On three tracks this instrument was answering a
question about a camera the browser cannot produce. **Any anchor conclusion previously drawn from
city-circuit, garden-path or luger-hill was drawn on a blind camera** and should be re-read before it
is relied on again.

---

## 2 · ★ THE THREE THAT CANNOT BE FIXED THIS WAY — with their addresses

The helper hands a director the plan **the controller produces mid-race**. An instrument that has no
controller, or never reaches the frame where the plan exists, cannot be fixed by it at all. These
three are each blind for one of those reasons, and **calling them "still blind" alongside the others
was the thing that hid it**:

- **`scripts/diag/start-formation.mjs`** — it runs the **countdown only**
  (`cd.updateCountdown(...)` in a `while (ts < cdMs)` loop) and stops before the race starts. The
  heroes are cast at the choreo boundary, so **there is no plan in existence at any frame this
  instrument runs.** ★ There is nothing to deliver, and delivering early would be a different
  wrongness — the helper's own header says so.
- **`scripts/exp-camera-bisect.mjs`** — it **replays recorded frames** (`for (const f of frames)`)
  through a fresh director. There is no live `racePlanController` in the process to ask. Fixing it
  means recording the plan alongside the frames, which changes the dump format.
- **`scripts/sim-race-visual.mjs`** — it builds **no race plan at all**: searched for
  `racePlanEnabledFlag`, `createRacePlan`, `createRaceFromIdentity` and `racePlanController` and it
  has none, rolling its own physics loop instead. It is not blind to the plan so much as it is not
  running the planned game.

★ **NONE OF THE THREE WAS TOUCHED.** Each would be its own change with its own review, and the chain
rule is that pouring a change into several diagnostics at once is how a change stops being
reviewable. **They are named here with what each would actually need**, which is what the earlier
list did not say.

---

## 3 · CHECKS

`node scripts/engine-reach.mjs --check`, verbatim:

```
ENGINE REACH: 3 of 3 path(s) can change the race:
  scripts/check-ending-frame.mjs
  scripts/exp-anchor-truth-ab.mjs
  scripts/finish-band-truth.mjs
```

★ **I WROTE THE OPPOSITE LINE INTO THIS REPORT BEFORE RUNNING IT, AND THE GUARD CORRECTED ME.**
Recorded rather than quietly fixed, because it is the exact failure this chain keeps warning about.

**What the line means, read properly:** the hull is an IMPORT CLOSURE, and all three instruments
import the engine (`createRaceFromIdentity`, `stepRacePhysics`) in order to drive it. So a change to
any of them *could* reach the engine and the guard is right to say so. **What was actually changed is
a camera-plan delivery inside each instrument's own loop — no product source is touched**, and the
three files are not imported by anything the game ships. The guard cannot know that second part, and
it is not its job to.

`check-ending-frame` is the only one of the three that `verify` runs as a guard, and it passes with
byte-identical output — which is the evidence that matters here, rather than the reach line.

★ **The `exp-anchor-truth-ab` A/B was a CONTROLLED one**: the delivery call was commented out to
produce the "before" run and restored immediately, in the same tree, so the two runs differ in that
one line and nothing else. The restoration is verified — the file carries exactly one live
`deliverCameraPlan();` call.

**`git stash` was not used. `--no-verify` was not used.**

---

## 4 · WHAT IS OPEN

1. **The three anchor tracks that moved.** Any conclusion drawn from `exp-anchor-truth-ab` on
   city-circuit, garden-path or luger-hill predates the camera seeing the cast.
2. **`exp-camera-bisect` needs the plan recorded with its frames** — a dump-format change.
3. **`sim-race-visual` runs an unplanned race.** Whether it should run the planned one is a question
   about what that instrument is FOR, not a wiring fix.
