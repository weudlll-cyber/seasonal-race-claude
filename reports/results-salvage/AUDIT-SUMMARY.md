# TEST AUDIT — Hybrid Path — Night Session Summary

**Session (UTC):** 2026-07-13T23:43Z  (local night 2026-07-14/15)
**Branch:** feat/race-action
**Tip commit:** 68f71b5 — "CLEANUP S6b-2: full doc-truth audit"
**Fingerprint (default behaviour):** `fa4e3796e1e5f1a5`
 — baseline (before audit) **==** post-scan (after audit) → **UNCHANGED**. No source behaviour was touched.
**Code changes:** none to tracked source (`git diff --stat` empty). Only NEW read-only audit tooling was
added: `scripts/audit-variant-b.mjs`, `scripts/audit-race-dynamics.mjs`, and outputs under `results/`
(gitignored). **No commits made.**

---

## Phase 1 — Variant-B Mechanical Scan (ALL 196 test files)

Scanner: `scripts/audit-variant-b.mjs` (read-only; masks comments+strings, brace-matches test bodies).
Output: `results/audit-variant-b-mechanical.csv`.

| Metric | Value |
|---|---|
| Files scanned | **196** (client + server + scripts + e2e) |
| `it/test` blocks | **3808** |
| Files with issues | **6** |
| Files clean | **190** |

**Breakdown by issue type:**

| Type | Count | Meaning |
|---|---|---|
| ONLY_TODEFINED | 15 | sole assertion is `expect(x).toBeDefined()` |
| DEPRECATED_KEY_ALIAS | 2 | uses a `directorV4*` migration alias (still live via shim) |
| SKIP_BLOCK | 0 | — |
| ONLY_BLOCK (`.only`) | 0 | — |
| EMPTY_BODY | 0 | — |
| IMPORT_REMOVED | **0** | no test imports a deleted mechanism |
| DUPLICATE_TEST_NAME | 0 | — |

**Read: the suite is mechanically very clean.** Zero skipped/empty/duplicate tests, and — notably —
**zero imports of removed mechanisms** across all 196 files (the 8 dead identifiers from the spec were
scanned; none appear in code, only occasionally in comments).

### The 15 `ONLY_TODEFINED` — spot-checked, 0 false positives

Verified against 4 files (UserManagementSection, trackEditorDraw, SurfaceClassManager, + counts). The
scanner is accurate. Two sub-severities:

- **Tautology (~8, all in `SurfaceClassManager.test.jsx`)** — `expect(screen.getByX(...)).toBeDefined()`.
  RTL `getBy*` **throws** when the element is absent, so `.toBeDefined()` is redundant with the query;
  it can never fail independently. → **fix** (assert something meaningful, e.g. `.toBeInTheDocument()`
  or a text/value check) or drop the redundant wrapper. Low risk, low value as-is.
- **Weak-but-functional (~7)** — `expect(arr.find(...)).toBeDefined()` / `await ...`.toBeDefined()`.
  Here `.find()` returns `undefined` when absent, so the assertion **does** catch a real failure, just
  weakly. Files: `analyzeFrameLog.test.js` (2), `UserManagementSection.test.jsx` (3),
  `spriteLoader.test.js` (1), `trackEditorDraw.test.js` (1). → **keep or strengthen** (owner's call).

### The 2 `DEPRECATED_KEY_ALIAS` — a spec-premise correction

The task spec listed `directorV4Intensity` and `directorV4OutcomeStart` as "removed from source". **They
are not removed.** They survive as deprecated **key aliases** in `RENAMED_KEY_MIGRATION`
(`raceDynamicsConfig.js:22`) and still migrate to `choreo*`. They appear (correctly) only in
`raceDynamicsConfig.test.js`, which tests the migration shim. Reported as `DEPRECATED_KEY_ALIAS`, NOT
`IMPORT_REMOVED`. See Phase 2 for the owner question about the shim's lifespan.

---

## Phase 2 — Focused Semantic Classification: race-dynamics engine

Classifier: `scripts/audit-race-dynamics.mjs` (read-only). Output: `results/audit-race-dynamics-queue.json`.

**Scope decision (documented):** the spec's precise import-filter (raceGovernor/racePlanner/
heroCurveGenerator/heroChoreography) matched only 5 files, while its keyword net (…/`racer`) would have
swept in the 38 racer-types sprite files (a different area). I scoped to the **race-dynamics engine** —
per-frame motion + its config + the sim harness that mirrors it — giving **22 files / 551 tests**, which
matches the spec's "~20 files / ~555 tests" target. File list is in the JSON.

**Spot-check (Phase 2.4):** `raceGovernor.test.js` = 29 (manual 29 ✓), `racePlanner.test.js` = 72
(manual 72 ✓). Exact match.

| Verdict | Files | Tests |
|---|---|---|
| MECHANICAL_ROT | **0** | 0 |
| NEEDS_OWNER_INPUT (file-level) | 2 | 98 |
| LIVE | 20 | 453 |

**But the file-level NEEDS_OWNER_INPUT count (98) is misleading** — only **4 individual tests** actually
exercise a dormant knob. Per-test attribution (non-default exercises only):

### Owner-review queue — exactly 4 tests

1. **`racePlanner.test.js`** — 1/72 tests
   - Test: *"spoiler switch suppresses the B1-target pool bonus during chaos (default off keeps it)"*
   - Knob: `choreoSuppressChaosBonusB1` — shipped default **FALSE** (`defaults.js:312`). Dormant spoiler lever.
   - **Owner question:** keep `choreoSuppressChaosBonusB1` as a spoiler switch, or retire it (and this test)?

2. **`raceDynamicsConfig.test.js`** — 3/26 tests (the `directorV4* → choreo* carry-over migration` block)
   - Tests: *"carries a customized old key VALUE over…"*, *"an explicit new key wins over an old key…"*,
     *"a migrated value is still validated under the new key/range (no bypass)"*
   - These exercise the `RENAMED_KEY_MIGRATION` shim. The shim is **live and correct**; the alias is deprecated.
   - **Owner question:** how long must the `directorV4*` migration be carried? (When dropped, these 3 tests
     + the migration entries retire together.)

Everything else in race-dynamics (447 tests across 20 files, plus the other 71/23 in the two flagged
files) is **LIVE** — exercises active, shipped mechanisms.

### IMPORTANT — two spec premises were inverted by the source (verified, not assumed)

The spec's mental model of "dormant" was **backwards** vs the shipped defaults at this tip. Verified in
`client/src/modules/storage/defaults.js`:

- **`choreoOutcomeStart: 0.5` is the SHIPPED DEFAULT** (`defaults.js:328`). The PULK window `[0.25, 0.5)`
  is **OPEN in the shipped game**. Tests passing `choreoOutcomeStart: 0.5` exercise the **live** default —
  they are NOT testing a "re-opened normally-collapsed window" as the spec assumed. It is the *empty-config*
  collapse (a function-internal default the app never ships) that is the non-shipped path. → those tests
  are **LIVE**, not dormant.
- **`applyPulkLeadRotation` is SHIPPED ON / UNCONDITIONAL** (`defaults.js:283, 331`). The old
  `pulkLeadRotationEnabled` gate was removed when it went unconditional (hence it's in the dead-identifier
  list). `raceGovernor.test.js` therefore tests a **live** mechanism. → **LIVE**.
- (A stale project-memory note said PulkLeadRotation was "flag-gated default-off" — that was true at an
  earlier commit and is now outdated; the source at 68f71b5 overrides it.)

**Net:** the genuinely dormant-feature surface in race-dynamics is tiny — 4 tests, both items low-severity
config-lifecycle questions, not dead code.

---

## Phase 3 prep — camera + e2e scope (NOT executed, per plan)

Framework identified for the next session (after owner reviews the queue above). **No execution.**

- **Camera — 10 files / 526 tests.** Dominated by `modules/camera/CameraDirector.test.js` (**345** in one
  file). Relevance of camera *feels/behaviours* needs owner eye-test intent → high owner-input share.
- **E2E — 22 files / 255 tests.** Named by feature-milestone: `d9`, `d10`, `d11`, `d355`, `d7c`, `b1617`,
  `b-wave`, `vre-2/3/4`, `camera-polish`, plus `perf-reality-check`, `quick-test-autofill`,
  `fix-list-tracks-world-dimensions`. **Highest semantic-relevance risk in the codebase** — each smoke/
  ux-verification spec is tied to a specific past delivery; several may guard shipped-and-moved-on
  features. This is where Variant-A's unique value (vs the mechanical scan) concentrates.

---

## Deliverables

| File | Contents |
|---|---|
| `results/audit-variant-b-mechanical.csv` | per-file mechanical scan (all 196 files) |
| `results/audit-race-dynamics-queue.json` | per-file race-dynamics classification + per-test owner queue |
| `results/AUDIT-SUMMARY.md` | this document |
| `scripts/audit-variant-b.mjs` | the mechanical scanner (re-runnable, read-only) |
| `scripts/audit-race-dynamics.mjs` | the race-dynamics classifier (re-runnable, read-only) |

## Note on HANDOFF.md (spec Phase 3.2)

The spec asked to update `HANDOFF.md`. **No `HANDOFF.md` exists anywhere in the repo**, and there is a
standing project rule that HANDOFF.md is not maintained as a deliverable. I therefore did **not** create
one; this `AUDIT-SUMMARY.md` is the single handoff document. (Flagging so the owner can override if a
HANDOFF.md is in fact wanted.)

## Morning decisions for the owner

1. **4-test dormant queue:** retire `choreoSuppressChaosBonusB1` (+1 test)? Set a drop-date for the
   `directorV4*` migration shim (+3 tests)?
2. **15 `ONLY_TODEFINED`:** approve strengthening the ~8 `getBy*().toBeDefined()` tautologies; decide
   whether the ~7 `find().toBeDefined()` weak assertions are acceptable as-is.
3. **Proceed to Phase 3** (camera + e2e semantic read) — this is where the real dead-in-spirit hunting is.
