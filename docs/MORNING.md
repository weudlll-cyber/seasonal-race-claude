# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-04, after CLOSE-WHAT-THE-AUDIT-FOUND pieces 1, 2 and 3 — three branches,
three merges, master green after each, step 12 done each time, origin holds `master` and nothing else.
**Nothing was minted; no minting permission was given and none was needed.**

---

## ★★ THE TWO OPEN ENDS, ANSWERED FIRST

### 1. Is the router that decides what gets checked now held by a test that provably fires? — **YES**

And the audit's reason for worrying was wrong, which is worth more than the fix.

**`closureOf` was already held.** The audit said `scripts/verify.test.mjs` "tests its INPUTS and
never its OUTPUT". That was checked rather than argued, by breaking the function three ways:

| sabotage of `closureOf` | tests that went red, before this piece |
| --- | --- |
| returns `[]` | **12** |
| returns `[relPath]` — no transitive closure | **6** |
| excludes the entry file from its own closure | **6** |

So the engine-hull case the piece asked for was covered all along, by six existing tests. **Nothing
was restated for it** — a second assertion of a held property is the redundancy this project keeps
deleting.

**What was genuinely unheld is narrower and sharper: the DATA path.** A guard also selects on tracked
paths its own code NAMES but cannot import — the mechanism built after a `server/seeds/` change left
**master red for a day while the merge reported green**. The repair landed; nothing ever asserted the
route it created. Two one-token sabotages of the router deleted that route and **passed all 44
tests**:

- `reached` filtered to `client/` — a track seed loses the world fingerprint, and so does an edit to
  `scripts/sim-fairness.mjs`, which that guard *declares* as its reach
- `dataReach` no longer fed the reach closure — a track seed loses the world fingerprint

**Three tests now close it, and both directions are proved:** the first sabotage goes **0 → 2 red**,
the second **0 → 1 red**, and the total break goes **12 → 14**. The seeds are discovered from
`git ls-files`, so an eleventh track cannot arrive silently unrouted. No new mechanism and no new
guard script — the tests live in `scripts/verify.test.mjs` with the rest of the routing tests.

### 2. Is the client-suite regression real? — **NOT YET MEASURED**

Piece 5 has not run. It is the last open axis in the verdict and the honest answer is still
"286 s against 170 s, on a different day under different load". **Do not read that as a regression
until it has been measured the way the merge-gate margins were.**

---

## WHAT CLOSED SINCE THE AUDIT

**Piece 1 — the router.** Above. `guard(ROUTER-PLAN-1)`.

**Piece 2 — the third copy of the ten tracks.** `fix(TRACK-SEEDS-ONE-HOME-1)`.

`server/src/routes/tracks.js` restated all ten tracks as a literal. It now derives them from
`server/seeds/tracks/`, through a new `readSeedType()` in `server/src/seedRuntime.js`, the module
that already owned the seeds path. **166 lines of literal became 26.** It was not resolved by
correcting values, which would have left the copy and its next drift in place.

★ **The `snail` was never the loaded gun.** Nothing reads `defaultRacerTypeId` there. What *is* read
is `surfaceClasses` and `trackLights`, by two startup migrations that repair a stored record lacking
the field — and **7 of the 32 disagreements were in exactly those two fields**: `dirt-oval` short
three surface classes, `ice-track` short `air`, `garden-path` short `mud` and `sand`, four tracks'
light styles wrong. `surfaceClasses` decides which racer types may run a track. **Inert today and
cannot matter are different claims, and only the first was true.**

Measured 140 comparable values, 32 disagreeing, before. **224 comparable values, 0 disagreeing,
after.** All three fingerprints were run and compared against the record: **world, camera and render
all match.** They could not have moved — no fingerprint harness names or imports anything under
`server/src/`.

★ **The fourth site exists, and the token search would have missed it again.** Every tracked file was
scored by SHAPE — how many of the ten track ids it names, and whether a racer id sits within nine
lines of one. `client/src/test/fixtures/sampleTracks.js` is a fourth literal table of all ten tracks
with `defaultRacerTypeId` and `surfaceClasses`; `city-circuit` says `buggy` where the seed has said
`motorbike` since 2026-06-30. **It is not a loaded gun and was left alone:** it declares itself
test-only, it has one reader, and that reader destructures `{ id }` and nothing else. Every stale
value in it is read by nothing — which makes it **dead weight, piece 4's class, not piece 2's.**

**Piece 3 — the container no longer runs as root.** `harden(CONTAINER-NONROOT-1)`.

`server/Dockerfile` had no `USER`, so a stranger cloning this public repository got a root process.
It now runs as `node` (uid 1000), the unprivileged user the official image already ships.

★ **The interesting half was not `USER node`, it was what that user must own.** Every write site in
`server/src` and `server/utils` was resolved rather than guessed — ten modules, and **every target
lands under `/app/data`**. Nothing writes to `/app`, `/shared`, `client-dist` or `/tmp`. So exactly
one directory changes hands, and `node_modules` stays root-owned and world-readable: the process can
read its dependencies and cannot rewrite them.

**`/app/data` has to be created IN THE IMAGE**, because the root `.dockerignore` deliberately keeps
`server/data/**` out of every layer, so a fresh install mkdirs it at boot — and uid 1000 cannot
mkdir inside a root-owned `/app`. **That line was proved load-bearing by removing it:** the
container then exits 1 with `EACCES … mkdir '/app/data/tracks'` on the seed delivery, the first
write a new install makes. Loud rather than silent, but total.

**Proved both ways it can be run:**

| | standalone, empty named volume | your compose file |
| --- | --- | --- |
| runs as | `uid=1000(node)` | `uid=1000(node)` |
| seeding from empty | **10 tracks, 10 backgrounds, `sessions.sqlite` written** | already seeded |
| a real write | volume created by `node` | probe file written, read and removed **as `node`**, and `better-sqlite3` opened your live `sessions.sqlite` read-write |
| `/api/health` · `/` · `/api/tracks` | **200 · 200 · 401** | **200 · 200 · 401** |

**Your bind mount was never the obstacle** — Docker Desktop presents `./server/data` as `0777`, so
uid 1000 writes it exactly as root did. **Nothing about your setup changed**; the container was
rebuilt and restarted in place and its log is clean.

---

**Piece 4a — the three server advisories are gone.** `deps(DEPS-SERVER-AUDIT-1)`.

`npm audit fix` **moved the lockfile and fixed nothing** — the root is `qs`, and express 4 pins it
out of reach at `~6.15.1`. npm's only remaining advice is express 5, a major bump this does not
take. An `overrides` entry takes `qs` to 6.16.0 — one minor version of one transitive package.
**3 moderate → 0, express stays 4.22.2.**

★ **And the fix could not REACH your running server.** After `docker compose build && up -d` the
image reported `qs 6.16.0` and the **running container reported `qs 6.15.3`** — the vulnerable one —
from a rebuild that reported success. The cause was `- /app/node_modules` in `docker-compose.yml`, an
anonymous volume populated from the image ONCE, two days ago, and remounted on every rebuild since.
Nothing mounts over `/app`, so it was isolating the container from nothing. **That is the
seed-redelivery failure one layer down** — a delivery that silently never arrives while everything
reports success. The line is deleted; your container now reports `qs 6.16.0`.

The build-identity proof is worth knowing: **the byte-identical test as specified cannot be run**,
because the client build stamps `git status --porcelain` as a `dirty` flag, so editing the lockfile
changes the bundle by construction. Held the identity constant instead — same commit, same branch,
an untracked marker keeping `dirty` true in both arms — and **39 of 39 dist files were identical**.
All four fingerprints unmoved.

**Piece 4c — `knip` is REMOVED, not wired, and the measurement is why.** `tools(KNIP-CONFIG-1)`.

The config was a claim nothing honoured. Installing knip and running it showed **the claim was also
wrong**: it reports **37 unused exports in `client/`, and 11 of them are alive** — read by
`scripts/`, including `BOARD_FADE_MS` by the render fingerprint, `FIXED_DT` by the camera
fingerprint, and six symbols by `goldenRunner.mjs`. Acting on that list would have broken the
instruments that watch the picture.

**It cannot be fixed where it lives.** knip ignores entry patterns outside its workspace root, so
`../scripts/**` changed nothing (measured: still 37). A repo-root config sees the workspaces wrong
and reported **99 false "unlisted dependencies"** because `react` lives in `client/package.json`. A
correct config is workspace-aware and is a project, not a mechanical item. **So the configuration is
deleted** — and the honest measurement method is written down in the commit for whoever wants it.

---

**Piece 4b — the dead code is gone, and the audit's figure of 18 was right.** `clean(DEAD-LINES-1)`.

**ESLint: 8 warnings → 0.** Both `CameraDirector.js` lines removed — the unused `pairGuarantee`
import, and `const framing = framingFor(this.state)`, whose call was checked first and is a pure
table lookup (`return FRAMING_BY_STATE[state] ?? …`), so dropping it cannot move anything.

★ **One "unused local" was a 44-line helper, and removing it cascaded.** `trajectory()` in
`cameraSeed.test.js` was never called **by anything, from the commit that introduced it** — and the
file's own closing comment says why: it is the BLIND hand-built fixture where the director rolled
its dice once in 600 frames, so two different seeds gave identical trajectories and the assertion
proved nothing. That test was correctly moved to `scripts/camera-seed-determinism.test.mjs`; the
fixture was left behind, and removing it exposed seven more dead things that existed only to feed
it. All gone, and the file header — which still described the helper as live — now says what the
file actually holds.

**18 exports narrowed, and the number was re-derived rather than trusted.** knip's raw 37 is not it:
11 are alive in `scripts/`, and **two more are reached through a STRING** — `readBuildInfo` and
`gitIdentityPaths` are called as `m.readBuildInfo()` inside a child-process script that
`buildIdentityWorktree.test.js` generates, which no import parser can see. My first checker missed
`gitIdentityPaths` for exactly that reason and a hand check caught it. **37 − 11 − 2 − 6 redundant
defaults = 18.**

**Nothing moved.** verify PASS 17 FAIL 0, and **all four fingerprints were run and compared against
`docs/fingerprints.json` — world, camera, render and world-off all match**. `check-runin-frame` and
`check-ending-frame` green too. (The values are not repeated here; the record is their one home, and
the containment guard caught the first draft of this paragraph for writing them down.)

---

## WHAT IS STILL OPEN IN THIS CHAIN

**Pieces 1 to 4 are all merged.** Two remain, both read-only:

5. **Why the client suite got slower** — this is open end 2 at the top. Not started.
6. **What the audit could not see** — propose-only. Not started.

---

## WHAT ELSE IS OPEN AND NEEDS YOU — by the cost of leaving it

1. **`RaceScreen` has no test that mounts it.** 1,917 lines. Forcing its background path to null —
   which blanks every track in the game — **passes every test.**
2. **`scripts/sim-fairness.mjs`: 6,195 lines, one 2,766-line function, no test.** The largest file in
   the repository and the sim half of the parity rule every fairness verdict rests on.
3. **Two picture questions from earlier today** — should the closing zoom have arrived by the
   crossing, and should the leader's walk survive a battle shot. Both accepted as-is.
4. **`server/src` is documented nowhere** — ten files including the static-file server and four route
   modules, which is exactly the surface the security piece had to audit blind.

---

## SECURITY, IN ONE PARAGRAPH

**Nothing is exploitable today.** Measured against a live isolated server: all seven non-public
routers return **401** unauthenticated — **including the four that did not exist when the auth work
was done**, which inherit the global guard rather than opting in. Path traversal **404s on every
shape tried**. A foreign-origin mutating request gets **403**. The login limiter fires at the tenth
attempt. The cookie is HttpOnly, SameSite=Lax, Secure-in-production, `__Host-` named when Secure is
guaranteed. **No secret has ever been committed** — `users.json` never, no keys or tokens in the
history, and the one `.env.example` held a placeholder and was deleted. Session invalidation was
verified **by sabotage**, not by reading. **The root container is closed** — piece 3 above; the image
runs as `node`, proved standalone and on your compose file.

---

## ★ WHAT NOTHING HOLDS — the honest list

These rot silently because no machine watches them:

1. **prose claims in documents** — the mechanical classes are guarded; a sentence is not
2. **dead exports** — no tool watches them. The `knip` config is gone rather than wired; see piece 4
   for why wiring it would have been worse than nothing
3. **file and function size** — nothing notices growth
4. **dependency advisories** — the daily audit reports, nothing gates. (The container's `USER` is a
   Dockerfile line now, so it cannot silently regress the way an unwritten habit could.)
5. **`surfaceClasses` arrays** — Rule A is scalars-only by its own declaration

**Two entries left this list today.** The routing machinery is held by three tests proved to fire in
both directions. The `tracks.js` literal is not compared to the seeds by a rule — **it is derived
from them, so there is nothing left to compare.** One home beats one guard.

**Everything else looks after itself.** The race cannot move without a fingerprint saying so; a route
cannot join without a role; a report cannot land unindexed; an artwork byte cannot change in silence.

**What will have rotted in a month: documents, and only slowly.** The unguarded shape is the one both
of the audit's findings had: *a term used correctly thirty times and wrongly once.*

---

## ★ WHAT THE AUDIT COULD NOT KNOW

- **Prose has no denominator.** The 0.07% covers paths, symbols, counts, commands and line citations.
- **17 mutations is a 0.3% sample**, and the choice was biased toward load-bearing lines.
- **Dead exports were measured in `client/` only** — ~240 of 479 source files unmeasured.
- **"Does any test assert something no other test asserts?"** was not measured at all.

The third of these is mechanical and is piece 6's job. The first two are piece 6's *proposal* — what
it would cost to close them, so you can decide whether the remaining uncertainty is worth buying.

---

## THE NINE AUDIT PIECES

`reports/audit/` — `AUDIT-SCOPE-1` · `AUDIT-DOCS-1` · `AUDIT-REDUNDANCY-1` · `AUDIT-DEAD-1` ·
`AUDIT-SIZE-1` · `AUDIT-TESTS-1` · `AUDIT-GUARDS-1` · `AUDIT-SECURITY-1` · **`AUDIT-VERDICT-1`**,
which is the one to read if you read only one. **Its headline finding about `closureOf` is corrected
above** — the function was held; the data path was not.

---

## STILL OPEN FROM BEFORE THE AUDIT

Nothing. The five client pictures were deleted on your word, the finish behaviour is recorded beside
the items that object to it, and the gate stayed as it was.
