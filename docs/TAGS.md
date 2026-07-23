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
- `race-action-complete` — end of the race-action phase: choreography + PulkLeadRotation
  shipped, cleaned, documented (see [RACE-ACTION.md](RACE-ACTION.md)), and tested. The stable baseline for
  the Stage-7 merge to master (no longer the tip — master has moved on through the post-race-action work).
- `v1-race-action-merged` (`e1d5a2b`) — the race-action arc merged to master.

### v-*-complete (phase endpoints, retained)
- `v-perf-complete` (`858bc4f`) — performance phase.
- `v-camera-perf-complete` (`36ddc9c`) — camera performance / autorun.
- `v-branding-phase1-complete` (`b9a2f03`) — branding phase 1.
- `v-datadir-complete` (`425242d`) — DATA_DIR hardening.
- `v-clean-state-complete` (`ab71825`) — clean-state checkpoint.
- `v-phaseD-complete` (`1b6f270`) — phase D.
- `v-security-hardening-complete` (`3075f5c`) — security hardening.
- `v-outcome-0.6-complete` (`5646d23`) — OUTCOME-start 0.6 endpoint.
- `v-rowenv-easing-complete` (`5f5c03b`) — rowEnvMult easing shipped dormant.
- `v-rowenv-default-on-complete` (`db27fc4`) — rowEnvMult easing flipped default ON.
- `v-b2-heroes-complete` (`8bf54ca`) — B2-Heroes "Attack & Fall" shipped ON (`b2AttackHeroes=3`).
- `b4-complete` (`03e28cf`) — camera-foresight B4 endpoint.
- `backup/lbb-gate-complete` (`7883d45`) — look-before-brake gate endpoint (a `backup/*` name, but a
  completed-phase anchor; retained).

### Cleanup + archive endpoints (2026-07-20)
- `v-cleanup-complete` — the 5-step repository cleanup arc endpoint: archived closed experiments +
  concept reviews (step 1), removed closed sweep/diag drivers (step 2), salvaged `results/` `.md` docs +
  freed ~1 GB local scratch (step 3), docs catch-up + pulklr retirement (step 4), branch/tag hygiene
  (step 5). The `pre/cleanup-step1..4` scaffolding tags were collapsed onto this and deleted.
- `archive/diag-look-before-brake` (`c32cc61`) — the entire `diag/look-before-brake` branch history,
  preserved as a permanent tag before the branch was deleted (2026-07-20). Holds the look-before-brake
  diagnostics AND the `--jobs` sweep parallelism (`0c20f9b`); the `--jobs` BACKLOG item cherry-picks from
  here rather than a live branch.

## Active-phase tags (temporary scaffolding — to collapse later)

Live step-tags from the OPEN runaway phase — safe return points, not permanent anchors. They collapse into
that phase's `*-complete` endpoint when it closes (incremental history then lives in commits + docs).

### Runaway phase (open)
- `pre/exp-runaway-baseline` (`2e14663`) — state before the runaway/parade baseline sweep.
- `backup/exp-runaway-baseline-complete` (`f40a7a6`) — the baseline-measurement commit.
- **Collapse plan:** fold both into the runaway phase's `*-complete` endpoint when the Runaway phase
  (Distance Leash + Late Challenger, see BACKLOG.md) closes.

### Gap-reroll ship (open)
- `backup/gapreroll-shipped-1594f39` (`1594f39`) — shipped master state before the G/strength retune ship
  (gap-reroll default-ON at `5ae3b1f`, plus the eye-test-seeds doc). Sim-verified and owner eye-approved.
- `pre/g-retune-ship` (`7d0db3e`) — master immediately before the G/strength retune ship
  (G 1.5→0.75, strength 1.0→0.5). Return point if the retune is reverted.
- `backup/g-retune-shipped-247b843` (`247b843`) — shipped master state after the G/strength retune ship
  (defaults G=0.75, strength=0.5; new ON fingerprint `e93ffa70dad562a1`). Sim-gated, twice reviewed,
  owner eye-approved on the served bundle.
- **Collapse plan:** fold into the gap-reroll phase's `*-complete` endpoint when the retune ship lands.

### Dead-mechanisms cleanup (open)
- `pre/dead-mechanisms-cleanup` (`0555f9d`) — master immediately before the dead-mechanisms cleanup ship
  (removal of the B1 lead rotation + role-biased dice, the pack strictness release, universal
  band-arrival, and the unread start-row grouping). **This tag is the archive** for every deleted
  mechanism: the docs deliberately no longer name the retired config keys, so `git show` on this tag is
  how the code and key names are recovered.
- `backup/dead-mechanisms-cleanup-08b09b7` (`08b09b7`) — shipped master state after the cleanup ship.
  Both fingerprints byte-identical through the removal (ON `e93ffa70dad562a1`, OFF `72c3360fb75225ef`),
  full suite green, owner eye-approved. Pinned before the DevScreen reorg.
- **Collapse plan:** fold into the cleanup phase's `*-complete` endpoint when the cleanup arc closes.

### DevScreen reorg (open)
- `pre/devscreen-reorg` (`a7c662e`) — master immediately before the DevScreen reorg (gap-reroll moved
  into the Speed card, B2 attackers grouped, the row-env A/B checkbox retired to a pinned key). UI-only:
  both fingerprints unchanged across it, so it is a layout return point, not a behaviour one.
- `backup/devscreen-reorg-e529411` (`e529411`) — shipped master state after the reorg. Both fingerprints
  byte-identical (ON `e93ffa70dad562a1`, OFF `72c3360fb75225ef`), 3267 tests green including the new
  control-placement pins, owner eye-approved. Pinned before the greenfield wrap.
- **Collapse plan:** fold into the cleanup phase's `*-complete` endpoint when the cleanup arc closes —
  the same endpoint as the dead-mechanisms cleanup above; both are one UI/dead-code arc.

### Greenfield wrap (open)
- `pre/greenfield-wrap` (`aa1f128`) — master immediately before the greenfield wrap, which ported the
  measurement keepers (escape-episodes + physics-tax observers, `exp-gate-retune.mjs`, the
  `distinctLeaders` fix) and the whole evidence record from `pre/greenfield-proto` onto master. The
  ported instrumentation is read-only: both fingerprints were re-proven unchanged across it.
- **Collapse plan:** fold into the greenfield phase's `*-complete` endpoint at phase close, together
  with the deletion of the two analysis branches (see Branches below).

### Cleanup arc — COLLAPSED (2026-07-20)
The four `pre/cleanup-step1..4` scaffolding tags were **collapsed onto `v-cleanup-complete`** and deleted
(local + origin) at the end of cleanup step 5. Permanent recovery is by commit hash, which never expires:
the step-2 deletions are recoverable at `c441e7c~1`, the step-4 deletions at `0bb639d~1`.

## Branches

**Three branches exist on origin** (this section was stale until 2026-07-23 — it claimed master-only
while two analysis branches had been pushed):

| Branch | Head | Purpose | Planned fate |
|---|---|---|---|
| `master` | — | The shipped game. Everything reaches players through here. | Permanent. |
| `pre/greenfield-proto` | `2663f7b` | The greenfield night run: physics-tax measurement, the open-loop composer prototype, the G/strength screens, and the retune gate. Its keepers (escape-episodes + physics-tax observers, `exp-gate-retune.mjs`, the evidence record) were **ported to master** in the greenfield wrap. | Delete at phase close, once the owner signs off the keep-list. The composer prototype dies with it **by design** — it was measured, dominated, and is not wanted on master. |
| `pre/carousel-sweep` | `2e6b597` | The carousel window-control sweep that produced the verdict "suppression, not selection" — the measurement that justified deleting the mechanism. | Archive-tag and delete once its findings are confirmed captured in LESSONS/SIM. Not urgent: the mechanism it studied is already gone from master. |

Neither analysis branch is a merge candidate — porting is by explicit keep-list, never by merge, because
both carry prototypes that must not reach master. The `diag/look-before-brake` branch was archived (tag
`archive/diag-look-before-brake` @ `c32cc61`) and deleted on both local and origin, 2026-07-20.

## Complete tag set (after cleanup step 5)

This is the FULL list of tags that exist on both local and origin after this cleanup — nothing else:

- `b4-complete`
- `backup/exp-runaway-baseline-complete` *(active runaway phase — collapses later)*
- `backup/lbb-gate-complete`
- `archive/diag-look-before-brake`
- `pre/exp-runaway-baseline` *(active runaway phase — collapses later)*
- `race-action-complete`
- `stable/pre-governor-04jul` *(permanent anchor — NEVER delete)*
- `stable/pre-overlap-closed-20jun` *(permanent anchor — NEVER delete)*
- `v-b2-heroes-complete`
- `v-branding-phase1-complete`
- `v-camera-perf-complete`
- `v-clean-state-complete`
- `v-cleanup-complete`
- `v-datadir-complete`
- `v-outcome-0.6-complete`
- `v-perf-complete`
- `v-phaseD-complete`
- `v-rowenv-default-on-complete`
- `v-rowenv-easing-complete`
- `v-security-hardening-complete`
- `v1-race-action-merged`

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

