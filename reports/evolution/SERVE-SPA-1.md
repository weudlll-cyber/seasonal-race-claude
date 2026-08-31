# SERVE-SPA-1 — the server serves the client, and the API cannot be answered with a page

**One thing to start, one port.** `GET /` was a 404 until tonight while `docs/DEPLOYMENT.md`
described a same-origin deployment in which "the Node.js server serves both the built SPA and the
`/api/*` endpoints". That deployment had never been built. It exists now, and the document has been
corrected to describe what is actually there.

**The build reaches the image without moving the build context** — so the STOP condition this piece
carried was not triggered, and that structural decision remains open and untaken.

---

## PROVEN BY HTTP, AGAINST THE REAL CONTAINER

Not by reading code. Ten probes against `http://localhost:4000`, the compose container built and
recreated for this piece:

```
GET /                    (the app)             200  HTML   "<!-- ==========…"
GET /setup               (deep link)           200  HTML   "<!-- ==========…"
GET /race/anything/deep  (deep link)           200  HTML   "<!-- ==========…"
GET /api/health          (unchanged)           200  JSON   {"status":"ok",…}
GET /api/tracks          (auth-gated)          401  JSON   {"error":"not authenticated"}
GET /api/does-not-exist  (API error?)          401  JSON   {"error":"not authenticated"}
GET /api/tracsk          (typo)                401  JSON   {"error":"not authenticated"}
POST /api/nope           (API error?)          401  JSON   {"error":"not authenticated"}
GET /assets/nope.js      (missing asset)       404  HTML   (Express's own 404 page, NOT the app)
GET /api/health  Accept:json                   200  JSON   {"status":"ok",…}
```

and, **signed in**, the case the unauthenticated probes cannot reach:

```
AUTHED GET /api/does-not-exist    404  JSON  {"error":"no such API route: GET /api/does-not-exist"}
AUTHED GET /api/tracsk  (typo)    404  JSON  {"error":"no such API route: GET /api/tracsk"}
AUTHED POST /api/nope             404  JSON  {"error":"no such API route: POST /api/nope"}
AUTHED GET /api/tracks (real)     200  JSON  [{"id":"city-circuit",…}]
AUTHED GET /setup   (deep link)   200  HTML  the app
```

**No path under `/api/` is answered with the app's HTML in any state** — signed in, signed out, GET
or POST, real route or typo. That is the classic failure of this arrangement and it is the one this
piece had to prove rather than assert.

---

## HOW IT IS BUILT, AND THE TWO ORDERING DECISIONS THAT MATTER

`server/src/staticClient.js` — three mounts, and where each sits is the whole design.

**1. The static assets and the SPA fallback mount ABOVE the auth guards.** `requireAuth` is global and
deny-by-default. Mounted below it, every asset would 401 — **so the browser could never load the app
that draws the sign-in form**, and a fresh install would be unusable from a cold start. Mounted below
it, a deep link typed by a signed-out visitor would 401 instead of returning the shell that lets the
client's own router send them to `/login`.

Serving the shell publicly grants nothing: it is the same bundle every visitor downloads anyway, and
**every byte of data behind it still passes `requireAuth`** — the 401s in the table above are that
guard, untouched. What is public is the door, not what is through it.

**2. The fallback refuses the API prefix, first, before anything else it does.** A catch-all that
answers every unmatched GET with `index.html` turns `/api/tracsk` into a 200 and a page of markup, and
every client fetch of a mistyped or removed endpoint receives HTML where it expected JSON — the
failure mode being that nothing looks broken. The fallback tests `req.path.startsWith('/api/')` and
hands such a request straight on, so it continues down the stack exactly as it did before this file
existed.

**3. `mountApiNotFound` runs after every API router**, so a real route always wins, and an unknown API
path answers in the API's own shape rather than Express's default HTML error page.

### A defect found by probing, which reading the code would not have shown

The first version answered `GET /assets/nope.js` with **200 and the app shell**. `express.static` has
already served every file that exists, so anything reaching the fallback with an extension is an
asset that is *not there* — most often a stale `/assets/index-OLD.js` after a redeploy. Returning the
shell gives the browser HTML where it expected JavaScript, and **what the person sees is a MIME-type
console error rather than a plain 404.**

The `req.accepts('html')` test does not catch it: a browser requesting a script sends `Accept: */*`,
which accepts HTML. The fix is the conventional one — a path whose last segment carries an extension
is an asset request and is passed on. **The cost is stated in the file**: a deep link whose last
segment contains a dot would 404. No route in this client has that shape.

---

## THE FOUR CONDITIONS

**The API surface must not change.** It does not. Every existing route answers exactly as before —
707 server tests pass, including all the auth and route suites. The only paths whose answer changed
are ones that were never routes: an unknown `/api/*` path for a *signed-in* caller used to reach
Express's default HTML 404 and now returns JSON with the same status. Unauthenticated callers see the
same 401 they always did.

**If the built client is absent, the server must start anyway and say so plainly.** It does, measured
rather than argued:

```
[client] no built client at c:\tmp\no-such-dist — serving the API only.
         Run `npm run build` in client/ (or set RA_CLIENT_DIST) to serve the app from this server.
RaceArena server running on port 4301
```

and in that state all ten probes show the API behaving exactly as it does today. A developer running
the API alone is not blocked.

**Nothing about the dev setup changes.** This file adds a path and takes none away. Vite on 5173 and
the preview on 4173 are untouched — no port, config or script of theirs was edited. `VITE_API_URL`
still defaults to `http://localhost:4000`, so the existing loop behaves identically.

**The build must reach the image.** It does, and here is what was done.

---

## HOW THE CLIENT BUILD GETS INTO THE IMAGE — a named build context, and the STOP was not needed

`server/Dockerfile`'s build context is `./server`; `client/dist` is outside it, so an ordinary `COPY`
cannot reach it. The obvious move is to raise the context to the repository root — **which this piece
was told to stop rather than do**, because it is the same structural change `shared/` needs and it
deserves its own decision.

**It was not needed.** A **named build context** brings the directory in while leaving the primary
context exactly where it is:

```dockerfile
COPY --from=client dist/ ./client-dist/
```

```yaml
build:
  context: ./server
  additional_contexts:
    client: ./client
```

Tested before it was adopted: `docker build --build-context client=./client ./server` produced an
image carrying `/app/client-dist/index.html`, and the compose build then produced the running
container the probes above hit. `RA_CLIENT_DIST=/app/client-dist` in the compose environment tells
the server where the build landed, following `RA_DATA_DIR`'s existing contract.

**Two honest consequences, both documented in `DEPLOYMENT.md` rather than left to be discovered:**

- **The image copies a build; it does not make one.** `npm run build` in `client/` must have run
  first. Building the client inside the image would make it self-contained at the cost of an npm
  install of the whole front end on every image build — written up as a proposal, not taken here.
- **A bare `docker build ./server` now fails** without the named context. Nothing in the repository
  runs that: the documented and automated path is `docker compose build`, which supplies it, and a
  search of `.github/`, `scripts/`, `docs/` and `package.json` found no other caller.

### This broke the container-paths guard, and the guard was wrong twice

The guard shipped last chain failed on the very tree this piece produces. Both are blind spots in it,
and both are fixed here rather than worked around:

- **`COPY --from=` was read as a build-context copy.** It is not — its source is a named context or
  an earlier stage — so the guard saw `dist/` as a directory of `server/` and demanded a mount for
  `server/dist`, which does not exist. Such lines are now skipped, and the guard's blind list says
  plainly that nothing then checks `additional_contexts` against those copies.
- **Only the SHORT `build: ./server` form was understood.** Adding `additional_contexts` requires the
  long form, and the guard answered "declares no build context" on a file that plainly declares one.
  It now accepts either.

Both fixes carry a test; the guard's suite is 12/12 and it is green on the tree as it stands, still
with two declared divergences.

---

## CHECKS

**`engine-reach --check` selected nothing** — all five changed paths outside the hull. The sixth
consecutive time, which is piece 7's subject.

**All four fingerprints run by hand and all four UNMOVED:** world `bc01b74fd4f3cfc8`, world-off
`daf78ff18eca83c6`, camera `6dfded25dd656977`, render `4819e3b0f8e61c23`. **Nothing minted** — there
is no minting permission in this chain. Nothing in this piece is inside any instrument's reach; they
were run because the chain says to run them, and they agree.

**Server suite: 707 tests in 29 files, all pass** — up from 693 by the 14 new ones. The client suite
was not run: no file under `client/src` is touched by this piece.

## CONFORMITY

- The SPA is served with a deep-link fallback; the fallback cannot answer any `/api/` path, proven by
  HTTP in both authenticated and unauthenticated states.
- API surface unchanged; the absent-build case starts and says so; the dev setup is untouched.
- The build reaches the image, by a named context; the build context was NOT moved and the STOP
  condition was not triggered.
- `DEPLOYMENT.md` rewritten to describe what now exists, including the `VITE_API_URL` build-time
  requirement, which is the part that would otherwise bite a stranger silently.
- All four fingerprints run by hand and unmoved; nothing minted.

## PROPOSALS

**P1 — building the client inside the image would make it self-contained, and is worth pricing.** A
first stage running `npm ci && npm run build` from the same named context removes the "run the build
first" prerequisite entirely. The cost is a full front-end install on every image build. Worth doing
if images are ever published; not worth it while the only builder is this machine.

**P2 (mine) — the client's API address is still baked at build time, and that is the one remaining
sharp edge for a stranger.** `VITE_API_URL` defaults to `http://localhost:4000`, so a same-origin
deployment at a real domain needs it set or the served app talks to the visitor's own machine. Making
the default relative would fix same-origin and break the dev loop, which this piece was told not to
touch — so it is documented instead. A build-time switch that resolves to the serving origin is the
real fix and it belongs in its own piece.
