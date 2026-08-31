# RaceArena

**Stage a race, draw the track, line up the field — then watch it unfold like a live broadcast, right in your browser.**

<!-- Optional but recommended: add a screenshot or short GIF of a race here, e.g.
     ![RaceArena in action](docs/screenshot.png) -->

RaceArena is a browser-based racing-event visualizer and simulator. You play the event organiser: pick the racers (horses, dragons, rockets, dolphins…), choose or draw a track, add some seasonal atmosphere, and hit start. The race runs entirely in the browser, and a TV-style camera director follows the action — diving into battles, catching lead changes, and pulling back for the finish.

It began as a simple horse-race visualizer and grew into a full multi-racer, multi-track simulation with a track editor, a sprite-based racer editor, configurable physics, and an event-branding system.

> New here? This is a single-event presentation tool, not an online multiplayer game — one organiser sets everything up locally and runs the show.

## See it running

**RaceArena needs its backend.** Every screen is behind a sign-in, and the account you sign in with
is created through the backend — so the client on its own gets you a login screen and no way past it.
One command starts everything:

```bash
git clone https://github.com/weudlll-cyber/seasonal-race-claude.git
cd seasonal-race-claude

cd client && npm install && npm run build && cd ..   # build the app
docker compose up -d                                 # serves the app AND the API on one port
```

Open `http://localhost:4000`. **The first time, you have to create your admin account** — there is no
default login, and the backend refuses to create one unless `RA_BOOTSTRAP_TOKEN` is set. For local
use `docker-compose.yml` already sets it; copy the value from there into the command below:

```bash
curl -X POST http://localhost:4000/api/auth/setup \
  -H 'Content-Type: application/json' \
  -H 'x-bootstrap-token: <the RA_BOOTSTRAP_TOKEN from docker-compose.yml>' \
  -d '{"username":"me","password":"choose-a-real-password"}'
```

Then sign in at `http://localhost:4000` and you are in, with all 10 built-in tracks and 20 racers.
Setup runs **once** — a second attempt answers `409 setup already complete`.

**For development** run the two halves separately instead — `docker compose up -d` for the API and
`cd client && npm run dev` for the app on `http://localhost:5173`, which gives you hot reload. You
still need the account above; the sign-in is the same one.

Full details, including every environment variable, are in the [Setup Guide](docs/SETUP.md).

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
- **Race Engine** — client-side physics, multi-lap and open-course support; force-based lane separation (home force, avoidance, free-lane separation, speed brake, drafting); a Race Plan softly guides racers toward target finishing positions. An optional **race-action director** (a pre-OUTCOME longitudinal speed layer in `raceGovernor.js` — a two-master tail-lift + contest-injector, **default OFF**, and distinct from the Camera Director below) can stage a contested, unpredictable front before the finishing order is resolved.
- **Camera Director** — TV-style state machine (OVERVIEW, LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM, LEAD_CHANGE) with a finish overview, a group-battle trigger, lead-in/lead-out timing, per-state zoom tuning, and a picture-in-picture minimap.
- **Frame-timing engine** — fixed-timestep physics (FIXED_DT = 16 ms), dt-smoothing for the camera, and render interpolation for smooth motion at variable frame rates.
- **Dev Panel** — full CRUD for tracks, racers, branding profiles, race defaults, and race history; system backup/restore; race-plan and physics tuning.

## How it works

The race logic runs entirely in the browser on a Canvas 2D engine with a fixed-timestep physics loop. A local Express backend ("Phase L") holds everything that has to outlive a browser profile — accounts and sessions, tracks and their background images, racer types and sprites, branding profiles and player groups — and, since 2026-09-01, serves the built app itself so there is one thing to start and one port. Tuning you do in the Dev Panel (physics, camera, race defaults) lives in the browser's `localStorage`. See [Architecture](docs/ARCHITECTURE.md) for the full picture.

## Tech stack

| Layer   | Technology                                                       |
| ------- | ---------------------------------------------------------------- |
| Client  | React 18, Vite, React Router v6, CSS Modules                     |
| Engine  | Canvas 2D, requestAnimationFrame, fixed-timestep physics         |
| Tests   | vitest (full unit suite), Playwright (e2e)                       |
| Storage | Browser `localStorage` + local Express backend for tracks/images |
| Backend | Node / Express (Phase L, port 4000)                              |
| CI/CD   | GitHub Actions (lint → test → audit on every PR)                 |

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

**[docs/README.md](docs/README.md) is the map** — every maintained document, what it owns, and the
order to read them in. If you read nothing else, read that.

The reading order it recommends, so you can start without a second click:

1. This file — what RaceArena is.
2. [Setup Guide](docs/SETUP.md) — get it running.
3. **[Glossary](docs/GLOSSARY.md)** — the vocabulary. **Read it early.** This project has heavy
   private jargon (band, corridor, pulk, chaos phase, fingerprint), and three of those words mean two
   different things each. A newcomer fails on the words before the details.
4. [Architecture](docs/ARCHITECTURE.md) — how it is built.
5. [Project Principles](docs/PROJECT-PRINCIPLES.md) — the rules that override convenience.
6. [Fairness](docs/FAIRNESS.md) — what the game is actually trying to do. Every racer is identical, so
   "fair" here means something specific and unobvious, and the race design will not make sense
   without it.

Also useful: [API Reference](docs/API.md) · [Backlog](docs/BACKLOG.md) — **the open work and the
phase history, one home since 2026-08-23** · [Phase status](docs/ROADMAP.md) (a table; the detail is
in the backlog) · [Dead ends](docs/DEAD-ENDS.md) (required reading before proposing any
race-mechanism change).

`reports/` is the lab journal, not documentation — see [reports/README.md](reports/README.md) for what
it is and why it may have rotted. `docs/archive/` is history and says so.

## Status

The core simulation, editors, camera director, and local backend (Phase L) are in place. A race-integrity / leaderboard / multiplayer server is planned for Phase 5 — see [BACKLOG.md](docs/BACKLOG.md), PART ONE, *Phases 5–7*.

## Licence

**RaceArena is licensed under the GNU Affero General Public License v3.0.** The full, unmodified
licence text is in [LICENSE](LICENSE) at the repository root.

Copyright (C) 2026 weudlll-cyber

The AGPL is a copyleft licence with one addition that matters for a project like this one: **if you
run a modified version of RaceArena as a network service, you must offer its users the source of
your version** (section 13). Running it unmodified, or modifying it privately without serving it to
anyone, carries no such obligation.

The `"private": true` flag in each `package.json` is unrelated to this — it only stops an accidental
`npm publish`.
