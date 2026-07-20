# B2-Heroes "Attack & Fall" — Phase 1b Report (Confirmation + Count Sweep, N=100)

**Date:** 2026-07-19 | **Author:** CC | **Status:** Complete — awaiting Owner Phase-2 config decision
**Sweep:** 4 variants × 4 tracks × 100 races = **1,600 races**, seed=1 (paired), 60s, **`--no-holm`** (see caveat).
**Config swept:** attacker COUNT (0/1/2/3) at the true Phase-1a winner (peak=5, final=7, timing 0.40–0.70).
**Raw data:** `exp-b2-attack-results/phase1b/{ALL,V*}.csv` + `sweep.log`.

## Results (mean across 4 tracks)

| variant | attackers | B1 | B2 | top-5/race | Δ vs base | cast | freed | total swaps |
|---|---|---|---|---|---|---|---|---|
| V0-baseline | 0 | 77.2% | 73.7% | 29.27 | — | 0 | 0 | 617.97 |
| V11-conf | 1 | 77.1% | 73.8% | 31.44 | **+7%** | 1.00 | 0.92 | 610.98 |
| V11x2 | 2 | 75.2% | 73.0% | 32.27 | **+10%** | 1.99 | 1.83 | 604.91 |
| **V11x3** | **3** | **75.0%** | **73.2%** | **35.48** | **+21%** | 2.94 | 2.68 | 593.30 |

### Per-track B1 / B2 at count=3 (the gate is per-track)
| track | B1 | B2 |
|---|---|---|
| luger-hill (open) | 74.6% | 72.0% |
| mountainstreet (open) | 75.8% | 74.1% |
| searound (closed) | 71.6% | 70.1% |
| dirt-oval (closed) | 78.0% | 76.6% |

All ≥70% ✓ (searound B2 is the tightest at 70.1%).

## Findings

**1. The N=50 single-attacker +11% did not hold — N=100 says +7%.** One attacker is a weak lever (below the spec's ≥+9% bar). The N=50 result was partly noise. This is why 1b's N=100 confirmation mattered.

**2. Action scales strongly with count, and 3 is super-additive:** +7% → +10% → **+21%**. The jump from 2→3 (+11 pts) is larger than 1→2 (+3 pts). Three attackers, all released high in B2 (rank 7), fill the top-5 with overlapping free-reorder action. **This is the strongest B2 result and beats pack-release V3 alone (+15%).**

**3. No casting-yield wall at 3.** cast 2.94/3 = **0.98** (nearly all cast every race), freed 2.68/3 = 0.89. `checkSeparation` did not reject the overlapping attackers — the peak-timing jitter + differing post-chaos starts spread them enough. **Count=4+ is unexplored** and might go higher.

**4. Fairness (band-reach) holds but tightens with count.** B1 77→75%, B2 74→73% (mean); per-track all ≥70% at count=3, with searound B2 at 70.1% (the margin to watch). Same front-concentration signature as pack-release: top-5 up (+21%), total field swaps down (−4%).

**5. ⚠️ Holm was NOT measured in Phase 1b.** The run used `--no-holm` for speed (Holm is the biggest per-combo cost). The "0/4" in the raw summary is an artifact (null→0), not a pass. From Phase 1a (with Holm, N=50), attackers held Holm at baseline 2/4 with zero damage — but only at count ≤2. **Count=3's start-row Holm is unverified and must be checked before integration.**

## Recommendation

**Carry count=3 (peak=5, final=7) to Phase 2** as the B2 winner — it's the clear action leader (+21%, beating pack-release alone), fairness-safe on band-reach, yield 0.98. Two conditions:
1. **Run a Holm confirm on count=3** (single-variant, 4 tracks, WITH `--hero-map`) before or alongside Phase 2 — the one unverified gate.
2. **Owner eye-test** — 3 authored attackers surging to rank 5 then falling could read as choreographed; the +21% is real but readability is the human call.

**Open question worth a cheap probe:** since count=3 didn't hit a yield wall, **count=4** might push action higher still (or finally break B2/yield). One extra variant would settle it.

## Next: Phase 2 (hybrid), gated on Owner
Three arms at N=100: pack-release V3 alone (+15%) / B2 count=3 alone (+21%) / **both together** — does the emergent pack freedom + the authored front attackers **stack** (>+21%), or compete for the same front slots (**interfere**, <+21%)? Since B2-attackers are heroes (excluded from the pack-release gate), they *should* compose, but the front-slot contention is the real question.
