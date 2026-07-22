# GREENFIELD P1 — Inversion-budget audit

Pure arithmetic on the existing per-race assignments (no race playback). N=100 plan seeds; grid = identity by construction; assignment = createRacePlan's seeded Fisher-Yates (replicated + verified byte-identical). Field density **g** and field speed **v** measured per track × duration with the read-only `--physics-tax` observer (N=15 each). σ = 48.1% (P0). Natural band half-width b = 0.0813.

**ratio = |Δrank|·g / (T·v·b)** — the required mean speed differential as a fraction of the natural band. ratio ≤ 1 ⇒ the move fits inside the band given the whole race. reduced band = b·(1−σ).

## Assignment budget (track-independent)

- Inversion count per race (the action budget): mean 395, p50 393, min 297, max 502 (of 780 max for n=40).
- Required rank movement |Δrank| per racer: mean 13.5, p50 12, p95 32, max 39.

## Deliverability grid

| track | dur | band | g (L) | v (L/s) | ratio p50 | ratio p95 | %deliver | %marginal | %undeliver | verdict |
|---|---|---|---|---|---|---|---|---|---|---|
| luger-hill | 30s | full | 0.2255 | 3.1637 | 0.3505 | 0.9346 | 90% | 8% | 2% | DELIVERABLE |
| luger-hill | 30s | reduced | 0.2255 | 3.1637 | 0.6752 | 1.8004 | 59% | 9% | 32% | MARGINAL |
| luger-hill | 60s | full | 0.3175 | 3.1297 | 0.2494 | 0.6652 | 100% | 0% | 0% | DELIVERABLE |
| luger-hill | 60s | reduced | 0.3175 | 3.1297 | 0.4805 | 1.2814 | 74% | 11% | 15% | MARGINAL |
| luger-hill | 120s | full | 0.3207 | 1.7868 | 0.2207 | 0.5885 | 100% | 0% | 0% | DELIVERABLE |
| luger-hill | 120s | reduced | 0.3207 | 1.7868 | 0.4251 | 1.1336 | 81% | 10% | 9% | MARGINAL |
| luger-hill | 300s | full | 0.258 | 0.7139 | 0.1777 | 0.474 | 100% | 0% | 0% | DELIVERABLE |
| luger-hill | 300s | reduced | 0.258 | 0.7139 | 0.3424 | 0.9131 | 91% | 7% | 2% | DELIVERABLE |
| mountainstreet | 30s | full | 0.2395 | 5.4019 | 0.2181 | 0.5815 | 100% | 0% | 0% | DELIVERABLE |
| mountainstreet | 30s | reduced | 0.2395 | 5.4019 | 0.4201 | 1.1202 | 81% | 10% | 9% | MARGINAL |
| mountainstreet | 60s | full | 0.4135 | 5.4075 | 0.188 | 0.5014 | 100% | 0% | 0% | DELIVERABLE |
| mountainstreet | 60s | reduced | 0.4135 | 5.4075 | 0.3622 | 0.9658 | 88% | 9% | 3% | DELIVERABLE |
| mountainstreet | 120s | full | 0.6276 | 5.1587 | 0.1496 | 0.3989 | 100% | 0% | 0% | DELIVERABLE |
| mountainstreet | 120s | reduced | 0.6276 | 5.1587 | 0.2882 | 0.7684 | 97% | 3% | 0% | DELIVERABLE |
| mountainstreet | 300s | full | 0.4753 | 2.0637 | 0.1133 | 0.302 | 100% | 0% | 0% | DELIVERABLE |
| mountainstreet | 300s | reduced | 0.4753 | 2.0637 | 0.2182 | 0.5819 | 100% | 0% | 0% | DELIVERABLE |
| searound | 30s | full | 0.3465 | 3.5562 | 0.4791 | 1.2776 | 76% | 10% | 13% | MARGINAL |
| searound | 30s | reduced | 0.3465 | 3.5562 | 0.9229 | 2.4612 | 45% | 11% | 44% | MARGINAL |
| searound | 60s | full | 0.4864 | 3.5469 | 0.3372 | 0.8991 | 91% | 7% | 2% | DELIVERABLE |
| searound | 60s | reduced | 0.4864 | 3.5469 | 0.6495 | 1.7321 | 59% | 12% | 29% | MARGINAL |
| searound | 120s | full | 0.6446 | 3.554 | 0.223 | 0.5946 | 100% | 0% | 0% | DELIVERABLE |
| searound | 120s | reduced | 0.6446 | 3.554 | 0.4296 | 1.1455 | 81% | 9% | 10% | MARGINAL |
| searound | 300s | full | 0.4925 | 1.4212 | 0.1704 | 0.4544 | 100% | 0% | 0% | DELIVERABLE |
| searound | 300s | reduced | 0.4925 | 1.4212 | 0.3283 | 0.8755 | 93% | 6% | 1% | DELIVERABLE |
| dirt-oval | 30s | full | 0.2654 | 2.9114 | 0.4482 | 1.1953 | 78% | 10% | 12% | MARGINAL |
| dirt-oval | 30s | reduced | 0.2654 | 2.9114 | 0.8635 | 2.3026 | 49% | 7% | 44% | MARGINAL |
| dirt-oval | 60s | full | 0.4031 | 2.9304 | 0.3383 | 0.902 | 91% | 7% | 2% | DELIVERABLE |
| dirt-oval | 60s | reduced | 0.4031 | 2.9304 | 0.6516 | 1.7377 | 59% | 12% | 29% | MARGINAL |
| dirt-oval | 120s | full | 0.6177 | 2.9362 | 0.2587 | 0.6897 | 100% | 0% | 0% | DELIVERABLE |
| dirt-oval | 120s | reduced | 0.6177 | 2.9362 | 0.4983 | 1.3287 | 74% | 11% | 15% | MARGINAL |
| dirt-oval | 300s | full | 0.4453 | 1.1758 | 0.1862 | 0.4966 | 100% | 0% | 0% | DELIVERABLE |
| dirt-oval | 300s | reduced | 0.4453 | 1.1758 | 0.3588 | 0.9567 | 88% | 9% | 3% | DELIVERABLE |

Verdict rule: DELIVERABLE = p95 racer ratio ≤ 1 (95% fit in band); MARGINAL = median fits but tail does not; UNDELIVERABLE = median racer cannot be delivered within band over the whole race.

Data: `inversion-audit.csv`.
