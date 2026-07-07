# Action-1 sweep — RECOMMENDATION & honest verdict

**Feature at HEAD `eddc2a3` (default OFF).** Two-sided contest director (brake instantaneous leader + boost featured challengers toward it) on the median-gap-held front, with areaBonus (`--bonusMult`) swept as the fairness knob. Sweep: 4 tracks (searound/garden-path closed@40, mountainstreet/seatrack open@60), uniform 60 s. Phases: COARSE (72 cells×30), FINE (32×30), CONFIRM (4×100). Total wall ~56 min.

## Headline: FIRST setting in the arc that is BOTH attractive AND fair — **4/4 tracks fair-pass** at CONFIRM.

**Winning setting:** median-gap brake `rbBrakeThreshold=0.01 rbMaxBrake=0.18` (tip-focus OFF) + two-sided director `leaderBrake=0.15 challengerBoost=0.10 castSize=6 dwell=0.06 pullStrength=0.06` + **`bonusMult=0.5`** (half areaBonus). Tail-lift OFF, surge OFF.

## CONFIRM (4 tracks × 100 seeds)

| track | leadΔ% | podium% | distinctP1 | stableOvt | gapMax | corrP1 | corrT3 | B1 | B2 | B3 | B4 | Holm start-row | FAIR |
|-------|-------|--------|-----------|----------|-------|-------|-------|----|----|----|----|------|------|
| searound (closed) | 24 | 26 | 8.7 | 8.4 | 17.8 | 0.11 | 0.10 | 82% | 79% | 71% | 89% | p=0.79 fair | ✅ |
| garden-path (closed) | 33 | 36 | 8.7 | 8.3 | 18.2 | 0.10 | 0.10 | 85% | 81% | 71% | 88% | p=0.79 fair | ✅ |
| mountainstreet (open) | 37 | 40 | 8.3 | 18.5 | 12.0 | 0.12 | 0.10 | 75% | 76% | 70% | 73% | p=0.79 fair | ✅ |
| seatrack (open) | 36 | 39 | 8.7 | 18.6 | 11.2 | 0.12 | 0.11 | 82% | 78% | 70% | 72% | p=0.36 fair | ✅ |

- **Band-reach ≥70% on EVERY band, EVERY track. corrP1 (targetRank vs early-front) ≤0.12 everywhere. Holm start-row fair everywhere.** → **4/4 fair-pass.**
- **Front held** (gapMax 11–18 vs 23–39 baseline). **Front broadened** (distinctP1 3→~8.7 — many more racers reach the lead). vs the flat baseline (leadΔ ~0.1%, distinctP1 ~3).

## The areaBonus trade-off (the point of sweeping 2.0/1.0/0)

| bonusMult | corrP1 (max across tracks) | B3 (min across tracks) | verdict |
|-----------|---------------------------|------------------------|---------|
| 2.0 (shipped, +6% B1) | 0.25–0.35 ✗ | 73–77% ✓ | band-reach OK, unpredictability BROKEN |
| 1.0 (+3%) | 0.18–0.23 ✗ | 68–71% (borderline) | both marginal |
| **0.5 (+1.5%)** | **0.10–0.12 ✓** | **70–71% ✓ (at N=100)** | **BOTH PASS — the sweet spot** |
| 0.3 | 0.06–0.08 ✓ | 65–68% ✗ | unpredictability great, band-reach fails |
| 0 (off) | 0.01–0.03 ✓ | 62–70% ✗ (garden-path/seatrack fail) | unpredictability great, band-reach fails |

The gates squeeze from opposite sides: B3 needs areaBonus (pre-sort), corrP1 is broken by areaBonus (in a compressed field the +6% winner-band bonus dominates). **`bonusMult=0.5` is the narrow overlap** — enough pre-sort to hold B3 ≥70%, little enough to keep corrP1 ≤0.12. At N=30 B3 read 68% (borderline); at N=100 it firmed to 70–71% (Lesson 158 near-threshold noise).

## Honest verdict — real, but read the caveats

- **This is the goal, achieved, for the first time:** front-relevant action (lead/podium contest, front broadened 3→8.7 racers) that stays fair (band-reach ≥70% all bands, winner decorrelated corrP1 ≤0.12, start-row fair). The two-sided contest (brake leader + boost challenger) is what finally forced it — the one-sided ±12% director could not.
- **CAVEAT 1 — closed-track action is partly FLICKER.** leadΔ 24–37% is high, but on CLOSED tracks `stableOvertakes` is only ~8.3 (≈ baseline ~7.5): much of the closed-track leadΔ is P1/P2 micro-swapping, not clean overtakes (no lateral room to pass). On OPEN tracks `stableOvertakes` is **18.6 (~2.5× baseline)** — there the overtaking is genuinely real. So: strong real front action on open tracks; a lively-but-flickery front on closed tracks. The *broadening* (distinctP1 3→8.7) is real on all tracks. An owner eye-test should confirm the closed-track front reads as exciting, not jittery.
- **CAVEAT 2 — B3 passes with thin margin (70–71%).** It clears the gate at N=100 but isn't comfortable. A future stage could widen the margin (e.g. suppress areaBonus pre-OUTCOME entirely and restore it only in OUTCOME, decoupling the corrP1 leak from band-reach — then bonus could go higher for B3 without hurting corrP1).
- **Not oversold:** this is a fair, attractive *sweep result* on the representative default racer, not a shipped default. It licenses an owner eye-test and (if that passes) a broader fairness re-gate before any default-on decision.

## Recommendation

Adopt **`bonusMult=0.5` + two-sided director `leaderBrake=0.15 challengerBoost=0.10 cast6 dwell0.06 pull0.06` + median-gap brake `bt0.01 mb0.18`** as the candidate for an owner eye-test (esp. to judge closed-track flicker-vs-real). If the eye-test passes, next stage: decouple areaBonus from the corrP1 leak (suppress pre-OUTCOME / restore in OUTCOME) to widen the B3 margin, then a full fairness re-gate. Nothing here ships; feature remains default OFF (`governorDirectorLeaderBrake=0`, `governorDirectorChallengerBoost=0`).
