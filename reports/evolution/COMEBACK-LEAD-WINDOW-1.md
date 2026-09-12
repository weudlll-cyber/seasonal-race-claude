# COMEBACK-LEAD-WINDOW-1 — he pulls away for about three seconds, and the delay is the slew

2026-09-12 · branch `night/2026-09-12b` · **REPORT ONLY. Nothing built, nothing changed, nothing
recommended. The instrument is in the scratchpad so the repository has nothing to move.**

★ **THE ANSWER IN ONE LINE.** From the moment he takes the lead the gap opens for **2.5 to 6
seconds**, peaks at a median **0.27% of race distance** — **0.06 of a canvas width**, though the worst
case is **0.65** — and is back under half that within **0.6 to 2.2 seconds**. ★ **The delay is the
servo's SLEW**, not the rank error building and not the 1/N authority: in the first second the servo
is already asking for **0.921** and the racer is still running **0.997**.

★ **AND COMEBACK-LEAD-GAP-1's 0.977 DID HIDE IT.** That was the median over the whole leading period.
Split, the first second is **0.9967** — barely a brake at all.

---

## 1 · WHEN HE TAKES THE LEAD

**Method.** 10 tracks × {20, 40, 60, 100} racers × 3 seeds; **56 races in which the held comebacker
reached the front**. Every frame from the takeover on. Finish order is `finishRank`
(`raceCore.js:671`), never a post-race `t`-sort.

| N | races | takes the lead at (median progress) | finishes (median) | drawn for (median) |
|---|---|---|---|---|
| 20 | 24 | **0.762** | 2 | 3 |
| 40 | 13 | **0.885** | 1 | 2 |
| 60 | 9 | **0.904** | 1 | 3 |
| 100 | 10 | **0.987** | 2 | 5 |

★ **He takes the lead LATE — after the 0.70 release in every case**, and later the bigger the field.

---

## 2 · ★ THE GAP FROM THAT MOMENT — WHERE IT PEAKS AND HOW FAST IT COMES BACK

Only frames in which he IS the leader. **Both measures, as the brief asked.**

| N | peak gap, % of race distance | ★ peak, CANVAS WIDTHS | time to the peak | time back under half the peak |
|---|---|---|---|---|
| 20 | 0.278 | 0.076 | **6.0 s** | **1.0 s** (23 of 24 came back down) |
| 40 | 0.292 | 0.070 | **2.8 s** | **0.7 s** (13 of 13) |
| 60 | 0.376 | 0.083 | **2.5 s** | **2.2 s** (8 of 8) |
| 100 | 0.055 | 0.015 | 3.3 s | 0.6 s (9 of 10) |

**Pooled:** peak **median 0.270%** of race distance, p90 **0.801%**, max **1.338%**.
**On screen:** **median 0.06 canvas widths**, p90 **0.30**, ★ **max 0.65**.

★ **SO IT IS A REAL EXCURSION AND A SHORT ONE.** The gap opens for a few seconds, and in **53 of 55**
races it is at least halfway back down within about a second or two.

**How the screen number is obtained, so it can be checked:** `CameraDirector.visibleWorldPx`
(`CameraDirector.js:540`) — the class's own "how much WORLD is in shot right now, in world px across
the SHORT axis", which its header calls the falsifiable form of the zoom. The canvas is a fixed
1280×720 store, so `gapScreenPx = gapWorldPx × 720 / visibleWorldPx` and the table divides by 1280.
★ **A hand-written `zoom × CW/worldWidth` was NOT used** — `CameraDirector.js:174` says open tracks
scale differently, and half these tracks are open.

---

## 3 · ★ HIS PACE, SPLIT — THE BRAKE TAKES HOLD SLOWLY

| window after taking the lead | frames | median multiplier | share below 1.0 |
|---|---|---|---|
| ★ **first 1 s** | 3 062 | ★ **0.9967** | 58% |
| first 2 s | 5 425 | 0.9913 | 62% |
| first 3 s | 7 568 | 0.9850 | 65% |
| 3–6 s | 4 405 | ★ **0.9753** | **75%** |
| after 6 s | 13 398 | 0.9795 | 71% |

★★ **IN THE FIRST SECOND HE IS ESSENTIALLY UNBRAKED** — 0.9967, three parts in a thousand. The brake
only reaches its working depth after about three seconds. **That is the window in which the gap
opens**, and it is exactly what a median over the whole leading period cannot show.

---

## 4 · ★ WHAT THE DELAY IS MADE OF — IT IS THE SLEW, AND HERE IS THE ADDRESS

The servo writes a **target**; `raceCore` eases the racer's actual multiplier toward it. Measuring
both separates the two.

| window | median TARGET the servo asked for | median ACTUAL the racer ran | ★ shortfall |
|---|---|---|---|
| ★ **first 1 s** | ★ **0.9206** | ★ **0.9967** | ★ **0.0761** |
| 1–2 s | 0.9497 | 0.9738 | 0.0241 |
| 2–3 s | 0.9500 | 0.9786 | 0.0286 |
| 3–6 s | 0.9596 | 0.9753 | 0.0156 |
| after 6 s | 0.9502 | 0.9795 | 0.0293 |

★★ **THE SERVO IS NOT SLOW TO DECIDE — THE RACER IS SLOW TO OBEY.** Within the first second the
target is already **0.921**, a strong brake. The racer is at **0.997**. The shortfall is **0.076** and
it collapses to **0.024** in the next second.

**NAMED, with its address:**

- ★ **THE SLEW IS THE DELAY.** `raceCore.js:552-559` eases `trajectoryMult` from its previous value to
  the new target with `easeInOutCubic(elapsed / TT_DUR_MS)`, where `TT_DUR_MS` is
  `trajectoryTransitionDurationMs` — `trajectoryTransitionDuration` seconds (`defaults.js:983`)
  × 1000. `easeInOutCubic` is *slowest at the start*, so the first fraction of that window delivers
  almost none of the brake. The measured shortfall profile is that curve.
- **THE RANK ERROR DOES NOT NEED TO BUILD.** It is a step: `rankError = currentRank − targetRank`
  (`racePlanner.js:847`) changes the instant he passes into first. The target being 0.921 in the
  first second is the proof — the error was already there.
- **THE 1/N AUTHORITY IS NOT THE BOTTLENECK HERE**, though it is real. `racePlanner.js:913` —
  `rawTarget = clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult)`. ★ **The brief cites
  line 891; the expression is at 913** (891 is inside the B2-attacker block). It does weaken the brake
  as the field grows, but at every size measured the target still lands near 0.92–0.95 immediately,
  so it is not what makes the first second slow.

---

## 5 · ★ THE CAMERA OVER THAT WINDOW

| | |
|---|---|
| zoom while he leads | **median 4.67×**, p10 1.42, p90 **15.61** |
| world in shot, short axis | **median 225 px** |

★ **The camera is zoomed in hard** — a median of 4.7× with only ~225 world px on screen.

★★ **AND YET THE PICTURE IS MOSTLY SMALL TOO, so the finding is NOT about the camera.** The brief's
test was: *if the race gap is small and the picture is large, the finding is about the camera*. The
race gap is small (**0.27%** of race distance) **and the median picture is also small — 0.06 of a
canvas width.** The two agree.

★ **WHERE IT IS NOT SMALL IS THE TAIL, and that is worth his eye.** At p90 the peak is **0.30 of a
canvas width** and at worst **0.65** — two thirds of the screen. So a race in the tail does look like
a runaway for those few seconds even though the distance gap is under one and a half percent. **That
is reported as a number, not resolved into a verdict.**

---

## 6 · CHECKS

### `npm run verify` plain

★ **No product source was touched by this piece** — it adds a report and an index line. The reds are
the ones already standing on this branch:

| guard | status | whose |
|---|---|---|
| `world-fingerprint`, `camera-fingerprint`, `render-fingerprint` | FAIL | DIRECTION-AUTHORITY-1, by design |
| `client-suite` | FAIL | the same **three RECORDED outcomes**; the live `real == sim` byte-identity passes |
| `check-runin-frame` | FAIL | DIRECTION-AUTHORITY-1's own red, luger-hill at 100 racers |
| `golden-races`, `check-fallback-agreement`, `check-ending-frame`, `check-measured-stamps` | ★ **PASS** | — |

★ **ONE RED WAS MINE AND IT IS FIXED**: `ceremony-counts`. `HISTORY-MISSING-2` added
`raceOverrun.test.js`, which imports an engine module and therefore joins the race hull — the
generated count in `docs/SHIP-CEREMONY.md` moved **193 → 194**. Regenerated with the command the
guard itself names (`gen-ceremony-costs.mjs --counts`); it is a GENERATED block, not a record edited
to make something pass.

★ **THE `t`-SORT ERROR WAS NOT REPEATED.** Every finishing position here is `r.finishRank`
(`raceCore.js:671`). The gap figures are read frame by frame DURING the race, where a `t` comparison
is the running order and is sound.

**`git stash` was not used. `--no-verify` was not used. No product source was touched by this piece.**

---

## 7 · WHAT IS OPEN

1. **Is three seconds of opening gap the picture he wants?** It is a real excursion and it closes by
   itself. Only he can say.
2. **The tail.** One race in ten peaks at a third of a screen width, the worst at two thirds.
3. **The slew is a shipped tunable** (`trajectoryTransitionDuration`). Nothing was changed and nothing
   is proposed; §4 only says that it, and not the error or the 1/N authority, is what the delay is.
