# Step 2 Design — Forward-Looking Lateral Avoidance

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-06
**Code baseline:** `backup/y-reject-fair` (2890efa) — Step 1 + wave-1/2 perf, N=50 fair
**Status:** Design only — analysis before building. No code changes.
**Reading prerequisite:** Reports 05, 06 (design concept + operationalization), 13, 14 (Step 1 final state)

---

## 1. Current Code Map — Where Decisions Are Made Today

### The avoidance pair loop (`raceBehavior.js:342–546`)

This is the single O(N²) pass that handles all per-pair avoidance. Structured in order:

| Lines | What happens | Key gate |
|-------|-------------|----------|
| 348–352 | Compute `dT`, `dY`; Y-rejection | `|dY|·yWeight ≥ avoidanceDistance (0.18)` → skip |
| 353–354 | `dist = sqrt(...)` + dist gate | `dist ≥ avoidanceDistance` → skip |
| 387–451 | **Speed brake + brake-to-match** | `|dY| < 0.18 && dT < dynamicBrakeT` (all tracks); narrow zone for brake-match cap (open only) |
| 457–521 | **Free-lane separation (today's lateral avoidance)** | `dT ≤ tHalfSpan && |dY| ≤ lateralHalfSpan` — only fires when racers are already inside each other's sprite box |
| 527–544 | **Raw avoidance push** | fires for all pairs that passed the dist gate; pushes trailer away from leader |

The critical gap Step 2 targets: **the free-lane separation fires only when racers are already overlapping** (line 460). A same-lane approach from outside the sprite box receives the avoidance push (lines 527–544) but zero lateral redirection — the push is purely in the existing `yDiff` direction, which is zero for a same-lane approach (line 528: `const yDiff = trailer.physicalY - leader.physicalY; if (Math.abs(yDiff) < 1e-6) continue`).

### The `isSideFree` function (`raceBehavior.js:166–178`)

```js
function isSideFree(racer, counterpart, active, dir, lateralHalfSpan, tHalfSpan, cap) {
  const targetY = racer.physicalY + dir * lateralHalfSpan;
  if (targetY < -cap || targetY > cap) return false;
  for (const other of active) {               // ← O(N) inner scan
    if (other.index === racer.index || other.index === counterpart.index) continue;
    const dT = shortestArcDeltaT(racer.t, other.t);
    if (dT > tHalfSpan) continue;
    if (Math.abs(other.physicalY - targetY) < lateralHalfSpan) return false;
  }
  return true;
}
```

Currently called 4× per **overlapping** pair (left/right for each racer). Each call is O(N).
`tHalfSpan = spriteWorldSizePx / pathLength` — checks within one sprite-length longitudinally.

### The apply-deltas loop (`raceBehavior.js:633–753`)

Single-racer O(N) pass. Reads from `brakeMatchCaps` and `brakeMatchLeaderIdxs` (written by
pair loop). Writes `r.physicalY`, `r.avoidanceActive`, `r.brakeMatchFactor`, hold state.
This is where `r.brakeMatchFactor` becomes visible to `index.jsx` (one-frame lag, intentional).

### Brake application (`index.jsx:908–913`)

```js
const brake = r.avoidanceActive
  ? Math.min(computeEffectiveBrakeFactor(...), r.brakeMatchFactor ?? 1.0)
  : 1.0;
r.t += r.baseSpeed * boost * brake * r.trajectoryMult * r.areaBonusMult * r.rubberBandMult;
```

`r.brakeMatchFactor` written in raceBehavior.js pair loop; read here. The cross-file lag
is an existing established pattern (`avoidanceActive` same pattern).

### New information Step 2 needs

| Need | Description |
|------|-------------|
| N1 | **Approach-zone presence**: for a given trailer, are there racers to its left/right within the avoidance zone (but outside current sprite-box overlap)? |
| N2 | **Forward clearance**: beyond the immediate adjacent check, is the target lane band also free further ahead (forward look-ahead)? |
| N3 | **Committed direction state**: per-racer sticky side choice with debounce, persisting across frames |
| N4 | **Honest body width**: `spriteWorldSizePx × bodyFillX` as the approach-zone trigger and side-check span (currently not on racer object) |

---

## 2. Performance Design — Derive, Don't Rescan

### The O(N²→N³) threat

The naive implementation of N1 and N2 is to call `isSideFree` for every pair inside the
approach zone (not just overlapping pairs). At N=60:
- Y-rejection lets ~530 pairs through per step
- If each triggers 4 isSideFree calls × O(60) each: **127,000 inner operations per step**
- This wipes out Y-rejection's gain entirely; likely pushes P90 back to ≥ 22ms

**Do not do this.** The existing isSideFree calls (overlap zone only) are fine;
extending them to the full approach zone is the O(N³) path.

### The solution: piggyback on the existing pair loop

The pair loop already visits every pair within the avoidance distance (dist < 0.18).
That is precisely the set of pairs relevant to Step 2. Everything Step 2 needs can be
accumulated during the **existing** pair loop body as O(1) per-pair additions — no new scan.

#### N1 — Approach-zone neighbor presence (O(1) per pair)

During the pair loop, for each pair (rA, rB) that passes the Y-rejection gate:

```js
// Existing: const dY = rA.physicalY - rB.physicalY;
// Add during pair loop, using already-computed dY:
if (dY > 0) {
  // rA is above rB → rB is to rA's left (negative physicalY side), rA is to rB's right
  _approachLeft.add(rA.index);   // rA has a neighbor to its negative side
  _approachRight.add(rB.index);  // rB has a neighbor to its positive side
} else if (dY < 0) {
  _approachRight.add(rA.index);
  _approachLeft.add(rB.index);
}
```

Two pre-allocated Sets (wave-2 pattern) cleared per step. Each pair check: 1 comparison +
at most 2 Set.add calls. At 530 pairs: ~1600 additional operations. Negligible.

Lookup at commit time: `_approachLeft.has(trailer.index)` → O(1). No scan.

#### N2 — Forward clearance (O(1) per pair, separate Sets)

"Forward" means the other racer is ahead of the trailer in t-space (other.t > trailer.t).
Forward clearance needs: "is the lane band at my intended lateral target occupied by
any racer ahead of me within the approach zone?"

During the pair loop, already-computed `rA.t`, `rB.t`, and `dY` give this directly:

```js
// Determine trailer/leader from existing aIsTrailer:
// trailer = the one with lower t
// If the neighbor is a LEADER (ahead), record its lateral position relative to the trailer:
if (leader.physicalY < trailer.physicalY - lateralHalfSpan)  // leader is clearly to trailer's left
  _forwardLeft.add(trailer.index);   // left lane has forward obstacle
else if (leader.physicalY > trailer.physicalY + lateralHalfSpan)  // leader is clearly to trailer's right
  _forwardRight.add(trailer.index);  // right lane has forward obstacle
// else: leader is directly ahead (same lane) — neither side marked
```

This uses `aIsTrailer` (already computed at line 368), `trailer.physicalY`, `leader.physicalY`,
and `lateralHalfSpan` (computable from `spriteWorldSizePx / trackWidth` which is already
computed at line 458 for the overlap check, just one scope boundary away).

Two more pre-allocated Sets. Zero additional scans.

#### N3 — Committed direction state (per-racer field, O(1))

Exactly the brake-to-match pattern: per-racer fields set in the pair loop, consumed in
the apply-deltas loop. Two new racer fields:

| Field | Type | Description |
|-------|------|-------------|
| `approachCommitDir` | number | −1 (left), 0 (none), +1 (right) |
| `approachCommitFrames` | number | consecutive frames holding this direction |

Set in the apply-deltas loop (same section that updates `brakeMatchFactor`). No pair-loop
state needed — the accumulated `_approachLeft`/`_approachRight` Sets feed the decision,
commitment is per-racer state that persists frame-to-frame.

Debounce: only flip `approachCommitDir` if the new direction differs AND a threshold of
consecutive conflicting frames has passed (e.g., 3 frames — same as `bmDebounce`).
This prevents the zigzag described in report 05 §Risk-2.

#### Cost summary

| Addition | Per-pair cost | Per-step cost at N=60 | New scan? |
|----------|--------------|----------------------|-----------|
| `_approachLeft/Right` accumulation (N1) | 3 ops | ~1,600 ops | No |
| `_forwardLeft/Right` accumulation (N2) | 3 ops | ~1,600 ops | No |
| Commitment lookup in apply-deltas (N3) | O(1) | 60 ops | No |
| 2 new pre-allocated Sets | cleared once | 120 `Set.clear` ops | No |
| **Total added per step** | | **~3,400 ops** | **None** |

For reference: the existing pair loop body at 530 pairs takes ~50,000 operations.
Step 2's additions at ~7% more is well within the noise floor. P90 impact: negligible.

**The isSideFree call in the overlap zone (lines 467–470) is unchanged.** It still fires
only when racers are already overlapping — the small, already-paid cost.

#### What would be expensive (do not do)

- Calling `isSideFree` per approach-zone pair: O(N³). Off the table.
- A new per-racer "who is near me?" scan before the pair loop: O(N²). Off the table.
- Extending the approach zone much wider than avoidanceDistance (0.18): more pairs pass
  Y-rejection → larger pair loop set → proportionally more inner work. Keep approach zone
  within the existing avoidance zone boundary.

---

## 3. Fairness Risk Map

### Risk F1 — Side-choice bias at race start (highest concern)

**Mechanism:** At race start all racers have `physicalY ≈ rowStartY`. The pair loop visits
pairs from the same start position; `_approachLeft`/`_approachRight` reflect the same-row
lateral distribution. If the commitment rule consistently pushes all racers of one row
outward at race start, front-row and back-row racers see different systematic lateral pressures.

**Mitigation:** Use the existing `stablePairBit` tie-break for direction when both sides
are equally clear — the hash is a deterministic function of racer identity, not position,
so it does not create a systematic row-correlated bias.

**Sweep gate:** back-row B1 exact/top5 per-row breakdown (report 05 Gate 3). Must not
drop vs. Step-1 baseline. The per-row FairChance output already exists in the sim
(`FairChance by row:` block in sweep output).

### Risk F2 — Commitment hysteresis blocking a comeback racer

**Mechanism:** A comeback racer (fast re-roll, back row) enters the approach zone and
commits to the right side. Another racer fills the right side mid-approach. The commitment
holds via debounce for 3 more frames before re-evaluating — during which the racer is
pushing into an obstacle.

**Mitigation:** Adjacent-occupation debounce (3 frames) is short enough (50ms at 60fps)
that the approach into the obstacle is small before correction. The committed direction
flip is allowed when `_approachRight.has(r.index)` consistently holds for debounceFrames.
Anti-starvation: if `approachCommitFrames` exceeds a threshold (e.g., 90 frames) with
no progress (t-distance to leader not decreasing), commit is abandoned and brake-to-match
takes over.

**Sweep gate:** B1top5 back-row rate. bmFail count (pass-through events still at 0).

### Risk F3 — Closed track disruption

**Mechanism:** The approach-zone lateral push fires for all pairs within avoidance zone.
On closed tracks (Dirt Oval, Garden Path, City Circuit, Ice Track, Searound), the avoidance
pair loop already fires avoidanceActive + brake-to-match for pack stabilization. Adding
MORE lateral force in the approach zone could over-compress the pack on narrow closed tracks.

**Mitigation:** Scope the approach-zone lateral push to **open tracks only** (same
`config.isOpen !== false` guard as brake-to-match narrow zone). Closed-track racers are
spread around a loop; they have full-lap separation most of the time. The existing
avoidance push + brakeMatch handles the rare close-following case on closed tracks.

**Sweep gate:** All 30 closed-track combos (6 tracks × 5 racer types each) must remain
≥ 0.05. Currently all pass comfortably; a regression here is a hard stop.

### Risk F4 — Cascade lateral displacement (zigzag score)

**Mechanism:** Trailer A commits left. This shifts A's physicalY, making A a left-side
obstacle for trailer B, which then commits right. Then C commits left. Cascade creates a
visibly woven pattern rather than smooth natural overtaking.

**Mitigation:** The existing `stuckModeSuppress` (bilateral pressure cancel) already
prevents racer A from building up extreme lateral velocity when sandwiched. The
approach-zone force should be magnitude-limited: no stronger than the existing `forceMag`
at the same distance (`config.lateralForce × (1 − dist/avoidanceDistance)`). Reusing the
same force magnitude formula ensures the cascade magnitude is bounded by the same constant
that was calibrated for the existing system.

**Sweep gate:** `zigzag` score in sim output. Must not increase by > 0.05 units vs. Step-1
baseline per combo (report 05 Gate 4).

---

## 4. Wide-Body Feasibility (Flag 1 from Report 06)

### Field availability on the runtime racer object

The racer object at runtime (written in `index.jsx:598–607`) has:

```js
spriteWorldSizePx: physicalSpriteSize,       // = displaySize × displaySizeScale_physical
geometricTrackWidthPx,
pathLengthPx,
```

**`bodyFillX` is NOT on the racer object.** It lives on `racerType.config.bodyFillX`
(accessed in `index.jsx:419` as `Math.min(racerType.config.bodyFillX, racerType.config.bodyFillY)`)
but is not stored on the racer.

**Current consequence:** `getSpriteWorldSizePx(racer)` returns the full frame size
(`spriteWorldSizePx`), which is the honest body width only for racers where `bodyFillX ≈ 1`.
For the most body-filling racers: dragon (0.836), buggy (0.844), duck (0.875), plane (0.836).
For slim racers: giraffe (0.271), rocket (0.278), horse (0.353) — honest body is 3–4×
narrower than `spriteWorldSizePx`. The approach zone and isSideFree currently use the
full frame as the collision span, substantially overestimating for slim racers.

### Values for all 20 racer types

| Racer | displaySize | bodyFillX | Honest width / frame |
|-------|------------|-----------|----------------------|
| dragon | 50 | **0.836** | 83.6% |
| buggy | 38 | **0.844** | 84.4% |
| plane | 42 | **0.836** | 83.6% |
| duck | 36 | **0.875** | 87.5% |
| f1 | 38 | 0.555 | 55.5% |
| koi | 52 | 0.578 | 57.8% |
| turtle | 48 | 0.578 | 57.8% |
| elephant | 44 | 0.539 | 53.9% |
| manta | 56 | 0.633 | 63.3% |
| snowmobile | 52 | 0.459 | 45.9% |
| boarder | 40 | 0.398 | 39.8% |
| beetle | 38 | 0.398 | 39.8% |
| snake | 44 | 0.374 | 37.4% |
| motorbike | 42 | 0.400 | 40.0% |
| horse | 47 | 0.353 | 35.3% |
| dolphin | 52 | 0.402 | 40.2% |
| luge | 80 | 0.313 | 31.3% |
| snail | 35 | 0.727 | 72.7% |
| giraffe | 48 | 0.271 | 27.1% |
| rocket | 47 | 0.278 | 27.8% |

Dragon, buggy, plane, duck are the "wide body" racers where `spriteWorldSizePx` is a
reasonable proxy. Giraffe, rocket, luge, horse, snake are severely over-estimated.

### Resolution: add `honestBodyWidthPx` at race init (one field)

In `index.jsx` at the racer init block (line ~603, alongside `spriteWorldSizePx`):

```js
spriteWorldSizePx: physicalSpriteSize,
honestBodyWidthPx: physicalSpriteSize * racerType.config.bodyFillX,  // ← add
```

`racerType.config.bodyFillX` is already in scope at that point (the full `racerType`
is available). Zero performance cost. `honestBodyWidthPx` is then readable in
`raceBehavior.js` wherever `getSpriteWorldSizePx()` is currently called.

**In sim-fairness.mjs:** The sim already sets `spriteWorldSizePx: effectiveDisplaySize`
on each sim-racer at line 338. Add:
```js
honestBodyWidthPx: effectiveDisplaySize * bodyFillX,
```
`bodyFillX` is already available at that scope (line 2155, destructured from `cfg`).

### What this enables for Step 2

With `honestBodyWidthPx` on the racer:
- `lateralHalfSpan` in the **approach-zone trigger** uses `leader.honestBodyWidthPx / trackWidth`
  instead of `spriteWorldSizePx / trackWidth` — fires when the trailer is approaching
  the honest body boundary of the leader, not the frame boundary.
- `isSideFree` for the **overlap zone** can optionally keep using `spriteWorldSizePx`
  (conservative — if it is not inside the sprite frame, it is definitely not inside the body).
  Or use `honestBodyWidthPx` for a tighter check. To be decided during Stage B.

For dragon specifically: the approach-zone trigger fires at the honest 0.836 boundary,
giving the trailer enough lead time to drift clear of the 83.6%-filled frame before
honest overlap. This directly addresses the 17-frame problem documented in report 05 §3.

---

## 5. Staged Build Plan

**Ground rule for all stages:** each stage is independently frame-log measured and,
if it changes behavior, N=50 swept before proceeding. No stage is "small enough to skip
the sweep." Fairness is non-negotiable; the sweep is the contract.

---

### Stage A — Proactive approach-zone push (no commitment state)

**What:** During the pair loop, when trailer is in the approach zone (dist < avoidanceDistance,
outside sprite-box overlap), accumulate a lateral push on the trailer toward the side opposite
the leader's physicalY. No hysteresis, no commitment — just "start moving away from the
approaching leader earlier."

**Where in code:** Pair loop body, between the dist gate (line 354) and the speed brake
block (line 387). When `dist < avoidanceDistance` AND NOT overlapping (so `dT > tHalfSpan
OR |dY| > lateralHalfSpan`) AND `Math.abs(yDiff) >= 1e-6` (not same-lane):

```
accumulate into _yApproachDeltas[trailer.index]: pushDir × forceMag × (approach_scale)
```

**What this does NOT yet solve:** same-lane approaches (yDiff ≈ 0) — the primary dragon
problem. The existing `if (Math.abs(yDiff) < 1e-6) continue` gate (line 528) filters
those out even in Stage A.

**Performance:** No new scans. `forceMag` and `pushDir` are already computed in the pair
loop body. One extra map write per qualifying pair. ~1% total step cost added.

**Measurement:** Frame log (P90 must stay ≤ 16.7ms), N=50 sweep (66 combos), zigzag score.

**What we learn:** Does the earlier push reduce dragon overlap at all? Does it improve
or worsen zigzag for slim racers (where `spriteWorldSizePx` over-fires)?

---

### Stage B — Same-lane detection + side commitment

**What:** Handle the key missing case: a same-lane approach where `|yDiff| < 1e-6`.

Add the `_approachLeft`/`_approachRight`/`_forwardLeft`/`_forwardRight` Sets accumulated
during the pair loop (design in §2). In the apply-deltas loop, for each racer that has
a leader in its approach zone:
1. Evaluate left/right occupancy from the Sets (O(1))
2. If one side is clear: commit `approachCommitDir` to that side
3. If both sides are clear: choose the side with fewer forward obstacles, tie-break by `stablePairBit`
4. If both sides occupied: no commit (fall through to brake-to-match)

Add `approachCommitDir` and `approachCommitFrames` per-racer fields. Debounce flip by
3 frames. Apply an additional lateral force in `approachCommitDir` direction.

**Prerequisite:** `honestBodyWidthPx` on racer object (one field added to `index.jsx`
and `sim-fairness.mjs` — minimal change, separately committed).

**Performance:** O(1) per pair (Set.add during pair loop). O(1) per racer in apply-deltas.
4 new pre-allocated Sets (wave-2 pattern). Estimated cost: ~5% total step time. Still
well within budget.

**Measurement:** Frame log, N=50 sweep, zigzag score, honest overlap metrics (dragon).

**What we learn:** Does the committed lateral push visually resolve dragon overlap?
What is the B1top5 back-row fair-chance impact?

---

### Stage C — Forward clearance (Part 2 of the two-part check)

**What:** Extend the side commitment to also check whether the target lane is occupied
further ahead (not just immediately adjacent). Use `_forwardLeft`/`_forwardRight` Sets
accumulated during the pair loop.

The check is: if `_forwardRight.has(r.index)` → right lane is blocked ahead → prefer
left even if right looks immediately clear.

This adds the full two-part check from report 05 §Phase-0, making the side-selection
more accurate for narrow corridors (e.g., tight closed-track sections).

**Scope:** Open tracks only (`config.isOpen !== false`), same guard as brake-to-match.

**Performance:** No additional cost beyond Stage B (the Sets are already accumulated).

**Measurement:** N=50 sweep. Honest overlap. Zigzag. B1top5 back-row.

---

### Stage D — Honest body width activation (Flag 1)

**What:** Replace `spriteWorldSizePx` with `honestBodyWidthPx` as the approach-zone
trigger span. This makes the lateral commitment fire at the honest body boundary —
critical for dragon (where it fires 16.4% later with `honestBodyWidthPx`) and
substantially reduces over-avoidance for slim racers (giraffe: 3.7× narrower activation).

**Why staged separately:** This changes when the trigger fires for every racer type.
Slim racers (giraffe, rocket) will have smaller approach zones → less avoidance. Dragon
will have the same approach zone but correctly calibrated. Net effect on fairness is
uncertain and must be measured.

**Prerequisite:** `honestBodyWidthPx` field already added in Stage B.

**Measurement:** Full N=50 sweep. Honest overlap metrics. This is the highest-risk stage
for fairness because it changes behavior for all racer types simultaneously.

---

### Recovery point before starting

Before Stage A, create a checkpoint tag:
```
backup/pre-step2  → HEAD (2890efa)
```
This is the exact analog of `backup/pre-pairloop-opt` from the perf work — a named
fallback before behavior changes begin.

### Stage completion criteria

Each stage is done when:
1. Tests: 2629/2629 green
2. Frame log: P90 ≤ 16.7ms (no regression vs. `backup/y-reject-fair`)
3. N=50 sweep: all 66 combos pass (p ≥ 0.05)
4. Honest overlap: dragon honest overlap not worse than Step-1 baseline per open combo
5. Zigzag: no combo increases by > 0.05 vs. Step-1 baseline
6. Back-row B1top5: no row drops > 10pp vs. Step-1 baseline

Stage B additionally requires: visible lateral evasion on dragon (browser confirmation
on Space Sprint or Luger Hill before B1 stage is signed off).

---

## Summary

| Dimension | Design choice | Rationale |
|-----------|--------------|-----------|
| Data source for N1/N2 | Piggyback on existing pair loop (O(1) per pair) | Avoids O(N³) isSideFree per approach pair |
| Commitment state | Per-racer `approachCommitDir` / `approachCommitFrames` | Established pattern (brakeMatchLeaderIndex) |
| Closed-track scope | Open tracks only for approach-zone push | Guards 30 closed-track combos already fair |
| Wide body | `honestBodyWidthPx` added to racer at init | One field, zero runtime cost, fully faithful to Flag 1 |
| Staged order | Push first → commitment second → forward clearance third → honest-width fourth | Each stage measurable; complexity increases incrementally |
| Performance | < 5% step cost added (all stages combined) | Within noise floor given P90 now at budget |

The Y-rejection lesson applies directly: derive from existing traversals rather than
opening new ones. Step 2's approach-zone checks are all O(1) per pair additions to an
existing O(N²) loop — not new O(N) scans layered on top.
