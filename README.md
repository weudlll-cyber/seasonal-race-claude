# RaceArena

A seasonal racing event platform where players compete in time-limited races across custom tracks.

## Overview

RaceArena lets an event organiser configure racers, draw tracks, set effects, and run live races. Everything runs in the browser — no server needed for Phases 1–4. A race-integrity server is planned for Phase 5.

## Tech Stack

| Layer    | Technology                                         |
|----------|----------------------------------------------------|
| Client   | React 18, CSS Modules, Vite, React Router v6       |
| Physics  | Client-side rAF race engine (Canvas 2D)            |
| Storage  | `localStorage` (`racearena:*` keys)                |
| CI/CD    | GitHub Actions (lint → test → audit on every PR)   |
| Server   | Planned for Phase 5 (SQLite, Socket.IO, JWT)       |

## Features

- **Track Editor** — draw inner/outer boundary curves on a background image (Center Mode and Boundary Mode), save to localStorage
- **Track Effects** — up to 3 simultaneous animated effects per track (rain, stars, bubbles, fireflies, dust, mud, wave); live preview in editor
- **Race Engine** — client-side physics, multi-lap + open-course support, collision avoidance
- **Camera Director** — auto-switching between OVERVIEW, LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM modes; picture-in-picture minimap
- **Dev Panel** — full CRUD for tracks, racers, branding profiles, race defaults, race history, system backup/restore
- **Preset Thumbnails** — rendered preview cards in SetupScreen track selector

## Project Structure

```
seasonal-race-claude/
├── client/          # React frontend (self-contained)
├── docs/            # Architecture, API, setup, track editor spec
└── .github/         # CI/CD workflows
```

## Getting Started

```bash
cd client && npm install
cd client && npm run dev
```

App runs at `http://localhost:3000`.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Track Editor Spec](docs/TRACK_EDITOR.md)
- [API Reference](docs/API.md) *(Phase 5 placeholder)*
- [Setup Guide](docs/SETUP.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
