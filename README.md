# RaceArena

A seasonal multiplayer racing game platform where players compete in time-limited race events across rotating seasons.

## Overview

RaceArena lets players join live race lobbies, compete on dynamic tracks, and climb seasonal leaderboards. Each season introduces new tracks, car upgrades, and ranking resets to keep competition fresh.

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Client   | React, CSS Modules, Socket.IO     |
| Server   | Node.js, Express, Socket.IO       |
| Database | MongoDB (Mongoose)                |
| Auth     | JWT                               |
| CI/CD    | GitHub Actions                    |

## Project Structure

```
seasonal-race-claude/
├── client/          # React frontend
├── server/          # Node/Express backend
├── docs/            # Architecture & API docs
├── scripts/         # Dev & deployment utilities
└── .github/         # CI/CD workflows
```

## Getting Started

```bash
# Install dependencies
cd server && npm install
cd ../client && npm install

# Configure environment
cp server/.env.example server/.env

# Start development servers
cd server && npm run dev
cd client && npm start
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [API Reference](docs/API.md)
- [Setup Guide](docs/SETUP.md)

## License

MIT
