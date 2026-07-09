# SIM AUDIT — findings (CC, independent)

Read-only audit at `bf6992e`. Shipped modules git-verified untouched (`git diff origin/feat/v4-choreography -- client/ server/` empty). Every claim cites `file:line`. The fingerprint (`verify-winning.sh`) is treated as a change-detector only, **never** as proof of correctness.

**Status of this document:** Layer 1 (fidelity) is complete and proven. The known metric failures are re-confirmed at source. The executable test layers (2–5) and the full statistics/Layer-8 sweep are **NOT yet built** — everything not proven below is explicitly marked **UNTRUSTED / NOT AUDITED**, per the audit's own rule that an unproven metric is UNTRUSTED.

---

## LAYER 1 — FIDELITY (complete)

### 1.3 SPRITE GEOMETRY — the decisive question: **Plan-Claude's claim is REFUTED (with numbers)**

Claim under test: *the sim hard-codes raw `displaySize` while the browser uses a scaled body, so every avoidance distance and the "wall is TRAFFIC" conclusion was measured on wrong-size bodies.*

**Refuted for the default configuration** (autoScale `enabled:true`, no per-type overrides — the state the measurements ran in). Proof chain, all at source:

1. **The racer table matches shipped, 0 drift.** `sim-fairness.mjs:468-489` (`RACER_CONFIGS`) differentially tested against all 20 shipped `client/src/modules/racer-types/*RacerType.js`: `speedMultiplier`, `displaySize`, `bodyFillX`, `bodyFillY`, `surfaceClasses` — **20/20 checked, 0 mismatches** (`scripts/night-sweep/audit-racer-table-diff.mjs`).
2. **The sim scales the body via the SHARED functions, not raw displaySize.** `sim-fairness.mjs:595,602` call `computeRacerLayout` + `computeBodyNarrowRef` (imported from the shipped `rowLayout.js` / `autoSpriteScale.js`), producing `bodyRef.bodyNarrow`; `:670` sets `drawnBodyWidthPx = bodyRef.bodyNarrow`.
3. **The browser resolves to the identical value.** `index.jsx:477` `displaySizeScale = bodyRef.bodyNarrow / displaySize`; `:482` `drawnBodyWidthRefPx = displaySize × displaySizeScale = bodyRef.bodyNarrow`; `:639` `drawnBodyWidthPx = drawnBodyWidthRefPx`. Same `computeBodyNarrowRef`, same `W_REF = min(285, effectiveWidth)`, same inputs ⇒ **identical body width.**
4. **The avoidance rule itself is shared code, not re-implemented.** Both call `applyRacerBehavior` from `raceBehavior.js` (`sim-fairness.mjs:71,1910`; `index.jsx:58,1208`).

**Therefore "the wall is TRAFFIC" is NOT invalidated by sprite geometry** — the traffic/avoidance frames were measured on correct-size bodies, in the default config.

**Blind spots to report (real divergence surfaces, all NON-default storage states):**
- The browser honours per-type `displaySize` **overrides** from storage (`index.jsx:453-456`); the sim has no override path. A stored override ⇒ browser body ≠ sim body.
- The browser only scales inside `if (autoScaleConfig.enabled)` (`index.jsx:452`); if the owner **disables** autoScale, the browser uses **raw** `displaySize` while the sim still scales (`sim-fairness.mjs:602` is unconditional) — the *inverse* of the original claim.
- The sim uses `DEFAULT_AUTO_SCALE_CONFIG` (`:102,595,602`), not the browser's stored `autoScaleConfig`. Any customized autoScale param diverges silently.
- **`RACER_CONFIGS` is an unguarded duplicate.** 0 drift today, but nothing fails if a shipped type's geometry changes. `audit-racer-table-diff.mjs` is committed as a standing guard; it should be run in CI, or the table replaced by importing the shipped racer types.

### 1.1 DUPLICATED-RULE MAP

**Shared (imported from shipped modules — NOT re-implemented):** avoidance/lateral rule (`raceBehavior.js`), servo + areaBonus + phase structure (`racePlanner.js`), governor (`raceGovernor.js`), body/row geometry + speed bonus (`rowLayout.js`), base speed (`raceBaseSpeed.js`), effective brake/drafting (`raceBehaviorConfig.js`), lap/ssf (`camera/lapUtils.js`), config defaults (`storage/defaults.js`). Imports at `sim-fairness.mjs:70-102`. **This is a strong fidelity result: the physics is the game's physics.**

**Re-implemented (the sim keeps its own copy — each a place it can drift):**
| # | Re-implementation | file:line | Status |
|---|---|---|---|
| R1 | `RACER_CONFIGS` racer table | `:468-489` | **verified 0 drift; unguarded (now guarded by test)** |
| R2 | `easeInOutCubic` | `:459` | trivial; matches index.jsx (unproven byte-equal) |
| R3 | **Main race loop / t-update orchestration** (Pass-1/Pass-2, order of servo/areaBonus/avoidance/t-update, re-roll firing) | `:~1600-1910` | **UNTRUSTED — see 1.4** |
| R4 | Re-roll schedule (`rollCount`/`rollInterval`/`lastRollDeadline`) | `:619-621` | mirrors browser (`index.jsx`); unproven byte-equal |
| R5 | Sim-side observers (overtake proximity, hero-map, tier2, honest-overlap) | various | measurement-only; not in browser |

### 1.4 PARITY — **UNTRUSTED: no per-frame parity harness exists**

There is **no parity harness** in `scripts/` comparing the sim's per-frame racer positions to the browser engine (searched; only `compare-sets.mjs`/`compare-zones.mjs`, which are unrelated). The single largest re-implementation — the main loop (R3) — therefore has **no automated proof it matches the browser at HEAD.** The physics *modules* are shared, but the *orchestration* (when re-roll fires, the exact `r.t += baseSpeed·boost·brake·tef·rowEnv·v4Bonus·traj·areaBonus·gov` product at `:~1631`, the pass ordering) is hand-mirrored from `index.jsx` and unverified — especially after v4 changed the phase structure, governor coupling, and areaBonus scope. **Verdict: the sim's frame-level fidelity is UNTRUSTED until a parity harness is built and passes at HEAD.** This is the top follow-up.

### 1.5 CONFIG DIVERGENCE
- Sim reads `DEFAULT_*` configs (`:81-86,102`), NOT the browser's stored (localStorage) configs. Every headline used explicit flags, but any owner customization in the browser (dynamics, autoscale, row layout, per-type overrides) is invisible to the sim.
- Sim-only keys exist (measurement flags: `--tier2*`, `--areaBonusEarly/Pulk/Post`, `--hero-map`, `--heroChaosAreaBonus`, etc.) — off by default, byte-neutral (previously verified).

### 1.6 NOT SIMULATED AT ALL
Rendering, camera framing, sprite *visual* geometry (only the physics body width is modelled), UI. Lap wrapping IS modelled (`(t%1)` at `:1976-1979`) but see the lap-boundary caveat in Layer 2/3 (untested here). Track capacity is modelled via `computeRacerLayout`. **The sim models physics, not the picture** — so any "does it look X" question is out of its reach by construction.

---

## LAYERS 2–5 — **NOT YET BUILT → UNTRUSTED**

The invariant suite (L2), golden scenarios (L3), positive controls (L4), and gap-space metrics (L5) are **not implemented in this pass.** Per the audit's own rule, every mechanism and metric they would cover is therefore **UNTRUSTED** until those executable tests exist and pass. This is honest scope, not a pass. The highest-priority items to build next, in order: L4 positive controls for `band-reach` and `traffic-braking-frac` (cheapest, highest trust return); the L3.6 bunched-vs-strung-out golden (the permanent proof that rank metrics can't see quality); L5 `secondsBehindLeader` / `deadRaceFlag`; then the full L2 invariant suite; then the R3 parity harness.

---

## LAYER 6 — METRIC SEMANTICS (known failures re-confirmed at source; full registry: `docs/SIM-METRICS.md`)

All five previously-found failures re-confirmed independently:

1. **`physical_overtake`** — `:736,748-750,1827-1855`. Counts pairs among `startRowIndex===0||1` only, gated `V4_ACTIVE && isOpen`. **WRONG POPULATION + WRONG WINDOW**: start-row mixing, open tracks only. Not a field-wide overtake count. CONFIRMED.
2. **`role='comebacker'`** (`heroCurveGenerator.js`, `wr<=cr?...`) — a one-place gain is labelled a comeback. **MISLEADING NAME / QUALITY-claim-in-rank-space.** CONFIRMED (source read separately).
3. **cast-depth "verified on a hero"** — the climber observer selects the deepest **B1-target pack racer** (`sim-fairness.mjs:1441-1445`), which runs pack `strictness` (`racePlanner.js:494` gives heroes `1.0`, pack the configured value). **WRONG POPULATION.** CONFIRMED.
4. **`transitionEnd` "functionless"** — second reader `corridorStart ?? transitionEnd` (`racePlanner.js:156`). A false orphan. CONFIRMED (and preserved in Stage-1 Step 2).
5. **`reachedFront := cur <= BAND_EDGES[0]`** (`sim-fairness.mjs:1672`), `cur` = live rank. **WRONG SPACE (rank).** A QUALITY claim ("reached the front") expressed in rank space ⇒ **invalid by construction** — it cannot see whether the climber is anywhere near the leader. CONFIRMED.

**Classification principle applied:** every QUALITY claim (comeback, reach-front, lead-change, "the wall is X") must be expressed in the space a viewer perceives (seconds/distance behind the leader). `reachedFront`, `placesGainedNet`, `netOverRealRatio`, `bandReach`, and the "visible comeback" definition are all **rank/count-space** and therefore cannot substantiate any quality claim. They are valid only as *mechanism* claims (a rank was reached), never as "the race was good."

---

## LAYER 8 — which past conclusions survive (preliminary)

| Conclusion | Type | Verdict |
|---|---|---|
| "The wall is TRAFFIC" | mechanism (avoidance frames) | **SURVIVES** sprite-geometry (1.3 refuted) — but rests on R3 main-loop parity, which is **UNTRUSTED**. Confidence: moderate, pending parity. |
| areaBonus headwind removed by A2 (servo-comp 40%→0, pack÷hero 1.018→1.003) | mechanism (multipliers) | **SURVIVES** — pure multiplier arithmetic on shared `racePlanner` state. |
| `packBandStrictness=0` breaks reach-front | mechanism (steering) | survives as a *steering* fact; "reach-front" itself is rank-space. |
| **reach-front 83%/77%, cast-depth table** | **QUALITY claim in rank space** | **VOID as a quality claim.** Says nothing about seconds behind the leader. Must be re-measured with `secondsBehindLeader`/`visibleComeback` (gap-space, L5). |
| **net places gained / churn ratio** | rank/count space | **VOID as quality.** A strung-out field inflates both. |
| "every band-reach-gated verdict is FAIR" | rank space | band-reach ≠ fairness and **cannot see a dead race** (a 100% band-reach is compatible with the winner a lap clear). Fairness must be the a-priori uniform-rank test (L2), not band-reach. |
| density ±8% fairest | mixed | band-reach part rank-space; needs gap-space re-check. |

---

## OWNER ONE-PAGER — see `docs/SIM-AUDIT-OWNER.md`.
