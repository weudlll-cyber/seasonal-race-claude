# RACE-PARAMS-2 — the knowingly-transcribed derivation has one home, and both mirrors are gone

Branch `night/2026-09-19`, piece 5. Date: 2026-09-19.
**Nothing minted, nothing merged, no shipped default touched, no behaviour changed** — which the four
fingerprints and the golden races are the check on, not the argument for.

---

## ★★ THE ONE LINE

> **Both mirrors were deleted, not one.** `scripts/camera-replay.mjs` and
> `scripts/parity/goldenRunner.mjs` now call the function the browser calls, and **all four
> fingerprints and both golden races come out unmoved.**

---

## 1 · WHAT WAS THERE, AND WHAT IT SAID ABOUT ITSELF

`client/src/screens/RaceScreen/index.jsx:554-613` held the step between *"a track, a world and a
racer type"* and *"the twenty fields `createRaceFromIdentity` takes"* — the effective width, the
`isOpen`-stamped behaviour config, the normal speed, the sprite geometry and the argument object.

**Two harnesses had transcribed it, and both said so in their own words:**

| site | its own comment |
|---|---|
| `scripts/camera-replay.mjs:165-168` | *"Race construction — RaceScreen's own derivation, **transcribed**. Every line below mirrors client/src/screens/RaceScreen/index.jsx race-init."* |
| `scripts/parity/goldenRunner.mjs:670-676` | arm C, *"the **REAL** browser core … this arm runs the ACTUAL RaceScreen init"* — while assembling that init's arguments itself |

★ **A knowingly transcribed derivation is the shape this repository has paid for repeatedly**: the
copies agree until one of them is edited, and the thing that would notice is one of the copies.
`goldenRunner`'s arm C is the sharper case — its whole claim is that it is not a mirror.

---

## 2 · ★ WHAT WAS REUSED RATHER THAN WRITTEN — CHECKED FIRST, AS INSTRUCTED

**Nothing new computes anything.** Before writing a line, the tree was searched for an existing home:

| needed | already existed | used |
|---|---|---|
| the sprite geometry | ★ `client/src/modules/raceParams.js` → `deriveSpriteGeometry` (ONE-HOME-RACE-PARAMS-1, 2026-09-07) | ★ **called, not reimplemented** |
| the body-narrow ceiling | `raceParams.js` → `W_REF_MAX` (W-REF-ONE-HOME-1) | reached through `deriveSpriteGeometry` |
| the normal speed | `client/src/modules/durationModel.js` → `normalSpeedFrom` | ★ **imported once, in the new function** — the browser no longer imports it at all |
| the race build itself | `client/src/modules/raceCore.js` → `createRaceFromIdentity` | unchanged, untouched |

★ **The new function lives in the module that already owned half of this** — `raceParams.js` — rather
than in a new file. Its header already said it owns *"the step between 'a racer type and a track' and
'the numbers `createRaceFromIdentity` takes'"*; this is the rest of that step.

---

## 3 · WHAT WAS BUILT

`client/src/modules/raceParams.js` → **`buildRaceCoreParams({...})`**. It returns exactly the object
`createRaceFromIdentity` takes, plus `displaySizeScale` — which is **not** one of its fields but the
browser's drawing scale, returned alongside because computing it twice is how the two come apart.

★ **It assembles; it does not build.** A builder that also built would make the two impossible to
test apart, and `camera-replay` needs the parts around the call as much as the call itself.

★ **It reads no storage and no configuration loader**, for the same reason `deriveSpriteGeometry`
does not: the product answers the display-size-override question from `localStorage`,
`camera-replay` answers it from the marker it is replaying, and the golden runner has none to answer.
Each hands the answer in — which is why `hasDisplaySizeOverride` is a parameter and not a lookup.

### The three call sites afterwards

| site | what it now does |
|---|---|
| `client/src/screens/RaceScreen/index.jsx` | keeps the `localStorage` override lookup, calls the builder, splits off `displaySizeScale`, passes the rest straight to `createRaceFromIdentity` |
| `scripts/camera-replay.mjs` | ★ **mirror deleted.** Its header no longer says "transcribed", because there is nothing left to transcribe |
| `scripts/parity/goldenRunner.mjs` (arm C) | ★ **mirror deleted.** The arm that claims to run the browser's init now shares its assembly as well as its call |

### ★ THE ONE THING THAT IS NOT IDENTICAL, NAMED RATHER THAN GLOSSED

The browser used to hand its own `behaviorConfig` OBJECT to `createRaceFromIdentity`; it now hands in
the same object and the engine receives the builder's spread COPY of it. **The contents are
identical** — the spread is exactly what all three sites already did to stamp `isOpen` — so the only
possible difference would be a later mutation of the browser's own variable reaching the engine
through shared identity. **Checked: there is none.** `behaviorConfig` is written at
`index.jsx:515-516` and read nowhere after the build. Named because "identical contents" and
"identical object" are different claims and only one of them is true here.

★ **The three other config blocks — `baseSpeedConfig`, `rowLayoutConfig`, `raceDynamicsConfig` — pass
through by reference untouched**, which is what the RACE-SAVE-3 note at `index.jsx:504-513` requires:
a recorded config must not be written into.

**Every file touched keeps its header comment, and each change carries the reason inline.** No dead
code and no dead variables were left: `effectiveWidth` and the `normalSpeedFrom` import are gone from
`RaceScreen/index.jsx`, and `normalSpeedFrom` is gone from `camera-replay.mjs`'s import list — all
three verified by `eslint`, which is clean on the changed files.

---

## 4 · ★★★ THE STOP CONDITION — MEASURED BEFORE AND AFTER

This touches drawing-adjacent code, so the four were run rather than argued about.

| role | record | before this piece | ★ after |
|---|---|---|---|
| world | `b6cfd1daf1756f61` | `b6cfd1daf1756f61` | ★ **`b6cfd1daf1756f61` — unmoved** |
| world-off | `744bec11644978bb` | `744bec11644978bb` | ★ **`744bec11644978bb` — unmoved** |
| camera | `5d91f59b9ada16cc` | `5d91f59b9ada16cc` | ★ **`5d91f59b9ada16cc` — unmoved** |
| render | `06671c1d13850cd7` | `06671c1d13850cd7` | ★ **`06671c1d13850cd7` — unmoved** |

★★ **All four, by each role's own `reproduce` command, and all four match the record.** The world
pair is the race; the camera and render pair are the shot and the draw sequence — which are the two
that would move first if a drawing-adjacent assembly had shifted by one field.

★ **And the golden races, which are the direct check on `goldenRunner`'s arm C:**

```
check-golden-races: closed-garden-path-12 — 12 racers, 35.35 s of racing in 2439 frames
check-golden-races: open-river-run-6      —  6 racers, 30.00 s of racing in 1898 frames
check-golden-races: 2 race(s), every finishing position and time as recorded (849 ms).
```

★★ **That is the strongest single check available for this change**: the golden fixtures pin every
input, arm C produces the outcome, and the runner that produces it is one of the two files this piece
rewrote. If the assembly had moved by one field, this is where it would show.

---

## 5 · ★ WHAT WAS NOT CONVERTED, AND WHY — A CENSUS, NOT AN OMISSION

`createRaceFromIdentity` is called with a hand-assembled object at **eight further sites**, found by
searching rather than remembered:

| site | converted? | why not |
|---|---|---|
| `scripts/camera-fingerprint.mjs:167` | ★ **NO — deliberately** | ★★ it is one of the four fingerprints this change is MEASURED AGAINST. `scripts/lib/raceDriver.mjs`'s own header states the rule: *"a tool that changes in the same commit it is meant to validate cannot validate it"* |
| `scripts/render-fingerprint.mjs:329` | ★ **NO — deliberately** | the same rule, the same commit |
| `scripts/lib/raceDriver.mjs:390` | not in scope | the shared measurement driver, with its own identity contract; a separate piece |
| `scripts/golden/goldenRace.mjs:107` | not in scope | the golden RECORDER; changing it in the same commit as the runner would remove the independence the fixtures rest on |
| `scripts/check-ending-frame.mjs:267` | not in scope | touched by piece 2 tonight; two changes to one file in one night is how a bisect stops working |
| `scripts/finish-band-truth.mjs:260` | not in scope | the same |
| `scripts/exp-anchor-truth-ab.mjs:150` | not in scope | an experiment |
| `scripts/diag/start-formation.mjs:210` | not in scope | a diagnostic |

★ **The brief named three sites and all three are done.** The eight above are written down so the
next reader inherits a list rather than a search — and the first two of them are a **rule**, not a
backlog item.

★ **One `deriveSpriteGeometry` call stays in `goldenRunner.mjs`, at `:487`.** It belongs to a
DIFFERENT arm (the sim arm), needs only `physicalSpriteSize`, and is not part of the browser
assembly. Left on purpose and named here so it does not read as a miss.

---

## ★★ WHAT `verify` CAUGHT THAT THE GOLDEN RACES DID NOT — A DEFECT OF MINE, RECORDED

The first `verify` run on this branch went **21 PASS / 4 FAIL**, and one of the four was **mine and
real**:

```
FAIL  src/modules/parity/replay.test.js
ReferenceError: deriveSpriteGeometry is not defined
  ❯ execute ../scripts/parity/goldenRunner.mjs:487:34
  ❯ simArm ../scripts/parity/goldenRunner.mjs:810:10
```

★ **I converted arm C and removed the `deriveSpriteGeometry` import — and the SIM arm at `:487` still
used it.** §5 above names that call as deliberately left alone; what it did not do was keep its
import. Fixed by importing both from the one module, with the reason at the import.

★★ **`check-golden-races` had PASSED**, because it exercises arm C and never reaches the sim arm.
**The golden races were the strongest check available for what I changed and they were not the whole
check** — that is worth recording, because §4 above presents them as the direct evidence and they
are, for arm C only.

### A second finding of mine, caught by the same run

`check-fallback-agreement` RULE F went red on **three symbol citations in `docs/FORCE-MAP.md`** that
point into `RaceScreen/index.jsx` by line — my edit shifted them:

| citation | was | now |
|---|---|---|
| A0 base speed | `index.jsx → bodyFillNarrow` at L569 | ★ **`index.jsx → baseSpeedConfig` at L581** — the old anchor symbol no longer exists in that file at all; this piece moved it into `raceParams.js` |
| A2 row bonus | `index.jsx → rowLayout` at L642-L661 | `index.jsx → rowLayoutConfig` at L583 |
| trajectory | `index.jsx → hudCapHit` at L935-L945 | `index.jsx → hudCapHit` at L934-L944 |

★ **This is the guard doing exactly what its own header says a paired citation is for**: *"a line
number cannot be wrong out loud, and this can."*

### The final state

```
PASS 24   FAIL 1   SKIP 9
VERIFY FAILED — 1 guard(s) failed: check-measured-stamps
```

★ **The one failure is piece 3's, on two true findings, and nothing was re-stamped.** ★ The other two
first-run failures — `script-suite` and one `client-suite` entry — **passed on their own**
(`484 pass / 0 fail` and `4713 pass / 0 fail`); both had reported an exit status of `null`, which is a
killed process under the parallel load rather than an assertion.
