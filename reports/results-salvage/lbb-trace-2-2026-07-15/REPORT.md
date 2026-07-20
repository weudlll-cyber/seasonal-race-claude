# LBB-TRACE-2 — does zigzagScore measure the Owner's weave? (throwaway branch trace/lbb-weave, KEPT)

Seed=1, mountainstreet/boarder, race 0, 60 s. Capture env-gated (`LBB_TRACE=1`), read-only.
**Inertness proven:** with the dump present, `fingerprint-default.mjs` → `0259ea6c3e75efc3` (no-(d)) and
`fa4e3796e1e5f1a5` (with-(d)). No decision changed.

Detector (lateral MOTION, not jerk): **leg** = consecutive same-sign steps with |Δphysical​Y| ≥ floor,
≥3 frames. **visible weave** = adjacent alternating legs within 15 frames. 4 s warmup excluded (as zigzagScore).
`zigzagScore` computed per racer = mean |Δ physicalYVelocity| (the sim's own definition).

## Step 2 (the decisive one) — zigzagScore vs visible weaves, Spearman ρ across the 40 racers (floor 2e-3)

| costume | Spearman ρ(zigzagScore, weaveCount) |
|---|---:|
| WITHOUT (d) | **0.528** |
| WITH (d) | **0.122** |

Top racers by zigzagScore (WITHOUT d) with their weave counts — high jerk is NOT reliably high weave:

| racer | zigzagScore | weaves@1e-3 | weaves@2e-3 | weaves@5e-3 |
|---:|---:|---:|---:|---:|
| 11 | 1.051e-4 | 3 | 1 | 1 |
| 12 | 9.983e-5 | 6 | 3 | 3 |
| 30 | 8.323e-5 | 5 | 3 | 3 |
| 22 | 8.299e-5 | 6 | 4 | 3 |
| 13 | 8.001e-5 | 3 | **0** | **0** |
| 8 | 7.214e-5 | 2 | 1 | 0 |
| 36 | 5.929e-5 | **0** | **0** | **0** |

Reverse view — top weavers and their zigzag RANK (of 40): racer 22 (4 weaves) = zigzag rank 4; racer 27
(4 weaves) = rank 10; racer 5 (3 weaves) = rank 18; racer 7 (2) = rank 15; racer 29 (2) = rank 16.

## Leg-length distribution (floor 2e-3) — weaves are a MIX of short and long legs

| leg length (frames) | 3 | 4 | 5 | 6 | 7 | 8 | 10 | 15 | 16 | 20 | 25 | 30 |
|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|
| WITHOUT(d) | 72 | 55 | 50 | 30 | 39 | 29 | 10 | 5 | 12 | 5 | 5 | 2 |
| WITH(d) | 58 | 50 | 59 | 41 | 26 | 20 | 10 | 5 | 5 | 7 | 6 | 0 |

Full distribution in `correlation.md`.

## Step 3 — the racer the Owner saw (largest weave increase noD − withD, floor 2e-3, seed 1, no sweep needed)

Racer **22**: **4 weaves WITHOUT (d), 0 WITH (d)** (increase 4). (Ties at inc 4: racer 27. inc 3: 12, 30.)
Worst weave WITHOUT (d): frames **2616–2646**.

Frame-by-frame in `frame-dump.md`. The WITHOUT-(d) weave (racer 22 vs leader 3), key rows:

| frame | Ty | dYstep | branch | tgtUsed | ssTgt | obst | dir | tfl | leader | Ly | cl-sign | dY | thr | dT | dTStart |
|---:|---:|---:|:--:|---:|---:|---:|:--:|:--:|---:|---:|:--:|---:|---:|---:|---:|
| 2616 | -0.0075 | +0.00004 | soft | 0.0000 | 0.0000 | — | n/e | brake | 3 | -0.0273 | + | -0.0190 | 0.0950 | 0.0025 | 0.0020 |
| 2617 | -0.0015 | +0.00605 | pass | 0.0680 | 0.0000 | — | 1 | DODGE | 3 | -0.0277 | + | -0.0194 | 0.0950 | 0.0025 | 0.0020 |
| … up-leg dir=+1 (Ty rising to +0.057) … | | | | | | | | | | | | | | | |
| 2638 | 0.0569 | +0.00100 | pass | 0.0663 | 0.0000 | — | 1 | DODGE | 3 | -0.0295 | + | -0.0846 | 0.0950 | 0.0021 | 0.0020 |
| **2639** | 0.0426 | **-0.01424** | pass | **-0.1231** | 0.0000 | — | **-1** | DODGE | 3 | -0.0288 | **+** | -0.0850 | 0.0950 | 0.0021 | 0.0020 |
| … down-leg dir=-1 (Ty falling to -0.041) … | | | | | | | | | | | | | | | |
| 2645 | -0.0321 | -0.00949 | pass | -0.1201 | 0.0000 | — | -1 | DODGE | 3 | -0.0259 | **-** | -0.0026 | 0.0950 | 0.0020 | 0.0020 |
| 2646 | -0.0406 | -0.00854 | pass | -0.1198 | 0.0000 | — | -1 | DODGE | 3 | -0.0256 | - | 0.0072 | 0.0950 | 0.0020 | 0.0020 |
| **2647** | -0.0423 | -0.00175 | **soft** | 0.0704 | **0.0704** | **3** | n/e | brake | 3 | -0.0254 | - | 0.0160 | 0.0950 | 0.0020 | 0.0020 |

**What the columns show (no interpretation, per brief):** the up-leg (2617–2638) runs `dir`=+1, `branch`=pass,
`Ty` −0.008→+0.057; the down-leg begins at frame **2639** where `dir` flips +1→−1 (`tgtUsed` +0.066→−0.123,
`dYstep` −0.0142). At that leg boundary `cl-sign` (sign of Ty−Ly) is `+` and stays `+` through 2644 (first
`−` at 2645); `|dY|`=0.085 < `thr` 0.095; `dT`=0.0021 > `dTStart` 0.0020; `latch` was 3/1. The pass drops to
`branch`=soft at frame **2647** where `dT`=0.0020=`dTStart`; there `ssTgt`=0.070 with `obst`=3.

**The four predictions on the record (not resolved here):** CC = sign of (Ty−Ly) flips at the boundary.
Plan-Claude = |dY| reaches brakeSameLaneY at the boundary. Copilot = same + latch clears. Fourth = the
most-constraining obstacle / free side changes while dY and centreline sign stay put. The frames above are
for the reviewers to match.

## Same racer, WITH (d) — different race state by frame 2600

The two races diverged (first at frame 310, per LBB-TRACE), so by frame 2596 racer 22 WITH (d) is elsewhere:
`Ty`≈−0.30→−0.33, `branch`=soft throughout, no trailer=22 gate pair (`leader`=—), `dYstep`≈−0.0004 all one
sign (no reversal). So the "same frames" comparison this late is of unrelated states; the meaningful signal
is the whole-race weave COUNT (4 vs 0). Full table in `frame-dump.md`.

Artifacts (gitignored): `raw-nod.json`, `raw-withd.json`, `correlation.md`, `frame-dump.md`, `chosen.json`.
Branch `trace/lbb-weave` KEPT (teardown is a separate step). Never committed, pushed or merged.
