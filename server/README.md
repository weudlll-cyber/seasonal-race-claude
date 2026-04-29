# RaceArena Server

Local backend for RaceArena — Phase L.

## Start (Docker — recommended)

From the **repo root**:

```bash
docker-compose up
```

Server starts on `http://localhost:4000`.

## Start (without Docker)

```bash
cd server
npm install
npm start
```

## Health Check

```
GET http://localhost:4000/api/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "2026-04-29T12:00:00.000Z" }
```

## Port

Port 4000. Frontend stays on 3000.
