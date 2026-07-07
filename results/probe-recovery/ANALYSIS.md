# PROBE-RECOVERY — winner recovery curves + derived gate thresholds

Winning cell N8/D0.6, NO position-gate (raw OUTCOME recovery). 100 races/track. P(final≤P5) by winner rank at 0.55.
gate_high = deepest rank still ≥90% recoverable (no boost → keep unpredictable); gate_low = rank where recovery <50% (full boost).

## garden-path  (100 winners)
Natural landing rank@0.55: mean 16.9, worst 40 · rank@0.50 mean 17.1 · overall P(≤P5) 91% · mean final 2.5

| rank@0.55 bin | n | P(≤P5) | P(≤P3) | P(=P1) | mean final |
|---|--:|--:|--:|--:|--:|
| 1–5 | 19 | 100% | 100% | 89% | 1.2 |
| 6–10 | 13 | 100% | 100% | 69% | 1.3 |
| 11–15 | 18 | 100% | 100% | 78% | 1.3 |
| 16–20 | 13 | 92% | 92% | 62% | 1.8 |
| 21–30 | 23 | 87% | 65% | 39% | 3.3 |
| 31–40 | 14 | 64% | 43% | 21% | 6.1 |
| 41–50 | 0 | — | — | — | — |
| 51–60 | 0 | — | — | — | — |

**Derived: gate_high = 20 (≥90% recoverable up to here) · gate_low = (never <50% — recovers from everywhere)**

## luger-hill  (100 winners)
Natural landing rank@0.55: mean 29.4, worst 60 · rank@0.50 mean 30.0 · overall P(≤P5) 75% · mean final 4.6

| rank@0.55 bin | n | P(≤P5) | P(≤P3) | P(=P1) | mean final |
|---|--:|--:|--:|--:|--:|
| 1–5 | 11 | 100% | 91% | 73% | 1.5 |
| 6–10 | 8 | 100% | 100% | 63% | 1.4 |
| 11–15 | 12 | 100% | 100% | 83% | 1.2 |
| 16–20 | 5 | 80% | 60% | 20% | 3.2 |
| 21–30 | 19 | 79% | 68% | 37% | 3.8 |
| 31–40 | 15 | 87% | 80% | 27% | 3.1 |
| 41–50 | 9 | 67% | 56% | 22% | 4.8 |
| 51–60 | 21 | 29% | 29% | 0% | 11.4 |

**Derived: gate_high = 15 (≥90% recoverable up to here) · gate_low = 51**

## river-run  (100 winners)
Natural landing rank@0.55: mean 23.6, worst 56 · rank@0.50 mean 24.2 · overall P(≤P5) 87% · mean final 3.1

| rank@0.55 bin | n | P(≤P5) | P(≤P3) | P(=P1) | mean final |
|---|--:|--:|--:|--:|--:|
| 1–5 | 17 | 100% | 100% | 76% | 1.3 |
| 6–10 | 7 | 100% | 100% | 71% | 1.3 |
| 11–15 | 10 | 100% | 80% | 60% | 1.8 |
| 16–20 | 10 | 100% | 90% | 40% | 2.1 |
| 21–30 | 24 | 92% | 75% | 33% | 2.5 |
| 31–40 | 15 | 80% | 53% | 13% | 3.9 |
| 41–50 | 10 | 70% | 40% | 20% | 5.0 |
| 51–60 | 7 | 29% | 14% | 0% | 10.6 |

**Derived: gate_high = 30 (≥90% recoverable up to here) · gate_low = 51**

## searound  (100 winners)
Natural landing rank@0.55: mean 17.5, worst 40 · rank@0.50 mean 17.7 · overall P(≤P5) 80% · mean final 3.3

| rank@0.55 bin | n | P(≤P5) | P(≤P3) | P(=P1) | mean final |
|---|--:|--:|--:|--:|--:|
| 1–5 | 22 | 100% | 100% | 91% | 1.1 |
| 6–10 | 13 | 100% | 100% | 69% | 1.5 |
| 11–15 | 11 | 91% | 91% | 55% | 1.9 |
| 16–20 | 11 | 73% | 73% | 64% | 3.7 |
| 21–30 | 27 | 74% | 63% | 41% | 4.1 |
| 31–40 | 16 | 44% | 13% | 6% | 6.8 |
| 41–50 | 0 | — | — | — | — |
| 51–60 | 0 | — | — | — | — |

**Derived: gate_high = 15 (≥90% recoverable up to here) · gate_low = 31**

## Global synthesis
- gate_high across the 3 unfair: luger-hill=15, river-run=30, searound=15
- gate_low across the 3 unfair: luger-hill=51, river-run=51, searound=31
- fair control garden-path: gate_high=20, gate_low=none (recovers from everywhere), overall P(≤P5)=91%