# AUDIT-SECURITY-1 — the surface is small and sound; nothing is exploitable today, and two things are worth doing

**Measured 2026-09-04 on master `917b08d2`, against a LIVE isolated server** — its own data
directory, its own secrets, its own port. **Nothing touched his install and nothing was changed.**
Piece 8 of THE FULL AUDIT.

> ## ★ THE ANSWER FIRST, BECAUSE IT IS THE ONE HE IS HOPING FOR
>
> **NOTHING IS EXPLOITABLE TODAY. The surface is small and it is sound.**
>
> **Deny-by-default is real, not documented**: every one of the seven non-public routers returns
> **401** unauthenticated — measured, not read. Path traversal **404s** on every shape tried. A
> mutating request from a foreign origin gets **403**. The login limiter **fires at the tenth
> attempt**. The session cookie is **HttpOnly, SameSite=Lax, Secure-in-production, `__Host-` named
> when Secure is guaranteed**. **No secret has ever been committed** — not in the history, not in a
> deleted file.
>
> **TWO THINGS ARE WORTH DOING, and neither is urgent:** the container **runs as root** (no `USER`
> directive), and the server carries **3 moderate advisories that reach the running product**.
>
> **NOTHING WAS FIXED.** Both are behaviour changes to auth-adjacent surfaces, and an unattended
> change there is how an operator gets locked out.

---

## 1. WHAT WAS ALREADY EXAMINED, AND WHEN

This is a **re-verification**, not a first look. The prior work, from the reports and `AUTH.md`:

| | what it did | when |
| --- | --- | --- |
| `docs/AUTH.md` | written **from the source**, route by route; declares "where this document and the source disagree, the source is right and this file is a bug" | living |
| `SETUP-TOKEN-CHANNEL-1` | found first-admin setup **could not succeed on any fresh install** — the token went in the body, the server read the header | 2026-08-18 |
| `SETUP-TOKEN-LOG-1` | the setup token out of the logs | — |
| `IMAGE-NO-CREDENTIALS-1` | proved **no credential file is present anywhere** in a freshly built image | 2026-09-01 |
| `IMAGE-STANDALONE-1` | moved the build context to the repository root and wrote the root `.dockerignore` **first**, because moving a context silently undoes a protection | 2026-09-01 |
| `GATE-RED-1`, session-invalidation work | the epoch mechanism, once believed absent and not | 2026-08-26 |

**None of it is re-litigated below. All of it is re-checked at the source.**

---

## 2. RE-VERIFIED — EVERY CLAIM HELD

### `AUTH.md` §5 — what is protected

**The document is exactly right.** `requireAuth` is applied to the whole `/api` router
(`app.js:52`) with a four-entry allow-list (`guards.js:13`), and the middleware order is
cors → json → session → csrfOriginGuard → SPA mounts → **requireAuth** → requireAdmin → routers.

**Measured against a running server, unauthenticated:**

| | |
| --- | --- |
| `/api/health`, `/api/auth/setup-needed` | **200** — public by design |
| `/api/tracks` · `/api/users` · `/api/brands` · `/api/player-groups` · `/api/seed-notices` · `/api/racers` · `/api/surface-classes` | **401**, all seven |
| `POST /api/tracks`, `DELETE /api/tracks/dirt-oval` | **401** |
| `/api/nonexistent` | **401 JSON** — never HTML |

**★ Including the four routers that did not exist when the auth work was done** — `brands`,
`player-groups`, `seed-notices`, `racers`. **They inherit the global guard; none had to remember to
opt in.** That is the design working.

### The two contradictory setup-marker states

`AUTH.md` records that setup is open only when **the marker is absent AND the store is empty**, while
the *marker check alone* returns 409. **Both are true and they are not contradictory** — they answer
different questions: `setup-needed` is advisory for the client's redirect, and the `O_EXCL` marker
claim is the authority. **Verified live**: `POST /api/auth/setup` with a valid token on an empty
store returned **201** and logged the admin in.

**It remains uncovered by a test that asserts the two together** — that part of the note stands.

### Session invalidation and the epoch

★ **Verified by sabotage, in piece 6**: disabling the epoch comparison in `guards.js` **turns the
suite red**, caught by `server/src/auth/sessionInvalidation.test.js`. **The mechanism is present,
load-bearing and defended.** *(My first attempt to sabotage it reported a false pass because my scope
omitted that very file — recorded in piece 6.)*

### Rate limits

| route | limiter | measured |
| --- | --- | --- |
| `/api/auth/login` | yes | **10 × 401, then 429** — fires |
| `/api/auth/setup` | yes | mounted above `requireAuth` |
| `/api/auth/change-password` | yes | mounted **below** `requireAuth`, deliberately — it keys on `req.authUser` |
| every data route | **none** | 8 × 200, no throttle |

**No route added since the auth work has a limiter, and none needs one on this reading**: the
limiters exist for *credential guessing*, and the data routes are already behind a session. **Worth
stating rather than assuming** — a route that took a password and had no limiter would be a finding,
and there is none.

---

## 3. AUDITED FOR THE FIRST TIME — WHAT AROSE SINCE

### The server serving the client (SPA fallback + API prefix)

**Sound, and the design anticipated the classic failure.** The fallback refuses `/api` **first**,
before anything else; it answers only GET/HEAD; it declines requests that do not accept HTML; and it
**404s any path whose last segment has an extension**, so a stale `/assets/index-OLD.js` gets a 404
rather than HTML with the wrong MIME type.

| probe | result |
| --- | --- |
| `GET /`, `GET /setup` | **200 text/html** — the shell, as intended |
| `GET /api` | **401 JSON** — never the app |
| `GET /assets/nope.js` | **404** — not the shell |
| `/../server/data/users.json` · `/..%2f..%2fserver%2fdata%2fusers.json` · `/assets/../../../package.json` · `/%2e%2e/%2e%2e/package.json` | **404, all four** |

**Nothing outside the built client is reachable through it.**

### Filename-taking routes

`GET /api/tracks/:id/background` resolves `:id` **against the in-memory track map** and only then
reads `backgroundImageFile` through `isSafeAssetFilename`. **A crafted id cannot escape** because it
is a map lookup, not a path join:

    /api/tracks/..%2f..%2fpackage.json/background                     -> 404 {"error":"Track not found"}
    /api/tracks/%2e%2e%2f%2e%2e%2fserver%2fdata%2fusers.json/...      -> 404 {"error":"Track not found"}
    /api/tracks/....%2f%2f....%2f%2fpackage.json/background           -> 404 {"error":"Track not found"}

**And case collisions**: the one that existed — `Mountainstreet.jpg` beside `mountainstreet.jpg` —
**was removed earlier today** (`BG-CAPITAL-DUPE-1`), in the client's public folder rather than a
served path.

### Seed delivery — what constrains where it writes

`seedRuntime.js` joins a **module-relative** `SEEDS_ROOT` with a type name, and the destination with
`RA_DATA_DIR`. **Both ends are joins onto fixed roots, and the filenames come from `readdirSync` of
the seeds directory** — not from a manifest field and not from a request. **A crafted seed cannot
name its own destination**, because no request-supplied string reaches the path.

**The residual, named honestly:** anyone who can write into `server/seeds/` can place a file into
`RA_DATA_DIR`. That is a person with commit access or filesystem access to the install — **not a
remote attacker** — and it is the same trust the repository already extends to its own source.

### CORS and cookies — what is actually permitted

| Origin sent | `Access-Control-Allow-Origin` |
| --- | --- |
| the configured `RA_CLIENT_ORIGIN` | **echoed** |
| `http://evil.example` | **(none)** |
| `null` | **(none)** |

`Access-Control-Allow-Credentials: true` is present, but **without an allow-origin it grants
nothing.** And the **CSRF origin guard is the real defence**: a `POST /api/tracks` with a valid
session cookie and `Origin: http://evil.example` returns **403 `cross-origin request rejected`**.

**Cookie, on a real successful auth:** `HttpOnly` ✓ · `SameSite=Lax` ✓ · `Path=/` ✓ · 30-day expiry ·
`Secure` **absent over HTTP and set from `NODE_ENV=production`** by `resolveCookieSecure`, with the
name becoming **`__Host-ra.sid`** when Secure is guaranteed. **Correct.**

**Response headers on the shell:** `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`,
`Strict-Transport-Security: max-age=31536000; includeSubDomains`, `Referrer-Policy: no-referrer`,
**`X-Powered-By` removed**. **`Content-Security-Policy` is absent** — §4.

### The repository and its history

| | |
| --- | --- |
| `users.json` ever committed | **NEVER** |
| session secret / bootstrap token ever committed | **never** |
| private keys, AWS keys, `ghp_`, `xox*` tokens anywhere in history | **none** |
| `.env` files | **none tracked, none in history** |
| `server/.env.example` | added in the initial commit with `JWT_SECRET=replace_with_a_strong_secret` — **a placeholder** — and **deleted** in `bd543656` |
| `server/data/**` | **is** in history — backgrounds, brands, player-groups, surface-classes, tracks, a migration marker. **Content, not credentials** |

**Nothing needs history rewriting, and nothing was rewritten.**

### The standalone image

**Re-verified at the source rather than trusted.** The root `.dockerignore` is a **strict
allow-list** — `**` denies everything, then five re-includes: `server/package.json`, `server/src/**`,
`server/utils/**`, `server/seeds/**`, `shared/nameLimits.mjs`. **`server/data/` and every `.env` are
outside it and cannot enter the build context at all.** The client build arrives through a *named*
build context, so client sources are not in the primary context either.

★ **THE ONE FINDING: there is no `USER` directive. The container runs as root.** §4.

### Dependencies

| tree | production | including dev |
| --- | --- | --- |
| client | **0 vulnerabilities** | **0** |
| server | **3 moderate** | 3 |

★ **The server's three reach the running product, not just the toolchain**: `body-parser ≤1.20.6`
(DoS when an invalid limit silently disables size enforcement) and `qs 2.2.5–6.15.3` (array-limit
bypass; DoS via attacker-controlled `isBuffer`) — both pulled in by express. **`npm audit fix` is
offered.** *(A daily dependency audit already runs on both trees; this is a finding for that process
rather than a surprise.)*

---

## 4. ★ THE THREE CATEGORIES, KEPT APART

### EXPLOITABLE TODAY — **nothing**

No probe reached data without a session. No traversal escaped. No foreign origin was accepted. **The
list is empty, and that is the finding.**

### HARDENING THAT COSTS NOTHING — two, neither urgent

| | what | why it is not urgent |
| --- | --- | --- |
| **1** | **Add `USER node` to `server/Dockerfile`.** The image runs as root; a container escape or a write bug is unprivileged instead. | **No image has ever been published** (`IMAGE-NO-CREDENTIALS-1`), and it runs on one machine on a private network |
| **2** | **`npm audit fix` in `server/`** — 3 moderate, both DoS-shaped | a DoS against a single-operator race app on a private network costs him a restart |

**A third, smaller:** **no `Content-Security-Policy`** on the shell. The other five headers are
present, the app loads no third-party script, and there is no user-generated HTML — so a CSP would
be defence in depth rather than a fix for anything.

### THEORETICAL, GIVEN ONE MACHINE ON A PRIVATE NETWORK

- **Seed delivery** can be steered by someone who can already write to `server/seeds/` — i.e. someone
  with commit or filesystem access, who has more direct routes.
- **No rate limit on data routes.** An authenticated operator can hammer them. The operator is him.
- **`Secure` is off over HTTP.** Correct for local use; it turns itself on under `NODE_ENV=production`.

---

## 5. WHAT THIS PIECE DOES NOT COVER

- **No fuzzing and no dependency-source review.** The probes are hand-built and shaped by what I
  expected to matter; a class I did not think of is not represented.
- **The client's own code was not audited for XSS.** No user-generated HTML is rendered as far as the
  route survey shows, but that is an inference from structure, not a sweep of every render path.
- **`sessions.sqlite` and the session store's own file permissions were not examined.**
- **The image was NOT built and probed from inside.** The `.dockerignore` allow-list was re-verified
  at the source; `IMAGE-NO-CREDENTIALS-1` is the report that actually built one, and it is 3 days old.
- **The setup-marker pair is still untested** (§2) — verified live here, but nothing in the suite
  pins the two states together, so it can drift again.
- **NOTHING WAS FIXED**, per the brief. Both hardening items change behaviour on the auth and
  deployment path, and both go to the morning sheet.
