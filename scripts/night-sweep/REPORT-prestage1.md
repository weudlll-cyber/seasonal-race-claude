# PRE-STAGE-1 MEASUREMENT — report

Read-only, flag-only. 100 races/cell, 60 s, seed 1, deterministic. Density shipped ±8%
(baseSpeedMin 0.00096 / Max 0.00113), release 0.97. Clean baseline every cell:
`--race-plan=true --directorV4Enabled=true --governorDirectorEnabled=false --pulkBiasGain=0
--bonusMult=2.0`. Observer = deepest B1-target climber (`--tier2=comeback --tier2ClimberB1=true`,
**malus 0 / boost 0 → NO new force**); the shipped servo does the climbing. Tracks: mountainstreet +
luger-hill (OPEN), searound + dirt-oval (CLOSED), default racers.

## Governance

- **MEASUREMENT only.** The four shipped modules are git-verified UNTOUCHED (`git diff -- client/ server/`
  empty). Only `scripts/sim-fairness.mjs` (the sim tool) changed; every new flag is default-off and a
  no-flag run is **byte-identical to HEAD** (verified by restoring HEAD in place and diffing
  `fairness-data.json`).
- No legacy mechanism ran: governor OFF, pulkBias 0. tier2 force disabled (malus 0, boost 0) — pure
  observer.
- **New sim flags:** `--heroChaosAreaBonus=on|off` (Q2). Q3 (`areaBonusScope`) reused the EXISTING
  `--areaBonusEarly/Pulk/Post` phase-split (chaos boundary `pulkStartLive` = 0.25 = choreo boundary).
  Q1 (`packBandStrictness`) reused the existing `--directorV4PackBandStrictness`.
- **Observers added (read-only):** re-pass count; closing-speed ratio (climber `traj×areaBonus` ÷ mean of
  K-ahead), split by TARGET BAND of the car ahead and by FRONT WINDOW (climber rank ≤ 8); choreo-window
  front-hero-vs-B1-pack drive + servo-budget compensation; per-band band-reach.

## Spec corrections surfaced (before/while running)

1. **Q3 needs no new code** — the three scope arms are exactly the existing phase-split flags.
2. **CAUSE-3 is BAND-LOCALIZED, not race-wide.** The +6% B1 headwind only bites near the front; the cars
   directly ahead of a hero climbing through mid-field are B3/B4 (small/zero bonus). Reported by band.
3. **B5 does not exist in a 40-racer field.** `racePlanner.js:36,48`: B5 = rank 41+. The tail band is
   **B4 (ranks 26–40), delta 0.0 → areaBonusMult exactly 1.0** — no bonus AND no handicap. So there is no
   "B5 −2% collapse" risk to measure; removing the areaBonus is a no-op for the tail's intrinsic speed.

---

## PHASE A — Q3 areaBonusScope (arm means across 4 tracks)

| arm | band-reach | B4 tail | cast depth (anchor) | net | reach-front | rePass | pack÷hero | servo-comp | traffic |
|---|---|---|---|---|---|---|---|---|---|
| A1 shipped | 84.4% | 90.2% | 18.4 | 13.9 | 81.0% | 4.4 | **1.018** | **0.391** | 0.498 |
| **A2 ownerVariant** | **83.8%** | 89.5% | **20.5** | 16.3 | **83.3%** | 6.1 | **1.003** | **0.000** | 0.507 |
| A3 offEntirely | 83.6% | 89.6% | 26.3 | 22.1 | 78.3% | 6.7 | 1.008 | 0.000 | 0.556 |

**Answer to the headline question.** Turning the areaBonus off after chaos (A2) **removes the bonus
headwind** — the front hero flips from being out-driven by the B1 pack (pack÷hero 1.018) to neutral
(1.003), and reclaims the **~40% of servo budget** the +4%-mean bonus was eating (servo-comp 0.39 → 0).
It casts the hero deeper (18.4 → 20.5), lifts reach-front to the best of the three (83.3%), and costs
**~0.6 pt of band-reach** — negligible; the gate (≥70%) holds on every track and every band.

**Cost, not glossed:** the *realized* closing speed at the front is **servo-limited, not bonus-limited** —
`closeFront` ≈ 1.09 in ALL arms. A2 does not make the hero 2.6× faster at the front; it frees the servo
budget and enables the deeper cast. Real, but structural, not a raw-speed jump.

**Why not A3.** A3 casts deepest (26.3) and nets most (22.1) but has the **worst churn** (traffic 0.556,
searound 0.70), **lowest reach-front** (78.3%), and strips the chaos wash that keeps back-row starters +
the assigned winner reachable — the one load-bearing use of the bonus. A2 keeps that wash.

**Winning arm: A2.**

---

## PHASE B — on A2: Q1 packBandStrictness × Q2 heroChaosAreaBonus=off

Q2=`on` baseline = Phase A's A2 cells (anchor ~20.5, reach-front 83.3%, band 83.8%). Phase B holds
Q2=`off` and sweeps strictness (arm means across 4 tracks):

| strictness | band-reach | reach-front | rePass | traffic | cast depth |
|---|---|---|---|---|---|
| 0.5 (shipped) | **83.3%** | **77.3%** | 7.5 | 0.566 | 28.4 |
| 0.25 | 83.2% | 73.3% | 5.4 | 0.579 | 28.5 |
| 0 | **76.9%** | **57.3%** | 5.0 | 0.604 | 28.4 |

**Q1 — how much churn is the pack's rank-chasing?** Real but **secondary**. Loosening 0.5 → 0.25 cuts
re-passes ~30% (7.5 → 5.4) while holding band-reach (~83%) at a small reach-front cost (77% → 73%).
Pushing to **0 is too far**: band-reach falls to ~77% (near the gate) and reach-front **collapses to 57%**
— because the observed climber is a *pack* B1-target racer (strictness 1.0 only applies to formally-cast
heroes), so at strictness 0 it only corrects band-error and stops being steered to the front.
Crucially, **traffic-braking frac barely moves with strictness (~0.5 open, ~0.7 closed)** — the pack's
rank-chase is NOT the main wall.

**Q2 — can the hero be held back through chaos and still reach the front?** YES. Suppressing the hero's
chaos bonus casts the deepest B1 racer at **~28 back (~70% of the field behind)** — 8 deeper than with the
bonus on — and it **still reaches the front ~77%** of the time, band-reach unchanged (~83%). So depth is a
**knob**: keep the chaos bonus → cast ~50% back @ 83% reach-front (and preserve reachability); suppress it
→ cast ~70% back @ 77% reach-front (more dramatic fall). Both far inside the F8 ≤45%-open feasibility
concern — deeper is achievable than F8 assumed.

---

## ONE-LINE RECOMMENDATION for Stage 1

**areaBonusScope = A2** (bonus full during chaos, OFF from the choreo boundary 0.25) · **packBandStrictness
= 0.5** (keep shipped; 0.25 is an optional mild churn-reducer, 0 is too loose) · **hero chaos bonus =
KEEP by default** (already casts the deepest B1 at ~50% back @ 83% reach-front + preserves reachability),
expose SUPPRESS as a depth knob for a ~70%-back cast @ 77% reach-front · **cast depth ~50% back (anchor
~20) on both topologies** for Stage 1 (closed tracks tolerate depth on reach-front but carry more traffic
churn).

**Does Stage-2's malus still look necessary? YES.** The traffic-braking frac stays ~0.5 (open) to ~0.7
(closed) across EVERY arm and EVERY strictness — CAUSE-1 (traffic) is the dominant, untouched wall.
areaBonus scope fixes CAUSE-3 (the servo-budget headwind) and pack strictness mildly dents CAUSE-2
(rank-chase re-passes), but neither clears the lane. The lane-clearing malus remains warranted,
especially on the dense closed tracks (searound 0.67–0.71).

## Autonomous decisions (with reasoning)

- **Q3 via existing flags, not new code** — the phase-split already expresses the arms; less code, less risk.
- **Q2 suppresses the whole B1-target pool's chaos bonus** (not one designated racer) — a conservative
  *superset* test: if reach-front survives suppressing all B1, it survives for one. Self-consistent with the
  observer picking the deepest B1.
- **closing-speed = `traj × areaBonus` only** (excludes reroll/traffic-brake/row bonus) — isolates the
  CAUSE-3 factors; adding a by-band + front-window split per owner request.
- **Field-spread p10–p90 not measured** — density held at shipped ±8% in every cell, so it is constant by
  construction.
- **Phase B trimmed to Q2=off** (Q2=on baseline = Phase A A2) — avoids re-running 4 identical cells; kept
  all 3 strictness steps (budget allowed) to see the gradient.
- **Reused cells:** none from prior runs — Phase A/B are newly measured (prior tier2b used different
  release/K and no areaBonusScope arm).
