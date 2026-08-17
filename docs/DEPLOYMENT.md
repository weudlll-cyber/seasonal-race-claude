# RaceArena — Deployment Environment Guide

**Owns:** deploying RaceArena to a public same-origin host, and the environment variables that requires. Local development is [SETUP.md](SETUP.md)'s.

**How authentication BEHAVES — the first-admin channel, sessions, what is protected, and what the auth code does when a variable is absent — is [AUTH.md](AUTH.md)'s.**

## Public same-origin hosting

In this model the Node.js server serves **both** the built SPA (from `client/dist/`) and
the `/api/*` endpoints on a single address (e.g. `https://racearena.example.com`).
Browsers see one origin, so no CORS credentials dance is needed.

### Required environment variables

| Variable            | Example value                   | Why                                                                                                                                                                                                                                                                                            |
| ------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`          | `production`                    | Enables Express production mode (trust-proxy, error sanitisation).                                                                                                                                                                                                                             |
| `RA_SESSION_SECRET` | `<64-char random string>`       | **Required in production.** Signs session cookies; rotating this invalidates all active sessions.                                                                                                                                                                                              |
| `RA_COOKIE_SECURE`  | `true` or `auto`                | Marks the `ra.sid` cookie `Secure` so it is only sent over HTTPS. Use `auto` to let Express infer from the trust-proxy setting; use `true` when you are certain HTTPS is always in use.                                                                                                        |
| `RA_CSRF_STRICT`    | `auto` or `true`                | Rejects mutating API requests that lack an `Origin` header (strict browser enforcement). `auto` enables strict when `NODE_ENV=production`; `true` forces it regardless of `NODE_ENV`.                                                                                                          |
| `RA_PUBLIC_ORIGIN`  | `https://racearena.example.com` | Canonical self-origin for CSRF validation. The CSRF guard compares incoming `Origin` headers against this value instead of deriving it from the `Host` header on each request. Set this whenever the public address differs from the value Express would derive (e.g. behind a reverse proxy). |

### Optional variable

| Variable           | Example value                   | Why                                                                                                                                            |
| ------------------ | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `RA_CLIENT_ORIGIN` | `https://racearena.example.com` | Only needed if the SPA is ever served from a **different** origin than the API (split hosting). In the same-origin model this is not required. |

### Minimal production start

```sh
NODE_ENV=production \
RA_SESSION_SECRET="$(openssl rand -hex 32)" \
RA_COOKIE_SECURE=auto \
RA_CSRF_STRICT=auto \
RA_PUBLIC_ORIGIN=https://racearena.example.com \
node server/src/index.js
```

### Notes

- **Same-origin model**: serve `client/dist/` as static files from the Express server so that
  the SPA and API share one origin. `RA_CLIENT_ORIGIN` is not needed in this configuration.
- **Reverse proxy**: if sitting behind nginx/Caddy, ensure `trust proxy` is honoured
  (`NODE_ENV=production` enables it). Set `RA_COOKIE_SECURE=auto` so Express reads the
  forwarded protocol rather than guessing.
- **Session secret rotation**: changing `RA_SESSION_SECRET` invalidates all existing sessions
  (users are logged out). Plan rotations during maintenance windows.
- **First-run bootstrap**: after the first start, use `RA_BOOTSTRAP_TOKEN` to create the
  initial admin account via `POST /api/auth/setup`. Remove or unset the token afterwards.
