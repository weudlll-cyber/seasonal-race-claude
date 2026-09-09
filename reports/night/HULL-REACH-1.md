# HULL-REACH-1 — the hull is narrower than "can change a race", in both directions

Night chain 2026-09-08, piece 5 · branch `night/2026-09-08` · **REPORT ONLY. `engine-reach` is not
changed, the hull is not widened, nothing is minted.**

**Why this matters more than it looks:** `engine-reach` decides whether a change can reach the race
engine, and every minting decision rests on its answer — including this chain's own camera mint.

---

## THE PROBE, AND WHY IT IS THE GOLDEN RACES

`node scripts/check-golden-races.mjs` — two pinned races, **289 ms**, and it fails on any change to a
finishing position or time. Cheap enough to sabotage a file per run, and it is the project's own
definition of "the race moved".

★ **A FAILED SABOTAGE IS NOT A FINDING.** Every "did not move" below is backed by a **reachability
probe** — a module-level `throw` — that says whether the file is loaded by the engine path at all.
Without it, an inert mutation and an unreachable file look identical. **My first round produced two
such false greens** (`lapUtils` guarded on `t > 1e9`, which is never true, and `randomInt` mutated by
`+0`); both are discarded and re-run semantically below.

The current hull is **79 files**.

---

## ★ DIRECTION 1 — OUTSIDE THE HULL, AND THEY CHANGE THE RACE

| file | in hull? | sabotage | golden | how the probe reaches it |
|---|---|---|---|---|
| `client/src/modules/raceParams.js` | **OUT** | `W_REF_MAX` 285 → 200 | **RED** | `goldenRace.mjs:51` imports `deriveSpriteGeometry`, called at `:98` |
| `client/src/modules/raceActionStage.js` | **OUT** | `raceActionStageValues` returns a changed `pulkLeaderBrake` | **RED** | `goldenRace.mjs:46` imports `applyRaceActionStage` |

**Two of two sampled out-of-hull input-producers moved both golden races.** This re-establishes what
MINT-CAMERA-1 recorded about `raceParams.js` — by sabotage, not by repeating the sentence.

### ★ THE MECHANISM, NAMED WITH ITS ADDRESS

It is **not** a dynamic import, a re-export, or a path the walker fails to follow. It is the
**direction of the graph**.

`engine-reach.mjs:45` sets `ENTRY = client/src/modules/raceCore.js` and walks the transitive closure
of what that file **imports**. `raceParams.js` and `raceActionStage.js` are not imported by
`raceCore.js` — they are imported by its **callers**, which compute values and pass them **in** as
arguments to `createRaceFromIdentity`.

> **A closure walked from `raceCore`'s imports cannot see the modules that produce `raceCore`'s
> inputs.** They sit on the caller side of the arrow.

`raceParams.js` says so about itself: its header calls `physicalSpriteSize` **"PHYSICS, not
drawing"**, because it feeds `rowGapPx` and `rowCount` and therefore decides where every racer
starts.

### The class is larger than the two proven cases

`RaceScreen/index.jsx` — the product's own race setup — imports **25 modules that lie outside the
hull**. Most are camera or display. But these are input producers of the same shape:

| module | what it feeds | status here |
|---|---|---|
| `raceParams.js` | sprite geometry → row layout → start positions | ★ **SABOTAGE-PROVEN** |
| `raceActionStage.js` | `pulkLeaderBrake` / `pulkChallengerBoost` → dynamics | ★ **SABOTAGE-PROVEN** |
| `baseSpeedConfig.js` | `loadBaseSpeedConfig()` → `normalSpeedPxPerSec` | **ARGUED, not proven** |
| `rowLayoutConfig.js` | `loadRowLayoutConfig()` → `rowConfig` | **ARGUED, not proven** |
| `racerNames.js` | the roster's names | **ARGUED, not proven** |

★ **The last three are NOT sabotage-proven, and that is stated rather than glossed.** No headless
probe in this repository imports them: `goldenRace.mjs` pins its own roster and passes its own
configs (deliberately — it is what keeps the fixture isolated from the shipped defaults), and
`sim-fairness.mjs` imports none of them. They are reachable only through the browser path, which no
instrument here drives. **Their argument is strong** — `goldenRace.mjs:40-42` states in its own words
that *"A racer's NAME is physics: `stablePairBit` hashes it to break avoidance symmetry, so renaming
a racer changes who wins"*, and the golden fixture pins names for exactly that reason — but an
argument is not a sabotage, and this report does not promote it to one.

---

## ★ DIRECTION 2 — INSIDE THE HULL, AND THEY CANNOT

A tool that over-reports costs runs; one that under-reports costs correctness. Both were measured.

### Three files are in the hull and are never loaded at all

| file | in hull? | module-level `throw` fired? |
|---|---|---|
| `client/src/services/api.js` | IN | **not loaded** |
| `client/src/services/racerApi.js` | IN | **not loaded** |
| `client/src/services/apiClient.js` | IN | **not loaded** |

**The edge that puts them there, with its address:** `client/src/modules/racer-types/index.js:75-82`
statically imports `fetchRacers`, `createRacer`, `updateRacer`, `deleteRacer`, `uploadRacerSprite`
from `services/racerApi.js` and `API_BASE_URL` from `services/api.js`. The racer-type **registry** is
a genuine engine input — the engine needs racer speeds and sizes — but the registry also carries the
**network path for editing racer types from the UI**, and a static import walker cannot tell the two
halves apart. So the whole HTTP layer is pulled into the race engine's hull by a module that the
engine needs for an entirely different reason.

### Two more are loaded but inert

| export | in hull? | loaded? | semantic sabotage | golden |
|---|---|---|---|---|
| `camera/lapUtils.js` → `currentLap` | IN | **LOADED** | always returns `1` | **green — did not move it** |
| `utils/RandomHelper.js` → `randomInt` | IN | **LOADED** | always returns `min` | **green — did not move it** |
| `raceStep.js` | IN | **LOADED** | (not mutated — the shared t-update, in-hull by construction) | — |

★ **Stated precisely: the EXPORT is inert for this probe, not the file.** `lapUtils` also exports
`lapProgress`, and `RandomHelper` also exports `shuffle`, and neither was mutated. "This module is
inert" would be a stronger claim than the measurement supports.

---

## THE COUNT, AND WHAT IT IS A COUNT OF

- **Outside the hull but able to change a race: 2 of 2 sampled** — both moved both golden races.
  Three more of the same shape are named and argued but not proven, because no headless probe reaches
  them.
- **Inside the hull but unable to change a race: 3 never loaded, plus 2 exports loaded and inert** —
  5 of 6 sampled in-hull items failed to move the race.

This is a **sample**, not a census. A census would need a probe that exercises the browser's setup
path, which does not exist in this repository today. **That absence is itself the reason the two
directions have gone unnoticed.**

---

## ★ WHAT IS NOT DONE, AND WHY

**`engine-reach` is not changed and the hull is not widened.** The obvious repair — add the callers'
input-producers to the entry set — is the owner's decision, and a wrong widening costs every future
run: `RaceScreen/index.jsx` alone would drag 25 modules in, most of them camera and display files
that cannot change a race, and the hull's whole value is that it is 79 files rather than the blunt
"everything under `modules/`".

The narrower repair — declaring the input producers explicitly, the way
`fingerprint-default.mjs` already declares `reach: [raceCore.js, sim-fairness.mjs]` and
`engine-reach.mjs:62` reads that declaration — is the shape the tool already supports. **It is named
here and not built.**

**What this means for tonight's mint:** MINT-CAMERA-1 ran `engine-reach --check` and got "outside the
hull" for its changed paths. That answer is unaffected by this finding — its paths were
`scripts/*.mjs` and documents, none of them input producers — and the mint's real evidence was that
world, world-off and render were **measured** unmoved, not that `engine-reach` said so.

## CHECKS

```
node scripts/engine-reach.mjs --check reports/night/HULL-REACH-1.md reports/night/INDEX.md

ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
```

Golden races were green **before** the sabotage series (the harness refuses otherwise) and green
after every restore. **Every sabotage was restored and the restore verified** with `git diff
--quiet`; one restore failed on an OneDrive `PermissionError` mid-run and was repaired with `git
checkout --`, which is why the later rounds restore through git rather than by writing the file back.

## SOURCE HYGIENE

**No repository file is changed by this piece.** Every mutation was applied and reverted; the working
tree carries only the chain's temporary hold arm, which is removed at the end.

**Noticed and left, outside this piece:** `scripts/lib/raceDriver.mjs` is also outside the hull and
builds races for many instruments, but no probe here imports it, so it is neither proven nor argued.
