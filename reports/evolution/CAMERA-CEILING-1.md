# CAMERA-CEILING-1 — remove the open-track OVERVIEW ceiling; diagnose the count instability

One deletion, one diagnosis, one correction. Branch `camera-refactor`. Camera-only — no engine
ceremony, no fingerprint, no simulation file in the diff.

---

## BUILD-VS-SPEC CONFORMITY

| Step | Status | Note |
|---|---|---|
| **1** — remove the ×0.8 open-OVERVIEW ceiling | **DONE** | One deletion. Closed tracks bit-identical; open tracks ~20–32% tighter, as expected. |
| **2** — diagnose the racer-count instability + searound staircase (no fix) | **DONE** | Yes, it is the count normalisation; removing it would make the multiplier count-stable. Nothing changed. |
| **3** — commit the CAMERA-REFACTOR-1 correction, original claim visible | **DONE** | Struck-through in place with a dated CORRECTION block, plus the INDEX entry. |
| VERIFICATION — no simulation file in the diff | **DONE** | |

No deviations.

---

## 1. The ceiling is gone

**What it was.** On open tracks only, the OVERVIEW snap zoom was capped at 80% of the whole-world
zoom:

```js
const maxZoom = this._isOpenTrack
  ? Math.min(MAX_INVERSE_ZOOM, this._overviewStateZoom * 0.8)
  : MAX_INVERSE_ZOOM;
```

It bound on **100% of frames on all five open tracks**, so open-track OVERVIEW never ran the
sprite-size rule at all. Its stated purpose — *"prevents the leader leaving canvas during pan"* — was
a **pan** problem solved with a **zoom** cap; the pan is held by `resolveCamera`'s world-edge clamp
and, in LEADER-family states, by the containment clamp.

**What changed, per track** (OVERVIEW multiplier 1.75, 20 racers):

| track | | before: racer / visible world | after: racer / visible world | change |
|---|---|---|---|---:|
| city-circuit | closed | 49.0 px / 489 px | 49.0 px / 489 px | **unchanged** |
| dirt-oval | closed | 49.0 px / 442 px | 49.0 px / 442 px | **unchanged** |
| garden-path | closed | 49.0 px / 491 px | 49.0 px / 491 px | **unchanged** |
| ice-track | closed | 49.0 px / 524 px | 49.0 px / 524 px | **unchanged** |
| searound | closed | 49.0 px / 650 px | 49.0 px / 650 px | **unchanged** |
| luger-hill | open | 33.3 px / 914 px | **49.0 px** / 620 px | −32% |
| space-sprint | open | 39.9 px / 914 px | **49.0 px** / 744 px | −19% |
| mountainstreet | open | 39.9 px / 914 px | **49.0 px** / 744 px | −19% |
| river-run | open | 39.9 px / 914 px | **49.0 px** / 744 px | −19% |
| seatrack | open | 39.9 px / 914 px | **49.0 px** / 744 px | −19% |

**The point of the change is the middle column: 49.0 px on all ten tracks.** One number now means
one thing everywhere. Before, the same setting produced three different racer sizes depending on
which side of the open/closed split the track fell.

Luger-hill moves most (−32%) because its world is 4096 px, where the whole-world zoom — and so the
80% of it — sat lower than on the 6000/6144 tracks.

**Replay diff, isolating this deletion** (against `af37db44`, seeded RNG, per-frame `zoom`/`offsetX`/
`offsetY`/state):

```
  dirt-oval       CLOSED | shipped defaults / owner's / owner's+minvis0 | 5767 frames each | BIT-IDENTICAL
  mountainstreet  OPEN   | shipped defaults            | 4103 frames | max |Δzoom| 1.2e-1  |ΔoffsetX| 6.6e+2 px
  mountainstreet  OPEN   | owner's (OV 1.75 / LD 3.00) | 4103 frames | max |Δzoom| 2.1e-1  |ΔoffsetX| 1.2e+3 px
  mountainstreet  OPEN   | owner's + min-vis 0         | 4103 frames | max |Δzoom| 2.1e-1  |ΔoffsetX| 1.2e+3 px
  state mismatches: 0 everywhere
```

Closed tracks untouched to the bit; open tracks changed only in framing; **the state machine did not
move a single frame**.

**No test covered the ceiling.** 493 camera tests pass unchanged — none of them asserted it. Worth
recording: a behaviour that shaped every open-track OVERVIEW for months had no test at all.

**If you want the old open-track width back**, the multiplier that reproduces it is about **1.43**
(measured: 914 px visible on mountainstreet). But note what that costs — it would also loosen the
*closed* tracks from 442 px to ~543 px, because the two old looks disagreed with each other. That is
the trade the whole exercise is about: one number cannot reproduce two inconsistent behaviours.

---

## 2. The racer-count instability — diagnosed, not fixed

**Yes, it is the count normalisation, and it is a defect rather than a property of the unit.**

The reference the camera zooms by is `computeBodyNarrowRef`:

```
bodyNarrow = min( 2 × W_ref / racersPerRow ,  displaySize × bodyFillNarrow × maxScale )
   racersPerRow = ceil(N / rowCount),   rowCount = ceil(N / maxRacersPerRowAtMinScale)
```

That is a **start-grid packing** computation: *how wide can a racer be so that `racersPerRow` of them
fit across the track on the starting grid.* It is the right question for laying out a grid. The
camera then borrows the answer as its zoom reference — and **every scrap of the count dependence
enters through `racersPerRow`.**

Measured on mountainstreet (OVERVIEW 1.75):

| N | rows | per row | bodyRef | visible world | track-widths | vs N=20 |
|---:|---:|---:|---:|---:|---:|---:|
| 8 | 1 | 8 | 39.8 | 1040 px | 3.47 | +40% |
| 12 | 1 | 12 | 39.8 | 1040 px | 3.47 | +40% |
| 16 | 1 | 16 | 35.6 | 931 px | 3.10 | +25% |
| **20** | 1 | 20 | 28.5 | 744 px | 2.48 | — |
| 24 | 1 | 24 | 23.8 | 620 px | 2.07 | −17% |
| 30 | 1 | 30 | 19.0 | 496 px | 1.65 | −33% |
| 40 | 1 | 40 | 14.3 | 372 px | 1.24 | **−50%** |
| 60 | 2 | 30 | 19.0 | 496 px | 1.65 | −33% |

Two separate problems, and the second is worse than the first:

1. **Monotone part — wrong direction.** More racers → smaller packed body → the camera zooms *in* to
   keep the racer 49 px → **you see less track exactly when there is more to show.** That is backwards
   for a race camera.
2. **Staircase part — not even monotone.** On dirt-oval: N=30 gives 1.65 track-widths, **N=40 gives
   2.48**, N=60 gives 1.65 again. Crossing a row boundary splits the grid (40 racers → 2 rows of 20),
   which *widens* the packed body and jumps the camera 50% in the opposite direction. Adding ten
   racers can zoom the camera out.

**Would removing the normalisation make the multiplier stable in racer count? Yes — by construction.**
`N` enters only through `racersPerRow`. Replace that divisor with anything count-independent and the
count dependence is gone entirely.

**And here is the part that makes the choice easy.** The multiplier's *good* property and its *bad*
one are the same expression. With one start row, `racersPerRow = N`, so

```
bodyNarrow = 2 × trackWidthPx × 0.95 / N      →   visible world / trackWidthPx = 1280 × 0.095 / 49 = 2.48
```

The track width **cancels**. That is *why* the multiplier gave an identical 2.48 track-widths on 9 of
10 tracks — not a deep property of normalising by racer size, but the `2 × W_ref` term being
proportional to track width. The `/N` beside it is the instability. **Normalising by track width
directly keeps the cancellation and drops the `/N`** — same cross-track consistency, same resolution
invariance, no count dependence. Named for the unit block; not touched here.

*(A racer's target on-screen size having anything to do with how many racers are in the field is,
as you put it, a defect. Concretely: the camera is reading a **grid-layout** number as if it were a
**camera** number. The sprites should keep shrinking as the field grows — that is the auto-scale
feature working — but the camera should not chase them.)*

### searound's row staircase — one line

**Yes, it will distort the comparison: at 20 racers searound is the only shipped track that needs
two start rows (10 per row instead of 20), which doubles its packed body and shows 4.96 track-widths
where every other track shows 2.48 — so discount searound entirely, or run it at ≤10 racers where it
is a single row.**

---

## 3. The correction to CAMERA-REFACTOR-1

CAMERA-REFACTOR-1 said the `W_REF = 285` cap breaks resolution invariance *"above roughly a 4600-px
world"*. **The cap keys on TRACK width, not WORLD width** — `effectiveWidth = trackWidthPx × 0.95` —
so it binds only when the *track* exceeds **300 px**. The "4600" was read off a sweep in which world
and track width scaled together; generalised to world width it is wrong.

Measured across all ten shipped tracks: **the cap binds on none of them and the distortion is exactly
0.00%**, Mountainstreet included (6144-px world, 300-px track). `300 × 0.95 = 285.00000000000000000`
in exact IEEE arithmetic — the widest shipped track lands precisely on the boundary without being
reduced.

The correction is written **in place, with the original sentence struck through rather than deleted**,
plus a dated CORRECTION block. The sweep that produced the claim was real and its rows are still the
right warning for the first wide track anyone draws; only the generalisation was wrong. The same
block records two further narrowings found in the re-check: the invariance band is 1×–1.5× (not
0.5×–1.5×, which assumed the sprites scaled too), and the 9-of-10 cross-track consistency is the
`2 × W_ref / N` cancellation described above.

**Consequence for the pending decision: the 285 block is NOT a precondition** for choosing the zoom
unit — nothing you can look at today is distorted by it. The ceiling removed in Part 1 *was* the
precondition, and it is now done.

---

## VERIFICATION

```
$ git diff --stat
 client/src/modules/camera/CameraDirector.js | 18 ++++++++--------   <- the deletion
 reports/evolution/CAMERA-REFACTOR-1.md      | 33 ++++++++++++++---   <- the correction
 reports/evolution/INDEX.md                  |  1 +
 reports/evolution/CAMERA-CEILING-1.md       | new

$ npx vitest run src/modules/camera/
 Test Files  8 passed (8)      Tests  493 passed (493)
```

No new `pre/` tag: `pre/projection` (`54cbe5d4`) is still the return point for the camera work on
this branch, and this deletion is one line inside it.

**No simulation file is in the diff.** The only source file is
`client/src/modules/camera/CameraDirector.js` — the camera module, which nothing in the engine
imports. Everything else is documentation.

**Paths I treated as simulation:** `client/src/modules/{raceStep,raceCore,raceBehavior,raceGovernor,
racePlanner,raceBaseSpeed,raceDynamicsConfig,raceBehaviorConfig,durationModel,raceLengths,rowLayout,
heroChoreography,heroCurveGenerator,headlessRaceSimulator}.js`, `client/src/modules/parity/**`,
`client/src/modules/storage/defaults.js`, `scripts/sim-fairness.mjs`, `scripts/exp-*.mjs`.

---

## THE OWNER'S EYE — what to look at, and where

**Expected:** closed tracks *identical* to yesterday; open tracks noticeably **tighter** in OVERVIEW,
with racers the same size as they are on Dirt Oval. That tightening is the fix, not a regression.

**Keep the racer count the SAME on every track you compare** — Part 2 shows the count alone moves
OVERVIEW by up to 2×, which would swamp what you are trying to judge.

1. **Dirt Oval, seed 5601** — the control. OVERVIEW must look exactly as it did. If it moved at all,
   something is wrong and I want to know before you look at anything else.
2. **Mountainstreet, same racer count** — the change. OVERVIEW should be about 20% tighter, and the
   racer should now look the *same size* as it did on Dirt Oval. That equality is the whole point.
3. **Luger-hill** — the largest move (−32%). If any track looks too tight, it will be this one.
4. **Then decide the multiplier.** If open tracks now feel too close, lower the OVERVIEW multiplier —
   it will move all ten together, which is the new property. ~1.43 restores the old open-track width,
   at the cost of loosening the closed tracks by the same rule.
5. **Skip searound for the comparison**, or run it at ≤10 racers (Part 2).

Paste the `[RA CAMERA LIVE TRUTH]` line so I can confirm which bundle and config ran.

---

## What I could not determine

**Whether the ceiling was ever load-bearing.** Its comment claims it stopped the leader leaving the
canvas during an open-track OVERVIEW pan. There is no test and no report recording a case where that
happened, and OVERVIEW has no containment clamp (`_focusAnchorRacer` returns null for it), so the
only remaining guard is `resolveCamera`'s world-edge clamp plus its zoom-adaptation loop. Those
should be sufficient — the target is the leader's own position, which `resolveCamera` keeps inside
`innerFramePct` by reducing zoom if needed. But "should be sufficient" is a code reading, not a
measurement, and the failure it guarded against would show up as *the leader drifting to the edge of
a wide open-track OVERVIEW*. That is worth watching for specifically on Mountainstreet and
Luger-hill, and it is the one way this deletion could be wrong.

---

## PROPOSALS

**P1 — the unit decision is now unblocked; take the measurement with a fixed racer count.**
With the ceiling gone, every track reports the same racer size for the same setting, so a side-by-side
finally compares the unit rather than the topology. The remaining contaminant is the count staircase
(Part 2), and it is fully avoidable by holding the count fixed. If the decision still feels close
after looking, the deciding question is narrow: *should the amount of track you see depend on how
many racers are in the field?* Today it does; a track-width normalisation says no; the current
sprite-size normalisation says yes, non-monotonically.

**P2 — put a test on the two behaviours this block touched.**
The ceiling had no test, which is why removing it cost one line and no argument — and also why nobody
noticed it discarding the sprite rule for months. Two cheap standing assertions would have caught it:
*the same OVERVIEW setting yields the same on-screen racer size on an open and a closed track*, and
*no state's zoom is clamped by a topology-specific constant*. The first is now true and worth pinning
before the unit block moves the formula again.
