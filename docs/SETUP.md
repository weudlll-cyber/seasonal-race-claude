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

*Note: A backend server (race-integrity, leaderboard, Socket.IO) is planned for Phase 5. When that is built, server setup instructions will be added here.*
