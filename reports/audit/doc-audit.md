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

## Docs Checked and Found Accurate

| Doc | Status |
|---|---|
| `README.md` | Accurate: tech stack, feature list, track/racer counts, setup commands, endpoint table |
| `docs/API.md` | Accurate relative to backend routes |
| `docs/ARCHITECTURE.md` | 1 fix applied (items 5, 6 above); remainder accurate |
| `docs/BACKLOG.md` | 2 fixes applied (items 7, 8 above); historical entries are intentionally snapshot-in-time |
| `docs/CAMERA_DIRECTOR.md` | Not modified; no stale references found |
| `docs/LESSONS.md` | 1 fix applied (item 9 above); historical lessons accurate |
| `docs/PROJECT-PRINCIPLES.md` | Accurate |
| `docs/RACER_DATA_MODEL.md` | 4 fixes applied (items 1–4 above) |
| `docs/ROADMAP.md` | Accurate |
| `docs/SETUP.md` | 1 fix applied (item 10 above) |
| `docs/SIM.md` | Not modified; no stale references found |
| `docs/TRACK_EDITOR.md` | Not modified; no stale references found |
| `docs/TRACK_LIFECYCLE.md` | Not modified; no stale references found |

## Docs Not Audited (out of scope)

- `reports/audit/*` — historical one-shot audit snapshots; stale by design
- `reports/open-track-overlap/archive/*` — archived investigation notes; stale by design
- `client/tmp/*/fairness-report.md` — sim run outputs; stale by design
- `docs/diag/*`, `docs/diagnose/*` — per-session diagnostics; stale by design

---

## No Source Code Changes

This audit touched only Markdown documentation. Zero changes to source code, tests, or config files.
