# LBB-TWOCHECK-REPLAY — the Owner's two-check rule replayed against the recorded frames

Read-only replay of `results/lbb-trace-3-2026-07-15/raw-nod.json` (WITHOUT-(d) fix branch). No physics, no sim, no fingerprint, no client suite.

- State: `physicalY`@F−1, `t`@F — the pre-apply-deltas state the gate saw.
- Spans `halfSpan`/`tHalf`/`cap` are the gate's OWN captured values per frame (never re-derived from config).
- `offsetY = halfSpan` because `softSteeringClearancePct = 0.0` (verified in `client/src/modules/storage/defaults.js:502`).

**Rules.** R0/Check A = `isSideFree` on the TRAILER (both axes). Check B = same predicate on the LEADER
(lateral point = clamped destination `leader.y+dir·halfSpan`, longitudinal band around `leader.t`). **RW** = A∧B.
**R2** = swept corridor `[trailer.y..destination]±halfSpan`, longitudinal band spanning `trailer.t..leader.t`.

## Bottom line

Rig sound: R0 reproduces the gate **484/484** (free-side + blocker). Then, replaying the
Owner's rule against the frames:

1. **RW does NOT eliminate the 5 self-swept flips by opening the side — it brakes.** At all 8 flips RW blocks
   BOTH sides → `dir=0`. Whole-leg flips: R0 **8** → RW **0**, R2 **0**, Check-B-alone **1**. The weave dies the
   same way (d) kills it (braking at the contested frames), not by delivering a clean pass on a free side.
2. **The "phantom block" premise does not survive at the flip instant.** RW/B/R2 free the closing side in
   **0/5** self-swept flips. Where `dY` is large, Check B *does* drop the swept blocker (36/39) — but a
   DIFFERENT, genuine racer (3, 8, …) sits at the leader-anchored destination, so the side stays blocked. The
   cluster {3,8,36,39} is too dense for destination-anchoring to open the lane.
3. **RW is monotone-stricter than today (RW⊆R0): it removes 0 phantom blocks and adds 134/968
   (13.8%) new blocks** (22 lateral, 112 longitudinal). Phantom removal needs a rule that REPLACES
   Check A (Check-B-alone removes 77); RW keeps A, so it cannot.
4. **The longitudinal hole is real:** 154 (frame,racer) cases where a racer beside the leader sits in
   Check A's `dT∈(1,1.5)·tHalf` shadow, invisible today, caught only by Check B.
5. **(d) and the free-side fix are formally separate** (proved by monotonicity: RW can't un-brake a (d)-block).
   But RW is not surgical — it brakes **88/91** of racer 22's pass-frames.
6. **Coverage claim RW≡R2: REFUTED** — they disagree on **3/968** sides (all RW-free/R2-blocked).
7. **§4b not replayable here** (uninstrumented; needs body/track geometry fields absent from the dump). Direction
   is unambiguous: RW only makes the resolver more conservative.

Net: the Owner's two-check rule, replayed, does not turn the weave into a smooth pass — it converts it into a
brake, because the destinations are genuinely occupied. It is a stricter gate, not a phantom-veto removal.

## R0 sanity gate (control)

Trailer 22: **484/484** frames match the gate on free-side AND blocker identity (free-side alone 484/484).

R0 reproduces the gate on every evaluated frame → the rig is sound.

### Structural note (holds before any counting)

RW = A∧B with A = R0, so `RW_free ⟹ R0_free`: **RW is strictly stricter than today** — it can only ADD
blocks, never remove one. Any phantom over-veto lives in Check A, which RW keeps. So "phantom blocks removed
(R0 blocked, RW frees)" is **0 by construction** for RW; the phantom-removal question can only be answered by
a rule that REPLACES A (Check-B-alone or R2), reported alongside for that reason.

## §1 — Racer 22's 8 flips under each rule

Control R0 flips: **8** (frames 2051, 2058, 2061, 2066, 2079, 2080, 2099, 2639).

Per flip: the side that closed (`from`) and, under each rule, whether that side is FREE (F) or BLOCKED (b:idx),
the other side, and the resulting `dir` (recorded latch held fixed). "flip?" = does dir still reverse vs the
previous evaluated frame under that rule.

| flip@ | from→to | blocker(R0) | R0 from/to→dir | B-alone from/to→dir | RW from/to→dir | R2 from/to→dir |
|---|---|---|---|---|---|---|
| 2051 | 1→-1 | 39 | R=b:39 L=F →-1 ↻flip | R=b:39 L=b:3 →0 brake | R=b:39 L=b:3 →0 brake | R=b:39 L=b:3 →0 brake |
| 2058 | -1→1 | 36 | L=b:36 R=F →1 ↻flip | L=b:3 R=b:39 →0 brake | L=b:36 R=b:39 →0 brake | L=b:3 R=b:3 →0 brake |
| 2061 | 1→-1 | 39 | R=b:39 L=F →-1 ↻flip | R=b:39 L=b:3 →0 brake | R=b:39 L=b:3 →0 brake | R=b:39 L=b:3 →0 brake |
| 2066 | -1→1 | 36 | L=b:36 R=F →1 ↻flip | L=b:3 R=b:39 →0 brake | L=b:36 R=b:39 →0 brake | L=b:3 R=b:3 →0 brake |
| 2079 | 1→-1 | 39 | R=b:39 L=F →-1 ↻flip | R=b:8 L=b:36 →0 brake | R=b:39 L=b:36 →0 brake | R=b:8 L=b:8 →0 brake |
| 2080 | -1→1 | 36 | L=b:36 R=F →1 ↻flip | L=b:36 R=b:8 →0 brake | L=b:36 R=b:8 →0 brake | L=b:8 R=b:8 →0 brake |
| 2099 | 1→-1 | 8 | R=b:8 L=F →-1 ↻flip | R=b:8 L=b:36 →0 brake | R=b:8 L=b:36 →0 brake | R=b:8 L=b:8 →0 brake |
| 2639 | 1→-1 | 8 | R=b:8 L=F →-1 ↻flip | R=b:2 L=b:16 →0 brake | R=b:8 L=b:16 →0 brake | R=b:2 L=b:2 →0 brake |

Whole-leg flip counts (recorded latch held fixed): R0 **8**, Check-B-alone **1**, RW **0**, R2 **0**.

**The 5 self-swept flips (2051, 2058, 2061, 2066, 2080) — is the closing (`from`) side FREE under each rule?**
- Check-B-alone frees the closing side in **0/5** (none).
- R2 frees the closing side in **0/5** (none).
- RW frees the closing side in **0/5** (none) — 0 expected (RW⊆R0).

**Why B does NOT eliminate them — the destination is occupied by a DIFFERENT, genuine racer.** Per swept flip,
the R0 swept-blocker vs what Check B (leader-anchored destination) actually finds on the closing side:

| flip@ | closing side | R0 swept-blocker | dY@flip | B finds at destination | verdict |
|---|---|---|---|---|---|
| 2051 | right | 39 | -0.00374 | 39 | same racer still beside destination |
| 2058 | left | 36 | -0.04897 | 3 | swept blocker dropped, but a DIFFERENT real racer sits at destination |
| 2061 | right | 39 | -0.01460 | 39 | same racer still beside destination |
| 2066 | left | 36 | -0.04468 | 3 | swept blocker dropped, but a DIFFERENT real racer sits at destination |
| 2080 | left | 36 | 0.06651 | 36 | same racer still beside destination |

### Coverage claim (Plan-Claude: RW ≡ R2)

Over 968 evaluated sides, RW and R2 give the SAME free/blocked answer on **965** and
**disagree on 3** (0.31%). The claim is **refuted**: RW and R2 are not identical here. Examples: f777/R(RW free, R2 blk); f778/R(RW free, R2 blk); f2045/R(RW free, R2 blk).

## §2 — Disagreements with R0 (every evaluated frame × both sides)

Evaluated sides (frames × 2): **968**.

| rule | phantom removed (R0 blk→free) | new blocks (R0 free→blk) | rate | — of which lateral | longitudinal |
|---|---|---|---|---|---|
| RW (A∧B) | 0 | 134 | 13.84% | 22 | 112 |
| Check-B-alone | 77 | 134 | 13.84% | — | — |
| R2 (corridor) | 0 | 137 | 14.15% | — | — |

- **Phantom blocks removed** — the space the trailer never occupies. RW: **0** (0 by construction,
  RW⊆R0). Check-B-alone: **77**. R2: **0**. Only the A-replacing rules remove them.
- **New blocks added by RW** (today's code waving a racer into an occupied gap): **134** of 968
  sides = **13.84%** — lateral **22**, longitudinal **112**.
- Lateral new-block example: frame 2046 dir 1, other 39 at y=0.16287 (leader y=-0.02625, trailer y=-0.09417, halfSpan 0.09500) — beside the leader, missed by A's drifted point.
- Longitudinal new-block example: frame 728 dir 1, other 14 at y=-0.22547 in the arc-shadow (arc(trailer,o) > tHalf) but within tHalf of the leader — the blind spot §3 quantifies.

## §3 — The longitudinal hole (dT ∈ (1.0, 1.5)·lbTHalf), in isolation

Across 484 evaluated frames:
- Frames with ≥1 racer in the arc-shadow `arc(trailer,o) ∈ (tHalf, 1.5·tHalf]` (skipped by Check A): **484** (100.0%); **1266** shadow (frame,racer) pairs total.
- Of those shadow pairs, the racer is ALSO sitting beside the leader (within halfSpan of a destination AND
  within tHalf of the leader) in **154** pairs (12.2% of shadow pairs), spread over **116** frames
  (24.0% of evaluated frames).
- **The blind spot's size on this trace: 154 (frame,racer) cases where a racer beside the leader
  sits entirely in Check A's longitudinal shadow — invisible to today's free-check, caught only by Check B's leader-anchored band.**

## §4 — The long brakes (isolated (d)-only blocks)

**Missing field — named, not approximated.** The (d)-only-block population is defined by `vLatToward < 0`
(with `dir≠0`, `dT>dTStart`, `slowerLeaderOk||heroPass`) — see `scripts/lbb-blockdist.mjs`. Of these,
`vLatToward`, `slowerLeaderOk` and `heroPass` are **absent from this dump**: the trace-3 pairRow schema
(`raceBehavior.js` ~L598) records `dir`, `takeFreeLane`, `dT`, `dTStart` and the gate box, but not the
velocity/precondition flags the sim observer carried. And this dump is the WITHOUT-(d) branch — (d) does not
run in it at all. So the (d)-population cannot be isolated on this dump. (This is a finding, per the constraint.)

**Structural answer — CONFIRMED, the symptoms are formally separate.** A (d)-only block is already a BRAKE
(`takeFreeLane=false`). RW is stricter than R0 (RW⊆R0), so RW can NEVER turn a brake into a pass — it only
removes passes. Therefore RW leaves every (d)-block still braked: it cannot un-veto a long free-lane brake.
RW fixes WHICH side is free, not (d)'s velocity veto; the two must be staged separately. This is provable from
monotonicity alone and needs no per-frame count.

**But RW is NOT surgical — it brakes almost everywhere R0 passed.** On this trace's 484 frames R0 gives
`dir≠0` (a pass) on **91**; RW drives `dir≠0 → dir=0` (brake) on **88** of them and merely flips the
side on **0**. So RW converts 88/91 of racer 22's pass-frames into brakes — it suppresses the
weave the same way (d) does (by braking at the contested frames), not by delivering a clean pass on the free side.

## §5 — §4b overlap resolver call sites

`isSideFree` is shared with §4b (`raceBehavior.js` L737-740). Its spans there are
`pxToPhysicalY(contactWidth,trackWidth)` / `contactLength/pathLength` — **identical base** to the pass gate
(both use `hw_A+hw_B` / `hl_A+hl_B`, no buffer), so per pair §4b's `halfSpan`/`tHalf`/`cap` equal the pass
gate's captured values.

**Missing data — named.** §4b is NOT instrumented in this dump: no per-frame record of which pairs entered
the overlap regime (`dT ≤ tHalfSpan && |dY| ≤ lateralHalfSpan`), and reconstructing it for arbitrary pairs
needs each racer's `drawnBodyWidthPx`/`drawnBodyLengthPx` and `getTrackWidthAtTpx`/`getPathLengthPx`, none of
which are in the racerRow schema (only `physicalY`, `physicalYVelocity`, `t`). So the §4b answer-change count
cannot be produced from this dump.

**Bounded structural answer.** §4b runs ONLY in the overlap regime `|dY| ≤ lateralHalfSpan`. There the two
anchors (Check A: `self.y+dir·halfSpan`; Check B: `obstacle.y+dir·halfSpan`) differ by exactly `|dY| ≤
halfSpan` (clearance 0). So RW's added field-of-view is at most one `halfSpan` offset and the divergence is
bounded and transient — matching both critiques' independent read. Direction: RW only ADDS blocks (A∧B), so at
§4b it can only make the resolver MORE conservative (hold/route away sooner), never less. An exact count needs
the geometry fields above; the direction is unambiguous.
