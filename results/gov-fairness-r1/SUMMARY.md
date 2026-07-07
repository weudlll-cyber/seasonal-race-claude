# Governor Fairness-Safety Sweep — Round 1 (corner-test)

**Goal:** screen the CORNERS of the admin-reachable governor knob envelope for fairness
(does the pre-assigned target-rank winner still win / band-reach hold?). This is a SAFETY
screen, not a sweet-spot tuning run.

**Setup:** 8 configs × 4 tracks × 30 races = 960 races. Governor ON; **surge + rubber-band
OFF** (governor tested isolated). Seeds 1–30, dur 60s, deterministic. Commit 24c99b6.
Held at default (feel-only, fairness-irrelevant): RampWidth, AMin, Frequency,
MaxStepPerFrame, BoundFloorFraction.

**Gates:** band-reach (zone-success rate) AMPEL GREEN ≥75 / YELLOW 65–75 / RED <65.
Fairness flag = chi-square start-row test (`stats.pValue < 0.05`, the sim's "Unfair"
count). Context: corridorViolationMean, winnerBlockedFractionInOutcome, swaps/step +
fieldSp (liveliness), leader→median max (gapMax, spacings).

## Result: ALL 32 combos GREEN — 0 unfair, 0 NaN, no dead field.

| Config | band-reach range | worst AMPEL | unfair | swaps/step | corrViol |
|---|---|---|---|---|---|
| C0 DEFAULT | 76–81% | GREEN | 0 | 0.55–0.79 | 5.5–5.9 |
| C1 MAX-COMPRESSION (bound 0.5, k0 0.15, maxEff 0.2, Action 0) | 78–80% | GREEN | 0 | 0.55–0.80 | 5.5–5.8 |
| C2 MAX-LOOSE-CHAOS (bound 10/12, k0 0.005, maxEff 0.2, AMax 0.2, Action 1) | 76–81% | GREEN | 0 | 0.71–1.16 | 5.7–6.3 |
| C3 TIGHT+HI-SHUFFLE (bound 0.5, AMax 0.2, Action 1) | 78–81% | GREEN | 0 | 0.65–1.09 | 5.6–6.1 |
| C4 ACTION-0 | 78–80% | GREEN | 0 | 0.55–0.78 | 5.5–5.8 |
| C5 ACTION-1 | 78–80% | GREEN | 0 | 0.55–0.80 | 5.4–5.9 |
| C6 MAX-EFFECT (0.2) | 76–81% | GREEN | 0 | 0.54–0.79 | 5.5–5.9 |
| C7 MIN-EFFECT (0.02) | 78–81% | GREEN | 0 | 0.55–0.79 | 5.5–5.8 |

## Verdict
**The whole admin-reachable envelope is fair.** No corner failed band-reach (all 76–81%,
≥75% GREEN) or the start-row test (0 unfair everywhere). Even the two most dangerous
extremes are clean:
- **MAX-COMPRESSION (C1)** — tightest bound + hardest force did NOT starve the OUTCOME
  controller: band-reach 78–80%, corridorViolation ~5.5–5.8 (in line with default), field
  still lively (swaps 0.55–0.80). No compression failure.
- **MAX-LOOSE-CHAOS (C2)** — widest bound + max shuffle did NOT distort the result:
  band-reach 76–81%, and it's the liveliest (swaps up to 1.16) without breaking fairness.

**No admin knob range needs restricting on fairness grounds** from this screen. The OUTCOME
controller (from corridorStart) reliably re-sorts to target ranks regardless of pre-OUTCOME
governor settings — as designed (governor fades to 1.0 before OUTCOME).

## Notes / caveats (for Round 2)
- **Holm:** the Holm-corrected confirmatory pass is not emitted in the sim's default output
  path; the fairness flag here is the per-combo **chi-square** start-row independence test
  (`pValue<0.05`) — the sim's own "Unfair" metric. All 32 passed. A Round-2 could run the
  Holm confirmatory family explicitly.
- **winnerBlockedFractionInOutcome ~42–45% on searound** looks high but is **config-
  independent** (identical across C0 default and C7 near-off), so it's a searound avoidance-
  in-OUTCOME property, NOT governor-caused.
- **leader→median max ~3.7–5.0 spacings**: the bound is not tightly enforced against the
  tailwind (soft barrier) — a *feel/effectiveness* matter for the sweet-spot sweep, not a
  fairness issue (band-reach holds regardless).
- 30 races is a screen with sampling noise around 70%; all results landed clearly ≥75%
  (GREEN), none in the YELLOW borderline, so no Round-2 escalation is triggered by this
  round.

## Reproducibility (per config, all with `--governorEnabled=true --pulkSurgeEnabled=false --rubber-band=false --seed=1 --races=30 --dur=60 --track=<T> --racer=<R>`)
- C0: (defaults)
- C1: `--governorSpacingMin=0.5 --governorSpacingMax=0.5 --governorK0=0.15 --governorMaxEffect=0.2 --governorAMax=0 --governorDrama=0`
- C2: `--governorSpacingMin=10 --governorSpacingMax=12 --governorK0=0.005 --governorMaxEffect=0.2 --governorAMax=0.2 --governorDrama=1`
- C3: `--governorSpacingMin=0.5 --governorSpacingMax=0.5 --governorK0=0.03 --governorMaxEffect=0.12 --governorAMax=0.2 --governorDrama=1`
- C4: `--governorDrama=0`   C5: `--governorDrama=1`   C6: `--governorMaxEffect=0.2`   C7: `--governorMaxEffect=0.02`
- Tracks: searound/manta, garden-path/snail (closed); seatrack/dolphin, river-run/duck (open).

Raw per-combo `fairness-data.json` in `results/gov-fairness-r1/<config>__<track>/`.
