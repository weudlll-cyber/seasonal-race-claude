# RaceArena — Backlog

Living list. See ROADMAP.md for phase context and completion status.
Items ranked by urgency within each bucket. ✅ = done, 🔜 = next, ⏳ = waiting on dependency.

---

## Phase L — Local Backend

| Item | Status | Description |
|---|---|---|
| ✅ **L.1** | PR #43 | Backend skeleton: `server/` (Express, Port 4000), Dockerfile, docker-compose.yml, `GET /api/health`, frontend config hook in `client/src/services/api.js`. |
| ✅ **L.2** | PR #44 | Track API: `GET /api/tracks`, `GET /api/tracks/:id`, `GET /api/tracks/:id/background`. Space track migrated from snapshot. 12 backend tests. |
| ✅ **L.3** | PR #44 | Frontend integration: `trackLoader.js`, `useServerTracks` hook. SetupScreen + TrackManager + RaceHistory use combined list. Geometry caching in localStorage. 14 tests. |
| ✅ **L.4** | PR #44 | Offline cache: `trackCache.js` — background images as data-URLs, 3 MB limit with LRU eviction, quota guard. `getTrackBackgroundUrl` offline-aware. 6 tests. |
| ✅ **L.5** | PR #44 | Write path: POST/PUT/DELETE + background upload endpoints (server). TrackEditor async-save to server, retry UI when server not reachable. Migration on first connect (localStorage custom tracks → server, markers). Cache cleanup: deleted server tracks are removed from localStorage + background cache. TrackManager Edit opens TrackEditor (/track-editor?load=), Delete calls API. Server badge removed. 10 MB image limit. +23 frontend tests, +16 backend tests. |
| ✅ **L.6-Bug1** | PR #44 | Edit consistency: Edit now opens the metadata modal for ALL track types (Default, Local, Server). In the modal the "Edit Geometry" / "Draw Geometry" button navigates to the track editor. +8 tests. |
| ✅ **L.6-Bug2** | PR #44 | Geometry index sync: `cacheTrackGeometry` now registers server geometries in `racearena:trackGeometries:index` via `registerInIndex`. `removeCachedTrackData` deregisters via `unregisterFromIndex`. As a result server geometries appear in the modal dropdown + "📐 Edit Geometry" button correctly. Edit-Geometry button in button row without marginLeft:auto. +7 tests. |
| ✅ **L.6-Bug2-UX** | PR #44 | Edit modal UX: Edit-Geometry button below track geometry dropdown (not in action row). Effects display removed; note "Background image and effects are managed in the Track Editor" added. Action row now only contains Save/Cancel. +5 tests. |
| ✅ **L.6-VIS** | PR #44 | Track editor visibility improvement (iter 2): A1 — 60% black overlay. A2 — lines magenta (#FF00FF) instead of light blue. A3 — white outline behind each line (outline 5–6px, color 3–4px). A4 — width boundaries 1→3, center line + curves 3→4. A5 — control points white/dark unchanged. `drawStaticScene` in `trackEditorDraw.js` (testability). +18 tests. |
| ✅ **L.6-BgBug** | PR #44 | Image upload reset track: `handleBgUpload` deleted `centerPoints`/`innerPoints`/`outerPoints` when image dimensions differed from editor world. Fix: reset block + `window.confirm` dialog removed — dimension change accepted, track preserved. +1 regression test. |
| ✅ **L.7-Bug2** | PR #62 | Default tracks without geometry: all 5 default tracks (Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit) had `geometryId: null` — never playable. All 5 geometries drawn in the track editor and committed as server JSON + background images (2026-05-02). Tracks remain editable. |
| ⏳ **L.8-Hybrid** | planned | Hybrid concept: default tracks should work "offline-first" (without backend). Currently default tracks are metadata-only in code, server tracks fully on backend. When backend is unreachable, custom tracks are not playable. Discussed 2026-04-29. |
| ⏳ **L.9-Status** | planned | Server connection status visible in UI: display whether backend is reachable (green/red dot or similar), so the user knows why custom tracks are not loading. Discussed 2026-04-29. |

> ⚠️ **Add auth before VPS deployment!** Currently every browser visitor has full write access to all tracks (no auth on write endpoints). Phase 5 must implement JWT/auth before go-live. |

---

## Hot — next PR

### 1 — Camera Phase + RaceScreen Refactor 🔜 Hot — Concept ✅ (PR #60) — Implementation starts with PR-A1

**Concept documentation sprint fully completed. PR #60 merged 2026-05-03.**
Authoritative specification in `docs/CAMERA_DIRECTOR.md` (13 sections, all §13.2 questions UI-1–UI-8 answered).

**3 structural bugs identified** (empirically from code analysis):
- ✅ **Bug A** (Garden Path P1): OVERVIEW pan is a no-op — **fixed** `overviewClosedTrackZoom=1.3` multiplier, schema v15, DevScreen slider. (2026-05-27, squash `749c2a4`)
- **Bug B** (River Run P2): zoom inversion on large open tracks — LEADER_ZOOM zooms out instead of in (effZoom=1.5×0.298=0.447 < OVERVIEW=1.5)
- **Bug C** (River Run P3): `openTrackPanTarget` uses all racers instead of focus group — shows pack center instead of leader

**Q-25 root cause identified and solution decided:**
- `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` in `defaults.js:112` → Fix: `maxScale=10.0`
- Space Sprint at ~131 px/s (reference), race duration ~144s
- Open tracks: duration slider in setup screen, finishT dynamically from track physics

**Camera direction philosophy decided (TENDENCY LOGIC, not constraint system):**
LEADER_ZOOM as default tendency, lead-group duels trigger BATTLE_ZOOM (minGapInSpitzengruppe),
sprite corridor [min, max] as hard camera constraints, OVERVIEW random jitter [15s–25s].
N=4–100 considered; lead group = clamp(round(N×0.1), 3, 10). Cross-reference: D7d.

**Sub-PR plan (9 PRs):**
- ✅ PR-A1: Q-25 fix (maxScale=10) + duration slider + finishT for open tracks (2026-05-03)
- ✅ PR-A2-Diagnose: read-only PR → `docs/SPEED_REFACTOR_ANALYSIS.md` (no code change) (2026-05-03)
- ✅ PR-A2: Speed pipeline architecture refactor — `computeRaceBaseSpeed`, speedScaleFactor removed, closed-track duration slider (Model D), SpeedScaleSection removed (2026-05-03). **Fix commit 2026-05-04:** speedMultiplier normalization + spreadMinFactor (E1+E2).
- ✅ PR-A2.5: Arc-length-uniform spline resampling + relative jitter (2026-05-04)
- ✅ PR-A2.6: Race dynamics — spreadFactor re-roll (±85%, 5s transition) + speedBonusMult separation (2026-05-04). draftingBoost unchanged 1.10.
- ✅ PR-A3: Dev panel reorganization (tier system, Race Tuning section, raceDynamicsConfig). (2026-05-04)
- ✅ **Phase 4 (Timing Tunables + Plan-B Pan):** 7 timing tunables, battleMaxDurationMs, OVERVIEW jitter, diagnosis HUD, `_computePanScale` removed, trivial pan formula. (2026-05-06) — Branch: `diagnosis/camera-tuning-effectiveness`
- PR-B: Camera bug fixes (Bug A+B+C)
- PR-C: RaceScreen split (Q-7 refactor, no behavior change)
- PR-D: Camera state machine (OVERVIEW random jitter, tension-strength logic, findBattleCandidate)
- PR-E: Sprite corridor [min+max] + tag visibility iter 1 (B-UX1) + dev panel sliders for both values
- PR-F: Dev panel camera tunables + HUD overlay
- PR-G: UI bugs (Cancel Race + Fullscreen API)

Approach: PR-A1 → PR-A2-Diagnose → PR-A2 → PR-A3 → Phase 4 → PR-B → PR-C → PR-D → PR-E → PR-F → PR-G.

### 2 — Player Group Selection 🔜 PRIORITY 1 after Camera Phase

The game master selects in setup which player group enters the race (e.g. "Group A", "All", "Selection").
Currently all configured players are always shown — there is no mechanism for subgroups.

**Use cases:**
- Tournament with multiple groups: only Group A races in round 1, Group B in round 2
- Ad-hoc race with participants from the full roster
- Quick selection without manually deselecting all inactive players

**Requirements (spec still pending):**
- Player groups definable in `PlayerGroupsManager` (group name + player assignment)
- Setup screen: selection filter "Which group races?" before race start
- No change to the race engine — only which players end up in `sessionStorage.activeRace`
- UI principle 1: everything configurable (group names, sizes, assignments) without code changes

**Priority:** First priority after the camera phase is complete. Before D8 (full racer editor) and Surface Zones.

---

### Race Duration Recalibration for Race End ⏳ Low Priority

**Status:** Accepted with doc clarification (PR-A2.6). No user complaint trigger so far.

Currently `race_baseSpeed` is calibrated to the **median racer**. Race end (last finisher) can
deviate ±6–8% from `targetDuration` — intrinsically due to the spread mechanic (minimum of N draws
from U[spreadMin, spreadMax]).

If user complaints about race duration deviations ever arise:
- Calibrate `race_baseSpeed` formula to **race end** instead of median (different `E[min_n]` correction)
- Race end would then be within a ±5% guarantee

**Effort:** 1–2 days. Including re-verification of all race tests.
**Priority:** Low. Currently accepted with explicit doc clarification in ARCHITECTURE.md.

---

### TLH — Track Lifecycle Hybrid — TLH-1 ✅ TLH-2 ✅ Track Delete Safeguards ✅ → TLH-3 ⏳ deferred

Three conceptual problems were uncovered while attempting to draw default track geometries (user browser test 2026-05-01, data loss bug):

1. "Draw Geometry" button opens blank track editor without preset context → creates a new unconnected track
2. Backend PUT ignores client geometryId (`existing.geometryId` hardcoded) → geometry link is broken on save
3. Track delete deletes associated geometry via `removeCachedTrackData` without usage check
4. Default tracks exist only as code constants, not as server records → UI flow for them does not work

**TLH-1 — Backend Fixes + Migration (Sub-PR 1) ✅**
- ✅ Server boot migration: 5 default tracks created as server records (idempotent via one-shot marker `.tlh1-defaults-migrated`)
- ✅ PUT `/api/tracks/:id`: `geometryId` taken from client if present in body; otherwise `existing.geometryId` kept
- ✅ DELETE + `removeCachedTrackData`: geometry is NEVER automatically deleted — only background cache
- ✅ Auto-backup: on every PUT/POST to `server/data/tracks-backups/YYYY-MM-DD/HH-MM-SS-mmm-<id>.json`
- ✅ atomicWriteJson OneDrive fallback: renameSync error → direct writeFileSync
- ✅ 10 new backend tests (geometryId ×3, backup ×3, default seed ×4), 1 new client unit test

**TLH-2 — UI Flow + Cleanup (Sub-PR 2) ✅**
- ✅ Edit modal: geometry dropdown replaced with status display ("Geometry: drawn (XX pts)" / "Geometry: not yet drawn" + "Draw/Edit Geometry" button)
- ✅ Track editor: two-mode — load mode (`?load=<id>`) shows "Editing: X" without name input, new mode shows "New Track" with name input
- ✅ Track editor load path: two-path load — (1) geometry cache, (2) direct server track state for `geometryId: null` tracks
- ✅ Track editor save path: load mode → PUT with geometryId generation on first draw; new mode → POST
- ✅ 17 new unit tests (12 TrackEditor.loadmode.test.jsx + 5 net TrackManager.test.jsx)

**TLH-2 Post-Merge Bug Fixes (branch extension after browser test)**
- ✅ F2: `hasGeo` read `innerPoints.length` (always 0 due to `toSummary` strip) → now `geometryId != null` + `pointCount` via extended `toSummary`
- ✅ F4: track editor opened scrolled to canvas (no scroll reset on navigation) → `window.scrollTo(0,0)` on mount + `scrollIntoView` on `serverError`
- ✅ F1-revised: save in load mode was blocked when no background → background only required in new mode; load mode always saveable
- ✅ Lesson 39 + 40 documented in LESSONS.md
- ✅ F2 follow-up: `autoMaxRacers` in `handleEdit` used `isServer ? track` as EditorShape input → crash (TypeError: `undefined.length`) because `toSummary` strips `innerPoints`. Fix: always use geometry cache instead of server summary. L39 extended with audit pattern.

**Track Delete Safeguards (PR #58) ✅**
- ✅ "Remove background" button in track editor (next to background upload, appears when image is loaded)
- ✅ `DELETE /api/tracks/:id/background` endpoint — removes only the image, leaves track record intact
- ✅ `DELETE /api/tracks/:id` returns 403 for default tracks (`isDefault: true`) — prevents accidental deletion
- ✅ `migrateDefaultTracks()` runs on every boot (idempotent) — restores missing default records
- ✅ React key=null fix in TrackManager geometry select
- ✅ Background image useEffect race condition fix (L43) — cancelled flag prevents stale onerror callbacks

**TLH-3 — Code Fallback + Status Banner + Export (Sub-PR 3) ⏳ deferred until after Camera Phase**
- Frontend load order: server → cache → code bundle (`defaultTracks.js`)
- Code bundle initially with empty geometries (bootstrap)
- Status banner when code bundle mode is active: "Server unavailable — showing default tracks (limited functionality)"
- Export button in dev screen: writes current server tracks as JSON snapshot (user commits manually)

> **Order matters:** TLH-1 makes the system safe (backup + no data loss bugs), TLH-2 makes it usable (correct UI flow), TLH-3 makes it resilient (offline fallback). TLH-3 was deferred until after the Camera Phase. See `docs/TRACK_LIFECYCLE.md` for the full spec.

### 1a — Draw Default Tracks ✅ Completed 2026-05-02

All 5 geometries drawn and saved in the track editor:
- ✅ Dirt Oval
- ✅ River Run
- ✅ Space Sprint
- ✅ Garden Path
- ✅ City Circuit

Additionally: Space (Custom Track) already present.

- **D7d** — 100-racer performance (spatial grid, smarter camera, LOD) — deferred until after Camera Phase

---

## Ready — spec exists, concept decided

- **Visual Racer Effects** — Surface-class-driven trail system. Four sub-PRs:
  - ✅ **VRE-1** — Foundation: 4 generator modules (`particle`, `cloud`, `splash`, `line`), 9 default surface classes, registry with override resolution, `/api/surface-classes` backend API (CRUD, atomic writes), `surfaceClassLoader.js` cache, `surfaceClassApi.js` service layer. 64 frontend + 24 backend tests. No UI, no race integration.
  - ✅ **VRE-2** — Surface class editor in dev screen. Master-detail layout: class list with Default/Modified/Custom badges on the left, animated live preview canvas + generator config editor on the right. `SurfaceClassManager.jsx`, `SurfaceClassPreview.jsx`, `useSurfaceClasses.js`. 36 new unit tests + 31 new e2e tests (smoke + UX verification). 1084 unit + 183 e2e tests total.
  - ✅ **VRE-3** — Racer/track association: `surfaceClasses` on SpriteRacerType + `getSurfaceClasses()`, all 12 racer types with classes, surfaceClasses in TUNABLE_FIELDS + CONFIG_SNAPSHOT, `filterRacerTypesForTrack()` in registry.js, surfaceClasses on DEFAULT_TRACKS + server migration, pill multi-select UI in RacerEditModal + TrackManager, SetupScreen filter + surface hint. 1134 frontend + 60 backend tests. 2 Playwright specs (smoke + UX verification) written.
  - ✅ **VRE-4** — Race integration: `trailResolver.js` with `resolveTrailEmitter()`. RaceScreen dispatches trail via emitter per racer; home trail fallback when no match. `trackSurfaceClasses` in raceData. 14 new unit tests + Playwright specs.

---

## Completed Items (Phase Completions)

| Item | PR | Description |
|---|---|---|
| ✅ **D3.5.1** | #13 | SpriteRacerType config-driven base class, tintSpriteWithMask |
| ✅ **D3.5.2** | #15(?) | Horse/Duck/Snail → SpriteRacerType migrated, `_createTrail` removed |
| ✅ **D3.5.3** | #16 | 9 new racer types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane, F1, Rocket) |
| ✅ **B-7** | #17 | Dev screen UI drift: code registry as single source of truth, racerTypeOverrides map |
| ✅ **B-8** | #17 | SetupScreen footer/pills emoji mapping: from getRacerType().getEmoji() instead of hardcoded map |
| ✅ **W3** | #17 | Session-only racer override selector in setup track tab, filters disabled types |
| ✅ **B-9** | #17 | Test-3.1 filter: override selector shows only active types |
| ✅ **Q-1 to Q-5** | #17 | Dead exports, unused imports, TODO tags, JSON.parse hygiene, file headers |
| ✅ **D9** | #19 | Race engine speed refactor: speedMultiplier affects race speed, explicit lap/time choice, dynamic finish line for open tracks, runout behavior, 2s result delay, 22 Playwright e2e tests. Master `dad3300`. |
| ✅ **D3.5.5** | #21 | Per-type tuning UI in dev screen: 6 fields (speedMultiplier, displaySize, basePeriodMs, leaderRingColor, leaderEllipseRx, leaderEllipseRy) live-apply via edit modal. CONFIG_SNAPSHOT, normalizeOverrideMap (legacy migration), InfoTooltip component. 678 unit + 36 e2e tests. Master `2d76bc3`. |
| ✅ **D10** | #23 | Track size variability + auto sprite scaling + image-first workflow. worldWidth/worldHeight automatically from image dimensions (naturalWidth/naturalHeight). Hard limit 8000×4096. Image required to save. Dimension mismatch dialog. TrackEditor zoom+pan. trackWidth variable. Auto sprite scaling formula. All 8 requirements (A1-A8) met. Hotfix `13a2dd2` (🏁 default icon). 694 unit + 75 e2e tests. Master `13a2dd2`. |
| ✅ **B-Wave** | #25 | UX polish sweep: B-1 (player group load StrictMode fix), B-3 (winners max 5→20), B-10 (InfoTooltip auto boundary), B-11 (display size tooltip), B-12 (maxPlayers configurable), B-13 (language selector removed), B-14 (TrackManager hint), B-15 (all German UI strings → English). 694 unit + 88 e2e tests. Master `697e081`. |
| ✅ **B-16 + B-17** | #26 | Large tracks: B-16 CameraDirector adaptive zoom (zoom = worldW/VIEW_W, max 6), B-17 track speed scaling (baseSpeed ÷ pathLengthPx/referencePathLength). pathLengthPx calculated on track save + migration for existing geometries. SpeedScaleSection in dev screen. 719 unit + 100 e2e tests. Master `7cdde15`. |
| ✅ **fix/list-tracks** | #27 | Root cause fix for large-track render bug: `listTracks()` did not return worldWidth/worldHeight → bsX=1.0 → only ~549px visible on 6000px world. A1: 2-line fix in trackStorage.js. A2: migration IIFE in storage.js. 723 unit + 103 e2e tests. |
| ✅ **fix/camera-polish + Q-14** | #28 | CameraDirector: adaptive zoom (zoom=worldW²/VIEW_W/worldW, clamp 0.15–6), clampOffset 2-anchor formula, top-3 focus. cameraZoomFactor invariant (REFERENCE_CAMERA_ZOOM/cam.zoom, closed tracks only). BaseSpeedSection in dev screen: tunable min/max baseSpeed, spread preview, 2-lap gap estimate. Q-14 lapUtils SoT: DEFAULT_BASE_SPEED_CONFIG from defaults.js, private constants, optional params on openTrackFinishT/estimatedSecondsPerLap. camera-polish-ux-verification.spec.js (31 tests, permanent). 759 unit + 157 e2e tests. Master `750d826`. |
| ✅ **D11** | #30 | Racer behavior: soft avoidance + drafting. Asymmetric avoidance (trailer yields, leader holds lane) — eliminates symmetric force cancellation in packs. Proximity-scaled force, configurable avoidanceDistance/lateralForce/maxLateral. Speed brake for adjacent racers. Drafting boost for close followers in same lane. World-edge camera clamp (finding 2, prevents black strips at high zoom). Camera-zoom-aware sprite scaling for open tracks: `computeOpenTrackCameraZoomFactor()` produces identical on-screen size as closed-track reference at any zoom. Pixel-floor logic: `minVisiblePixels` (default 32) ensures sprites never vanish on wide tracks. All 5 params tunable in dev screen. 809 unit + 183 e2e tests. Master `d46cab2`. |
| ✅ **D7a** | #33 | Proportional sprite scaling + min-size floor + relative zoom ratios + label scaling. cameraZoomFactor + REFERENCE_CAMERA_ZOOM removed. computeRenderDisplayScale as single source of render pipeline: max(proportionalScreenPx, minTargetScreenPx). CameraDirector: overviewZoom × ratio per state (LEADER:1.4, BATTLE:1.6, COMEBACK:1.3). Label scaling with effZoom. Q-15 structurally addressed: 4 scaling factors → 1 pipeline. 808 unit + 183 e2e tests. Master `a49baa0`. |
| ✅ **D7a-Plus** | #35 | Per-type minTargetScreenPx with live preview. Slider + animated canvas preview in RacerEditModal. Global default hint, modified badge, reset. getEffectiveMinTargetScreenPx() in render pipeline. Scroll indicator follow-up (fade gradient). CC smoke test convention: verification sources clarification. Master `27cba65`. |
| ✅ **D7b** | #37 | Lane-free: physicalY system fully replaces currentLaneY/targetLaneY. physicalY ∈ [-1,+1] (0=centerline). Home force spring, anisotropic avoidance distance (t×tWeight + physicalY×yWeight), cone drafting (world coordinates), speed brake for adjacent racers, soft repulsion + hard clamp. 13 new/updated tunable parameters in dev screen. Lane code hard removed. Unit + e2e tests updated. |
| ✅ **D7b-fix B1+B2** | #37 | Follow-up commit on branch D7b: B1 — start spread: racers start evenly distributed over [-startSpreadRange, +startSpreadRange] instead of all at physicalY=0 (computeStartPhysicalY, new dev screen parameter). B2 — yDiff=0 edge case: when both racers have the same physicalY, no lateral force is applied (prevents all trailers flying toward +1). |
| ✅ **D7b-fix B3** | #37 | Anti-stacking (force imbalance, was listed as D11 finding in backlog): avoidance forces are normalized by sqrt(neighborCount) — prevents boundary clinging with 20+ racers where linear force accumulation overwhelmed restoring forces. New defaults: homeForceStrength=0.04 (+122%), softRepulsionStrength=0.10 (+67%), lateralForce=0.010 (−33%). |
| ✅ **D7c** | #39 | Row start + speed bonus + track capacity. `computeRowLayout` (shuffled, row assignments), `computeRowPhysicalY` (full spread also for last incomplete row), `computeSpeedBonus` (factor 1.0 = pole-neutral), `computeMaxRacersDefault` (auto capacity from pathLengthPx). Closed tracks: back rows start at negative t (tPos wraps correctly). Open tracks: t=0 through EditorShape clamp. `maxRacers` on track with "modified" badge. Setup screen: row hint + capacity warning. Dev screen row start section: 4 parameters. 21 unit + 6 e2e tests. |
| ✅ **D7c-fix** | #39 | Bug: `trackWidth` metadata (140 px, calibrated for 1280px world) gave `racersPerRow=1` on large worlds (6000px) → all 20 racers in single rows → single vertical line. Fix phase 1: `EditorShape.getActualTrackWidth()` measures real geometric width (median, cached). Fix phase 2 (D7c-fix-v2): formula completely in world pixel space: `computeRacersPerRow(geometricTrackWidthPx, spriteWorldSizePx)` = `floor(2×geometricW/spriteWorldSizePx)`. `trackWidth` field completely removed from track data model — TrackManager dropdown (100/140/200/280/360) removed, `raceData.trackWidth` and `track.trackWidth` removed from all callers, storage migration: old entries ignored. `autoSpriteScale` now uses `getActualTrackWidth()` instead of metadata. Fix phase 3 (D7c-fix-v3): floating-point rounding error in catmullRom spline (~10⁻¹³) led to `racersPerRow=11` instead of 12 when Rocket displaySize override (50px) disabled auto scale → `getActualTrackWidth()` now rounds median via `Math.round()`. |
| ✅ **D7c-Phase4** | #39 | Three fixes on feat/d7c-row-start-with-speed-bonus. (1) **startSpreadRange 0.7→0.95**: default increased; migration: saved value 0.7 is updated to 0.95 on load. (2) **Formula mismatch fix**: `computeRacersPerRow` now receives `effectiveWidth = geometricWidth × startSpreadRange` — packing calculation now matches actual racer distribution (before: formula used 100% of track width, distribution only 70%). Updated in RaceScreen, TrackManager, SetupScreen. (3) **Open track layout**: a) Assembly area — rows start at `t = (totalRows − rowIndex) × deltaT_per_row` instead of negative t → no more clamping, all rows within track. b) `runoutZone` parameter (default 0.05) — finish line on open tracks at `1.0 − runoutZone` (tunable in dev screen). No more `openTrackFinishT` in RaceScreen. Setup screen shows finish % from runoutZone. Migration for startSpreadRange + runoutZone validation in loadRaceBehaviorConfig. |

| ✅ **D7b-fix B4** | #98 | Free-lane separation + home force reduction. Additive impulse logic on geometric overlap: `isSideFree()` checks left/right space against all other active racers; deterministic direction choice via `stablePairBit` when exactly equal physicalY. `homeForceReductionOnOverlap: 0.3` — home force reduced to 30% during geometric overlap so free-lane can complete the separation. Geometry metadata (spriteWorldSizePx, geometricTrackWidthPx, pathLengthPx) passed from RaceScreen to racer. `reRollVariationPercent: 45 → 58`. 13 new unit tests. 94 files / 1741 tests. |

| ✅ **Priority System** | #100 | 4-mode home force priority system (Phase 2). OVERLAP / COOLDOWN / BLOCKED / NORMAL — home force only active in NORMAL, so free-lane and avoidance resolve collisions first. `priorityExtras` param in `applyRacerBehavior`; legacy path (`homeForceReductionOnOverlap`) kept for tests. Escape hatch: after `blockedTimeoutFrames` (default 60) consecutive BLOCKED frames, `blockedEscapeForce × homeForceStrength` (default 30%) kicks in. M-overlay: colored rings, frame count, avg/max stats, blocker detail panel. DevScreen: PrioritySystemSection with cooldownMs, blockedTimeoutFrames, blockedEscapeForce. **BLOCKED check iterations:** (1) bounding box (false positives — Decision Log #9) → (2) line segment distance (too restrictive, racers with forward movement on path block incorrectly) → (3) **target point check** (final): checks only point (r.t, physicalY=0), distance < spriteSize → BLOCKED; reactive per frame, no lookahead needed. `lookaheadFrames` removed from DevScreen. |
| ✅ **Phase 3B** | squash `07bea7b` | BATTLE_ZOOM (isolation+greedy expansion+centroid), COMEBACK_ZOOM (green ring, globalAlpha), LEAD_CHANGE_ZOOM (lead change). Direction system: weighted candidate pool + OVERVIEW scheduler. Fixes: OVERVIEW zoom fix (L83), OVERVIEW pan jump (L84), ctx.filter→globalAlpha (L86), overlay sets clear. 3 new HUD components. +54 unit. 2041/2041 ✅. Master HEAD `07bea7b`. |

- **B-6** (speedMultiplier bug) — subsumed by D9. Was planned as a separate fix,
  fully resolved by the D9 refactor (PR #19).

---

## Phase 3B — Open Follow-up Items

| Item | Priority | Description |
|---|---|---|
| ✅ **chore/sprite-scale-relative** | Done `6a9dcfc` 2026-05-24 | `spritePx` → `spriteScale` (schema v14). Relative factor, racer-count-independent (L82). Defaults: OVERVIEW 1.00, LEADER 1.81, BATTLE 2.81, COMEBACK 1.39, LEAD_CHANGE 1.81. FALLBACK_REFERENCE_SPRITE_SIZE = 36 px. Side fix: LEAD_CHANGE was missing from `CameraStateHUD.STATE_CONFIG` — fallback `?? OVERVIEW` showed wrong badge (L87). |
| ✅ **Phase 3D** | Done `bcdedb8` 2026-05-25 | FINISH_OVERVIEW, BATTLE/COMEBACK fixes. See Phase 3D — Open Follow-up Items. |
| ✅ **Camera centering architecture** | Done 2026-05-26 | Root cause fix: all four phasedEnabled states (LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM, LEAD_CHANGE) now center on racer world position during follow phase. `_setTargets` sole owner of `targetOffsetX/Y`; `_computePhasedPanTarget` state-controller only. See `docs/camera-target-architecture.md`. Lesson 37. 2134/2134 tests ✅. |
| ✅ **Bug A** | Done 2026-05-27 `749c2a4` | OVERVIEW pan no-op on closed tracks — `overviewClosedTrackZoom=1.3` multiplier in all three closed-track OVERVIEW branches + transition snap. Schema v15. DevScreen slider. 2134/2134 tests ✅. |
| ✅ **Bug 1** | Done 2026-05-27 `2f417ba` | LEAD_CHANGE spriteScale dead config — `_leadChangeZoom` added to all three `_computeZoomLevels` branches; `_transition` hard-cut and `_setTargets` LEAD_CHANGE now use `_leadChangeZoom` instead of `_leaderZoom`. No config or schema change (schema v14 LEAD_CHANGE spriteScale field now takes effect). +3 tests. 2137/2137 ✅. |
| **COMEBACK vs LEADER_ZOOM priority** | Medium | COMEBACK_ZOOM activates even when a racer is only slightly behind. Threshold calibration: how far back does a racer need to be to justify COMEBACK? Measurement in real races: how often is COMEBACK activated vs displacing LEADER_ZOOM? |
| **Sim parity open track ranking** | Medium | Open track ranking (projected world position) is not yet mirrored in sim-fairness.mjs. Sim still uses raw t-value for standings. For correct fairness statements on open tracks, the sim standings must match the browser standings (sim-browser parity rule). |

---

## Phase 3D — Open Follow-up Items

| Item | Priority | Description |
|---|---|---|
| **FINISH_OVERVIEW timing calibration** | Medium | `finishOverviewLookbackPx` (300) and `finishOverviewZoomOutDurationMs` are starting defaults. Check in real races: is the leader visible at the edge of the frame when the pan ends? Is the zoom-out speed appropriate? Adjust if needed. |
| **COMEBACK frequency analysis** | Medium | After threshold relaxations (outcomePhaseThreshold 0.75→0.65, comebackMinStartGap 0.40→0.25) check: how often does COMEBACK activate now? Too frequent = operator irritation. Sim parity for COMEBACK trigger not yet achieved. |
| **BATTLE rank span empirical validation** | Low | `battleMaxRankSpan: 5` is a starting default. Measure in 20-racer races with real pack situations whether rank span 5 filters correctly or is too restrictive. |

---

## Planned — needs spec

### Phase D (Racer Design Development)

- **D3.6** — File reorganization: `racer-types/` → `racer-configs/` (39 files).
  Separates configuration from engine code. Small standalone PR.
- **Surface Zones** (follow-up phase after Visual Racer Effects) — local surface class overrides
  within a track (e.g. puddle on asphalt, mud pit on dirt). Track editor gets a
  zone drawing tool; `EditorShape` gets `getZonesAtPosition(t, offset) → Zone[]`. Planned
  once Visual Racer Effects is complete.
  *(Previously tracked as D6 / RTE reservation — `rteDefinitions` placeholder on SpriteRacerType will be
  replaced by Surface Classes; old placeholder cleaned up in VRE-1.)*
- ✅ **D7a** — Proportional sprite scaling + min-size floor + zoom ratios + label scaling (PR #33, master `a49baa0`)
- ✅ **D7a-Plus** — Per-type minTargetScreenPx with live preview (PR #35, master `27cba65`)
- ✅ **D7b** — Lane-free: physicalY replaces lane system (PR #37)
- ✅ **D7c** — Row start + speed bonus + track capacity (PR #39)

- 🔜 **D7d** — 100-racer performance
  - Spatial grid for O(N) avoidance performance
  - Smarter camera for pack overview
  - LOD or similar strategies for 100 racers
- **D8** — Full racer config editor: coats edit UI, all fields, sprite swap UI.
  Builds on override pattern (B-7).

### Phase B (Wiring Gaps + UX Improvements)

- **B-UX1** — Name tag readability (iteration 1, to be implemented in PR-E of the camera phase)
  - Spec in `docs/CAMERA_DIRECTOR.md §6.3`
  - Top-N tags visible (N = `tagVisibleCount`, default = lead group = clamp(round(N×0.1), 3, 10))
  - `tagVisibleCount` as dev panel slider
  - No "own player" (project principle 3) — all racers treated equally
  - All other racers without tag

- **B-UX1-Iter2** — Name tags state-dependent strategy (iteration 2, after iteration 1)
  - Spec in `docs/CAMERA_DIRECTOR.md §6.4`
  - OVERVIEW: top-3 only or no tags; LEADER_ZOOM: lead group prominent;
    BATTLE_ZOOM: involved racers prominent; zoom out: anti-overlap when space permits
  - User explicitly wants to implement this once iteration 1 is stable
  - Priority: after PR-E (camera phase)

- **B-UX-Pause** — Pause + resume race
  - During a running race, pause button → freeze rAF loop, resume → continue
  - Explicitly NOT part of the camera phase (PR-G only implements Cancel Race with confirm dialog)
  - Priority: after camera phase

- **B-UX-ManualFocus** — MANUAL_FOCUS: game master click on racer locks camera
  - Canvas click handler + hit test racer + new MANUAL_FOCUS state in CameraDirector
  - Lock UI indicator, unlock mechanism (click empty / button)
  - Effort: ~150–200 LOC, new camera state
  - Priority: after camera phase (too complex for this phase)

- **B-UX2** — Dev screen cleanup + help screen
  - Dev screen has grown to 30+ tunable values across D9/D10/D11/D7a/D7b.
    User finding: "the individual values are hard to contextualize, tooltips alone add little value"
  - Planned (spec still pending):
    - Structural reordering: race behavior sliders together, visual sliders together, etc.
    - Help modal per section with more detailed explanations (more than InfoTooltip)
    - Optional: beginner / advanced separation (power user sees everything, standard only key values)
    - Optional: visual preview components in sections where useful (analogous to D7a-Plus)
  - Priority: medium-high. Should be tackled before D8 (full racer config editor),
    so D8 is not built into a disorganized dev screen environment.

- **B-UX3** — Detailed variable documentation
  - User finding: "I need an explanation that says more than the tooltip — what do all
    the variables in the dev screen actually do"
  - Planned (spec still pending):
    - A separate doc file per section or a central DEVSCREEN_REFERENCE.md under docs/
    - Per parameter: name, type, default, range, effect in plain language,
      example values for different use cases (small race vs. large race, etc.)
    - Diagrams/images where useful (e.g. comfortThreshold visualized)
    - Cross-references to ARCHITECTURE.md pipeline sections
  - Priority: together with B-UX2 — the help screen can reference or embed the documentation.
    Can also be created as a pure documentation sprint before B-UX2, then B-UX2 uses the content.

- **B-UX-MinMax** — Dev panel min/max pairs UX: replace silent rejection with visual warning, consistent for speed range (RaceTuningSection) + overviewCooldownMin/Max (CameraZoomTuningSection) + any future min/max pairs. Currently an invalid value (min > max or max < min) is silently ignored — no feedback for the user. Fix: red border or inline text ("Min must be less than Max") when limit is violated. Small standalone PR.
  *(Arose during Phase 4 slider implementation 2026-05-06, Severity: LOW — currently consistent with existing speed range convention)*

- **B-UX4** — Sprite size system overhaul
  - Current behavior: per-type overrides (e.g. `displaySize: 50` for Rocket) are absolute
    values and completely disable auto scaling (`displaySizeScale = 1`). This means
    sprites can appear too large on narrow tracks — and was one of the factors
    that led to an incorrect `racersPerRow` value during D7c diagnosis.
  - Alternative concepts (spec still pending):
    - **(a) Override as multiplier** over auto scaling (e.g. `displaySizeOverride: 1.25` = 25% larger than auto)
    - **(b) Mixed mode with min/max limits** — auto scale runs, override sets upper/lower bound
    - **(c) Complete redesign of the tunable concept** — auto and absolute value as selectable modes
  - Arose during D7c diagnosis (2026-04-29). Needs vision discussion before spec is written.
  - Priority: low. Currently not a UX blocker — only visible with deliberate displaySize override + large track.

- **B-2** — TrackSelector: custom track behavior when geometry is missing
- **B-4** — Apply branding profiles to race/result screen (UI exists, wiring missing)
- **B-5** — System backup/restore/reset: end-to-end verified (UI-only so far)


### Phase Q (Quality Hygiene)

**Refactor chunks (high structural debt — addressed in upcoming phases):**

- ✅ **RaceScreen/index.jsx split** (Q-7) — Done (chore/hygiene-i18n-audit → master squash `e180a6b`, 2026-05-25). Extracted `drawing/` modules: `overlayRendering.js`, `particleRendering.js`, `racerRendering.js`, `priorityModeOverlay.js`, `battleDiagRendering.js`. Camera modules: `CameraDirectorDiag.js`, `cameraTimingComputation.js`.
- ✅ **TrackEditor.jsx split** (Q-6) — Done (chore/hygiene-i18n-audit → master squash `e180a6b`, 2026-05-25). Extracted: `TrackEditorToolbar.jsx` (224 lines), `TrackEditorSaveBar.jsx` (116 lines), `useViewport.js` (138 lines), `useTrackIO.js` (206 lines).
- **Dual particle system consolidation** — `dustParticles` (home trail, global pool) + `surfaceParticles` (VRE, per-racer) as separate render paths. Consolidation makes sense after Surface Zones when a third emitter type (zone effects) is added.
- **Q-19 — TrackEditor.effects.test.jsx flaky** — intermittent in full-suite parallel run. Root cause: global FileReader mock scope conflict. Fix: check spy scope or isolation test. Low priority, not a blocker.

- ✅ **Q-6** — TrackEditor.jsx split refactor. Done 2026-05-25 (chore/hygiene-i18n-audit, squash `e180a6b`).
- ✅ **Q-7** — RaceScreen/index.jsx split refactor. Done 2026-05-25 (chore/hygiene-i18n-audit, squash `e180a6b`).
- **Q-8** — Watch list: TrackManager.jsx (535 LOC) and BrandingProfiles.jsx (330 LOC).
  Consider refactor at next extension.
- **Q-9** — Watch: `racer-types/index.js` growing to 286 LOC — candidate for splitting
  (override API vs. registry vs. boot logic). Not a problem today, monitor.
- **Q-10** — Watch: `RacerEditModal.jsx` at 302 LOC — already 75% of the 400-LOC threshold.
  Keep an eye on it at D8 (full config editor).
- **Q-26** — Default tracks without backgrounds (fresh install)

  Code defaults in `defaults.js` have no `backgroundImage` field. With a running server they are
  automatically migrated to the backend (`migrateDefaultTracks()` runs idempotently on every boot) and
  user-edited server versions fully replace them (`loadAllTracks()` filters out code defaults
  when the server delivers the same ID).

  **Problem only occurs when:** fresh install or deleted server state. Then the user sees
  code defaults without backgrounds. In normal operation (server started at least once) the user
  sees exclusively server tracks with backgrounds. Verified in PR-A2.8 diagnosis.

  **Newly understood as a special case:** The more general problem is background caching for offline play
  (all tracks, not just defaults). Separate planning and solution alternatives there — see
  **"Background cache for offline play"** below.

- **Background cache for offline play** *(Low priority)*

  Currently all tracks (default + custom) require the running backend server for background images.
  When server is offline → console warning (since PR-A2.8) and black/gradient background in race.

  **User vision:** Tracks that were loaded once with a running server should remain playable with
  background while offline.

  **Diagnosis findings (verified in PR-A2.8 diagnosis session):**
  - `trackCache.js` cache infrastructure is fully present
  - Eager feeding on app start works (`fetchServerTracks` → `cacheTrackGeometry` →
    `_cacheBackgroundAsync`)
  - Cache writes fail silently due to 3 MB localStorage limit (images 2.9–7.7 MB as data-URL after
    Base64 encoding — not a single image fits within the limit)
  - RaceScreen never reads from cache (`getTrackBackgroundUrl()` exists in `trackLoader.js:173`,
    but is not called in production code — only in tests)
  - Background resolution is **not** coupled to the speed pipeline (classification B in diagnosis) —
    resize would be safe for race mechanics, `worldWidth`/`worldHeight`/`pathLengthPx` are frozen in
    the geometry JSON

  **Four discussed solution alternatives:**

  1. **Smart switch (resize cache + server first):** Online = server URL (original resolution), offline =
     canvas-resized cache (1280×720, JPEG 70% ≈ 100–300 KB/image). Effort ~3–4h. Pragmatic, but
     quality discrepancy between online and offline.

  2. **IndexedDB without resize:** Original images as blob directly in IndexedDB (no Base64 overhead,
     no quota problem). Online and offline identical in original quality. Effort ~4–5h.
     Cleanest solution, but `getCachedBackground()` would need to become async → refactor of consumption side.

  3. **Emergency option (current state):** No cache, black/gradient background when server offline.
     Console warning (PR-A2.8) gives user a hint. Effort 0h.

  4. **Hybrid (IndexedDB + smart switch):** Original in cache AND server-first for maximum robustness.
     Effort ~5–6h.

  **Recommendation if implemented:** Alternative 2 (IndexedDB) — conceptually cleanest solution, preserves
  original quality, no risk of resolution discrepancy between upload and display. Consumption side
  in RaceScreen/PresetThumbnail requires helper `getServerTrackIdByGeometryId()` in `trackLoader.js`.

  **Priority:** Low. Camera phase and race dynamics PRs are more important. Current state
  (PR-A2.8 console warning) is acceptable emergency behavior.

- **Q-27** — Background PNG compression *(Audit 2026-05-04, Severity: HIGH — deferred)*
  The 5 background images (Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit) are together ~11.7 MB uncompressed PNGs. Optimization to ≤500 KB/image possible (pngquant, tinypng, etc.).
  Deliberately deferred in PR-A2.9 — no acute UX blocker. Fix: compression + git replace of originals. Small standalone PR.
  *(Priority: low)*

- **Q-11** — `reader.onerror` missing in `handleBgUpload` (TrackEditor.jsx)
  FileReader errors are silently swallowed; only `img.onerror` catches load errors.
  Defensive hygiene, low priority.
- **Q-20** — Track editor load mode: background upload is now optional (F1-revised fix). But when a load-mode track has no background and the user saves without uploading one, the race engine is left without a background image. Consider: hint text "No background — race will show empty canvas" when a track is saved in load mode without a background.
- **Q-12** — localStorage quota with large data-URL images
  Tracks now store data-URLs (1–5 MB possible for high-resolution images).
  No quota handling implemented. Info-level, not an acute blocker.
- **Q-16** — CORS wildcard on all backend endpoints
  `app.use(cors())` without origin restriction — any browser tab can access all API write endpoints
  (POST/PUT/DELETE tracks + surface classes). Deliberately accepted for local operation.
  Fix: `cors({ origin: 'http://localhost:3000' })` for dev, env var for VPS.
  **Priority: VPS phase / Phase 5.** Not an acute blocker for single-user local operation.
  *(Deep audit 2026-05-01, Severity: HIGH — accepted for local-only)*

- **Q-17** — Missing `reader.onerror` handlers in SystemSettings.jsx and TrackEditor.jsx
  `FileReader.onload` handlers are without `onerror` counterpart. Errors when reading (corrupt file,
  permission problem) are silently ignored. Q-11 is specific to TrackEditor background images;
  Q-17 extends to SystemSettings JSON import. Low priority — no data loss, just poor
  UX (no error message on import error).
  *(Deep audit 2026-05-01, Severity: LOW)*

- **Q-18** — RaceScreen integration test infrastructure
  RaceScreen has 0 unit tests despite core game logic (finish detection, phase transitions, storage write).
  Blocker: canvas + rAF in jsdom requires `vi.stubGlobal` + mock rAF. Suggestion: 3 minimal tests
  (session load → race init, finish detection, sessionStorage write on race end).
  *(Deep audit 2026-05-01, Severity: MEDIUM — confirmed in TEST-RaceScreen backlog)*

- ✅ **Q-19** — TrackEditor.effects.test.jsx flaky — **fixed PR #55 (2026-05-01)**
  Root cause: `fetch` stub from `trackLoader.test.js` leaked into TrackEditor worker via missing
  `vi.unstubAllGlobals()` in `beforeEach`. Fix: `vi.unstubAllGlobals()` added in `beforeEach`.
  *(Discovered PR #50, fixed PR #55)*

- **Q-20** — Server test backup cleanup not crash-resistant (TLH-1)
  `afterAll` in `tracks.test.js` cleans up backup files via `rmSync`, but only on normal
  test run end. On Ctrl+C / crash before `afterAll`, all backup files remain in the real
  `server/data/tracks-backups/` directory. During TLH-1 development ~41 orphan files
  were created. Possible approach: `process.on('exit', cleanup)` + `process.on('SIGINT', cleanup)` as
  guard, or switch tests to a temporary directory (DATA_DIR override via env var).
  *(Discovered TLH-1 2026-05-01, Severity: LOW)*

- **Q-21** — `.json.tmp` orphans on OneDrive EPERM fallback (TLH-1)
  `atomicWriteJson` writes `.tmp` first, then `renameSync`. If `renameSync` fails (OneDrive
  EPERM), fallback `writeFileSync` writes to the target file — after which `unlinkSync(tmp)` should delete the
  `.tmp` file. If that also fails, a `.json.tmp` file remains. `findBackupFiles`
  searches for `endsWith('.json')` and does not find `.json.tmp` — such orphans are never cleaned up.
  Possible approach: server boot routine scans `tracks-backups/` for `*.json.tmp` and deletes them,
  or `findBackupFiles` includes `.json.tmp`.
  *(Discovered TLH-1 2026-05-01, Severity: LOW)*

- **Q-22** — TrackEditor frontend draft snapshot
  localStorage snapshot of the drawn geometry (key: `racearena:trackEditor:draft:<serverId>` for
  load mode, `racearena:trackEditor:draft:new` for new mode). Written on every point action or every
  ~30s, deleted after successful server save. Protects against data loss on silent
  server errors (F3 scenario from TLH-2 browser test) or browser crash. Effort: small (~50 LOC).
  Small standalone PR.
  *(Arose from TLH-2 browser test 2026-05-02, Severity: MEDIUM)*

- **Q-24** — isDefault immutability via PUT explicitly tested
  Audit found: `PUT /api/tracks/:id` handler explicitly sets `isDefault: existing.isDefault` and thereby overrides any client-sent value — `isDefault` is thus de facto immutable via API. But there is no explicit backend test protecting this behavior. If someone restructures the PUT handler, this protection could silently disappear. Standalone backend test case: "PUT with `isDefault: false` on default track does not change `isDefault`".
  *(Arose during audit in City Circuit bug fix 2026-05-02, Severity: LOW)*

- **Q-23** — Two-step save: no differentiated error message on background upload failure
  Track save is two-step: step 1 `PUT /api/tracks/:id` (geometry), step 2 `POST /api/tracks/:id/background`
  (image file). If step 1 succeeds and step 2 fails, the user sees a generic
  save error — not "geometry saved, background not". The background file remains permanently
  without upload in this case. Possible solutions: (a) separate error message per step with "Retry Background"
  option, (b) atomic save (rollback geometry if background fails). Effort: small–medium.
  *(Arose 2026-05-02 after background diagnosis dirt-oval, Severity: MEDIUM)*

- ✅ **Q-25** — Open track too fast / race duration too short (PR-A1)
  Root cause (canvas hypothesis empirically disproved): `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` in
  `defaults.js` capped Space Sprint at 4.0 instead of the physically correct ssf=9.886. Space Sprint
  ran at 323 px/s instead of ~131 px/s and lasted ~58s instead of ~144s.
  Fix: `maxScale=10.0` + duration slider for open tracks + `openTrackFinishT` integration in RaceScreen.
  Canvas coordinate system hypothesis disproved — Space Sprint geometry uses world coordinates 256..5707,
  not canvas-bound. *(Fixed in PR-A1, 2026-05-03)*

- **Q-13** — Sprite frame animation stutters with large sprites
  On 6000-tracks sprites become very large — frame changes appear jerky.
  **Structural solution in PR-E of the camera phase:** `maxTargetScreenPx` as upper camera zoom limit
  prevents the camera from zooming close enough to make sprites appear "animation-jerky" large.
  Spec in `docs/CAMERA_DIRECTOR.md §6.2`. Q-13 can be marked done after PR-E + browser verification.
  Fallback solutions (basePeriodMs scaling, frame interpolation) only if
  maxTargetScreenPx calibration is insufficient.

- ✅ **Q-15** — Visual system architectural debt — structurally addressed by D7a (PR #33).
  4 multiplicative scaling factors reduced to one pipeline (computeRenderDisplayScale).
  cameraZoomFactor + REFERENCE_CAMERA_ZOOM eliminated. Closed/open track math pipelines unified
  through consistent effZoom-based calculation.

- **Q-28** — Shared HTTP helper for API services *(Post-Phase-4 audit 2026-05-06, Severity: MEDIUM)*
  `client/src/services/surfaceClassApi.js` and `client/src/services/trackApi.js` share 48 lines of
  identical `apiCall`/`withTimeout` infrastructure — both services copied the same HTTP wrapper.
  Fix: extract shared helper (e.g. `services/apiUtils.js`), update both callers.
  Estimated effort: ~1h.

- **Q-29** — Shared RangeSliderSection component *(Post-Phase-4 audit 2026-05-06, Severity: LOW)*
  Three Phase-4 Dev-Screen sections share a 36-line slider pattern:
  `NameTagVisibilitySection.jsx`, `SpriteSizeRangeSection.jsx`, `CameraZoomTuningSection.jsx`.
  Extract into a shared `RangeSliderSection` component before more Dev-Screen sections are added.
  Estimated effort: ~2h.

- **Q-30** — React 18 → 19 + react-router-dom 6 → 7 migration *(Post-Phase-4 audit 2026-05-06, Severity: MEDIUM)*
  Current: `react@18.3.1`, `react-dom@18.3.1`, `react-router-dom@6.30.3`. Latest: `react@19.2.6`,
  `react-router-dom@7.15.0`. Both have breaking API changes — no npm-audit vulnerability, but the
  version gap grows with each feature phase. Recommended: migrate before Phase 6 (Pan-Refactor) to
  avoid accumulating migration debt. Estimated effort: 1–2 days (route definitions + React API).

- **Q-31** — Long files — updated watch list after chore/hygiene-i18n-audit (2026-05-25, squash `e180a6b`). Q-6 and Q-7 resolved ✅.
  - ✅ `TrackEditor/TrackEditor.jsx`: split → `TrackEditorToolbar.jsx` (224), `TrackEditorSaveBar.jsx` (116), `useViewport.js` (138), `useTrackIO.js` (206) (Q-6 done)
  - ✅ `RaceScreen/index.jsx`: drawing modules extracted to `drawing/` (5 modules) + `camera/` (2 modules) (Q-7 done)
  - ✅ `DevScreen/sections/RaceTuningSection.jsx`: 1269 → **44 lines** (thin coordinator); logic split into `BehaviorTuningSection.jsx` (610), `DynamicsTuningSection.jsx` (607), `SubCard.jsx` (41)
  - `SetupScreen/SetupScreen.jsx`: **~809 lines** — watch list (no split yet)
  - `DevScreen/sections/TrackManager.jsx`: **~727 lines** — watch list, Q-8

### Phase V (Verification Sprint)

Systematic testing of still-unverified areas:

- **V-1** — PlayerSetup B-1 loading-saved-lists bug
- **V-2** — TrackSelector B-2 custom track behavior
- **V-3** — Result screen winner count B-3 (configurable?)
- **V-4** — Branding profiles B-4 (per old ROADMAP done, reality check says open)
- **V-5** — System backup/restore/reset B-5 (data loss risk)
- **V-6** — Multiple dev panel sections — visual verification
- **V-7** — Physics + collision behavior — smoke test
- **V-8** — localStorage persistence edge cases — stress test
- **V-9** — Fullscreen toggle — functionally unverified

### Phase T (Tooltip Retrofit)

All existing dev screen fields that are unclear without a label. Uses `InfoTooltip` component
from D3.5.5.

- **T-1** — RaceDefaults fields
- **T-2** — TrackManager fields
- **T-3** — BrandingProfiles fields
- **T-4** — SystemSettings fields

---

## Order of Next Steps

1. ✅ **B-Wave** (B-1, B-3, B-10..B-15) — PR #25, master `697e081`
2. ✅ **B-16 + B-17** — PR #26, master `7cdde15`
3. ✅ **fix/camera-polish + Q-14** — PR #28, master `750d826`
4. ✅ **D11** racer behavior — PR #30, master `d46cab2`
5. ✅ **D7a** proportional sprites + zoom + labels — PR #33, master `a49baa0`
6. ✅ **D7a-Plus** per-type sprite minimum size + live preview — PR #35, master `27cba65`
7. ✅ **D7b** lane-free + physicalY avoidance — PR #37
8. ✅ **D7c** row start + speed bonus + track capacity — PR #39
9. 🔜 **D7d** — 100-racer performance
10. ✅ **Visual Racer Effects** (VRE-1 → VRE-2 → VRE-3 → VRE-4) — Master `c857a7e`
11. ✅ **Quick wins post-VRE** (server vitest v4, backend validation, window.alert, JSON.parse, doc drift)
12. ✅ **Error boundary** (deep audit HIGH finding addressed — top-level React error boundary, PR #51)
13. ✅ **Race track lights** — boundary lines + lane fill removed, replaced by glowing track lights. `trackLights` field in data model, track editor UI, server migration, `trackLights.js` module with animation styles (steady / sequence / sync_pulse / random_flash). Cache bug (L37) + CSS fix in same PR.
   - **L37 drift risk (not fixed in PR #52):** `buildTrackFromEditorState` in `trackEditorSave.js` contains an explicit output field list — intentional there (form only knows its own fields), but new editor features require an explicit update of this function. Not an acute bug, but a reminder for future features.
14. ✅ **TLH-1 — backend fixes + migration** — geometryId client-authoritative, delete preserves geometry, auto-backup, default track seed migration. PR #55.
14b. ✅ **TLH-2 — UI flow + cleanup** — edit modal geometry status display, track editor two-mode (load/new), two-path load, geometryId first draw. PR #56/#57, squash-merged.
14c. ✅ **Track delete safeguards + background race condition fix** — remove background button, DELETE background endpoint, isDefault 403 guard, migrateDefaultTracks idempotent, useEffect cancelled flag (L43). PR #58, squash-merged `fc5690f`.
14a. ✅ **Draw default tracks** — all 5 geometries drawn and saved (2026-05-02): Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit.
14d. ✅ **PR-A2.5 — Visual Race Naturalness** — arc-length-uniform spline resampling (`catmullRomSpline` default) + jitter amplitude ±5% relative (`race_baseSpeed * 0.05`). T-uniform max/min ratio was 1.36–7.72×; after fix ≤1.01×. +28 tests (1314 total). UX vision "constant pixel velocity" from 2026-05-03 browser test addressed. UX-1…UX-4 (Setup-Screen layout/settings) remain open in UX_FOLLOWUPS.md — planned for B-Wave after Camera-Director phase.
15. 🔜 **Camera phase + RaceScreen refactor** — revise CameraDirector, split RaceScreen (Q-7). Concept documentation sprint first. Q-25 (track canvas size) as parallel consideration in concept sprint.
15b. ✅ **Phase 3A — Race plan + area bonus** (feat/phase-3a, 2026-05-19) — `racePlanner.js` (B1–B5 area assignment, P-controller trajectoryMult [0.85,1.10], seeded PRNG), `bereichsBonusMult` in physics loop (fade after OUTCOME), symmetric start rows (bottom-up), dynamic finish line open tracks (ssf-based), 5 HUD overlays (RP DIAG), `racePlanBonusStrengthMultiplier` DevPanel + Sim. Defaults: avoidanceDistance=0.15, bonusMult=2.0. Sim smoke 120s: χ²=0.3–0.6 ✅. User-validated.
16 (shifted). **TLH-3 — code fallback + status banner + export** — deferred until after Camera Phase.
16. **Surface Zones** — follow-up phase after VRE. Track editor zone tool, `getZonesAtPosition()`.
17. **B-UX phase** — dev screen cleanup (B-UX2/B-UX3), help modal. Before D8.
18. **Backup/export** (B-5) — UI exists, wiring missing.
19. **D3.6** file reorganization (`racer-types/` → `racer-configs/`, 39 files)
20. **D8** — full racer config editor (after B-UX phase)
21. **Phase V** (verification sprint)
22. **Phase T** (tooltip retrofit — uses InfoTooltip from D3.5.5)
23. **Phase 5** VPS deployment — ⚠️ auth (JWT) first

---

## Known Limitations — Deliberately Accepted

- **SEC-2 — Race state manipulation via React DevTools** *(audit-2026-04-29, Severity: High — accepted)*
  `g.current.racers` in RaceScreen lives as a mutable `useRef`. Technically proficient guests can use
  React DevTools / `__reactFiber$` to access racer objects and set fields like `t`, `baseSpeed`,
  `finished` directly. `Object.freeze()` only protects direct properties and is bypassable through DevTools.
  **Not fully fixable client-side.** Full protection requires server architecture with race replay or
  cryptographic signing (Phase 5).
  The other three security findings (SEC-1 r.t-clamp, SEC-3 sessionStorage validation,
  SEC-4 file size guard) were addressed in PR cleanup/security-and-crash-protection
  (audit report: docs/internal/audit-2026-04-29.md).

- **TEST-RaceScreen** — RaceScreen integration test for `isOpenTrack` propagation *(Priority: low)*
  Requires canvas + `requestAnimationFrame` mocking in jsdom. Currently no test infrastructure for the
  animation loop. Was tracked as TODO in `RaceScreen/index.jsx` and moved to backlog in cleanup PR 2/3
  (audit-2026-04-29.md).

- **DIAG-OpenTrackPan** — Open track pan verification after Phase 4 merge *(Priority: low)*
  Diagnosis session 2026-05-06: Space Sprint browser test showed BATTLE pan possibly outside
  the racer cluster. Unclear whether real bug in `openTrackCamera.js` / `openTrackPanTarget()` or
  browser state artifact (browser zoom was known as error source in the same session).
  CameraDirector's `cam.offsetX/Y` are irrelevant for open tracks — `st.camX/Y` via
  `openTrackPanTarget()` control the pan. Clarify with separate browser test after Phase 4 merge.

- **Pan target identification** — Camera does not reliably show the race leader *(Priority: medium)*
  LEADER_ZOOM and BATTLE_ZOOM zoom onto the centroid of the top-N lead group (`focusRacers.slice(0, N)`).
  That is the t-value centroid — not necessarily the standings leader (position 1 by lap logic).
  In tight packs with multiple lap changes, the "geometric centroid" can diverge from "who is actually leading".
  Consequence: camera may not show the player viewers perceive as the leader.
  Mitigation: replace `focusRacers` with standings-sorted list; calculate centroid only within
  the top-N of the actual race order. Standalone PR after the camera phase.

---

## Parking Lot — Future / Unclear Scope

- Phase 5: server, leaderboard, Socket.IO (architecture planned, no code)
- Phase 7: custom sprite upload via dev panel; dynamic SpriteRacerType from JSON
- i18n (English + German base) — app language is English, documentation can be both
- Multi-tenant isolation (per-organizer track sets and branding)
- Mobile / tablet responsive tuning
