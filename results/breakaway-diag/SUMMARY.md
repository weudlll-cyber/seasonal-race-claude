# Breakaway Causal Ablation — Raw Results

- **Config:** 40 races/arm/track (seed batch 1–40, deterministic), dur=60s, 40 racers.
- **Tracks:** garden-path (closed, snail), city-circuit (closed, motorbike), space-sprint (open, rocket).
- **Instrumentation:** `sim-fairness.mjs --breakaway-diag` (commit 9d23621).
- **breakaway flag:** peak pre-OUTCOME (progress < corridorStart 0.55) gap-to-median > 0.03.
- **decomp @peak** = the peak-gap leader's multipliers: spread(=spreadFactor)·area·rb·surge.

## Pooled across 3 tracks (mean of per-track values)

| arm | breakaway% | peakGapØ | rank1% | rank≥4% | surged% | spread | area | rb | surge |
|---|---|---|---|---|---|---|---|---|---|
| baseline   | 100% | 0.0512 | 2%  | 90% | 71% | 1.044 | 1.040 | 0.957 | 1.010 |
| surgeoff   | 98%  | 0.0475 | 13% | 65% | 0%  | 1.057 | 1.050 | 0.964 | 1.000 |
| areaoff    | 99%  | 0.0487 | 0%  | 99% | 87% | 1.049 | 1.000 | 0.966 | 1.011 |
| rerollflat | 100% | 0.0520 | 5%  | 88% | 64% | 1.064 | 1.043 | 0.956 | 1.000 |
| capneutral | 100% | 0.0539 | 2%  | 88% | 63% | 1.043 | 1.041 | 1.000 | 1.004 |

## Raw readout (no mitigation proposed)

1. **The breakaway is over-determined.** Every arm shows ~98–100% breakaway rate and a peak
   gap of ~0.047–0.054. Removing surge, the area tailwind, re-roll variation, OR the cap
   individually does NOT collapse the pre-OUTCOME lone lead.
2. **Surge controls WHO is at the very tip, not whether a breakaway happens.** Baseline peak
   leader is a surger 71% of the time (rank≥4 = 90%). Surge off → surgers 0%, rank≥4 drops to
   65%, rank-1 share rises 2%→13%; breakaway persists (98%).
3. **The area tailwind is what lets the WINNER (rank 1) reach the tip.** rank-1 peak share:
   baseline 2%, surgeoff 13%, **areaoff 0%**. With area off the winner never tips and the peak
   is almost always a mid-field surger (rank≥4 = 99%, surged 87%).
4. **Re-roll variation is NOT the "vereinzeler".** Flattening it (rerollflat) leaves breakaway
   at 100% with the largest leader spread component (1.064) — the frozen initial spreadFactor
   draw plus the area bonus still separate a single leader; the field does not bunch.
5. **The rubber-band barely touches the peak.** capneutral peak gap (0.054) is only ~0.003–0.005
   above baseline (0.051); rb≈0.957 at peak ≈ a 4% brake, far under the ~+9% net tailwind
   (1.044·1.040·1.010) on the peak leader.

Band-reach context (fairChance-exact for B1 racers) stayed ~28–39% across all arms; nothing ships.
