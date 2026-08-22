# CORRIDOR-DIAG-ARMED-1 — the test that could not fail, and the width the game never read

**Date:** 2026-08-22 · **Branch:** `test/corridor-diagnostic-armed` off master `5e6b61ff`
**Piece 2 of NIGHT-2026-08-22.**

---

## §1 — ESTABLISHED AT SOURCE FIRST, as ordered

**The report was right, and it is the only one in the tree.**

```
$ git grep -n "expect(true)\.toBe(true)\|expect(1)\.toBe(1)\|assert\.ok(true)" -- '*.js' '*.jsx' '*.mjs'
client/src/modules/diagnostics/trackCorridor.test.js:61:    expect(true).toBe(true);
```

**In place since 2026-05-06.** `git log -S "expect(true).toBe(true)" --follow` on that path returns
exactly one commit — `d6f4d20e`, _Phase 4: Camera Pacing Tunables + Plan-B Pan + Diagnose-HUD (#75)_.
Three and a half months, not "since May" loosely.

**What the file was.** One `describe`, one `it` named _logs corridorWidthPx and displaySizeScale per
track_, forty lines of `console.log` building a table, and the tautology. Below it, a comment block
recording that `CAMERA-PICTURE-FIXES-1` had already deleted a SECOND describe from this file for
investigating code that no longer exists. **So this file had already been half-cleaned once, and the
half that survived was the half that asserted nothing.**

## §2 — DELETE OR ARM? The question the brief poses, answered with a search

The brief's rule: delete if what it was meant to cover is genuinely covered elsewhere; otherwise
write the assertion it was supposed to make.

**The two units it exercises ARE covered elsewhere, thoroughly:**

| unit | where it is covered | how |
| --- | --- | --- |
| `computeAutoScaleFactor` | `client/src/modules/autoSpriteScale.test.js:49-109` | eleven tests — both clamps, the zero cases, the neutral point, custom bounds |
| `EditorShape.getActualTrackWidth` | `client/src/modules/track-editor/EditorShape.test.js:121-144` | exact values, the floor artifact, determinism across two calls |

**And yet deleting would have cost something real, which is why it was armed instead:**

```
$ git grep -l "seeds/tracks" -- 'client/**'
client/scripts/sweep-bufferPct-driver.mjs      ← a driver script, not a test
client/src/modules/diagnostics/trackCorridor.test.js
```

**NOTHING ELSE IN THE CLIENT SUITE READS THE COMMITTED TRACK GEOMETRIES.** Both tables above test
against SYNTHETIC shapes and bare numbers — correctly, that is what a unit test should do. The
consequence is that **a seed geometry that was corrupted, truncated, or lost its `width` would pass
the entire client suite**, and `computeAutoScaleFactor` answers a zero width with `minScale`, which
is a completely plausible-looking number. The failure would show up as sprites quietly the wrong
size with nothing red anywhere.

**Verdict: ARM.** The units are covered; the real geometries are not, and this file is the only
place in the suite where they meet any code at all.

## §3 — WHAT ARMING IT TURNED UP — the finding, and it is worth more than the test

**The old table computed auto-scale from a width the game does not use.**

It called `shape.getActualTrackWidth()` unconditionally. **Every shipped call site prefers the
STORED width and falls back to the spline estimate only when there isn't one** —
`RaceScreen/index.jsx:429`, `scripts/sim-fairness.mjs:4307`, `scripts/lib/raceDriver.mjs:121` and
`:147`, and thirteen more — **seventeen call sites across sixteen files**, all written as
`geo.width ?? shape.getActualTrackWidth()` and counted with
`git grep -c "width ?? .*getActualTrackWidth()" -- '*.js' '*.jsx' '*.mjs'` (which returns eighteen;
the eighteenth is this test file itself). Two of them carry the same
comment explaining why: the spline estimate measures the median cross-section and **overestimates**.

Measured tonight over all ten committed tracks:

| track | | declared | spline estimate | ratio |
| --- | --- | --- | --- | --- |
| garden-path | closed | 198 | 203 | 1.025 |
| city-circuit | closed | 197 | 206 | 1.046 |
| dirt-oval | closed | 178 | 188 | 1.056 |
| searound | closed | 131 | 145 | 1.107 |
| ice-track | closed | 211 | 238 | 1.128 |
| mountainstreet | open | 300 | 368 | 1.227 |
| river-run | open | 300 | 390 | 1.300 |
| seatrack | open | 300 | 395 | 1.317 |
| luger-hill | open | 250 | 330 | 1.320 |
| space-sprint | open | 300 | 449 | 1.497 |

**Two things to read off it.** First, the shipped comments say the estimate overestimates *for open
tracks*; **it overestimates on all ten**, closed ones by up to 12.8%. The comments are directionally
right and absolutely wrong, and the difference matters to anyone deciding whether the fallback is
safe on a closed track. Second, **the two families do not overlap** — every open track overestimates
by more than every closed one, 1.497 down to 1.227 against 1.128 down to 1.025.

**The separation is recorded here and deliberately NOT asserted.** It is an empirical fact about ten
authored geometries, not a theorem; a new track could land between the families with nothing wrong.
Asserting it would buy a test that has to be re-blessed by whoever adds the eleventh track, which is
how a suite stops being read (R7). **That is the conservative reading, taken at a fork, and said so.**

## §4 — WHAT WAS WRITTEN, AND WHY EACH ONE EARNS ITS PLACE

Four tests, each with its _if deleted / what would go unnoticed_ pair in the file (R7).

| # | the assertion | what goes unnoticed without it |
| --- | --- | --- |
| 1 | every track yields a finite, positive **declared AND measured** width | a corrupt or hand-edited seed passes the whole client suite; `EditorShape` returning NaN or 0 for a real track reads downstream as a zero-width corridor |
| 2 | the spline estimate never falls **below** the declared width | the assumption at `RaceScreen:427` reverses and the `??` fallback silently NARROWS the corridor instead of widening it |
| 3 | auto-scale **never grows as the field grows**, on every real track | an inverted ratio or sign error making a bigger field draw bigger sprites — exactly what the s5/s10/s20 columns existed to let a human check, and nobody had |
| 4 | auto-scale on every real track stays inside the configured clamp | **narrow, and said so in the file rather than oversold** — `autoSpriteScale.test.js` proves both bounds already; this is only where the clamp meets a real width |

**Test 3 is the one that replaces the table.** Its three printed columns existed so a reader could
check that ordering by eye. It is now a property over five field sizes and ten real tracks, asserted
rather than eyeballed, which is what those columns were for.

**Test 2 carries its own caveat in the source**, because it is empirical: _if you added a track and
this went red, the thing to re-read is the assumption at those two call sites — not this test._

## §5 — PROVED ABLE TO FAIL — four sabotages, all red

Each against the real tree; both sabotaged files restored from byte copies, and `git status` after
restoring shows the test file as the only change on the branch.

| sabotage | fired | message |
| --- | --- | --- |
| `ice-track.json` given `width: 0` | **1** | `ice-track: declared width is not positive: expected 0 to be greater than 0` |
| `ice-track.json` given `width: 500` (above its 238 estimate) | **2** | `ice-track (closed): measured 238 < declared 500 — the overestimate assumption at RaceScreen/index.jsx:427 has reversed` |
| `computeAutoScaleFactor`'s density ratio inverted | **3** | `dirt-oval: 40 racers scale 0.774 > 20 racers 0.650 — a larger field draws a LARGER sprite` |
| the `Math.max/Math.min` clamp removed | **4** | `dirt-oval @ 2 racers: 3.869565217391304 above maxScale` |

**Sabotage 1 is worth a note.** It went red on test 1 while test 2 stayed GREEN, because `238 / 0` is
`Infinity`, which is `>= 1`. That is the ordering working: the width test guards the ratio test, and
neither is asked to do the other's job.

---

## VERIFICATION — what ran, what was skipped, and what already determined the answer

**R15 governs.** This change replaces one test file's body. It touches no shipped source.

| instrument | ran? |
| --- | --- |
| client suite | **RAN** — a `client/src` test file changed |
| world / camera / render fingerprints | **NOT RUN, answer already determined.** The only file this branch changes is `*.test.js`. `defaults.js`, the engine closure and the renderer are all untouched. Routing's own skip lines say the same. |
| browser gate, 80-race sheet | **NOT RUN** — R15a and R15c |

**Stated because it looks like an exception and is not:** two files OUTSIDE the test were edited
during §5 — `server/seeds/tracks/ice-track.json` and `client/src/modules/autoSpriteScale.js`. Both
are sabotages, both were restored from byte copies taken beforehand, and `git status` confirms it.
A geometry seed **is** engine-reachable, so had either edit survived, a fingerprint would have been
mandatory. Neither did.

## BUILD VERSUS SPEC — conformity

| the spec asked | what happened |
| --- | --- |
| establish the tautology at source first | done — §1, and the tree-wide search shows it is the only one |
| if covered elsewhere, DELETE and name where the coverage lives | **the units are covered and named (§2) — but the real geometries are not covered anywhere in the client suite, so deleting would have removed the only path that touches them.** Armed instead. The fork and its reason are §2. |
| if not, write the assertion it was supposed to make and prove by sabotage | done — four assertions (§4), four sabotages, all red (§5) |
| client suite only | done — see VERIFICATION |

## SOURCE HYGIENE

| | |
| --- | --- |
| `trackCorridor.test.js` | 85 → 152 lines |
| **removed** | the whole `console.log` table (~25 lines) and the tautology; and the orphaned constants block that documented the describe `CAMERA-PICTURE-FIXES-1` had already deleted |
| **added** | 4 tests with their R7 pairs, and a header saying why the file was armed rather than deleted |
| **extracted** | `MEASURED` — the ten geometries measured once at module load, so a geometry that will not parse fails the file loudly instead of inside one `it()` |
| shipped source changed | **none** |

**Why the table went.** It printed on every suite run, forever, and nobody read it — the proof being
that it had been printing a width the game does not use since May and no one noticed. Each assertion
now carries the offending row in its failure message, which is the only part of a table that was ever
worth having.

**NOTICED BUT LEFT:**

- **The comments at `RaceScreen/index.jsx:427` and `sim-fairness.mjs:4306` are imprecise** — they say
  the estimate overestimates *for open tracks*; it overestimates on all ten. **Not corrected here**:
  they are comments on shipped source in two trees, the correction belongs with whoever next touches
  that line, and this piece is scoped to a test file. Recorded in §3 and on the morning sheet.
- **`client/scripts/sweep-bufferPct-driver.mjs`** also reads `seeds/tracks` and is the only other
  client-tree consumer. Not examined.
- **`scripts/corridor-width-truth.mjs`** measures local width variation against the declared width —
  a different question, and a printer with no assertions of its own. Left alone; it is an instrument,
  not a guard, and instruments are allowed to print.

## PROPOSALS — for the owner, nothing done

1. **Correct the two shipped comments about the overestimate, in the block that next touches either
   line.** They currently name open tracks; the measurement says all ten, with the two families
   cleanly separated (§3). **Value:** anyone reasoning about the fallback on a CLOSED track today
   reads a comment that implies it is exact there, and it is up to 12.8% wide. **Cost:** two comment
   lines in two trees, and `sim-fairness.mjs` is on the sim-parity path so the edit wants the parity
   rule applied even though a comment cannot move a number.
2. **A `width` field on every seed makes the fallback unreachable — check whether it already is.**
   All ten committed geometries carry a declared `width`, so `geo.width ?? getActualTrackWidth()`
   never takes its right arm for a shipped track today. If that holds for every geometry a user can
   author, the fallback is dead code on the shipped path and the overestimate stops mattering
   outside the editor. **Cost:** it needs the editor's save path checked, not just the seeds — a
   user-authored track is where a missing width would come from, and that was not established here.
