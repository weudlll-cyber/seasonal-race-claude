# PUBLISH-READINESS-1 — what stands between this repository and a stranger running it

**READ-ONLY. Nothing was built, no behaviour changed, no dependency added, no build context moved.**
Everything below was established by running it — a fresh image build, a clean clone, containers
booted against empty volumes — rather than reasoned from the code or cited from an earlier report.
All probe containers, volumes, images and the scratch clone were removed afterwards; the owner's own
container was never touched and is still up.

**The headline is not what I expected to write.** The application's own first-run path — empty data
directory, create the first admin, sign in, see the shipped tracks — **works end to end today**, and
I proved it rather than assumed it. What is missing is almost entirely the layer *around* the app:
there is no way to serve the client, the image cannot run without the repository beside it, and the
document that explains deployment describes a design that was never built. **Seven findings, five of
them small.**

---

## THE FINDINGS, ORDERED BY WHAT STOPS A STRANGER FIRST

### 1. The documented first step dead-ends at a login screen nobody can pass — SMALL (docs only)

**What breaks.** `README.md` and `docs/SETUP.md` both open with "clone, `cd client`, `npm run dev`",
and the README says the backend is *optional*: *"Without the backend you still get all 10 built-in
tracks."* **That is no longer true for a first-time visitor.**

**When.** The first thing anyone does, before they read anything else.

**What the person sees.** The app loads, probes `/api/auth/me`, and fails with no HTTP status.
`AuthContext` only falls back to `offline-hint` when `storageGet(KEYS.LAST_USER)` returns a stored
previous user; a browser that has never signed in has no such hint, so `authState` becomes
`anonymous` and `ProtectedRoute` sends them to `/login`. **They land on a sign-in screen for an
account they cannot create**, because creating the first one needs a backend and a bootstrap token
neither document mentions. The offline path works — for someone who has signed in before on that
browser. A stranger is never that person.

**Size: small.** The fix is honest instructions, not code.

### 2. There is no way to serve the client, and DEPLOYMENT.md describes a model that does not exist — MEDIUM

**What breaks.** `docs/DEPLOYMENT.md` opens: *"the Node.js server serves **both** the built SPA (from
`client/dist/`) and the `/api/*` endpoints on a single address."* **The server does no such thing.**
There is no `express.static`, no `sendFile`, no `serve-static` dependency and no reference to
`client/dist` anywhere in `server/`. Confirmed against a running container:

```
GET /              -> HTTP 404
GET /setup         -> HTTP 404
GET /index.html    -> HTTP 404
GET /api/health    -> HTTP 200
```

The API is alive and the root is a 404. Meanwhile the owner serves the client with `vite preview` on
4173 — a development tool that Vite's own documentation says is not for production.

**When.** As soon as a stranger tries to reach the app at a URL, having followed the deployment guide
to the letter.

**What the person sees.** A 404 at the root of their own deployment, and a document that says it
should have worked. They have no way to tell whether they misconfigured something or the feature does
not exist.

**Two consequences, both real.** The client also bakes its API address at BUILD time from
`VITE_API_URL` (default `http://localhost:4000`), so a published deployment needs its own client
build with that variable set — a stranger who copies the owner's `dist/` gets a page that talks to
*their own* localhost. And the same-origin premise is what lets `DEPLOYMENT.md` call
`RA_CLIENT_ORIGIN` optional; without static serving, split-origin is the only model available and
that variable becomes mandatory.

**Size: medium.** Either add static serving with an SPA fallback to the existing server — the smaller
change, and it makes the document true — or ship a reverse-proxy configuration and say so. It is a
design decision, not a typo, which is why it is not a small item.

### 3. The image does not run standalone — SMALL, but it is the reason a VPS install fails

**What breaks.** Re-established from a fresh build (`docker build -t … ./server`) and a run with no
mounts at all:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/app/utils/atomicWriteJson.js'
    imported from /app/src/routes/tracks.js
```

Mount `utils/` and it gets one step further:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/shared/nameLimits.mjs'
    imported from /app/src/routes/playerGroups.js
```

Mount both and it boots. **So the image requires the repository checked out beside it** — which is
exactly the condition the goal rules out.

**When.** First `docker run` on any machine that has the image but not the source.

**What the person sees.** The container exits immediately with a Node module-resolution stack trace
naming a path inside `/app`. Nothing suggests the cause is a missing bind mount.

**What the build context would have to become.** `utils/` is the easy half: it lives inside the build
context (`./server`) and one `COPY utils/ ./utils/` line closes it. `shared/` is the hard half — it
sits at the repository ROOT, above the build context, and a Dockerfile cannot COPY from outside its
context. Making the image self-contained means **moving the build context up to the repository root**
and adjusting every COPY path accordingly (plus a `.dockerignore` that excludes `client/`,
`node_modules/`, `reports/` and the rest, or the context balloons). That is the real work in this
item; the `utils/` half is a one-liner. `CONTAINER-PATHS-1`'s new guard now holds both divergences
declared, so neither can drift further without somebody writing down why.

### 4. What a stranger must supply before first boot is documented where they will not look — SMALL

The variables, named without their values:

| variable | if missing | if wrong |
|---|---|---|
| `RA_SESSION_SECRET` | dev: an ephemeral random secret and a warning — **sessions die on every restart**. Production (`NODE_ENV=production`): the server **throws** `SESSION_SECRET_MISSING` and does not start. | rotating it logs everyone out |
| `RA_BOOTSTRAP_TOKEN` | `POST /api/auth/setup` returns **403 `setup not available`** and logs `RA_BOOTSTRAP_TOKEN not set; setup disabled`. **The first admin can never be created.** | the same 403 and the same body — deliberately indistinguishable to a caller (the log line differs, so the operator can tell) |
| `RA_CLIENT_ORIGIN` | CORS is disabled outright (`origin: false`), so a browser on any other origin is refused. Same-origin only. | a mismatched origin is refused the same way |

Also read by the server: `NODE_ENV`, `PORT`, `RA_COOKIE_SECURE`, `RA_COOKIE_NAME_MODE`,
`RA_CSRF_STRICT`, `RA_PUBLIC_ORIGIN`, `RA_DATA_DIR`, `RA_USERS_DB`, `RA_SESSION_DB`, and four
rate-limit variables.

**What breaks.** `docker-compose.yml` states in a comment that `RA_SESSION_SECRET` and
`RA_CLIENT_ORIGIN` come from `docker-compose.override.yml` — **which is gitignored**. A stranger's
clone has only `docker-compose.override.yml.example`. `RA_BOOTSTRAP_TOKEN` is in the tracked compose
file with a placeholder value.

**What the person sees.** `docker compose up` succeeds. The server prints a warning about an
ephemeral secret and starts. The client is refused by CORS, and if they get past that, setup returns
403. **Three separate silent-ish failures from one missing file.** Neither `README.md` nor
`docs/SETUP.md` mentions any of these variables — they are only in `DEPLOYMENT.md`, which a person
setting up locally has no reason to open.

**Size: small.** Copy instructions plus a line in SETUP.md.

### 5. `COPY data/ ./data/` bakes the builder's runtime data into the image — SMALL fix, security-relevant

**What breaks.** `server/.dockerignore` contains exactly one line, `node_modules`. So the Dockerfile's
`COPY data/ ./data/` copies whatever is in the builder's runtime directory. Building on the **owner's**
machine produces an image containing:

```
users.json (10,820 bytes)   users.json.bak-20260801-234105
sessions.sqlite             setup-complete.json
recover-admin-audit.log
```

— his account records with their password hashes, his live session store, and the marker that says
setup is finished.

**When.** Any time the image is built on a machine that has been used, and it matters the moment such
an image is pushed anywhere.

**What the person sees.** Two different people, two different problems. Anyone receiving that image
gets the owner's credential files. And because `setup-complete.json` is baked in, `GET
/api/auth/setup-needed` answers `false` on their fresh install and `POST /api/auth/setup` returns
**409 `setup already complete`** — **they can never create an admin, and nothing tells them why.**

**A clean clone is safe today**, and that was checked rather than assumed: `server/data/**` is
gitignored except a tracked `README.md`, so a fresh clone's `server/data/` holds that one file and the
image carries nothing sensitive. The hazard is entirely about building on a used machine.

**Size: small** — one `data/` line in `server/.dockerignore` closes it. Worth doing regardless of the
publishing decision.

### 6. Licensing and visibility — FACTS ONLY, the decision is his

Stated, not recommended:

- **There is no licence file.** No `LICENSE`, `LICENCE` or `COPYING` at the repository root.
- **No `license` field** in the root, `server/` or `client/` `package.json`.
- **All three declare `"private": true`** — which only prevents accidental `npm publish`; it has no
  effect on repository visibility or on anyone's rights to the code.
- **The repository at `origin` is already PUBLIC**, and has been:
  `{"isPrivate":false,"visibility":"PUBLIC","licenseInfo":null,"description":""}`.

So the code is readable by anyone today, under no stated terms — which by default means no
permission is granted to use, copy or modify it. Whether that is what he wants is his call and not a
technical one.

### 7. Persistence works, and the arrangement carries one hazard worth naming — LATENT

**It works, proven rather than reasoned.** A container was recreated from scratch against the same
data volume:

```
setup-needed after recreate  -> {"setupNeeded":false}
login with the old account   -> HTTP 200 {"username":"operator","role":"admin"}
```

The account, the marker and the records all survived. In the owner's compose the data root is a bind
mount to `./server/data`, so it survives `down`, `up`, and `--build` for the same reason.

**The hazard, listed as latent because nothing observable is broken today:** `users.json`,
`users.json.bak-*`, `sessions.sqlite` and `recover-admin-audit.log` live in **the same directory** as
the seeded tracks, backgrounds, brands and groups. Every natural instinct for "give me clean shipped
defaults" — delete the data directory, recreate the volume, `docker compose down -v` — **destroys
every account on the install at the same time.** Nothing warns about it, and the redelivery mechanism
built by the seed strand is precisely the tool that makes wiping the directory unnecessary. Splitting
credentials into their own root (`RA_USERS_DB` and `RA_SESSION_DB` already exist as overrides) would
close it.

---

## WHAT ALREADY WORKS, PROVEN

These were run, not assumed, and they are why the list above is shorter than expected.

**First-run setup works end to end from a genuinely empty data directory.** A container built from a
clean clone, booted against an empty volume:

```
GET /api/auth/setup-needed             HTTP 200  {"setupNeeded":true}
POST /setup  (no token)                HTTP 403  {"error":"setup not available"}
POST /setup  (wrong token)             HTTP 403  {"error":"setup not available"}
POST /setup  (correct token)           HTTP 201  {"username":"operator","role":"admin"}
GET /api/tracks  (as set-up admin)     HTTP 200  -> 10 tracks visible
POST /setup  (a second time)           HTTP 409  {"error":"setup already complete"}
POST /api/auth/login                   HTTP 200  {"username":"operator","role":"admin"}
GET /api/seed-notices                  HTTP 200  {"notices":[]}
```

This is the path that was broken once without anyone noticing, because both suites created accounts
by a route the UI does not use. **It is exercised here through the HTTP surface a browser uses**, from
an empty volume, and every step behaves. The two 403s are identical by design and they are.

**Seeding from empty works.** The same boot turned an empty volume into 10 tracks, 10 backgrounds,
brands, brand-logos, player-groups and a `.seed-versions.json` adopting twelve units at version 1 —
with no redelivery notice, which is correct for a fresh install.

**Nothing machine-specific is in shipped code.** Every tracked file carrying an absolute Windows path
is either `.vscode/settings.json`, a build-identity test fixture, or a `reports/perf/**` journal
artifact. A Linux VPS needs Docker, and nothing this machine supplies implicitly beyond that — the
data root is already resolved module-relative rather than from `process.cwd()`. Worth noting only:
**no `engines` field** in any `package.json` while CI pins Node 20, so a stranger on Node 18 gets a
runtime failure rather than an install-time refusal. Latent, cheap to close.

---

## HOW CLOSE IS IT, HONESTLY

**Closer than the shape of this list suggests, and the gap is one decision wide.**

Findings 1, 4, 5 and the `engines` note are together perhaps an afternoon: documentation, one
`.dockerignore` line, one `COPY` line. Finding 7 is a small refactor of where two files live. Finding
6 is a decision, not work.

**Finding 2 is the one that matters, and finding 3 is its companion.** There is no supported way to
put the client in front of a user, and the document that claims otherwise makes the gap harder to
see, not easier. Adding static serving with an SPA fallback to the existing Express server would
close finding 2 and would make `DEPLOYMENT.md` true as written. Moving the build context to the
repository root would close finding 3. Neither is large; both are decisions about what this
application is meant to be, and **that is his to make rather than something to start building.**

What is emphatically NOT in the way: the application itself. A stranger who is handed a running
server and a served client can create their first admin, sign in, and race on ten tracks today.

---

## CONFORMITY

- Read-only. No file changed but this report and its INDEX line; nothing built, no dependency added,
  no build context moved, no deployment branch opened.
- Every finding established by running it — fresh build, clean clone, empty-volume boots, live HTTP
  probes — including the two that a previous report had already established, which were
  re-established rather than cited.
- Each finding states what breaks, when, and what the person sees; two items with no observable
  consequence today are labelled latent rather than listed as work.
- Findings ordered by what stops a stranger first, each with a rough size.
- Licensing and visibility stated as facts; no licence recommended.
- All probe containers, volumes, images and the scratch clone removed; the owner's container
  untouched and still up.

## PROPOSALS

**P1 — if he decides to publish, finding 2 is the first move and it decides the shape of the rest.**
Static serving in the existing server collapses findings 2 and 4 together: same-origin removes the
`RA_CLIENT_ORIGIN` question entirely and makes the existing `DEPLOYMENT.md` correct without editing
it. The alternative — a separate static host — needs a `VITE_API_URL` build step and CORS
configuration documented for a stranger, which is more moving parts for the same result.

**P2 (mine) — finding 5 should be closed whether or not he publishes.** One line in
`server/.dockerignore` stops the next image built on this machine from carrying his password hashes
and his setup marker. It costs nothing, it is independent of every other decision here, and the
failure it prevents is silent on both ends.
