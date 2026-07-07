# Brake-1 sweep — RECOMMENDATION & honest verdict

**Feature at HEAD `1fb1994` (default OFF).** Tip-focus leader-brake (`rubberBandTipThreshold`, reuse of the shared rubber-band) + `--action` director. Sweep: 4 tracks (searound/garden-path closed@40, mountainstreet/seatrack open@60), uniform 60 s. Phases: COARSE (80 cells×30), FINE (48×30), FINE-2 (24×30), CONFIRM (4×100). Total wall ~77 min.

## Headline verdict: NO fair setting produces front action. **0/4 tracks fair-pass** at the peak-action setting.

The brake **can** hold the front — but not the way PART A hypothesised, and holding it does **not** buy a fair, contested front.

## What the phases found

1. **COARSE (tip-focus brake) — flat, null.** Across maxBrake 0.10→0.18 × all director action, `govGapLenMax` stayed ~31–33 (closed) / 21–29 (open) = **identical to the no-brake R1 baseline (23–39)**; leadΔ ~0.1%, podium ~0.5%. **maxBrake had zero effect.** The tip-focus signal (leader→2nd gap) is the wrong lever: braking only the single leader by −18% nets ~−3% against its permanent +15% speed, reeling it in too slowly to swap the lead, and a *front-group* breakaway from the median is never triggered by a leader→2nd test.

2. **FINE (fallbacks) — the legacy MEDIAN-GAP brake DOES hold the front.** With tip-focus OFF and the shared rubber-band at `brakeThreshold=0.01, maxBrake=0.18` (braking *every* ahead-of-median racer, low dead-zone), the front collapsed on all tracks: `govGapLenMax` searound 33→14, garden-path 37→17, mountainstreet 26→10, seatrack 23→11; `gapMed` ~13→~8. Band-reach even improved. **But action stayed low** (leadΔ ~0.11%, podium ~0.5–0.7%) — the director's median+2 anchor was still ~6 lengths behind the held leader. A tighter tip (0.003/0.005) did *not* hold the front — confirming median-gap, not tip, is the holding lever.

3. **FINE-2 (held front + raised anchor) — action appears on OPEN tracks, but breaks unpredictability.** Raising the director anchor to the held front (anchorOffset 6–8) + stronger pull, on the median-gap-held front: open tracks ~doubled action (leadΔ 0.14→0.30%, podium 0.6→1.2%, distinctP1 3.2→5.7); closed tracks stayed flat. **But corrP1 rose to 0.24–0.28 (> the 0.15 gate).** Compressing the field amplifies the still-active, targetRank-coupled **areaBonus** (+6% B1): in a tight pack the winner's +6% dominates positioning → the winner leads early too often.

4. **CONFIRM (peak-action setting, 4 tracks × 100 seeds).** Setting: median-gap brake `brakeThreshold=0.01 maxBrake=0.18` + director `anchorOffset=6 pullStrength=0.09 castSize=3 dwell=0.06`; tail-lift OFF, surge OFF, areaBonus as shipped.

| track | leadΔ% | podium% | distP1 | stableOvt | gapMed | gapMax | corrP1 | B1 | B2 | B3 | B4 | Holm start-row | FAIR |
|-------|-------|--------|-------|----------|-------|-------|-------|----|----|----|----|------|------|
| searound (closed) | 0.12 | 0.60 | 4.1 | 7.6 | 7.8 | 17.1 | **0.20⚠** | 87% | 83% | 77% | 92% | fair (p=1) | ❌ |
| garden-path (closed) | 0.14 | 0.70 | 4.3 | 7.2 | 9.0 | 20.1 | **0.22⚠** | 87% | 84% | 77% | 90% | fair (p=1) | ❌ |
| mountainstreet (open) | 0.29 | 1.13 | 5.4 | 16.1 | 6.3 | 11.9 | **0.28⚠** | 78% | 77% | 76% | 80% | fair (p=1) | ❌ |
| seatrack (open) | 0.30 | 1.17 | 5.6 | 16.3 | 6.2 | 11.1 | **0.28⚠** | 81% | 79% | 77% | 80% | fair (p=1) | ❌ |

- **Band-reach ≥70% on every band, every track. Holm start-row: fair (p=1) everywhere. Front held (gapMax halved).**
- **corrP1 0.20–0.28 on all 4 tracks → exceeds the ≤0.15 unpredictability gate → NOT fair-passing (0/4).**
- Action is marginal even at its best: open tracks ~2× baseline (still leadΔ 0.30% ≈ one lead change per ~5 s); closed tracks essentially flat.

## The honest read

- **The tip-focus brake (PART A's specific hypothesis) does not work** — the leader→2nd signal never engages usefully; maxBrake is inert. The *median-gap* brake (the pre-existing rubber-band, strengthened) is what actually holds the front.
- **A held, reachable front is achievable and stays band-reach/start-row fair** — a real capability worth keeping.
- **But the director will not turn a held front into a fair contest.** It makes a *denser* front cluster (distinctP1 3→5.6) yet barely more lead *changes* (leadΔ ~0.3% peak), because its ±12% pull cannot force overtakes against the permanent ±15% spread + brake-match; and the compression it needs to reach the front amplifies the targetRank-coupled areaBonus, so the winner leads early too often (corrP1 > 0.15).
- **Net: "the brake holds the front, but the director still won't fairly reshuffle it."** No setting is both attractive and fair.

## What this points to (for the next stage — not built here)

1. **Suppress `areaBonusMult` in the pre-OUTCOME window.** It is the targetRank leak that breaks corrP1 under compression (the round-5 still-missed force). Fair action needs the pre-OUTCOME field decoupled from the band bonus.
2. **The contest source must be stronger than the director's ±12% pull** — it must generate real *overtakes* at the front (two-sided authority: brake the leader **and** boost a challenger), not just cluster racers near an anchor. A one-sided ±12% additive pull cannot beat the permanent ±15% spread + brake-match.
3. Keep the **median-gap brake** (not tip-focus) as the front-holding primitive; retire/deprioritise the tip-focus signal.

Nothing here ships. Feature remains default OFF on origin (`rubberBandTipThreshold=0`, `maxBrake=0.10`).
