# DEPLOY-NOTES.md — what stands between here and one command

★ **The `RA_*` variables named on this page are described for what a DEPLOYMENT needs.** The
complete list is **[ENVIRONMENT.md](ENVIRONMENT.md)’s**, which owns it; where the two disagree,
that document wins. *(Deferral added 2026-09-27, DELIVERY-CLEAN-2 arc 2 — this page named 7
variables and pointed at the owner nowhere.)*

**Owns:** the GAP between what the repository can do today and the owner's stated wish — the image on
a VPS with as close to one command as possible. What each hurdle costs, and which choices are his.

**This page does not tell you how to deploy.** That is [DEPLOYMENT.md](DEPLOYMENT.md)'s, and every
variable, the minimal production start and the Docker commands live there and are not restated here.
This page is the list of things that are in the way, priced.

**Written 2026-09-04 (night chain, piece I). NOTHING WAS BUILT** — no script, no Dockerfile change,
no dependency. Nothing is recommended; the options are laid out and the decisions are marked.

**How each fact was established.** The container is not the image — `docker-compose.yml` binds
`./server/src` over `/app/src`, so a fact read from a running compose container is the repository,
not the image. Facts marked **[IMAGE]** came from
`docker run --rm --entrypoint sh seasonalraceclaude-server:latest`; the rest are read from source
with a file and line.

---

## The short version

**Four hurdles, and they are not the same size.** Two are one-line configuration. One is a genuine
design question with three real answers. One is not the project's code at all — it is a machine, a
domain and a certificate, and it is entirely the owner's.

| # | hurdle | who it belongs to | size |
| --- | --- | --- | --- |
| 1 | the client build must be made before the image is built | the project | small, and already documented |
| 2 | **the API address is baked into the bundle at build time** | **the project — a design choice** | **the real one** |
| 3 | the config file that must exist | the project | small |
| 4 | HTTPS — the server has none, by design | **the owner** | a machine, a domain, a certificate |

**The honest headline: today it is not one command and it cannot be, because hurdle 2 makes the
client build depend on the address it will be served from.** Everything else is small.

---

## 1 · The client build reaches the image through a named build context

**What is true.** `server/Dockerfile` ends its client work with

```
COPY --from=client dist/ ./client-dist/
ENV RA_CLIENT_DIST=/app/client-dist
```

`client` is a *named build context*, supplied by `docker-compose.yml` as
`additional_contexts: { client: ./client }`. **The image copies a build; it does not make one.**
`client/dist` must exist first.

**[IMAGE]** the current image does contain one: `/app/client-dist` holds `index.html`, `assets/` and
the two favicons, and `RA_CLIENT_DIST=/app/client-dist` is set in the image's own environment. So a
plain `docker run` with no mounts and no configuration serves the app — that property is real and was
established by PUBLISH-STEPS-1.

**What it costs a deployment.** One command before the build (`npm run build` in `client/`), which
means the deploying machine needs the client's `node_modules` — a full front-end `npm install`. The
Dockerfile's own header records the alternative and why it was not taken: building the client inside
the image would make it self-contained "at the cost of an npm install of the whole front end on every
image build".

**NEEDS HIS WORD — only if he wants the one-command version.** Either the deploy machine builds the
client (today's arrangement, and it is fine when he builds and pushes the image himself), or a second
build stage inside the Dockerfile makes the image self-contained at the cost of a slower image build.
This is a straight trade and it has already been written up rather than taken.

---

## 2 · ★ THE API ADDRESS IS BAKED IN AT BUILD TIME, AND THE SHIPPED IMAGE POINTS AT `localhost:4000`

**This is the hurdle.** The other three are configuration; this one decides whether "one command" is
possible at all.

★ **BUILT since (D30, option C): the address is resolved at START time.** The server stamps every page it
serves with the API's address (`injectRuntimeConfig`, `server/src/runtimeConfig.js`), and `client/src/services/api.js:99` reads
`API_BASE_URL = runtimeApiBaseUrl() ?? buildTimeApiBaseUrl() ?? DEFAULT_API_BASE_URL`, so one image
works at any address. The rest of this section is the hurdle as it stood on 2026-09-04, kept as the
record of what D30 chose between.

**What was true on 2026-09-04.** `client/src/services/api.js` was, in full:

```js
export const API_BASE_URL =
  (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_API_URL : undefined) ??
  'http://localhost:4000';
```

`VITE_API_URL` is a **Vite build-time** variable, substituted into the bundle when the client is
built. There is **no `.env` file anywhere in the tree** (checked: neither `client/` nor the
repository root has one), so nothing sets it, and every build made without it carries the fallback.

**[IMAGE] Measured, not assumed:** the current image's baked bundle contains exactly **one**
occurrence of `localhost:4000` — that fallback.

**What that means for a VPS.** A visitor loads the app from `https://race.example.com`. The bundle
they receive then makes its API calls to `http://localhost:4000` — **the visitor's own machine.**
Every request fails. It fails the same way for every visitor, and it fails even though the server is
serving the app correctly on one origin, because the address was decided when the bundle was built,
not when it was loaded.

**So the image is not deployable as-is.** It must be rebuilt for each public origin, with
`VITE_API_URL` set. [DEPLOYMENT.md](DEPLOYMENT.md) already says to do this and gives the command; what
is recorded here is the *consequence* — **the artefact is origin-specific, so there is no one image
and no one command.**

**★ ANSWERED — his decision of 2026-09-05 is [BACKLOG.md](BACKLOG.md) D30: the address moves from
BUILD time to START time, which is option C.** A and B are closed. **D30 is the one home for that
decision and the reasoning is not restated here**; the three options stay below because they are what
it chose between, and because the COSTS in the table are still what C will have to pay.
**BUILD NOTHING — it is its own block.**

**The three options it chose between:**

| option | what it means | what it costs |
| --- | --- | --- |
| **A · keep it** | one image per public origin, rebuilt per deployment | today's behaviour. The image is not portable and cannot be published for others to run at their own address. |
| **B · make the default RELATIVE** — `API_BASE_URL` becomes `''` so every call is same-origin | the bundle works at whatever address it is served from | the same-origin model SERVE-SPA-1 already moved the project towards. Breaks the split-host arrangement unless `VITE_API_URL` is still honoured when set — which it can be. Touches one file. **The client dev server and the API are on different ports (5173 and 4000) with no Vite proxy**, so development would need either a proxy or the variable set, and that is the real cost. |
| **C · resolve it at RUNTIME** — the server injects its own origin into the served `index.html`, or the client reads a small config endpoint | one image, any address, no rebuild | the most work, and it puts a runtime step where there is currently none. It is the only option that makes the image genuinely portable. |

*(This paragraph read "NEEDS HIS WORD" until 2026-09-05, when he gave it. It said B was the small
change and C what "one command, any machine" actually requires, and that the options differ in what
he wants the image to BE rather than in anything the code can settle. **He chose C.**)*

---

## 3 · The config file that must exist, and what happens without it

**What is true.** `docker-compose.override.yml` is gitignored; the repository ships
`docker-compose.override.yml.example`. A stranger's clone therefore has no override file, and
`docker compose up` starts a correctly-configured server that can do less than the operator expects.

`server/src/startupReadiness.js` exists precisely for this, and its header names the failure: *"Three
separate failures, all from ONE missing file."* It prints, at startup:

- **`RA_BOOTSTRAP_TOKEN` missing** → `POST /api/auth/setup` answers 403 and the install can never be
  signed into. *(Corrected 2026-10-04: this said `docker-compose.yml` sets a dev value. It sets only `PORT`, so a
  compose install needs the token in its own override file too — PROBE-INSTALL-1 part 3.)*
- **`RA_SESSION_SECRET` missing** → in development a random one is used and **every restart signs
  everyone out**. In production it is not a warning: `server/src/auth/session.js:68` **throws** and
  the server does not start.
- **`RA_CLIENT_ORIGIN` missing** → only warned when this server is serving no client build of its
  own, because a same-origin install needs no CORS at all. That conditional is deliberate and its
  reasoning is in the file's header.

**What it costs a deployment: nothing, if the operator reads the terminal.** The warnings name the
consequence before the fix, which is the right order. This hurdle is already solved as well as a
warning can solve it.

**One thing it does not do:** it warns, it does not refuse — again deliberately, because refusing
without `RA_CLIENT_ORIGIN` would break the same-origin deployment the project is moving towards.

---

## 4 · HTTPS — the server has none, and that is a design decision, not an omission

**What is true, and it was searched for rather than assumed.** An uncapped search of `server/`,
`client/`, `scripts/` and `shared/` for `https.createServer`, `node:https`, `require('https')`,
`from 'https'`, `createSecureServer`, `tls.`, `node:tls`, key/cert pairs, `letsencrypt` and `certbot`
returns **nothing**. `server/src/index.js:60` is `listenOn(app, PORT, bindAddress, …)` — plain HTTP.

**But the server is TLS-aware and expects to sit behind a terminator:**

- `server/src/app.js:34` — `if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)`
- `server/src/auth/session.js:23-29` — `resolveCookieSecure` marks the session cookie `Secure` in
  production, overridable with `RA_COOKIE_SECURE=true|false|auto`
- `server/src/auth/session.js:35-43` — the cookie is named `__Host-ra.sid` when `Secure` is
  *guaranteed*, and `RA_COOKIE_NAME_MODE=host` throws rather than issue that name without it

So the intended arrangement is: **a reverse proxy terminates TLS and forwards; the app never sees a
certificate.** That is the ordinary and correct shape, and it is why there is no TLS code to find.

**What is at stake without it.** The sign-in POST carries the password (`authRouter.js:204` reads
`username` and `password` from `req.body`), and the session cookie carries the session. Over plain
HTTP both are readable by anything on the path. **`Secure` cookies are not sent over HTTP at all**,
so an install that sets `NODE_ENV=production` without HTTPS in front does not merely become
insecure — sign-in stops working, because the cookie is issued and never returned.

★★ **TWO THINGS THE PARAGRAPH ABOVE DID NOT SAY, MEASURED 2026-09-27 (DELIVERY-CLEAN-2 arc 1,
piece 1.6). Both make the plain-HTTP case WORSE than "sign-in stops working".**

- **`NODE_ENV` is set NOWHERE in the shipped deployment files** — not in `docker-compose.yml`, not
  in `server/Dockerfile`, not in `docker-compose.override.yml.example`. So the trap above is not the
  default case. The default case is the other one: `resolveCookieSecure(false)` returns **`false`**
  (run today: `resolveCookieSecure(false) = false`, `resolveCookieSecure(true) = true`), the cookie
  is **not** marked `Secure`, and sign-in **works perfectly over plain HTTP** — with the password
  and the session cookie both travelling in clear. **Nothing breaks, which is exactly why nobody
  notices.**
- **Nothing warns at boot.** `server/src/startupReadiness.js` emits readiness lines for three
  conditions — `RA_BOOTSTRAP_TOKEN` (`:57`), `RA_SESSION_SECRET` (`:67`) and `RA_CLIENT_ORIGIN`
  (`:76`) — and contains **zero** occurrences of `https`, `tls` or `secure`. An operator who
  serves this on a public address over plain HTTP is told nothing, by anything, ever.

★ **Not changed — recorded.** Adding a readiness line, or defaulting `RA_COOKIE_SECURE`, changes
what an operator sees at boot and is his decision, not this audit's. Stated here because it is the
single most consequential thing a person can not-know before going live.

**NEEDS HIS WORD — and it is not a code decision:**

- **a domain name.** Required for a certificate; a bare IP cannot have an ordinary one.
- **which proxy.** Caddy obtains and renews certificates by itself from a two-line config and is the
  least work; nginx plus certbot is the more common arrangement and has more moving parts. Either
  sits in the same compose file as the server.
- **where the data lives.** `RA_DATA_DIR` (default `server/data`) holds `users.json`,
  `sessions.sqlite` and the seeded tracks, backgrounds, brands and player groups. **It must be a
  named volume or a bind mount that survives a rebuild**, and it must be backed up: deleting it to
  "get clean defaults" destroys every account on the install. `server/Dockerfile` creates `/app/data`
  and gives it to uid 1000; a Docker named volume inherits that ownership and a bind mount brings its
  own, which is why the compose path is proved separately.

---

## 5 · ★ HOW TO STAND THIS UP WITHOUT LEAVING A DOOR OPEN

Added 2026-09-27 (DELIVERY-CLEAN-2 arc 1, piece 1.7). **Six doors, in the order they bite.** Each
says what is true today, what the safe setting is, and **who decides** — because four of the six
are the owner's call and only two are settled. *(2026-10-02: door 6 is settled too — the owner
ordered the base image pinned; see §3.)*

| # | the door | today | who decides |
| --- | --- | --- | --- |
| 1 | **TLS** | none in the tree; the app expects a terminator in front | §4 above — **his**: a domain and a proxy |
| 2 | **The bind** | `4000:4000`, every interface | **his** — see below |
| 3 | **The session cookie over plain HTTP** | sent in clear by default | §4 above — **his** |
| 4 | **Where the backup goes** | nowhere by default; `--out` is required | **settled 2026-09-27: the operator chooses** |
| 5 | **Cookie lifetime** | 30 days | **his** |
| 6 | **Base image** | ~~floating tag~~ pinned by digest since 2026-10-02 (TIDY-C-1) | **settled 2026-10-02: the owner ordered the pin**; a bump is manual |

### 1 · Put a proxy in front, and then close the port

★ **Since 2026-10-01 (RELEASE-BASICS-1) the plain-`node` install has a setting for this:
`RA_BIND_ADDRESS=127.0.0.1`.** The default is unchanged — unset still listens on every interface —
so the decision below is still his and still open; what changed is that an operator who has a proxy
can close the port with one line instead of a firewall. [DEPLOYMENT.md](DEPLOYMENT.md) recommends it
behind a proxy. The Docker publish `4000:4000` below is untouched.

★★ **THE BIND IS NOT A PURE WIN AND SO IT WAS NOT CHANGED.** `docker-compose.yml:17-18` publishes
`4000:4000`, which listens on every interface. Binding `127.0.0.1:4000` instead would be safer on a
rented server — **but it would remove a mode that works today.** The shipped model is same-origin:
the server serves the built app *and* the API on one port (`DEPLOYMENT.md:9-13`), so a browser on
another machine reaches `http://<host>:4000` directly, and a reverse proxy is described as optional
(`DEPLOYMENT.md:227-228` recommends `RA_BIND_ADDRESS=127.0.0.1` behind one; the tested example is
`:452`). Binding to loopback breaks direct access
and makes a proxy mandatory. **That is a decision about how the product may be run, so it is his.**

**What to do on a VPS, whichever he decides:** put nginx or Caddy in front and make port 4000
unreachable from outside — either by binding the container to `127.0.0.1:4000` in *your own*
`docker-compose.override.yml`, or with a host firewall. **One of the two is required.** With
neither, the API is reachable directly on the public address and the proxy is decoration.

### 2 · Decide the backup destination — the product will not decide it for you

**Settled 2026-09-27: the project prescribes no destination and ships no default.** On a
workstation, point it at a folder that syncs to a cloud drive and the syncing stops being this
project's business; on a rented server, point it at whatever that host can reach. One prescribed
destination could not have served both.

**The one rule the tool enforces**, and it is the product's business because a copy beside the
original is not a second copy:

```bash
node scripts/backup.mjs --out <dir>                       # <dir> must be OUTSIDE the data root
node scripts/backup.mjs --restore <archive> --into <dir>
```

★ ~~**There is no `npm run backup`**~~ — **added 2026-10-01 (RELEASE-BASICS-1):** `npm run backup`
in the root manifest runs the same file and takes its target from `RA_BACKUP_DIR`, so a scheduled
line needs no argument. `npm run status` reports the newest backup's age. How to use both is
[DEPLOYMENT.md](DEPLOYMENT.md)'s.

### 3 · The two standing choices, with their costs

**Cookie lifetime — 30 days** (`server/src/auth/session.js:108`,
`maxAge: 30 * 24 * 60 * 60 * 1000`). The safe alternative is a shorter life, hours rather than
weeks: a stolen or forgotten session stops working sooner. **The cost is real and is the reason it
is 30 days** — an organiser running an event does not want to sign in again mid-evening, and this
install has no refresh flow. **His choice; not changed.**

★★ **PINNED 2026-10-02 (TIDY-C-1), by the owner's order of that day.** Both `FROM` lines in
`server/Dockerfile` now pin `node:20-alpine` by the multi-arch index digest the tag pointed at on
2026-10-02, read with `docker buildx imagetools inspect node:20-alpine`. The digest's one home is
the Dockerfile: the comment above its first `FROM` carries the tag, the digest, the date and how to
bump it. **The cost recorded below
is now the accepted one: base-image patches arrive only when somebody re-reads the digest and
replaces it on both lines.** Nothing in the repository does that for you. The paragraph below is
the reasoning as it stood before the order, kept as the record of the trade.

**BUMPED 2026-10-09 (AUDIT-1 A7): `node:20-alpine` → `node:24-alpine`**, re-read the same way and
still pinned by digest. Node 20 reached end of life on 2026-04-30; 24 is the active LTS and the
version this repository's suites already run on. CI (`node-version`) moved with it. The source-install
floor (`engines: >=20`, "Node 20 or newer") is unchanged — raising it is a row for the owner.

~~**Base image — a floating tag**~~ (`server/Dockerfile:22` and `:33` before TIDY-C-1, both `FROM node:20-alpine`).
★★ **The brief asked me to pin it to a digest "if that is purely safer". It is NOT purely safer,
so it was not pinned.** A digest makes a rebuild reproducible — the same input gives the same image
— but it also **freezes the base**, so Alpine and Node security patches stop arriving on rebuild
until somebody updates the digest by hand. Nothing in this repository watches base images: the
dependency audit runs daily over the two npm trees and says nothing about `FROM`. **Pinning without
a bump process trades a rare reproducibility problem for a standing patch problem.** Recorded as
his choice, with both sides, rather than taken.

~~**Backup checksum — none** (§8.4). A corrupted archive is discovered on restore, not before.~~
★ **CLOSED 2026-10-02 (TIDY-C-1):** every archive now has a `<archive>.sha256` beside it in
`sha256sum` format, and `npm run status` fails the backup check when the newest archive's checksum
file is missing or does not match. How to use it is [DEPLOYMENT.md](DEPLOYMENT.md)'s.
★ A precision that matters when reading the source: `scripts/backup.mjs:204-206` writes a *tar header*
checksum, which is part of the tar format and **not** an integrity digest of the archive. Do not
read that line as one.

---

## What would actually be needed for "one command"

Written as a checklist of decisions, not as a plan:

1. ~~**Hurdle 2 resolved** (option B or C), so one image works at any address. Without this, no.~~
   **DECIDED 2026-09-05 — option C, resolve at start time ([BACKLOG.md](BACKLOG.md) D30). Not yet
   BUILT**, so this line is answered but not yet done.
2. A compose file that includes a TLS-terminating proxy, with the domain as its one variable.
3. The secrets generated rather than copied from an example — `openssl rand` in the compose
   environment, or a `.env` the operator fills in once.
4. A named volume for `RA_DATA_DIR`.
5. Hurdle 1 decided: either the image builds the client (self-contained, slower build) or the
   published image is built by him and pulled rather than built on the VPS.

**With 1 and 5 answered, "one command" is `docker compose up -d` against a published image, plus a
domain pointed at the machine.** Everything between here and there is one design decision and a
proxy.
