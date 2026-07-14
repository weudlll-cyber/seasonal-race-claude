# Git tags — permanent anchors and cleanup record

This repo uses a lot of `pre/*` and `backup/*` working-session step-tags. They are scaffolding: safe
return points captured before/after a risky step. Once a phase closes, that history lives in the commit
messages and the phase docs, so the step-tags are collapsed. This file records which tags are permanent
and what was retired.

## Permanent anchors (do NOT delete)

### stable/*
- `stable/pre-overlap-closed-20jun` (commit `712f334`) — the stable return point for the entire
  overlap-closed state. Owner-designated permanent anchor.
- `stable/pre-governor-04jul` (commit `d9c9cd3`) — pre-governor baseline (surge + rubber-band intact,
  no governor), captured before the race-action director work.

### race-action-complete
- `race-action-complete` (current tip) — end of the race-action phase: choreography + PulkLeadRotation
  shipped, cleaned, documented (see [RACE-ACTION.md](RACE-ACTION.md)), and tested. Stable baseline for the
  Stage-7 merge to master.

### v-*-complete (earlier phase endpoints, retained)
- `v-perf-complete` (`858bc4f`) — performance phase.
- `v-camera-perf-complete` (`36ddc9c`) — camera performance / autorun.
- `v-branding-phase1-complete` (`b9a2f03`) — branding phase 1.
- `v-datadir-complete` (`425242d`) — DATA_DIR hardening.
- `v-clean-state-complete` (`ab71825`) — clean-state checkpoint.
- `v-phaseD-complete` (`1b6f270`) — phase D.
- `v-security-hardening-complete` (`3075f5c`) — security hardening.

## Retired in Step 6d (race-action arc tag collapse)

**177 `pre/*` and `backup/*` step-tags** created during the race-action arc (the Great Pulk Cleanup —
every step-tag after `stable/pre-overlap-closed-20jun`) were deleted, locally and on origin, after phase
completion. Their incremental history is preserved in the commit messages and in `docs/RACE-ACTION.md`.

The **36 older `pre/*` / `backup/*` step-tags** from unrelated earlier phases (auth, branding, offline,
background-cache, recover-admin, and the 19–20 June sim-parity / overlap / band lead-in) were **not**
touched.

The full list of the 177 retired tags is recorded below for the archive.

### Retired tags (177)
- `backup/4a-asymmetric-fix`
- `backup/4a-cleanup-docs-and-test`
- `backup/battle-isolation-default-0`
- `backup/browser-fallback-bonusmult-fix`
- `backup/cam-leader-zoom-fix-24jun`
- `backup/cam-leader-zoom-floor-24jun`
- `backup/city-circuit-geometry-expanded`
- `backup/cleanup-s1-m1-pulkspring`
- `backup/cleanup-s2-pulkracedirector`
- `backup/cleanup-s3-deflag`
- `backup/cleanup-s4-classic-director`
- `backup/cleanup-s5a-rename-choreo`
- `backup/cleanup-s5bi-rehome`
- `backup/cleanup-s5biii-devscreen-order`
- `backup/cleanup-s6a-sweep-cleanup`
- `backup/cleanup-s6a2-sweep-followup`
- `backup/cleanup-s6b-docs`
- `backup/cleanup-s6b2-doc-truth-audit`
- `backup/closed-duration-realized`
- `backup/commit-a-legacy-forces-removed`
- `backup/commit-b-priority-ovlc-removed`
- `backup/cumulative-t-fix`
- `backup/default-flip-v4-world`
- `backup/dirt-oval-geometry-expanded`
- `backup/docs-refresh-architecture`
- `backup/docs-refresh-backlog`
- `backup/docs-refresh-kraeftelandkarte`
- `backup/docs-refresh-roadmap`
- `backup/docs-refresh-sim`
- `backup/garden-path-geometry-expanded`
- `backup/governor-core`
- `backup/governor-edge-limiter`
- `backup/ice-track-geometry-expanded`
- `backup/lessons-learned-30jun`
- `backup/look-before-brake`
- `backup/lookahead-lane-change`
- `backup/perf-render-arc-complete`
- `backup/phase-boundary-hardening`
- `backup/photo-finish-predictive`
- `backup/pulk-lead-rotation-starvguard`
- `backup/raceplan-min-duration-knob`
- `backup/rb-dynamics-default-on`
- `backup/reroll-realized-duration`
- `backup/rubber-band-cap-the-lead`
- `backup/rubber-band-diag-hud`
- `backup/setup-raceplan-threshold`
- `backup/sim-dead-scaffold-cleanup`
- `backup/sim-determinism-seeded-shuffle`
- `backup/sim-fairness-passthrough-telemetry`
- `backup/sim-finisht-parity-fix`
- `backup/sim-reroll-cli-flags`
- `backup/sim-shared-config-defaults-fix`
- `backup/soft-steering-layer1-active`
- `backup/surface-particle-pooling-done`
- `backup/surge-default-on`
- `backup/surge-exclude-top3`
- `backup/sweep-instrumentation-pulklr`
- `pre/4a-asymmetric-fix`
- `pre/4a-cleanup-docs-and-test`
- `pre/action-1`
- `pre/action-sweep-r1`
- `pre/areabonus-parity`
- `pre/battle-arc-closeness`
- `pre/battle-isolation-default-0`
- `pre/bg-layer-promotion`
- `pre/boost-headroom`
- `pre/brake-1-tipbrake`
- `pre/breakaway-diag`
- `pre/browser-fallback-bonusmult-fix`
- `pre/canvas-isolation-probe`
- `pre/city-circuit-geometry`
- `pre/cleanup`
- `pre/cleanup-s1-m1-pulkspring`
- `pre/cleanup-s2-pulkracedirector`
- `pre/cleanup-s3-deflag`
- `pre/cleanup-s4-classic-director`
- `pre/cleanup-s5a-rename-choreo`
- `pre/cleanup-s5bi-rehome`
- `pre/cleanup-s5bii-devscreen`
- `pre/cleanup-s5biii-devscreen-order`
- `pre/cleanup-s6a-sweep-cleanup`
- `pre/cleanup-s6a2-sweep-followup`
- `pre/cleanup-s6b-docs`
- `pre/cleanup-s6b2-doc-truth-audit`
- `pre/closed-duration-prediction`
- `pre/closedsff-reference-fix`
- `pre/cohesion-stage0`
- `pre/cumulative-t-fix`
- `pre/default-flip-v4-world`
- `pre/delete-dormant-experiments`
- `pre/director-rebuild`
- `pre/dirt-oval-geometry`
- `pre/doc-sync-governor-pivot`
- `pre/docs-refresh-architecture`
- `pre/docs-refresh-backlog`
- `pre/docs-refresh-kraeftelandkarte`
- `pre/docs-refresh-roadmap`
- `pre/docs-refresh-sim`
- `pre/draw-piece-isolation`
- `pre/garden-path-geometry`
- `pre/governor-core`
- `pre/governor-diag-hud-hero`
- `pre/governor-diag-hud-spread`
- `pre/governor-director-a1`
- `pre/governor-edge-limiter`
- `pre/governor-length-bound`
- `pre/governor-neighbor-gap`
- `pre/governor-rubber-band-redesign`
- `pre/governor-stage-c`
- `pre/ice-track-geometry`
- `pre/lbb-dedicated-differential`
- `pre/lessons-146-150`
- `pre/lessons-learned-30jun`
- `pre/look-before-brake`
- `pre/look-before-brake-harden`
- `pre/lookahead-lane-change`
- `pre/ovl-weg1-antrieb-cap-20jun`
- `pre/perf-hud`
- `pre/phase-boundary-hardening`
- `pre/photo-finish-15a`
- `pre/photo-finish-predictive`
- `pre/photo-finish-text-fix`
- `pre/probe-recovery`
- `pre/pulk-action`
- `pre/pulk-action-2`
- `pre/pulk-action-3`
- `pre/pulk-action-4`
- `pre/pulk-action-6`
- `pre/pulk-action-7`
- `pre/pulk-action-client`
- `pre/pulk-action-final`
- `pre/pulk-baseline-measure`
- `pre/pulk-contest-sweep`
- `pre/pulk-lead-rotation`
- `pre/pulk-lead-rotation-brakeset`
- `pre/pulk-lead-rotation-flatboost`
- `pre/pulk-lead-rotation-holdfix`
- `pre/pulk-lead-rotation-starvguard`
- `pre/pulk-race-action-measure`
- `pre/pulk-race-director`
- `pre/pulk-reopen`
- `pre/pulk-surge-core`
- `pre/raceplan-min-duration-knob`
- `pre/rank-proto`
- `pre/rank-proto-stufe2`
- `pre/rank-proto-stufe2b`
- `pre/rank-proto-stufe2c`
- `pre/rb-dynamics-default-on`
- `pre/remove-diag-scaffold`
- `pre/remove-race-zones`
- `pre/reroll-realized-duration`
- `pre/rubber-band-cap-the-lead`
- `pre/rubber-band-diag-hud`
- `pre/runaway-leader-measure`
- `pre/setup-raceplan-threshold`
- `pre/shared-t-update`
- `pre/sim-action-metric`
- `pre/sim-dead-scaffold-cleanup`
- `pre/sim-fairness-passthrough-telemetry`
- `pre/sim-finisht-parity-fix`
- `pre/sim-reroll-cli-flags`
- `pre/sim-shared-config-defaults-fix`
- `pre/smoothing-quality`
- `pre/soft-steering-layer1`
- `pre/softer-lane-change`
- `pre/splash-line-baked-sprite`
- `pre/spread-default`
- `pre/step5-pulk-collapse`
- `pre/strip-down`
- `pre/surface-particle-pooling`
- `pre/surge-default-on`
- `pre/surge-devscreen-knobs`
- `pre/surge-exclude-top3`
- `pre/surge-telemetry-agg`
- `pre/sweep-instrumentation-pulklr`
- `pre/v4-choreography`
- `pre/v4-on-trunk`

