# FRONT-GROUP-3 — never tighter than the track is wide

**Branch:** `feat/front-group`, continuing from `ec2a92cc`. **Not merged. Nothing minted.**
Replaces most of [FRONT-GROUP-2](FRONT-GROUP-2.md), whose machinery this block deletes.

The owner's own solution: we never need to zoom closer than the track is wide. Racers can only
spread across the corridor, so a frame that holds its full width shows everyone who is level — no
group to define, no membership to track.

---

## 1. Scope — and I agree with his reading

He scoped it to the endgame, from the run-in through the photo finish, because tight battle shots
mid-race are wanted. That is right and it is what shipped. The floor is inert until the endgame
window opens, and the measurement in §3 shows it never binds on a leader, overview or comeback shot
even inside the window.

It is **not** retired at the crossing. A width floor cannot chase anybody, so the failure that forced
FRONT-GROUP-2's bound to retire — holding still-coming racers against an anchor they are not near —
has no analogue. It stops binding when the authored zoom-out goes wider than a track width.

## 2. The floor is `corridorGuarantee`, unchanged

That function already exists and already does exactly this. **The whole implementation is one
ceiling term.**

**The diagonal was already handled**, and here is how: `corridorGuarantee` takes the perpendicular of
the heading and projects it through each axis scale **separately** (`perp.x·axisX`, `perp.y·axisY`),
then compares it against the frame's true chord along that screen direction, per side of the anchor.
So a corridor lying at 40° asks for more zoom-out than one lying flat, and it never asks for both
axes at once the way an axis-blind bound would.

**Body overhang is paid by widening the corridor, not by a new parameter:** the guarantee is asked to
fit `trackWidth + one body`, which is half a body past each edge. **What that does not cover:**
`_drawnBodyWidthRefPx` is the NARROW body reference — 20.04 world px against a drawn sprite of 52 on
ice-track — so it carries **38.5%** of the sprite. A racer riding the very edge of the corridor can
still be clipped by the remainder; what he can no longer be is half out of frame.

`innerFramePct` is **1** here deliberately. The promise is "the track's width fits"; the safe-region
inset belongs to the subject, not to the road, and applying it would widen every endgame shot by a
further 15% for a margin nobody asked for.

## 3. It replaces the machinery — measured, then deleted

Four arms, graded on a **fixed yardstick** — the live top six, so arms cannot be flattered by their
own group definition. Share of photo-finish frames with a top-six racer **not whole**:

| arm | ice-track seed 9 | fully outside | pooled ten tracks | crossing vs ordinary |
| --- | --- | --- | --- | --- |
| OFF | 23.4% | 16.1% | 41.3% | 92% |
| the FRONT-GROUP-2 machinery | 10.6% | 0.0% | 27.1% | 70% |
| **the floor ALONE (ships)** | **0.0%** | **0.0%** | **18.3%** | 54% |
| both together | 0.0% | 0.0% | 14.5% | 50% |

**The floor alone beats the machinery on his race and pooled**, so per the spec the machinery came
out whole. Both together is 3.8pp better pooled, and that is reported rather than used: it costs the
entire apparatus and four more points of crossing width, and the floor is already perfect on the race
he complained about. Nothing was kept out of caution.

**What came out: 791 lines against 68 added.** `_frontGroupNow`, `_levelWithLeader`,
`_frontGroupCeiling`, the captured-index state, the running floor and its clamp, the admit-only rule,
the glide release, the `frontGroup` ceiling term; `scripts/front-group-truth.mjs` entirely; the
group's five tests. **Two keys disappear** — `frontGroupFraming` and `frontGroupLevelBodies` —
replaced by one, `endgameCorridorFloor`. `companyGuarantee`'s body-padding parameter came out too:
its only caller was the deleted ceiling, and handing it to the MID-RACE company guarantee would
change framing outside this block's scope. It is one argument away if he ever wants it.

## 4. The price, both directions

**Crossing shot against the ordinary one:** min **37%**, median **52%**, max **94%**, mean **54%**.
Against FRONT-GROUP-2's branch (70% pooled, 37% worst, 78% on his race): the shot is wider on
average and **the worst case is NOT less extreme — it is the same 37%.** He asked whether the floor
would bound it; on this measurement it does not.

**The honest gain is elsewhere, and it is real: the price is now PREDICTABLE PER TRACK.** searound
reads 93 / 94 / 93% across three seeds, space-sprint 65 / 65 / 65, river-run 38 / 38. Under the group
bound the same track swung 71 / 47 / 39, because the width followed how spread that race's group
happened to be. A track width is a fixed quantity; a group's spread was not. What was a per-race
lottery is now a per-track constant he can look at once.

**It never holds the picture open where the camera would rightly have closed in.** The corridor is
the binding term on **45.5%** of photo-finish frames, **25.3%** of endgame frames, and **0.0%** of
LEADER_ZOOM, OVERVIEW and COMEBACK_ZOOM frames — those states are already bounded wider than a track
width by their own settings, so the simplification costs nothing there.

## 5. What holds

- **`check-runin-frame` PASS on both halves and both arms, 0 empty frames**, limit untouched.
- **The photo-finish slow motion is untouched** — this adds no state and reads no clock.
- **One key**, `endgameCorridorFloor`, default on, on the Dev Screen. Off restores the old behaviour
  **exactly**: both fingerprints return to the master values. Both positions are tested.

## 6. Fingerprints — measured fresh, NOT minted

| role   | master             | this branch        |
| ------ | ------------------ | ------------------ |
| world  | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` — **unmoved**, re-run in full |
| camera | `c1556053b1824758` | `15bcceae3c802cc9` |
| render | `c962df5334277f95` | `a9de15ebaafcf108` |

With `endgameCorridorFloor: false` both return to `c1556053b1824758` and `c962df5334277f95`
exactly — which is also the proof that the deleted machinery is entirely gone.

## 7. What to watch on ice-track seed 9

Through the whole ending the frame should never be narrower than the track itself, so every racer
across the corridor stays whole — and the shot at the line is about half the ordinary photo-finish
zoom.
