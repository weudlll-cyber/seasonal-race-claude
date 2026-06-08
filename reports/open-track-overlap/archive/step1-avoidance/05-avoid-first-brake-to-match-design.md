# Design Concept: Avoid-First, Else Brake-to-Match-and-Hold

**Branch:** `feat/open-track-overlap`
**Date:** 2026-06-05
**Status:** Design only — no code, no defaults changed
**Prerequisite reading:** Reports 01–04 in this series (source fault confirmed)
**Purpose:** Describe the intended overtaking behavior for user review and approval before any implementation

---

## Background Summary (Why This Is Needed)

Report 04 identified two compounding design gaps that cause the visual "pass-through":

1. The speed brake is a fixed 5.5% reduction with no reference to the leader's speed. A trailer that is 11–17% faster than the leader is still 5–11% faster after braking, so it continues to close in — just slightly more slowly. No fixed-percentage brake can hold a significantly-faster racer behind a slower one.

2. When a trailer approaches directly behind the leader in the same lane, there is zero lateral push until the trailer enters the sprite-box overlap zone. For a same-lane approach, the brake fires for roughly 81 frames before any lateral avoidance even begins. By then the trailer is already inside the leader's body.

For dragon specifically, a third amplifier: the honest body width is 67% wider than the zone where the free-lane lateral push fires. Even after the lateral push begins, the trailer is already well inside the honest-overlap region and must travel a far greater lateral distance to escape it than the push has had time to produce.

These are design gaps (not bugs) — the existing code correctly implements what it was written to do; what it was written to do is simply not the right behavior.

---

## 1. The Intended Overtaking Sequence, Step by Step

### Phase 0 — Approach detection (earlier than today)

When a trailer enters the approach zone behind a leader, the system immediately evaluates both sides using a two-part eligibility test.

**Part 1 — Adjacent clearance (hard prerequisite):** Is there room immediately beside the trailer on that side right now? Specifically: would shifting laterally by one racer-body-width place the trailer inside another racer's body? If yes, that side is ineligible and Part 2 is not evaluated for it. Moving into an occupied adjacent space would trade one overlap for another — this is unconditionally forbidden.

**Part 2 — Forward clearance (required once adjacent is clear):** Over a short look-ahead distance in the direction of travel, is the target lane band also free of racer bodies? A side that is open immediately beside the trailer but blocked half a racer-length further along is a dead end — committing to it steers the racer into the next obstacle before the first one is cleared.

A side is eligible only if **both parts hold**. Adjacent clearance is the hard prerequisite; forward clearance is an additional required condition on top of it, not merely a tiebreaker.

**Decision outcomes from the two-part check:**
- **Both sides eligible** — choose the side with more forward clearance (the deeper open corridor). In a tie, use the existing stable hash tie-break.
- **Only one side eligible** — that side is the only candidate. If its forward clearance indicates a near-immediate dead end, prefer entering brake-to-match-and-hold over steering into a second collision.
- **Neither side eligible** — no lateral pass is possible right now. Fall back to brake-to-match-and-hold (Phase 2b) and monitor for a gap to open.

**Crucially: this detection happens as soon as the trailer is within the approach zone — well before the trailer reaches the sprite-box boundary.** Today this zone does nothing laterally when the racer is in the same lane; the new design changes that.

### Phase 1 — Lateral commitment (avoid-first)

If at least one side passes the two-part eligibility test (Phase 0), the trailer immediately commits to the eligible side with the better forward clearance and begins a sustained lateral drift in that direction. Once committed, the direction is held stably and does not oscillate frame-to-frame. In particular, a momentary tightening of the forward look-ahead on the committed side does not trigger a reversal — the commitment is only abandoned when a clear, debounced re-evaluation shows that the committed side's adjacent clearance has genuinely closed (another racer has physically moved into the space beside the trailer). The distinction matters: look-ahead wobble is expected and must not cause visible zigzag; a newly occupied adjacent space is a structural change that warrants re-evaluation. The re-evaluation uses the same two-part test as Phase 0 and selects a new commitment fresh from the current state.

The push magnitude scales with closeness: stronger when the trailer is nearly touching the leader longitudinally, weaker when still some distance away. This is the same proximity-scaling the existing avoidance system uses, but it fires earlier and for a same-lane direct approach.

**For wide bodies specifically:** the lateral commitment zone uses the leader's honest body width — the actual rendered visual extent — as the boundary, not the smaller sprite-box edge. For dragon, this means the push starts far enough out that the trailer has room to drift clear before honest overlap begins, rather than starting only after it has already begun.

### Phase 2a — Lateral pass (the normal outcome)

As the trailer drifts sideways it moves into the adjacent lane band. Once it is longitudinally alongside the leader but clearly offset laterally — clear of the leader's body — the forward speed resumes normally. The trailer accelerates past the leader using its natural speed advantage and completes the overtake. This is the "go around, not through" path.

**This is the path a comeback racer takes.** A racer with a fast re-roll has above-average speed and will push through the approach zone, receive a lateral commitment impulse, drift sideways past the leader, and then open up forward again once clear. Its overtake is preserved — it now happens diagonally rather than straight through. Faster racers complete this path in fewer frames because their higher forward speed carries them past the leader quickly once laterally offset.

### Phase 2b — Brake-to-match-and-hold (only when lateral is genuinely blocked)

If both sides of the leader are genuinely occupied — meaning the trailer cannot drift either direction without entering another racer's body — then the lateral-avoidance path is unavailable. Only in this case does the brake-to-match behavior engage.

"Brake-to-match" means: the system computes the leader's current effective speed — its base speed adjusted by all the same speed modifiers that apply to any racer (speed spread, trajectory multiplier, and any active race-plan multipliers) — and reduces the trailer's forward speed to match that effective speed exactly. Not a fixed percentage cut: a per-pair, per-frame computed cap. If the leader is slow, the trailer brakes to that slow speed. If the leader is fast, the trailer barely brakes at all.

The trailer holds at leader speed until either (a) a lateral gap opens on one side and Phase 1 resumes, or (b) the leader's speed rises to match or exceed the trailer's natural speed — in which case no braking is needed and the constraint releases on its own.

### Phase 3 — Exit conditions (brake releases, overtake resumes)

The brake-to-match releases, and normal forward speed resumes, when any of the following occurs:
- The trailer has drifted laterally far enough to be clear of the leader's honest body width on either side (it can now pass freely).
- The gap ahead of the leader opens up and the lateral block clears (another racer moves away).
- The leader completes the race (finishes) and is removed from active processing.
- The trailer's own natural speed falls at or below the leader's speed (no intervention needed).

### Summary of full sequence

```
Trailer enters approach zone
  → Two-part side check for each side:
       Part 1 (hard): adjacent space occupied? → side INELIGIBLE
       Part 2 (required): forward look-ahead blocked? → side INELIGIBLE

       Both sides eligible  → Phase 1: commit to side with better forward clearance
       One side eligible    → Phase 1: commit to that side
                               (if its forward look-ahead is a near-immediate dead end
                                → prefer Phase 2b over steering into it)
       No side eligible     → Phase 2b immediately
  ↓
  Phase 1: sustained lateral drift on committed side (stable; debounced re-evaluation only
           if committed side's adjacent clearance closes — not on look-ahead wobble)
    → Phase 2a: lateral clear of leader's honest body → full speed resumes → overtake done
  ↓
  Phase 2b: hold at leader's effective speed; monitor both sides each frame
    → a side passes two-part check → resume Phase 1 → Phase 2a
```

---

## 2. How Comeback and Back-Row Racers Still Climb the Field

The design does not prevent overtaking — it redirects overtaking from straight-through to go-around. A comeback racer with a fast re-roll will:

1. Approach the pack with above-average speed, enter the approach zone.
2. Receive a lateral commitment impulse on the first available clear side.
3. Drift sideways around the racer ahead.
4. Resume full speed, now at a laterally offset position where the next approach zone is with the next racer forward.
5. Repeat for each racer in the pack, carving through the field laterally.

The key property: **the brake-to-match path is the fallback, not the primary path**. As long as the track is not infinitely crowded, there will almost always be a clear side to commit to. The proactive lateral commitment means the trailer is already drifting before it enters the honest-overlap zone, giving it a running start on clearing the body extent.

For a 60-racer field on a track wide enough for lateral movement, a typical comeback racer will find at least one clear side available on most approaches. The brake-to-match path will only dominate when the racer is genuinely surrounded (e.g., a dense cluster with racers both ahead and to both sides simultaneously).

**Expected effect on back-row fair chance:** Back-row starters with fast re-rolls have the same lateral-avoidance path available to them as any other racer. The design does not distinguish racer position or speed class — it just redirects the physical path of an overtake. Back-row B1 fair-chance (top-5 reach rate) should be unaffected or slightly improved: the lateral path is more reliable than the current pass-through, because a clean lateral commitment leads to a predictable clean pass rather than an extended overlap event that could resolve ambiguously.

---

## 3. Wide-Body Racers (Dragon's 67% Wider Overlap Zone)

Today's critical problem for dragon: the honest-overlap zone is 67% wider than the zone where any lateral push fires. This means a trailer can be firmly inside dragon's visible body while receiving zero lateral force. The proactive lateral commitment fixes this structurally.

The approach detection in Phase 0 uses the leader's honest body extent — not the sprite box — to define the "lateral clear" check. This means:
- The commitment happens early enough that the trailer must travel a full dragon-body-width laterally to clear the honest-overlap zone.
- The push starts early enough to have time to cover that full width before the honest-overlap threshold is reached.

For dragon specifically: the proactive commitment fires at a longitudinal distance where the trailer still has time — measured in frames at the braked approach rate — to accumulate enough lateral displacement to escape the 0.2118 honest body width before dT crosses the overlap threshold. Today only 17 frames of pre-overlap push exist, producing ~0.036 lateral displacement against a 0.2118 target. With earlier firing, the pre-overlap push window expands to however many frames are between the approach zone entry and the sprite-box boundary — potentially 5–10× more frames.

There is no separate special-case for dragon: the design is general (use honest body width for both the clear-side check and the early trigger zone), and dragon benefits automatically because its honest body width is the largest of any racer.

---

## 4. Existing Behaviors Touched vs. Genuinely New Behaviors

### Existing behaviors this design modifies

| Behavior | Current form | Modified form |
|---|---|---|
| Speed brake factor | Fixed 5.5% reduction, same for all pairs | Per-pair computed value matching leader's effective speed; may be 0% for near-speed pairs |
| Brake engagement zone | Fixed lateral gate, narrower than dragon's body | No change to the gate itself, but the fix above makes the gate less critical |
| Free-lane lateral push | Fires only inside sprite-box overlap zone | The approach-zone proactive push is additive; free-lane continues to exist inside the box |
| Direction commitment | Frame-by-frame (can oscillate) | Sticky once committed, held through the approach window |

### Genuinely new behaviors (do not exist today)

| New behavior | Description |
|---|---|
| Proactive approach-zone lateral push | Fires when trailer is in the approach zone but outside the sprite box, for a same-lane (or near-same-lane) approach — currently zero lateral force fires here |
| Lateral clear-side check | Before committing a lateral direction, checks whether the target lane band is occupied by another racer — currently the free-lane check only looks at an immediate side, not the full approach window |
| Leader effective speed computation | Computes the leader's current speed from all its active multipliers — currently no per-pair leader speed exists anywhere in the codebase |
| Brake-to-match per-pair cap | Derives a brake factor from the leader-speed computation rather than using the fixed constant — currently the constant is hardcoded |
| Brake hold with gap-watch release | Continues brake engagement until lateral clear is confirmed, rather than re-evaluating gates per-frame — currently the brake is a per-frame binary flag with no state |

The scope is non-trivial: two new computations (leader effective speed, lateral clear-side check), one extended trigger zone, and one new state management concept (brake hold). However, the new behaviors are additive to the existing avoidance system and do not require restructuring it — they extend the entry conditions and the brake application pathway.

---

## 5. Risks

### Risk 1 — Back-row starvation (fairness failure)

**What could go wrong:** If the brake-to-match holds a fast comeback racer behind a slow leader indefinitely because the clear-side check never resolves, the racer is effectively frozen in the field and cannot climb.

**Design mitigations:**
- The proactive lateral push in Phase 1 is the primary path; brake-to-match is only the fallback when BOTH sides are genuinely occupied. In a normal 60-racer field on a wide track, both sides being simultaneously occupied is a brief and infrequent state.
- The clear-side check should be conservative in declaring a side "blocked" — it should only block if another racer's body is actively overlapping the target lane band, not merely if there is a neighbor within a larger proximity zone.
- If the brake-to-match holds for more than a threshold number of frames with no resolution, it should either (a) release briefly to let the racer attempt a lateral push with weaker force, or (b) accept a small controlled overlap rather than trapping the racer indefinitely. Permanent trapping is worse than temporary overlap.

### Risk 2 — Zigzag / oscillation from over-aggressive lateral commitment

**What could go wrong:** The proactive commitment pushes the trailer sideways. If another racer fills the just-vacated side, the next frame the commitment might switch direction. The racer oscillates left–right visibly.

**Design mitigations:**
- Once a lateral direction is committed, it must be held for a minimum window — at minimum until the trailer has either cleared the leader's body longitudinally or been fully stopped by brake-to-match. Mid-approach direction reversal is forbidden.
- Re-evaluation of the committed direction uses the same two-part test as Phase 0, but with a higher bar: it only fires when the committed side's **adjacent clearance** (Part 1) has definitely closed — meaning another racer has physically moved into the immediately adjacent space. A change in forward look-ahead score alone (Part 2 tightening without Part 1 failing) must not trigger a re-evaluation. This distinction is critical: the forward look-ahead can legitimately fluctuate frame-to-frame as neighboring racers drift; treating that as a reason to reverse direction would produce exactly the oscillation this mitigation is designed to prevent.
- The zigzag score in the sim should be part of the test gate (see Section 6).

### Risk 3 — Cascade pile-up from brake-to-match

**What could go wrong:** Trailer A brakes to match leader B. Trailer C behind A now faces a slow A and also brakes to match A. The entire trailing pack compresses, and a large cluster forms that resolves slowly.

**Design mitigations:**
- Each pair is computed independently. Trailer C brakes to match A's (currently braked) effective speed — not A's natural speed. This is already the correct behavior: if A is going slowly, C should go slowly too until A moves.
- The real risk is that the cluster takes many frames to unwind. This is bounded by the fact that lateral passes complete in finite frames (once a side opens, the racer exits the pile). No circular dependency is possible: the leader B never brakes, only trailers do.
- The magnitude of compression is limited by the proactive lateral path being the preferred exit. Most racers in the cluster should be finding lateral gaps and passing around B rather than queuing behind A. The pile-up scenario only accumulates if the track is nearly full-width blocked, which is geometrically unlikely at normal racer counts.

### Risk 4 — Multi-leader ambiguity

**What could go wrong:** A trailer is within the approach zone of two leaders simultaneously — one directly ahead and slow, one diagonally ahead and fast. Which leader's speed is the reference? Which side is "clear"?

**Design mitigations:**
- For the brake-to-match, use the slowest-leader reference: the most restrictive speed cap. This is conservative (never lets the trailer be faster than any obstructing leader) and avoids the case where the trailer matches the fast diagonal leader and still runs through the slow one.
- For the lateral clear-side check, consider all leaders in the approach zone simultaneously: a side is only "clear" if no racer occupies it within the approach window, regardless of which leader is the primary obstacle.
- The most-constraining-leader rule is a simple local minimum operation and does not add significant complexity.

### Risk 5 — Over-conservative braking for near-speed pairs

**What could go wrong:** Two racers with nearly identical speeds oscillate around the brake-to-match threshold — one frame the trailer is fractionally faster and brakes, the next it is fractionally slower and releases. This produces micro-jitter in forward speed.

**Design mitigations:**
- Apply a minimum speed differential threshold: the brake-to-match only engages when the trailer's effective speed exceeds the leader's by more than a small margin (e.g., more than half a percent). Below this threshold, no braking is applied — the natural stochastic processes (re-rolls) will handle near-speed neighbors without intervention.
- The brake-to-match factor should be slightly below the exact leader speed — a small safety margin — rather than exactly at the threshold, to avoid the boundary oscillation.

---

## 6. Test Plan

All tests must pass before the implementation is considered complete. Browser confirmation by the user is the final gate.

### Gate 1 — Honest overlap reduction (primary goal)

Run the full 27-open-combo sim sweep at the same settings as Phase-1 (`60 racers, 60s, 10 races, race-plan=true, seed=1`).

| Metric | Target | Failure condition |
|---|---|---|
| Dragon honest overlap (all 5 tracks) | < 2.0% per combo (down from 3.2–4.3%) | Any combo ≥ 3.0% |
| Rocket honest overlap | ≤ 0.7% per combo (no regression) | Any combo > 1.0% |
| All other racers | ≤ current Phase-1 values per combo | Any combo > Phase-1 value |
| Adjacent-collision rate | 0% — the lateral commitment must never move a racer into an adjacent space that was already occupied at the moment the commit fired | Any frame where a lateral commit causes a new body overlap with an immediately adjacent racer (distinct from the approach-zone leader — i.e., an overlap caused by the lateral move itself, not by the original closing trailer) |

### Gate 2 — Chi-square fairness (all 66 combos)

Run all 66 combos (open + closed) at the same settings.

| Metric | Target | Failure condition |
|---|---|---|
| Fairness p-value | ≥ 0.05 for all 66 combos | Any combo < 0.05 |
| Closed-track combos specifically | All still ≥ 0.051 (regression guard) | Any closed combo drops below Phase-1 minimum |

### Gate 3 — Back-row fair-chance (no starvation)

Run the open-track combos at N=50 races (larger sample to distinguish signal from noise) and check per-row fair-chance.

| Metric | Target | Failure condition |
|---|---|---|
| B1top5 rate for back-row starters | ≥ Phase-1 baseline per combo | Any back-row row drops > 10 pp below Phase-1 |
| B1exact rate for back-row starters | Not degraded vs Phase-1 | Any back-row row drops > 5 pp below Phase-1 |
| Overall B1top5 range | 52–72% (within Phase-1 range) | Any combo outside this range |

The per-row breakdown (noted as a known gap in the Phase-1 report, Part 7, item 4) should be implemented before or alongside this validation so the data is available.

### Gate 4 — Zigzag under threshold

| Metric | Target | Failure condition |
|---|---|---|
| Zigzag score (liteZigzagScore) | No increase vs Phase-1 baseline per combo | Any combo increases by > 0.05 units |

### Gate 5 — Tier-1 shortlist re-run (N=50)

The five combos flagged as Tier 1 in the Phase-1 report (Luger Hill × dragon, Space Sprint × dragon, Seatrack × dragon, Mountainstreet × dragon, River Run × dolphin) should each be re-run at N=50 to confirm:
- Honest overlap reduced vs Phase-1
- Fairness p ≥ 0.05 at N=50 (higher power, so this is a stricter gate)
- No extreme row skew (no row at 0% over 50 races)

### Gate 6 — Browser visual confirmation

User tests the following browser scenarios before sign-off:
- Space Sprint or Luger Hill: dragon racer in a field of 60 — watch for visual pass-through events. Target: no visible straight-through passes; lateral evasion should be visible before body overlap.
- Any track: watch a comeback racer (one that starts far back and climbs) — confirm it navigates the pack via lateral evasion, not straight-through. Confirm it still reaches top-5 or better.
- Check that racers do not exhibit excessive zigzag or oscillation while navigating the pack.
- Confirm closed-track races look and feel unchanged.

---

## Summary

The "avoid-first, else brake-to-match-and-hold" design replaces two reactive behaviors (late lateral push, fixed-% blind brake) with two proactive behaviors (early lateral commitment, leader-speed-matched brake). The key properties:

- **Lateral avoidance is the first response**, not the last resort.
- **Braking matches the actual obstacle speed**, not a constant, so a very slow leader causes real braking while a near-speed leader causes almost none.
- **The overtake still completes** — faster and comeback racers go around, not through.
- **Wide bodies are explicitly handled** by sizing the early commitment zone to the leader's honest body width, not the sprite box.
- **Fairness is preserved** because the go-around path is always available when a side is clear, and the brake-to-match holds only until a gap opens.

The risks (zigzag, starvation, cascade) each have specific mitigations built into the design and specific test gates to confirm they did not materialize.

This document is for user review and approval. No code exists yet.
