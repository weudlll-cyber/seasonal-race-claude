# BRAKE-JERK-1 — why V1 and the gap brake jerk together: the hypothesis is ESTABLISHED, with three corrections, and the jerk is NOT visible

Branch `feat/gap-leader-brake`. Date: 2026-09-15. **Read-only: no shipped source changed, nothing
minted, nothing merged.** The owner's store was not opened. **No repair was built.**

---

## ★ THE SHORT ANSWER

The hypothesis carried into this part was:

> V1 makes the held value track the target exactly, so the brake's engage/release moves the
> multiplier by its whole 10% ceiling in one 16 ms step.

**It is established — the jump is real, reproduced to the digit, and owned by one line.** But three
parts of the sentence are wrong, and each changes what to do about it:

1. **It is RELEASE only, never engage.** Across 600 races and **333 brake engagements**, on both
   servos, **not one** moved the multiplier further than the shipped game's own largest single step.
   Engaging is smooth *by construction* ([racePlanner.js:933](../../client/src/modules/racePlanner.js#L933)).
2. **The cause is not the stale ease clock — it is the restart DECISION.** The clock was already
   stale at **59.3%** of brake transitions before V1 (N = 378). What V1 changes is that
   `_setTargetNoiseBlind` tests one quantity and writes a different one.
3. **★★ It is not visible.** The "7.6×" was measured on the trajectory multiplier. The multiplier is
   one factor of a product ([raceCore.js:698](../../client/src/modules/raceCore.js#L698)); in the
   units a viewer actually sees, the jump is **+16.35 world px/s**, which the shipped game already
   matches or beats on **1 racer-step in 139** (N = 51,943,283 windows) — and on searound, the very
   track it happens on, it sits **below that track's own 99th percentile**.

---

## B1 — FRAME BY FRAME AT THE LARGEST STEP

The largest single-step multiplier move in 300 races with V1 + brake: **searound, seed 26, step
3780, Raven — 0.089471**. That is PICK-WINNER-1's figure reproduced to the digit by an independently
written instrument, which also reproduced the shipped baseline exactly (median 0.011722, p90
0.011762, max 0.011762, N = 300).

Every column below is read from the racer object and from the controller's own
`getGapBrakeStats()`. **Nothing was instrumented inside the engine.**

### V1 + brake — the jump

| step | prog | gap px | eng | bind | strength | held | tgt | prev | start | elapsed | **world px/s** |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 3777 | 0.94947 | 166.11 | true | 36 | 0.088843 | 0.911157 | 0.911157 | 1.095234 | 49712 | 10720 | 166.50 |
| 3778 | 0.94973 | 166.01 | true | 36 | 0.088816 | 0.911184 | 0.911184 | 1.095234 | 49712 | 10736 | 166.51 |
| 3779 | 0.94999 | 165.92 | true | 36 | 0.088789 | 0.911211 | 0.911211 | 1.095234 | 49712 | 10752 | 166.51 |
| **3780** | **0.95025** | **166.09** | **false** | **−1** | **0** | **1.000682** | **1.000682** | 1.095234 | 49712 | **10768** | **182.86** |
| 3781 | 0.95054 | 166.25 | false | −1 | 0 | 1.000048 | 1.000048 | 1.095234 | 49712 | 10784 | 182.74 |
| 3782 | 0.95082 | 166.41 | false | −1 | 0 | 0.999859 | 0.999859 | 1.095234 | 49712 | 10800 | 182.71 |

★ **`held` equals `tgt` on every row**, because `elapsed` is 10,768 ms against a 1000 ms transition,
so [raceCore.js:590](../../client/src/modules/raceCore.js#L590) returns the target itself.
★ **`start` is 49712 on every row** — the ease has not been restarted for **10.7 seconds**.
★ **`prev` is 1.095234**, a value from 10.7 s ago. It plays no part.
★ **The trigger is the WINDOW END, not the gap closing.** `prog` crosses 0.94999 → 0.95025, past
`gapBrakeWindowEnd` = 0.95, and the brake returns at
[racePlanner.js:892-895](../../client/src/modules/racePlanner.js#L892-L895). **The gap is still
166 px — nearly twice the 90 px allowance.** The brake let go of a gap it had not closed.
★ **The move holds.** Speed stays at its new level on every following frame; this is a level change,
not a one-frame spike.

### The SAME event before V1 — the jump does not happen

garden-path seed 3, step 4240: the same window-end release, strength 0.0567, gap 154.69 px.

| step | prog | eng | bind | strength | held | tgt | prev | start | elapsed | world px/s |
|---|---|---|---|---|---|---|---|---|---|---|
| 4239 | 0.94984 | true | 38 | 0.056749 | 0.943251 | 0.943251 | 0.982553 | 66048 | 1776 | 133.15 |
| **4240** | **0.95007** | **false** | **−1** | **0** | **0.943251** | **0.975564** | **0.943251** | **67840** | **0** | 132.99 |
| 4241 | 0.95029 | false | −1 | 0 | 0.943252 | 0.975564 | 0.943251 | 67840 | 16 | 132.82 |
| 4242 | 0.95051 | false | −1 | 0 | 0.943255 | 0.975564 | 0.943251 | 67840 | 32 | 132.64 |
| 4245 | 0.95118 | false | −1 | 0 | 0.943317 | 0.975564 | 0.943251 | 67840 | 80 | 132.11 |

★ The target moves by **+0.032313** — a large move — and **`held` does not move at all.**
`_setTarget` set `prev` to the value held right now and `start` to now, so the ease begins from where
the racer actually is. The multiplier then crawls (0.943252, 0.943255, 0.943265 — `easeInOutCubic`
is 4t³ near zero) and the speed goes on falling smoothly: 133.15 → 132.99 → 132.82.

---

## B2 — THE DISTRIBUTION: ENGAGE / RELEASE / ELSEWHERE

10 tracks × seeds 1–30, both servos, brake on. A "transition" is a step on which the brake's command
started or stopped being the value actually obeyed (`bindingIdx`, the controller's own field).
"Over" means a single-step multiplier move larger than **0.011762**, which is a **derived**
threshold, not a chosen one: it is the largest single-step move the **shipped** configuration makes
in the same 300 races. **No number was invented for this part.**

| arm | engagements | **engage over** | releases | **release over** | median move | max move |
|---|---|---|---|---|---|---|
| servo today + brake | 189 | **0** | 189 | **0** | **0.000000** | 0.001616 |
| servo V1 + brake | 144 | **0** | 144 | **2** | 0.000297 | **0.089471** |

★ **0 of 333 engagements, on either servo, exceeds the shipped maximum.** The hypothesis's
"engage/release" is half wrong, and the reason is in the law: the entry seed is
`ceiling × clamp((smoothedGap − allowed)/allowed, 0, 1)`
([racePlanner.js:933](../../client/src/modules/racePlanner.js#L933)), and the gate that admits the
brake is `gapPx > allowedPx` ([:930](../../client/src/modules/racePlanner.js#L930)) — so at the
moment of engaging the gap has only just crossed the allowance, the bracket is about 0, and the
strength starts at about 0 and ramps. **Entering is continuous by design; leaving is not.**

### Where the two big moves are, and where they are not

Of the 144 releases under V1, **4 happen at or past the 0.95 window end**; 140 happen before it.

| release | move | strength just before | ease clock |
|---|---|---|---|
| ice-track / seed 20 | 0.000475 | 0.0511 | 7392 ms |
| luger-hill / seed 20 | 0.003011 | 0.0036 | 14208 ms |
| **mountainstreet / seed 5** | **0.058382** | 0.0841 | 12816 ms |
| **searound / seed 26** | **0.089471** | 0.0888 | 10768 ms |
| the other 140, all before 0.95 | med 0.000277, **max 0.001425** | med 0.0499, up to the full 0.1000 | — |

★ **Carrying full strength is not enough.** The 140 ordinary releases include ones at the full 0.1000
ceiling and none moves the multiplier past 0.001425. ★ **Reaching the window end is not enough
either**: ice-track seed 20 released at strength 0.0511 and moved 0.000475, because the leader's own
servo was by then asking for almost the same slowdown and the `Math.min` at
[racePlanner.js:1424-1427](../../client/src/modules/racePlanner.js#L1424-L1427) changed branch
without changing value.

★★ **The jump needs four things at once**, and this is why it is rare — 2 events in 300 races:
the brake is the obeyed value; it is obeyed by a **wide margin** over the servo's own command; it is
cut off **abruptly** (the window end, not the fade); and the ease clock is **stale**.

---

## B3 — WHICH MECHANISM OWNS THE JUMP

**One line owns it, and it is not the brake.**

`held` is a pure function of (`prev`, `tgt`, `elapsed`)
([raceCore.js:585-590](../../client/src/modules/raceCore.js#L585-L590)), so the move decomposes
exactly. At searound seed 26 step 3780 the recorded decomposition is:

| quantity | value |
|---|---|
| move in `held` | **0.089471** |
| move in `tgt` | **0.089471** — equal to every digit |
| move in `prev` | **0** |
| ease restarted | **false** |
| `elapsed` | 10,768 ms |

**The whole move is the target write.** Neither the ease's start point nor its clock moved.

### The two setters, side by side

```
racePlanner.js:733   function _setTarget(r, newTarget, elapsedMs) {
racePlanner.js:734     if (Math.abs(newTarget - (r.trajectoryMultTarget ?? 1.0)) > TARGET_EPSILON) {
racePlanner.js:735       r.trajectoryMultPrev = r.trajectoryMult ?? 1.0;
racePlanner.js:736       r.trajectoryMultTarget = newTarget;      // the write is INSIDE the gate
racePlanner.js:737       r.trajectoryMultTransStart = elapsedMs;
racePlanner.js:738     }
racePlanner.js:739   }

racePlanner.js:778   function _setTargetNoiseBlind(r, newTarget, detTarget, elapsedMs) {
racePlanner.js:779     const prevDet = r._servoDetTarget ?? 1.0;
racePlanner.js:780     if (Math.abs(detTarget - prevDet) > TARGET_EPSILON) {   // tests detTarget
racePlanner.js:781       r.trajectoryMultPrev = r.trajectoryMult ?? 1.0;
racePlanner.js:782       r.trajectoryMultTransStart = elapsedMs;
racePlanner.js:783       r._servoDetTarget = detTarget;
racePlanner.js:784     }
racePlanner.js:786     r.trajectoryMultTarget = newTarget;        // the write is OUTSIDE the gate
racePlanner.js:787   }
```

★ In `_setTarget` the target write **is inside the restart gate**, and the gate tests the value being
written. Target and clock therefore always move together, and the multiplier cannot jump: either the
ease restarts (`held` = `prev` = the value held right now, move exactly 0) or the target moved by at
most `TARGET_EPSILON`.

★ In `_setTargetNoiseBlind` the write at **[:786](../../client/src/modules/racePlanner.js#L786)** is
**outside** the gate, and the gate at **[:780](../../client/src/modules/racePlanner.js#L780)** tests
`detTarget` — a **different quantity**. `detTarget` is formed at
**[racePlanner.js:1446](../../client/src/modules/racePlanner.js#L1446)** as
`clamp(1.0 + gain * (error / nActive), minMult, ceilFor)`: the servo expression alone. **The brake's
contribution is not in it.** `newTarget` is `steerTarget`, the brake-folded value from
[:1424-1427](../../client/src/modules/racePlanner.js#L1424-L1427). So the brake can move the written
target by its whole authority while the restart gate sees nothing move.

### The invariant, and where it breaks — measured

> At every brake transition, either the ease restarts, or the target moved by at most
> `TARGET_EPSILON`.

| arm | transitions | **violations** |
|---|---|---|
| servo today + brake | **378** | **0** |
| servo V1 + brake | **288** | **17 (5.9%)** |

★ The shipped setter holds the invariant **perfectly** — including on releases whose target moved by
0.0338, 0.0323, 0.0235 and 0.0159, every one of which produced a multiplier move of **exactly
0.00000000** because it restarted. ★ **V1 breaks it.** 15 of the 17 violations are marginal (target
moves of 0.0010–0.0030); **2 are the jumps** (0.058382 and 0.089471).

★ **`_retargetInFlight` is exonerated.** Its comment at
[racePlanner.js:723-728](../../client/src/modules/racePlanner.js#L723-L728) claims it "cannot cause a
jump". That claim survives the test: it is on the *continuing-pull* path
([:1435-1437](../../client/src/modules/racePlanner.js#L1435-L1437)), both arms carry it, and the arm
that carries it without V1 has **0 violations in 378**. Both jumps are on the other branch.

---

## B4 — ★★ IS IT VISIBLE TO A VIEWER? NO

**This is the part that changes the decision, and it is a correction to my own earlier framing.**

The "7.6× the shipped maximum" that PICK-WINNER-1 used to fail every combined arm — and that
`docs/MORNING.md` repeats — is a ratio of **trajectory-multiplier** moves. The multiplier is one
factor of a product; what reaches the screen is the racer's speed
([raceCore.js:698](../../client/src/modules/raceCore.js#L698)). **Nothing in that chain measured
anything a viewer sees.** So I measured the speed itself.

### What the jump is, in world px/s

| | before | after | change |
|---|---|---|---|
| Raven's speed | 166.51 px/s | 182.86 px/s | **+16.35 px/s (+9.8%)** |

At the settled LEADER_ZOOM value of **225 world px per canvas width** (ZOOM-PER-STATE-1) on the fixed
1280-px canvas — 5.689 screen px per world px — that is **947 → 1040 screen px/s**, and the extra
distance covered in the frame of the jump is **0.262 world px = 1.49 screen px**.

### What the shipped game already does, every step, with no ease at all

Two factors in the same product are plain on/off switches, applied in one frame with no transition:

| mechanism | address | step it applies |
|---|---|---|
| drafting boost `1.04` | [raceCore.js:669](../../client/src/modules/raceCore.js#L669) | **+4.0% of speed in one frame** |
| avoidance brake `0.945` | [raceCore.js:676-678](../../client/src/modules/raceCore.js#L676-L678) | **−5.5% of speed in one frame** |

Over the same 300 shipped races (N = **51,991,283** racer-steps) these fire **161,245** drafting
onsets and **362,443** avoidance onsets.

### Where the jump ranks — the sustained change, measured the same way

A one-frame spike and a level change do not look alike, and the brake release **holds** (B1). So the
comparison is like for like: the sustained change across the same 7-frame window, for every racer,
in the shipped game (brake off, servo today), **N = 51,943,283 windows over 300 races**.

| track | p99 | p99.9 | max | **windows ≥ 16.35 px/s** |
|---|---|---|---|---|
| city-circuit | 16.77 | 42.26 | 65.81 | 1.051% |
| dirt-oval | 16.10 | 45.06 | 66.68 | 0.907% |
| garden-path | 14.02 | 40.63 | 58.89 | 0.800% |
| ice-track | 18.33 | 45.09 | 71.26 | 1.194% |
| luger-hill | 9.74 | 14.03 | 36.09 | 0.049% |
| mountainstreet | 9.73 | 41.60 | 70.27 | 0.259% |
| river-run | 8.25 | 36.41 | 62.83 | 0.238% |
| **searound** | **24.46** | 55.95 | **151.53** | **1.691%** |
| seatrack | 11.06 | 36.78 | 80.31 | 0.240% |
| space-sprint | 11.87 | 44.53 | 85.26 | 0.303% |

★★ **The jump is matched or exceeded on 372,716 of 51,943,283 windows — one racer-step in 139 — by
the shipped game itself.** ★★ **On searound, the track it happens on, 16.35 px/s is BELOW that
track's own 99th percentile (24.46) and is 9.3× smaller than what that track already does at its
maximum (151.53).**

**Conclusion: the 7.6× is real as a statement about the multiplier and misleading as a statement
about what anyone can see.** The multiplier is smooth by design, so any discontinuity in it is
enormous relative to the multiplier's own history while being ordinary relative to the speed it
helps produce.

**What I am NOT claiming.** That the jump is harmless. Two things this instrument cannot settle:

- **Exposure, not frequency.** The jump lands on the **leader at 95% race progress** — the racer the
  camera is most likely framed on, in the shot whose settled zoom is the tightest of the four. The
  51.9 M shipped windows are spread over all 40 racers, most of them in the pack and off camera. A
  rate per racer-step is not a rate per *visible* racer-step, and I have no instrument that says
  where the camera points at that moment — the camera is not deterministic from the race seed.
- **An eye is not a percentile.** "Inside the shipped distribution" is not the same as "a viewer
  would not notice", and only the owner's eye settles that.

---

## B5 — WHAT WOULD HAVE TO BE TRUE FOR THE TWO TO RUN TOGETHER

**A list, as required. Nothing here was built, and I am not recommending one over another.**

1. **The restart gate would have to test the value that is written.** `_setTargetNoiseBlind`
   ([:780](../../client/src/modules/racePlanner.js#L780) vs
   [:786](../../client/src/modules/racePlanner.js#L786)) would have to restart when the **non-servo**
   part of the written target moves — i.e. when the brake's contribution changes by more than
   `TARGET_EPSILON` — while still ignoring the servo's noise. ★ Note the trap: gating on
   `|newTarget − lastWritten|` alone would **undo V1**, because two noise draws differ by up to
   0.0016 against a 0.001 epsilon. The two tests would have to be separate.
2. **Or the brake's window end would have to fade instead of cut.** The natural exit at
   [:951](../../client/src/modules/racePlanner.js#L951) is bounded below `TARGET_EPSILON` **by
   construction** and never jumps; the window-end exit at
   [:892-895](../../client/src/modules/racePlanner.js#L892-L895) drops whatever strength it is
   holding. Making the second behave like the first would bound all four window-end releases the same
   way.
3. **Or the brake would have to decline to take authority it will have to drop** — not engage when
   it cannot fade out before `gapBrakeWindowEnd`.
4. **Or `_gapBrakeRelease()` would have to hand the racer back explicitly**, through a restarting
   write, rather than leaving the caller's setter to notice that the brake has gone.
5. **Or nothing changes and the abruptness bar is restated in the units a viewer sees.** On B4's
   evidence the pair may already be inside what the game does; that is a decision about the bar, not
   a repair, and it is the owner's.

★ **One untested sibling, named so it is not discovered late:** the brake also releases abruptly on a
**leader change** ([:919-925](../../client/src/modules/racePlanner.js#L919-L925)). That path has the
same shape as the window-end exit. It did not produce a jump in these 300 races, but I did not
isolate it, so it is **untested, not clean**.

---

## WHAT THIS DOES NOT SETTLE

- N = 300 races per arm (10 tracks × seeds 1–30, 40 racers, action stage `wild`), 600 races across
  the two brake-on arms. The jump is a **2-event** finding; a different seed range would move the
  exact maxima, not the mechanism, which is settled by the code-level invariant (0 of 378 vs 17 of
  288) rather than by the two extremes.
- Only the **1000 ms** rate window was measured here (the shipped derivation,
  `trajectoryTransitionDuration` × 1000, [racePlanner.js:414-416](../../client/src/modules/racePlanner.js#L414-L416)).
  PICK-WINNER-1's 200 ms arm reached 7.088× and is not re-measured in this report.
- The camera was not run. Every world-px figure is a world-px figure; the one screen-px conversion is
  against the settled LEADER_ZOOM value of 225 px per canvas width and is labelled as such.
- **Nothing was repaired**, as the part required.
