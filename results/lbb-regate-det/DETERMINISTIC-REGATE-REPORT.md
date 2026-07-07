# Deterministic re-gate — look-before-brake (LBB)

**Branch:** `feat/race-action` @ `3f9a055` (pushed). Linear history:
`5cdaedb → 89e995a (PART1 knob) → 3f9a055 (determinism fix)`.
Rollback tag `pre/lbb-dedicated-differential` on 5cdaedb. No new tags, no default changes, no sweep.

## Determinism fix (committed 3f9a055)
- `shuffle()`, `computeEvenRowLayout()`, `computeRowLayout()` take an optional PRNG (default
  `Math.random` → **browser byte-for-byte unchanged; all 3010 client tests green**).
- The headless sim derives a deterministic PRNG from `track+racer+globalSeed` (FNV-1a →
  `makePRNG`) for the main-loop start-row shuffle — the last unseeded `Math.random` path.
- **Proof:** garden-path seed=1 run twice → identical SHA256 `22fd59c769d0cf78…` (before AND
  after PART1 was layered in — reconfirming PART1 is behaviour-neutral at default).

## Why this mattered
`--seed` previously did **not** control the race-plan's start-row assignment (drawn once per
combo from unseeded `Math.random`, shared by all 50 races). That produced **1–2.5pp run-to-run
noise on B3 band-reach** at fixed seed. The Stage-1 RED verdict compared single noisy runs.

## Multi-seed paired re-gate (6 tracks × seeds 1–6 × 2 arms = 72 deterministic runs)
HEAD = 3f9a055 (LBB on). BASELINE = 31f395b + determinism cherry-pick (pre-LBB). Paired at each
seed (identical start-row assignment) so the Δ isolates LBB.

| Track | HEAD B3 mean [range] | BASE B3 mean | paired ΔB3 (mean±sd) | GATE A ≥70 (H / B) | pass-through Δ (H−B) | GATE B H≤B | Holm-unfair (H / B) | brakeRate H/B | honestOvl H/B |
|---|---|---|---|---|---|---|---|---|---|
| garden-path | 70.0 [67–74] | 70.1 | **−0.13 ± 2.02** | 2/6 / 4/6 | −0.11 | 3/6 | 1 / 0 | 56.3 / 60.1 | 2.18 / 2.42 |
| seatrack | 71.9 [67–74] | 72.3 | −0.43 ± 0.68 | 5/6 / 5/6 | −0.26 | 5/6 | 1 / 1 | 53.6 / 57.2 | 1.95 / 2.17 |
| city-circuit | 70.1 [68–72] | 69.5 | +0.63 ± 1.92 | 3/6 / 2/6 | **−0.65** | 4/6 | 0 / 0 | 60.7 / 63.6 | 2.54 / 2.74 |
| mountainstreet | 72.5 [72–74] | 71.7 | +0.83 ± 2.02 | 6/6 / 5/6 | **−0.54** | 6/6 | 2 / 2 | 52.0 / 55.7 | 1.90 / 2.11 |
| searound | 69.9 [68–72] | 70.2 | −0.30 ± 1.62 | 3/6 / 4/6 | −0.32 | 3/6 | 2 / 4 | 70.8 / 72.5 | 3.73 / 3.86 |
| ice-track | 70.1 [67–72] | 70.1 | 0.00 ± 1.42 | 3/6 / 4/6 | −0.01 | 3/6 | 0 / 0 | 59.3 / 62.3 | 2.40 / 2.61 |

## Verdict — do the Stage-1 regressions survive?

**R1 — garden-path B3 <70%: NO.** Paired ΔB3 = **−0.13 ± 2.02pp** (per-seed −2.8…+3.6). HEAD 70.0%
vs BASE 70.1% — identical. The Stage-1 −3.4pp was a single unlucky HEAD draw vs a lucky BASE draw.

**R2 — seatrack B3 newly Holm-unfair: NO.** HEAD 1 flagged seed / 6, BASE 1 / 6 — equal, and ~the
expected false-positive rate of a p<0.05 family. seatrack ΔB3 = −0.43±0.68pp. No LBB-induced bias.

**R3 — pass-through rose on city-circuit/mountainstreet: NO.** Over 6 seeds LBB **lowers**
pass-through: city-circuit Δ −0.65 (H≤B 4/6), mountainstreet Δ −0.54 (H≤B 6/6). The seed=1 +0.60/+0.94
were single draws.

## Consistent, real LBB effects (every track, every seed)
- **brakeRate −2 to −3.8pp** vs baseline — LBB reduces braking, the feature working as designed.
- **honestOverlapRate lower on all tracks** — LBB slightly *improves* non-penetration.
- **pass-through ≤ baseline on all tracks (mean)** — no penetration cost.

## Important secondary finding (not about LBB)
garden-path, searound, city-circuit and ice-track have **B3 sitting right at ~70% on BOTH arms**
(pass only 2–4 of 6 seeds either way). The 50-races/seed B3 estimate has ±~1.5–2pp seed variance, so
the "B3 ≥ 70% every track" gate is a near-coin-flip for these tracks **independent of LBB**. Overall
band-reach is 80–83% everywhere (well clear). If criterion A is kept as a hard per-zone 70% gate, it
should be evaluated on **pooled multi-seed data** (e.g. ≥300 races), not one 50-race run — otherwise
pass/fail is noise. This is the real lesson behind the original Stage-1 RED.

## Bottom line
Against the now-clean, deterministic, paired baseline, **none of the three Stage-1 regressions are
real.** Look-before-brake at shipped defaults shows no fairness or non-penetration regression; its
measurable effects (less braking, lower overlap) are neutral-to-beneficial. No parameter tuning is
warranted by this evidence. (On the owner's "garden-path 5.7σ" prior: the deterministic paired data
puts it at ~0σ — Δ −0.13 ± 0.82 SEM over 6 seeds.)

## Data
- `results/lbb-regate-det/head/<track>/seed{1..6}/fairness-data.json` (HEAD, LBB on)
- `results/lbb-regate-det/base/<track>/seed{1..6}/fairness-data.json` (31f395b+det, pre-LBB)
- seed=1 single-run detail also in `results/lbb-regate-det/{head,base}/<track>/fairness-data.json`
- noise-quantification (unseeded, 6 runs/track): `results/lbb-noise/`, `results/lbb-baseline6/`
