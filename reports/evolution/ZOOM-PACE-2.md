# ZOOM-PACE-2 — he is right about which phase, and I was measuring the wrong thing

**Branch:** `feat/contender-zoom` @ `24cd7c8f`. **DIAGNOSIS ONLY — nothing changed, nothing minted,
4173 untouched.** Corrects [ZOOM-PACE-1](ZOOM-PACE-1.md), which is left as written (append-only).

**The owner's alternative reading is CONFIRMED and mine is REFUTED.** He places the standing-still
close to the wide opening; that is phase 1, and it is the only phase in the endgame that a viewer
could mistake for a static frame. What I called the stall is, on screen, one of the busiest stretches
of the whole sequence.

---

## 1. The six phases in terms a viewer would use

**Zoom per second is not what an eye judges.** Two things are: how much world is in shot, and how fast
the picture slides and swells underneath you. `flow` below is the screen speed of the world point at
the frame centre — it captures pan and zoom together. `shrink/s` is the logarithmic rate of the
visible width, which is how scale change is actually perceived.

| # | ms | zoom | world width (px) | **shrink/s** | **flow px/s** | reads as |
| --- | --- | --- | --- | --- | --- | --- |
| 0 | 1083 | 4.51 → 1.50 | 682 → **2048** | +1.015 | 426 | the shot throws open |
| **1** | **3583** | 1.48 → 2.35 | 2077 → 1306 | **−0.129** | **95** | **all but motionless** |
| **2** | **467** | 2.44 → **9.50** | 1259 → **324** | **−2.912** | **565** | **a leap** |
| 3 | 2283 | 9.50 → 8.96 | 323 → 343 | +0.026 | **306** | zoom still, **picture racing** |
| 4 | 1017 | 8.98 → 16.97 | 342 → 181 | −0.626 | 378 | fast |
| 5 | 1967 | 17.05 → 17.06 | 180 → 180 | 0.000 | **462** | zoom frozen, **picture racing** |
| 6 | 2783 | 17.00 → 4.59 | 181 → **669** | +0.471 | 497 | the pull-back |

## 2. Which phase he means — and I named the wrong one

**Phase 1.** It is the only phase where BOTH measures are near zero: **95 px/s of screen flow and
−0.129 shrink/s, held for 3.6 seconds** — and it sits immediately after phase 0, where the shot opens
to its widest of the entire endgame (2048 px of world, 3× the ordinary shot). That is exactly where he
places it: next to the opening that makes the finish line visible. **Phase 2 follows immediately at
565 px/s and −2.912 shrink/s.** Crawl, then leap.

**What I called the stall — phase 3 — is not one.** Its zoom is nearly constant, which is what I
measured, but its screen flow is **306 px/s, more than three times phase 1's**, because the camera is
panning hard to hold racers at a tight zoom. Phase 5 is worse still at **462 px/s**. Both look
motionless in a table of zoom rates and are among the busiest things on screen.

**So there is ONE stall, not two, and it is phase 1.** I named phase 3 in ZOOM-PACE-1 because I
segmented by zoom rate; that was the wrong instrument for the question and this is the correction.

## 3. What binds during phase 1 — and it IS the same rule

He finds it implausible that the rule which opens the shot to 1.5 is later the thing holding at 9.
**It is, and it is one monotone curve.** The run-in ceiling across the endgame:

| leader progress | 90.0% | 92.1% | 94.1% | 96.1% | 97.7% | 98.8% | 99.9% | 100.6% |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| run-in ceiling | **1.2** | 1.5 | 2.0 | 2.3 | 3.8 | 6.7 | 29.0 | **∞** |

It opens the shot at 1.2, climbs almost imperceptibly through the first two-thirds of the window —
**1.2 to 2.3 across six points of progress, which is phase 1** — and then goes near-vertical in the
last two: 2.3 → 3.8 → 6.7 → 29.0 → released. **The flat part and the leap are the same curve.**

## 4. The trigger, precisely — and it is not what ZOOM-PACE-1 concluded either

At the frame the crawl ends, the binding term is `line` on **both** sides:

| progress | state | target | binding | stateZoom |
| --- | --- | --- | --- | --- |
| 0.968 | LEADER_ZOOM | **2.40** | line | 9.10 |
| 0.971 | PHOTO_FINISH | **9.95** | line | **17.06** |

**The run-in ceiling itself steps 4.1× in one frame**, with no change of binding term. So this is
neither an argmin corner (the term does not change) nor the state term taking over (it never becomes
the minimum here). **The state's zoom steps 9.10 → 17.06 at the state change and the run-in ceiling
is a function of it** — RUNIN-OWNS-1 by design bounds *whichever shot is running*, closing to that
shot's own zoom at the crossing. So the step propagates straight through the term that is binding.

ZOOM-PACE-1 said "state step, dominant" and that was right about the trigger and wrong about the
path: I reported the state term becoming binding, when in fact the state step is transmitted through
the run-in ceiling, which stays binding throughout. **That distinction decides where a repair goes.**

## 5. What the acceleration rule must fix first

His rule stands either way: where the target moves further in, the speed should rise gradually rather
than the camera stepping or stalling. **The measurement now says which phase it must fix, and it is
the 1→2 boundary.**

- **The stall is not a pause to be shortened — it is the flat foot of the run-in curve.** Any repair
  that only smooths the leap will leave 3.6 seconds of near-motionless picture in front of it.
- **The leap is not a rate problem in the camera — it is a discontinuity in the TARGET.** A rate limit
  on the delivered zoom cannot fix a target that steps, it can only lag behind it, which is the
  objection that closed the rate limit before.
- **Both are the same curve**, so the honest repair is to the run-in ceiling's shape and to what
  happens to it when `stateZoom` changes underneath it — not two separate fixes.

**Phases 3, 5 and 6 should be left alone.** Their zoom is flat or fast but their screen flow is
300–500 px/s throughout; nothing there reads as a stall, and ZOOM-PACE-1's option list treated two of
them as targets on the strength of a metric that does not describe what is seen.

---

**Nothing was changed. `feat/contender-zoom` still measures 3.2% contenders-not-whole, crossing zoom
median 99%, ice-track seed 9 and river-run seed 2814 both 0.0% / 0.0%. 4173 still serves `2adba27f`.**
