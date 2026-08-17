# AUTH.md — authentication as it is BUILT

**Owns:** how RaceArena authenticates, what an operator must supply, and what is protected.
**Every statement here describes what the code does today**, read from `server/src/auth/`,
`client/src/services/authApi.js`, `client/src/components/ProtectedRoute.jsx`, `client/src/App.jsx`
and the server tests. Where this document and the source disagree, **the source is right and this
file is a bug**.

**This is an operator's document.** The design it grew from is
[docs/archive/AUTH.md](archive/AUTH.md) — superseded, kept for its reasoning, and not restated here.

**Values are not stated here.** Environment variables are named, never their contents.

> **If a source comment sent you here, its section number is the OLD document's.** Eight comments in
> `server/src/auth/` and `scripts/recover-admin.mjs` cite `AUTH.md §N` using the archived design's
> numbering, which this document does not share. The map: **§2 role model → §3** · **§4 sessions →
> §4** · **§5 bootstrap → §1** · **§9 user management → §3** · **§9a recovery → §3**. The comments
> are not wrong about the code; they point at a numbering that moved.

---

## 1. First install — creating the very first admin

**Endpoint:** `POST /api/auth/setup`.

**THE BOOTSTRAP TOKEN TRAVELS IN THE `x-bootstrap-token` HEADER, NEVER IN THE BODY.** The server
reads `req.get('x-bootstrap-token')` and nowhere else; the body carries only `username` and
`password`. This is the one sentence in this document that has already cost months: the client sent
the token as a body field until 2026-08-18, so the server saw an empty token and **first-admin setup
could not succeed on any fresh installation** ([SETUP-TOKEN-CHANNEL-1](../reports/evolution/SETUP-TOKEN-CHANNEL-1.md)).

**What the server compares it against:** the value of `RA_BOOTSTRAP_TOKEN` in the server's own
environment, using a constant-time comparison. The token is never stored in `users.json`, never
returned by any endpoint, and never logged.

**The gate, in the order the server applies it:**

1. **Marker check.** If the setup-complete marker already exists → `409 setup already complete`.
2. **Token check.** No `RA_BOOTSTRAP_TOKEN` configured, or a token that does not match →
   `403 setup not available`. **Both cases give the same message** — see §8.
3. **Body validation.** Missing or blank `username`/`password` → `400 invalid username or password`.
   The message deliberately does not say which field.
4. **Atomic claim.** The marker file is created with `O_EXCL`, so exactly one request wins even if
   two arrive together. A loser gets `409 setup already complete`.
5. **User creation**, then the session is regenerated and the new admin is **logged in
   automatically** → `201 { username, role: "admin" }`.

**Is setup still open?** `GET /api/auth/setup-needed` answers `{ setupNeeded }`, and it is true only
when the marker is absent **and** the user store is empty. The client's `/setup-admin` screen calls
it on mount and redirects to `/login` when setup is already done.

**Both public:** `GET /api/auth/setup-needed` and `POST /api/auth/setup` are on the no-auth allow
list, because they must work before any account exists.

---

## 2. What must be supplied — every environment variable the auth path reads

**This section says what the AUTH CODE READS and what it does WITHOUT IT.** What to set for a real
deployment — which values, in what shape, and the minimal start command — is
[DEPLOYMENT.md](DEPLOYMENT.md)'s, and is not repeated here.

**Secrets — never commit these, and never put them in a file the repository tracks:**

| variable             | what it is for               | when it is missing                                                                                                                                                                 |
| -------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RA_SESSION_SECRET`  | signs session cookies        | **production: the server refuses to start** (`SESSION_SECRET_MISSING`). Development: an ephemeral secret is generated and a warning is printed — sessions do not survive a restart |
| `RA_BOOTSTRAP_TOKEN` | gates `POST /api/auth/setup` | setup is **disabled**: every attempt gets `403 setup not available`, and the server logs `RA_BOOTSTRAP_TOKEN not set; setup disabled`                                              |

**Required for a real deployment:**

| variable           | what it is for                                            | when it is missing                                                                                                                                                  |
| ------------------ | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RA_CLIENT_ORIGIN` | comma-separated origins the browser may call the API from | CORS is **disabled** (`origin: false`) — same-origin only. A separately-hosted client gets no `Access-Control-Allow-Origin` and every call fails as a network error |
| `RA_PUBLIC_ORIGIN` | the server's own canonical origin, used by the CSRF guard | the guard derives self from the incoming `Host` header — fine locally, wrong behind a proxy                                                                         |

**Optional, with defaults that are correct for most deployments:**

| variable                                   | what it is for                                                       | default                                                                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `RA_COOKIE_SECURE`                         | `true` / `false` / `auto` — overrides the environment-derived choice | derived from `NODE_ENV === 'production'`                                                                                                             |
| `RA_COOKIE_NAME_MODE`                      | `auto` / `host` / `legacy` — chooses the cookie name                 | `auto`: the `__Host-` prefixed name when Secure is **guaranteed**, otherwise the plain one. `host` **throws at startup** unless Secure is guaranteed |
| `RA_CSRF_STRICT`                           | `true` / `false` — overrides strict mode                             | derived from `NODE_ENV === 'production'`                                                                                                             |
| `RA_LOGIN_RL_WINDOW_MS`, `RA_LOGIN_RL_MAX` | login rate-limit window and count                                    | see §6                                                                                                                                               |
| `RA_SETUP_RL_WINDOW_MS`, `RA_SETUP_RL_MAX` | setup rate-limit window and count                                    | see §6                                                                                                                                               |
| `RA_USERS_DB`                              | path to the user store                                               | `users.json` under the data root                                                                                                                     |
| `RA_SESSION_DB`                            | path to the session store                                            | `sessions.sqlite` under the data root                                                                                                                |

**`NODE_ENV`** is read by the session, cookie, CSRF and rate-limit code to decide production
defaults. **Set it to `production` in production** — several protections key off it.

---

## 3. Roles and accounts

**There are exactly two roles: `operator` and `admin`.** Anything else is rejected by the store
(`Role must be "operator" or "admin"`). `operator` is the default and covers normal operation;
`admin` additionally manages users and the advanced settings. Only §4's policy distinguishes them on
the server — there is no third tier and no per-user permission set.

**Accounts are managed at `/api/users` (admin only, all methods):** list without password hashes,
create, change role or reset a password, delete. The first admin comes from §1 and nowhere else —
**there is no self-service registration and no password reset by email.**

**A password change ends the sessions it should end, and only those.** The rule is one mechanism, not
a cleanup step: `updateUser` bumps the record's `sessionEpoch` in the same serialised write that
stores the new hash, and `requireAuth` rejects any session whose stored epoch differs. So:

- an admin setting **another** user's password ends **every** session of that user, on that session's
  **very next request** — not at its next expiry, and not after a sweep;
- a user changing their **own** password ends every **other** session of theirs, while the session
  making the request survives — it is re-stamped with the new epoch, so nobody is logged out for
  rotating their own password;
- **no other user is affected**, ever.

**Only an admin can change a password at all**, their own or anyone's, because `/api/users` is
admin-only and there is no self-service route. An `operator` who wants a new password must ask one.

**The last admin cannot be removed.** Deleting the sole `admin`, or demoting them to `operator`, is
refused by the store itself rather than by the route (`Cannot delete the last admin` / `Cannot demote
the last admin`), so no future caller can bypass it.

**If every admin is nevertheless lost**, recovery is `scripts/recover-admin.mjs` — a **local CLI**
that needs filesystem access to the data directory. It is deliberately not an endpoint: the threat
model is "whoever owns the box owns the install", and exposing recovery over the network would break
that.

---

## 4. Login and sessions

**Login:** `POST /api/auth/login` with `{ username, password }`. Wrong username and wrong password
both return `401 invalid credentials` — deliberately indistinguishable. On success the session id is
**regenerated** (so a pre-login session cannot be fixated), the user is written into the session, and
the response is `{ username, role }`.

**Passwords** are hashed with **bcrypt at cost 12**. Usernames are normalised before comparison. The
store is a JSON file written atomically and `chmod`ed to owner-only (`0o600`).

**Where the session lives:** server-side, in a SQLite store (`sessions.sqlite` under the data root,
in memory under test). The browser holds only the session cookie.

**The cookie:** `httpOnly`, `sameSite: 'lax'`, `path: '/'`, `secure` per §2, and **`maxAge` 30 days**.
Its name is `__Host-ra.sid` when Secure is guaranteed, otherwise `ra.sid`.

**How it ends:** `POST /api/auth/logout` destroys the server-side session and clears the cookie —
including the legacy name, so a rename cannot strand an old cookie. Logging out without a session
returns `401 not authenticated`. Otherwise a session simply expires after its 30 days.

**Who am I:** `GET /api/auth/me` returns the user, or `401 not authenticated`. The client's
`AuthContext` calls it on mount, which is why a reload does not flash the login screen.

---

## 5. What is protected

**Server — deny by default.** `requireAuth` is applied to the whole `/api` router, and only an
explicit allow-list is public:

```
GET  /api/health
GET  /api/auth/setup-needed
POST /api/auth/setup
POST /api/auth/login
```

Everything else needs a session; an unauthenticated request gets **`401`**. A second layer,
`requireAdmin`, raises specific routes to admin via one central policy: all of `/api/users`, the
mutating `/api/surface-classes` routes, and the `set-default` / `clear-default` / `export-seed`
sub-paths of player-groups, brands and tracks. An authenticated operator hitting one of those gets
**`403`**.

**Client — every screen except the two gates.** `/login` and `/setup-admin` are open. Everything else
is wrapped in `ProtectedRoute`: `/setup`, **`/race`**, `/results`, `/dev`, `/track-editor`,
`/racer-editor`, and `/diagnose-verteilung` (admin only).

> **`/race` IS BEHIND `ProtectedRoute`, and this has bitten tooling twice.** Any harness, screenshot
> script or e2e spec that navigates straight to `/race` without a session lands on `/login` and
> reports something unrelated — a blank canvas, a timeout, a missing element. If a tool sees the
> login screen where it expected a race, that is this, and the fix is to authenticate rather than to
> change the tool's selectors.

`allowOffline` lets `/setup`, `/race` and `/results` render when the API is unreachable but a session
was previously established. **It never grants privileged access** — a route with `requiredRole` is
always online-only.

**Inside the Dev Screen, sections are gated by `tier`, and the default is DENY** — only an explicit
`tier: 'operator'` is operator-visible, so a new section with no tier, or an unrecognised one, is
admin-only until somebody classifies it (`isOperatorTier` in `DevScreen.jsx`).

**A new route cannot join quietly.** `server/src/auth/routePolicyDrift.test.js` walks the real router
stack and requires every mutating `/api` route to be either admin-classified in `ROUTE_POLICY` or
named in an explicit operator-plus allow-list. **Adding a route without deciding its role turns the
suite red**, which is what makes "deny by default" a fact rather than an intention.

---

## 6. Rate limiting and CORS

**Rate limits are per IP**, and both return `429 too many attempts, please try again later`.

|                        | window     | limit | counts                                                                  |
| ---------------------- | ---------- | ----- | ----------------------------------------------------------------------- |
| `POST /api/auth/login` | 15 minutes | 10    | **failed logins only** — a successful login does not consume the budget |
| `POST /api/auth/setup` | 1 hour     | 10    | every attempt, successful or not                                        |

Both are **disabled under test** (`NODE_ENV=test` or `VITEST`), because the suite shares one IP and
would otherwise lock itself out.

**CORS** is built **once at module load** from `RA_CLIENT_ORIGIN`, with `credentials: true` and never
a wildcard. No `allowedHeaders` is set, so the package reflects the request's — which is what lets
`x-bootstrap-token` through the preflight without any list naming it.

> **The consequence of "once at module load" is a named incident, and it is
> [VERIFY-RULES.md](VERIFY-RULES.md)'s** — a port missing from the list when the API starts cannot be
> added while it runs, and the client reports a dead backend that is answering perfectly. That rule
> owns the symptom, the start command and the curl that settles it. **It is not repeated here.**

**CSRF** is an Origin/Referer check on mutating methods (`POST`/`PUT`/`DELETE`/`PATCH`) under `/api`.
In **strict** mode a request with no `Origin` and no `Referer` is rejected (`403 origin required`);
outside strict mode it is allowed, so `curl` and server-to-server calls work in development.

---

## 7. Automated tests

**The e2e suite creates its own account, every run.** `playwright.config.js` generates a bootstrap
token, a session secret, a username and a password for that run; `client/e2e/auth.setup.js` then
POSTs to the **real** `/api/auth/setup` with the token in the `x-bootstrap-token` header, and logs in
through the **real** login form rather than injecting a cookie. Playwright saves the resulting
`storageState`, and every other spec reuses it.

**It must never point at a live instance, and this is not hypothetical.** Two suites reached a
running server before — one attached to whatever dev server was already up, and one wrote into real
data ([LESSONS L210](LESSONS.md)). The suite therefore runs against an isolated API with its own
empty data directory, which is also what makes `setupNeeded` true exactly once per run. If
`setup-needed` answers "not needed", the run is deliberately reusing an instance and only the login
step matters.

**Unit tests must not reach a server at all.** Screen tests that mount a component inherit every
address that component's loaders can reach; `forbidNetwork()` in `client/src/test/mockServerTracks.js`
makes any `fetch` from those files fail the file.

**The seam is tested.** `server/src/auth/setupContract.test.js` drives the real client function
against the real server handler and asserts the **channel**, because the client's own test mocks
`fetch` and the server's own test asserts the server's side — and both were green while setup could
not work.

---

## 8. Known traps, stated as facts

- **A failed setup does not tell you why.** `403 setup not available` is returned both when the token
  is wrong and when **no `RA_BOOTSTRAP_TOKEN` is configured at all**. An operator seeing it cannot
  tell "I typed it wrong" from "the server was never given one". Deliberate — it reveals nothing to a
  stranger — but it is the first thing to check on a failed install. See PROPOSALS in
  [AUTH-DOC-LIVE-1](../reports/evolution/AUTH-DOC-LIVE-1.md).
- **A missing session secret is silent in development.** The server generates an ephemeral one and
  warns; every restart invalidates every session. In production it refuses to start instead.
- **`RA_COOKIE_NAME_MODE=host` throws at startup** unless Secure is guaranteed — deliberately, since
  the `__Host-` prefix is meaningless without it.
- **Recovery exists.** `server/src/auth/recoverAdmin.js` backs a local CLI for the locked-out-admin
  case. It is local-only by design.

---

## 9. Where the code is

| concern                                | file                                       |
| -------------------------------------- | ------------------------------------------ |
| routes: setup, login, logout, me       | `server/src/auth/authRouter.js`            |
| deny-by-default + role policy          | `server/src/auth/guards.js`                |
| session middleware, cookie name/secure | `server/src/auth/session.js`               |
| CORS options + CSRF origin guard       | `server/src/auth/csrf.js`                  |
| rate limiters                          | `server/src/auth/rateLimit.js`             |
| user store, bcrypt, atomic write       | `server/src/auth/usersStore.js`            |
| admin recovery                         | `server/src/auth/recoverAdmin.js`          |
| client API calls                       | `client/src/services/authApi.js`           |
| client session state                   | `client/src/contexts/AuthContext.jsx`      |
| client route guard                     | `client/src/components/ProtectedRoute.jsx` |
