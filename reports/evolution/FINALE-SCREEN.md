# Finale front-compression (Evolution Act 2) — SCREEN

**Report-only. Nothing ships; the owner decides after an eye test.** Paired, race-for-race, same seeds. CONTROL = shipped defaults (finale flag OFF) vs FINALE = flag ON at the shipped default knobs (window [0.80,0.90], catch-up gate G_c=1.0 L, leader-bleed gate G_b=2.0 L, strength 1.0). Tracks (one open + one closed): luger-hill (open) + searound (closed), canonical per-track defaults (`--track-defaults`), N=25 per arm per track (50 races/arm), 40 racers closed / 60 open. band-reach is the primary veto (≥70% floor); the rest are finale guardrails; the split (A catch-up vs B leader-bleed) confirms B stays a rare backstop. Generated 2026-07-26.

## Pooled (both tracks)

| metric | CONTROL | FINALE |
|---|---|---|
| band-reach (PRIMARY veto) | 71.1% | 71.5% |
| dead finales | 8.0% | 8.0% |
| front@line | 4.14 | 3.70 |
| lead changes | 2.24 | 2.08 |
| runaway | 14.0% | 16.0% |
| escape med (L) | 2.25 | 2.25 |
| escape p90 (L) | 3.92 | 4.19 |
| tilts A/race | — | 2.76 |
| tilts B/race | — | 0.32 |
| B share | — | 10.3% |
| Holm-unfair tracks | 2/2 | 2/2 |

## luger-hill (open)

| metric | CONTROL | FINALE |
|---|---|---|
| band-reach (PRIMARY veto) | 68.4% | 69.5% |
| dead finales | 8.0% | 0.0% |
| front@line | 5.36 | 4.32 |
| lead changes | 3.00 | 2.36 |
| runaway | 12.0% | 8.0% |
| escape med (L) | 1.59 | 1.59 |
| escape p90 (L) | 3.17 | 4.01 |
| tilts A/race | — | 2.84 |
| tilts B/race | — | 0.40 |
| B share | — | 12.3% |
| Holm-unfair tracks | 1/1 | 1/1 |

## searound (closed)

| metric | CONTROL | FINALE |
|---|---|---|
| band-reach (PRIMARY veto) | 75.1% | 74.5% |
| dead finales | 8.0% | 16.0% |
| front@line | 2.92 | 3.08 |
| lead changes | 1.48 | 1.80 |
| runaway | 16.0% | 24.0% |
| escape med (L) | 2.79 | 2.79 |
| escape p90 (L) | 5.09 | 5.09 |
| tilts A/race | — | 2.68 |
| tilts B/race | — | 0.24 |
| B share | — | 8.2% |
| Holm-unfair tracks | 1/1 | 1/1 |

## Closing line

**Direction: MIXED — no clean win, floor HELD, effect OPPOSITE per track. The 70% band-reach floor holds on both (pooled 71.1%→71.5%, +0.4pp), so fairness is intact. But at these defaults it never lifts contest without cost, and on NEITHER track does it satisfy "lead-changes/front@line up AND dead/runaway not worse": luger-hill (open) CALMS the finale (dead 8→0%, runaway 12→8%) but at fewer lead-changes (3.00→2.36) and a looser front@line (5.36→4.32); searound (closed) ADDS contest (lead-changes 1.48→1.80, front@line 2.92→3.08) but worsens dead (8→16%) and runaway (16→24%). Pooled nets to Δlead-changes −0.16, Δfront@line −0.44, Δrunaway +2.0pp. The mechanism SHAPE is sound — the A/B intervention split behaves exactly as designed (A 2.76/race carries it; B 0.32/race, 10.3% share, stays a rare backstop) — so the miss is dose/scope, not architecture. Owner decides: eye-test the open-track calming, and if contest is wanted a knob sweep (tighter window, higher strength, or a closed-track-specific dose) is the next spec; abandon if no dose lifts contest on BOTH tracks while holding the floor.**
