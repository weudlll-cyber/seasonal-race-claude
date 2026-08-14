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

**PENDING at the time this file was written**, and filled in afterwards from the remote rather than
pre-filled — a report that names a run id before the run exists is not evidence of anything.
