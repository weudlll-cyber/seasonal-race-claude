# PHASE 1 Dry-Run Sweep — Band-Checkpoint Proportionalization

Tests whether making band resolve checkpoints **proportional** to `choreoOutcomeStart`
(instead of absolute) recovers the B3 band-reach that degrades as `choreoOutcomeStart` rises.
Real engine (sim-fairness.mjs), checkpoint overrides only — no racePlanner.js change. 4 tracks,
40 races/config, seed=1, default racer, 40 closed / 60 open. Master 5646d23.

**Gate:** a variant must (a) recover B3 by ≥4pp vs the real control **BASELINE_CURRENT**
(`choreoOutcomeStart=0.6` + absolute checkpoints — the actual shipped collision) **and**
(b) keep every populated band ≥70% on every track.

## ⚠️ Pre-flight finding (city-circuit, N=20) — read before the tables

- `choreoOutcomeStart` 0.5 → 0.6 drops B3: **71.5% → 66.0%** — `choreoOutcomeStart` is the causal driver.
- Moving the B3 checkpoint 0.70 → 0.88 at `choreoOutcomeStart=0.6` left B3 at **66.0%** (89/800 finishes
  reshuffled but **band-neutral**). Band-reach is **endpoint-determined** — the servo drives each racer to
  its Fisher-Yates target rank from `choreoOutcomeStart`→finish regardless of the checkpoint, which only
  reshapes the mid-race trajectory. So the checkpoint is not expected to be the B3 lever. The full sweep
  below tests this across 4 tracks at N=40.

## Variant checkpoints and settling windows

| Variant | pulkEnd | B1 | B2 | B3 | B4 | B5 | B3 win | B4 win | B5 win |
|---|---|---|---|---|---|---|---|---|---|
| BASELINE_OLD | 0.5 | 0.970 | 0.800 | 0.700 | 0.650 | 0.600 | 0.2 | 0.15 | 0.1 |
| BASELINE_CURRENT | 0.6 | 0.970 | 0.800 | 0.700 | 0.650 | 0.600 | 0.1 | 0.05 | 0 |
| VARIANT_A | 0.6 | 0.988 | 0.920 | 0.880 | 0.860 | 0.840 | 0.28 | 0.26 | 0.24 |
| VARIANT_B | 0.6 | 0.930 | 0.872 | 0.838 | 0.821 | 0.804 | 0.238 | 0.221 | 0.204 |
| VARIANT_C | 0.6 | 0.988 | 0.920 | 0.880 | 0.860 | 0.840 | 0.28 | 0.26 | 0.24 |
| VARIANT_D | 0.6 | 0.983 | 0.884 | 0.826 | 0.797 | 0.768 | 0.226 | 0.197 | 0.168 |

## B3 band-reach by variant (the primary metric)

| Variant | city-circuit | dirt-oval | mountainstreet | ice-track | mean | Δ vs control |
|---|---|---|---|---|---|---|
| BASELINE_OLD | 68.5% | 72.8% | 71.5% | 68.8% | 70.4% | — |
| BASELINE_CURRENT | 67.3% | 70.3% | 62.7% | 70.0% | 67.6% | (control) |
| VARIANT_A | 68.3% | 70.5% | 63.2% | 69.5% | 67.9% | +0.3pp |
| VARIANT_B | 68.5% | 69.5% | 62.5% | 67.5% | 67.0% | -0.6pp |
| VARIANT_C | 68.3% | 70.5% | 63.2% | 69.5% | 67.9% | +0.3pp |
| VARIANT_D | 68.0% | 69.8% | 63.0% | 70.3% | 67.8% | +0.2pp |

## Per-band band-reach (mean across 4 tracks)

| Variant | B1 | B2 | B3 | B4 | B5 | overall | all bands ≥70% |
|---|---|---|---|---|---|---|---|
| BASELINE_OLD | 81.0% | 78.4% | 70.4% | 84.2% | 88.4% | 80.1% | no (city-circuit/B3 68.5%) |
| BASELINE_CURRENT | 77.4% | 74.6% | 67.6% | 81.3% | 83.5% | 77.1% | no (mountainstreet/B3 62.7%) |
| VARIANT_A | 78.6% | 74.8% | 67.9% | 81.5% | 83.9% | 77.5% | no (mountainstreet/B3 63.2%) |
| VARIANT_B | 76.0% | 73.3% | 67.0% | 81.4% | 83.8% | 76.5% | no (mountainstreet/B3 62.5%) |
| VARIANT_C | 78.6% | 74.8% | 67.9% | 81.5% | 83.9% | 77.5% | no (mountainstreet/B3 63.2%) |
| VARIANT_D | 78.1% | 74.4% | 67.8% | 81.5% | 84.0% | 77.3% | no (mountainstreet/B3 63.0%) |

## Verdict

Control B3 (BASELINE_CURRENT): **67.6%**. Recovery threshold: +4pp.

- **VARIANT_A**: B3 Δ +0.3pp (below +4pp); all-bands-≥70% FAIL.
- **VARIANT_B**: B3 Δ -0.6pp (below +4pp); all-bands-≥70% FAIL.
- **VARIANT_C**: B3 Δ +0.3pp (below +4pp); all-bands-≥70% FAIL.
- **VARIANT_D**: B3 Δ +0.2pp (below +4pp); all-bands-≥70% FAIL.

**NO WINNER — Phase 1 premise falsified.** No proportional-checkpoint variant recovers B3 band-reach by
≥4pp over the 0.6-absolute control. This confirms the pre-flight finding: **the band checkpoint is not the
lever for B3 band-reach.** B3 collapse is caused by `choreoOutcomeStart` itself (later PULK end → less
OUTCOME servo runway to reach the target rank), which moving the checkpoint does not change.

### Root cause (revised)
- Band-reach = did the racer finish in its assigned band. The target rank (endpoint) is set by Fisher-Yates
  and enforced by the servo over `[choreoOutcomeStart → 1.0]`. Raising `choreoOutcomeStart` shortens that
  servo runway; the ±15%/+10% authority then has less time to close the rank error → more misses, worst in
  the deep bands (B3–B5) that need the largest corrections.
- The checkpoint (`choreoResolveBx`) only constrains the *hero curve shape* (when it must be in-band
  mid-race) — it changes the journey (trajectory reshuffles were observed) but not the destination.

### Recommended next directions (NOT this sweep)
1. **Do not raise `choreoOutcomeStart` past the point B3 holds ≥70%** — from SWEEP 2 that is ~0.6 borderline;
   the fairness cost of a later PULK is intrinsic, not a checkpoint bug.
2. **Add OUTCOME servo runway/authority for deep bands** — e.g. earlier per-band steering onset, or higher
   trajectoryMult authority for B3–B5, measured against band-reach.
3. **The checkpoint IS still useful for action, not fairness** — later checkpoints reshuffle the OUTCOME
   trajectory (89/800 finishes moved) without hurting band-reach, so proportionalization may still be worth
   shipping as an *action* lever once an OUTCOME-window action metric exists (see the action consultation).

---
_Configs present: 24/24._
_Note: VARIANT_C == VARIANT_A at pulkEnd=0.6 (offset never binds); identical results validate determinism._

