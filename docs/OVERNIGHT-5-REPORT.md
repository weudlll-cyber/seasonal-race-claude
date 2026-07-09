# Overnight — INFRA sim-trust steps 5A / 5B / 5C — morning report

Branch `chore/sim-trust`, based on `master` `7afe760`. Tag `pre/areabonus-parity` → `7afe760`
created and pushed first. Every stage: implemented → committed → pushed → fast-forwarded into
`master`. No orphan processes; no measurement sweep run (per instruction).

Commits (all on `master` now):
- `de66798` — 5A: one shared areaBonus phase-split
- `30c97a1` — 5B: force-parity audit (docs only)
- `24f0639` — 5C: gap-space metrics + golden test

---

## Stage 5A — the areaBonus phase-split, into one shared place

### What was done
The phase-split **rescale** of `areaBonusMult` now lives once, inside the shared controller
`createTrajectoryController.update()` in [racePlanner.js](../client/src/modules/racePlanner.js).
The plan carries `_phaseSplitBonusEnabled / _areaRefStrength / _areaBonus{Early,Pulk,Post}`; both
the browser and the sim thread these from the shipped dynamics config into `createRacePlan`. The
boundaries are read from the **live plan fractions** (`pulkStartFrac / pulkEndFrac`), never a
literal. The browser's after-`update()` rescale block was deleted; the sim's `AREA_SPLIT_ACTIVE`
path, its `--areaBonus{Early,Pulk,Post}` flags, and the `--areaBonusPulkGate*` position-gate
experiment were deleted.

`racePlanner.js` is imported by both engines, so the sim inherits the split natively — confirmed as
the correct home.

### A. Browser — bit-identity proof
- **Pure relocation.** The rescale moved from index.jsx (after `update()`) into `update()` itself.
  Nothing reads `areaBonusMult` between those two points (only the `trajectoryMult` transition runs
  there), the racer set is the same, the math and the multiplication order are unchanged, and it
  still composes with the `transEnd` fade in the same order. Verified for all three cases: Race-Plan
  on + split on (rescale relocated, identical), Race-Plan on + split off (both skip → raw value),
  Race-Plan off (`areaBonusMult` initialised 1.0 at index.jsx:653 → both no-op).
- **Unit tests** added over EARLY / PULK / POST, zero-width PULK, `areaBonusMult == 1` (B4),
  and `scale == 0` (PULK strength 0): [racePlanner.test.js](../client/src/modules/racePlanner.test.js)
  "areaBonus phase-split" block. racePlanner suite 80/80.
- **Full client suite green: 3173/3173** (153 files) after the change.
- The winning-config fingerprint (`verify-winning.sh`, which passes the *explicit* split flags) is
  **byte-identical before and after 5A** (`fcf4f8e8…` both) — the strongest statement that the
  refactor changed nothing for the already-split config.

### B. Sim — the diff is non-zero (the repair), at v4-ON and v4-OFF
Flagless strip-metrics fingerprint (combos hash), one closed + one open track, seed 1, 6 races:

| run | before (`7afe760`) | after (5A) |
|-----|--------------------|-----------|
| flagless **v4-OFF** | `bd3c0598…` | `fcf4f8e8…` |
| flagless **v4-ON**  | `4f83cfc0…` | `dfb45dfa…` |

Both changed, at v4-OFF **and** v4-ON — the areaBonus force acts in the CHAOS phase so it diverged
regardless of the director generation, exactly as expected. Concrete downstream number
(`naturalness.meanMaxSpeedFactor`, flagless v4-OFF): **closed 1.1246 → 1.0813, open 1.1462 → 1.0813**
— the removed B1 "chaos wash / bonus headwind" (the sim used to apply +6% where the browser applied
the split-down +3% / 0-in-PULK). After 5A the flagless sim output equals the explicit-split winning
config (`fcf4f8e8…`) — the sim now applies the shipped split with or without the (now-removed) flags.

### C. Fingerprints re-baselined
- `verify-winning.sh` REFERENCE updated `72cfbdb4… → fcf4f8e8…`, and its inert `--areaBonus*` flags
  removed. **Important:** `72cfbdb4…` did **not** die at 5A — it died at **step 4** (the shared
  t-update / rowEnvMult). 5A is byte-identical to the re-baselined value. (Recorded in the script.)
- The task's historic `504a7c48…` (flagless v4-OFF "state before v4") is **not stored in the repo**;
  it came from earlier owner notes. Its analogue — the flagless v4-OFF combos hash — is now
  **`fcf4f8e8c7d453857756a3d14fd1ace3b842a3a5b27a14050402893f2ea09270`**. The old flagless v4-OFF
  fingerprint is dead because the sim's areaBonus finally matches the browser's.

### Earlier conclusions this invalidates — named
- **Every flagless v4-OFF sim result** (and any comparison against `504a7c48…` / the pre-split
  flagless hashes) referred to a race the browser never ran: the sim applied +6% areaBonus in CHAOS
  where the browser applied +3% (EARLY) then 0 (PULK). Those fingerprints were a valid sim-to-sim
  regression tool; they never proved browser fidelity.
- Combined with step 4's note ("all v4-OFF sim results invalid"), **any pre-5A sim fairness number
  produced without the explicit `--areaBonus*`/`--rowBonus*` flags is invalid for judging shipped
  behaviour.** Runs made *with* the explicit winning flags (e.g. `verify-winning`) already had the
  split and are unaffected by 5A.

---

## Stage 5B — force-parity audit → `docs/FORCE-PARITY.md`

Delivered [docs/FORCE-PARITY.md](FORCE-PARITY.md): one row per force, browser file:line, sim
file:line, verdict. **Nothing was fixed.** Every row was checked against source directly (the two
inventory sub-agents were cross-checked, and one was wrong about the base-speed band — corrected).

Headline: **at the shipped config, after steps 4 and 5A, no active force in the t-update diverges
between browser and sim.** `advanceRacerT` makes factors 4–8 + order + finish clamp identical by
construction; `baseSpeed`, re-roll, boost, brake, governor all resolve to shared modules or
line-for-line-equal formulas reading the same config SOT.

Open items — **named, not fixed** (full detail in the doc):
- **O1** `finishT` run-out zone: the sim's `computeFinishT` uses a hardcoded `runoutZone=0.05`; the
  browser reads `behaviorConfig.runoutZone`. Identical at the shipped default, **divergent if the
  owner ever overrides runoutZone**. Open-track only. (Most concrete latent seam found.)
- **O2** `--rerollVariant=2` mean-reverting draw is sim-only (default variant 1 = parity).
- **O3** lap normalization is duplicated (index.jsx `tPos` / sim), not shared — correct today, same
  *class* of thing that drifted for rowEnvMult / areaBonusMult.
- **O4** run-out decay (`×0.97` on finished racers) is browser-only; **no outcome impact**
  (finishRank/finishTime lock at the crossing) — cosmetic.
- **O5** the auxiliary sweep scripts (`compare-zones`, `compare-sets`, `param-sweep-full`,
  `sweep-lateral`, `sim-sweep`) call `createRacePlan` without `phaseSplitBonusEnabled`, so they run
  *without* the shipped areaBonus split (as they always did). Divergent from the browser; separate
  tools, not "the sim". Named.
- **O6** the "identical-by-shared-module" verdicts (speedBonus, drafting, brake, trajectory,
  governor) hold only while both engines feed identical geometry/layout — a maintained invariant,
  not a structural certainty.

No third *active* force divergence was found.

---

## Stage 5C — gap-space metrics (read-only) + the golden test

New module [scripts/sim/observers/gap-metrics.mjs](../scripts/sim/observers/gap-metrics.mjs) —
pure, sim-only:
- `secondsBehindLeader(racerT, leaderTrace, nowTs)` — the tv-gap, from the leader's own
  progress-vs-time trace (robust to the leader's pace changing).
- `leaderGapToP2`, `top5Spread` at the line and at sample points; `fieldSpreadP10P90`;
  `inContentionFraction(series, X)`; `visibleComeback(maxBehind, finalBehind, Y, Z)` (**not**
  rank≤5); `deadRaceFlag(finalThirdGapSeries, threshold, majorityFrac)`.

Wired into `sim-fairness.mjs` behind `--gap-metrics` (default off → **byte-identical**;
`verify-winning` still MATCHES). Samples at progress 0.50 / 0.75 / 0.90 and at the line; raw
per-race distributions → `results/gap-metrics/` (gitignored). Smoke-tested on an open track: it
distinguishes a photo finish (P1→P2 0.08s) from a strung finish (1.81s), as intended.

### The golden test — committed and passing
[scripts/sim/observers/gap-metrics.test.mjs](../scripts/sim/observers/gap-metrics.test.mjs) — run
with `node --test scripts/sim/observers/gap-metrics.test.mjs` (Node ≥18; verified on v24). Two
synthetic races with **identical final ranks**, one bunched (finishes within 0.20 s), one strung out
(8 s P1→P5):
- **asserts every rank-space metric identical** (reachedFront, bandReach, placesGained, front-count);
- **asserts every gap-space metric differs** (leaderGapToP2, top5Spread, fieldSpread,
  secondsBehindLeader, inContentionFraction);
- plus: a rank≤5 finish 8 s back is **not** a `visibleComeback`; `deadRaceFlag` fires on the strung
  race, not the bunched one.

This is the standing, executable proof that the fairness gate cannot see a dead race. **5/5 pass.**

### Proposed X / Y / Z — AWAITING OWNER CALIBRATION (not chosen by optimisation)
In `PROPOSED_THRESHOLDS` (gap-metrics.mjs), with reasoning (races run ~30–60 s):
- **X = 2.0 s** (in-contention window) — a few body lengths; a genuine threat to the leader.
- **Y = 5.0 s** (comeback depth) — a clearly detached chaser after chaos.
- **Z = 1.5 s** (comeback finish closeness) — a close, photo-ish finish.
- deadRace: leader→P2 **> 3.0 s** for **> 50 %** of the final third — a processional run-in.

All provisional. Until you calibrate them against a race you watch, the sim reports **raw
distributions only** — every `deadRaceFlag` / `visibleComeback` boolean is provisional, never a gate.

---

## Autonomous decisions made (with reasoning)

1. **Home for the split = `racePlanner.js` `update()`.** It is imported by both engines and already
   owns `areaBonusMult`; putting the rescale there means the sim inherits it with zero call-site
   divergence. Verified `racePlanner.js` is the shared import.
2. **Deleted the sim's `--areaBonus*` CLI flags rather than re-point them at the shipped default.**
   The task said to delete them; the world-config channel (`mergeCfg`) is the parity-correct way to
   vary these (it is what makes the sim's default reflect owner settings), so no sweep capability is
   lost that matters. The `--areaBonusPulkGate*` position-gate experiment was deleted with the same
   block (a dormant sim-only experiment, like the ones removed in steps 3-x).
3. **Re-baselined `verify-winning.sh` to `fcf4f8e8…` and removed its inert flags.** `72cfbdb4…` was
   already stale as of step 4; the task asked to re-baseline and record. Low-risk (a verifier
   script). The old reference is preserved in a comment.
4. **Ran small verification runs, not a sweep.** The instruction forbids a *measurement sweep*; 5A
   explicitly asks for before/after sim numbers and a re-baselined fingerprint. I resolved this by
   running only determinism/parity checks (fixed 6-race fingerprints, one smoke run) — never a
   multi-combo fairness optimisation sweep, and never using any number to make a parameter decision.
5. **5C thresholds proposed, not fitted.** Set X/Y/Z from race-duration reasoning and flagged them
   as awaiting your calibration, per the instruction that they must not be chosen by optimisation.
6. **Golden test uses `node --test`.** The gap-metrics module is sim-only (`scripts/`), which the
   client vitest config does not include; `node:test` needs no new dependency.
7. **Left the auxiliary sweep scripts untouched (O5).** Threading the phase-split into them would be
   an unattended behaviour change to tools I could not fully validate overnight; named in the audit
   instead.

## Refused to do (rather than force)
- **Did not fix any O1–O6 divergence.** Stage 5B is explicitly report-only; an unattended fix to an
  unknown force is the exact class of change to avoid while you sleep.
- **Did not run the fairness optimisation sweep.** The instruments (5A forces, 5C metrics) only just
  landed; a sweep now would produce fresh invalid numbers.
- **Did not calibrate X / Y / Z.** They are yours to set against a watched race.

## Suggested next steps (for you)
- Watch one race you consider "good" and one you consider "dead"; read `results/gap-metrics/*.json`
  for those and calibrate X / Y / Z. Then the deadRace / visibleComeback booleans become meaningful.
- Decide whether O1 (sim `runoutZone` hardcode) and O5 (sweep scripts) are worth closing.
