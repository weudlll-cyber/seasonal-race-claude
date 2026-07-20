# Camera Foresight (B4) — Concept Review

*Read-only design review at master `78b40ea`. No code, no commits.*
*Facts source-verified below; one correction to the brief: `comebackMinPositionsGained` shipped default
is **2** (defaults.js:171), not 3 (the `?? 3` at CameraDirector.js:537 is only a config-absent fallback);
`comebackWindowSec` default is **4s** (defaults.js:172).*

## Verified premise
- `buildCameraPlan` (heroCurveGenerator.js) returns `{ b1Indices:Set, heroes:[{index, role, finalRank,
  beats:[{progress, event:anchor|peak|resolve}]}] }`; beat progress fractions come from the hero curve
  waypoints.
- racePlanner.js:511-533 reads only `gen.curves` (→ `_heroCurves`, physics) and role (→ `_heroRoles`,
  "diagnostics-only, never read by physics"). **It never reads `gen.cameraPlan`.** `cameraPlan` is
  referenced *only* inside heroCurveGenerator.js → generated every race and dropped.
- CameraDirector is reactive: `updateRacePlan(b1Indices)` injects only the final-band-1 set; comeback is
  chosen by `_detectComebackRacer` from a rank-history ring buffer over `comebackWindowSec` (4s) with a
  `≥ comebackMinPositionsGained` (2) gain, plus `comebackMinStartGap` (0.25) / `comebackMaxCurrentRankPct`
  (0.2) filters. Lead-change uses `_updateLeaderTracking` double hysteresis.

---

## CC's independent assessment

### Q1 — Worth doing at all?
There is a real, specific gap, and it is exactly a timing gap. The reactive detector cannot fire until
`comebackWindowSec` (4s) of history shows a `≥2`-place gain. A comeback is the most timing-sensitive shot
in the game — it peaks and resolves fast — so by the time the camera commits, several seconds of the pass
(often the opening moves, sometimes the whole thing) are already over. Foresight's only real prize is
**latency**: pre-position so the viewer sees the *build-up and the pass*, not the aftermath.

Honest counter-argument (the DON'T-BUILD case): the same latency win is partly available for free by
lowering `comebackWindowSec` — no new machinery. The residual benefit of true foresight over "just a
shorter window" is (a) pre-positioning *before any gain has occurred at all*, which a shorter window can
never do, and (b) not having to trade window-length against false-positive noise globally. So foresight is
strictly more than a shorter window, but the marginal gain is modest. Verdict on Q1: **worth it, but
marginal** — justified only if the shot quality genuinely matters to the owner and the change is cheap and
safe.

### Q2 — Failure modes of "following the plan"
The plan is authored **intent**; physics decides **reality**. The hero curve is a *target*; the racer can
be held by lateral traffic, a blocked lane, the settle-brake, or knocked off-curve by re-roll. So the
authored "peak at progress 0.6" may (a) produce no visible rank-gain, (b) happen earlier/later, or (c) be a
smaller move than authored. If the camera **cuts** to the authored comebacker at the authored beat, it
risks showing a **non-event** — a racer who passed nobody. That directly violates the owner's binding rule
("never manufacture drama the dynamics didn't produce"). Naive "follow the plan" is therefore dead on
arrival.

### Q3 — A design that respects "show only what's there"
Yes — and it is the whole point of the recommendation: **the plan is a PRIOR, never a TRIGGER.** Split
authority cleanly:
- **Plan's job (prediction / where-to-look):** tells the camera "racer X is cast as the comebacker, peak
  around progress p." The camera uses this ONLY to (a) *prime* X — begin/scope its rank-history attention
  and lower X's detection *latency* as p approaches — and (b) optionally *pre-bias* the pan toward X's
  neighbourhood just before p, so it is ready.
- **Reactive path's job (confirmation / authority-to-show):** the existing `_detectComebackRacer` gain
  gate still decides whether the camera actually **commits** to the comeback shot. If the authored pass
  never materialises (no real rank-gain), the gate never fires and the camera never cuts.

This is the "predictive prefetch, discarded if wrong" pattern. The plan reduces latency and improves
readiness; reality retains the veto. It respects the owner's rule *by construction*: nothing is shown
unless the reactive confirmation says it is real. Crucially, priming may lower the **time** bar for the
primed racer (commit a frame or two sooner once a real gain starts) but must never lower the **reality**
bar (a gain must still occur).

### Q4 — Smallest viable version, scope, gate
Smallest visible win: **comeback pre-arm only.**
1. Plumb the already-generated `gen.cameraPlan` through racePlanner (mirror the `_heroRoles` treatment) and
   inject it via the **existing** `updateRacePlan` hook (extend it, don't add a subsystem).
2. In CameraDirector, use the plan ONLY to prime the authored comebacker near its peak beat: pre-bias the
   pan target and/or shorten the effective confirmation latency for that one racer. **No cut without the
   reactive gain confirming.**
3. Behind a flag (default OFF), eye-test gated. Flag OFF ⇒ camera behaviour byte-identical to today.
Out of scope for v1: lead-change foresight (its reactive path is already robust) and PHOTO_FINISH timing.

### Q5 — Interactions
- **`_detectComebackRacer` thresholds:** priming touches the *latency* for the primed racer only; must not
  weaken the reality gate. Keep the global thresholds untouched.
- **B3/B8 (weak count-based comeback definition):** *orthogonal* — foresight does not fix the weak
  `comebackMinPositionsGained` metric. (Longer-term, the plan's `role:comebacker` could *replace* the count
  metric, but that is a separate, bigger step — keep it OUT of this scope.)
- **Lead-change hysteresis:** already robust; a later increment could pre-arm lead-change shots from the
  plan's `sovereign-lead` + beats, but not in v1.
- **PHOTO_FINISH:** separate; the plan's `resolve` beats could inform photo-finish timing later.
- **World-hash / export:** the cameraPlan is *derived* from the seed + hero cast (already in the plan), so
  it adds **no** new persisted config. The new flag is a camera/DevScreen toggle and — consistent with the
  D1 finding that diag toggles are excluded from the world hash — must **stay OUT** of the hashed world
  config.

### CC preliminary verdict
**BUILD-BUT-DIFFERENTLY.** Not "consume the plan and follow it" (violates the owner's rule), but "use the
plan as a prior to prime/pre-position, with the reactive path retaining sole authority to commit." Smallest
version: comeback pre-arm, flag-gated, no world-hash change. If the owner judges the marginal shot-quality
gain not worth the plumbing + a new flag + eye-test cycles, **DON'T-BUILD is a legitimate call** — the
reactive detector is already functional and `comebackWindowSec` is tunable.

---

## Copilot's independent critique (attack on the premise)

### First pushback: the premise can be right and still not be worth building
The strongest argument against this work is cost/benefit, not correctness. The reactive camera is already
operational and tunable. If the practical issue is simply that COMEBACK shots start late, the cheapest fix
is parameter tuning (shorter window, threshold calibration, cooldown balancing) plus stricter eye-test.
That path has almost zero plumbing risk compared to threading a new plan payload through planner -> runtime
-> camera and introducing new mode logic.

### Where CC's proposal can still break
Even with "plan as prior, reactive as trigger", there are subtle failure modes:
- Confirmation drift by stealth: teams often start with "prior only", then gradually relax confirmation
  thresholds for the primed racer because "it feels close enough". That is exactly how manufactured drama
  creeps in.
- Attention tax: if the director pre-biases toward authored comebackers too often, it can reduce time spent
  on genuinely more salient events (front battles, verified lead changes).
- Determinism optics: because cameraPlan is deterministic from seed/cast, repeated seeds can produce
  repeated camera anticipation patterns. This may look "scripted" even when the race is physically real.
- Coupling creep: once cameraPlan is plumbed, pressure rises to drive lead-change and photo-finish from
  authored beats too. That can overfit camera behavior to authored intent and undermine the existing robust
  hysteresis paths.

### What CC underweights
CC's design is valid, but underweights the need for hard acceptance criteria before any build:
- No explicit "missed action" baseline was measured yet (how often does the current camera miss first-pass
  moments, and by how much wall-clock/progress?).
- No explicit guardrail against reactive-threshold dilution was defined.
- No explicit failure budget was set (how many false anticipations are acceptable per race bundle).

Without these, this work can ship complexity with ambiguous benefit.

### Copilot verdict on the idea
Not "don't ever do it"; rather: **do not build broad foresight now**. If done, do the smallest pilot only,
with hard constraints that prevent the plan from becoming a hidden trigger.

---

## Converged recommendation

### Decision
**BUILD-BUT-DIFFERENTLY (narrow pilot only).**

Not a "follow the authored plan" camera. Build only a constrained foresight assist where the plan improves
readiness, while the reactive confirmation remains the sole authority to cut.

### Why this converges both views
- CC is right that there is a real latency gap and a legitimate readiness use for authored beats.
- Copilot is right that naive or broadened foresight is high-risk and can violate the owner's rule by
  gradual threshold erosion or attention misallocation.
- The overlap is a very small additive step with strict guardrails and measurable acceptance criteria.

### WAS-level design (no implementation details)

Goal:
- Reduce comeback shot latency so viewers see more of the opening move, without ever showing non-events.

Behavior:
- Reuse existing reactive comeback confirmation unchanged as the only commit gate.
- Add plan-derived pre-arm metadata for the authored comebacker (identity + rough beat window) only.
- Use pre-arm only for camera readiness (where to look, not what to show).
- If no real gain is confirmed by the existing reactive logic, no comeback cut happens.

What existing pieces are reused:
- `generateHeroCurves` and its already-produced `cameraPlan`.
- `updateRacePlan` channel into CameraDirector.
- `_updateRankHistory` and `_detectComebackRacer` as confirmation authority.

What the plan contributes vs reactive path:
- Plan contributes: a candidate prior and approximate timing window.
- Reactive contributes: truth test and final decision.

Gate and rollout:
- Keep behind a dedicated camera flag, default OFF.
- Eye-test gate required; OFF must be byte-identical to current camera behavior.
- No world-hash/schema change required for the pilot (camera behavior toggle, not race physics config).

Out of scope (explicitly):
- Replacing comeback definition metric (B3/B8).
- Lead-change foresight changes.
- PHOTO_FINISH logic changes.
- Any race dynamics or physics changes.

### Acceptance criteria before promotion
- Demonstrable reduction in "late comeback pickup" on the owner's target races.
- No increase in non-event cuts.
- No regression in lead-change and battle readability.
- No change in race outcomes/physics behavior.

If those criteria are not met, prefer **DON'T BUILD** and keep tuning the existing reactive detector.

---

## Addendum — CC's second adversarial pass (two points to fold into the pilot)

A second independent skeptic pass (fresh context, mandate to attack) landed *harder* — at **DON'T BUILD** —
and surfaced two source-verified points the converged rec above should absorb before any pilot:

**1. The codebase already has an "arrive-early" pattern, and it uses LIVE signals, not authored intent.**
PHOTO_FINISH pre-arms frame-exactly, gated purely on live state: `leaderProgress ≥ photoFinishLeadProgress`
AND the **live** top-2 gap being close (CameraDirector.js:669-685). It never reads the plan. If the pilot's
*only* goal is comeback latency, the lower-risk design is a **live-signal comeback pre-arm modelled on that
gate** — arm when a *real* rank-climb is already in progress toward a threshold — which keeps reality as the
sole trigger *by construction* and needs **no `cameraPlan` plumbing at all**. Consuming `cameraPlan` is only
justified by the one thing live signals cannot give: knowing WHO before ANY climb has started — and that
"before any climb" capability is exactly what risks the owner's rule. So the pilot should first ask: does it
actually need pre-cast identity, or just earlier live detection? If the latter, don't touch the plan.

**2. "No increase in non-event *cuts*" is necessary but not sufficient.** Pre-arm also spends *pans /
attention* on authored racers who may never climb (Copilot's "attention tax" + "determinism optics"). Add a
guardrail: cap how often the camera pre-biases toward an *unconfirmed* authored comebacker, and track
"pre-arms that never resolved into a confirmed comeback" as an explicit failure-budget metric — otherwise
the feature can look scripted (deterministic-from-seed anticipation) while every *cut* remains technically
real.

**Net across both skeptic passes:** neither independent reviewer endorses a broad plan-consumer. If anything
is built, it is a flag-gated, default-OFF, tightly-metered pilot — and the honest first move is to try
(a) slider tuning and (b) a live-signal pre-arm à la PHOTO_FINISH **before** plumbing authored intent into
the camera at all. B3/B8 (the weak comeback definition) remains the higher-value prerequisite either way.
