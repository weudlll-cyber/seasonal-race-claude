# RaceArena — Documentation Check Audit

**Date:** 2026-06-09  
**Start point:** backup/sec2  
**Method:** READ-ONLY — no documentation changed.

---

## Triage Table

| ID  | Finding | Priority | Fix class |
|-----|---------|----------|-----------|
| DC-01 | `ARCHITECTURE.md:836,838` says "7 default tracks" — correct count is 9 | HIGH | SAFE-SMALL-FIX |
| DC-02 | Security input-validation layer (Sec-1: C1/C2/H1/H4) undocumented in ARCHITECTURE.md and API.md | HIGH | SAFE-SMALL-FIX |
| DC-03 | Upload content-validation + nosniff (Sec-2: C4) undocumented in ARCHITECTURE.md and API.md | HIGH | SAFE-SMALL-FIX |
| DC-04 | `BACKLOG.md:672` — Luger Hill hex-ID rename still listed as open; rename was completed in commit `2410d78` | MEDIUM | SAFE-SMALL-FIX (mark ✅) |
| DC-05 | `ARCHITECTURE.md:629` — stale component names: `CameraZoomTuningSection` + `CameraStateHudSection` both no longer exist (merged into `CameraAdvancedSection`) | MEDIUM | SAFE-SMALL-FIX |
| DC-06 | `ARCHITECTURE.md:107` — `API.md` labelled "# Phase 5 placeholder" but is a real 98-line document | LOW | SAFE-SMALL-FIX |
| DC-07 | `apiClient.js` (shared HTTP wrapper, J01 refactor) not documented in ARCHITECTURE.md | LOW | SAFE-SMALL-FIX |
| DC-08 | `atomicWriteJson` utility (server write safety) mentioned in AUDIT/LESSONS/BACKLOG but not in ARCHITECTURE.md's server section | LOW | SAFE-SMALL-FIX |
| DC-09 | Single-server rule (one running server, restart needed for code changes) only in LESSONS.md:590 — not in SETUP.md | MEDIUM | SAFE-SMALL-FIX |
| DC-10 | Lessons L108–L136: location and accuracy — all accurate and up to date | INFO | no action |
| DC-11 | `ARCHITECTURE.md:925` — "9 default + 1 user-created (Luger Hill)" — accurately describes the physics sweep context; not stale | INFO | no action |
| DC-12 | `BACKLOG.md:521` and prior audits mention `apiUtils.js` as a to-extract helper; J01 completed this as `apiClient.js` — old references accurate as historical record | INFO | no action |

---

## Detail

### DC-01 — "7 default tracks" in ARCHITECTURE.md (HIGH)

**File:** `docs/ARCHITECTURE.md:836,838`

```
836: ...migrateDefaultTracks() checks which of the 7 default tracks are missing...
838: ...once migrateDefaultTracks() has seeded the 7 default records...
```

The current `DEFAULT_TRACK_SEEDS` array in `server/src/routes/tracks.js` contains **9 entries**: `dirt-oval`, `river-run`, `space-sprint`, `garden-path`, `city-circuit`, `mountainstreet`, `ice-track`, `seatrack`, `searound`. The count of 7 predates the addition of `seatrack` and `searound`. Both occurrences need updating to 9.

**Recommended fix:** Replace "7 default tracks" → "9 default tracks" at both line 836 and line 838. SAFE-SMALL-FIX.

---

### DC-02 — Security input-validation layer (Sec-1) undocumented (HIGH)

**Files:** `docs/ARCHITECTURE.md`, `docs/API.md`

The input-validation layer added in commit `4e2f512` (Sec-1 approval) is not mentioned anywhere in the documentation:

- **API.md validation section** (current): `Validation (POST/PUT): name (non-empty string), closed (boolean), worldWidth/worldHeight (numbers), geometry (centerPoints ≥ 2 OR both innerPoints ≥ 2 and outerPoints ≥ 2).` — does not mention:
  - `effects.config.count` must be a finite integer 0–1000
  - Geometry coordinates must be finite numbers with |coord| ≤ 10000
  - `name` has a 100-character maximum

- **Surface-class API.md section**: Does not mention the 100-char `label` limit.

- **ARCHITECTURE.md server section** (lines 777–782): Does not mention the C1/C2/H4 validation additions.

- **`importAllStorage` (H1)** client-side validation is not mentioned in ARCHITECTURE.md's storage/localStorage section.

**Recommended fix:** Update the API.md validation bullet for POST/PUT tracks to include the three new constraints. Add one sentence to the surface-class validation block. Note the import validation in ARCHITECTURE.md's storage section. SAFE-SMALL-FIX.

---

### DC-03 — Upload content-validation + nosniff (Sec-2) undocumented (HIGH)

**Files:** `docs/ARCHITECTURE.md`, `docs/API.md`

The upload hardening added in commit `4ba558f` (Sec-2 approval) is not documented:

- **API.md** background upload entry: `POST /api/tracks/:id/background | Upload background image (multipart/form-data, max 10 MB)` — does not mention:
  - Accepted types: PNG, JPEG, WebP only
  - Validation is against magic bytes (file content), not just the Content-Type header
  - Non-image MIME types are rejected before buffering
  - Response includes `X-Content-Type-Options: nosniff`

**Recommended fix:** Add a "Upload validation" note to the API.md background upload row and to the ARCHITECTURE.md server section. One sentence each. SAFE-SMALL-FIX.

---

### DC-04 — BACKLOG.md:672 Luger Hill rename stale (MEDIUM)

**File:** `docs/BACKLOG.md:672`

```markdown
### P-5 — Luger Hill hex track-ID rename *(backlogged 2026-06-08)*
Luger Hill's track ID is the hex UUID `90d3020197da` ...
```

This item is **complete**. Commit `2410d78` (`refactor(data): rename Luger Hill track id to slug (luger-hill)`) completed the rename: `90d3020197da.json` → `luger-hill.json`, `90d3020197da.png` → `luger-hill.png`, and all script references updated. The live server confirms `luger-hill.json` has `"id": "luger-hill"`.

The backlog entry date says "backlogged 2026-06-08" which is the same day as the rename commit — it appears the item was created and resolved on the same day without being marked complete.

**Recommended fix:** Mark the item ✅ and update the description with the completion commit. SAFE-SMALL-FIX.

---

### DC-05 — Stale component names in ARCHITECTURE.md:629 (MEDIUM)

**File:** `docs/ARCHITECTURE.md:629`

```
Editable via Dev Screen → Camera Advanced section
(Phase 3D: CameraZoomTuningSection + CameraStateHudSection merged into CameraAdvancedSection).
```

`CameraZoomTuningSection` and `CameraStateHudSection` were the names of two separate DevScreen sections before the Phase 3D merge. After the merge (hygiene PR, `e180a6b`), only `CameraAdvancedSection.jsx` exists in `client/src/screens/DevScreen/sections/`. The parenthetical is historically accurate but the section names no longer exist in the codebase and could confuse a developer searching for them.

**Recommended fix:** Simplify to `(Phase 3D: two camera sections merged into CameraAdvancedSection)` — preserves the historical context without referencing names that no longer exist. SAFE-SMALL-FIX.

---

### DC-06 — API.md tree label stale (LOW)

**File:** `docs/ARCHITECTURE.md:107`

```
│   ├── API.md                      # Phase 5 placeholder
```

`docs/API.md` is a 98-line REST API reference document covering the full Tracks API (8 endpoints), Surface-Class API (5 endpoints), and Health endpoint. It is not a placeholder. The label was left unchanged when API.md was fleshed out.

**Recommended fix:** Update to `# REST API reference (Tracks + Surface Classes)`. SAFE-SMALL-FIX.

---

### DC-07 — `apiClient.js` shared HTTP wrapper undocumented in ARCHITECTURE.md (LOW)

**File:** `docs/ARCHITECTURE.md` (services section around line 739)

The ARCHITECTURE.md file-tree includes `api.js` (API_BASE_URL config) but does not list or describe `apiClient.js`. This file is the shared HTTP wrapper extracted in commit `5bdcc68` (J01 refactor): provides `withTimeout` (fetch with timeout + user-facing error message) and `apiCall` (error-propagating fetch wrapper). It is used by `trackApi.js` and `surfaceClassApi.js`.

ARCHITECTURE.md's services section (`client/src/services/`) currently documents only `api.js`. A one-line addition for `apiClient.js` would complete the picture.

**Note:** The associated H-01 hygiene finding (German error strings in `apiClient.js`) makes this even more visible — the fix to those strings requires touching `apiClient.js`, and a developer looking for context in the docs will not find it.

---

### DC-08 — `atomicWriteJson` undocumented in ARCHITECTURE.md (LOW)

**File:** `docs/ARCHITECTURE.md` server section (lines 777–784)

The server architecture section documents atomic writes with: *"atomic write (temp + rename)"* as a parenthetical in the POST/PUT endpoint bullets. But `atomicWriteJson` is the actual utility module (`server/utils/atomicWriteJson.js`) that implements write-to-.tmp-then-rename, including the OneDrive fallback (direct write if rename fails). It is the critical data-safety primitive for the entire server.

It is referenced correctly in AUDIT.md, BACKLOG.md, LESSONS.md, and ROADMAP.md as a completed item. But ARCHITECTURE.md's server section never names or links it, so a new developer reading ARCHITECTURE.md has no entry point to understand why `.tmp` files appear or where to find the write implementation.

**Recommended fix:** Add one sentence in the server section: "All JSON writes use `server/utils/atomicWriteJson.js` (write to `.tmp`, then rename; falls back to direct write on OneDrive where `renameSync` can transiently fail)." SAFE-SMALL-FIX.

---

### DC-09 — Single-server rule and restart-for-code-changes not in SETUP.md (MEDIUM)

**Current state:** `docs/SETUP.md` covers starting the server with `docker compose up` and pointing `VITE_API_URL` at a custom URL. It does **not** mention:

1. **Single-server rule**: Only one server instance should run at a time on port 4000. The security verification for Sec-1 and Sec-2 both required manually killing a stale server process before the new validation code could be tested. A new developer will encounter this confusion.

2. **Restart for code changes vs. rebuild**: `docs/LESSONS.md:590` documents this correctly:  
   ```
   Code change (src/): docker compose restart server
   Package change (package.json): docker compose build
   ```
   But SETUP.md does not include these instructions. A developer who edits a route file and sees old behavior will not know why.

3. **Track JSON re-load**: The server loads track JSON at startup into an in-memory Map. If a `.json` file is modified on disk (e.g., by restoring a backup), the server must be restarted to pick up the change. This is documented in `docs/TRACK_LIFECYCLE.md:246` but not in SETUP.md.

**Recommended fix:** Add a "Working with the server" section to SETUP.md covering the single-server rule, restart-for-src-changes, and track-JSON reload. SAFE-SMALL-FIX.

---

### DC-10 — Lessons L108–L136: location and accuracy (INFO)

**File:** `docs/LESSONS.md`

Lessons are numbered sequentially. The last lesson is **L136** (Speed-Brake Lateral Is a Same-Lane Filter, Never a Brake Driver), added in the feat/open-track-overlap session (2026-06-08). L108 (Suppression beats impulse injection) through L135 are all present, accurately titled, and cross-referenced correctly from ARCHITECTURE.md.

- L108 (`Suppression (delta = 0) Beats Impulse Injection`) — referenced from ARCHITECTURE.md line 487 as `L108` ✅
- L124 (`E2E Tests That Assert Default Config Values Become Latent Failures`) — referenced in AUDIT.md timeline ✅
- L126 (`A Green Metric Only Proves What It Measures`) — present ✅
- L128–L136 — all present, titled correctly, have References sections pointing to the appropriate reports ✅

Lessons are accurate as written. No stale content found in L108–L136.

---

### DC-11 — ARCHITECTURE.md:925 "9 default + 1 user-created" (INFO)

**File:** `docs/ARCHITECTURE.md:925`

```
These parameters were optimized across 9 default tracks + 1 user-created track (Luger Hill)...
```

This is **correct in context**: Luger Hill (`luger-hill.json`, `isDefault: false`) is not in `DEFAULT_TRACK_SEEDS` and is treated as a user-created track by the server. The physics sweep ran on the 9 seeded defaults plus Luger Hill as an additional user-created track. The description accurately reflects the data used for the sweep, not the current count of seeded defaults. No change needed.

---

## Summary: Missing Coverage for New Pieces

The spec asked to verify that ARCHITECTURE.md covers the new pieces added recently. Status:

| New piece | In ARCHITECTURE.md? | In API.md? | Notes |
|-----------|-------------------|-----------|-------|
| Geometric two-axis avoidance gate | ✅ line 505 | — | Well documented |
| Body-sizing scale cleanup | ✅ lines 231–299 | — | Load-bearing section added 2026-06-07 |
| Camera focal-smooth | ✅ implied in CameraDirector section | — | `focalSmoothTc` in defaults |
| Effects / surface classes | ✅ lines 700–730 | ✅ full API section | Well documented |
| `apiClient.js` shared wrapper | ❌ not mentioned | — | DC-07 |
| `atomicWriteJson` | partial (parenthetical only) | ✅ "Atomic writes" bullet | DC-08 |
| Input validation layer (C1/C2/H1/H4) | ❌ not mentioned | ❌ not in API.md | DC-02 |
| Upload content-validation + nosniff (C4) | ❌ not mentioned | ❌ not in API.md | DC-03 |

The three most urgent documentation gaps are the security validation layer (DC-02), the upload rules (DC-03), and the stale "7 default tracks" count (DC-01).
