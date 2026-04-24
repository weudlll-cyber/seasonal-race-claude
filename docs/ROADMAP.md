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

## Phase 3 — Result Screen (planned)

- [ ] Podium display (top N winners)
- [ ] Full results table
- [ ] Auto-advance from race → results
- [ ] Share / export result card

## Phase 4 — Dev Panel & Configuration ⬜ In progress

- [x] Dev Screen shell (sidebar nav, 7 sections)
- [x] Player Groups Manager — save/load/quick-import named rosters
- [x] Racer Manager — add/edit/delete custom racer types
- [x] Track Manager — full CRUD, geometry link, effects preview, set default
- [x] Branding Profiles — event name, colors, logo upload, live preview
- [x] Race Defaults — duration, winners, countdown, auto-advance, sound, language
- [x] Race History — filterable table, CSV export, clear
- [x] System — JSON backup/restore, factory reset, version info
- [x] Gear icon (⚙️) in SetupScreen header → Dev Panel
- [x] localStorage persistence (`racearena:*` keys) for all settings
- [x] Custom tracks and racers flow into SetupScreen automatically
- [ ] Branding profile applied to race / result screens
- [ ] Race history auto-populated when races finish

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
- [ ] Branding applied to race / result screens
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
- [x] Vitest + React Testing Library (307 tests, 25 test files)
- [x] GitHub Actions CI — push + PR to main: lint → format-check → test → audit
- [x] Husky pre-commit hook → lint-staged (ESLint fix + Prettier on staged files)
- [x] docs/AUDIT.md with OWASP Top 10 checklist

---

## Session Log

| Date | Entry |
|------|-------|
| 2026-04-19 | Setup Screen built, Dev Screen with 7 sections built, full QA pipeline installed (ESLint, Prettier, Vitest 29 tests, GitHub Actions, Husky pre-commit hooks), AUDIT.md created. |
| 2026-04-22 | Race Engine phase complete: SVG-path track system (5 shapes), 5 environments, racer types, race loop with collision avoidance, multi-lap closed tracks (lapsFromDuration 1–4), scrolling camera for open tracks (2.5× virtual canvas), TV camera director (OVERVIEW/LEADER_ZOOM/BATTLE_ZOOM/COMEBACK_ZOOM), fullscreen toggle (⛶), fade-to-black screen transitions (TransitionContext), result screen + race history. 228 Vitest tests. |
| 2026-04-23 | CI restored (vite 5→8 upgrade via PR #1), environments refactored to consume background image paths from track config via module-level image cache (PR #2), project hygiene pass for line endings, coverage ignore, and SETUP.md stack correction (PR #3). Documentation for Phase 2.5 Track Editor feature established. 232 Vitest tests still green. |
| 2026-04-24 | Phase 2.5 Track Editor complete on branch `feat/track-editor`. Track geometry CRUD, EditorShape, Center/Boundary mode, full edit ops, undo/redo, 6 track effects with multi-effect array (up to 3 per geometry), live editor preview, minimap, camera director, preset thumbnails. Pre-merge audit (AUDIT.md) identified critical auth issue in scaffolded server code. F15 audit fixes applied. F16 deleted unused server scaffold entirely (architecture incompatible with Phase 5 plan). F17 source hygiene audit. F18 removed day-one/phase-2 dead-code scaffold (track-canvas, race-engine, race-simulation, particle-effects, track-renderer stub, dead entry files). PR #6 squash-merged. 307 Vitest tests across 25 files. |
| 2026-04-25 | Pre-D cleanup: removed empty module dirs left behind by F10/F18 (particle-effects, race-engine, race-simulation, track-canvas, track-shapes, environments, socket), ARCHITECTURE.md folder structure aligned with reality, ROADMAP.md test count corrected (365→307 / 28→25), .gitignore tightened. CI workflow fixed (server job removed, was blocking merge). |
