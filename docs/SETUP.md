# RaceArena — Setup Guide

## Prerequisites

- Node.js 20+
- npm 10+
- SQLite is bundled via `better-sqlite3` — no separate database server needed

## 1. Clone & install

```bash
git clone https://github.com/weudlll-cyber/seasonal-race-claude.git
cd seasonal-race-claude

cd server && npm install
cd ../client && npm install
```

## 2. Configure environment

```bash
cp server/.env.example server/.env
# Edit server/.env and set JWT_SECRET (SQLite uses a local file — no URI needed)
```

## 3. Seed the database (optional)

```bash
cd server
node ../scripts/seed.js
```

## 4. Start development servers

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

The app will be at `http://localhost:3000`.

## 5. Running CI locally

```bash
cd server && npm test
cd ../client && npm test
```
