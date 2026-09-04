# AUDIT-TESTS-1 — 17 sabotages, 2 got through, and three of my first five "holes" were my own harness

**Measured 2026-09-04 on master `d6205253`. Every sabotage was reverted and every revert proved by
`git hash-object` before and after; the tree was clean after every batch.** Piece 6 of THE FULL AUDIT.

> **VERDICT ON THIS AXIS: CLEAN, with one hole that matters.**
>
> **17 valid mutations across every area. 15 caught, 2 missed — a 12% escape rate.**
>
> ★ **THE ONE THAT MATTERS: break `closureOf` — the function that decides which guards `verify`
> runs — and on a hull-touching diff the plan silently loses ALL THREE FINGERPRINTS plus
> `check-seed-versions` and `check-tags`. Nothing in the repository fails.** §3.
>
> **The other miss is `RaceScreen`, and it is the confirmed consequence of what piece 5 measured:
> nothing mounts it, so nothing notices when what it renders changes.**
>
> ★ **AND THE HONEST PART: three of my first five "misses" were errors in MY OWN HARNESS** — one
> no-op mutation and two wrong scopes. Reported as the measurement's error bar, because it is the
> exact failure the brief named. §4.
>
> **320 test files, 311 wired, 0 unwired.** Nothing to fix mechanically.

---

## 1. THE INVENTORY

| runner | files | tests | wall clock | wired |
| --- | ---: | ---: | ---: | --- |
| client (vitest, jsdom) | 239 | 4,467 | 286 s | automatic |
| server (vitest) | 31 | 725 | 66 s | automatic |
| scripts (`node:test`) | 41 | 505 | 77 s | automatic |
| e2e (Playwright) | 9 | — | — | **by hand only** |
| **total** | **320** | **5,697** | ~7.2 min | **311 of 320 (97%)** |

**★ ZERO unwired test files.** Every tracked `.test.*` / `.spec.*` falls inside exactly one runner's
selection — measured by differencing the tracked set against the four runners' globs. **The
mechanical fix class this piece was allowed to repair is empty**, which is the right kind of empty.

### Where the time goes

| ms | file |
| ---: | --- |
| 52,990 | `modules/parity/goldenRealArm.test.js` |
| 22,595 | `modules/parity/goldenEquality.test.js` |
| 19,096 | `modules/parity/goldenNegative.test.js` |
| 18,358 | `modules/parity/replay.test.js` |
| 7,502 | `screens/SetupScreen/SetupScreen.test.jsx` |

**The four parity tests are 113 s of the client suite's 286 s — 40% of it in four files**, and they
are the ones that run whole races. That is the cost of the golden-parity guarantee and it is bought
knowingly.

---

## 2. THE SAMPLE — WHAT WAS SABOTAGED

Each mutation changes a value or a comparison a covering test *should* notice. Applied, the covering
tests run, the result recorded, the file reverted, the revert proved.

| | mutation | verdict |
| --- | --- | --- |
| M01 | `rowLayout` — racers-per-row formula 2× → 3× | **CAUGHT** |
| M02 | `configDiff` — a stored value silently ignored | **CAUGHT** |
| M03 | `fieldCap` — open/closed cap swapped | **CAUGHT** |
| M04 | `configValidate` — a rejected key keeps its bad value | **CAUGHT** |
| M05 | `autoSpriteScale` — the readability FLOOR removed | **CAUGHT** |
| M06 | `raceStep` — the row-env multiplier neutralised | **CAUGHT** |
| M07 | `zoomUnit` — corridors→zoom off by 5% | **CAUGHT** |
| M08b | `framingRule` — `corridorGuarantee` renamed away | **CAUGHT** |
| M09 | `racerNames` — unknown set no longer falls back | **CAUGHT** |
| M10 | server — the track-name length limit removed | **CAUGHT** |
| M11b | server auth — **the session-epoch check disabled** | **CAUGHT** |
| M12b | **`routing.closureOf` returns nothing** | ★ **MISSED** |
| M13b | `raceCore` — `FIXED_DT` renamed away | **CAUGHT** |
| M14 | **`RaceScreen` — the background path forced to null** | ★ **MISSED** |
| M16 | `seedRuntime` — seed delivery renamed away | **CAUGHT** |
| M17 | racer registry — a `speedMultiplier` renamed | **CAUGHT** |
| M18 | `storage` — a failed read no longer warns | **CAUGHT** |

**15 caught of 17. Escape rate 12%.** *(M15 was discarded: I aimed it at
`client/src/modules/standings.js`, which does not exist. Counted as invalid, not as a pass.)*

**The one worth calling out among the catches is M11b.** Disabling the session-epoch check —
the mechanism that invalidates old sessions after a password reset — **is caught**, by
`server/src/auth/sessionInvalidation.test.js`, a file that exists for exactly that. Piece 8 inherits
that as a verified fact rather than a claim.

---

## 3. ★ THE HOLE THAT MATTERS — `closureOf`

`scripts/lib/routing.mjs` → `closureOf(relPath)` returns the import closure of a path. It is what
turns a guard's declared `reach` entries into the set of files that select it. **Make it return `[]`
and no test in the repository fails.**

**The consequence is not theoretical — it was measured, twice, in both directions:**

| the diff | guards planned, clean | with `closureOf` broken | |
| --- | ---: | ---: | --- |
| a docs-only diff | 6 | **9** | *gains* three — harmless |
| **a diff touching the engine hull** | **20** | **15** | ★ **loses five** |

**The five lost are `world-fingerprint`, `camera-fingerprint`, `render-fingerprint`,
`check-seed-versions` and `check-tags`.**

So the failure has a direction, and the dangerous direction is the one that matters: **on exactly
the change that most needs the fingerprints — one that can reach the race — they would silently stop
being selected.** `verify` would print `PASS` over a plan that no longer contained them.

**Why nothing catches it.** `verify.test.mjs` does test the *declarations* — its REACH-CONTRACT-1
block proves every path every guard declares resolves on the tree, and it even explains that
"`closureOf` returns [] for a path that does not exist". **It tests the inputs to `closureOf` and
never its output.** The one function whose return value decides what runs is unasserted.

**REPORTED, NOT FIXED.** Closing it means writing a new test, which is building rather than auditing,
and the brief's fix list is mechanical repairs only. **It belongs at the top of the morning sheet.**

### The second miss — `RaceScreen`

Forcing `bgImagePath` to `null` in `RaceScreen/index.jsx` — which would blank every track background
in the game — **passes every test in its own directory and `App.test.jsx`.** That is the direct
consequence of what piece 5 measured: `App.test.jsx` mocks the component to `() => null`, and nothing
else mounts it. **The largest screen in the product has no test that renders it, and this is what
that costs.**

---

## 4. ★ THREE OF MY FIRST FIVE "HOLES" WERE MY OWN HARNESS

The first pass reported five misses. **Three were mine**, and they are recorded because the brief
named this failure and because a mutation report that hides its own error rate is worthless:

| | what I did wrong | corrected result |
| --- | --- | --- |
| **M08** | put `/* MUTANT */` inside a parameter list — **a comment changes nothing**, so nothing could catch it | M08b renamed the export → **CAUGHT** |
| **M11** | scoped to `guards.test.js` and `authRouter.test.js` and **omitted `sessionInvalidation.test.js`**, the file that exists for precisely that behaviour | M11b over the whole `src/auth` → **CAUGHT** |
| **M13** | scoped to three files that do not import `FIXED_DT` | M13b over the importers → **CAUGHT** |

**This is the brief's second named shape from the other side**: *a sabotage that passes for a reason
other than the code being defended.* Two of the three were **a badly chosen scope** and one was **a
mutation with no semantic content** — and both would have been reported as holes by anyone who ran
the harness once and believed it.

**The rule this yields:** a MISS is only a finding once the mutation is shown to have changed
behaviour *and* the scope is shown to contain the test that should care. **Both misses in §3 were
put through that**: `closureOf`'s was proved by diffing the routing plan, and `RaceScreen`'s by
establishing that no test mounts the component at all.

### The other named shape

**"A test that measures a helper rather than what the caller passes it"** was looked for and **not
found in this sample.** M01, M05 and M07 were chosen specifically to have that shape available — a
helper with a caller that could diverge — and all three were caught at the level the caller uses.
**That is 3 of 17 aimed at the shape, which is not a clean bill; it is a small sample reporting what
it saw.**

---

## 5. WHAT THIS PIECE DOES NOT COVER

- **17 mutations against 5,697 tests is a 0.3% sample of the behaviour space.** The 12% escape rate
  is what *this* sample found. It is not an estimate of the true rate and should not be quoted as
  one.
- **"Does this file assert anything no other file asserts?" was NOT measured.** Answering it means
  cross-referencing 5,697 assertions; nothing here does that, and the question is open.
- **The 9 Playwright specs were not exercised at all.** They run by hand, and this audit did not run
  them.
- **No tolerance was changed and no test was deleted**, per the brief. The two holes are reported.
- **Mutation choice is mine and therefore biased.** I picked places I judged important; a mutation
  tool choosing uniformly would produce a different — probably higher — escape rate, because most
  lines in a large file are less load-bearing than the ones I aimed at.
- **Every revert was verified** by comparing `git hash-object` before and after, and `git status` was
  clean after each batch. No sabotage survives in the tree.
