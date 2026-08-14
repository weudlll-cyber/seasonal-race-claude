# SHIP-CONTENDER-ZOOM — the photo finish frames everyone still abreast

**Merge `0bd07dba`. Tags `pre/ship-contender-zoom` (`5d4079c3`) and `v-ship-contender-zoom`
(`0bd07dba`). CAMERA and RENDER minted; WORLD run and unmoved.**

**The owner judged a production build on 2026-08-14, on ice-track seed 9 and river-run seed 2814, and
accepted it.** Merge authorised on that judgement.

The change itself is [CONTENDER-ZOOM-1](CONTENDER-ZOOM-1.md) and [ZOOM-PACE-5](ZOOM-PACE-5.md). This
report carries only what a ship can.

---

## 1. The fingerprints, measured on the ship tree

No `--cheap`. Every value matched the expectation stated in the brief, so nothing was minted on a
disagreement:

| role | before | on the ship tree | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved — RUN, not argued** |
| camera | `d7a8fe54072df6d7` | **`ff2bc42af377b5cf`** | **minted** |
| render | `d1c9d5d0da6a964f` | **`0d5854a652c69d87`** | **minted** |

**The branch tip is product-identical to `60fa2cb1`** — the five commits above it are diagnosis
reports and instruments and touch nothing under `client/`, verified with `git diff --name-only`. That
is why the values measured at the tip match those measured at `60fa2cb1`.

## 2. What shipped, and the one thing that is easy to get wrong

The framed set stops being `ordered.slice(0, 2)`. **Detection and duration did NOT change** — the
gate still enters on the top two, and `_photoFinishContendersHome` still waits for the leading two.
That separation is load-bearing: letting the framed set decide when the shot ENDS stretched the photo
finish by 85% (7441 → 13756 frames) and produced 59 empty frames.

**The corridor cap and the contender set ship as ONE feature**, and the reason is measured rather
than aesthetic: priced apart, the cap costs nothing — 3.4% contenders-not-whole with it nulled
against 3.4% with it arriving, and empty frames 46 → 35. A second key would buy a switch nobody has
a reason to throw.

## 3. Five diagnosis reports ride along, three of them recording my own errors

ZOOM-PACE-1 through -5 and EDGE-SLICE-1/-2 are merged with the change. Three record attributions that
measurement later overturned — the state step, the anchor step, and "the racer behind the leader" —
and they are kept deliberately. The single most reusable line in them: **`_binding` named the argmin
over `_ceilings` while the corridor cap was applied afterwards, so it reported the wrong authority on
every frame the cap decided the shot.** That one defect produced three wrong causes and two no-op
builds before it was found, and it is fixed in this ship.

## 4. CI

Filled in from the remote after the fact rather than pre-filled — a report that names a run id before
the run exists is not evidence of anything. **And the first two runs were RED**, which is the part
worth recording.

| head SHA | run id | result |
| --- | --- | --- |
| `dcb8d62d` — the merge + mint | 31821186931 | **failure** |
| `a2cb638b` — re-measured, still mis-stamped | 31821920004 | **failure** |
| **`7b28c540`** — re-stamped | **31822025984** | **success** |

**What was red, and it was mine.** `check-measured-stamps` failed: the tracking-lag stamp in
`docs/CAMERA_DIRECTOR.md` named `b15b5107` while `client/src/modules/camera/` had changed at
`60fa2cb1` (ZOOM-PACE-5). Re-measured on master, exactly one row moves — PHOTO_FINISH median
**5.06 → 5.33 pp**, p95 **26.61 → 26.85**, on an unchanged 1865 frames; every other state identical
to the digit and pooled unmoved at 4.64. The corridor cap now arrives over 1500 ms rather than in one
frame, so the shot spends longer moving and the camera trails it for more of it.

**Why local verification did not catch it, stated so it is not repeated.** `npm run verify` ran while
the camera change was still UNCOMMITTED. In that state the guard prints its PENDING line — a
**report, not a failure** — and the run reads green. The stamp went stale the moment the change was
committed. The guard's own header warns about exactly this path; the PENDING line IS the warning and
it has to be acted on before the commit. I read it and did not.

**The second run was red for a smaller reason:** `a2cb638b` re-measured the numbers but left the
stamp naming the old commit, so freshness was still violated by a tree that was in fact fresh. Fixed
at `7b28c540`.

**Master was red for the length of those two fixes** — a cost of merging on a green *local* run, and
recorded rather than smoothed over. The shipped BEHAVIOUR never moved: both fixes are documentation.
