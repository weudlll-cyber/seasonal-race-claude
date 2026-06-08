# RaceArena — Dead Code & Inconsistency Audit

**Date:** 2026-06-08  
**HEAD commit:** `332c9f05458bf16131b4514503ca8d55f05807c1`  
**Backup tag confirmed:** `backup/pre-audit` (set by parent agent before audit began)

---

## Findings Table

| ID | Pass | File:Line | What it is | Reference-check result | Risk | Recommendation |
|----|------|-----------|------------|----------------------|------|----------------|
| A1-a | A1 | `client/src/screens/DevScreen/sections/CameraStateHudSection.jsx:1-1026` | Entire 1026-line component — replaced by CameraAdvancedSection | Grep: zero imports in any non-test file; CameraAdvancedSection.jsx line 8 confirms "Replaces the separate CameraZoomTuningSection + CameraStateHudSection" | Low | Delete file; tests in CameraZoomTuningSection.test.jsx mock the old component but do not import CameraStateHudSection — safe to remove |
| A1-b | A1 | `client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx:1-757` | Entire component — replaced by CameraAdvancedSection | Grep: not imported in DevScreen.jsx or any app file; only referenced in its own test (CameraZoomTuningSection.test.jsx) and a DevScreen.tier-toggle.test.jsx mock | Low | Delete file and its companion test CameraZoomTuningSection.test.jsx |
| A2-a | A2 | `client/src/modules/raceBehaviorConfig.js:71-73` | Validation still checks `tWeight <= 0`, `yWeight <= 0` in the sanity-guard block | Both fields are marked RETIRED in defaults.js (lines 457-461); they are still kept as values but are now dead in browser gate logic. The guard will silently reject any stored config that has tWeight=0 (e.g., a migration bug or manual reset). | Medium | Either remove the validation lines (tWeight/yWeight checks) from raceBehaviorConfig.js or add a code comment noting they are kept for sim-script backward compat only |
| A2-b | A2 | `client/src/modules/raceBehaviorConfig.js:76` | Validation still checks `speedBrakeYThreshold <= 0` | Field is RETIRED as browser gate threshold (defaults.js line 530-532); kept only for sim-script compat. Guard will reject any config with speedBrakeYThreshold=0. | Medium | Same as A2-a — either remove or comment why the guard is intentional |
| A2-c | A2 | `client/src/modules/raceBehaviorConfig.js:71` | Validation still checks `avoidanceDistance <= 0` | Field is RETIRED from browser gate (defaults.js line 522-524); kept only for sim-script compat. | Medium | Same as A2-a |
| A2-d | A2 | `client/src/modules/raceBehavior.js:413` | Comment: "is independent of avoidanceDistance / yWeight config values" | Accurate — these fields are not read inside the gate. Comment is descriptive and not misleading. | Low | No action required — comment is contextually correct |
| A2-e | A2 | `client/src/modules/raceBehavior.js:536` | Comment: "Replaced the mixed-unit metric (dT×tWeight + dY×yWeight)..." | Accurate historical context; describes what was replaced and why. Not stale. | Low | No action required |
| A3-a | A3 | `client/src/screens/PocPackDynamics/` | Empty directory, no files | Glob search found zero files in this directory | Low | Delete the empty directory |
| B1-a | B | `client/src/modules/raceBehaviorConfig.js:71-73` | stale comments implied by the validation: tWeight, yWeight, avoidanceDistance still appear without any inline note that they are retired | See A2-a through A2-c; the validation code itself acts as an implicit comment that these fields are "live" | Medium | Add inline comment at line 71 block: "Retired fields kept for sim-script backward compat — see defaults.js" |
| B2-a | B | `client/src/modules/storage/defaults.js:415` | Comment: "2.0 compensates for tighter avoidanceDistance (0.15)" — references avoidanceDistance 0.15 as active, but current default is 0.18 and field is retired | The current default is 0.18 (line 524); the comment refers to an older value from a previous sweep phase | Low | Update comment: replace "(0.15)" with the current value or note the field is retired |
| B3-a | B | `client/src/modules/storage/defaults.js:527` | Comment in speedBrakeYThreshold says "Kept for sim-script backward compat and raceBehaviorConfig validation" but the validation guard it refers to (raceBehaviorConfig.js:76) treats it as a live required field | Valid note — the comment accurately documents dual purpose. Not stale. | Low | No action required |
| C1-a | C1 | `client/src/modules/surface-effects/defaults.js` — `air`, `sand`, `snow`, `earth` (cloud generator) | Cloud-generator surface class configs all have: `color`, `startSize`, `endSize`, `lifetimeFrames`, `spawnProbability`, `driftDirection` — schema is consistent across the four cloud-type classes | Checked defaults.js lines 34-143 directly; all four cloud instances have the same 6 keys | Low | No action required — schemas are consistent |
| C1-b | C1 | `client/src/modules/surface-effects/defaults.js` — `mud` and `water` (splash generator) | Both splash configs have: `color`, `count`, `sizeMin`, `sizeMax`, `lifetimeFrames`, `spawnProbability`, `gravity`, `spreadAngle` — consistent | Checked lines 63-130; 8 keys each, identical structure | Low | No action required |
| C1-c | C1 | `client/src/modules/surface-effects/defaults.js` — `asphalt` and `ice` (line generator) | Both line configs have: `color`, `thickness`, `lifetimeFrames` — consistent | Checked lines 21-114 | Low | No action required |
| C1-d | C1 | `client/src/modules/surface-effects/defaults.js` — `grass` (particle generator) | Grass config has: `color`, `sizeMin`, `sizeMax`, `lifetimeFrames`, `spawnProbability`, `drift`, `gravity` — 7 keys; particle generator configSchema (particle.js) also includes these 7 fields | Checked particle.js lines 10-34; consistent with usage | Low | No action required |
| C2-a | C2 | `client/src/modules/raceBehaviorConfig.js:71-73` | Schema/validation inconsistency: three retired fields (tWeight, yWeight, avoidanceDistance) are still in the validation guard as if required live fields, but they are documented as retired in defaults.js | Already flagged as A2-a through A2-c | Medium | See A2-a recommendation |
| D1-a | D1 | `server/data/tracks/90d3020197da.json:1731,1734` | Hex ID `90d3020197da` — Luger Hill custom track | Found in: 90d3020197da.json (data file), 12 scripts in scripts/ directory (sim-fairness.mjs:2081, sim-sweep.mjs:43, param-sweep-braking.mjs:77, param-sweep-braking-phase2.mjs:74, param-sweep-full.mjs:73, param-sweep-phase2.mjs:47, param-sweep.mjs:75, compare-sets.mjs:26, compare-zones.mjs:28, sweep-lateral.mjs:47, sweep-phase4-only.mjs:72, sweep-phase5.mjs:93). NOT referenced in any client/src JS/JSX file. | Low | No action required — the hex ID appears only in the track data file itself and in scripts that consume it by ID string; client looks it up dynamically |
| D2-a | D2 | `client/src/modules/storage/defaults.js:9-163` | DEFAULT_TRACKS list: only `dirt-oval` has `isDefault: true`; all others have `isDefault: false` | Checked all 9 entries (dirt-oval, river-run, space-sprint, garden-path, city-circuit, mountainstreet, ice-track, seatrack, searound). The `isDefault` flag on tracks controls whether the track is treated as a built-in default. Dirt Oval is the only one marked true. | Low | Appears intentional: dirt-oval is the "fallback" track used by headlessRaceSimulator.js. Verify this is by design. |
| D2-b | D2 | `client/src/modules/racer-types/index.js:98-106` | Beetle and Boarder are fully registered built-in racer types (beetle, boarder) in the RACER_TYPES registry | Present as BeetleRacerType and BoarderRacerType; no `isDefault` concept exists for racer types (that field only exists on tracks and surface classes). Beetle and Boarder are built-in types identical in status to Horse, Dragon, etc. | Low | No action required — Beetle and Boarder are correctly registered |
| D3-a | D3 | `server/data/tracks/mountainstreet.json:1778-1782` | `"effects": [{"id": null, "config": {}}]` — null-id entry in effects array | Confirmed at line 1780. The guard at TrackEditor.jsx:420 (`activeEffects = effects.filter((e) => e.id)`) correctly filters it out before rendering. extractEffects() in trackEditorSave.js:128 calls `getEffect(id)` which returns undefined for null, so the `console.warn` fires and the entry is filtered. | Medium | The null entry is a data artifact from a save where no effect was selected. The guard prevents runtime errors but the entry is unnecessary. Consider a one-time data cleanup or improve the save path to not persist `{id: null, config: {}}` entries. |
| D3-b | D3 | `client/src/screens/TrackEditor/TrackEditor.jsx:420` | `effects.filter((e) => e.id)` — null-ID guard on effect start | Works correctly for mountainstreet.json's null entry | Low | Consider logging or surfacing the skipped null entry in debug mode |
| D3-c | D3 | `client/src/screens/TrackEditor/trackEditorSave.js:126-135` | `extractEffects()` filters unknown/null effect IDs with a console.warn | Works correctly; the `getEffect(null)` call returns undefined, which causes the warn + skip | Low | No action required |
| E1-a | E | `client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx:34,39,56,61` | Mock config includes `avoidanceDistance: 0.35` and `speedBrakeYThreshold: 0.12` | Neither value is referenced in any test assertion in the file (assertions check rendered text, block existence, and re-roll math — not these two fields directly). The mock values are consumed by the component render but no assertion specifically targets them. | Medium | The mock values are stale relative to the live schema (avoidanceDistance is retired; speedBrakeYThreshold is retired as a browser gate field). The test still passes because the component no longer exposes these fields in the UI, but the mock silently carries retired values. Document or clean up the mock to reflect the current schema. |
| F1-a | F | `client/src/modules/racer-types/spriteLoader.js:11` | Module-level `_cache = new Map()` keyed by URL string; stores HTMLImageElement instances | No eviction logic. `_clearSpriteCache()` exists but is marked "Only use in tests." In production the cache grows monotonically as new sprite URLs are loaded. On a typical session with 20 racer types × N coat variants × possible resize events, this could accumulate dozens of HTMLImageElements that are never GC'd as long as the module is loaded. | Medium | Add a weak-ref or size-cap eviction strategy, or document the intended maximum size. At 20 types with ~4-6 coats each this is bounded (~100 entries, acceptable); but the lack of documentation makes the bound implicit. |
| F1-b | F | `client/src/modules/track-effects/bgImageCache.js:10` | Module-level `_cache = new Map()` keyed by path string; stores `{img: HTMLImageElement, ready, failed, warned}` | No eviction logic. `_clearBackgroundImageCache()` exists for tests only. Each unique track background path adds one permanent entry with a retained HTMLImageElement. With 9-10 default tracks + custom tracks this is bounded and low-risk in practice. | Low | Low risk given bounded number of tracks. Document the expected max size in a comment for future maintainers. |
| F1-c | F | `client/src/modules/storage/trackCache.js:16` | localStorage-based data-URL cache, capped at 3 MB, with LRU eviction | Has explicit size cap and eviction logic (lines 95-108). Well-designed. | Low | No action required |
| G1-a | G | `client/src/modules/headlessRaceSimulator.js:172-207` | Sim racer objects are constructed WITHOUT `drawnBodyLengthPx` or `drawnBodyWidthPx` — only `frameSizePx: spriteSize` (line 195) | In raceBehavior.js the speed-brake uses `rA.drawnBodyLengthPx ?? frameA` and `rA.drawnBodyWidthPx ?? frameA` (lines 445-448). When these are absent, the fallback is `frameSizePx`. In the browser, racers have actual drawn body dimensions (e.g., horse body is narrower than its frame). Sim racers always use frameSizePx as a square proxy. | **Separate** | Browser-vs-sim parity gap. In sim, brakeContactLength = brakeContactWidth = frameSizePx (square body assumed). In browser, bodies are non-square (e.g., horse drawnBodyLengthPx ≠ drawnBodyWidthPx). This means the brake activation zone geometry differs between sim and browser. The sim-fairness.mjs DOES set drawnBodyWidthPx/drawnBodyLengthPx (lines 346-350) and is therefore correctly calibrated. headlessRaceSimulator.js is the only sim that lacks this parity. |
| G2-a | G | `client/src/modules/racer-types/spriteLoader.js` | No eviction; HTMLImageElements retained for module lifetime | See F1-a. In a long-running session where many different coat/tint variants are loaded, the map can grow. No evidence of leak triggering in practice (bounded by racer type × coat count). | **Separate** | Monitor in production; add a size-cap comment at minimum. |
| H1-a | H | `reports/open-track-overlap/archive/misc/DOCS-TODO.md` | Step 2 section (lines 66-75) is a placeholder: "to be filled after Step 2 is implemented and validated" | Step 2 (avoid-first lateral commitment / Stage B+D) is now implemented (merged in bc53ae1 per project memory). The DOCS-TODO.md placeholder was not filled in after the merge. | Low | Fill in the Step 2 section of DOCS-TODO.md, or close the file with a note that all items were addressed in the merge commit. |
| H1-b | H | `docs/ARCHITECTURE.md` | Per DOCS-TODO.md, the ARCHITECTURE.md needs updates for: brake-to-match model, multi-leader rule, hold/release state model, anti-trap mechanism, debounced release | These updates were deferred pending Step 2 merge. Step 2 is now merged. | Low | Fulfill the DOCS-TODO.md checklist items for ARCHITECTURE.md. |

---

## Three Priority Buckets

### Bucket 1 — Safe to Delete (Low Risk, Pure Dead Code)

| ID | File | Action |
|----|------|--------|
| A1-a | `client/src/screens/DevScreen/sections/CameraStateHudSection.jsx` | Delete entire file (1026 lines) — superseded by CameraAdvancedSection.jsx |
| A1-b | `client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx` | Delete file — superseded by CameraAdvancedSection.jsx |
| A1-b | `client/src/screens/DevScreen/sections/CameraZoomTuningSection.test.jsx` | Delete companion test — tests a dead component |
| A3-a | `client/src/screens/PocPackDynamics/` | Delete empty directory |

### Bucket 2 — Schema/Comment/Test Cleanup (Medium Risk)

| ID | File:Line | Action |
|----|-----------|--------|
| A2-a / C2-a | `raceBehaviorConfig.js:71-73` | Remove or annotate the tWeight/yWeight/avoidanceDistance validation guards with a "retired, kept for sim-compat" comment |
| A2-b | `raceBehaviorConfig.js:76` | Remove or annotate speedBrakeYThreshold validation guard |
| B2-a | `defaults.js:415` | Update comment to reflect current avoidanceDistance=0.18 (not 0.15) or note retirement |
| D3-a | `server/data/tracks/mountainstreet.json:1778-1782` | Remove the null-id effect entry `{"id":null,"config":{}}` from the effects array (data cleanup) |
| E1-a | `RaceTuningSection.test.jsx:34,39,56,61` | Remove or annotate retired fields `avoidanceDistance: 0.35` and `speedBrakeYThreshold: 0.12` in mock configs |
| F1-a | `spriteLoader.js:11` | Add a comment documenting the expected maximum cache size (bounded by racer types × coat variants) |

### Bucket 3 — Behavior-Affecting (SEPARATE — do not merge without a sim sweep)

| ID | File:Line | Finding |
|----|-----------|---------|
| G1-a | `headlessRaceSimulator.js:172-207` | Sim racer objects lack `drawnBodyLengthPx` and `drawnBodyWidthPx`. In browser, raceBehavior.js uses actual drawn body dimensions for the speed-brake zone; headlessRaceSimulator.js always falls back to `frameSizePx` (square proxy). sim-fairness.mjs is correctly parity-aligned (sets both fields). headlessRaceSimulator.js is the only sim module with this gap. Fix: add `drawnBodyWidthPx` and `drawnBodyLengthPx` to each sim racer using the same per-racer-type body reference values that sim-fairness.mjs uses (lines 347-350). |

---

## Verified-Resolved Items

The following items were investigated and confirmed NOT to be issues:

- **Lever B / leverB residue (A2):** Grep found zero matches for `lever[Bb]`, `leverB`, `lever_b` anywhere in client/src. No residue.
- **frameTimingExperiment (A2):** Grep found zero matches. No residue.
- **Stage D residue (A2):** "stageD" references in raceBehavior.js (lines 861, 866) and defaults.js (line 556) are for the ACTIVE "Step-2 Stage D: gap-clearing force" feature — not dead code. These are current, live behavior.
- **DiagnoseVerteilung orphan (A3):** Correctly imported and routed in App.jsx line 84 as an intentional URL-only internal diagnostic route.
- **Beetle / Boarder isDefault (D2):** isDefault is a track/surface-class concept only; racer types have no isDefault field. Beetle and Boarder are fully registered built-in types.
- **90d3020197da track (D1):** Hex ID exists only in server/data/tracks/90d3020197da.json and scripts/ files. Not hardcoded in any client source file. Correct pattern.
- **mountainstreet.json null effect guard (D3):** Two independent guards (TrackEditor.jsx:420 `filter((e) => e.id)` and trackEditorSave.js:128 `filter({id}) with getEffect(id) check`) both correctly skip the null entry. Runtime safety is maintained.
- **Cloud surface schema consistency (C1):** All four cloud-type surface classes (air, sand, snow, earth) share exactly the same 6-field schema. No divergence found.
- **DynamicsTuningSection orphan (A1/A3):** Not dead — imported by RaceTuningSection.jsx line 2 and rendered at line 38.
- **BehaviorTuningSection orphan (A3):** Imported by RaceTuningSection.jsx line 3, rendered at line 39.
- **trackCache.js eviction (F):** Has correct LRU eviction with 3 MB cap. Not a leak concern.

---

## Notes on Pass Results

### Pass A1 — CameraStateHudSection
Grep for `CameraStateHudSection` across all JSX/JS files found only: (1) the file itself, and (2) a comment in CameraAdvancedSection.jsx line 8 saying it was replaced. It is not imported anywhere in the app. **Confirmed dead.**

### Pass A1 — CameraZoomTuningSection
Not imported in DevScreen.jsx (verified by reading the import block lines 10-29). Referenced only in its own test file and a mock in DevScreen.tier-toggle.test.jsx. **Confirmed dead as a rendered section.** Note: its test suite (CameraZoomTuningSection.test.jsx) is the only consumer — if the component is deleted, the test must also be deleted.

### Pass A2 — tWeight / yWeight
These fields appear at `defaults.js:460-461` with explicit "RETIRED" comment, and are validated at `raceBehaviorConfig.js:71-73`. The validation is not wrong (the values are still stored), but it creates a semantic mismatch: retired fields being validated as live required fields with no explanatory comment in the validation code.

### Pass B — speedBrakeYThreshold in comments
The field appears in `defaults.js` PHYSICS PARAMETERS block (line 491) as a historical reference value. The inline comment at line 530-532 correctly identifies it as retired. The validation guard at `raceBehaviorConfig.js:76` is the only place it remains active code without a "retired" annotation.

### Pass D3 — mountainstreet.json null effect
The entry `{"id": null, "config": {}}` at line 1780 is a data artifact from a save where no effect was configured but the effects array was initialized with a placeholder. Both client-side guards handle it correctly, but the entry is cosmetically messy and will always emit a console.warn on load.

### Pass E — RaceTuningSection.test.jsx mock values
`avoidanceDistance: 0.35` and `speedBrakeYThreshold: 0.12` appear in the mock at lines 34, 39, 56, 61 but no test assertion in the file checks these values. The component (BehaviorTuningSection) renders an "Avoidance Buffer" control (for `avoidanceBufferPct`) but not a direct input for the retired `avoidanceDistance` or `speedBrakeYThreshold` fields. The mock values are consumed silently and never asserted.

### Pass F — Cache growth analysis
- **spriteLoader.js:** Module-level Map, no eviction, retains HTMLImageElements. In practice bounded to ~100 entries (20 types × ~5 coats). Acceptable but undocumented.
- **bgImageCache.js:** Module-level Map, no eviction, retains HTMLImageElements + metadata. Bounded to number of distinct track paths. Low risk.
- **trackCache.js:** localStorage-based with 3 MB LRU cap. Well-designed, not a concern.

### Pass G1 — Sim↔browser parity
**headlessRaceSimulator.js racer construction (lines 172-207):** Only `frameSizePx: spriteSize` is set (line 195). `drawnBodyWidthPx` and `drawnBodyLengthPx` are absent. In `raceBehavior.js` the speed-brake zone uses `rA.drawnBodyLengthPx ?? frameA` and `rA.drawnBodyWidthPx ?? frameA` (lines 445-448), where `frameA = getFrameSizePx(rA) = frameSizePx`. So the sim fallback is a **square** body (both axes = frameSizePx=40), while browser racers use non-square drawn bodies (e.g., horse is taller than wide).

**sim-fairness.mjs (lines 346-350):** Sets `drawnBodyWidthPx: bodyRef.bodyNarrow` and `drawnBodyLengthPx: bodyFillNarrow > 0 ? ...` — correctly parity-aligned with the browser. sim-fairness.mjs is the primary sweep tool and IS correct.

**Impact:** headlessRaceSimulator.js is used by the in-app `/diagnose-verteilung` diagnostic screen and by the raceBehavior.test.js fixture helpers, not by the main sweep tooling. The main sweep (sim-fairness.mjs) is correct. This is a diagnostic tool parity gap, not a sweep validity issue.

---

---

## Phase 1b — Gap Checks

### Check 1 — Luger Hill track-ID: complete reference map

**Status in INVENTORY.md:** Finding D1-a already exists; it correctly identifies the hex ID and lists 12 script references. This check expands it with a full reference map and per-reference rename-risk analysis (D1-a was catalogued at medium granularity; this adds break-risk detail).

**Grep result — literal `90d3020197da` across the whole repo (excluding backups, tmp, reports):**

| File | Line(s) | Role | Break on rename? |
|------|---------|------|-----------------|
| `server/data/tracks/90d3020197da.json` | 1731, 1734 | Data file — defines the track `"id"` and `backgroundImageFile` path | Yes — both the JSON `id` field and the background image filename use the hex ID. Rename requires: (1) new `id` value in JSON, (2) rename `server/data/tracks/90d3020197da.json`, (3) rename `public/` or `assets/` background image file if it exists. |
| `scripts/sim-fairness.mjs` | 2081 | Hard-coded in the tracked-track-IDs array: `'90d3020197da', // Luger hill (open)` | Yes — must update to new slug |
| `scripts/sim-sweep.mjs` | 43 | `{ id: '90d3020197da', name: 'Luger Hill', ... }` | Yes |
| `scripts/param-sweep.mjs` | 75 | `{ track: '90d3020197da', racer: 'luge', ... } // Luger Hill` | Yes |
| `scripts/param-sweep-braking.mjs` | 77 | `{ track: '90d3020197da', racer: 'luge', ... }` | Yes |
| `scripts/param-sweep-braking-phase2.mjs` | 74 | `{ track: '90d3020197da', racer: 'luge', ... }` | Yes |
| `scripts/param-sweep-full.mjs` | 73 | `{ trackId: '90d3020197da', racerType: 'luge', ... }` | Yes |
| `scripts/param-sweep-phase2.mjs` | 47 | `{ track: '90d3020197da', racer: 'luge', ... }` | Yes |
| `scripts/compare-sets.mjs` | 26 | `{ trackId: '90d3020197da', label: 'Luger Hill' }` | Yes |
| `scripts/compare-zones.mjs` | 28 | `{ trackId: '90d3020197da', label: 'Luger Hill' }` | Yes |
| `scripts/sweep-lateral.mjs` | 47 | `{ trackId: '90d3020197da', label: 'Luger Hill' }` | Yes |
| `scripts/sweep-phase4-only.mjs` | 72 | `{ id: '90d3020197da', label: 'Luger Hill' }` | Yes |
| `scripts/sweep-phase5.mjs` | 93 | `{ id: '90d3020197da', racerType: 'luge', ... }` | Yes |

**"luger" / "Luger" references outside data + scripts:**

| File | Lines | Role | Break on rename? |
|------|-------|------|-----------------|
| `client/src/modules/storage/defaults.js` | 481, 509 | Comments inside the physics parameter block — describe Luger Hill as "1 user-created" and reference it in tuning notes | No break — comments only; update for accuracy |
| `docs/BACKLOG.md` | 672–674 | Backlog item P-5 that *documents* the planned rename itself | No break — tracks the intent |
| `docs/BACKLOG.md`, `docs/ROADMAP.md`, `docs/LESSONS.md` | Many | Historical narrative references, no ID string consumption | No break |
| `scripts/gen-luge-sprite.mjs` | — | Script name contains "luge"; not a track-ID reference | No break |
| `server/data/tracks-backups/` | Many | Backup snapshot files with old name — can be left as-is | No break (backups) |
| `client/tmp/` | — | Fairness data files referencing the ID in results JSON | No break (temp output) |

**Client source:** zero references to `90d3020197da` in `client/src/**` — the client fetches tracks by ID from the server dynamically. No client-source change is required on rename.

**Rename-risk summary (High):** A slug rename (`luger-hill`) requires coordinated changes to: the JSON data file name + `"id"` field, the background image filename, and all 12 scripts. All 12 script references are hard-coded ID strings (no dynamic lookup) and would each need a single-line text replacement. The data-file rename also requires a server restart (file is loaded by path at boot). **Catalogue only — no action in this phase.**

---

### Check 2 — "Stage D active, not dead" vs. "Stage D reverted" reconciliation

**Verdict: label collision between two different features. Both the audit and the handoff are correct — they refer to different things.**

**The original "Overtaking Stage D" (referenced in handoff as "reverted/ineffective"):**
Grep for any code matching the original overtaking Stage D signature — avoidance-trigger widening as a Boolean flag or alternate gate condition — yields **zero matches** in `client/src/`. The original Stage D was the idea of using "honest body width as the avoidance/gate trigger distance" to suppress the gate for slightly-separated racers. It was superseded by the geometric gate (commit `8292d9d`, report 39), which replaced the entire scalar-distance gate model. No residue of the original Stage D remains.

**The current "Step-2 Stage D" in the code (live, merged in bc53ae1):**

| Location | Lines | What it is |
|----------|-------|------------|
| `raceBehavior.js:47–53` | Stage A comment block | 4 pre-allocated Sets (`_approachLeft`, `_approachRight`, `_forwardLeft`, `_forwardRight`) — corridor accumulators for the approach-detection system |
| `raceBehavior.js:54–59` | Stage B comment block | `_sameLaneApproach`, `_approachForceMag`, `_sameLaneLeaderPhysY` — same-lane detection Maps |
| `raceBehavior.js:799–858` | Stage B logic | Lateral commitment (`approachCommitDir`, `approachCommitFrames`) — debounced direction-lock during same-lane approach |
| `raceBehavior.js:861–893` | **Stage D label** | `gapForceStrength`/`gapForceCap` proportional gap-clearing force — fires when `inSameLane && speedBrakeSet.has(r.index) && lpy !== undefined`; adds a self-limiting lateral impulse toward honest body clearance |
| `defaults.js:556–562` | Stage D config | `gapForceStrength: 1.0`, `gapForceCap: 1.5` — live config fields with no "retired" annotation |

**Is the Stage-D path reachable?** Yes. The three gates at `raceBehavior.js:876`:
1. `inSameLane` — populated from `_sameLaneApproach` in the same frame
2. `speedBrakeSet.has(r.index)` — set when the speed-brake activates
3. `lpy !== undefined` — set when a fresh leader physicalY is available

All three fire routinely on open tracks with same-lane approaches. `gapForceStrength: 1.0` is non-zero — the force IS injected. The path is **live and influences behavior**.

**Case: (b) — the current code is the Step-2 Stage A–D infrastructure, correctly live. It is NOT the reverted overtaking Stage D.**

The confusion arises because:
- "Overtaking Stage D" = old avoidance-trigger widening → reverted/superseded by geometric gate (no code remains)
- "Step-2 Stage D" = gap-clearing lateral force → a **different** feature built later, using the same Stage-D label, currently live and functioning

**No action needed for audit purposes.** The Verified-Resolved entry in Phase 1 ("Stage D references in raceBehavior.js lines 861/866 and defaults.js line 556 are ACTIVE 'Step-2 Stage D' gap-clearing force") is correct. The handoff's "Stage D reverted" refers to the older overtaking-Stage-D experiment, which has zero code remnants.

---

### Check 3 — Authoritative retired-vs-live field list

Full grep results for each field in **non-test** client source (`client/src/**`, excluding `*.test.*`):

| Field | Read in live game logic? | Evidence | Status |
|-------|--------------------------|----------|--------|
| `tWeight` | **No** | `raceBehaviorConfig.js:72` — validation guard only. `defaults.js:460` — value stored. Zero reads in `raceBehavior.js` or any behavior path. `defaults.js:458` explicitly notes: *"Kept here so sim scripts that still read avoidanceDistance/tWeight/yWeight"*. | **RETIRED** — safe to remove from validation and defaults after sim-script compat is confirmed no longer needed |
| `yWeight` | **No** | `raceBehaviorConfig.js:73` — validation guard only. `defaults.js:461` — value stored. Zero reads in `raceBehavior.js`. Same sim-compat note applies. | **RETIRED** |
| `avoidanceDistance` | **No** | `raceBehaviorConfig.js:71` — validation guard only. `defaults.js:522-524` — value stored, annotated *"RETIRED from browser gate (report 39 — geometric gate replaces it)"*. `raceBehavior.js:413` — appears in a **comment** only (`// is independent of avoidanceDistance / yWeight config values`), not a code read. | **RETIRED** |
| `speedBrakeYThreshold` | **Yes — as fallback** | `raceBehavior.js:455`: `trackWidth > 0 ? pxToPhysicalY(brakeContactWidth, trackWidth) : config.speedBrakeYThreshold` — the value IS read at runtime when `trackWidth <= 0`. `raceBehavior.js:310`: listed in JSDoc param block (documentation). `raceBehaviorConfig.js:76`: validation guard. `defaults.js:530-532`: annotated *"RETIRED from browser brake gate (report 45 — body-based same-lane ... fallback only)"* — the annotation is accurate. | **CONDITIONALLY LIVE** — not safe to remove from defaults or validation; the fallback read at `raceBehavior.js:455` is a live code path (fires when no valid trackWidth is available). Removing it would cause `brakeSameLaneY = NaN`/`undefined` for any track missing width data. |

**Wording correction for A2:** Finding A2 says "3 retired fields" but names 4. The correct count is:
- 3 fully RETIRED: `tWeight`, `yWeight`, `avoidanceDistance`
- 1 still live as fallback: `speedBrakeYThreshold`

**Implication for Phase 2 Cluster 2:**
- Validation guards for `tWeight` (line 72), `yWeight` (line 73), and `avoidanceDistance` (line 71) in `raceBehaviorConfig.js` may be annotated or removed — they guard fields with no live reads.
- Validation guard for `speedBrakeYThreshold` (line 76) **must be kept** — the field is read as a fallback in `raceBehavior.js:455` and a zero/negative value there would produce an invalid threshold.
- Finding E1-a in `RaceTuningSection.test.jsx` — mock value `avoidanceDistance: 0.35` is for a RETIRED field and may be cleaned. Mock value `speedBrakeYThreshold: 0.12` is for a conditionally-live field; removing it from the test mock is safe (the mock value is not asserted), but the field should remain in the live config schema.

---

## Footer — Test Results

| Suite | Tests | Pass | Fail | Notes |
|-------|-------|------|------|-------|
| vitest (client/) | 2631 | **2631** | 0 | 2 pre-existing unhandled rejections in `SurfaceClassPreview.test.jsx` (mock canvas lacks `getTransform()`) — present before audit, not caused by it |

**`git status` (confirms read-only):**

```
On branch master
Untracked files:
  .claude/
  reports/audit/

nothing added to commit but untracked files present
```

Only `reports/audit/INVENTORY.md` was created. No source, data, or test files were modified.

**Backup tag:** `backup/pre-audit` → `332c9f05458bf16131b4514503ca8d55f05807c1`
