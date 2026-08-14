# FRONT-GROUP-2 — the front group stays whole

**Branch:** `feat/front-group`, continuing from `b958200d`. **Not merged. Nothing minted.**
Follows [FRONT-GROUP-1](FRONT-GROUP-1.md), whose numbers this report corrects.

The owner's ruling, and he defined the group himself: a racer running BEHIND another in his line is
not part of it — he is shown anyway, because he is behind the other one. If only two are leading,
seeing those two is enough. If six share the whole width of the track, all six must be seen. The
shot cannot close in then — but a real camera at a horse race could not either, and still showed
them all.

---

## 0. The counting error, first, because it invalidates FRONT-GROUP-1's headline

That report said 6.9% of photo-finish frames lost a front-group racer. It asked only whether a
racer's **centre** was inside the frame. The owner was looking at a racer **cut in half**, which
passes a centre test and reads as lost to the eye. Re-measured with the renderer's own
`drawnRacerScreenPx`, the same race had **74 frames with a member not whole against 14 fully
outside** — the centre test undercounted what he sees by five, and every "losing a racer" number in
FRONT-GROUP-1 was that undercount. All figures below are whole / cut / fully-outside.

## 1. Frame bodies, not centres

`companyGuarantee` promised centres inside `COMPANY_FRAME_PCT` and nothing about the sprite drawn
around them. `pairGuarantee` has always taken `_drawnBodyWidthRefPx` as padding, two lines away at
the same call site; now this one does too — half a body, because the centre is what it measures to
and there is one end rather than a pair's two.

**Why the miss was invisible:** the 5% margin was sized as "half a drawn body at the largest a body
gets in these shots", measured where this guarantee actually ran (6.65% of frame height at the
median, 9.50% at p95). At the photo-finish zoom the body is **16.4–22.2%** of the frame, so half a
body is 1.6–2.2× the margin allowed. The constant was never wrong; it was measured somewhere else.

**A residue is named rather than hidden:** `_drawnBodyWidthRefPx` is the body's NARROW reference —
**20.04 world px against a drawn sprite of 52** on ice-track, i.e. it covers **38.5%** of what is
actually drawn. The spec named that field and it is the right one to use; it closes only that share
of the gap, and the rest of the remaining CUT frames are this. Completing it needs the DRAWN extent,
which the director is not given today. That is the next decision, not a tuning knob.

## 2. The bound holds until the GROUP is home

Every fully-outside frame measured came AFTER the first crossing, where the bound used to retire —
and the frame he photographed was one of them. A promise that ends when the winner arrives is not a
promise about the racers fighting for the win; it ends where the fight is decided.

The condition is now the group's own membership: `_frontGroupNow` drops a member the frame he
finishes, so the set **drains to empty** as the fight resolves and the bound retires when the LAST
of them is across. It also retires once the finish sequence takes the anchor away from the racers —
**measured, not reasoned**: a guarantee widens and may never steer (L192), so once the drama pulse or
FINISH_OVERVIEW puts the shot on a fixed point behind the line, holding two still-coming members
against an anchor they are not near widened nothing and TIGHTENED as they converged on it — **60
frames with no racer on screen** on luger-hill seed 9. The crossing itself is not that moment: the
photo finish holds its own shot across the line, so his frame is inside the bound.

## 3. Who is in the group — level, in body lengths, no cap

`frontGroupLevelBodies`: a racer is in the group while he is within N of his **own lengths** of the
leader along the track. The unit is `_drawnBodyWidthRefPx` converted through the shape's total
length — no constant enters. **There is no cap.**

What it replaced was not a like-for-like swap: `battlePulkThresholdT` is 5% of a **lap**, which late
in a race admits everybody — on **eleven of 27 races all twenty racers fell inside it** — so
`battleMaxGroupSize` was doing all of the selecting and "the front group" meant "the leading six at
one instant".

**The tucked-in exclusion is by construction** and is asserted by a test: membership is a gap ALONG
the track, so a racer a length back is out however close he is across it. On his race the group is
Turbo, Surge, Blaze, Comet, Nova — and **Ridge and Bolt are excluded**, both of them a clear length
adrift at the moment they are judged.

### Choosing N — and N=1 was wrong, which I had to be shown

Graded on a **fixed yardstick** — the live top six, the same six he reads off the standings, so arms
with different group sizes cannot flatter themselves:

| N | ice-track seed 9: cut / outside / not whole | crossing | pooled ten tracks: not whole | pooled crossing |
| --- | --- | --- | --- | --- |
| OFF | 7.3% / **16.1%** / 23.4% | 100% | 41.3% | 92% |
| 1   | 7.3% / **16.1%** / 23.4% | 100% | 33.9% | 83% |
| **2 (shipped)** | 10.6% / **0.0%** / 10.6% | **78%** | 27.1% | 70% |
| 3   | 10.6% / **0.0%** / 10.6% | 78% | 22.6% | 64% |

**At one body length the mechanism is byte-for-byte identical to OFF on his race** — it is too tight
to include the racers he named. N=2 is the first length that reaches them, and it is what ships. N=3
holds more still and costs more width; the curve is monotone with no knee, so this is a taste
boundary and the key is on the Dev Screen for him to move.

## 4. Membership admits as they come level

Never evict, never re-sort, only add. An admission cannot swap, so it cannot produce the
FINISH-PAIR-1 discontinuity; the set only grows and the ceiling only falls, which is the direction a
guarantee may move anyway.

**It is also what makes "level" mean anything:** captured once at the endgame threshold the group is
a median of **one** racer, because the field is not level there — it becomes level at the line.

**Admissions close at the first crossing, and that bound was measured:** without it this admits the
**whole field, 20 of 20 on every one of 27 races**, because "the leader" among unfinished racers
walks backwards as the front goes home and the set accumulates everybody behind them.

| membership rule | changes over 27 races |
| --- | --- |
| frozen capture | 0 |
| **admit-only (shipped)** | **120** |
| live re-sort | 186 |

**Growth per race, N=2:** min 1, median 4, max 17. The 17 is river-run seed 5601 — a race where
seventeen racers really are within two lengths of the leader by the line, and the shot is what that
costs (39% of the ordinary crossing shot). It is reported rather than truncated, which is his ruling.

## 5. The price, as a number

**Pooled, the crossing shot is 70% of the ordinary one** (against 92% with the feature off). Per
race it ranges from 100% (city-circuit 9, searound 5601, seatrack 2814 — the shot is untouched) to
**37%** (city-circuit 5601) and 39% (river-run 5601). On his own race: **78%**.

Group's own promise, pooled over 7441 photo-finish frames: cut 9.7%, fully outside 1.2%, not whole
10.4%. Before the line: cut 2.9%, fully outside 0.8%.

## 6. What holds

- **`check-runin-frame` PASS on both halves and both arms, 0 empty frames**, limit untouched.
- **Two keys, not one**, and they are separable on purpose: `frontGroupFraming` is the switch (default
  on, off restores the old behaviour exactly) and `frontGroupLevelBodies` is the one number he owns.
  Both are on the Dev Screen. Both positions of the switch are tested.
- Tests: the churn property is restated for admit-only (nothing evicted, nothing reordered) rather
  than "membership never moves", which admit-only gives up on purpose; plus the tucked-in exclusion
  and the admissions-close rule.

## 7. Fingerprints — measured fresh, NOT minted

| role   | master             | this branch        |
| ------ | ------------------ | ------------------ |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved**, re-run in full |
| camera | `c1556053b1824758` | `6d79c0344f269c84` |
| render | `c962df5334277f95` | `b9dae4ebb7cd5c43` |

**With `frontGroupFraming: false` both return to `c1556053b1824758` and `c962df5334277f95`
exactly** — the master values.

## 8. What to watch on ice-track seed 9

Through the photo finish no racer of the leading group should leave the frame or be cut at its edge
any more — and the frame at the line is about a fifth wider than the photo-finish shot you know.
