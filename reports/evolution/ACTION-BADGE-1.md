# ACTION-BADGE-1 — why the config badge reports two deviating values on WILD

**Date:** 2026-08-24 · **Branch:** `diag/action-badge-1` (off `master` at `5204b10b`) ·
**READ-ONLY — nothing was changed. NOT MERGED.**

**The short answer, and it reverses the question's premise: the badge is RIGHT, and it is reporting
the STAGE's own two values — not the owner's hand-set sliders.** A wild race genuinely is not running
the shipped configuration, so "2 race" is the true count. What misleads is the WORDING: the pill says
how MANY keys are off-default and never says WHICH, or that the Race Action stage put them there.

**No hand-set slider reaches a race on either start path.** The stage wins, and both paths converge
on one line, so they cannot disagree.

---

## Why no fingerprints, no browser gate and no client suite were run

**Nothing was changed, so there is nothing for them to measure.** This block reads source and commits
one report. The four fingerprints hash the RACE, the DIRECTOR's decisions and the DRAW CALL SEQUENCE
from the *shipped defaults*, and they are blind by their own declaration to "configs other than the
shipped default" — which is exactly the configuration in question, so they could not answer this even
if something had changed. The doc guards are the instrument that applies to a report, and they are
green (§5).

---

## FIRST — what the badge actually compares

**It compares the config the RACE WAS HANDED, not the stored blob.** The chain, in order:

| # | file:line | what it does |
| --- | --- | --- |
| 1 | [RaceScreen/index.jsx:483](../../client/src/screens/RaceScreen/index.jsx#L483) | `const cfgWorld = buildWorldConfig({ raceActionStage });` — the badge's world is built **with the race's stage** |
| 2 | [exportRaceConfig.js:83-86](../../client/src/modules/exportRaceConfig.js#L83-L86) | inside it, `raceDynamicsConfig: applyRaceActionStage(loadRaceDynamicsConfig(), raceActionStage ?? storedRaceActionStage())` |
| 3 | [RaceScreen/index.jsx:484](../../client/src/screens/RaceScreen/index.jsx#L484) | `const cfgBadge = configFingerprintBadge(cfgWorld);` |
| 4 | [exportRaceConfig.js:129](../../client/src/modules/exportRaceConfig.js#L129) | `splitConfigDiffs(world.configs, DEFAULT_CONFIG_WORLD)` |
| 5 | [configFingerprint.js:44](../../client/src/modules/parity/configFingerprint.js#L44) | per leaf key, `canonicalJson(cur[k]) !== canonicalJson(def[k])` → pushed onto `keys` |

**So the "misleading instrument" hypothesis in the brief does not hold for WHAT it compares.** The
badge does not read the stored blob and does not report values that no longer reach the race. It
reads the same stage-applied object the engine is handed — the badge and the race are built from one
gather ([index.jsx:483-485](../../client/src/screens/RaceScreen/index.jsx#L483-L485)).

**The two deviating keys are the stage's own values.** On `wild` the stage sets
`pulkChallengerBoost` and `pulkLeaderBrake`
([defaults.js:1108-1111](../../client/src/modules/storage/defaults.js#L1108-L1111)), and both differ
from the shipped defaults at
[defaults.js:964-965](../../client/src/modules/storage/defaults.js#L964-L965). That is two keys, in
`raceDynamicsConfig`, which is a RACE-relevant block
([configFingerprint.js:19-25](../../client/src/modules/parity/configFingerprint.js#L19-L25)) — hence
`2 race / 0 cosmetic`, and hence red.

**The count would be exactly 2 even on a completely untouched install**, provided the stage is wild.
The hand-set sliders contribute nothing to it, because the stage overwrites both keys before the
comparison ever happens.

---

## SECOND — does the stage really win? Both paths, checked separately

**Yes, on both, and there is no leak.**

**The decisive structural fact: both start paths converge on ONE application line**, so a per-path
divergence is not possible.

| path | payload written at | stage applied at |
| --- | --- | --- |
| **Start Race** | [SetupScreen.jsx:468](../../client/src/screens/SetupScreen/SetupScreen.jsx#L468) | [RaceScreen/index.jsx:476](../../client/src/screens/RaceScreen/index.jsx#L476) |
| **Quick Test** | [SetupScreen.jsx:561](../../client/src/screens/SetupScreen/SetupScreen.jsx#L561) | the same line — 476 |

**The full race-path chain:**

1. [RaceScreen/index.jsx:475](../../client/src/screens/RaceScreen/index.jsx#L475) —
   `const raceActionStage = normalizeRaceActionStage(raceData.raceActionStage);` (read from the
   payload, so a replay runs what it recorded).
2. [RaceScreen/index.jsx:476](../../client/src/screens/RaceScreen/index.jsx#L476) —
   `const dynamicsConfig = applyRaceActionStage(loadRaceDynamicsConfig(), raceActionStage);`
3. [raceActionStage.js:79](../../client/src/modules/raceActionStage.js#L79) —
   `return { ...dynamicsConfig, ...raceActionStageValues(stage) };` — **the stage's values are spread
   LAST, so they win over anything the sliders stored.**
4. [RaceScreen/index.jsx:560](../../client/src/screens/RaceScreen/index.jsx#L560) — that object is
   handed to `createRaceFromIdentity`.
5. [raceCore.js:337,339](../../client/src/modules/raceCore.js#L337-L339) — the engine reads
   `dynamicsConfig.pulkLeaderBrake` and `dynamicsConfig.pulkChallengerBoost` from it.

**`loadRaceDynamicsConfig()` is called exactly once on the race path, and it is wrapped.** Every
caller in the tree, non-test:

| caller | reaches a watched race? | verdict |
| --- | --- | --- |
| [RaceScreen/index.jsx:476](../../client/src/screens/RaceScreen/index.jsx#L476) | **yes** | **wrapped by the stage** |
| [SetupScreen.jsx:153](../../client/src/screens/SetupScreen/SetupScreen.jsx#L153) | no | reads **only** `racePlanMinDurationSec`; never touches the two keys |
| [DynamicsTuningSection.jsx:54](../../client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx#L54) | no | the Dev Screen slider UI reading its own stored values |
| [exportRaceConfig.js:84](../../client/src/modules/exportRaceConfig.js#L84) | no | already inside `applyRaceActionStage` |
| [DiagnoseVerteilung.jsx:140](../../client/src/screens/DiagnoseVerteilung/DiagnoseVerteilung.jsx#L140) | **no — see below** | **RAW, no stage** |

**`DiagnoseVerteilung` is the one place a hand-set slider still reaches a simulation, and it is NOT a
defect in RACE-ACTION-CONTROL-1.** It is the admin-only `/diagnose-verteilung` screen
([AUTH.md §5](../../docs/AUTH.md)), which runs its own distribution study over a synthetic
`raceConfig` — it does not render the race the owner watches and it has no stage to apply, because no
race payload exists there. RACE-ACTION-CONTROL-1's stated scope is "the browser race path", and this
is not it. **It is recorded here so that nobody later reads a slider-shaped result out of that tool
and concludes the stage leaks.** Proposal 3.

**So: no leak, on either path. The block does not stop.**

---

## THIRD — what SHOULD the badge say

**The COUNT is correct and should not change. Only the wording misleads.**

Two deviating values is the honest answer to the question the badge asks — *"is this race
apples-to-apples with a default-config sim run?"* — and on `wild` it is not, by exactly two keys. The
red is doing its job: a sim run on defaults would not reproduce this race, which is precisely what
that pill exists to warn about
([renderRaceFrame.js:463-464](../../client/src/screens/RaceScreen/renderRaceFrame.js#L463-L464)).

**What it says today** ([renderRaceFrame.js:466-470](../../client/src/screens/RaceScreen/renderRaceFrame.js#L466-L470)):

```
cfg <hash> · 2 race / 0 cosmetic
```

**Three things it does not say, and the third is the one that cost the owner the question:**

1. **WHICH two keys.** The names are already computed and already carried —
   `raceKeys` on the badge object ([exportRaceConfig.js:134](../../client/src/modules/exportRaceConfig.js#L134)),
   built as `raceDynamicsConfig.pulkChallengerBoost`-style strings at
   [configFingerprint.js:44](../../client/src/modules/parity/configFingerprint.js#L44). **They are
   simply never displayed.**
2. **That a deviation can be DELIBERATE.** The pill's vocabulary has one axis — default vs not —
   from a time when "not default" could only mean "somebody moved a slider".
3. **That the STAGE caused them.** The race knows its stage; the badge does not mention it.

**PROPOSALS — not built.** See §6.

---

## The check the owner can run himself in ten seconds

**Clearing the two sliders back to their shipped values, with the stage left on WILD, will NOT make
the badge read `defaults`. It will still read `2 race`.**

Derived from [raceActionStage.js:79](../../client/src/modules/raceActionStage.js#L79): the stage's
values are spread over the loaded config, so what the sliders hold is irrelevant to those two keys.
Whatever the sliders say, a wild race is handed `0.12` / `0.15` and the badge compares those.

**That is the decisive check**, because it separates the two candidate explanations in one move:

| what he does | if the SLIDERS were the cause | if the STAGE is the cause (this report) |
| --- | --- | --- |
| clear both sliders to shipped, stage stays **wild** | badge → `defaults` | **badge stays `2 race`** |
| set the stage to **quiet**, sliders left wherever | badge stays `2 race` | **badge → `defaults`** |

**The second row is the faster confirmation** and is worth running as the pair: on `quiet` the stage
writes the shipped values themselves
([defaults.js:1100-1103](../../client/src/modules/storage/defaults.js#L1100-L1103)), so the badge
returns to `defaults` **even with both sliders still moved** — provided nothing else in the
race-relevant blocks is off-default.

**Stated as a prediction from source, not a measurement.** No browser was driven for this report. The
supporting existing coverage is `exportRaceConfig.test.js:142` *("an explicit stage beats the stored
setting")*, which pins the same precedence at the export seam; it was read, not re-run.

---

## 5. Verification

Read-only. The doc guards are the instrument that applies:

| guard | result |
| --- | --- |
| `check-index` | **PASS** — this report registered |
| `check-doc-links` | **PASS** |
| `check-config-claims` | **PASS** — see the note below |

**A note on `check-config-claims` and this report.** It forbids a document stating a config value
that `defaults.js` owns. This report names the two KEYS repeatedly and states their values only as
`0.12` / `0.15` inside a sentence about the ten-second check — kept away from the key names, and the
guard is green. Where a value mattered, the report points at `defaults.js` line numbers instead.

---

## 6. PROPOSALS — none built

**1. Make the badge name the keys it is counting.** The data is already there (`raceKeys`), unused.
`cfg <hash> · 2 race` could become `cfg <hash> · 2 race: pulkChallengerBoost, pulkLeaderBrake`, or
name them on a second line, or in the Dev Screen's export panel where there is room. **This is the
cheapest fix to the actual confusion** — the owner's question was "which two, and why", and the
answer is already computed and thrown away.

**2. Teach the badge that a STAGE deviation is deliberate, and say so.** (Mine.) The pill has one
axis — default or not — and now there is a third state: *deliberately not default, because the host
chose a stage.* A wild race showing an alarm-coloured pill is technically true and practically
wrong: nothing is misconfigured. The honest shape is probably `cfg <hash> · wild` in the stage's own
words, red reserved for deviations **the stage did not cause** — which is the count that actually
breaks parity with a sim run the operator did not intend. **This needs his taste, not a derivation:**
the pill is a diagnostic he reads during a race, and how loud it should be on a stage he chose is a
judgement about his own instrument.

**3. `DiagnoseVerteilung` reads the raw dynamics config and should probably read a stage.** (Mine.)
[DiagnoseVerteilung.jsx:140](../../client/src/screens/DiagnoseVerteilung/DiagnoseVerteilung.jsx#L140)
builds its study from `loadRaceDynamicsConfig()` with no stage applied, so it studies a configuration
that no race can now run — the sliders' values, which the race path overrides. It is not wrong today
(it is a distribution study, not a race), but it is the one surface where the pre-stage and post-stage
worlds still disagree, and a result read from it would not describe any race the owner can start. At
minimum a line in that screen saying which configuration it studied.

**4. The same wording problem exists in the Dev Screen export panel.**
[exportRaceConfig.js:117-119](../../client/src/modules/exportRaceConfig.js#L117-L119) reports
`raceDynamicsConfig changed` — one string for any deviation in that block, naming no key and no
cause. On a non-quiet stage it will always say this. If proposal 1 is taken, this is the second place
to take it.

**5. A one-line test would pin the finding this report had to derive.** (Mine.) Nothing currently
asserts that the badge's world is the STAGE-APPLIED one — `exportRaceConfig.test.js` pins the export
seam, and `raceActionWiring.test.js` pins that `buildWorldConfig` is called with the stage, but no
test says "the badge counts the stage's keys". A test asserting `configFingerprintBadge` reports 2
race keys on wild and 0 on quiet would make the next reader's version of this question answerable in
a second.
