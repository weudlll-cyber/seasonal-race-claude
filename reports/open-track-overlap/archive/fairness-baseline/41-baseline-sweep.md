# Report 41 — Post-Gate-Fix Fairness Baseline (N=50, Race Plan ON)

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-07
**Status:** Baseline established. One structural issue flagged (rocket/open tracks). No gate regression.

---

## Sweep parameters

```
node scripts/sim-fairness.mjs \
  --openRacers=60 --closedRacers=40 \
  --dur=60 --races=50 \
  --race-plan=true --bonusMult=2.0
```

- Race Plan: ✅ aktiv (`bonusUntil=75%`, `fade=1500ms`, `corridor=55%→95%`)
- Rubber-Band: ✅ aktiv
- `avoidanceBufferPct=0.20` (geometric gate, report 39)
- Seed=0 (exploration)
- Wall clock: 5527s (~92 min)

All prior sim results are voided by the scale cleanup (report 31+33) and the geometric gate fix (report 39).

---

## Overall result: 64/66 PASS (97.0%)

Expected false positives at α=0.05 with 66 combos: **3.3**. Getting 2 is below that rate.

| Metric | Value |
|---|---|
| Total combos | 66 |
| χ² PASS (p≥0.05) | **64** |
| χ² FAIL (p<0.05) | **2** |
| overlap=0.0% combos | **66/66** |
| outcomeReached=100% | all open-track combos |

---

## Chi-square results by track

### Dirt Oval (closed) — 10 combos, all PASS

| Racer | χ² | p |
|---|---|---|
| horse | 4.7 | 0.696 |
| elephant | 2.5 | 0.866 |
| giraffe | 5.7 | 0.579 |
| snake | 9.3 | 0.155 |
| dragon | 6.6 | 0.468 |
| buggy | 4.0 | 0.549 |
| motorbike | 5.4 | 0.496 |
| beetle | 6.2 | 0.282 |
| boarder | 4.5 | 0.614 |
| snowmobile | 13.7 | 0.057 |

### River Run (open) — 7 combos, all PASS

| Racer | χ² | p | 1.5×-Gate |
|---|---|---|---|
| duck | 0.8 | 0.689 | ✅ |
| dragon | 0.9 | 0.832 | ✅ |
| rocket | 6.5 | 0.089 | ❌ |
| koi | 0.7 | 0.868 | ✅ |
| turtle | 3.4 | 0.329 | ✅ |
| manta | 2.3 | 0.512 | ✅ |
| dolphin | 1.7 | 0.646 | ✅ |

### Space Sprint (open) — 3 combos, all PASS

| Racer | χ² | p | 1.5×-Gate |
|---|---|---|---|
| dragon | 0.4 | 0.936 | ✅ |
| rocket | 3.9 | 0.269 | ❌ |
| plane | 3.6 | 0.160 | ✅ |

### Garden Path (closed) — 12 combos, all PASS

| Racer | χ² | p |
|---|---|---|
| horse | 2.1 | 0.907 |
| duck | 1.4 | 0.845 |
| snail | 2.6 | 0.630 |
| elephant | 2.3 | 0.891 |
| giraffe | 3.9 | 0.697 |
| snake | 6.3 | 0.394 |
| dragon | 9.2 | 0.238 |
| buggy | 2.2 | 0.824 |
| motorbike | 4.2 | 0.650 |
| beetle | 6.5 | 0.257 |
| boarder | 10.3 | 0.067 |
| snowmobile | 6.0 | 0.541 |

### City Circuit (closed) — 6 combos, all PASS

| Racer | χ² | p |
|---|---|---|
| horse | 6.3 | 0.504 |
| dragon | 4.7 | 0.696 |
| f1 | 2.6 | 0.756 |
| motorbike | 12.6 | 0.050 |
| beetle | 9.7 | 0.084 |
| boarder | 3.6 | 0.736 |

### Luger Hill (open) — 5 combos, all PASS

| Racer | χ² | p | 1.5×-Gate |
|---|---|---|---|
| dragon | 4.0 | 0.407 | ✅ |
| rocket | 4.7 | 0.192 | ❌ |
| plane | 1.0 | 0.794 | ✅ |
| luge | 12.2 | 0.057 | ❌ |
| snowmobile | 2.6 | 0.630 | ✅ |

### Ice Track (closed) — 3 combos, all PASS

| Racer | χ² | p |
|---|---|---|
| horse | 10.1 | 0.119 |
| luge | 6.0 | 0.741 |
| snowmobile | 2.4 | 0.883 |

### Mountainstreet (open) — 6 combos, all PASS

| Racer | χ² | p | 1.5×-Gate |
|---|---|---|---|
| horse | 2.0 | 0.576 | ✅ |
| dragon | 0.2 | 0.966 | ✅ |
| f1 | 3.6 | 0.160 | ❌ |
| motorbike | 3.2 | 0.204 | ❌ |
| beetle | 0.2 | 0.915 | ✅ |
| boarder | 2.7 | 0.261 | ✅ |

### Searound (closed) — 7 combos, all PASS

| Racer | χ² | p |
|---|---|---|
| duck | 3.4 | 0.329 |
| **dragon** | **11.7** | **0.038** ❌ |
| rocket | 3.2 | 0.527 |
| koi | 2.8 | 0.730 |
| turtle | 3.7 | 0.594 |
| manta | 7.0 | 0.319 |
| dolphin | 3.7 | 0.591 |

### Seatrack (open) — 7 combos, 1 FAIL

| Racer | χ² | p | 1.5×-Gate |
|---|---|---|---|
| duck | 2.1 | 0.355 | ✅ |
| dragon | 2.2 | 0.543 | ❌ |
| **rocket** | **10.3** | **0.016** ❌ | ❌ |
| koi | 4.7 | 0.192 | ❌ |
| turtle | 7.1 | 0.067 | ❌ |
| manta | 0.2 | 0.966 | ✅ |
| dolphin | 1.0 | 0.794 | ✅ |

---

## Seed re-checks for χ² failures

### Searound × dragon (seed=0 p=0.038)

| Seed | χ² | p | Verdict |
|---|---|---|---|
| 0 | 11.7 | 0.038 | ❌ original |
| 2 | 0.4 | 0.992 | ✅ |
| 42 | 1.8 | 0.875 | ✅ |

**Conclusion: seed noise.** No systematic row bias. Cleared.

### Seatrack × rocket (seed=0 p=0.016)

| Seed | χ² | p | Verdict |
|---|---|---|---|
| 0 | 10.3 | 0.016 | ❌ original |
| 2 | 3.3 | 0.351 | ✅ |
| 42 | 9.4 | 0.025 | ❌ |

**Conclusion: structural.** 2/3 seeds fail. See analysis below.

---

## Structural issue: Rocket on open tracks

Every open-track rocket combo shows the same signature:

| Metric | Value | Healthy range |
|---|---|---|
| brake% | 95–96% | ~50–87% |
| blocked (P-controller) | 94% | ~60–83% |
| honest% | 1.3% | ~2–4% |
| resolution | Ø2.6–2.8 fr | Ø7–19 fr |
| bmFail | ~40k | ~12–26k |

The speed-brake fires on nearly every frame. With `blocked=94%`, the Race Plan's P-controller cannot issue target-rank bonuses for 94% of frames. Row fairness depends almost entirely on which rows the re-roll lottery favours, making p-values highly seed-sensitive at N=50 (seed=0: p=0.016, seed=2: p=0.351, seed=42: p=0.025).

**This is a regression caused by the scale cleanup (report 31), not the gate fix.** Empirical baseline comparison (report 42) shows:
- `backup/step2-stageC` (before scale cleanup): Seatrack width=395 px, 3 rows, brake=81%, p=0.866 ✅
- `backup/y-reject-fair` (before gate fix, same width): brake=84%, p=0.689 ✅
- Current (scale cleanup → Seatrack 395→300 px): 4 rows, brake=96%, p=0.016 ❌

The scale cleanup correctly fixed Seatrack's width to 300 px. This added a 4th starting row for 60 racers (3→4), increasing pack density and pushing brake from 81% to 96%. The Race Plan P-controller can no longer function (blocked 94% of frames).

Backlog: body-based speed-brake zone (replace `frameSizePx × 1.5` with `contactLength × factor`) is the architecturally consistent fix, matching the approach taken in the geometric gate fix.

---

## Quality spot-check

All open-track combos show healthy quality metrics:

| Metric | Range | Note |
|---|---|---|
| overlap | 0.0% | Hard geometric, gate working |
| honest | 1.3–3.7% | 1.3% rocket-only (structural), rest healthy |
| zigzag | 0.000149–0.000331 | All well below 0.003 threshold |
| outcomeReached | 100% | All open tracks |
| natOvt | 100% | All open tracks |
| stableOvt | 11.4–13.5 | Healthy overtake stability |

Closed tracks:
- `overlap=0.0%` on all 40 closed-track combos
- `crossLap=0.0%` on all closed-track combos
- `sameLap=100.0%` on all closed-track combos

---

## Race Plan zone success

Overall 59.2% — consistent with previous baselines.

| Zone | Open | Closed | All |
|---|---|---|---|
| B1 (1–5) | 54.8% | 55.8% | 55.4% |
| B2 (6–15) | 49.0% | 54.9% | 52.4% |
| B3 (16–25) | 47.9% | 52.9% | 50.8% |
| B4 (26–40) | 56.3% | 69.4% | 63.8% |
| B5 (41+) | 71.0% | — | 71.0% |
| **OVERALL** | | | **59.2%** |

---

## Conclusion

**The geometric gate build (report 39) is clean across all 66 combos.**

- `overlap=0.0%` on every combo — the visible body-stacking bug is fixed
- 64/66 chi-square passes — below the expected false-positive rate at α=0.05
- 1 seed-noise fail (Searound × dragon) — cleared by re-checks
- 1 structural fail (Seatrack × rocket) — regression from scale cleanup (Seatrack width 395→300 px adds 4th row), not a gate regression (see report 42)

**This sweep is the new fairness baseline of record.** All prior sim results (from before the scale cleanup and gate fix) are voided.

**Remaining backlog (not blocking):**
- Rocket/Seatrack regression from scale cleanup: body-based speed-brake zone fix needed (report 42)
- 9 combos with 1.5×-Gate row-share flags (all pass chi-square) — informational; revisit if any escalate at N=100
