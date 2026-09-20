# BREAKAWAY-ACTION-2026-09-20 — no arm wins, and stage 1 would have said one did

Branch `diag/breakaway-action-2026-09-20`, pieces 1 and 2. Date: 2026-09-20.
**MEASUREMENT ONLY. No engine source, no key, no default, nothing minted, nothing shipped.**

---

## ★★★ THE ONE LINE

> **No arm beats its control.** At N=300 the three `wild` arms sit within **1.4 px** of each other on
> the headline — 80.8 / 82.2 / 81.0 px — and every `quiet` arm is worse than the shipped control.
> Per the brief's own rule that is the result: no combined arm was run and no further lever was
> sought.
>
> ★★ **And stage 1 would have said otherwise.** At N=30 the `wild` row read **100.0 → 83.7 → 71.0**,
> a 29% improvement that looked like the answer. At N=300 it is flat. **The N=30 grid was noise**, and
> the only reason this report does not claim a winner is that the brief required the second stage.

---

## 1 · THE CONSERVATIVE READINGS TAKEN, AND WHY (as §K requires, at the top)

Three forks were met that no rule covered exactly. Each was resolved the conservative way and is
named here rather than buried:

1. ★★ **`sim-fairness.mjs` could not run this chain.** Timed, not estimated: **353 s for 2 races on
   one track** (~176 s/race) — tens of hours for eight arms. §D authorises the project's own
   functions instead, and they were used.
2. ★★ **The two gate routes did not demonstrably agree.** On one track, shipped control:
   `sim-fairness` **93.3%** band arrival against this harness's **85.0%**, three races each — and
   **not the same three races**, because `sim-fairness` draws random seeds at `--seed=0`. Eight
   points on 120 racer-slots is a handful of racers, so this is two small samples rather than a
   contradiction — but it is not agreement either. **Every band figure in this report is therefore
   labelled MY measure, not the project's gate.**
3. ★★★ **The start-row half of the gate is NOT MEASURED, and could not be.** `computeFairnessStats`
   needs `{ startRowIndex, finalRank }`; the live racer objects this harness drives **carry no
   `startRowIndex`** — checked, the only row-shaped field is `rawRowBonus`. That index is assigned
   inside `sim-fairness.mjs`'s own grid layout (`:1233`), which never runs on this path.
   Reconstructing it here would be re-deriving exactly what §D forbids. **Reported as absent rather
   than approximated.**

---

## 2 · ★★ THE HEADLINE WINDOW, AND WHY THE OBVIOUS METRIC WAS DISCARDED

The primary figure is the largest lead the leader holds inside **[0.70, finish]**, in world pixels,
**the same window for every arm**. Two alternatives were measured and rejected, both before the run:

★ **The whole-race maximum cannot separate these arms.** On the first smoke race four of six arms
returned an **identical 143.964 px**. It falls at progress **0.1518**, and `pulkStartFrac` is 0.15 —
it is the **CHAOS spread**, in a phase no arm touches (`governorPhaseWeight` is 0 outside
`[pulkStart, corrStart)`, raceGovernor.js:95). Reporting it alone would have shown four arms as
identical and called that a result. It appears once below, as context.

★ **An arm-relative window `[choreoOutcomeStart, finish]` is not comparable across arms.** It spans
0.40 of the race at cos 0.60 and 0.30 at cos 0.70, so a shorter window shows a smaller maximum **by
construction**. It is recorded in the data as `armWin*` and is deliberately not in the table.

Units are world px. A canvas-width figure would divide by the settled `LEADER_ZOOM` 225 and by no
per-frame zoom; that divisor once made a breakaway count read 71 of 100 where the truth was 20.

**Sampling is on the PHYSICS STEP** — positions and finished flags snapshotted before
`stepRacePhysics`, which is what the controller ranked and measured gaps on; never a `runRace`
callback, which can cover two physics steps and reads every gap one step late.

---

## 3 · ★★★ THE TABLE — ALL EIGHT ARMS

`cos` = `choreoOutcomeStart`. **w70** = the fixed [0.70, finish] window. Band figures are **my
measure** (§1.2); at N=30 they are an **indication**, at N=300 a verdict. The start-row gate is **not
measured** (§1.3) and has no column.

| arm | stage | levers | cos | N | **w70 med** | p90 | max | >56px | never reeled | w70 LC | whole LC | band % | B3 % |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **Q60** ★ **the shipped world** | quiet | 0.10/0.06 | 0.60 | 30 | **75.9** | 130.8 | 145.3 | 83% | 17% | 2.5 | 59 | 88.5% | 85.0% |
| Q65 | quiet | 0.10/0.06 | 0.65 | 30 | 101.0 | 147.7 | 230.6 | 87% | 37% | 2.0 | 60 | 88.0% | 87.0% |
| Q70 | quiet | 0.10/0.06 | 0.70 | 30 | 88.0 | 139.1 | 161.2 | 83% | 37% | 3.0 | 61 | 87.3% | 84.0% |
| **W60** control | wild | 0.15/0.12 | 0.60 | 30 | **100.0** | 137.7 | 151.1 | 80% | 23% | 2.0 | 63 | 89.5% | 86.7% |
| W65 | wild | 0.15/0.12 | 0.65 | 30 | 83.7 | 116.8 | 193.8 | 83% | 27% | 2.0 | 66 | 89.6% | 88.3% |
| W70 | wild | 0.15/0.12 | 0.70 | 30 | **71.0** | 133.7 | 158.2 | 83% | 27% | 2.0 | 67 | 89.3% | 86.7% |
| M60 | medium | 0.10/0.12 | 0.60 | 30 | 95.4 | 137.7 | 169.6 | 80% | 30% | 2.0 | 61 | 89.0% | 85.7% |
| D60 | (no stage) | 0.15/0.06 | 0.60 | 30 | 88.4 | 114.0 | 133.8 | 90% | 27% | 2.0 | 62 | 89.3% | 86.0% |
| | | | | | | | | | | | | | |
| **Q60** ★ | quiet | 0.10/0.06 | 0.60 | **300** | **88.8** | 129.8 | 214.6 | 80% | 26% | 2.0 | 55 | **89.5%** | 85.9% |
| **W60** | wild | 0.15/0.12 | 0.60 | **300** | **80.8** | 127.7 | 187.5 | 79% | 25% | 2.0 | 60 | **90.4%** | 87.9% |
| **W65** | wild | 0.15/0.12 | 0.65 | **300** | **82.2** | 128.4 | 193.8 | 78% | 28% | 2.0 | 62 | **90.4%** | 88.2% |
| **W70** | wild | 0.15/0.12 | 0.70 | **300** | **81.0** | 142.0 | 207.0 | 76% | 24% | 2.0 | 64 | **90.3%** | 87.3% |

**Dropped from stage 2 as worse than their own control at N=30** (§K): Q65, Q70, M60, D60.

---

## 4 · THE TWO QUESTIONS, ANSWERED SEPARATELY

### Question 2 — does the last-30% gap get smaller? **No.**

At N=300 the `wild` arms are **80.8 / 82.2 / 81.0** px. The spread is **1.4 px on a ~81 px median** —
nothing. `choreoOutcomeStart` does not move the gap that matters.

★★★ **AND THIS IS WHERE STAGE 1 WOULD HAVE MISLED.** The same three arms at N=30 read **100.0 →
83.7 → 71.0**, which is a 29% reduction and reads like a clear win for 0.70. It did not survive
tenfold more races. **Ten races per track per arm was not enough to separate an 80 px median with a
130 px p90**, and the only thing that caught it was running stage 2.

### Question 1 — are there more lead changes? **Slightly, and not where it was asked.**

Whole-race lead changes rise with cos at `wild`: **60 → 62 → 64** at N=300. But **inside the headline
window the median is 2.0 on every arm at both N** — flat. The extra churn is in the earlier part of
the race, not in the last 30%.

★ Per §A an arm that buys one question by losing the other has not won. **W70 does not lose the gap
(81.0 against 80.8 — flat) and gains 4 whole-race lead changes.** That is not "buying one by losing
the other"; it is a small gain in a metric that is not the headline, with no movement in the headline
at all. **It is not a win, and no combined arm was run.**

### ★ The grid's own question: does the boundary's effect depend on the stage?

At N=30 the two rows **disagreed in direction** — worse at `quiet` (75.9 → 101.0 → 88.0), better at
`wild` (100.0 → 83.7 → 71.0) — and that looked like the finding. **At N=300 the `wild` row is flat,
so the disagreement was the noise, not a stage interaction.** The `quiet` row was not re-run at
N=300 (its arms were dropped by the rule), so **the honest statement is: at `wild`, the boundary does
nothing; at `quiet`, N=30 says it hurts and that has not been confirmed at N=300.**

★ **One thing the N=300 controls do say plainly:** `wild` has a **smaller** last-30% gap than `quiet`
(80.8 against 88.8) and **more** lead changes (60 against 55). The action stage moves both questions
in the good direction; the boundary moves neither.

---

## 5 · THE STANDING QUESTION — `searound` AND `luger-hill`

> ★★ **Neither fails the band gate in the shipped game.** At N=300 on the shipped control,
> **`searound` 88.3%** and **`luger-hill` 91.4%**, against the 70% bar — passing by 18.3 and 21.4
> points. `luger-hill` is in fact the **best** of the ten.

Every track, shipped control, N=300 (my measure, §1.2):

| track | band arrival | B3 | | track | band arrival | B3 |
|---|---|---|---|---|---|---|
| luger-hill | **91.4%** | 87.0% | | seatrack | 89.8% | 84.7% |
| space-sprint | 90.5% | 86.7% | | city-circuit | 88.8% | 86.3% |
| ice-track | 90.8% | 86.7% | | searound | **88.3%** | 84.7% |
| mountainstreet | 90.0% | 87.7% | | river-run | 88.2% | 85.3% |
| garden-path | 89.7% | 86.7% | | dirt-oval | 87.3% | 83.0% |
| | | | | **ALL TEN** | **89.5%** | 85.9% |

★ **B3 at cos 0.70 was the thing to watch** — `choreoResolveB3` is a fixed 0.70, so B3's settling
window is zero wide there. Measured: **87.3% at W70 against 87.9% at W60**, a 0.6-point difference on
300 races. **The wall does not show up in B3's band arrival.**

---

## 6 · WHAT WAS REUSED, AND THE ONE THING BUILT

| needed | already existed | used |
|---|---|---|
| the driving loop, PRE-STEP ranking | `breakaway-lever.mjs`, from `breakaway-growth.mjs` | ★ copied, unchanged |
| the gap expression | the same family's `(leader.t - second.t) * pathLengthPx` | ★ not re-derived |
| band arrival | `bandOfRank` (heroCurveGenerator.js:135) | imported |
| the start-row test | `computeFairnessStats` (fairness-stats.mjs:18) | ★ **could not be used** — §1.3 |
| the cast test | the plan's role map, as SHAPE-CENSUS-1 reads it | read |

★ **The one new thing is the arm loop and the three phase windows** — no instrument in the tree takes
a lever grid and reports a fixed-window lead maximum. `sim-fairness.mjs` was the first choice for the
whole job and was rejected on measured cost, not on preference.

### Source hygiene

| file | lines | what it is |
|---|---|---|
| `reports/night/breakaway-action-data/action-arms.mjs` | 0 → 205 | NEW — the harness |
| `reports/night/breakaway-action-data/agg-gate.mjs` | 0 → 47 | NEW — the band table |
| `action-stage1.json` / `action-stage2.json` | 0 → 271 KB / 1.4 MB | NEW — the data |
| `reports/night/BREAKAWAY-ACTION-2026-09-20.md` | 0 → this | NEW |

**No engine source touched. No new guard, key or default. No dead code**: the start-row branch was
removed from `agg-gate.mjs` when it turned out to be unusable, rather than left returning `n/a`.

### ★ NOTICED AND DELIBERATELY LEFT

- **`sim-fairness.mjs:4501` and `:4514`** still say the gap brake's shipped default is `false`. It has
  been `true` since 2026-09-17. The code reads the default dynamically so the sim is **not** blind —
  only the comments are stale. Same class as CLEANUP-2026-09-19; not touched, because this chain
  changes nothing.
- **The start-row index is not on the racer.** Exporting it from the grid layout would make the other
  half of the gate cheaply measurable on this path. That is a change to shipped code and is not this
  chain's to make.
