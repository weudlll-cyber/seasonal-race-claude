# RaceArena — Backlog

Living list. See ROADMAP.md for phase context and completion status.
Items are ranked by urgency within each bucket.

---

## Hot — next PR

- **D3.5.2** — Migrate Horse / Duck / Snail → `SpriteRacerType`; remove dead `_createTrail`
  system from all three classes. RaceScreen never calls `_createTrail`; removing it shrinks
  each class to a config object.
- **docs/sprint-after-d35-part1** — DOC-SPRINT in progress; commit + open PR when complete.

---

## Ready — spec exists or is trivial

- **D3.5.3** — 9 new racer types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane,
  F1, RocketSprite) using `SpriteRacerType`. 11 untracked sprite sheets already in
  `client/public/assets/racers/`. Vehicle racers (Buggy, Motorbike, Plane, F1) use
  `tintMode: 'mask'` for small tinted regions on otherwise-fixed bodies.

- **Phase B — Wiring gaps** (three items, each small):
  - Branding Profile applied to race / result screens (UI exists in Dev Panel; wiring TBD).
  - Race History auto-populated on race finish (localStorage write is missing from RaceScreen).
  - Winner-count from SetupScreen wired into ResultScreen podium display.

- **W2** — Data model cleanup per RACER_DATA_MODEL.md: remove `racerId` duplication,
  consolidate TrackManager to one "Default Racer Type" dropdown, remove "Associated Track"
  field from RacerTypeManager.

---

## Planned — needs spec

- **D4** — Performance pass for 100 racers at 60 FPS.
- **D5** — Lint cleanup; `--max-warnings 0` in CI.
- **D6 — Racer-Track-Effects (RTE)** — `rteDefinitions` on `SpriteRacerType` is reserved.
  Needs `RteManager` in RaceScreen and a schema spec. Per-racer particle effects triggered
  by track state (mud spray, water splash, etc.).
- **D7 — Camera Polish** — smooth zoom transitions between director modes; configurable
  mode preferences per track.
- **Phase Q — Quality Gate** — ESLint `--max-warnings 0` in CI; Playwright E2E tests for
  critical path (setup → race → results).
- **Phase V — Verification Sprint** — audit all ROADMAP.md `[x]` items against the running
  app; confirm Branding Profiles, System Backup, Race History claims are end-to-end correct.

---

## Parking Lot — future / uncertain scope

- Phase 5: server, leaderboard, Socket.IO (architecture planned; no code).
- Phase 7: custom sprite upload via Dev Panel; dynamic `SpriteRacerType` from JSON.
- i18n (English + German base).
- Multi-tenant isolation (per-organizer track sets and branding).
- Mobile / tablet responsive tuning.
