# FALLBACK-42-TRIAGE — 42 decisions turn out to be one

**Branch:** `feat/fallback-42-triage`, off master `be4202c8`. **ANALYSIS ONLY.**
**No fallback was aligned. No default was changed. No behaviour was touched.** The only edit is to
the REASON text on the guard's exception list, which the block asked for.

---

## THE ANSWER

| verdict | count |
|---|---|
| **UNFIREABLE** — the key can never be absent at that call site in any shipped path | **41** |
| **LIVE** — the fallback fires, and it fires on every render | **1** |

**The worklist is not 42 decisions. It is one bug, one rename question, and 40 lines of stale text.**

---

## THE METHOD, and its limit

For each entry: name the object the key is read from, then enumerate **every caller that can reach
that read in a shipped path** — the browser, `sim-fairness.mjs`, and the fingerprint harnesses — and
ask whether any of them can hand over an object without that key.

The answer turned out to be the same for almost all of them, for one reason:

> **Every shipped caller resolves its config against the defaults before passing it on.** The browser
> uses the loaders (`loadCameraConfig`, `loadRaceDynamicsConfig`, …), which iterate the DEFAULT keys.
> `sim-fairness.mjs` builds its bases with `mergeCfg(key, DEFAULT_*_CONFIG)`, which starts from the
> shipped defaults. Neither can produce an object missing a default key.

**And this is NOT news from CONFIG-DIFF — say so rather than claim credit.** The six spread-merge
loaders (`{...DEFAULT, ...stored}`) already guaranteed every default key, and the camera loader
already walked the default keys. CONFIG-DIFF-2 closed the one remaining hole: it resolves NESTED
blocks field by field, so a stored `cameraStateProfiles.LEADER_ZOOM` can no longer be missing
`maxStateDuration`. That hole is why one camera entry looked live and is not (§3).

**The limit, stated plainly:** this is an argument about the callers that exist today. A future caller
that builds a partial config revives every one of these. **That is the argument for keeping the guard,
not for deleting the list.** What changes is the guard's meaning: it stops being a worklist of
decisions and becomes a tripwire for the day a partial-config caller appears.

---

## 1. THE ONE THAT IS LIVE — and it fires 100 % of the time

```
client/src/screens/RaceScreen/ComebackDiagHUD.jsx:78
  {(diag.outcomePhaseThreshold ?? 0.75).toFixed(2)}
```

`diag` comes from `CameraDirector.getComebackDiagData(racers, ts)`. **That method never puts
`outcomePhaseThreshold` into the object it returns.** The director keeps the value in
`this._outcomePhaseThreshold` (set at line 544 from `computeTimingFromConfig`) and uses it at line
1276 — but it is not among the fields the diag builder emits.

So the HUD's `?? 0.75` is not a fallback for an unusual case. **It is the only branch.** The HUD
displays `0.75` unconditionally while the director is running the shipped default, `0.65`.

**This is the diagnostic the owner would read while judging COMEBACK, and it states a threshold the
game is not using.** It is a bug fix, not a decision — it does not need the 0.65-vs-0.75 answer,
because whatever that answer is, the HUD should show what the director is actually running.

The fix is to emit the value from `getComebackDiagData`, not to change the literal. Changing the
literal to 0.65 would make the HUD right by coincidence and wrong again the next time the default
moves. **Not done here — this block changes nothing.**

---

## 2. THE ONE DECISION THAT SURVIVES

```
client/src/modules/racePlanner.js:231   const postStartHoldMs = config.postStartHoldMs ?? 0;
```

The fallback is unfireable (raceCore sets the key in the plan config it passes). **But the question
the guard raised about this entry was never about the fallback.** It was: the planner treats this key
as one clock and the camera default (7000 ms) describes another, and they wear the same name. If
they are two clocks, the fix is a RENAME.

**A rename is a real decision and the triage does not dissolve it.** It is now the only entry on the
list that needs the owner rather than a hygiene block.

---

## 3. TWO CLAIMS ON THE EXISTING LIST THAT ARE WRONG, AND ARE NOW CORRECTED

Both were written by FALLBACK-GUARD-1 in good faith and both are contradicted by the traces above.

### (a) "`world-off` depends on exactly this"

The six OFF-arm flags in `raceCore.js` (`chaosSteer`, `bandBias`, `gapRerollEnabled`,
`phaseSplitBonusEnabled`, `pulkCeilingCap`, `enableRowEnvSmooth`) carried the reason: *"The `world-off`
fingerprint in docs/fingerprints.json depends on exactly this. Aligning it would delete the ablation
arm."*

**It does not.** `world-off` is produced by
`node scripts/fingerprint-default.mjs off --gapRerollEnabled=false` — a flag that **sets** the key.
The sim then writes `gapRerollEnabled: GAP_REROLL` into the state it builds. The ablation arm is the
FLAG, and the flag works by supplying a value, never by omitting one. The `?? false` is not what
holds `854018ee5d3d83e1` in place.

They stay exempt — they are engine files and aligning a literal there is still a mint — but they are
**dead text, not an ablation mechanism**, and the reason now says so.

### (b) "the MIN-RACERS-5 defect exactly"

Six Dev Screen entries carried: *"an untouched control shows a value the game is not running."*

**They do not.** `DynamicsTuningSection` holds `useState(() => loadRaceDynamicsConfig())` and
`CameraAdvancedSection` holds `useState(() => loadCameraConfig())`. Both are resolved against the
defaults, so the control renders the real value and the literal beside it is never reached.

MIN-RACERS-5 was a genuinely wrong number **on screen**. This is a wrong number **in the source that
nobody sees**. Both are worth fixing; only one was a defect. The comparison is withdrawn.

---

## 4. THE FULL TRIAGE

### `cameraTimingComputation.js` — 5 entries, all UNFIREABLE

| key | fallback vs default | why unfireable |
|---|---|---|
| `endgameThreshold` | 0.85 vs 0.9 | top-level `config?.x ?? y`; the director is always constructed by RaceScreen with `loadCameraConfig()`, and all five keys are top-level defaults |
| `outcomePhaseThreshold` | 0.75 vs 0.65 | same |
| `comebackMinStartGap` | 0.4 vs 0.25 | same |
| `comebackMaxCurrentRankPct` | 0.1 vs 0.2 | same |
| `maxStateDuration` | 8000 vs 4000 | reads a per-state PROFILE, and `profMax` is called only with the six shipped state names — **all six defaults carry `maxStateDuration`**, and CONFIG-DIFF-2's nested resolve means a stored profile cannot drop it either |

`computeTimingFromConfig(null)` is a real code path — the module header names it as the fallback
source — but **no shipped caller uses it.** `CameraDirector`'s `config = null` default parameter is
never taken: `RaceScreen/index.jsx:523` always passes `cameraConfig`, and `updateConfig(cameraConfig)`
is the only other entry. The null path belongs to `cameraTimingComputation.test.js`.

**A consequence worth naming:** because five of these disagree, `computeTimingFromConfig(null)`
returns a timing set that **no shipped world produces**. Tests that pass `null` are testing a world
that does not exist. That is not a fairness or picture risk, but it does mean those tests cannot
catch a default moving.

### `raceCore.js` — 14 entries, all UNFIREABLE

`dynamicsConfig` reaches `createRaceFromIdentity` from `loadRaceDynamicsConfig()` (browser,
`RaceScreen/index.jsx:415`) or from the sim's defaults-merged base. Neither can omit a key.

Six OFF-arm flags (§3a) · three magnitudes expressed as 0 (`pulkLeaderBrake`, `pulkChallengerBoost`,
`pulkBoostHeadroom`) · `bandBiasR` 0.8 vs 0.6 · `bandBiasGain` 0.06 vs 0.1 ·
`pulkLeadRotationDropDepthLengths` 2 vs 8 · `rowBonusPulk` 1 vs 0 · `phaseSplitBonusEnabled` twice.

**`rowBonusPulk` is the most misleading line on the whole list** and deserves to be read once: the
fallback (1) is the ACTIVE value and the default (0) is the disabled one. It runs the opposite way to
every other entry — a partial-config caller would get MORE behaviour than the shipped world. No
shipped caller is partial, so nobody does.

### `racePlanner.js` — 6 entries, all UNFIREABLE, and DOUBLY so

`createRacePlan(racers, finishT, targetDurationMs, config = {}, seed = 0)` is called from
`raceCore.js:219` with an object literal that **sets every one of these keys unconditionally** — most
of them with a `??` of their own. So each racePlanner fallback is a second-line fallback standing
behind a first-line fallback that also never fires.

**The `config = {}` default parameter is the one thing on this list that could create a partial
config**, and only for a caller that omits the argument entirely. Today: none in shipped code; two
diag scripts (`scripts/diag/acceptance-orders.mjs`, `micro-divergence.mjs`) pass one.

### `heroCurveGenerator.js` — 2 entries, UNFIREABLE

Reads the plan config racePlanner assembled, which raceCore assembled. Third line of the same chain.

### `raceBehavior.js` — 2 entries, UNFIREABLE

`applyRacerBehavior(racers, {...behaviorConfig, isOpen})`, behaviorConfig loader-resolved; the sim
merges from `DEFAULT_RACE_BEHAVIOR_CONFIG`. `maxLateralAccelPerStep ?? 0` and
`softSteeringObstacleMargin ?? 0` are genuine off switches **in shape**, but the off state is reached
by SETTING 0, never by omitting the key.

**So aligning either literal cannot move the world fingerprint** — the branch is not taken. That
directly contradicts the old reason ("Aligning it would move the world fingerprint"), which is now
corrected. It would still need a mint to prove it, because the claim is the kind that should be
checked rather than believed.

### Dev Screen + HUD — 12 entries, 11 UNFIREABLE and 1 LIVE

11 read `useState(() => load*Config())`. The twelfth is §1.

---

## 5. THE RE-ORDERED WORKLIST

| # | item | kind | needs the owner? |
|---|---|---|---|
| 1 | `ComebackDiagHUD` shows a threshold the director is not running | **bug** | no — emit the value from `getComebackDiagData` |
| 2 | `postStartHoldMs` — one key name, possibly two clocks | **decision** | **yes** |
| 3 | `outcomePhaseThreshold` 0.65 vs 0.75 — what SHOULD the number be? | **decision, unchanged by this triage** | **yes**, but it is about the default, not about any of the three literals |
| 4 | the other 39 stale literals | hygiene | no — MIRRORS-BY-REFERENCE removes the class |

**Item 4 is the point of the triage.** 39 of these are exactly what the next piece
(MIRRORS-BY-REFERENCE) converts: a literal that copies a default it agrees with is drift-prone, and a
literal that copies a default it *disagrees* with is already drifted. Pointing them at the default
deletes the disagreement without deciding anything — **except where the fallback is a deliberate off
switch of a different value than the default** (the nine OFF-arm entries), which must keep their
literal and their reason.

---

## SOURCE HYGIENE

| file | before → after | what |
|---|---|---|
| `scripts/check-fallback-agreement.mjs` | 700 → 700 | **18 reason strings rewritten, no logic touched.** Each now opens with UNFIREABLE or LIVE and the evidence. Two prior claims corrected (§3). |
| `reports/night/FALLBACK-42-TRIAGE.md` | — → new | this |

No `D(...)` entry was added or removed; the guard still reports **42 disagree, 42 on the exception
list, 0 new**. `engine-reach --check` result in the reply.

### Noticed but left

- **`durationModel.js:normalSpeedPxPerSec` is still the 1 UNRESOLVED** the guard reports separately —
  it imports `DEFAULT_BASE_SPEED_CONFIG` from another module, which the scanner cannot resolve. Not
  one of the 42 and untouched.
- **The 1 SKIPPED entry** is a display fallback whose type differs from its default. Correctly skipped.
- **A guard that could tell UNFIREABLE from LIVE by itself** would be worth more than this report: it
  would need to know whether a read's object is loader-resolved. `check-config-keys` already knows
  which keys belong to which store, so the ingredients exist. Not attempted here.
