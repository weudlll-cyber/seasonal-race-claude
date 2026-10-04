# VERIFY-ON-DEMAND-1 — a stored race can be verified on demand (server half)

**2026-10-04, branch `feat/verify-on-demand` (NOT merged).** The decision of 2026-09-27 (BACKLOG B1):
the server stays a second store and goes on accepting results without recomputing them, and a stored
race becomes verifiable on demand — re-raced from its own record and compared. **This is the server
half only. There is no button:** where it appears and for whom is the owner's decision.
**Part two, the same day, follows his decision:** the button, and the image carrying the engine.

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

## Part two — the button and the image (the owner's decision of 2026-10-04)

**He decided:** an admin-only button in the Dev Screen's Race History, and the Docker image carries
the race engine.

### The button

- **Where:** Dev Screen → Race History, on every **stored** race (one with a short key), under
  **Run again**. A race still only on this device has no server record, so it has no button.
- **Who:** shown to admins only (`useAuth`, role `admin`). The server refuses everyone else anyway;
  hiding it is courtesy, the route policy is the gate.
- **What it says:** **match** or **no match**, positions and finishing times agreeing out of how
  many, and the first difference when there is one. A refusal (422, 501, or no answer) is shown as
  "Could not verify: …".
- **The wait:** the ordinary request limit is 8 s, and a verify at 40 racers takes up to 6.5 s, more
  at 80. So `apiCall` gained an optional per-call limit, and only this call uses it (120 s).

| test (`client/src/screens/DevScreen/sections/RaceHistory.verify.test.jsx`, 5) | sabotage | went red |
| --- | --- | --- |
| an admin sees it on the stored race only | — | — |
| an operator does not see it | the button shown to every role | yes |
| a match says "match", positions 20/20 | — | — |
| a mismatch says "no match" and the first difference | always "match" | yes |
| a refusal is shown instead of a result | — | — |

### The image carries the engine

- **What is copied:** `scripts/lib/` (three files), `client/src/modules/`,
  `client/src/racer-types/`, one file from `client/src/utils/`, and `client/package.json` (only for
  `"type": "module"`). No npm package is needed. Tests stay out through `.dockerignore`.
- **Where:** at the filesystem root, in the repository's layout (`/scripts/lib`, `/client/src`),
  because the replay finds the engine two directories above itself — the same reasoning as
  `/shared`.
- **How the set was found:** by tracing every module a real replay loads, not by reading imports.
  **The first build missed one file** (`client/src/utils/mathUtils.js`; the trace listing was read
  truncated) and the container answered 501. A new server test now rebuilds exactly what the
  Dockerfile's COPY lines provide, with nothing else of the repository reachable, and replays a race
  there in a separate process. **Sabotage:** deleting that COPY line turns it red with the same
  missing module.
- **The tracks come from the installation.** The route now hands the replay the track records in
  ITS data directory, rather than the replay reading a repository layout the image does not have.
  Tested: a race whose track the installation does not hold is refused (422). **Sabotage:** the
  route ignoring its tracks → red.
- **The container-paths guard** flagged the two engine directories as copied but not mounted in the
  dev compose. That divergence is correct and is declared with its reason: the engine must be the one
  the image serves, built from the same source as `client-dist`, so a dev container never verifies
  against an engine newer than the browser it serves.

### The proof in a container

The image built from this branch, run on `127.0.0.1:4110` with no mounts, production mode:

| step | answer |
| --- | --- |
| health | 200 |
| first admin (bootstrap token) | 201 |
| sign in, store one race the engine ran (dirt-oval, 20 racers, seed 424242) | 201, key `VQD77F` |
| `POST /api/races/VQD77F/verify` | **200 — `identical: true`, positions 20/20, times 20/20, 2.2 s** |

The first run of this answered **501**: that was the missing `mathUtils.js` above. The container
and the image were removed afterwards.

**A note for the proxy work:** in production on plain http the server sends no session cookie at
all (it is Secure), so the proof ran with `RA_COOKIE_SECURE=false`. Behind an https proxy that
setting is not needed.

## What it does NOT do, and why

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

**Part two** (the button and the image):

| file | before | after |
| --- | --- | --- |
| `client/src/screens/DevScreen/sections/RaceHistory.jsx` | 499 | 566 |
| `client/src/screens/DevScreen/sections/RaceHistory.verify.test.jsx` | new | 125 |
| `client/src/services/racesApi.js` | 95 | 120 |
| `client/src/services/apiClient.js` | 107 | 109 |
| `server/src/routes/races.js` | 214 | 232 |
| `server/src/routes/racesVerify.test.js` | 128 | 188 |
| `scripts/lib/storedRaceReplay.mjs` | 200 | 205 |
| `server/Dockerfile` | 173 | 206 |
| `.dockerignore` | 133 | 147 |
| `scripts/check-container-paths.mjs` | 313 | 325 |
