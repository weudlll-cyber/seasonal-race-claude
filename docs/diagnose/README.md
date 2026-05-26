# docs/diagnose/ — Diagnostic Sprint Index

All diagnostic sprints in chronological order. Each entry names the problem,
the result, and which files contain the measurement data.

---

## 2026-05-14 — Free-Lane Separation (PR #98, Sprint 1)

**Problem:** Racers overlapped visually at high densities. Home force pulled
overlapping racers back toward centerline instead of letting them separate.

**Method:** Simulation trace over 1800 frames, 20 racers, dirt-oval.
Free-lane firing rate and direction distribution measured.

**Result:** Free-lane separation fires correctly. Persistent overlap clusters
identified as home-force-dominated system — led to Sprint 2.

**Files:**
- [free-lane-separation-report.md](free-lane-separation-report.md) — Implementation report PR #98 (free-lane logic)
- [free-lane-firing-summary.md](free-lane-firing-summary.md) — Sprint 1 measurement: firing rate, framing
- [free-lane-firing-trace.ndjson](free-lane-firing-trace.ndjson) — Raw data (1800 frames)

---

## 2026-05-14 — Free-Lane Force Attribution (PR #98, Sprint 2)

**Problem:** Despite free-lane logic, racer clusters remained persistent. Cause
unclear — either free-lane is not firing, home-force overwhelms, or both.

**Method:** Granular per-force attribution per racer per frame. Each force
component (homeForce, avoidance, freeLane) measured and summed separately.

**Result:** Home-force dominance confirmed — in overlap situations home-force pulled
racers back before free-lane could separate them. Fix: `homeForceReductionOnOverlap = 0.3`
reduces home-force to 30% during geometric overlap.

**Files:**
- [free-lane-force-attribution-summary.md](free-lane-force-attribution-summary.md) — Analysis report with force breakdown
- [free-lane-force-attribution-trace.ndjson](free-lane-force-attribution-trace.ndjson) — Raw data (1800 frames, per-force)
- [scripts/diag-free-lane-force-attribution.mjs](../../scripts/diag-free-lane-force-attribution.mjs) — Simulation script
- [scripts/diag-free-lane-force-attribution-summary.mjs](../../scripts/diag-free-lane-force-attribution-summary.mjs) — Aggregation script

---

## 2026-05-14 — Home-Force Reduction On Overlap (PR #98, Sprint 3)

**Problem:** After Sprint 2: implement the `homeForceReductionOnOverlap` fix and
verify that overlap clusters dissolve.

**Method:** Implementation report with code delta, validation tests, visual
verification by user.

**Result:** `homeForceReductionOnOverlap: 0.3` set as default. User visually
confirmed: clusters dissolve, separation works.

**Files:**
- [home-force-reduction-report.md](home-force-reduction-report.md) — Implementation report

---

## 2026-05-14 — Relaxed Defaults (PR #97)

**Problem:** Standard defaults from an earlier sprint phase were too conservative —
racers too slow, re-roll variation too low, drafting too strong.

**Method:** Default value analysis against observed race feel. No new
mechanics, only value adjustments.

**Result:** 5 default values adjusted (Speed min/max, reRollVariationPercent,
draftingBoost, draftingMaxDistance). Separated into PR #97 (not PR #98).

**Files:**
- [relaxed-defaults-report.md](relaxed-defaults-report.md) — Change report

---

## 2026-05-14 — Cleanup Audit PR #98

**Problem:** Systematic pre-merge review for code smells, UI consistency,
test quality, security, documentation status.

**Result:**
- 1 bug found: `homeForceReductionOnOverlap` in wrong DevScreen block (fixed)
- 1 language convention violation: German tooltip (fixed)
- 0 ghost tests, 0 ghost UI bindings, 0 security issues
- All 18 config fields 100% HOT (UI ↔ backend fully wired)

**Files:**
- [cleanup-audit-pr98.md](cleanup-audit-pr98.md) — Full audit report

---

## Older sprints

Older diagnostic measurements from Phase 4 (camera system, render smoothness):

- [docs/diag/render-smoothness-measurements.md](../diag/render-smoothness-measurements.md) — Phase 4: Render smoothness measurement (EditorShape staircase fix, Etappe 23)
