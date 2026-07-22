# Sustained P1 Race Action in OUTCOME — Concept Proposal (CC)

**Status:** ideation only. No code changed, no mechanism built. Every architecture claim below is
verified at source with file:line (GRUNDREGEL #0); nothing is inferred from memory or from prior
reports. Written independently — the Copilot proposal in this directory was not read.

---

## 0. Root cause: the front is *authored* to be a static cluster, and rank 1 is *authored to be nobody's target*

This is not a tuning deficit. The absence of a P1 fight is the **designed behavior of the front**,
stated explicitly in the source. [heroCurveGenerator.js:411-414](../../client/src/modules/heroCurveGenerator.js#L411):

```
// Small-gap winner + front contest (A1/A3): B1 heroes resolve into a TIGHT front cluster (ranks
// 2,3,4… — a close pack, NOT a clear rank-1 lead), held to the release; natural speed then decides
// 1st. So no B1 hero is steered to a cruising lead. Assigning the winner to cluster rank 2 (not 1)
// is fair (still B1) and leaves rank 1 to be won by the run-out.
let b1Cluster = 2;
```

Three consequences follow, and together they fully explain the owner's eye-test:

1. **No racer is ever steered toward rank 1.** The cluster counter starts at 2 and increments per
   cast ([:415-424](../../client/src/modules/heroCurveGenerator.js#L415)). The assigned winner is
   given cluster rank 2. Rank 1 is not a target for anybody.
2. **Each B1 hero is steered to a *different, static* slot.** The B1 curve resolves at
   `releaseProgress` ([resolveForBand](../../client/src/modules/heroCurveGenerator.js#L107):
   `bandIdx === 0 ? config.releaseProgress : ...`, i.e. 0.97), and `sampleHeroCurve` holds the final
   waypoint value beyond it ([heroChoreography.js:149](../../client/src/modules/heroChoreography.js#L149)).
   With strictness 1.0 for heroes ([racePlanner.js:697-701](../../client/src/modules/racePlanner.js#L697))
   the servo tracks that slot exactly. **The servo is therefore actively suppressing swaps at the
   front**: whoever drifts ahead of its slot gets `rankError < 0` → braked; whoever drops back gets
   boosted. Convergence to a fixed order is enforced, not merely permitted.
3. **The entire P1 contest is compressed into the last 3% of the race.** "Release" means the steering
   stops — `targetRank = currentRank` ⇒ `rankError = 0` ⇒ mult 1.0
   ([racePlanner.js:673-683](../../client/src/modules/racePlanner.js#L673)) — and it fires only at
   `phaseProgress >= 0.97` and only for `targetRank <= BAND_EDGES[0]`. So the fight for the lead is a
   single natural run-out over ~3% of the race, inside a cluster already measured to be dense
   (P2–P15 within <1L).

A run-out that short, from a field that tight, with a ±10%/−15% speed spread, can only produce what
the owner describes: **at most one or two racers slipping past, once.** The measured
`p1SwapAfter090 ≈ 25%` in V0 and ~34% with gap-reroll is exactly the yield of a single-shot
lottery — and a lottery is structurally incapable of producing a *sustained* battle no matter how
it is tuned.

**This reframes every prior failure as consistent rather than puzzling.** Front leash, P2 lift,
universal band-arrival, pack-release and earlier release all tried to change *how hard* the front is
held, or *how long* it is free. None of them changed *what the front is steered toward*. Lesson 178
says action lives in orchestration — and the front is the one region of the race where **nothing
crossing is orchestrated at all**. The B2-Heroes result (+21% top-5 action) is the proof of the
positive case: authored crossing curves *do* generate action, and they were only ever applied to
the midfield, where the owner is not looking.

The correct lever is therefore not more freedom and not more force. It is **to author crossings at
the front, which is currently the only place the choreography deliberately refuses to author them.**

### Why this is fair by construction

`BAND_EDGES = [5, 15, 25, 40]` ([racePlanner.js:38](../../client/src/modules/racePlanner.js#L38)), so
B1 is ranks 1–5. Band-reach counts a racer's **final** rank against its assigned band; reordering
*within* a band is explicitly permitted by the owner's rules. The assigned winner is
`targetRank === 1`, and the source is explicit that this is "used for reporting, not for steering"
([racePlanner.js:190-192](../../client/src/modules/racePlanner.js#L190)) — the actual winner is
already emergent from the run-out today.

Therefore: **any permutation of the five B1 racers among ranks 1–5, at any time, including at the
finish, leaves band-reach mathematically unchanged.** A mechanism confined to that permutation
cannot fail the primary fairness gate — not "probably won't", *cannot*. That is a far stronger
fairness position than any mechanism tried so far, all of which moved racers across band boundaries.

---

## 1. Candidate mechanisms

### C1 — **B1 Lead Carousel** (recommended)

**Core idea.** Replace the B1 cluster's *static, distinct* slots with **phase-offset, time-varying
target-rank curves that all oscillate across ranks 1–5 and deliberately cross each other** during
OUTCOME. Rank 1 stops being nobody's target and becomes a **time-shared** target: hero A is steered
to rank 1 over one interval, hands it to hero B over the next, and so on, with the servo actively
*driving* each exchange instead of suppressing it. The existing release at 0.97 stays exactly as it
is, so the finish is still decided by a genuine natural run-out — but it now begins from a front
that has been visibly fighting for the preceding third of the race, and the final order among the
five is still unauthored.

**Why it fits the orchestration law.** This is the purest possible expression of Lesson 178: it adds
*more* orchestration, not less. No racer is freed, no counter-force is applied to anyone, nothing is
braked to make room for someone else. Each racer simply tracks an authored curve, exactly as
B2-heroes already do — the technique with the only proven action win in OUTCOME. It is the same
mechanism, aimed at the band the owner actually watches.

**Feasibility — the curve machinery already exists and needs no new concepts.**
- Time-varying target rank is *already the native representation*:
  [racePlanner.js:679-683](../../client/src/modules/racePlanner.js#L679) selects
  `sampleHeroCurve(heroCurve, phaseProgress)` for every hero. No servo change.
- Curves are built from waypoint lists via `soloWaypoints` +
  [`anchorHeroCurve`](../../client/src/modules/heroCurveGenerator.js#L551); a carousel needs an
  additional waypoint shape (multi-peak instead of anchor→peak→resolve) in
  `heroCurveGenerator.js`, and nothing else.
- Feasibility is already enforced per racer by `racerFeasibility` (reachable rank window from the
  ±20% distance budget) — carousel amplitudes must be filtered through it exactly as attacker peaks
  are ([:479-480](../../client/src/modules/heroCurveGenerator.js#L479)).
- Integration points: `heroCurveGenerator.js` (authoring), `storage/defaults.js` (flag + params,
  default OFF), `raceDynamicsConfig.js` + `RaceScreen/index.jsx:735` (browser threading, mirroring
  the existing `choreoReleaseProgress` path), `sim-fairness.mjs` CLI flag for sweeps.

**Fairness argument.** Clamp every carousel waypoint to `[1, BAND_EDGES[0]]`. Then no participant's
target ever leaves B1; `bandError` stays 0 throughout
([racePlanner.js:689-694](../../client/src/modules/racePlanner.js#L689)); final ranks remain a
permutation of 1–5 among racers all assigned to B1. Band-reach is invariant **by construction**, and
`bandExitAfterRelease` is untouched because the release logic is unchanged. Holm is a start-row
property and is not addressed by any front mechanism (measured flat at 2/4 across all six arms of
the release sweep).

**Risks / kill conditions.**
- **Parade-finish.** Five racers oscillating inside 5 ranks may arrive as a side-by-side block.
  *Kill if* `paradeFinishRate > 2%` (existing gate).
- **Servo saturation / unnatural motion.** Crossings demand rank rate; `maxMult 1.1 / minMult 0.85`
  ([racePlanner.js:77-82](../../client/src/modules/racePlanner.js#L77)) bounds it. Too-aggressive
  amplitude or frequency will pin racers at the clamps and read as rubber-banding.
  *Kill if* servo-saturated frames among B1 rise materially, or the eye-test reports visible
  snapping. Amplitude must be derived from `racerFeasibility`, never hardcoded.
- **Runaway regression.** A racer authored to lead mid-window could convert into an escape.
  *Kill if* `runawayWinnerRate` rises above the gap-reroll level (8.3%).
- **Interaction with gap-reroll.** Gap-reroll down-tilts a racer that opens a gap behind it — i.e.
  it will fight a carousel racer authored to pull ahead. This must be measured jointly, never
  independently; the arms must include carousel×gap-reroll.

**Expected effect size (estimate, not measurement).** The metric that should move most is
`distinctLeaders` in the contest window: from ~1.3 today (one leader, occasionally a second) to 3+
by construction, since the number of authored lead handovers is a directly chosen parameter.
`p1SwapAfter090` should also rise, but it is the *wrong* headline — it counts the endpoint, not the
battle.

---

### C2 — **B2 Late Front Raid** (extend the shipped attacker to peak at P1, late)

**Core idea.** The shipped B2 attacker climbs to `b2AttackPeakRank: 5` — the B1 *edge* — peaking in
`b2AttackProgress: {0.4, 0.7}` and resolving by 0.85
([defaults.js](../../client/src/modules/storage/defaults.js), verified values). Aim a small number
of them **higher and later**: peak at rank 1–2 inside the contest window, then execute the authored
fall back into B2. This does not reshuffle the same five racers — it **adds outsiders to the P1
fight**, directly attacking the owner's "at most between 2 racers" complaint by increasing the
number of *distinct* contenders.

**Why it fits.** It is the shipped, owner-approved mechanism with two parameter changes and one
candidate-filter change; the "Attack & Fall" concept is already validated at +21% top-5 action.

**Feasibility.** Highest machinery reuse of the three. `b2AttackPeakRank` and `b2AttackProgress` are
already config ([heroCurveGenerator.js:83-87](../../client/src/modules/heroCurveGenerator.js#L83));
the attacker servo path (`_attackerParams`, Track-to-FinalRank-then-Free,
[racePlanner.js:708-746](../../client/src/modules/racePlanner.js#L708)) is unchanged. Realistically
this could be a sweep over existing parameters before any new code at all — which makes it an
unusually cheap *measurement* even if it is not the final answer.

**Fairness argument.** Raiders are assigned B2 and finish in B2 (the fall is authored and the
`finalRank` is clamped to `bandBounds(1)`,
[:469-471](../../client/src/modules/heroCurveGenerator.js#L469)). Leading at 0.93 and finishing 7th
is permitted under the band model, which scores final rank only.

**Risks / kill conditions.**
- **The fall must complete before the finish.** Peaking at rank 1 near the release leaves very
  little room to fall back to B2. Too late a peak either fails band-reach for the raider or produces
  a visibly artificial collapse. *Kill if* B2 band-reach drops below 70%, or `bandExitAfterRelease`
  for B2 rises materially.
- **It manufactures a passing car, not a battle.** A raider that sweeps past and falls away may read
  as exactly the "single racer slipping past" the owner already rejected — the fight has to be
  *sustained*, and a raid is by nature transient. This is the concept's central weakness.
- Feasibility gates may simply refuse most candidates: a climb from B2 to rank 1 late in the race
  is a large rank rate, and `racerFeasibility` will reject infeasible ones (correctly).

**Expected effect size.** Moves `distinctLeaders` and `leadChangeCount`; weak on `maxLeadHoldShare`
(the sustain metric). Best used as an *amplifier on top of C1*, not as the primary mechanism.

---

### C3 — **Front Convergence Target** (degenerate shared slot)

**Core idea.** Instead of steering the five B1 heroes to five *distinct* slots, steer them all to the
**same** target rank (the cluster centroid). Every racer ahead of the centroid is braked, every
racer behind it is boosted — an active, continuous mixing force that never stabilizes an order,
because the ordering signal has been removed while the steering has not. Natural spreadFactor
variation then reshuffles the front continuously.

**Why it fits.** It is not liberation (Lesson 178's failure mode): strictness stays 1.0 and the servo
stays fully engaged. It is orchestration toward a degenerate target.

**Feasibility.** Cheapest of the three — one change to the cluster assignment in
`heroCurveGenerator.js:415` (`nextCluster()` returns a constant instead of incrementing). No new
curve shapes, no servo change.

**Risks / kill conditions.**
- **Parade-finish is the obvious failure mode**, and a serious one: a shared target is close to a
  literal instruction to finish side by side. *Kill hard if* `paradeFinishRate > 2%`.
- **May settle anyway.** With everyone converging to one point, the servo error goes to zero for the
  whole cluster and the front could simply freeze in whatever order it arrives — a null result.
- Least *authored* of the three, so the least aligned with the orchestration principle in spirit
  even if it complies in letter.

**Expected effect size.** Genuinely uncertain — could be the cheapest win or a flat null. Its value
is that it is cheap enough to measure early and would sharpen understanding of how much of the
front's stability comes from *distinct* targets versus from density.

---

## 2. Proposed success metric — the **P1 Contest Score**

The existing metrics are all endpoint metrics and none of them can express "sustained battle".
`p1SwapAfter090` cannot distinguish one late pass from a five-way scrap — it is already 25% in V0,
in exactly the races the owner calls actionless. **A metric that is high in the failing baseline is
not measuring the thing the owner wants.** The metric must measure the *process*, over a window.

### Window (no hardcoded progress constants)

`W = [contestWindowStart, 1.0]`, where `contestWindowStart` is a new config field **defaulting to
the live `choreoResolveB2`** (0.8 shipped) — a config value that already marks "the field below B1 is
resolved". It moves with config, contains no literal, and survives any duration/speed/roll-count
change because it is expressed in leader-progress, exactly as every existing choreo boundary is.

### Per-race primitives (read-only observer, all frame-level)

Measured over W, using the shared `govLenScale` gap-space so units match every other metric:

1. `distinctLeaders` — count of distinct racer indices that held live rank 1 at any frame in W.
2. `leadChangeCount` — times the lead genuinely changed hands. **Already built and unit-tested** in
   [`scripts/sim/observers/release-contest.mjs`](../../scripts/sim/observers/release-contest.mjs)
   (`makeLateContestTracker`), including the correction that a leader *finishing* is not a lead
   change.
3. `maxLeadHoldShare` — the largest share of W-frames any single racer held rank 1. **This is the
   sustain metric**: 1.0 = one racer led the whole window (today's case); low = genuinely shared.
4. `frontContestFraction` — share of W-frames with **≥3 live racers within `leadLen` (3.0 lengths)**
   of P1. Generalizes the existing one-shot `within3P1At090` to a continuous occupancy measure.

### Race-level classifier and gate

A race counts as **REAL P1 ACTION** iff all of:

```
distinctLeaders      >= 3
leadChangeCount      >= 3
maxLeadHoldShare     <= 0.70
frontContestFraction >= 0.50
```

Rationale for each: ≥3 distinct leaders and ≥3 changes encode "multi-racer, repeated" and directly
exclude the manufactured 2-racer duel the owner vetoed; `maxLeadHoldShare ≤ 0.70` excludes "one
racer led throughout and was passed once at the end"; `frontContestFraction ≥ 0.50` requires the
contest to be *populated for at least half the window*, which is what separates "sustained" from
"one late lunge".

**Proposed headline gate: `p1ContestRate` (share of races classified REAL P1 ACTION) — target ≥40%.**

The threshold is provisional and should be set by the owner *after* V0 and the shipped gap-reroll
arm are measured, exactly as the runaway gate was. My expectation is that V0 scores near **0%** and
the gap-reroll winner only slightly above it — if so, that number is the most useful single fact
this whole workstream could produce, because it would confirm in measurement what §0 argues from
source: today's front produces essentially zero sustained contests, and the 25–34% `p1Swap` figure
has been flattering a mechanism that never delivered a battle.

### Gates that stay binding alongside it

Unchanged and all still primary: band-reach ≥70% per track (**pooled ~300 races/track — a single
N=100 run is under-powered; the release sweep just demonstrated this, with V0 itself failing at
69.9%**), Holm ≤2/4, `runawayWinnerRate` <10% overall and ≤15%/track, `paradeFinishRate` ≤2%,
top-5 action Δ ≥ 0, and `bandExitAfterRelease` as the drift watch. `p1ContestRate` is an **additional**
gate, never a substitute — a mechanism that buys contest and sells any of the above is disqualified.

---

## 3. Ranking

**Build C1 (B1 Lead Carousel) first.**

1. **It is the only candidate that addresses the actual complaint.** The owner asked for a
   *sustained, multi-racer battle*. C2 produces transient raids; C3 produces instability that may
   settle. Only C1 makes repeated lead exchange an authored, chosen quantity.
2. **Its fairness argument is the strongest ever available in this workstream** — invariance by
   construction (a permutation within B1), not invariance by measurement. Every mechanism that
   failed so far moved racers across band boundaries; this one provably cannot.
3. **It attacks the verified root cause directly.** §0 shows the front is authored static and rank 1
   is nobody's target. C1 is the minimal change to that specific decision. C2 and C3 both leave
   `b1Cluster = 2` and the static-slot design intact.
4. **It reuses the one technique with a proven OUTCOME action win** (B2-Heroes, +21%), applied to the
   band the owner watches.

**Sequencing.** Before building anything, implement the **observer and measure `p1ContestRate` on V0
and on the shipped gap-reroll winner**. It is read-only, cheap, reuses `makeLateContestTracker`, and
it establishes whether the deficit is as total as §0 predicts. Building a mechanism before the
metric exists would leave no way to tell whether it worked — and this workstream has already spent
two sweeps discovering that its headline metric (`p1Swap`) was not measuring the thing that mattered.

Then: **C1 alone**, then **C1 × gap-reroll** jointly (they interact — gap-reroll's down-tilt opposes
an authored breakaway, and measuring them separately would be misleading). **C2 as an amplifier**
only if C1 clears its gates but `distinctLeaders` still saturates at 3–4. **C3 last**, or opportunistically
as a cheap null-test if C1 stalls, since it is a one-line change to `nextCluster()` and would tell us
something real about whether distinct targets or density dominate front stability.

**Kill the whole line if:** C1 at feasible amplitudes cannot exceed ~2 distinct leaders without
saturating the servo clamps. That would mean the ±10%/−15% speed authority is too narrow to support
repeated crossings in a field measured at <1L spacing — in which case the honest conclusion is that
sustained P1 action is not reachable within the current speed model, and the next question becomes an
owner decision about that model rather than another mechanism.

---

## Appendix — claims verified at source for this document

| Claim | Source |
|---|---|
| B1 heroes resolve to a tight cluster starting at rank 2; nobody steered to rank 1 | [heroCurveGenerator.js:411-424](../../client/src/modules/heroCurveGenerator.js#L411) |
| Hero target rank is time-varying via `sampleHeroCurve`; pack target is constant | [racePlanner.js:679-683](../../client/src/modules/racePlanner.js#L679) |
| Curve holds its final waypoint beyond the last control point | [heroChoreography.js:149](../../client/src/modules/heroChoreography.js#L149) |
| B1 resolve point = `releaseProgress` (0.97); deeper bands earlier | [heroCurveGenerator.js:107-109](../../client/src/modules/heroCurveGenerator.js#L107) |
| Release = stop steering (`targetRank = currentRank`), B1-only, at 0.97 | [racePlanner.js:673-683](../../client/src/modules/racePlanner.js#L673) |
| Servo clamps: gain 2.0, maxMult 1.10, minMult 0.85; heroes strictness 1.0 | [racePlanner.js:77-82](../../client/src/modules/racePlanner.js#L77), [:697-701](../../client/src/modules/racePlanner.js#L697) |
| `bandError` is 0 while inside the target band | [racePlanner.js:689-694](../../client/src/modules/racePlanner.js#L689) |
| `BAND_EDGES = [5, 15, 25, 40]` → B1 = ranks 1–5 | [racePlanner.js:38](../../client/src/modules/racePlanner.js#L38) |
| Target ranks are an immutable Fisher-Yates permutation; winner "not for steering" | [racePlanner.js:180-192](../../client/src/modules/racePlanner.js#L180) |
| B2 attacker: B2-assigned candidates, peak 5, fall clamped to B2 bounds | [heroCurveGenerator.js:465-485](../../client/src/modules/heroCurveGenerator.js#L465) |
| `leadChangeCount` observer exists, excludes leader-finishing | [release-contest.mjs](../../scripts/sim/observers/release-contest.mjs) |
| Release sweep: earlier release refuted; V0 fails its own band gate at 69.9% | [release-sweep/SUMMARY.md](../../exp-runaway-leader-results/release-sweep/SUMMARY.md) |
