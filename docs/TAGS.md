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

### COMBO15 ship + the action/fair-arrival line (2026-07-29)
COMBO15 (chaos steer + band-aware re-roll bias + 0.15 chaos window) was the shipped world **at this ship**; it
has since advanced through two avoidance engine changes to the current world `dc4647be0f55ebdb` (see the
*Engine changes since COMBO15* subsection below). The ship
anchors are permanent; the four experiment branches that fed the multi-week action/fair-arrival hunt were
archived as permanent `archive/*` tags and their remote branches deleted (branch hygiene, owner-approved).
- `v-ship-combo15` (`175a475`) — **the ship: COMBO15 as the default world merged to master.** New shipped
  fingerprint `ded0a126048e4cdb` (replaces the pre-combo15 anchor `7c70b1eae7d31e22`; OFF invariant
  `f8f7d9c2fd3283e9` unchanged). See [../reports/evolution/MERGE-SHIP-1.md](../reports/evolution/MERGE-SHIP-1.md)
  and [FAIRNESS.md](FAIRNESS.md).
- `pre/ship-combo15` (`215afde`) — the return point: master state right BEFORE COMBO15 shipped.
- `pre/clean-sweep` (`dad4077`) — the return point before CLEAN-SWEEP-1 (dead-arm removal + local audit) and
  the DOC-SYNC-1 doc pass that followed. Master state at the end of DOCS-1.
- `archive/fair-arrival-merged` (`215afde`) — the `exp/fair-arrival` line (its work is on master via the
  merge `175a475`; this anchors the pre-ship state). Reports on master: `FAIR-ARRIVAL-*`, `CHAOS-STEER-1`,
  `PULK-SPECTACLE-1`, `EYE-SETUP-{1,2}`, `STEER-CAP-1`, `FAIR-ARRIVAL-GATE`, `MERGE-SHIP-1`.
- `archive/chain-choreo-final` (`15c1d58`) — the entire `exp/chain-choreo` history (the admission-only
  action family: ACTION-BUILD-1..7 + ACTION-NIGHT-1 + CHAIN-SIM/INT/ABLATE + DRAMA + FRONT-AUTOPSY). Reports
  copied to master in DOCS-1 STAGE 1. DEAD (section G, [DEAD-ENDS.md](DEAD-ENDS.md)).
- `archive/free-band-final` (`aa21576`) — the entire `exp/free-band` history (the band-corridor family:
  ACTION-FREEBAND-1/2, the cliff). Reports copied to master. DEAD.
- `archive/choreo-release-final` (`109abd6`) — the entire `exp/choreo-release` history (per-racer conditional
  release: arrival-safe but decided-finale-flat; CHOREO-RELEASE-1/2). Reports copied to master. DEAD.

### Engine changes since COMBO15 — RACER-FLAPPING-2 + RACER-MOTION-2 (2026-07-31)
Two `pre/*` return points captured before the two avoidance engine changes that followed COMBO15. Each restores
a distinct shipped world by fingerprint; registered here in DOC-SYNC-2 (they were live at origin but had no
entry). Full fingerprint lineage: [SIM.md](SIM.md); reports:
[../reports/evolution/INDEX.md](../reports/evolution/INDEX.md) (RACER-FLAPPING-2, RACER-MOTION-2, HOLM-300-COMBINED).
- `pre/flapping` (`d0870326`, 2026-07-31) — the pre-RACER-FLAPPING-2 state: restores plain **COMBO15**
  (`ded0a126048e4cdb`), before the avoidance margin hysteresis (`softSteeringObstacleMargin` 0.5).
  RACER-FLAPPING-2 shipped `62400c8e88cdbe59`.
- `pre/motion` (`e99b034d`, 2026-07-31) — the pre-RACER-MOTION-2 state: restores **COMBO15 + margin hysteresis**
  (`62400c8e88cdbe59`), before the lateral acceleration cap (`maxLateralAccelPerStep` 0.0005). RACER-MOTION-2
  shipped the current world `dc4647be0f55ebdb`.

### Camera detour fix — CAMERA-GLIDE-TARGET-1 (2026-08-01)
Return point captured before the first CAMERA-DETOUR fix (cause D: the glide endpoint was computed at the live,
still-easing zoom instead of the destination zoom). Presentation-only — the world fingerprint is unchanged
(`dc4647be0f55ebdb`); cause C (the containment clamp) is deliberately left for the next block.
- `pre/glide-target` (`2e20e1f3`, 2026-08-01) — the pre-fix state: the two CAMERA-DETOUR diagnosis reports +
  the gated frame log, before `_setClosedTrackTargets`/`_setOpenTrackTargets` were changed to resolve the pan
  endpoint at the destination zoom. Restores the shipped world `dc4647be0f55ebdb` (the fix moves no fingerprint).
- `pre/overview-framing` (`e1c6f90b`, 2026-08-01) — the pre-change state before OVERVIEW-FRAMING-1 (the owner's
  framing rule: OVERVIEW frames the leader + N racers at a derived zoom with a sprite-size floor, centre behind
  the leader, leader always in-frame — replacing the fixed toward-shape-centre radial offset). Sits at the
  CAMERA-GLIDE-TARGET-1 (cause-D) commit; restores the shipped world `dc4647be0f55ebdb` (presentation only).

### Camera projection refactor — CAMERA-PROJECTION-1 (2026-08-01, branch `camera-refactor`)
Return point captured before the camera gained a single world↔screen projection and lost the ~28 open/closed
branches that existed only because closed computed world-relative and open computed fixed-absolute. The refactor
is behaviour-preserving by construction — proven by a frame-by-frame replay diff, not by a fingerprint (the
simulation is untouched and no simulation file is in the diff).
- `pre/projection` (`54cbe5d4`, 2026-08-01) — the pre-refactor state: the two CAMERA-REFACTOR measurement
  reports, before `projection.js` existed and while `_setClosedTrackTargets` / `_setOpenTrackTargets` /
  `_closedOffsetY` were still three separate functions. Camera-only; the shipped world `dc4647be0f55ebdb` is
  untouched on both sides of this tag.

## Active-phase tags (temporary scaffolding — to collapse later)

Step-tags from the runaway phase (now CLOSED 2026-07-29, see below) and any later work — safe return points, not permanent anchors. They collapse into
that phase's `*-complete` endpoint when it closes (incremental history then lives in commits + docs).

### Evolution — greenfield experiments (new regime: branch, drop-not-revert)
- **handicap-pursuit experiment recoverable @`089c7d2` (branch retired 2026-07-26).** First greenfield
  experiment (`exp/handicap-pursuit`, off master): a standalone sim-only prototype of the handicap-pursuit
  concept. PROTO-1 (longitudinal) PASSED, PROTO-2 (lateral traffic) KILLED, and the world clarification
  (identical racers) made the whole ability-handicap premise moot (see LESSONS.md #183). Per the experiment
  regime the branch was DROPPED (not reverted); its two reports live on master
  (`reports/evolution/PURSUIT-PROTO-{1,2}.md`) and the full branch tip is preserved at the lightweight tag
  **`archive/handicap-pursuit-089c7d2`** (→ `089c7d2`). The sim code (`scripts/exp/pursuit-sim*.mjs`) is an
  experiment artifact and lives only at that archived SHA; the reusable overlap-free traffic core is
  documented in LESSONS #183 for the peloton line.

### Evolution Act 2 — finale front-compression (CLOSED 2026-07-26)
- **Act 2 finale builds recoverable @`8d5e9fd`/@`7404bd9`/@`197763d`, reverted** (three `git revert`
  commits, newest first). The flag-gated finale front-compression arc — a scheduled-dice overlay on the
  gap-cap re-roll (fixed gates `8d5e9fd`, DevScreen toggle `7404bd9`, adaptive spread-scaled gates
  `197763d`) — was verified byte-identical (ON `7c70b1eae7d31e22` / OFF `f8f7d9c2fd3283e9`) but its decisive
  adaptive SCREEN failed the "one track-agnostic law lifts BOTH topologies" bar (root cause structural
  physics; see `reports/evolution/FINALE-ADAPTIVE-SCREEN.md`). Owner closed Act 2; all three builds reverted
  for source hygiene, the five `reports/evolution/FINALE-*.md`+`AFF-*.md` kept as the lab journal.
  Scaffolding tags: `pre/finale-compression`, `pre/finale-devscreen`, `pre/finale-adaptive`,
  `pre/finale-remove`. The living code reads as if Act 2 was never built; the builds are recoverable at the
  three SHAs above. Permanent close anchor on origin: **`backup/finale-closed-26b2c34`** (→ `26b2c34`).

### Evolution Act 1 — assignment-follows-field (CLOSED 2026-07-26)
- **AFF build recoverable @`cd520e0`, reverted** (`git revert cd520e0`). The flag-gated
  assignment-follows-field build (Act 1) was verified byte-identical (ON `7c70b1eae7d31e22` / OFF
  `f8f7d9c2fd3283e9`) but SCREENed NEGATIVE (pooled band-reach 71.1%→66.8%, below the 70% floor —
  verified force-removal diagnosis). Owner closed Act 1; the build was reverted for source hygiene, the
  three `reports/evolution/AFF-*.md` kept as the lab journal. Scaffolding tags: `pre/aff-build`
  (`86e0d6d`) and `pre/aff-remove` (`0fed3ee`). The living code reads as if AFF was never built; the full
  build is recoverable at `cd520e0`. Permanent close anchor on origin: **`backup/aff-closed-fc6afbf`** (→ `fc6afbf`).

### Runaway phase — CLOSED (2026-07-29)
**Status: CLOSED.** The runaway problem was SOLVED by the **gap-reroll cohesion mechanism** (shipped default
`gapRerollEnabled` ON, G=0.5 / strength=1.0, 2026-07-26): the N=200 × 10-track confirm cut runaway-winner
**23% → 8.3%** and generalized cleanly. The two flagged follow-ups were resolved WITHOUT new mechanisms: the
**Distance Leash** was built sim-only and REJECTED (it made runaway WORSE — a braked leader dumps into the
pack and promotes a fresh escapee; see the leash result reports), and the **Late Challenger** was never needed
once gap-reroll shipped. COMBO15's v2 duration-relative PULK watchdog (`chaosGap ≤ ship×1.5`, [FAIRNESS.md](FAIRNESS.md))
now stands as the permanent guard against a disproportionate early breakaway. Baseline + fix reports:
`reports/` runaway/parade baseline (`f40a7a6`) + the gap-reroll confirm; baseline state recoverable at
`2e14663`. Endpoint anchor: `backup/exp-runaway-baseline-complete` (`f40a7a6`) — retained as the phase's
permanent close anchor.

### Parity phase — COLLAPSED (2026-07-25)

The sim↔browser parity phase is complete; its 13 `pre/*`+`backup/*` step-tags are collapsed onto the single
anchor **`v-parity-complete`** and deleted (local + origin). **Phase summary:** the four step-order
divergences (**D-INIT / D-RUNOUT / D-NAME / D-ROWCOUNT**) were closed with the sim adopting the browser's
real `raceCore.stepRacePhysics`; the golden soak proved `realArm == simArm` **600/600 byte-identical**; the
owner's three-seed browser cross-check passed **word-for-word**; the owner picked **150 px/s** and the single
re-baseline landed (pooled band-reach **71.0%**, resolving BASELINE-INVALIDATED →
[reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md)); and the gap-reroll knobs were flipped to
the confirmed candidate **G=0.5 / strength=1.0** after the ten-track confirm gate
([reports/parity/GS-CONFIRM-GATE.md](../reports/parity/GS-CONFIRM-GATE.md)). End-state shipped-default
fingerprints: **ON `7c70b1eae7d31e22` / OFF `f8f7d9c2fd3283e9`**. Full narrative lives in the linked
`reports/parity/*.md` docs (DIVERGENCE-AUDIT, GOLDEN-SOAK, STEP-ORDER-ARC, REBASELINE, GS-CONFIRM-GATE), the
commit messages, and this file's git history (where the per-tag prose is preserved).

**Collapse record — every tag deleted here, name → SHA (the commits stay findable forever; this table is the
index).**

| Deleted tag | SHA |
|---|---|
| `pre/rng-isolation` | `285c6e5` |
| `pre/plan-grid-unification` | `fe8565e` |
| `pre/race-init-extraction` | `72b8605` |
| `pre/step-order-alignment` | `0bd146f` |
| `pre/speed-duration-model` | `34584f7` |
| `pre/speed-150-rebaseline` | `bde0bc0` |
| `pre/gs-flip` | `6d246d0` |
| `backup/rng-isolation-64e0f65` | `64e0f65` |
| `backup/plan-grid-unification-05a5d14` | `05a5d14` |
| `backup/parity-arc-48f92d9` | `48f92d9` |
| `backup/speed-150-rebaseline-4b707cb` | `4b707cb` |
| `backup/gs-confirm-evidence-1865990` | `1865990` |
| `backup/gs-flip-6f438ea` | `6f438ea` |

13 tags deleted (local + origin), collapsed onto **`v-parity-complete`** — the annotated parity phase
endpoint anchor on the phase-close commit (150 px/s, gap-reroll G=0.5/s=1.0, fingerprints
ON `7c70b1eae7d31e22` / OFF `f8f7d9c2fd3283e9`).

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
`archive/diag-look-before-brake` @ `c32cc61`, deleted 2026-07-20).

**2026-07-29 — the four action/fair-arrival experiment branches were deleted after the COMBO15 ship**, each
preserved first as a permanent `archive/*` tag (owner-approved branch hygiene, per the handicap-pursuit
precedent). `exp/fair-arrival` was MERGED to master (its work ships as COMBO15); the other three are DEAD
lines whose reports were copied to master in DOCS-1 STAGE 1:
- `exp/fair-arrival` → `archive/fair-arrival-merged` (`215afde`) — merged via `175a475`.
- `exp/chain-choreo` → `archive/chain-choreo-final` (`15c1d58`).
- `exp/free-band` → `archive/free-band-final` (`aa21576`).
- `exp/choreo-release` → `archive/choreo-release-final` (`109abd6`).

No non-master branches remain.

## Complete tag set (after the parity phase close, 2026-07-25)

This was the FULL tag set **at the 2026-07-25 parity-phase close — 25 tags**. It is a dated snapshot;
the current origin set is **41 tags** (the 16 additions since are listed in the addendum below). The 13
parity `pre/*`+`backup/*` step-tags were collapsed onto **`v-parity-complete`** and deleted (see the *Parity
phase — COLLAPSED* record above); everything else is a permanent keeper:

- `archive/carousel-sweep-final`
- `archive/diag-look-before-brake`
- `archive/greenfield-proto-final`
- `b4-complete`
- `backup/browser-seed-complete`
- `backup/exp-runaway-baseline-complete` *(runaway phase CLOSED 2026-07-29 — permanent close anchor; the gap-reroll shipped the fix)*
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
- `v-parity-complete` *(new — sim↔browser parity phase endpoint; 150 px/s, gap-reroll G=0.5/s=1.0, fingerprints ON `7c70b1eae7d31e22` / OFF `f8f7d9c2fd3283e9`)*
- `v-perf-complete`
- `v-phaseD-complete`
- `v-retune-cleanup-complete`
- `v-rowenv-default-on-complete`
- `v-rowenv-easing-complete`
- `v-security-hardening-complete`
- `v1-race-action-merged`

### Additions since 2026-07-25 (current origin total: 45 tags)

Reconciled against `git ls-remote --tags origin` on 2026-07-31 (DOC-SYNC-2); the 2026-07-29 (DOC-SYNC-1) count
was 41. The 4 tags added since DOC-SYNC-1:
- **Engine changes since COMBO15 (2026-07-31):** `pre/flapping` (`d0870326`) and `pre/motion` (`e99b034d`) —
  registered above in the *Engine changes since COMBO15* subsection.
- **HYGIENE-1-era return points (registered SHIP-GUARD-1, 2026-07-31):** `pre/hygiene` (`a4103bb4`,
  2026-07-29) — sits at the DOC-SYNC-1 report commit (`docs(evolution): DOC-SYNC-1 report — living docs synced
  to COMBO15`); a docs-only return point, restores the COMBO15 world unchanged (no fingerprint move).
  `pre/router-7` (`83f5c8d9`, 2026-07-29) — sits at the HYGIENE-1 STEP 4 commit (`chore(hygiene): local audit
  tool + --purge-tmp + scratch off the OneDrive tree`); a tooling/hygiene return point from the HYGIENE-1 arc
  (react-router 6→7, audit tooling), restores the COMBO15 world unchanged (no fingerprint move).

The 16 tags added after the parity-phase snapshot above (to DOC-SYNC-1):

- **COMBO15 ship + fair-arrival line (2026-07-29):** `v-ship-combo15` (`175a475`), `pre/ship-combo15`
  (`215afde`), `pre/clean-sweep` (`dad4077`), and the four experiment archives
  `archive/{chain-choreo-final,free-band-final,choreo-release-final,fair-arrival-merged}` — see the
  *COMBO15 ship + the action/fair-arrival line* subsection under Permanent anchors.
- **Evolution Act 1/Act 2 close anchors + scaffolding (2026-07-26):** `backup/aff-closed-fc6afbf`,
  `backup/finale-closed-26b2c34`, and the scaffolding tags `pre/aff-build`, `pre/aff-remove`,
  `pre/finale-compression`, `pre/finale-devscreen`, `pre/finale-adaptive`, `pre/finale-remove` — see the
  *Evolution Act 1/Act 2 CLOSED* sections above.
- **Greenfield experiment archive:** `archive/handicap-pursuit-089c7d2` — see the *Evolution — greenfield
  experiments* section.

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

