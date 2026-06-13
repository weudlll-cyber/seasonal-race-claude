# RaceArena

**Stage a race, draw the track, line up the field — then watch it unfold like a live broadcast, right in your browser.**

<!-- Optional but recommended: add a screenshot or short GIF of a race here, e.g.
     ![RaceArena in action](docs/screenshot.png) -->

RaceArena is a browser-based racing-event visualizer and simulator. You play the event organiser: pick the racers (horses, dragons, rockets, dolphins…), choose or draw a track, add some seasonal atmosphere, and hit start. The race runs entirely in the browser, and a TV-style camera director follows the action — diving into battles, catching lead changes, and pulling back for the finish.

It began as a simple horse-race visualizer and grew into a full multi-racer, multi-track simulation with a track editor, a sprite-based racer editor, configurable physics, and an event-branding system.

> New here? This is a single-event presentation tool, not an online multiplayer game — one organiser sets everything up locally and runs the show.

## See it running

```bash
git clone https://github.com/weudlll-cyber/seasonal-race-claude.git
cd seasonal-race-claude/client
npm install
npm run dev
```

Open `http://localhost:3000` and you're in — that's enough to explore every built-in track and racer.

To save your own hand-drawn tracks and their background images, also start the local backend (optional):

```bash
docker compose up        # backend on http://localhost:4000
```

Without the backend you still get all 10 built-in tracks; you just can't persist custom tracks or their images. Full details are in the [Setup Guide](docs/SETUP.md).

## What you can do

- **Build the field** from 20 built-in racer types — or make your own from a PNG sprite sheet in the Racer Editor (background removal, animation preview, auto-tinting).
- **Race on 10 built-in tracks**, or draw your own in the Track Editor (inner/outer boundary curves or a center line over a background image).
- **Set the mood** with up to 3 layered animated effects per track (rain, stars, bubbles, fireflies, dust, mud, waves).
- **Brand the event** with a name, logo, and colours that appear across the setup screen, the in-race overlay, and the results.
- **Run the race** and let the Camera Director broadcast it: battle close-ups, comeback and lead-change shots, a finish overview, and a picture-in-picture minimap.
- **Tune everything** from the Dev Panel — physics, per-state camera behaviour, race defaults, and full management of tracks, racers, branding, and race history.

## Features (detail)

- **10 built-in tracks** — Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit, Mountainstreet, Ice Track, Seatrack, Searound, Luger Hill; each with surface classes, world dimensions, and background images.
- **20 built-in racer types** — horse, duck, snail, elephant, giraffe, snake, dragon, f1, rocket, buggy, motorbike, plane, luge, beetle, boarder, koi, turtle, manta, dolphin, snowmobile — all sprite-based with surface-class filtering.
- **Racer Editor** — custom racer types from PNG sprite sheets: background removal, animation preview, metadata.
- **Track Editor** — draw inner/outer boundary curves or a center line over a background image (Center Mode and Boundary Mode), stored via the local backend.
- **Track Effects** — up to 3 simultaneous animated effects per track, with live preview in the editor.
- **Race Engine** — client-side physics, multi-lap and open-course support; force-based lane separation (home force, avoidance, free-lane separation, speed brake, drafting); a Race Plan softly guides racers toward target finishing positions.
- **Camera Director** — TV-style state machine (OVERVIEW, LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM, LEAD_CHANGE) with a finish overview, a group-battle trigger, lead-in/lead-out timing, per-state zoom tuning, and a picture-in-picture minimap.
- **Frame-timing engine** — fixed-timestep physics (FIXED_DT = 16 ms), dt-smoothing for the camera, and render interpolation for smooth motion at variable frame rates.
- **Dev Panel** — full CRUD for tracks, racers, branding profiles, race defaults, and race history; system backup/restore; race-plan and physics tuning.

## How it works

The race logic runs entirely in the browser on a Canvas 2D engine with a fixed-timestep physics loop. A small local Express backend ("Phase L") stores hand-drawn tracks and their background images; everything else (racers, branding, settings, history) lives in the browser's `localStorage`. See [Architecture](docs/ARCHITECTURE.md) for the full picture.

## Tech stack

| Layer   | Technology                                                     |
|---------|----------------------------------------------------------------|
| Client  | React 18, Vite, React Router v6, CSS Modules                   |
| Engine  | Canvas 2D, requestAnimationFrame, fixed-timestep physics       |
| Tests   | vitest (full unit suite), Playwright (e2e)                     |
| Storage | Browser `localStorage` + local Express backend for tracks/images |
| Backend | Node / Express (Phase L, port 4000)                            |
| CI/CD   | GitHub Actions (lint → test → audit on every PR)               |

## Project structure

```
seasonal-race-claude/
├── client/   # React frontend (Vite, vitest, Playwright)
├── server/   # Express backend — track + background storage (port 4000)
├── scripts/  # Headless simulation + tuning-sweep tools (Node.js)
├── docs/     # Architecture, API, setup, specs, lessons — see docs/README.md
└── .github/  # CI/CD workflows
```

## Documentation

Start with the **[documentation index](docs/README.md)**, which maps every document under `docs/`. Most useful first stops:

- [Setup Guide](docs/SETUP.md) — full local setup, backend, and troubleshooting.
- [Architecture](docs/ARCHITECTURE.md) — how the client, engine, and backend fit together.
- [API Reference](docs/API.md) — the backend endpoints.
- [Roadmap](docs/ROADMAP.md) — what's done and what's next.

## Status

The core simulation, editors, camera director, and local backend (Phase L) are in place. A race-integrity / leaderboard / multiplayer server is planned for Phase 5 — see the [Roadmap](docs/ROADMAP.md).

## License

MIT
