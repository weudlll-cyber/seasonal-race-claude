# Report 46 — Overnight Sweep: Merge Gate & Merge Log

**Date:** 2026-06-08
**Branch merged:** `feat/open-track-overlap` → `master`
**Merge commit:** `bc53ae1`
**Status:** Gate PASSED. Branch merged. Tests green on master.

---

## Sweep parameters

```
node scripts/sim-fairness.mjs --openRacers=60 --closedRacers=40 --dur=60 --races=50 \
  --race-plan=true --bonusMult=2.0 --seed=0
```

Wall clock: 4704s (~78 min). Race Plan: ✅ aktiv. Seed=0 (non-deterministic).

---

## Overall result: 61/66 PASS (92.4%)

Expected false positives at α=0.05 with 66 combos: **3.3**. Getting 5 at seed=0 is within
normal non-deterministic variance; all 5 were confirmed noise by seeds 2 and 42.

| Metric | Value |
|---|---|
| Total combos | 66 |
| χ² PASS (p≥0.05) | 61 |
| χ² FAIL seed=0 (p<0.05) | 5 |
| Structural fails (both seed-2 AND seed-42 fail) | **0** |
| overlap=0.0% combos | **66/66** |

---

## Seed-0 failures and re-checks

All 5 seed-0 failures confirmed noise by both deterministic seeds:

| Combo | seed=0 p | seed=2 p | seed=42 p | Verdict |
|---|---|---|---|---|
| Dirt Oval × beetle | 0.047 ❌ | 0.120 ✅ | 0.422 ✅ | noise |
| River Run × duck | 0.021 ❌ | 0.426 ✅ | 0.968 ✅ | noise |
| Space Sprint × dragon | 0.047 ❌ | 0.646 ✅ | 0.351 ✅ | noise |
| Mountainstreet × boarder | 0.047 ❌ | 0.111 ✅ | 0.426 ✅ | noise |
| Searound × duck | 0.010 ❌ | 0.089 ✅ | 0.543 ✅ | noise |

---

## Gate evaluation (STEP 2)

| Condition | Result |
|---|---|
| (a) 2631/2631 tests green | ✅ |
| (b) overlap=0.0% on all 66 combos | ✅ |
| (c) Zero structural χ² fails | ✅ |
| (d) No new hard regressions vs report 41 | ✅ (rocket passes at seed=0 p=0.794, 0.269, 0.646) |

**All gate conditions PASS → merged.**

---

## Zone success rate

Overall 57.6% (vs 59.2% in report 41). Within normal run-to-run variance.

| Zone | Open | Closed | All |
|---|---|---|---|
| B1 (1–5) | 55.9% | 49.9% | 52.5% |
| B2 (6–15) | 49.7% | 51.4% | 50.7% |
| B3 (16–25) | 48.8% | 49.4% | 49.1% |
| B4 (26–40) | 56.8% | 65.6% | 61.9% |
| B5 (41+) | 71.3% | — | 71.3% |
| **OVERALL** | | | **57.6%** |

---

## Merge log (STEP 3)

### 3a — Doc commit

Committed on `feat/open-track-overlap` before merge:

- `client/src/modules/raceBehavior.js` — body-based speed-brake (reports 43+45)
- `client/src/modules/raceBehavior.test.js` — re-derived tests
- `client/src/modules/storage/defaults.js` — speedBrakeYThreshold/avoidanceDistance retired
- `docs/ARCHITECTURE.md` — updated Race Behavior pipeline, Physics Parameters
- `docs/BACKLOG.md` — added P-3–P-6 (lateral brake density, getWidthAtT, Luger Hill ID, spatial grid)
- `docs/LESSONS.md` — added L132–L136 (gate invariants, contact sum-of-halves, fairness mode, tests correct not green, lateral same-lane filter)
- `docs/handoff-notes.md` — updated state: merged, rocket fixed
- `reports/open-track-overlap/` — all session reports 10–45

Commit hash: `7d3b44b`

### 3b — Merge

```
git checkout master
git merge --no-ff feat/open-track-overlap
```

Merge commit: **`bc53ae1`**

Tests on master: **2631/2631 pass**

### 3c — Tag cleanup

**Deleted** (obsolete mid-rebuild checkpoints):
- `backup/pre-overtaking-rebuild` (28ab6ae)
- `backup/step1-complete-fair` (295f3e8)
- `backup/step1-perf-standings` (803d68f)
- `backup/pre-pairloop-opt` (ab06aed)
- `backup/pre-step2` (3e52a73)
- `backup/step2-stageB` (15a8c3b)
- `backup/step2-stageC` (4256af6)

**Kept**:
- `backup/pre-merge` — fallback point for this overnight run
- `backup/y-reject-fair` — perf milestone reference (y-rejection optimization)

---

## What was merged

The full `feat/open-track-overlap` branch including:

**Scale cleanup**: Three SOTs fixed (trackWidthPx=300, drawnBodyWidthPx=bodyNarrow, drawnBodyLengthPx from render), 9 field renames, 6 denominator fixes. `pxToPhysicalY`/`physicalYToPx` route all lateral conversions.

**Geometric avoidance gate (report 39)**: Two-axis body-contact check replaces mixed-unit normalized distance. `pairContact()` helper: `contactWidth = hwA+hwB`, `contactLength = hlA+hlB`. Gate = contact × (1+avoidanceBufferPct). Dev Screen: T Weight/Y Weight retired, Avoidance Buffer (20%) added.

**Speed-brake body fix — longitudinal (report 43)**: `bodyContactLength×1.5/pathLength` replaces `frameSizePx×1.5/pathLength`. Fixes Seatrack × rocket regression introduced by the correct width correction (395px→300px).

**Speed-brake body fix — lateral (report 45)**: `pxToPhysicalY(contactWidth, trackWidth)` replaces `speedBrakeYThreshold=0.18`. Lateral is a same-lane filter only — no lead-time multiplier. Rocket brake 96%→53%, blocked 94%→50%, Race Plan fully functional.

**Baseline established (report 41)**: 64/66 pass at N=50, Race Plan ON, seed=0. `overlap=0.0%` on all 66 combos. This sweep (report 46) updates the baseline: 61/66 pass (different seed=0 draws), all fails noise.

---

## Comparison to pre-branch baseline (report 41)

| Metric | Report 41 (pre-lateral fix) | Report 46 (post-merge, overnight) |
|---|---|---|
| χ² pass rate | 64/66 (97.0%) | 61/66 (92.4%) — 5 noise fails |
| Structural fails | 0 | 0 |
| overlap=0.0% | 66/66 | 66/66 |
| Seatrack × rocket seed=0 | 0.016 ❌ (structural) | passing (brake 96%→53%) |
| Rocket blocked% | 94% | 50% |
| Zone overall | 59.2% | 57.6% |

The difference in pass rate (97% vs 92%) is seed=0 non-determinism — 5 additional noise fails in a different random draw. Zero structural fails in either run.
