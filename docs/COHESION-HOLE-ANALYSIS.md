# COHESION — two numbers from the frozen Stage-0 data

**Read-only. Computed from the frozen Stage-0 cells — NO new simulation.** Date: 2026-07-10. Source data:
`scripts/night-sweep/results/cohesion-stage0/coh-coh-{OFF,ON}-<track>.json` (4 tracks × {v4-OFF, v4-ON},
100 races, seed=1, ASSUMED-DEFAULTS). RAW distributions — no pass/fail, no tuning.

> **⚠ Two places the task spec is wrong about the frozen data — verified:** (1) the frozen cohesion
> checkpoints are at **0.25/0.50/0.75/0.90**, NOT the requested 0.40/0.55; (2) the frozen data stores the
> **SORTING count** (`servoConflictFrac` = fraction of over-cap front cars with `trajectoryMult > 1`) but
> **not the raw per-link `trajectoryMult`**, so DRIFT (`≈1`) cannot be separated from BRAKING (`<1`). So
> "the frozen data already contains everything needed" does NOT hold at the exact granularity. The task
> forbids a new sweep, so the answerable core is reported and the gap is named. Neither gap changes the
> core conclusions.

---

## 3.1 — THE HOLE SPLIT: how many over-wide holes is the SERVO opening?

For every link wider than **3 racer lengths**, classify by the racer AHEAD of it (the one a downward
correction would slow): **SORTING** if its `trajectoryMult > 1` (the servo is pulling it forward toward its
target rank — braking it fights band-reach), otherwise **DRIFT-or-braking** (the dice's business). SORTING
is exactly the frozen `servoConflictFrac` at cap 3.

| Track | v4-OFF SORTING / (DRIFT+brake) | v4-ON SORTING / (DRIFT+brake) |
|---|---|---|
| searound (closed) | 38% / **62%** | 30% / **70%** |
| dirt-oval (closed) | 45% / **55%** | 29% / **71%** |
| mountainstreet (open) | 41% / **59%** | 32% / **68%** |
| luger-hill (open) | 37% / **63%** | 28% / **72%** |

**Answer: MOST over-wide holes are NOT sorting holes.** The servo is actively opening only **~37–45%** of
them under v4-OFF and **~28–32%** under v4-ON; the majority (**55–72%**) are drift-or-braking — the
dice's business. So the cohesion concept does **not** have a much smaller job than we thought: the drift
holes it targets are the majority. But a real minority (a third to nearly a half) are servo-driven, and per
the actuator hierarchy (the servo out-muscles the re-roll, ±15% vs ±8.1% — see docs/CONCEPT-COHESION.md §7)
the dice cannot police those — that share is where "may the servo sort less strictly at the front?" is the
real question.

**The leader-is-never-boosted claim — CONFIRMED by the servo math, not just the data.** At rank 1,
`rankError = currentRank − targetRank = 1 − targetRank ≤ 0` (targetRank ≥ 1), so
`mult = clamp(1 + gain·error/nActive, minMult, maxMult) ≤ 1` (racePlanner.js:566,579). **A racer at rank 1
can never have `trajectoryMult > 1`** — so a hole directly behind the leader is ALWAYS a DRIFT/brake hole,
never a sorting hole. (The frozen aggregate cannot isolate the `nAhead=1` leader holes from the pooled
`servoConflictFrac`, but the math guarantees it; nothing in the data contradicts it.)

## 3.2 — WHEN DOES THE HOLE FORM?

Fraction of races (of 100) with a frontmost link **> 3 lengths** present at each frozen checkpoint, and its
median length when present:

| Track·Arm | @0.25 | @0.50 | @0.75 | @0.90 | @line |
|---|---|---|---|---|---|
| searound OFF | 3% / 3.2L | 12% / 3.4L | 60% / 4.7L | 82% / 5.2L | 86% / 6.1L |
| dirt-oval OFF | 0% | 3% / 3.3L | 64% / 4.8L | 87% / 5.8L | 95% / 6.3L |
| mountainstreet OFF | 0% | 1% / 4.0L | 60% / 4.9L | 78% / 5.8L | 83% / 5.7L |
| luger-hill OFF | 0% | 0% | 35% / 3.9L | 73% / 4.2L | 80% / 4.7L |
| searound ON | 30% / 4.1L | 69% / 6.1L | 77% / 6.4L | 73% / 6.4L | 81% / 6.0L |
| dirt-oval ON | 13% / 4.1L | 76% / 5.4L | 82% / 5.8L | 79% / 6.6L | 84% / 5.9L |
| mountainstreet ON | 0% | 72% / 5.0L | 75% / 5.2L | 75% / 5.2L | 76% / 5.9L |
| luger-hill ON | 0% | 36% / 4.0L | 62% / 4.6L | 62% / 5.0L | 67% / 4.5L |

**Answer — under v4-OFF the hole is NOT present before the servo acts.** The servo does not steer the pack
until `corridorStart = 0.55` (racePlanner.js:538 pins non-heroes to 1.0 before OUTCOME; verified). At 0.25
and 0.50 the >3 L hole is essentially absent (0–12% of races); it appears between **0.50 and 0.75** —
i.e. right as the servo begins sorting the pack. **So under v4-OFF the dice do NOT have a conflict-free
pre-servo window: the hole and the servo arrive together.** (This coincides temporally even though only
~40% of the ahead-cars are individually boosted — the reshuffle opens holes via several racers moving, not
only the ahead-car; §3.1 and §3.2 are consistent, not contradictory.)

**Under v4-ON the hole forms earlier** — present in 30–76% of races by 0.50, because v4's OUTCOME steering
starts at `directorV4OutcomeStart = 0.25` (racePlanner.js:144), a full lap-quarter sooner than the v4-OFF
0.55. The pack is being sorted from 0.25, and the holes track that.

---

## What this means (plainly, not as a verdict)

- Cohesion's target — the **drift hole** — is the **majority** (55–72%) of over-wide holes. The concept has
  a real job; it is not mostly the servo's doing.
- But **a third to a half are servo-driven**, and the dice cannot close those (the servo is stronger). That
  fraction is the size of the separate "servo yields at the front" question (D8).
- The hole forms **when the servo starts** (0.55 v4-OFF / 0.25 v4-ON), so there is **no clean pre-servo
  window** for the dice to work in undisturbed — the cohesion and the servo will always overlap in time.
- **Not measured (frozen-data limits, no re-run per the constraints):** the DRIFT-vs-BRAKING sub-split of
  the non-sorting holes; the exact 0.40/0.55 samples. Both would need a richer observer or a re-run — named,
  not faked.
