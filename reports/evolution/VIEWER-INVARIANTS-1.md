# VIEWER-INVARIANTS-1 — the 12% were not the excursion, and the instrument was why

**Branch:** `exp/endgame-schedule` @ `68a6ae6d`. **Not merged. Nothing minted.**
Production build served on **4173**.

---

## 0. Lead — the two things you asked for first

> **1 — WHAT THE 12% ACTUALLY WERE.**
> **Near-misses, all of them.** Taking last night's not-findable frames one at a time: 1106 frames on
> the shipped defaults and 1141 on your config, and in every single one the camera centre is **at
> most 0.40 track widths off the course spine** and **not one frame is empty of racers**. Zero
> excursions.
>
> **But neither half of the question was the right one, and I have to say the third thing plainly:
> the check did not count your excursion and it did not miss it — THE HEADLESS DIRECTOR DOES NOT
> PRODUCE IT.** The same race, same seed, same roster, measured through `raceDriver` reports a clean
> run. So the pan-lag story was not chasing an average instead of a defect; it was chasing an average
> **in an instrument that cannot see the defect at all**. That is worse, and it is the finding.
>
> **2 — DOES THE GATE FAIL ON SEED 9? YES.** In the real browser, on the production build, on your
> context — space-sprint, seed 9, your roster, Race Plan on, 100 racers:
>
> | | |
> | --- | --- |
> | frame **5308**, 93.29% of the race | **no point of the course is on the canvas.** Nearest 718 px outside. |
> | frame **5327**, 93.86% | **the leader is 2806 px outside the canvas**, at (−2608, −1035) |
> | | 20 frames with no course in shot, 54 with no leader — all inside the widen |
>
> That is your black frame, at the start of the endgame, where you said it was.

---

## 1. The rule this block establishes

**A PERCENTAGE CAN MAKE A CATASTROPHE LOOK LIKE A BLUR.** Twice in this thread now:

- ENDGAME-SCHEDULE-2's smoothness figure was green on a 5-frame **smoothed** series while your eye
  reported hopping. The event it averaged away was 0.2206 ln in one frame — 141 screen px.
- ENDGAME-REPAIR-1's "the line is findable in 88.0% of endgame frames" was a share standing in for a
  distribution nobody had looked at.

From here on, violations are **events**: seed, track, frame index, race progress, which invariant
broke and by how much. Shares are printed beside them as context and are never the verdict.
`scripts/viewer-invariants.mjs` will fail on **one** catastrophic frame in 800 races, and that is
deliberate — a run with one black frame is worse than a run with fifty near-misses, and no aggregate
says that.

---

## 2. The five invariants, and where every bound came from

None was chosen by running a sweep and keeping the value that passed. Where a bound is weak, it says
so instead of being quietly tightened.

| # | the sentence | the bound | where it came from |
| --- | --- | --- | --- |
| 1 | Some of the course is in the picture | **none** | Either a sampled point of the track spine projects inside the canvas or none does. A defect by inspection — the same standing `check-runin-frame` gives "no racer on screen", which is the half that actually caught FINISH-FRAMED-1. |
| 2 | The leader is in the picture | **none** | His own point is on the canvas or it is not. |
| 3 | Where the finish line is, is findable | `COMPANY_FRAME_PCT` = **0.9**, window [`endgameThreshold`, crossing] | This project's own constant for "in frame, near the edge is acceptable". Not 1.0 (the point sits on the edge, where the pan's lag takes it back out — recorded twice already) and not 0.7 (the subject's region, the 1.43× your requirement 4 rejects). Requirement 5's own window. |
| 4 | No frame changes the picture beyond a bound | width **> ln 2** in one frame; pan **≥ 1280 px** in one frame | The two lines ENDGAME-REPAIR-1's `wild-frame.mjs` already uses: "halves or doubles between two frames is not a camera move", and "a whole canvas width is not a pan". **Deliberately far looser than the smoothness budget** — 0.693 against the 0.0230 your eye was reacting to. This file is a floor beneath the framing measurements, not a replacement: it catches catastrophes and `endgame-spec.mjs` prices texture. |
| 5 | The width stays between a minimum and a maximum | tighter than the **photo finish's own factor**, or wider than the **world** | The tight end is a named shot. **THE WIDE END IS WEAK AND I AM SAYING SO:** "not wider than the world" is a sanity bound, because nothing outside the world exists to look at. It is the only wide-end figure in this repository that is not a framing preference. The observed maximum is reported so your eye can set a real one; I did not tighten it to make a run look better. |

---

## 3. How it runs, and why it had to be the browser

The gate drives the **production bundle in Chromium** and reads a probe fed by the **renderer's own
reported transform** (`frame.effZoomX/effZoomY`), not by anything re-derived. That is CAMERA-REPRO-1's
own rule for its marker: a probe that re-derives its numbers describes a frame that was never drawn.

**The headless path has now diverged from the screen three times**, and each time the headless side
was the blind one:

| | |
| --- | --- |
| CAMERA-SEED-AND-LINE-1 | every `raceDriver` harness takes a fixed camera seed; the browser derives it from the race seed |
| RENDER-FINGERPRINT-1 | the draw sequence was inlined in RaceScreen and could not be driven headlessly at all |
| **this block** | **the headless director reports zero frames off the course on the very race whose black frame you photographed** |

**Virtual time.** A race is ~90 s; the sweep is 800 of them. So `performance.now`, `Date.now` and
`requestAnimationFrame` are driven from one counter advanced by a fixed 1/60 s. Only the clock is
ours — the director, the framing rule, the renderer, React and the real bundle all run unchanged.
The fixed step is also what makes a run **repeatable**: at wall-clock 60 fps two runs of one seed
would differ, because the camera diverges on any frame-timing change, and a gate that cannot repeat
its own failure is not a gate. It is also what makes 10 races at once safe — contention costs
wall-clock and never dt.

**One thing I had to build around, stated because it is a constraint on the result:** the client's
API URL is baked at build time and defaults to `localhost:4000`, which on this machine is *your* API
with your data and your login. E2E-LOGIN-1 exists because a config once pointed at exactly that. So
the sweep runs against its own API on its own port with an empty data directory and a generated
account, and against a build whose only difference from the shipped one is that baked URL.

---

## 4. The term that put the camera off the course

During the widen `_lerpPhase` is **`glide`**, and that branch interpolates the pan **absolutely**,
from a start captured when the glide began to the current target.

That is correct while the glide owns **both** quantities — its two eases are one move, which is the
whole of `_beginRunInGlide`'s design ("pan and zoom on one ease, or the frame empties between them").

**ENDGAME-SCHEDULE-2 took the ZOOM away from it** and gave it to the schedule, for good reasons —
two authors on one quantity is what hopping looks like — **and left the pan easing from a start
captured at a zoom that no longer applies.** Nothing compensated. The FOLLOW branch carries
CAMERA-SIDEJUMP-1's zoom-about-the-anchor pivot; the glide has never had one **because it never
needed one**.

The frames, from the browser (`--dump`), space-sprint seed 9:

```
   i      p     corr      offX      offY     effZ    leadX   leadY  course
 5294  0.9286   1.33    -10345     -4725   3.2000      677     559    in
 5303  0.9315   1.44    -10315     -4726   2.9730      -65     278   OUT
 5308  0.9329   1.58    -10194     -4690   2.7081     -853     -89   OUT
 5321  0.9366   2.23     -9047     -4237   1.9089    -2454    -915   OUT
```

`effZ` falls from 3.20 to 1.91 while `offX` moves 1298 px — the shot widens on the schedule's curve
while the pan travels its own, and **the camera zooms about the world origin instead of about the
leader.** Everything slides off the frame between them.

**The fix is that same pivot in the form an absolute interpolation needs:** the zoom delta since the
*glide's own* start, applied to the *glide's own* start point, so the anchor's screen position is
held at `e = 0` and the glide still lands exactly on its target at `e = 1`. Same anchor expression,
same axes, no new number.

> **SCOPED, and the scoping is not caution — it is measured.** Applied to every glide it is a second
> correction on a move that is already right, and the director's own SIDEJUMP regression says so: it
> put the leader at **13.6% of the frame against that test's floor of 15%**. So it fires only where
> the defect is — the schedule authoring the zoom while this branch eases the pan. Outside that, the
> branch is byte-identical.

---

## 5. Violations per invariant, before and after — space-sprint seed 9, shipped defaults

The race whose black frame started this.

| invariant | phase | **BEFORE** | **AFTER** |
| --- | --- | ---: | ---: |
| 1 — course in shot | widen 0.90–0.95 | **20 frames, worst 718 px** | **0** |
| 2 — leader in shot | widen 0.90–0.95 | **54 frames, worst 2806 px** | **0** |
| 2 — leader in shot | racing 0.00–0.50 | 479 frames, worst 170 px | 479, worst 170 px |
| 2 — leader in shot | racing 0.50–0.90 | 446 frames, worst 498 px | 446, worst 498 px |
| 2 — leader in shot | close 0.95–1.00 | 24 frames, worst 239 px | 24, worst 239 px |
| 3 — line findable | close 0.95–1.00 | 248 frames, worst 345 px | 248, worst 345 px |
| 4 — step bounds | all | 0 | 0 |
| 5 — width band | all | 0 | 0 |

**Every count outside the widen is identical to the digit**, which is what "scoped" has to mean.
Camera suite **894 passing**.

---

## 6. The sweep, and every remaining violation as an event

**54 of 800 races** at the time of writing — ten tracks, both arms, your field sizes, ordered so seed
9 completes first on every track and arm. **55 s per race wall-clock at 10 at a time; the full 800 is
a measured 12.3 hours.** That is a nightly, and §8 says which subset is not.

| invariant | phase | frames | races | worst |
| --- | --- | ---: | ---: | ---: |
| **1 — course in shot** | **all** | **0** | **0** | — |
| 2 — leader in shot | racing 0.00–0.90 | 10809 | 25 | **1025 px** |
| 2 — leader in shot | widen 0.90–0.95 | 94 | 3 | 729 px |
| 2 — leader in shot | close 0.95–1.00 | 89 | 5 | 290 px |
| 3 — line findable | close 0.95–1.00 | 9163 | 48 | 345 px |
| 4 — step bounds | all | 0 | 0 | — |
| 5 — width band | all | 0 | 0 | — |

**Invariant 1 is clean on every frame of every race swept.** The black frame is gone.

### 6.1 What is left has one dominant cause, and it is not the one I fixed

Invariant 2's racing violations, by the camera state that was running:

```
  COMEBACK_ZOOM   5623        LEADER_ZOOM   149
  BATTLE_ZOOM     4994        LEAD_CHANGE    43
```

**10617 of 10809 are the two group shots** — and the three widen races that still fail are the same:
river-run seed 2 (77 frames, worst 729 px, COMEBACK_ZOOM), luger-hill seed 2 (7 frames, 117 px),
ice-track seed 1 (10 frames, 19 px).

> **INVARIANT 2 CANNOT BE MET AS WRITTEN, AND THIS IS THE ONE I AM STOPPING AT.** `COMEBACK_ZOOM`
> frames the racer coming back and `BATTLE_ZOOM` frames a battling group; `_focusAnchorRacer` returns
> null for both, and neither is under any obligation to contain the leader. So "the leader is in the
> picture" is not a bug report against those states — it is a **statement about what the camera is
> allowed to look at**, and that is your call, not mine.
>
> **By how much:** the leader is off the canvas on those states' frames by a median that is small and
> a worst of **1025 px** (luger-hill seed 9, 71.6% of the race, COMEBACK_ZOOM, picture 1.17
> corridors). If the answer is "a shot may leave the leader for a few seconds", the invariant needs a
> DURATION rather than a per-frame test, and I did not invent one. If the answer is "never", this is
> a real defect in two states and a much bigger block than tonight.

Invariant 3's 9163 frames are last night's known residual — the pan's tracking lag, unchanged by this
block and documented in ENDGAME-REPAIR-1 §4 with the three rejected attempts to pay for it with zoom.

---

## 7. Fingerprints, stamps, hygiene

Measured fresh on this build. **Nothing minted.**

| role | recorded | measured | |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | **unmoved**, as required |
| world-off | `854018ee5d3d83e1` | `854018ee5d3d83e1` | **unmoved**, as required |
| camera | `f64c2ae531f14253` | `2b1e89ba982de9d1` | moved — not minted |
| render | `7d553406f41ff176` | `5797bc7e1037fa01` | moved — not minted |

**Both measured stamps RE-RUN, both identical to the digit.** `tracking-lag` samples the TRACKING
phase and this change lives entirely inside GLIDE frames, so the two do not overlap by a single
sample — worth stating rather than assuming, given that the browser measurement that motivated the
change reports the leader 2806 px off the canvas on frames that table never looks at.
`straggler-truth` is unmoved for its own standing reason: the run-in's window closes at the first
crossing and phase 6 begins there.

---

## 8. `verify` versus a nightly

| | what | cost |
| --- | --- | --- |
| **`verify`** | `node scripts/viewer-invariants.mjs --gate` — space-sprint, seed 9, shipped defaults, one race | **~130 s** |
| **nightly** | `--seeds=1-40 --jobs=10` — ten tracks, both arms, 800 races | **12.3 h measured** |

The gate race is the right one for `verify` for a reason that is not convenience: **it is the race
that fails**. It carried the excursion, it is the seed you reported, and it is the seed every other
camera table in this repository already uses, so a row here can be laid beside a row there. A guard
whose one case has never been seen to fail is a guess; this one has been seen to fail and to pass, on
the same commit, either side of one change.

**It is NOT in `verify` yet.** Adding it means `verify` starts a server, builds a bundle and launches
Chromium, which is a change to what `verify` *is* — and that is a decision about the project's own
gate, not something to slip in at the end of a night. The command is there, it takes 130 s, and it is
one line in `scripts/verify.mjs` whenever you want it.

---

## 9. Attempt table

| # | tried | verdict |
| --- | --- | --- |
| 1 | Census the not-findable frames in the headless director | **answered the question**: 0 excursions, all near-misses, camera never > 0.40 TW off the spine |
| 2 | Look for the excursion on more seeds, headless | **not found** — the headless path does not produce it at all |
| 3 | Read the canvas pixels instead of instrumenting | **rejected** — "where is the finish line" is not answerable from pixels, and the leader is not identifiable |
| 4 | Wall-clock browser sweep | **rejected** — 15 h for one arm, and dt varies under load, so a failure could not be repeated |
| 5 | **Virtual clock in the page** | **kept** — real bundle, real browser, fixed dt, repeatable, parallel-safe |
| 6 | Point the sweep at the API on 4000 | **rejected** — that is his instance, with his data and his login (E2E-LOGIN-1) |
| 7 | **Glide pivot, unscoped** | **rejected** — a second correction on a move already right; SIDEJUMP regression 13.6% vs its 15% floor |
| 8 | **Glide pivot, scoped to the schedule-authored zoom** | **kept** — invariant 1 clean everywhere, widen excursion gone, every other count identical |
| 9 | Weaken invariant 2 to admit the group shots | **not done, deliberately** — reported as a design question with the numbers (§6.1) |
