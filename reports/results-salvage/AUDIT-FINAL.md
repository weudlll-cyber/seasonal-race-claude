# TEST AUDIT — Hybrid Path — FINAL (all phases)

**Compiled (UTC):** 2026-07-14T09:27Z
**Branch:** feat/race-action  **Tip:** 68f71b5
**Fingerprint (default behaviour):** `fa4e3796e1e5f1a5` — verified UNCHANGED across the whole audit
(no behaviour drift). **Zero tracked-source edits, zero commits.** Only read-only audit tooling +
gitignored `results/` outputs were added.

---

## Tally — 3808 tests, 196 files

| Phase | Scope | Result |
|---|---|---|
| **1 — Variant-B mechanical** | all 196 files / 3808 tests | 190 clean, **6 files** with issues (all low-severity): 15 `ONLY_TODEFINED`, 2 `DEPRECATED_KEY_ALIAS`. **0** skip/empty/dup/removed-import. |
| **2 — Race-dynamics semantic** | 22 files / 551 tests | **0** mechanical rot, 20 LIVE files. Owner queue = **4 tests** (decided). |
| **3.1 — Camera semantic** | 10 files / 526 tests | **10 LIVE / 0 NEEDS_OWNER_INPUT** (honest: unit tests guard invariants, not eye-judged taste). |
| **3.2 — E2E semantic** | 22 files / 255 tests | **7 LIVE / 14 DEAD_IN_SPIRIT / 1 UNCERTAIN**. |

Per-file verdicts: `results/audit-verdicts.csv` (54 rows). Raw mechanical scan: `results/audit-variant-b-mechanical.csv`.

---

## Phase 1 — Variant-B mechanical (recap)

Suite is mechanically very clean. Highlights:
- **0 IMPORT_REMOVED** across all 196 files — no test imports a deleted mechanism.
- **15 `ONLY_TODEFINED`** (sole assertion is `expect(x).toBeDefined()`), spot-checked 0 false positives:
  - ~8 **tautologies** in `SurfaceClassManager.test.jsx` — `getBy*(...).toBeDefined()` (redundant; `getBy*`
    already throws on absence). → *fix* (strengthen or drop the wrapper).
  - ~7 **weak-but-functional** — `find(...)/await ....toBeDefined()` (does catch a real failure, weakly).
    In `analyzeFrameLog`, `UserManagementSection`, `spriteLoader`, `trackEditorDraw`. → keep or strengthen.
- **2 `DEPRECATED_KEY_ALIAS`** (`directorV4*` in `raceDynamicsConfig.test.js`) — see Phase 2 / cleanup.

*(Spec-premise correction: the spec listed `directorV4Intensity`/`directorV4OutcomeStart` as "removed";
they are live deprecated migration aliases, reported as `DEPRECATED_KEY_ALIAS`, not `IMPORT_REMOVED`.)*

## Phase 2 — Race-dynamics (recap; owner already decided)

0 mechanical rot. Precise owner queue was **4 tests**:
- `racePlanner.test.js` ×1 — `choreoSuppressChaosBonusB1` spoiler. **Owner decision: KEEP in code.**
- `raceDynamicsConfig.test.js` ×3 — `directorV4*` migration-shim tests. **Owner decision: DELETE the shim.**
  → executed by the prepared cleanup spec (Phase 3.4), separately, on owner approval.

Two spec premises were inverted by the source and corrected (verified in `defaults.js`):
`choreoOutcomeStart: 0.5` is the **shipped default** (PULK window open in ship), and `applyPulkLeadRotation`
is **shipped ON / unconditional** — so tests using them are LIVE, not dormant. (Details in `AUDIT-SUMMARY.md`.)

## Phase 3.1 — Camera (526 tests, all LIVE)

Camera files were extracted for describe-structure + taste-parameter ("feel") tokens, and the feel-token
assertions were read directly. They assert **invariants and config-derived computations** —
`expect(cd._camT).toBeLessThan(1.11) // didn't overshoot`, zoom-ordering, world-edge clamp, "moved toward
lookbackT" — **not** bare taste magic-numbers. The taste choices live in `defaults.js` VALUES, which no
unit test adjudicates.

→ **All 10 files LIVE. 0 genuine feel-flags to escalate** (satisfies "no false NEEDS_OWNER_INPUT"). The
`feelFlags` in `results/audit-camera-queue.json` are **advisory only**: the knobs each file exercises, so
IF the owner retunes a feel by eye, those files' invariants are the re-read targets. Files touching feel
machinery: `CameraDirector` (lerpFactor, battle_zoom, holdMs, overshoot, easing, leadIn, comeback),
`cameraTimingComputation`, `cameraConfig`, `panTarget`, `CameraStateHUD`.

## Phase 3.2 — E2E (255 tests) — the real dead-in-spirit surface

**Decisive context:** e2e specs are **excluded from the routine gate** (`vitest.config.js:23`
`exclude: ['e2e/**']`); they run only via manual `playwright test` against a live server. **Proof they are
not re-run:** `d11-smoke.spec.js:72` asserts the drafting Boost Factor field shows `'1.1'`, but the shipped
default is `draftingBoost: 1.04` (`defaults.js:381`) — a stale assertion sitting undetected. **Every feature
these specs touch still exists** (surfaceClass 40 src files, trackLights 7, rowLayout 12, image-upload, lap
selector…). So DEAD_IN_SPIRIT = "milestone acceptance gate whose job is done + not re-run", **NOT** "feature
removed". These are **retirement candidates for owner eye-test confirmation, not auto-delete.**

**Rubric:** LIVE = foundational subject OR recently revisited (last-modified ≥ 2026-06) OR core
actively-developed integration concern. DEAD_IN_SPIRIT = delivery-acceptance spec, feature stable +
unit-covered, not revisited (≤ 2026-05, low commits). UNCERTAIN = needs owner (perf baseline authority).

### DEAD_IN_SPIRIT — 14 specs, 152 tests (retirement candidates)
`b-wave-smoke` (12), `camera-polish-smoke` (8), `d10-smoke` (18), `d10-ux-verification` (17),
`d11-smoke` (9, **stale 1.1**), `d3-5-5-ux-verification` (21), `d7c-smoke` (6),
`quick-test-autofill-smoke` (6), `vre-2-smoke` (15), `vre-3-smoke` (10), `vre-3-ux-verification` (12),
`vre-4-smoke` (4), `vre-4-ux-verification` (4), `vre-followup-track-lights` (10).

### LIVE — 7 specs, 102 tests (keep)
`b1617-smoke` (pathLengthPx-on-save, foundational), `camera-polish-ux-verification` (adaptive-zoom math),
`d11-ux-verification` (localStorage↔engine round-trip), `d355-smoke` (override→localStorage, revisited),
`d9-smoke` (lap selector, lapUtils active), `fix-list-tracks-world-dimensions` (world-dim migration),
`vre-2-ux-verification` (surface-class UX, revisited).

### UNCERTAIN — 1 spec
`perf-reality-check` (1) — is it still the authoritative DEV-vs-PROD perf baseline? Owner call.

### Side-findings (Phase 3.2)
- **English-rule violations** (CLAUDE.md): German describe/test prose in `d10-ux-verification.spec.js`
  ("Bild-Upload-Flow", "greift bei zu großem Bild", …) and `vre-4-ux-verification.spec.js` ("Heimat-Trail").
- **Stale assertion:** `d11-smoke.spec.js:72` `draftingBoost` field `'1.1'` vs source `1.04`.

---

## Next steps (owner decision points)

1. **Approve the migration-shim cleanup commit** (prepared, not executed — see
   `results/CLEANUP-SPEC-migration-shim.md`). Retires `directorV4*` per your decision; expected to leave the
   fingerprint unchanged and drop `DEPRECATED_KEY_ALIAS` 2→0.
2. **Eye-test the 14 DEAD_IN_SPIRIT e2e specs** — confirm which deliveries are truly "done" and can be
   retired (or ported to unit tests where the subject is foundational: `b1617` pathLengthPx,
   `fix-list-tracks-world-dimensions`).
3. **`perf-reality-check`** — confirm keep vs supersede.
4. **Optional low-severity cleanups:** strengthen the ~8 `getBy*().toBeDefined()` tautologies; fix the two
   English-rule violations + the stale `d11-smoke` 1.1 assertion.
5. Proceed with the core race-action work.

## Deliverables

| File | Contents |
|---|---|
| `results/AUDIT-FINAL.md` | this document |
| `results/AUDIT-SUMMARY.md` | Phase 1+2 night-1 summary (with premise corrections) |
| `results/audit-verdicts.csv` | consolidated per-file verdicts (race-dynamics + camera + e2e), 54 rows |
| `results/audit-variant-b-mechanical.csv` | raw mechanical scan, all 196 files |
| `results/audit-race-dynamics-queue.json` | race-dynamics per-test owner queue |
| `results/audit-camera-queue.json` | camera verdicts + advisory feel-flags |
| `results/audit-e2e-queue.json` | e2e verdicts + side-findings |
| `results/CLEANUP-SPEC-migration-shim.md` | prepared cleanup spec (NOT executed) |
| `scripts/audit-*.mjs` | the 4 re-runnable read-only scanners |

**Note on the CSV:** the spec said "append camera+e2e rows to the mechanical CSV". To avoid corrupting the
mechanical CSV's schema (`File,IssueCount,Issues`), verdicts are in a dedicated `audit-verdicts.csv`
instead. Documented here so the owner can override.

**Note on HANDOFF.md:** none exists in the repo and there is a standing rule it is not maintained, so this
`AUDIT-FINAL.md` is the handoff. (Override if a HANDOFF.md is actually wanted.)
