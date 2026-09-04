# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-04, after THE FULL AUDIT — nine pieces, nine branches, nine merges.
Master green after every one, step 12 done each time, clean tree. Origin holds `master` and nothing
else. **Nothing was minted; no minting permission was given and none was needed.**

---

## ★★ IS IT CLEAN? — YES, AND UNUSUALLY SO

Three weeks ago an audit found things nobody knew about. **This one went looking with better tools
and found almost nothing.** The two real findings are both about the **checking machinery**, not
about the game.

**The number that matters: of 26 guards, 22 were sabotaged and ALL 22 FIRED. Zero are inert.**

| axis | measured | |
| --- | --- | --- |
| documents | **2,789 claims checked, 2 false — 0.07%** | ✅ |
| duplicated facts | **27 census disagreements → 0** | ✅ |
| duplicated logic | **0.37%**, all of it in `scripts/`, none in the product | ✅ |
| dead code | **41 candidates → 0 dead**; ESLint 8 warnings, 0 errors | ✅ |
| tests | **320 files, 311 wired, 0 unwired**; 17 sabotages, 15 caught | ✅ |
| guards | **22 of 26 sabotaged, 22 fired, 0 inert** | ✅ |
| security | **0 exploitable** | ✅ |
| size | **2 oversized things, not 1** | ⚠️ |

★ **`render-fingerprint` was the census's one demonstrably INERT check — the instrument that watches
the picture could not go red. Today a one-pixel shift in a single scoreboard row moves it.** That is
the largest improvement in the project's checking surface, proved by sabotage rather than assumed.

**⚠ AND ONE AXIS IS WORSE, said first:** the client suite takes **286 s against 170 s** three weeks
ago, for 3% more tests. Different day, different machine load — a real confound — but it is the one
number that moved the wrong way.

---

## ★★ THE ONE THING THAT NEEDS YOU

> **Nothing watches the thing that decides what gets watched.**

`scripts/lib/routing.mjs` → `closureOf` decides which guards `verify` runs. **Break it and no test
fails** — but on a diff that touches the engine hull, the plan **silently loses all three
fingerprints**, `check-seed-versions` and `check-tags`. On exactly the change that most needs them,
`verify` prints PASS over a plan that no longer contains them.

`verify.test.mjs` tests the **inputs** to `closureOf` and never its **output**.

**Everything else in this project is held by something proved to fire. This is not, and it sits
upstream of all of it.** Fixing it means writing one test, which is building rather than auditing —
so it was reported, not done.

---

## WHAT ELSE IS OPEN AND NEEDS YOU — by the cost of leaving it

1. **`server/src/routes/tracks.js` holds a stale copy of all ten tracks** — 85 values, **24 wrong**,
   including `garden-path → snail` where the seed says `beetle`. That is **the exact staleness the
   fingerprint instrument was repaired for two days ago, in a second home the repair never reached.**
   **Proved inert today** (every seed carries the fields the startup migrations would fill), but it is
   a loaded gun on the race path and it drifts with every seed edit.
2. **`RaceScreen` has no test that mounts it.** 1,917 lines. Forcing its background path to null —
   which blanks every track in the game — **passes every test.**
3. **`scripts/sim-fairness.mjs`: 6,195 lines, one 2,766-line function, no test.** The largest file in
   the repository and the sim half of the parity rule every fairness verdict rests on.
4. **Two picture questions from earlier today** — should the closing zoom have arrived by the
   crossing, and should the leader's walk survive a battle shot. Both accepted as-is.
5. **`server/src` is documented nowhere** — ten files including the static-file server and four route
   modules, which is exactly the surface the security piece had to audit blind.

---

## ANYBODY COULD FINISH THESE — no decision needed

1. `npm audit fix` in `server/` — **3 moderate advisories that reach the running product**
   (`body-parser`, `qs`, both DoS-shaped, both via express).
2. Add `USER node` to `server/Dockerfile` — **the container runs as root.**
3. Two dead lines in `CameraDirector.js` (an unused import, an unread const) — left alone only
   because that file is the picture.
4. Drop the `export` keyword from 18 symbols used only inside their own file.
5. Five unused locals in test files.
6. Wire `knip` — its config exists, the tool is not a dependency, nothing runs it.

---

## SECURITY, IN ONE PARAGRAPH

**Nothing is exploitable today.** Measured against a live isolated server: all seven non-public
routers return **401** unauthenticated — **including the four that did not exist when the auth work
was done**, which inherit the global guard rather than opting in. Path traversal **404s on every
shape tried**. A foreign-origin mutating request gets **403**. The login limiter fires at the tenth
attempt. The cookie is HttpOnly, SameSite=Lax, Secure-in-production, `__Host-` named when Secure is
guaranteed. **No secret has ever been committed** — `users.json` never, no keys or tokens in the
history, and the one `.env.example` held a placeholder and was deleted. Session invalidation was
verified **by sabotage**, not by reading. The two hardenings are in the list above.

---

## ★ WHAT NOTHING HOLDS — the honest list

These rot silently because no machine watches them:

1. **the routing machinery itself** (above)
2. **the `tracks.js` literal** — no rule compares it to the seeds
3. **prose claims in documents** — the mechanical classes are guarded; a sentence is not
4. **dead exports** — `knip` is configured and unwired
5. **file and function size** — nothing notices growth
6. **container hardening and dependency advisories** — the daily audit reports, nothing gates
7. **`surfaceClasses` arrays** — Rule A is scalars-only by its own declaration

**Everything else looks after itself.** The race cannot move without a fingerprint saying so; a route
cannot join without a role; a report cannot land unindexed; an artwork byte cannot change in silence.
Three of those guards fired unprompted during this audit.

**What will have rotted in a month: documents, and only slowly.** The rate is 0.07% today and was 97
false at a median of 43 days three weeks ago — **the difference is not a guard, it is that somebody
has been checking.** The unguarded shape is the one both of today's findings had: *a term used
correctly thirty times and wrongly once.*

---

## ★ WHAT THIS AUDIT COULD NOT KNOW

- **Prose has no denominator.** The 0.07% covers paths, symbols, counts, commands and line citations.
- **17 mutations is a 0.3% sample**, and my choice was biased toward load-bearing lines.
- **Dead exports were measured in `client/` only** — ~240 of 479 source files unmeasured.
- **"Does any test assert something no other test asserts?"** was not measured at all.
- ★ **Four of my own sabotages, and three of my first five "holes", were errors in my harness** — a
  comment where a mutation should have been, two scopes that omitted the very test written for the
  behaviour, an en-dash for a hyphen, and a truncated read that nearly made me report an honest
  instrument as silent. **All named in their reports.** The corrected results all fired.

---

## THE NINE PIECES

`reports/audit/` — `AUDIT-SCOPE-1` · `AUDIT-DOCS-1` · `AUDIT-REDUNDANCY-1` · `AUDIT-DEAD-1` ·
`AUDIT-SIZE-1` · `AUDIT-TESTS-1` · `AUDIT-GUARDS-1` · `AUDIT-SECURITY-1` · **`AUDIT-VERDICT-1`**,
which is the one to read if you read only one.

---

## STILL OPEN FROM BEFORE THE AUDIT

Nothing. The five client pictures were deleted on your word, the finish behaviour is recorded beside
the items that object to it, and the gate stayed as it was.
