# PHASE CONTRACT — every value calibrated against a phase boundary

**Owns:** the read-only inventory of every value calibrated against a phase boundary, and the rule that follows from it — whoever moves a boundary inherits every value calibrated against it. It proposes nothing and changes nothing.

★★ **ITS NUMBERS ARE DATED 2026-07-14; ITS RULE IS NOT** (added 2026-09-27, DELIVERY-CLEAN-2 arc 2).
The paragraph below calls this *"the CURRENT shipped race world"*, and that sentence was true when it
was written and is **no longer safe to read as current**: the world has been re-baselined since —
speed-150, COMBO15 and gap-reroll's flip among them — and this document's own § at `:105` already
concedes that one of its sweeps predates the speed-150 re-baseline. **Read the VALUES here as of
2026-07-14 and check any of them against the source before relying on it**; the live baseline is
[reports/parity/REBASELINE.md](../reports/parity/REBASELINE.md) and config values live in
`client/src/modules/storage/defaults.js`. **The CONTRACT — a phase boundary is a contract — is
undated and still binds.**

**Read-only inventory. Nothing here proposes or changes anything.** Date: 2026-07-14, branch `chore/sim-trust`.
Every claim is verified at source (file:line). This is the CURRENT shipped race world — one unconditional
choreographed model, no `v4-ON/v4-OFF` conditional. The point of this document is that a phase is a
contract: whoever moves a boundary inherits responsibility for every value calibrated against it. This
enumerates those contracts so a boundary can never move and silently break them.

## The phase model (verified)

`DEFAULT_PHASE_FRACTIONS` (`racePlanner.js`, the `export const DEFAULT_PHASE_FRACTIONS` block) holds
`pulkStart, pulkEnd, transitionEnd, corridorStart, corridorEnd, midToLateSwitchFraction`. All but the
first are raw fallback literals; the resolved plan overwrites three of them. **`pulkStart` is NOT a
literal at all — the block READS `DEFAULT_RACE_DYNAMICS_CONFIG.racePlanPulkStart`**, so a direct
`createRacePlan` caller that passes no `pulkStart` (a unit test, say) gets the same shipped value a race
does, and there is no second number to drift. *(CONTROL-BOUNDS-1, 2026-09-03: this paragraph said the
fallback literal was `0.25` and warned that the shipped value differs from it. It described the
pre-COMBO15 file; the literal was replaced by the config read when `racePlanPulkStart` became ownable,
and the same fossil was standing at five more sites — three code comments in `racePlanner.js`, one in
`defaults.js`, one in `sim-fairness.mjs` — all corrected together. The values themselves are not
restated here; they live in `defaults.js`.)* `pulkEnd` and `corridorStart` are overwritten from
`choreoOutcomeStart` (below).

**The shipped two-phase model (racePlanner.js:174-176), UNCONDITIONAL.** Choreography is always on
(`_choreoEnabled` is hardcoded `true`, racePlanner.js:330). At plan build time:
`choreoPulkEnd = config.choreoOutcomeStart ?? phaseFractions.pulkStart`, then `pulkEnd := choreoPulkEnd` and
`corridorStart := choreoPulkEnd` (DERIVED, not a second copy). So OUTCOME begins exactly where PULK ends:
**CHAOS → PULK → OUTCOME, with no TRANSITION phase.** The monotonic clamp chain (racePlanner.js:191-201)
keeps `pulkStart <= pulkEnd <= corridorStart <= corridorEnd`.

`getPhase` (racePlanner.js:695-708) still lists five ordered branches
(`PRE_PULK < pulkStart · PULK < pulkEnd · TRANSITION < corrStart · OUTCOME < corrEnd · FINAL`), **but
because `corridorStart == pulkEnd` always, the TRANSITION branch is zero-width and unreachable** — a racer
goes straight from PULK to OUTCOME. TRANSITION is a dead branch, not a live phase.

At the shipped defaults `racePlanPulkStart == 0.15` and `choreoOutcomeStart == 0.6` the three live phases are:
**CHAOS/PRE_PULK [0, 0.15) · PULK [0.15, 0.6) · OUTCOME [0.6, 1.0)**. *(Corrected 2026-09-03 from 0.5 at three sites in this document; the shipped value has been 0.6 since `5646d238`, 2026-07-17. `docs/DEVSCREEN-INVENTORY.md` had it right, so the two documents disagreed for 47 days. Found as SECOND SITES of the same claim in FORCE-MAP.)* The owner may set `choreoOutcomeStart`
anywhere in 0.25–0.70; since `pulkStart` (0.15) now sits below that whole range, PULK is always at least 0.10
wide under the shipped chaos window (it is no longer collapsible to zero-width from the DevScreen, unlike the
pre-COMBO15 world where `pulkStart` was 0.25 == the `choreoOutcomeStart` minimum).

---

## 1. `pulkStart` = 0.15 (shipped; no fallback literal — `DEFAULT_PHASE_FRACTIONS.pulkStart` READS the config key) — the CHAOS→PULK boundary (config key `racePlanPulkStart`)

- **Who reads it.** `getPhase` (racePlanner.js:697,703); the row-envelope chaos-end (raceStep.js via
  `computeRowEnvMult`; browser `PHASE_CHAOS_END` index.jsx; sim `pulkStartLive` sim-fairness.mjs); the
  areaBonus instant-zero boundary — under choreo the areaBonus is full during CHAOS and snaps to `1.0`
  for the WHOLE field from `pulkStartFrac` onward (racePlanner.js:999-1015); the phase-split `inChaos`
  branch (racePlanner.js:1063); the hero-cast boundary (heroes are cast and tagged `isHeroChoreographed`
  once `phaseProgress >= pulkStartFrac`, racePlanner.js:1080,1120,1193); the hero-curve generator anchor
  (`anchorProgress: pulkStartFrac`, racePlanner.js:1143); and the PULK lead-rotation window start
  (`progress >= pulkStartFrac`, raceGovernor.js:260).
- **What it gates.** The end of CHAOS: where the areaBonus snaps to zero for the whole field, where the
  2–4 heroes are cast with anchored curves, and where the PULK lead rotation begins.
- **When it MOVES.** The chaos window resizes → the areaBonus-zero point moves, heroes are cast
  earlier/later, and the PULK contest window opens earlier/later.
- **DevScreen.** `racePlanPulkStart` — shipped default **0.15** (COMBO15; the narrower chaos window). It is
  the CHAOS→PULK boundary AND the hero-curve anchor; the live resolved value is threaded into the generator,
  so there is no second copy of the anchor. (It is a pinned config key surfaced by no live control — see
  [DEVSCREEN-INVENTORY.md](DEVSCREEN-INVENTORY.md).)
- **Calibrated for it.** 0.15 as the chaos→choreo boundary; `areaBonusEarly` and `rowBonusEarly` both at their shipped defaults. The
  COMBO15 chaos steer + band-aware re-roll bias run over this `[0, 0.15]` chaos window (see
  [FAIRNESS.md](FAIRNESS.md)).

## 2. `pulkEnd` = `choreoOutcomeStart` — the PULK end / OUTCOME start (config key `choreoOutcomeStart`) — **the owned PULK→OUTCOME seam**

- **Resolution.** `pulkEnd := choreoOutcomeStart` and `corridorStart := choreoOutcomeStart`
  (racePlanner.js:174-176). This single value is the PULK→OUTCOME seam; there is exactly ONE source and
  ONE user-facing control for it.
- **Who reads it.** `getPhase` (racePlanner.js:698; corrStart branch :699 is the same value); the
  row-envelope pulk-end (raceStep.js; browser `PHASE_PULK_END`; sim `pulkEndLive`); the phase-split
  `inPulk` branch (racePlanner.js:1064); the PULK lead-rotation window end
  (`progress < pulkEndFrac`, raceGovernor.js:261); the phase-weight fade end (`governorPhaseWeight` →
  EXACTLY 0 at `corrStartFrac == pulkEndFrac`, `raceGovernor.js` → `governorPhaseWeight`); the PULK re-roll bias
  (`computePulkBiasedTarget` returns `rawSample` unless `getPhase()==='PULK'`, racePlanner.js:1595); the
  phase context threaded to the governor (`getPhaseFractions`, racePlanner.js:1857-1859).
- **What it gates.** PULK width; the window in which the PULK cohesion bias (`pulkBiasGain`) acts; the
  window in which the PULK lead rotation runs; the phase-weight fade window; and — via
  `corridorStart := pulkEnd` — the moment OUTCOME band-steering begins.
- **When it MOVES.** Raising it lengthens the PULK contest and hands OUTCOME off later; the PULK-window
  mechanisms act over a longer span. Lowering it toward `pulkStart` (0.15, below its 0.25 minimum) narrows the PULK window (toward zero
  width) and OUTCOME starts at the chaos boundary. Because PULK end == OUTCOME start, moving this ONE
  value moves both seams together.
- **DevScreen.** "PULK end / OUTCOME begins (0.25–0.70)", config key `choreoOutcomeStart`, in the PULK
  Phase card. Default **0.6**. *(Corrected 2026-09-03 from 0.5. The control itself was wrong in the same
  direction — label "(0.25–0.55)", `max: 0.55`, tip "0.5 = shipped" — so the slider could not reach the
  value the game runs; **repaired by CONTROL-BOUNDS-1 the same day**, by setting the widget clamp to the
  VALIDATED range [0.25, 0.60] that this document and DEVSCREEN-INVENTORY.md had already recorded. The
  shipped value did not move.)*
  *(★ AND IT MOVED BACK. The owner reversed the widening on **2026-09-04**: the slider's top is
  **0.60** again, because the top is the edge of what has been MEASURED on the tree that ships and
  SWEEP 2 is from 2026-07-17 — before the speed-150 re-baseline, COMBO15, gap-reroll's flip and the
  B2 attackers. The mechanism's wall really is 0.70 and that is not the question. The paragraph below
  records the widening as it was argued at the time.)*
  *(The TOP moved again the same day, SLIDER-HEADROOM-1: to **0.70**, taken from the neighbour
  rather than from feel. `choreoResolveB3` is a fixed **0.70**, so B3's OUTCOME settling window is
  exactly `[choreoOutcomeStart, 0.70]` — 0.10 wide at the shipped 0.60, **zero at 0.70**. That is the
  wall: past it a band would be asked to be resolved before OUTCOME has begun. SWEEP 2 (2026-07-17)
  measured all four points and agrees — the band-reach gate holds on 3 of 4 tracks at BOTH 0.60 and
  0.70 and collapses to **0 of 4 at 0.80**. The recorded "validated range [0.25, 0.60]" was the top of
  what had been WRITTEN DOWN, not of what had been measured. **The shipped value is still 0.60**, and
  the headroom is not free: per-band reach degrades monotonically, B3 on city-circuit going 68% at
  0.60 to 59% at 0.70.)*
- **Calibrated for it.** `pulkBiasGain`, `pulkLeaderBrake`, `pulkChallengerBoost` and the
  rest of the `pulk*` contest strengths are all calibrated for the PULK window this boundary defines.
  The PULK phase-split bonuses (`areaBonusPulk`, `rowBonusPulk`, gated by the Phase-Split master
  switch, default OFF) also live against it.

## 3. `corridorStart` = `pulkEnd` — the OUTCOME start (DERIVED from `choreoOutcomeStart`, not a literal)

- **Resolution.** `corridorStart := choreoPulkEnd` (racePlanner.js:176); it is the SAME value as
  `pulkEnd`. The `racePlanCorridorStart` literal (default 0.55) is overwritten and never survives to a
  live race — the seam is owned by `choreoOutcomeStart` (§2).
- **Who reads it.** `getPhase` `corrStartFrac` (racePlanner.js:699); the servo pre-OUTCOME gate
  (`_preOutcome && !isHero` pins the pack to 1.0 before OUTCOME, racePlanner.js:1086,1268); the
  phase-weight fade-to-zero end (`governorPhaseWeight` returns 0 at `progress >= corrStartFrac`,
  `raceGovernor.js` → `governorPhaseWeight`); the governor phase context (`getPhaseFractions`, `racePlanner.js`).
- **What it gates.** The moment the servo (`trajectoryMult`) STARTS steering the PACK toward target ranks
  (before it, the pack is pinned to 1.0; heroes steer along their curves from `pulkStart`). It is also
  where the PULK lead rotation's phase weight reaches exactly 0, so `governorMult` is faded to 1.0 by
  OUTCOME.
- **When it MOVES.** It moves with `choreoOutcomeStart` (§2) — earlier OUTCOME = more servo correction
  budget / more fairness authority, and a shorter PULK contest.
- **DevScreen.** No independent control. The `racePlanCorridorStart` slider still renders
  (DynamicsTuningSection.jsx:959-989, "P-Controller starts") but its value is overwritten by
  `choreoOutcomeStart` at plan build, so the owned seam is the "PULK end / OUTCOME begins" control.
- **Calibrated for it.** The phase-weight fade window is anchored on it (spans
  `max(corrStartFrac − pulkEndFrac, MIN_FADE_SPAN)` back from it, `raceGovernor.js` → `MIN_FADE_SPAN`; since it equals
  `pulkEnd`, the fade is the `MIN_FADE_SPAN`=0.05 tail ending at OUTCOME start).

## 4. `corridorEnd` = 1.0 — the OUTCOME→FINAL boundary (config key `racePlanCorridorEnd`)

- **Who reads it.** racePlanner.js:158 (setter from `config.corridorEnd`); the clamp ceiling (:191-201);
  `getPhase` `corrEndFrac` (:700); `getPhaseFractions` (:1858).
- **What it gates.** When the servo STOPS steering (raw physics after, in FINAL).
- **When it MOVES.** The servo's steering-end moves; 1.0 = steer to the line; lower = a raw-physics tail.
- **DevScreen.** `racePlanCorridorEnd` slider — "P-Controller ends (% race)"
  (DynamicsTuningSection.jsx:990-1027), default 100%. LIVE (it is the OUTCOME end).

## 5. `transitionEnd` = 0.75 — the areaBonus fade-end literal (config key `racePlanBonusTransitionEnd`) — **INERT**

- **Why it's inert.** Under the unconditional choreo model the areaBonus is instant-zero from `pulkStart`
  (racePlanner.js:999-1015) — there is no `easeInOutCubic` fade to trigger, so `bonusFadeDuration` is
  functionless and `transitionEnd` never gates a fade. Its only remaining structural role is a
  `corridorStart` fallback (`resolvedCorridorStart = corridorStart ?? transitionEnd`, `racePlanner.js`),
  which never fires because `corridorStart` is always defined (it is derived from `choreoOutcomeStart`).
- **Who reads it.** racePlanner.js:155-156 (setter from `config.bonusTransitionEnd`); :188 (the never-firing
  `corridorStart` fallback); :260 (`transEnd` ms); :563 (`transEndFrac`); :1021 (the areaBonus fade
  trigger inside the `else` branch — dead code because `_choreoEnabled` is always true, racePlanner.js:999);
  :1858 (`getPhaseFractions` returns `transEndFrac`).
- **DevScreen.** `racePlanBonusTransitionEnd` slider — "Bonus active until (% race)"
  (DynamicsTuningSection.jsx:903-930, range 30–95%). Does NOTHING at the shipped model (no fade exists to
  bound).
- **Naming trap.** `transitionEnd` (0.75) is NOT where any phase ends — there is no live TRANSITION phase.
  It is a misleadingly named, currently inert literal.

## 6. `choreoReleaseProgress` — the B1 hero release

- **Who reads it.** racePlanner.js:341 (`_choreoReleaseProgress` on the plan) and :343-349 (band-index 0
  of `_choreoBandResolve`); :1149 (threaded into the generator as `releaseProgress`); :1276-1279 (a B1 hero
  is `released` when `phaseProgress >= plan._choreoReleaseProgress` and its target rank ≤ `BAND_EDGES[0]`).
- **What it gates.** When the leading (B1) heroes are RELEASED from their tight front cluster to natural
  speed for the final run-out (racePlanner.js:1272-1279,1345-1349): past release, `targetRank = currentRank ⇒
rankError 0 ⇒ servo 1.0 ⇒ natural speed`.
- **When it MOVES.** Earlier release = a longer natural run-out fight to the line; later = held in the
  cluster longer. Companions `choreoResolveB2..B5` (0.8/0.7/0.65/0.6) are the per-band resolve
  checkpoints for the non-B1 heroes.
- **DevScreen.** Surfaced with the other choreo controls in the PULK Phase / choreography area of
  DynamicsTuningSection.jsx.

---

## Hero choreography — the unconditional mechanism (racePlanner.js + heroCurveGenerator.js)

Choreography is ALWAYS on; there is no enable flag. The generator runs ONCE, one frame after `pulkStart`,
on the actual field state, casting 2–4 heroes with anchored position-over-time curves
(racePlanner.js:1120-1202). Heroes track their curves exactly (strictness 1.0); the pack runs looser
(`choreoPackBandStrictness`, racePlanner.js:1374-1378). Config keys and shipped values (defaults.js):
`choreoIntensity` 0.6, `choreoPackBandStrictness` 0.5, `choreoSuppressChaosBonusB1` false (spoiler
switch), `choreoReleaseProgress` 0.97, `choreoResolveB2/B3/B4/B5` 0.8/0.7/0.65/0.6, `choreoOutcomeStart`
**0.6** *(corrected 2026-09-03 from 0.5)*. The plan-internal mirrors are `_choreo*` (e.g. `_choreoEnabled` hardcoded true).

## PULK lead rotation — the unconditional PULK-phase contest (raceGovernor.js `applyPulkLeadRotation`)

`applyPulkLeadRotation` is the ONLY writer of `r.governorMult`. It runs whenever the race-plan controller
exists (shipped on), inside the live PULK window `[pulkStart, pulkEnd)`, staging a real front contest:
1–2 attacker slots boost the live P2/P3 until one takes the lead, a permanent outsider slot boosts the
deepest still-reachable outsider, and a settle-brake set holds a dethroned leader back until it is
`dropDepthLengths` behind (`raceGovernor.js` → `dropDepthLengths`). Every force term is scaled by `governorPhaseWeight`,
which fades to EXACTLY 0 by OUTCOME (`raceGovernor.js` → `governorPhaseWeight`). Strengths live in the
`pulk*` namespace (defaults.js): `pulkLeaderBrake` 0.1, `pulkChallengerBoost` 0.06, `pulkFrontPool` 8,
`pulkBoostHeadroom` 0.1, `pulkCeilingCap` true; realism envelope `pulkEnvelopeMaxEffect` 0.12 (±12% clamp)
and `pulkEnvelopeMaxStepPerFrame` 0.01 (per-frame slew); rotation internals
`pulkLeadRotationAttackerSlots` 2, `pulkLeadRotationDropDepthLengths` 8,
`pulkLeadRotationOutsiderMaxReachLengths` 15, `pulkLeadRotationDeadlockTimeoutMs` 12000,
`pulkLeadRotationMinHoldMs` 750.

## Config-key renames (RETIRED)

The `RENAMED_KEY_MIGRATION` shim that once carried a pre-cleanup config's VALUES to the current keys was
**removed** (commit `b4e1aba`): single-player with localStorage cleared between runs, so there is no
persisted pre-rename config to migrate. A stale blob still holding old keys now simply fails validation and
falls back to defaults (graceful + intended). The current canonical keys are the `choreo*` and `pulk*`
names above; the old `directorV4*` / `governorDirector*` / `governor*` names are gone entirely — not even
as migration inputs. For the live knobs see [RACE-ACTION.md](RACE-ACTION.md#8-configuration-knobs).

---

## The rule

> **A phase is not a time window. It is a contract with every value calibrated against it. Whoever moves
> the phase inherits responsibility for its numbers.**
