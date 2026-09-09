# COMEBACK-RELEASE-1 — which release point, on all ten tracks

**Instrument:** `scripts/lib/raceDriver.mjs` → `raceCore.stepRacePhysics` — the engine `RaceScreen`
renders through, and the same function `sim-fairness.mjs` imports.

Night chain 2026-09-08, piece 3 · branch `night/2026-09-08` off master `c5e0cb8b` ·
**measurement only, nothing minted, nothing built that could ship.**

---

## THE METHOD, AND ITS N

**Five release points** 0.50 / 0.55 / 0.60 / 0.65 / 0.70 · **all ten tracks** · **N=40 racers** ·
**30 races per cell** · seeds 41000–41029, the same thirty in every cell so points are compared on
the same races. **1,500 races.**

The held racer is the one the **plan** drew for place 3 — inside the top 5, which is the owner's
requirement — held at rank 18 until the release point, then released to his own target.

### ★ Why 30, and what the second stage would have been

Derived from COMEBACK-QUICK-2's own within-cell spread rather than picked: its finishing places
inside one cell give σ = 1.69 (dirt-oval 0.50) to σ = 2.10 (river-run 0.65), so σ ≈ 1.9 places. To
resolve a **one-place** difference in mean finishing place between two points, two-sample, α=0.05,
power 0.80:

> n = 2σ²(z₀.₀₂₅ + z₀.₂₀)² / Δ² = 2(3.61)(2.80)² / 1² = **57 races per cell**

Stage 1 screens at **N=30**, the owner's standing instruction, which pools to **n=300 per release
point** across ten tracks — a 95 % interval of about ±3.5 pp on the top-5 rate.

★ **STAGE 2 WAS NOT RUN, and the reason is the answer itself.** The rule for raising N is "only
where the columns are close enough that it would change the answer". **0.70 is simultaneously the
LATEST point and the HIGHEST rate.** No larger N can produce a later point, and none can promote a
point above one that already leads — so no stage-2 result could move the choice. Recorded as a
decision, not an omission.

---

## THE TABLE — pooled per release point (n = 300 each)

| point | top-5 | rate | 95 % CI | mean place | median rank at release | pinned | blocked |
|---|---|---|---|---|---|---|---|
| 0.50 | 269 | 89.7 % | 86.2 – 93.1 | 3.27 | 19 | 30.6 % | 11.3 % |
| 0.55 | 258 | 86.0 % | 82.1 – 89.9 | 3.27 | 18 | 31.3 % | 11.2 % |
| 0.60 | 258 | 86.0 % | 82.1 – 89.9 | 3.32 | 19 | 32.0 % | 12.3 % |
| 0.65 | 266 | 88.7 % | 85.1 – 92.3 | 3.25 | 17 | 31.6 % | 11.4 % |
| **0.70** | **271** | **90.3 %** | **87.0 – 93.7** | **3.00** | **16** | 31.3 % | 12.4 % |

**No point is distinguishable from the best**, two-proportion test against 0.70:

| vs 0.70 | difference | z | verdict |
|---|---|---|---|
| 0.50 | +0.7 pp | 0.27 | not distinguishable |
| 0.55 | +4.3 pp | 1.65 | not distinguishable |
| 0.60 | +4.3 pp | 1.65 | not distinguishable |
| 0.65 | +1.7 pp | 0.67 | not distinguishable |

### These are comebacks, not races he led

Rank at release, pooled — the column that stops a race where he was never behind passing as a climb:

| point | min | p10 | median | p90 | max | **races released inside the top 5** |
|---|---|---|---|---|---|---|
| 0.50 | 4 | 16 | 19 | 23 | 30 | **1 of 300** |
| 0.55 | 7 | 16 | 18 | 22 | 30 | **0 of 300** |
| 0.60 | 9 | 16 | 19 | 22 | 29 | **0 of 300** |
| 0.65 | 9 | 15 | 17 | 21 | 27 | **0 of 300** |
| 0.70 | 9 | 13 | 16 | 20 | 27 | **0 of 300** |

**One race in 1,500** released with the held racer already inside the top 5. The hold holds.

---

## ★ THE CHOICE — 0.70

**His rule, given 2026-09-08:** when the numbers are similar, take the **latest** point.

My reading of "similar", stated as mine: the latest point whose top-5 rate is not *measurably* worse
than the best — inside the spread the races themselves show. **Every point is inside that spread**,
so the rule selects the latest: **0.70**.

★ **It did not have to be decided on the tie-break, and that is worth seeing.** 0.70 is *also* the
highest rate (90.3 %), the best mean place (3.00), and the deepest median rank at release (16). The
rule and the numbers agree, so this is not a case where he is being handed a point the data merely
tolerates.

**How close the others were**, so he can judge whether he would have chosen the same: 0.50 is
0.7 pp behind (z = 0.27) and is effectively tied; 0.65 is 1.7 pp behind; 0.55 and 0.60 are 4.3 pp
behind, which is still inside the interval at this N. **A different reading of "similar" that
demanded the single best rate would also pick 0.70.** The only rule that picks anything else is one
that prefers an *earlier* release, which is the opposite of his.

★ **Piece 4 measures the top two — 0.70 and 0.50** — because two or more points are
indistinguishable. Those are the two highest rates and they span the range, so the camera numbers
cannot end up belonging to a point he does not take.

---

## PER TRACK

### Top-5 rate (n = 30 per cell)

| track | 0.50 | 0.55 | 0.60 | 0.65 | 0.70 |
|---|---|---|---|---|---|
| city-circuit | 90% | 90% | 80% | 87% | 90% |
| dirt-oval | 93% | 90% | 83% | 87% | 87% |
| garden-path | 87% | 100% | 80% | 87% | 90% |
| ice-track | 87% | 80% | 87% | 80% | 93% |
| luger-hill | 100% | 93% | 87% | 97% | 93% |
| mountainstreet | 90% | 77% | 83% | 90% | 90% |
| river-run | 87% | 83% | 93% | 83% | 90% |
| searound | 87% | 83% | 97% | 90% | 93% |
| seatrack | 90% | 80% | 83% | 90% | 90% |
| space-sprint | 87% | 83% | 87% | 97% | 87% |

At n=30 a single cell carries a ±12 pp interval, so **no per-track cell separates from another** and
the per-track pattern should not be read as a ranking. It is here because the brief asks for it and
because the pooled row is only trustworthy if no track is behaving oppositely — none is.

### Median rank at release

| track | 0.50 | 0.55 | 0.60 | 0.65 | 0.70 |
|---|---|---|---|---|---|
| city-circuit | 18 | 19 | 19 | 18 | 17 |
| dirt-oval | 19 | 18 | 18 | 17 | 16 |
| garden-path | 19 | 19 | 18 | 17 | 16 |
| ice-track | 19 | 19 | 18 | 18 | 17 |
| luger-hill | 19 | 19 | 19 | 17 | 17 |
| mountainstreet | 19 | 19 | 19 | 17 | 16 |
| river-run | 18 | 18 | 19 | 17 | 17 |
| searound | 19 | 18 | 19 | 17 | 16 |
| seatrack | 20 | 19 | 18 | 17 | 16 |
| space-sprint | 19 | 19 | 19 | 18 | 16 |

### ★ Pinned % / blocked % — and the zero is REAL

| track | | 0.50 | 0.55 | 0.60 | 0.65 | 0.70 |
|---|---|---|---|---|---|---|
| city-circuit | closed | 37 / 23 | 37 / 21 | 38 / 22 | 40 / 22 | 40 / 24 |
| dirt-oval | closed | 32 / 20 | 32 / 20 | 39 / 25 | 36 / 21 | 32 / 22 |
| garden-path | closed | 36 / 22 | 34 / 19 | 37 / 22 | 34 / 19 | 39 / 24 |
| ice-track | closed | 31 / 20 | 32 / 20 | 34 / 23 | 39 / 22 | 39 / 24 |
| searound | closed | 38 / 28 | 40 / 31 | 38 / 30 | 41 / 29 | 41 / 29 |
| luger-hill | **open** | 29 / **0** | 32 / **0** | 33 / **0** | 31 / **0** | 28 / **0** |
| mountainstreet | **open** | 23 / **0** | 25 / **0** | 25 / **0** | 23 / **0** | 19 / **0** |
| river-run | **open** | 26 / **0** | 27 / **0** | 29 / **0** | 29 / **0** | 31 / **0** |
| seatrack | **open** | 26 / **0** | 26 / **0** | 25 / **0** | 24 / **0** | 23 / **0** |
| space-sprint | **open** | 27 / **0** | 29 / **0** | 23 / **0** | 20 / **0** | 21 / **0** |

**Blocked is exactly 0 on the five OPEN tracks and 19–31 % on the five CLOSED ones.** The split is
exactly open-versus-closed, checked against each track's own `closed` field, not assumed.

★ **A metric reading exactly zero on half the corpus is the silent-zero class, so it was
established rather than believed.** Two probes:

1. **The metric is alive on open tracks.** Across the whole field on river-run, `brakeMatchFactor < 1`
   occurs on **677 of 3,840 frames** (space-sprint 501 of 3,835). Brake-to-match is not switched off
   by open geometry.
2. **The held racer specifically is never blocked there.** With the arm set and the climb isolated,
   on river-run seeds 41000/41001/41002 his `brakeMatchFactor` is **exactly 1.0000 for all 1,039 /
   1,041 / 1,107 climb frames** and `brakeMatchFrames` never leaves 0 — against dirt-oval's 397 /
   644 / 170 blocked frames with the factor down to **0.6483**.

**The mechanism is in the code, at its address**: the brake-to-match cap is computed inside
`if (!takeFreeLane)` (`raceBehavior.js:880-905`). On an open track the climbing racer has the
lateral room to go around, so he is never forced to sit behind anyone. **The climb is free on open
tracks and costs a fifth to a third of its frames on closed ones.**

★ **No speed limit was relaxed at any point in any arm.** `maxMult` is untouched. The pinned column
is a report — around 31 % of the climb spent asking for more than the servo will give, flat across
all five points, so **no release point is cheaper than another in that currency**.

---

## THREE CORRECTIONS THIS RUN CARRIES

1. **The held racer is a B1 HERO, and that cannot be avoided.** On dirt-oval seed 41000 the plan
   draws racer 6 for place 3 and `b1Indices` is {6, 17, 19, 24, 33}: **the drawn top-5 places ARE the
   B1 heroes.** COMEBACK-QUICK-2 recorded its held racers as "(not a hero)", which cannot hold for a
   racer whose drawn place is inside the top 5. Excluding heroes made **every cell n=0** on the first
   attempt. That sentence is not carried forward. The hold works on a hero because the arm tests the
   hold before the hero-curve branch.
2. **The finishing order is read from `finishRank`**, the field the engine actually writes.
3. **NO ARITHMETIC APPEARS ANYWHERE**, not even as a column. No reachability model was computed.
   Races only, as instructed.

---

## CHECKS

```
node scripts/engine-reach.mjs --check reports/night/COMEBACK-RELEASE-1.md reports/night/INDEX.md docs/MORNING.md

ENGINE REACH: none of 3 path(s) carry a change that can reach the race engine.
```

| | |
|---|---|
| world fingerprint, arm PRESENT but unset | **matches the record** — the arm is inert while unset |
| world / world-off / camera / render, arm REMOVED | reported in the chain's closing checks |
| golden races | reported in the chain's closing checks |

## SOURCE HYGIENE

**No source file is changed by this piece.** The hold arm was applied to
`client/src/modules/racePlanner.js` for the run and is removed at the end of the chain; it is a
module-level `_HOLD_ARM` with a `__setHoldArm` setter that **nothing in `client/` or `server/`
calls**, so with it unset every branch is byte-identical to the shipped tree — confirmed by running
the world fingerprint with the arm present and unset.

**Reused, not rebuilt:** `scripts/lib/raceDriver.mjs`, the shipped track seeds, and COMEBACK-QUICK-2's
**corrected arm placement** (the hold decision above the pre-OUTCOME pin at `racePlanner.js:805-808`).
The instrument itself had to be **reconstructed** — `comeback-quick.mjs` is not in the tree, because
COMEBACK-QUICK-2 correctly removed it as a scratch file — so what was reused is its published design,
not a file.

**Noticed and left, outside this piece:** the attacker-b2 release block can set `strictness = 0`,
which would cancel a hold on a racer cast as an attacker; it did not fire here because the held racer
is a B1 hero rather than a B2 attacker, but it remains the second place a hold can be silently undone.

No scratch file entered the repository. `git stash` was not used.
