# Act 2 consultation — finale-window contest (Copilot)

Scope: report-only opinion from code and existing reports. No runs.

## 1. Ingredient (A): front compression in finale window

Diagnosis:

- The failed Act 1 changed target assignment itself and removed persistent rankError restoring force across the field. Act 2 should not touch assignment; it should modulate only late-window actuation.
- Existing safe hooks already exist:
  - progress-aware phase clock and OUTCOME windowing in the controller update path (client/src/modules/racePlanner.js:458-463, client/src/modules/racePlanner.js:490-491).
  - front band identity is stable via BAND_EDGES [5,15,25,40] (client/src/modules/racePlanner.js:54).
  - honest speed authority already clamped (trajectory min/max 0.85/1.10 and spreadFactor band clamps) (client/src/modules/racePlanner.js:94-96, client/src/modules/racePlanner.js:766, client/src/modules/racePlanner.js:979).

Cleanest lever for (A):

- Build front compression as a finale-window, front-band-only scheduled-dice bias, not assignment rewiring.
- Reuse the existing scheduled-dice transform home (`computeGapBiasedTarget`) and add a separate front-compression branch that acts only when:
  - phaseProgress in owner window (recommend [0.80, 0.95]),
  - racer currently in front band (live rank 1-5),
  - front spread exceeds a threshold (for example leader->P5 or leader->P4 gap gate).
- Compression behavior should be multi-racer, not two-racer:
  - mild down-bias on the current leader only when spread is wide,
  - mild up-bias distributed across P2-P5 by their distance to leader (same formula family, same clamps).
- Determinism/parity safety remains high if implemented as pure state function with no new entropy, same as existing gap-reroll transform path (client/src/modules/racePlanner.js:911-926, client/src/modules/racePlanner.js:947-979).

Why this avoids fairness leak:

- It is finale-window-only and front-band-scoped, so global ordering pressure is unchanged.
- It keeps all draws inside honest spread bands and existing trajectory clamps.
- It does not rewrite target assignments or endpoint maps.

Recommendation: implement (A) first as a new flag-gated scheduled-dice front-compression mode in the existing gap-reroll transform path, windowed to [0.80, 0.95] and scoped to live ranks 1-5 with a spread gate.

## 2. Ingredient (B): leader bleed after Leash rejection

Prior result to respect:

- The Leash (continuous leader braking) was already measured rejected, with runaway worsening despite many brake frames; concept docs explicitly record this as failed prior art (reports/proposals/GAP-REROLL-CONCEPT.md:14, reports/proposals/GAP-REROLL-CONCEPT.md:24).
- Mechanically, the Leash is continuous trajectory braking in window [0.60, 0.92] with floor/hysteresis and can reorder behind the leader without creating true front contest (client/src/modules/racePlanner.js:787-829).

Viability judgment:

- A Leash-like continuous brake should be declined for Act 2.
- A viable (B) exists only as a strict backstop that is fundamentally different from Leash:
  - scheduled-dice only (no continuous per-tick trajectory override),
  - late and narrow window (for example [0.88, 0.95]),
  - hard gap gate high enough to target true breakaways only,
  - very small cap (single-step or low-strength down-bias) and no effect once front spread is already compressed,
  - disabled unless (A) is active and insufficient.

Why this can escape the Leash failure:

- It removes continuous brake authority (the Leash failure mode),
- it binds action to sparse scheduled rolls,
- it only fires on residual outliers after (A), rather than trying to globally reshape leader dynamics.

Recommendation: decline standalone leader-slowing; allow (B) only as a tightly gated scheduled-dice backstop behind (A), never as a continuous brake path.

## 3. Combination and guardrails

Interaction shape:

- Preferred interaction is sequenced:
  - (A) primary always in finale window,
  - (B) conditional backstop only when a residual runaway signature remains after (A) conditions are evaluated.
- Do not run A and B as independent always-on peers; that recreates over-control risk and obscures diagnosis.

First flag-gated shape to build:

- One new feature flag family in planner dynamics, default OFF:
  - finaleContestEnabled
  - finaleContestWindowStart / finaleContestWindowEnd
  - finaleFrontCompressThresholdLengths
  - finaleLeaderBackstopThresholdLengths
  - finaleLeaderBackstopStrength
- Implementation home: racePlanner scheduled-dice transform path and phase-progress gating in update/computeGapBiasedTarget, not target assignment map logic.

SCREEN decision metrics for this build:

- Primary hard gate: pooled band-reach >= 70% (same weighted definition).
- Guardrails: dead finales, front@line, lead changes, runaway, escape depth distribution.
- Additional mechanism sanity metric: intervention rate split (A-only vs B-fired) to ensure B remains rare backstop.

Recommendation: build a single sequenced A-primary/B-backstop flag-gated mechanism (default OFF) in the scheduled-dice path, and evaluate with the existing paired control screen before any broader sweep.

Closing line: preferred first build is A-primary with B disabled by default (armed only as residual backstop); abandon Act 2 immediately if the first paired screen does not clear band-reach 70% or worsens dead/runaway while failing to increase lead changes/front@line in the finale window.