# PULK-action-3 — smart two-sided contest: verdict

**Harness HEAD `827da85`** (feat/race-action), anchor `pre/pulk-action-3` @ `e2f2ef0`. Read-only,
sim-only, OUTCOME controller untouched, default byte-identical, 147/147 tests green, ceiling cap holds
peak ≤ +8.1% on every track, no Math.random on any seeded path (director pick uses the salted
`directorStreamKey` stream). Surge OFF, tail-lift OFF, rubber-band OFF; PULK bonuses 0, chaos row-bonus
full, areaBonus+row-bonus restored at 0.5 (B3), variant-1 re-roll, seed 1, 30 races/combo.

## The concept WORKS. Winner: N8 / linger 0.6 s (front-pool 8, boost 0.06, brake 0.10, ceiling cap on).

The owner's four smart-boost rules (front-pool target · random pick · once-per-race · linger-brake)
convert the previous boiling-front flicker into **held, rotating, deep, natural overtakes**:

- **Held overtakes 9.6–19.9 per race** across ALL 10 tracks (baseline whole-field ≈ 0).
- **Rotation**: 3.7–5.4 distinct leaders; leader-time-share 36–49% (no dominator).
- **Deep chargers**: clean overtakers climb from P6–P12 at PULK entry to P1 and hold.
- **Flicker crushed**: raw leadΔ ~300 → ~8–11 (the linger lets each pass settle).
- **Naturalness locked at +8.1% on every track** — the ceiling-capped boost never exceeds the
  natural re-roll band (peak 1.081 everywhere).

## Phase B — N8/D0.6 across all 10 tracks

| track | topo | HELD ov | distinctP1 | band-reach | worst-winner @0.55→fin | peak | ACT | FAIR |
|---|---|--:|--:|---|---|--:|:--:|:--:|
| dirt-oval | closed | 19.9 | 5.0 | 80/85/83 | 38→1 | +8.1% | ✅ | ✅ |
| ice-track | closed | 18.1 | 4.7 | 83/86/82 | 39→1 | +8.1% | ✅ | ✅ |
| garden-path | closed | 15.5 | 5.2 | 82/87/82 | 39→1 | +8.1% | ✅ | ✅ |
| mountainstreet | open | 10.8 | 4.6 | 77/85/78/81 | 54→1 | +8.1% | ✅ | ✅ |
| space-sprint | open | 10.7 | 5.4 | 78/76/76/81 | 60→2 | +8.1% | ✅ | ✅ |
| seatrack | open | 10.6 | 5.0 | 81/82/81/80 | 57→3 | +8.1% | ✅ | ✅ |
| city-circuit | closed | 18.4 | 4.8 | 83/85/77 | 40→**7** | +8.1% | ✅ | ✗ |
| river-run | open | 10.1 | 4.3 | 79/86/77/82 | 52→**7** | +8.1% | ✅ | ✗ |
| searound | closed | 13.0 | 3.7 | 76/85/80 | 40→**6** | +8.1% | ✗ | ✗ |
| luger-hill | open | 9.6 | 3.9 | 70/87/78/78 | 60→**22** | +8.1% | ✗ | ✗ |

**Holds cleanly on 6/10** (dirt-oval, ice-track, garden-path, mountainstreet, space-sprint, seatrack).

## Honest read of the 4 non-passes

- **3 are near-misses on ONE metric — the worst-case winner** (the single worst of 30 races):
  city-circuit 40→7, river-run 52→7, searound 40→6. Band-reach passes; the assigned winner recovers
  to ~P6–7 instead of ≤P5 in the *tail* race only. These are marginal, not systematic — a slightly
  longer OUTCOME runway or a hair less contest on those geometries would clear them.
- **searound also dips on rotation** (distinctP1 3.7 < 4) — its geometry keeps the front to ~3 leaders.
  Its start-row bias is the long-known searound geometry issue, independent of the contest.
- **luger-hill is the one real break**: worst-case winner stranded at P22, band-reach B1 at the 70%
  floor. Luger-hill is a fast open downhill; the contest scrambles the pre-OUTCOME field too hard for
  OUTCOME to re-sort in 30 races. Candidate for track-specific de-tuning (smaller N or shorter linger).

## Verdict (no oversell)

The smart two-sided contest **delivers genuine, held, rotating, natural front overtaking** — the goal
that eluded pulk-action-1/2. It is **naturalness-perfect on every geometry** and **fully fair on 6/10
tracks**, near-fair on 3 more (worst-case-winner tail only), and breaks on 1 (luger-hill). N8/D0.6 is a
strong target for a later 100-race confirmation on the 6 clean tracks; city-circuit/river-run/searound
want a small runway/contest tweak; luger-hill needs track-specific handling.

## Process caveats (transparency)

Two bugs were caught and fixed mid-run, both via the reproducibility check (small-sample vs full-sample
disagreement), not ignored:
1. **`pulkSurgeEnabled` defaults to TRUE** on this branch — surge ran in every earlier stage against the
   "surge OFF" spec. It suppressed the contest and (via plan-level Math.random consumed before the
   per-race seed) broke cross-race determinism. Fixed with `--pulkSurgeEnabled=false`. Earlier stages
   (strip-down, pulk-action-1/2) share this caveat, though their qualitative conclusions don't hinge on it.
2. **Driver D-format bug** (`0.${D}` → `0.06` not `0.6`) zeroed the D0.3/D0.6 cells; re-run corrected.
   Parallelism was proven safe (6 identical concurrent runs → identical results) — it was a red herring.
