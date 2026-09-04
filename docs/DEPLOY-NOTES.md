# DEPLOY-NOTES.md — what stands between here and one command

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

**What is true.** `client/src/services/api.js:16-18` is the whole of it:

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

**The three real answers, laid out and not chosen:**

| option | what it means | what it costs |
| --- | --- | --- |
| **A · keep it** | one image per public origin, rebuilt per deployment | today's behaviour. The image is not portable and cannot be published for others to run at their own address. |
| **B · make the default RELATIVE** — `API_BASE_URL` becomes `''` so every call is same-origin | the bundle works at whatever address it is served from | the same-origin model SERVE-SPA-1 already moved the project towards. Breaks the split-host arrangement unless `VITE_API_URL` is still honoured when set — which it can be. Touches one file. **The client dev server and the API are on different ports (5173 and 4000) with no Vite proxy**, so development would need either a proxy or the variable set, and that is the real cost. |
| **C · resolve it at RUNTIME** — the server injects its own origin into the served `index.html`, or the client reads a small config endpoint | one image, any address, no rebuild | the most work, and it puts a runtime step where there is currently none. It is the only option that makes the image genuinely portable. |

**NEEDS HIS WORD.** B is the small change and matches where the project already went with SERVE-SPA-1;
C is what "one command, any machine" actually requires. **Nothing here is a recommendation — the
options differ in what he wants the image to BE**, and that is not a question the code can answer.

---

## 3 · The config file that must exist, and what happens without it

**What is true.** `docker-compose.override.yml` is gitignored; the repository ships
`docker-compose.override.yml.example`. A stranger's clone therefore has no override file, and
`docker compose up` starts a correctly-configured server that can do less than the operator expects.

`server/src/startupReadiness.js` exists precisely for this, and its header names the failure: *"Three
separate failures, all from ONE missing file."* It prints, at startup:

- **`RA_BOOTSTRAP_TOKEN` missing** → `POST /api/auth/setup` answers 403 and the install can never be
  signed into. *(`docker-compose.yml` does set a dev value, so compose users are covered; a plain
  `docker run` is not.)*
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
returns **nothing**. `server/src/index.js:16` is `app.listen(PORT, …)` — plain HTTP.

**But the server is TLS-aware and expects to sit behind a terminator:**

- `server/src/app.js:36` — `if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1)`
- `server/src/auth/session.js:23-29` — `resolveCookieSecure` marks the session cookie `Secure` in
  production, overridable with `RA_COOKIE_SECURE=true|false|auto`
- `server/src/auth/session.js:35-43` — the cookie is named `__Host-ra.sid` when `Secure` is
  *guaranteed*, and `RA_COOKIE_NAME_MODE=host` throws rather than issue that name without it

So the intended arrangement is: **a reverse proxy terminates TLS and forwards; the app never sees a
certificate.** That is the ordinary and correct shape, and it is why there is no TLS code to find.

**What is at stake without it.** The sign-in POST carries the password, and the session cookie
carries the session. Over plain HTTP both are readable by anything on the path. **`Secure` cookies
are not sent over HTTP at all**, so an install that sets `NODE_ENV=production` without HTTPS in front
does not merely become insecure — sign-in stops working, because the cookie is issued and never
returned.

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

## What would actually be needed for "one command"

Written as a checklist of decisions, not as a plan:

1. **Hurdle 2 resolved** (option B or C), so one image works at any address. Without this, no.
2. A compose file that includes a TLS-terminating proxy, with the domain as its one variable.
3. The secrets generated rather than copied from an example — `openssl rand` in the compose
   environment, or a `.env` the operator fills in once.
4. A named volume for `RA_DATA_DIR`.
5. Hurdle 1 decided: either the image builds the client (self-contained, slower build) or the
   published image is built by him and pulled rather than built on the VPS.

**With 1 and 5 answered, "one command" is `docker compose up -d` against a published image, plus a
domain pointed at the machine.** Everything between here and there is one design decision and a
proxy.
