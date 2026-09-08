# INSTALL-READY-1 — what an install still needs, minus his decisions

**Day chain 2026-09-08, piece 5 of 7** · branch `night/2026-09-07` · **unmerged.**

Item 1 of RUNTIME-API-URL-1's list (TLS, certificate, terminator) **is his and was not touched.**

---

## (a) THE TWO CREDENTIALS ARE GENERATED NOW, NOT HAND-COPIED

`npm run configure` asked only for the address; `RA_SESSION_SECRET` and `RA_BOOTSTRAP_TOKEN` were
copied out of a document by hand — which is how installs come to share a value, because what is
written in a document is what everybody uses.

It now generates both: **32 random bytes each**, base64url, written into
`docker-compose.override.yml` beside the address — the gitignored file that is already this install's
home for its own environment. No new file, no new format, no new mechanism.

### ★ NEITHER IS EVER PRINTED

Not to the terminal, not to a log, not into this report. `configure` says only
`RA_SESSION_SECRET generated` or `kept — this install already had one`, and points at the file. A
credential echoed to a terminal is a credential in a scrollback buffer and in a screen recording.

### ★ AND IT NEVER ROLLS ONE AN INSTALL ALREADY HAS

`withKeptEnv` leaves an existing key **untouched** and reports it as kept. This is the opposite rule
from the address, whose whole purpose is to be changed. Rolling `RA_SESSION_SECRET` on a live install
would sign every user out. Pinned by two tests: *"run twice, a generated key appears exactly ONCE"*
and *"the second run changed nothing"*.

---

## (b) THE PLAINTEXT BOOTSTRAP TOKEN IS GONE

`docker-compose.yml:21` carried `RA_BOOTSTRAP_TOKEN=dev-bootstrap-token-not-for-production`. It was
overridden on any real install, but a stranger who ran a plain `docker compose up` got a **working**
bootstrap token whose value is in a public repository — and that is the one credential that opens a
fresh install's first admin account.

**Removed, with no fallback.** With the variable unset, `POST /api/auth/setup` answers 403 and
`startupReadinessLines()` (`startupReadiness.js:55`) already says so at boot:

> `READINESS: RA_BOOTSTRAP_TOKEN is not set — if this install has no admin account yet, it cannot
> create one (setup returns 403). … Existing installs are unaffected.`

That is the loud, fixable state the brief asked for: an install that cannot be **opened** is
recoverable; an install anybody can open is not.

### ★ A consequence worth naming rather than discovering

**His own `docker-compose.override.yml` carries `RA_SESSION_SECRET` and `RA_CLIENT_ORIGIN` — and no
`RA_BOOTSTRAP_TOKEN`** (established by listing the keys, never the values). So after this change his
local Docker install can no longer run `POST /api/auth/setup`. **This costs him nothing**: that route
creates the *first* admin and his install already has one — exactly the case the readiness line calls
"unaffected". If he ever needs one, `npm run configure` now generates it.

---

## (c) A CONTAINER THAT DIES IS NOTICED NOW

Neither file declared a `HEALTHCHECK` or a restart policy, so a container whose server exited after
boot reported "Up" for as long as anyone cared to look, and nothing brought it back.

- **`server/Dockerfile`** — a `HEALTHCHECK` against **`/api/health`**, the endpoint that already
  exists (`server/src/app.js:58`) and the same one `check-image-starts.mjs` uses to decide the image
  booted, so the container and that check agree about "alive" by construction.
  `--interval=30s --timeout=5s --start-period=15s --retries=3` → a dead server is reported in ~1.5 min.
- **`docker-compose.yml`** — `restart: unless-stopped`. Not `always`, so an operator who deliberately
  stops it stays stopped.

It probes with `node -e` rather than curl or wget **because this is `node:20-alpine` and neither is
installed** — a HEALTHCHECK that cannot run reports unhealthy forever, which is worse than none. The
port is read from `PORT` rather than repeating 4000.

---

## (d) THE CLIENT BUILD — ★ ALREADY CLOSED ON THE PATH THE BRIEF NAMES

The brief: *"Skip it and the server starts and serves no app… the compose flow builds it, or refuses
to start with a message a person can act on. Choose the smaller change and say why."*

**The smaller change is none, and the reason is measured.** The compose flow **already refuses**, at
build time. `server/Dockerfile` takes the client through a named build context
(`COPY --from=client dist/ ./client-dist/`), and with no `dist/` present that COPY fails. Tested
directly, with a throwaway Dockerfile using the same mechanism:

```
 > [2/2] COPY --from=client dist/ ./client-dist/
ERROR: failed to build: failed to solve: failed to compute cache key:
       failed to calculate checksum of ref …: "/dist": not found
BUILD EXIT=1
```

`docker compose up --build` cannot silently produce a server with no app. It stops and names the
missing path.

**The only path where a server does start and serve nothing** is running the server directly, or
running a previously-built image — and there the owner has already decided. `staticClient.js:79`
records it: *"the `console.log` default below is STDOUT BY DECISION (the owner, 2026-09-06)… 'no
built client — serving the API only' is a legitimate install (SERVE-SPA-1), so it is an ordinary
statement of what the server is doing, not a shortfall."*

**Turning that into a refusal would contradict a recorded owner decision**, so it was not done. The
brief's own instruction — choose the smaller change — lands on nothing to change.

---

## CHECKS

| | |
|---|---|
| `scripts/configure.test.mjs` | **PASS** — 10 tests (5 pre-existing, 5 new) |
| `generateSecret` | 43 chars, url-safe, distinct across calls |
| `withKeptEnv` | adds when absent · **keeps when present** · returns null with no `environment:` block |
| missing-`dist` build | **fails loudly**, exit 1, names `/dist` |
| golden races | **PASS** |

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check scripts/configure.mjs scripts/configure.test.mjs \
  docker-compose.yml server/Dockerfile

ENGINE REACH: none of 4 path(s) carry a change that can reach the race engine.
  4 outside the hull (cannot reach the engine at all): scripts/configure.mjs,
  scripts/configure.test.mjs, docker-compose.yml, server/Dockerfile
```

---

## SOURCE HYGIENE

| file | before | after | what changed |
|---|---|---|---|
| `scripts/configure.mjs` | 157 | 215 | `generateSecret`, `withKeptEnv`, and the two values written at install time |
| `scripts/configure.test.mjs` | 64 | 102 | five tests, including that a re-run never rolls a live one |
| `docker-compose.yml` | 72 | 88 | the plaintext token **removed**; `restart: unless-stopped` added |
| `server/Dockerfile` | 109 | 128 | `HEALTHCHECK` against the existing `/api/health` |

**Removed:** one line — the plaintext bootstrap token — and that is the point of (b). Nothing else in
the touched area was dead.

**Reused, not rebuilt:** `docker-compose.override.yml` as the home for per-install environment (it
already was); `/api/health` (it already existed, and `check-image-starts.mjs` already uses it);
`startupReadinessLines()`'s existing warning, which needed no change to become the loud half of (b).

**Noticed and left:** his override file has no `RA_BOOTSTRAP_TOKEN` — named above, costs him nothing,
and **his file was not edited**. It was backed up before anything ran near it and is byte-identical.
`configure` was exercised through its exported pure functions rather than by running it against his
file.

**No scratch files entered the repository.** `git stash` was not used.
