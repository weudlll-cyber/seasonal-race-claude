# VERIFY-ON-DEMAND-1 — a stored race can be verified on demand (server half)

**2026-10-04, branch `feat/verify-on-demand` (NOT merged).** The decision of 2026-09-27 (BACKLOG B1):
the server stays a second store and goes on accepting results without recomputing them, and a stored
race becomes verifiable on demand — re-raced from its own record and compared. **This is the server
half only. There is no button:** where it appears and for whom is the owner's decision.

## What was built

| | where |
| --- | --- |
| **the route** — `POST /api/races/:shortKey/verify` | `server/src/routes/races.js` |
| **admin-only** — a `ROUTE_POLICY` entry | `server/src/auth/guards.js` |
| **the engine path, in ONE place** — `replayStoredRace(stored)` | `scripts/lib/storedRaceReplay.mjs` (new) |
| **the diagnostic script now calls it** — it keeps only its command line and its printing | `scripts/diag/replay-stored-race.mjs` |

**What the route does:**
- Looks the race up with the SAME team-scoped call as `GET /:shortKey`, so another team's key is
  404, exactly as there.
- Re-races it from the record (seed, names, racer type, track, laps, the whole `worldConfigs`).
- Answers with `identical`, `positions: { match, of }`, `finishTimes: { match, of }`, the first field
  that differs, the track, the field size and the time it took.

**When it refuses:**
- A record that cannot be replayed honestly — an unknown track, a lap count the track disagrees
  with, a missing world block — is refused with **422**, naming what is missing. Nothing is
  substituted.
- If the engine module cannot be loaded, the answer is **501**: *"Verifying a race needs the race
  engine, which this installation does not carry."*

**What a match proves, and what it does not.** It proves the ENGINE produces this result from these
inputs. It never proves the race happened: a fabricated record replays faithfully. That limit is the
row's own wording, and it is why the answer is `identical`, never "genuine".

## Two things found on the way

1. **The replay refused every open-track race.** It demanded `targetLaps`, and the browser stores
   none for an open track (`SetupScreen.jsx`: `targetLaps: trackIsOpen ? undefined : …`). That held
   for the diagnostic script too, which had only been run on closed tracks.
   - **Fixed:** laps are required and checked only for a closed track.
   - **Still refused:** an open-track record that DOES claim laps, because it does not describe a
     race that track can run.
2. **The route-policy drift test could not have caught a missing admin classification here.** Its
   operator allowlist admits any `POST` under `/api/races` by prefix. So a test pins this path to
   admin.
   - **Sabotage:** removing the policy entry reddens only that new pin; the drift test's own
     classification check still passes, which proves the gap is real.

## Tests

`server/src/routes/racesVerify.test.js`, 6 tests. **The record under test is made by the engine
itself:** a race is run headlessly through the same driver and written down the way a stored race
carries it.

| test | sabotage | went red |
| --- | --- | --- |
| a record the engine produced agrees on 20 of 20 positions and 20 of 20 times | — | — |
| **a falsified order** (first two places swapped) → not identical, "position 1" | names ignored in the comparison | yes |
| **a falsified time** (one millisecond) → not identical, "finishTimeMs at position 6" | times ignored in the comparison | yes |
| an open-track race, stored with no laps → identical | laps demanded again | yes |
| a record without `worldConfigs` → 422, naming it | — | — |
| another team's key → 404 | — | — |

**Also:** `routePolicyDrift.test.js` gained two tests (verify is admin; storing a race is not). Server
suite: **888 passed**.

## Cost per verification

This machine, three runs each, the replay alone. It is one full race on the server's thread.

| track | 20 racers | 40 racers |
| --- | --- | --- |
| Dirt Oval (closed, ~91 s race) | 0.8 / 1.0 / 1.8 s | 5.6 / 6.0 / 6.5 s |
| River Run (open, ~63 s race) | 1.0 / 1.2 / 1.3 s | 3.9 / 4.0 / 4.2 s |

**Higher than B1's figures at 40 racers** (2.2 s average there). One likely reason, NOT verified:
`runRace` also drives the camera director every frame, which the result does not need. A
physics-only replay path would be the lever if the cost matters.

## What it does NOT do, and why

- **No button and no client code.** The owner decides where and for whom.
- **Not in the Docker image.** The engine lives in `client/src`, which the image does not carry, so
  the route answers 501 there. Carrying it is a packaging decision for the owner, not a fix.
- **Synchronous.** A verification blocks the server's thread for its duration. Admin-only and on
  demand is what keeps that acceptable; a queue or a worker thread would be the next step if it is
  ever used often.

## Lines before → after

| file | before | after |
| --- | --- | --- |
| `scripts/lib/storedRaceReplay.mjs` | new | 200 |
| `scripts/diag/replay-stored-race.mjs` | 257 | 143 |
| `server/src/routes/races.js` | 152 | 214 |
| `server/src/auth/guards.js` | 184 | 194 |
| `server/src/auth/routePolicyDrift.test.js` | 166 | 177 |
| `server/src/routes/racesVerify.test.js` | new | 128 |
