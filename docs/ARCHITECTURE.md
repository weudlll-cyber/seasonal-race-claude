# RaceArena — Architecture

## Overview

RaceArena is a client-server application. The React frontend communicates with the Node/Express backend over both REST (game data) and Socket.IO (real-time race state).

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
│       │   └── LogoUploader/
│       ├── modules/                # Domain logic, independent of React
│       │   ├── race-engine/        # Client-side physics tick & prediction
│       │   ├── track-renderer/     # Canvas draw calls
│       │   ├── racer-types/        # Racer stat definitions
│       │   ├── track-types/        # Track geometry definitions
│       │   ├── socket/             # Socket.IO client singleton
│       │   └── utils/              # Shared helpers (time, math)
│       ├── styles/
│       │   └── main.css
│       ├── App.js
│       └── index.js
│
├── server/
│   └── src/
│       ├── modules/                # Domain modules (handlers + logic)
│       │   ├── race/               # Race CRUD handlers
│       │   ├── socket/             # Socket.IO event registration
│       │   ├── db/                 # SQLite connection & schema bootstrap
│       │   └── utils/              # Shared server utilities
│       ├── routes/                 # Express routers
│       │   ├── race.js
│       │   ├── user.js
│       │   └── season.js
│       ├── middleware/
│       │   ├── auth.js             # JWT guard
│       │   └── errorHandler.js
│       └── index.js
│
├── docs/
│   ├── ARCHITECTURE.md             # This file
│   ├── API.md
│   └── SETUP.md
│
├── scripts/
│   ├── seed.js                     # DB seed data
│   └── deploy.sh                   # Production deploy helper
│
└── .github/
    └── workflows/
        ├── ci.yml                  # Lint + test on PR
        └── deploy.yml              # Deploy on merge to main
```

## Data Flow

```
Browser → React (screens/)
            ↓ REST (fetch)                     → Express routes → modules/race  → SQLite
            ↓ Socket.IO (modules/socket/)       → modules/socket → broadcast state
            ↓ Canvas (modules/track-renderer/)  ← modules/race-engine (rAF tick)
```

## Key Design Decisions

- **SQLite via better-sqlite3** — synchronous, zero-config, ideal for single-server deployment; swap for Postgres when horizontal scaling is needed.
- **modules/ on both sides** — client `modules/` are framework-agnostic (no React imports); server `modules/` own their DB queries directly, no separate model layer.
- **Socket.IO rooms** map 1-to-1 with race IDs for isolation.
- **JWT** is short-lived (1h) and validated on every protected route and socket connection.
- **Seasons** are a first-class DB table so the leaderboard can be cleanly reset between them.
- **Track Editor (Phase 2.5)** — Tracks are authored visually on top of background images via an editor in the Dev Panel. Geometry is stored as inner/outer boundary curves (Catmull-Rom interpolated). See `docs/TRACK_EDITOR.md`.
- **Track Effects replace Environments** — The current `client/src/modules/environments/` concept will be retired. Track backgrounds are the authored image. Animated overlays (stars, bubbles, etc.) become opt-in per-track effect layers under `client/src/modules/track-effects/`.
