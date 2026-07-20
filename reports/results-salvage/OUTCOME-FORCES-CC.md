# OUTCOME-FORCES — CC: complete inventory of every force on forward speed in OUTCOME

Read-only source inventory. Author: CC. I did not read the Copilot file. Verified at source
(`raceStep.js`, `RaceScreen/index.jsx`, `racePlanner.js`, `raceGovernor.js`, `heroCurveGenerator.js`,
`rowLayout.js`, `storage/defaults.js`, `baseSpeedConfig.js`, `sim-fairness.mjs`). No runs, no fix.
Anything I did not verify is marked **not checked**. OUTCOME = leader-progress [0.5, 1.0] (choreo unconditional:
`corridorStart := pulkEnd = choreoOutcomeStart = 0.5`, `corridorEnd = 1.0`; no TRANSITION gap).

## The chain (verified, and sim == browser)

The whole per-frame forward advance is one expression, `advanceRacerT` in `raceStep.js`:

    newT = t + baseSpeed · boost · brake · rowEnvMult · trajectoryMult · areaBonusMult · governorMult · dt
    (then clamped to finishT + 0.001)

**Sim and browser apply the identical chain.** `sim-fairness.mjs` imports `advanceRacerT` (raceStep),
`createTrajectoryController` (racePlanner), `applyPulkLeadRotation` (raceGovernor), and the same reRoll config;
the browser live path (`RaceScreen/index.jsx`) calls the same `advanceRacerT`. Single source. **No divergence
found** in the speed chain. (The one browser-only speed effect is the `constSpeedActive` D4 diagnostic — a
dev-only "equalize all racers to mean Δt" mode, gated off in normal play; noted under hygiene.)

## The inventory — one row per force

DevScreen exposure is **not checked** except where a source comment names the slider — I verified values,
locations, ranges, gating, and direction, not the DevScreen wiring.

| name | where (file · fn) | how | default | reachable range in OUTCOME | direction | phase gating (OUTCOME) | who | DevScreen | source |
|---|---|---|---|---|---|---|---|---|---|
| **baseSpeed** | index.jsx · physics loop; raceStep · advanceRacerT | multiplicative (the base) | product below | see components | — | recomputed every frame from live spreadFactor | all | — | one product, recomputed |
| ├ race_baseSpeed | index.jsx · computeRaceBaseSpeed | field normalization const | derived | constant | neutral | constant | all (same) | not checked | derived from finishT/duration |
| ├ speedMultiplier | racer type (RACER_CONFIGS) | multiplicative | 1.0 (boarder) | constant, **uniform within a race** (one type) | boost or brake per type | constant | all (same type) | not checked | racer-type config |
| ├ **spreadFactor** | index.jsx · re-roll; baked into baseSpeed | multiplicative | reroll-drawn | **[0.919, 1.081]** (= baseSpeed min/max 0.00096/0.00113 ÷ mean) | bidirectional, ±8% symmetric | **RE-ROLLED until 95% of race → active in OUTCOME** | all | not checked | baseSpeedConfig min/max |
| ├ **speedBonusMult** | index.jsx · computeSpeedBonus (rowLayout) | multiplicative, baked into baseSpeed | 1 + back-row bonus | ≥1.0, grows with start row (magnitude per-track **not checked**) | boost only (back rows) | **active in OUTCOME (post=1)** | all (by start row) | not checked | speedBonusFactor 1.0 |
| **rowEnvMult** | raceStep · computeRowEnvMult | multiplicative correction | 1.0 | **= 1.0 in OUTCOME** (post strength 1 → no correction; full bonus stays in baseSpeed) | neutral in OUTCOME | active but **no-op** (post=1) | all | "PULK end" slider (choreoOutcomeStart) named in source | rowBonusPost=1 |
| **boost (drafting)** | index.jsx · physics loop | multiplicative | 1.04 when drafting else 1.0 | **{1.0, 1.04}** | **boost only** | active | any racer drafting | not checked | draftingBoost=1.04 |
| **brake (avoidance)** | index.jsx; computeEffectiveBrakeFactor; raceBehavior.brakeMatchFactor | multiplicative | 1.0 unless avoidanceActive | **[≲0.945, 1.0]** — speedBrakeFactor 0.945 floor; brakeMatch can go **below** 0.945 to match a slower leader | **brake only** | active | any racer in traffic | not checked | speedBrakeFactor 0.945 + brakeMatch |
| **trajectoryMult** | racePlanner · createTrajectoryController.update; slewed in index.jsx | multiplicative + clamp | 1.0 | **[0.85, 1.1]** (`clamp(1 + gain·error/nActive + noise, minMult, maxMult)`) | **bidirectional, ASYMMETRIC: +10% boost / −15% brake** | **primary OUTCOME force — every racer steered on RANK** | all (heroes toward hero curve) | not checked | gain 2.0, min 0.85, max 1.1, noise 0.0008 |
| **areaBonusMult** | racePlanner · update | multiplicative | 1.0 | **= 1.0 in OUTCOME** (instant cut at CHAOS boundary under choreo) | neutral in OUTCOME | **INERT** | all | not checked | AREA_BONUS_BASE_DELTAS × mult 2.0 (CHAOS only) |
| **governorMult** | raceGovernor · applyPulkLeadRotation | multiplicative + slew | 1.0 | **= 1.0 in OUTCOME** (governorPhaseWeight → EXACTLY 0 at corrStart) | neutral in OUTCOME | **INERT** | all | not checked | governor stops at OUTCOME |
| dt | raceStep · advanceRacerT | scalar | 1.0 (=FIXED_DT/16) | constant | neutral | constant | all | pinned | constant |
| finish clamp | raceStep · advanceRacerT | clamp | finishT+0.001 | caps t near finish | brake-at-line | active | all | — | finishT |
| **rank servo target** (hero curve) | heroCurveGenerator · sampleHeroCurve | sets **targetRank**, not a multiplier | curve | feeds rankError → trajectoryMult (same [0.85,1.1]) | via servo | heroes only, in OUTCOME | named heroes | not checked | curve internals **not fully read** |

## The two numbers

### 1. The compounded OUTCOME envelope (relative to field mean)

I separate **per-race constant** (a racer is simply fast/slow — spreadFactor, back-row bonus, type) from
**per-frame authority** (a racer is actively pushed — trajectoryMult, drafting, braking). Conflating them
misleads: a permanent +8% is not the same "too fast" as a +10% servo push.

**Fastest legitimate racer, worst case (product, contributions shown):**

    spreadFactor 1.081  ×  back-row ≤~1.05  ×  draft 1.04  ×  servo 1.10   ≈  1.30   (≈ +30%)
    └── per-race constant (≤ +13%) ──┘        └── per-frame authority (≤ +14%) ──┘

For a front racer (no back-row bonus): `1.081 × 1.04 × 1.10 ≈ 1.237` (≈ **+24%**).

**Slowest, worst case:**

    spreadFactor 0.919  ×  brake 0.945 (or lower via brakeMatch)  ×  servo 0.85   ≈  0.738   (≈ −26%)

**Asymmetry (per-frame authority only, the Owner's "bonus vs braking"):**
- **Boost authority:** draft(+4%) × servo(+10%) = **+14.4%**.
- **Brake authority:** brake(−5.5%) × servo(−15%) = **−19.7%**, and brakeMatch extends the brake further
  (it can drop below 0.945 to match a slow leader). **Braking authority exceeds boosting authority.**

**Typical racer (at its target rank, no traffic, not drafting):** trajectoryMult ≈ 1.0 ± noise(0.0008),
brake 1.0, boost 1.0 → speed ≈ its per-race constant (spreadFactor × bonus), i.e. **no active correction at
all**. This is the Owner's exact observation: a leader already at rank 1 (its target) → rankError 0 → servo
1.0 → it keeps whatever per-race speed it has, however large the gap. The servo steers on RANK, not distance,
so a runaway leader is never pulled back.

### 2. Against the project's "own rule" (`NATURALNESS_CEILING`)

The stated rule, quoted from `raceGovernor.js`: *"Hard naturalness leitplanke: the effective director ceiling
may NEVER exceed +20% of the field"* — `NATURALNESS_CEILING = 1.2`, enforced by `computeDirectorCeiling`,
which `applyPulkLeadRotation` clamps `governorMult` to.

**Does the rule apply to OUTCOME? No — it is a GOVERNOR rule, and the governor is 1.0 in OUTCOME.** The +20%
leitplanke bounds only `governorMult` (a PULK-phase per-frame authority). Nothing in OUTCOME is clamped to it:
`trajectoryMult` has its own separate clamp (`minMult 0.85 / maxMult 1.1`), drafting and spreadFactor have no
such envelope, and they compound freely.

**Holding OUTCOME against the +20% number:**
- **Per-frame authority in OUTCOME does NOT exceed +20%:** the servo maxes at +10%, drafting +4%; their
  product (+14%) is under +20%. So on the "how hard is a racer actively pushed" reading, OUTCOME is *within*
  the number the project calls natural — it is just not bound to it by any code.
- **Total compounded speed DOES exceed +20%:** ~+24–30% for a fast racer (arithmetic above). But that excess
  is dominated by the **per-race constant** (spreadFactor up to +8%, back-row bonus up to ~+5%) — a racer
  being fast, not being pushed. The +20% governor rule was never meant to bound the per-race spread.

**So the Owner's claim, checked not assumed:** if "too fast" means *actively pushed beyond +20%*, OUTCOME does
NOT breach it (the servo is +10%, capped). If "too fast" means *total speed beyond +20% of the field mean*,
OUTCOME DOES reach ~+24–30% — but via the per-race spread + back-row bonus, which no OUTCOME-phase envelope
constrains, not via the servo. There is **no OUTCOME-phase equivalent of the governor's +20% leitplanke.** The
one place a "±20% speed band" is even mentioned in OUTCOME is inside `heroCurveGenerator` — but there it is a
*distance budget* used to reject infeasible hero curves, not a clamp on any racer's speed (the actual hero
authority is the same +10% servo). That the +20% rule exists for the governor and has no counterpart in
OUTCOME is the concrete substance behind "we are not obeying our own rules."

## What is inert in OUTCOME (cannot be tuned without re-enabling something)

- **areaBonusMult** — instant-cut to 1.0 at the CHAOS boundary under choreo (`if (!inChaos) areaBonusMult = 1.0`).
  `racePlanBonusStrengthMultiplier 2.0` and `AREA_BONUS_BASE_DELTAS` (B1 +0.03 … B5 −0.01) affect **CHAOS only**.
- **governorMult** and everything in `raceGovernor.js` — the PULK contest, the settle-brake, `applyPulkLeadRotation`,
  `pulkEnvelopeMaxEffect 0.12`, `pulkEnvelopeMaxStepPerFrame 0.01`, `NATURALNESS_CEILING 1.2`: `governorPhaseWeight`
  fades to EXACTLY 0 at `corrStart`, so all of it is 1.0 / off in OUTCOME.
- **rowEnvMult** — a no-op in OUTCOME because `rowBonusPost = 1` (the full row bonus lives in baseSpeed, uncorrected).
  (It is `rowBonusPulk = 0` that zeroes the row bonus, but that is the PULK phase, not OUTCOME.)
- **computePulkBiasedTarget** — see below; no-op outside PULK.

## What is unreachable (config bound wider than the chain produces)

- `trajectoryMult` config could permit a wider clamp, but the reachable value is bounded by `minMult 0.85 /
  maxMult 1.1` AND by `gain·error/nActive`: to hit +10% needs rankError ≥ 0.05·nActive (≈2 ranks at n=40);
  to hit −15% needs ≈−3 ranks. A racer within ~1 rank of target never leaves ≈[0.97, 1.03]. So the ±10/15%
  is reachable only by racers well off their target rank.
- `pulkEnvelope*` / `governorMaxEffect` bounds are unreachable in OUTCOME entirely (governor off).

## The existing field-cohesion path (`racePlanner` PULK bias) — reported, not evaluated

`computePulkBiasedTarget` in `racePlanner.js`: a shipped, always-on 3-racer cohesion mechanism.
- **Who:** exactly `plan.pulkRacerIds` — `shuffled.slice(0,3)`, three racers chosen at plan creation.
- **Phase:** `if (getPhase(...) !== 'PULK') return rawSample` — **active ONLY in PULK**, no-op elsewhere.
- **Hooks into:** the re-roll draw (Pass 1) — it nudges those three racers' spreadFactor re-roll samples toward
  `pulkCenterT` (the live pulk centroid t), gain `_pulkBiasGain 2.0`. This is a genuine **distance-based** bias
  (`pulkCenterT − thisRacer.t`), unlike the rank-based OUTCOME controller.
- **Does the quantity it modifies still exist in OUTCOME?** It modifies the re-roll draw of `spreadFactor`. The
  re-roll **still runs in OUTCOME** (until 95%), so the quantity exists — but this bias does **not fire there**
  (it is gated to PULK, and it only ever touches the 3 `pulkRacerIds`). In OUTCOME the re-roll draws are
  unbiased (`return rawSample`). I do not evaluate or extend this — just stating what/where it is.

## Hygiene (separate)

- **Dead / no-op in OUTCOME:** `rowEnvMult` is computed and multiplied in every OUTCOME frame but is identically
  1.0 there (post=1) — a live multiply that does nothing in half the race.
- **The `advanceRacerT` doc comment vs the controller comment disagree on the chain:** `advanceRacerT` lists
  `… areaBonusMult · governorMult · dt`; the `createTrajectoryController` usage comment lists
  `… trajectoryMult · areaBonusMult · dt` and omits `governorMult`. Both produce 1.0 in OUTCOME so it is
  harmless there, but the two comments are not the same list — a documentation drift worth noting.
- **`constSpeedActive` (D4)** is a browser-only diagnostic that overwrites the whole chain with mean-Δt
  equalization; it is not in the sim path. A dev toggle that, if ever left on, silently voids every force above.
- **Two clocks for one phase:** phase gating runs on `phaseProgress` (leader fraction) in the live path but on
  `elapsedMs` in the legacy fallback; `getPhase` carries both. Verified they derive from one set of fractions,
  but it is two code paths for one boundary.

## What I did NOT check (marked)

- **DevScreen exposure** for nearly every knob (I read defaults and source, not the DevScreen sections).
- **The exact back-row `speedBonus` magnitude** — the formula (`bonus_N = N·tOffset/row0Distance·speedBonusFactor`)
  is verified but the reachable maximum is per-track (rowGap/pathLength) and I did not compute it for a specific
  track; I bounded it at "~+5%" as an estimate, not a measurement.
- **`heroCurveGenerator` internals** — I verified it returns a time-varying `targetRank` consumed by the servo
  (not a separate multiplier), but did not read the curve construction (`makeHeroCurve`/`anchorHeroCurve`).
- **`trajectoryTransitionDuration`** value (the servo slew duration) — confirmed the slew exists (easeInOutCubic),
  value not read.
