# RaceArena Server

Local backend for RaceArena — Phase L.

## Dev start / restart (recommended)

From the **server/** folder:

```bash
npm run restart
```

Kills any old process on port 4000, then starts with the correct dev env
(`RA_CLIENT_ORIGIN=http://localhost:5173`, `PORT=4000`).
Always reach the client via **http://localhost:5173** — not 127.0.0.1.

## Dev start with file-watch

```bash
npm run dev
```

Same env as `restart`, but uses `node --watch` so the server reloads on file changes.
Does NOT free port 4000 first — use `restart` if a stale process is blocking.

## Start (Docker — recommended for production-like env)

From the **repo root**:

```bash
docker-compose up
```

Server starts on `http://localhost:4000`.

## Start (plain node, no dev env)

```bash
cd server
npm install
npm start
```

Requires all env vars to be set externally (`RA_CLIENT_ORIGIN`, `RA_SESSION_SECRET`, etc.).

## Health Check

```
GET http://localhost:4000/api/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "2026-04-29T12:00:00.000Z" }
```

## Port

API: `4000`. Client dev server: `5173`.
