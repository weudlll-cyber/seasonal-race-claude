# HULL-FIX-1 — the tool that decides whether a change can reach a race starts telling the truth

2026-09-09 · branch `fix/hull-1` off master `678ce9be` · **NOT MERGED, nothing minted, no engine,
camera or drawing code touched.** The owner reads what the hull now costs before it becomes the thing
every future mint decision rests on.

**Precondition checked, not assumed:** `git ls-remote --heads origin` showed exactly `master` at
`678ce9be285017e8b5ee92fc4199762cbbf32841`, working tree clean.

**The one-sentence outcome.** `engine-reach` walked DOWN from `raceCore.js` only, so every module that
PRODUCES the engine's arguments sat on the caller's side of the arrow and was invisible **by
construction**; it now also walks UP, to every file that constructs a race, and down again through
what those drivers import. **The hull goes 79 → 197 files, a strict superset — nothing left it.** The
five files proven to move a race while the tool said they could not are now inside. The measured
price: the pre-commit tripwire fires on **28% of merges instead of 15%** over the last eight weeks.

---

## 1 · THE MECHANISM, RE-VERIFIED AT SOURCE (not taken from HULL-REACH-1)

`scripts/engine-reach.mjs:45` on master read `const ENTRY = join(MODULES_DIR, "raceCore.js")`, and
`engineReach` walked `importSpecifiers(src)` — `from '...'` edges only — from that entry. Confirmed by
reading both, and confirmed from the other end: `raceCore.js`'s eleven imports (lines 32-48) contain
neither `raceParams.js` nor `raceActionStage.js`.

> **A closure walked from `raceCore`'s imports cannot see the modules that produce `raceCore`'s
> inputs.** They sit on the caller's side of the arrow.

**The project had already written this hole down and left it open.** `docs/SHIP-CEREMONY.md` carried
it as a standing warning under *"WHAT THE NEW TRIGGER DOES NOT CATCH"*:

> *"Anything reaching the engine other than through `raceCore.js`'s import graph — a value passed in
> as an ARGUMENT by a caller. **If your diff changes a number that is passed into the race, mint — the
> tripwire will not tell you to.**"*

That bullet is now struck through in that document, dated, and replaced by what is true.

### The probes, named — nothing was built twice

| probe | what it is | cost | what it decides |
|---|---|---|---|
| `node scripts/check-golden-races.mjs` | two pinned races through the real `raceCore` | **0.3 s** | did a pinned race move |
| `realArm` in `scripts/parity/goldenRunner.mjs` | the SHIPPED path — reads the real config loaders and the real roster; the function `client/src/modules/parity/goldenRealArm.test.js` drives | **8 s** for 3 seeds | did a shipped-configuration race move |
| a module-level `throw` | HULL-REACH-1's reachability probe | one run | is this file loaded at all |

★ **THE GOLDEN RACES CANNOT DECIDE A CONFIG LOADER, and that is why HULL-REACH-1 could not.** The
fixture pins every input on purpose (`goldenRace.mjs`, THE PINNING RULE), so `baseSpeedConfig.js`,
`rowLayoutConfig.js` and `racerNames.js` are **never loaded** by it — all three module-level throws
stayed silent, exit 0. A sabotage there is a false green by construction. **The probe that reaches
them existed all along and HULL-REACH-1 missed it**: `goldenRunner.mjs` imports all three
(lines 51-85). Its report said *"no headless probe in this repository imports them"*; that sentence is
withdrawn here.

★ **AND THE TEST THAT DRIVES IT IS A WEAK DETECTOR, which had to be found before it was trusted.**
`goldenRealArm.test.js` asserts real == sim and the **winner index** — not the finishing times. A
change that moves a race without flipping a winner passes it. So the sabotages below are read from the
**outcome hash** `realArm` returns, through a nine-line script that calls it and prints the hash. That
script builds no race of its own and lives outside the repository.

---

## 2 · ★ THE TWO PROVEN OUTSIDERS ARE NOW INSIDE — sabotage re-run, not cited

Both are now selected by the tool (`--check` reports them in the hull), and both go red when broken.

| file | probe fired? | sabotage | golden races |
|---|---|---|---|
| `client/src/modules/raceParams.js` | **LOADED** (throw fired at `:128`) | `W_REF_MAX` 285 → 200 | **RED** — Rocket P1 27.936 s → 27.344 s (−0.592 s) |
| `client/src/modules/raceActionStage.js` | **LOADED** (throw fired at `:82`) | `raceActionStageValues` returns `pulkLeaderBrake: 0.42` | **RED** — Flash P1 36.592 s → 39.440 s (+2.848 s) |

Golden races were green before and after every restore; every restore went through `git checkout --`
and was verified with `git diff --quiet`.

---

## 3 · ★ THE THREE ARGUED-BUT-UNPROVEN — ALL THREE NOW PROVEN

Each carries its reachability probe. Baseline for the shipped-path arm:
`seed=1 9b0c31a8 / seed=7 e9113f77 / seed=42 82a26ee4`.

| file | golden races | shipped-arm probe | sabotage | shipped-arm outcome |
|---|---|---|---|---|
| `baseSpeedConfig.js` | **not loaded** | **LOADED** (`:87`) | `loadBaseSpeedConfig` returns `normalSpeedPxPerSec × 0.8` | **MOVED** — all 3 seeds; real arm diverged from sim at `physicsTs=5000` |
| `rowLayoutConfig.js` | **not loaded** | **LOADED** (`:70`) | `loadRowLayoutConfig` returns `rowGapMultiplier × 1.6` | **MOVED** — all 3 seeds |
| `racerNames.js` | **not loaded** | **LOADED** (`:395`) | `QUICK_TEST_NAMES[2]` `'Rocket'` → `'Rocketa'` | **MOVED** — seed 1 `9b0c31a8`→`b76c5bab`, **winner 13 → 38**; seed 7 moved; seed 42 unmoved |

### ★ THE NAMES CASE ALMOST PRODUCED A FALSE GREEN, and the reason is worth keeping

My first two `racerNames.js` sabotages came back **green** and were **inert by construction** — the
exact trap HULL-REACH-1 named. Chased down rather than reported:

1. The probe **is** loaded (throw fired) and the name **does** reach the physics — instrumenting
   `stablePairBit` recorded real keys, `"Blaze vs Comet"`, `"Flash vs Storm"`, `"Drift vs Breeze"`.
2. The call site **is** live — forcing `raceBehavior.js:966`'s `dir` to a constant moved all three
   seeds violently (winners 13→27, 38→17, 13→21). So the tie-break decides races.
3. `pairTieDir` fires **9895 times in three races**, every one of them name-hashed.

So why did renaming every racer change nothing? **`stablePairBit`'s output bit is a parity, not a
hash.** FNV-1a multiplies by 16777619, which is odd, so multiplication preserves the low bit; the low
bit of the final value is therefore the initial bit XORed with the parity of the **odd character
codes** in the key. Both failed sabotages preserved that parity: `'Rocket'`→`'Rokket'` swaps `c` (99)
for `k` (107), both odd; and prefixing **every** name with `Q` (81, odd) adds one odd character to
**both halves** of every pair key, cancelling. Verified directly —
`bit('Blaze|Comet') == bit('QBlaze|QComet') == 1`, while `bit('Blaze|Rocket')=1` and
`bit('Blaze|Rocketa')=0`. The parity-flipping rename moved the race on the first try.

★ **The lesson is sharper than "a failed sabotage is not a finding": a mutation can be loaded,
reachable AND at a live call site and still be inert, because the function it feeds discards the part
you changed.** Nothing short of establishing WHY a green is green is worth anything.

---

## 4 · THE NEW RULE, AND HOW IT DECIDES

Stated at source in `scripts/engine-reach.mjs`'s header, in one paragraph, and reproduced here:

> A race is produced by the engine READING ITS ARGUMENTS. **Half one, DOWN the arrow:** everything the
> engine imports, transitively, from each ENTRY POINT — `raceCore.js` plus whatever the fingerprint
> guards declare they drive. **Half two, UP the arrow and then down again:** a DRIVER is any tracked
> source file that imports an entry point — any file that constructs or steps a race — and the whole
> import closure of every driver counts too, because a driver's imports are the candidate producers of
> the values it hands the engine and **a static walker cannot tell an argument-producer from a
> bystander**. The hull is the union.

**The up-step is taken ONCE**, from the entry points and not from every member of the closure. That is
the load-bearing restriction: a file that imports a mid-hull module is READING a shared value, not
CONSTRUCTING a race, and up-walking from `storage/defaults.js` would drag in every screen that shows a
setting and make the hull the whole application.

★ **Its premise is guarded, not asserted.** The up-step is complete only while every way of building a
race runs through an entry point. `engine-reach.test.mjs` now scans every tracked source file for a
`createRaceFromIdentity` / `runRaceHeadless` **call** and fails if one is not a driver. A second engine
entry — a transcribed init, a `createRace` elsewhere — turns that test red on the day it appears.

**Nothing else in the rule is new vocabulary.** Entry points still come from
`fingerprint-default.mjs`'s own `reach:` declaration (FP-HULL-1); drivers are derived from
`git ls-files` on every run. **There is no exception list and no filename special-case anywhere in the
tool.**

### Three smaller repairs the rule needed, each a widening

- **Dynamic edges are followed when the specifier is a LITERAL.** Every instrument reaches the engine
  as `import(u("client/src/modules/raceCore.js"))`. Those edges are real and were unwalkable. Only a
  NON-literal specifier is now reported as unfollowable, and the CLI still refuses on one.
- **Extensionless specifiers resolve** instead of being silently dropped. `resolve(dir, spec)` with no
  fallback dropped `client/src/modules/raceHistory.js`'s `'./storage/storage'` — a repo-wide scan found
  **26 unresolvable static specifiers, 12 of them extensionless**. A dropped edge is a file wrongly
  OUTSIDE, which is the failure this piece exists to stop.
- **Comment-only lines are not read as edges.** The tool's own header explains the rule by writing
  `import(u("client/src/modules/raceCore.js"))`, and the scanner read that as an edge and made the
  arbiter a driver of the engine. Only lines whose first non-space characters are `//`, `*` or `/*` are
  dropped — a line that begins with those cannot hold an import statement, so this cannot delete a real
  edge. Trailing comments are left alone: a phantom edge from one is an over-inclusion, which costs a
  run and never costs correctness.

### What did NOT change, deliberately

`engineReach(entry)` keeps its old meaning — the import closure of one entry — because
`scripts/lib/routing.mjs:106`'s `closureOf` is that function and it expands **every** guard's declared
`reach`. Giving it the up-step would up-walk from entries like `storage/defaults.js` (declared by the
render and camera fingerprints) and hand unrelated guards the whole application. The hull is a new,
separately named export, `raceHull()`. Its parameter is now required rather than defaulted, so nobody
can call the ambiguous no-argument form and get an answer to a question they did not ask.

---

## 5 · THE OVER-REPORT — measured, and STOPPED at the honest fix

**HULL-REACH-1's "not loaded at all" is corrected: all three ARE loaded.** That report's finding was
probe-dependent — it used the golden races, whose fixture pins the racer config. Against the
shipped-path arm all three module-level throws fire.

| file | golden races | shipped-arm probe | semantic sabotage | shipped-arm outcome |
|---|---|---|---|---|
| `client/src/services/api.js` | not loaded | **LOADED** | `API_BASE_URL` → `http://hull-fix-1.invalid/api` | **UNMOVED**, all 3 seeds |
| `client/src/services/racerApi.js` | not loaded | **LOADED** | `fetchRacers` throws when called | **UNMOVED**, all 3 seeds |
| `client/src/services/apiClient.js` | not loaded | **LOADED** | — (reached only through `racerApi`) | — |

So the finding stands in substance: **loaded, and inert for the outcome.** The edge, re-confirmed at
source, is `client/src/modules/racer-types/index.js:75-82` — the racer-type **registry** is a genuine
engine input, and the same module carries the **HTTP layer for editing racer types from the UI**.

★ **THE HONEST FIX IS TO SPLIT THAT MODULE, SO THIS PIECE STOPS HERE.** Separating the registry the
engine needs from the editing layer it does not is **product code and the owner's decision**. The
alternative — teaching `engine-reach` to skip three filenames — is an exception list, a second home for
a fact the code should carry, and is explicitly not done. **The three files stay in the hull.** They
cost nothing measurable: they are imported by a module already inside, so they add no separate trigger.

---

## 6 · ★ THE BOTH-DIRECTION SAMPLE — a census where one was possible

**The instrument.** A per-file `throw` decides one file per run. Instead, a Node module-resolution hook
(outside the repository) recorded **every module a probe actually loads**, in one run — the same
reachability question, answered for the whole graph at once. It was cross-validated against the
per-file throws below and agreed on all 40 files sampled.

### Direction 1 — is anything LOADED BY A RACE but OUTSIDE the hull?

| probe | repo modules loaded | in hull | **outside the hull** |
|---|---|---|---|
| shipped-path arm (`realArm`) | 86 | 85 | **1** — `client/src/modules/parity/goldenCases.js` |
| golden races | 28 | 27 | **1** — `scripts/check-golden-races.mjs` |
| sim (world-fingerprint driver) | 79 | 79 | **0** |

Both exceptions are instrument-side and neither is a product file:

- `parity/goldenCases.js` names the seeds and cases; it is loaded because **my probe script imports
  it**, not because a race reads it. In the product those values come from the UI.
- `check-golden-races.mjs` is a **driver of a driver** — it reaches the engine through
  `goldenRace.mjs`. ★ **This is the up-step's one measured limit: it is one level.** The census found
  exactly one such file across three probes, it is an instrument that cannot change a shipped race,
  and it is already selected by the `golden-races` guard through that guard's own closure. **The
  product path has no equivalent**: `RaceScreen` is declared `export default function RaceScreen()` —
  **it takes no props at all**, so nothing above it can hand a race an argument, and its track comes
  from `track-editor/trackStorage.js`, which is inside the hull.

### Direction 2 — the boundary set, a CENSUS not a sample

**Selection rule, stated:** every tracked non-test file under `client/src/modules/` outside `camera/`
that the hull EXCLUDES — **all 25 of them**. That is the set where a wrong exclusion is likeliest and
costliest: the old blunt folder rule fired on exactly these and the hull does not.

**Result: 25 of 25 not loaded by the golden races; 24 of 25 not loaded by the shipped-path arm.** The
single exception is `parity/goldenCases.js`, the probe fixture above. Two that deserve naming because
their names alarm:

- `headlessRaceSimulator.js` — its own header says **"⚠️ SIMPLIFIED STATISTICAL MODEL — NOT THE GAME"**;
  it is used only by the `DiagnoseVerteilung` screen. Correct exclusion.
- `storage/trackLoader.js` / `storage/useServerTracks.js` — track geometry IS physics, so these were
  the real risk. They are not on the product's race path: `RaceScreen/index.jsx:45` takes the track
  from `track-editor/trackStorage.js`, which is **inside** the hull.

### Direction 3 — files the tool now calls INSIDE, probed

**Selection rule, stated:** every 8th file, in sorted order, of the 118 the hull gained — 15 files.

**14 of 15 are loaded by no headless probe.** The one exception is `raceActionStage.js`, one of the
five proven. Across the whole hull the split is **87 of 197 loaded by at least one headless probe, 110
by none** — 20 camera, 20 `scripts/` instruments, 19 screen `.jsx`, 13 screen `.js`, 6 drawing, 1
service, 31 other client modules.

★ **"Not loaded by a headless probe" is NOT "cannot change a race", and this report will not let it be
read that way.** No instrument in this repository runs the browser, so camera, drawing and HUD code
cannot be loaded by any of them. Those files are in the hull because the product's own race setup
imports them and a static walker cannot tell an argument-producer from a bystander. **That is the
deliberate over-inclusion, and section 8 is what it costs.** One thing the census does establish:
**all 79 files of the old hull are loaded by at least one probe** — nothing that was inside is a proven
over-inclusion by this test.

### ★ WHAT THE SAMPLE DOES NOT COVER

1. **The browser.** No probe here runs the camera, the renderer or React. Roughly 90 hull files are
   decidable only by a browser probe that does not exist. This is the same absence HULL-REACH-1 named
   and it is not closed.
2. **Every track, racer, field size and seed outside the fixtures.** The golden races are 2 pinned
   races; the shipped arm is searound / manta / 40 racers at 3 seeds (12 for the names work). A file
   that matters only on an open track, or at a field size the fixtures do not use, would read as
   unreachable here.
3. **Out-of-hull files beyond the 25.** The boundary set is a census of `client/src/modules/`. Files
   under `client/src/screens/` other than `RaceScreen`, under `server/`, and the rest of
   `client/src/services/` were checked only by the load-hook census, which is limited by point 1.
4. **Data.** JSON seeds and track records have no imports and are outside the hull by construction;
   they are answered separately by `scripts/lib/dataReach.mjs`, which the tool consults.

---

## 7 · ★ THE TOOL'S OWN SABOTAGE — and it found a real defect

Two sabotages, both restored, neither committed.

**(a) The up-step finds nothing** (`driversOf` stubbed to `[]`) — the hull silently reverts to the old
import-closure answer:

| what | result |
|---|---|
| `node scripts/engine-reach.mjs` | **exit 2**, `FAIL: the hull found NO drivers of …` |
| `--check client/src/modules/raceParams.js` | *"1 outside the hull (cannot reach the engine at all)"* — **the old lie, reproduced exactly** |
| `node --test scripts/engine-reach.test.mjs` | **4 of 18 RED** |
| `gen-engine-reach-doc --check` | **RED** — block out of date |
| `gen-ceremony-costs --check-counts` | **RED** — counts disagree with the repository |

**(b) The hull reports nothing at all** (`raceHull` stubbed to empty) — and this one found a defect:

```
$ node scripts/engine-reach.mjs --check client/src/modules/raceCore.js
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): client/src/modules/raceCore.js
exit 1
```

★ **The floor checks — empty hull, no drivers, unfollowable import — sat BELOW the `--check` branch, so
the one branch a caller acts on was the one branch with no floor under it.** The listing path refused
correctly (exit 2); `--check` answered **1**, silently, **about the engine itself** — and exit 1 is
what `.githooks/pre-commit:160` reads as "say nothing". **Fixed in commit `b5791137`:** both paths
consult the same floor first and refuse with exit 2. The regression test reproduces the shape for real
rather than with a stub — the up-step reads `git ls-files`, so a run with an emptied `PATH` finds no
drivers, which is precisely the "tree git cannot list" case the floor's own message names.

**The tool can fail, in five distinct ways, and each was made to fail.**

---

## 8 · ★ THE HULL'S SIZE, AND WHAT IT COSTS — measured against merges, not guessed

**79 → 197 files. A strict superset: the set difference in the losing direction is empty**, asserted
now by a test, and 118 files were gained. 20 drivers, computed on every run. The whole walk takes
**0.5 s**.

### What the tripwire now fires on, over real history

Method: for every first-parent merge into `origin/master` in the window, the files the merge brought in
(`git diff --name-only <sha>^1 <sha>`) are tested for membership in the old hull and the new one. The
hull sets are **today's**, applied to historical diffs — a file that did not exist then is simply not
in that diff, but a file that has since moved would be mis-attributed. Stated rather than smoothed.

| window | merges | tripped BEFORE | trips NOW | newly tripping |
|---|---|---|---|---|
| last **8 weeks** | 411 | **63 (15%)** | **115 (28%)** | **+52** |
| last **3 weeks** | 262 | **26 (10%)** | **53 (20%)** | **+27** |

**Where the new cost lands** (file-appearances in newly-tripping merges, 8-week window):

| area | count | top files |
|---|---|---|
| `scripts/` instruments | 44 | `render-fingerprint.mjs` (11), `camera-fingerprint.mjs` (7), `lib/raceDriver.mjs` (6), `parity/goldenRunner.mjs` (5) |
| `camera/` | 25 | `CameraDirector.js` (12), `cameraTimingComputation.js` (3) |
| `screens/RaceScreen/` | 16 | `index.jsx` (4), `renderRaceFrame.js` (4) |
| other `client/src` | 5 | — |

**In money:** the tripwire prints, it never blocks. Its advice is
`node scripts/fingerprint-default.mjs`, which is **229 s**. A committer who follows it on every newly
tripping merge pays roughly **52 × 229 s ≈ 3.3 hours over eight weeks**. Whether that is worth paying
is the owner's call, and section 9 is the reason it is not a simple yes.

### And what it BUYS, in the same history

Two merges in the last eight weeks touched a **proven** race-changing file and the old tripwire said
nothing:

- `c5e0cb8b` *Merge night/2026-09-07: the camera record describes the product…* — touched
  `client/src/modules/raceParams.js`
- `3cfaf1f3` *merge(names): LONG and MIXED rosters…* — touched `client/src/modules/racerNames.js`

Both now trip.

### ★ WHAT `verify` SELECTS — BEFORE AND AFTER: **UNCHANGED**, and that is deliberate

Asked through `routing.collect()`, the same resolver `verify` uses, for the five proven files plus
`camera/CameraDirector.js` and `scripts/lib/raceDriver.mjs`: **the selected guard set is
byte-identical before and after.** No guard's routing moved, because `closureOf` is untouched (§4).

The cost of this piece therefore lands **entirely on the pre-commit tripwire and on a person reading
it**, not on `npm run verify`'s wall clock. **That is a finding, not a relief**, and it is section 9.

---

## 9 · ★ THREE THINGS THIS PIECE FOUND AND DID NOT FIX — the owner's, all three

### 9a · The world fingerprint is BLIND to the file that decides every start position

`scripts/sim-fairness.mjs:1120` reads:

```js
const W_REF = Math.min(285, effectiveWidth);
```

with the comment *"W_REF cap at 285 matches the game's cap"*. That 285 is a **second home** for
`raceParams.js`'s `W_REF_MAX`. The sim does not import `raceParams.js`, so **the world fingerprint
cannot see a change to the file whose sabotage moves both golden races.** The same shape covers the
other four: the sim reads the `DEFAULT_*` objects directly, never the loaders, so a change to
`loadBaseSpeedConfig`'s logic moves a shipped race and no hash at all.

**Consequence for the tripwire's own advice.** The hook prints *"mint before you ship"* and points at
`fingerprint-default.mjs`. For a hull file the instrument cannot read, that produces a **green run that
proves nothing**. Now that the tripwire fires on those files, this misdirection is reachable in a way
it was not before. It is recorded in `SHIP-CEREMONY.md` as a named blind spot of the trigger.

This is a Sim-Browser Parity violation and a config value with two homes. **Not fixed here**: replacing
the literal with an import touches the world fingerprint's own driver, and this piece must not change a
race.

### 9b · Nothing routes on the hull

`fingerprint-default.mjs` declares `reach: [raceCore.js, sim-fairness.mjs]` and `verify` expands that
per entry. The hull is now a wider and truer set, and **no guard declares it.** Wiring it in was
considered and deliberately not done — for a correctness reason, not a cost one: per 9a the world
fingerprint is measurably blind to the very files that would newly select it, so selecting it would buy
229 s of green that proves nothing. **The right landing is 9a first, then a routing decision.** Both
are the owner's.

### 9c · Splitting `racer-types/index.js`

Section 5. Product code, stated and stopped.

---

## 10 · CHECKS

| check | result |
|---|---|
| `node scripts/check-golden-races.mjs` | **PASS** — 2 races, every position and time as recorded (314 ms) |
| `node --test scripts/engine-reach.test.mjs` | **PASS** — 19/19 (was 18; the replaced test and 5 new ones) |
| `node --test scripts/gen-ceremony-costs.test.mjs` | **PASS** — 7/7 |
| `npm run verify` (plain) | **PASS 13 / FAIL 0 / SKIP 21**, wall clock 159.7 s. The first run, before this report existed, failed exactly one guard — `check-doc-links`, on the two links `SHIP-CEREMONY.md` now makes to it |
| client suite (`client`, vitest) | **PASS** — 254 files, **4630 tests**, 274.9 s |
| server suite (`server`, alone) | **PASS** — 35 files, **836 tests**, 57.0 s |
| **fingerprints** | **NONE RUN, NONE MINTED.** No engine, camera or drawing file is touched by this branch, and `--check` on the branch's own diff selects no fingerprint guard. |

Guards `verify` selected for this branch (13): `check-doc-facts`, `check-hooks-installed`,
`check-doc-links`, `check-language-closed`, `check-index`, `check-config-claims`,
`check-fallback-agreement`, `ceremony-counts`, `check-measured-stamps`, `engine-reach-doc`,
`fingerprint-containment`, `check-writable`, `script-suite`. **`world-fingerprint`, `golden-races` and
`client-suite` are among the 21 skipped** — this diff touches no file any of them declares, which is
exactly what §8's "unchanged" means in practice. The client and server suites above were therefore run
by hand, not by routing.

**The suites were run on the branch, not only on the diff**, because a change to `engine-reach` changes
what every other guard is routed by and "verify skipped it" is not evidence that it passes.

---

## 11 · SOURCE HYGIENE

| file | lines before → after | what happened |
|---|---|---|
| `scripts/engine-reach.mjs` | 351 → 607 | the rule and its paragraph; `dynamicImportLiterals`, `resolveSpecifier`, `importEdges`, `withoutCommentLines`, `trackedSourceFiles`, `driversOf`, `raceHull`; the shared floor |
| `scripts/engine-reach.test.mjs` | 242 → 379 | 1 test replaced, 5 added |
| `scripts/gen-ceremony-costs.mjs` | 423 → 428 | reads the hull; one row relabelled and its 105 names replaced by a count |
| `scripts/gen-ceremony-costs.test.mjs` | 180 → 185 | one inverted assertion replaced |
| `scripts/gen-engine-reach-doc.mjs` | 299 → 307 | reads the hull; a false claim about routing corrected |
| `scripts/verify.mjs` | 1003 → 1003 | two lines: `engineReach()` → `raceHull()` |
| `docs/SHIP-CEREMONY.md` | 888 → 909 | generated counts; the struck-through bullet; the new blind spot |
| `docs/SIM.md` | 1347 → 1467 | generated block, 79 → 197 rows |

**What was REMOVED**

- `engineReach`'s default argument. It defaulted to the entry points, which read as "the hull" and is
  not; the parameter is now required so the ambiguous call cannot be written.
- The assertion *"the closure EXCLUDES presentation code"* and its `no /screens/` check. It was a true
  description of the import closure and a false description of what can change a race, and it had to
  go for the hull to widen — **replaced**, not deleted: the hull must still stop short of `App.jsx`,
  `main.jsx`, `SetupScreen` and `ResultScreen`, and must stay under 400 files.
- The assertion `folder > closure` in `gen-ceremony-costs.test.mjs`. It encoded the trigger's original
  selling point — the computed set is smaller than the blunt folder rule — and **HULL-FIX-1 makes it
  false**: 197 against 117. Replaced by the property the third count actually depends on.
- The 105 file names the ceremony's last row would now carry. Their one home is the generated block in
  `SIM.md`; the row counts them and links there.
- `hasDynamicImport`'s old meaning ("has any `import()`"). Narrowed to "has one that cannot be
  followed", which is a widening of the hull.

**NOTICED AND DELIBERATELY LEFT**

- **26 unresolvable static specifiers repo-wide, 12 extensionless.** The extension fallback fixes the
  real ones; the remainder are prose inside comments and template-literal fixtures in tests. Making an
  unresolvable specifier LOUD would be the honest next step and would fire on those false positives
  first, so it is a separate piece.
- **`scripts/lib/raceDriver.mjs`**, which HULL-REACH-1 named as neither proven nor argued, is now in
  the hull as a driver's import — but no sabotage was run on it here.
- The `--dry` plan wording still says "engine reach" in places where "race hull" would now be truer.

**No scratch file enters the repository.** The sabotage harnesses, the load hook, the outcome probe and
the cost scripts all live in `C:/tmp` and are named in this report so they can be rebuilt. Every
sabotage was applied and restored through `git checkout --`, and every restore verified with
`git diff --quiet`; the harness refuses to start on a dirty tree. `git stash` was not used.

---

## 12 · WHAT A LATER READER SHOULD NOT CONCLUDE

- **Not** that the hull is now correct. It is now correct in the direction that was measured, with a
  90-file browser-only region no instrument here can decide.
- **Not** that a green fingerprint clears a hull file. Section 9a: for at least five hull files, no
  fingerprint in this repository can see the change.
- **Not** that `verify` got stricter. It did not move at all (§8). The tool that ADVISES got truer; the
  gate did not change, and closing that gap is 9b.
