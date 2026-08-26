# ENGINE-REACH-DATA-FIX-1 — a guard now selects on what its code NAMES, not only on what it imports

**Date:** 2026-08-26 · **Branch:** `fix/engine-reach-data-1` (off `master`) · **Verdict:** BUILT AND
MERGED. The routing widens on 5% of commits and on nothing else.

---

## 1. THE CASE THAT GOT THROUGH, REPLAYED

`ba4a4442` — *"feat(GARDEN-PATH-BEETLE-SKIN-1): garden-path wears the beetle it races"* — one changed
file, `server/seeds/tracks/garden-path.json`. It broke `scripts/track-defaults.test.mjs`, and
**master's CI was red for a day while the merge reported green.**

`scripts/diag/routing-replay.mjs --sha=ba4a4442 --want=script-suite`:

```
  BEFORE — 5 guard(s): check-hooks-installed, check-language-closed, check-writable,
                       fingerprint-containment, server-suite
  AFTER  — 12 guard(s): …, camera-fingerprint, check-ending-frame, check-runin-frame,
                        client-suite, render-fingerprint, script-suite, world-fingerprint
  ADDED  — 7

  script-suite
    selected BEFORE this repair : NO  ← the hole
    selected AFTER  this repair : YES ← closed
    because server/seeds/tracks/garden-path.json
      falls under server/seeds/tracks, which is named by
      scripts/lib/raceDriver.mjs, scripts/track-defaults.test.mjs
```

**The guard that would have caught the break is now selected, and the arbiter states its reason.** The
replay exits 0 only when the guard was NOT selected before and IS selected after, so the demonstration
is a check rather than a paragraph.

**Three fingerprints are selected too.** `world-fingerprint` is the one ENGINE-REACH-DATA-1 was written
about: `scripts/sim-fairness.mjs` is a declared reach entry of that hash and it reads
`server/seeds/tracks`. A track record change could always move it; the arbiter said *"cannot reach the
engine at all"*.

---

## 2. WHAT WAS BUILT

`scripts/lib/dataReach.mjs` — a walk over a guard's own closure that records **every tracked
repository path the guard's code constructs from the repository root**:

```js
join(ROOT, "server", "seeds", "tracks")     join(ROOT, "server/seeds/tracks")
```

`resolveGuard` adds those to the guard's matcher. **The rule is derived: there is no list of data
directories anywhere, and none is declared.** A list would be a second owner of a fact, and a stale
second owner is the defect being repaired here — for the fourth time.

**A suite's entries are derived too.** For `client-suite`, `server-suite` and `script-suite` the
entries are the test files under the `dirs` each already declares. Nothing new is declared and no
list can fall off.

### FOUR NARROWINGS, EACH FORCED BY A MEASUREMENT

The first version was the "run everything" the brief forbids. Each narrowing below was made because a
number said so, not because it read better.

| # | the first version | what it cost, measured | the narrowing |
| --- | --- | --- | --- |
| 1 | expand `join(<any ident>, …)` | `script-suite` on **27 of 40 commits**, almost all documentation | only identifiers bound to `import.meta.url` — guard tests build fixture trees in `mkdtempSync` and write `join(root, "docs")` |
| 2 | one-hop binding detection | **the world fingerprint silently dropped** — the case the piece exists for | follow the binding as a FIXPOINT; `sim-fairness.mjs` reaches `ROOT` in three hops |
| 3 | match bare path-shaped strings | **17 of 40 commits** | drop them; they are fixture keys (`{"reports/evolution/INDEX.md": "# Index…"}`) and function arguments (`isDocPath("…")`), not reads |
| 4 | admit any named path | guards selecting on **all of `client/src/modules`** | admit only what an import closure CANNOT reach — a path holding no importable module |

**Narrowing 4 was caught by the repository's own test**, not by me: `verify.test.mjs` asserts that a
non-hull client file *"must not select the guard"*, and it went red. That assertion exists precisely
to stop a guard becoming one that runs on everything, and it did its job against my change.

### DYNAMIC IMPORTS ARE EDGES

`render-fingerprint.mjs:160` depends on `racerNames.js` — whose contents are hashed into the physics
through `stablePairBit` — through `await import(u("client/src/modules/racerNames.js"))`. The static
walk matches `from "…"` only, so it never saw it. **`engine-reach.mjs`'s own `hasDynamicImport` already
flagged that file, and nothing acted on the flag.**

Those specifiers are now admitted and followed. That is what puts `racerNames.js` and
`racer-types/index.js` into the fingerprints' routing.

---

## 3. THE COST — measured over real commits, not estimated

`scripts/diag/routing-cost.mjs` replays each commit's real file list through the routing twice, with
the extension and without.

| window | commits whose selection CHANGES | added wall clock | mean per commit |
| --- | --- | --- | --- |
| last 40 | **1 (2.5%)** — and it is `ba4a4442` itself | 603 s | 15.1 s |
| last 120 | **6 (5.0%)** | 1,356 s | **11.3 s** |

ENGINE-REACH-DATA-1 predicted *"3.4% of commits, about 7 a month"* from commit counts alone. Measured
independently, by replaying the routing: **5.0%.**

**The six commits that change, and why each is right:**

| commit | trigger | newly selected |
| --- | --- | --- |
| `ba4a4442` | `server/seeds/tracks/garden-path.json` | 7 guards — **the historical failure** |
| `d73ec6a9` | `docs/fingerprints.json` | 6 — the record the fingerprints compare against |
| `b3e3cd49` | `client/src/modules/camera/CameraDirector.js` | `engine-reach-doc`, `script-suite` |
| `53e09ecc` | `docs/CAMERA_DIRECTOR.md` | `script-suite` |
| `287219c4` | `docs/SIM.md` | `script-suite` |
| `b49bf4a5` | `client/src/modules/exportRaceConfig.js` | `script-suite` |

**None of them is noise**: each names a file a guard's code reads. **95% of commits are unaffected**,
which is the difference between buying coverage and paying for it.

**One option was measured and REFUSED at its price.** Recording every file reachable *through* a
dynamic import — the transitive case — took `script-suite` from 8 added entries to **109** and
`check-ending-frame` to **88**. That is "run everything on every change" arriving by a side door, so
it was reverted and is reported as open in §6 rather than bought.

---

## 4. (b) WHAT ELSE SHIPS AS DATA — checked, with the misses named

Every case probed by asking the resolved routing directly, not by reading code.

| path | fingerprints selecting it | suites | verdict |
| --- | --- | --- | --- |
| **`server/seeds/tracks/*.json`** | **camera, render, world** | client, script, server | **CLOSED** — the case that got through |
| **`client/src/modules/racerNames.js`** | **render** | client, script | **CLOSED for render**; see below |
| **`client/src/modules/racer-types/index.js`** | **camera, render** | client, script | **CLOSED at the entry point** |
| `client/src/modules/racer-types/beetle.js` | none | client | **STILL OPEN** — §6 |
| `server/seeds/player-groups/` | none | server | data, but no guard's code names it |
| `server/seeds/brands/` | none | server | same |
| `server/seeds/backgrounds/` | none | server | same |

**A CORRECTION TO ENGINE-REACH-DATA-1, from checking rather than assuming.** That report implied the
world fingerprint should select on `racerNames.js` because names are physics. **It should not.**
`sim-fairness.mjs` takes its roster from an environment variable — `const RACER_NAMES = _rn ? _rn.split(",") : null`
(`:813`) — and never reads `racerNames.js`. So that file genuinely cannot move the world hash, and the
routing is right to leave it out. **It CAN move the render fingerprint, which does import it, and that
is now routed.**

**The three `server/seeds/` trees that gain nothing are not an oversight.** No guard's code names
them, so by this piece's own rule there is nothing to add — and `server-suite` already covers them
because it routes on `server/`. If a future guard reads them, it will be routed the moment it says
their name.

---

## 5. VERIFICATION

**`npm run verify` exits 0**, run directly and never behind a pipe. `PASS 5 · FAIL 0 · SKIP 19`,
wall clock **50.6 s**.

**What routing selected for THIS change, and what it did not:** `script-suite` (4 changed files under
`scripts/`), plus the always-on guards. **No fingerprint ran, and none should have** — the changed
files are `scripts/lib/dataReach.mjs`, `scripts/lib/routing.mjs` and two diagnostics; none is in any
fingerprint's closure and none is engine data. Their reasons all read `nothing changed`. **No
fingerprint moved and none was minted.**

**Does the repaired arbiter select something the old one skipped, on this very branch?** No — and that
is the correct answer, not a disappointment. This branch changes tooling, and the extension adds
paths only where a guard's code names one. **The repaired arbiter's effect on itself is nil, which is
what a targeted repair should look like.** Its effect on the commit that got through is §1.

**The suite arrangement from GATE-SERIAL-BCRYPT-1 is unchanged.** `server-suite` was not selected here
(nothing under `server/` changed), so this piece neither alters what verify selects for a server change
nor moves the 37.7 s that piece measured. **Nothing in this branch touches the suite's configuration.**

**44 of 44 `verify.test.mjs` tests pass**, including the two that exist to stop a guard becoming one
that runs on everything — one of which caught narrowing 4.

---

## 6. WHAT IS STILL OPEN

- **The transitive dynamic case.** `racer-types/beetle.js` is imported by `racer-types/index.js`,
  which the fingerprints import dynamically. The entry point is routed; the individual racer
  definitions are not. **Closing it was measured at 109 added entries for `script-suite`** and refused.
  A narrower form — follow dynamic edges but record only non-importable leaves, or declare the racer
  registry as a reach entry — is proposal A.
- **A lexical rule cannot tell a READ from a WRITE.** A guard that names its own output path selects
  on it. That is the safe direction and it is why `world-fingerprint` selects on
  `docs/fingerprints.json`, which is correct anyway.
- **`join(ROOT, someVariable)` is invisible.** Only literal segments are reconstructed. A guard that
  computes a data path at runtime is not covered, and nothing warns about it.
- **This module names its own examples.** `dataReach.mjs`'s header contains
  `join(ROOT, "server/seeds/tracks")` as documentation, so it appears in its own `from` list. Harmless
  — it changes no selection, only lengthens an explanation — but it is a lexical rule reading a
  comment, and worth knowing before someone trusts that list as evidence.

---

## 7. SOURCE HYGIENE

**Every number in §3 is re-runnable**: `node scripts/diag/routing-cost.mjs --commits=120` and
`node scripts/diag/routing-replay.mjs --sha=ba4a4442 --want=script-suite`. Both change nothing and run
no guard; `routing-cost` uses a fixed table of measured guard durations, written out in the file so
the arithmetic is visible rather than hidden.

**The four narrowings in §2 are each recorded in `dataReach.mjs` beside the code that implements
them**, with the number that forced them — so the next reader sees why the rule is narrow and does not
widen it back.

**Nothing was declared by hand.** No list of data directories, no per-guard data declaration. The two
diagnostics are new files; `routing.mjs` gained a derivation and a printed reason; no guard's
declaration was edited.

**What was NOT run, and why (R15):** no fingerprints — nothing in this branch is in any fingerprint's
closure or is engine data, which the routing itself reports as `nothing changed`. No client suite, no
server suite, no browser gate: no file under `client/` or `server/` was touched.

---

## 8. CONFORMITY — build vs spec

| the brief asked | delivered |
| --- | --- |
| (a) make the arbiter answer the question it is asked; build the smallest change the report named, or say why you departed | §2 — built, **and the shape departs**: the report proposed `reachData` globs on one declaration; that is a hand-kept list, which the same paragraph forbids. **Derived from what the code names instead.** |
| the rule must be DERIVED, not a hand-kept list | §2 — no list exists; suite entries derive from the `dirs` already declared |
| if ships-as-data cannot be derived, say so and propose rather than enumerate | Not needed — it is derivable, and §2 shows how |
| (b) cover the three known cases and establish whether there are others | §4 — tracks CLOSED, name sets CLOSED for the fingerprint that reads them, racer types CLOSED at the entry point; four further seed trees checked and ruled out with the reason |
| (c) the proof is the case that got through | §1 — `ba4a4442` replayed, exit-coded, with the arbiter's own reason |
| do not widen to "run everything on every change" | §3 — **95% of commits unaffected**; the transitive option was measured at 109 added entries and refused |
| report what the change costs in wall clock across recent commits | §3 — 5.0% of 120 commits, mean +11.3 s |
| `npm run verify && git merge`, directly, never behind a pipe | §5 — exit 0 |
| say whether your change alters what verify selects, and report the new wall clock beside 37.7 s | §5 — it does not alter the server-suite arrangement; verify's own wall clock 50.6 s |
| fingerprints: let routing decide, state what it selected and whether the repaired arbiter selects something the old one skipped | §5 — none selected, none moved, and the honest answer for this branch is "no, correctly" |
| report + INDEX in the same commit, PROPOSALS with ≥2 of your own | this file; §9 has four, three of them mine |

**The one departure, stated plainly:** ENGINE-REACH-DATA-1 proposed adding a `reachData` glob list to
`fingerprint-default.mjs`'s declaration. **I did not build that.** Its own paragraph admitted the
weakness — *"it is honest about being a LIST … so it can go stale"* — and this brief forbids a
hand-kept list in the next sentence. The two could not both be satisfied, so the rule derives the
paths from the code that names them. **It also reaches further than the proposal would have:** the
`reachData` list was scoped to the fingerprint declaration and would not have selected `script-suite`,
which is the guard that actually catches the historical failure.

---

## 9. PROPOSALS — none ordered

### A — MINE: close the transitive dynamic case with a narrower rule

`racer-types/*.js` beyond `index.js` is still unrouted (§6). **Cost of the blunt form: measured, 109
added entries for `script-suite`.** Two narrower shapes worth measuring: follow dynamic edges but
record only leaves an import closure cannot otherwise reach; or declare the racer registry as a reach
entry on the fingerprints that use it, which is the existing mechanism and one line.

### B — MINE: make `hasDynamicImport` loud instead of informational

`engine-reach.mjs` already detects dynamic imports and already flagged `render-fingerprint.mjs` —
**the exact file whose dynamic dependency on `racerNames.js` was invisible for months.** The flag is
computed, returned, and acted on by nothing.

**Cost: a decision about what "loud" means** — failing the gate on a new dynamic import in a hull file
is strict, reporting it in the routing line is cheap. **What it buys:** the next blind spot of this
shape announces itself rather than waiting for a red master. This is the same lesson as
HARNESS-LOUD-ZERO-1, in the arbiter.

### C — MINE: a guard should be able to say what data it READS

The lexical rule cannot distinguish a read from a write, or see a computed path (§6). A guard that
declared `reads: [...]` would be exact — **and would be the hand-kept list this brief forbids.** The
honest resolution is not to add the list but to keep the derivation and **record its limits where they
will be read**, which §6 does. Named here so the idea is refused with a reason rather than proposed
again in three weeks.

### D — the routing hole is now closed; the FOUR-COSTUME pattern is not

NIGHT-2026-08-25 found the same defect four times: a guarantee with more than one owner, where the
stale copy is the one being read. **This piece removes one more owner** — the routing no longer
depends on anyone remembering that a test reads a data file. **The pattern itself deserves a standing
check**, and there is no proposal here for one because I do not know a cheap shape for it. Recorded so
the count is visible: four found, four repaired individually, none prevented generically.

---

## WHAT OUTLIVES THIS REPORT

**The repair was easy; keeping it from becoming "run everything" was the work.** Four separate
narrowings, each forced by a measurement, took the widening from 27 commits in 40 down to 1 — and the
repository's own test caught the worst of them before I did. **A routing rule that is too generous is
not a safer routing rule; it is a routing rule nobody reads**, which is how a check stops being a
check.

**And the arbiter now states its reason.** The verdict that let a red master through was
*"cannot reach the engine at all"* — a sentence with no way to be wrong out loud. A guard that selects
now says which path it named and which file named it. **The next time this goes stale, it will say so.**
