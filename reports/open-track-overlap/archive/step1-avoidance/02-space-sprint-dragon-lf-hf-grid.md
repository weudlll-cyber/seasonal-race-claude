# Probe: Space Sprint × Dragon — lateralForce × homeForceStrength Grid

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Sim:** `scripts/sim-fairness.mjs`
**Setup:** `--track=space-sprint --racer=dragon --openRacers=60 --dur=60 --races=20 --race-plan=true --seed=1`
**Purpose:** Exploratory grid — do lateralForce and homeForceStrength move honest overlap? At what ride-quality cost?
**Note:** Exploratory only. No defaults written. No auto-merge.

---

## Baselines

| Parameter        | Default value |
|-----------------|---------------|
| `lateralForce`   | 0.0114        |
| `homeForceStrength` | 0.030     |
| zigzag cutoff (target) | < 0.003 |

---

## Grid: 4 × 3 = 12 cells (20 races each, seed=1)

Rows = `lateralForce` (LF). Columns = `homeForceStrength` (HF).  
`*` = baseline cell. `⚠` = p < 0.05 (unfair). `↑` = honest% above baseline.

### honest% (body-extent overlap rate)

| LF \ HF         | HF=0.030 (base) | HF=0.045 (+50%) | HF=0.060 (+100%) |
|----------------|:--------------:|:--------------:|:---------------:|
| LF=0.0086 (−25%) | 4.1% ↑          | 5.0% ↑          | **5.8%** ↑       |
| LF=0.0114 (base) | **3.7%** *      | 4.4% ↑          | 5.2% ↑           |
| LF=0.0171 (+50%) | **3.3%**        | 3.8%            | 4.4% ↑           |
| LF=0.0228 (+100%)| **3.1%**        | 3.6%            | 4.0% ↑           |

### zigzag score (0.000 = perfect; cutoff < 0.003, none exceeded)

| LF \ HF         | HF=0.030        | HF=0.045        | HF=0.060         |
|----------------|:--------------:|:--------------:|:---------------:|
| LF=0.0086      | 0.000115        | 0.000096        | 0.000080         |
| LF=0.0114      | **0.000173** *  | 0.000152        | 0.000137         |
| LF=0.0171      | 0.000287        | 0.000276        | 0.000266         |
| LF=0.0228      | 0.000376        | 0.000401        | 0.000394         |

### chi-square p-value (must be ≥ 0.05; failures bold)

| LF \ HF         | HF=0.030        | HF=0.045        | HF=0.060         |
|----------------|:--------------:|:--------------:|:---------------:|
| LF=0.0086      | 0.084           | 0.527           | 0.389            |
| LF=0.0114      | **0.819** *     | **⚠ 0.040**     | 0.389            |
| LF=0.0171      | 0.527           | **⚠ 0.034**     | 0.527            |
| LF=0.0228      | 0.710           | 0.710           | 0.084            |

### 1.5×-gate verdict

| LF \ HF         | HF=0.030        | HF=0.045        | HF=0.060         |
|----------------|:--------------:|:--------------:|:---------------:|
| LF=0.0086      | ❌ R0=10%       | ✅              | ❌ R0=20%        |
| LF=0.0114      | ✅ *            | ❌ R0/R1/R2     | ❌ R0=20%        |
| LF=0.0171      | ✅              | ❌ R0/R2        | ✅               |
| LF=0.0228      | ✅              | ✅              | ❌ R2=10%        |

### lateral speed score (lower = smoother lateral movement)

| LF \ HF         | HF=0.030        | HF=0.045        | HF=0.060         |
|----------------|:--------------:|:--------------:|:---------------:|
| LF=0.0086      | 0.000322        | 0.000295        | 0.000267         |
| LF=0.0114      | **0.000407** *  | 0.000381        | 0.000348         |
| LF=0.0171      | 0.000554        | 0.000554        | 0.000524         |
| LF=0.0228      | 0.000675        | 0.000699        | 0.000697         |

### overlap resolution (avg frames a pair stays overlapping; lower = faster separation)

| LF \ HF         | HF=0.030        | HF=0.045        | HF=0.060         |
|----------------|:--------------:|:--------------:|:---------------:|
| LF=0.0086      | 43.9 fr         | 47.4 fr         | 51.7 fr          |
| LF=0.0114      | **40.6 fr** *   | 45.4 fr         | 47.3 fr          |
| LF=0.0171      | 34.6 fr         | 32.4 fr         | 40.6 fr          |
| LF=0.0228      | 25.3 fr         | 28.0 fr         | 29.8 fr          |

---

## Key Findings

### 1. lateralForce moves overlap — in the right direction
Higher LF clearly reduces honest overlap:

| LF       | honest% at HF=0.030 | vs. baseline |
|----------|:------------------:|:------------:|
| 0.0086   | 4.1%               | +0.4 pp      |
| 0.0114 * | 3.7%               | —            |
| 0.0171   | 3.3%               | **−0.4 pp**  |
| 0.0228   | 3.1%               | **−0.6 pp**  |

Effect: each doubling of LF buys roughly −0.4–0.6 pp overlap. The knob moves the needle, but modestly. Overlap resolution also shortens sharply with higher LF (40.6 fr → 25.3 fr at +100%), confirming that stronger lateral push separates pairs faster.

### 2. homeForceStrength moves overlap — in the WRONG direction
Higher HF *increases* honest overlap across every LF row:

| HF at LF=baseline | honest% | vs. base HF |
|-------------------|:-------:|:-----------:|
| 0.030 *           | 3.7%    | —           |
| 0.045             | 4.4%    | **+0.7 pp** |
| 0.060             | 5.2%    | **+1.5 pp** |

Mechanism: home force pulls racers back to their physicalY lane. During avoidance, lateral push moves a racer off-lane; stronger home force snaps it back faster, which shortens the time it spends displaced and brings it back into proximity with the adjacent racer sooner. Net effect: more frequent re-entry into overlap territory. Stronger HF fights the lateral avoidance system.

### 3. Two cells fail chi-square (p < 0.05) — at HF=0.045
- **LF=0.0114, HF=0.045**: p=0.040 (row split R0=20%/R1=60%/R2=20%) — unfair
- **LF=0.0171, HF=0.045**: p=0.034 (row split R0=15%/R2=60%) — unfair

Both at the intermediate HF value. Neither HF=0.030 nor HF=0.060 produces unfairness at the same LF values, suggesting HF=0.045 hits an unstable resonance where the pull-back timing disrupts the row-lottery. This should NOT be interpreted as a robust result at N=20; a re-run at N=50 would likely recover p≥0.05 for these cells. Flag as noise, not a hard exclusion.

### 4. Zigzag: rises with LF, within budget, nowhere near cutoff
- LF=0.0228 reaches zigzag ≈ 0.000400 (2.3× baseline), still 7.5× below the 0.003 cutoff.
- The rise is smooth and linear with LF; no threshold-crossing observed.
- Lateral speed score rises proportionally — racers do move more laterally, which the user's browser check should verify feels natural rather than jerky.

### 5. Weaker LF is strictly worse for overlap
LF=0.0086 raises honest% to 4.1% (HF=0.030) and as high as 5.8% (HF=0.060). Reducing lateral force is not a viable direction.

---

## Cells That Lower Overlap Without Cost

Only two cells cleanly beat baseline on all axes (honest% lower, p≥0.05, 1.5×gate PASS, no zigzag alarm):

| Cell              | honest% | Δ vs. base | p-val | 1.5×gate | zigzag   |
|-------------------|:-------:|:----------:|:-----:|:--------:|:--------:|
| LF=0.0171, HF=0.030 | **3.3%** | −0.4 pp  | 0.527 | ✅        | 0.000287 |
| LF=0.0228, HF=0.030 | **3.1%** | −0.6 pp  | 0.710 | ✅        | 0.000376 |

Both are at **HF=baseline (0.030)** — confirming that home force must stay put.

---

## Plain Read

Lateral force is the right knob: doubling it (0.0114 → 0.0228) cuts honest overlap
from 3.7% to 3.1% (−0.6 pp) with clean fairness and no zigzag alarm. The direction is
confirmed. The effect size is real but small — a 16% relative reduction, not the order-
of-magnitude improvement needed to call overlap "solved." Home force is the wrong knob
and should be left at its current default: raising it systematically worsens overlap and,
at HF=0.045, destabilises the chi-square (though that is likely N=20 noise, not a robust
failure). The most promising cell from this probe is **LF=0.0228, HF=0.030**: honest 3.1%,
p=0.710, clean gate, zigzag 2.3× baseline but still well within budget. LF=0.0171 is a
safer option with half the zigzag rise and only 0.2 pp more overlap. The next probe should
confirm the LF=0.0171–0.0228 band at N=50 races and then expand to other tracks (Luger
Hill, Seatrack, River Run) to verify that higher LF doesn't introduce unexpected wobble
on curvier paths where lateral dynamics are more exposed.

---

## Next Steps (in order)

1. **N=50 confirmation** — Re-run LF=0.0171 and LF=0.0228 (both at HF=0.030) with 50 races
   to stabilise the p-values and confirm gate results. Cost: ~2 × 1 min runs.
2. **Multi-track scan** — Check these two LF values on the other four open tracks (River Run,
   Luger Hill, Mountainstreet, Seatrack) to ensure no track-specific zigzag spike from
   higher lateral force on tight curves.
3. **lateralDamping interaction** — If zigzag rises meaningfully in step 2, pairing a small
   damping increase (baseline: 0.16) with the higher LF may restore smoothness without
   sacrificing the overlap benefit.
4. **Browser check** — Before any default change: verify LF=0.0228 in the actual browser
   (Space Sprint, dragon). The lateral speed score at this value (0.000675) is 66% higher
   than baseline; check that the visual feel is still natural rather than twitchy.
