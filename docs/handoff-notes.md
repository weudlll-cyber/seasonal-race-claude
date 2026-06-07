# Handoff Notes

> **NOTE (2026-06-08):** Branch `feat/open-track-overlap` merged to master. See below for current state.

## 2026-06-08 — feat/open-track-overlap merged (geometric gate + speed-brake body fix)

**Branch:** `feat/open-track-overlap` → merged to `master` (overnight merge)

### What was built (reports 39–45)

**Scale cleanup (reports 31–33):** Three SOTs corrected — `trackWidthPx = track.width`, `drawnBodyWidthPx = bodyRef.bodyNarrow`, `drawnBodyLengthPx` from render primitives. Raw `physicalY × trackWidth` replaced by `pxToPhysicalY` / `physicalYToPx` helpers everywhere. 9 field renames. See `docs/ARCHITECTURE.md § Scale & Size`.

**Geometric avoidance gate (report 39):** Replaced the old mixed-unit anisotropic distance gate with a two-axis body-contact check. `pairContact()` helper: `contactWidth = hwA + hwB`, `contactLength = hlA + hlB`. Gate threshold = contact × (1 + avoidanceBufferPct). Speed brake moved before the gate. Free-lane overlap also uses body sizes. DevScreen: old T Weight / Y Weight replaced by "Avoidance Buffer (% of body size)".

**Speed-brake body fix (reports 43+45):** Both speed-brake axes now body-based. Longitudinal: `(bodyContactLength / pathLength) × speedBrakeTMultiplier`. Lateral: `pxToPhysicalY(contactWidth, trackWidth)` — same-lane filter only, no multiplier. `speedBrakeYThreshold` and `avoidanceDistance` retired from browser gate (kept in defaults.js for sim-script backward compat).

### Current fairness baseline

Full 66-combo sweep (N=50, Race Plan ON, `--bonusMult=2.0`): see `reports/open-track-overlap/41-baseline-sweep.md` (updated by overnight sweep). Rocket regression resolved: brake 96%→53%, all 3 seeds pass. `overlap=0.0%` on all 66 combos.

### Tests

87/87 raceBehavior + brakeMatch tests. Total project tests: see `npm test` output on master.

### Next priorities (unchanged from pre-merge)

1. Player Group Selection (hot — priority 1 after camera phase)
2. D7d — 100-racer performance (spatial grid)
3. TLH-3 — code fallback + status banner + export
4. Backlog P-1 — longitudinal body overlap during passing (still open physics issue)

## 2026-05-14 — PR #98 Cleanup Sprint (state after merge)

- Branch: `claude/free-lane-separation` → squash-merged to `master`
- Session: 13./14.5. Anti-collision session + Cleanup sprint 14.5.
- Tests (post-merge): 94 files / 1741 tests passed

### What was implemented (PR #98)

**Free-Lane Separation** (`client/src/modules/raceBehavior.js`):
- Additive impulse logic when two racers overlap geometrically
- Left/right space check via `isSideFree()` against all other active racers
- Deterministic tie-break via `stablePairBit` (stable hash) at exactly equal physicalY
- Uses sprite geometry metadata that RaceScreen passes to each racer

**Home-Force Reduction on Overlap** (`homeForceReductionOnOverlap: 0.3`):
- During geometric overlap: home-force reduced to 30%
- Prevents home-force from overwhelming free-lane separation
- Tunable in DevScreen → Race Tuning → Home Force block

**reRollVariationPercent** default: `45 → 58`

### What was fixed in the cleanup sprint

- `homeForceReductionOnOverlap` was placed in Block 2 (Start Layout) but its reset handler was in Block 9 (Home Force) → moved to Block 9
- InfoTooltip for the field was in German → changed to English
- Prettier formatting applied to raceBehavior.js and raceBehavior.test.js

### Anti-Collision Status (state after merge)

**What works:**
- Free-Lane Separation separates overlapping racers deterministically
- Home-force reduction gives separation room
- Avoidance (Trailer yields, Leader holds) prevents stacking
- Speed Brake reduces side-by-side speed
- Anti-stacking sqrt(neighborCount) normalization at dense pack

**Known limitations:**
- Persistent packs (3+ racers) can still form — this is not a bug but race feel; free-lane only kicks in at geometric overlap, not at proximity
- Drafting cone on tight corners can miss slipstream followers (PR-A2.6 diagnostic note, backlog item)
- `reRollVariationPercent: 58` produces significantly more position changes than the old 45 — may be less relevant with few racers

### DevScreen defaults after merge (all Race Tuning values)

| Value | Default |
|------|---------|
| homeForceStrength | 0.04 |
| homeForceReductionOnOverlap | 0.3 |
| comfortThreshold | 0.7 |
| softRepulsionStrength | 0.1 |
| avoidanceDistance | 0.35 |
| tWeight | 2.0 |
| yWeight | 1.0 |
| lateralForce | 0.01 |
| maxLateral | 0.95 |
| speedBrakeYThreshold | 0.2 |
| speedBrakeTThreshold | 0.015 |
| speedBrakeFactor | 0.95 |
| draftingMaxDistance | 80 |
| draftingConeAngle | 30 |
| draftingBoost | 1.04 |
| reRollVariationPercent | 58 |
| reRollTransitionDuration | 5.0 |
| reRollIntervalDivisor | 15 |
| reRollLastPositionPercent | 80 |
| BASE_SPEED_MIN | 0.00096 |
| BASE_SPEED_MAX | 0.00113 |

**localStorage note:** With existing overrides, new defaults only take effect after
"Reset All Defaults" in the DevScreen.

### Open items for next session

- PR #97 (Relaxed Defaults) still open — check if merging after PR #98 makes sense
- PR #96 (Phased Racing Logic) and PR #83 (Project Knowledge Inventory) still open
- Backlog: Drafting cone on curves (PR-A2.6 diagnostic note)
- Backlog: Persistent pack dissolution when free-lane is blocked

### Diagnostic artifacts

All in `docs/diagnose/` with index file `docs/diagnose/README.md`.

---

## 2026-06-06 — Step 2 Stage B + avoid-first diagnosis (current state)

**Branch:** `feat/open-track-overlap` (not merged — master clean at fc36ff6)

### Stage summary

| Stage | Commit | Status |
|-------|--------|--------|
| Stage A — accumulators built | `9834bd3` | ✓ budget-neutral, not consumed |
| Stage B — same-lane commit + deadlock fix | `1864180` | ✓ dragon overlap −22%, screening green, browser: no zigzag |

Stage B reduces honest dragon overlap ~22% on all open tracks. Fairness passes
(N=20 all tracks, N=50 3-combo screening). Browser confirms no visible zigzag.

### Remaining problem (user-observed)

Slightly-offset comeback racer brakes instead of steering around a free side.
**Root cause diagnosed in `reports/open-track-overlap/20-avoid-first-diag.md`:**

1. Stage B direction logic uses approach corridors (`_approachLeft/Right`). In a
   60-racer field, both sides appear occupied 91.5% of the time (dense-field
   false positives). Even when right side is visually free, Stage B calls it occupied.

2. Deadlock resolution uses forward tiebreak (`_forwardLeft/Right`), populated
   globally from all pairs. This can pick a direction OPPOSITE to the natural
   avoidance push. Stage B force and natural avoidance force then CANCEL each other
   — net lateral delta ≈ 0. Only the 0.945 floor-brake is visible → user perceives
   "brakes first, doesn't avoid."

3. Avoidance fires at dT ≈ 0.089; brake-to-match fires at dT ≈ 0.001 (72× closer).
   The ordering is correct — but force cancellation makes it irrelevant.

### Next implementation step

Replace `_approachLeft/Right` direction-selection block in
[raceBehavior.js:744–781](../client/src/modules/raceBehavior.js#L744):
- Primary: leader-relative direction (from `_sameLaneLeaderPhysY`)
- Override only when natural direction is forward-blocked AND opposite is clear
- Remove corridor occupancy check from Stage B entirely

Screen: 3 tracks × default racer. Gate: racer steers around (no pass-through) + zigzag <0.05.

---

## 2026-06-06 - Step 2 planning report (analysis-only)

- Branch: `feat/open-track-overlap`
- Scope: Design-only planning for Step 2 forward-looking lateral avoidance (no code changes)
- New report: `reports/open-track-overlap/10-step2-design.md`

What was delivered:
- Concrete mapping of report-05 avoid-first behavior to current runtime decision points
- Performance-first derive-don't-rescan plan tied to current pair-loop architecture
- Fairness risk map and mandatory N=50 sweep gates for each behavior-changing stage
- Wide-body (Flag 1) runtime feasibility check and minimal safe data-plumbing approach
- Staged implementation plan: small increments, frame-log check, fairness sweep, then next stage

Update (same date):
- Added completeness addendum in `reports/open-track-overlap/10-step2-design.md` resolving the open Y-rejection question.
- Conclusion: forward/adjacent side-corridor data can be wider than the current Y-rejection gate; accumulator population must run in a pre-Y branch inside the same pair loop to remain complete without rescans.

## Older entries

### 2026-05-14 - Relaxed Defaults (Speed + Drafting) — PR #97

- Branch: claude/relaxed-defaults
- Scope: Default values only, no new mechanics.

Changed defaults:
- BASE_SPEED_MIN: 0.00091 → 0.00096
- BASE_SPEED_MAX: 0.00118 → 0.00113
- reRollVariationPercent: 85 → 45
- draftingBoost: 1.10 → 1.04
- draftingMaxDistance: 110 → 80

Tests: 94 files / 1728 tests passed. Detailed report: docs/diagnose/relaxed-defaults-report.md
