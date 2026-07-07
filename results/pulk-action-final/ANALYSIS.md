# PULK-action-FINAL — real fairness definition across 10 tracks

FAIR = band-reach ≥70% per band (EXACT zone match) AND start-row Holm p≥0.05 AND corrP1 ≤0.15. Worst-winner = CONTEXT ONLY.
ACTION = PULK held overtakes ≥3 AND distinct P1 ≥4. Variant A = no gate; B = position-gate 15/31.

| V | track | band-reach (B1..B5, exact) | Holm p | corrP1 | HELD ov | dP1 | lShare | peak | FAIR | ACT || ctx worst | ≤P5% |
|---|---|---|--:|--:|--:|--:|--:|--:|:--:|:--:|--|---|--:|
| A | searound | 75%/75%/66%/86%/· | 0.38 | 0.07 | 13.0 | 3.9 | 48% | 1.081 | ❌ | ❌ || 40→15 | 70% |
| A | garden-path | 81%/76%/67%/86%/· | 0.57 | 0.17 | 14.9 | 5.1 | 40% | 1.081 | ❌ | ✅ || 40→1 | 87% |
| A | dirt-oval | 83%/76%/71%/89%/· | 0.43 | 0.12 | 19.6 | 4.7 | 43% | 1.081 | ✅ | ✅ || 40→1 | 100% |
| A | ice-track | 82%/76%/67%/86%/· | 0.76 | 0.08 | 18.0 | 4.4 | 43% | 1.081 | ❌ | ✅ || 40→3 | 90% |
| A | city-circuit | 86%/80%/68%/87%/· | 0.43 | 0.08 | 17.9 | 4.9 | 41% | 1.081 | ❌ | ✅ || 37→4 | 97% |
| A | mountainstreet | 79%/75%/65%/70%/87% | 0.27 | 0.10 | 10.4 | 4.5 | 40% | 1.081 | ❌ | ✅ || 49→1 | 87% |
| A | seatrack | 81%/73%/64%/70%/86% | 0.14 | 0.10 | 10.8 | 4.7 | 40% | 1.081 | ❌ | ✅ || 56→2 | 87% |
| A | luger-hill | 67%/69%/64%/65%/83% | 0.79 | 0.04 | 9.8 | 4.0 | 47% | 1.081 | ❌ | ❌ || 59→16 | 70% |
| A | space-sprint | 80%/69%/61%/69%/84% | 0.88 | 0.11 | 10.7 | 4.9 | 38% | 1.081 | ❌ | ✅ || 60→4 | 67% |
| A | river-run | 79%/74%/64%/64%/84% | 0.15 | 0.14 | 11.0 | 4.5 | 40% | 1.081 | ❌ | ✅ || 53→8 | 97% |

## Variant A: FAIR 1/10 · FAIR+ACTION 1/10 · naturalness-ok 10/10
- unfair: searound(band), garden-path(band+corrP1), ice-track(band), city-circuit(band), mountainstreet(band), seatrack(band), luger-hill(band), space-sprint(band), river-run(band)
## Variant B: FAIR 0/10 · FAIR+ACTION 0/10 · naturalness-ok 0/10
- all 10 fair by the real definition