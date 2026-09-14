# GAP-CEILING-BASELINE-1 — a gap ceiling already exists, it fired in his race, and it is not a brake

**Branch** `night/2026-09-12b` · **REPORT ONLY — nothing built, nothing changed, nothing recommended.**
Instruments in `C:/tmp`, outside the repository.

★★ **THIS IS NOT GAP-CEILING-1. THAT BRIEF NEVER ARRIVED.** What arrived was an addendum to it. There
is no GAP-CEILING-1 in `reports/`, in `docs/`, or anywhere in the tree, so the ceiling's intended
shape, trigger and permitted levers are unknown here and **nothing was built.** What this report
contains is the part of the addendum that is design-independent: **the BEFORE baseline any ceiling
would be judged against**, plus two findings that bear on what such a ceiling should be.

★ **THE OWNER, 2026-09-13** (rendered in English, attributed and dated, per the language rule): he
does not mean the finish — he means **during the race**. A racer who runs far ahead and is then braked
hard does not look natural; one who takes the lead only narrowly and then slowly falls back looks much
more natural.

★ **READ-ONLY ON HIS DATA.** One `GET /api/races/QN3HDP`; nothing created, altered or deleted. Two
COPIES of the payload were made for diagnostics and deleted afterwards.

---

## 1 · ★★ THE SEQUENCE, FOR `QN3HDP` — RANK, GAP AND PACE ON ONE TIMELINE

He watches a sequence, not an aggregate. Breeze, drawn 2nd, from the start line to the flag.

| ms | progress | lap | rank | gap behind (w) | % race | commanded | realised | at the floor? |
|---|---|---|---|---|---|---|---|---|
| 16 | 0.000 | 1 | 9 | 0.000 | 0.000% | 1.1000 | 1.0000 | |
| 9 472 | 0.115 | 1 | 15 | 0.006 | 0.041% | 1.1000 | 1.1000 | |
| 21 312 | 0.270 | 1 | 18 | 0.008 | 0.035% | 1.0994 | 1.0994 | |
| 33 136 | 0.424 | 1 | 15 | 0.011 | 0.045% | 1.0994 | 1.0994 | |
| 44 976 | 0.573 | 2 | 15 | 0.002 | 0.010% | 0.9797 | 0.9288 | |
| 54 448 | 0.687 | 2 | 16 | 0.066 | 0.227% | 1.0001 | 1.0001 | |
| 56 816 | 0.713 | 2 | 10 | 0.011 | 0.036% | **1.1000** | **1.1000** | |
| 59 168 | 0.738 | 2 | 3 | 0.001 | 0.004% | 1.0600 | 1.0996 | |
| ★ 61 536 | 0.771 | 2 | ★ **1** | 0.150 | 0.660% | **0.9494** | 0.9498 | |
| 63 904 | 0.803 | 2 | 1 | 0.259 | 1.140% | 0.9503 | 0.9503 | |
| ★ 66 272 | 0.833 | 2 | 1 | ★ **0.347** | ★ **1.528%** | 0.9505 | 0.9502 | |
| 68 640 | 0.860 | 2 | 1 | 0.215 | 1.074% | 0.9497 | 0.9501 | |
| 71 008 | 0.886 | 2 | 1 | 0.094 | 0.591% | 0.9503 | 0.9500 | |
| 73 376 | 0.913 | 2 | 1 | 0.035 | 0.146% | 0.9505 | 0.9502 | |
| 75 744 | 0.942 | 2 | 4 | 0.033 | 0.265% | ★ **1.0999** | 1.0522 | |
| 80 480 | 1.000 | 2 | 7 | 0.035 | 0.069% | 0.9998 | 0.9998 | |

★★ **HE IS NEVER AT THE FLOOR — NOT ONCE, IN THE WHOLE RACE, WHILE LEADING OR AFTER.** His commanded
multiplier while he leads is a flat **0.95**, and the moment he drops back it goes to **1.0999** —
he is **driven**, not braked, on the way down. ★ **"Then he is fully braked" is not what happens to
the racer he was watching.**

### 1.1 · ★ BUT HE IS RIGHT ABOUT WHAT HE SEES — HERE IT IS AS A SPEED

The servo is one of seven terms (`raceStep.js:106`). His WHOLE speed, and what it looks like on screen
against the racer behind him:

| progress | rank | gap (w) | ★ his speed `vt` | servo | ★ on screen, against the field |
|---|---|---|---|---|---|
| 0.72 | 6 | 0.037 | **1.249** | 1.100 | ★ **+303 px/s** |
| 0.74 | 1 | 0.054 | 1.244 | 1.095 | +282 px/s |
| 0.78 | 1 | 0.215 | 1.079 | 0.950 | +141 px/s |
| 0.82 | 1 | 0.343 | 0.972 | 0.950 | +50 px/s |
| 0.84 | 1 | 0.284 | **0.917** | 0.950 | ★ **−142 px/s** |
| 0.90 | 1 | 0.048 | 0.916 | 0.950 | −142 px/s |

★★ **A SWING OF 424 px/s** — from 303 faster than the field to 142 slower. **That is the "runs far
ahead and is then braked" he describes, and it is real.**

★★ **AND THE SERVO ACCOUNTS FOR NONE OF IT.** Between the gap opening (0.76–0.80) and after the peak
(0.84–0.90):

| term | while the gap opens | after the peak | ratio |
|---|---|---|---|
| his whole speed `vt` | 1.0785 | 0.9164 | ★ **0.8497 — a 15% fall** |
| ★ `trajectoryMult` (the servo) | 0.9499 | **0.9500** | ★ **1.0001 — IT DOES NOT MOVE** |
| ★ `spreadFactor` (his natural-speed draw) | 1.0813 | 0.9187 | ★ **0.8496 — the ENTIRE fall** |
| `governorMult` (the action stage) | 1.0000 | 1.0000 | 1.0000 |
| traffic (avoidance) | 1.0000 | 1.0000 | 1.0000 |

---

## 2 · ★★ THE CEILING ALREADY EXISTS. IT IS THE GAP-REROLL, AND IT FIRED

`spreadFactor` is re-drawn on a timer and eased to the new value (`raceCore.js:637-650`). The draw is
**gap-biased**: `computeGapBiasedTarget` (`racePlanner.js:1259`) pulls a leader's next speed sample
down when his gap exceeds a threshold. His race runs it: `gapRerollEnabled true`, `gapRerollMode
symmetric`, `gapRerollStrength 1`, `gapRerollThresholdLengths 0.5`.

★ **THIS IS MEASURED, NOT INFERRED.** `gapRerollDevMarker` is a config flag whose only effect is to
stamp `_gapBiasMarkAt` on the frame a draw was biased (`raceCore.js:633`). It was enabled **on a COPY
of his world**, and it moves nothing: the replay is still **40 of 40 positions and 40 of 40 finishing
times** identical to his stored record. Every re-roll Breeze had:

| at ms | progress | rank | gap behind | new speed target | from | ★ gap-biased? |
|---|---|---|---|---|---|---|
| 19 200 | 0.243 | 18 | 0.005 w | 0.9187 | 0.9187 | no |
| 30 272 | 0.386 | 14 | 0.011 w | 0.9850 | 0.9187 | no |
| 40 448 | 0.516 | 13 | 0.011 w | 0.9654 | 0.9850 | no |
| 52 320 | 0.664 | 16 | 0.021 w | **1.0813** | 0.9654 | no |
| ★ **64 368** | ★ **0.809** | ★ **1** | ★ **0.280 w** | ★ **0.9187** | 1.0813 | ★ **YES** |

★★ **THE GAME ALREADY BRINGS A RUNAWAY LEADER BACK, AND IT DID SO HERE — A 15% CUT TO HIS NATURAL
SPEED, TRIGGERED BY THE GAP.** What the owner is objecting to is not an absent ceiling. **It is the
SHAPE of the one that exists.**

### 2.1 · ★ WHY IT LOOKS LIKE A BRAKE: THE CORRECTION IS LATE AND IT ARRIVES IN ONE STEP

| | |
|---|---|
| he takes the lead | 59 472 ms (progress 0.742) |
| ★ the gap-biased re-roll can only fire at the next boundary | ★ **64 368 ms — 4.9 s later** |
| his re-roll intervals in this race | **11.1, 10.2, 11.9, 12.0 s** — so the wait can be twice that |
| it then eases in over `reRollTransitionDuration` | **3 s** |
| ★ the gap peaks and the speed finally turns | ★ **66 608 ms — 7.1 s after he took the lead** |
| the size of the step when it comes | ★ **1.0813 → 0.9187, a 15% cut** |

★★ **SO: THE GAP IS ALLOWED TO GROW FOR UP TO A FULL RE-ROLL INTERVAL BEFORE THE CORRECTION CAN EVEN
BE DRAWN, AND THEN ARRIVES AS ONE LARGE STEP.** Late and large is exactly what "runs far ahead, then
is braked hard" describes. ★ **The lever is the re-roll's TIMING AND GRAIN — not the servo, and not
either clamp.**

---

## 3 · ★★ THE BRAKING THAT FOLLOWS THE GAP — AND WHY THE ADDENDUM'S TEST CANNOT WORK

The addendum asks for the floor time after leading, and sets it as a success criterion: *if the
ceiling works, that number must fall too.* **Measured: in the window he is watching, it is already
zero.**

**Method.** 2 376 lead spells over 100 races on `wild`, N=40, ten tracks at their own default racer. A
LEAD SPELL is a contiguous run at rank 1 among active racers **with nobody yet across the line**.

| ★ lead taken AFTER progress 0.70 (237 spells) | spells | median floor AFTER | **p90** | ranks lost in 5 s | median lead |
|---|---|---|---|---|---|
| peak gap 0.00–0.05 w | 59 | ★ **0.0 s** | ★ **0.0 s** | 1 | 1.0 s |
| peak gap 0.05–0.15 w | 57 | ★ **0.0 s** | ★ **0.0 s** | 2 | 4.8 s |
| peak gap 0.15–0.30 w | 51 | ★ **0.0 s** | ★ **0.0 s** | 2 | 6.1 s |
| ★ peak gap 0.30 w and up | 70 | ★ **0.0 s** | ★ **0.0 s** | 2 | 8.1 s |

| lead taken BEFORE 0.70 (2 139 spells) | spells | median floor AFTER | p90 | ranks lost in 5 s |
|---|---|---|---|---|
| peak gap 0.00–0.05 w | 967 | **4.2 s** | 16.7 s | **8** |
| peak gap 0.05–0.15 w | 781 | 4.7 s | 16.7 s | 8 |
| peak gap 0.15–0.30 w | 289 | 2.7 s | 14.7 s | 7 |
| peak gap 0.30 w and up | 102 | **0.0 s** | 9.7 s | 4 |

★★ **NO RACER WHO LEADS LATE IS FLOORED AFTERWARDS — AT ANY GAP SIZE, INCLUDING THE p90.** The
"run far ahead, then get braked" pair is **not one fault measured as two; in the endgame it is not a
pair at all.** The floor time and the big gap belong to **different racers** — WILD-GAP-1 and
PURSUER-BRAKE-1 established that the floor in his race belongs to **Blitz**, the man behind, who is
being returned to his drawn place of 14th.

★★ **AND WHERE FLOOR-BRAKING AFTER A LEAD DOES HAPPEN — EARLY — IT GOES THE OTHER WAY.** The racers
who barely lead are braked **most** (4.2 s) and fall back **fastest** (8 ranks in 5 s); the racers who
run furthest ahead are braked **least** (0.0 s) and fall back **slowest** (4 ranks in 5 s).

> ★★ **SO THE ADDENDUM'S TEST — "the floor number must fall too" — CANNOT BE MET BY ANY CEILING,
> BECAUSE IN HIS WINDOW IT IS ALREADY 0.0 s.** A ceiling that reduced it would have to find braking
> that is not there. **Stated before the piece is built rather than discovered after it.**

---

## 4 · ★ HOW THE RETURN LOOKS — "SLOWLY FALLING BACK", GIVEN A NUMBER

The owner's description of what natural looks like is *takes the lead only narrowly, then slowly
falls back.* Both halves now have numbers, and they do not go together the way the sentence assumes.

| ★ ranks lost after the lead ends | 1 s | 3 s | 5 s |
|---|---|---|---|
| ★ **Breeze in his own race** (gap 0.349 w, led 14.6 s) | **2** | **3** | **4** |
| late spells, narrow lead (0.00–0.05 w) | — | — | **1** |
| late spells, big lead (0.30 w+) | — | — | **2** |
| early spells, narrow lead | — | — | **8** |
| early spells, big lead | — | — | **4** |

★ **BREEZE FALLS BACK AT ABOUT ONE RANK PER SECOND AND KEEPS FALLING — 2, 3, 4 ranks — ending 7th.**
He passes through the field rather than dropping through it: he is **driven at 1.0999** on the way
down, not braked.

★ **AND THE NARROW-LEAD PATTERN HE CALLS NATURAL IS, LATE IN THE RACE, THE ONE WHERE ALMOST NOTHING
HAPPENS: 1 rank in 5 seconds.** Whether that reads as "slowly falling back" or as "nothing to watch"
is a judgement about the picture, and **it is his to make, not this report's.**

---

## 5 · WHAT THIS LEAVES FOR GAP-CEILING-1

Stated as findings, not recommendations, because the brief is not here:

- ★ **A gap ceiling exists and works** — it took 15% off the leader's natural speed in his race.
  **Anything built should start from what it already does, not from zero.**
- ★ **Its fault is grain and latency, not absence**: it cannot act until the next re-roll boundary
  (10–12 s in his race, a 4.9 s wait) and then moves the racer's whole natural speed in one 15% step
  eased over 3 s — **7.1 s from the lead being taken to the speed turning.**
- ★ **The servo is not the lever.** Its commanded value is flat at 0.95 through the entire episode and
  goes to 1.0999 on the way back down. Neither clamp number is implicated.
- ★ **The floor is not the lever either**, and the proposed success criterion tied to it is already 0.
- ★ **Taking the lead stays wanted**, and nothing here argues otherwise: the 0.30 w+ late spells are
  the LONGEST leads (8.1 s median) and the ones a viewer has time to see.

---

## 6 · CHECKS

★ **NOTHING IN THE REPOSITORY WAS TOUCHED.** Instruments are `C:/tmp/lead-and-brake.mjs` and
`C:/tmp/wild-gap.mjs`; every output went to the scratch directory. The four fingerprints therefore
cannot have moved — the values measured in HARNESS-WORLD-1 against a worktree at `85262b1b` stand
(world `b35cf477c09a1116`, world-off `19ccb497041a0dae`, camera `3df640a42e934312`, render
`6a84085e79535dd6`).

★ **The dev-marker run was verified inert**: with `gapRerollDevMarker` on, the replay of `QN3HDP` is
still 40 of 40 positions and 40 of 40 finishing times against his stored record.

**`git stash` was not used. `--no-verify` was not used. Nothing was minted.**
