# MIRROR-CENSUS-2 — six mirrors removed, not aligned

**Branch:** `fix/mirror-census-2`, off master `e04c19e1`. **No default changed. No behaviour changed.**
All four instruments measured either side and byte-identical.

```
disagree   21  ->  14      (7 sites, 6 keys, DELETED)
stale exceptions             0
```

| instrument | before | after |
| --- | --- | --- |
| WORLD | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` |
| WORLD-OFF | `854018ee5d3d83e1` | `854018ee5d3d83e1` |
| CAMERA | `d9f45a4aea0e5778` | `d9f45a4aea0e5778` |
| RENDER | `1274c7e8444238e3` | `1274c7e8444238e3` |

---

## WHAT WAS REMOVED, AND WHY REMOVAL RATHER THAN SYNCING

Six boolean keys in `raceCore.js`, seven sites: `chaosSteer`, `bandBias`, `gapRerollEnabled`,
`phaseSplitBonusEnabled`, `pulkCeilingCap`, `enableRowEnvSmooth`.

```diff
-        chaosSteer: dynamicsConfig.chaosSteer ?? false,
+        chaosSteer: dynamicsConfig.chaosSteer,
```

**The `?? false` is deleted outright, not pointed at the default.** A mirror that cannot drift beats
one that currently agrees, and there is now no second copy of these six values anywhere in the
repository.

### The line that decided which keys qualified

**They are BOOLEANS, so the two failure modes coincide.** If a caller ever did omit one, `undefined`
is falsy and behaves exactly as the deleted `false` did — so removal is safe in the direction the
proof covers *and* in the direction it does not.

**That is not true of their neighbours, and it is why the `?? 0` entries stay.** Those are numbers
feeding arithmetic: an absent key would become `NaN` instead of `0`. Removing them would trade a
documentation defect for a behaviour one, which is the opposite of the point.

---

## PER KEY, BEFORE TOUCHING IT — THE CALLERS WERE READ, NOT ASSUMED

Four "unreachable" claims have already turned out false in this repository, so every caller of
`createRaceFromIdentity` was enumerated:

| caller | what it passes as `dynamicsConfig` | complete? |
| --- | --- | --- |
| `RaceScreen/index.jsx:464` — **the shipped path** | `loadRaceDynamicsConfig()` | yes — `resolveFromDefaults` walks the DEFAULT keys |
| `DiagnoseVerteilung.jsx:140` | `loadRaceDynamicsConfig()` | yes |
| `camera-fingerprint.mjs:170` | `W.raceDynamicsConfig` | yes |
| `render-fingerprint.mjs:312` | `W.raceDynamicsConfig` | yes |
| `check-ending-frame.mjs:242` | `W.raceDynamicsConfig` | yes |
| `exp-anchor-truth-ab.mjs:156` | `W.raceDynamicsConfig` | yes |
| `finish-band-truth.mjs:237` | `W.raceDynamicsConfig` | yes |
| `diag/start-formation.mjs:213` | `W.raceDynamicsConfig` | yes |
| `headlessRaceSimulator.test.js` (×2) | `DEFAULT_RACE_DYNAMICS_CONFIG` | yes |

**`W` is `DEFAULT_CONFIG_WORLD`, and `DEFAULT_CONFIG_WORLD.raceDynamicsConfig` IS
`DEFAULT_RACE_DYNAMICS_CONFIG` — the same object, checked by identity (`===`) rather than by
reading the source.** So six harness scripts hand the engine the full defaults object.

**`sim-fairness.mjs` does not call `createRaceFromIdentity` at all** — it has its own loop and its own
`createRacePlan` call. That is the caller whose partial config made
`racePlanner.js`/`gapRerollStrength` genuinely LIVE in MIRROR-CENSUS-1, and it is why the sim was
checked separately rather than lumped in with "the harnesses".

**No test writes against the stale literal.** Nothing passes a partial `dynamicsConfig` to
`createRaceFromIdentity`; the `chaosSteer` / `pulkLeaderBrake` mentions in
`raceDynamicsConfig.test.js` are tests of the LOADER, which is the thing that guarantees presence.

---

## THE SPLIT — 6 REMOVED, 11 LEFT FOR THE OWNER

Every one of the eleven is **unreachable today**. What follows is what would change **if the fallback
ever did fire**, which is the only thing that makes them worth deciding rather than deleting.

### The `?? 0` numbers — an absent key would become NaN if removed (5)

| key | shipped | fallback | if it fired, and if corrected |
| --- | --- | --- | --- |
| `raceBehavior.js` `maxLateralAccelPerStep` | 0.0005 | 0 | 0 = **no lateral acceleration cap**. Correcting it would impose the shipped cap on a partial caller — a physics change, and the exact key RACER-MOTION-2 shipped and minted. |
| `raceBehavior.js` `softSteeringObstacleMargin` | 0.5 | 0 | 0 = **no obstacle margin** in soft steering. Correcting it widens every avoidance decision. |
| `raceCore.js` `pulkLeaderBrake` | 0.1 | 0 | 0 = **the leader is not braked** in the pulk contest. |
| `raceCore.js` `pulkChallengerBoost` | 0.06 | 0 | 0 = **the challenger is not boosted**. |
| `raceCore.js` `pulkBoostHeadroom` | 0.1 | 0 | 0 = **no headroom above the band ceiling**. |

**These five read as one decision, not five.** Each `0` is the feature's own OFF value, so a partial
caller gets the pre-feature game — which is a coherent thing for the code to mean. Correcting them
would mean a partial caller silently gets the full shipped physics instead, and there is no caller to
learn from. **Deciding this is choosing a convention, and that is the owner's.**

### The B2-attacker pair — a written decision that has not expired (3)

| key | shipped | fallback |
| --- | --- | --- |
| `racePlanner.js` `b2AttackHeroes` | 3 | 0 |
| `heroCurveGenerator.js` `b2AttackHeroes` | 3 | 0 |
| `heroCurveGenerator.js` `b2AttackFinalRank` | 7 | 10 |

`heroCurveGenerator.js`'s header states its literals are the **direct/test-call default set,
deliberately distinct from the shipped default**, and `GENERATOR_CONFIG` carries the same pair.
MIRRORS-BY-REFERENCE overrode two written decisions of this kind and had to say so in its report;
this is the third and it is still left alone. `b2AttackHeroes: 0` casts no attackers — the
pre-feature game — so it is the same convention as the block above.

### The Dev Screen — three keys, and they are the ones he might SEE (3)

| key | shipped | fallback | what he would see |
| --- | --- | --- | --- |
| `gapRerollEnabled` | true | false | a checkbox showing **off** while the game runs it **on** |
| `phaseSplitBonusEnabled` | true | false | the same |
| `racePlanBonusStrengthMultiplier` | 2 | 1 | **1.0×** displayed where the game runs **2.0×** — at four sites, including two derived numbers below the slider |

**These are the only three of the eleven with a path to his eyes**, and the section holds
`useState(() => loadRaceDynamicsConfig())`, so the literal is unreachable exactly as long as that
loader keeps resolving against the defaults.

**They were NOT removed, and the reason is specific to JSX.** `checked={dynamicsConfig.gapRerollEnabled}`
and `value={dynamicsConfig.racePlanBonusStrengthMultiplier}` would pass `undefined` if the key ever
went missing, and React then flips the control from controlled to uncontrolled — a different and
noisier failure than the wrong number, but a behaviour change in a component the owner uses. **In
doubt, listed.**

---

## VERIFICATION

`raceCore.js` is inside all three instruments' closures, so all four hashes were owed and all four
were run — the table at the top. `check-fallback-agreement`: **21 → 14 disagree, 0 new, 0 stale**.
`eslint` clean. The six removed entries are deleted from the guard's exception list, with the
reasoning for removal-over-alignment recorded there rather than here.

**The group was measured as one, and that is a deliberate reading of the brief.** All six share one
argument, one proof and one revert: seven adjacent lines in a single file. A movement would not have
forced anything to be unpicked — the whole change is `git checkout client/src/modules/raceCore.js`.

---

## SOURCE HYGIENE

| file | change |
| --- | --- |
| `client/src/modules/raceCore.js` | 7 sites, `?? false` deleted |
| `scripts/check-fallback-agreement.mjs` | 6 exception entries removed; TIER 2 now records why removal beat alignment and why the `?? 0` neighbours could not follow |

Tests added: 0 — nothing new is assertable here that the guard and four fingerprints do not already
assert, and R7 says not to write one for the sake of it. Tests deleted: 0. Tests re-blessed: 0.

### Noticed but left

- **`durationModel.js:normalSpeedPxPerSec` is still the 1 UNRESOLVED**, unchanged since
  MIRRORS-BY-REFERENCE. The guard reports it separately rather than counting it as agreeing.
- **The 1 SKIPPED display fallback** is still correctly skipped.

---

## PROPOSALS

### Proposal A — decide the `?? 0` convention once, for all eight at once

Eight of the eleven remaining entries (the five numbers and the three B2 keys) are **the same
question asked eight times**: should a caller that omits a key get the feature OFF, or the shipped
value? Answering it once settles all of them and would let the guard's exception list shrink to the
three Dev Screen entries.

**Both answers are defensible**, which is why a sweep should not pick: *OFF* makes a partial config
mean "the pre-feature game", which is what the code says today; *shipped value* makes a partial
config mean "the real game, minus whatever you overrode", which is what a reader expects. The
cheapest form of the decision is one sentence in `LESSONS.md` beside L207.

### Proposal B — make the Dev Screen's three unreachable by construction, not by convention

The three Dev Screen mirrors are unreachable only while `loadRaceDynamicsConfig()` keeps resolving
against the defaults. That is true today and nothing asserts it *at that component*. A single test
that renders `DynamicsTuningSection` with an empty stored config and asserts the controls show the
shipped values would make the guarantee explicit — and it would fail loudly if the loader ever
changed, which is the only way these three can become the MIN-RACERS-5 defect again.

**Why this and not deleting the `??`:** the test costs nothing behavioural, where removing the
fallback risks React's controlled/uncontrolled flip in a panel he actually uses.
