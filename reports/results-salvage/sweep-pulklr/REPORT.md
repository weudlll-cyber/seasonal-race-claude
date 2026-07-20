# PulkLeadRotation — Overnight Fairness + Action Sweep

**Run:** feat/race-action @ `8fe7dd6` (S1+S2+S3 starvation-guard commit) · SWEEP 2026-07-13 01:49 → 03:51 · 30/30 runs rc=0.
Results are READ-ONLY (results/ only). No default flipped, no commit, no tag.

## Resolved config (reproducible)

**World (identical across A0/D2/D8 — only the mechanism toggle + dropDepth differ):**
- `directorV4Enabled=true`, **`directorV4OutcomeStart=0.5`** → PULK reopened to **[0.25, 0.50)** (this is the mechanism's live window; without it V4 collapses PULK to [0.25,0.25) and the mechanism never fires).
- `governorDirectorBoostHeadroom=0.10`, `governorDirectorChallengerBoost=0.06` (shipped) — two different knobs, not conflated.
- Shipped defaults: leaderBrake 0.10, frontPool 8, ceilingCap on, maxEffect 0.12, attackerSlots 2, minHold 750 ms, outsiderMaxReach 15, deadlockTimeout 12000 ms.
- **A0** = `pulkLeadRotationEnabled=false` (mechanism OFF, same V4 world). **D2/D8** = ON, `dropDepthLengths` = 2 / 8.

**Sampling:** N=100 seeds/track (`--seed=1`). Clean tracks: 60 s only. **Borderline (searound, luger-hill): 30/60/120 s → 300 races/track pooled** (the owed N≥100 confirm).

**Measurement window = [0.25, 0.50)** for every action metric (single action-metrics observer, live `[pulkStartLive, pulkEndLive)`; verified at source = the mechanism window). Field-spread snapshot taken at the **last PULK frame** (last frame with progress < pulkEnd ≈ 0.499), in **racer lengths** via the shared length scale. Fairness from `hero-map.json` (pooled rawData; band-reach = `computeZoneSuccessRate` OVERALL definition; Holm start-row via `computeExtendedFairnessStats`, nPerm 299).

> Note: the action observer additions (`leadChangesPulk`, `endFullSpreadLen`, `endSpreadP10P90Len`) are **read-only, uncommitted** instrumentation in `sim-fairness.mjs`. The mechanism under test is exactly `8fe7dd6`.

## Binding fairness gate: band-reach ≥ 70% AND 0 NEW Holm-unfair vs A0

| track | D2 | D8 |
|-------|----|----|
| city-circuit | **FAIL** (new Holm unfair, pHolm 0.02) | **PASS** |
| dirt-oval | PASS | PASS |
| garden-path | PASS | PASS |
| ice-track | PASS | PASS |
| luger-hill *(borderline)* | PASS (unfair PRE-EXISTING) | PASS (unfair PRE-EXISTING) |
| mountainstreet | PASS | PASS |
| river-run | **FAIL** (new Holm unfair, pHolm 0.04) | **PASS** |
| searound *(borderline)* | PASS (unfair PRE-EXISTING) | PASS (unfair PRE-EXISTING) |
| seatrack | **FAIL** (new Holm unfair, pHolm 0.04) | **PASS** |
| space-sprint | PASS (unfair PRE-EXISTING) | PASS (unfair PRE-EXISTING) |

**Band-reach: PASSES everywhere, both depths — 77.8–83.2% across all 30 runs (all ≥70%).** The mechanism never lowers band-reach below gate; on most tracks D2/D8 band-reach ≥ A0 (it does not harm the primary gate anywhere).

**The discriminator is Holm start-row, and it is entirely a D2-vs-D8 story:**
- **D8 passes all 10 tracks.** It introduces **zero** new start-row unfairness on any track where A0 is fair. Every D8 "unfair" (luger-hill, searound, space-sprint) is **pre-existing in A0**.
- **D2 fails 3 tracks** — city-circuit, river-run, seatrack — where A0 is fair (pHolm 0.10 / 0.08 / 0.14) but **D2 flips to unfair** (pHolm 0.02 / 0.04 / 0.04, just under α=0.05) while **D8 stays fair** (0.06 / 0.46 / 0.18).

This is exactly the "D2 flips, D8 holds" behaviour you flagged as load-bearing — **reproduced at N=100**, now visible on the three tracks whose A0 baseline is clean enough to reveal it. On luger-hill/searound the same flip is masked because their A0 start-row is already Holm-unfair (pre-existing baseline, not the mechanism's to fix — confirmed at N=300).

## Borderline tracks (explicit)

- **searound (manta, N=300):** A0 **pre-existing UNFAIR** (pHolm 0.00). D2 77.8% / D8 78.7% band-reach, both ≥70%; both Holm-unfair but **PRE-EXISTING** (A0 already 0.00) → PASS relative to A0. The mechanism does **not** newly break searound. Widest field of the set (24 L leader→last at PULK end, p10–p90 ~18 L) — the wide-spread closed track where the outsider's 15 L reach can't touch the deep tail.
- **luger-hill (luge, N=300):** A0 **pre-existing UNFAIR** (pHolm 0.00). D2 79.5% / D8 79.4%, both ≥70%; both Holm-unfair but **PRE-EXISTING** → PASS relative to A0. Tightest field (12 L leader→last, p10–p90 ~9.5 L).

## Action metrics (data reads — NOT a fun verdict; that stays the owner's eye call)

The mechanism transforms front action everywhere. A0 is a near-runaway leader (≈0.5 lead-changes, distinct-P1 ≈1.5, ≈4.5 held top-5 overtakes per race). With the mechanism on:

- **Lead-changes** rise to ~5–7 (raw P1 hand-overs) and **distinct-P1** to ~4.5–6.6 per race. distinct-P1 ≈ lead-changes on almost every track ⇒ **rotation through the field, not a two-car carousel**. (Only dirt-oval-D2 and searound-D2 dip to a ~0.76 ratio = mildly carousel-leaning.)
- **Held top-5 overtakes** ~13–20 (hold-filtered ≥750 ms clean passes).
- **Field spread is TIGHTER with the mechanism on, not looser:** e.g. city-circuit 23.6 → 19.4 L, mountainstreet 21.0 → 17.3 L, searound 29.1 → 24.1 L (leader→last at PULK end). Leader-braked + chasers-boosted keeps the pack together.

**Depth lever D2 vs D8 — REFUTES the "D8 widens the field more" hypothesis.** End-of-PULK field spread is **essentially identical** at D2 and D8 on every track (city-circuit 19.4 vs 19.4; searound 24.1 vs 24.1; luger-hill 12.1 vs 12.1; mountainstreet 17.3 vs 17.2). dropDepth changes *who* is braked and *fairness* (D2 unfair on 3 tracks, D8 fair) but **not** the field-spread magnitude at PULK end. Action density (lead-changes, distinct-P1, held) is also near-identical D2 vs D8.

## Verdict

- **Primary gate (band-reach ≥70%): PASS on all 10 tracks, both depths.** The mechanism does not harm target-band reachability anywhere.
- **Secondary gate (0 NEW Holm-unfair vs A0):**
  - **D8: PASS on all 10 tracks** — no new start-row unfairness anywhere.
  - **D2: FAIL on 3 tracks** (city-circuit, river-run, seatrack) — new Holm start-row unfairness (pHolm 0.02–0.04).
- **Recommendation for the eye-test decision:** **dropDepth = 8 is the fairness-safe default.** It delivers the same action (lead-changes ~6, distinct-P1 ~5–6.6, held ~16–20) and the same field spread as D2, without the D2 start-row regression on three tracks. D2 buys nothing measurable over D8 on action or spread, and costs fairness on 3/10 tracks.

Data: `results/sweep-pulklr/TABLE.md` (per-track table), `summary.json` (machine-readable), `<cfg>__<track>/hero-map.json` (fairness), `results/action-metrics/am-<cfg>__<track>.json` (per-race action). Left for the owner's morning review + eye-test — no defaults changed.
