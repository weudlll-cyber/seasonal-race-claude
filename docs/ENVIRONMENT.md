# RaceArena — Environment Variables

**Owns:** every environment variable RaceArena reads, what it does, and **what happens when it is
missing or wrong**. Getting it running locally is [SETUP.md](SETUP.md)'s; deploying it is
[DEPLOYMENT.md](DEPLOYMENT.md)'s; how authentication behaves is [AUTH.md](AUTH.md)'s.

**This page names variables and never their values.** Secrets have no examples here on purpose —
generate your own, and keep them out of the repository. Where a variable has a *default behaviour*
that is stated, because "what happens if I leave it out" is the question this page exists to answer.

## Where they belong

| you are… | put them in |
| --- | --- |
| running locally with Docker | `docker-compose.override.yml` — **gitignored, and it does not exist in a fresh clone.** Copy `docker-compose.override.yml.example` to create it. |
| running the server with plain `node` | your shell, a process manager, or a systemd unit |
| deploying | your host's secret store — never a committed file |

**The one that catches people:** `docker-compose.yml` says in a comment that `RA_SESSION_SECRET` and
`RA_CLIENT_ORIGIN` come from the override file. That file is gitignored, so a fresh clone does not
have it — and `docker compose up` **succeeds anyway**. What you get is a server with an ephemeral
session secret and CORS switched off, which looks like a working start and then refuses your browser.
Copy the example file first.

---

## Required to run at all

| variable | what happens if it is MISSING | what happens if it is WRONG |
| --- | --- | --- |
| `RA_SESSION_SECRET` | **In production (`NODE_ENV=production`) the server throws `SESSION_SECRET_MISSING` and does not start.** Outside production it generates a random one per process and warns — so the server runs, and **every restart logs everyone out**. | Changing it invalidates every existing session. Rotate during a maintenance window. |
| `RA_BOOTSTRAP_TOKEN` | `POST /api/auth/setup` answers **`403 setup not available`** and logs `RA_BOOTSTRAP_TOKEN not set; setup disabled`. **The first admin can never be created**, so the install cannot be signed into at all. | The same `403` and the same body. **The two cases are deliberately indistinguishable to the caller** so the endpoint cannot be used to probe whether setup is configured; the server log says which one it was. |

Once the first admin exists, unset `RA_BOOTSTRAP_TOKEN`. Setup is single-use — the marker file makes
a second attempt answer `409 setup already complete`, **and that check runs before the token check**,
so on an install that already has an admin a wrong token is never reported as such.

## Serving and origins

| variable | default | if missing or wrong |
| --- | --- | --- |
| `PORT` | `4000` | — |
| `RA_CLIENT_DIST` | `client/dist`, resolved relative to the server's own module — never to the working directory | If there is no build there, the server **starts anyway**, logs one line naming the path it tried, and serves the API only. `GET /` is then a 404. |
| `RA_CLIENT_ORIGIN` | unset — CORS is **off** (`origin: false`), i.e. same-origin only | Needed only for **split hosting**, where the app is served from a different origin than the API. Comma-separated for more than one. A browser on an origin not in the list is refused by CORS, which in the browser looks like the server being down rather than a configuration problem. In the same-origin model it should stay unset. |
| `RA_PUBLIC_ORIGIN` | derived from the `Host` header per request | The canonical self-origin for CSRF validation. Set it whenever the public address differs from what Express would derive — behind a reverse proxy, most often. Wrong value: mutating requests are rejected as cross-origin. |

## Cookies and CSRF

| variable | accepted | default | notes |
| --- | --- | --- | --- |
| `NODE_ENV` | `production`, `test`, anything | unset | `production` turns on trust-proxy, and is what the three `auto` settings below key off. |
| `RA_COOKIE_SECURE` | `true`, `false`, `auto` | follows `NODE_ENV=production` | Marks the session cookie `Secure`. `auto` delegates to Express's trust-proxy logic. Set it explicitly when a terminating proxy means `NODE_ENV` does not tell the truth about HTTPS. |
| `RA_COOKIE_NAME_MODE` | `auto`, `host`, `legacy` | `auto` | `auto` uses the `__Host-` cookie prefix only when `Secure` is guaranteed. **`host` THROWS at startup (`COOKIE_NAME_MODE_INVALID`) unless `RA_COOKIE_SECURE=true`** — one of the two variables that can stop the server from booting. |
| `RA_CSRF_STRICT` | `true`, `false`, `auto` | follows `NODE_ENV=production` | Rejects mutating requests with no `Origin` header. Wrong value: either mutations from real browsers are refused, or the protection is off. |

## Storage

| variable | default | notes |
| --- | --- | --- |
| `RA_DATA_DIR` | `server/data`, resolved relative to the server's own module | The whole runtime store. **It holds your accounts as well as the seeded content** — see the warning below. |
| `RA_USERS_DB` | `users.json` inside the data root | The account store. |
| `RA_SESSION_DB` | `sessions.sqlite` inside the data root | The session store. In-memory under test. |

**Your accounts live beside the seeded records.** `users.json`, `sessions.sqlite` and
`setup-complete.json` sit in the same directory as the tracks, backgrounds, brands and player groups.
**Deleting that directory to get clean defaults deletes every account with it.** You do not need to:
shipped records are redelivered by version, not by wiping the store. Mount the data root as a volume
so a container rebuild does not take it with it.

## Rate limits — tune only if you have a reason

| variable | default |
| --- | --- |
| `RA_LOGIN_RL_WINDOW_MS` | 15 minutes |
| `RA_LOGIN_RL_MAX` | 10 attempts per window |
| `RA_SETUP_RL_WINDOW_MS` | 1 hour |
| `RA_SETUP_RL_MAX` | 10 attempts per window |

Raising these weakens brute-force protection on the two endpoints that most need it. Non-numeric
values become `NaN` and the limiter's behaviour is then undefined — set a number or leave it alone.

## Build identity — optional, and only affects a status line

`RA_BUILD_COMMIT`, `RA_BUILD_BRANCH`, `RA_BUILD_DIRTY` supply what `GET /api/health` reports as the
running build. With none of them set it reports `unknown` **and the reason why**, which is correct but
not useful; it never guesses.

## The client's own, at BUILD time

`VITE_API_URL` is read when the client is **built**, not when it runs, and it is baked into the
bundle. It defaults to `http://localhost:4000`.

**If you serve the app anywhere other than `http://localhost:4000`, you must set it when building**,
or the app your visitors download will call *their* machine instead of your server:

```sh
cd client && VITE_API_URL=https://your.host npm run build
```

## Test-only

`NODE_ENV=test` and `VITEST` switch the session store to in-memory and relax the rate limiters. They
are set by the test harness. Do not set them on a running install.

## Tooling — not the server

These affect scripts in `scripts/`, never the running application: `RA_SCRATCH_DIR` (where
measurements write, kept off the synced tree), `RA_RECOVERY_PASSWORD` (`recover-admin.mjs`),
`RA_EXPORT_VERBOSE` (`data-export.mjs`), and `CI`, `BASE_SHA`, `HEAD_SHA` (set by the CI runner).
