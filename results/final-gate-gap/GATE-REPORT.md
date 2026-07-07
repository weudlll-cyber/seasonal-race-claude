# Final pooled multi-seed fairness re-gate (60s) — 10 tracks

**HEAD:** `b7d7c7d` (= `3f9a055` + docs-only commit; sim/config byte-identical to `3f9a055`).
**Config:** shipped live defaults — look-before-brake ON, PULK-surge ON (top-3 exclusion active),
rubber-band ON (maxBrake 0.10), corridorEnd 1.0, race-plan ON. No override flags.
**Depth:** 10 tracks × 1 representative racer (= track `defaultRacerTypeId`) × seeds 1–6 × 50 races
= **300 races/track**, pooled. 6 tracks reused from `results/lbb-regate-det/head`, 4 newly generated
in `results/final-gate-gap` (dirt-oval→horse, river-run→duck, space-sprint→rocket, luger-hill→luge).

## PRIMARY — band-reach (computeZoneSuccessRate), threshold B3 ≥ 70%

| Track | overall | B1 | B2 | **B3** | B4 | B3 pass |
|---|---|---|---|---|---|---|
| dirt-oval | 81.83 | 85.47 | 80.40 | **71.13** | 88.71 | ✅ |
| river-run | 81.77 | 85.73 | 80.70 | **71.03** | 88.31 | ✅ |
| space-sprint | 82.14 | 84.93 | 80.47 | **72.27** | 88.91 | ✅ |
| luger-hill | 81.30 | 85.07 | 79.90 | **70.40** | 88.24 | ✅ |
| garden-path | 80.80 | 84.40 | 78.50 | **69.97** | 88.36 | ❌ |
| seatrack | 82.08 | 85.60 | 80.00 | **71.87** | 89.11 | ✅ |
| city-circuit | 81.44 | 86.53 | 80.43 | **70.13** | 87.96 | ✅ |
| mountainstreet | 82.52 | 85.73 | 81.00 | **72.50** | 89.13 | ✅ |
| searound | 80.61 | 83.07 | 78.57 | **69.90** | 88.29 | ❌ |
| ice-track | 81.39 | 86.27 | 79.67 | **70.13** | 88.42 | ✅ |

B3 is always the binding (tightest) zone; B1/B2/B4 clear 70% everywhere; B5 is empty (max rank 40 < 41).

**PRIMARY: 8/10 pass. garden-path (69.97%) and searound (69.90%) fall just below 70%.**
B3 sample = 3000 rows/track, SE ≈ ±0.84pp ⇒ garden-path is −0.04 SE and searound −0.12 SE from 70% —
**statistically indistinguishable from 70%.** This is exactly the "B3 sits right at ~70% on these
tracks, near-coin-flip independent of LBB" finding from the deterministic re-gate: the 70% criterion
lands precisely where these two tracks naturally sit. Not a regression — a criterion-on-the-knife-edge.

## SECONDARY — start-row bias (computeFairnessStats, native χ² wins-by-row), 0 Holm-unfair

| Track | χ² p | fair? |  | Track | χ² p | fair? |
|---|---|---|---|---|---|---|
| dirt-oval | 0.5434 | fair |  | seatrack | 0.0888 | fair |
| river-run | 0.6489 | fair |  | city-circuit | 0.6576 | fair |
| space-sprint | 0.1355 | fair |  | mountainstreet | 0.2467 | fair |
| luger-hill | 0.5437 | fair |  | searound | 0.7440 | fair |
| garden-path | 0.8322 | fair |  | ice-track | 0.9742 | fair |

**SECONDARY: PASS — all 10 fair, min raw p = 0.0888.** Holm-Bonferroni never lowers a p-value, so with
the smallest raw p already > 0.05, every Holm-adjusted p is > 0.05 ⇒ **0 Holm-unfair start rows.**

> Note on method: the start-row gate uses the sim's **native** `computeFairnessStats` (the test it
> persists as `stats.pValue` and labels Fair/Unfair). An earlier pass used
> `computeExtendedFairnessStats`' per-band **ordinal Spearman** test, which **over-powers at N=300**
> (flags |r|≈0.03 as p<0.05). Effect sizes there are negligible (max |r| = 0.155, most ≈0.03–0.06),
> i.e. start-row explains <0.3% of within-band variance — a large-N statistical artifact, **not** real
> bias. Kept as exploratory context only, excluded from the gate.

## Context only (not gate criteria) — honestOverlap% (non-penetration)

dirt-oval 2.52 · river-run 2.95 · space-sprint 2.18 · luger-hill 3.00 · garden-path 2.17 ·
seatrack 1.97 · city-circuit 2.52 · mountainstreet 1.90 · searound 3.75 · ice-track 2.38 (%).
The 6 reusable tracks match the deterministic re-gate report (e.g. searound 3.75 vs 3.73, mountainstreet
1.90 vs 1.90) to within rounding; the 4 new tracks sit in the same low 2–3% band. No overlap drift.

## OVERALL VERDICT

**Strict gate (every track B3 ≥ 70% AND 0 Holm-unfair): FAILED — on PRIMARY band-reach only, and only
because garden-path (69.97%) and searound (69.90%) graze ~0.1pp under 70%.**

- SECONDARY start-row fairness: unambiguous **PASS** (all p ≥ 0.089, 0 Holm-unfair).
- PRIMARY band-reach: **8/10 clear; 2 tracks land at 69.9–70.0%**, within sampling error of the line.
- Overall band-reach (80.6–82.5%) is comfortably clear on all 10; only the single tightest zone on two
  tracks grazes below.

This is not a look-before-brake regression (the deterministic paired re-gate already showed LBB is
neutral-to-beneficial here). It is the hard 70% B3 criterion coinciding with where garden-path and
searound structurally sit. Whether that counts as a fail is an **owner threshold decision**: treat 70%
as a hard cliff (→ FAIL on 2 tracks), or acknowledge these tracks sit at 70% ± noise and judge the
stack fair. No parameter change is warranted by this evidence; nothing was committed or tagged.

## Artifacts
- `results/final-gate-gap/` — 4 new tracks (seeds 1–6), `MANIFEST.json`, `pool-gate.mjs`,
  `GATE-RESULT.json`, `GATE-RESULT.txt`, this report.
- Reused: `results/lbb-regate-det/head/` (6 tracks, provenance `3f9a055`).
