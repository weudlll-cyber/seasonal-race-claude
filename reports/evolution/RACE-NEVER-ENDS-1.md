# RACE-NEVER-ENDS-1 — no racer is stuck; the race clock cannot keep up with the wall clock

2026-09-12 · branch `night/2026-09-12b` · **STOP AND REPORT. Nothing built, nothing changed — the
fix is a trade only the owner can make, and §5 says why.**

★★ **THE PREMISE OF THE PIECE IS FALSE, AND THAT IS THE FINDING.** The brief asked which racers stall
and what holds them. **None of them stall.** Measured on all ten tracks at 32 racers: every race
completes with **zero unfinished racers**, needing **80–110 seconds of the race's own clock**.

★ **WHAT ACTUALLY HAPPENS IS THAT THE RACE RUNS IN SLOW MOTION.** His Ice Track race needed **97.4 s
of race time** and took **1590 s of wall clock** — a factor of **16.3**. The race was never stuck; it
was being advanced more slowly than real time, with nothing to bound how far behind it fell.

---

## 1 · NO RACER FAILS TO FINISH — MEASURED, NOT ARGUED

**Method.** The owner's own configuration — **32 racers, seed 3**, his Ice Track race's field size —
run headless on all ten tracks through the shared driver, which uses the same
`stepRacePhysics` the browser does.

| track | race clock to finish | unfinished racers |
|---|---|---|
| city-circuit | 98.5 s | **0** |
| dirt-oval | 110.3 s | **0** |
| garden-path | 91.8 s | **0** |
| ★ **ice-track** | ★ **97.4 s** | ★ **0** |
| luger-hill | 81.6 s | **0** |
| mountainstreet | 80.0 s | **0** |
| river-run | 81.8 s | **0** |
| searound | 85.2 s | **0** |
| seatrack | 81.2 s | **0** |
| space-sprint | 80.9 s | **0** |

★★ **THERE IS NO AVOIDANCE DEADLOCK, NO UNCOUNTED LAP AND NO GEOMETRY EDGE TO NAME**, because there is
no racer left behind to explain. **Every race ends on its own, everywhere, at every track.**

---

## 2 · ★ THE MECHANISM, WITH ITS ADDRESS — TWO CAPS THAT COMPOUND

The browser advances physics from animation frames, and **two separate caps limit how much race time
one frame may deliver**:

- `client/src/screens/RaceScreen/index.jsx:917` —
  `const rawDt = st.lastTs ? Math.min(ts - st.lastTs, 50) : 16;`
  ★ **a frame contributes at most 50 ms** to the accumulator, however long it really took. Its own
  comment says the cap is load-bearing: uncapped, a stall would fast-forward the race.
- `client/src/screens/RaceScreen/index.jsx:1059` —
  `while (st.physicsAccum >= FIXED_DT && _catchupSteps++ < 2)`
  with `FIXED_DT = 16` (`client/src/modules/raceCore.js:51`).
  ★ **at most TWO steps per frame — 32 ms of race time.** Its comment names what it is for: *"prevents
  the stall→many-steps→longer-stall death spiral that causes STATUS_ACCESS_VIOLATION at ~14 s under
  load."*

★★ **SO ONE ANIMATION FRAME CAN NEVER ADVANCE THE RACE BY MORE THAN 32 ms**, and the race keeps pace
with the wall only while the browser renders at

> **1000 / 32 = 31.25 frames per second.**

★ **BELOW THAT, THE RACE FALLS BEHIND AND NOTHING BOUNDS THE SHORTFALL.** At 20 fps a 90-second race
takes 140 s; at 10 fps, 280 s; at 5 fps, 560 s.

### ★ HIS RACE, PUT THROUGH THAT ARITHMETIC

| | |
|---|---|
| race time needed (measured, §1) | **97.4 s** |
| wall clock his race recorded | **1590 s** |
| slowdown | **16.3×** |
| race time delivered per wall second | **61.3 ms** |
| ★ implied frame rate, at ≤32 ms per frame | ★ **1.9 fps** |

★ **THE ARITHMETIC CLOSES EXACTLY**, which is what makes this the mechanism rather than a story: the
slowdown factor, the two caps and the implied frame rate are consistent to one decimal place.

★ **AND IT MATCHES WHAT THIS SESSION SAW INDEPENDENTLY.** HISTORY-MISSING-2 recorded a Quick Test at
20 racers running past **ten minutes** for a race the harness completes in about 96 s — the same
phenomenon at a milder frame rate.

---

## 3 · WHAT THIS MEANS FOR THE RACE THAT "NEVER FINISHED"

★ **It would have finished.** Left alone it needed its 80–110 s of race time; at a frame rate near
2 fps that is half an hour of sitting in front of it. **The viewer gave up before the race did**, and
because `RaceScreen` writes the history entry only at `finishedCount >= nRacers`, nothing was
recorded — which is HISTORY-MISSING-2's banner, already in the tree and already saying so.

★ **So the two findings join up**: the race is not broken, the clock is, and the silence was fixed
last piece.

---

## 4 · ★ WHY THE FRAME RATE IS THE REAL QUESTION, AND WHY IT IS NOT ANSWERED HERE

**1.9 fps is the number the arithmetic implies, and it is extreme.** What makes a browser render this
project at two frames a second — field size, effects, the branding logo, a machine under load, a tab
that has been open for hours — **is not measured here and is not guessed at**. ★ **It is a performance
question, and this repository deliberately keeps performance judgement to a production/Docker run
rather than a dev start.** Naming a cause without measuring it is the failure this chain keeps
catching.

★ **What would answer it:** the perf probe that already exists — `?perfprobe=1`, wired at
`index.jsx:909` — run on the production build at 32 racers on Ice Track. **That is the next piece, not
this one.**

---

## 5 · ★★ WHY NOTHING WAS FIXED — AND IT IS THE BRIEF'S OWN RULE

The brief: *if it is a defect that can be fixed, fix it; if it is inherent, stop and report.*

★ **A racer who cannot finish would be a bug. There is no such racer** (§1), so the thing to fix is
not the thing the brief expected.

★ **AND THE OBVIOUS LEVER IS LOAD-BEARING.** Raising the two-step cap is exactly what its own comment
forbids — it exists to stop a death spiral that crashed the tab at ~14 s under load. Raising it would
trade a slow race for a crashing one. ★ **THAT IS A CHANGE TO WHAT A RACE IS UNDER LOAD, AND IT IS
HIS DECISION**, precisely as the brief says.

★ **The alternatives, named and not chosen:**

1. **Leave it.** A slow machine shows a slow race; the banner already says the race is not saved yet.
2. **Raise the catch-up cap** — faster recovery, at the risk the comment documents.
3. **Cap the race and rank DNFs like the headless runner**, which `raceOverrunMs` already computes —
   the race would always end and always be recorded, and some racers would get a DNF place.
4. **Fix the frame rate**, which is the only option that removes the cause rather than its symptom —
   and which needs §4's measurement first.

---

## 6 · CHECKS

★ **NO PRODUCT SOURCE WAS TOUCHED BY THIS PIECE** — it adds a report and an index line. The reds
standing on the branch are carried forward and are named in ARRIVAL-VARIANTS-1: the world / camera /
render fingerprints against the record, `check-runin-frame` on luger-hill, and three client-suite
RECORDED outcomes whose live `real == sim` byte-identity passes.

**`git stash` was not used. `--no-verify` was not used.**

---

## 7 · WHAT IS OPEN

1. ★★ **Which of §5's four does he want?** Nothing is recommended.
2. ★ **Why two frames a second?** §4 — the perf probe exists and has not been run on this.
3. **`raceOverrunMs` and the banner are in the tree and end nothing**, by design; option 3 above is
   what would use them.
