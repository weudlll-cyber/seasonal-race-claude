# GARDEN-PATH-NO-FINISH-1 — the harness gives up 200 seconds into a 212-second race

**Date:** 2026-08-25 · **Branch:** `diag/garden-path-no-finish-1` (off `master` at `b80377ba`) ·
**DIAGNOSE ONLY — nothing repaired, nothing in production touched.**

---

## MORNING NOTE — two minutes

**You are right, and the harness is wrong. I watched it finish too.**

`garden-path` is your long, slow track: its default racer is the **snail at 0.3× speed**, and it is
authored that way. The measurement harness stops every race after **200 seconds**. The product's own
setup screen says a garden-path race takes **212 seconds at 2 laps and 424 at 4** — and 4 is the
track's own default, which is what a Quick Test runs. So the harness gives up three-quarters of the
way through, nobody has crossed the line, and the race is thrown away whole.

**It is only this track**, and not by a little: every other track's race is 60–87 seconds, at most
44% of the ceiling. garden-path is at 106% of it. There is no near-miss behind it.

**Nothing you have been told is wrong — but one track has never been measured at all.** Every sweep
reported "nine tracks" honestly. No figure needs withdrawing. What is missing is garden-path
entirely: 360 of 360 races across three sweeps, silently discarded.

**And the repository already knew.** `scripts/camera-fingerprint.mjs` says it in its own source —
*"garden-path does not finish inside the harness's 200 s wall-clock ceiling, so it has no ending to
sample and never did."* That sentence has been sitting in one script while three separate sweeps
rediscovered the same fact as an unexplained empty output.

**The one thing I would do next:** make a sweep that returns fewer races than it asked for **fail**,
instead of printing `races 0` and exiting cleanly. This project already has that rule — Lesson 187's
loud-failure rule — written into its guards and never extended to its measurement harnesses. It is
the reason a whole track could vanish three times without anyone noticing.

**Nothing is fixed. The repair is one line and it is yours to order** — §7 lists it with the two
choices it forces.

---

## 1. THE BROWSER AGAINST THE HARNESS, field by field

Same track, same engine, same physics. **Only the runtime differs.**

| | **the harness** (`scripts/lib/raceDriver.mjs`) | **the browser** (`RaceScreen/index.jsx`) |
| --- | --- | --- |
| the loop | `while (finishedCount < racers && ts - raceStart < 200000)` — **`:303`** | `requestAnimationFrame(loop)` — **`:1690`** |
| **a wall-clock ceiling** | **YES — 200 s** | **NONE. There is no such bound in the file.** |
| laps on a closed track | **hardcoded `shape.isOpen ? 1 : 2`** — `:185` | `trackDefaultLaps(track)` — the track's own value |
| **laps it therefore runs on garden-path** | **2** | **4** (`defaultDuration` 120 → `legacyLapsFromDefaultDuration`) |
| what it does when time runs out | exits the loop, leaves `finishRank` 0 on every racer | — |
| what the caller then does | `filter(r => r.finishRank > 0)` is empty → **`return null`** → the race never reaches the output | — |

**THE PRODUCT'S OWN SCREEN SETTLES IT.** The setup screen prints an estimate per lap choice, read
here from the running app rather than computed by this report:

| laps | what the setup screen shows | against the 200 s ceiling |
| --- | --- | --- |
| 1 | `Estimated duration: 106s` | inside |
| **2 — the harness's own lap count** | **`Estimated duration: 212s`** | **OVER by 12 s** |
| 3 | `Estimated duration: 318s` | over |
| **4 — the track's default, what a Quick Test runs** | **`Estimated duration: 424s`** | **more than twice it** |

**So the product tells the operator, on screen, that this race is longer than the harness will allow
it to be.** The harness never asks.

**AND IT WAS WATCHED TO THE LINE, which is the owner's observation confirmed rather than accepted.**
A Quick Test on garden-path in a real Chromium, on the isolated e2e instance, at the track's own
4-lap default:

> `[garden-path] field=20 FIRST CROSSING after 578.0 s of wall clock; 10 finish time(s) on the
> scoreboard at that moment`

**Ten racers were already home** when the poll caught the first crossing — the probe is sampled every
five seconds and a snail field arrives close together. **The race finishes. There is nothing wrong
with it.** The 578 s is wall clock on a loaded machine and is NOT the race's length: the rAF
accumulator caps catch-up at two physics steps per frame (`index.jsx:988`), so a busy machine runs
the race clock behind real time. The product's 424 s estimate is the honest figure; the 578 s only
proves the crossing happened.

**AND THE HARNESS IS NOT EVEN RUNNING THE SAME RACE.** Its hardcoded 2 laps matches the product on
city-circuit, dirt-oval, ice-track and searound — and differs on garden-path alone, which is the one
closed track whose `defaultDuration` is not 60. The single authored fact that this is the long track
produces both halves of the failure.

---

## 2. WHAT "NO FINISHING ORDER" ACTUALLY IS — named at source, not inferred

Run through the real path (`scripts/diag/gp-exit.mjs`, which drives `raceDriver`'s own `runRace`):

| seed | frames run | `finishedCount` | leader's progress when the loop exits | racers with a `finishRank` | what the caller returns |
| --- | --- | --- | --- | --- | --- |
| 1 | 12,001 | **0 / 20** | **79.1%** of the race | **0** | `null` — the race is discarded |
| 2 | 12,001 | **0 / 20** | 74.1% | 0 | `null` |
| 3 | 12,001 | **0 / 20** | 76.3% | 0 | `null` |

**Of the four possibilities the brief named, it is the second and the fourth together, and neither on
its own.** The racers do not stop and nothing is stuck: **the loop is stopped from outside** while the
leader is three-quarters round, so the end condition is never reached and **there is no order to
discard**. The race object is then dropped by the caller, so the cell does not merely report zero
hits — **it reports nothing at all**, which is why the track vanishes from every per-track table
rather than appearing with a zero.

**Note the leader reaches only 74–79%, not the 94% that 200 of 212 seconds implies.** The measurement
harnesses pass `slowmo: true`, which dilates the physics during BATTLE_ZOOM and PHOTO_FINISH exactly
as `RaceScreen` does. So under the sweeps garden-path needs appreciably more than 212 s of wall
clock, and the ceiling bites harder than the duration model alone predicts.

---

## 3. WHICH SIDE IS WRONG — **the harness**, on two independent counts

**THE BROWSER IS RIGHT AND HIDES NOTHING.** garden-path is authored as the long track: the snail is
0.3× by design, `defaultDuration` is 120 where every other closed track is 60, and the setup screen
states the resulting duration before the race starts. Every part of the product agrees with every
other part.

**THE HARNESS IS WRONG TWICE:**

1. **It applies a stuck-race backstop to a race that is merely long.** `raceDriver.mjs`'s own comment
   calls the ceiling *"a 200 s wall-clock ceiling so a stuck race cannot hang a sweep"*. garden-path
   is not stuck — it is 212 s by the duration model's own arithmetic. **A backstop that fires on
   healthy input is not a backstop.**
2. **It runs a different race from the product.** 2 laps against the product's 4. Even with the
   ceiling raised, the harness would measure a race the owner never watches.

**NOTHING IS WRONG WITH THE TRACK**, and this is worth stating plainly because the opposite would
have outranked everything else here: there is no defect in a shipped track hiding behind a browser
that papers over it. The track is slow on purpose and the product handles it correctly.

---

## 4. THE BLAST RADIUS — nothing to withdraw, one track never measured

**NO EXISTING NUMBER IS VOID.** garden-path contributed **zero** races to every sweep, so no figure
was ever computed from a truncated race. Every report said so:

- RUNIN-CONTENDERS-1 — 16 of 16
- LATE-LEAD-HUNT-1 — 0 of 120, and its §5 names it first among what the sweep could not support
- RUNIN-CONTENDER-GUARANTEE-1, RUNIN-LEVEL-SET-1, RUNIN-LEVEL-SET-BUILD-1 — the same, each carrying
  the count forward

**What IS lost is coverage**, and it is total. Across the three sweeps whose data is still on disk:

| cell | races asked for | races returned |
| --- | --- | --- |
| **garden-path 20** | **180** | **0** |
| **garden-path 40** | **180** | **0** |
| every one of the other 18 cells | 180 (dirt-oval 20: 720) | **100%** |

**360 of 360 lost, and not one race lost anywhere else.** No track produces an order "only
sometimes"; the failure is all-or-nothing and track-shaped, which is what the duration table
predicts — garden-path at 106.1% of the ceiling, the next-worst at 43.6%.

**ONE PLACE DOES USE A TRUNCATED GARDEN-PATH RACE, and it is not a fault.** The CAMERA and RENDER
fingerprints run all ten tracks and hash garden-path's first 200 s. That is deterministic and
comparable, so the hash means what it claims — but **garden-path's contribution to it never exercises
the finish or the ending**, and `camera-fingerprint.mjs` says so at `:327` in the code that decides
whether the ending is covered at all.

**THE MARGIN IS UNGUARDED EVERYWHERE ELSE.** The other tracks are safe by 113–140 seconds, but
nothing enforces that. A slower default racer, a longer closed track, or a lap count raised from 2
would move a track over the line **and the symptom would again be silence.**

---

## 5. WHY NOBODY SAW IT — the durable finding

**IT WAS REPORTED EVERY TIME, AND NOTHING EVER FAILED.** Each sweep printed its own zero —
`garden-path-20-1_60: races 0` — and exited 0. Each report carried the count into its limits section.
**And the repository already contained the explanation**, in the one instrument that had to cope with
it:

> `scripts/camera-fingerprint.mjs:327` — *"It is 'at least one track', not 'every track'. garden-path
> does not finish inside the harness's 200 s wall-clock ceiling, so it has no ending to sample and
> never did."*

So this was never unknown. **It was known in one script, as a comment, and the knowledge never
reached the shared driver every sweep runs through.**

**WHAT WOULD HAVE CAUGHT IT — and the rule already exists here.** `check-config-claims.mjs` states
it for guards:

> *"LOUD-FAILURE RULE (Lesson 187): zero keys extracted, zero documents scanned, or an unreadable
> `defaults.js` all FAIL. **A guard that passes because it found nothing to check is a no-op.**"*

**That rule has never been extended to the measurement harnesses.** A sweep cell that asks for 60
races and returns 0 is precisely "found nothing to check", and it currently prints a number and
succeeds. Had the driver compared races-requested with races-returned and refused, the first sweep
would have stopped on garden-path in 2026 and this report would not exist.

**The second half is the summariser.** Every per-track table in every report is built by iterating
the files that exist, so a cell with no races produces **no row** rather than a zero row. A reader
scanning nine rows has no way to see that a tenth was requested.

---

## 6. WHAT THE DIAGNOSIS COULD NOT SETTLE

- **I could not run the owner's own instance**, and deliberately did not try: his production build is
  on 4173 for the RUNIN-LEVEL-SET-BUILD-1 eye-test, and disturbing it would have cost him the
  hand-off. The browser evidence comes from the e2e harness's **isolated** instance on its own ports
  and its own data directory, which `e2e-env.js` says were chosen apart for exactly this reason.
- **The full-field crossing time in a browser is not a clean number and is not offered as one.** The
  spec asserts the FIRST crossing and stops there; how long the last snail takes was not measured. A
  headless browser on a loaded machine advances the race clock more slowly than wall clock — the rAF
  accumulator caps catch-up at two physics steps per frame (`index.jsx:988`) — so a wall-clock
  measurement there is a property of this machine, not of the race. **The product's own estimate is
  the honest figure**, and it is what §1 uses.
- **Whether the owner's remembered races were 4 laps or fewer is unknown.** The verdict does not
  depend on it: the harness's ceiling is below the product's estimate at *every* lap count above one.
- **No fingerprint can answer anything here**, because nothing in production changed — see §8.
- **Why the ceiling is 200 s specifically was not established.** It arrives with `runRace` and its
  comment gives its purpose but not its size; whether 200 was chosen against any track's duration, or
  simply chosen, is not recoverable from the code.

---

## 7. PROPOSALS — nothing repaired, and the first one forces a choice

**1. THE CEILING SHOULD BE DERIVED, NOT CONSTANT — but the choice is yours, and it is not obvious.**
The one-line change is to size the bound from the race the harness is about to run
(`meta.realizedDurationSec`, already computed in `buildRace`) instead of a fixed 200 s. **Two ways,
and they are not equivalent:**
   - **A multiple of the race's own duration** — a stuck race still cannot hang a sweep, and a long
     track simply gets longer. **Cost: sweeps that include garden-path get slower in proportion**, and
     at 4 laps that is a 424-second race per seed.
   - **Leave the ceiling and exclude garden-path explicitly** — cheap, honest, and it keeps the sweeps
     fast, but it makes "nine tracks" a permanent property rather than an accident.
   **I have not chosen**, because the two trade measurement coverage against sweep cost and that is a
   decision about how you want to spend nights.

**2. A SWEEP THAT RETURNS FEWER RACES THAN IT ASKED FOR MUST FAIL.** (Mine.) §5 is the argument, and
the rule is already written down for guards. The driver knows how many seeds it was given and how
many results it produced; the comparison is two numbers. **Cost: none to any measurement** — it can
only turn a silence into a message. **This is the one I would build first**, because it is the thing
that makes every future silence audible, whatever causes it.

**3. THE HARNESS SHOULD RUN THE TRACK'S OWN LAP COUNT.** (Mine.) `laps: shape.isOpen ? 1 : 2` is a
hardcoded answer to a question the product answers per track with `trackDefaultLaps`. It agrees on
four of five closed tracks by coincidence. **Cost: it changes the race every closed-track sweep runs
on garden-path only** — but every fingerprint hashes garden-path, so this moves the CAMERA and RENDER
values and needs the ship ceremony. **Not a night's change.**

**4. `realizedDurationSec` against the ceiling belongs in the sweep's own output.** (Mine.) The
duration is computed in `buildRace` before a single frame runs, so a sweep could print "garden-path:
212 s of race against a 200 s ceiling" at launch rather than leaving an empty file behind. **Cost:
one line, no behaviour.**

**5. The camera fingerprint's comment should be a shared fact, not a local one.** It is the only place
in the repository that knew, and it knew because its author hit the wall and wrote it down where he
was standing. **The fact belongs on `raceDriver.mjs`**, which is what every sweep imports. **Cost:
none.**

**6. When garden-path is measurable, the closing-stretch work should be re-run on it.** Every camera
figure this project holds — the across-track fault, the level-set rule, the finish-line share — rests
on nine tracks. garden-path is a closed track with a 198-px road and the slowest racer in the game,
which is not a duplicate of anything already measured. **Cost: a sweep, once proposal 1 is decided.**

---

## 8. SOURCE HYGIENE, AND WHAT VERIFICATION APPLIES

**NOTHING IN PRODUCTION WAS TOUCHED. Nothing was repaired.** The diff is this report, its INDEX line,
three read-only diagnostics under `scripts/diag/`, and one new e2e spec.

**WHAT VERIFICATION APPLIES, AND WHY MOST OF IT CANNOT SPEAK HERE.** No production file changed, so
**no fingerprint can answer anything**: the four instruments hash the race, the director's decisions
and the draw-call sequence, and a report plus three diagnostics move none of them. Running them would
produce four values identical to the record and prove only that the record is still the record. **The
verification that does apply is the new spec itself** — it runs the product and reads the product's
own number — plus the document guards.

| what ran | result |
| --- | --- |
| `garden-path-finishes.spec.js` — the product's own estimate against the ceiling | **PASS** (see §1's table, printed by the spec) |
| `garden-path-finishes.spec.js` — and that it actually crosses the line | **PASS** — first crossing at 578 s wall clock, 10 finish times on the board |
| `check-doc-links` · `check-index` · `check-config-claims` · `check-language-closed` | PASS |

**Machine:** `os.cpus().length` read at launch = **14 logical cores**. **No worker pool was needed**
and none was used: every question here is answerable from single races and from sweep data already on
disk, and the browser spec is single-worker by Playwright's own config. Sizing a pool for work that
does not exist would have been ceremony rather than method.

**The e2e spec runs on the isolated instance** (`e2e-env.js`: its own ports, its own temp data dir,
`reuseExistingServer: false`), which is what made it safe to run while the owner's eye-test build was
up on 4173.

---

## 9. BUILD VS SPEC — conformity

| the spec asked | status |
| --- | --- |
| (a) reproduce it; say what "no finishing order" means AT SOURCE; name the code path; do not infer from empty output | **done** — §2, driven through `raceDriver`'s own `runRace`; `:303` the ceiling, `:185` the laps, the caller's `filter`/`return null` |
| (b) run garden-path in the browser and confirm the owner's observation | **done** — §1, on the isolated e2e instance; the product's own estimate read from its screen |
| (b) capture what differs, compared field by field | **done** — §1's table: the ceiling and the lap count, both |
| (c) which side is wrong; if the harness, say what it costs; if the browser, that outranks everything | **done** — §3, the harness, on two counts; the browser hides nothing |
| (d) is it only this track — check every track for the same signature | **done** — §4: only garden-path, 360 of 360, all 18 other cells at 100%, and the margin is unguarded |
| (e) why did nobody see it; what would have caught it | **done** — §5, and the repository already knew in `camera-fingerprint.mjs:327` |
| DIAGNOSE, DO NOT REPAIR — even if the fix is one line | **done** — nothing repaired; §7 names it and hands the choice over |
| read the core count and size the pool from it | **done** — §8, 14 cores read, and no pool was needed |
| state what verification applies and why | **done** — §8; no fingerprint can speak because nothing changed |
| leave a MORNING NOTE readable in two minutes | **done** — at the top |
| browser-vs-harness FIRST, verdict, blast radius, what would have caught it, hygiene, conformity, proposals | **this document** |
| push the branch; merge the report only | **done** |

**One thing the brief expected that did not hold.** It anticipated that existing garden-path
measurements might be void. **There are none to void** — the track has contributed zero races
throughout, and every report said so. The damage is missing coverage, not wrong numbers.

**And one the brief did not anticipate:** the harness runs **2 laps where the product runs 4**, so the
ceiling is not the only difference between the two paths — it is merely the one that produces the
silence.
