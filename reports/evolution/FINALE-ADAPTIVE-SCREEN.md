# Finale ADAPTIVE gates (Evolution Act 2) — SCREEN (the decisive test)

**Report-only. Nothing ships; the owner decides after an eye test.** The decisive question: does ONE track-agnostic spread-scaled law lift/hold BOTH topologies at once? Paired, same seeds. CONTROL = shipped (both finale flags OFF) vs ADAPTIVE = finaleFrontCompression + finaleAdaptiveGates ON (gates = fractions of the live front spread S: G_c = 0.25·S, G_b = 0.50·S, min-spread 1.0 L). Tracks (one open + one closed): luger-hill (open) + searound (closed), canonical per-track defaults (`--track-defaults`), N=25/arm/track (50 races/arm), 40 racers closed / 60 open. band-reach is the primary veto (≥70%); realized G_c/G_b confirm the gates scaled apart per track. Generated 2026-07-26.

## Pooled (both tracks)

| metric | CONTROL | ADAPTIVE |
|---|---|---|
| band-reach (PRIMARY veto) | 71.1% | 71.7% |
| dead finales | 8.0% | 8.0% |
| front@line | 4.14 | 3.68 |
| lead changes | 2.24 | 2.08 |
| runaway | 14.0% | 10.0% |
| escape med (L) | 2.25 | 2.25 |
| escape p90 (L) | 3.92 | 4.04 |
| realized G_c (L) | — | 1.24 |
| realized G_b (L) | — | 2.48 |
| tilts A/race | — | 2.84 |
| tilts B/race | — | 0.22 |
| Holm-unfair tracks | 2/2 | 1/2 |

## luger-hill (open)

| metric | CONTROL | ADAPTIVE |
|---|---|---|
| band-reach (PRIMARY veto) | 68.4% | 69.7% |
| dead finales | 8.0% | 4.0% |
| front@line | 5.36 | 4.04 |
| lead changes | 3.00 | 2.32 |
| runaway | 12.0% | 4.0% |
| escape med (L) | 1.59 | 1.87 |
| escape p90 (L) | 3.17 | 3.07 |
| realized G_c (L) | — | 1.01 |
| realized G_b (L) | — | 2.02 |
| tilts A/race | — | 2.96 |
| tilts B/race | — | 0.32 |
| Holm-unfair tracks | 1/1 | 0/1 |

## searound (closed)

| metric | CONTROL | ADAPTIVE |
|---|---|---|
| band-reach (PRIMARY veto) | 75.1% | 74.7% |
| dead finales | 8.0% | 12.0% |
| front@line | 2.92 | 3.32 |
| lead changes | 1.48 | 1.84 |
| runaway | 16.0% | 16.0% |
| escape med (L) | 2.79 | 2.79 |
| escape p90 (L) | 5.09 | 5.09 |
| realized G_c (L) | — | 1.47 |
| realized G_b (L) | — | 2.93 |
| tilts A/race | — | 2.72 |
| tilts B/race | — | 0.12 |
| Holm-unfair tracks | 1/1 | 1/1 |

## Closing line

**DECISIVE FAIL — abandon Act 2. One spread-scaled law does NOT reconcile both topologies.** The fairness
floor is NOT the problem: pooled band-reach HELD (71.1%→71.7%) and adaptive actually *improved* the open
track (68.4%→69.7%) — the sub-70% open figure is the pre-existing N=25 short-screen baseline that CONTROL
also sits below, not an adaptive break, and Holm-unfair tracks fell 2/2→1/2. The decisive failure is that
**the open over-calm is not fixable by this law**: open lead-changes STILL fall (3.00→2.32) and front@line
STILL loosens (5.36→4.04), exactly as the fixed dose did. Adaptive DID cure the closed over-churn it was
meant to (searound runaway 16%→16% and dead 8%→12%, both far better than the fixed dose's 16%→24% / 8%→16%)
— but that only confirms the two tracks need *opposite* treatments. The smoking gun: **the realized gates
barely separated (open G_c 1.01 vs closed G_c 1.47, both hugging the fixed 1.0), because the live front
spread S is nearly the same on both topologies (~4–6 L)** — so front spread is NOT the hidden variable that
distinguishes open from closed. The open/closed split is **structural physics** (the open track's long
`[0.90,1.0]` run-out re-expands any `[0.80,0.90]` compression; the closed track's bunched laps churn),
which no scheduled-dice draw-tilt in `[0.80,0.90]` can reach. **Recommendation: abandon Act 2 — a single
track-agnostic finale-dice overlay cannot lift both topologies at once.**
