# LABEL-STAGGER-1 — one rule for every track, and the half of it that does not work

**Branch** `feat/label-stagger-1` · **base** `master` at `b05b3b6e` · 2026-08-07
**Status** trigger built and shipped-ready; **placement NOT built, on evidence.** Nothing merged.
Render fingerprint **unchanged**, so there is nothing for the owner's eye to judge on this branch —
see §7, which is the one thing to read if you read nothing else.

---

## 1. Conformity, element by element, before any numbers

| the spec asked                                              | done | note                                                                            |
| ------------------------------------------------------------- | ---- | --------------------------------------------------------------------------------- |
| Branch `feat/label-stagger-1` off master                       | yes  | `b05b3b6e`.                                                                      |
| FORMAT → MEASURE → COMMIT                                      | yes  | Prettier before every measurement; R0b.                                          |
| (a) compare row separation against label height                | **NO** | **Measured unimplementable against its own gate — §3. Replaced by the box test.** |
| (b) decide ONCE PER FORMATION, not per label                   | yes  | One boolean for the whole field.                                                 |
| (c) label height read from the same place the label uses       | yes  | And it exposed a real duplicate — §5.                                            |
| (d) where separation is sufficient, nothing changes at all      | yes  | Render fingerprint **unchanged**. Proved, not argued.                            |
| Never key on track name / id / open-closed / racer type / count | yes  | The trigger sees a list of boxes and nothing else.                               |
| RENDER fingerprint required, report old and new                 | yes  | §6. Unchanged — and why that is the correct outcome.                             |
| Do NOT mint, do NOT merge                                       | yes  | Neither done.                                                                    |
| CAMERA not required and not run                                 | held | Not run.                                                                         |
| WORLD not required and not run                                  | held | Not run.                                                                         |
| Sweep across every field size on all ten tracks                 | yes  | §4.                                                                              |
| Report where the rule STARTS firing, per track                  | yes  | §4.                                                                              |
| Confirm it never fires where there was no overlap               | yes  | **0 across all ten tracks and every field size.**                                |
| **Expected: zero overlapping labels at every count**            | **NOT MET** | **§3. Four variants measured; none reaches zero. This is the block's headline.** |
| Test that fails if the condition is inverted                    | yes  | §5, proved by sabotage.                                                          |
| Test proving a roomy formation is untouched                     | yes  | §5.                                                                              |
| Do not touch the dev server on 5173                             | held | Never touched.                                                                   |
| At least two proposals of my own                                | yes  | §8.                                                                              |
| Planner proposal 1 (live-truth line)                            | **declined** | §9, with the reason.                                                       |
| Planner proposal 2 (report on/off toggling)                     | **taken** | §4 — and it fires. mountainstreet toggles 17 times.                         |

---

## 2. What the owner's rule asked for, and what a measurement did to it

The instruction was Route 1 as a general rule: compare the screen separation between adjacent start
rows against the height of one name label, and stagger between two vertical levels where the
separation is smaller. Two things came out of measuring it before building it, and both changed the
work.

## 3. The two findings

### 3.1 The specified trigger cannot pass the block's own acceptance test

Rule (a) says compare against the label's **height**. Measured across all ten tracks at every field
size from 2 to each track's maximum:

| candidate trigger                             | fires where needed | **fires where NOT needed** | misses |
| --------------------------------------------- | ------------------ | -------------------------- | ------ |
| vertical row separation < label height         | almost always      | **153**                    | 1      |
| row-centroid distance < label height           | never              | 0                          | **120** |
| **do any two label boxes intersect** (shipped) | always             | **0**                      | **0**  |

The spec also says *"a rule that fires where it was not needed is a defect, not a safety margin"* —
so the height-only reading fails the gate the same spec sets. The reason is geometric: a label is a
**rectangle**, and two rectangles miss each other if they are clear on **either** axis. A height-only
test is blind to the horizontal escape, so it condemns every formation whose rows sit side by side on
screen — which is most of them.

The shipped trigger compares against the whole box. It is exact **by construction**: the predicate is
the condition rather than a proxy, so "never fires where it was not needed" is a property, not a
measurement that could drift.

### 3.2 The placement does not work, and more levels do not save it

Four variants, all measured on the full ten-track sweep:

| placement variant                     | field sizes still overlapping |
| ------------------------------------- | ----------------------------- |
| row parity, one box-height step        | 84                            |
| row parity, two box-height step        | 84                            |
| greedy by screen order, two levels     | 91                            |
| greedy by screen order, six levels     | 90                            |

**It is not a vertical-room problem — six levels is no better than two.** Adjacent start rows sit
about one label height apart in screen y while a label *is* one label height tall, so moving a whole
row vertically does not separate it from its neighbours; it walks the collision into the next row.

The probe that settled it, river-run at 72 racers, rows 1 and 2:

```
before   row1 [513.9, 532.6]   row2 [464.9, 483.6]   -> 30 px apart, no overlap, both legible
after    row1 [476.5, 495.2]   row2 [464.9, 483.6]   -> OVERLAP, created by the stagger
```

The stagger **creates** overlaps as fast as it removes them, because levels are keyed on the row
index while the collision lives in screen space, and **start rows are not monotonic in screen y** —
the formation follows a curving track, so row 2 can sit above row 1.

---

## 4. The sweep — all ten tracks, every field size

| track          | counts | overlapped before | rule fires | **fires w/o need** | **misses** | overlap left | first fires at |
| -------------- | ------ | ----------------- | ---------- | ------------------ | ---------- | ------------ | -------------- |
| city-circuit   | 2..40  | 0                 | 0          | 0                  | 0          | 0            | never          |
| dirt-oval      | 2..40  | 0                 | 0          | 0                  | 0          | 0            | never          |
| garden-path    | 2..40  | 4                 | 4          | 0                  | 0          | 3            | **29**         |
| ice-track      | 2..40  | 0                 | 0          | 0                  | 0          | 0            | never          |
| luger-hill     | 2..100 | 0                 | 0          | 0                  | 0          | 0            | never          |
| mountainstreet | 2..100 | 33                | 33         | 0                  | 0          | 32           | **38**         |
| river-run      | 2..100 | 56                | 56         | 0                  | 0          | 49           | **38**         |
| searound       | 2..40  | 0                 | 0          | 0                  | 0          | 0            | never          |
| seatrack       | 2..100 | 0                 | 0          | 0                  | 0          | 0            | never          |
| space-sprint   | 2..100 | 0                 | 0          | 0                  | 0          | 0            | never          |

**Fired where not needed: 0. Missed a real overlap: 0.** Seven of ten tracks never fire at all.

**New since START-FORMATION-1: mountainstreet also overlaps** — 33 field sizes, from N=38. The
earlier block only swept the four tracks the owner watched, so this is the first ten-track sweep and
it found a second affected track.

### The toggling the planner asked about — it is real

**Taken, and it fires.** The rule switches on and off between adjacent field sizes:

- **mountainstreet toggles 17 times** — 37→38, 42→43, 54→55, 55→56, 56→57, 59→60, 60→61, 63→64,
  73→74, 74→75, 75→76, 84→85, 87→88, 88→89, 89→90, 93→94, 94→95
- river-run toggles 5 times — 37→38, 48→49, 54→55, 55→56, 56→57
- garden-path toggles twice — 28→29, 32→33

This is not instability in the rule; it is the start grid's own staircase (`ceil(N / racersPerRow)`),
where one more racer can open a whole new row and relax the spacing. But it means a viewer who adds a
racer can see the labels change layout, and **that is worth knowing before he sees it** — which was
the planner's point, and it was a good one.

---

## 5. What was built, and the tests

**Shipped:** `formationNeedsStagger` — the trigger, exact.

**Not shipped:** the placement. `assignLabelLevels` and `labelStaggerStep` exist because
`scripts/diag/start-formation.mjs` drives them to reproduce the negative result. They are the
evidence, not dead code, and the module header says so.

**Rule (c) exposed a real defect rather than a formality.** `racerRendering.js` re-typed the box
height, the offset and the padding as literals (`fontPx * 1.18`, `fontPx * 2.0`, `+ 8`) while
`nameTagLayout.js` named them. Two copies of one rectangle: the layout could have been reasoning
about a box the renderer never drew and nothing would have failed. Nothing had drifted yet — which is
the argument for fixing it while that is still true. The renderer now imports them.

**Tests added — `nameTagLayout.stagger.test.js`, six.** Both R7 questions are answered per test in
the file. The two the spec named:

- _fails if the condition is inverted_ — inverting `boxesIntersect` fails three of the six.
- _proves a roomy formation is untouched_ — separated on either axis alone, because a box misses on
  either. A third pins the **measured defect** of the height-only reading, so that reading cannot come
  back by accident.

**Tests deleted or merged: none.** Nothing here was previously covered.

---

## 6. Fingerprints

| role   | before             | after              | verdict                                                                   |
| ------ | ------------------ | ------------------ | ------------------------------------------------------------------------- |
| render | `cf716cbdf37b2077` | `cf716cbdf37b2077` | **UNCHANGED — and that is the correct result, not a disappointment.**     |
| camera | —                  | not run            | Not required; the director is untouched.                                  |
| world  | —                  | not run            | Not required; no engine file is involved.                                 |

The spec expected the render fingerprint to move because labels move. **Labels do not move, because
the placement did not ship** — so an unchanged hash is exactly the evidence that requirement (d) holds
and that the constants unification is arithmetically identical. Had it moved, something would be
wrong.

`npm run verify`: **PASS 4, FAIL 0.** Full client suite green.

---

## 7. What the owner should look at — and the honest answer is: nothing yet

The spec says to look at river-run at his open field size and at one track where the rule does not
fire. **On this branch both look exactly as they do on master**, because nothing in the picture
changed. Spending his eye on it would prove only that the fingerprint is telling the truth.

To see it anyway: `git checkout feat/label-stagger-1`, reload 5173. Pill `ae688dd5 ·
feat/label-stagger-1`. **I did not touch 5173** — it is still on master.

**The decision he actually has is which of §8 to authorise.**

---

## 8. Proposals of my own

**Proposal A — stop paying for names nobody can read, and drop the roll call to a legible subset.**
The start formation shows every name because a spectator must be able to find their racer once. On
river-run at 100 racers that is 100 labels in a space that fits perhaps 40 legibly, so the requirement
defeats itself: at that density *no* name is readable, including the one he is looking for. Cheapest
real fix: keep every name at counts where they fit, and above the density where they cannot, show them
in **waves** — every label still appears, for a second or two, in turn. The roll call is preserved as
a promise about time rather than about one frame. Render-only; no engine, no fairness implication.

**Proposal B — shrink the label only while the roll call is on.** The label is a fixed fraction of
frame height in every state. The start formation is the one moment with ten times the label density,
and it is also the one moment nothing is moving, so a smaller label is easier to read there than the
same label mid-race. A start-specific fraction is one number, keyed on the same window that already
turns the roll call on, and it does not touch any other state. It will not reach zero overlaps at 100
racers on its own, but it moves the threshold a long way and composes with A.

**Both are worth more than finishing the stagger**, which I would not recommend continuing: four
variants say the mechanism is the wrong shape for this density.

---

## 9. What I did NOT do, and why

- **Did not ship the placement.** It does not achieve the goal and makes the picture worse. Shipping a
  busier picture that still overlaps, and moving the render fingerprint for it, would have been
  cosmetic compliance with the letter of the instruction against its own acceptance test.
- **Did not implement rule (a) as written.** §3.1 — it cannot pass the gate the same spec sets.
- **Declined planner proposal 1** (print in the live-truth line whether the rule fired). It exists to
  tell the owner which of two cases he is judging; there is only one case now, because the picture
  never changes. It becomes worth building the moment a placement ships, and not before — a dev
  readout for a state that cannot occur is a line that will go stale unnoticed.
- **Did not run the camera or world fingerprints.** Not required and explicitly not to be run.
- **Did not merge and did not mint.**
- **Did not touch 5173.**
