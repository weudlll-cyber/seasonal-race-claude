# PHASE CONTRACT — every value calibrated against a phase boundary

**Read-only inventory. Nothing here proposes or changes anything.** Date: 2026-07-10, branch `chore/sim-trust`
@59d82ee. Every claim is verified at source (file:line). The point of this document is that the PULK
collapse (Step 5) moved a boundary and silently broke four contracts nobody had written down — this
enumerates them so it never happens unseen again.

## The phase model (verified)

`DEFAULT_PHASE_FRACTIONS` (racePlanner.js:58-65): `pulkStart 0.25, pulkEnd 0.5, transitionEnd 0.75,
corridorStart 0.55, corridorEnd 1.0, midToLateSwitchFraction 0.85`.

`getPhase` (racePlanner.js:350-363) uses **four** boundaries, in this order:
`PRE_PULK < pulkStart · PULK < pulkEnd · TRANSITION < corridorStart · OUTCOME < corridorEnd · FINAL`.
**`transitionEnd` (0.75) is NOT a `getPhase` boundary** — the phase named "TRANSITION" ends at
`corridorStart` (0.55). `transitionEnd` is a *separate* reader (§3).

**The v4 two-phase model (racePlanner.js:141-145; reopenable as of `feat/pulk-reopen`):** when
`directorV4Enabled`, `pulkEnd = directorV4OutcomeStart` (the PULK-end control) and `corridorStart :=
pulkEnd` (DERIVED, not a second copy) — CHAOS → PULK → OUTCOME, with no TRANSITION phase under v4. At the
shipped defaults `directorV4OutcomeStart == pulkStart == 0.25` ⇒ **PULK width = pulkEnd − pulkStart = 0**
and **TRANSITION width = corridorStart − pulkEnd = 0**, byte-identical to the former collapse. The
difference from the old "collapse": `pulkEnd` is now an OWNED boundary (the DevScreen "PULK end / OUTCOME
begins" control), so raising it REOPENS the PULK window and revives the three PULK-window mechanisms that
the zero-width window renders inert (§2). The four contracts below are no longer broken *silently* — they
are owned by explicit controls in the PULK group.

---

## 1. `pulkStart` = 0.25 — the CHAOS→PULK boundary (hardcoded; NO DevScreen control)

- **Who reads it.** `getPhase` (racePlanner.js:352,358); the row-envelope `chaosEndFrac`
  (raceStep.js:49 via `computeRowEnvMult`; browser `PHASE_CHAOS_END` index.jsx:799; sim `pulkStartLive`
  sim-fairness.mjs:918); the areaBonus split `pulkStartFrac` (racePlanner.js:456,458) **and** the v4
  areaBonus instant-zero boundary (racePlanner.js:390,392); the hero-cast boundary (heroes tagged
  `isHeroChoreographed` at `phaseProgress >= pulkStartFrac`, racePlanner.js:471,492).
- **What it gates.** The end of CHAOS: the `areaBonusEarly`/`rowBonusEarly` band; under v4 the point
  where `areaBonusMult` snaps to zero for the whole field; where the 2–4 heroes are cast.
- **When it MOVES.** The chaos window resizes → `areaBonusEarly`/`rowBonusEarly` apply over a different
  span, and heroes are cast earlier/later. Under v4 the areaBonus-zero point moves with it.
- **DevScreen.** None — hardcoded 0.25. Note: under v4, `directorV4OutcomeStart` defaults to 0.25 = this
  boundary, so CHAOS-end and OUTCOME-start coincide.
- **Calibrated for it.** 0.25 as the chaos→choreo boundary; `areaBonusEarly=1.0`, `rowBonusEarly=1`.

## 2. `pulkEnd` = 0.5 — the PULK end (v4: OWNED by the "PULK end / OUTCOME begins" control) — **the boundary Step 5 moved, now reopenable**

- **Who reads it.** `getPhase` (racePlanner.js:353,359); the row-envelope `pulkEndFrac` (raceStep.js:51;
  browser `PHASE_PULK_END` index.jsx:800; sim `pulkEndLive` sim-fairness.mjs:919); the areaBonus
  `_areaBonusPulk` branch (racePlanner.js:459-460); the governor fade-window start `governorFadeStart =
  corrStart − max(corrStart − pulkEnd, MIN_FADE_SPAN)` (raceGovernor.js:119); the PULK re-roll bias
  (`computePulkBiasedTarget` returns `rawSample` unless `getPhase()==='PULK'`, racePlanner.js:~626); the
  governor `phaseCtx.pulkEndFrac` (index.jsx:1053,1069; sim-fairness.mjs:1145; HUD GovernorDiagHUD.jsx:95).
- **What it gates.** PULK width; the `areaBonusPulk` and `rowBonusPulk` bands; the governor's fade-window
  start; the window in which the PULK cohesion bias (`pulkBiasGain`) can act.
- **When it MOVES.** Under v4 `pulkEnd = directorV4OutcomeStart` (the DevScreen "PULK end / OUTCOME
  begins" control) and `corridorStart := pulkEnd`. Raising it OPENS the PULK window and revives the three
  PULK-window mechanisms below; lowering it back to `pulkStart` (0.25, the default) closes the window and
  they go inert again. The reopen is the whole point of `feat/pulk-reopen`.
- **At the shipped defaults, `pulkEnd == pulkStart` (both 0.25) → PULK is zero-width, so (still true today):**
  - **`areaBonusPulk` NEVER applies** — in racePlanner.js:456-461 `inChaos` uses `pulkStartFrac` and
    `inPulk` uses `pulkEndFrac`; with the two equal, the `_areaBonusPulk` branch is unreachable (a
    racer is either `inChaos` or `POST`). The value the owner set (`areaBonusPulk=0`) is inert.
  - **`rowBonusPulk` NEVER applies** — same structure in `computeRowEnvMult` (raceStep.js:47-53): the
    middle branch (`raceProgress < pulkEndFrac`) is empty when `chaosEndFrac == pulkEndFrac`. The PULK
    row-bonus strength is dead. *(NB: it does NOT "return exactly 1.0" — it returns the `early` or `post`
    envelope; only the PULK branch dies. Correcting a template claim in the task spec.)*
  - **`pulkBiasGain` is DEAD** — `computePulkBiasedTarget` early-returns `rawSample` when the phase is
    not PULK (racePlanner.js:~626) and only for `pulkRacerIds = slice(0,3)` (racePlanner.js:208). With
    PULK zero-width, `getPhase()` is never `'PULK'`, so the cohesion bias never fires.
  - **The governor fade window shrinks and moves** — `governorFadeStart` goes from `0.55 − max(0.05,
    0.05) = 0.50` (window [0.50, 0.55]) to `0.25 − max(0, 0.05) = 0.20` (window [0.20, 0.25]).
    (Under v4 the governor is *also* gated fully off, §4/D-note, so this is doubly moot; under v4-OFF the
    [0.50,0.55] window is live.)
  - **Reopening the window (raise the "PULK end" control above pulkStart) revives all three** — the
    `_areaBonusPulk`/`rowBonusPulk`/PULK-bias branches become reachable again for `pulkStart <= p <
    pulkEnd`. Their inertness is a property of the zero-width DEFAULT, not of the mechanism.
- **DevScreen.** Under v4, OWNED by the "PULK end / OUTCOME begins" control (config key
  `directorV4OutcomeStart`, in the PULK group, DynamicsTuningSection.jsx). Under v4-OFF it stays the
  reactive hardcoded 0.5.
- **Calibrated for it.** `areaBonusPulk=0`, `rowBonusPulk=0`, `pulkBiasGain=2.0` were all calibrated FOR
  the PULK window — they now sit in the same PULK group as the boundary that governs them, so moving the
  boundary and re-justifying its numbers is a single, visible act (no longer a silent break).

## 3. `transitionEnd` = 0.75 — the areaBonus FADE end (config key `racePlanBonusTransitionEnd`)

- **Who reads it.** racePlanner.js:128 (setter from `config.bonusTransitionEnd`); **:156 the
  `corridorStart` fallback** (`resolvedCorridorStart = corridorStart ?? transitionEnd`) — *the second
  reader the spec warned was missed*; :215 `transEnd` ms; :313 destructure of `plan._phases`; :322
  `transEndFrac`; **:413 the v4-OFF areaBonus fade trigger** (`phaseProgress < transEndFrac`); :429
  `fadeAnchorMs`; :681 `getPhaseFractions` returns `transEndFrac`.
- **What it gates.** (v4-OFF) the `areaBonusMult` fade END — full strength until `transEnd`, then
  `easeInOutCubic` fade to 1.0 over `racePlanBonusFadeDuration` (racePlanner.js:409-429). PLUS the
  `corridorStart` fallback (:156).
- **When it MOVES.** (v4-OFF) the areaBonus fade end moves. (v4-ON) **no effect on areaBonus** — under v4
  the areaBonus is instant-zero from `pulkStart` (racePlanner.js:390), so "`bonusFadeDuration` becomes
  functionless; `transitionEnd` keeps its corridorStart-fallback role" (racePlanner.js:389). And the
  fallback never fires because `corridorStart` is always defined (default 0.55, overwritten to 0.25 under
  v4). ⇒ **`transitionEnd` is INERT under v4-ON.**
- **DevScreen.** `racePlanBonusTransitionEnd` slider — "Bonus active until (% race)", DynamicsTuningSection.jsx:605
  (range 30–95%). **Does NOTHING under v4-ON.**
- **Naming trap.** `transitionEnd` (0.75) is NOT where the "TRANSITION" phase ends (that is `corridorStart`
  0.55). It is misleadingly named; its live job is the areaBonus fade end (v4-OFF) + the corridorStart
  fallback.

## 4. `corridorStart` = 0.55 — the TRANSITION→OUTCOME boundary (config key `racePlanCorridorStart`) — **under v4: DERIVED from pulkEnd, not a literal**

- **Who reads it.** racePlanner.js:129 (setter); **:144 the v4 DERIVATION** (`corridorStart := pulkEnd`,
  the live PULK-end value — no literal, no second copy); :156,:162 the ordering clamp; `getPhase`
  `corrStartFrac` (:354,360); the servo pre-OUTCOME gate (`_preOutcome && !isHero` pins the pack to 1.0,
  racePlanner.js:472,538); the governor fade-to-zero end (`governorPhaseWeight` returns 0 at `progress >=
  corrStartFrac`, raceGovernor.js:130); the governor `phaseCtx.corrStartFrac` (sim-fairness.mjs; index.jsx);
  :681 `getPhaseFractions`.
- **What it gates.** The moment the servo (`trajectoryMult`) STARTS steering the *pack* toward target
  ranks (before it, the pack is pinned to 1.0 — racePlanner.js:538); and the point past which the
  reactive governor is exactly 0.
- **When it MOVES.** The servo's pack-steering start moves (earlier = more correction budget, more
  fairness authority). **Under v4, OUTCOME begins exactly where PULK ends: `corridorStart := pulkEnd`
  (racePlanner.js:144). There is no TRANSITION phase under v4.** The `racePlanCorridorStart` slider is
  therefore still inert under v4-ON (the corridor start is now the PULK-end control) — but the boundary is
  no longer a hidden literal: it is the owned "PULK end / OUTCOME begins" value.
- **DevScreen.** `racePlanCorridorStart` slider — "P-Controller starts (% race)", DynamicsTuningSection.jsx
  (range 50–end%, default 0.55). **INERT under v4-ON** (the corridor start = the PULK-end control, PULK
  group). Under v4-OFF it is the live TRANSITION→OUTCOME boundary.
- **Calibrated for it.** The governor fade window [0.50, 0.55] is anchored on it (§2, v4-OFF).

## 5. `corridorEnd` = 1.0 — the OUTCOME→FINAL boundary (config key `racePlanCorridorEnd`)

- **Who reads it.** racePlanner.js:130 (setter); :160,:165 the clamp anchor (ceiling); `getPhase`
  `corrEndFrac` (:355,361); :681 `getPhaseFractions`.
- **What it gates.** When the servo STOPS steering (raw physics after, in FINAL).
- **When it MOVES.** The servo's steering-end moves; 1.0 = steer to the line. Lower = a raw-physics tail.
- **DevScreen.** `racePlanCorridorEnd` slider — "P-Controller ends (% race)", DynamicsTuningSection.jsx:677
  (default 100%). **LIVE under both v4-OFF and v4-ON** (it is the OUTCOME end in both).

## 6. `directorV4OutcomeStart` = 0.25 — the v4 PULK END / OUTCOME start (STORAGE KEY; control relabeled "PULK end / OUTCOME begins")

- **Who reads it.** racePlanner.js:142 (`v4PulkEnd = config.directorV4OutcomeStart ?? 0.25`), :143
  (`pulkEnd = v4PulkEnd`), :144 (`corridorStart = v4PulkEnd`); sim-fairness.mjs `DIRECTOR_V4_OUTCOME_START`
  (threaded into `createRacePlan`).
- **What it gates.** Under v4 it sets `pulkEnd`, and `corridorStart` is DERIVED from it (`:= pulkEnd`). So
  it is the single boundary "PULK ends here, OUTCOME begins here" — the two-phase model's PULK→OUTCOME
  seam. At the default 0.25 (== `pulkStart`) PULK is zero-width and OUTCOME starts at the chaos boundary,
  byte-identical to the former collapse.
- **When it MOVES.** Raising it OPENS the PULK window `[pulkStart, this]` and hands OUTCOME (the pack's
  band-steering) off later; the three PULK-window mechanisms (§2) come alive. Lowering it to `pulkStart`
  closes the window again. **Decision (feat/pulk-reopen):** the config key name `directorV4OutcomeStart`
  is KEPT as the storage key (no schema migration; byte-identity at defaults preserved), but the
  user-facing control is relabeled "PULK end / OUTCOME begins" and its tooltip rewritten — there is
  exactly ONE user-facing control and ONE source for this boundary.
- **DevScreen.** In the **PULK group** (DynamicsTuningSection.jsx), control "PULK end / OUTCOME begins
  (0.25–0.55)". **LIVE under v4-ON; NO effect under v4-OFF** (guarded by `if (config.directorV4Enabled)`,
  racePlanner.js:141).
- **Companion control (new).** `racePlanPulkStart` = "PULK begin (0.05–0.50)", default 0.25 — the
  CHAOS→PULK boundary and the hero-curve director anchor (threaded live into the generator; §2 of the
  step spec). Together the two controls own the PULK window's begin and end.

## 7. `directorV4ReleaseProgress` = 0.97 — the B1 hero release (config key `directorV4ReleaseProgress`)

- **Who reads it.** racePlanner.js:511 (threaded into the generator config), :548 (a B1 hero is
  `released` when `phaseProgress >= plan._v4ReleaseProgress` and its target rank ≤ BAND_EDGES[0]);
  heroCurveGenerator.js `config.releaseProgress`; sim-fairness.mjs `DIRECTOR_V4_RELEASE_PROGRESS` (:212).
- **What it gates.** When the leading (B1) heroes are RELEASED from their tight front cluster to natural
  speed for the final run-out (racePlanner.js:546-556): past release, `targetRank = currentRank ⇒
  rankError 0 ⇒ servo 1.0 ⇒ natural speed`.
- **When it MOVES.** Earlier release = a longer natural run-out fight to the line; later = held in the
  cluster longer.
- **DevScreen.** `directorV4ReleaseProgress` slider — "B1 release progress (0–1]", DynamicsTuningSection.jsx:1157.
  **LIVE under v4-ON; NO effect under v4-OFF** (no heroes exist without v4).

---

## Every DevScreen control that has NO EFFECT under v4-ON (a slider that does nothing is a lie with a knob)

Verified inert under v4-ON at source:

| Control (DynamicsTuningSection.jsx) | Config key | Why it does nothing under v4-ON |
|---|---|---|
| P-Controller starts (:652) | `racePlanCorridorStart` | overwritten by `directorV4OutcomeStart` (racePlanner.js:144) |
| Bonus active until (:605) | `racePlanBonusTransitionEnd` | areaBonus is instant-zero at pulkStart (racePlanner.js:390); fallback never fires |
| Bonus fade duration (:627) | `racePlanBonusFadeDuration` | the fade it controls does not exist under v4 ("functionless", racePlanner.js:389) |
| Cohesion bias gain (:1334) | `pulkBiasGain` | PULK is zero-width → `computePulkBiasedTarget` always returns `rawSample` |
| Area bonus — PULK (:1243) | `areaBonusPulk` | PULK branch unreachable (racePlanner.js:459-460) |
| Row bonus — PULK (:1267) | `rowBonusPulk` | PULK branch unreachable (raceStep.js:51) |
| **The entire Director section** (:782–:996) | `governorDirectorEnabled`, `governorMaxEffect`, `governorMaxStepPerFrame`, `governorDirectorLeaderBrake`, `…ChallengerBoost`, `…BoostHeadroom`, `…PullStrength`, `…FrontPool`, `…MaxParallelBoosts`, `…BoostDurationMin/Max`, `…CatchThreshold`, `…LingerBrake`, `…Settling`, `…BoostOncePerRace`, `…CeilingCap`, `…FallbackEnabled`, `…FallbackFromPool`, `…FallbackMaxCount`, `…FallbackUntilPosition`, `…FallbackProtectMs` | the reactive governor is gated fully OFF under v4: `GOVERNOR_ON = … && !directorV4Enabled` (sim-fairness.mjs:431,876; browser parity). ~22 controls, all inert under v4-ON. |

And the reverse — controls with **no effect under v4-OFF** (guarded by `if (config.directorV4Enabled)`):
`directorV4Intensity`, `directorV4PackBandStrictness`, `directorV4OutcomeStart`, `directorV4ReleaseProgress`,
`directorV4ResolveB2/B3/B4/B5`, `directorV4SuppressChaosBonusB1`.

---

## The rule

> **A phase is not a time window. It is a contract with every value calibrated against it. Whoever moves
> the phase inherits responsibility for its numbers.**
