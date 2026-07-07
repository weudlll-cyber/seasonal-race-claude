# Brake-1 FINE diagnostic — does ANY brake collapse the front?

Baseline (no brake, R1): gapMax closed 32–37 / open 23–26. Arm1 = legacy median-gap brake; Arm2 = tight tip.

| track | config | leadΔ% | podium% | distP1 | gapMed | gapMax | corrP1 | B3 |
|-------|--------|-------|--------|-------|-------|-------|-------|----|
| garden-path | medgap_bt0.01_mb0.14_a0 | 0.1 | 0.5 | 3.7 | 9.7 | 22 | 0.27 | 71% |
| garden-path | medgap_bt0.01_mb0.14_a0.66 | 0.11 | 0.51 | 3.7 | 9.9 | 21 | 0.25 | 78% |
| garden-path | medgap_bt0.01_mb0.18_a0 | 0.11 | 0.53 | 3.9 | 9.1 | 17 | 0.27 | 73% |
| garden-path | medgap_bt0.01_mb0.18_a0.66 | 0.12 | 0.56 | 3.7 | 9.1 | 18 | 0.25 | 77% |
| garden-path | medgap_bt0.02_mb0.14_a0 | 0.1 | 0.46 | 3.5 | 11.5 | 25 | 0.25 | 70% |
| garden-path | medgap_bt0.02_mb0.14_a0.66 | 0.1 | 0.51 | 3.3 | 11.3 | 26 | 0.23 | 72% |
| garden-path | medgap_bt0.02_mb0.18_a0 | 0.1 | 0.48 | 3.6 | 11.1 | 21 | 0.26 | 74% |
| garden-path | medgap_bt0.02_mb0.18_a0.66 | 0.11 | 0.5 | 3.4 | 11.0 | 20 | 0.23 | 71% |
| garden-path | tip0.003_mb0.18_a0 | 0.09 | 0.53 | 3.3 | 13.8 | 42 | 0.23 | 69% |
| garden-path | tip0.003_mb0.18_a0.66 | 0.1 | 0.43 | 3.2 | 13.8 | 42 | 0.21 | 67% |
| garden-path | tip0.005_mb0.18_a0 | 0.09 | 0.52 | 3.2 | 14.2 | 44 | 0.23 | 67% |
| garden-path | tip0.005_mb0.18_a0.66 | 0.09 | 0.44 | 3.1 | 14.2 | 42 | 0.21 | 68% |
| mountainstreet | medgap_bt0.01_mb0.14_a0 | 0.21 | 0.75 | 4.4 | 6.6 | 13 | 0.24 | 78% |
| mountainstreet | medgap_bt0.01_mb0.14_a0.66 | 0.21 | 0.87 | 4.3 | 6.6 | 12 | 0.24 | 76% |
| mountainstreet | medgap_bt0.01_mb0.18_a0 | 0.23 | 0.88 | 4.9 | 6.2 | 11 | 0.26 | 76% |
| mountainstreet | medgap_bt0.01_mb0.18_a0.66 | 0.23 | 0.92 | 4.7 | 6.2 | 10 | 0.25 | 77% |
| mountainstreet | medgap_bt0.02_mb0.14_a0 | 0.15 | 0.6 | 3.4 | 7.8 | 15 | 0.19 | 76% |
| mountainstreet | medgap_bt0.02_mb0.14_a0.66 | 0.15 | 0.65 | 3.2 | 7.9 | 16 | 0.18 | 75% |
| mountainstreet | medgap_bt0.02_mb0.18_a0 | 0.17 | 0.66 | 3.7 | 7.5 | 14 | 0.21 | 75% |
| mountainstreet | medgap_bt0.02_mb0.18_a0.66 | 0.16 | 0.77 | 3.5 | 7.5 | 13 | 0.19 | 75% |
| mountainstreet | tip0.003_mb0.18_a0 | 0.11 | 0.6 | 2.7 | 10.4 | 26 | 0.15 | 70% |
| mountainstreet | tip0.003_mb0.18_a0.66 | 0.12 | 0.67 | 2.7 | 10.3 | 26 | 0.14 | 70% |
| mountainstreet | tip0.005_mb0.18_a0 | 0.11 | 0.55 | 2.8 | 10.6 | 25 | 0.15 | 70% |
| mountainstreet | tip0.005_mb0.18_a0.66 | 0.11 | 0.62 | 2.7 | 10.4 | 26 | 0.14 | 67% |
| searound | medgap_bt0.01_mb0.14_a0 | 0.11 | 0.5 | 3.8 | 8.1 | 19 | 0.16 | 72% |
| searound | medgap_bt0.01_mb0.14_a0.66 | 0.1 | 0.51 | 3.8 | 8.1 | 16 | 0.16 | 73% |
| searound | medgap_bt0.01_mb0.18_a0 | 0.12 | 0.54 | 4.1 | 7.7 | 14 | 0.20 | 75% |
| searound | medgap_bt0.01_mb0.18_a0.66 | 0.11 | 0.66 | 4.1 | 7.6 | 14 | 0.18 | 75% |
| searound | medgap_bt0.02_mb0.14_a0 | 0.08 | 0.46 | 3.3 | 10.0 | 19 | 0.13 | 72% |
| searound | medgap_bt0.02_mb0.14_a0.66 | 0.09 | 0.53 | 3.4 | 9.9 | 20 | 0.14 | 70% |
| searound | medgap_bt0.02_mb0.18_a0 | 0.1 | 0.47 | 3.6 | 9.6 | 18 | 0.15 | 71% |
| searound | medgap_bt0.02_mb0.18_a0.66 | 0.1 | 0.47 | 3.6 | 9.6 | 19 | 0.15 | 70% |
| searound | tip0.003_mb0.18_a0 | 0.08 | 0.57 | 3.1 | 12.6 | 33 | 0.11 | 69% |
| searound | tip0.003_mb0.18_a0.66 | 0.08 | 0.37 | 3.0 | 12.8 | 39 | 0.12 | 65% |
| searound | tip0.005_mb0.18_a0 | 0.08 | 0.46 | 3.0 | 13.0 | 33 | 0.12 | 67% |
| searound | tip0.005_mb0.18_a0.66 | 0.08 | 0.39 | 3.0 | 13.0 | 36 | 0.12 | 62% |
| seatrack | medgap_bt0.01_mb0.14_a0 | 0.19 | 0.84 | 4.3 | 6.5 | 12 | 0.26 | 70% |
| seatrack | medgap_bt0.01_mb0.14_a0.66 | 0.21 | 0.9 | 4.4 | 6.5 | 12 | 0.26 | 73% |
| seatrack | medgap_bt0.01_mb0.18_a0 | 0.26 | 1.01 | 5.3 | 6.1 | 11 | 0.30 | 74% |
| seatrack | medgap_bt0.01_mb0.18_a0.66 | 0.26 | 0.97 | 5.3 | 6.1 | 11 | 0.28 | 71% |
| seatrack | medgap_bt0.02_mb0.14_a0 | 0.16 | 0.8 | 3.5 | 7.6 | 14 | 0.21 | 70% |
| seatrack | medgap_bt0.02_mb0.14_a0.66 | 0.16 | 0.73 | 3.6 | 7.6 | 14 | 0.21 | 71% |
| seatrack | medgap_bt0.02_mb0.18_a0 | 0.18 | 0.89 | 4.0 | 7.3 | 13 | 0.23 | 72% |
| seatrack | medgap_bt0.02_mb0.18_a0.66 | 0.18 | 0.81 | 3.9 | 7.3 | 13 | 0.22 | 71% |
| seatrack | tip0.003_mb0.18_a0 | 0.13 | 0.75 | 3.0 | 9.7 | 23 | 0.18 | 68% |
| seatrack | tip0.003_mb0.18_a0.66 | 0.13 | 0.67 | 3.1 | 9.9 | 23 | 0.17 | 69% |
| seatrack | tip0.005_mb0.18_a0 | 0.13 | 0.91 | 3.0 | 9.9 | 23 | 0.18 | 69% |
| seatrack | tip0.005_mb0.18_a0.66 | 0.13 | 0.84 | 3.0 | 10.0 | 23 | 0.17 | 68% |

## Min gapMax achieved per track (did anything collapse the front?)
- garden-path: min gapMax=17 at medgap_bt0.01_mb0.18_a0 (leadΔ=0.11%, podium=0.53%)
- mountainstreet: min gapMax=10 at medgap_bt0.01_mb0.18_a0.66 (leadΔ=0.23%, podium=0.92%)
- searound: min gapMax=14 at medgap_bt0.01_mb0.18_a0.66 (leadΔ=0.11%, podium=0.66%)
- seatrack: min gapMax=11 at medgap_bt0.01_mb0.18_a0 (leadΔ=0.26%, podium=1.01%)