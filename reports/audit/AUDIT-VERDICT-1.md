# AUDIT-VERDICT-1 — is this project clean?

**2026-09-04. Eight pieces, each with its own branch, check and merge. Master green after every one.**

---

## ★★ THE ANSWER

**YES. It is clean — and unusually so.**

Three weeks ago an audit found things nobody knew about. **This one went looking with better tools
and found almost nothing.** The two real findings are both about *the checking machinery*, not about
the game; nothing is exploitable; nothing is dead; nothing is duplicated that matters.

**The single most important number: of 26 guards, 22 were sabotaged and all 22 fired. Zero are
inert.** The checks are real. That is the difference between a project that *has* tests and one that
is *defended*.

**And one axis is measurably worse**, said first because it should be: **the client test suite takes
286 s against the census's 170 s for 3% more tests.** It has a confound — different day, different
machine load — but it is the one number that moved the wrong way.

---

## THE NUMBERS, ALL OF THEM

| axis | measured | verdict |
| --- | --- | --- |
| **Scope** | 2,452 tracked files · **479 source files / 121,137 lines** · 312 test files / 81,032 lines · 36 living docs · 851 reports · 26 guards · 94.5 MB tracked | baseline |
| **Documents** | **2,789 claims checked, 2 false — 0.07%** | ✅ clean |
| **Redundancy (facts)** | 16 groups · 8 guarded and reading zero · **27 census disagreements → 0** | ✅ clean |
| **Redundancy (code)** | **duplicated logic 0.37%** — 279 lines, 6 groups, **all in `scripts/`** | ✅ clean |
| **Dead code** | knip: 41 candidates → **0 dead** · ESLint **8 warnings, 0 errors** | ✅ clean |
| **Size** | 2 oversized things, not 1 | ⚠️ named |
| **Tests** | 320 files · **311 wired, 0 unwired** · 5,697 tests · **17 sabotages, 15 caught (12% escape)** | ✅ clean, 1 hole |
| **Guards** | **22 of 26 sabotaged, 22 fired, 0 inert** — 85% demonstrably load-bearing | ✅ clean |
| **Security** | **0 exploitable** · 2 hardenings · deny-by-default verified live on 7 routers | ✅ clean |

---

## ★ AGAINST THE AUDIT OF THREE WEEKS AGO

**Better, and measurably.** Every comparable axis improved except one.

| | 2026-09-01/02 | today | |
| --- | --- | --- | --- |
| mirrored facts that **disagree** | **27** | **0** | ✅ closed |
| checks that are **demonstrably inert** | **1** (`render-fingerprint`) | **0** | ✅ closed |
| false document claims | **97**, median age **43 days** | **2**, median age **under 3 days** | ✅ |
| dead-code candidates surviving verification | 87 → 8 | 41 → **0** | ✅ |
| test files | 310 | 320 | +10 |
| tests | 5,583 | 5,697 | +114 |
| automatic share | 97% | **97%** | held |
| unwired / inert test files | 0 | **0** | held |
| **client suite wall clock** | **170 s** | **286 s** | ⚠️ **+68%** |

★ **`render-fingerprint` deserves its own line.** Three weeks ago it was the census's one
demonstrably inert check — the instrument that watches the picture *could not go red*. **Today a
one-pixel shift in a single scoreboard row moves it.** That is the largest single improvement in the
project's checking surface, and it was verified by sabotage rather than assumed from a changelog.

---

## WHAT IS CLEAN AND CAN BE LEFT ALONE

- **The documents.** 0.07% false, and the residue is days old rather than months. The four rules that
  guard links, config values, the fairness threshold and paired citations all read zero.
- **The duplicated facts.** The census's headline finding is closed and guarded across 406 mirrors,
  455 files and 69 citations.
- **The dead weight.** Two prior passes took what was removable; this one found the residue is zero.
- **The guards.** 22 of 26 proved load-bearing by sabotage. The fingerprints move when the race, the
  camera or the picture moves, and return exactly on revert.
- **The security surface.** Nothing reachable without a session, no traversal, no foreign origin, no
  secret ever committed. **Leave it alone.**
- **The product code's structure.** No duplicated logic anywhere in `client/src` or `server/src`.

---

## WHAT IS OPEN AND MECHANICAL — anybody could finish these

Ordered by effort. **None of them needs him.**

1. **`npm audit fix` in `server/`** — 3 moderate advisories that reach the running product.
2. **Add `USER node` to `server/Dockerfile`** — the container runs as root.
3. **Remove two dead lines in `CameraDirector.js`** — an unused `pairGuarantee` import and an unread
   `framing` const. Left alone here only because that file is the picture.
4. **Delete the `export` keyword from 18 symbols** used only inside their own file.
5. **Five unused locals in test files** (ESLint warnings).
6. **Wire `knip`** — its config exists, the tool is not a dependency, and nothing runs it.

---

## ★ WHAT IS OPEN AND NEEDS HIM — ordered by the cost of leaving it

### 1. `closureOf` can be broken and nothing notices — **the highest cost**

`scripts/lib/routing.mjs` decides which guards `verify` runs. Make it return nothing and **no test
fails** — but on a diff that touches the engine hull, **the plan silently loses all three
fingerprints**, `check-seed-versions` and `check-tags`. On exactly the change that most needs them,
`verify` would print PASS over a plan that no longer contained them.

**Cost of leaving it:** low probability, catastrophic effect. It is the one place where the checking
machinery is undefended.

### 2. `server/src/routes/tracks.js` holds a stale copy of all ten tracks

85 values, **24 of them wrong** — including `garden-path → snail` where the seed says `beetle`, *the
exact staleness repaired in the fingerprint instrument two days earlier, which had a second home that
repair never reached*. **Proved inert today**, because every seed carries the fields the two startup
migrations would otherwise fill. **It is a loaded gun on the race path**, and it drifts further with
every seed change.

### 3. `RaceScreen` has no test that mounts it

1,917 lines, one importer. Forcing its background path to null — which would blank every track in the
game — **passes every test.** Splitting it or mounting it are both his calls.

### 4. `scripts/sim-fairness.mjs` — 6,195 lines, one 2,766-line function, no test

The largest file in the repository, and it is **the sim half of the parity rule every fairness verdict
rests on.** Touching it moves every number; it cannot be refactored without moving the browser in step.

### 5. Two picture questions, still open from earlier today

Should the closing zoom have arrived by the crossing? Should the leader's walk survive a battle shot?
Both accepted as-is; both would change the ending if revisited.

### 6. `server/src` is documented nowhere

Ten files including the static-file server, the data-path resolver and four route modules. **Exactly
the surface piece 8 had to audit, with no document to check against.**

---

## WHAT CANNOT BE KNOWN BY THIS METHOD

Stated as a limit, not buried.

- **Prose claims are unverifiable.** "About seven seconds", "this is the only place" — the 0.07%
  covers paths, symbols, counts, commands and line citations. **There is no denominator for prose.**
- **17 mutations is a 0.3% sample.** The 12% escape rate is what *this* sample found, and my mutation
  choice was biased toward load-bearing lines. A uniform tool would likely find worse.
- **Dead exports were measured in `client/` only** — roughly **240 of 479 source files** are
  unmeasured for dead exports, because `knip`'s config lives there.
- **"Does any test assert something no other test asserts?"** was not measured at all.
- **The clone detector is a text method.** Two functions doing one job by different means are
  invisible to it.
- **No fuzzing, no XSS sweep of render paths, no image built and probed from inside** this time.
- **Four of my own sabotages, and three of my first five "holes", were errors in my harness.** Each is
  named in its report. **A measurement that hides its own error rate is worth nothing** — and the
  corrected results all fired.

---

## ★★ WHAT WOULD HAVE TO BE TRUE TO KEEP THIS STATE

He wants to stop auditing and go back to building the game. **Here is what actually holds, what does
not, and what will have rotted in a month.**

### What is held by a machine — these axes look after themselves

| axis | what holds it |
| --- | --- |
| **the race, the camera, the picture** | 4 fingerprints + 3 suites — **all proved to fire today** |
| document links, config values, the fairness threshold, paired citations | `check-doc-links`, `check-config-claims`, `check-doc-facts`, Rule F |
| duplicated facts in 8 of 12 groups | Rule A, Rule D, fallback-agreement, fingerprint-containment |
| a new route joining without a role | `routePolicyDrift.test.js` |
| artwork changing silently | the seed-version and digest rules |
| a report landing unindexed | `check-index` |
| a measured number going stale | `check-measured-stamps` |
| a stale generated count | `ceremony-counts`, `engine-reach-doc` |

**These are genuinely self-maintaining.** They fired unprompted three times during this audit alone.

### ★ What NOTHING holds — these rot silently

1. **The routing machinery itself.** Nothing tests `closureOf`'s output. **If this breaks, everything
   in the table above stops being selected and the build still says PASS.**
2. **The `tracks.js` literal.** No rule compares it to the seeds. It is 28% wrong today and will be
   more wrong after the next seed edit.
3. **Prose claims in documents.** The mechanical classes are guarded; a sentence is not.
4. **Dead exports.** `knip` is configured and unwired.
5. **File and function size.** Nothing notices growth.
6. **Container hardening and dependency advisories.** The daily audit reports; nothing gates.
7. **`surfaceClasses` arrays (group A3).** Rule A is scalars-only by its own declaration.

### What will have rotted in a month if nobody looks

**Documents, and only slowly.** The rate is 0.07% today; three weeks ago it was 97 false at a median
of 43 days. **The difference is not a guard — it is that somebody has been checking.** The guarded
classes will stay clean on their own; **the unguarded shape — a term used correctly thirty times and
wrongly once — will accumulate at roughly the rate work happens**, and both of today's two findings
were exactly that shape.

**Everything else will hold.** The race cannot move without a fingerprint saying so. A route cannot
join without a role. A report cannot land unindexed. An artwork byte cannot change in silence.

★ **So the honest answer to "can I go back to building the game?" is YES — with one caveat that fits
in a sentence:**

> **Nothing watches the thing that decides what gets watched.** Everything else in this project is
> held by something that has been proved to fire. `closureOf` is not, and it sits upstream of all of
> it.

**Fix that one, and the state you have is one you can keep without thinking about it.**
