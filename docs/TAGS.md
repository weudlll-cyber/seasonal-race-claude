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
- `v-retune-cleanup-complete` (`e0f6950`) — the **retune → dead-mechanisms cleanup → DevScreen reorg →
  greenfield-wrap** phase endpoint (2026-07-23). One anchor for the whole arc: the G/strength retune
  (defaults `0.75/0.5`, ON fingerprint `e93ffa70dad562a1`), the removal of the carousel / pack-release /
  universal-band-arrival mechanisms (both fingerprints byte-identical), the DevScreen regroup, and the
  port of the greenfield measurement keepers + evidence record onto master. The five per-step
  `pre/*`+`backup/*` tags were collapsed onto this and deleted — see the collapse table below.
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
- `archive/greenfield-proto-final` (`2663f7b`) — the entire `pre/greenfield-proto` branch history,
  preserved as a permanent tag before the branch was deleted (2026-07-23). Holds the greenfield night
  run in full: the physics-tax measurement, the open-loop **composer prototype** (deliberately NOT
  ported — measured, dominated, retired with the branch), the G/strength screens, and the retune gate.
  The keepers were ported to master in the greenfield wrap; this tag is where the un-ported prototype
  code lives on.
- `archive/carousel-sweep-final` (`2e6b597`) — the entire `pre/carousel-sweep` branch history,
  preserved as a permanent tag before the branch was deleted (2026-07-23). Holds the carousel
  window-control sweep that produced the "suppression, not selection" verdict — the measurement that
  justified deleting the lead-rotation mechanism from master.

## Active-phase tags (temporary scaffolding — to collapse later)

Live step-tags from the OPEN runaway phase — safe return points, not permanent anchors. They collapse into
that phase's `*-complete` endpoint when it closes (incremental history then lives in commits + docs).

### Runaway phase (open)
- `backup/exp-runaway-baseline-complete` (`f40a7a6`) — the runaway/parade baseline-measurement commit;
  the surviving endpoint anchor for this still-open phase (Distance Leash + Late Challenger, see
  BACKLOG.md). Its `pre/exp-runaway-baseline` scaffolding tag was collapsed in the retune/cleanup
  collapse below (2026-07-23) — the baseline state is recoverable at `2e14663` from the table there.
- **Collapse plan:** fold into the runaway phase's `*-complete` endpoint when that phase closes.

### Sim↔browser parity phase (open)
- `pre/rng-isolation` (`285c6e5`) — master before parity step 1 (physics-RNG isolation): the last
  commit where the browser races drew physics from the swapped global `Math.random`. Return point for
  the D-STREAM fix (see [reports/parity/DIVERGENCE-AUDIT.md](../reports/parity/DIVERGENCE-AUDIT.md)).
  Remembered browser seeds are stale after this step — the in-race stream is no longer render-polluted.
- `backup/rng-isolation-64e0f65` (`64e0f65`) — parity step 1 shipped and owner eye-approved: `makeRaceRng`
  threads one explicit physics stream through both engines, camera/trails off the race stream. Both sim
  fingerprints unchanged (ON `e93ffa70dad562a1`, OFF `72c3360fb75225ef`), whole-race determinism test
  8/8, 374 suites green; same seed replayed an identical race (identical final-lap standings + finishing
  order, only render framing/particles differed). Pinned before the driving-layer ship (plan-grid
  unification + speed/duration redesign) reshapes master.
- `pre/plan-grid-unification` (`fe8565e`) — master before parity step 2a (plan-grid unification /
  D-GRID): the last commit where the sim built the plan grid from a separate per-combo FNV shuffle
  (`comboLayoutSeed`) while the racers stood in a different per-race shuffle. Return point before the
  sim's start-row → target-rank mapping changed. Fingerprints move here by design (ON
  `e93ffa70dad562a1`→`0ecca5e2dbe6526e`, OFF `72c3360fb75225ef`→`6e01e472b7655b9a`); all absolute sim
  baselines are retired ([reports/BASELINE-INVALIDATED.md](../reports/BASELINE-INVALIDATED.md)).
- `backup/plan-grid-unification-05a5d14` (`05a5d14`) — parity step 2a shipped and owner cross-checked:
  one per-race shuffle now feeds both the plan target-ranks and the physical placement (index-ordered to
  match the browser); the per-combo FNV path is deleted. New fingerprints ON `0ecca5e2dbe6526e` /
  OFF `6e01e472b7655b9a`; new invariant test + 412 suites green. The owner's three-seed cross-check
  confirmed matching front sets, an exactly matching winner at the one clear margin (seed 42), and
  neighbour swaps only within 0.05–0.21 s margins. The residual is diagnosed as a closed-track
  duration-derivation seam ([reports/parity/MICRO-DIVERGENCE.md](../reports/parity/MICRO-DIVERGENCE.md),
  `2c72fe6`), classified into the upcoming speed/duration ship.
- **Collapse plan:** fold into the parity phase's `*-complete` endpoint when that phase closes.

### Retune / cleanup / greenfield phase — COLLAPSED (2026-07-23)

The four ship-steps of this phase — the **G/strength retune** (`247b843`), the **dead-mechanisms
cleanup** (`08b09b7`), the **DevScreen reorg** (`e529411`), and the **greenfield wrap** (`79ac945`) —
were each captured with a `pre/*` and a `backup/*` step-tag as they landed. At phase close all of those
were **collapsed onto `v-retune-cleanup-complete` (`e0f6950`)** and deleted, along with a batch of older
loose `pre/*` scaffolding from the runaway/gap-reroll/carousel investigations that had never been
collapsed. Both fingerprints are unchanged across the whole arc (ON `e93ffa70dad562a1`,
OFF `72c3360fb75225ef`) and every ship was owner eye-approved. The removed mechanism code is separately
recoverable at `git show pre/dead-mechanisms-cleanup`'s SHA (see table) and the greenfield prototype at
`archive/greenfield-proto-final`.

**Collapse record — every tag deleted here, name → SHA (the insurance: the commits stay findable
forever, this file is the index).**

| Deleted tag | SHA |
|---|---|
| `pre/browser-seed` | `ffbd214` |
| `pre/browser-seed-ux` | `7830bb2` |
| `pre/carousel-build` | `9c5af2f` |
| `pre/carousel-sweep-base` | `45516fc` |
| `pre/dead-mechanisms-cleanup` | `0555f9d` |
| `pre/devscreen-reorg` | `a7c662e` |
| `pre/exp-runaway-baseline` | `2e14663` |
| `pre/g-retune-ship` | `7d0db3e` |
| `pre/gapreroll-browser` | `3464295` |
| `pre/gapreroll-confirm` | `2e5f121` |
| `pre/gapreroll-default-on` | `45e774b` |
| `pre/gapreroll-smallG-diag` | `ddb847d` |
| `pre/gapreroll-windowfix` | `5163215` |
| `pre/greenfield-wrap` | `aa1f128` |
| `pre/leash-phase1` | `fa76916` |
| `pre/p1-contest-baseline` | `4196367` |
| `pre/release-sweep` | `869615b` |
| `pre/runaway-concept` | `8b98f0a` |
| `pre/runaway-formation-diag` | `cff7474` |
| `pre/runaway-gapreroll` | `adc54c7` |
| `pre/runaway-speed-source` | `b4a1327` |
| `backup/gapreroll-shipped-1594f39` | `1594f39` |
| `backup/g-retune-shipped-247b843` | `247b843` |
| `backup/dead-mechanisms-cleanup-08b09b7` | `08b09b7` |
| `backup/devscreen-reorg-e529411` | `e529411` |
| `backup/greenfield-wrap-79ac945` | `79ac945` |

26 tags deleted (local + origin). The two analysis branches `pre/greenfield-proto` and
`pre/carousel-sweep` were deleted in the same close, their history preserved as
`archive/greenfield-proto-final` and `archive/carousel-sweep-final` (see Permanent anchors + Branches).

### Cleanup arc — COLLAPSED (2026-07-20)
The four `pre/cleanup-step1..4` scaffolding tags were **collapsed onto `v-cleanup-complete`** and deleted
(local + origin) at the end of cleanup step 5. Permanent recovery is by commit hash, which never expires:
the step-2 deletions are recoverable at `c441e7c~1`, the step-4 deletions at `0bb639d~1`.

## Branches

**`master` only.** The two greenfield analysis branches were deleted at the retune/cleanup phase close
(2026-07-23), each preserved first as a permanent `archive/*` tag so nothing was lost:

- `pre/greenfield-proto` → `archive/greenfield-proto-final` (`2663f7b`). Its keepers (escape-episodes +
  physics-tax observers, `exp-gate-retune.mjs`, the evidence record) had already been ported to master;
  the composer prototype was deliberately left behind and now lives only on the archive tag.
- `pre/carousel-sweep` → `archive/carousel-sweep-final` (`2e6b597`). Its "suppression, not selection"
  verdict is captured in LESSONS/SIM; the mechanism it studied is already gone from master.

Neither was ever a merge candidate — both carried prototypes that must not reach master, so porting was
by explicit keep-list, never by merge. Earlier, `diag/look-before-brake` was archived the same way (tag
`archive/diag-look-before-brake` @ `c32cc61`, deleted 2026-07-20). No non-master branches remain.

## Complete tag set (after the retune/cleanup phase close, 2026-07-23)

This is the FULL list of tags that exist on both local and origin — **24 tags, nothing else**:

- `archive/carousel-sweep-final` *(new — `pre/carousel-sweep` branch history)*
- `archive/diag-look-before-brake`
- `archive/greenfield-proto-final` *(new — `pre/greenfield-proto` branch history)*
- `b4-complete`
- `backup/browser-seed-complete`
- `backup/exp-runaway-baseline-complete` *(active runaway phase — collapses later)*
- `backup/lbb-gate-complete`
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
- `v-retune-cleanup-complete` *(new — retune/cleanup/reorg/greenfield phase endpoint)*
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

