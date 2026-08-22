NOT ANSWERED
- 1a, 1b, 1c, 1d, 1e: the full dead-material sweep is still incomplete as a rigorously exhaustive workspace enumeration.
- 2a, 2b, 2c: redundancy is only partially enumerated across the full tree.

## 1 · Dead Material

1a. NOT ANSWERED. I did not complete a semantic caller sweep for exported symbols in `server/src`; dynamic imports and entrypoint execution make a static import graph incomplete.

1b. NOT ANSWERED. A workspace-wide static-import scan over 701 JS files surfaced 70 candidate unused exports in `client/src/modules/`, but I did not promote them because reexports, runtime attachment, and dynamic loading can hide real callers.

1c. NOT ANSWERED. I did not run a scope-aware liveness pass for module-level constants and class fields, so I cannot honestly name the written-but-never-read set.

1d. NOT ANSWERED. A direct-pattern scan over 168 default-path keys and 91 direct reader keys found 79 candidate unused default paths, but destructured reads, computed keys, and dynamic access into camera config make the result incomplete.

1e. NOT ANSWERED. A static-import scan over `client/src` and `server/src` surfaced 87 candidate production files with no static importers, but dynamic imports and route-level loading make that graph incomplete.

## 2 · Redundancy

2a. 2 proven pairs.
- [client/src/modules/storage/defaults.js](../../client/src/modules/storage/defaults.js#L278) and [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs#L99): the 0.95 endgame threshold/deadline agrees.
- [scripts/viewer-invariants.mjs](../../scripts/viewer-invariants.mjs#L97) and [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs#L109): the 11-key HIS camera arm agrees.

2b. 1 re-derived condition, 2 sites.
- The leader-progress gate appears inline in [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs#L205) and [client/src/modules/viewerProbe.js](../../client/src/modules/viewerProbe.js#L269); the two copies agree, but the condition is still spelled twice.

2c. NO, not as one artifact. [scripts/viewer-invariants.mjs](../../scripts/viewer-invariants.mjs), [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs), and [client/src/modules/viewerProbe.js](../../client/src/modules/viewerProbe.js) overlap in the 95% endgame window and the shared HIS arm, but they are still three different jobs: the browser sweep, the endgame spec harness, and the delivered-frame invariant recorder.

## 3 · Readability

- [client/src/modules/viewerProbe.js](../../client/src/modules/viewerProbe.js#L188), 429 lines. It records a delivered frame, checks the viewer invariants, and keeps the event and dump state in sync. No direct comment/code disagreement found. A newcomer is most likely to break [client/src/modules/viewerProbe.js](../../client/src/modules/viewerProbe.js#L269) by changing the crossing logic without noticing the downstream bookkeeping. Maintainability: 2/5. One-point improvement: split the invariant checks from the event-state bookkeeping.
- [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs#L175), 389 lines. It runs the endgame race harness and reduces the captured frame series into timing, width, smoothness, clipping, and crossing metrics. No direct comment/code disagreement found. A newcomer is most likely to break [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs#L205) by changing the gate condition without seeing the metric interaction. Maintainability: 3/5. One-point improvement: separate frame collection from metric derivation.
- [client/src/modules/camera/framingRule.js](../../client/src/modules/camera/framingRule.js#L200), 49 lines. It turns heading and frame geometry into the corridor-visibility zoom ceiling, with a conservative fallback when heading is missing. No direct comment/code disagreement found. A newcomer is most likely to break [client/src/modules/camera/framingRule.js](../../client/src/modules/camera/framingRule.js#L200) by changing the fallback without realizing it changes the guarantee. Maintainability: 4/5. One-point improvement: hoist the fallback into a named helper.
- [server/src/auth/usersStore.js](../../server/src/auth/usersStore.js#L55), 218 lines. It builds the bcrypt-backed user store with validation, locking, persistence, and session-epoch invalidation behavior. No direct comment/code disagreement found. A newcomer is most likely to break [server/src/auth/usersStore.js](../../server/src/auth/usersStore.js#L55) by changing validation or write ordering without noticing the auth consequences. Maintainability: 2/5. One-point improvement: split validation, persistence, and lock handling into smaller helpers.
- [scripts/viewer-invariants.mjs](../../scripts/viewer-invariants.mjs#L223), 74 lines. It boots a browser page, installs the virtual clock and race payload, and drives the viewer sweep until the crossing is recorded. No direct comment/code disagreement found. A newcomer is most likely to break [scripts/viewer-invariants.mjs](../../scripts/viewer-invariants.mjs#L223) by changing the bootstrap sequence without noticing the sweep timing. Maintainability: 3/5. One-point improvement: extract browser bootstrap from the race loop.

The three files I would least want to touch under time pressure are [client/src/modules/viewerProbe.js](../../client/src/modules/viewerProbe.js#L188), [scripts/diag/endgame-spec.mjs](../../scripts/diag/endgame-spec.mjs#L175), and [server/src/auth/usersStore.js](../../server/src/auth/usersStore.js#L55). Each combines multiple concerns, so a small edit can spill into invariants, metrics, or auth safety.