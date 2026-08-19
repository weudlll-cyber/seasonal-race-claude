# STRAGGLER-TRUTH-2 — the instrument's window was wrong, and it is the only thing that was

**Branch:** `docs/ending-visibility-bisect-1`, off master `4f05c614`. **INVESTIGATION ONLY.** No fix
to the ending, no camera change, no timing touched. **The ending is correct — the owner tested it on
2026-08-22 — and this block is about why STRAGGLER-TRUTH-1 said otherwise.**

## THE CAUSE, IN ONE LINE

**Candidate 3 alone: the phase boundary.** The probe counted from the **winner's crossing** and took
its headline on the **first frame of FINISH_OVERVIEW** — both inside the shot that is still CLOSING
around the winner. Its arithmetic was right on every frame it sampled; it sampled the wrong frames.

## THE FOUR CANDIDATES, WITH THE VALUE EACH PRODUCED

Values are from the run that yielded the wrong conclusion: dirt-oval, 40 racers, seed 9.

**1 · WHO COUNTS AS UNFINISHED — CLEAN.** The probe uses `!r.finishRank`. `raceCore.js:667-673` sets
`r.finished = true; r.finishRank = ++st.finishedCount` **on the frame `r.t >= st.finishT`** — one
assignment, 1-based, no window in which a crossed racer is still unranked. On this closed track
`finishT = 2` and `t` is cumulative across laps, so "past the line on the final lap" is exactly
`t >= 2`. **In the reconciled frame: 26 finished, every one with a rank and `t ≥ 2.0007`; 14
unfinished, every one with no rank and `t ≤ 1.9925`.** A racer who has crossed but is still being
drawn counts as **finished**, which is correct. **No misclassification, at either field size.**

**2 · WHAT COUNTS AS THE CANVAS — CLEAN.** The probe tests `0 ≤ x ≤ 1280`, `0 ≤ y ≤ 720`.
`identity.canvasW/canvasH` is **1280 × 720**; the race canvas is a fixed 1280 × 720 store with no
DPR scaling, so canvas pixels and the drawn surface are the same number here. Screen positions come
from `cd._proj.toScreen` with **the zoom and offsets the director delivered** — the same numbers the
renderer consumes, not a reconstruction. **The reconciled frame is internally consistent**: the 26
finishers cluster at screen x 943–1196 (the right side, where the line is) and the six out racers sit
at −128 to −445, genuinely off the left edge. **No CSS-pixel confusion and no world-rectangle
confusion.**

**3 · WHICH FRAMES ARE THE PHASE — THIS IS THE CAUSE.** Measured on this run:

| moment | ms | what the shot is doing |
| ------ | -- | ---------------------- |
| winner crosses — **where the probe starts counting** | 106 600 | photo-finish / drama shot, tight on the winner |
| FINISH_OVERVIEW begins — **where the probe took its headline** | 108 383 | the pull-back **starts**; zoom still at its tightest |
| the pull-back's own duration is up | ≈ 111 300 | **the settled shot — what a viewer calls the ending** |
| last crossing | 114 133 | |

**"27 of 29 unfinished off the canvas" is a true statement about 108 383 ms** — the instant the move
begins, before the camera has opened or travelled. **"54–75% of frames"** spans a window that starts
1 783 ms before the move does, so most of those frames are the winner's own shot. Neither describes
the ending.

**4 · THE HARNESS — CLEAN for this question.** The **roster is real** (`resolveNameSet(DEFAULT_NAME_SET)`
is passed, which matters because a racer's name is physics and a nameless field runs a different
race). **Slow motion is on** (`{ slowmo: true }`), as the browser runs it. It builds from
`DEFAULT_CAMERA_CONFIG` while the owner may watch a stored config — **that can move the ending's
timings and therefore the boundaries above, but it cannot change who is finished or where the canvas
edge is**, so it is not what produced the wrong conclusion.

## THE DECIDING TEST — ONE FRAME, RECONCILED BY HAND

**dirt-oval, 40 racers, seed 9, at the midpoint of the phase as STRAGGLER-TRUTH-1 defined it
(110 367 ms).** `hud=FINISH_OVERVIEW`, zoom 7.5069, camera centre world (1429, 434).

| group | count | where |
| ----- | ----- | ----- |
| **finished** (rank 1–26, `t` 2.0007–2.0130) | **26** | **all 26 IN SHOT**, screen x 943 → 1196 |
| **unfinished, in shot** (`t` 1.9585–1.9925) | **8** | screen x 74 → 773 |
| **unfinished, off the left edge** (`t` 1.9332–1.9487) | **6** | screen x −128 → −445 |

**The picture holds 34 of 40 racers.** The six outside are the six furthest back on the course — the
ones no shot could hold while also showing the line. **This is "as many still-running racers as
possible", exactly as the owner describes it.**

## THE CAMERA DOES TRAVEL — the other half of his account, confirmed

Per frame, the camera centre's distance from the finish line during the pull-back:

| run | distance from the line, over the move |
| --- | ------------------------------------- |
| dirt-oval 20 | 13 → 68 → 183 → **301**, then held |
| dirt-oval 40 | 18 → 74 → 146 → **301**, then held |
| river-run 40 | 9 → 55 → 230 → **305**, then held |

**It moves about 300 world px further into the course** while the zoom opens roughly four-fold, then
settles on the lookback point. So the lookback point is where the move **ends**, not where the camera
sits throughout — it goes and gets the field first.

## THE INSTRUMENT — BEFORE AND AFTER, SAME RUNS

The window is now the **settled shot** — from `zoom-out began + finishOverviewZoomOutDurationMs`, the
config's own statement of when the move is over, to the last crossing — and it counts **every** racer
in shot, not only unfinished ones, because finishers running out past the line are most of the
picture. **The reported statistic is a MEDIAN, not a minimum**: the last frames are degenerate (one
racer left, the finishers already run out) and a minimum only ever finds them — the same class of
error one level down, caught on the way.

| run | BEFORE (as reported) | AFTER |
| --- | -------------------- | ----- |
| dirt-oval 20 | "11 of 11 unfinished off canvas"; minOn 0; 59% of frames | **unfinished in shot 5 of 5** |
| dirt-oval 40 | "27 of 29 off canvas"; minOn 0; 54% | **6 of 6** |
| river-run 20 | "6 of 7 off canvas"; minOn 0; 75% | **no settled frames — see below** |
| river-run 40 | "28 of 33 off canvas"; minOn 1; 56% | **7 of 7**, and **40 of 40** racers in shot |

**Every remaining still-running racer is in the picture, on every run that reaches its settled shot.
The instrument now agrees with the screen.**

**river-run at 20 racers reports zero settled frames, and that is a finding rather than a gap:** its
zoom-out leads the last crossing by 2.30 s, which is shorter than the pull-back itself, so **the
ending never reaches its settled shot before the race is over on that run.** The instrument says so
instead of averaging over a move in progress.

## WHAT WAS CORRECTED IN THE RECORD

- **`docs/ENDING-PHASES.md`** — a living document, corrected in place. **The MEASURED durations stay**
  (phase 6 lasts 4.45–7.53 s; the zoom-out leads the last crossing by 2.30–5.75 s; both numbers the
  document used to carry were wrong). **The interpretation goes**: the paragraph claiming the ending
  is not showing the racers it waits for is replaced by what was measured per frame.
- **STRAGGLER-TRUTH-1** — append-only, so the withdrawal is recorded in the INDEX's CORRECTIONS
  block, naming the sentences that go and the ones that stand.
- **The night's closing note** — its headline, *"the ending waits for people it has stopped
  showing"*, is **false as written** and is withdrawn in the same block.

**Nothing in the product changed, so no fingerprint can move.** The only non-document edit is
`scripts/straggler-truth.mjs`; the closure walk puts it inside none of the four instruments, and all
four reproduce the record.

## PROPOSALS

1. **A statistic taken at one frame must name the frame in its own column header.**
   `offScreenAtZoomOut` was honest in its variable name and misleading in a table, because a row in
   an ending report reads as a description of the ending. This cost two reports and an owner
   correction.
2. **Minimum is the wrong summary for any windowed count whose window ends in a degenerate state.**
   It happened twice in one instrument — once on the phase boundary, once on the tail — and both
   times the fix was to ask for the median instead. Worth a look at whether other instruments here
   report a bare `min` over a window that empties.
