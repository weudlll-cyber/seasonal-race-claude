# RaceArena — Session Handoff

**Last updated:** 2026-04-26
**Stable branch:** `main` at `cf256d8`
**Test count:** 453 (31 test files, all green)

---

## Current State

Phase 2.5 (Track Editor) is complete and merged. Issue D Phase D3.5.1 (SpriteRacerType
base class + tintSpriteWithMask) merged to master as PR #13. The app runs with
sprite-based horse rendering (11 coats) and emoji rendering for all other racer types.

Phase 4 Dev Panel UI is structurally complete, but two integration points are unverified:
Branding Profiles are not applied to race/result screens; Race History is not
auto-populated on race finish.

---

## Active Branches

| Branch | Status | Next Action |
|--------|--------|-------------|
| `docs/sprint-after-d35-part1` | DOC-SPRINT in progress | Commit + PR |
| `main` | cf256d8, 453 tests | stable |

---

## Next PRs (priority order)

1. **docs/sprint-after-d35-part1** — DOC-SPRINT documentation update (this handoff + ROADMAP + ARCHITECTURE + RACER_DATA_MODEL + AUDIT + PROJECT-PRINCIPLES + BACKLOG).
2. **D3.5.2** — Migrate Horse / Duck / Snail → `SpriteRacerType`; remove dead `_createTrail` from all three classes.
3. **D3.5.3** — 9 new racer types using `SpriteRacerType`; sprites already in `assets/racers/`.
4. **Phase B** — Wire Branding Profiles + Race History + winner-count to race/result screens.

---

## Open Risks

| Risk | Severity | Owner PR |
|------|----------|----------|
| Branding Profiles: UI done, not wired to race/result screens | Medium | Phase B |
| Race History: no auto-write on race finish | Medium | Phase B |
| Winner-count: setup field not wired to ResultScreen podium | Medium | Phase B / Phase 3 |
| Dead `_createTrail` in Horse/Duck/Snail | Low | D3.5.2 |
| Phase 4 `[x]` items in ROADMAP.md unverified end-to-end | Low | Phase V |

---

## Key Design Decisions (stable — do not change without a spec)

- **SpriteRacerType** — config-driven base; `new SpriteRacerType(config)`, not subclassing.
  Required fields: `id`, `spriteUrl`, `frameCount`, `basePeriodMs`, `displaySize`, `coats`,
  `trailFactory`. All future racer types use this class.
- **tintMode: 'mask'** — vehicle racers (Buggy, Motorbike, Plane, F1) set `tintMode: 'mask'`
  and provide `maskUrl`. White mask pixels are tinted; black pixels preserve source color.
- **getTrailParticles is the ACTIVE trail system.** `RaceScreen:616` calls
  `rt.getTrailParticles(...)`. The `_createTrail` / `this.trail` manifest field has never
  been called and must be removed in D3.5.2.
- **rteDefinitions** — reserved `[]` array on `SpriteRacerType` for Phase D6
  (Racer-Track-Effects). Stored + exposed via `getRteDefinitions()`; not processed yet.
- **One racer type per race** — all players share the same type; coats differentiate visually.
- **Single source of truth** — `racerTypeId` everywhere; `racearena:racerTypes` storage key.

---

## Architecture Snapshot

```
client/src/modules/racer-types/
├── SpriteRacerType.js      ← new D3.5.1 base class
├── HorseRacerType.js       ← will migrate to SpriteRacerType in D3.5.2
├── DuckRacerType.js        ← will migrate to SpriteRacerType in D3.5.2
├── SnailRacerType.js       ← will migrate to SpriteRacerType in D3.5.2
├── RocketRacerType.js      ← emoji-only, low priority
├── CarRacerType.js         ← emoji-only, low priority
├── spriteLoader.js
├── spriteTinter.js         ← tintSprite + tintSpriteWithMask (D3.5.1)
└── coatAssignment.js
```

---

## Three-Party Workflow

Strategic Claude (chat) → User (orchestrator) → Claude Code CLI (executor).
Specs must be self-contained before Claude Code begins execution. The PR body is the
authoritative spec reference.
