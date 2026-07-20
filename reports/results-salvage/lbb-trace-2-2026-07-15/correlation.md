# LBB-TRACE-2 — visible weave vs zigzagScore (mountainstreet/boarder seed=1, 60s)

Fingerprints with the dump present: no-(d) `0259ea6c3e75efc3`, with-(d) `fa4e3796e1e5f1a5` (inert).
Warmup excluded: first 4000 ms. Leg = consecutive same-sign steps with |Δy| ≥ floor, ≥ 3 frames. Weave = adjacent alternating legs within 15 frames.

## Step 2 — does zigzagScore track visible weaves? (Spearman rank corr across racers, primary floor 2e-3)

| costume | racers | Spearman ρ(zigzagScore, weaveCount) |
|---|---:|---:|
| WITHOUT (d) | 40 | 0.528 |
| WITH (d) | 40 | 0.122 |

Top-8 racers by zigzagScore (WITHOUT d), with their weave counts at each floor — read whether high zigzag = high weaves:

| racer | zigzagScore | weaves@1e-3 | weaves@2e-3 | weaves@5e-3 |
|---:|---:|---:|---:|---:|
| 11 | 1.051e-4 | 3 | 1 | 1 |
| 12 | 9.983e-5 | 6 | 3 | 3 |
| 30 | 8.323e-5 | 5 | 3 | 3 |
| 22 | 8.299e-5 | 6 | 4 | 3 |
| 13 | 8.001e-5 | 3 | 0 | 0 |
| 20 | 7.832e-5 | 6 | 3 | 1 |
| 8 | 7.214e-5 | 2 | 1 | 0 |
| 36 | 5.929e-5 | 0 | 0 | 0 |

Top-8 racers by weaveCount@2e-3 (WITHOUT d), with their zigzagScore — the reverse view:

| racer | weaves@2e-3 | zigzagScore | zigzag rank (of 40) |
|---:|---:|---:|---:|
| 22 | 4 | 8.299e-5 | 4 |
| 27 | 4 | 5.715e-5 | 10 |
| 5 | 3 | 4.751e-5 | 18 |
| 12 | 3 | 9.983e-5 | 2 |
| 20 | 3 | 7.832e-5 | 6 |
| 30 | 3 | 8.323e-5 | 3 |
| 7 | 2 | 5.014e-5 | 15 |
| 29 | 2 | 4.971e-5 | 16 |

## Leg-length distribution (both costumes, floor 2e-3) — are real weaves 3-frame or 15-frame?

| leg length (frames) | count WITHOUT(d) | count WITH(d) |
|---:|---:|---:|
| 3 | 72 | 58 |
| 4 | 55 | 50 |
| 5 | 50 | 59 |
| 6 | 30 | 41 |
| 7 | 39 | 26 |
| 8 | 29 | 20 |
| 9 | 14 | 10 |
| 10 | 10 | 10 |
| 11 | 17 | 5 |
| 12 | 14 | 9 |
| 13 | 8 | 4 |
| 14 | 10 | 4 |
| 15 | 5 | 5 |
| 16 | 12 | 5 |
| 17 | 4 | 5 |
| 18 | 2 | 8 |
| 19 | 7 | 4 |
| 20 | 5 | 7 |
| 21 | 7 | 5 |
| 22 | 7 | 4 |
| 23 | 1 | 2 |
| 24 | 3 | 4 |
| 25 | 5 | 6 |
| 26 | 5 | 1 |
| 27 | 2 | 0 |
| 28 | 0 | 3 |
| 29 | 4 | 1 |
| 30 | 2 | 0 |
| 31 | 1 | 2 |
| 32 | 2 | 1 |
| 33 | 2 | 2 |
| 34 | 1 | 0 |
| 35 | 2 | 2 |
| 36 | 3 | 2 |
| 37 | 2 | 2 |
| 38 | 0 | 2 |
| 39 | 1 | 1 |
| 41 | 3 | 1 |
| 42 | 1 | 0 |
| 43 | 0 | 1 |
| 44 | 1 | 2 |
| 45 | 0 | 1 |
| 46 | 0 | 1 |
| 47 | 1 | 0 |
| 49 | 1 | 2 |
| 50 | 2 | 0 |
| 52 | 0 | 1 |
| 53 | 1 | 3 |
| 54 | 0 | 1 |
| 55 | 1 | 0 |
| 56 | 2 | 2 |
| 58 | 0 | 1 |
| 61 | 1 | 0 |
| 64 | 1 | 1 |
| 65 | 1 | 0 |
| 66 | 0 | 1 |
| 68 | 0 | 2 |
| 70 | 1 | 1 |
| 73 | 0 | 1 |
| 75 | 1 | 1 |
| 79 | 1 | 0 |
| 90 | 0 | 1 |
| 96 | 1 | 0 |
| 99 | 1 | 0 |
| 101 | 1 | 1 |
| 102 | 1 | 0 |
| 105 | 1 | 1 |
| 107 | 0 | 1 |
| 113 | 1 | 0 |
| 116 | 0 | 1 |
| 120 | 0 | 1 |
| 126 | 1 | 2 |

## Step 3 — the racer the Owner saw (largest weave-count increase noD − withD, floor 2e-3)

| rank | racer | weaves WITHOUT(d) | weaves WITH(d) | increase |
|---:|---:|---:|---:|---:|
| | 22 | 4 | 0 | 4 |
| | 27 | 4 | 0 | 4 |
| | 12 | 3 | 0 | 3 |
| | 30 | 3 | 0 | 3 |
| | 7 | 2 | 0 | 2 |
| | 29 | 2 | 0 | 2 |
| | 32 | 2 | 0 | 2 |
| | 35 | 2 | 0 | 2 |

CHOSEN racer = 22 (weaves 0 → 4, increase 4).
Worst weave span (WITHOUT d): frames 2616..2646.