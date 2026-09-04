# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-04, after CLOSE-WHAT-THE-AUDIT-FOUND pieces 1 and 2 — two branches, two
merges, master green after each, step 12 done each time, origin holds `master` and nothing else.
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

---

## WHAT IS STILL OPEN IN THIS CHAIN

3. **The container runs as root** — `server/Dockerfile` has no `USER`. Not started.
4. **The four mechanical items** — `npm audit fix` in `server/`, two dead lines in
   `CameraDirector.js`, 18 needless exports, five unused test locals, and wiring `knip`. Not started.
5. **Why the client suite got slower** — read-only. Not started. This is open end 2 above.
6. **What the audit could not see** — read-only, propose-only. Not started.

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
verified **by sabotage**, not by reading. **The root container is piece 3 and is still open.**

---

## ★ WHAT NOTHING HOLDS — the honest list

These rot silently because no machine watches them:

1. **prose claims in documents** — the mechanical classes are guarded; a sentence is not
2. **dead exports** — `knip` is configured and unwired
3. **file and function size** — nothing notices growth
4. **container hardening and dependency advisories** — the daily audit reports, nothing gates
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
