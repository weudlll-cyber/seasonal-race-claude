# Pack-Release B2-Break — Root-Cause Diagnosis

**Date:** 2026-07-19 | **Author:** CC | **Method:** miss-distribution + baseline-delta on existing rawData, then a per-frame `--b2-trace` (last-progress-inside-B2 per B2 racer) on luger-hill.

## Root cause (one line)
Pack-release replaces the baseline's mild in-band position-holding (choreo pack strictness 0.5) with **full release (strictness 0)**, so B2 racers — especially those released near the band **edges** — get shuffled out of band by **finish-line field compression in the last ~10% of the race**, where the re-steer has **no runway** to recover. It is an **endgame/timing** failure, not an authority or a start-row failure.

## Evidence

**Miss distribution (Phase-2 Arm-A, per track, B2-assigned racers, n=1000/track):**
- luger-hill 67.2%, searound 69.5% (FAIL) vs mountainstreet 72.0%, dirt-oval 73.4% (pass).
- Misses split ~⅓ edge (rank 5/16) and ~½ FAR (rank <4 or >17), skewed **below** (fell out the bottom).

**What pack-release ADDS over the no-feature baseline (per track):**
| track | baseline B2 | pack B2 | Δ | added misses skew |
|---|---|---|---|---|
| luger-hill | 71.3% | 67.2% | −4.1 | above +25, below +16 |
| searound | 71.1% | 69.5% | −1.6 | above +16 |
| mountainstreet | 75.7% | 72.0% | −3.7 | above +28 |
| dirt-oval | 76.8% | 73.4% | −3.4 | above +28 |

Pack-release adds a **uniform ~3-4 pt B2 penalty on every track** (mostly racers climbing out the TOP into rank ≤5). It is **not** worse on the failing tracks — they fail only because their **baseline B2-reach is already ~5 pts lower** (71% vs 76%), so the same penalty crosses them below the 70% line.

**Exit-timing trace (luger-hill, 30 races, `--b2-trace`, lastInside = last OUTCOME progress inside B2):**
- 101 misses. **late-exit (lastInside ≥ 0.90) = 93; early-exit (<0.85) = 7; never-inside = 0.**
- "below" misses: mean lastInside = **1.000** (inside B2 until the finish, then shuffled out); late=55, early=0.
- "above" misses: mean lastInside = 0.937; late=38, early=7.
- **92% of leaks occur in the last ~10% of progress (~6 s of a 60 s race).**

## Answers to the specific questions

**Q1 — which tracks?** luger-hill + searound. Both are also the pre-existing Holm-unfair tracks. They fail the B2 gate not because pack-release hurts them more, but because their **baseline B2-reach is already ~71%** (vs ~76% on mountain/dirt), so the uniform ~4 pt penalty tips them under 70%.

**Q2 — which start-rows / rank ranges?** Not start-row-specific — the trace shows leaks are an **endgame** phenomenon, not a start-row one (the Holm correlation is because those two tracks are simply more fragile overall). Within B2, the leaks come from racers released near the **edges** (rank 6 or 15) with no margin: the added misses skew to climbing out the TOP (rank ≤5) and falling out the BOTTOM (rank >15) in the final sprint.

**Q3 — re-steer threshold too permissive?** Partly, and it compounds the problem. With threshold 1.5 (re-steer only at ≥2 ranks out), a racer sitting **1 rank outside** at the finish (rank 5 or 16) is never re-steered — that's ~⅓ of misses (the edge cases). But it's the *secondary* cause; tightening it alone won't fix the ½ that are late-race field-compression leaks. B2's 10-rank width does make it more exposed than B1's 5-rank band (more room to roam to an edge).

**Q4 — timing / late exit?** **YES — this is the primary cause, confirmed.** 92% of leaks happen after progress 0.90; the bottom-leaks are inside B2 until the finish itself. Released B2 racers (strictness 0 = natural speed, no rank-pinning) hold their band all race, then the finish-line field compression shuffles them out in the last few seconds, and the re-steer's ~1 s slew + rank-change latency has **no runway** to pull them back before the line.

**Q5 — trace:** done (above). The failure mode is pinned to the **endgame**.

## Why B2-attackers don't leak (and pack-release does)
B2-attackers are choreographed to `finalRank = 7` — the **center** of B2 — and only released *after* reaching it, so they enter the free phase with ~8 ranks of margin on either side; endgame shuffling can't push them out of a 10-rank band. **Free pack racers release wherever they happen to be, including the edges (rank 6 or 15), with zero margin** — one endgame slip leaks them. This is the same conclusion Phase 2 reached from the other direction: **authored center-release is inherently band-safe; free-roaming release is not.**

## Fix options (if pack-release were to be pursued — but see note)
1. **Endgame re-lock (most direct):** re-engage strictness for pack racers past a late checkpoint (e.g. progress ≥ 0.90), so they hold their band into the finish. Kills the 92%-late-exit leak; costs late-race freedom (but the action is mostly earlier, and the finish should be a settled band anyway).
2. **Center-margin release:** only release when comfortably inside the band (e.g. ≥2 ranks from either edge), taper near edges — removes the zero-margin edge releases.
3. **Tighten threshold to ≥1 (0.5):** fixes the edge-sitting ⅓, not the late-shuffle ½.

**Note:** these are moot for the current decision — Phase 2 already showed **B2-attackers dominate pack-release on both action and fairness**. The diagnosis *reinforces* that: the attacker's center-release is the structural fix that pack-release lacks. Recommend shelving pack-release rather than patching it.
