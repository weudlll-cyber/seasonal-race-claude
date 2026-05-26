# Handoff Notes

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
