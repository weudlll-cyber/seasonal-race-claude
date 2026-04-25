# RaceArena — Architecture

## Overview

RaceArena is currently a self-contained React client. All race logic runs in the browser; all persistence uses `localStorage`. A backend server is planned for Phase 5 (see below).

## Folder Structure

```
seasonal-race-claude/
├── client/
│   ├── public/
│   │   ├── index.html
│   │   ├── assets/tracks/backgrounds/   # Track background images (1280×720)
│   │   └── assets/racers/               # Racer sprite sheets + CREDITS.md
│   └── src/
│       ├── screens/                # Route-level full-page views
│       │   ├── SetupScreen/        # Pre-race config (players, track, settings)
│       │   ├── RaceScreen/         # Live race canvas + camera director
│       │   ├── ResultScreen/       # Post-race podium and history
│       │   ├── DevScreen/          # Developer / admin panel (7 sections)
│       │   └── TrackEditor/        # Visual track drawing tool
│       ├── components/             # Reusable UI building blocks
│       │   ├── Button/
│       │   ├── Modal/
│       │   ├── InputField/
│       │   ├── ColorPicker/
│       │   ├── EffectConfig/       # Add/remove/configure track effects (F13)
│       │   ├── LogoUploader/
│       │   └── PresetThumbnail/    # Rendered track preview card
│       ├── modules/                # Domain logic, independent of React
│       │   ├── camera/             # CameraDirector, Minimap, lapUtils
│       │   ├── racer-types/        # Racer manifests (sprite render, animation, trail, coats)
│       │   │   ├── HorseRacerType.js   # Sprite-based horse with 11 coats
│       │   │   ├── spriteLoader.js     # Async image loader with module cache
│       │   │   ├── spriteTinter.js     # Offscreen-canvas tinting per coat
│       │   │   ├── coatAssignment.js   # Hash-based coat selection
│       │   │   └── (DuckRacerType.js, RocketRacerType.js, SnailRacerType.js, CarRacerType.js — emoji-based, D3 will migrate to sprites)
│       │   ├── storage/            # localStorage helpers (useStorage, KEYS)
│       │   ├── track-editor/       # Geometry CRUD, Catmull-Rom, EditorShape
│       │   ├── track-effects/      # Animated effect layers
│       │   │   ├── bgImageCache.js # Async image loader with module-level cache
│       │   │   ├── index.js        # listEffects / getEffect / getDefaultConfig
│       │   │   └── effects/        # rain, stars, bubbles, fireflies, dust, mud, wave
│       │   └── utils/              # Shared helpers (time, math)
│       ├── contexts/               # React contexts (TransitionContext)
│       ├── styles/
│       │   └── main.css
│       ├── App.jsx
│       └── main.jsx
│
├── docs/
│   ├── ARCHITECTURE.md             # This file
│   ├── API.md                      # Phase 5 placeholder
│   ├── SETUP.md
│   ├── ROADMAP.md
│   └── TRACK_EDITOR.md             # Track Editor full spec
│
└── .github/
    └── workflows/
        ├── ci.yml                  # Lint + test on PR
        └── deploy.yml              # Deploy on merge to main
```

## Data Flow (current)

```
Browser → React (screens/)
            ↓ Canvas (RaceScreen / TrackEditor)  ← rAF loop (inline in RaceScreen)
            ↓ localStorage (modules/storage/)    ← all settings, tracks, results
```

## Key Design Decisions

- **Pure client for Phases 1–4** — no server dependency. All race state, track geometry, player settings, and results persist in `localStorage` under `racearena:*` keys. See [TRACK_EDITOR.md — localStorage Keys](TRACK_EDITOR.md#localstorage-keys) for the key schema.
- **modules/ are framework-agnostic** — no React imports in `modules/`; screens own the component tree, modules own the logic.
- **Track Editor (Phase 2.5)** — Tracks are authored visually on top of background images. Geometry is stored as inner/outer boundary curves (Catmull-Rom interpolated). See `docs/TRACK_EDITOR.md`.
- **Track Effects replace Environments** — Animated overlays (rain, stars, bubbles, etc.) are opt-in per-track effect layers under `modules/track-effects/`. Up to 3 simultaneous effects per geometry. The old `environments/` module was deleted.
- **Inline draw helpers in RaceScreen** — `drawEditorBackground` and `drawEditorTrackSurface` are currently inlined in `RaceScreen/index.jsx`. Candidate for extraction into a `modules/track-renderer/` module in a future polish sprint (PP-2 in the Phase 2.5 hygiene report).
- **Sprite-based racers, not procedural primitives** — Issue D started with procedural Canvas drawing for racer bodies. Three iterations confirmed that anatomical detail (horse vs duck vs snail) at 22-26 px scale cannot be made readable with primitives. Racer types now use PNG sprite sheets with frame-based animation and offscreen-canvas tinting for color variants. Per-racer assets live under `client/public/assets/racers/` with credits in `CREDITS.md`.

## Future: Phase 5 Server

A backend will be built in Phase 5 with the following responsibilities:

- **Race-outcome authority** — server finalises and signs race results; client is display-only
- **Leaderboard & seasons** — race outcomes written to a persistent DB; season standings computed server-side
- **Socket.IO event streaming** — server broadcasts authoritative race-tick state; replaces the current client-only physics loop for multiplayer
- **Tech stack (planned):** Node.js / Express, Socket.IO, SQLite (single-server) or Postgres (scaled), JWT session tokens with bcrypt

The Phase 5 server will be a fresh implementation designed around race integrity. The original server scaffold (user-auth REST) was deleted in F16 as architecturally incompatible with this model.
