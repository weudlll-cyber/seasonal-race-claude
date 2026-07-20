# OUTCOME-TENSION - Copilot concept (read-only)

## Scope and independence

This file is an independent Copilot proposal.
I did not read `results/OUTCOME-TENSION-CC.md` and I did not read any CC OUTCOME-FORCES file.
No code changes, no commits, no new run/sweep were performed for this concept paper.

## Executive answer

A simple concept exists: **late OUTCOME in-band release**.

Behaviorally:
- Keep current OUTCOME steering as-is for racers that are outside their fairness band.
- For racers already inside their own target band, stop exact-rank steering in the late OUTCOME window by setting `targetRank := currentRank` (same shipped release pattern already used for B1 heroes).
- Re-evaluate every frame: if a racer falls out of band again, steering re-engages automatically.

This reuses an already shipped mechanism and exploits the known fairness slack (band target, not exact-rank target) without adding a new subsystem.

## 1) The concept (simple to implement)

Name: **Band-Safe Late Release (BSLR)**.

Core rule:
- Activate only in late OUTCOME (for example from a progress threshold near the final segment).
- If racer is inside its own target band bounds, neutralize rank servo for that racer (`targetRank := currentRank`, therefore rankError = 0 and trajectory target returns to natural speed).
- If racer is outside band, keep normal servo toward assigned target.

Why this is the first-choice reuse:
- The codebase already ships the exact neutralization behavior for B1 heroes through `choreoReleaseProgress`.
- OUTCOME steering and per-frame rank classification already exist in one place (`createTrajectoryController`), so this is a local decision-layer extension, not a new mechanism.

Why not pick `computePulkBiasedTarget` as the primary concept:
- It is intentionally PULK-only and 3-racer scoped in shipped behavior.
- Extending that into OUTCOME adds a second distance force on top of rank servo and can create force conflict/bunching.
- It is no longer the simplest safe change path for the Owner's constraint.

## 2) Why it is fair (band-based argument)

Fairness gate is band-reach, not exact rank.
This concept preserves that structure by design:
- Out-of-band racers still receive full correction (same controller, same limits).
- In-band racers are released only while they remain in-band.
- If released dynamics push them out-of-band, correction resumes immediately.

Expected effect on fairness outcomes:
- Band-reach should stay near current level and is expected to remain above the 70% gate if release starts late enough.
- Holm-unfair start rows should remain at 0 because no start-row bias path is changed.
- Exact finishing order will become somewhat more random inside a band (intended and acceptable under the Owner's stated fairness definition).

Risk statement:
- If release begins too early, drift can increase out-of-band exits late race and reduce band-reach.
- Therefore release timing is the primary safety lever.

## 3) Why it is natural (explicit bound)

This concept does not introduce a new multiplier and does not widen any existing bounds.

Explicit bound:
- Released racers run at natural controller neutral point (`trajectoryMult` returns to 1.0 target).
- Non-released racers remain bounded by existing `trajectoryMult` limits (0.85 to 1.1).
- Existing spread re-roll band and all existing per-step terms remain unchanged.

Conclusion:
- Naturalness risk is lower than status quo for released racers (less artificial steering), and never higher than current for others.
- No extra OUTCOME envelope is required for this specific concept because authority is reduced, not increased.

## 4) Cost and blast radius

Implementation cost (expected): low.

Likely touch points:
- `racePlanner.js` only (inside `createTrajectoryController.update` decision branch where targetRank is chosen).
- Optional config/default wiring only if exposing a dedicated threshold knob.

Fingerprint and gates:
- Any `racePlanner.js` behavior change moves fingerprint and requires full fairness re-gate.
- If sim behavior must match browser (required here), parity validation is mandatory.

Knob policy alignment:
- Can be done with zero new public knobs (fixed late threshold), or one optional knob at most.
- Fits the "few explained controls + one Action slider" direction better than introducing a new subsystem.

## 5) Second-order effects

Potential positives:
- More genuine late-race uncertainty in front group without forcing rank churn.
- Less servo over-correction when racers are already fair by band.

Potential negatives:
- Finish can become too lottery-like if release is too early or too broad.
- Temporary bunching in front pack can increase local randomness.
- If applied to all bands too early, back-field correction may weaken indirectly via traffic interactions.

Force-conflict assessment:
- Low conflict risk if this is the only change, because it removes/relaxes force rather than adding one.
- High conflict risk if combined with OUTCOME extension of PULK bias at the same time.

## 6) Measurement that proves or kills it (before build decision)

Use a pre-registered kill/prove metric set centered on band fairness and gap-space tension.

Must-pass fairness metrics:
- Band reach rate (overall and per band) with hard gate >= 70% overall.
- Holm-unfair start rows must remain 0.

Must-measure tension metrics (gap-space, not rank-space):
- Top-5 pairwise finish-gap distribution in racer-length units at late OUTCOME and at finish.
- Leader-to-P2 gap trajectory over last race segment (percentile curves).
- Overtake count in final segment for B1/B2, but interpreted together with gap metrics.

Kill conditions:
- Any fairness gate failure.
- Clear collapse into finish lottery signature: very high late bunching with no corresponding action quality (small gaps without meaningful pass conversions).

Note:
- Rank-only metrics are insufficient to detect dead race or false tension; gap-space metrics are mandatory.

## 7) Honest verdict

A simple concept does exist, and it is this one.

Recommendation:
- Prefer **Band-Safe Late Release** first, because it reuses shipped logic, reduces control overreach to the fairness contract, and minimizes implementation risk.
- Do not start with an OUTCOME extension of `computePulkBiasedTarget`; that path is more complex, higher interaction risk, and not the simplest Owner-fit.

If this concept fails fairness/tension gates in validation, the honest fallback is DON'T-FIX rather than layering a second force system.

## Report hygiene (separate)

Checked at source:
- Band model source of truth (`BAND_EDGES`) and area-bound logic in planner.
- Existing release precedent (`choreoReleaseProgress` behavior path neutralizing rank error for released heroes).
- Shared step-chain and browser/sim parity path through `advanceRacerT` and planner/controller imports.
- PULK-bias mechanics: PULK-only phase gate, 3-racer scope, clamp to spread band.
- OUTCOME active/inert force picture used in this recommendation.

Not checked:
- No fresh run was executed in this task, so no new numeric uplift estimate for this specific concept is claimed.
- No new sensitivity sweep for release threshold was executed.
