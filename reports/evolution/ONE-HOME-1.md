# ONE-HOME-1 — no second definition, anywhere

**Branch:** `fix/one-home-1`, off master `1b65b668`. **No default value changed. No behaviour
changed.** All four instruments measured and byte-identical.

```
check-fallback-agreement   14 disagree  ->  0        exception list: 11 entries -> EMPTY
```

| instrument | before | after |
| --- | --- | --- |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` |
| CAMERA | `d9f45a4aea0e5778` | `d9f45a4aea0e5778` |
| RENDER | `1274c7e8444238e3` | `1274c7e8444238e3` |

---

## THE RULING, AND WHY IT DISSOLVED THE QUESTION

The owner rejected *"should a missing setting mean OFF or the shipped value"* on the grounds that
**no setting is ever missing** — every loader walks the full key set of its defaults, so the running
game cannot lack a key. The fallbacks exist so a function can be called **without a config object at
all**, and the only callers that do that are tests and harnesses.

**So reachability stopped being the question.** Three nights of "is this branch reachable?" were
answering the wrong thing: the rule is that **no second definition of a value exists**, whatever its
current value and whoever can reach it.

---

## THE PER-KEY TABLE

Every caller was read, not assumed. `dynamicsConfig` reaches `createRaceFromIdentity` from nine
callers — the browser and `DiagnoseVerteilung` through `loadRaceDynamicsConfig()`, six harness
scripts through `DEFAULT_CONFIG_WORLD.raceDynamicsConfig` (which **is**
`DEFAULT_RACE_DYNAMICS_CONFIG`, checked by identity), and two tests through the defaults directly.
`sim-fairness.mjs` does not call it at all; its own `createRacePlan` call was checked separately.

| # | key | file | shipped path reaches the fallback? | test against the literal? | outcome |
| --- | --- | --- | --- | --- | --- |
| 1–6 | `chaosSteer` · `bandBias` · `gapRerollEnabled` · `phaseSplitBonusEnabled` · `pulkCeilingCap` · `enableRowEnvSmooth` | `raceCore.js` | no | no | **reads the home** |
| 7–8 | `gapRerollThresholdLengths` · `ceilingCap` ternaries on the same keys | `raceCore.js` | no | no | **reads the home** |
| 9–11 | `pulkLeaderBrake` · `pulkChallengerBoost` · `pulkBoostHeadroom` | `raceCore.js` | no | no | **reads the home** |
| 12–13 | `maxLateralAccelPerStep` · `softSteeringObstacleMargin` | `raceBehavior.js` | no | no | **reads the home** |
| 14 | `b2AttackHeroes` | `racePlanner.js` | no | no | **reads the home** |
| 15–19 | `b2AttackHeroes` · `b2AttackPeakRank` · `b2AttackFinalRank` · `b2AttackProgress` · `b2AttackResolveProgress` | `heroCurveGenerator.js` `GENERATOR_CONFIG` | no | **yes — see below** | **reads the home** |
| 20–21 | `b2AttackProgress` · `b2AttackFinalRank` at the cast site | `heroCurveGenerator.js` | no | no | **reads the home** |
| 22–27 | `gapRerollEnabled` · `phaseSplitBonusEnabled` · `racePlanBonusStrengthMultiplier` (6 sites) | `DynamicsTuningSection.jsx` | no | **yes — see below** | **reads the home** |

**Nothing was kept.** No site turned out to be unable to read the home: `heroCurveGenerator.js`
already imported `DEFAULT_RACE_DYNAMICS_CONFIG`, `raceBehavior.js` already imported
`DEFAULT_RACE_BEHAVIOR_CONFIG` through `raceBehaviorConfig.js`, and no new hull edge was created.

**The six booleans are a reversal of MIRROR-CENSUS-2**, which *deleted* their `?? false`. Deletion
made a bare caller fall to `undefined`, which is falsy — the feature ran OFF. **That is a second
definition by omission**, and the ruling forbids it. Two ternaries reading the raw value had the same
shape and were missed by that block entirely.

---

## WHAT THE OBJECT-LITERAL SEARCH FOUND

The guard's `NULLISH` pattern matches scalars and `SCREAMING_CASE` names, so an object-literal copy
is invisible to it. A full scan of every non-test client module, keyed on the object-valued defaults:

| result | count |
| --- | --- |
| `?? { … }` fallbacks on an object-valued default | **1 live** (`heroCurveGenerator.js:225`) — the other two were already spreads of the home |
| object-literal **assignments** of an object-valued default | **1 live** (`GENERATOR_CONFIG.b2AttackProgress`) |
| everything else matching `?? {}` | empty-object guards on keys with **no default** — not mirrors at all |

**Then a second scan found a class nobody had named.** The guard checks **fallbacks**; it has no
model of a module-level object that simply **assigns** a shipped value. `GENERATOR_CONFIG` held
**five** such keys — `b2AttackHeroes`, `b2AttackPeakRank`, `b2AttackFinalRank`, `b2AttackProgress`,
`b2AttackResolveProgress` — and **all five agreed with the home**, so no guard would ever have said
a word.

**Three of them were invisible to every previous count.** DECLARED-HOLES-1 reported "four copies of
`b2AttackProgress`, two still live" and that was itself short: the true figure for the family is
five keys in one object plus two fallbacks.

A repo-wide scan for the same shape elsewhere found **zero** — after excluding `min`/`max`, which are
real keys of `DEFAULT_BASE_SPEED_CONFIG` and also ordinary English words appearing as 80 slider
bounds. (`check-config-claims` skips those two by name for exactly this reason.)

---

## THE TESTS

### `oneHome.test.js` — new, 8 assertions

**WHAT BREAKS IF IT IS DELETED:** the ruling goes back to being a sentence in a report. The guard
catches a literal that *disagrees*; it is blind to an object-literal copy and to **a copy that
currently agrees** — and every one of the five found here agreed.

**The file asserts two different kinds of thing, and the split was found by sabotage rather than
designed.** Restoring `b2AttackProgress: { start: 0.4, end: 0.7 }` failed **none** of the value
assertions, because that literal equals the shipped block today. **A copy that agrees is invisible at
runtime, by definition.** So one test reads the **source** — and that is the one that fails on a
re-typed copy — while the rest read the values a bare caller receives.

The source assertion is also what caught `b2AttackPeakRank: 5`, a fifth second definition I had
missed.

### Two tests rewritten from a literal to the rule

**`RaceTuningSection.test.jsx` mocked the defaults with a hand-typed twelve-key copy** — a second
definition living in a test. It broke the moment the component started reading the home: the copy
lacked `racePlanBonusStrengthMultiplier`, so a readout hit `undefined.toFixed(1)` and every test in
the file failed. The comment immediately below it records the *same class* biting once before, for
`frameTimingConfig`. The mock now spreads the real defaults through `importActual`; only the loader
is stubbed.

Two of its assertions then failed **because they had pinned the mock's invented numbers**, not the
shipped world:

- `restores reRollVariationPercent to 58` — 58 was never the shipped default. Now asserts
  `DEFAULT_RACE_DYNAMICS_CONFIG.reRollVariationPercent`.
- `4 re-rolls` / `12s` — derived from the mock's invented divisor and transition. Now reads the home
  for the one value the preview prints directly, and asserts the shape of the rest. The schedule is
  deliberately **not** re-derived in the test: that would be a second definition of the production
  formula.

---

## A FINDING THE RULING EXPOSED — THE SHIPPED HERO CAST IS NOT SEPARATED

`heroCurveGenerator.test.js` asserted *"emitted hero curves are mutually separated"*. It passed for
one reason: a bare call ran with `b2AttackHeroes: 0`, because `GENERATOR_CONFIG` carried its own copy
of that key and the copy said **off**. **The test asserted separation over a cast that never
contained attackers, while the shipped game always casts three.**

With the copy gone, the attackers appear and `checkSeparation` **fails for the full cast**. Verified
that this is inherent and not introduced here: the three attackers all steer to a single
`b2AttackFinalRank`, so they sit within half a rank of each other for more than the 20 % of samples
the check allows. **The property never held for the shipped configuration; nothing noticed because
the only test of it ran with the feature disabled.**

**The test is narrowed to the standard cast** — attackers are privileged to cross by design, which
the module documents — and separation **does** hold there, checked. **The finding goes to the owner's
sheet rather than being buried in a narrowed test.** It changes nothing today: `checkSeparation` is
an assertion about quality, never a gate the generator consults.

---

## VERIFICATION

`raceCore.js`, `racePlanner.js`, `heroCurveGenerator.js` and `raceBehavior.js` are inside all three
instruments' closures, so all four hashes were owed and all four were run — the table at the top.

Client suite **210 files / 4119 tests**, all green. `eslint` clean. `check-fallback-agreement`:
**0 disagree, 0 on the exception list, 0 new, 0 stale** — and green **for the right reason**: the
mirrors are gone, not the numbers agreeing.

**Grouped in four commits** — raceCore+raceBehavior, the b2Attack family, the Dev Screen, and the
tests — so a movement in any one would have been reverted without unpicking the rest. None moved.

The one remaining `UNRESOLVED` the guard reports, `durationModel.js:normalSpeedPxPerSec`, was checked
and is **already reading the home**: it imports `DEFAULT_BASE_SPEED_CONFIG` and uses it as both the
parameter default and the fallback. The guard cannot follow a cross-module constant; that is its
declared blind spot, not a second definition.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `client/src/modules/raceCore.js` | 11 sites read the home (6 booleans restored, 2 ternaries, 3 numbers) |
| `client/src/modules/raceBehavior.js` | 2 sites |
| `client/src/modules/racePlanner.js` | 1 site |
| `client/src/modules/heroCurveGenerator.js` | 7 sites — 5 in `GENERATOR_CONFIG`, 2 at the cast site; header claim corrected |
| `client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx` | 6 sites |
| `scripts/check-fallback-agreement.mjs` | **11 exception entries deleted**; the tiers now record why the list is empty |
| `client/src/modules/oneHome.test.js` | **new**, 8 assertions |
| `RaceTuningSection.test.jsx` | mock reads the real defaults; 2 tests rewritten from literals to the rule |
| `heroCurveGenerator.test.js` | separation test narrowed, with the finding recorded |

| `check-fallback-agreement.test.mjs` | 3 tests freed from needing a POPULATED exception list |

Tests added: 8. Tests deleted: 0. Tests rewritten from a literal to a rule: **3**. Tests freed from
depending on the exception list having entries: **3**.

**THE GUARD'S OWN SUITE FOUGHT THE EMPTY LIST, and that is worth recording.** Three of its tests
assumed `EXCEPTIONS` was non-empty — one asserted `EXCEPTIONS.length > 0` with the message *"the
list must not be empty while the disagreements exist"*, and two read `EXCEPTIONS[0]`, which became
`undefined`. That assertion was a reasonable guard against somebody deleting the list to silence the
tool, and wrong the moment the list emptied **honestly**. The pairing it wanted is already owned by
test 2b, which runs the guard and asserts `0 new`: an unexplained deletion still fails there,
because it would leave real disagreements unlisted. The two `EXCEPTIONS[0]` tests now build their
own synthetic pair, which is the stronger shape anyway — they test the MATCHING RULE rather than
whatever happens to be on the list today.

---

## WHAT REMAINS ON THE OWNER'S SHEET

Of the 13 items in OWNER-DECISIONS-2026-08-19, **Batch 2 is entirely closed** — its ten items were
this ruling. What is left:

| item | why it is still his |
| --- | --- |
| **1.1** the three Dev Screen controls | the *code* is fixed; the proposed test that renders the panel with empty storage is not written |
| **1.2** racer artwork covered by no instrument | unchanged — a decision about what the instrument is for |
| **3.1** `verify.mjs` can pass having run zero tests | unchanged |
| **3.2** `withTimeout` never clears its timer | unchanged |
| **3.3** the guard cannot see object-literal copies | **sharpened, not closed** — it now also cannot see local-default ASSIGNMENTS, which is where all five of today's copies were |
| **4.1** the empty `reports/audit/` folder | unchanged |
| **4.2** two camera tests pinning a literal | unchanged — the two rewritten today were different tests |
| **NEW** the shipped hero cast is not mutually separated | see above |

---

## PROPOSALS

### Proposal A — teach the guard about local default OBJECTS, not just fallbacks

Today's five copies were **all** in a module-level object that assigns shipped values, and **all five
agreed**, so no existing check could speak. The guard models `?? X` and nothing else, which means the
shape most likely to drift silently — a hand-maintained "defaults for direct callers" object — is
exactly the shape it cannot see.

**The scan that found them is about forty lines** and already written (it ran twice tonight). Turning
it into a rule inside `check-fallback-agreement` would close the class properly, and the `min`/`max`
skip list it needs is the same one `check-config-claims` already maintains. **This is the single
highest-value follow-up here**, because it is the only one that would have caught today's work
without a person looking.

### Proposal B — decide whether the shipped hero cast SHOULD be separated

`checkSeparation` is asserted in tests and consulted by nothing. Now that the shipped configuration
is known to fail it, there are two honest answers and no third: either **separation is a real
property of a good race**, in which case three attackers converging on one `b2AttackFinalRank` is a
design problem worth measuring, or **it is not**, in which case the check should say it applies to
the standard cast only and stop implying more.

**Do not answer it by widening the tolerance.** The 20 % coincidence allowance is the only number in
that check and moving it to make a red test green is how a quality assertion becomes decoration.
