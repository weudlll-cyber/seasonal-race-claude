# CAMERA-COMPANY-2 — the guarantee stops being over-cautious

Branch `camera-refactor`, three commits. Camera-only: **no simulation file in the diff**, no engine
ceremony, no fingerprint. Return tag `pre/company-2` (`cfd47cd5`), registered in
[TAGS.md](../../docs/TAGS.md) in the same step.

CAMERA-COMPANY-1 shipped the dramaturgical guarantee **correct in kind and too strong in degree**.
`innerFramePct` (0.7) and `reach` (0.66) multiplied, so a companion was allowed only **46% of the
frame chord**, and the owner's 40-racer break-away widened to 2.32 track widths where he asked for
1.0. His decision settles it: **visible with a margin is enough** — a guaranteed companion does not
have to sit inside the subject's safe region. A racer near the frame edge is not emptiness.

| commit | |
|---|---|
| `562c8110` | the companion margin — `COMPANY_FRAME_PCT`, not `innerFramePct` |
| `0ef84f77` | the room is measured, not assumed — `reach` becomes a ray-cast |
| `723e8d17` | the replay stands in the marked frame |

---

## 1. HIS TWO MOMENTS — before and after, in track widths

Dirt Oval, 40 horses, seed 5601, LEADER 1.0, company 5. Moment A is his marker
(`leader t 0.235445`); moment B is the 194 px / 1.49 TW moment, located in the same race at 7.20 s
(4th-cheapest companion 191 px, ceiling 1.49 TW — his numbers).

| moment | before | after commit 1 | after commit 2 | on canvas |
|---|---:|---:|---:|---:|
| **A** the marked frame (~219 px break-away) | **2.32 TW** | 1.80 | **1.75 TW** | 13 of 40 |
| **B** elapsed 7.20 s (~191 px break-away) | **1.49 TW** | 1.16 | **1.15 TW** | 15 of 40 |

He asked for 1.0. Moment A's 1.80 after commit 1 is exactly the bare geometry measured for "5 racers
on canvas" at that frame — the guarantee now buys what it needs and no more.

**The promise itself**, every frame of the race at his settings — kept **in the region it promises**:

| | before | after |
|---|---:|---:|
| 40 racers, company 5 | 96.3% | **97.1%** |
| 40 racers, company 3 | 98.3% | 98.3% |
| 20 racers, company 5 | 98.0% | 98.0% |

---

## 2. COMMIT 1 — the companion margin

`COMPANY_FRAME_PCT = 0.9`. `innerFramePct` is untouched and keeps doing its job for the subject and
for both geometric guarantees; only the company guarantee reads the new constant.

**Why 0.9, measured.** 5% of the frame each side is half a drawn body at the largest a body gets in
these shots: across his own race the drawn body is **6.65% of the frame height at the median and
9.50% at p95 and at maximum**, so half the worst case is 4.75% and 5% is the smallest round margin
that never cuts a guaranteed racer at the edge.

It is deliberately **not** sized for the tracking lag as well. Measured at the binding companion over
the same race, the live camera adds **0.00% extra overshoot past the edge** — median, p95 and max
alike — because the live zoom trails a *widening* target and is therefore never tighter than the shot
the guarantee sized.

A fraction of the frame, not pixels, per the standing rule. **Not a slider:** it is read off the
sprite size rather than chosen by taste, so if the sprite grows this gets re-measured. Say the word if
you want it exposed anyway.

---

## 3. COMMIT 2 — the room is measured, not assumed

The scalar `reach` was one number applied in every direction. Against the truth on his own frame:

| direction | true room / chord | scalar used |
|---|---:|---:|
| dead behind | 0.601 | 0.66 |
| behind-left (the binding one) | 0.591 | 0.66 |
| beside | 0.482 / 0.518 | 0.66 |
| dead ahead | 0.399 | 0.66 |

Over-generous everywhere, so it permitted a shot **tighter** than the room allows and delivered four
companions where it promised five. It is now a ray-cast: `roomFromPointAlong` measures from where the
anchor sits to the region edge along each companion's **own** direction, and `anchorScreenPoint`
states where that is — the same arithmetic the pan bias performs, written once so the guarantee and
the pan cannot disagree. The position is a fraction of the frame, so it is the same at every zoom and
the ceiling stays non-circular.

**A correction to the spec's premise, and it was my sentence that caused it.** I wrote that the scalar
"permits a shot slightly tighter than the room allows"; the spec read that as the *fix* making the
shot tighter. Fixing a defect that permits tighter normally means **widening**. Measured, it lands
tighter anyway (1.80 → 1.75 TW at moment A) because the ray to a *rectangle* from an off-centre point
exceeds 0.66 of the chord in the cheap directions. The conclusion was right; the reasoning was not.

**Tried and rejected, measured rather than argued.** Reading the anchor position back off the camera
the previous frame committed, so the world-bounds clamp would be included for free: the promise is
kept on **82.3%** of frames against **97.1%** for the rule's prediction. During a widening the live
zoom is tighter than the target, so the read-back over-states the room the finished shot will have and
the guarantee talks itself into staying tight. Not in the code; recorded here.

### The 0.601 and 0.518 are SEPARATE, and this does not explain them

They are the **world-bounds clamp** in `_setTrackTargets`, and at his marked frame it is provably
active: his leader is at world x **2853.8** on a 3072-wide world, and the frame's half-width there is
234 px, so the pan centre is clamped at **2838** and cannot travel far enough back to place him at
0.66. Reported and left alone, per the spec. It is also the residual behind the ~3% of frames where
the promise is not kept.

---

## 4. COMMIT 3 — the replay clock

**The step accounting was never wrong.** Traced step by step, the replay's leader is at t=0.235445 at
physics step 584 — the marker's value to six decimals. What was wrong is where the *witness* stood:
`st.racers` is mutated in place, the loop deliberately runs on for WINDOW more frames so the trace can
show what happened next, and everything downstream then read the field after that window.

That is the whole of the uniform +0.0028 lap: eight more frames of travel, the same for everybody.

| | leader t | racers matching |
|---|---:|---:|
| before | 0.238670 | 0 of 40 — REPRODUCTION FAILED |
| after | **0.235445** | **40 of 40** to 1e-4 — REPRODUCED |

Fixed by snapshotting the field at the hit; the trace still runs past it, which was the point.

**Worth keeping:** a **uniform** offset across the whole field is a clock or a reader problem; a
**scattered** one is physics. That distinction would have cost minutes instead of an hour.

The camera columns now DIFF on this marker (zoom 5.112 → 6.735) and that is correct — commits 1 and 2
changed the framing on purpose. The witness proves the world is the same; the camera columns show the
change.

---

## 5. THE DEFAULT, RE-MEASURED AT 40 RACERS

The CAMERA-COMPANY-1 tables were taken at 20 and understated his case: more racers supply a **longer
queue**, not closer company. At LEADER 1.0:

| track | n | minVis | median TW | p95 TW | revs/s | ALONE | <3 on canvas |
|---|---:|---:|---:|---:|---:|---:|---:|
| dirt-oval | 40 | 0 | 1.43 | 1.43 | 0.24 | **6%** | **7%** |
| dirt-oval | 40 | **3** | 1.43 | **1.45** | 0.26 | **1%** | **1%** |
| dirt-oval | 40 | 5 | 1.43 | 1.76 | 0.31 | 1% | 1% |
| dirt-oval | 40 | 8 | 1.43 | **2.32** | 0.37 | 1% | 1% |
| searound | 40 | 0 | 1.25 | 1.43 | 0.35 | 4% | 6% |
| searound | 40 | **3** | 1.29 | 1.43 | 0.72 | 2% | 4% |
| searound | 40 | 5 | 1.32 | 1.49 | 0.94 | 1% | 2% |
| searound | 40 | 8 | 1.42 | 1.98 | 1.35 | 0% | 1% |

**3 stays the default, and 40 racers strengthens the case rather than changing it.** With the
guarantee off, 40 racers make emptiness *worse* than 20 did (dirt-oval ALONE 0% → 6%) — bigger
break-aways, not more company. But the count itself should not go up: 3 already removes almost all of
it at a p95 shot of 1.45 track widths, and 8 costs p95 **2.32** — the exact over-wide picture this
block exists to fix. Searound is the one honest reason to raise it to 5: thin frames 4% → 2% for
+0.22 direction changes per second.

---

## 6. HYGIENE AND TESTS

**Nothing orphaned.** `reach` was a function parameter, not a config key, and its only caller moved
with it. `minRacersVisible` keeps its key, its control and its default; its justification comment now
cites the 40-racer measurement instead of the 20-racer one.

| file | before | after |
|---|---:|---:|
| `camera/framingRule.js` | 310 | **376** |
| `camera/frameGeometry.js` | 56 | **91** |
| `camera/CameraDirector.js` | 2725 | **2753** |
| `camera/framingRule.test.js` | 498 | **593** |
| `scripts/camera-replay.mjs` | 683 | 693 |
| `storage/defaults.js` | 723 | 727 |

**Tests — 6 new, including the failure proof the spec asked for.** A companion **beside** a
forward-framed anchor, where the scalar believed 0.66 of the chord and the frame gives 0.482: the
scalar permits the tighter shot, and at that shot the guaranteed racer is **out of frame**, while the
directional room keeps its promise. Plus: forward framing costing room *ahead* exactly as it gains
room *behind* (the scalar could state only one of those); the default being the companion margin and
measurably not the subject safe region, with the ratio pinned; a guaranteed companion never at the
edge; and a director-level test that counts the promise **inside the region** rather than merely on
canvas. **3408 green.**

**Simulation paths** treated as such and absent from the diff: `scripts/sim-fairness.mjs`,
`scripts/lib/**`, `scripts/exp-*.mjs`. Commit 3 touches `scripts/camera-replay.mjs`, which is a camera
tool — it drives `raceCore` to reproduce a marked frame and never feeds a fairness verdict.

---

## 7. THE OWNER'S EYE

**"At LEADER 1.0 with company 5, does the camera still open up when the leader breaks away — and does
it now open up only as much as it has to?"**

**Both changes pull the same way, so the shot will be noticeably tighter than what you just watched** —
at your marked moment, 2.32 track widths becomes 1.75, and at the 7.20 s moment 1.49 becomes 1.15.

1. **Watch the same break-away.** The camera should still refuse to go all the way to 1.0 — that part
   was right and stays. What should change is how far it goes: it should stop at the point where you
   can see the chase, not well past it.
2. **Check nothing gets cut at the edge.** The margin is half a drawn body at its largest, so a
   guaranteed racer should never be sliced by the frame edge. If one is, the margin is the number to
   revisit, and it is one constant.
3. **Company 5 is now cheap on Dirt Oval** (p95 1.45 track widths). If you want it on Searound too,
   5 buys a little there; 8 is what puts you back where you started.

Press **M** and send the **whole** line.
