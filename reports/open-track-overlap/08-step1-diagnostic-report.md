# Step-1 Diagnostic Report: Isolation + Pass-Through Telemetry

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Commits:** `1f43ee9` (Step 1 behavior), `1dca1e9` (sim parity fix + brakeMatchFailureCount)
**Sim settings:** `--openRacers=60 --closedRacers=40 --dur=60 --race-plan=true --seed=1`
**Purpose:** Diagnose the Step-1 fairness failures from report 07; instrument pass-through metric

---

## Critical Finding: Sim Parity Bug

**The Step-1 validation sim (report 07) did not apply brake-to-match.**

`sim-fairness.mjs` line 691 used `const brake = r.avoidanceActive ? effectiveBrakeFactor : 1.0` — the same formula as before Step 1. `applyRacerBehavior` correctly computed `r.brakeMatchFactor` but the sim t-update never read it. All Step-1 sim results in report 07 were effectively identical to "brake-to-match OFF."

**Parity fix:** sim t-update changed to `Math.min(effectiveBrakeFactor, r.brakeMatchFactor ?? effectiveBrakeFactor)`, mirroring `index.jsx`. Committed at `1dca1e9`.

**Consequence for report 07:** The two original fairness failures (Dirt Oval × dragon p=0.029, Luger Hill × dragon p=0.038) were measured without brake-to-match. They reflected LF-reset behavior only, not Step-1 behavior. The isolation experiment below re-runs these combos correctly.

---

## Part 1 — Pass-Through Telemetry (`brakeMatchFailureCount`)

**Definition (report 06 §7):** Events where a trailer with `brakeMatchFactor < 1.0` (brake-to-match engaged) still out-advances its locked leader for 5 consecutive frames while both are within the longitudinal brake zone.

**Results — corrected N=10 full sweep (with parity fix):**

| Combo (open tracks only) | honest% | bmFail | Interpretation |
|---|---|---|---|
| River Run × duck | 2.6% | 90,117 | High — frequent cap bypass |
| River Run × dragon | 3.5% | 84,173 | High |
| River Run × rocket | 0.7% | 82,343 | High |
| River Run × koi | 2.7% | 90,472 | High |
| River Run × turtle | 2.4% | 94,404 | High |
| River Run × manta | 2.4% | 86,114 | High |
| River Run × dolphin | 1.3% | 84,283 | High |
| Space Sprint × dragon | 4.1% | 89,824 | High |
| Space Sprint × rocket | 0.8% | 86,551 | High |
| Space Sprint × plane | 2.4% | 86,694 | High |
| Luger Hill × dragon | 4.7% | 86,172 | High |
| Luger Hill × rocket | 0.6% | 77,786 | High |
| Luger Hill × plane | 3.2% | 81,057 | High |
| Luger Hill × luge | 1.6% | 92,316 | High |
| Luger Hill × snowmobile | 1.9% | 84,712 | High |
| Mountainstreet × horse | 1.0% | 87,346 | High |
| Mountainstreet × dragon | 3.5% | 84,625 | High |
| Mountainstreet × f1 | 2.2% | 80,390 | High |
| Mountainstreet × motorbike | 1.2% | 86,621 | High |
| Mountainstreet × beetle | 1.2% | 91,380 | High |
| Mountainstreet × boarder | 1.1% | 87,751 | High |
| Seatrack × duck | 2.8% | 90,849 | High |
| Seatrack × dragon | 3.7% | 87,021 | High |
| Seatrack × rocket | 0.7% | 83,255 | High |
| Seatrack × koi | 2.9% | 92,163 | High |
| Seatrack × turtle | 2.4% | 92,723 | High |
| Seatrack × manta | 2.4% | 85,505 | High |
| Seatrack × dolphin | 1.3% | 84,296 | High |

**`brakeMatchFailureCount` is high (~80K–95K) on every open combo. Step 1 does NOT stop pass-through. The target of 0 events per combo is not met by a wide margin.**

### Why `brakeMatchFailureCount` is so high

The brake-to-match cap is computed by `applyRacerBehavior` in frame N and applied to the t-update in frame N+1 (one-frame lag, same pattern as `avoidanceActive`). Between frame N and N+1, the trailer's `baseSpeed` can change via a re-roll. When a trailer just received a fast re-roll, its speed jumps before the cap updates. The cap from frame N was calibrated to the OLD speed. Result: the trailer out-advances the leader for multiple frames until `applyRacerBehavior` in frame N+1 computes a tighter cap.

The one-frame lag makes the brake-to-match a "chase" rather than a hard cap: it limits speed one frame behind actual speed changes. This architectural limitation means Step 1 cannot fully prevent pass-through when re-rolls fire.

**Step 1 does not achieve its core goal of stopping pass-through. The bmFail metric confirms this across all 27 open combos. This is not a parameter-tuning issue — it is a structural limitation of the one-frame-lag + re-roll timing interaction.**

---

## Part 2 — 2×2 Isolation Study

### Setup

For the two combos that appeared unfair in report 07's (incorrect) sim, run N=50 with the corrected sim under 4 configurations:

| Cell | LF | btm | Formula |
|---|---|---|---|
| A | 0.0114 | ON | Current Step-1 state |
| B | 0.0114 | OFF | `speedMatchMinDifferential=999` — isolates LF reset effect |
| C | 0.0228 | ON | Old probe LF + brake-to-match |
| D | 0.0228 | OFF | Phase-1 baseline (no btm, old probe LF) |

### Results — Luger Hill × dragon (open, 60 racers, 4 rows)

| Cell | LF | btm | p (N=50) | Fair? | B1top5% | bmFail | Per-row wins |
|---|---|---|---|---|---|---|---|
| **A** | **0.0114** | **ON** | **0.308** | **✅** | **38.0%** | **434,305** | R0=6% R1=11% R2=10% R3=14% |
| B | 0.0114 | OFF | 0.308 | ✅ | 60.0% | 0 | R0=15% R1=15% R2=19% R3=27% |
| C | 0.0228 | ON | **0.015** | **❌** | 41.2% | 398,511 | R0=34% R1=22% R2=8% R3=9% |
| D | 0.0228 | OFF | 0.252 | ✅ | 60.8% | 0 | R0=8% R1=21% R2=21% R3=17% |

**Reading:** Cell A (current Step-1) is FAIR at N=50. The original report-07 failure (p=0.038 at N=10) was N=10 noise measured without the parity fix. The correctly simulated Step-1 at N=50 is fair.

**Notable:** B1top5 drops from ~60% (btm OFF) to ~38% (btm ON). The brake-to-match suppresses back-row reach significantly even when overall fairness holds. Cell C (LF=0.0228 + btm ON) is unfair — the combination of high LF and btm is dangerous; at LF=0.0114 btm alone does not cause unfairness on this track.

### Results — Dirt Oval × dragon (closed, 40 racers, 8 rows)

| Cell | LF | btm | p (N=50) | Fair? | B1top5% | Per-row wins (selected) |
|---|---|---|---|---|---|---|
| **A2** | **0.0114** | **ON** | **0.579** | **✅** | **54.0%** | Balanced across all 8 rows |
| B2 | 0.0114 | OFF | 0.928 | ✅ | 65.2% | Balanced |
| C2 | 0.0228 | ON | 0.504 | ✅ | 60.4% | Balanced |
| **D2** | **0.0228** | **OFF** | **0.003** | **❌** | **67.2%** | R0=10%… R4=29% strong skew |

**Revelation:** Cell D2 (LF=0.0228, btm OFF) — the Phase-1 baseline condition — is UNFAIR at N=50 (p=0.003). This unfairness was hidden by N=10's low statistical power in Phase-1. The LF reset from 0.0228 to 0.0114 actually **fixed** a pre-existing fairness problem on Dirt Oval × dragon. The original report-07 failure (p=0.029 at N=10) reflected this pre-existing issue measured without the parity fix, not a Step-1 regression.

---

## Part 3 — Full Corrected Sweep (N=10, parity fix applied)

Run: `--races=10 --seed=1`, with brake-to-match correctly applied.

**Result: 60/66 fair. 6 failures.**

| Failing combo | p | Row pattern |
|---|---|---|
| **River Run × dolphin** | **0.001** | **R0=90%** (expected 33%) — catastrophic front-row bias |
| Mountainstreet × f1 | 0.006 | R0=80% (expected 33%) — severe |
| City Circuit × beetle | 0.029 | closed track, structural skew |
| Space Sprint × rocket | 0.044 | R0=10% — back-row bias, borderline |
| Luger Hill × rocket | 0.044 | R0=70% — front-row bias, borderline |
| Seatrack × koi | 0.044 | front-row bias, borderline |

The 6 N=10 failures at p=0.044 are borderline (need N=50 to confirm), but River Run × dolphin (p=0.001, R0=90%) and Mountainstreet × f1 (p=0.006, R0=80%) are strong signals at N=10.

**Notably:** Dirt Oval × dragon and Luger Hill × dragon — the original report-07 failures — are now FAIR (p=0.990 and p=0.308 respectively).

### Why the new failures appear

With brake-to-match correctly applied, faster trailers are capped to leader speed. Since Row 0 racers start in front, rows 1–3 are always in the "trailer" role approaching Row 0 leaders. The brake-to-match prevents catch-up, turning starting position into a persistent advantage. For some track × racer combinations (e.g. dolphin on River Run), the cap is so effective that Row 0 wins ~90% of races.

This is the design risk identified in the design doc: "making a faster trailer brake-and-hold behind a slower leader could strip comeback racers... A design that simply traps fast racers behind slow ones is a FAILURE." The isolation confirms this is happening for specific combinations at N=10.

The combinations that fail hardest are those where the speed differential between rows is large and the track geometry creates persistent close-following (not much natural lateral spreading).

**This is a design-level STOP, not a parameter issue.** The brake-to-match without lateral escape (Step 2) creates a "first-place freeze" for affected combos. Step 2's lateral escape is the structural fix.

---

## Conclusions

### 1. Report-07 failures were N=10 noise + parity bug

The two failures in report 07 (Dirt Oval × dragon, Luger Hill × dragon) were:
- Dirt Oval × dragon: pre-existing unfairness at LF=0.0228 (Phase-1 baseline), fixed by the LF reset. Not a Step-1 regression.
- Luger Hill × dragon: N=10 noise. At N=50 with correct simulation: p=0.308, fully fair.

### 2. Step 1 does not stop pass-through

`brakeMatchFailureCount` is 80K–95K per open combo (10 races). The structural cause is the one-frame lag between cap computation and application: a re-roll fires between frames, raising the trailer's speed above the cap before it updates. This is not fixable within Step 1 without removing the lag.

### 3. The corrected Step-1 (parity fix) has 6 failures at N=10

With brake-to-match correctly applied in the sim, 6 new unfair combos appear. River Run × dolphin (p=0.001) and Mountainstreet × f1 (p=0.006) are confirmed failures at N=10 power. The other four (p=0.044) need N=50 to confirm.

### 4. Root cause: brake-without-escape = front-row freeze

Without Step 2's lateral escape, the brake-to-match prevents ALL overtaking for affected combos. The fastest way to fix this is to implement Step 2, which gives trailers a lateral path around the leader — restoring climb-ability while preventing straight-through pass-through.

### 5. The 2×2 isolation result is clear

| Condition | Luger Hill × dragon | Dirt Oval × dragon |
|---|---|---|
| LF=0.0114, btm ON (Step-1 current) | FAIR p=0.308 | FAIR p=0.579 |
| LF=0.0114, btm OFF (LF only) | FAIR p=0.308 | FAIR p=0.928 |
| LF=0.0228, btm ON | UNFAIR p=0.015 | FAIR p=0.504 |
| LF=0.0228, btm OFF (Phase-1) | FAIR p=0.252 | **UNFAIR p=0.003** |

The LF=0.0114 baseline is safe for both combos with or without btm. The original failures were artifacts.

---

## Revised Definition of Done — Step 1

| Gate | Target | Corrected Status |
|---|---|---|
| `lateralForce` reset | 0.0114 | ✅ Confirmed |
| Rollback tag + hash | `28ab6ae4` | ✅ Confirmed |
| Flag 2 + Flag 3 resolved | Explicit | ✅ Confirmed |
| Sim parity | sim mirrors index.jsx | ✅ Fixed at `1dca1e9` |
| `brakeMatchFailureCount` | 0 per combo | ❌ ~80-95K per combo — structural, not fixable in Step 1 |
| Honest overlap | Modest change only | ✅ All combos within expected range |
| Chi-square fairness (corrected) | p ≥ 0.05 all 66 | ❌ 6 failures in corrected N=10 sweep |
| Back-row fair-chance | No starvation | ❌ B1top5 drops ~20pp with btm ON; river dolphin R0=90% |
| Zigzag not increased | No increase | ✅ All equal or lower |
| Tests green | 2625 pass | ✅ All green |

**Overall: STOP. Step 1 achieves structural correctness (code, tests, parity) but fails the fairness and pass-through gates. Step 2 (lateral escape) is the required fix.**

---

## Recommendation

Proceed to **Step 2 implementation** (avoid-first lateral commitment). The Step-1 failures are a known design consequence of the brake without escape: exactly what the design doc predicted. Step 2 provides the lateral escape that prevents front-row freeze while maintaining pass-through prevention. The corrected isolation confirms the LF=0.0114 baseline is sound for both previously-flagged combos.

The `brakeMatchFailureCount` metric remains a valid Step-2 gate: it should drop significantly when lateral escape allows trailers to clear the brake zone by going around, reducing the number of frames where the cap is bypassed by re-roll timing.
