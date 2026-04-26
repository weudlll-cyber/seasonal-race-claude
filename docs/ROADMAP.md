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

## Issue D — Racer Redesign ✅ Parts 1–3 merged, Parts 4–5 pending

Replaces emoji racers with sprite-based renderable types.

- [x] D1 — Extended racer manifest (render, animation, trail, style fields)
- [x] D2 — drawRacer wiring + trail integration for horse
- [x] D2.3 — Sprite-based horse render (4-frame trot animation, 128×128 tile sheet)
- [x] D2.4 — 11 horse coats with hash-based per-player assignment
- [x] D3.5.1 — SpriteRacerType config-driven base class; tintSpriteWithMask for mask-restricted tinting
- [x] D3.5.2 — Horse/Duck/Snail → SpriteRacerType; `_createTrail` system removed
- [x] D3.5.3 — 9 new racer types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane, F1, Rocket)
- [ ] D3.5.4 — Trail-Tuning: visual trail quality refinement per type
- [ ] D3.5.5 — Speed-UI in Dev-Screen 🔜 (D9 merged — ready)
- [ ] D3.6 — File-Reorganisation: `racer-types/` → `racer-configs/` (39 files)
- [ ] D4 — Performance pass for 100 racers @ 60 FPS
- [ ] D6 — Racer-Track-Effects (RTE): per-racer effects triggered by track geometry
- [ ] D7 — Camera polish: smooth zoom transitions, configurable director preferences per track
- [ ] D8 — Full Racer Config Editor in Dev-Screen (coats, all fields, sprite switching)

## Phase B — Bug Fixes & Wiring

- [x] B-6 — speedMultiplier-Bug — subsumed by D9
- [x] B-7 — Dev-Screen UI-Drift: Code-Registry as Single Source of Truth (PR #17)
- [x] B-8 — SetupScreen Footer/Pills Emoji-Mapping fixed (PR #17)
- [x] B-9 — Override Selector filters inactive types (PR #17 cleanup)
- [ ] B-1 — PlayerSetup: loading saved groups (button exists, behavior unclear)
- [ ] B-2 — TrackSelector: custom-track behavior on missing geometry
- [ ] B-3 — Result-Screen winner count configurable (currently hardcoded)
- [ ] B-4 — Branding profile applied to race/result screens (UI exists, wiring missing)
- [ ] B-5 — System Backup/Restore/Reset end-to-end verified (UI-only so far)

## D9 — Race Engine Speed Refactor ✅ Done (PR #19, master `dad3300`)

Makes `speedMultiplier` effective on race speed. Replaces `lapsFromDuration` auto-calculation
with explicit operator choice (lap count for closed tracks, race duration for open tracks).
Adds dynamic finish-line positioning for open tracks, run-out behavior, 2-second result delay,
and estimated-duration display in SetupScreen. New Playwright e2e infrastructure with 22
smoke tests. 628 unit tests + 22 e2e tests.

## D3.5.5 — Speed-UI in Dev-Screen 🔜 NEXT

speedMultiplier display for all 12 types in RacerManager. Slider + preview.
D9 dependency met — ready to implement.

## D10 — Track Size Variability (planned, after D9)

Lifts the 1280px track-width constraint. Enables longer open-track races. Unlocks longer
sprint-style tracks designed specifically for Rocket/F1 speed types.

## W3 — Race-Type Override ✅ Done (PR #17)

Session-only racer-type override selector in the Setup Track tab. Filters disabled types.
Resets on track change. Not persisted.

## Phase Q — Quality Hygiene

- [x] Q-1 through Q-5 — Dead exports, unused imports, TODO tags, JSON.parse hygiene, file
  headers (PR #17 cleanup commit)
- [ ] Q-6 — TrackEditor.jsx split-refactor (1006 LOC, pre-existing)
- [ ] Q-7 — RaceScreen/index.jsx split-refactor (886 LOC, pre-existing)
- [ ] Q-8 — Watch-list: TrackManager.jsx (346 LOC), BrandingProfiles.jsx (330 LOC)

## Phase V — Verification Sprint (planned)

Systematic verification of all unconfirmed ROADMAP.md `[x]` items against the running app.
See BACKLOG.md V-1 through V-9 for full item list.

## Phase T — Tooltip Retrofit (planned)

Tooltip-convention applied to all existing Dev-Screen fields that lack self-evident labels.
See BACKLOG.md T-1 through T-4.

## Phase 5 — Race-Integrity Server & Leaderboard (planned)

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
- [x] Vitest + React Testing Library (628 unit tests, 45 test files) + Playwright e2e (22 tests)
- [x] GitHub Actions CI — push + PR to main: lint → format-check → test → audit
- [x] Husky pre-commit hook → lint-staged (ESLint fix + Prettier on staged files)
- [x] docs/AUDIT.md with OWASP Top 10 checklist

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
