# GOLDEN-RACES-1 — two fixed races with known outcomes

**Date:** 2026-09-06
**Branch:** `feat/golden-races-1` off master `bcf41a9b`. **Not the team-races topic** — this is a
guard, and it ships separately. `feat/team-races-1` was not touched.
**Fingerprints:** none minted, and none moved. `engine-reach --check` selects nothing.
**Owner's decisions, 2026-09-06:** two fixed races re-run as part of verification, outcome identical
· roughly thirty seconds of racing each · run only when a change could have affected them · and when
a change legitimately produces a new outcome, the recorded expectation is updated.

---

## Why this and not the existing fingerprint — re-verified at source

REPEAT-REFUSE-5 established it; this piece re-checked it rather than carrying it over.
`scripts/fingerprint-default.mjs:182-196` still reads each track's `defaultRacerTypeId` from
`server/seeds/tracks/<id>.json`. So a seed edit moves that value while the simulation is untouched —
and it moved once already, on 2026-09-02, as an instrument correction whose diff contained no engine
file.

**A golden race therefore depends on NOTHING outside its own pinned inputs.** Sabotage (b) below
demonstrates the difference rather than asserting it.

---

## The two races, and why those two

| | `closed-garden-path-12` | `open-river-run-6` |
|---|---|---|
| track | **closed**, 4772.74 px, width 198 | **open**, 13061 px, width 300 |
| racer | beetle (×1.0 speed, size 33) | duck (×0.85, size 36) |
| field | **12** racers | **6** racers |
| length | 1 lap → **35.35 s** realized | **30 s** requested |
| stage | **wild** | **quiet** |
| seed | 88 | 777 |
| finish | ★ **1st and 2nd 0.032 s apart — two physics frames** | 0.272 s |

**Why these two.** Between them they cover the two track topologies (the open/closed split is
structural physics, not a setting), two field sizes — which is what decides start-row packing and
therefore the whole opening — two racer types with different speed multipliers and body dimensions,
two of the three action stages, and both duration models (laps vs requested seconds).

**★ And one of them is decided by a two-frame finish.** That was chosen deliberately by sweeping
seeds: a close finish makes the finishing ORDER sensitive, not just the times. A race won by four
seconds only tests the times; this one flips its podium if anything at all shifts.

### What they do not cover — named, not papered over

- **The shipped world.** Every input is pinned, so a change to `defaults.js`, to a track seed or to a
  racer's shipped values **cannot move these races**. They will be selected by such a change and
  they will pass. That is exactly what `fingerprint-default.mjs` is for, and it is the reason this
  piece was forbidden to touch it. See the overlap section.
- **The third action stage** (`medium`), the eight other tracks, every other racer type, every other
  field size, and every other seed. Two races cannot cover a game. What they cover is that *these
  two* did not move.
- **The camera and anything drawn.** These races have no picture at all.
- **How long the computation took.** Outcomes only.

---

## The full pinned-input list

Everything the engine reads arrives in `scripts/golden/fixtures/races.json`. Nothing is read from a
seed file, a config file, a default, the clock, the environment or any stored setting.

**Per race:** the track's `centerPoints` (the geometry itself, as coordinates), `pathLengthPx`,
`trackWidthPx`, `isOpen`; the racer's `speedMultiplier`, `displaySize`, `bodyFillX`, `bodyFillY`;
the **roster by name and in order**; the seed; `laps` or `requestedSeconds`; `racePlanEnabled`; the
action stage; and `winners`.

**Shared, once (not copied per race — that would be a second home):** `baseSpeed`, `behavior`,
`rowLayout`, `dynamics` and `autoScale` config objects, in full.

Three notes on the pinning:

- **The roster is pinned by NAME because a name is physics.** `stablePairBit` hashes it to break
  avoidance symmetry, so renaming a racer changes who wins. The names are applied before the first
  step.
- **The geometry needs only the centre line.** `getPosition` (`raceCore.js:385`) is the only shape
  method the engine calls, and with `centerPoints` and a declared `width` present it uses the centre
  spline. Verified numerically against the shipped track: identical to 3+ decimals at every sampled
  `t`. Inner and outer are handed the same points; nothing on the race path reads either.
- **The action stage is APPLIED, not merely recorded.** `configs.dynamics` is the PRE-stage base and
  `applyRaceActionStage` runs on it, exactly as the real path does. A fixture that named a stage
  without applying it would be claiming an input it never used — that was the first draft, and it
  was wrong.
- **`winners` is pinned and does not affect the outcome.** It decides how many are on the podium,
  not who finishes where. Recorded because it is part of the race's identity.

**No input could not be pinned.** There is no STOP to report here.

---

## Measured runtime

**~0.6 s for both races**, three consecutive runs: 603 ms, 579 ms, 595 ms. That is 2 439 + 1 898 =
4 337 physics frames, or 65 s of simulated racing, in well under a second. The check is effectively
free when it runs, which is what lets the declaration be wide.

---

## How the declaration was derived

```js
reach: ["client/src/modules/raceCore.js"],
dirs: [],
files: ["scripts/golden/fixtures/races.json", "scripts/golden/fixtures/expected.json"],
```

`reach` is **not a list of files — it is an entry point.** `scripts/lib/routing.mjs:383` expands it
through `engine-reach.mjs`'s import closure (`closureOf`), so the declared set is whatever can reach
the race engine *today*, recomputed on every run. `verify --dry` reports it as
**"declares 29 file(s) by import closure · reach=1 entry point(s)"**.

A hand-written list would be a second home for that fact. This project has paid for that shape more
than once — most sharply in the very instrument this check sits beside, which carried a literal
table of ten track/racer pairs and raced a snail on a track the product had raced with a beetle for
eight days.

The only plainly-named files are the guard's own two fixtures, which no import can reach.

---

## How re-recording works, and what it refuses

`node scripts/record-golden-races.mjs` — a separate command, never part of verification, never
reachable from the check.

- **With no expectation on file**, it records (there is nothing to overwrite).
- **With an outcome that has MOVED**, it **REFUSES** unless the invocation says the change was
  intended: `--intended="what changed and why the new outcome is right"`. A reason under twelve
  characters is refused too — a flag is not a reason.
- **★ It is not permission.** Re-recording is the same class of act as minting a fingerprint: it
  needs the **owner's word, per occurrence**. This piece grants no standing permission, and
  `check-golden-races.mjs` has no flag that can call it. A check that can bless what it is checking
  is not a check.
- **★ The previous expectation is KEPT**, pushed onto `history` with the date it was superseded, the
  commit, the reason given, and its full result list. That record is what later answers *"when did
  this race last move, and why"* — the question every stored-race discussion turns on, and one no
  hash can answer.

**Nothing was re-recorded by this piece.** The two expectations were recorded once, for the first
time, from a clean tree. The re-record path was exercised only in sabotage (d) and reverted.

---

## Overlap with `fingerprint-default.mjs` — reported, and it was not touched

| | golden races | world fingerprint |
|---|---|---|
| what it runs | 2 pinned races, ~65 s of racing | 10 tracks × 3 races on shipped defaults |
| inputs | frozen in the fixture | read from `server/seeds/` and `defaults.js` |
| catches an ENGINE change | ✔ | ✔ |
| catches a SHIPPED-DEFAULT or SEED change | ✘ **by design** | ✔ |
| moves when the instrument is corrected | ✘ | ✔ (happened 2026-09-02) |
| tells you WHAT changed | ✔ names the racer and both times | ✘ a 16-hex value |
| runtime | ~0.6 s | minutes |

**They are complementary and neither replaces the other.** The golden races answer "did the engine
change how a race runs"; the fingerprint answers "did the shipped world change". Sabotage (a) moves
both; sabotage (b) moves only the fingerprint. Nothing about `fingerprint-default.mjs` was changed,
and it keeps its role.

---

## What was reused

| the job | the one home | how it is used here |
|---|---|---|
| running a race headless | `client/src/modules/raceCore.js` — `createRaceFromIdentity` + `stepRacePhysics`, the REAL RaceScreen core | the golden runner steps it directly; no second race loop was written |
| the track shape | `client/src/modules/track-editor/EditorShape.js` | built from pinned points |
| start-row and sprite geometry | `client/src/modules/rowLayout.js` — `computeRacerLayout`, `computeBodyNarrowRef` | derived by the engine from pinned inputs |
| the action stage | `client/src/modules/raceActionStage.js` — `applyRaceActionStage` | applied to the pinned base |
| deriving what reaches the engine | `scripts/engine-reach.mjs` via `scripts/lib/routing.mjs` | the declaration, computed not listed |
| the guard/declaration convention | `scripts/lib/routing.mjs` — `--declare`, `GUARD` | matched exactly, including declaring before doing any work |

**A headless harness already existed and was checked before writing anything.** Two candidates were
rejected with reasons:

- **`client/src/modules/headlessRaceSimulator.js`** — its own header says *"⚠️ SIMPLIFIED
  STATISTICAL MODEL — NOT THE GAME"*. It omits `trajectoryMult`, `areaBonusMult` and `governorMult`.
  A golden race run on it would test a model nobody plays.
- **`scripts/parity/goldenRunner.mjs`** — a real harness and the closest existing thing, but it is a
  **parity** harness: `browserArm` vs `simArm` vs `realArm`, comparing two derivations against each
  other. It also reads shipped seeds and calls the config LOADERS, which is precisely what a golden
  race may not do. Its `realArm` is the pattern this runner follows, and it is credited at source.

**`runRaceHeadless`'s own JSDoc already said "the outcome the golden harness compares"** — the entry
point was built for this and had no caller doing it.

---

## What was removed

**Nothing was dead.** This piece added four source files and two fixtures and modified nothing, so
there was no existing code to leave behind. Within its own work: the first draft recorded
`raceActionStage` without applying it and duplicated the config block into each race; both were
removed before anything was committed — the stage is applied and the config block is shared.

**Noticed outside what this piece touched, and LEFT:** `check-fallback-agreement` reports two
long-standing UNRESOLVED mirrors — `cameraTimingComputation.js:maxStateDuration` and
`durationModel.js:normalSpeedPxPerSec`. Named in RACE-SAVE-3 and RACE-HISTORY-4 too; neither is
mine, and the guard passes with them.

---

## Proof

**Both races reproduce their recorded outcome**, and **two consecutive runs agree exactly**
(asserted in `check-golden-races.test.mjs`, and confirmed by three CLI runs above).

### (a) An engine value moved → the check FAILS and NAMES the difference ✔

`advanceRacerT` in `raceStep.js` had its `dt` multiplied by 1.0005.

```
FAIL: 2 golden race(s) no longer match what was recorded.

  golden race "closed-garden-path-12" — A FINISHING TIME MOVED.
    Flash (position 1): expected 36.592 s, got 36.832 s  (+0.240 s)

  golden race "open-river-run-6" — A FINISHING TIME MOVED.
    Rocket (position 1): expected 27.936 s, got 27.968 s  (+0.032 s)
```

### (b) ★ A shipped seed's track default changed → the check still PASSES ✔ — **this is the point of the piece**

`server/seeds/tracks/garden-path.json` had `defaultRacerTypeId` set to `snail` and `defaultLaps` to
4 — *the exact edit class that moved the world fingerprint on 2026-08-25*.

- **Golden races: PASS.** "2 race(s), every finishing position and time as recorded (262 ms)."
- **World fingerprint under the same edit: `dc4647be0f55ebdb`**, against the recorded
  `8a1977187e9c99b4`. **It moved.**

The same edit moves the old instrument and leaves the golden races untouched. That is the fragility
this check was built not to have, demonstrated rather than argued.

### (c) Re-record without the intended-change flag → REFUSED ✔

Exit code **1**, the moved outcomes printed, and **the fixture was not written** (`git diff` on
`expected.json` empty afterwards). The message states the default reading — *"A MOVED GOLDEN RACE IS
A FINDING FIRST"* — and that re-recording needs the owner's word.

### (d) Re-record WITH the flag on a moved outcome → records, and keeps the old ✔

```
RE-RECORDED "closed-garden-path-12" — the previous expectation is kept (1 in history),
  dated 2026-09-06, commit bcf41a9b.
```

The history entry carried `supersededOn`, `supersededCommit`, `supersededBecause` and the full old
result list — old winner `Flash @ 36.592`, new `Flash @ 36.832`. **★ Both the engine sabotage and
the re-recorded fixture were then reverted; the committed `expected.json` has an empty history and
is the first recording from a clean tree.**

### (e) A documentation-only change does NOT select the golden races ✔

`docs/README.md`, `reports/evolution/INDEX.md`, `server/src/routes/tracks.js` and
`client/src/screens/DevScreen/DevScreen.jsx` — all **skip**.

### (f) A change that reaches the engine DOES select them, including indirectly ✔

`client/src/modules/raceCore.js` (the entry point), `raceStep.js` (imported by it), and — the case
the brief demanded — **`client/src/utils/mathUtils.js` and `client/src/modules/storage/defaults.js`,
which are named nowhere in the declaration and are reached only through the closure**. All
**select**.

---

## Checks

| check | result |
|---|---|
| `check-golden-races.mjs` | 2 races, all positions and times as recorded, ~0.6 s |
| `check-golden-races.test.mjs` (script suite) | **13 passed** |
| `npm run verify` (plain) | **PASS 7, FAIL 0, SKIP 23** — exit 0, 70.6 s; `golden-races` itself **1.5 s** |
| `engine-reach --check` | selects nothing |

```
ENGINE REACH: none of 6 path(s) carry a change that can reach the race engine.
  6 outside the hull (cannot reach the engine at all): scripts/check-golden-races.mjs, scripts/check-golden-races.test.mjs, scripts/record-golden-races.mjs, scripts/golden/goldenRace.mjs, scripts/golden/fixtures/races.json, scripts/golden/fixtures/expected.json
```

**Nothing was minted and no fingerprint moved** — this piece changed no engine file, no default, no
seed, no config and nothing that draws.

---

## Source hygiene

**Six new files. No existing file was modified.**

| file | lines |
|---|---|
| `scripts/golden/goldenRace.mjs` | 164 |
| `scripts/golden/fixtures/races.json` | 357 |
| `scripts/golden/fixtures/expected.json` | 112 |
| `scripts/check-golden-races.mjs` | 194 |
| `scripts/check-golden-races.test.mjs` | 206 |
| `scripts/record-golden-races.mjs` | 145 |

Each carries a header saying what it owns and what it deliberately does not do.

The fixture was authored by a one-time scratchpad script that read the shipped values once; that
script stayed in the scratchpad and **no scratch file entered the repository**. The three sabotage
backups likewise. **No record created by hand survives:** the seed edit, the engine edit and the
re-recorded fixture were all reverted and verified reverted.

### Noticed and deliberately left

- **`runRaceHeadless` in `raceCore.js` is not used by this piece**, although its doc names the golden
  harness. It steps without a roster, and a name is physics — so the runner does what
  `goldenRunner.realArm` does and steps the core directly, with the names applied first. The
  function is left exactly as it is; changing it would be an engine edit this piece may not make.
- **The `--declare` branch prints before any work**, matching the convention `routing.mjs` documents
  at length. Discovered by the guard simply not being collected until it was added.
- **A test of mine matched its own prose.** The "reads no seed file" assertion scanned raw source and
  failed on the header paragraph that *explains* why seeds must not be read. It now strips comments
  and also asserts every import is engine code — a guard that cannot tell code from prose reports the
  documentation as the defect.

---

## Open for the owner

1. **Whether the two races are the right two.** A third is deliberately not added — that is his call,
   not a commit's.
2. **Every re-record, for ever.** The command exists so the act is deliberate and recorded; it is
   not permission, and this piece granted none.
