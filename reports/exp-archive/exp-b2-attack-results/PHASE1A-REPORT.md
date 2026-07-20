# B2-Heroes "Attack & Fall" — Phase 1a Report (Exploration, N=50)

**Date:** 2026-07-19 | **Author:** CC | **Status:** Complete — awaiting Owner winner-selection for Phase 1b
**Sweep:** 14 variants × 4 tracks × 50 races = **2,800 races**, seed=1 (paired), 60s, `--hero-map` (Holm).
**Raw data:** `exp-b2-attack-results/phase1a/{ALL,V*}.csv` + `sweep.log`.

## Provenance
- Mechanics: `heroCurveGenerator.js` (attacker casting + resolve bypass) + `racePlanner.js` (Track-to-FinalRank-then-Free servo) + `defaults.js` (5 keys) + `sim-fairness.mjs` (flags + telemetry).
- **Byte-identical OFF proven:** full change set flag-off = baseline fingerprint `4ec8e64dd2641ad3`. Tests **130/130** pass.

## Results (mean across 4 tracks; B1 & B2 band-reach ≥70% are PRIMARY gates)

| variant | config | B1 | B2 | Holm | **top-5/race** | cast | peakReached | freed |
|---|---|---|---|---|---|---|---|---|
| V0-baseline | — | 76.8% | 74.8% | 2/4 | 29.20 | 0 | 0 | 0 |
| V1-ct1 | 1 atk, peak5, final10 | 76.1% | 73.9% | 2/4 | 29.86 (+2%) | 0.99 | 0.99 | 0.85 |
| V2-ct2 | **2 atk**, peak5, final10 | 76.1% | 73.9% | 2/4 | 30.95 (**+6%**) | 1.94 | 1.94 | 1.64 |
| V3-dp1 | 1 atk, **peak1**, final10 | 75.0% | 73.4% | 2/4 | 28.09 (**−4%**) | 0.88 | 0.88 | 0.55 |
| V4-dp2 | peak2 | 76.0% | 73.5% | 2/4 | 29.10 (−0%) | 0.97 | 0.97 | 0.65 |
| V5-dp3 | peak3 | 75.8% | 73.8% | 2/4 | 29.75 (+2%) | 0.99 | 0.99 | 0.73 |
| V6-dp5 | peak5 (=center) | 76.1% | 73.9% | 2/4 | 29.86 (+2%) | 0.99 | 0.99 | 0.85 |
| V7-dp7 | peak7 | 75.4% | 74.4% | 2/4 | 28.90 (−1%) | 0.99 | 0.99 | 0.93 |
| V8-tm-early | attack 0.30–0.50 | 75.2% | 73.0% | 2/4 | 29.86 (+2%) | 0.99 | 0.99 | 0.92 |
| V9-tm-mid | attack 0.40–0.70 (=center) | 76.1% | 73.9% | 2/4 | 29.86 (+2%) | 0.99 | 0.99 | 0.85 |
| V10-tm-late | attack 0.60–0.85 | 75.6% | 73.6% | 2/4 | 30.50 (+4%) | 0.99 | 0.99 | 0.74 |
| **V11-fr-top** | **final7** (short fall) | 76.1% | 73.6% | 2/4 | 32.33 (**+11%**) | 0.99 | 0.99 | 0.92 |
| V12-fr-mid | final10 (=center) | 76.1% | 73.9% | 2/4 | 29.86 (+2%) | 0.99 | 0.99 | 0.85 |
| V13-fr-bot | **final14** (long fall) | 76.2% | 73.6% | 2/4 | 28.52 (**−2%**) | 0.99 | 0.99 | 0.79 |

## Findings

**1. Fairness is safe — empirically, not just by argument.** Every variant holds B1 (75-77%) and B2 (73-75%) ≥70%, and **Holm stays at the baseline 2/4** (the pre-existing luger-hill + searound flags; attackers add none). This is the key contrast with pack-release, which added a 3rd unfair track. B2-attackers cost **zero** fairness.

**2. Casting yield is excellent** (~0.99). Even the deepest attack, peak=1 (V3), casts 0.88 / reaches peak 0.88 — front-post-chaos picking + the 0.85 resolve bypass make deep attacks feasible on 40-racer fields, beating the worst-case review prediction (which assumed a mid-field start).

**3. Action is modest and governed by `finalRank` (release height), NOT peak depth.**
   - **`finalRank` is the dominant knob:** final7 **+11%** › final10 +2% › final14 −2%. Releasing HIGH in B2 (rank 7) puts the free-reorder phase near the top-5 where it registers; releasing DEEP (rank 14) hides it. **This validates the Track-to-FinalRank-then-Free design and the finalRank sweep — it was the right question.**
   - **Peak depth barely matters, and going deep backfires:** peak 1→7 all land −4%…+2%; peak=1 (V3) is the *worst* (a lone attacker pinned at rank 1 suppresses front churn).
   - **Count is ~additive:** 2 attackers (V2) +6% vs 1 (V1) +2%.
   - **Timing:** late attack (V10) +4% edges the default.

**4. Standalone B2-attackers are a WEAKER action lever than pack-release** (+11% best vs pack-release's +15%) — but fairness-free. The value proposition is different: pack-release trades some Holm for more action; B2-attackers give less action at zero fairness cost. The **hybrid (Phase 2)** is where the interesting question lives — do they stack?

**5. Completion (`freed`) drops with fall length/depth:** final7/peak5 completes 0.92; peak1 only 0.55 (the long climb+fall rarely reaches finalRank in-band by the finish). The winning config (final7) both delivers the most action AND completes reliably.

## Winner candidates for Phase 1b (Owner selects)
1. **V11 (finalRank=7, 1 attacker) — +11%**, the only variant ≥+10%, fairness-safe, completes 0.92. The clear standalone winner.
2. **NEW: 2 attackers × finalRank=7** — combines the two winning levers (count + release-high), never tested together. Likely the true peak (~+12-17% if additive). Strongly recommend adding to 1b.
3. **V2-ct2 (2 attackers, final10) — +6%** — the count reference.
4. **V0-baseline** — the N=100 anchor.

## Notes
- The 3 "center" variants (V6-dp5 = V9-tm-mid = V12-fr-mid) are the same config — all landed +2% (a clean determinism/consistency check ✓).
- Phase 1b plan: run winners at N=100 **without `--hero-map`** in the main loop (Holm is secondary + noisy at N=50 and is the biggest per-combo cost); run Holm once on the confirmed winner afterward.
- Phase 2 (hybrid) then tests pack-release V3 alone / B2 winner alone / both — the composition question.
