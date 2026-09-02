# PUBLISH-STEPS-1 — one of the three closes mechanically; the other two cannot be closed without changing his own setup, so they are proposed

> **HIS SETUP IS UNTOUCHED, AND THAT WAS PROVEN BY RUNNING IT.** With his environment the server's
> startup output is **byte-identical to before** — not one new line. His API on 4000 and his preview
> on 4173 answered 200 before and after. The container was built and run on a spare port, so nothing
> of his was stopped at any point.

---

## THE THREE STEPS, AND WHAT HAPPENED TO EACH

| # | the manual step | verdict |
| --- | --- | --- |
| 1 | build the client before building the image | **PROPOSED, not closed** — needs a design decision AND would change his build |
| 2 | create `docker-compose.override.yml` from the example | **CLOSED** — mechanically, by a startup readiness report |
| 3 | set `VITE_API_URL` for a real deployment | **PROPOSED, not closed** — closing it would break his 4173 flow |

---

## 1. STEP 2 IS CLOSED — AND IT WARNS RATHER THAN FAILING, WHICH IS THE WHOLE DESIGN

**The failure it ends.** `docker compose up` succeeds. The server starts and says so. Then the browser
is refused by CORS, and if the operator gets past that, creating the first admin returns 403. **Three
separate failures from ONE missing file** — `docker-compose.override.yml`, which is gitignored, so a
stranger's clone has only the `.example`. Nothing said a word at startup, because nothing was wrong
with the server: it was correctly configured to do less.

`server/src/startupReadiness.js` is a **pure function** of facts the caller has already established.
It reads no files, starts nothing, and changes no behaviour, so it cannot itself become the reason a
server fails to start.

### ★ The brief suggested failing loudly. That would have been wrong, and here is the reasoning.

> *"a startup that fails loudly and usefully when the override is absent rather than succeeding and
> then refusing CORS"*

**SERVE-SPA-1 made the server serve the built client itself. A same-origin install is the normal one
now** — app and API answer on the same port — **and it needs no CORS at all.** Refusing to start
without `RA_CLIENT_ORIGIN` would break the deployment this project has been moving *towards* in order
to fix the one it is moving away from.

So the CORS line **is not printed when this server is serving a client build**, and is printed when
there is none — because then the only way anyone reaches the app is from another origin, which is
exactly the broken case. That conditional is asserted by a test named for it.

### Measured, side by side, on a spare port so nothing of his was disturbed

**A — his environment** (`RA_SESSION_SECRET`, `RA_CLIENT_ORIGIN`, `RA_BOOTSTRAP_TOKEN` set):

```
[client] serving the built client from ...\client\dist
RaceArena server running on port 4099
```

**Nothing added. Byte-identical to today.**

**B — a stranger with no override file:**

```
[auth] Using ephemeral dev session secret — sessions will not survive restart. ...
[client] serving the built client from ...\client\dist
RaceArena server running on port 4098
READINESS: RA_BOOTSTRAP_TOKEN is not set — if this install has no admin account yet, it cannot
           create one (setup returns 403). Set it, then POST /api/auth/setup. ...
READINESS: RA_SESSION_SECRET is not set — a random one is in use, so EVERY RESTART SIGNS EVERYONE
           OUT. Fine for development; set it for anything you come back to.
           (In Docker these come from docker-compose.override.yml, which is gitignored — copy
            docker-compose.override.yml.example to create it.)
```

**Note which line did NOT appear: the CORS one.** A build was present and being served, so
same-origin works and the warning would have been false. The design turns on that and it behaved.

### The container, with no mounts and no environment at all

```
[client] serving the built client from /app/client-dist
RaceArena server running on port 4000
READINESS: RA_BOOTSTRAP_TOKEN is not set — ...
READINESS: RA_SESSION_SECRET is not set — ...
           (In Docker these come from docker-compose.override.yml ...)
```

```
GET /                        -> 200  (the app's HTML)
GET /api/auth/setup-needed   -> 200  {"setupNeeded":true}
```

**`setupNeeded: true` with no bootstrap token is precisely the dead end** — a fresh install that
cannot create its own admin. The banner now says so at startup instead of at a 403 twenty minutes
later. Ten tests; `server-suite` green under `verify`.

---

## 2. STEP 1 IS NOT CLOSED — a design decision AND a cost to his build

A multi-stage Dockerfile could build the client itself. **It is not a mechanical close for two
reasons, and either alone is sufficient.**

**The decision is already recorded as deferred, by the file itself** (`server/Dockerfile`):

> *"Building the client inside this image would make it self-contained at the cost of an npm install
> of the whole front end on every image build; that trade is written up as a proposal rather than
> taken here."*

**And it fails the brief's own decision rule.** `docker compose build` would gain a full front-end
`npm install` and Vite build on every image build. That changes what his container does — slower, and
with a different failure surface — so under *"if closing one would change what his own dev setup
does, do NOT close it"*, it stays open.

**The proposal, unchanged in shape:** a `FROM node:20-alpine AS client-build` stage running
`npm ci && npm run build` in `client/`, with the final stage taking `COPY --from=client-build`
instead of the named context. It removes the manual step and the `additional_contexts` line. Its cost
is the front-end install on every build, mitigable with a cache mount, and its benefit is that a
recipient with only the repository can produce the image. **His call.**

---

## 3. STEP 3 IS NOT CLOSED — closing it would break his 4173 flow

`VITE_API_URL` defaults to `http://localhost:4000`. The apparently obvious close is to default to
**same-origin** (relative URLs), which since SERVE-SPA-1 is correct for the standalone image and
would remove the step entirely.

**It would break both of his flows, and that is not a risk but an arithmetic certainty:**

| his flow | client origin | API origin | same-origin default would… |
| --- | --- | --- | --- |
| dev | `localhost:5173` | `localhost:4000` | send API calls to 5173 — **broken** |
| preview | `localhost:4173` | `localhost:4000` | send API calls to 4173 — **broken** |

Gating it on `import.meta.env.PROD` does not save it: **his 4173 preview IS a production build**, so
the production branch is exactly the one he uses against a different origin.

**The proposal:** default `VITE_API_URL` to same-origin *only* when it is unset **and** the app was
served by our own server — detectable at runtime rather than at build time, since the app can see the
origin it was loaded from. That is a real design change to how the client resolves its API, it wants
its own tests, and it is not something to take unasked in the night. **His call.**

---

## THE PROOF THAT HIS SETUP IS UNCHANGED

| claim | how established |
| --- | --- |
| his startup output is identical | server run with his env on port 4099 — **no READINESS line at all** |
| his API was never interrupted | `GET :4000/api/auth/setup-needed` → 200 before and after |
| his preview was never interrupted | `GET :4173/` → 200 before and after |
| nothing of his was stopped | every probe used a spare port (4097/4098/4099) and a temp data dir; the container ran under `--rm` and is gone |
| the container behaves as today, plus the banner | `docker compose build` exit 0; `docker run` with no mounts serves the app and the API |
| guards green | `node scripts/verify.mjs` → **PASS 5 FAIL 0 SKIP 21**, `server-suite` included |
| no engine reach | the diff is three files under `server/src/`; no client, no defaults, no fingerprint routed |

---

## Limits

**`docker compose up` was not run**, deliberately — it binds `4000:4000` and his API is live on 4000.
What was proven instead is stronger for the standalone claim and weaker for the compose claim: the
image runs with **no mounts and no environment**. The compose path adds bind mounts and two
environment variables; nothing in this change touches either.

**The readiness report cannot know whether an admin exists.** The users store lives inside the auth
router and exposing it to `index.js` would be a design change. So the bootstrap line is phrased
conditionally — *"if this install has no admin account yet"* — rather than asserting it. An operator
of an established install sees one line that does not apply to them. That is the honest trade and it
is why the line says so out loud rather than being suppressed on a guess.

**Nothing was measured about whether the wording helps.** Three lines were written to name the
consequence before the fix; whether a stranger actually reads them is not a thing this report
establishes.
