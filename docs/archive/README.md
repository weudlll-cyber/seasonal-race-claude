# docs/archive/ — dated records, kept because the reasoning is worth reading

**What this directory owns:** documents that describe the project as it was on a particular date and
are no longer maintained. Every one of them is history. **Read nothing here as a description of how
RaceArena works today.**

**Why they are kept rather than deleted.** A diagnosis is worth reading even after its subject has
been rebuilt — it records what was measured, what was ruled out, and why the next step was the next
step. Deleting them would lose that and leave the git history as the only trace, which nobody
searches. Keeping them in `docs/` alongside living documents was the actual problem: a reader had no
way to tell which was which.

**How to tell how stale one is.** Most carry a `HISTORICAL` or `SUPERSEDED` banner naming their date.
For the rest, `git log --follow -- <file>` is the honest answer. As a group: none of these has had a
substantive content change since **2026-07-07**, and fourteen of the twenty have had none since
**2026-05-26**, when a bulk pass translated the German text in `docs/` to English without touching
what any of them said.

**Where the live answers are:** [../README.md](../README.md) is the map of the maintained set.

---

## The diagnostic sprints — 2026-05-14, free-lane separation (PR #97/#98)

Preserved from the index that used to live at `docs/diagnose/README.md`. Four sprints, in order, each
naming the problem, the method and the result.

**Sprint 1 — Free-Lane Separation.** Racers overlapped visually at high densities; the home force
pulled overlapping racers back toward the centreline instead of letting them separate. Measured by a
1800-frame trace, 20 racers, dirt-oval. Free-lane separation fired correctly; the persistent overlap
clusters turned out to be home-force-dominated, which led to sprint 2.
→ [free-lane-separation-report.md](free-lane-separation-report.md),
[free-lane-firing-summary.md](free-lane-firing-summary.md)

**Sprint 2 — Force Attribution.** Clusters persisted despite the free-lane logic, and it was not clear
whether free-lane was not firing, the home force was overwhelming it, or both. Per-force, per-racer,
per-frame attribution settled it: home-force dominance, pulling racers back before free-lane could
separate them.
→ [free-lane-force-attribution-summary.md](free-lane-force-attribution-summary.md)

**Sprint 3 — Home-Force Reduction On Overlap.** Implemented the fix and verified the clusters
dissolve; confirmed visually by the owner.
→ [home-force-reduction-report.md](home-force-reduction-report.md)

**PR #97 — Relaxed Defaults.** Five default values adjusted against observed race feel — no new
mechanics. Separated from PR #98 deliberately.
→ [relaxed-defaults-report.md](relaxed-defaults-report.md)

**Cleanup audit for PR #98.** Pre-merge review for code smells, UI consistency, test quality,
security and documentation status. One bug and one language-rule violation found and fixed; no ghost
tests, no ghost UI bindings, no security issues.
→ [cleanup-audit-pr98.md](cleanup-audit-pr98.md)

**Raw traces are not here.** The `.ndjson` traces those sprints produced were never committed, and
the two `scripts/diag-free-lane-*` scripts were removed from tracking on 2026-07-20 — recoverable at
`c441e7c~1`. The investigation is CLOSED; the home-force reduction it produced shipped.

**Every one of the forces these sprints studied has since been removed.** The legacy lateral stack —
home force, free-lane separation, the priority system — was deleted in the Commit A / Commit B
cleanup. See [../FORCE-MAP.md](../FORCE-MAP.md) for what replaced it. That is exactly why these
documents are archived rather than referenced.

## The camera diagnoses — 2026-05-14 … 05-16

Read-only analyses taken at commit `5088639`, before the corridor zoom unit existed. The camera has
been rewritten since; [../CAMERA_DIRECTOR.md](../CAMERA_DIRECTOR.md) is the live reference.

- [camera-inventory-2026-05-14.md](camera-inventory-2026-05-14.md) — full state/trigger inventory
- [camera-framing-bug-diagnosis.md](camera-framing-bug-diagnosis.md)
- [camera-pan-path-diagnosis.md](camera-pan-path-diagnosis.md) — Euclidean vs. track-path panning
- [camera-pr102-bug-diagnosis.md](camera-pr102-bug-diagnosis.md) — backward-then-forward bug
- [CAMERA_TUNING_DIAGNOSIS.md](CAMERA_TUNING_DIAGNOSIS.md) — 2026-05-06, against the pre-corridor zoom model
- [camera-target-architecture.md](camera-target-architecture.md) — **SUPERSEDED**, and its own banner says
  so: two of its findings have since been answered in ways that invert them

## Speed, phases and stage cleanups

- [SPEED_REFACTOR_ANALYSIS.md](SPEED_REFACTOR_ANALYSIS.md) — 2026-05-03, the speed pipeline before the
  refactor it proposes
- [PHASE_2N_ALGORITHM.md](PHASE_2N_ALGORITHM.md) and
  [PHASE_2N_TUNING_LOG.md](PHASE_2N_TUNING_LOG.md) — 2026-05-20, the Race Plan / area-bonus mechanic
  as first built
- [STAGE-CLEANUP.md](STAGE-CLEANUP.md) — 2026-07-07, the race-dynamics cleanup plan and its readings
- [FORCE-PARITY.md](FORCE-PARITY.md) — 2026-07-10, the browser-vs-sim force audit at commit `de66798`.
  Its force-by-force verdicts still hold; its absolute numbers predate the plan-grid unification.
- [render-smoothness-measurements.md](render-smoothness-measurements.md) — 2026-05-08, before the
  shared t-update and the corridor zoom unit
- [D3-5-1-diagnose.md](D3-5-1-diagnose.md) — 2026-04-26, the sprite racer-type class field matrix
- [audit-pre-merge.md](audit-pre-merge.md) — 2026-05-12, a pre-merge audit of the camera phase-1 branch

---

**Nothing was moved here that anything still points at as current.** The one document that looked
archivable and is not is `docs/internal/README.md`: the Dev Panel's System tab names
`docs/internal/current-config-snapshot.json` on screen, so that path is live and stayed put.
