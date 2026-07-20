# EXP-PACK-RELEASE — Sim-Sweep Report (Pack-Only Strictness Release with Spatial Hysteresis)

**Date:** 2026-07-19 | **Author:** CC | **Status:** Complete — awaiting Owner eye-test + decision
**Sweep:** 4 variants × 4 tracks × 100 races × 60s = **1,600 races**, seed=1 (paired), `--hero-map` for Holm.
**Raw data:** `exp-pack-release-results/{ALL,V1-baseline,V2-out1,V3-out2,V4-out3}.csv` + `sweep.log`.

## Implementation provenance (all verified before the sweep)
- Mechanics change is confined to `racePlanner.js` (pack-only hysteretic strictness, heroes excluded); `defaults.js` (2 config keys, default OFF); `sim-fairness.mjs` (measurement only).
- **Byte-identical OFF proven:** full change set with flag off = clean-HEAD baseline fingerprint `4ec8e64dd2641ad3` (identical). Tests 101/101 pass (`racePlanner.test.js` + `raceGovernor.test.js`).
- **Spec correction:** `bandError` is integer-valued, so the spec's re-steer thresholds 1.0 and 1.5 are behaviourally identical. Sweep used **0.5 / 1.5 / 2.5** = re-steer at **≥1 / ≥2 / ≥3 ranks past the band edge** (three distinct levels; the spec's 1.0 ≡ this sweep's 1.5).

## Results (mean across 4 tracks)

| variant | re-steer at | **B1 reach** (gate ≥70%) | B2 reach (info) | Holm-unfair | **top-5 swaps/race** | total swaps/race | release/race | out-of-band |
|---|---|---|---|---|---|---|---|---|
| **V1-baseline** | — (OFF) | **77.2%** ✅ | 73.7% | 2/4 | 29.27 | 617.97 | 0 | 42.5% |
| **V2-out1** | ≥1 rank | **77.5%** ✅ | 74.2% | 3/4 | 29.64 (**+1%**) | 586.62 (−5%) | 91.2 | 43.9% |
| **V3-out2** | ≥2 ranks | **73.3%** ✅ | 70.5% | 3/4 | 33.52 (**+15%**) | 575.89 (−7%) | 64.8 | 45.7% |
| **V4-out3** | ≥3 ranks | **68.8%** ❌ | 66.3% | 3/4 | 33.90 (**+16%**) | 563.93 (−9%) | 52.8 | 47.2% |

### Per-track B1 band-reach (the gate is per-track, not just the mean)
| variant | luger-hill (open) | mountainstreet (open) | searound (closed) | dirt-oval (closed) | all ≥70%? |
|---|---|---|---|---|---|
| V1-baseline | 76.4% | 79.0% | 73.2% | 80.0% | ✅ |
| V2-out1 | 76.2% | 79.0% | 75.0% | 79.8% | ✅ |
| **V3-out2** | **72.8%** | **73.4%** | **71.4%** | **75.4%** | ✅ (all pass) |
| V4-out3 | 67.0% ❌ | 69.4% ❌ | 67.6% ❌ | 71.0% | ❌ (3/4 fail) |

## Findings

**1. The mechanism works and action rises with the threshold — but saturates at V3.**
Top-5 OUTCOME rank-change frequency: V2 **+1%** (negligible), V3 **+15%**, V4 **+16%**. The jump is V2→V3; V4 buys almost nothing more (+1pt) for a broken fairness gate. So **re-steering at ≥2 ranks out (V3) is the action sweet spot** — exactly the spec's "1.0" hypothesis (which ≡ this sweep's 1.5).

**2. Action concentrates at the FRONT, not the whole field.**
Top-5 swaps go **up** (+15% at V3) while *total* field swaps go **down** monotonically (−5/−7/−9%). Released pack racers drift smoothly (less overall churn), but the freedom lets the front reorder more. The drama moves to where the camera looks — arguably desirable, but it's an **eye-test question**, not something the numbers settle.

**3. B1 band-reach (PRIMARY gate) holds through V3, breaks at V4.**
V2 and V3 keep B1 ≥70% on **all four tracks**; V4 fails on 3/4. B2 reach (informational) tracks the same: V3 ≈70.5% mean (dips just under 70% on luger-hill 67.2% and searound 69.5%), V4 clearly fails. So the fairness ceiling for this lever is **V3**.

**4. ⚠️ Holm start-row gate is NOT met — including at baseline.**
Baseline is already **2/4 Holm-unfair** (luger-hill and searound, pHolm=0.02); every release variant is **3/4** (dirt-oval additionally flags). Two things follow:
   - The "Holm-unfair = 0" secondary gate **fails at baseline**, so it is a **pre-existing condition of the shipped world at N=100**, not something pack-release introduces.
   - Pack-release nonetheless **adds one unfair track** (dirt-oval) at every threshold — a small but real incremental cost.
   This needs a separate look (below) before any integration — it's the one result that blocks a clean "GO".

**5. Servo diagnostics are healthy.** Release/re-steer events are balanced every variant (e.g. V3 ≈65 release / 62 re-steer per race) — no runaway, the hysteresis converges. Released-frame fraction ~0.51–0.57 (pack spends ~half of OUTCOME free). Out-of-band fraction rises gently 42.5%→47.2% with looser thresholds (bounded — the F1 trap the concept was designed to avoid did not appear).

## Recommendation

**Winner: V3-out2 (re-steer at ≥2 ranks past the band edge).** It delivers **+15% top-5 OUTCOME action while holding the primary B1 band-reach gate (≥70%) on all four tracks** and keeping the servo well-behaved. V4 sacrifices the fairness gate for ~no extra action; V2 keeps fairness but delivers no action.

**But: conditional GO, not clean GO — two things must clear first:**

1. **Owner eye-test (the spec's own next step).** The signal is "+15% front action, −7% total churn." Whether that reads as *more alive* or *less busy overall* is exactly what the numbers can't decide. Record 2–3 V3 races vs baseline on luger-hill + searound.

2. **Resolve the Holm question.** The Holm gate fails at **baseline** (2/4), so this isn't a pack-release defect per se — but it means we cannot currently certify "start-row fairness preserved." Recommend a short, separate investigation: is the N=100 Holm flag a real shipped-world start-row bias (a pre-existing issue worth its own fix) or a measurement sensitivity? Until that's understood, V3's incremental +1 unfair track (dirt-oval) can't be cleanly signed off.

**If both clear:** integrate V3 to the browser **default-OFF with a DevScreen toggle** (per the spec), so the eye-test runs the identical code the sim measured.

## Hybrid option (recommended to keep on the table)

My B2-Heroes review (`CONCEPT-REVIEW-CC-B2HEROES.md`) found that concept is **fairness-safe by construction** — the generator refuses to cast any curve that misses its band, so it adds **zero Holm risk**. Because heroes are excluded from the pack-release gate, the two **compose cleanly**:
- **V3 pack-release** → emergent background motion + front reorder (+15%, but with the Holm caveat).
- **1 B2-attacker** → an authored front duel with **no fairness cost** (but feasible only to ~rank 4-7 under the 0.80 resolve, not rank 2-3).

A hybrid (V3 + one B2-attacker) is the most likely path to "OUTCOME feels alive" **without leaning the whole load on the pack lever that carries the Holm question.** Worth a follow-up sweep as a third arm.

## Decision options for the Owner
- **GO (V3)** — pending eye-test + Holm resolution; ship default-OFF + DevScreen toggle.
- **HYBRID** — V3 pack-release + 1 B2-attacker; run the combined sweep before shipping.
- **PIVOT (B2-only)** — if the Holm question can't be cleared, B2-heroes alone give fairness-safe front action (smaller effect, no Holm risk).
- **HOLD** — investigate the baseline Holm 2/4 first; it affects how every result here is read.

## Threats to validity
- **Holm at baseline (2/4)** is the biggest one — it colours every fairness read and is not pack-release-caused.
- **Track set:** 2 open (luger-hill, mountainstreet) + 2 closed (searound, dirt-oval); Searound is *closed* and Luger Hill *open* (the spec's parenthetical labels were swapped — mandatory names honoured, 2+2 split intact).
- **Single seeded racer per track** (Phase D default brand), 100 races — the house methodology. Action metric is OUTCOME-phase adjacent rank swaps (read-only, does not affect the fingerprint).
- Effect sizes are means across 4 tracks; per-track CSVs are in `exp-pack-release-results/` for the full distribution (incl. std dev).
