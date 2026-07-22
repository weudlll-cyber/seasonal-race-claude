# GREENFIELD NIGHT RUN — Morning Report

Branch `pre/greenfield-proto` (from master `5ae3b1f`). Sim-only prototype of the greenfield
architecture with three composer variants, measured against the committed baselines. This run was
unattended; every phase committed its own results before the next began, and the shipped-default
fingerprint stayed byte-identical throughout (`efd0f4ad8eca08fa`, verified after the composer wiring).

**GREENFIELD-PLAN.md was not present at the branch point.** The V-PLAN composer was therefore derived
from its description in the two available proposals (a fair hand of band values + a seed-chosen
dramaturgy over roll slots + hand-sum tiers), not from the planner's own document. This is noted where
it matters.

The three proposals were read in full and are the build input for the composers:
GREENFIELD-CC ("schedule, don't steer" — rank trajectories + field-shape + v_track + receding-horizon
re-planning), GREENFIELD-COPILOT ("seeded pace compiler" — archetype envelopes + shared race-wave +
row-neutralization credit), and the derived V-PLAN.

---

## Answers to the seven report questions

### 1. Physics tax — σ, tail loss, uniform or concentrated?

Measured with a new read-only observer (`--physics-tax`, `scripts/sim/observers/physics-tax.mjs`) on
the **shipped default engine**, N=100 × 4 tracks × 60 s, baseline seeds. It records, per racer, the
cumulative longitudinal distance lost to avoidance braking as a fraction of the distance it would
otherwise have covered, and normalises it to the natural band (b = 0.0813) to give **σ = the share of
band authority live physics already consumes**.

- **σ (pooled) = 48.1%** — mean; p50 45.6%, p90 73.9%, **p95 82.3%, max 125.7%**. Live physics already
  eats roughly **half the natural speed band on the average racer**, and more than the entire band for
  the worst-case racer in a race.
- Per track: **mountainstreet 32.9%, luger-hill 42.1%, dirt-oval 51.8%, searound 65.6%.** Closed tracks
  are far more expensive; searound's p95 is 94.2% — nearly the whole band gone.
- **Tail (last decile) loss ≈ 47% σ** (3.9% of distance) — physics keeps taxing right to the finish;
  the reserve cannot be released late.
- **Concentration ≈ 1.11 → roughly UNIFORM**, not concentrated in a few corners. The decile profile is
  flat at ~3.5–4.3% throughout. Per GREENFIELD-CC §8.3 this is the **expensive** case: a constant drag
  is harder to plan around than a few known bad places.

**Bottom line for a composer: it may spend at most `band × (1 − σ) ≈ 0.52 × b` on average, and as
little as `0.34 × b` on searound.** This single number gates everything below.

Data: `reports/greenfield/p0/`.

### 2. Inversion-budget audit — deliverable per duration; is 30 s viable; does band × (1 − σ) change the verdict?

Pure arithmetic on the existing per-race Fisher-Yates assignments (replicated and verified
byte-identical against `createRacePlan`), with field density g and speed v measured per track ×
duration. `ratio = |Δrank|·g / (T·v·b)` is the required mean speed differential as a fraction of the
band; ratio ≤ 1 means the move fits inside the band given the whole race.

The raw assignment is demanding but not impossible: inversion count averages **395 of 780**, and the
required rank movement averages **13.5 ranks (p95 = 32, max = 39)** — a racer routinely has to cross
most of the field.

- **Against the FULL band:** DELIVERABLE at 60/120/300 s on all four tracks. Only the two closed tracks
  at 30 s are MARGINAL (12–13% of racers undeliverable). So *the assignment itself is physically
  reachable by a smooth open-loop schedule when it has the whole band and ≥ 60 s.*
- **Against band × (1 − σ) — the composer's HONEST budget — the verdict flips hard:**
  - **30 s: not viable anywhere.** Every track MARGINAL; 9% (mountainstreet) to **44% (searound,
    dirt-oval) of racers are undeliverable.**
  - **60 s:** mountainstreet DELIVERABLE (3%); luger-hill MARGINAL (15%); **searound & dirt-oval
    MARGINAL (29% undeliverable).**
  - **120 s:** mostly recovers (mountainstreet DELIVERABLE; others 9–15% tail); **300 s: DELIVERABLE
    everywhere.**

**So yes — band × (1 − σ) changes the verdict on essentially every 30–60 s closed-track cell.** The
headline is that *the physics tax, not the inversion count, is the wall*: the assignment is reachable
at full band but not within the ~half-band physics leaves. **30 s is viable on no track against the
reduced band; the design needs generous runway (120 s+) to deliver within its honest budget.**

Data: `reports/greenfield/p1/`.

### 3. A8 — drop the carousel or tune it? → **DROP IT.**

Three arms, same baseline seeds, N=100 × 4 tracks, all measured at the A6 window (0.62), paired. (The
historical A5/A6 flag configs were never committed, so they are defined here per the spec and measured
fresh alongside A8; my A6-control reads 37.3% vs the spec's quoted 31.3%, a definitional difference, so
treat the *relative* ordering as the result, not the absolute A6 number.)

| arm | config | p1Contest@0.62 | runaway | parade | leadChange | distinctLeaders |
|---|---|---|---|---|---|---|
| A6-control | gap-reroll G=1.5, carousel OFF | 37.3% | 7.5% | 2.0% | 2.73 | 3.35 |
| A5-carousel | G=1.5 + carousel ON (roleBias 1.0) | 30.5% | 10.3% | 2.0% | 2.55 | 3.17 |
| **A8-gr075** | **gap-reroll G=0.75, carousel OFF** | **54.0%** | **6.5%** | **0.8%** | **3.22** | **3.63** |

- **A8 beats A5 on p1Contest by a wide margin (54.0% vs 30.5%) with MORE lead changes (3.22 vs 2.55)
  and LESS runaway (6.5% vs 10.3%) and parade (0.8% vs 2.0%).** The tighter gap-reroll threshold does
  everything the carousel was meant to do, better, with no new mechanism.
- **The carousel (A5) is the worst arm of the three** — it *lowers* contest and *raises* runaway
  versus the plain control. On these numbers it is not earning its complexity.

**Verdict: DROP the carousel. And note the free win — G=0.75 gap-reroll (A8) beats the shipped G=1.5
control on every metric here**, which is an owner-level tuning result worth having independent of the
greenfield question.

Caveat: because these arms were run at `contestWindowStart=0.62`, the primary front-battle tracker sat
at 0.62 too, so a separate 0.80-window number was not captured for P2 (the two would have coincided).
The composer sweeps below run at the default 0.80 and capture both windows correctly.

Data: `reports/greenfield/p2/`.

### 4. Per composer — build? band delivery vs > 80%? action & p1Contest vs matched baselines? intraTierEntropy? re-deal/recompile/re-plan? band-compliance?

*(pending — P4/P5/P6 running)*

### 5. Best variant + its single binding blocker + 3–5 strongest seeds for the browser eye-check

*(pending)*

### 6. Hygiene

*(finalised at close — see HYGIENE section below)*

### 7. Wall-clock per phase, and what was skipped and why

*(finalised at close)*

---

## HYGIENE

*(finalised at close)*
