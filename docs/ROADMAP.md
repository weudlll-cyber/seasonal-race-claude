# RaceArena — Development Roadmap

## Phase 1 — Setup Screen ✅ 100% complete

- [x] Vite + React project scaffold (migrated from CRA)
- [x] Global dark theme CSS variables
- [x] SetupScreen with Players / Track / Settings tabs
- [x] PlayerSetup — name entry, racer badge assignment, reshuffle
- [x] TrackSelector — card grid, color identities
- [x] RaceSettings — duration, winner count, optional event name
- [x] RandomHelper — Fisher-Yates shuffle, assignRacers, randomInt
- [x] App routing (React Router v6) — `/` → `/setup`
- [x] Start Race button guard (requires ≥1 player + track selected)

## Phase 2 — Race Engine ✅ Complete

- [x] Client-side physics tick (race-engine module)
- [x] Canvas track renderer
- [x] Live race screen with racer positions and collision avoidance
- [x] Countdown and finish detection
- [x] Multi-lap closed tracks (lapsFromDuration 1–4)
- [x] Scrolling camera for open tracks (2.5× virtual canvas)
- [x] TV camera director (OVERVIEW / LEADER_ZOOM / BATTLE_ZOOM / COMEBACK_ZOOM)
- [x] Fullscreen toggle (⛶)
- [x] Fade-to-black screen transitions (TransitionContext)
- [x] Result screen + race history

## Phase 2.5 — Track Editor ✅ Complete

- [x] Track data structure and localStorage CRUD (`trackStorage.js`)
- [x] Catmull-Rom spline math module
- [x] `EditorShape` adapter implementing the race-engine shape API
- [x] Editor canvas: background image + point clicks, drag, delete, segment insert
- [x] Center Mode and Boundary Mode with full edit operations
- [x] Closed/Open toggle, Reverse button, track naming, image dropdown
- [x] Undo / Redo (50-entry cap, Ctrl+Z / Ctrl+Shift+Z)
- [x] Integration: custom tracks appear in Setup Screen (geometry → preset link)
- [x] Environment → track-effects refactor (old environment module removed)
- [x] Six built-in effects: rain, stars, bubbles, fireflies, dust, mud, wave
- [x] Multi-effect array: up to 3 simultaneous effects per geometry
- [x] Live effect preview on editor canvas
- [x] EffectConfig UI component (add/remove/configure effects, duplicate prevention)
- [x] Picture-in-picture minimap with leader indicator
- [x] Preset thumbnail cards in SetupScreen
- [x] Audit fixes: auth scaffold disabled, CORS scoped, dead code removed, server scaffold deleted

See `docs/TRACK_EDITOR.md` for the full specification, architectural decisions, and future extensions.

## Phase L — Local Backend for Track Storage ✅ Complete (PR #43, #44)

A local Docker-based backend that persists custom tracks and background images server-side, allowing the Track Editor to save to a real server instead of only localStorage.

- [x] L.1 — Express + Docker skeleton with `/api/health` (PR #43)
- [x] L.2 — Track read API: `GET /api/tracks`, `/:id`, `/:id/background` with seed data
- [x] L.3 — Frontend loads server tracks; geometry cached so offline races work unchanged
- [x] L.4 — Background images cached as data-URLs (3 MB LRU); offline fallback
- [x] L.5 — Write-path: TrackEditor saves to server (POST/PUT + background upload); TrackManager Delete via API; one-time localStorage→server migration on first connect; stale-cache cleanup on fetch

⚠️ **Auth required before VPS deployment** — currently any browser visitor has full write access to all tracks. See Phase 5 / BACKLOG.md.

## Issue D — Racer Redesign ✅ Parts 1–3 merged, Parts 4–5 pending

Replaces emoji racers with sprite-based renderable types.

- [x] D1 — Extended racer manifest (render, animation, trail, style fields)
- [x] D2 — drawRacer wiring + trail integration for horse
- [x] D2.3 — Sprite-based horse render (4-frame trot animation, 128×128 tile sheet)
- [x] D2.4 — 11 horse coats with hash-based per-player assignment
- [x] D3.5.1 — SpriteRacerType config-driven base class; tintSpriteWithMask for mask-restricted tinting
- [x] D3.5.2 — Horse/Duck/Snail → SpriteRacerType; `_createTrail` system removed
- [x] D3.5.3 — 9 new racer types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane, F1, Rocket)
- [x] **Visual Racer Effects** ✅ — Surface-Class-driven trail system. Static per-type trails replaced by a data-driven Racer + Track → Surface Class → Generator pipeline. Four Sub-PRs merged to master:
  - [x] VRE-1 — Foundation: generator modules (`particle`, `cloud`, `splash`, `line`), Surface-Class data model, `/api/surface-classes` backend API, storage. (PR #46)
  - [x] VRE-2 — Surface-Class Editor in Dev-Screen with animated live-preview modal. (PR #47)
  - [x] VRE-3 — Racer/Track class selectors + Setup-Screen compatibility filter (only racers with ≥1 matching class shown). (PR #48)
  - [x] VRE-4 — Race-Integration: `trailResolver.js`, per-racer emitter at race start, Heimat-Trail fallback, `trackSurfaceClasses` in raceData. Phase complete. (PR #49)
- [x] D3.5.5 — Per-Type-Tuning-UI in Dev-Screen: 6 Felder live-tunbar via Edit-Modal, InfoTooltip-Komponente, CONFIG_SNAPSHOT, normalizeOverrideMap. 678 unit + 36 e2e Tests. PR #21, master `2d76bc3`.
- [ ] D3.6 — File-Reorganisation: `racer-types/` → `racer-configs/` (39 files)
- [ ] D4 — Performance pass for 100 racers @ 60 FPS
- [ ] **Surface Zones** (follow-on to Visual Racer Effects) — local surface-class overrides within a track (e.g. mud patch on an asphalt circuit, puddle on earth). Track-Editor zone-drawing tool, `EditorShape.getZonesAtPosition(t, offset) → Zone[]`. Planned after Visual Racer Effects is complete.
- [x] D7a — Proportional Sprite Scaling + Min-Size-Floor + relative Zoom-Ratios + Label-Skalierung. computeRenderDisplayScale as single-source render pipeline. cameraZoomFactor removed. 808 unit + 183 e2e tests. PR #33, master `a49baa0`.
- [x] D7a-Plus — Per-Type minTargetScreenPx override with live preview (D3.5.5 pattern). Animated canvas preview, global-default hint, modified badge, reset. Scroll indicator in modal. PR #35, master `27cba65`.
- [x] D7b — Lane-free: physicalY system replaces currentLaneY/targetLaneY. Home force, anisotropic avoidance, cone drafting, soft repulsion, hard clamp. 13 tunable params in Dev Screen. PR #37.
- [x] D7c — Reihen-Start: multi-row layout, speed-bonus for rear rows, track-capacity system. PR #39, master `ca2efcd`.
- [ ] D7d — 100-Racer-Performance: spatial grid O(N) avoidance, smart camera for packs
- [ ] D8 — Full Racer Config Editor in Dev-Screen (coats, all fields, sprite switching)

## Phase B — Bug Fixes & Wiring ✅ B-Wave done (PR #25)

- [x] B-6 — speedMultiplier-Bug — subsumed by D9
- [x] B-7 — Dev-Screen UI-Drift: Code-Registry as Single Source of Truth (PR #17)
- [x] B-8 — SetupScreen Footer/Pills Emoji-Mapping fixed (PR #17)
- [x] B-9 — Override Selector filters inactive types (PR #17 cleanup)
- [x] B-1 — PlayerSetup: loading saved groups — useEffect fix for React StrictMode (PR #25)
- [ ] B-2 — TrackSelector: custom-track behavior on missing geometry
- [x] B-3 — Winners max raised 5 → 20 in RaceDefaults + RaceSettings (PR #25)
- [ ] B-4 — Branding profile applied to race/result screens (UI exists, wiring missing)
- [ ] B-5 — System Backup/Restore/Reset end-to-end verified (UI-only so far)
- [x] B-10 — InfoTooltip auto-boundary detection (getBoundingClientRect flip) (PR #25)
- [x] B-11 — Display-size tooltip simplified in RacerEditModal (PR #25)
- [x] B-12 — maxPlayers configurable in RaceDefaults; wired to PlayerSetup + PlayerGroupsManager (PR #25)
- [x] B-13 — Language selector removed from RaceDefaults (PR #25)
- [x] **B-14** — TrackManager: hint text + link to Track Editor when no geometry selected (PR #25)
- [x] **B-15** — i18n leak fixed: all German strings in TrackEditor + TrackManager → English (PR #25)
- [x] **B-16** — Camera-Director adaptive zoom on large tracks (PR #28)
- [x] **B-17** — Race speed scaling for large tracks via pathLengthPx (PR #26)

## D9 — Race Engine Speed Refactor ✅ Done (PR #19, master `dad3300`)

Makes `speedMultiplier` effective on race speed. Replaces `lapsFromDuration` auto-calculation
with explicit operator choice (lap count for closed tracks, race duration for open tracks).
Adds dynamic finish-line positioning for open tracks, run-out behavior, 2-second result delay,
and estimated-duration display in SetupScreen. New Playwright e2e infrastructure with 22
smoke tests. 628 unit tests + 22 e2e tests.

## D3.5.5 — Per-Type-Tuning-UI ✅ Done (PR #21, master `2d76bc3`)

Edit-Modal in RacerManager for all 12 racer types. 6 live-tuneable fields: speedMultiplier,
displaySize, basePeriodMs, leaderRingColor, leaderEllipseRx, leaderEllipseRy. Live-apply on
each valid change, per-field reset, reset-all-defaults (preserves isActive). InfoTooltip as
reusable component. Override-API extended generically (setRacerTypeOverride 3-arg,
resetRacerTypeOverride with optional fieldName, CONFIG_SNAPSHOT, normalizeOverrideMap).
678 unit tests + 36 e2e + 21 UX-verification tests.

## D10 — Track-Größen-Variabilität + Auto-Sprite-Skalierung ✅ Done (PR #23, master `13a2dd2`)

worldWidth/worldHeight automatically derived from uploaded background image (naturalWidth/naturalHeight).
Hard limit 8000×4096 enforced at upload. Image required to save; save button disabled until image
uploaded. Dimension mismatch on swap: confirm dialog, path reset on accept; same-dimensions swap
silent. TrackEditor: zoom+pan (pinch/wheel zoom-to-cursor, fit-to-screen, pan via viewTransformRef
for stale-closure safety). trackWidth truly variable from track config. Auto-sprite-scaling:
factor = clamp(trackWidth / racerCount / referenceValue, minScale, maxScale). D3.5.5 operator
overrides win over auto-factor. AutoScaleSection in Dev-Screen. Bild-First replaces all pre-set
buttons (WORLD_SIZES/WIDTHS/HEIGHTS removed). Backward-compat for path-based backgroundImage.
694 unit tests + 75 e2e tests. Hotfix `13a2dd2`: default icon 🏁 in TrackManager Add-Track form.

**Post-D10 User-Test:** B-16 (Camera still on large tracks) + B-17 (race speed perceived too fast)
aufgedeckt — beide HOCH-PRIO, werden als Priority-Fix vor D11 angegangen.

## fix/camera-polish + Q-14 ✅ Done (PR #28, master `750d826`)

CameraDirector adaptive zoom: `zoom = clamp(worldW² / (VIEW_W × worldW), MIN_ZOOM, MAX_ZOOM)`.
clampOffset 2-anchor formula handles zoom < 1 and zoom > 1 without -0 bug. Top-3 focus
(`_focusRacers` returns top-N by t descending). cameraZoomFactor invariant
(REFERENCE_CAMERA_ZOOM / cam.zoom, closed tracks only) keeps sprite scale constant relative
to camera movement. BaseSpeedSection in Dev-Screen: tunable min/max baseSpeed with spread
preview (±% from mean, 2-lap gap estimate) and live-apply pattern. Q-14 lapUtils
single-source-of-truth: DEFAULT_BASE_SPEED_CONFIG from defaults.js, private constants,
optional params on openTrackFinishT and estimatedSecondsPerLap. 759 unit + 157 e2e tests.
UX-verification spec (31 tests, V1-V12) permanent.

## D11 — Racer Behavior: Soft Avoidance + Drafting ✅ Done (PR #30, master `d46cab2`)

Asymmetric soft avoidance: trailer (lower t, tie-break by index) yields fully, leader holds
lane — prevents symmetric force cancellation in evenly-spaced packs. Proximity-scaled lateral
force, configurable avoidanceDistance/lateralForce/maxLateral/returnSpeed. Speed brake for
both racers in proximity. Drafting boost for close followers in same lane
(`draftingBoostFactor`). All params tunable in Dev-Screen RaceBehaviorSection (D3.5.5
live-apply pattern). Camera world-edge clamp fixes black-strip bug at high zoom. Open-track
camera-zoom-aware sprite scaling: `computeOpenTrackCameraZoomFactor()` produces identical
on-screen sprite size to closed-track reference at any zoom. Pixel-floor logic:
`minVisiblePixels` (default 32) ensures sprites never vanish on wide tracks.
809 unit tests + 183 e2e tests. 4 browser bugs found and fixed before merge.

## D7a — Proportional Sprite Scaling + Zoom-Ratios + Label-Skalierung ✅ Done (PR #33, master `a49baa0`)

Visual-system architectural cleanup. Replaces 4 multiplicative scaling factors with a single
proportional pipeline plus floor. `cameraZoomFactor` and `REFERENCE_CAMERA_ZOOM` removed —
the constant-size mechanism is obsolete. `computeRenderDisplayScale` is the new single-source
sprite-sizing function: `screenPx = max(displaySize × displaySizeScale × effZoom, minTargetScreenPx)`.

CameraDirector relative zoom ratios: `overviewZoom × ratio` per state (LEADER:1.4, BATTLE:1.6,
COMEBACK:1.3). 1280-track behavior identical to previous. Large tracks (e.g. 6000px) now show
clearly distinct camera states.

Label scaling: hardcoded 11px font replaced with effZoom-based scaling for consistent ~11
screen-pixel labels regardless of track size. Trail-dot scaling consistent.

`minVisiblePixels` renamed to `minTargetScreenPx` (config key + UI label). Browser-test-driven
correction in same PR: initial constant-size implementation felt wrong → diagnosed as
sprite/track-background ratio perception → user decided proportional + floor → simpler architecture.
808 unit tests + 183 e2e tests. Q-15 structurally addressed.

## W3 — Race-Type Override ✅ Done (PR #17)

Session-only racer-type override selector in the Setup Track tab. Filters disabled types.
Resets on track change. Not persisted.

## PR-A1 — Open-Track Duration UX + Q-25 Fix ✅ Done (2026-05-03)

`DEFAULT_SPEED_SCALE_CONFIG.maxScale` raised 4.0 → 10.0, resolving Q-25: Space Sprint now runs
at ~131 px/s traversal rate (consistent with other tracks) and ~144s natural race duration.
Open-track Duration Slider in Setup Track tab: range derived from track physics
(`openTrackDurationRange`), default 65% of max, "Estimated duration: {X}s" display.
`openTrackFinishT` now wired into RaceScreen finishT calculation (was previously unused —
duration had no effect on open-track finish line). Closed-track label "Laps & Duration" +
"Estimated duration: {X}s" format (A2.5 audit). +3 new tests, +35 test cases (1299 total).

## PR-A2-Diagnose — Speed-Pipeline Scope Analysis ✅ Done (2026-05-03)

Read-only diagnosis sprint: identified Architectural Gap in `openTrackFinishT` (missing
`/ speedScaleFactor`), designed `computeRaceBaseSpeed` formula, categorized 9 test files,
assessed MEDIUM risk. Output: `docs/SPEED_REFACTOR_ANALYSIS.md` (499 lines, 8 sections).

## PR-A2.6 — Race Dynamics ✅ Done (2026-05-04)

Three combined changes addressing the Phase 1 diagnosis finding: racers maintained relative
positions almost 1:1 from race start to end (4.3 lead-changes per 30s race in baseline
diagnostic, 3% of races with zero changes).

1. **SpeedBonus refactor:** `spreadFactor` and `speedBonusMult` extracted as separate racer
   fields. Re-rolls only touch `spreadFactor`; `speedBonusMult` (back-row positional
   compensation) is constant over the whole race.

2. **Per-racer spreadFactor re-roll:** `rollCount = max(2, floor(duration/15))` rolls over 0–80%
   of the race, ~12s apart for all standard durations. Variant B: draw centered on current value,
   ±85% of SPREAD_RANGE, clamped to [SPREAD_MIN, SPREAD_MAX]. easeInOutCubic transition over
   5000ms keeps large speed swings visually smooth. ±20% jitter per racer prevents simultaneous rolls.
   `draftingBoost` unchanged at 1.10 (pre-PR-A2.6 value — empirical browser tests showed slipstream
   was not the peloton driver).

Race-Duration guarantee clarified in docs: median-racer calibrated to ±0% of target;
race-end (last finisher) is ±6–8% (1σ) — was implicit before, now explicit.
+33 tests (1326 → 1359 total). Cone-geometry limitation noted in raceBehavior.js comment.
**Next: PR-B** — Camera Bug Fixes (Bug A+B+C).

## PR-A2.5 — Visual Race Naturalness ✅ Done (2026-05-04)

Arc-length-uniform spline resampling: `catmullRomSpline` now defaults to `parameterization:'arclength'`.
T-uniform max/min pixel-distance ratios were 1.36–7.72× across representative tracks; after fix all tracks
≤1.01×. Jitter amplitude changed from hardcoded `0.00012` to `race_baseSpeed * 0.05` (±5% relative).
EditorShape.getBoundingBox extended to include raw control points. +28 tests (1326 total).

## PR-A2 — Duration-Driven Speed Architecture ✅ Done (2026-05-03) + fix (2026-05-04)

`computeRaceBaseSpeed(finishT, T)` = `finishT / (REFERENCE_FPS × T)` where
`T = targetDuration × spreadMinFactor × speedMultiplier`.
Race-end-time semantics: "Race Duration X" means the last finisher crosses at Xs; median ~87% earlier.
Closes Q-25 architecturally: open-track Duration Slider now has real effect on any track.
Removed: `speedScaleFactor`, `SpeedScaleSection`, `DEFAULT_SPEED_SCALE_CONFIG`, `openTrackFinishT`.
Added: Closed-Track Duration Slider (Model D sync — lap change resets duration to auto).
Fix (2026-05-04): speedMultiplier not normalized (rockets finished 20% early); spreadMinFactor
missing (last finisher was at targetDuration × spreadMinFactor, not targetDuration). 3 new
pipeline-contract tests added. Browser verification pending.
**Next: PR-B** — Camera Bug Fixes (Bug A+B+C).

## Phase Q — Quality Hygiene

- [x] Q-1 through Q-5 — Dead exports, unused imports, TODO tags, JSON.parse hygiene, file
  headers (PR #17 cleanup commit)
- [ ] Q-6 — TrackEditor.jsx split-refactor (1222 LOC, pre-existing)
- [ ] Q-7 — RaceScreen/index.jsx split-refactor (1032 LOC, pre-existing)
- [ ] Q-8 — Watch-list: TrackManager.jsx (535 LOC), BrandingProfiles.jsx (330 LOC)

## Phase V — Verification Sprint (planned)

Systematic verification of all unconfirmed ROADMAP.md `[x]` items against the running app.
See BACKLOG.md V-1 through V-9 for full item list.

## Phase T — Tooltip Retrofit (planned)

Tooltip-convention applied to all existing Dev-Screen fields that lack self-evident labels.
See BACKLOG.md T-1 through T-4.

## Phase 5 — Race-Integrity Server & Leaderboard (planned)

⚠️ **Auth prerequisite:** Phase L (PR #44) added track write endpoints with no authentication. Before any VPS deployment, auth must be added to the Phase L backend. Phase 5 "Basic admin auth" covers this requirement.

Built fresh — the original server scaffold was deleted (incompatible architecture).

- [ ] Server-authoritative race finale: server signs and persists race outcomes
- [ ] Socket.IO event streaming: server broadcasts authoritative race-tick state
- [ ] Race outcomes persisted to DB; season standings computed server-side
- [ ] Leaderboard screen (client) reading from server API
- [ ] Season archive + reset
- [ ] Basic admin auth (JWT, server-side password hashing with bcrypt)

## Phase 6 — Public Deployment (planned)

- [ ] VPS deployment (nginx reverse proxy, HTTPS via Let's Encrypt)
- [ ] Environment config (CLIENT_ORIGIN, JWT_SECRET, DB_PATH)
- [ ] Admin auth hardened for public-facing use
- [ ] Stats pages (top racers, busiest tracks, season history)
- [ ] Mobile / tablet responsive tuning

## Phase 7 — Multi-Tenant (planned)

- [ ] Multiple event organizers with isolated track sets and branding profiles
- [ ] Per-tenant localStorage namespace or server-side data isolation
- [ ] Invite flow for adding players to an organizer's roster
- [ ] i18n (English + German base)

---

## QA Pipeline ✅ Complete

- [x] ESLint v9 flat config (React + hooks + Prettier compat)
- [x] Prettier (single quotes, 2-space, printWidth 100)
- [x] Vitest + React Testing Library (1265 client unit tests, 71 test files; 114 server unit tests) + Playwright e2e (183 tests: 22 D9 + 14 D3.5.5 + 21 UX-verification + 18 D10-smoke + 17 D10-UX-verification + 13 B-Wave-smoke + 12 B-16/17 + 3 fix-list-tracks + 8 camera-polish-smoke + 31 camera-polish-UX-verification + 14 D11-smoke + 12 D11-UX-verification)
- [x] GitHub Actions CI — push + PR to main: lint → format-check → test → audit
- [x] Husky pre-commit hook → lint-staged (ESLint fix + Prettier on staged files)
- [x] docs/AUDIT.md with OWASP Top 10 checklist

## D7c — Row Start with Speed Bonus + Track Capacity ✅ Done (PR #39)

Multi-row start layout for races with more players than fit in one row across the track width.
`computeRowLayout` shuffles players and assigns them to rows; `computeRowPhysicalY` distributes
each row evenly across the full track width (including partial last rows). Rear rows start at
a negative t-position (physically behind the start line; closed-track `tPos` wraps correctly,
open-track EditorShape clamps to position 0). Speed bonus per row (`computeSpeedBonus`) compensates
the physical distance disadvantage — factor 1.0 = pole position neutral by default.

Track capacity (`maxRacers` on each track preset) auto-computed from `pathLengthPx × maxCapacityFactor
/ pixelsPerRacer × racersPerRow` when geometry is selected in TrackManager; user-overridable with
"modified" badge. SetupScreen shows a row-count hint (ℹ️) and a capacity warning (⚠️) inline
above the start bar.

Dev Screen Row Start section: 4 tunable parameters (`pixelsPerRacer`, `rowGapMultiplier`,
`speedBonusFactor`, `maxCapacityFactor`) with extended tooltips. All persisted via
`racearena:rowLayoutConfig`. 21 new unit tests, 6 new e2e tests (Playwright).

---

## Session Log

| Date | Entry |
|------|-------|
| 2026-04-19 | Setup Screen built, Dev Screen with 7 sections built, full QA pipeline installed (ESLint, Prettier, Vitest 29 tests, GitHub Actions, Husky pre-commit hooks), AUDIT.md created. |
| 2026-04-22 | Race Engine phase complete: SVG-path track system (5 shapes), 5 environments, racer types, race loop with collision avoidance, multi-lap closed tracks (lapsFromDuration 1–4), scrolling camera for open tracks (2.5× virtual canvas), TV camera director (OVERVIEW/LEADER_ZOOM/BATTLE_ZOOM/COMEBACK_ZOOM), fullscreen toggle (⛶), fade-to-black screen transitions (TransitionContext), result screen + race history. 228 Vitest tests. |
| 2026-04-23 | CI restored (vite 5→8 upgrade via PR #1), environments refactored to consume background image paths from track config via module-level image cache (PR #2), project hygiene pass for line endings, coverage ignore, and SETUP.md stack correction (PR #3). 232 Vitest tests still green. |
| 2026-04-24 | Phase 2.5 Track Editor complete on branch `feat/track-editor`. Track geometry CRUD, EditorShape, Center/Boundary mode, full edit ops, undo/redo, 6 track effects with multi-effect array (up to 3 per geometry), live editor preview, minimap, camera director, preset thumbnails. Pre-merge audit (AUDIT.md) identified critical auth issue in scaffolded server code. F15–F18 audit fixes applied including server scaffold deletion. PR #6 squash-merged. 307 Vitest tests across 25 files. |
| 2026-04-25 | Pre-D cleanup: removed empty module dirs left behind by F10/F18, ARCHITECTURE.md folder structure aligned with reality, ROADMAP.md test count corrected (365→307 / 28→25), .gitignore tightened. CI workflow fixed (server job removed). |
| 2026-04-25 | Issue D horse track complete. Three procedural Canvas-primitives attempts failed — pivoted to sprite-based render with PNG trot sheet. Added spriteLoader, spriteTinter (offscreen canvas multiply), coatAssignment (djb2 hash). 11 horse coats. 350 tests. |
| 2026-04-26 | D3.5.1 complete: SpriteRacerType config-driven base class (52 tests); tintSpriteWithMask two-canvas algorithm added to spriteTinter (5 new tests); SpriteRacerType re-exported from index.js. PR #13 squash-merged to master (cf256d8). 453 tests, 31 test files. DOC-SPRINT: PROJECT-PRINCIPLES.md, BACKLOG.md, HANDOFF.md created; ROADMAP.md, ARCHITECTURE.md, RACER_DATA_MODEL.md, AUDIT.md updated. |
| 2026-04-26 | D3.5.2 complete: Horse/Duck/Snail migrated to SpriteRacerType config objects; dead `_createTrail` system removed. 603 tests. |
| 2026-04-26 | D3.5.3 complete: 9 new racer types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane, F1, Rocket) using SpriteRacerType. Mask-tinting for Buggy/Motorbike/Plane. 603 tests, PR #16. |
| 2026-04-26 | B-7+B-8+W3 complete (PR #17): code registry as Single Source of Truth for racer types; racerTypeOverrides override map; emoji from registry; session-only race-type override selector; filter for inactive types (Test-3.1 fix). Quality-gate cleanup: dead RACER_TYPE_EMOJIS export removed, 11 unused imports removed, JSON.parse defensive hygiene, 13 file headers added. 618 tests, 3 ESLint warnings (down from 13). |
| 2026-04-26 | D9 Race-Engine-Speed-Refactor complete (PR #19, master `dad3300`): speedMultiplier wired to baseSpeed; explicit lap/time selection with live duration estimates; dynamic finish-line for open tracks; run-out behavior; 2s result delay; sessionStorage extended with raceMode/targetLaps/targetDuration. New Playwright e2e infrastructure (playwright.config.js + 22 smoke tests). Quality-gate cleanup: vitest excludes e2e/, BASE_SPEED constants imported in RaceScreen, getRacerType cached, file headers added. 628 unit tests + 22 e2e tests. |
| 2026-04-26 | D3.5.5 Per-Type-Tuning-UI complete (PR #21, master `2d76bc3`): Edit-Modal for all 12 racer types with 6 live-tuneable fields; InfoTooltip reusable component; CONFIG_SNAPSHOT + normalizeOverrideMap (legacy migration); override-API extended to 3-arg form. UX-verification spec (21 tests, permanent). Quality-gate: 0 show-stoppers, duplicate import fix before merge. 678 unit tests + 57 e2e tests. Doc sprint: BACKLOG (D10/D11 concepts), RACER_DATA_MODEL (single-type-per-race clarification, updated API), LESSONS 11+12, AUDIT, ROADMAP, PROJECT-PRINCIPLES (UX-verification convention). |
| 2026-04-27 | D10 Track-Größen-Variabilität + Auto-Sprite-Skalierung + Bild-First-Workflow complete (PR #23, squash `c700ef4`, hotfix `13a2dd2`): worldWidth/worldHeight from image naturalWidth/naturalHeight; hard limit 8000×4096; image required to save; mismatch dialog + path reset; zoom+pan (viewTransformRef); trackWidth variable; autoSpriteScale formula; AutoScaleSection; Bild-First replaces WORLD_SIZES pre-sets; backward-compat for path-based BG. Quality-gate: 0 show-stoppers, all warnings fixed before merge. 694 unit + 75 e2e tests. User browser-test exposed B-16 (camera still on large tracks) + B-17 (speed too fast on large tracks) as priority post-D10 bugs. Doc sprint: BACKLOG (D10 ✅, B-14..B-17, Q-11/Q-12, reihenfolge), LESSONS 13+14, AUDIT, ROADMAP (D10 ✅, B-Wave 🔜), PROJECT-PRINCIPLES (English-only UI). |
| 2026-04-27 | B-Wave UX-Polish sweep complete (PR #25, master `697e081`): B-1 player-group load fix (StrictMode useEffect), B-3 winners max 5→20, B-10 InfoTooltip auto-boundary detection, B-11 display-size tooltip simplified, B-12 maxPlayers configurable in Dev Panel, B-13 language selector removed, B-14 TrackManager hint to Track Editor, B-15 all German UI strings → English (TrackEditor + TrackManager) + d10-smoke/d10-ux-verification updated. 694 unit + 88 e2e tests (13 new b-wave-smoke). |
| 2026-04-27 | fix/camera-polish + Q-14 complete (PR #28, master `750d826`): CameraDirector adaptive zoom + clampOffset 2-anchor + top-3 focus; cameraZoomFactor invariant (closed tracks). BaseSpeedSection in Dev-Screen (tunable min/max, spread preview, 2-lap gap). Q-14 lapUtils SoT (DEFAULT_BASE_SPEED_CONFIG from defaults.js, private consts, optional params). camera-polish-ux-verification.spec.js (31 tests, V1-V12, permanent). d10-ux-verification V8 stale assertion fixed. 759 unit + 157 e2e tests. |
| 2026-04-27 | D11 Racer Behavior + Visual-Fixes complete (PR #30, master `d46cab2`): asymmetric avoidance (trailer yields/leader holds), proximity-scaled force, speed brake, drafting boost, RaceBehaviorSection in Dev-Screen. Camera world-edge clamp (Befund 2). Open-track camera-zoom-aware sprite scaling: `computeOpenTrackCameraZoomFactor()` + pixel-floor `minVisiblePixels`. 4 browser bugs found during review and fixed before merge. 809 unit + 183 e2e tests. Decision: accumulated complexity in 4-factor scaling pipeline → D7 (Visual Experience Architecture) as next phase with Vision-Diskussion zuerst; Q-15 tracks the architectural debt. |
| 2026-04-28 | D7-Vision-Phase: 6 D11-Browser-Test-Befunde → Vision-Diskussion mit drei Sparring-Partnern (User + strat. Claude + Claude Code). 5 Architektur-Konzepte beschlossen: proportional+Floor-Sprites, relative Zoom-Ratios, Label-Skalierung, Lane-frei (D7b), Reihen-Start+Speed-Bonus (D7c), 100-Racer-Performance (D7d). D7a complete (PR #33, master `a49baa0`): computeRenderDisplayScale Single-Source, cameraZoomFactor entfernt, CameraDirector overviewZoom×ratio, Label-Skalierung mit effZoom. Browser-test-driven Korrektur in selber PR: konstante Sprites → proportional+Floor → sauberere Architektur. Q-15 strukturell adressiert. 808 unit + 183 e2e tests. |
| 2026-04-29 | D7a-Plus (PR #35), D7b (PR #37), D7c (PR #39): Per-type minTargetScreenPx override; lane-free physicalY + home force + anisotropic avoidance + cone drafting (13 tunable params); multi-row start + speed-bonus + track-capacity. Q-Cleanup PRs #40–#42: security (SEC-1..5), data hygiene, source & test hygiene. |
| 2026-04-29 | Phase L complete (PR #43 + #44): L.1 Docker/Express skeleton; L.2 track read API + seed data; L.3 frontend loads from backend with geometry caching; L.4 offline background cache (3 MB LRU); L.5 write-path — TrackEditor saves to server (POST/PUT + background upload), TrackManager Delete via API, one-time localStorage→server migration, stale-cache cleanup. 984 unit + 183 e2e tests. L.6: Track-Editor visibility improvements (60% overlay, magenta lines, white outlines), background upload no longer resets drawn track (BgBug fix). ⚠️ Auth required before VPS deployment. |
| 2026-05-01 | Race Track Lights (feat/race-track-lights): Solid boundary lines + lane fill removed from Race Screen. Replaced by glowing track-light dots (~400 per frame, cached at init). `trackLights` field added to track data model (color, style, speed). Four animation styles: steady, sequence (wave), sync_pulse, random_flash. Track Editor gains Track Lights section (color picker, style dropdown, speed slider). Server startup migration sets themed defaults per track ID. `trackLights.js` module: `sampleBoundaryAtInterval`, `getLightAlpha`, `drawTrackLights`. Server-side validation in POST/PUT. |
| 2026-05-01 | Error Boundary (PR #51): `ErrorBoundary.jsx` wraps entire app in `main.jsx` — catches all render-time throws, shows "Something went wrong" fallback, prevents blank-screen crashes. +8 unit tests. |
| 2026-05-01 | Race Track Lights + Cache-Bug-Fix (PR #52): Feature complete (see entry above). Post-PR Browser-Test aufgedeckt: (1) `trackLights` wurde nicht über Cache-Reload persistiert — Root Cause: `cacheTrackGeometry` hatte explizite Whitelist, `trackLights` fehlte. Struktureller Fix: Spread+Exclusion-Pattern (L37). +23 Round-Trip-Tests. (2) Track-Lights-Controls zu breit — CSS-Fix (width:100% + flex:1 entfernt). PR #52 squash-gemergt auf master (dc62557). |
| 2026-05-01 | Doc-Sprint (docs/post-vre-sync): Phasen-Status post-VRE + Track-Lights synchronisiert. Geplante Phasen-Reihenfolge ergänzt (Kamera-Phase als nächste Hauptpriorität). |
| 2026-05-01 | Konzept-Doku-Sprint (docs/track-lifecycle-hybrid-concept): Phase Track Lifecycle Hybrid vor Implementation dokumentiert. UI-Flow-Bug (Draw-Geometry öffnet blank Editor ohne Preset-Kontext), Backend-PUT ignoriert Client-geometryId, Track-Delete löscht Geometrie automatisch, Default-Tracks haben keine Server-Records. Hybrid-Konzept: Default-Tracks → Server-Records bei Boot (idempotent), Code-Bundle als Fallback-Schicht, Server-PUT respektiert Client-geometryId, Track-Delete löscht NIEMALS automatisch Geometrie, Auto-Backup bei jedem PUT/POST, Status-Banner im Fallback-Modus. Drei Sub-PRs: TLH-1 (Backend-Fixes + Migration), TLH-2 (UI-Flow + Cleanup), TLH-3 (Code-Fallback + Banner + Export). |
| 2026-05-01 | TLH-1 — Backend-Fixes + Migration (PR #55, squash-merged): Default-Tracks als Server-Records seeded, PUT geometryId client-authoritative, DELETE bewahrt Geometrie-Cache, Auto-Backup bei jedem PUT/POST, atomicWriteJson OneDrive-Fallback, vi.unstubAllGlobals() Fix (Q-19). +11 Tests (10 Backend + 1 Frontend). 1235 unit + 183 e2e + 107 backend Tests. |
| 2026-05-02 | TLH-2 — UI-Flow + Cleanup (PR #56 + Post-Merge Bug-Fixes PR #57): Edit-Modal Geometry-Status-Display (ersetzt Dropdown), Track-Editor Two-Mode (Load/New), Two-Path-Load (Geometry-Cache + Direct-Server), geometryId-First-Draw. Bug-Fixes: hasGeo→geometryId+pointCount, scroll-reset on mount, Load-Mode Background optional, autoMaxRacers crash-fix (Lessons 39/40). +19 Tests. 1256 unit + 183 e2e + 109 backend Tests. |
| 2026-05-02 | Track-Delete-Safeguards + Background-Race-Condition-Fix (PR #58, squash-merged `fc5690f`): "Remove background"-Button im Track-Editor, `DELETE /api/tracks/:id/background` Endpoint, isDefault-403-Guard für `DELETE /api/tracks/:id`, migrateDefaultTracks von one-shot→idempotent, React key=null Fix, Background-Image useEffect cancelled-Flag (Lessons 41/42/43). +9 Tests. 1265 unit + 183 e2e + 114 backend Tests. |
| 2026-05-02 | Default-Tracks zeichnen: Alle 5 Geometrien im Track Editor gezeichnet und gespeichert — Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit. Weltall (Custom-Track) ebenfalls vorhanden. Phase TLH-1+2+Safeguards damit vollständig abgeschlossen. |
| 2026-05-04 | PR-A3 Dev-Panel-Reorganisation: Tier-System ("All \| Operator" Toggle) eingeführt. Race Defaults auf Position 1 (häufigste Operation) mit Subtitle, 7 Tooltips, Reset-Button. Neue konsolidierte Section "Race Tuning" mit 9 Blöcken in Storyline-Reihenfolge (Speed Range → Start Layout → Row Start → Speed Re-Roll → Drafting → Comfort Zone → Soft Avoidance → Speed Brake → Home Force). Re-Roll-Werte aus PR-A2.6 (±85%, 5s, Divisor 15) aus RaceScreen-Hardcodes in tunable `raceDynamicsConfig` extrahiert. BaseSpeedSection + RaceBehaviorSection gelöscht (aufgegangen in Race Tuning). SectionContainer-Wrapper-Komponente extrahiert. Tier-Trenner "Advanced" in Sidebar. Storage bleibt fragmentiert (racearena:baseSpeedConfig + raceBehaviorConfig + raceDynamicsConfig [NEU]), UI konsolidiert. +37 neue Unit-Tests (raceDynamicsConfig ×12, RaceTuningSection ×15, DevScreen-tier-toggle ×10). 79 Test-Files, 1396 Tests grün. |
| 2026-05-06 | **Phase 4 — Camera Timing Tunables + Plan-B Pan + Diagnose-HUD** (branch `diagnosis/camera-tuning-effectiveness`): 7 timing tunables im CameraDirector-Konstruktor (battleGapThreshold, battleGapHysteresis, battleMaxDurationMs, overviewCooldownMin/Max, overviewDuration, lerpFactor). BATTLE_ZOOM-Hysterese + Max-Duration-Cap. Periodic OVERVIEW jitter (random cooldown aus [Min, Max]). Config-Schema v2→v3 (Ms-Suffix für battleMaxDurationMs). Diagnose-HUD als Tier-2-Toggle im Dev-Panel. **Plan-B Pan-Fix:** `_computePanScale` entfernt (war doppelter bsX-Faktor); triviale Pan-Formel `hw − r.x × zoom` in allen 3 States. 4 Pan-Centering-Tests ersetzt (canvas-space Koordinaten-Nachweis). Diagnose-Lessons L54–L69 in LESSONS.md. 1619 Unit-Tests grün (91 Test-Files). Open Issues: DIAG-OpenTrackPan, Pan-Target-Identification. |
| 2026-05-12 | **Phase 1 Foundation — Per-State Camera + EditorShape Interpolation** (branch `feat/per-state-camera-phase-1-foundation`): **EditorShape linear interpolation** — `Math.round()` durch `Math.floor()`+Blend ersetzt; eliminiert ~20 px Staircase-Sprünge bei zoom 4× (Etappe 26). **Pulk Battle Trigger** — `battlePulkThresholdPx` (200 px) + `battleMinDurationMs` (3000 ms) ersetzen fraktions-basiertes `battleGapThreshold`; `_isPulk()` prüft top-10-Racer auf Cluster. **Schema v5** — `leadInDuration`/`leadOutDuration` (Sekunden) ersetzen pixel-basierte `leadInDistance`/`followDuration`/`leadOutDistance`; v4→v5 Migration in `cameraConfig.js`. **Observer-Phase** — lead-in → follow → lead-out Phasen pro State-Eintritt. **HUD Tier-2 Erweiterung** — `transitionCount60f`, `entryElapsedMs`, `entryDeltaZoom/X/Y`, BATTLE-DIAG + LEADER-DIAG frozen-snapshot panels. **Cleanup** — `_display*` und `_drawX/_drawY` Workaround-Felder entfernt; Etappe-23-Trace entfernt; tote Module gelöscht (utils/index.js, SectionContainer). 1717 Unit-Tests grün (93 Test-Files, +98 neue Tests). Pre-Merge-Audit: 0 CRITICAL. |
| 2026-05-17 | **Phase 2B.1 — avoidanceWarmupMs + Track-Type maxPlayers + ESLint Cluster B + Fairness Sim Fix** (feat/fairness-simulation → master): speedBrake-Ramp (easeInOutCubic 0→1 über `avoidanceWarmupMs=3000ms`), `computeSpeedBonus` finishT-kalibriert + finite-checks; `maxPlayersOpen/Closed` split; ESLint 72→57 Warnings. Closed-Tracks 71/72 fair, Open-Tracks strukturell unfair (Avoidance-Problem, kein Formel-Problem). 1932 Unit-Tests. |
| 2026-05-19 | **Phase 3A — Race Plan + Bereichs-Bonus-Mechanik** (feat/phase-3a, 32 Commits, 1987 Tests): `racePlanner.js` — Bereichszuordnung (B1–B5), P-Controller (trajectoryMult ∈ [0.85, 1.10]), seeded PRNG. `bereichsBonusMult` in Physics-Loop (fade nach OUTCOME). Symmetrische Startreihen (bottom-up, Row 0 mittig). Natürliche Geschwindigkeit + dynamische Ziellinie Open Tracks (ssf-basiert). 5 HUD-Overlays (RP DIAG + B1-Liste + Speed-Monitor + Minimap-Badges + Startreihen). `racePlanBonusStrengthMultiplier` DevPanel-Slider + Sim-CLI-Arg. `computeAutoScaleFactor` Sim-Parität-Fix. Validierte Defaults: `avoidanceDistance=0.15`, `racePlanBonusStrengthMultiplier=2.0`. Sim-Smoke dragon×70×SpaceSprint×120s: Baseline χ²=10.5 (p<0.01 ❌) → Race Plan χ²=0.3–0.6 (p>0.75 ✅). User-Sichtcheck bestätigt: "3a fertig ist gut so wie es ist". |
| 2026-05-23 | **Phase 3B — BATTLE_ZOOM + COMEBACK_ZOOM + LEAD_CHANGE + Regie-Phase + Fixes** (feat/phase-3b-battle, squash `07bea7b`): BATTLE_ZOOM mit Isolation+Greedy-Expansion+Zentroid-Pan; COMEBACK_ZOOM mit grünem Highlight-Ring (globalAlpha statt ctx.filter); LEAD_CHANGE_ZOOM für Führungswechsel-Momente. Regie-System: gewichteter Kandidaten-Pool, OVERVIEW-Scheduler (konfigurierbares Cooldown-Fenster). Fixes: OVERVIEW Zoom-Fix (_overviewStateZoom=overviewZoom auf Open Tracks, L83); OVERVIEW Pan-Sprung (entry-phase nutzt shape.getPosition(_camT), L84); ctx.filter→globalAlpha GPU-Fix (L86); Overlay-Sets-Clear bei Race-Reset. 3 neue HUD-Komponenten (BattleDiagHUD, ComebackDiagHUD, LeadChangeDiagHUD). +54 unit Tests. 2041/2041 ✅. |

---

## Geplante Phasen-Reihenfolge (Stand 2026-05-06)

| # | Phase | Status | Notiz |
|---|---|---|---|
| 1 | **Kamera-Phase + RaceScreen-Refactor** | 🔄 In Progress — Phase 4 (Tunables + Pan-Fix) ✅ | PR-A1/A2/A2.5/A2.6/A3 ✅. Phase 4 Timing Tunables + Plan-B Pan ✅ (branch: `diagnosis/camera-tuning-effectiveness`). Offen: PR-B (Bug A+B+C), PR-C (RaceScreen-Split), PR-D (State-Machine vollständig), PR-E (Sprite-Korridor), PR-F (HUD), PR-G (UI-Bugs). |
| — | **Track Lifecycle Hybrid (TLH)** | ✅ TLH-1+2+Safeguards abgeschlossen | TLH-1 (PR #55): Backend-Fixes, Default-Track-Migration, Auto-Backup. TLH-2 (PR #56/57): UI-Flow, Two-Mode-Editor. Track-Delete-Safeguards (PR #58): Remove-Background-Button, 403-Guard, idempotente Migration. TLH-3 (Code-Fallback + Export) ⏳ zurückgestellt. Siehe `docs/TRACK_LIFECYCLE.md`. |
| — | **Default-Tracks zeichnen** | ✅ Abgeschlossen 2026-05-02 | Alle 5 Geometrien gezeichnet: Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit. |
| 3 | **Surface Zones** | geplant | Lokale Surface-Class-Überschreibungen innerhalb eines Tracks (Pfützen, Schlammstellen). Folge-Phase nach VRE. TrackEditor-Zonen-Zeichenwerkzeug, `EditorShape.getZonesAtPosition()`. |
| 4 | **B-UX-Phase** (Dev-Screen Cleanup) | geplant | Dev-Screen auf 30+ Parameter gewachsen — strukturelle Neuordnung, Hilfe-Modal pro Sektion (B-UX2/B-UX3). Vor D8 (voller Racer-Editor). |
| 5 | **Backup/Export-Feature** (B-5) | geplant | System Backup/Restore/Reset end-to-end verifiziert (UI vorhanden, Wiring fehlt). |
| 6 | **Docker `node --watch` Folge-PR** | geplant | Dev-Ergonomie: Hot-Reload im Docker-Container ohne Rebuild. |
| 7 | **Phase 5 — VPS-Deployment** | geplant ⚠️ Auth zuerst | Auth (JWT) muss vor Go-Live implementiert sein. CORS Wildcard + SEC-2 adressieren. |

**Bewusst zurückgestellt (Backlog, kein aktives Datum):**
- **D7d** — 100-Racer-Performance (Spatial Grid, LOD): kein akuter Blocker für aktuelle Use-Cases
- **D8** — Voller Racer-Config-Editor: nach B-UX-Phase
- **Dual-Particle-System** — `dustParticles` (Heimat-Trail) + `surfaceParticles` (VRE) als separate Pools: Konsolidierung nach Surface Zones sinnvoller
- **D3.6** — File-Reorganisation `racer-types/` → `racer-configs/` (39 Files): niedrige Priorität
- **chore/sprite-scale-relative** — spritePx DevScreen-Slider auf relativen Faktor umstellen (`spriteScale = spritePx / referenceSpriteSize`), damit Zoom-Kalibrierung racer-count-unabhängig wird (L82). Eigene kleine Branch + Migration.
