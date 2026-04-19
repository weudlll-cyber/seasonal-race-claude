# RaceArena — Architecture

## Overview

RaceArena is a client-server application. The React frontend communicates with the Node/Express backend over both REST (game data) and Socket.IO (real-time race state).

## Folder Structure

```
seasonal-race-claude/
├── client/
│   ├── public/
│   │   └── index.html          # HTML shell
│   └── src/
│       ├── components/         # Reusable UI pieces
│       │   ├── RaceTrack.js
│       │   ├── Leaderboard.js
│       │   ├── PlayerCard.js
│       │   └── SeasonTimer.js
│       ├── pages/              # Route-level views
│       │   ├── Home.js
│       │   ├── Race.js
│       │   └── Profile.js
│       ├── services/           # Network layer
│       │   ├── api.js          # REST client
│       │   └── socket.js       # Socket.IO client
│       ├── store/              # Global state
│       │   └── index.js
│       ├── styles/
│       │   └── main.css
│       ├── utils/
│       │   └── helpers.js
│       ├── App.js
│       └── index.js
│
├── server/
│   └── src/
│       ├── config/
│       │   └── database.js     # MongoDB connection
│       ├── controllers/        # Request handlers
│       │   ├── raceController.js
│       │   ├── userController.js
│       │   └── seasonController.js
│       ├── middleware/
│       │   ├── auth.js         # JWT guard
│       │   └── errorHandler.js
│       ├── models/             # Mongoose schemas
│       │   ├── Race.js
│       │   ├── User.js
│       │   └── Season.js
│       ├── routes/             # Express routers
│       │   ├── race.js
│       │   ├── user.js
│       │   └── season.js
│       ├── services/
│       │   ├── raceEngine.js   # Physics & simulation
│       │   └── socketHandler.js
│       └── index.js
│
├── docs/
│   ├── ARCHITECTURE.md         # This file
│   ├── API.md
│   └── SETUP.md
│
├── scripts/
│   ├── seed.js                 # DB seed data
│   └── deploy.sh               # Production deploy helper
│
└── .github/
    └── workflows/
        ├── ci.yml              # Lint + test on PR
        └── deploy.yml          # Deploy on merge to main
```

## Data Flow

```
Browser → React (pages/components)
            ↓ REST (api.js)        → Express routes → Controllers → MongoDB
            ↓ Socket.IO (socket.js) → socketHandler  → RaceEngine
```

## Key Design Decisions

- **Socket.IO rooms** map 1-to-1 with race IDs for isolation.
- **JWT** is short-lived (1h) and validated on every socket connection.
- **Seasons** are a first-class model so the leaderboard can be cleanly reset between them.
