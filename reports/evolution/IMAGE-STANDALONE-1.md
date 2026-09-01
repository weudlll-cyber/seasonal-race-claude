# IMAGE-STANDALONE-1 — the image runs on its own, and the trap was real

**The container now boots, serves the app and gates the API with NO source mounts at all.** That is
the whole point of the piece and it is proven below by running it, not argued.

**The trap was real and it was measured before the context moved.** Without a root `.dockerignore`
the build context would have gone from 55 MB to **~1.3 GB**, carrying `users.json` and
`sessions.sqlite` back into the image — silently undoing IMAGE-NO-CREDENTIALS-1 through a change
about `shared/`.

---

## THE IGNORE FILE CAME FIRST, AND HERE IS WHAT IT PREVENTED

Measured before anything moved:

| context | files | size |
| --- | --- | --- |
| **TODAY** — `./server`, its own `.dockerignore` honoured | 94 | **55.1 MB** |
| **THE TRAP** — repository root, no ignore file | **30,502** | **~1,306 MB** |
| **AFTER** — repository root, with the new root `.dockerignore` | 150 | **58.2 MB** |

*(The trap figure is 603.3 MB of working tree plus 703.4 MB of `.git`.)*

The 603 MB half includes `client/node_modules`, `reports/`, and — the part that matters —
`server/data/`, which holds `users.json`, `users.json.bak-*`, `sessions.sqlite` and
`setup-complete.json`. **A `.dockerignore` is honoured at the CONTEXT ROOT and nowhere else**, so the
moment the context became the repository root, `server/.dockerignore` would have stopped applying
entirely.

**Confirmed by the real build afterwards: `transferring context: 55.02MB`** — the same order as
before the move, not 1.3 GB.

### It is an allow-list, not a deny-list

`**` first, then exactly what the image needs re-included. A deny-list needs a new line every time
something worth protecting is added, and the failure mode of forgetting one is that a secret ships.
Deny-by-default is the same principle the auth layer uses, for the same reason: **the cost of an
omission should be a broken build, not a leak.**

**`server/.dockerignore` was deleted rather than left in place.** An ignore file that is honoured or
not depending on which context somebody builds from is two sources of truth for one fact — the exact
shape this repository keeps paying for. Its reasoning is carried into the root file intact.

---

## WHAT THE IMAGE NEEDS FROM OUTSIDE `server/` — established, not guessed

Every relative specifier in `server/src` and `server/utils` was resolved against its importing file —
**65 of them**. Exactly one escapes:

```
shared/nameLimits.mjs
    imported by server/src/routes/playerGroups.js:32
```

And `shared/` contains that one file, 4,567 bytes. So the Dockerfile copies **that file and no more**:

```dockerfile
COPY shared/nameLimits.mjs /shared/nameLimits.mjs
```

The destination is an absolute path rather than something under `/app` because
`../../../shared/nameLimits.mjs` from `/app/src/routes/` resolves to `/shared/` — outside `WORKDIR`.

---

## THE PROOF: NO SOURCE MOUNTS

Run with **no `src`, no `utils`, no `shared`, no `seeds`** — only a data volume, which a recipient
would also have, and the two secrets any install needs:

```
container: Up 7 seconds
[client] serving the built client from /app/client-dist
RaceArena server running on port 4000

  boots + /api/health            /api/health    -> HTTP 200  JSON
  serves the client at /         /              -> HTTP 200  HTML
  /api/tracks is auth-gated      /api/tracks    -> HTTP 401  JSON
  a deep link returns the app    /setup         -> HTTP 200  HTML

  tracks: 10   backgrounds: 10   users.json: NONE
```

It also **seeded itself from an empty volume** — ten tracks and ten backgrounds — with no accounts
baked in, so a recipient can create their own first admin.

**And nothing sensitive is in the image**, searched rather than reasoned:

```
/app        client-dist  node_modules  package-lock.json  package.json  seeds  src  utils
/shared     nameLimits.mjs
/app/data   No such file or directory
  ABSENT   users.json / sessions.sqlite / setup-complete.json / recover-admin-audit.log
  absent   /app/client  /app/reports  /app/scripts  /app/docs  /app/test
```

### One thing the proof exposed, and it is now fixed

The first standalone run needed `RA_CLIENT_DIST` passed in, because the image's client build lands at
`/app/client-dist` while the code's default resolves to `../../client/dist`. **An image that needs
our compose file to know its own layout is not standalone.** The Dockerfile now declares
`ENV RA_CLIENT_DIST=/app/client-dist`, and the setting was **removed from `docker-compose.yml`** so
there is one home for the fact. A plain `docker run` now serves the app.

---

## WHICH MOUNTS REMAIN, AND WHY EACH ONE

| mount | why it is still there |
| --- | --- |
| `./server/src:/app/src` | **Live development.** `node --watch` picks up source edits without a rebuild. The image contains `src` and runs without this. |
| `./server/utils:/app/utils` | Live development, same reason. Copied into the image since COPY-UTILS-1. |
| `./server/seeds:/app/seeds` | Live development, and **load-bearing for the redelivery mechanism**: COMPOSE-SEEDS-MOUNT-1 established that without it the container reads the last image's `versions.json` and delivery is silently inert. Copied into the image too. |
| `./server/data:/app/data` | **The runtime store.** Never in the image, by design — an operator's accounts belong in a volume. This is the one declared divergence. |
| `/app/node_modules` | Anonymous volume; keeps the container's install isolated from the host's. No host path. |

**`./shared:/shared` is GONE**, and that is the change. It was the one mount the image could not run
without. The cost is stated in the compose file: editing `shared/nameLimits.mjs` now needs
`docker compose build` rather than a restart. One 4.5 KB constants file, against clarity about what
the image contains.

**Every remaining host mount is a development convenience.** None is required for the image to run —
proven above by running it with none of them.

---

## THE GUARD: ONE ENTRY, NOT ZERO, AND HERE IS WHY

The `shared` declaration is **removed**. Its stated reason — "it cannot be copied, it sits above the
build context" — expired exactly as this piece intended, and the entry itself named the only way out.

**The list is not empty, and cannot be:** `server/data` remains declared, mounted-not-copied, and
that divergence is **correct and permanent**. A runtime store belongs in a volume; putting it in a
layer is the defect IMAGE-NO-CREDENTIALS-1 removed. So the guard is green with exactly one entry:

```
check-container-paths: 3 COPYed dir(s), 4 host mount(s), 1 declared divergence(s) (server/data);
0 undeclared.
```

### The guard failed on the tree it shipped with, for the third time

`context: .` left the context string as the literal `"."`, so `"server/src".startsWith("./")` was
false and **every mount was reported as lying outside the build context**. A root context is a
context; the empty string now means the repository root, under which nothing is outside. Its fixture
was rewritten to model the new shape, and a test for the older sub-context form was kept so both
paths stay covered. 13/13.

---

## A DEFECT THIS PIECE FOUND IN MY OWN EARLIER WORK

`npm run verify` failed on `script-suite`, and the cause was not this piece's change:

```
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vitest'
    imported from scripts/check-seed-versions.test.mjs
```

**`script-suite` runs `node --test scripts/*.test.mjs`.** Two test files under `scripts/` were written
against **vitest** — so under the suite they did not fail an assertion, they failed to IMPORT, and
had **never run in the suite that runs guard tests** from the day each landed:

- `scripts/check-container-paths.test.mjs` — since `899691dc` (CONTAINER-PATHS-1)
- `scripts/check-seed-versions.test.mjs` — since `b9dc8102` (SEED-REDELIVERY-1)

Both are mine. Both went green only because I invoked them by hand with `npx vitest run`, **which is
not what CI or `npm run verify` does** — the same shape as the failure GATE-SERIAL-BCRYPT-1 records,
where a merge reported green while master's CI was red.

**Converted to `node:test`, the local idiom: 22 tests that had never run now run**, 13 + 9, all
passing, and `npm run verify` is green: `PASS 7 FAIL 0 SKIP 19`.

---

## CAN A STRANGER NOW INSTALL THIS FROM A CLEAN CLONE WITHOUT ASKING HIM ANYTHING?

**Yes for the container; no for the whole path, and the remainder is one step.**

**What now works unaided:** clone, `cd client && npm install && npm run build`,
`docker compose up -d`, create the first admin, sign in. The image is self-contained, the docs
describe it, and every variable is named in `docs/ENVIRONMENT.md`.

**What still requires something of them, named rather than rounded up:**

1. **They must build the client before building the image.** The image copies a build; it does not
   make one. A `docker compose build` on a clean clone fails on the missing `client/dist` — loudly,
   and the documents say so, but it is a step they must know about. SERVE-SPA-1's P1 (build the
   client in a first stage) would close it.
2. **`docker-compose.override.yml` must be created from the example** for a local run to have a
   session secret and a bootstrap token. Documented in `ENVIRONMENT.md` and `SETUP.md` since
   ENVIRONMENT-DOC-1; still a manual step.
3. **A real deployment needs `VITE_API_URL` set at client build time** if it is served anywhere other
   than `http://localhost:4000`, because the client bakes its API address in.

None of those needs him. All three are documented. **The thing that genuinely required him — an image
that could not run without his repository — is gone.**

---

## CHECKS

**`engine-reach --check` selected nothing**, and since REACH-ADVISORY-1 that answer covers data paths
too, so it is trustworthy here rather than merely familiar.

**`npm run verify` was run and its routing consulted rather than second-guessed.** It selected seven
guards and **SKIPPED all four fingerprints with "nothing changed"** — none of the changed paths is
inside any fingerprint's declared closure. Per this piece's brief the fingerprints were therefore
**not run by hand**, and that is the answer rather than a skipped step: two independent instruments
(the advisory and the routing) agree that nothing here can move a hash. **Nothing was minted; there is
no minting permission.**

```
PASS  check-container-paths · check-hooks-installed · check-language-closed · check-writable
      fingerprint-containment · script-suite · server-suite          PASS 7  FAIL 0  SKIP 19
```

His compose stack was rebuilt on the new context and verified: `/` 200, `/setup` 200, `/api/health`
200, `/api/tracks` 401.

## CONFORMITY

- The root ignore file was written and measured FIRST, before the context moved, carrying the
  runtime-store exclusion across with its reasoning.
- Context size reported before and after; the trap quantified rather than described.
- What the server needs from outside `server/` established by resolving imports — one file — and that
  file and no more is copied.
- Standalone proven with NO source mounts: boots, `/api/health`, serves `/`, 401 on `/api/tracks`.
- Every remaining mount named with its reason; all are development conveniences.
- The `shared` declaration removed; the guard is green with one entry and the reason that entry must
  remain is stated.
- Documents already describe this arrangement; the honest remainder for a stranger is named rather
  than rounded up.

## PROPOSALS

**P1 — build the client inside the image and the last manual step goes.** SERVE-SPA-1 priced this and
declined it; the calculus has changed now that the image is otherwise self-contained, because that
prerequisite is the only thing left between a clean clone and a working container.

**P2 (mine) — nothing checks that a `scripts/*.test.mjs` uses the runner `script-suite` runs.** Two
files sat broken for days apiece and were found by accident. A one-line guard — no file under
`scripts/` may import `vitest` — would have caught both the day they landed, and it is the same shape
as the guards this repository already trusts.
