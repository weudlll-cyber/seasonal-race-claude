# RaceArena

A seasonal racing event platform where players compete in time-limited races across custom tracks.

## Overview

RaceArena lets an event organiser configure racers, draw tracks, set effects, and run live races. The race engine runs in the browser. A local Express server (Phase L) handles track storage and background images. A race-integrity server is planned for Phase 5.

## Tech Stack

| Layer    | Technology                                         |
|----------|----------------------------------------------------|
| Client   | React 18, CSS Modules, Vite, React Router v6       |
| Physics  | Client-side rAF race engine (Canvas 2D)            |
| Tests    | vitest (full unit suite), Playwright (e2e) |
| Storage  | `localStorage` (`racearena:*` keys)                |
| CI/CD    | GitHub Actions (lint → test → audit on every PR)   |
| Server   | Express / Node (Phase L, port 4000); Phase 5 race-integrity planned |

## Features

- **10 built-in tracks** — Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit, Mountainstreet, Ice Track, Seatrack, Searound, Luger Hill; each with surface classes, world dimensions, and background images
- **20 built-in racer types** — horse, duck, snail, elephant, giraffe, snake, dragon, f1, rocket, buggy, motorbike, plane, luge, beetle, boarder, koi, turtle, manta, dolphin, snowmobile; all SpriteRacerType with surface-class filtering
- **Racer Editor** — create custom racer types from PNG sprite sheets: background removal, animation preview, metadata, saved to localStorage
- **Track Editor** — draw inner/outer boundary curves on a background image (Center Mode and Boundary Mode), stored server-side via Phase L
- **Track Effects** — up to 3 simultaneous animated effects per track (rain, stars, bubbles, fireflies, dust, mud, wave); live preview in editor
- **Race Engine** — client-side physics, multi-lap + open-course support; force-based lane separation (home force, avoidance, free-lane separation, speed brake, drafting); Race Plan choreography soft-guides racers toward target finishing positions
- **Camera Director** — TV-style state machine (OVERVIEW / LEADER_ZOOM / BATTLE_ZOOM / COMEBACK_ZOOM / LEAD_CHANGE); pulk-based battle trigger; time-based lead-in / lead-out phases; per-state zoom tuning in Dev Panel; picture-in-picture minimap
- **Frame-Timing Engine** — fixed-timestep physics accumulator (FIXED_DT=16ms), EMA dt-smoothing for camera, render-state interpolation for smooth motion at variable FPS
- **Dev Panel** — full CRUD for tracks, racers, branding profiles, race defaults, race history, system backup/restore; race plan and dynamics tuning

## Project Structure

```
seasonal-race-claude/
├── client/          # React frontend (Vite, vitest, Playwright)
├── server/          # Express backend — track storage, backgrounds (port 4000)
├── scripts/         # Headless simulation + sweep tools (Node.js)
├── docs/            # Architecture, API, setup, track editor spec, lessons
└── .github/         # CI/CD workflows
```

## Getting Started

```bash
cd client && npm install
cd client && npm run dev
```

App runs at `http://localhost:3000`.

## Running Tests

```bash
cd client && npm test          # vitest run — full unit suite
```

## Local Backend (Phase L)

```bash
docker compose up          # starts server on port 4000
cd client && npm run dev   # starts frontend on port 3000 (separate terminal)
```

### Available endpoints

| Endpoint | Response |
|---|---|
| `GET /api/health` | `{ status: "ok", timestamp }` |
| `GET /api/tracks` | Array of custom track summaries |
| `GET /api/tracks/:id` | Full track including geometry points |
| `GET /api/tracks/:id/background` | Binary image (JPEG/PNG) |

The frontend loads server custom tracks automatically and merges them with the 10 code-defined default tracks. Background images are cached locally for offline use.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Track Editor Spec](docs/TRACK_EDITOR.md)
- [API Reference](docs/API.md)
- [Setup Guide](docs/SETUP.md)
- [Roadmap](docs/ROADMAP.md)

## License

MIT
