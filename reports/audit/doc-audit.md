# Doc Audit — Post-Hygiene-Bundle (2026-06-11)

**Scope:** All docs under `docs/` + `README.md`, audited against codebase state at commit `68a62b8` (bundle N-8, master).  
**Method:** Cross-reference doc claims against source code (grep, Read). Fixes applied directly per user instruction.  
**Constraint:** No source code, test, or config changes — docs only.

---

## Findings and Fixes Applied

### 1. `docs/RACER_DATA_MODEL.md` — `listRacerTypes()` removed from API table

**Finding:** The API table listed `listRacerTypes()` as a public function. It was deleted in hygiene step N-8 (commit `68a62b8`). The function was superseded by `listAllRacerTypes()`, which already existed and covers the same use case with richer output.  
**File:line:** `docs/RACER_DATA_MODEL.md:196`  
**Fix:** Removed the row for `listRacerTypes()` from the API table.

---

### 2. `docs/RACER_DATA_MODEL.md` — "12 Types" registry claim was wrong

**Finding:** The Code-Registry architecture comment said "Code-Registry (RACER_TYPES) → 12 Types, always complete". The actual registry contains all 20 built-in types.  
**File:line:** `docs/RACER_DATA_MODEL.md:182`  
**Fix:** Updated to "20 Types, always complete".

---

### 3. `docs/RACER_DATA_MODEL.md` — Stale BASE_SPEED constants

**Finding:** The speedMultiplier note cited `BASE_SPEED_MIN = 0.00085`, `BASE_SPEED_MAX = 0.0012` from `lapUtils.js`. The actual constants are in `DEFAULT_BASE_SPEED_CONFIG` in `storage/defaults.js`: `min: 0.00096`, `max: 0.00113`. The values in `lapUtils.js` are private derivations (`_BASE_SPEED_MIN`, `_BASE_SPEED_MAX`) which read from `DEFAULT_BASE_SPEED_CONFIG`.  
**File:line:** `docs/RACER_DATA_MODEL.md:117`  
**Fix:** Updated to reflect the correct values and source.

---

### 4. `docs/RACER_DATA_MODEL.md` — Stale field name `geometricTrackWidthPx`

**Finding:** The Row Start note referenced `geometricTrackWidthPx` as the track width source, pointing to `EditorShape.getActualTrackWidth()`. This was the pre-scale-cleanup field name. After `feat/open-track-overlap` (scale cleanup), the canonical field is `trackWidthPx` read from `track.width` (stored by the Track Editor), with `getActualTrackWidth()` as a spline fallback only.  
**File:line:** `docs/RACER_DATA_MODEL.md:264`  
**Fix:** Updated field name and description.

---

### 5. `docs/ARCHITECTURE.md` — Stale RaceScreen line count

**Finding:** The folder-structure comment said `index.jsx` was "~1528 lines". Actual `wc -l` output: 1673 lines.  
**File:line:** `docs/ARCHITECTURE.md:22`  
**Fix:** Updated to "~1673 lines" and removed the stale label "(hygiene sprint + body-dimensions)".

---

### 6. `docs/ARCHITECTURE.md` — `loadAllTracks()` reference to a deleted function

**Finding:** The Track Lifecycle / Server-wins deduplication section referenced `loadAllTracks()` as the merge function used by SetupScreen and TrackManager. `loadAllTracks()` was deleted in hygiene step N-6 (commit `09ca58d`). It had zero callers at deletion time; the actual sync merge function is `getInitialTracks()` in `trackLoader.js`.  
**File:line:** `docs/ARCHITECTURE.md:849`  
**Fix:** Updated to `getInitialTracks()` with correct description.

---

### 7. `docs/BACKLOG.md` — `loadAllTracks()` reference to a deleted function

**Finding:** The Q-26 backlog item described the server-wins dedup logic using `loadAllTracks()`.  
**File:line:** `docs/BACKLOG.md:369`  
**Fix:** Updated to `getInitialTracks()`.

---

### 8. `docs/BACKLOG.md` — VRE-3 racer count "12" was wrong

**Finding:** The VRE-3 checklist entry said "all 12 racer types with classes". The ARCHITECTURE.md sub-PR table and RACER_DATA_MODEL surface class assignment table both confirm all 20 types were assigned in VRE-3.  
**File:line:** `docs/BACKLOG.md:173`  
**Fix:** Updated to "all 20 racer types".

---

### 9. `docs/LESSONS.md` — Stale paired reference to deleted `loadAllTracks()`

**Finding:** Lesson 31 described the merge logic as `getInitialTracks()`/`loadAllTracks()`. Only `getInitialTracks()` exists post N-6.  
**File:line:** `docs/LESSONS.md:562`  
**Fix:** Removed the `/loadAllTracks()` suffix.

---

### 10. `docs/SETUP.md` — Duplicate section separator

**Finding:** Two consecutive `---` separators with a blank line between them before "## 5. Working with the server". Markdown renders them as redundant visual noise.  
**File:line:** `docs/SETUP.md:54-55`  
**Fix:** Removed the duplicate `---`.

---

## Docs Checked and Found Accurate (Pass 1)

| Doc | Status |
|---|---|
| `README.md` | Accurate: tech stack, feature list, track/racer counts, setup commands, endpoint table |
| `docs/API.md` | Accurate: surface-effects defaults file is `defaults.js` (not `defaultClasses.js`) — path in API.md is correct |
| `docs/ARCHITECTURE.md` | 2 fixes applied (items 5, 6 above); additional fix in pass 2 (item 18) |
| `docs/BACKLOG.md` | 2 fixes applied (items 7, 8 above); historical entries are intentionally snapshot-in-time |
| `docs/LESSONS.md` | 1 fix applied (item 9 above); historical lessons accurate |
| `docs/PROJECT-PRINCIPLES.md` | Accurate |
| `docs/RACER_DATA_MODEL.md` | 4 fixes applied (items 1–4 above) |
| `docs/SETUP.md` | 1 fix applied (item 10 above) |

---

## Second Pass — Content Accuracy (applied directly)

### 11. `docs/SIM.md` — Section 5 parameter table severely stale

**Finding:** "The 8 Interdependent Parameters" table documented old pre-Phase-5 sweep candidate values, not the Phase 5 winners locked in `storage/defaults.js`. Specific errors:
- `lateralForce`: 0.014 → actual 0.0114
- `lateralDamping`: 0.45 → actual 0.16
- `homeForceStrength`: 0.040 → actual 0.030
- `homeForceReductionOnOverlap`: 0.15 → actual 0.30
- `avoidanceDistance`: 0.15 → actual 0.18 (and retired from browser gate after `feat/open-track-overlap`)
- `speedBrakeFactor`: 0.98 → actual 0.945
- `speedBrakeTThreshold` (0.008): renamed to `speedBrakeTMultiplier` (1.5) — body-based dynamic threshold
- `speedBrakeYThreshold`: 0.12 → actual 0.18 (also retired from browser gate)
- `avoidanceBufferPct` (0.20): new parameter entirely missing from the table
- "Dev Screen displays a warning banner" claim: wrong — all 8 physics sliders were removed from Dev Screen in `feat/dynamic-speed-brake`

**Fix:** Rewrote section 5: renamed "The 8 Interdependent Parameters" to "Physics Behavior Parameters"; updated all 7 active parameter values; added `avoidanceBufferPct`; marked `avoidanceDistance` and `speedBrakeYThreshold` as retired from browser gate; replaced "Dev Screen warning" subsection with accurate description (sliders removed, values locked in `defaults.js`).

---

### 12. `docs/CAMERA_DIRECTOR.md` — Stale call site line number and endgameThreshold default

**Finding (a):** Section 6 linked `camDir.update()` call site to `RaceScreen/index.jsx:1161`. Actual line (verified by grep): 1329.

**Finding (b):** Config table listed `endgameThreshold` default as 0.85. The code fallback (`_ENDGAME_PROGRESS_THRESHOLD`) is 0.85, but `RaceScreen/index.jsx:885` applies a nullish-coalesce to 0.90 before passing the value to `CameraDirector`. Effective default in the running game is 0.90, consistent with ARCHITECTURE.md ("Phase 3D: 90% (was 85%)").

**Fix:** Updated call site link to `:1329`; updated config table default to 0.90 with a note about the code fallback; updated priority chain description to say "default 0.90".

---

### 13. `docs/TRACK_LIFECYCLE.md` — Server data layout missing 2 tracks; "5 default tracks" counts stale

**Finding:** The server data layout diagram listed only 7 default tracks (dirt-oval through ice-track), missing `seatrack.json` and `searound.json` (added in `feat/closed-track-speed`). TLH-1 description, TLH-3 status, Export button description, and Code-Bundle Update Workflow all said "5 default tracks" / "all 5 default-track geometries" — stale since Seatrack and Searound were added.

**Fix:** Added `seatrack.json` and `searound.json` to the data layout diagram; updated all "5 default tracks" counts to 9 throughout the TLH-1/TLH-3 sections and Code-Bundle workflow.

---

### 14. `docs/TRACK_EDITOR.md` — Surface class assignments missing 4 default tracks; camera states list missing LEAD_CHANGE

**Finding (a):** "Initial Surface-Class Assignments — 5 Default Tracks" only listed the original 5 tracks. Mountainstreet, Ice Track, Seatrack, and Searound were missing. Actual surface classes from server JSON: Mountainstreet `['asphalt']`, Ice Track `['ice', 'snow']`, Seatrack `['water']`, Searound `['water']`.

**Finding (b):** The "Included features" list in "Editor UI Scope — Version 1" listed camera states as "OVERVIEW / LEADER_ZOOM / BATTLE_ZOOM / COMEBACK_ZOOM", missing LEAD_CHANGE (added in Phase 3B).

**Fix:** Updated section heading from "5 Default Tracks" to "9 Default Tracks"; added 4 new rows to the surface class table; added LEAD_CHANGE to the camera states list.

---

### 15. `docs/ROADMAP.md` — "12 racer types" and "12-color STANDARD_COAT_PALETTE" counts stale

**Finding (a):** D3.5.5 entry said "Edit-Modal for all 12 racer types". The registry has 20 built-in types.

**Finding (b):** Racer Editor Phase 1 entry said "12-color STANDARD_COAT_PALETTE". The actual palette in `standardCoats.js` is 20 colors.

**Fix:** Updated both counts to 20.

---

### 16. `docs/ARCHITECTURE.md` — `client/src/utils/` folder missing from folder structure

**Finding:** `client/src/utils/` (containing `slugify.js` and `withTimeout.js`, the latter created in hygiene step N-1) was completely absent from the folder structure diagram. The existing `modules/utils/` entry is for a different folder (module-level RandomHelper), not the shared pure utilities.

**Fix:** Added `├── utils/` to the folder structure between `modules/` and `contexts/`, listing both `slugify.js` and `withTimeout.js`.

---

## Docs Checked Accurate (Pass 2)

| Doc | Notes |
|---|---|
| `docs/API.md` | Surface-effects defaults path `defaults.js` confirmed correct (file exists at that path) |
| `docs/CAMERA_DIRECTOR.md` | Schema version "v14 / v15" — current `cameraConfig.js` schema; accurate |

## Docs Not Audited (out of scope)

- `reports/audit/*` — historical one-shot audit snapshots; stale by design
- `reports/open-track-overlap/archive/*` — archived investigation notes; stale by design
- `client/tmp/*/fairness-report.md` — sim run outputs; stale by design
- `docs/diag/*`, `docs/diagnose/*` — per-session diagnostics; stale by design

---

## No Source Code Changes

This audit touched only Markdown documentation. Zero changes to source code, tests, or config files.
