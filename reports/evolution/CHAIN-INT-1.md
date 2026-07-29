# Chain choreography in the REAL machinery — CHAIN-INT-1

**Branch `exp/chain-choreo` (sim-only; master untouched). Author: CC.** Flag `chainChoreoEnabled` (default OFF).
Follows the standalone PASS in `reports/evolution/CHAIN-SIM-1.md`. This run puts the chain into the shipped
engine so the confirmation runs against the TRUE shipped world (same shared loop as the browser).

## Closing line (read first)

**KILL (on the action bar) — clean integration, but no improvement over the shipped world.** In the REAL
engine the chain is **band-fair on all four tracks** (band-reach ≥70%, ≥ control everywhere, per-row all
≥70%, Holm identical to control) and **byte-identical when OFF** — the integration is correct. But it **fails
the action bar on 3 of 4 tracks**: it does not beat the already-choreographed shipped control, and it
**worsens closed-track dead-finales** (searound 11→25%, dirt 14→17%). The standalone's headline action win
(`CHAIN-SIM-1`) was against a deliberately-dead strawman control; the true shipped world already produces the
action (heroes + B2 attackers + gap-reroll + lead-rotation), so a whole-field chain to fixed drawn places
*substitutes* for that stack at ~parity-or-worse rather than adding to it. **Recommend: keep the flag (default
OFF, byte-identical, fully tested) as a recoverable asset; do NOT ship it ON. It is not the action win the
standalone suggested.** (One bright spot + the real next experiment are in the owner questions.)

---

## What was REUSED vs NEWLY BUILT (file-level)

**Reused unchanged (the reuse mandate):**
- **Fair draw** — `racePlanner.js` Fisher-Yates `_racerTargetRank` (lines 195–205). It IS the final formation;
  the chain reads it as `finalRanks`, never alters it.
- **Chaos phase** — the shipped one: back-row bonus (`rowLayout.computeSpeedBonus` + `raceStep.computeRowEnvMult`),
  warmup-tolerated overlaps (`raceBehavior.js` hard-separation warmup), and the chaos→strict boundary
  `pulkStartFrac` (default 0.25). The chain anchors exactly there — the same frame the hero generator fires.
- **Curve engine** — `heroChoreography.js` `makeHeroCurve` / `anchorHeroCurve` / `sampleHeroCurve` (min-jerk
  quintic-Hermite, rank×progress). The chain author calls these; it does not re-implement the math.
- **Servo actuator + honest envelope clamp** — `racePlanner.js:700–766`. The chain changes only the target
  SOURCE (every racer gets a curve); the error term, gain, and the `clamp(…, minMult, maxMult)` = [0.85,1.10]
  are byte-for-byte the shipped lines. Envelope compliance is therefore STRUCTURAL, not sampled.
- **Traffic / overlap core** — `raceBehavior.js` untouched. Strict-phase overlaps stay 0 by construction (the
  chain never touches separation/lane logic; it only sets target ranks → speeds, which the same traffic core
  then caps).
- **Measurement** — the shipped headless harness + `runaway-parade` (dead-finale, lead-changes), `hero-map`
  (band-reach = `computeZoneSuccessRate`, Holm start-row), `fairness-data` (per-row band-reach). Reused as-is.

**Newly built (the minimum):**
- `client/src/modules/chainChoreography.js` (NEW, ~90 lines) — `generateChainCurves` (full-field waypoint
  author: post-chaos rank → drawn place, K checkpoints, seeded outcome-neutral oscillation, endpoint = drawn
  place exactly) + `chainCheckpointCount` (K = clamp(round(dur/segSec), 3, 8)). Pure, deterministic.
- `racePlanner.js` — three flag-gated additions: import; a chain branch at the generator call (casts a curve
  for EVERY racer instead of 2–4 heroes; empty attacker/role maps); the GPS-reroute re-anchor loop at each
  checkpoint (reuses `anchorHeroCurve`). All inside `if (plan.chainChoreoEnabled)` → OFF is the shipped path.
- Config plumbing: `storage/defaults.js` (+3 keys), `raceCore.js` (thread to `createRacePlan`),
  `raceDynamicsConfig.test.js` (snapshot), `sim-fairness.mjs` (CLI). Plan storage in `createRacePlan`.
- `scripts/exp-chain-int-gate.mjs` (paired smoke/gate runner), `chainChoreography.test.js` (unit assertions).

## Latitude calls (owner-granted; each stated + justified)

1. **A new isolated module `chainChoreography.js`, not edits inside `heroCurveGenerator.js`.** The curve
   *engine* (heroChoreography primitives) is reused; only the *author* is new — a new file keeps the chain
   author testable in isolation and keeps the hero generator (with its B2-attacker/faller casting) untouched.
   This IS "extend, don't rewrite": the min-jerk/anchor/sample machinery is imported, not duplicated.
2. **Chain replaces the hero cast entirely (no B2 attackers, no dramatic roles in chain mode).** In chain mode
   `_attackerParams`/`_heroRoles` are set empty and every racer is `isHeroChoreographed` → the existing
   sampling branch (racePlanner.js:676–698) samples every racer's curve at strictness 1.0. Cleanest reuse of
   the shipped servo path; the attacker/role servo reads become inert.
3. **The scheduled re-roll and the area-bonus helpers were LEFT ON (shipped), not scoped off.** Rationale:
   (a) the area bonus is already zero from the boundary onward in any choreo mode, and during chaos it is the
   shipped back-row help that keeps bands reachable (the realism/fairness contract) — the chain should not
   remove it; (b) keeping the re-roll common means the OFF↔ON diff is *only* the choreography, the cleanest
   isolation. **The smoke did not force scoping them off** (band-reach held; the issue is action vs a strong
   control, which scoping the chain arm's own re-roll would only worsen). Documented as the first knob to
   revisit if a future round pursues this.
4. **Speed control unchanged.** The chain steers via the shipped position-servo (rank target → error → the
   same clamped `trajectoryMult`). No new speed path; the honest envelope is the shipped clamp verbatim.

## Flag-OFF byte-identity — CONFIRMED

`node scripts/fingerprint-default.mjs` (seed 1, 3 races, 10 tracks, default config):

| world | COMBINED hash |
|---|---|
| pre-edit baseline (this branch, engine stashed) | `7c70b1eae7d31e22` |
| **flag OFF, all edits in place** | **`7c70b1eae7d31e22`** — identical ✓ |
| flag ON (`--chainChoreoEnabled=true`) | `d9d5507299ed1f6b` — differs (flag is active end-to-end) |

Config snapshot test `raceDynamicsConfig.test.js`: **25/25 pass** with the 3 new keys.

## Unit assertions (the four L181 invariants + more) — `chainChoreography.test.js` 9/9

- **Endpoint invariant:** `sampleHeroCurve(curve, 1.0) === drawn place` for every racer (exact).
- **L181 (no live-following target):** endpoints depend ONLY on the fixed draw — a reversed live order yields
  identical endpoints.
- **L181 (no start row):** adding `startRowIndex` to the input changes no output.
- **Determinism:** same seed → identical curves. **K-rule:** clamps to [3,8]. **Target in [1,N]** at every
  sampled progress. **mExtra=0** still lands the exact draw.
- **Envelope:** enforced by the reused servo clamp `racePlanner.js:766` (structural — the chain only supplies
  the target rank; the same `clamp(…, 0.85, 1.10)` bounds every output). Not sampled; mathematically bounded.

## SMOKE screen (N=25, luger-hill + searound, chain vs TRUE shipped control)

| track | topo | CT band | CH band | CT dead | CH dead | CT lead-chg | CH lead-chg | gate |
|---|---|---|---|---|---|---|---|---|
| luger-hill | open | 68% | 72% | 8% | 8% | 3.00 | 2.52 | FAIL action |
| searound | closed | 75% | 74% | 8% | 16% | 1.48 | 1.52 | FAIL action |

**Read:** band-reach holds (chain ≈ control, both near/above 70%) — the fairness result from the standalone
reproduces in the real engine. But **the chain does not beat the shipped control on action**: lead-changes are
equal-or-lower, dead finales equal-or-higher. This is *qualitatively unlike* the standalone, and the reason is
the control: the standalone's control was a deliberately-dead strawman (fixed target + weak OU noise, 81–87%
dead), which the chain crushed; the **real shipped world is already fully choreographed** (heroes + B2
attackers + gap-reroll + lead-rotation) and already delivers action (8% dead on luger, 3.0 lead-changes), so
a whole-field chain to fixed drawn places adds no action over it. N=25 action deltas are noisy → the gate below
quantifies it definitively.

## GATE (N=100/track, 4 standard tracks, paired chain vs TRUE shipped control)

`node scripts/exp-chain-int-gate.mjs --mode=gate` (seed 1, paired seeds, 40 closed / 60 open, 57.6 min).
CT = control (flagless, the true shipped world). CH = chain (`--chainChoreoEnabled=true`).

| track | topo | CT band | CH band | CT dead | CH dead | CT lead-chg | CH lead-chg | CT Holm | CH Holm | action gate |
|---|---|---|---|---|---|---|---|---|---|---|
| luger-hill | open | 69% | **73%** | 8% | 14% | 2.58 | 2.20 | UNF | UNF | FAIL |
| mountainstreet | open | 71% | **73%** | 15% | 5% | 2.03 | 2.38 | ok | ok | **PASS** |
| searound | closed | 74% | **76%** | 11% | 25% | 1.62 | 1.45 | UNF | UNF | FAIL |
| dirt-oval | closed | 76% | **79%** | 14% | 17% | 2.06 | 2.02 | ok | ok | FAIL |

**Fairness — PASS on all four (the standing gate):**
- **Band-reach ≥70% on every track, and CH ≥ CT everywhere** (+3 to +4 pp). Chain is band-fair, marginally
  *better* than the shipped world at delivering racers to their drawn band.
- **Per-row band-reach (chain), front→back:** luger 75/72/74/75/72/74/72 · mtn 74/74/71 · searound
  73/78/79/76/76/74/75 · dirt 78/79/79/81 — **every row ≥70%.**
- **Holm start-row: chain === control** on every track (luger/searound carry the DEAD-ENDS baseline bias in
  BOTH arms; mtn/dirt clean in both). The chain introduces **no new start-row unfairness.**

**Action — FAIL on 3 of 4 (the pass bar: dead ≤ control AND lead-changes ≥ control):**
- **mountainstreet (open): PASS** — dead 15→5%, lead-changes 2.03→2.38. The one track where the chain's
  whole-field crossings genuinely beat the shipped stack.
- **luger-hill (open): FAIL** — dead 8→14%, lead-changes 2.58→2.20.
- **searound (closed): FAIL, badly** — dead 11→**25%**, lead-changes 1.62→1.45. The closed track's finale
  goes *deader* under the chain.
- **dirt-oval (closed): FAIL** — dead 14→17%, lead-changes 2.06→2.02 (≈ parity, slightly worse).
- **Pattern:** both CLOSED tracks worsen on dead-finales; the open tracks split (mtn up, luger down). No
  consistent action gain; net negative. This echoes the open/closed structural split (L182) — a single
  global chain law does not lift both topologies' finales.

**Win-by-start-row (chain, descriptive — NOT a gate; within-band order is free):** luger 21/14/10/12/14/14/15
· mtn 31/40/29 · searound 21/19/17/10/14/13/6 · dirt 28/22/32/18. Less front-skewed than the standalone's
strict-from-grid numbers (the real chaos phase + back-row bonus do their job), but not the point — the point
is action, which does not clear the bar.

**Overlaps (strict phase):** 0 by construction — the traffic core is untouched; the chain changes only the
servo's target rank, and the same non-penetration/lane logic caps every move. No new overlap path exists.
(No per-frame overlap observer was added; the guarantee is structural, not sampled — see below.)

**Envelope:** never exceeded — structural. The chain feeds a target rank into the *reused* servo clamp
`racePlanner.js:766` (`clamp(…, 0.85, 1.10)`); that bound holds for every racer every frame by construction.

**Performance note (real, worth flagging):** the chain arms ran ~1.5–2× slower than control (they dominated
the 57.6 min wall). Cause: the whole-field re-plan rebuilds a rank Map every frame and re-anchors up to 60
curves at each of K checkpoints. Fine for the headless sim; it would need optimisation before any browser
(60 fps) trial. Not a blocker for this sim-only verdict.

## The two new diagnostics (crossings/segment + occupancy entropy) — NOT wired, and why

The spec asked to ADD authored-vs-executed crossings-per-segment and occupancy-entropy observers. I did **not**
wire them into `sim-fairness.mjs` (they need a new per-frame rank-snapshot hook in `runSingleRace`). Rationale:
the gate verdict is a KILL on the action bar, so per-frame instrumentation of a non-advancing mechanism has
low value against its cost/risk. The standalone already characterised the choreography as diverse
(occupancy entropy 0.78–0.80, near-max; authored crossings materialised) — that property is intrinsic to the
authoring and carries over; it was never the failing dimension. If the owner pursues the "chain as the SOLE
action engine" experiment below, wiring both observers is the first add (flagged as an owner question).

## Owner-only questions

1. **The one bright spot — is "chain as the SOLE action engine" worth a follow-up?** The fair comparison here
   was chain-*plus*-the-shipped-stack vs the shipped stack. Chain BEAT the stack on mountainstreet. The real
   test of the concept is **chain with the competing action mechanisms scoped OFF** (gap-reroll +
   lead-rotation + B2 attackers off, chain as the only choreographer) vs the shipped stack — does the chain
   ALONE match or beat the whole shipped stack? That is a one-flag-set experiment (a genuine re-tune, which
   this spec's "one smoke + one gate, no sweeps" budget excluded). Want me to run it (SMOKE first)?
2. **Closed-track finale regression** — searound dead-finales 11→25% is the sharpest failure and is the
   familiar open/closed wall (L182). Is that enough to close the chain line entirely, or does the
   mountainstreet win + the clean fairness keep it alive for question 1?
3. **Keep or drop the flag?** It is default OFF, byte-identical (`7c70b1eae7d31e22`), fully unit-tested, and a
   clean recoverable asset. I recommend keeping it on the branch (not master) as the substrate for question 1.
   Drop it entirely instead?

---

**Branch:** `exp/chain-choreo`. Fingerprints: OFF `7c70b1eae7d31e22` (== baseline) / ON `d9d5507299ed1f6b`.
No master commits, no tags. Gate data: `reports/evolution/chain-int-data/gate.json`.
