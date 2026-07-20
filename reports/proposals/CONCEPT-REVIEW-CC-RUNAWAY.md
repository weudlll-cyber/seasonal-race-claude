# CONCEPT REVIEW (CC) — Runaway-Winner Mitigation: Front Distance Leash + Late Challenger

Reviewer: Claude Code. Independent review; the other reviewer's file was not read.
Basis: read of `client/src/modules/racePlanner.js` (controller), `heroCurveGenerator.js` +
`heroChoreography.js` (generator), `raceLengths.js`, phase defaults, and the two `update()` call
sites (`index.jsx:1008`, `sim-fairness.mjs:1129`). No code changed.

## TL;DR

- **Mechanism A (Distance Leash): BUILD, modified.** It is the load-bearing mechanism — the only one of
  the two that acts in gap-space, which is exactly where the measured metric lives. The diagnosis (the
  servo is rank-space and length-blind) is correct and confirmed in code.
- **Mechanism B (Late Challenger): REJECT the reactive form; DEFER the unconditional form.** The reactive
  late cast fights the generator's once-per-race, boundary-anchored design AND runs into a near-empty
  feasibility budget that late. The unconditional "closer" largely duplicates what B1 heroes already do,
  and — because curves are rank-space — cannot express "within ~1 length" without borrowing A's machinery.
- **The concept's real hidden cost:** the controller is **length-blind today** — `update()` receives no
  length scale. Both mechanisms require threading a shared length scale into the controller and mirroring
  it bit-for-bit in browser + sim (the Sim-Browser Parity Rule). That plumbing, not the leash math, is the
  main work.

---

## Architecture as it actually is (facts the review rests on)

- **The P-controller** (`racePlanner.js:612–753`) is the one steering path in OUTCOME. Per active racer:
  `rawTarget = clamp(1.0 + gain·(error/nActive) + noise, minMult, maxMult)` with
  `gain=2.0, maxMult=1.1, minMult=0.85` (`racePlanner.js:76–81`). `error` is **RANK-space**
  (`rankError = currentRank − targetRank`, blended with `bandError` by `strictness`). There is **no
  length term anywhere** — a rank-1 racer at its target has `rankError ≤ 0` → `trajectoryMult ≈ 1.0` and
  can pull away in *lengths* unopposed. This confirms the concept's premise exactly.
- **Authority is ±, and asymmetric:** boost up to +10% (maxMult 1.1), **brake down to −15% (minMult
  0.85)**. The concept says "~+10%"; the *brake* side is the relevant one for a leash and is larger — good
  news, more headroom than stated.
- **`_setTarget`** (`racePlanner.js:~405`) only writes a target when it moves > 0.001, and the actual
  `trajectoryMult` eases to it over a **1 s easeInOutCubic slew** (Lesson 177). This is the existing
  anti-oscillation damper the leash should ride on.
- **Hero leaders don't help you here:** heroes track their curve at strictness 1.0, but a B1 hero past
  `_choreoReleaseProgress = 0.97` is **released** (`targetRank = currentRank` → rankError 0 → 1.0,
  `racePlanner.js:627–637`), and before release, a hero *at rank 1* also has rankError ≤ 0 → ~1.0. So the
  leader runs at natural speed whether hero or not. A leash is genuinely *new* authority.
- **Phases:** `choreoOutcomeStart = 0.6` (`defaults.js:329`) → OUTCOME (P-controller for *all* racers) is
  `[0.6, 1.0]`. Heroes steer from `pulkStart` (the chaos→PULK/choreo anchor); the pack only steers in
  OUTCOME. `update(racers, elapsedMs, phaseProgress)` is called from `index.jsx:1008` and
  `sim-fairness.mjs:1129` — **neither passes a length scale.**
- **The generator runs exactly once** (`racePlanner.js:540`, gated by `!plan._choreoGenerated`, set true
  at `:598`), at the chaos→choreo handoff, anchored to each racer's rank-velocity sampled *there*
  (`:543–550`). Curves are sparse `{progress, rank}` control points sampled by a min-jerk quintic Hermite
  (`sampleHeroCurve`, `heroChoreography.js:146`) → **a real-valued RANK**, never a length.
- **Feasibility is real and density-based:** `racerFeasibility` (`heroCurveGenerator.js:116`) derives a
  reachable rank window `[bestRank, worstRank]` and `maxRankRate` from how many racers sit within a
  `speedBudgetFrac(0.1)·remaining·finishT` t-window; `attackerTiming`/`feasibleTiming` reject casts whose
  climb+fall can't fit before the band checkpoint. Skips are boolean `continue`/`null` — **there is no
  `castingYield` symbol anywhere** (the success criterion's "casting yield ≥ 0.95" is a metric that would
  have to be *added*, and only applies to a casting mechanism, i.e. B — not A).

---

## Mechanism A — Front-Cluster Distance Leash

### Feasibility: high. This is the right lever in the right space.

The metric `runawayWinnerRate` is defined on the **leader→P2 arc length** (≥3L at 0.90, never <1L in
[0.90,1.0]). A gap-space brake on the leader attacks that definition directly: hold the gap under ~2.5L and
condition (a) can never fire at 0.90. No other proposed lever touches the metric as cleanly.

### Answers to the open questions

**A1 — Apply to whoever holds RANK 1 (hero or not), not heroes-only.** Three reasons, all confirmed in
code: (a) the leader may be a non-hero pack racer with `targetRank 1`; (b) even a hero leader is *released*
at 0.97 and already runs natural at rank 1, so heroes-only adds authority where it isn't needed; (c) the
metric is defined on the physically-frontmost racer. Implement as a **separate additive brake term** on
`argmax(t)` among non-finished racers, layered on top of the rank servo for that one racer.

**A2 — Leader-only brake, not symmetric.** Symmetric (brake leader + lift chasers) pulls the whole front
together — that *is* the parade-finish failure mode the guard metric watches. Leader-only reduces the lead
while chasers keep their natural spread → a contest, not a compression. Escalate to a *mild* lift of **P2
only** if leader-only can't reach target; never lift P2–P5 together (that manufactures a parade). The
−15% brake side already gives more closing authority than a boost would.

**A3 — Window `[OUTCOME-start 0.6, ~0.92]`, with a pre-run-out cutoff.** Engage as early as the servo has
authority over the leader (OUTCOME begin, 0.6) — **do not wait for 0.90** (Lesson 179: the gap forms
before 0.90; a leash that starts at 0.90 is Lesson-179-blind and will fail the same way a late challenger
does). Cut the leash off by ~0.90–0.92 so the last stretch is a genuine run-out — both to protect the
"real finish" the design wants and to avoid braking into a photo-finish (which reads as a parade).

**A4 — Stability: reuse the two mechanisms the codebase already trusts.** (1) The 1 s `trajectoryMult`
slew damps target jumps for free. (2) Add **gap-space hysteresis** exactly like the pack-release
re-steer: engage when `gap > frontLeashMaxLengths`, disengage when `gap < frontLeashMaxLengths − margin`
(e.g. −0.5L), not at one threshold. (3) Make the brake **proportional** to the excess
(`brake ∝ frontLeashGain·(gap − max)`, clamped to minMult) so it eases to zero as the gap closes — a
P-term, no bang-bang. The leash and the rank servo don't fight for the leader: at rank 1 the rank servo
contributes rankError ≤ 0 (no boost), so the leash brake is uncontested.

**A5 — Code paths (concrete):**
- **Primary:** the P-controller loop, `racePlanner.js:612–753` — after `rawTarget` is computed
  (`:734`), fold a leash brake into the leader's target (the `rankIdx === 0` racer), computed from the
  live leader→P2 arc length.
- **Prerequisite plumbing:** thread a **length scale + `isOpen`** (or a precomputed `leaderGapLen`) into
  `update()` (`racePlanner.js` signature) **and both callers** (`index.jsx:1008`, `sim-fairness.mjs:1129`).
  Compute lengths with the **shared** `raceLengths.js` `arcT` + `lenScaleFrom(pathLengthPx, meanBodyLen)`
  — the *same* path the runaway-parade observer uses, so controller and observer agree by construction and
  the closed-track lap-seam is handled by the tested `arcT` (do **not** re-derive it — `cohesion.mjs`
  records a prior lap-wrap bug).
- **Config:** new `frontLeash*` flags in `storage/defaults.js` + `raceDynamicsConfig` + DevScreen,
  threaded through `createRacePlan` into the plan exactly like the `_b2Attack*` params
  (`racePlanner.js:309–316`). `frontLeashEnabled=false` → skip the term entirely → byte-identical.

### Risks / edge cases

- **Parade compression (the named guard).** Mitigated by leader-only + a *moderate* `frontLeashMaxLengths`
  (≈2.5L, not 0.5L) + proportional easing. There is a real tuning tension: lower `frontLeashMaxLengths`
  drives `runawayWinnerRate` down but `paradeFinishRate` up. The sweep must **co-optimize both**, not
  minimize the runaway rate alone.
- **Band-reach floor.** Braking rank-1 can, in principle, drop it below B1 (rank > 5 = out of band). Add an
  explicit floor: stop braking once the leader's live rank reaches ~3 (still B1) or once the gap is
  contested. In practice, disengage-on-contest means the leader usually only cedes to rank 2, so risk is
  low — but gate it and verify Holm/band-reach in the sweep anyway.
- **It intentionally changes the winner.** The leash lets the `targetRank 1` racer *lose within B1*. That
  is the design intent (contestability), and fairness is measured as band-reach, not exact rank — but state
  it plainly: the assigned Fisher-Yates winner is no longer guaranteed to win. Confirm this doesn't perturb
  start-row Holm (within-B1 swaps shouldn't).
- **Early finishers (closed tracks, the worst offenders at 28–30%).** A very fast leader can cross a
  lap-based `finishT` early; once `r.finished`, trajectoryMult is 1.0 and the leash is moot. Engaging from
  0.6 (not 0.9) gives the whole OUTCOME window to act, which is why A3's early start matters. Verify on
  searound/dirt-oval specifically.
- **Parity + determinism.** The leash reads live `t` (deterministic), adds no RNG. The one parity-sensitive
  point is the length scale: `govMeanBodyLen`/`lenScaleFrom` must be bit-identical browser vs sim.
- **No conflict with PulkLeadRotation:** it writes `governorMult` in PULK `[0.25,~0.5]`, faded by OUTCOME;
  the leash lives in `trajectoryMult` in OUTCOME. Different factor, different window. Keep the leash in
  `trajectoryMult` (its natural home), not `governorMult`.

### Recommendation A: **BUILD (modified).** Leader-only, gap-space **proportional** brake with hysteresis,
window `[0.6, ~0.92]`, threaded shared length scale, B1 floor. Flag-gated OFF → byte-identical.

---

## Mechanism B — Late Challenger

### Feasibility: low as specified; largely redundant once A exists.

**The generator runs once, anchored at the choreo boundary** (confirmed). A reactive second pass at
0.75–0.85 is new architecture *and* fights two facts:

1. **Feasibility collapses that late.** `racerFeasibility` sizes the reachable window from
   `speedBudgetFrac·remaining·finishT`. At progress 0.80, `remaining ≈ 0.2` — roughly a *quarter* of the
   budget available at the choreo boundary. So a challenger asked to *climb to contact* from a deeper rank
   at 0.80 will usually be judged **infeasible and skipped** — feasibility-correct, but it means B rarely
   fires *when it is needed* (a runaway is exactly when the gap is large and the climb is hardest).
2. **Rank-space curves can't express "within ~1 length."** `sampleHeroCurve` returns a rank. Pinning a
   challenger at rank 2 does **not** bound its length gap to the leader — if the leader ran away, rank 2 can
   still be 4 lengths back, which is *still a runaway by the metric's definition*. So **B alone does not
   move `runawayWinnerRate`.** Only a gap-space term (A) does.

### Answers to the open questions

**B1 — Neither form as written.** The reactive second pass: reject (new architecture + near-empty late
feasibility budget + non-deterministic re-anchor). The unconditional "closer": it largely **duplicates the
existing B1 heroes** — the generator already casts 2–4 B1 heroes whose curves are *inside B1 at 0.97, not
parked at rank 1* (`heroCurveGenerator.test.js:438`), i.e. they already contest the front in rank space. The
genuinely missing capability is *length contact*, which is rank-space-inexpressible and is exactly
Mechanism A. So the unconditional closer adds little A doesn't already provide.

**B2 — If reactive, anchoring would need** a fresh `postChaos`-style build (live ranks + rank-velocity,
`racePlanner.js:543–550`) plus a fresh `racerFeasibility` at trigger time. Mechanically doable, but per B1's
feasibility-collapse point most casts fail that late. Not recommended.

**B3 — Interaction with A: complementary in principle, but B is subordinate and mostly redundant.** A is
gap-space (moves the metric); B is rank-space (does not, on its own). B *with* A is redundant because A
already brings the field within contact so the existing B1 cluster becomes a real fight. They don't
*conflict* (A brakes rank 1; a challenger targets rank ~2), but stacking a boosted challenger onto a
leashed leader raises parade risk and should be watched, not assumed safe.

**B4 — Band-reach / Holm risk is real if the challenger climbs across bands.** A B1-assigned challenger
climbing *within* B1 is low-risk. But any challenger forced from B2/B3 up to contact late re-creates the
**endgame edge-leak that sank pack-release** (BACKLOG: 92% of leaks after progress 0.90) and the documented
**deep-band OUTCOME climb-capacity undershoot** — precisely the failure modes the project already measured.
Keep any challenger B1-assigned; even then, a B1 racer dragged to rank ~2 by 0.95 may not resolve to its
exact target — acceptable (within band) but must be gate-verified.

### Recommendation B: **REJECT the reactive late pass; DEFER the unconditional variant.** Build A first;
it subsumes B's goal (bring the front within contact) and does so in the space the metric lives in. Revisit
a B variant **only if**, after A ships and is measured, the front cluster is present in rank but still not
contesting in *length* — and measure that residual before building anything.

---

## What the concept misses / should add before the sweep

1. **The controller is length-blind — that plumbing is the real work.** Neither `update()` nor its callers
   carry a length scale today. Call this out as the prerequisite for A (and any B), and note it is
   parity-sensitive: browser (`index.jsx:1008`) and sim (`sim-fairness.mjs:1129`) must compute the leash
   input bit-identically (Sim-Browser Parity Rule), using the shared `raceLengths.js` path.
2. **"casting yield ≥ 0.95" has no metric behind it and doesn't apply to A.** No `castingYield` symbol
   exists; feasibility is boolean skip/`continue`. A casts nothing (no yield concept). If B is ever built,
   a casting-yield field must be *added* (to the hero/runaway-parade observers). Drop this criterion for A.
3. **Brake authority is −15%, not "+10%."** Minor, but it means the leash has more closing headroom than
   the concept assumes — plan the gain accordingly.
4. **Co-optimize the two metrics, don't minimize one.** `runawayWinnerRate ↓` and `paradeFinishRate ≤ 2%`
   trade off through `frontLeashMaxLengths`. The sweep should scan `frontLeashMaxLengths` × `frontLeashGain`
   and report *both* rates per point (the `runaway-parade` observer already emits both — no new observer
   needed for A). Reuse the exact f40a7a6 seeds via `exp-runaway-leader` for a paired comparison.
5. **Closed-track lap seam.** searound/dirt-oval are lap-based; the leash's length math must use the tested
   `arcT` wrap handling. Verify the worst two tracks explicitly; that is where the win is.
6. **The observer↔controller symmetry is a gift.** `runaway-parade` already computes leader→P2 length
   per frame. If the controller computes the same quantity by the same code path, the thing you *measure*
   and the thing you *steer on* are identical by construction — a clean, testable design. Add a golden test
   pinning the leash input against the observer's value on a synthetic race.

## Overall recommendation & sequencing

1. **Build Mechanism A** behind `frontLeash*` (default OFF, byte-identical), as modified above:
   leader-only proportional gap-brake, hysteresis, window `[0.6, ~0.92]`, threaded shared length scale,
   B1 floor.
2. **Sweep A** against the f40a7a6 baseline seeds with `exp-runaway-leader` + `--runaway-parade`,
   co-watching `runawayWinnerRate ↓` (target <10% overall / <15% per track), `paradeFinishRate ≤ 2%`,
   top-5 action (≥ baseline), band-reach ≥70%, Holm ≤2/4, and the OFF-fingerprint.
3. **Only if A leaves a residual** (front present in rank, absent in length at the line) revisit a
   B variant — most likely an *unconditional* B1 closer that borrows A's gap term, never the reactive pass.

Mechanism A is a sound, well-targeted, buildable change. Mechanism B, as written, is the weaker half:
right instinct (author a contender), wrong space (rank, not length) and wrong time (too late to be
feasible). Ship A, measure, and let the data decide whether B is even needed.
