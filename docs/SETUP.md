# RaceArena — Setup Guide

## Prerequisites

- Node.js 20+
- npm 10+

## 1. Clone & install

```bash
git clone https://github.com/weudlll-cyber/seasonal-race-claude.git
cd seasonal-race-claude

cd client && npm install
```

## 2. Start development server

```bash
cd client && npm run dev
```

The app will be at `http://localhost:5173` (the port is pinned in `client/vite.config.js`).

## 3. Running CI locally

```bash
cd client && npm test
```

---

## 4. Start the backend server (recommended)

The Track Editor saves custom tracks to a local backend. Start it with Docker:

```bash
docker compose up
```

The backend runs at `http://localhost:4000`.

Without it:

- Track Editor shows "Server not reachable", only default tracks available
- Custom-track background images do NOT load during Race (silent fail)

To point the frontend at a different backend URL, create `client/.env`:

```
VITE_API_URL=http://localhost:4000
```

---

## 5. Working with the server

**Single-server rule:** Only one server instance should run on port 4000 at a time. If you see `EADDRINUSE`, kill the stale process and restart:

```bash
# Windows
taskkill /F /IM node.exe
docker compose up
```

**Restarting after code changes:** The server does not hot-reload. After editing any file under `server/src/`:

```bash
docker compose restart server   # source change — restart is enough
docker compose build            # package.json change — rebuild first
```

**Track JSON changes:** The server loads track JSON into an in-memory Map at startup. If you modify a `.json` file under `server/data/tracks/` directly (e.g. restoring a backup), restart the server to pick up the change. The UI Track Editor triggers saves through the API automatically.

---

_Phase 5 will add race-integrity, leaderboard, and Socket.IO multiplayer (separate server implementation)._
