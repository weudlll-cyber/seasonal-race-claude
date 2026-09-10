# IMAGE-CONTEXT-NARROW-1 / E2E-GEOMETRY-STALE-1 — the two leftovers of last night

Day chain 2026-09-10, piece 1 · branch `night/2026-09-09` · **nothing minted, no fingerprint run and
none needed, what ships in the image proven byte-identical.**

---

# a) THE PACKAGE BUILD'S INVALID FILE REQUEST — FIXED

## ★ THE BRIEF'S FRAMING WAS RIGHT AND THE EARLIER REPORT'S WAS NOT

GUARD-CONTEXT-RACE-1 characterised the failure as *"BuildKit rejects a file inside a `client/dist`
written seconds earlier"* and declined to fix it: *"the remedy touches the image guard's docker
invocation, which is past the smallest fix"*. **It does not touch the guard's invocation, and the
request really was for something that was never there** — 14,142 somethings.

### What was measured, at source, before anything was changed

`server/Dockerfile:68` is the only COPY from the named context:

```
COPY --from=client dist/ ./client-dist/
```

and `scripts/check-image-starts.mjs:206-215` supplies it as `--build-context client=./client`. A
named local context is ingested whole unless it carries its own `.dockerignore`. **There was none.**

| counted 2026-09-10, `find client -type f` | files |
|---|---|
| what the named context had to scan | **14 194** |
| what `server/Dockerfile` actually COPYs (`client/dist`) | **52** |
| of the remainder, `client/node_modules` alone | 13 421 |
| `client/dist-sweep`, `e2e`, `src`, `public`, `playwright-report` | 674 |

**The build was asking for fourteen thousand files to use fifty-two**, on every image build, and that
scan is the window a concurrent `client/dist` rewrite has to land in to produce
`invalid file request dist/assets/racers/beetle.png`.

## THE FIX

`client/.dockerignore` — deny-by-default, re-including `dist/**` only. It touches no guard, no
Dockerfile and no docker invocation. It carries a header saying what it owns and what it deliberately
does not do.

### ★ PROVEN HONOURED, not assumed

A named context's own ignore file being honoured is the whole premise, so it was tested with an
**inline Dockerfile written outside the repository** — nothing in the tree was modified:

| arm | result |
|---|---|
| `client/.dockerignore` present, `COPY --from=client __ignore-probe.txt` | **exit 1** — `"/__ignore-probe.txt": not found` |
| the same, file temporarily moved away | **builds** — `naming to docker.io/library/ra-probe done` |

The probe file was deleted and the ignore file restored.

### ★ THE STOP CONDITION — what ships did NOT change

The brief's stop condition was *"if the fix would change what ships in the image, STOP AND REPORT"*.
It was checked at **byte level**, not by argument:

```
docker run --rm --entrypoint sh <image> -c 'find /app /shared -type f -exec md5sum {} + | sort -k2'
```

| | before | after |
|---|---|---|
| files in the image | **6 013** | **6 013** |
| md5 of every one | — | ★ **identical, zero differing lines** |

That is what the ignore file's own header predicts and it is why the fix is safe: **being allowed
into a context is not being in the image; only a COPY puts a file there, and the COPY is unchanged.**

### AND IT IS FASTER

| | before | after |
|---|---|---|
| `check-image-starts` build (warm) | 7.0 s | **3.8 s** |
| whole guard | 9.2 s | **5.0 s** |

`check-image-starts` **PASSES** after the change — the image starts and `/api/health` is ok.

## ★ WHAT WAS NOT DEMONSTRATED, said plainly

**The original `invalid file request` was NOT reproduced.** GUARD-CONTEXT-RACE-1 records that it
*"appears only under the parallel guard load of a full run"*, and BUILD-RACE-CLOSED-1 records that the
serialisation fix took that cell to 0 of 3. So this removes the **window** the failure needs, and it
removes a 14,142-file request that was waste on every build in its own right. **It is not a
demonstrated repair of an observed rate** — the same honesty GUARD-CONTEXT-RACE-1 applied to its own
fix.

## A STALE CLAIM CORRECTED ON THE WAY

`check-image-starts.mjs` justified declaring `client/` with: *"BuildKit ingests the whole named
context, so `client/` IS what this guard reads."* That was true and is not now. The declaration is
**kept anyway** and the comment now says why: narrowing it to `client/dist/` is what `verify`
REFUSES (the path is gitignored and absent whenever nobody has built), and tying a guard's routing to
an ignore file would be a second place to get one fact wrong. A wrong inclusion costs a build nobody
needed and never costs correctness.

---

# b) THE E2E GEOMETRY FLAKE — REPRODUCED, TWO PREMISES FOUND STALE, NOT FIXED

## ★ REPRODUCED, with the brief's own numbers

Four geometry-dependent specs, `workers: 1`, one run:

```
[tracks] geometry for "luger-hill" could not be cached — Failed to fetch; this track will be REFUSED rather than raced on a guess
[tracks] 7 of 10 track geometries could not be cached — those tracks cannot be raced until the server answers for them
[tracks] 10 of 10 track geometries could not be cached — those tracks cannot be raced until the server answers for them
```

**11 tests, 11 passed, 11.8 minutes.**

### ★ AND THE SHAPE IS NOT WHAT "INTERMITTENT" SUGGESTS

**All twelve warnings carry the same timestamp, 08:37:13 — the only timestamp in the entire log of an
11.8-minute run.** The failures are confined to a single instant at startup. They are not spread
through the run and they are not load-dependent in the way seven-worker-era reports described.

**And the error is `Failed to fetch`, not a timeout.** `trackLoader.js:22` sets
`FETCH_TIMEOUT_MS = 3000` and `:36-39` wraps the fetch in it — a lost timeout race would say so.
`Failed to fetch` is a connection-level failure: the request never got an answer at all.

## ★ TWO PREMISES THE BRIEF INHERITED ARE STALE, established at source

`client/e2e/appReady.js`'s header is where a reader goes to understand this flake, and it described a
tree that no longer exists. Both halves were opened at their lines:

1. **"an open track quick-tested with its geometry dropped runs as a laps race" — NO LONGER TRUE.**
   QUIET-FAILURES-1 wired a readiness flag to the refusal: `selectedGeometryReady`
   (`SetupScreen.jsx:263`) gates `canStartBase` (`:265`) and both start paths (`:720`, `:899`);
   `quickGeometryReady` (`:588`) disables the Quick Test button (`:1786`). The
   `geom ? !geom.closed : false` expressions at `:323` and `:595` are still there and still answer
   `false` for a missing geometry — **but nothing can reach a race through them.** The track is
   refused, and `trackLoader.js:59-64` says so out loud. That `console.warn` is where the brief's
   "could not be cached" line comes from: **the product reporting itself, by design.**
2. **"seven workers doing it at once against ONE API server" — NO LONGER TRUE.**
   `playwright.config.js:63` is `workers: 1` and `:64` is `retries: 0` (E2E-ONE-WORKER-1).

Both corrections are now written into `appReady.js`'s own header, with the reason the helpers are
**kept anyway**: the dependency they remove is a spec depending on WINNING a race, and a 3 s fetch can
still lose on a cold machine whether the suite is seven workers wide or one.

## ★ HAS ANY SPEC EVER PASSED OR FAILED BECAUSE OF IT

**FAILED — yes, and it is on the record.** E2E-FLAKE-1 measured four tests failing exactly 1 of 5 runs
on 2026-08-16, before `appReady.js` existed. That is the flake's cost, already paid.

**PASSED FOR THE WRONG REASON — no spec is exposed today.** Established by an uncapped search of
`client/e2e/*.spec.js`, in two forms (who calls the guard; who touches tracks/geometry at all):

| | specs |
|---|---|
| call `ensureTrackGeometriesCached` | 11 |
| touch tracks or geometry at all | 13 |
| **touch them WITHOUT the guard** | **3** — `b1617-smoke`, `camera-polish-ux-verification`, `fix-list-tracks-world-dimensions` |

All three were opened, and **none depends on a server-served geometry**: each writes its own into
`localStorage` directly (`camera-polish-ux-verification.spec.js:128`,
`fix-list-tracks-world-dimensions.spec.js:73`) or draws one in the Track Editor (`b1617-smoke`). ★ So
the set of specs that could silently run a different race is **empty**, and it is empty by
construction rather than by luck.

## ★ NOT FIXED — the conservative option, and why it was taken

The brief's rule: *fix it if the cause is in the harness; if it is in the PRODUCT, STOP AND REPORT.*

**I could not establish which, and a guess either way is the worse error.** What is established:

- the API's readiness gate (`playwright.config.js:96`) probes `/api/auth/setup-needed`, and Playwright
  waits for it before any test — **so the API was listening**;
- `server/package.json`'s `start` is plain `node src/index.js` — **no watcher, so no restart** to
  explain a connection-level failure;
- yet ten `/api/tracks/:id` fetches failed with `Failed to fetch` in one second, and everything worked
  for the following 11.8 minutes.

A listening server that refuses ten connections in one instant is **not obviously a harness fault**,
and "fixing" the harness — widening the readiness probe, adding a retry — would **mask** it if it is
the API. Under the chain's rule, the conservative option is taken and written down.

**What would settle it, named rather than done:** hit the API on its own port with ten concurrent
`/api/tracks/:id` requests immediately after its readiness URL answers, and see whether the
connection-level failure reproduces without a browser in the picture. If it does, it is a serving
defect and a bigger piece; if it does not, the cause is in the browser/harness boundary and the fix
belongs in the readiness gate.

**Today's risk is bounded and that is why stopping is affordable:** the product refuses rather than
guessing, the guard retries and recovers, no spec is exposed, and 11 of 11 passed.

---

## CHECKS

```
node scripts/engine-reach.mjs --check client/.dockerignore client/e2e/appReady.js scripts/check-image-starts.mjs
```

(line reported verbatim in the commit)

| check | result |
|---|---|
| `check-image-starts` | **PASS**, build 3.8 s, boot 1.2 s |
| image contents | **6 013 files, every md5 identical** before and after |
| e2e, 4 geometry specs | **11 passed** |
| fingerprints | **none run and none needed** — no file this piece touches is in the hull |

## SOURCE HYGIENE

| file | change |
|---|---|
| `client/.dockerignore` | **NEW** — deny-by-default, `!dist/**`, with a header |
| `scripts/check-image-starts.mjs` | a stale justification corrected; the declaration deliberately unchanged |
| `client/e2e/appReady.js` | two stale premises corrected in the header, with why the helpers stay |

**Nothing dead is left behind.** The probe file and both scratch images were deleted; `git status` is
clean apart from the three files above.

**NOTICED AND LEFT, outside this piece:** `client/dist-sweep` (52 files) sits beside `client/dist` and
is not referenced by any COPY. It is excluded by the new ignore file either way; whether it should
exist at all is not this piece's question.

**No record was created by hand. `git stash` was not used.**
