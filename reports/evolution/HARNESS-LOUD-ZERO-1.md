# HARNESS-LOUD-ZERO-1 — the driver knows why it stopped and has never been able to say so

**Date:** 2026-08-26 · **Branch:** `diag/harness-loud-zero-1` (off `master`) · **Piece 2 of
NIGHT-2026-08-25** · **Verdict:** DESIGN ONLY. Nothing built, no harness changed, no rule added.

**Lesson 187, in `check-config-claims.mjs:56`:** *"zero keys extracted, zero documents scanned, or an
unreadable `defaults.js` all FAIL. A guard that passes because it found nothing to check is a no-op."*
**That rule was written for the guards and has never reached the harnesses.** This is the design for
extending it, with its cost measured rather than assumed — and with one finding that changes what the
cost is.

---

## 1. WHICH HARNESSES SHARE THE DRIVER

`scripts/lib/raceDriver.mjs` is imported by **56 files** and **44 of them call `runRace`**. That is
the funnel: every camera measurement this project has taken since ONE-DRIVER-1 passes through one
loop.

**The driver already knows everything needed to be loud. It cannot say any of it.**

`runRace` (`:303`) ends on **three different conditions that produce one indistinguishable return**:

```js
while (st.finishedCount < identity.racers && ts - raceStart < 200000) { … }
…
return { frames: frame, endTs: ts };            // :355
```

1. **every racer finished** — the race is complete;
2. **the 200 s wall-clock ceiling** — the race was cut off mid-flight;
3. **the callback returned `false`** — the harness asked to stop early, deliberately.

`{ frames, endTs }` distinguishes none of them. A cell cut off at 200 s and a cell that ran to a
proper finish return the same shape, and the caller has no way to tell.

**And it would not matter if it could, because nobody reads it:**

| | count |
| --- | --- |
| files importing the driver | 56 |
| files calling `runRace` | **44** |
| files **capturing `runRace`'s return value** | **1** — and it is `raceDriver.test.mjs`, the driver's own test |

**Forty-three of forty-four harnesses discard the only signal the driver emits.** Any design that
works by adding fields to that return is dead on arrival.

---

## 2. WHAT EACH REPORTS WHEN A CELL YIELDS NOTHING — measured, not sampled

| behaviour, across the 44 `runRace` callers | files |
| --- | --- |
| have **any** failure path at all (`throw`, `process.exit(1)`, `exitCode = 1`) | **6** |
| **cannot fail for any reason** | **38** |
| contain a `continue;` that skips a cell | 26 |
| contain a `return null` for an unusable race | 8 |
| filter frames on race state, so an empty cell is possible with a perfectly healthy race | **21** |
| stop early on purpose via `return false` from the callback | **7** |

**Thirty-eight of forty-four harnesses have no way to fail.** The uniform idiom is to skip the cell
and print a count of what survived — `measured N race(s)`, `races N` — **with nothing anywhere
comparing N to the number of races requested.** Three examples from this month's own work, all mine or
adjacent:

- `level-step-when.mjs:57` — `if (series.length < 3) continue;` then prints `measured ${rows.length} race(s)`.
- `level-set-built.mjs` — `if (!ranked.length || !snaps.length) return null;` then prints
  `races ${results.filter((r) => r.acc).length}`.
- `chance-set.mjs` (written last night for RUNIN-CHANCE-SET-1) — the same shape again, independently.

**Three harnesses, three authors, one silent idiom, none of them comparing produced against
requested.** The brief's *"three sweeps rediscovered the same silent zero as an unexplained empty
file"* is that idiom, three times.

---

## 3. THE CANONICAL INSTANCE NO LONGER REPRODUCES — and that is the finding

GARDEN-PATH-NO-FINISH-1 is the case this piece exists for: *"the harness gives up 200 seconds into a
212-second race"*, **360 of 360 races across three sweeps silently discarded.**

**Measured tonight on master, it completes.**

| track | seed | frames | finished | run-in frames | outcome |
| --- | --- | --- | --- | --- | --- |
| garden-path | 1 | 5,473 | **20/20** | 356 | completed |
| garden-path | 46 | 5,272 | **20/20** | 381 | completed |
| river-run | 1 | 4,407 | 20/20 | 327 | completed |
| river-run | 46 | 4,497 | 20/20 | 342 | completed |

And in RUNIN-CHANCE-SET-1's sweep last night, **all 120 garden-path cells produced full data** (mean
412–418 run-in frames), indistinguishable from any other track.

**Why it changed, established rather than guessed.** garden-path is a **closed** track, so the driver
gives it `laps: 2` (`raceDriver.mjs:185`) and always did — the lap count is hardcoded and did not move.
What moved is the racer: both `server/data/tracks` and `server/seeds/tracks` now carry
`defaultRacerTypeId: beetle`, `defaultLaps: 2`, where the record used to resolve to **snail at four
laps**. **A beetle covers two laps inside 200 s; a snail did not.**

**So the silence was never fixed. The symptom moved out from under it.** GARDEN-PATH-DEFAULTS-1
changed a track for reasons that had nothing to do with the harness, and incidentally healed a
360-race blind spot that three sweeps had walked into. **If that default is ever reverted — and
TRACK-DEFAULTS-REACH-1 shows the delivery of track defaults is itself unresolved — the 360 silent
discards come straight back, with nothing in the tree any louder than it was.**

**This also corrects a standing note.** The memory of garden-path as a permanent silent zero, and my
own statement earlier in this night's chain that it *"contributes nothing"*, are both now wrong.
Reaching the endgame window and finishing every racer are different predicates, and garden-path
satisfies both today.

---

## 4. THE SMALLEST HONEST CHANGE

**The rule cannot live in the harnesses.** Thirty-eight of forty-four cannot fail, forty-three of
forty-four discard the driver's return, and the idiom regenerates itself — three independent authors
wrote it this month. **A rule those files must opt into is a rule that will be missing from the
forty-fifth harness.**

**So it lives in `runRace`, and it is loud by default.**

### The change, in three parts

**(1) `runRace` records why it stopped.** One local, set at each of the three exits:

```
stoppedBy: 'finished' | 'ceiling' | 'callback'
```

**(2) `runRace` THROWS on `'ceiling'` unless the caller declared it acceptable.** A new hook,
defaulting to off:

```
runRace(race, identity, cfg, onFrame, { allowUnfinished: true })
```

The error names the cell — track, racers, seed, `finishedCount`/`requestedRacers`, elapsed — so the
message is the diagnosis. **This is the Lesson 187 shape exactly:** the failure is the default, and
tolerating it requires saying so at the call site where a reader will see it.

**(3) A cell that produced nothing is the harness's own assertion, and the driver gives it the one
fact it needs.** `runRace` already counts frames; it also returns `accepted`, the number of frames on
which the callback did any work. A harness filtering on race state (21 of 44 do) can then write one
line — `assertProductive(result, cell)` — instead of a silent `continue`.

**Why (2) is default-loud and (3) is not.** A race cut off by the ceiling is **always** a defect: the
harness asked for a race and got a truncated one. A cell with zero rows may be entirely correct — a
race with no lead change genuinely has no lead-change frames. **The driver can be certain about the
first and cannot be certain about the second**, so it fails on the first and merely reports the second.

### Where it lives — ONE home

`scripts/lib/raceDriver.mjs`. It is already the single definition of how a measured race runs, and its
own header states the principle: *"One driver, so four scripts cannot drift apart while their numbers
are read side by side."* **The loudness belongs to the same object as the identity, for the same
reason.** Nothing is added to 44 files.

---

## 5. WHAT IT WOULD HAVE COST IN NOISE ON THE SWEEPS ALREADY RUN

Costed against real sweeps rather than estimated.

| sweep | cells | cells that would THROW under part (2) | verdict |
| --- | --- | --- | --- |
| RUNIN-CHANCE-SET-1, last night, master | **1,140** | **0** | **no noise at all** |
| the same sweep, had it run before 2026-08-25 | 1,140 | **120** (every garden-path cell) | **not noise — the defect** |
| the three sweeps in GARDEN-PATH-NO-FINISH-1 | — | **360** | **not noise — the defect, and it went unreported for three sweeps** |

**On today's master the rule is free.** Every one of 1,140 cells completes; the loud default would
have fired zero times and cost nothing but the line that declares it.

**The 7 harnesses that stop early on purpose are not affected**, because `'callback'` is a distinct
stop reason from `'ceiling'` and only the latter throws. That distinction is the whole reason for
recording three reasons instead of a boolean.

**The honest residual noise is part (3), not part (2).** Twenty-one harnesses filter frames on race
state, so any of them can legitimately produce an empty cell. That is why part (3) reports and does
not throw — **and it means part (3) buys much less than part (2)**, which should be said plainly
before anyone builds both.

---

## 6. WHAT IT CANNOT CATCH

Stated here rather than discovered later, in the same spirit as `check-config-claims.mjs`'s own list.

- **A cell that produces plausible but wrong numbers.** Loudness is about absence. A harness measuring
  the wrong quantity confidently is untouched — which is precisely what HARNESS-CAMERA-SEED-1
  (PIECE 4) is about: those cells are full, not empty.
- **A sweep that never asked for the cell.** If a shard list omits a track, nothing is discarded and
  nothing fires. The rule checks races that ran, not the plan that chose them.
- **The 200 s ceiling itself.** The rule makes the ceiling *audible*; it does not make it right. A
  ceiling that truncates a legitimate race is still a wrong bound — and the owner has already judged
  this one not urgent, on the ground that his own 120 s tests came out nearly the same.
- **The hardcoded lap count.** `laps: shape.isOpen ? 1 : 2` (`:185`) ignores every track's
  `defaultLaps`. garden-path's `defaultLaps: 2` agrees with it *today, by coincidence*. A track whose
  default is 4 would be measured at 2 and **no cell would be empty**, so nothing here would fire. This
  is a separate defect and belongs on the backlog, not in this rule.
- **Zero-row cells in the 21 filtering harnesses**, unless each adds its own assertion — part (3) is
  opt-in by nature, and that is a real limit on how far one home can reach.
- **Anything downstream of the driver.** A summariser that drops rows, or a `--jobs` pool that loses a
  shard's output file, is outside `runRace` entirely.

---

## 7. PROPOSALS — none ordered

### A — MINE: build part (2) alone, and stop there for now

The stop-reason plus a default-loud throw on `'ceiling'`. **Costs zero noise on today's corpus
(measured: 0 of 1,140), catches the entire canonical instance (360 of 360), and needs no change in any
of the 44 harnesses** — only in the ones that legitimately want a truncated race, of which there are
currently none.

**Cost:** it is a behaviour change in the one file every measurement depends on, so it must land with
the driver's own test extended to prove it throws — and to prove it does **not** throw for the 7
early-exit harnesses. **It also moves no fingerprint** (the driver is not in any fingerprint's import
closure) which should be verified rather than assumed before it is built.

### B — MINE: make the sweep drivers compare produced against requested

The silent idiom is not in `runRace` at all; it is in the shard drivers, which print `races N` and
never compare N to the seed range they were given. **One line in each sweep driver** — requested,
produced, and a non-zero exit when they differ without a declared reason.

**Cost:** it is per-driver rather than one home, so it is the weaker shape and will be missing from
the next sweep driver someone writes. **What it buys that (A) cannot:** it catches cells lost for
reasons the driver never sees — a worker that crashed, a shard whose output file was never written.
**Both failures happened during RUNIN-CHANCE-SET-1's own sweep last night** (a driver killed by a
competing run wrote nothing, and I noticed only because I was watching the file count).

### C — MINE: record the stop reason in the output, whether or not anything throws

Even without (A)'s throw, every harness that writes JSON could carry `stoppedBy` and
`finished/requested` per cell. **Cost: a few bytes per row.** **What it buys:** every existing sweep on
disk becomes auditable after the fact, and a later reader can tell a truncated cell from a complete one
without re-running anything. **This is the cheapest of the three and the only one that helps with data
already collected** — which, given three sweeps discarded 360 races before anyone noticed, is not a
small property.

### D — do NOT extend Lesson 187 by copying its guard text into the harnesses

Named to be refused. The guards' rule works because each guard is a single-purpose script with one
answer; a harness has many cells and many legitimate zeros. **A blanket "zero rows fails" would fire on
21 harnesses that filter frames correctly**, and the first thing anyone would do is add a bypass — which
is how a loud rule becomes a suppressed one.

---

## 8. SOURCE HYGIENE, AND WHAT WAS NOT RUN (R15)

**Counts** come from `grep -rl` over the 44 files that call `runRace`, listed by the same command each
time, so they can be re-run rather than believed. The idiom examples are quoted with file and line.

**The garden-path measurement** is a fresh 4-race probe (2 tracks × 2 seeds) run from the repo root
against master's driver, plus the 120 garden-path cells already on disk from RUNIN-CHANCE-SET-1's
sweep. The track records were read from both `server/data/tracks` and `server/seeds/tracks` — they
agree.

**Nothing was changed.** No harness, no driver, no rule. This branch adds one report.

**What was NOT run, and why.** No fingerprints, no browser gate, no client suite, and **not the server
suite**: this is a docs-only change to a documentation tree, and no file any of those guards reads was
touched. PIECE 1 established the server suite's own state separately.

**One thing I could not establish and did not guess:** whether `runRace` throwing would move any
fingerprint. The driver is a measurement tool and should be outside every fingerprint's import
closure, but I did not verify that closure, and proposal (A) names it as a precondition rather than
assuming it.

---

## 9. CONFORMITY — what was asked against what was delivered

| the brief asked | delivered |
| --- | --- |
| DESIGN, DO NOT BUILD | Yes — nothing changed; one report added |
| which harnesses share the driver | §1 — 56 import it, **44 call `runRace`**, **1 reads its return** |
| what each reports when a cell yields nothing | §2 — **38 of 44 cannot fail**; the idiom counted six ways |
| the smallest honest change | §4 — a stop reason and a default-loud throw on the ceiling; two further parts named and separated by what the driver can be CERTAIN about |
| where it would live so there is ONE home | §4 — `raceDriver.mjs`, for the reason its own header already gives about the identity |
| what it would have cost in noise on the sweeps already run | §5 — **0 of 1,140 cells on today's master**; 120 before 2026-08-25; 360 across the three sweeps that met it |
| what it CANNOT catch | §6 — six limits, including the two that matter most (wrong-but-full cells, and the hardcoded lap count) |
| PROPOSALS with at least two of your own | §7 — three are mine (A, B, C); D is named to be refused |
| source hygiene, conformity | §8, §9 |

**One thing the brief did not ask for and this report adds:** §3. The canonical instance **no longer
reproduces**, because a track defaults change healed it by accident. That changes the cost of the rule
from "120 cells of noise per sweep" to "zero", and it changes the argument for building it — the rule
is now free, and the only thing standing between the project and 360 more silent discards is a track
default that another report has already shown cannot reliably be delivered.
