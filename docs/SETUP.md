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

The app will be at `http://localhost:3000`.

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

*Phase 5 will add race-integrity, leaderboard, and Socket.IO multiplayer (separate server implementation).*
