# RaceArena — Architecture

## Overview

RaceArena is currently a self-contained React client. All race logic runs in the browser; all persistence uses `localStorage`. A backend server is planned for Phase 5 (see below).

## Folder Structure

```
seasonal-race-claude/
├── client/
│   ├── public/
│   │   └── index.html              # HTML shell
│   └── src/
│       ├── screens/                # Route-level full-page views
│       │   ├── SetupScreen/        # Pre-race config and lobby
│       │   ├── RaceScreen/         # Live race view
│       │   ├── ResultScreen/       # Post-race results
│       │   └── DevScreen/          # Developer sandbox
│       ├── components/             # Reusable UI building blocks
│       │   ├── Button/
│       │   ├── Modal/
│       │   ├── InputField/
│       │   ├── ColorPicker/
│       │   ├── EffectConfig/
│       │   └── LogoUploader/
│       ├── modules/                # Domain logic, independent of React
│       │   ├── race-engine/        # Client-side physics tick
│       │   ├── track-editor/       # Track geometry storage & shapes
│       │   ├── track-effects/      # Animated effect layers (rain, stars, …)
│       │   ├── track-renderer/     # Canvas draw calls
│       │   ├── track-canvas/       # Camera, minimap, lap utilities
│       │   ├── racer-types/        # Racer stat definitions
│       │   ├── storage/            # localStorage helpers
│       │   └── utils/              # Shared helpers (time, math)
│       ├── styles/
│       │   └── main.css
│       ├── App.jsx
│       └── main.jsx
│
├── docs/
│   ├── ARCHITECTURE.md             # This file
│   ├── API.md
│   ├── SETUP.md
│   └── TRACK_EDITOR.md
│
└── .github/
    └── workflows/
        ├── ci.yml                  # Lint + test on PR
        └── deploy.yml              # Deploy on merge to main
```

## Data Flow (current)

```
Browser → React (screens/)
            ↓ Canvas (modules/track-renderer/)  ← modules/race-engine (rAF tick)
            ↓ localStorage (modules/storage/)   ← all settings, tracks, results
```

## Key Design Decisions

- **Pure client for Phases 1–4** — no server dependency. All race state, track geometry, player settings, and results persist in `localStorage` under `racearena:*` keys.
- **modules/ are framework-agnostic** — no React imports in `modules/`; screens own the component tree, modules own the logic.
- **Track Editor (Phase 2.5)** — Tracks are authored visually on top of background images. Geometry is stored as inner/outer boundary curves (Catmull-Rom interpolated). See `docs/TRACK_EDITOR.md`.
- **Track Effects replace Environments** — Animated overlays (rain, stars, bubbles, etc.) are opt-in per-track effect layers under `modules/track-effects/`. The old `environments/` concept is retired.

## Future: Phase 5 Server

A backend will be built in Phase 5 with the following responsibilities:

- **Race-outcome authority** — server finalises and signs race results; client is display-only
- **Leaderboard & seasons** — race outcomes written to a persistent DB; season standings computed server-side
- **Socket.IO event streaming** — server broadcasts authoritative race-tick state; replaces the current client-only physics loop for multiplayer
- **Tech stack (planned):** Node.js / Express, Socket.IO, SQLite (single-server) or Postgres (scaled), JWT session tokens

The Phase 5 server will be a fresh implementation designed around race integrity, not a continuation of the deleted scaffold (which assumed a user-auth REST API incompatible with this model).
