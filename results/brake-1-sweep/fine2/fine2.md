# Brake-1 FINE diagnostic — does ANY brake collapse the front?

Baseline (no brake, R1): gapMax closed 32–37 / open 23–26. Held front (medgap bt0.01 mb0.18) + raised director anchor. Baseline director action leadΔ~0.1% podium~0.5%.

| track | config | leadΔ% | podium% | distP1 | gapMed | gapMax | corrP1 | B3 |
|-------|--------|-------|--------|-------|-------|-------|-------|----|
| garden-path | ao4_ps0.09 | 0.14 | 0.68 | 3.9 | 8.9 | 18 | 0.23 | 75% |
| garden-path | ao4_ps0.12 | 0.14 | 0.81 | 4.2 | 9.0 | 18 | 0.23 | 74% |
| garden-path | ao6_ps0.09 | 0.15 | 0.68 | 4.5 | 9.1 | 20 | 0.24 | 76% |
| garden-path | ao6_ps0.12 | 0.15 | 0.67 | 4.4 | 9.0 | 19 | 0.25 | 73% |
| garden-path | ao8_ps0.09 | 0.14 | 0.65 | 4.1 | 9.1 | 20 | 0.24 | 76% |
| garden-path | ao8_ps0.12 | 0.16 | 0.69 | 4.5 | 9.0 | 19 | 0.24 | 75% |
| mountainstreet | ao4_ps0.09 | 0.26 | 1.06 | 5.1 | 6.2 | 12 | 0.26 | 78% |
| mountainstreet | ao4_ps0.12 | 0.26 | 1.1 | 5.1 | 6.2 | 10 | 0.24 | 75% |
| mountainstreet | ao6_ps0.09 | 0.29 | 1.15 | 5.5 | 6.2 | 10 | 0.27 | 78% |
| mountainstreet | ao6_ps0.12 | 0.29 | 1.16 | 5.6 | 6.3 | 10 | 0.28 | 75% |
| mountainstreet | ao8_ps0.09 | 0.3 | 1.17 | 5.7 | 6.3 | 11 | 0.27 | 77% |
| mountainstreet | ao8_ps0.12 | 0.3 | 1.16 | 5.7 | 6.3 | 11 | 0.27 | 77% |
| searound | ao4_ps0.09 | 0.12 | 0.57 | 4.3 | 7.6 | 15 | 0.19 | 73% |
| searound | ao4_ps0.12 | 0.12 | 0.63 | 4.2 | 7.6 | 14 | 0.20 | 74% |
| searound | ao6_ps0.09 | 0.13 | 0.59 | 4.3 | 7.7 | 15 | 0.18 | 76% |
| searound | ao6_ps0.12 | 0.12 | 0.58 | 4.2 | 7.6 | 16 | 0.16 | 73% |
| searound | ao8_ps0.09 | 0.14 | 0.64 | 4.8 | 7.7 | 14 | 0.16 | 73% |
| searound | ao8_ps0.12 | 0.14 | 0.63 | 4.7 | 7.8 | 14 | 0.15 | 77% |
| seatrack | ao4_ps0.09 | 0.27 | 1.14 | 5.3 | 6.2 | 11 | 0.28 | 76% |
| seatrack | ao4_ps0.12 | 0.3 | 1.15 | 5.6 | 6.2 | 11 | 0.28 | 77% |
| seatrack | ao6_ps0.09 | 0.3 | 1.2 | 5.7 | 6.2 | 11 | 0.28 | 74% |
| seatrack | ao6_ps0.12 | 0.3 | 1.23 | 5.7 | 6.2 | 11 | 0.28 | 74% |
| seatrack | ao8_ps0.09 | 0.32 | 1.26 | 5.9 | 6.2 | 11 | 0.28 | 75% |
| seatrack | ao8_ps0.12 | 0.32 | 1.27 | 5.9 | 6.2 | 11 | 0.28 | 75% |

## Min gapMax achieved per track (did anything collapse the front?)
- garden-path: min gapMax=18 at ao4_ps0.12 (leadΔ=0.14%, podium=0.81%)
- mountainstreet: min gapMax=10 at ao6_ps0.09 (leadΔ=0.29%, podium=1.15%)
- searound: min gapMax=14 at ao8_ps0.12 (leadΔ=0.14%, podium=0.63%)
- seatrack: min gapMax=11 at ao6_ps0.12 (leadΔ=0.3%, podium=1.23%)