# ENVIRONMENT-DOC-1 — every variable, what breaks without it, and where it belongs

**Documents plus one metadata field.** No code, no behaviour, no dependency. `docs/ENVIRONMENT.md` is
new and is reachable from the README, the setup guide and the deployment guide; the `engines` field
the readiness report found missing is in all three `package.json`.

---

## THE FAILURE THIS CLOSES

`docker-compose.yml` says in a comment that `RA_SESSION_SECRET` and `RA_CLIENT_ORIGIN` come from
`docker-compose.override.yml`. **That file is gitignored and does not exist in a fresh clone** — only
`docker-compose.override.yml.example` does.

So a stranger runs `docker compose up`, **it succeeds**, and they get a server with an ephemeral
session secret and CORS switched off. Then two things go wrong that look like nothing to do with
configuration:

- the browser is refused by CORS, which in a browser looks like the server being down;
- `POST /api/auth/setup` answers `403 setup not available`, which reads as "this feature is off"
  rather than "you have not set a variable".

Neither symptom names a variable. Nothing they would read mentioned one either: **the variables
existed only in `DEPLOYMENT.md`**, which someone setting up locally has no reason to open, and in the
example file, which they have no reason to know exists.

---

## WHAT THE LIST WAS DERIVED FROM

Not from memory and not from the existing documents. Every `process.env.X` in `server/`, `client/src`
and `scripts/` was enumerated mechanically, then each one's behaviour was read at its own use site.

**The mechanical scan missed two, and that is worth recording.** `RA_DATA_DIR` and `RA_CLIENT_DIST`
are read as `env.RA_…` through an injected parameter rather than `process.env.…` directly — the
resolver pattern this project uses deliberately, so the value can be overridden in tests. A grep for
`process.env` does not see them. They were found by a second pass for `env.RA_`, and the same pass
turned up `RA_BUILD_COMMIT`, `RA_BUILD_BRANCH` and `RA_BUILD_DIRTY`. **Five of the twenty-one
documented variables are invisible to the obvious search.**

## WHAT IS DOCUMENTED

Twenty-one variables, grouped by what a reader is trying to do, each with **what happens when it is
missing** and **what happens when it is wrong** — because those are different questions and the
second one is usually the one being asked.

The two that can stop the server from booting are named as such: `RA_SESSION_SECRET` under
`NODE_ENV=production`, and `RA_COOKIE_NAME_MODE=host` without `RA_COOKIE_SECURE=true`.

The one whose failure is silent is called out: **`VITE_API_URL` is read when the client is BUILT**,
not when it runs, and defaults to `http://localhost:4000` — so an app served from any other address
without it set calls the *visitor's* machine, and every request fails in a way that looks like the
server being down.

**Where each belongs** is a table of its own: the override file for local Docker, the shell or a unit
file for plain `node`, a secret store for a deployment. And it says plainly that the override file
must be created from the example, because that is the step nothing currently tells anyone to take.

**No value is printed for any secret.** The rule was read as being about secrets: behavioural
defaults (`PORT` is 4000; the login limiter's window is 15 minutes) are stated, because "what happens
if I leave it out" is the question the page exists to answer and a default is the answer. Nothing in
the page can be copy-pasted as a credential.

**The override file was not committed** and is still ignored — confirmed with `git check-ignore`
after the change, not assumed.

## `engines`

`"engines": { "node": ">=20" }` in all three `package.json`. CI has pinned Node 20 for months and
nothing declared it, so a stranger on Node 18 met a runtime failure somewhere inside the first
command rather than an install-time refusal naming the cause. All three files still parse and the
server imports cleanly.

---

## A FINDING FROM THE SCAN, AND IT IS A CORRECTION TO MY OWN PRACTICE TONIGHT

The scan turned up `LOCALAPPDATA` and `TMPDIR` in **`scripts/serve-production.mjs`** — a script I had
not read, which turns out to be the project's sanctioned way to serve a production build, and
`docs/VERIFY-RULES.md` **R10** is the rule behind it:

> An eye test or a perf log the owner takes is served from a **production build**, on port **4173**,
> and nothing else touches that port while the judgement is pending.
> `cd client && npm run build && node ../scripts/serve-production.mjs`

Its header gives the reason, and it is a measured one rather than a preference: `client/dist` sits in
the OneDrive-synced tree, one frame took **1016 ms** when served from there, and `vite preview` both
serves the synced directory *and* holds a file watcher over it — so it is **deliberately not** what
that rule uses. The script copies the build to `%LOCALAPPDATA%` (never synced), replaces it every
run, and serves it without a watcher.

**I have been ending every piece of this chain with `npx vite preview --port 4173`**, which is the
tool R10 specifically rejects. The badge I reported each time was read from the built bundle and is
correct, but the server serving it was the wrong one. **The remaining pieces use
`scripts/serve-production.mjs`**, and the end-of-chain handover will say so rather than let the
earlier line stand unqualified.

---

## CHECKS

**No fingerprint, no browser gate and no client suite.** This piece adds one markdown file, edits
three others, and adds an inert metadata field to three `package.json`. Nothing it touches is read by
the engine, the director or the renderer, so no hash can move — stated rather than checked.

Document guards green, including `check-doc-links` across the four new cross-references and
`check-config-keys` (the `engines` addition moves no config key).

## CONFORMITY

- Every variable the server requires or honours is documented, with missing-behaviour and
  wrong-behaviour separated.
- Reachable from the README — twice: in the first-run section and in the reading list — not only from
  an example file.
- Variables named, no secret values printed anywhere.
- The override file was not committed and is still gitignored.
- `engines` added; all three files still parse.

## PROPOSALS

**P1 — the two invisible-to-grep variables argue for a single declaration.** Five of twenty-one are
read through an injected `env` parameter, so the obvious search misses them, and this page will drift
the first time someone adds another that way. A `server/src/env.js` naming every variable in one
object — read once, injected everywhere — would make the list derivable instead of hand-kept, and a
guard could then check this document against it.

**P2 (mine) — `docker-compose.override.yml.example` should say what it is for in its first line.** It
is currently the only place a local developer meets these variables, and it is reached only by
someone who already knows to look. One line pointing at `ENVIRONMENT.md` costs nothing and closes the
loop from the direction people actually arrive.
