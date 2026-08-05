# RaceArena — Authentication & Authorization Architecture (DESIGN v3.2)

> Status: **DESIGN / not built.** v3.2 (completeness): §7 route inventory now lists
> `logout`/`me`; §10 spells out E2E test prerequisites (isolated state, setup-state, user
> fixtures). v3.1 added §10 _Automated testing & verification_
> (server Vitest + Playwright E2E auth flow, with the honest boundary). v3 added the
> delta-review precisions (2026-06-13):
> bootstrap-secret lifecycle (§5), a concrete auditable admin-lockout recovery path (§9a),
> same-origin nailed as the binding default CSRF profile (§4a), and ROUTE_POLICY-matching
> tests (§6.3). v2 had added CSRF, atomic+secret bootstrap, the hard central-router rule,
> behavioural authz tests, and the session lifecycle/store. (v3 cleanup: fixed the §7 table
> row; added Origin/Referer defense-in-depth to §4a.) For owner approval before any
> implementation spec. Intended SoT at `docs/AUTH.md`. Verified against `origin/master` @ `200da75`.

---

## 1. Goals & scope

1. **Per-install closed tenant.** One server installation = one self-contained world; many
   installs possible; each isolated. _This isolation already exists structurally_ (separate
   `server/data/`, separate port; no shared DB).
2. **Two race-director tiers** — `operator` (Stufe 1) and `admin` (Stufe 2). See §2.
3. **Real enforcement on the server** for server-backed resources. Client gating is UX, not
   security.
4. **Secure by default & hard to break on extension** — adding a route or screen must
   default to _locked_ (§6).

**Deployment assumption (drives CSRF & cookies, §4a):** the default target is a
**same-origin deployment** — the client is served from the _same_ origin as the API
(reverse-proxy or the server serving the built client). This is the simplest and safest
posture. Cross-origin deployment is supported but needs the CSRF-token variant (§4a) and is
called out where it differs.

**Non-goals:** no cross-server identity; **no hand-rolled crypto** (use `bcrypt` + a
maintained session middleware + a maintained CSRF middleware); this is **not** the full
security audit (general rate-limit tuning, full CORS lockdown, HTTPS, secret management,
audit-log retention belong to the deferred Security-Audit at release run-up — the pieces
required for auth to _function safely_ are included here, the rest is flagged).

---

## 2. Role model

| Capability                                                                                                                                                                   | `operator` (Stufe 1) | `admin` (Stufe 2) |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------: | :---------------: |
| Normal operation + operator DevScreen sections (Race Defaults, Player Groups, Racer Types, Tracks, Branding, Race History)                                                   |          ✓           |         ✓         |
| ADVANCED DevScreen sections (Race Tuning, Rubber Band, Priority System, Sprite Size Range, Camera Advanced, Name Tag Visibility, Auto-Scale, Surface Classes, System/Import) |          ✗           |         ✓         |
| Create/manage other race directors & assign tier                                                                                                                             |          ✗           |         ✓         |

- Split maps onto the existing per-section `tier` field in `DevScreen.jsx`
  (`'operator' | 'advanced'`): `operator`→any logged-in user; `advanced`→`admin`.
- **Assignment:** server operator creates the first `admin` via one-time setup (§5);
  thereafter any `admin` manages users and tiers; `operator` cannot.

---

## 3. Data model — `server/data/users.json`

Flat JSON array (consistent with existing stores):

```
{ "id": "<uuid>", "username": "<unique, normalised>", "passwordHash": "<bcrypt>",
  "role": "operator" | "admin", "createdAt": "<ISO>", "createdBy": "<user id | 'setup'>" }
```

- **`users.json` is git-ignored and never shipped** → fresh install has no users → setup
  flow (§5). Add to `.gitignore`.
- Passwords stored only as `bcrypt` hash (cost ~12); plaintext never logged/stored/returned.
- **File hygiene:** restrictive file permissions/ownership (owner-only read/write); treat as
  a credential store in any backup/restore (do not copy into world-readable artifacts).
- **Username normalisation:** uniqueness is enforced on a normalised form — trim, Unicode
  NFC, locale-independent case-folding (lower-case) — stored alongside the display name.
- SQLite is a possible later upgrade (also see session store, §4).

---

## 4. Auth mechanism — cookie session

- Server-side session via a **maintained session middleware**. Browser holds only an opaque
  cookie: `httpOnly`, `sameSite` (see §4a), `secure` in production. Session secret from env.
- **Session lifecycle (MUST):** regenerate the session ID on successful login **and** on
  setup (anti session-fixation); destroy/invalidate the session fully on logout and on
  password reset for that user.
- **Session store (MUST):** a **persistent** store (file-backed or SQLite-backed session
  store), **not** the in-memory default — the default MemoryStore leaks and drops all
  sessions on restart, unsuitable for production.
- **Why cookie-session over JWT:** simpler/safer for a closed per-install tool; no client
  token storage, no refresh logic. Cost: explicit origin + CSRF handling (§4a).

### Auth endpoints (`authRouter` at `/api/auth`)

| Method | Path                     | Access                                                   | Purpose                                        |
| ------ | ------------------------ | -------------------------------------------------------- | ---------------------------------------------- |
| GET    | `/api/auth/setup-needed` | public                                                   | `true` if zero users (client → setup vs login) |
| POST   | `/api/auth/setup`        | public **only while zero users** + bootstrap secret (§5) | create first `admin`                           |
| POST   | `/api/auth/login`        | public (rate-limited §7.1)                               | verify (bcrypt) → session                      |
| POST   | `/api/auth/logout`       | authenticated                                            | destroy session                                |
| GET    | `/api/auth/me`           | authenticated                                            | `{ username, role }` of current user           |

### 4a. CSRF strategy (MUST — was missing in v1)

**Default profile (binding): same-origin only.** The shipped/standard deployment is
same-origin (§1); cross-origin is an _explicit, opt-in exception_ that MUST enable the
CSRF-token flow below. We do not ship a cross-origin-without-token mode.

Cookie-authenticated **mutating** requests need CSRF protection:

- **Primary (same-origin deployment — the default):** set the session cookie `SameSite=Lax`
  (or `Strict`), which blocks cross-site form/posts; combined with same-origin this covers
  the common case.
- **Cross-origin deployment:** additionally require a **CSRF token** (double-submit or a
  maintained CSRF middleware) on all mutating routes, plus `SameSite=None; Secure` and
  CORS `credentials: true` with the explicit client origin.
- The design treats CSRF as a **required cross-cutting concern on every mutating route**, in
  the same central place as auth (§6.1) — not per-handler.
- **Defense-in-depth (added per review):** the central mutating-request middleware also
  performs an `Origin`/`Referer` check against the configured allowed origin and rejects
  mismatches. This is layered _on top of_ the SameSite/token strategy (not a replacement) and
  makes misconfiguration or stray cross-origin calls fail fast and visibly.

---

## 5. First-admin bootstrap (MUST — hardened)

- Fresh server, no users → `setup-needed` = `true`; client shows `/setup-admin`.
- `POST /api/auth/setup` creates the first `admin`, subject to ALL of:
  1. **Atomic create-if-none:** the "zero users?" check and the write are a single atomic
     operation (file lock / compare-and-swap / transactional write) so two parallel setup
     requests cannot both succeed.
  2. **Install bootstrap secret:** setup requires a secret value provided at install time
     (e.g. env `RA_BOOTSTRAP_TOKEN`), so a stranger who merely reaches the server first
     cannot claim the first admin. The legitimate operator who installed the server knows it.
  3. **Self-disabling:** once any user exists, the endpoint refuses (and a persisted
     "setup-complete" state makes this explicit).
- After setup, `/setup-admin` is unreachable; the app shows `/login`.

**Bootstrap-secret lifecycle (explicit):**

- **Provisioning:** the operator who installs the server sets `RA_BOOTSTRAP_TOKEN` at
  install time (environment variable / install config) — a value of their choosing or one
  the installer generates. It lives only in the server environment, never in `users.json`,
  never returned by any endpoint, never logged.
- **Use:** required by `POST /api/auth/setup`; checked with a constant-time comparison.
- **Deactivation:** once setup-complete is set, the token is **inert** — setup refuses
  regardless of the token, so a leaked token after setup grants nothing. The operator should
  remove/clear the env var after first setup as hygiene (optional, since it is already inert).
- **Rotation/re-use:** only relevant if the recovery path (§9a) intentionally re-opens
  setup; rotating the token then is the operator's call. No automatic rotation.

---

## 6. Secure-by-default & "no forgetting on extension" (core requirement)

### 6.1 Server: deny-by-default + ONE guarded entry point (MUST)

- A single `requireAuth` middleware is applied **globally** to the `/api` router; **every**
  route is protected unless its **exact** path+method is in an explicit `PUBLIC_PATHS`
  allowlist (health, login, setup, setup-needed). **No wildcards/prefixes in the allowlist** —
  exact entries only, so a too-broad pattern cannot silently open routes.
- **Hard architectural rule:** _all_ API routes are registered behind this one guarded
  registration point. **No `app.get/app.post/...` for API outside the guarded router stack,
  no separately-mounted sub-apps that bypass it.** A new route therefore inherits protection
  by default; forgetting fails **closed** (too strict, caught in tests), never open.
- Admin routes carry `requireAdmin` via **one central `ROUTE_POLICY`** (path+method →
  required role). Matching must normalise HTTP method and handle route params/trailing slash
  so a policy entry cannot be silently missed.

### 6.2 Client: deny-by-default guard + explicit per-route role matrix (MUST)

- `<ProtectedRoute>` wraps **all** client routes except `/login` and `/setup-admin`.
- **Per-route role matrix** — standalone pages are gated explicitly, _not_ only via DevScreen
  tier (which only covers DevScreen sections):

  | Route (`App.jsx`)             | Required role                                                        |
  | ----------------------------- | -------------------------------------------------------------------- |
  | `/login`, `/setup-admin`      | public                                                               |
  | `/setup`, `/race`, `/results` | operator+                                                            |
  | `/track-editor`               | operator+ (track CRUD is operator-level)                             |
  | `/racer-editor`               | operator+                                                            |
  | `/dev`                        | operator+ to enter; **ADVANCED sections gated to `admin` by `tier`** |
  | `/diagnose-verteilung`        | **admin** (internal diagnostic/headless-sim tool)                    |

- DevScreen sections render by `tier`; a section with **missing/unknown tier is treated as
  `advanced` (locked)** → a new, unclassified section is hidden until consciously tiered.

### 6.3 Tests that fail red (MUST — presence **and** behaviour)

- **Route-presence test:** enumerate all registered Express routes; assert each non-public
  route sits behind `requireAuth` and each admin route behind `requireAdmin`. New
  unclassified route → suite red.
- **Behavioural authz tests (added per review):** for representative routes — anonymous →
  `401`; `operator` on an `admin` route → `403`; `admin` → expected access. These verify the
  guard _works_, not merely that it is present.
- **Policy-matching tests:** unit-test the `ROUTE_POLICY`/`PUBLIC_PATHS` matcher against the
  tricky cases — parameterised paths (`/api/tracks/:id`), trailing-slash variants
  (`/api/x` vs `/api/x/`), and method case/normalisation — so a route cannot slip past the
  policy through a matching quirk.
- **Honest limit (L126):** tests prove presence/behaviour on tested routes; they do not prove
  every guard's internal logic is correct, nor catch routes mounted outside the audited app
  object — which is exactly why §6.1's hard single-entry rule exists, and why
  security-relevant diffs get independent (Copilot) review and a final owner eye-check (§10).

### 6.4 Living documentation + standing discipline

- This `docs/AUTH.md` is the SoT (role model, `ROUTE_POLICY` table, client role matrix) plus
  the **Extension Checklist** below. A Handoff STANDING DISCIPLINE entry points here.

#### Extension Checklist

- **New server route** → add to `ROUTE_POLICY` (role) or `PUBLIC_PATHS` (exact, with reason).
  Run presence + behavioural tests. Confirm it is mounted inside the guarded stack.
- **New client page/route** → add a row to the §6.2 role matrix; wrap in `<ProtectedRoute>`.
- **New DevScreen section** → give it a `tier`.
- **Move a config localStorage→server** (brands/racers; later tuning/camera) → its CRUD gets
  `ROUTE_POLICY` entries at the correct role (advanced configs → `admin`); client gating
  alone is insufficient once shared.

---

## 7. Current route inventory → required level

| Method              | Path                                                           | Level         | Note                                                        |
| ------------------- | -------------------------------------------------------------- | ------------- | ----------------------------------------------------------- |
| GET                 | `/api/health`                                                  | public        | liveness                                                    |
| POST                | `/api/auth/login`                                              | public        | rate-limited (§7.1)                                         |
| POST                | `/api/auth/setup`                                              | public        | only while zero users + bootstrap secret (§5), rate-limited |
| GET                 | `/api/auth/setup-needed`                                       | public        | client routing only                                         |
| POST                | `/api/auth/logout`                                             | authenticated | destroy session                                             |
| GET                 | `/api/auth/me`                                                 | authenticated | current `{ username, role }`                                |
| GET                 | `/api/tracks`, `/api/tracks/:id`, `/api/tracks/:id/background` | operator+     | read                                                        |
| POST/PUT/DELETE     | `/api/tracks/...` (incl. background)                           | operator+     | Tracks = Stufe 1                                            |
| GET                 | `/api/surface-classes`, `/api/surface-classes/:id`             | operator+     | read                                                        |
| POST/PUT/DELETE     | `/api/surface-classes/...`                                     | **admin**     | ADVANCED                                                    |
| GET/POST/PUT/DELETE | `/api/users/...`                                               | **admin**     | user mgmt (§9)                                              |

### 7.1 Adjustments that come _with_ auth (not optional)

- **CORS:** wildcard → explicit client origin + `credentials: true` (wildcard+cookies is
  rejected by browsers).
- **Client transport:** `apiClient.js` sends `credentials: 'include'`; `401` → `/login`.
- **Rate limiting on `login` AND `setup`** (per-IP attempt cap) — addresses C3 for these
  password/secret endpoints; broader rate limiting stays in the deferred Security-Audit.

---

## 8. What stays client-only (for now)

Pure-localStorage ADVANCED sections (Race Tuning, Rubber Band, Priority System, Sprite Size
Range, Camera Advanced, Name Tag Visibility, Auto-Scale, System export/import) have no server
to protect today — data lives in the operator's browser. They are **client-gated only**
(hidden unless `admin`), acceptable because they are not shared. When any moves server-side
(brands/racers plan, or later shared tuning) → §6.1 applies. **System → Import** is the top
local privilege (`importAllStorage` overwrites every `racearena:*` key at once) → `admin`-gated.

---

## 9. User management (`admin` only)

| Method | Path             | Purpose                               |
| ------ | ---------------- | ------------------------------------- |
| GET    | `/api/users`     | list (no password hashes returned)    |
| POST   | `/api/users`     | create `{ username, password, role }` |
| PUT    | `/api/users/:id` | change role / reset password          |
| DELETE | `/api/users/:id` | remove                                |

- **Last-admin protection (all paths):** the server refuses any operation that would leave
  zero admins — delete, demote, deactivate, or role-change of the last `admin`.
- **Password reset:** no self-service; an `admin` resets another user's password (which also
  invalidates that user's sessions, §4). The first admin's own recovery falls back to the
  install bootstrap path (operator-level access to the server).
- **Optional open registration (default OFF):** a per-install flag may expose
  `POST /api/auth/register` for self-signup as `operator`; an `admin` enables it per server.
- **Security-event logging (minimum):** log login success/failure, user create/delete,
  role change, and setup completion (without secrets/hashes).

### 9a. Admin-lockout recovery (concrete, auditable)

If an install ends up with no usable admin (lost password, accidental state), recovery is a
**local, server-side operation only** — never a network-exposed endpoint:

- A maintenance CLI shipped with the server (e.g. `node scripts/recover-admin.mjs`) that runs
  **on the server host** and requires local filesystem access to `server/data/`. It can
  either (a) promote/reset a named user to `admin` with a new password, or (b) re-arm the
  setup flow (clear the setup-complete flag) so a fresh `/setup-admin` can run with a freshly
  set `RA_BOOTSTRAP_TOKEN`.
- Because it requires host/filesystem access, the threat model matches "the operator owns the
  box" — no new network attack surface is added.
- Every recovery action writes a security-event log entry (who/when/what, no secrets), so the
  recovery is auditable after the fact.

---

## 10. Automated testing & verification

Goal: verify as much of auth as possible **automatically, without owner intervention**, on
every test run — while being honest about where automation stops.

**Server-side, automated (Vitest, runs in `npm test`):**

- Route-presence test, behavioural authz tests (401/403/access), and policy-matching tests —
  all defined in §6.3. These run headless on every suite run; a new unprotected or
  mis-classified route turns the suite red without anyone remembering to check.
- Auth-unit tests: bcrypt hashing round-trip (hash ≠ plaintext, verify true/false), username
  normalisation/uniqueness, last-admin protection refuses on delete/demote/deactivate/rename,
  bootstrap atomicity (parallel setup → exactly one admin), bootstrap-secret required +
  inert after setup-complete, session-ID regenerated on login, session invalidated on logout.

**End-to-end, automated (Playwright — already in the project):**

- The full browser auth flow as scripted E2E tests, no manual clicking: first-run setup page;
  login with correct vs wrong password; visiting a protected route while logged out →
  redirect to `/login`; an `operator` does not see ADVANCED DevScreen sections while an
  `admin` does; logout re-locks. These run headless in CI/the test command.
- This automates exactly the kind of check that was previously the owner's manual eye-check,
  so the manual surface shrinks to a final confidence pass rather than full verification.
- **E2E prerequisites (for CI stability):** each E2E run starts from an **isolated, known
  state** — a throwaway `server/data/` (temp dir or fixture copy) so tests never touch real
  data; a controlled setup state (start with zero users to exercise the first-run/setup path,
  or pre-seed a fixture `users.json` + known `RA_BOOTSTRAP_TOKEN` for the logged-in paths);
  and defined **test user fixtures** (one `operator`, one `admin`) with known passwords.
  State is reset between runs so tests are deterministic and order-independent.

**Honest boundary (L126 — does NOT remove the owner/audit role):**

- Tests prove the _tested_ behaviour is correct; they do **not** prove the absence of
  vulnerabilities. Passing E2E auth tests ≠ "secure".
- A final owner eye-check still happens once per phase (especially the real login/logout feel
  and that nothing legitimate got locked out).
- Deeper security verification (penetration-style review, dependency/CVE scan, header/TLS
  hardening) belongs to the deferred Security-Audit at release run-up — automation reduces,
  but does not replace, it.

Each build phase (§12) ships its automated server + E2E tests **with** the feature, not after.

---

## 11. Honest limitations

- Client gating is convenience, not security; the server is the only real boundary, and only
  for server-backed resources.
- Tests prove presence/behaviour on tested routes, not the correctness of every guard's
  internal logic (L126).
- No crypto is hand-written; safety rests on correct use of the chosen libraries.
- Full hardening (general rate limiting, CORS lockdown beyond cookie needs, HTTPS, secret
  management, audit-log retention/rotation) = deferred Security-Audit at release run-up.
  (The admin-lockout recovery _flow_ is defined here in §9a; its long-term audit-log
  retention policy is part of that later hardening.)

---

## 12. Proposed build order (each phase: small, verified, Copilot-reviewed)

- **Phase A — server auth foundation.** `users.json` + `bcrypt`; session middleware with
  persistent store + ID-regeneration + logout invalidation; `/api/auth/*` (login/logout/me/
  setup with atomic+secret bootstrap); global `requireAuth` + exact `PUBLIC_PATHS`;
  `requireAdmin` + `ROUTE_POLICY`; CSRF middleware on mutating routes; CORS+credentials;
  login/setup rate-limit; **route-presence + behavioural authz tests**. Verify via API.
- **Phase B — client login gate.** `/login` + `/setup-admin`; `<ProtectedRoute>` + per-route
  role matrix; `apiClient` credentials + CSRF token wiring + 401→/login; `GET /api/auth/me`.
- **Phase C — DevScreen tier gating + user-management UI.** Advanced sections gated by role
  via `tier`; admin user-management screen.
- **Phase D — (separate, later) move brands + racers server-side** with auth-gated CRUD.

Each phase produces an implementation spec only after this design is approved; every
security-relevant diff gets independent (Copilot) review; Plan-Claude verifies every commit
against `origin/master`.
