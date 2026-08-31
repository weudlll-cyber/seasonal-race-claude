# RaceArena — Deployment Environment Guide

**Owns:** deploying RaceArena to a public same-origin host, and the environment variables that requires. Local development is [SETUP.md](SETUP.md)'s.

**How authentication BEHAVES — the first-admin channel, sessions, what is protected, and what the auth code does when a variable is absent — is [AUTH.md](AUTH.md)'s.**

## Public same-origin hosting

The Node.js server serves **both** the built SPA and the `/api/*` endpoints on a single address
(e.g. `https://racearena.example.com`). Browsers see one origin, so no CORS credentials dance is
needed. **One thing to start, one port.**

**This became true on 2026-09-01 (SERVE-SPA-1).** Before that date this document described the model
above while the server served no client at all and `GET /` was a 404 — so if you are reading an older
checkout, verify with `curl` before trusting the page.

### How the client is served, and what that means for the build

- The server serves `client/dist` if it is there, and mounts **above** the auth guards, so a visitor
  who is not signed in can still load the app that draws the sign-in form.
- A deep link (`/setup`, `/race/...`) returns the app shell so the client's router can take over.
- **No path under `/api/` is ever answered with the app's HTML.** An unknown API route answers as the
  API: `401` unauthenticated, `404 {"error":"no such API route: …"}` once signed in.
- A **missing asset** (anything whose last path segment has a file extension) returns 404 rather than
  the shell, so a stale `/assets/index-OLD.js` after a redeploy fails as a plain 404 instead of a
  MIME-type error.
- **With no build present the server starts anyway** and logs one line saying where it looked. The API
  is unaffected. A developer running the API alone is never blocked by a missing client build.

**You must build the client yourself before deploying:**

```sh
cd client && npm install && npm run build     # produces client/dist
```

**And you must build it with `VITE_API_URL` set to your public origin**, because the client bakes its
API address in at build time and its default is `http://localhost:4000`:

```sh
cd client && VITE_API_URL=https://racearena.example.com npm run build
```

Leave `VITE_API_URL` unset **only** if the app will actually be reached at `http://localhost:4000`.

### Required environment variables

| Variable            | Example value                   | Why                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`          | `production`                    | Enables Express production mode (trust-proxy, error sanitisation).                                                                                                                                                                                                                             |
| `RA_SESSION_SECRET` | `<64-char random string>`       | **Required in production** — the server refuses to start without it. Signs session cookies; rotating this invalidates all active sessions.                                                                                                                                                     |
| `RA_BOOTSTRAP_TOKEN`| `<random string>`               | **Required to create the first admin.** Without it `POST /api/auth/setup` answers `403 setup not available` and the install can never be signed into. See [AUTH.md](AUTH.md).                                                                                                                  |
| `RA_COOKIE_SECURE`  | `true` or `auto`                | Marks the session cookie `Secure` so it is only sent over HTTPS. Use `auto` to let Express infer from the trust-proxy setting; use `true` when you are certain HTTPS is always in use.                                                                                                        |
| `RA_CSRF_STRICT`    | `auto` or `true`                | Rejects mutating API requests that lack an `Origin` header (strict browser enforcement). `auto` enables strict when `NODE_ENV=production`; `true` forces it regardless of `NODE_ENV`.                                                                                                          |
| `RA_PUBLIC_ORIGIN`  | `https://racearena.example.com` | Canonical self-origin for CSRF validation. The CSRF guard compares incoming `Origin` headers against this value instead of deriving it from the `Host` header on each request. Set this whenever the public address differs from the value Express would derive (e.g. behind a reverse proxy). |

### Optional variables

| Variable           | Example value                   | Why                                                                                                                                            |
| ------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `RA_CLIENT_DIST`   | `/app/client-dist`              | Where the built client lives. Defaults to `client/dist` resolved relative to the server's own module, never to the working directory. The Docker image sets this because the build lands elsewhere inside the image. |
| `RA_CLIENT_ORIGIN` | `https://other.example.com`     | Only needed if the SPA is ever served from a **different** origin than the API (split hosting). **In the same-origin model above it is not required** — and unset means CORS is off, which is the correct and safest state for same-origin. |
| `RA_DATA_DIR`      | `/var/lib/racearena`            | Redirects the whole runtime store. **See the warning below.**                                                                                  |
| `PORT`             | `4000`                          | Listen port. Defaults to 4000.                                                                                                                 |

### Minimal production start

```sh
cd client && VITE_API_URL=https://racearena.example.com npm run build && cd ..

NODE_ENV=production \
RA_SESSION_SECRET="$(openssl rand -hex 32)" \
RA_BOOTSTRAP_TOKEN="$(openssl rand -hex 16)" \
RA_COOKIE_SECURE=auto \
RA_CSRF_STRICT=auto \
RA_PUBLIC_ORIGIN=https://racearena.example.com \
node server/src/index.js
```

Then create the first admin once, and unset `RA_BOOTSTRAP_TOKEN` afterwards:

```sh
curl -X POST https://racearena.example.com/api/auth/setup \
  -H 'Content-Type: application/json' \
  -H "x-bootstrap-token: $RA_BOOTSTRAP_TOKEN" \
  -d '{"username":"...","password":"..."}'
```

## Docker

`docker compose build` supplies the client build to the image through a **named build context**. The
image's build context is `./server`, and `client/dist` lives outside it, so an ordinary `COPY` cannot
reach it; `additional_contexts: { client: ./client }` in `docker-compose.yml` brings it in without
moving the build context to the repository root.

**Consequences worth knowing before you build:**

- **Run `npm run build` in `client/` first.** The image copies a build, it does not make one. Without
  it the build fails on the missing `dist/`.
- A manual build outside compose needs the context by hand:
  `docker build --build-context client=./client ./server`.
- The image is **not standalone**: `server/utils` and the repository-root `shared/` are supplied by
  bind mounts, so the container still needs the repository beside it. Closing that is separate work.

## Notes

- **Reverse proxy**: if sitting behind nginx/Caddy, ensure `trust proxy` is honoured
  (`NODE_ENV=production` enables it). Set `RA_COOKIE_SECURE=auto` so Express reads the
  forwarded protocol rather than guessing.
- **Session secret rotation**: changing `RA_SESSION_SECRET` invalidates all existing sessions
  (users are logged out). Plan rotations during maintenance windows.
- **The runtime store holds your accounts.** `users.json`, `sessions.sqlite` and the seeded tracks,
  backgrounds, brands and player groups all live in the same directory (`RA_DATA_DIR`, default
  `server/data`). **Deleting that directory to "get clean defaults" destroys every account on the
  install.** Back it up, and mount it as a volume so a container rebuild does not take it with it.
