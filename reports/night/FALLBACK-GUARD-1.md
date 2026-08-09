# FALLBACK-GUARD-1 — a fallback must agree with the default it mirrors

**Branch:** `feat/fallback-guard-1`, off `feat/verify-base-1`. Not merged, not minted.

`scripts/check-fallback-agreement.mjs` — new, wired beside `check-config-keys.mjs` in all three of
its homes: the pre-commit hook's fast-guard list, `verify.mjs`'s doc-guards job, and CI.

## What it found

**361 mirrored fallbacks. 52 read the default by reference and cannot drift. 42 disagree.**

All 42 are on an explicit exception list with both values and a reason, so the guard is **green
today and red on any new one**. Nothing was aligned — two of them cannot be brought in step without
deciding a behaviour question, and the brief was right to say so.

The proof it works is not a synthetic case: **re-applying the real MIN-RACERS-5 change (defaults
3 → 5, mirrors untouched) makes it fail with exactly the four sites that had to be fixed by hand** —
`framingConfig.js` and the three slider reads in `CameraAdvancedSection.jsx`.

## The owner's worklist, ordered by damage

**Tier 1 — engine-adjacent. Aligning one could move the WORLD fingerprint.**

| file | key | default | fallback | |
|---|---|---|---|---|
| `racePlanner.js` | `postStartHoldMs` | 7000 | 0 | **UNRESOLVED.** May be two different clocks wearing one key name — the camera's post-start hold and the planner's. If so the fix is a **rename**, not an alignment. |
| `raceBehavior.js` | `maxLateralAccelPerStep` | 0.0005 | 0 | **INTENTIONAL** — 0 is the documented off switch (RACER-MOTION-1/2). |
| `raceBehavior.js` | `softSteeringObstacleMargin` | 0.5 | 0 | **UNRESOLVED** — same shape, but no report says so. |

**Tier 2 — the OFF-arm flags (9 entries, all `raceCore.js`).** `chaosSteer`, `bandBias`,
`gapRerollEnabled`, `phaseSplitBonusEnabled`, `pulkCeilingCap`, `enableRowEnvSmooth` fall back to
`false`; `pulkLeaderBrake`, `pulkChallengerBoost`, `pulkBoostHeadroom` fall back to `0`.
**INTENTIONAL** — this is how a partial config gets the pre-feature world, and the world-off
fingerprint `854018ee5d3d83e1` depends on exactly it. Aligning these would delete the ablation arm.

**Tier 3 — stale numbers, not off switches. Most likely real bugs; all need a mint.**

| file | key | default | fallback |
|---|---|---|---|
| `raceCore.js` + `racePlanner.js` | `bandBiasR` | 0.6 | 0.8 |
| `raceCore.js` + `racePlanner.js` | `bandBiasGain` | 0.1 | 0.06 |
| `raceCore.js` | `pulkLeadRotationDropDepthLengths` | 8 | 2 |
| `raceCore.js` | `rowBonusPulk` | 0 | **1** — and this one runs the *other* way: the fallback is the ACTIVE value, so a partial config gets MORE behaviour than the shipped world |
| `racePlanner.js` | `gapRerollStrength` | 1 | 0.5 |
| `racePlanner.js` + `heroCurveGenerator.js` | `b2AttackHeroes` / `b2AttackFinalRank` | 3 / 7 | 0 / 10 — mixed: `?? 0` is a genuine off switch, `?? 10` is a stale number riding along with it |

**Tier 4 — camera. Visible, but cannot move the race.**

`outcomePhaseThreshold` 0.65 vs **0.75 in THREE files** — the resolver, the Dev Screen control the
owner would judge it with, and the diagnostic HUD he would read while judging. Today the slider, the
HUD and the game can all disagree. The brief named this one: it shapes the race's final phase.
Also `comebackMinStartGap` (0.25 vs 0.4) and `comebackMaxCurrentRankPct` (0.2 vs 0.1), each stale in
*both* the resolver and the slider — which is why nobody noticed: the control faithfully shows what
the resolver would do, just not what the game does. Plus `endgameThreshold` (0.9 vs 0.85) and
`maxStateDuration` (4000 vs **8000**, double).

**Tier 5 — Dev Screen only, cheapest to fix, cannot move a fingerprint.**
`DynamicsTuningSection.jsx`: `gapRerollEnabled`, `phaseSplitBonusEnabled`,
`racePlanBonusStrengthMultiplier` (2 vs 1). The MIN-RACERS-5 defect exactly — an untouched control
showing a value the game is not running. Fix by pointing the control at the defaults object, as
`CameraAdvancedSection` already does for several keys.

## What it does not check — in the guard itself

The FRAME-INPUTS-1 lesson: a guard that matches one spelling must write down which it misses, or its
silence reads as proof. This one is **textual**. Blind to destructured defaults
(`const { k = 3 } = config`), computed keys (`config[name]`), aliased *keys*, `||` instead of `??`
(deliberate — `||` also replaces 0 and `''`, so it is usually a different intent), named fallbacks
imported from another module (reported **UNRESOLVED**, never silently passed — there is 1), and test
files. A key in no defaults object is not a mirror and is skipped; that filter is what makes 533 raw
`?? literal` sites tractable.

**Two patterns are checked, not one.** `?? FALLBACK` and the band form
`Number.isFinite(v) ? v : DEFAULT_X`. Leaving the band out would have made the guard a decoration —
it is the project's most common fallback shape, and `DEFAULT_REFERENCE_CORRIDOR_PX`, which the brief
named, is one of them. It is covered and it agrees, as does `DEFAULT_INNER_FRAME_PCT`.

## Two false positives I caught before shipping, both recorded in the guard

1. **The band pattern was unbound.** A `.key; … ? v : CONST` window matched *across statements*: in
   `framingConfig.js` it paired `const lff = config?.leaderForwardFrac;` with the
   `? refCfg : DEFAULT_REFERENCE_CORRIDOR_PX` four lines below and reported that `leaderForwardFrac`
   falls back to 300. Now the ternary is matched only when the value tested is the same identifier
   read from the key. **A guard that invents findings is worse than no guard.**
2. **A display fallback is not a mirror.** `` `${cam.leaderForwardFrac ?? 'null'}` `` in a diagnostic
   template was reported as disagreeing with 0.66. A fallback whose *type* differs from the
   default's is doing a different job; those are counted and skipped, not dropped silently.

## Tests and sabotages

12 tests. The three the brief named, plus the guard's own failure modes.

| sabotage | result |
|---|---|
| defaults 3 → 5 with mirrors left at 3 (**the real MIN-RACERS-5 defect**) | **RED — 4 new**, naming all four sites |
| a NEW disagreement in an exception-listed file (`raceCore.js`) | **RED — 1 new**, exit 1 |
| `isExcepted` gutted to always-true | **RED** |
| the failure `process.exit(1)` changed to 0 | **RED** |
| the band pattern dropped | **RED** |

**Two of those only go red because of a test I had to add after the fact, and that is the lesson of
this piece.** My first suite tested `findPairs` and the `EXCEPTIONS` array — and *passed* with
`isExcepted` gutted to always-true, because with everything exempt "0 new" is still true. The guard
ships green over 42 exemptions, so "green" has to mean something, and only running the real script
against a fixture proves it does. `--src=<dir>` exists for that, following the seam
`check-measured-stamps.mjs --doc=` and `check-tags.mjs --tags-file=` already established here.

## Source hygiene

| file | +/− | what |
|---|---|---|
| `scripts/check-fallback-agreement.mjs` | +288 −0 | new |
| `scripts/check-fallback-agreement.test.mjs` | +215 −0 | new |
| `scripts/verify.mjs` | +1 −0 | one line in the doc-guards `also` list, beside `check-config-keys` |
| `.husky/pre-commit` | +1 −1 | one name appended to the fast-guard list |
| `.github/workflows/ci.yml` | +7 −0 | one step beside `check-config-keys` |

Nothing removed.

### Noticed but left

- **`verify.mjs` routes the config guards to `doc-guards`, which only markdown selects.** So a pure
  JS change to `framingConfig.js` does not run this guard *under verify* — it runs in the pre-commit
  hook on every commit and in CI, which is where it actually catches things. Pre-existing:
  `check-config-keys` has had the same routing since it was written. Fixing it means deciding
  whether the config guards deserve their own route, which affects both guards and is a verify-path
  change — R8 exception 1 territory, and not this piece's job.
- **1 UNRESOLVED fallback**: `durationModel.js:normalSpeedPxPerSec` falls back to an imported
  `DEFAULT_BASE_SPEED_CONFIG` member the guard will not follow across modules. Reported every run
  rather than hidden.
- **The guard costs ~0.4 s** and now runs on every commit.
