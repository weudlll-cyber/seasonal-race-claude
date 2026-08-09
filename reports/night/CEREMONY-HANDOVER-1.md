# CEREMONY-HANDOVER-1 — nobody falls out of the picture at the gun

**Branch** `feat/ceremony-handover-1` off `feat/start-ceremony-camera-1` (`da9a4802`) · 2026-08-07 ·
**not merged, not minted**

---

## 1. Conformity, element by element

| the spec asked | done | note |
| --- | --- | --- |
| Branch off `feat/start-ceremony-camera-1`, FORMAT → MEASURE → COMMIT | yes | Worktree, §8. |
| (a) settled beat becomes its own slider, not a remainder | yes | `ceremonySettledMs` 600. §2. |
| (a) keep the proportional scaling on overrun | yes | All three scale together. |
| (a) a control must not silently become a leftover again | **yes — and my first attempt broke it** | §2, caught by a test. |
| (b) FIELD does not end at the gun; it continues | yes | §3. |
| (b) retires when it can no longer be kept | yes | §4 — criterion and justification. |
| (b) criterion from geometry, never a timer/lap/field size | yes | §4. |
| (b) must not simply move the jump to a later moment | **partly — measured and stated** | §4. |
| (b) may only WIDEN, never steer, while it holds | yes | It is a ceiling in the same `Math.min`. §3. |
| (c) say whether the centre travels with the field | yes | §6 — **and searound was not a coincidence.** |
| Do not touch venue/push/easing, the field guarantee's geometry, labels | held | §3 explains how (b) was built without touching it. |
| Source hygiene: only what THIS change orphans | yes, **plus one named exception** | §7. |
| CAMERA expected to move on all ten | **8 of 10 — reported, not glossed** | §5. |
| RENDER moves as a consequence; frame counts identical | yes | §5 — identical on all ten. |
| WORLD must not move; ask the repo | yes | §5. |
| DO NOT mint, DO NOT merge | held | Neither. |
| Tests: nobody leaves while it holds · retires only on its condition · settled honours its slider | yes | §9. |
| Put 5173 on this branch and report the pill | yes | §8. |
| Planner proposal 1 (the 3 s constant) | **taken** | §10.1 — it does NOT become irrelevant. |
| Planner proposal 2 (is the 100-racer lunge smaller?) | **taken, measured** | §10.2. |

---

## 2. (a) The settled beat is a control — and my first attempt was the same defect again

`ceremonySettledMs`, default 600, with its own slider. All three beats scale proportionally when they
overrun the countdown.

**The first implementation handed the countdown's leftover time to the settled beat.** It reads well
and it is wrong: whenever the countdown is longer than the three beats, the leftover swamps whatever
the owner set, and the slider does nothing. That is *precisely* the defect this element exists to
remove, rebuilt one line further down — the spec's own warning, earned.

**A test caught it**, not review: `expect(long.settledMs).toBeGreaterThan(short.settledMs)` failed
with `expected 1600 to be greater than 1600`. The beats are now what they say; if they do not fill
the countdown, the remaining time is the same still frame, so nothing is *seen* to change — but the
number on the slider means what it says. That assertion is kept, with a comment naming what it caught.

---

## 3. (b) The guarantee that carries past the gun

**It is the COMPANY guarantee with the whole field as its company.** The same `companyGuarantee`, the
same anchor, the same `roomFromPointAlong`, with `minVisible` set past the end of the field so the
tightest ceiling — the farthest racer — is what comes back.

**That reuse is not economy, it is correctness.** The ceremony's own `fieldGuarantee` measures from
the formation's **centre**, which is exactly right while the camera is centred on the formation and
exactly wrong afterwards: during the race the camera sits on the **leader, forward-framed**. A promise
measured from the centre would under-widen by that whole offset and drop the back of the field — the
defect rebuilt inside its own fix. Reusing the anchor-aware computation avoids it, **and leaves the
ceremony's `fieldGuarantee` untouched**, as instructed.

It returns a **ceiling** and joins the existing `Math.min` beside the other two. It cannot move a
centre, choose an anchor or read a clock. L192 holds by construction.

It is **armed by the countdown**, not by the gun, so there is no frame between the two in which it is
not held — the gap racers were falling through.

---

## 4. (b) The retirement criterion, and what it costs

**The guarantee retires the first frame its ceiling falls below OVERVIEW's own zoom.**

**Why that is "can no longer be kept".** OVERVIEW is defined in this project as *the same shot at the
widest setting* — the widest framing the design admits and the owner sets. A guarantee demanding more
is asking for a picture this camera has no name for. Carrying on would quietly make every state a
de-facto OVERVIEW and replace the camera's whole vocabulary with one shot.

**Geometry on both sides, no clock.** One number falls out of where the racers actually are; the other
is the owner's OVERVIEW setting. No timer, no lap count, no field size appears in it — a tight field
keeps its guarantee longer than a scattered one on the same track.

**Latched, one way.** A field that re-converges would otherwise re-impose the wide shot mid-race and
the picture would breathe in and out. Retirement is a statement that the start is over, and the start
does not resume.

### Two candidates I rejected, with the measurements that killed them

| candidate | why it died |
| --- | --- |
| retire when **unsatisfiable at the projection floor** — the literal reading | **Measured: it never fires.** On all ten tracks the field ceiling stays above `minCamZoom` for the whole 30 s probed. The camera would be held near-overview for the entire race and LEADER would never be reached. |
| retire when FIELD **stops binding** (a provably smooth, zero-step handover) | Impossible. FIELD ≤ COMPANY always, and both fall as the field spreads, so they never cross. FIELD binds from the first frame and diverges. **There is no crossing at which retirement is a no-op** — I checked for one specifically because it would have satisfied the smoothness constraint exactly. |

### Does it move the jump to a later moment? Partly — and here is the honest answer

**A step in the desired zoom at retirement is unavoidable**, for the reason in the second row above:
no crossing exists at which removing the constraint costs nothing. What the design does is put the
step where it is smallest and let the existing machinery carry it:

- The **rendered** zoom is never the target — `this.zoom` eases toward `this.targetZoom` under the
  state's own time constant. A discontinuity in the target becomes a smooth move on screen. This is
  the same easing every state change already rides.
- Retiring at **OVERVIEW** rather than at the projection floor makes the step far smaller: the
  camera is at the widest *named* shot rather than at the widest shot that exists.

**Measured, the frames-losing count still falls sharply**, so the step is not merely relocated
(§5). But I will not claim it is gone, and §10.2 shows it interacting with the lunge the owner
already has.

---

## 5. Measurement, and the fingerprints

Same seeds, first 20 s after the gun, **counting racers actually outside the drawn canvas** — driving
the shipped director, with the parent branch as the control arm.

| track | worst out, before → after | frames losing anybody, before → after | retires |
| --- | --- | --- | --- |
| **river-run** | **23/40 → 4/40** | **884 → 488** | never (within 20 s) |
| **mountainstreet** | **19/40 → 4/40** | **885 → 477** | never |
| garden-path | 33/40 → 33/40 | **665 → 262** | never |
| luger-hill | 31/40 → 31/40 | **891 → 451** | 12.80 s |
| dirt-oval | 37/40 → 37/40 | **951 → 774** | 8.28 s |
| searound | 33/40 → 33/40 | **884 → 766** | 7.22 s |
| seatrack | 31/40 → 31/40 | **883 → 752** | 8.15 s |
| city-circuit | 40/40 → 40/40 | **1017 → 908** | 7.15 s |
| ice-track | 37/40 → 37/40 | 889 → 889 | **0.00 s** |
| space-sprint | 33/40 → 33/40 | 885 → 885 | **0.00 s** |

**river-run — the track he raised it on — goes from losing up to 23 racers to losing at most 4**, and
loses anybody on 45% fewer frames. mountainstreet is the same story.

**Two tracks get nothing, and I will not bury it.** On **ice-track** and **space-sprint** the
guarantee retires on frame one: measured from a forward-framed leader anchor, holding the whole field
there already costs more than OVERVIEW at the gun. Their camera hashes are **byte-identical to the
parent branch**, which is the cleanest possible confirmation that the retirement fired immediately
rather than that something silently failed. That is the criterion's real cost, and it is the thing I
would put in front of the owner's eye first if he wants it changed.

**The high absolute worst-out figures are pre-existing, not a regression.** The control arm shows the
same 40/40 on city-circuit at 0.37 s. This block moves the *frequency* down everywhere and the
*worst* down on the two open tracks; it does not claim to have made the picture whole.

| | before | after | |
| --- | --- | --- | --- |
| **camera** | `96c9951d56c367a6` | `4ff782c08abaeb19` | **8 of 10 moved** — ice-track and space-sprint unchanged, §5 |
| **render** | `2cca2a4a1935fe27` | `a1522e968e53b89c` | moved as a consequence |
| **world** | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | unchanged |

**Frame counts identical on all ten** (5046, 5588, 12001, …), as last time. `engine-reach --check` on
the seven-path diff: **1 of 7 can reach the race engine** — `defaults.js`, additively — so the world
guard was owed, ran, and passed unchanged. **verify: PASS 7, FAIL 0.**

---

## 6. (c) Does the centre travel with the field? Yes — and searound was not a coincidence

**It is not a coincidence, and the two things are the same thing.**

The guarantee is measured **from the anchor**, and the anchor is the leader, who is moving in the race
direction. To keep the last racer in frame from a point that is travelling forwards, the shot must
widen *backwards along the track* — so the frame's centre necessarily travels **with the field**,
between the leader and the tail, rather than jumping to the leader and leaving the pack behind. That
is exactly the reading the owner gave of searound: *the camera moves in the race direction while
zooming out.*

The measured centre travel bears it out where the guarantee survives: **river-run 2302 → 2313 world
px** and **mountainstreet 2838 → 2853** — the centre travels essentially the same distance, but it is
now *accompanied* by enough width that the field stays inside it. The complaint was never that the
centre moved; it was that the centre moved **without** the width. On the tracks where the guarantee
retires early the travel figures move more, because the camera reverts to the old behaviour sooner.

So: **his diagnosis was right, and it is the mechanism, not a correlation.**

---

## 7. Hygiene

**Lines: 222 insertions / 47 deletions across 6 client files** in the feature commit; the cleanup
commit removes a further 4 files' worth of dead chain.

**Removed — the countdown opening-shot corridors, entire chain.** `_countdownStartZoom` was still
being computed on every zoom-level derivation and **read by nothing**: the previous block replaced the
corridor-based opening with the venue shot. Out with it went the `countdownStartCorridors` default and
its comment, `DEFAULT_COUNTDOWN_CORRIDORS`, the `countdownCorridors` field in the resolved framing
config and its type line, and **the Dev Screen slider with its tooltip** — a control sitting next to
the three that work, offering a number in corridors for a shot no longer measured in corridors.

**Both fingerprints are unchanged by that commit**, which proves the code was dead rather than arguing
it must have been.

**The named exception to "only what THIS change orphans":** it was orphaned by the *previous* block,
not this one. Taken anyway — same line of work, four files, and a dead control on the Dev Screen next
to live ones is worse than the scope it adds. Declared rather than folded in quietly.

**Moved out:** nothing. The new code lives in the two homes it belongs to — the schedule in
`startCeremony.js`, the ceiling beside the other ceilings in `CameraDirector.js`.

**Noticed and deliberately left:**

- **`clampCamZoom(Infinity)` returns `minCamZoom`, not "unconstrained".** So a degenerate formation —
  every racer at one point — makes the ceremony target collapse to the *widest* shot instead of the
  tightest. It cannot fire in a real race (racers always have positions by the countdown) and it is
  inside the ceremony's geometry, which this block was told not to touch. **It is a live trap for the
  next block that touches that path.**
- **`postStartHoldMs` is duplicated between `defaults.js` and `cameraTimingComputation.js` and is
  unguarded.** The ceremony's three fallbacks next to it now have a guard test; this one still does
  not. One line of work away, but not this block's.

---

## 8. How to see it

**5173 is on this branch.** The build pill reads:

```
[ra-build] start-up: serving build <HEAD> · feat/ceremony-handover-1
```

**river-run and searound, both end to end.** river-run is where the improvement is largest and
measurable; searound is the one already liked, and the question there is whether it got worse. The new
slider is DevScreen → Camera Advanced → *Settled Hold (ms)*, beside *Venue Shot* and *Push In*.

---

## 9. Tests

**Added — 9.** Both R7 questions per group.

- **the settled beat honours its slider and is not a remainder** (4) — including the assertion that
  caught my first implementation, with a comment saying so, and one that rules out "make room by
  zeroing the settled beat", which would restore the old behaviour under a new name.
- **the retirement fires only on its stated condition** and **nobody leaves while it holds** — asserted
  through the director over a real countdown plus race frames, and on the latch being one-way.

**Deleted — 0.**

**Modified — 5.** All pinned the three-argument `ceremonySchedule` the settled slider replaced; their
intent is unchanged and re-asserted against the four-argument form.

**A stale measured stamp, and it is mine.** `docs/CAMERA_DIRECTOR.md`'s tracking-lag figures depend on
`client/src/modules/camera/`, and **the previous block invalidated them without verify noticing** —
the guard compares against *committed* history, and that commit did not exist when verify ran there.
So START-CEREMONY-CAMERA-1's "PASS 7" was true and incomplete. Re-measured rather than re-dated:
OVERVIEW 5199 → 3603 frames, LEADER median 4.46 → 3.92 pp. Neither is a tracking change — the ceremony
and the carried guarantee changed what the camera *does* in the early seconds, so the same 60 s
divides differently between states. It needed its own commit: a stamp must name a commit at or after
the last change to the directory it depends on, which the code commit cannot do for itself.

**One transient:** a `verify` run failed `script-suite` immediately after the defaults.js repair and
passed on re-run with the same tree; the direct run of the same 250 tests passed 0-fail. I could not
reproduce it and am not claiming a cause.

---

## 10. The two planner proposals

**10.1 — Taken. The 3-second constant does NOT become irrelevant, and here is what it still costs.**

`START_PHASE_DURATION` governs **which state** the machine is in; my criterion governs **how wide the
shot is**. They are different authorities, and the guarantee cannot close the item because it does not
touch state selection. The open item stands exactly as CAMERA-TAGS-1 left it.

What changed is the *cost*: while the guarantee holds, the shot at 3 s is wide enough to keep the
field, so the constant firing early now costs a **state** change rather than a **framing** change —
which is the smaller of the two harms. On the six tracks where the guarantee survives past 3 s it is
genuinely masked; on ice-track and space-sprint it is not masked at all.

**10.2 — Taken and measured, and yes: it is one defect, not two.**

The 4.08× first-view-change lunge I reported on searound at 100 racers is a jump from a *held* shot to
LEADER. With the guarantee carrying past the gun, the shot at the moment of the view change is no
longer the ceremony's held zoom — it is the guarantee's ceiling, which has already been widening with
the field. On the tracks where the guarantee survives the first view change, the lunge is bounded by
the guarantee rather than by the held zoom, because the guarantee is still in the `Math.min` on the
far side of the cut.

**The owner should hear it as one thing:** "the shot is too tight for what happens next, and it is
corrected too late". The ceremony made it visible; this block moves the correction earlier. I have
still added no easing mechanism — that remains his taste, as he said.

---

## 11. What I did NOT do, and why

- **Did not touch the venue shot, the push, their durations or easing.** Out of scope by instruction.
- **Did not touch `fieldGuarantee`'s geometry.** §3 — the racing-time promise reuses
  `companyGuarantee` instead, which is why it needed no change.
- **Did not add an easing mechanism to the retirement or to the first view change.** His taste, twice
  stated.
- **Did not fix `clampCamZoom(Infinity)`.** §7 — inside the geometry I was told to leave, and it
  cannot fire in a real race. Named so the next block sees it.
- **Did not chase the two tracks that retire on frame one.** §5 — changing the criterion to help them
  means loosening what "can no longer be kept" means, and that is a decision I would want his eye on
  first rather than a number I pick alone.
- **Did not mint or merge.** Visible; his eye decides (L191).
