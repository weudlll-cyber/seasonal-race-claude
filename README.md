# RaceArena

**Owns:** what RaceArena is, how to run it, how to test it, how it is deployed today, and the map of which document owns which subject. Every subject below has a deeper home and this page points at it.

**Stage a race, draw the track, line up the field — then watch it unfold like a live broadcast, in
your browser.**

RaceArena is a browser-based racing-event visualiser and simulator. You are the event organiser:
pick the racers, choose or draw a track, add some seasonal atmosphere, and start. The race is
computed in the browser on a Canvas 2D engine with a fixed-timestep physics loop, and a TV-style
**Camera Director** follows it — cutting to battles, to a comeback, to a lead change, and pulling
back for the finish.

It is a **single-event presentation tool, not an online multiplayer game**: one organiser sets
everything up and runs the show. A local Express backend holds what has to outlive a browser
profile — accounts and sessions, tracks and their background images, racer types and sprites,
branding profiles, player groups and finished races — and serves the built app itself, so there is
one thing to start and one port.

**What is in the box:** 10 built-in tracks, 20 built-in racer types, a track editor, a sprite-based
racer editor, 7 animated track effects (rain, stars, bubbles, fireflies, dust, mud, wave) with **up
to 3 layered on one track**, an event-branding system, and a Dev Panel for tuning physics, camera
and race defaults.

---

## How to run it

**You need Node.js 20 or newer and Docker.** The Node floor is declared in the `engines` field of
all three `package.json` files. On the Docker path Node runs only `npm run configure`; the image
builds the app itself.

```bash
git clone https://github.com/weudlll-cyber/seasonal-race-claude.git
cd seasonal-race-claude

npm run configure -- --origin=http://localhost:4000   # this install's secrets, never printed
docker compose up -d                                  # builds the image, serves the app AND the API on one port
```

**There is no default login.** The first account is created through a bootstrap token, and the
backend refuses to create one unless `RA_BOOTSTRAP_TOKEN` is set. That is why `npm run configure`
comes first: it generates this install's secrets and writes them into
`docker-compose.override.yml`, which is gitignored and belongs to this install alone.
`http://localhost:4000` is a valid answer to its address question; `--origin=` above skips the
prompt.

Then open **`http://localhost:4000`**. On a fresh install the app shows a one-time **Create the
first admin** page that asks for a username, a password and the bootstrap token: copy the
`RA_BOOTSTRAP_TOKEN` value out of `docker-compose.override.yml`, and the account you create there is
the first administrator.

> **`docker-compose.override.yml` is not optional on a first install.** It is the only home of
> `RA_BOOTSTRAP_TOKEN`, and without it `POST /api/auth/setup` answers `403` and the install can
> never be signed into. It also holds `RA_SESSION_SECRET`; without one the server runs on a random
> secret and every restart signs you out. `docker-compose.override.yml.example` exists but carries
> only `RA_SESSION_SECRET` and `RA_CLIENT_ORIGIN` — copying it alone still leaves you with no token.

**[SETUP.md](docs/SETUP.md) owns setup** and covers the first account, running the backend without
Docker, and what to do when something does not come up. **[ENVIRONMENT.md](docs/ENVIRONMENT.md)
owns every environment variable** — what it does and what breaks without it.

**For development**, run the two halves separately: the API on port 4000, and
`cd client && npm run dev` for the app on `http://localhost:5173` with hot reload. The sign-in is
the same one.

---

## How to test it

```bash
cd client && npm test     # 270 files, 4778 tests
cd server && npm test     # 37 files, 856 tests
npm run verify            # the guards this change selects
npm run verify -- --premerge
```

### ★ Bare `verify` green is **not** CI green

This is the one thing worth knowing before it costs you a red master.

| | |
| --- | --- |
| guards **in the registry** | **36** — the stable number; both modes share the same membership |
| bare `npm run verify` | selects a subset **from your diff** |
| `npm run verify -- --premerge` | selects a **wider** subset from the same diff |

**Both selection counts are diff-dependent and neither is a property of the tool.** Measured twice
on two different branches: one diff gave **4** guards bare and **15** premerge; another gave **9**
bare and **15** premerge. The registry is 36 in both. So the question is never "how many ran" but
"was `--premerge` the one that ran" — the wide selection is what CI approximates, and a change that
passes the bare selection can still redden master.

**CI runs three jobs per push:** `client`, `server` and `docs`. A separate **Browser gate
(production arm)** workflow runs the Playwright suite against a production build.

**[VERIFY-RULES.md](docs/VERIFY-RULES.md) owns what to run and how much.**

---

## How it is deployed

**Today's truth, not a plan.**

The repository ships **one** compose file, `docker-compose.yml`, plus
`docker-compose.override.yml.example`. It publishes `4000:4000` and runs the server with
`node --watch`.

- ★ **There is no production compose file in the tree.** What is here is a development shape; a
  deployment is assembled by hand around it.
- ★ **HTTPS is not in place.** Neither `docker-compose.yml` nor `server/Dockerfile` contains any
  TLS, certificate or reverse-proxy configuration. Anything served over HTTPS today is served that
  way by something outside this repository.
- ★ **The published port binds all interfaces.** On a rented server the API is reachable directly
  unless a firewall or a proxy is put in front of it.
- The base image is pinned by digest (the note above the first `FROM` in `server/Dockerfile`), so a
  rebuild is reproducible and a bump is manual.

**[DEPLOYMENT.md](docs/DEPLOYMENT.md) owns deployment** and
**[DEPLOY-NOTES.md](docs/DEPLOY-NOTES.md) owns the gap** between what the repository can do today
and what a public install would need.

---

## How results are kept and restored

A finished race is stored by the backend in `races.sqlite` inside the data root, together with the
roster, the finishing order and the whole resolved world configuration the race ran under. Accounts,
sessions, tracks, brands, player groups and uploaded images live in that same data root. **With the
shipped `docker-compose.yml` the data root is `./server/data` in your checkout**, bind-mounted into
the container; [DEPLOYMENT.md](docs/DEPLOYMENT.md) describes a production layout.

```bash
npm run backup -- --out <dir>                             # writes <dir>/racearena-backup-<UTC>.tar
node scripts/backup.mjs --restore <archive> --into <dir>
```

**Installing, updating, rolling back and scheduling backups and the status check are
[DEPLOYMENT.md](docs/DEPLOYMENT.md)'s** — one procedure, followed literally on 2026-10-01.

**The round trip is verified**, not assumed: export → wipe → restore returns every field, name,
result, winner and world configuration. ★ **What that proves and does not:** it proves the archive
carries the data back. It does **not** prove a stored race is a race that happened — the server
accepts a well-formed result without recomputing it. A disputed race can be **re-raced from its own
record** and compared, which settles *"did the engine do this"* and never *"did this happen"*.

★ **Where the backup goes is the operator's choice, not the product's** (decided 2026-09-27). The
project prescribes no destination and ships no default pointing anywhere in particular — point it
at a cloud-synced folder on a workstation, or at whatever a rented server can reach. **The one rule
the tool does enforce is that the archive may not be written inside the data root**, because a copy
beside the original is not a second copy.

---

## Where the documents live

This project keeps **one canonical home per fact**: a document declares what it **owns**, and
everywhere else points at it rather than restating it. ★ **Not every document declares one yet** —
**39 of the 40 top-level documents now carry one** — normalised on 2026-09-27; `CLAUDE.md` is the
exception and declares its scope in its own wording. ★ **[WHO-READS-WHAT.md](docs/WHO-READS-WHAT.md)
answers "who is supposed to read all this"** and is the page to start from.

**[docs/README.md](docs/README.md) is the map** — every maintained document and the order to read
them in. If you read one thing, read that. Then:

| document | what it owns |
| --- | --- |
| [GLOSSARY.md](docs/GLOSSARY.md) | **the vocabulary — read it early.** Three of this project's terms mean two different things each |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | the system's shape — which layer holds what |
| [SETUP.md](docs/SETUP.md) | getting it running locally: client, backend, ports, first account |
| [ENVIRONMENT.md](docs/ENVIRONMENT.md) | every environment variable, and what breaks without it |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | deploying to a public same-origin host |
| [API.md](docs/API.md) | the backend's HTTP surface — every route the server registers |
| [AUTH.md](docs/AUTH.md) | how RaceArena authenticates and what an operator must supply |
| [FAIRNESS.md](docs/FAIRNESS.md) | what the game is trying to do. Every racer is identical, so "fair" means something specific |
| [PROJECT-PRINCIPLES.md](docs/PROJECT-PRINCIPLES.md) | the rules that override convenience |
| [VERIFY-RULES.md](docs/VERIFY-RULES.md) | what to run before changing anything, and how much |
| [BACKLOG.md](docs/BACKLOG.md) | the open work and the phase history — one home |
| [DEAD-ENDS.md](docs/DEAD-ENDS.md) | **required reading before proposing any race-mechanism change** |
| [SIM.md](docs/SIM.md) | the headless simulator and what every metric means |

[OPEN.md](docs/OPEN.md) is a short view **derived** from BACKLOG PART ONE; where the two disagree,
the backlog wins. [ROADMAP.md](docs/ROADMAP.md) is a **redirect** and owns nothing.

`reports/` is the lab journal, not documentation — it is append-only and **allowed to go stale by
rule**; see [reports/README.md](reports/README.md). `docs/archive/` is history and says so.

---

## What this is not

- **The server does not compute the race.** The engine runs in the browser; `server/src` contains
  no reference to any engine module. The server stores what it is given.
- **Results are local-first.** Everything lives in this install's own data root. There is no
  central service, no account you sign up for, and nothing leaves the machine unless you move it.
- **It is not a multiplayer game.** One organiser runs an event; other people watch the screen.
- **There is no leaderboard or cross-event standings server yet.** That is planned work, not
  shipped behaviour — see [BACKLOG.md](docs/BACKLOG.md) PART ONE, *Phases 5–7*.
- **The race picture is a fixed field.** The world-to-screen scales are defined against a
  1280×720 reference canvas (`client/src/modules/camera/projection.js:37-38`); it does not reflow.
  Three screens do carry a small-screen breakpoint — the race screen at 640px, the result screen at
  768px and the racer editor at 900px. ★ **Those are the measurements; this page says nothing about
  whether phone use is a goal**, because nothing in the repository establishes that.

---

## Licence

**RaceArena is licensed under the GNU Affero General Public License, version 3 or (at your option)
any later version.** The full text is in [LICENSE](LICENSE); the SPDX identifier is
`AGPL-3.0-or-later`.

Copyright (C) 2026 weudlll-cyber

The AGPL is a copyleft licence with one addition that matters here: **if you run a modified version
of RaceArena as a network service, you must offer its users the source of your version**
(section 13). Running it unmodified, or modifying it privately without serving it to anyone, carries
no such obligation.

The `"private": true` flag in each `package.json` is unrelated — it only stops an accidental
`npm publish`.
