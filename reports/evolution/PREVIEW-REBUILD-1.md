# PREVIEW-REBUILD-1 — the preview names a build that can be resolved

**Branch:** `chore/preview-rebuild` off master. **NIGHT-2026-08-23, piece 10 (last).**

The build on 4173 served a pill naming a **deleted branch**, so anything judged against it named a
build nobody could check out. **Rebuilt from master; and a second staleness was found that the brief
did not mention and that the rebuild alone would not have fixed.**

---

## 1. The badge

| | |
| --- | --- |
| **preview (4173)** | **`build eae16783 · master`** — no `+dirty` |
| **API (4000) `/api/health`** | `{"commit":"eae16783","branch":"master","dirty":false}` |
| **dev server (5173)** | `[ra-build] start-up: serving build eae16783 · master` |

**All three agree, and the tree was clean when the bundle was stamped** — `git status --porcelain`
empty, which is why there is no `+dirty` and why the sha is a promise rather than a hint.

---

## 2. Two stalenesses, not one

**THE ONE THE BRIEF NAMED — the client bundle.** The pill is stamped at BUILD time by
`client/vite-plugin-ra-build.js`, which shells to git. A bundle built while a branch was checked out
keeps that branch's name forever, and the branch had since been deleted. **A rebuild is the whole
fix**, and it was: the served bundle now contains `eae16783` and `master`, verified by grepping the
served asset in `C:\Users\weudl\AppData\Local\racearena-preview` rather than the source `dist`.

**THE ONE IT DID NOT — the API process.** `/api/health` was answering

```json
{"status":"ok","timestamp":"…"}
```

with **no `build` object at all**, while `server/src/app.js:44` reads

```js
res.json({ status: 'ok', timestamp: new Date().toISOString(), build: buildIdentity() });
```

**So the source had the field and the running process did not** — the API had been started before
BUILD-FROM-OUTSIDE-1 landed and never restarted. **The backlog's own `verify:` line for that item
(`curl -s localhost:4000/api/health` — "still closed while the payload carries a `build` object")
would have FAILED against the running server while passing against the source.**

**This is the same failure mode the pill has** — a long-lived process holding an identity from
whenever it started — and it is why the fix here was a restart and not only a rebuild. **Two stale
API processes were found and stopped**; one had been resident since well before tonight.

---

## 3. What was done

1. **Freed 4173** — it was held by a `vite preview` process, not by `serve-production.mjs`.
2. **Rebuilt** `client/dist` from master at `eae16783`, clean tree.
3. **Served it with `scripts/serve-production.mjs --port=4173`**, which copies the bundle to
   `%LOCALAPPDATA%\racearena-preview` — **outside the synced tree**, which that script exists to
   guarantee.
4. **Stopped both stale API processes and restarted the API** with `RA_BUILD_COMMIT`,
   `RA_BUILD_BRANCH` and `RA_BUILD_DIRTY` supplied from git, plus `RA_CLIENT_ORIGIN`.
5. **Started the dev server on 5173**, on master, as the brief requires.

**Port discipline held:** 4173 for the preview, 4000 for the API, 5173 for the client. Nothing drifted
to 4174.

---

## 4. Source hygiene

- **No source file changed.** This piece is a rebuild and three process restarts; its only tracked
  content is this report and its INDEX line.
- **Nothing was minted, no default moved, no fingerprint run** — nothing that could change one was
  touched.
- **The identity was verified in the SERVED artefact, not the built one.** `serve-production.mjs`
  copies out of OneDrive, so grepping `client/dist` would have proved the wrong file was correct.
- **Noticed but left alone: the API prints `[auth] Using ephemeral dev session secret — sessions will
  not survive restart. Set RA_SESSION_SECRET to silence this.`** Left because it is the documented dev
  behaviour and setting a secret is a decision about the dev environment, not a rebuild. **Named
  because the restart means any session that existed before tonight is gone**, which is a visible
  consequence of this piece rather than a side effect nobody mentioned.
- **Noticed but left alone: a `dist-sweep` preview server on port 4362.** It belongs to
  `viewer-invariants.mjs`, which builds and serves its own isolated stack — **so it is not a leftover,
  and I said earlier tonight that it looked like one. That was wrong.** It appears when a browser
  sweep runs and is torn down with it.

---

## 5. Build-vs-spec conformity

1. **The brief asked for a rebuild and got a rebuild plus two restarts.** The API restart is outside
   the literal ask, but the piece's purpose — *"so anything he judges next names a build that can be
   resolved"* — is not met by a correct pill sitting beside a health endpoint that cannot name any
   build at all. **Stated rather than folded in silently.**
2. **PIECE 10 IS MARKED "LAST" AND ITS REBUILD RAN EARLIER, out of order.** PIECE 7 needed a current
   production build to reproduce the owner's case in a real browser, so the build was done then and
   **repeated here on the final master** after four more merges landed. **The badge reported above is
   from the second build**, which is the one now being served.
3. **Nothing was judged.** This piece makes a build resolvable; it does not look at a race.

---

## 6. Proposals

**P1 — THE HEALTH ENDPOINT SHOULD BE THE THING THAT CATCHES A STALE SERVER, AND TONIGHT IT WAS THE
THING THAT WAS STALE.** The backlog item that added `build` to `/api/health` carries a `verify:` line
that queries the running server — and that line would have failed all week, because the process
predated the code. **A check that compares `/api/health`'s reported commit against `git rev-parse
HEAD` would catch exactly this**, and it is the only kind of staleness no amount of reading the source
can reveal. **It cannot live in `npm run verify`** (which has no running server), which is probably
why it does not exist — **but it could live in the dev-start path, as one line printed at startup.**

**P2 — TWO API PROCESSES WERE LISTENING AND NOBODY KNEW.** `Get-CimInstance` found two `src/index.js`
processes; only one can hold 4000, so the other was orphaned and invisible. **The same shape as the
`0xC0000142` note already in the backlog: a long-lived process nobody is watching.** A start-up check
that refuses to boot when another instance already holds the port — or simply prints the PID it found
— is cheap, and **the dev-start skill already claims to verify single-instance**, so the gap is that
nothing enforces it outside that path.

**P3 — THE PILL ANSWERS "WHICH COMMIT", AND THE QUESTION THAT ACTUALLY BURNED TONIGHT WAS "HOW OLD IS
THIS PROCESS".** A bundle carries its build sha; a server carries the sha it was handed. **Neither
carries a TIME.** The stale API had been running long enough to predate a merged feature, and nothing
in its output said so. **A start timestamp beside the commit in `/api/health` would have made the
staleness self-evident** instead of requiring a source-versus-runtime comparison to discover. Offered
as an observation about what the identity is missing, not as work.
