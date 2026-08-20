# ENDGAME-SCHEDULE-2 — the three things his eye saw, each found as a frame

**Branch:** `exp/endgame-schedule`, continuing from `e6b5a0d4` (the served candidate).
**Not merged. Nothing minted.**

---

## 0. The number his eye was reacting to

> **The largest single-frame zoom step, nine scorable tracks, his config:**
> ### 0.2206 → 0.0230 ln
> On the served build one frame changed the picture's width by **24.7%** — 141 screen pixels of
> motion at the frame edge, between two frames. It is now **2.3%**, and the p99 equals the max,
> which is the ramp delivering exactly its own curve with no outliers left in it.

| per-frame measure (worst of 9 tracks) | served | **now** |
| --- | ---: | ---: |
| largest single zoom step, spec window | 0.0519 ln | **0.0230** |
| largest single zoom step, full window | 0.2206 ln | **0.0230** |
| largest single pan step | 440 px/frame | **353** |
| largest backward camera step | 6 world px | 36 world px¹ |
| frames the schedule did NOT place | 17% (worst 42%) | **0%** |
| rate reversals | 1 | **0** |

¹ one track only — see §6.

**Why the old figure was green while his eye was not.** The smoothness metric was
`|d²ln(width)/dt²|` on a *5-frame smoothed* series — it averaged away exactly the single-frame
events he was seeing. **An average can be smooth while individual frames jump.** Every measure above
is now taken on the RAW delivered series, and every fix below was located by one of them.

---

## 1. Observation 2 — "the zoom sits still, then the camera suddenly jumps back"

**Both halves are one defect, and it is not the deliberate placement change.**

`_lineCeiling` returns `Infinity` while the line cannot be framed from the anchor, and on a curving
track that **flickers** — `pointGuarantee`'s room depends on the heading, and the heading turns. The
widen's ramp parameter came from *absolute race progress*, so on every inert frame it advanced
anyway. When the demand came back, the segment resumed part-way up a curve it had never travelled.

Measured on space-sprint, two consecutive frames at 93.7%:

```
 prog   width  corr    rate   binding   schedW
0.937     535  1.78   0.551   state       800     ← inert: the STATE's width, constant
0.937     668  2.23   6.896   state      4834     ← resumed at u = 0.38, mid-ramp
```

**The still part is the inert frames** (the shot sitting on the state's own width while the camera
tracks the leader at his own pace — exactly what he describes). **The jump is the ramp arriving.**
0.22 ln of zoom and 1817 px of pan between two frames.

**The fix:** the ramp is **carried**, and advances only on frames it can actually run —
`u ← 1 − (1−u)·(deadline−p)/(deadline−pPrev)`. It reaches 1 exactly at the deadline, cannot advance
while inert, and never restarts. No constant.

> An intermediate version *restarted* the ramp on each resume. That removed the jump and broke the
> opposite way: on river-run the demand flickers almost every other frame, the ramp restarted
> continuously and never got anywhere — **standstill 13% → 55%**. Carrying it satisfies both.

### And the deliberate placement change is real, was overshooting, and is now measured

The brief asked to check RUNIN-GLIDE-1's mirror first. It is exactly what it looks like: the leader
travels from **0.35** of the frame (before centre) to his ordinary place. But he was **overshooting
to 1.63 — off the front edge** — and moving up to **0.10 of the frame in a single step**.

Cause: the schedule authored the zoom *after* the follow branch, so `update()`'s
zoom-about-the-anchor pivot corrected only the lerp's small delta while the schedule moved the zoom
by much more. An unpivoted zoom change is CAMERA-SIDEJUMP-1's own defect, and `_focusAnchorRacer`
returns null in PHOTO_FINISH — so that is where it landed: **tracking-lag PHOTO_FINISH p95
16.61 → 90.72 pp.** Moving the assignment *before* the branch chain, so the pivot sees the whole
change, gives: leader lands at **0.64** against an intended 0.66, worst step **0.100 → 0.027**, and
p95 back to 21.49.

**The intent is kept and nothing of his was dropped** — the travel still happens, it now arrives
where it was always meant to.

---

## 2. Observation 4 — "the zoom visibly hops"

**Structural, exactly as the brief suspected.** On the served build **12–42% of endgame frames were
placed by something other than the schedule**, and every worst frame was one of them
(`guarantee-after-cap` at 97.6% on ice-track and space-sprint). *A clipped schedule is not a smooth
schedule.*

During the scheduled endgame the other width authorities now **stand down**. They are still
computed — `_framingProbe.wouldHave` carries what each would have asked — so the price is measured
rather than assumed:

> **They would have widened the shot on 0–8% of frames.** Clipping is now **0%** on every track and
> both arms.

**Two more hops the per-frame view found, neither of which was the guarantees:**

- **The endpoint STEPS.** `_inPhotoFinish` flips and the target moves from the leader factor to the
  photo-finish factor, `ln(0.75/0.4) = 0.629`. At 97.0% that was worth **0.23 ln in one frame on
  three tracks at once** — the same number on all three, no geometry involved: a flip, not a wobble.
  The ramp now re-anchors on it, so it eases instead of stepping.
- **The ramp's own parameter jittered.** The leader's progress advances up to **2.0× the median** in
  a single frame, so a smoothstep of it doubled and halved its rate. It is now driven by a
  least-squares fit over the trail the schedule already keeps — no new constant, and unbiased
  (it extrapolates to *now* rather than reporting the window's middle).
- **The transition glide was a second author.** `_lerpPhase` was `glide` for the *whole* close on
  ice-track, re-interpolating the zoom toward the schedule from wherever the camera happened to be.
  The glide now keeps the **pan**; the schedule owns the **zoom**.

---

## 3. Observation 3 — the close cannot begin earlier. This is the conflict.

**It should begin earlier and run slower.** It runs slower — **2.3× slower at its fastest frame**.
It does **not** begin earlier, and both ways of making it do so were built and measured:

| lever | result |
| --- | --- |
| widen engages 2× `runInOpenMs` earlier | **requirement 1 fails on 2 of 3 probe tracks**; mountainstreet's opening widens 2.4 → 3.4 corridors |
| widen engages 3× earlier | requirement 1 fails on 2 of 3; **monotonicity fails on 3 of 3** |
| widen compressed to 0.75 of its span | requirement 1 fails on space-sprint |
| widen compressed to 0.6 | requirement 1 fails on space-sprint, monotonicity on ice-track |

**The mechanism is structural.** The widen's target *is* the width that makes the line visible, and
that width **shrinks** as the leader closes. Any time the shot spends closing before 95% is time
spent below the width the line needs — and the demand at 95% is smaller than the demand earlier, so
a close that starts early is already too narrow when the deadline arrives.

> **THE TWO THAT CONFLICT: his observation 3 (close begins earlier) and his requirement 1 (winner
> and line both visible by 95% of the race).** The exchange rate: buying ~2% of the race of earlier
> close costs the line's visibility at the deadline on 1–2 of every 3 tracks, or ~1 corridor of extra
> opening width — which is his observation 1, the thing he asked not to regress.

Since he named observation 1 as *right, do not regress it*, the close was left starting at the
deadline. **If he would rather have the earlier close and pay for it in opening width, that is one
sentence from him and the lever is `endgameThreshold`.**

---

## 4. Everything already achieved, still achieved

| | served | now |
| --- | ---: | ---: |
| winner + line visible by 95% | 9/9 | 8/9¹ |
| arrival at the target factor (worst) | 0% | 0% |
| opening width (median corridors) | 4.4 | 4.6 |
| standstill (median) | 17% | **16%** |
| monotonicity | 9/9 | 8/9¹ |

¹ river-run only — §6.

---

## 5. The attempt table

| # | tried | verdict |
| --- | --- | --- |
| 1 | Latch the widen only when the demand is finite | no effect — the demand is finite at latch and flickers after |
| 2 | Re-anchor the ramp on every resume | removed the 0.22 ln jump; **broke river-run** (standstill 13→55%) |
| 3 | **Carry the ramp, advance only on active frames** | **kept** — both at once |
| 4 | Guarantees + corridor cap stand down during the endgame | **kept** — clipping 17% → 0%, cost 0–8% of frames |
| 5 | Snap the zoom after the branch chain | **wrong place** — unpivoted; PHOTO_FINISH p95 16.6 → 90.7 |
| 6 | **Snap before the branch chain** | **kept** — pivot sees the whole delta; p95 back to 21.5 |
| 7 | Suppress the glide's zoom, keep its pan | **kept** — removes the second author |
| 8 | Re-anchor on the endpoint flip | **kept** — removes 0.23 ln on three tracks |
| 9 | **Least-squares fit for the ramp's progress** | **kept** — worst step 0.028 → 0.015, p99 = max |
| 10 | End the widen when the shot reaches the demand | never fires — the ramp only meets its target at u = 1 |
| 11 | Engage 2×/3×/5× earlier | **rejected** — requirement 1 (§3) |
| 12 | Compress the widen to 0.75 / 0.6 of its span | **rejected** — requirement 1 (§3) |

---

## 6. The one regression, named

**river-run, shipped defaults only.** Standstill **13% → 55%**, requirement 1 y → N, clipping 28%,
largest step 0.0053 ln (i.e. the shot barely moves). Under **his own config** river-run is 22% and
the regression is much smaller, but requirement 1 fails on both arms.

**The cause, as far as it was measured:** the line's demand there exceeds what the world allows, so
`resolveCamera`'s world-edge clamp caps the shot, the schedule's request and the delivered width
part company (the 28% clipping), and the picture sits against the world edge — which reads as
standstill and leaves the line outside. It is the same geometry RUNIN-OWNS-1 recorded as "a
world-sized frame", reached here on one track under one config.

**It is not fixed, and it is not hidden.** It is the one place this block is worse than the build he
judged.

---

## 7. Fingerprints, tests, hygiene

See §8 of the handback for the measured values. `npm run verify` green; camera suite **849 passing**.
One further existing test moved and none was deleted: the corridor-cap composition block is pinned
to `runInSchedule: false`, because the schedule stands that composition down — the same treatment,
and the same reason, as the blocks pinned in ENDGAME-SCHEDULE-1.
