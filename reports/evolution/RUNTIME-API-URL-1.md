# RUNTIME-API-URL-1 — one package, installable anywhere

**Date:** 2026-09-07
**Branch:** `feat/runtime-api-url-1`, off master `dc1f252f`. **Not merged** — the owner starts a race
on his own machine first, to confirm nothing changed for him.
**Fingerprints:** `node scripts/engine-reach.mjs --check <every changed path>` — verbatim:

```
ENGINE REACH: 1 of 16 path(s) can change the race:
  client/src/services/api.js
```

★ **`api.js` IS inside the engine hull** — `racer-types/index.js` imports it, which START-BISECT-1
established at `a12b6ab7`. That is a statement about REACH, not about movement, so **all four
fingerprints were run and all four match the record:**

| role | recorded | measured on this branch | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `COMBINED 8a1977187e9c99b4` | **unmoved** |
| world-off | `aa09ed97a3a32689` | `COMBINED aa09ed97a3a32689` | **unmoved** |
| camera | `152cf295c4c9ff54` | `CAMERA 152cf295c4c9ff54` | **unmoved** |
| render | `74946ddbeca517a9` | `RENDER 74946ddbeca517a9` | **unmoved** |

```
check: WORLD  matches the record for role "world-off" (aa09ed97a3a32689).
check: CAMERA matches the record for role "camera"   (152cf295c4c9ff54).
check: RENDER matches the record for role "render"   (74946ddbeca517a9).
```

★ **`verify` selected only `world-fingerprint`** — the camera and render closures do not contain
`api.js`. **The other three were run anyway rather than trusting that routing**, because "nothing
may move" is a merge-blocking claim and the router's silence is not a measurement.

★ **AND A CORRECTION I OWE ON MY OWN METHOD, because it nearly became a false finding.** The first
world-off run was invoked as `fingerprint-default.mjs off --check` and reported:

```
COMBINED 8a1977187e9c99b4
FAIL: WORLD fingerprint does not match the record.
      recorded : aa09ed97a3a32689
```

**That FAIL was mine, not the tree's.** `off` is the LABEL; the thing that actually disables the
feature is `--gapRerollEnabled=false`, which the record's own `reproduce` field names. So the run
measured the **v4-ON** world under the label "off" and compared it against the **v4-OFF** record —
two different arms. It is exactly the class `fingerprint-default.mjs:119-127` warns about: *"a
completely legitimate-looking answer to a question nobody asked."* Re-run as the record says, it
matches. **Nothing moved, and nothing was minted.**

---

# WHAT WAS ESTABLISHED FIRST

## 1. The build-time bake, re-verified

`client/src/services/api.js:16-18`, as it stood:

```js
export const API_BASE_URL =
  (typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_API_URL : undefined) ??
  'http://localhost:4000';
```

Vite substitutes `import.meta.env.VITE_API_URL` **when the client is built**. Re-verified in the
shipped bundle: with `VITE_API_URL` unset the whole expression collapses and the artefact carries the
literal fallback. Measured again after this piece, in the built bundle
(`assets/index-DbGEboZB.js`):

```
var Yn = Jn() ?? void 0 ?? `http://localhost:4000`
```

— `Jn()` is the new runtime read, `void 0` is the absent build-time value, and the fallback is last.
**PROD-SAVE-1's finding stands exactly.**

## 2. ★ EVERY build-time value that reaches the client — searched uncapped, all spellings

Searched for `import.meta.env`, `import.meta?.env`, `import.meta[…]` and any `VITE_*` identifier,
across the whole repository, with no result cap.

| where | what it carries | what became of it |
|---|---|---|
| `client/src/services/api.js:17` | `VITE_API_URL` — the API address | **replaced as the primary source.** Kept as a lower-precedence harness override; see below. |

★ **That is the only one, and PROD-SAVE-1 is CONFIRMED with one refinement of wording.** It reported
"exactly **two** `import.meta.env` uses, both in `services/api.js:17`" — those are two *references*
on one line (the `typeof` guard and the read), not two sites. **There is one site.** Nothing else in
`client/src` reads a build-time value at all.

The other `VITE_API_URL` occurrences in the tree are **not** in the client:

| where | what it is | left alone because |
|---|---|---|
| `client/playwright.config.js:82` | the e2e harness builds a dev client against a random API port | a harness, not a package |
| `scripts/viewer-invariants.mjs:581` | the same, for the browser-gate harness | a harness, not a package |
| docs (5 files) | instructions to bake the address in | **corrected** — see below |

**And one build-time value that is NOT the address, deliberately untouched:** `virtual:ra-build`,
supplied by `vite-plugin-ra-build`, which stamps the commit/branch/dirty identity into the bundle.
★ **It could not carry this and was not asked to.** It resolves in `resolveId`/`load` — at build
time, by construction, because the build identity *is* a build-time fact. Reusing it for an address
that must differ per installation of one artefact would re-create the exact defect being removed.
That is the answer to "if the same mechanism can carry this, use it": **it cannot, and here is why.**

## 3. How the server learns which origins it may answer, and WHEN

`server/src/auth/csrf.js:13-18` reads `RA_CLIENT_ORIGIN`; `csrf.js:28-31` builds `corsOptions`:

```js
export const corsOptions = (() => {
  const list = getAllowedClientOrigins();
  return { origin: list.length ? list : false, credentials: true };
})();
```

★ **An IIFE — the list is built ONCE, at module load.** A port not in it when the API *starts*
cannot be added while it runs. `docs/VERIFY-RULES.md` R10 records the incident: on **2026-08-10** the
owner was pointed at 4173 while the API had been told only about 5173, and *"the first thing he hit
was a login screen that would not log in"* — the client reports **"Server not reachable"**, which
names the wrong cause. **A correct address with a wrong origin list is indistinguishable from a dead
backend.**

★ **This is why the two are now ONE value rather than two that must agree** — see below.

---

# WHAT WAS BUILT

## The mechanism, and why this one

**The server injects the address into the `index.html` it serves.** The client reads
`window.__RA_RUNTIME_CONFIG__.apiBaseUrl` at import.

The alternatives were weighed at source (`server/src/runtimeConfig.js` header), not assumed:

| option | why not |
|---|---|
| fetch `/api/runtime-config` | **circular** — the client would need the API's address to ask where the API is. Works same-origin, which is the case needing it least. |
| a separate `/runtime-config.js` | needs a `<script src>` in `index.html`, which then **404s** under `vite dev` and in the 4173 preview, where no server of ours serves the page |
| **inject into `index.html`** | no extra request; works for deep links (the SPA fallback serves the same shell for every route); and — deciding — **invisible when nothing is configured** |

**Why injection is possible at all:** `staticClient.js` mounts `express.static` with `index: false`
precisely so the SPA fallback is the **one** place `index.html` is served. One serving point, one
injection point. Read **once at mount**, not per request — the shell is the same bytes for every
visitor and the origin cannot change while the process runs, which is the same reason `corsOptions`
is built once.

**ONE HOME.** `client/src/services/api.js` resolves the address and **24 modules import
`API_BASE_URL` from it**. Nothing else reads it; no second read was added.

**The precedence, and what each source is for:**

1. **runtime** — `window.__RA_RUNTIME_CONFIG__.apiBaseUrl`, injected by the server. The deployment
   answer, and the only one that can differ per install without a rebuild.
2. **build-time** — `VITE_API_URL`, **kept deliberately** for the two harnesses named above. Not set
   when the shipped client is built, and `scripts/audit-bundle-address.mjs` is what stops it being
   set by accident.
3. **fallback** — `http://localhost:4000`, unchanged.

## The address is ONE value with three consumers

`RA_PUBLIC_ORIGIN` — **which already existed** and already meant exactly this ("canonical
self-origin", `csrf.js:50`, documented in DEPLOYMENT.md). No new variable was invented, so there is
nothing to keep in step:

| consumer | before | now |
|---|---|---|
| CSRF self-origin | `RA_PUBLIC_ORIGIN` | unchanged |
| CORS allow-list | `RA_CLIENT_ORIGIN` only | `RA_CLIENT_ORIGIN` **plus** `RA_PUBLIC_ORIGIN`, derived and de-duplicated |
| the client's API base | baked at build time | **injected at runtime from the same value** |

★ **The mismatch class is removed by construction rather than detected.** There is no second list to
disagree with the first, so the R10 incident cannot recur through this path: whatever the client is
told, the API already allows. Proved below.

## The start-up gate, and its asymmetry

`server/src/index.js` calls `assertPublicOriginUsable` **before `createApp()`** — nothing bound, no
port taken, no data file touched by an install about to be told to fix itself.

- **absent → starts.** That is the owner's dev machine; the client falls back to today's address.
- **present but malformed → refuses to start**, naming what is wrong.

★ **The asymmetry is the point.** `reportStartupReadiness` only *warns*, because a missing
`RA_CLIENT_ORIGIN` is a legitimate same-origin install. This one *refuses*, because a deployed
instance falling back to `http://localhost:4000` would serve every visitor a bundle pointing at
**their own machine**, and the only symptom would be "Server not reachable".

## Where the install asks

★ **`npm run configure`** — `scripts/configure.mjs`. It prompts, judges the answer, refuses to
finish without one, and writes `RA_PUBLIC_ORIGIN` where the running instance reads it.

★ **It writes `docker-compose.override.yml`, and that file was not invented for this.** It already
is this project's home for per-install environment: gitignored (`.gitignore:3`), merged
automatically by `docker compose up`, with a committed `.example`, and `docker-compose.yml` already
says in a comment that `RA_SESSION_SECRET` and `RA_CLIENT_ORIGIN` come from it. **This replaces
"copy the example and edit it by hand" with "answer a question"** — no new mechanism, no new format.

★ **It deliberately does NOT write `.env`.** Compose reads `.env` only for *variable substitution*
in the compose file, not into the container environment, and the Node server reads no `.env` at all
without `--env-file`. A `.env` would look configured and reach neither runtime — the silent-failure
shape this piece exists to remove. For the non-Docker path it **prints** the exact
`RA_PUBLIC_ORIGIN=… node server/src/index.js` line rather than writing a file nothing loads.

**On "do not invent an installer":** none was. This project's install is `docker compose up` or the
commands in DEPLOYMENT.md — there is no installer program to add a prompt to. `configure` is one
question and one file write, in this project's own `scripts/*.mjs` + npm-script idiom (it has forty
such scripts). What it cannot reach, it prints instead of pretending to configure.

---

# PROOFS

## ★ 1. THE PACKAGE CONTAINS NO ADDRESS

`node scripts/audit-bundle-address.mjs` on a default `npm run build`:

```
audit-bundle-address: 3 file(s) in clientdist — no deployment address. (237 ms)
```

**What the search actually finds, reported rather than summarised** — every `scheme://host` in the
built package:

| host | occurrences | what it is |
|---|---|---|
| `localhost:4000` | **1**, in `assets/index-DbGEboZB.js` | the fallback the brief requires to stay. A loopback literal; ties the package to nothing. |
| `fonts.googleapis.com` | 1, in `index.html` | the Google Fonts stylesheet link. **Pre-dates this piece** — see the list at the end. |
| `reactjs.org` | 1 | React's error-decoder URL inside a vendored error string |
| `reactrouter.com` | 2 | React Router docs links inside vendored error strings |
| `github.com` | 1 | a polyfill suggestion inside a vendored React Router error string |

★ **Each of the three library hosts was read IN CONTEXT before being allowed**, not judged by name.
Verbatim from the bundle:

```
reactjs.org      `https://reactjs.org/docs/error-decoder.html?invariant=` + code
reactrouter.com  `${e} must be used within a data router. See https://reactrouter.com/…`
github.com       `…we recommend you load a polyfill such as https://github.com/ungap/…`
```

They are error-message text in dependencies; no code fetches them; this piece neither introduced nor
can remove them. **★ So the honest answer to "no domain at all" is: no address this install is
served from, and one third-party font domain that was already there and is named in the list below.**

## ★ 2. THE SAME BUNDLE, TWO ADDRESSES, NO REBUILD

The whole point, shown rather than argued. One `npm run build`; the server restarted between the two
with a different `RA_PUBLIC_ORIGIN`; **nothing rebuilt in between.**

```
ADDRESS A — GET /setup -> 200
  injected: <script>window.__RA_RUNTIME_CONFIG__={"apiBaseUrl":"https://races.example.com"};</script>
  bundle referenced: assets/index-DbGEboZB.js

ADDRESS B — GET /setup -> 200
  injected: <script>window.__RA_RUNTIME_CONFIG__={"apiBaseUrl":"http://198.51.100.7:8080"};</script>
  bundle referenced: assets/index-DbGEboZB.js

bundle identity after both serves:
  index-DbGEboZB.js  sha256 4dcb493e7228a3fe
```

★ **Same filename, same hash, two different addresses.** A domain and a bare IP with a port, to show
both forms work.

## ★ 3. WITH NOTHING CONFIGURED, EXACTLY AS TODAY

```
UNCONFIGURED — GET /setup -> 200
  injected script present: false
  ★ served html is BYTE-IDENTICAL to client/dist/index.html: true
  served bytes 1088 · on disk 1088
```

Not "equivalent" — **byte-identical**, and it goes down the same `res.sendFile` path it always did.
The owner's dev server on 5173 and his preview on 4173 never reach this code at all: neither is
served by this function.

## ★ 4. A MALFORMED ADDRESS REFUSES TO START

Four shapes, each exiting **1** before anything binds:

```
RA_PUBLIC_ORIGIN=races.example.com
  RaceArena cannot start: RA_PUBLIC_ORIGIN is set but unusable: "races.example.com" is not a URL. …

RA_PUBLIC_ORIGIN=https://races.example.com/app
  … it carries a path ("/app"); give the origin only, e.g. https://races.example.com. …

RA_PUBLIC_ORIGIN=ftp://x
  … the scheme must be http or https, not "ftp". …

RA_PUBLIC_ORIGIN=not a url
  … "not a url" is not a URL. …
```

Every message ends with the same two ways out: *"Run `npm run configure` to set it, or unset it
entirely to run against http://localhost:4000."*

## ★ 5. THE CLIENT AND THE SERVER AGREE ON THE ORIGIN

One configured instance. The origin the client was **told** is offered back to the API as an
`Origin` header:

```
the client was told : https://races.example.com
  API answers THAT origin  -> allow-origin: https://races.example.com | status 200
  API answers ANOTHER one  -> allow-origin: null                      | status 200
  ★ client and server agree, from ONE value: true
```

★ **There is no mismatch to detect, because there is no second value to mismatch.** The remaining
failure — a malformed address — is loud at start (proof 4), never a dead backend later. That is the
R10 incident closed at its cause rather than guarded against.

## ★ 6. THE INSTALL ASKS, AND REFUSES

```
$ npm run configure           (no terminal, no answer)
Refusing: nothing to read the answer from (no terminal), and there is no default.
Pass it instead:  npm run configure -- --origin=https://races.example.com
exit=1

$ npm run configure -- --origin=races.example.com
Refusing: "races.example.com" is not a URL.
exit=1

$ npm run configure -- --origin=https://races.example.com/
  Address set to https://races.example.com
  Written to     docker-compose.override.yml  (gitignored — this install's own)
```

★ **No silent default anywhere on that path** — an unanswered question is a refusal, which is exactly
how somebody would otherwise end up serving a package that points at their own machine.

**What it does to an existing file** — run against the owner's real override, then restored:

```
16a17
>       - RA_PUBLIC_ORIGIN=https://races.example.com
```

**One line added, nothing else touched**, his session secret and both client origins intact. Run a
second time with a different address: still **exactly one** `RA_PUBLIC_ORIGIN` line, carrying the
newer value.

## ★ 7. SABOTAGE — the address put back at build time, and the check goes red

```
$ VITE_API_URL=https://saboteur.example.com npx vite build
$ node scripts/audit-bundle-address.mjs
audit-bundle-address: FAIL — the package names 1 host(s) it must not:
  saboteur.example.com  —  assetsindex-B7Q0lnGr.js x1
exit=1
```

★ **It names the host and the file.** Control restored immediately: a plain `npm run build` produced
`index-DbGEboZB.js` again — **the same filename as before the sabotage** — and the check returned
`exit=0`. So the red was caused by the sabotage and by nothing else.


---

# CHECKS

## `npm run verify` — plain, not `--premerge`

**PASS 23 · FAIL 0 · SKIP 10 · wall clock 396.3 s.**

```
  PASS  client-suite        231.3s  (ran alone)
  PASS  server-suite        43.1s   (ran alone)
  PASS  script-suite        121.2s
  PASS  client-lint         113.1s
  PASS  check-image-starts  98.1s
  PASS  client-format-check 84.6s
  PASS  world-fingerprint   81.5s
  PASS  server-lint         68.2s
  PASS  server-format-check 35.8s
  PASS  check-writable      17.9s
  PASS  fingerprint-containment 10.3s
  PASS  check-measured-stamps 5.8s
  PASS  check-index 2.0s · check-config-claims 2.1s · check-language-closed 1.8s
  PASS  check-fallback-agreement 1.6s · engine-reach-doc 1.0s · check-doc-links 0.7s
  PASS  ceremony-counts 0.7s · check-fingerprint-payload 0.6s · check-config-keys 0.6s
  PASS  check-hooks-installed 0.5s · check-doc-facts 0.5s

  world-fingerprint   COMBINED 8a1977187e9c99b4
  PASS 23   FAIL 0   SKIP 10
```

**The client suite and the server suite both ran inside it** — 231.3 s and 43.1 s, each exclusive —
so neither was re-run separately.

**`check-image-starts` PASSED.** The `Dockerfile` and `.dockerignore` were **not** changed by this
piece, so the night-of-2026-09-06 rule did not strictly apply; the guard ran anyway because the
router selected it, and it is green.

## ★ THE FIRST RUN FAILED 3 OF 26, AND THE GUARDS WERE RIGHT EVERY TIME

Reported rather than quietly fixed, because two of the three were real errors in this piece's own
work and the third was a rule worth learning.

| guard | what it caught | what it was |
|---|---|---|
| `script-suite` | *"every guard script must declare itself"* — `scripts/check-bundle-address.mjs` | ★ **A naming error of mine.** `routing.mjs:343` discovers every top-level `check-*.mjs` as a ROUTED guard. This one must not be routed — it judges `client/dist`, which `verify` does not build, so routing it would redden `verify` on any tree without a fresh build. **Renamed to `audit-bundle-address.mjs`**, the prefix this project already uses for deliberately-run tools (`audit-gate`, `audit-local`, `audit-sprite-crops`). |
| `engine-reach-doc` | the engine-reach block in `docs/SIM.md` was out of date | ★ **I had hand-edited a GENERATED block.** That row is produced by `gen-engine-reach-doc.mjs` from the file's own header. Regenerated; **the closure is unchanged at 79 files**, only the one description line moved. |
| `server-format-check` | `runtimeConfig.js`, `runtimeConfig.test.js` | prettier. Fixed with `npm run format --prefix server`. |

## The golden races

```
check-golden-races: closed-garden-path-12 — 12 racers, 35.35 s of racing in 2439 frames
check-golden-races: open-river-run-6 — 6 racers, 30.00 s of racing in 1898 frames
check-golden-races: 2 race(s), every finishing position and time as recorded (354 ms).
```

★ **PASS. This piece changes no race.**


---

# THE BUILD, AND THE PORTS AS LEFT

`cd client && npm run build` then `node scripts/serve-production.mjs --port=4173` — the project's
own command, unchanged. **The ports are exactly as the project has them: 4173 is the production
build, 5173 is dev.** Nothing was reassigned and the owner's API on `:4000` was never stopped or
restarted.

★ **THE BUILD BADGE**, read out of the served bundle rather than off a screen — `assets/index-KRoGd_WY.js`:

```js
{ commit: `04a4b6df`, branch: `feat/runtime-api-url-1`, dirty: !1, reason: null }
```

**`04a4b6df`, clean, no `+dirty`.**

★ **And one thing worth seeing on that page:** the served HTML carries **no injected runtime config**,
because `serve-production.mjs` is a static file server and not our API. So the preview on 4173
behaves exactly as it always has — the client falls back to `http://localhost:4000` and talks to his
API. **The change is invisible from where he judges.**

---

# ★ WHAT IS STILL NEEDED BEFORE SOMEBODY COULD INSTALL THIS ON A SERVER

This is the owner's next decision, not this piece's work. Stated as a list rather than as prose so
none of it reads as done.

1. **TLS, a certificate and something in front.** Out of scope by the brief and his decision. Without
   it `RA_COOKIE_SECURE` cannot be `true` and the session cookie travels in the clear.
2. **The secrets are still hand-written.** `configure` asks for the address only.
   `RA_SESSION_SECRET` and `RA_BOOTSTRAP_TOKEN` are still copied out of DEPLOYMENT.md by hand, and
   the server refuses to start in production without the first. Extending `configure` to generate
   them is a small, separate piece.
3. **`docker-compose.yml` still carries a dev bootstrap token in plain text**
   (`RA_BOOTSTRAP_TOKEN=dev-bootstrap-token-not-for-production`). It is overridden by the override
   file, but a stranger who runs plain `docker compose up` gets it.
4. **The client build is still a manual prerequisite.** `npm run build` in `client/` must have been
   run before `docker compose up`, because `client/dist` arrives through a named build context. A
   stranger who skips it gets a server that starts and serves no app — it says so, but only in a log
   line.
5. **★ The package fetches fonts from `fonts.googleapis.com`.** `client/index.html` links a Google
   Fonts stylesheet, so an air-gapped or privacy-restricted install gets no fonts and makes an
   outbound request on every page load. **Pre-dates this piece and was left alone**; it is named
   because "the package contains no domain" is not strictly true while it is there, and the owner
   should decide rather than discover it.
6. **No health check and no restart policy.** Neither `server/Dockerfile` nor `docker-compose.yml`
   declares a `HEALTHCHECK`, so nothing notices a server that started and then died.
7. **`audit-bundle-address.mjs` is not wired into `verify`, so nothing runs it automatically.** It
   judges `client/dist`, which `verify` does not build; routing it would redden `verify` on any tree
   without a fresh build. It is named `audit-` rather than `check-` for exactly that reason —
   `routing.mjs:343` would otherwise discover it as a guard. **Wiring it means deciding whether
   `verify` should build the client**, which is the owner’s call.

---

# SOURCE HYGIENE

**Lines before → after, per file touched:**

| file | before | after | what changed |
|---|---|---|---|
| `client/src/services/api.js` | 18 | 86 | the address is resolved at runtime; the header now carries the reasoning |
| `server/src/staticClient.js` | 147 | 167 | the injection, at the one place `index.html` is served |
| `server/src/auth/csrf.js` | 103 | 127 | `RA_PUBLIC_ORIGIN` folded into the allow-list, derived and de-duplicated |
| `server/src/index.js` | 33 | 57 | the start-up gate, before `createApp()` |
| `server/src/auth/csrf.test.js` | 223 | 275 | five tests for the derivation |
| `docs/DEPLOYMENT.md` | 128 | 139 | stopped telling operators to bake the address in |
| `docs/ENVIRONMENT.md` | 109 | 122 | same, and the new asymmetry |
| `docs/ARCHITECTURE.md` | 1041 | 1045 | the "frontend config hook" paragraph was stating the old behaviour as fact |
| `docs/SIM.md` | — | — | **one generated line**, rewritten by `gen-engine-reach-doc.mjs`, not by hand |
| `package.json` | 20 | 23 | `npm run configure` |

**New files, each with a header saying what it owns and what it deliberately does not do:**

| file | lines | what it owns |
|---|---|---|
| `server/src/runtimeConfig.js` | 167 | reading `RA_PUBLIC_ORIGIN`, judging it, rendering the one script |
| `server/src/runtimeConfig.test.js` | 126 | the asymmetry, and that the script cannot close its own tag |
| `client/src/services/api.test.js` | 89 | the precedence, and that no host but the fallback is in the code |
| `scripts/configure.mjs` | 157 | asking, and writing the answer where the instance reads it |
| `scripts/configure.test.mjs` | 64 | the file rule: run twice, one entry; the operator's secrets survive |
| `scripts/audit-bundle-address.mjs` | ~134 | the requirement as a check |

**What was REMOVED:** nothing. The old expression in `api.js` was not deleted but demoted — it is
now source 2 of 3, and the report above says why keeping it is not a hedge.

**What was MOVED OUT:** nothing moved between files. The address's resolution stayed in `api.js`,
where 24 modules already import it from.

★ **Noticed and deliberately left:**

- **`docs/DEPLOY-NOTES.md`** still analyses the build-time bake at length, including option "B ·
  make the default RELATIVE". It is a **record of an investigation**, not a live instruction, and
  rewriting it would falsify what was known then. It is not a document anybody follows to deploy —
  DEPLOYMENT.md is, and that one is corrected.
- **`docs/BACKLOG.md:2583`** describes this as an open problem. Left for whoever closes the backlog
  entry; this piece did not go looking for its own entry to tick.
- **`fonts.googleapis.com` in `client/index.html`.** Named in the list above rather than removed —
  removing it is a visible change to how the app looks, which is not this piece's business.
- **The e2e harness and `viewer-invariants.mjs` still build with `VITE_API_URL`.** Correct: they
  are harnesses pointed at throwaway ports, and the variable is exactly the right tool for that.

**A rename this piece made mid-flight, reported because it was a real correction:**
`scripts/check-bundle-address.mjs` → `scripts/audit-bundle-address.mjs`. `verify`'s own test
caught it — *"every guard script must declare itself"* — because `routing.mjs:343` discovers every
top-level `check-*.mjs` as a routed guard. It must not be one, for the reason in its header. **The
guard was right and the first name was wrong.**

**No scratch file entered the repo.** The proof servers ran on `:4402`/`:4403` with their data
directory in the session scratchpad; both are stopped and the directory is deleted. **The owner's
`docker-compose.override.yml` was backed up before `configure` was tested against it and restored
byte-for-byte afterwards** (sha256 `5607cc29b41f5c48` before and after; zero `RA_PUBLIC_ORIGIN`
lines remain in it). His `server/data/` was never opened. **`git stash` was not used on this tree.**
