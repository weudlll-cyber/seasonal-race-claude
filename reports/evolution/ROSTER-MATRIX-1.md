# ROSTER-MATRIX-1 — does every surface-compatible racer reach its band on the tracks it belongs on?

Read-only measurement on the shipped **COMBO15** world (flagless sim = shipped defaults). Engine untouched — the shipped fingerprint **`ded0a126048e4cdb`** is asserted unchanged (see CAMERA-FOCUS-1 / any default-fingerprint run). For each track we built the eligibility map (racer `surfaceClasses` ∩ track `surfaceClasses`) and measured **only** the eligible `(type, track)` cells as a uniform single-type field, N=50 races/cell, each track's shipped racer count and duration. Metric per cell: absolute band arrival (hero-map `bandReach`), per-start-row floor (`rowMin`), Holm start-row flag, and runaway rate. Driver `scripts/exp-roster-matrix.mjs @4042451`; per-track JSON committed under `reports/evolution/roster-matrix-data/`.

## The matrix — 71 eligible cells across 10 tracks

Each cell: **arrival%** (band `rowMin%`). Sorted worst→best arrival within a track. `‡` = Holm start-row flag.

| track (surf) | eligible racers, worst → best arrival |
|---|---|
| **city-circuit** (asphalt, closed) | f1 87.5 (87)‡ · motorbike 88.2 (87) · horse 88.7 (86)‡ · beetle 88.9 (88) · dragon 88.9 (88) · boarder 89.5 (88) |
| **dirt-oval** (sand/earth/mud/grass, closed) | buggy 88.0 (87) · giraffe 88.3 (88)‡ · motorbike 88.5 (87)‡ · snail 88.5 (87) · boarder 88.7 (88)‡ · beetle 89.0 (87) · snowmobile 89.0 (88) · elephant 89.3 (89) · horse 89.8 (88) · dragon 90.0 (87) · duck 90.1 (89) · snake 90.4 (88)‡ |
| **garden-path** (grass/earth, closed) | snake 87.2 (83)‡ · dragon 88.1 (87) · snowmobile 88.4 (87) · buggy 88.6 (88) · boarder 89.0 (88) · elephant 89.6 (87)‡ · giraffe 89.7 (88) · beetle 90.0 (88) · duck 90.3 (89) · motorbike 90.3 (89)‡ · horse 90.4 (90) · snail 91.0 (90) |
| **ice-track** (snow/ice/air, closed) | rocket 88.2 (86) · snowmobile 88.4 (87) · horse 88.6 (86)‡ · luge 88.9 (86)‡ · plane 88.9 (88) · dragon 89.1 (87) |
| **luger-hill** (ice/air, open) | snowmobile 87.1 (86)‡ · dragon 87.9 (87)‡ · plane 88.2 (86)‡ · rocket 89.1 (88) · luge 89.2 (88)‡ |
| **mountainstreet** (asphalt, open) | motorbike 87.1 (87)‡ · dragon 87.7 (85)‡ · f1 88.0 (87)‡ · boarder 89.0 (88)‡ · beetle 89.7 (89) · horse 90.1 (89)‡ |
| **river-run** (water, open) | **rocket 85.9 (84)** · turtle 87.1 (86)‡ · dragon 87.9 (87)‡ · duck 88.6 (88)‡ · manta 88.9 (87)‡ · koi 89.3 (89)‡ · dolphin 89.9 (89)‡ |
| **searound** (water, closed) | duck 87.1 (85)‡ · turtle 87.4 **(77)**‡ · dolphin 87.6 (84)‡ · rocket 87.8 (86) · manta 89.3 (88)‡ · dragon 89.8 (89) · koi 90.4 (89)‡ |
| **seatrack** (water, open) | **rocket 84.4 (82)**‡ · manta 87.6 (87)‡ · turtle 88.3 (87)‡ · dragon 88.7 (88)‡ · duck 89.1 (88) · dolphin 89.1 (87) · koi 90.3 (89)‡ |
| **space-sprint** (air, open) | **rocket 85.0 (82)** · dragon 88.2 (87)‡ · plane 88.8 (88) |

**Runaway rate = 0% in every one of the 71 cells.**

## The answer, plainly
**Yes — every surface-compatible racer reaches its band on every track it belongs on.** The absolute worst cell in the entire matrix is `seatrack/rocket` at **84.4%**, still ~14 pts above the 70% ship floor and above the ~80% comfort target; every other cell lands **85.9–91.0%**. There is no roster hole — no eligible type collapses on any eligible track, and nothing runs away.

## The one honest signal
`rocket` is the softest cell on **four** open water/air tracks (seatrack 84.4, space-sprint 85.0, river-run 85.9, ice 88.2 — always at or near that track's floor). It is a fast air/water type whose top-end nudges it a hair *past* its band more often than the field, so it arrives lowest — a mild over-power tell, not a failure. The only per-row dip worth naming is `searound/turtle` at **77%** (one start row), the single softest floor in the matrix; everything else holds `rowMin ≥ 82%`.

## Five sentences
1. Across 71 eligible `(type, track)` cells on the shipped COMBO15 world, every surface-compatible racer reaches its band — the worst cell is `seatrack/rocket` at 84.4%, still well clear of the 70% floor.
2. Runaway rate is 0% everywhere; no eligible type collapses or bolts on any eligible track.
3. The one consistent signal is `rocket`, the softest cell on four open water/air tracks — a fast type that slightly overshoots its band, low arrival by over-power, not by starvation.
4. The single softest per-start-row floor is `searound/turtle` at 77% (one row); every other cell holds `rowMin ≥ 82%`.
5. Holm start-row flags are common (esp. on the open water tracks) but sit on top of healthy band arrival — a per-row fairness texture, not an arrival hole.

## Proposals (≥2)
1. **Rocket band-fit pass on the open water/air tracks.** Rocket sits at each such track's floor because its top-end overshoots the band. A small type-specific band recalibration (or a touch less top-end on `air`/`water` for rocket) would lift the four soft cells toward the pack's ~88–90% without touching any other type — UI-configurable via the racer type, no engine change.
2. **`searound/turtle` start-row audit.** One start row drops turtle to 77% on searound (a closed water track with known lane scarcity, L182). Measure which row and whether it is the outer/inner lane, then decide if it warrants a per-track start-position tweak — cheap, data-first, no force.
3. **Promote this matrix to a standing roster gate.** Re-run `exp-roster-matrix.mjs` as a periodic read-only check (any cell < 80% arrival or `rowMin < 75%` = a flag) so a future world change can't silently open a roster hole on a rarely-played `(type, track)` pairing.
