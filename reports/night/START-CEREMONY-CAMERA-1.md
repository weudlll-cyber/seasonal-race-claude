# START-CEREMONY-CAMERA-1 — the venue, then the field

**Branch** `feat/start-ceremony-camera-1` off `feat/label-offset-1` (`d637ef9f`) · 2026-08-07 ·
**not merged, not minted**

---

## 1. Conformity, element by element

| the spec asked                                                     | done | note                                                     |
| -------------------------------------------------------------------- | ---- | ---------------------------------------------------------- |
| Branch off `feat/label-offset-1`, FORMAT → MEASURE → COMMIT            | yes  | Worktree, §7.                                             |
| (a) venue shot: the whole track in frame, held still                   | yes  | §2 — with one honest limit on open tracks.                |
| (a) duration is a slider                                               | yes  | `ceremonyVenueMs` 1400.                                   |
| (b) push in: ease from venue to formation                              | yes  | §2.                                                       |
| (b) duration AND easing are sliders                                    | yes  | `ceremonyPushMs` 2000, `ceremonyEasing` + 4 curves.       |
| (b) reads as deliberate, not as a jump                                 | yes  | §3 — the default curve changed for exactly this reason.   |
| (c) target = largest zoom with every racer in frame                    | yes  | `fieldGuarantee`; §4 proves it on 50 real cases.          |
| (c) derived from the formation's extent, never a name/size/constant    | yes  | §2, and a test that two field sizes in one extent agree.  |
| (c) report the zoom per track and field size                           | yes  | §4, the full 10 × 5 table.                                |
| (d) hold that framing as DESIRED zoom until the first view change      | yes  | §5.                                                       |
| (d) do NOT freeze it — guarantees must still widen it                  | yes  | §5 — it holds by construction, not by care.               |
| (e) fold COUNTDOWN into FRAMING_BY_STATE if it holds up                | **partly, and I say what changed my mind** | §6.       |
| Do not touch the runners' board, or the labels                         | held | Neither was opened.                                       |
| CAMERA expected to move on all ten; report old and new                 | yes  | §8 — all ten moved.                                       |
| RENDER likely moves too; report it                                     | yes  | §8 — it did, as predicted.                                |
| WORLD must not move; ask the repo and run what it says                 | yes  | §8 — engine-reach said it was owed, so it was run.        |
| DO NOT mint, DO NOT merge                                              | held | Neither.                                                  |
| Tests: target keeps everyone in frame · venue shows the whole track · hold widens but never narrows | yes | §9, 30 added. |
| Report tests added and deleted                                         | yes  | §9 — 30 added, 0 deleted, 2 modified.                     |
| Leave the branch pushed, one line on how to see it, do not touch 5173  | yes  | §7.                                                       |
| Planner proposal 1 (what the first view change looks like)             | **taken, measured** | §10.1 — and I do NOT propose a mechanism.  |
| Planner proposal 2 (the countdown overlay's extra second)              | **taken, not built** | §10.2 — next block, with the shape.       |

---

## 2. What was built

**The venue shot** is the cam.zoom that fits the world box, clamped by the projection. On a closed
track that lands exactly on `minCamZoom` 1.0 and the whole track is genuinely in frame — `axisX` is
`canvasW / worldW` by construction, so the two agree by definition rather than by luck.

**The target** is `fieldGuarantee(racers, centre, …)`, new in `framingRule.js`. It is written as a
guarantee rather than as a bespoke "fit the formation" helper because it is the same promise in the
same words: it returns a CEILING, so it widens and never steers, and the hold combines it with the
other guarantees through the ordinary `Math.min`.

It calls the one guarantee computation **twice, on axis-aligned vectors**, rather than once on the
bounding box's diagonal. The camera is centred here, so the question is whether a rectangle fits
inside a rectangle — answered per axis. A single diagonal call would fit the diagonal *along its own
direction*, a weaker condition that a wide flat grid passes while still being cropped left and right.

**The rhythm is the only part that is settings.** Two durations and a curve, all inside
`countdownDurationMs`.

---

## 3. Decisions made alone

**The two beats are scaled proportionally, not truncated, when they exceed the countdown.**
Truncation cuts the push off mid-move, so the camera would still be travelling at the gun and the
framing the hold keeps would never have been reached — it would silently break element (d). Scaling
preserves the ratio the owner set, which is what he was actually expressing.

**The leftover time is a SETTLED beat and that is deliberate.** 600 ms of the formation held
motionless before the start. Without it the push arrives exactly as the race begins, which reads as
an interruption rather than as an arrival.

**The easing default changed from ease-OUT to ease-IN-OUT.** Ease-out begins at full speed and
decelerates — that reads as the camera *catching up to something*, which is the opposite of
ceremony. The new default begins and ends at rest. `easeOutCubic` is on the list so the old feel can
be put back beside the new one and compared rather than argued about.

**The push is forced monotone.** `Math.max(venueZoom, formationZoom)`: where a formation cannot be
framed tighter than the venue shot is wide, the "push in" would otherwise be a push *out* and the
ceremony would play backwards — the camera appearing to retreat from the grid as the race approached.

**Zoom is interpolated linearly in cam.zoom with the curve doing the shaping.** A geometric (log)
interpolation is arguably more uniform because zoom is multiplicative — but that is a change to the
FEEL, and the feel is what is about to be judged by eye. Two changes at once would leave the owner
unable to say which he was reacting to. Named in §11 as a proposal instead.

**The ceremony's fallbacks are duplicated in `cameraTimingComputation.js` — and GUARDED.** That
module deliberately keeps its own no-config fallbacks and imports nothing; I followed its convention
rather than inventing a third pattern, and added a test asserting the two agree, the same answer
`autoSpriteScale.js` gives for `CANVAS_H_REF`. That is one better than `postStartHoldMs` sitting
beside it, which is duplicated and unguarded.

---

## 4. The target zoom, per track and field size

Real start formations, all ten shipped tracks, five field sizes. **All 50 cases keep every racer in
frame; none is clamped.**

| track | type | N=4 | N=12 | N=20 | N=40 | N=100 | venue |
| --- | --- | --- | --- | --- | --- | --- | --- |
| city-circuit | closed | 7.656 | 7.656 | 7.648 | 7.619 | 6.892 | 1.000 |
| dirt-oval | closed | 8.475 | 8.470 | 8.458 | 8.401 | 4.660 | 1.000 |
| garden-path | closed | 7.628 | 7.628 | 7.498 | 7.436 | 6.978 | 1.000 |
| ice-track | closed | 7.148 | 6.921 | 7.058 | 6.526 | 3.479 | 1.000 |
| searound | closed | **13.784** | 10.288 | 6.170 | 4.472 | **2.233** | 1.000 |
| luger-hill | open | 1.634 | 1.253 | 1.084 | 0.906 | 0.632 | 0.313 |
| mountainstreet | open | 1.201 | 1.203 | 1.206 | 1.166 | 1.077 | 0.208 |
| river-run | open | 1.204 | 1.200 | 1.198 | 1.165 | 1.071 | 0.208 |
| seatrack | open | 1.273 | 1.273 | 1.134 | 1.080 | 0.846 | 0.208 |
| space-sprint | open | 1.409 | 1.420 | 1.177 | 1.100 | 0.893 | 0.213 |

**The target tracks the formation, which is the claim (c) makes.** Searound runs 13.784 at four
racers down to 2.233 at a hundred — a shot six times wider for a field that occupies six times the
ground. Where a track's formation barely changes with field size (mountainstreet: 54 px wide at N=4,
230 px at N=100) the target barely changes either, which is the same rule producing a different
answer rather than an exception.

**The push is a real move everywhere**: 3.5× to 13.8× on closed tracks, 2.0× to 6.7× on open ones.

### The open-track limit, named rather than hidden

The open projection maps at a uniform `OPEN_TRACK_BASE_ZOOM` with `minCamZoom = worldFitX`, so **the
widest shot it allows is 1/1.5 of the world width — about 67%.** The venue shot on an open track is
therefore "as wide as this camera can go", not "the whole world". Going wider means changing the
open-track projection, which would move every other shot with it and is not this block's business.

No real formation hits it — all 50 cases are unclamped — but a synthetic one does, and there is a
test pinning that behaviour so a later block widening the projection has to come here and say so.

---

## 5. The hold, and why it cannot be narrowed

The arrived framing is handed to the **first OVERVIEW of the race** through `_stateCamZoom`. From
there `_setTargets` computes:

```js
guaranteed = Math.min(stateZoom, guaranteeCeiling, companyCeiling)
```

The hold enters as `stateZoom`. A guarantee can therefore only **lower** the number, and a lower
cam.zoom is a **wider** shot. It is arithmetically impossible for a guarantee to tighten the hold.
That is (d) exactly — *do not freeze it, let the existing guarantees widen it as the field spreads* —
and Lesson 192 holds by construction rather than by care.

**Handed over exactly once.** `_ceremonyHoldZoom` is cleared on use, so every later OVERVIEW takes
its ordinary setting. Without that the ceremony's framing would silently become every wide shot for
the rest of the race — a far larger change than the one asked for, and one that would look
deliberate.

---

## 6. Did COUNTDOWN go into FRAMING_BY_STATE? Partly — and here is what changed my mind

**No row was added to the table, and the reason is concrete.** The table is consumed by exactly one
call, `framingFor(this.state)` inside `_setTargets`, which runs only for CAM_STATEs the state machine
reaches **during RACING**. COUNTDOWN is a race PHASE with its own entry point (`updateCountdown`) that
never touches `_setTargets`. **A COUNTDOWN row would have been a setting nothing reads** — precisely
the dead-config this project's principles exist to prevent.

Routing `updateCountdown` through `_setTargets` to make the row live was the alternative, and I
rejected it after reading it: that path computes a leader, a heading, a forward bias, a lateral
guarantee and a transition grammar, all of which are meaningless before the gun when every racer is
at `t = 0`. It is a large rewrite of a working path for a table entry.

**But the value the fold promised arrived anyway, through the GUARANTEE rather than the table:**

- *One vocabulary* — `GUARANTEE.FIELD` is now in the same enum, computed by the same
  `zoomCeilingToFit`, documented beside CORRIDOR, PAIR and COMPANY, with a note in the enum saying
  why it is in no row.
- *(d) for free* — because the target is a guarantee-shaped ceiling, the hold is a one-line hand-over
  into an existing `Math.min` instead of a new mechanism. That is the whole of §5.

So the honest summary: **the guarantee was the part worth folding in; the table row was not.** The
existing test asserting every table row guarantees CORRIDOR or PAIR still passes untouched, which is
the cheapest evidence that nothing about the table changed.

---

## 7. How to see it

```
git checkout feat/start-ceremony-camera-1     # then reload localhost:5173
```

Built in a worktree at `C:/ra-wt-cer`; **5173 was not touched** and is still on
`feat/label-offset-1`.

**river-run and one closed track — searound or dirt-oval — end to end**, from the opening shot
through a few seconds of racing. The sliders are DevScreen → Camera Advanced → *Venue Shot*, *Push
In*, *Push Easing*. Searound is the interesting closed track: its target swings furthest with field
size, so it is where the derivation is most visible.

---

## 8. Fingerprints

| | before | after | |
| --- | --- | --- | --- |
| **camera** | `00cafa2432add0f7` | `96c9951d56c367a6` | MOVED, all ten — not minted |
| **render** | `a9653fbbe5eaebbe` | `2cca2a4a1935fe27` | MOVED, expected |
| **world** | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unchanged |

| track | camera before | camera after |
| --- | --- | --- |
| city-circuit | `3700ed95dabba95b` | `b604a2a05eea812e` |
| dirt-oval | `a2743b82bb4387f1` | `786018328f44f824` |
| garden-path | `9072552a8034bfd2` | `739a1a7e30ef384e` |
| ice-track | `04403ce80b92e269` | `ee1fb3d4d984ea0d` |
| luger-hill | `397dec5b55f083d1` | `66439c0029805661` |
| mountainstreet | `a3212a75d364a25c` | `d2fb348644299ea4` |
| river-run | `6d721c5e785b94fd` | `0917fa04814d22d7` |
| searound | `18f16bbf19aa6322` | `f3a3c8b5f9e133b4` |
| seatrack | `2bb7eff46ed69b38` | `b7314e376de5da7f` |
| space-sprint | `36d48183e5bbefcd` | `13c6637532f1e011` |

**Frame counts are identical on every track** (5046, 5588, 12001, …). The races are the same races;
only the shot changed — which is what a camera-only change should look like.

**What the repo said was owed.** `engine-reach --check` on the eight-path diff: **1 of 8 can reach
the race engine** — `defaults.js`, and only additively (three new keys nothing in the engine reads).
The world guard was therefore owed, ran, and passed unchanged. `verify`: **PASS 7, FAIL 0, SKIP 0.**

---

## 9. Tests

**Added — 30.** Both R7 questions at each group.

*The three the spec named:*

- **the target always keeps every racer in frame** — five track/field shapes, plus the half with
  teeth: *a hair tighter and somebody is cropped*, because "everyone in frame" is trivially
  satisfiable by zooming all the way out. Plus monotonicity across five formation widths, so it
  cannot be right at the two sizes checked and wrong in between.
- **the venue shot shows the whole track** — four closed worlds including one taller than it is wide
  (so the binding axis is the other one), asserted as *visible world ≥ world* on both axes at once.
  And the open-track limit pinned honestly as its own case.
- **the hold can be widened by a guarantee but never narrowed** — asserted on the combining rule,
  which is where the property is actually guaranteed, plus the hand-over itself and the
  hand-over-once rule.

*Also:* every easing curve arrives at exactly 1 (a curve stopping at 0.98 would leave the formation
permanently slightly too small, and the hold would then keep *that*) · the ceremony has arrived by
the gun for every schedule including the degenerate ones · the push never moves backwards, checked
across all four curves at 25 ms resolution · the no-config fallbacks agree with `defaults.js`.

**Deleted: 0.**

**Modified — 2, both named in place.** They pinned the countdown's old ENDS — `_countdownStartZoom`
and `_overviewStateZoom` — which the owner replaced with geometry, so the two numbers they asserted
are no longer what the ceremony aims at. Their INTENT is what was kept and re-asserted: it opens on
the whole track, and it arrives exactly, with no jump into the first RACING frame.

---

## 10. The two planner proposals

**10.1 — Taken and measured. The first view change is now a real jump on big fields, and I am NOT
proposing a mechanism.**

The first view change is the end of the 3 s start phase: the held framing gives way to LEADER_ZOOM.
The ratio, measured:

| | N=4 | N=40 | N=100 |
| --- | --- | --- | --- |
| city-circuit | 1.19× | 1.19× | 1.32× |
| dirt-oval | 1.07× | 1.08× | 1.95× |
| ice-track | 1.27× | 1.39× | **2.61×** |
| searound | **0.66×** | 2.04× | **4.08×** |
| river-run | 1.77× | 1.83× | 1.99× |
| luger-hill | 1.31× | 2.36× | **3.38×** |

**At normal field sizes it is mild** — 1.07× to 2.36× at 40 racers, and the shipped grammar is
`glide` at 500 ms, so it is an eased move rather than a cut. I do not expect that to read as jarring.

**At 100 racers it is not mild**: up to 4.08× on Searound, 3.38× on luger-hill, 2.61× on ice-track.
A 4× zoom change in 500 ms is a lunge. That is a direct consequence of this block being right — the
held shot is now genuinely wide because a hundred racers need it to be, so there is further to travel.

**Searound at N=4 goes the other way** (0.66×): the held framing is *tighter* than LEADER, so the
first change is a pull back. Also new, also a consequence of the target being derived rather than
fixed.

**It is your taste to decide, so I have added nothing.** For the record the levers already exist and
need no new mechanism: `glideDurationMs` (500 today) and the LEADER corridor setting. If you want me
to look at it, the block would be "the first view change after the ceremony", and I would want your
eye on 100 racers on Searound first, because that is the worst case and it may still be fine.

**10.2 — Taken as an answer, not as a build: the countdown overlay's extra second belongs in the
NEXT block, and here is the shape.**

It is real — `drawCountdownOverlay` counts from a hard-coded 3 while the phase lasts 4000 ms, so
"GO!" stands an extra second — and it does sit in the middle of the ceremony. But it is **the runners'
board's block, not this one**: both are overlay work on the same phase, both are visible, and doing
them together means one eye test instead of two on the same seconds of screen time. Doing it here
would also mean a second visible change inside a block whose whole question is *how does the opening
feel*, and you would not be able to separate them.

**The shape I would propose:** the overlay should not own a count at all. It should be handed the
same `countdownDurationMs` the phase advance already compares against and derive its digits from it —
`ceil(remaining / 1000)` — so a 4000 ms countdown shows 4-3-2-1 and a 3000 ms one shows 3-2-1, with
"GO!" appearing when the remainder reaches zero rather than one second early. That makes the number
of digits a consequence of the one setting instead of a second, silent one, and it is the same
one-canonical-home fix as everything else this week. **Not built here.**

---

## 11. What I did NOT do, and why

- **Did not add a COUNTDOWN row to `FRAMING_BY_STATE`.** §6 — it would be a setting nothing reads.
- **Did not route `updateCountdown` through `_setTargets`.** §6 — a large rewrite of a working path
  for a table entry, on inputs that are meaningless before the gun.
- **Did not add an easing mechanism to the first view change.** §10.1 — explicitly your taste, and
  the spec said not to on my own authority.
- **Did not fix the countdown overlay's extra second.** §10.2 — named, shaped, and left for the
  block that owns the same seconds of screen.
- **Did not switch zoom interpolation to geometric.** §3 — it changes the feel, and one feel change
  at a time is the only way an eye test answers anything. **This is my own proposal for later:** if
  the push reads as slightly "slow then rushed" at the wide end, that is the linear-in-zoom artefact
  and geometric interpolation is the fix, not a different curve.
- **Did not touch the runners' board or the labels.** Out of scope by instruction.
- **Did not widen the open-track projection.** §4 — it would move every other shot with it.
- **Did not mint or merge.** Visible; your eye decides (L191).
- **Did not touch 5173.** §7.
