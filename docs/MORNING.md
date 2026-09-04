# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-04, closing the hygiene phase — eight branches, eight merges, master
green after each, step 12 done each time. **Origin holds `master` and nothing else. Nothing was
minted; no minting permission was given and none was needed. Nothing in the picture or the race
moved: every code-touching piece ran all four fingerprints and every one matched the record.**

---

## ★★ THE HYGIENE PHASE IS CLOSED

**The audit is finished, both of its open ends are closed, and the next thing to happen here is the
game.** The durable version of what follows is
[BACKLOG.md → THE HYGIENE PHASE IS CLOSED](BACKLOG.md); this sheet is the 7 a.m. version of it.

### The two open ends, both answered

**1. Is the router that decides what gets checked held by a test that provably fires? — YES, and the
audit's reason for worrying was wrong.** `closureOf` was already held: breaking it turns **12**
existing tests red, non-transitive **6**, entry-excluded **6**. What was genuinely unheld was the
**data path** — the route a track seed takes to the three fingerprints, built after a `server/seeds/`
change left master red for a day while the merge reported green. **Two one-token sabotages deleted
that route and passed all 44 tests.** Three tests now fire on both.

**2. Is the client-suite regression real? — NO.** Six A/B interleaved runs. Master
227.7/228.3/258.8 s against the census tree at 214.8/272.8/222.9 s. ★ **The census tree's slowest run
is slower than every master run** — the arms do not separate. **And neither published figure
reproduces**: 286 s is above every master run, 170 s is below every run of the census's own tree. The
+68% was two single runs under uncontrolled load, and they were **two days apart, not three weeks**.
What difference exists is the ten test files added since, at an unchanged **1.96 s of jsdom per
FILE** — files, not workers, if the suite ever has to get faster. `maxWorkers` untouched.

### The axes the audit found CLEAN

Duplicated facts **27 → 0** · duplicated logic **0.37%**, all in `scripts/`, none in the product ·
dead code · tests **320 files, 0 unwired** · security **0 exploitable** · mechanical document claims
**2,789 checked, 2 false**.

### What is held by a guard that PROVABLY FIRES

**22 of 26 guards were sabotaged and all 22 went red. Zero are inert.** The race cannot move without
a fingerprint saying so, and `render-fingerprint` is no longer the exception — a one-pixel scoreboard
shift moves it. A route cannot join without a role; a report cannot land unindexed; an artwork byte
cannot change without its seed version being raised. **And the router's own output is held now.**

### ★ WHICH AXES NOTHING HOLDS — the sentence that matters most

- **Documents rot, and only a person catches it.** The mechanical classes are guarded; **a sentence
  is not, and cannot be.** Prose has no enumerable population, so there is no denominator. The rate
  is 0.07% today and was 97 false claims at a median of 43 days three weeks ago — **the difference is
  not a guard, it is that somebody has been checking.**
- **File and function growth is watched by nothing.** `sim-fairness.mjs` reached 6,195 lines with a
  2,766-line function and nothing noticed, because nothing is looking.
- **Dependency advisories** are reported daily and gate nothing.
- **`.dockerignore`** — the file that decides what the image contains — is held by no guard.
- **`surfaceClasses` arrays** are outside RULE A, which is scalars-only by its own declaration.

---

## WHAT REMAINS OPEN — by name, no verdict on any of it

**The list exists so nothing has to be remembered.** Whether any of it is worth doing is yours; none
of these carries a recommendation.

1. **`RaceScreen` has no test that mounts it.** 1,917 lines; forcing its background path to `null` —
   which blanks every track in the game — passes everything.
2. **`scripts/sim-fairness.mjs`: 6,195 lines, one 2,766-line function, no test.** **Not product code
   and on no product path** — but a declared `reach` entry of the world fingerprint, so it sits
   inside that instrument's dependency set.
3. **dirt-oval fails gate item 7 at seed 3** — a contender off canvas on 78 frames. **Not accepted
   behaviour**: the accepted finish names the late photo-finish zoom and the battle shot, and this is
   neither. The one real thing a track exclusion still hides.
4. **42 unconsumed exports** in the trees the audit never measured — `scripts/` 37, `server/` 5,
   `shared/` 0. Each needs an individual check first: two `client/` candidates turned out to be
   reached through a string a test generates at runtime.
5. **Gate item 2 measures the finish behaviour you accepted, under a different name**, and
   **luger-hill's exclusion rests on it.**

---

## WHAT THE LAST TWO DAYS ACTUALLY CHANGED

Nine merges, none of them touching the picture or the race.

**The router.** Three tests in `scripts/verify.test.mjs` hold the data path; the seeds are discovered
from `git ls-files`, so an eleventh track cannot arrive silently unrouted.

**The ten tracks have one home.** `server/src/routes/tracks.js` derives them from
`server/seeds/tracks/` instead of restating them — 166 literal lines became 26. ★ **The `snail` was
never the loaded gun**: nothing reads `defaultRacerTypeId` there, and **7 of the 32 disagreements
were in `surfaceClasses` and `trackLights`**, the two fields a live startup migration reads.
`surfaceClasses` decides which racer types may run a track.

**The container.** Runs as `node`. The load-bearing line turned out to be the `mkdir`, not the
`USER`: remove it and a fresh install exits 1 with `EACCES … mkdir '/app/data/tracks'`. Proved
standalone on an empty volume and on your compose file.

**Three server advisories → 0**, via a `qs` override rather than a major bump. ★ **And the fix could
not reach your running container** — compose's anonymous `node_modules` volume had been shadowing the
image since the day it was created, so a rebuild reported success twice while the container kept the
vulnerable version. That line is deleted.

**ESLint 8 → 0, and 18 exports narrowed** — the audit's figure, reached independently: knip's 37,
minus 11 alive in `scripts/`, minus 2 reached through a generated string, minus 6 redundant defaults.

**knip removed, not wired.** Installed and run, it called 37 exports unused and **11 were alive**,
read by the render and camera fingerprints. It cannot be scoped correctly where it lives.

**31 server test files left the image** — **31, not 29**: two are in `server/utils/`, which the
Dockerfile also copies and the original count never looked at. Half of what a recipient received was
tests. Proved by booting with **no source mounts** on an empty volume: seeds itself, 200 · 200 · 401.
The image inventory recommends **removing nothing else**; its two large items are the artwork
(51.6 MB) and the session store's dependency chain (`date-fns` is 27.1 MB and is not a declared
dependency — it arrives through `better-sqlite3-session-store`).

---

## SECURITY, IN ONE PARAGRAPH

**Nothing is exploitable today.** Measured against a live isolated server: all seven non-public
routers return **401** unauthenticated — including the four that did not exist when the auth work was
done, which inherit the global guard rather than opting in. Path traversal **404s on every shape
tried**. A foreign-origin mutating request gets **403**. The login limiter fires at the tenth attempt.
The cookie is HttpOnly, SameSite=Lax, Secure-in-production, `__Host-` named when Secure is
guaranteed. **No secret has ever been committed.** Session invalidation was verified **by sabotage**,
not by reading. **The container no longer runs as root, and no longer ships its own tests.**

---

## ★ WHAT IS STILL NOT KNOWN

- **Prose has no denominator** and cannot be given one by counting. An LLM pass over the 61 living
  documents would produce a confident number with no error bar and no reproducibility.
- **17 mutations is a 0.3% sample.** Priced: **~3.6 h of machine time for 1%**, ~18 h for 5%, with no
  new dependency. ★ Not taken, and the reason is not the machine time: **three of the audit's own
  first five findings were harness errors**, and a bigger sample multiplies that linearly. **A
  570-mutation run nobody audits is a worse number than 17 that were.**
- **"Does any test assert something no other test asserts?"** is unmeasured and is now the largest
  remaining unknown about the estate.
- **The suite timing is one machine, one day, six runs.** Enough to show the arms overlap; not a
  performance baseline.

---

## WHERE THE RECORD IS

`reports/audit/` — the nine audit pieces, **`AUDIT-VERDICT-1`** first. ★ **Two of its headline claims
are corrected**, both by measurement: `closureOf` was held, and the suite figure was two noise
samples. Everything else in it stood up.

`reports/evolution/` — [CLOSE-AUDIT-CHAIN-1](../reports/evolution/CLOSE-AUDIT-CHAIN-1.md) (the suite
measurement and the tree-wide export census) and
[IMAGE-NO-TESTS-1](../reports/evolution/IMAGE-NO-TESTS-1.md) (the image, and everything still in it).
The rest of each piece is its commit message.

---

## STILL OPEN FROM BEFORE THE AUDIT

Nothing. The five client pictures were deleted on your word, the finish behaviour is recorded beside
the items that object to it, and the gate stayed as it was.
