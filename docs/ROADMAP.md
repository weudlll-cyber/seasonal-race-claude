# RaceArena — Development Roadmap

## Phase 1 — Setup Screen ✅ 100% complete

- [x] Vite + React project scaffold (migrated from CRA)
- [x] Global dark theme CSS variables
- [x] SetupScreen with Players / Track / Settings tabs
- [x] PlayerSetup — name entry, racer badge assignment, reshuffle
- [x] TrackSelector — 5 track types, card grid, color identities
- [x] RaceSettings — duration, winner count, optional event name
- [x] RandomHelper — Fisher-Yates shuffle, assignRacers, randomInt
- [x] App routing (React Router v6) — `/` → `/setup`
- [x] Start Race button guard (requires ≥1 player + track selected)

## Phase 2 — Race Engine (planned)

- [ ] Server-side race tick loop (Socket.IO)
- [ ] Client-side physics prediction
- [ ] Canvas track renderer
- [ ] Live race screen with racer positions
- [ ] Countdown and finish detection

## Phase 3 — Result Screen (planned)

- [ ] Podium display (top N winners)
- [ ] Full results table
- [ ] Auto-advance from race → results
- [ ] Share / export result card

## Phase 4 — Dev Panel & Configuration ⬜ In progress

- [x] Dev Screen shell (sidebar nav, 7 sections)
- [x] Player Groups Manager — save/load/quick-import named rosters
- [x] Racer Manager — add/edit/delete custom racer types
- [x] Track Manager — full CRUD, difficulty, curve style, set default
- [x] Branding Profiles — event name, colors, logo upload, live preview
- [x] Race Defaults — duration, winners, countdown, auto-advance, sound, language
- [x] Race History — filterable table, CSV export, clear
- [x] System — JSON backup/restore, factory reset, version info
- [x] Gear icon (⚙️) in SetupScreen header → Dev Panel
- [x] localStorage persistence (`racearena:*` keys) for all settings
- [x] Custom tracks and racers flow into SetupScreen automatically
- [ ] Branding profile applied to race / result screens
- [ ] Race history auto-populated when races finish (Phase 2 integration)

## Phase 5 — Seasons & Leaderboard (planned)

- [ ] Season model (server)
- [ ] Standing calculation after each race
- [ ] Leaderboard screen
- [ ] Season archive

## Phase 6 — Polish & Production (planned)

- [ ] Sound effects
- [ ] Animations (racer movement, finish line)
- [ ] Mobile / tablet responsive tuning
- [ ] i18n (English + German)
- [ ] Production deployment pipeline

---

## QA Pipeline ✅ Complete

- [x] ESLint v9 flat config (React + hooks + Prettier compat)
- [x] Prettier (single quotes, 2-space, printWidth 100)
- [x] Vitest + React Testing Library (29 tests, 3 suites)
- [x] GitHub Actions CI — push + PR to main/master: lint → format-check → coverage → audit
- [x] Husky pre-commit hook → lint-staged (ESLint fix + Prettier on staged files)
- [x] docs/AUDIT.md with OWASP Top 10 checklist

---

## Session Log

| Date | Entry |
|------|-------|
| 2026-04-19 | Setup Screen built, Dev Screen with 7 sections built, full QA pipeline installed (ESLint, Prettier, Vitest 29 tests, GitHub Actions, Husky pre-commit hooks), AUDIT.md created. |
| 2026-04-22 | Race Engine phase complete: SVG-path track system (5 shapes), 5 environments, racer types, race loop with collision avoidance, multi-lap closed tracks (lapsFromDuration 1–4), scrolling camera for open tracks (2.5× virtual canvas), TV camera director (OVERVIEW/LEADER_ZOOM/BATTLE_ZOOM/COMEBACK_ZOOM), fullscreen toggle (⛶), fade-to-black screen transitions (TransitionContext), result screen + race history. 228 Vitest tests. |
