# Act 2 consultation — self-adaptive finale contest (Copilot)

Scope: report-only opinion from code and existing reports. No runs.

## 1. Diagnosis

The fixed dose inverted by topology because it was acting on a race-internal state that differs systematically between the two tracks, but with one track-agnostic threshold set. The finale overlay is a scheduled-dice transform on the same draw the gap-cap re-roll already uses, gated by a fixed window and fixed gates (`G_c=1.0`, `G_b=2.0`, strength 1.0) in `computeGapBiasedTarget()` ([client/src/modules/racePlanner.js:925-980](client/src/modules/racePlanner.js#L925)). The SCREEN shows the same dose helps one track only by topology: open luger-hill loses dead/runaway but also loses lead changes/front@line, while closed searound gains contest but worsens dead/runaway ([reports/evolution/FINALE-SCREEN.md](reports/evolution/FINALE-SCREEN.md#L3), [reports/evolution/FINALE-SCREEN.md](reports/evolution/FINALE-SCREEN.md#L55)).

Mechanically, that is consistent with a mismatch between a fixed late overlay and the live front spread in racer lengths. The code already measures the front in track-neutral length units (`arcT × lenScale`) and keeps the draw inside the honest `[spreadMin, spreadMax]` band ([client/src/modules/racePlanner.js:1004-1005](client/src/modules/racePlanner.js#L1004), [client/src/modules/racePlanner.js:971-980](client/src/modules/racePlanner.js#L971)). The open track is naturally wider, the closed track naturally bunched; a single fixed dose is therefore being applied to two different live front-width regimes and the same late push is landing on opposite sides of the contest/fairness tradeoff.

The single race-internal quantity that best separates those regimes is the live front-band width, ideally the cumulative leader-to-P5 width in racer lengths. The cheapest proxy already present is leader→P2 gap via `leaderGapLengths`, but P1→P5 width is the better discriminator because it captures whether the whole front band is loose or compact, not just the immediate breakaway.

Recommendation: treat live front-band width as the control signal, not track type or a fixed dose.

## 2. Adaptive law

The cleanest track-agnostic adaptive rule is a width-gated dose controller in the existing finale overlay path, still inside `computeGapBiasedTarget()` and still purely deterministic.

Proposed shape:

- Let `W` be the live front-band width in racer lengths, measured from the current leader to the P5 racer in the live front band.
- Define a shared width corridor `[W_lo, W_hi]` and a global base strength `S`.
- Compute `dose = clamp((W - W_lo) / (W_hi - W_lo), 0, 1)`.
- Apply `effectiveStrength = S * dose` to the finale overlay.
- Keep the existing honest clamps and the existing window `[0.80, 0.90]`; do not touch `_setTarget`, the servo, or the static target map.
- Keep B as a rare backstop by making the leader-bleed branch require the same width gate plus the existing `G_b > G_c` condition; B should never become a general leash.

Where it slots in:

- Compute `W` at the top of the finale overlay block in `computeGapBiasedTarget()` right after the live racers are sorted, using the same lap-aware `arcT`/`lenScale` plumbing already in the file.
- Replace the fixed `plan._finaleCompressStrength` with `effectiveStrength(W)` before the A/B branches fire.
- Leave the rest of the overlay unchanged so the mechanism remains scheduled-dice only, front-band only, and band-clamped.

Why this shape fits the rules:

- Pure/deterministic: the dose is a function of live state, config, and track geometry only; no extra entropy.
- Honest-band-clamped: the existing `clamp(rawSample +/- frac * ...)` paths remain intact.
- Intra-band only: the overlay still only acts on live ranks 1-5, so it cannot cross BAND_EDGES.
- No 2-racer duel: the dose is computed from the front-band width, not a bespoke duel pairing.
- Duration-scaled: the window is already progress-based, so the adaptive signal stays race-length agnostic from 30 s to 300 s.

Recommendation: build a single width-gated adaptive overlay in the existing finale path, with the front-band width as the signal and B kept subordinate to A.

## 3. Feasibility + risk

Cheapest build on top of the current implementation (`8d5e9fd`-class overlay) is to keep the existing overlay and replace the fixed strength with the width-gated dose above. That is a small change in one place (`client/src/modules/racePlanner.js:925-980`) plus the existing flag plumbing in defaults and the sim harness ([client/src/modules/storage/defaults.js:411-415](client/src/modules/storage/defaults.js#L411), [scripts/sim-fairness.mjs:305-309](scripts/sim-fairness.mjs#L305)). No new architecture is needed.

The SCREEN that should judge it already exists: the same paired two-track screen on luger-hill and searound, with band-reach as the hard veto and dead finales / front@line / lead changes / runaway / escape med-p90 as guardrails ([scripts/exp-finale-screen.mjs:1-16](scripts/exp-finale-screen.mjs#L1), [reports/evolution/FINALE-SCREEN.md](reports/evolution/FINALE-SCREEN.md#L3)). The bar should be stricter than the fixed-dose run: both tracks need to move in the right direction or at least hold, not just pooled average out.

Main risk: one track-agnostic width law may still not be expressive enough to reconcile the two topologies if the open and closed tracks sit on opposite sides of the same contest corridor. The current screen already shows that the fixed dose behaves as if the tracks need different effective doses even under one rule set; the adaptive law only works if front width is the right hidden variable and not just a proxy. If the first paired screen on the adaptive version still gives the same open-track calming / closed-track destabilization split, the mechanism should be abandoned rather than widened into topology-specific tuning.

Recommendation: try the width-gated adaptive overlay once, but only if the first paired screen preserves the 70% floor and stops the opposite-track split; otherwise abandon Act 2.

## Closing line

Preferred first build: a single width-gated adaptive finale overlay driven by live front-band width, with B only as a capped backstop. Abandon if the first paired screen still fails to improve both tracks together while keeping band-reach at or above 70% and avoiding worse dead/runaway/lead-change guardrails.