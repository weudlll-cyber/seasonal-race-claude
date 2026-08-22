# ENDGAME-WHO-AND-HOWMUCH — the two numbers, and you were right

**Branch:** `exp/endgame-schedule`. **Measurement only — no camera change, no rule change, no fix.**
Measured in the real browser on the production build, with the browser's own camera seed.

---

## 0. Lead — the two numbers

> **1 — HOW MUCH OF THE BAND IS VISIBLE, in the worst of the 244 frames?**
> **0%. Nothing of it.** But that is 14 frames out of 244. In the other 230 the answer is the one
> you expected: **204 frames show the WHOLE band**, and the median across all 244 is **100%**.
>
> So the guard IS stricter than your sentence — for 230 of the 244. **It is not stricter for the
> other 14, where the finish line is genuinely not on screen at all.** Those 14 are a real defect
> and the rest are the guard grading a margin this repository invented.
>
> **2 — WHICH RULE BINDS in space-sprint's last frames?**
> **The CONTENDER rule, not the company guarantee.** The company binds on **0 of 14**. The width is
> placed by the schedule on 9 frames and by the contender guarantee on 5 — and the thing that moves
> the FRAME on all 14 is the contender pair's own anchor.
>
> **And it selects a racer in FIFTH PLACE, 89 world px and about one second behind, who is slower
> than the leader and has already lost.** You are right: there is no conflict between your
> requirements here. There is a rule holding someone who cannot win.

---

## 1. A correction to my own last report, first

**VIEWER-INVARIANTS-2 said "every remaining frame is inside the canvas". That was wrong**, and it was
wrong because I inferred it from the region margin instead of measuring the canvas. **14 of the 244
frames have no part of the finish band on screen.** The number I should have measured is below.

---

## 2. Question 1 — how much of the band is actually visible

The 244 frames on space-sprint, seed 9, shipped defaults, that `check-runin-frame` counts as outside
its region:

| share of the finish band on canvas | frames |
| --- | ---: |
| **100% — the whole band** | **204** |
| 90–100% | 2 |
| 75–90% | 3 |
| 50–75% | 9 |
| 25–50% | 6 |
| 1–25% | 6 |
| **0% — none of it** | **14** |

**min 0% · median 100% · mean 89.1%.**
**Worst frame:** `i=5608`, progress **0.9973**, **0% of the band on canvas**, picture 0.956
corridors, PHOTO_FINISH, binding `state`.

**So the answer is both halves of your question and it matters which frame you are looking at.** For
230 frames the requirement is met — often with the entire band in shot — and the guard is measuring a
5% margin that is mine, not yours. For 14 frames, at 99.7–99.9% of the race, the line is simply not
there.

### The measurement was wrong first, and the sanity check is what caught it

The first run said the band was **1.49% visible on every frame** — including frames the guard
**passes**. 1.49% is exactly 3 of 201 samples, and a figure that is identical on passing and failing
frames is not a measurement of anything.

**Cause:** `shape.getPosition(t, lateral)` takes a **normalised** half-offset — `raceCore` calls it as
`getPosition(t, r.physicalY / 2)` with `physicalY ∈ [-1, +1]`, so the corridor edges are −0.5 and
+0.5. I sampled `(k/200 − 0.5) × trackWidthPx`, which walks a segment **300× the corridor width**.
Corrected to normalised units, the sanity check passes: the guard-PASS frames read **100.0%**.

> **THE SAME UNIT ERROR IS IN `check-runin-frame`, WHICH I WROTE IN VIEWER-INVARIANTS-1.** Its band
> sampler is `(k / BAND_SAMPLES - 0.5) * race.trackWidthPx`. **Its "OFF CANVAS" column is therefore
> not trustworthy** — it takes the best point of a line 300× too long, which is far more likely to
> cross the canvas than the real band. Every "0 OFF CANVAS" it has printed, including the ones my
> last two reports leaned on, is measured that way. **Not fixed here — this block changes nothing** —
> and it is the first item in §5.

---

## 3. Question 2 — who the camera is holding, and whether they can win

### 3.1 Which rule binds — measured, not assumed

On the 14 frames with no band on canvas:

| | |
| --- | ---: |
| width placed by the **schedule** (`state`) | 9 frames |
| width placed by the **contender guarantee** | 5 frames |
| width placed by the **company guarantee** | **0 frames** |

ENDGAME-WIDTH-1 found the company binding on every track, so it was worth checking: **here it binds
on none.** PHOTO_FINISH is a `GUARANTEE.PAIR` state, so both the width bound and the pan's anchor
come from the same pinned pair — the contender set — and the company guarantee never enters.

### 3.2 Whom it selects

The pair is pinned when the photo-finish shot begins and **never re-evaluated**:

| | frame | progress | pair | the second member |
| --- | ---: | ---: | --- | --- |
| pinned at PHOTO_FINISH entry | 5435 | 0.9703 | #10 / #38 | **rank 2**, 0.00198 T, **46 px** behind |
| … | 5467 | 0.9763 | #10 / #38 | rank 3, 0.00242 T, 53 px |
| … | 5592 | 0.9947 | #10 / #38 | rank 3, 0.00379 T, 79 px |
| at the crossing | 5627 | 1.0001 | #10 / #38 | **rank 5**, 0.00429 T, **89 px** |

**At entry the choice was defensible** — second place, 46 px. Over the remaining 3% of the race #38
drops to third, then fifth, and the gap doubles. The camera holds him the whole way.

### 3.3 Can #38 still win? No — measured against the race's own numbers

Rates taken from the race's own `t` series over the last 20 frames of the window:

| | t | rate (T/frame) | remaining to `finishT` | frames to the line |
| --- | ---: | ---: | ---: | ---: |
| leader #10 | 0.56903 | 8.865e-5 | **−0.00005** (already across) | — |
| **#38** | 0.56474 | **7.280e-5** | 0.00424 | **58.2** |

**#38 is slower than the leader** — 7.28e-5 against 8.865e-5 — so he is losing ground, not closing.
When the leader crosses, #38 is **58 frames (≈0.97 s) away**. Even at the leader's own rate he would
need 47 frames. **He cannot win, and he is not second: he is fifth.**

### 3.4 Too tight, or moved? — **MOVED, on all 14**

Decisive and threshold-free: `need` is the screen distance from the anchor to the nearest point of
the band; `room` is the distance from the frame's centre to the canvas edge along that direction.

| | |
| --- | ---: |
| need | **324 px** (316 on the last frame) |
| room | **360 px** |
| frames where `need > room` (**too tight**) | **0 of 14** |
| frames where a centred frame would hold it (**moved**) | **14 of 14** |

**The shot is wide enough on every one of them.** The frame is pointed somewhere else — at the
midpoint between the leader and a racer in fifth place — and that is what carries the finish line off
the canvas.

---

## 4. What this settles

**There is no conflict between your requirements.** My last report priced one — "the line inside the
region on every frame" against "the shot arrives at the leader-view or photo-finish factor" — and
that pricing was against the wrong cause. The line is not leaving the canvas because the shot must be
tight to arrive at its factor. It is leaving because the frame is centred on a racer who lost the
race a second earlier.

**What is NOT established:** whether the pinned pair is the only thing moving the frame on those
frames, or the largest of several. `need`/`room` says a centred frame would hold the band; it does not
prove the pair's anchor is the whole of the displacement. Measuring that means decomposing the pan
target the way VIEWER-INVARIANTS-2 decomposed the zoom, and this block did not do it.

---

## 5. The smallest change each answer implies — proposed, not built

1. **`check-runin-frame`'s band sampler is in the wrong units** (§2). One expression:
   `(k / BAND_SAMPLES - 0.5) * race.trackWidthPx` → `(k / BAND_SAMPLES - 0.5)`. Until that lands,
   its OFF-CANVAS column overstates how much of the line is on screen, and every verdict that rests
   on it — including this branch's current `verify` state — should be re-read afterwards.

2. **The photo-finish pair should stop being a subject when its second member can no longer win.**
   The pin exists for a reason — FINISH-PAIR-1 pinned it to stop the shot oscillating between the
   live top two, 5 changes down to 2 — so the proposal is *not* to unpin it. It is to let a member
   **drop out** when the race has decided him, which is a one-way test and cannot oscillate: a pinned
   member who is no longer within reach of the lead is released and the shot falls back to the leader
   alone. The race already answers "within reach": `_abreastContenders` uses one body length, and
   #38 is at **three** body lengths by the crossing (89 px against a ~28.5 px drawn body reference).
   **The measurement to run first** is how often that release would fire and on which tracks — it
   changes the shot at the most-watched moment of the race, so it is your eye that should judge it,
   not a number of mine.

3. **The 230 frames where the whole band is visible need no change at all** — they need the guard to
   grade your sentence, which after change 1 it would.

---

## 6. Nothing changed, and the tree says so

This block added **measurement instrumentation only**: fields in `client/src/modules/viewerProbe.js`,
which is inert without `?viewerprobe=1` and is reached only from `RaceScreen`'s rAF loop. No camera
rule, no threshold and no default was touched.

**No fingerprint can move, and all four were measured to confirm rather than asserted** — the
camera and render fingerprints are built headlessly through `raceDriver` and `renderRaceFrame` and
never reach `RaceScreen` at all.

| role | recorded | measured | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unmoved |
| world-off | `854018ee5d3d83e1` | `854018ee5d3d83e1` | unmoved |
| camera | `9190967072af639e`¹ | `9190967072af639e` | unmoved |
| render | `2e8eae1d5ef7c7be`¹ | `2e8eae1d5ef7c7be` | unmoved |

¹ the values VIEWER-INVARIANTS-2 measured and did not mint; `docs/fingerprints.json` still records
the pre-branch pair, as it should — nothing on this branch has been minted.
