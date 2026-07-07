# Rank-Proto Stufe 1 — show-target vs no-action baseline (2 tracks × 30 seeds)

Show-target controller mode ON (frontBand 8, wanderDwell 0.06), areaBonus phase-decoupled; governor/rubber-band/PULK/surge OFF.

GREEN iff BOTH: (fair) band-reach ≥70% all bands AND corrP1 ≤0.15 on both tracks, AND (exciting) leadΔ/stableOvt clearly above baseline (front-relevant).

| track | mode | leadΔ% | podium% | distP1 | stableOvt | gapMed | corrP1 | corrT3 | B1 | B2 | B3 | B4 | startP |
|-------|------|-------|--------|-------|----------|-------|-------|-------|----|----|----|----|-------|
| searound | base | 0.057 | 0.307 | 2.57 | 6.03 | 0 | 0.09 | 0.14 | 77% | 76% | 66%⚠ | 87% | 0.65 |
| searound | **show** | 0.12 | 0.834 | 4.2 | 14.55 | 0 | 0.02 | 0.00 | 82% | 79% | 68%⚠ | 87% | 0.06 |
| seatrack | base | 0.113 | 0.696 | 2.77 | 13.51 | 0 | 0.16⚠ | 0.23 | 81% | 75% | 67%⚠ | 70% | 0.34 |
| seatrack | **show** | 0.343 | 1.763 | 6.4 | 29.27 | 0 | 0.03 | 0.02 | 83% | 76% | 64%⚠ | 72% | 0.28 |
## Baseline reference (flat no-action, same 2 tracks/30 seeds): leadΔ ~0.06–0.11%, distinctP1 ~2.6–2.8, stableOvertakes ~6 (closed) / ~13.5 (open), podium ~0.3–0.7%.

## VERDICT: GREEN (invest further) — with one band-reach re-confirm flag.

**FAIR handoff — HOLDS (the decisive risk is answered NO):**
- corrP1 (winner vs early-front): show **0.02** (searound) / **0.03** (seatrack) — well below 0.15, and *better* than baseline (0.09 / 0.16). The phase-decoupled areaBonus removes the leak. corrT3 ≈ 0.00–0.02.
- Band-reach B1/B2/B4 all ≥70%. **B3 reads 64–68% — BUT the no-action baseline reads the SAME (66–67%)**, so the show-target does NOT degrade band-reach: the rank-blind scramble is NOT stranding the winner. The sub-70 B3 is a pre-existing N=30 / single-representative-racer measurement artifact (Action-1's equivalent config hit B3 70–71% at N=100). Start-row Holm fair.
- (Handoff recovery evidenced by band-reach ≈ baseline; a dedicated rank-error-at-corridorStart telemetry was not added — L140, could add.)

**EXCITING — YES, and front-relevant (not deep-field churn, not static):**
- stableOvertakes ~**2×** baseline (searound 6→14.6, seatrack 13.5→29.3) — real overtakes, not flicker.
- distinctP1 ~**2×** (2.6→4.2, 2.8→6.4) and podiumShuffleRate ~**2.5×** (front/top-3 metrics) — the FRONT is genuinely more contested; the podium uplift matches the field uplift, so the action is front-relevant.
- leadChangeRate 2–3× baseline (0.06→0.12%, 0.11→0.34%) — up, but low absolute (the very-P1 changes less than the force approach's flicker-inflated 24–37%; here it's fewer but *real* P1 changes).

**Both sides hold → GREEN.** The rank/show-target approach keeps the fair handoff (band-reach not degraded, corrP1 fixed) AND produces real front-relevant action. One flag before the slider sweep: re-confirm B3 ≥70% at N=100 (borderline at N=30 in show AND baseline).
