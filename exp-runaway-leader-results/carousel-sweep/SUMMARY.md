# Carousel Sweep — STOPPED at the precondition. No arm was run.

The spec opens with: *"Precondition: build committed, all suites green, fingerprint EXACT —
otherwise STOP, no sweep"* and *"On any STOP: stop, write the report, do not improvise."*

**The precondition fails: the Part-1 build block referenced by this spec ("run IMMEDIATELY after the
build block above") was never delivered to this session, and no carousel implementation exists in the
repository.** Four of the five arms are unrunnable, and the fifth would only re-measure an
already-committed baseline. Per the spec's own instruction I stopped and wrote this report rather
than improvising an implementation.

---

## 1. What was verified (all at source, this session)

| check | result |
|---|---|
| `carousel*` identifiers anywhere in `client/src` or `scripts` | **0 hits** — `carouselEnabled`, `carouselRoleBiasStrength`, `carouselHandoverCount` etc. do not exist |
| `roleBias` identifiers | **0 hits** |
| `carousel` in the sim CLI (`sim-fairness.mjs`) | **0 hits** — no flag to pass |
| `git log --all --grep=carousel` | no carousel commit on any branch |
| branches / stashes | only `master`; stash list empty |
| HEAD | `45516fc` — the p1-contest baseline commit, i.e. the last thing this session built |
| working tree | clean of code changes; only the untracked analysis docs from the concept-review step |

There is no build to sweep. This is not a broken build — it is an absent one.

## 2. A second, independent precondition failure

Arm **A5 (CAR-G075-RB)** is annotated *"valid only because the branch-priority fix is in"*. **It is
not in.** In `computeGapBiasedTarget` the `gapBehind > G` branch still returns before the `gapAhead`
check is reached ([racePlanner.js:962-976](../../client/src/modules/racePlanner.js#L962-L976)):

```js
if (gapBehind > G) { … return clamp(rawSample - frac * (rawSample - spreadMin), …); }
if (plan._gapRerollMode === 'symmetric' && gapAhead > G) { … }   // unreachable when both exceed G
```

This is exactly the chase-suppression misdirection the small-G diagnostic identified (a racer that
breaks from the pack opens a hole behind itself and is down-tilted although it is far behind the
leader). At G=0.75 both gaps exceed the threshold far more often, which is precisely when the
misordering bites. So A5 would not have measured the span lever; it would have measured the bug.

**A5 would have been invalid even if the carousel existed.**

## 3. Why A1 was not run on its own

A1 (V0) is the only runnable arm. It was deliberately skipped: it is a pure reproduction gate on a
baseline this session already committed and already verified. The p1-contest determinism re-run
confirmed `races-V0-luger-hill.csv` **byte-identical** on a second execution, and the sweep's own
STOP gate confirmed V0 runaway = 18/18/30/28 exactly. Re-running it would consume ~25 minutes of the
away-window to reproduce a number we hold twice over, and would produce no comparison — there is no
A2–A5 to compare against.

Committed V0 baseline, for reference: **p1ContestRate 5.3% overall** (luger-hill 5, mountainstreet
10, searound 3, dirt-oval 3 per 100).

## 4. Finding from the stopped session: the mechanism may already exist

While verifying that no carousel had been built, a shipped, flag-gated, default-OFF mechanism turned
up that does much of what C1 describes — `applyPulkLeadRotation`
([raceGovernor.js:145-270](../../client/src/modules/raceGovernor.js#L145-L270), commit `f5ed3f7`):

- attacker slots boost the live P2/P3 **until it takes the lead** (success = became live P1);
- the **dethroned leader is braked**, distance-based, until it has fallen `dropDepthLengths` behind
  the new leader — i.e. the two-sided regime the owner's counter-argument describes;
- a 750 ms min-hold suppresses sub-second flicker; a deadlock timeout releases a blocked pass;
- one implementation shared by browser and sim; deterministic; already tested.

**Why it does not currently help, and why that matters.** The governor's phase weight is
`0.0` for `progress >= corrStartFrac` — structurally, not by tuning
([raceGovernor.js:92-97](../../client/src/modules/raceGovernor.js#L92-L97)):

```js
export function governorPhaseWeight(progress, pulkEndFrac, corrStartFrac) {
  if (progress <= fadeStart) return 1.0;
  if (progress >= corrStartFrac) return 0.0;      // ← hard zero
  …
}
```

With `choreoOutcomeStart` = 0.60 ([defaults.js:329](../../client/src/modules/storage/defaults.js#L329))
this mechanism is **completely dead throughout W = [0.80, first finish]**. It cannot contribute a
single late lead change.

The consequence is worth stating plainly, because it bears directly on the re-analysis break-even:
**this codebase has two speed authorities with different ceilings, and the higher one is switched off
exactly where the carousel needs it.**

| path | ceiling | active in W? |
|---|---|---|
| rank servo (`trajectoryMult`) | **1.10** hard ([racePlanner.js:78-81](../../client/src/modules/racePlanner.js#L78-L81)) | yes |
| governor director (`governorMult`) | `min(bandMax + boostHeadroom, NATURALNESS_CEILING)` = up to **1.20** ([raceGovernor.js:30,54](../../client/src/modules/raceGovernor.js#L30)) | **no — weight is exactly 0** |

The handover re-analysis put the 60% break-even at `maxMult` ≈ 1.25, with 1.20 → ~53.7%. The project
has **already sanctioned 1.20** as its naturalness leitplanke for a director mechanism. That is a
materially different starting position from "raise the servo ceiling and re-validate fairness
everywhere", and it is a Part-1 option that did not appear in the concept, in either review, or in
this spec.

Report-only. Not a recommendation — the mechanism choice is the owner's.

## 5. What Part 1 must contain for this sweep to run unchanged

So the sweep can execute exactly as specified, with no further decisions:

1. A carousel implementation, flag-gated, default OFF, **fingerprint byte-identical when off**.
2. Config keys, spelled as the sweep passes them: `carouselEnabled`,
   `carouselRoleBiasStrength`. The spec's arm table names no others as sweep axes; any further
   parameters (handover count, cadence, amplitude, phase offsets, participants) need shipped
   defaults, because the arms do not set them.
3. Matching CLI flags in `scripts/sim-fairness.mjs`, mirrored into `createRacePlan` — the
   sim/browser parity rule applies.
4. The carousel telemetry the RECORD section requires, which does not exist yet and cannot be
   derived from existing observers: cast rate (races with <3 feasible → not cast), **authored vs
   completed** handovers, dwell distribution, and servo-saturation share over carousel-participant
   frames in W.
5. For A5 only: the `computeGapBiasedTarget` branch-priority fix (§2), which is a behaviour change
   to a shipped feature and therefore **breaks the OFF fingerprint** — it needs its own decision,
   its own gate, and a re-baseline of the confirmed gap-reroll result. It is not a free prerequisite.

Item 5 is the one to look at first: as written, A5 requires a change that invalidates the baseline
every other arm is measured against.

## 6. Ready to go the moment Part 1 lands

Unchanged and reusable from this session:

- `--p1-contest` orchestrator mode (V0 + arm, STOP gate, per-class split, per-seed CSVs).
- `outcome-front-battle.mjs` observer + 21 unit tests; all 83 observer tests green.
- `front-spans.csv` (n=800) — the rank 3→1 span data the sweep's cliff validation needs, already
  extracted; the RECORD section's "extend the front-spans extraction" is partly done.
- The model prediction to validate against: **CAR-GR ceiling ~34.5%**, with the cliff at
  93% → 28% → 2% for spans of 1.5 / 2.0 / 2.5 L. See
  [HANDOVER-BUDGET-REANALYSIS-CC.md](../../reports/proposals/HANDOVER-BUDGET-REANALYSIS-CC.md).

Adding the 5 arms to the orchestrator is a small change once the flags exist.

## 7. Sweep questions — none answerable

The four questions the SUMMARY was to answer ((1) does the carousel break the 93% `leadChangeCount`
wall, (2) what does role-bias add, (3) does G=0.75 push races over the 1.5–2.0 L cliff, (4) which arm
is the best candidate) all require measurements from arms that could not run. No estimate is offered
in their place; the modelled prediction in §6 is a prediction, not a result, and the sweep exists to
test it.

The "5 strongest REAL-P1-ACTION seeds per arm" for the future eye-test likewise cannot be listed —
they are per-arm outputs. From the committed V0 baseline the eye-test candidates that exist today
are the 21 races already classified REAL P1 ACTION in `races-V0-*.csv` (`contest` column = 1).
