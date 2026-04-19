# RaceArena — API Reference

Base URL: `http://localhost:5000/api`

## Authentication

All protected routes require `Authorization: Bearer <token>`.

---

## Users

| Method | Path              | Auth | Description              |
|--------|-------------------|------|--------------------------|
| POST   | /users/register   | No   | Create a new account     |
| POST   | /users/login      | No   | Obtain a JWT token       |
| GET    | /users/profile    | Yes  | Get current user profile |

---

## Races

| Method | Path                | Auth | Description              |
|--------|---------------------|------|--------------------------|
| GET    | /races              | No   | List all races           |
| POST   | /races              | Yes  | Create a new race        |
| GET    | /races/:id          | No   | Get a race by ID         |
| POST   | /races/:id/finish   | Yes  | Submit race finish data  |

---

## Seasons

| Method | Path                      | Auth | Description             |
|--------|---------------------------|------|-------------------------|
| GET    | /seasons/current          | No   | Get active season info  |
| GET    | /seasons/current/standings | No  | Get season leaderboard  |

---

## Socket.IO Events

| Event        | Direction       | Payload               |
|--------------|-----------------|-----------------------|
| race:join    | Client → Server | `{ raceId }`          |
| race:input   | Client → Server | `{ keys, timestamp }` |
| race:state   | Server → Client | `{ players, tick }`   |
| race:finish  | Server → Client | `{ results }`         |
