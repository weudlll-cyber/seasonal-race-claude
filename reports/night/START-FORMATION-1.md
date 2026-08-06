# START-FORMATION-1 — the start formation

**Branch** `feat/start-formation-1` · **base** `master` at `b62ffc0b` · 2026-08-07
**Status** stage 2 done and awaiting the owner's eye. Nothing merged, nothing minted.

---

## Conformity, element by element, before any numbers

| the spec asked                                        | done | where / what deviated                                                                            |
| ----------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------ |
| Stage 1a — establish the draw order for (A)             | yes  | §1.1. One loop, sprite-then-name per racer; incidental, not deliberate.                            |
| Stage 1a — say what drawing names last would cost       | yes  | §1.1. One extra walk of the field, one state write per label. No extra save/restore.               |
| Stage 1b — why the four tracks differ, with numbers     | yes  | §1.2, and **it refutes the obvious story twice** — see §1.3.                                       |
| Stage 1c — does the start share the framing rule        | yes  | §1.4. **It does not.** A finding in its own right.                                                 |
| Stage 2a — draw names LAST                              | yes  | `racerRendering.js`, two passes.                                                                   |
| Stage 2b — report old and new render fingerprint        | yes  | §2.1. `1f83ecc1fcb6fa9a` → `cf716cbdf37b2077`.                                                      |
| Stage 2b — do NOT re-mint, do NOT merge                 | yes  | `docs/fingerprints.json` untouched; branch unmerged.                                               |
| Stage 2c — camera fingerprint must not move             | yes  | §2.1. Run and confirmed **unchanged**.                                                             |
| Stage 2c — world fingerprint NOT run                    | yes  | Not run. `verify` skipped it on its own engine-reach rule; no engine file is in the diff.           |
| Stage 2d — tests, including one that fails on a revert  | yes  | §2.2. Three property tests; sabotage fails two of them.                                            |
| Stage 3 — (B) findings and a proposal, NO change        | yes  | §3. No code written for (B).                                                                       |
| Stage 4 — leave it pushed, say how to look at it        | yes  | §4.                                                                                                |
| Never modify the engine-reach hull                      | held | Diff is one screen file, one test, one diag script.                                                |
| No race series                                          | held | None run.                                                                                          |
| Merge nothing into master                                | held | Branch only.                                                                                       |
| Never re-mint a fingerprint on my own authority          | held | The record still carries the old render value, deliberately.                                        |
| Do not touch the dev server on 5173                      | held | Never touched. See §4.                                                                              |

**Deviation from the spec, and it is the owner's own correction.** The spec framed (A) as a
draw-order question about the start formation. Mid-block he restated it: *a name tag must never be
overlaid by a racer.* That is a standing requirement on every frame. The fix already satisfies it —
names now draw after every sprite in every frame, not only at the gun — but the MEASUREMENT had to
change, and the number roughly doubled (§1.2). He also set the field size for the (B) test: the
full grid a track can hold, and then not one count but **every** count, because no racer count may
overlap. Both corrections changed the answer.

---

## 1. Diagnosis

### 1.1 (A) The draw order — incidental, not deliberate

`drawRacers` walked the field **once** and drew, per racer: trail → sprite → rings → name. So any
racer later in the list painted over the name of one earlier. Nothing chose the victims — the list
order is the racer index, so which names were readable was decided by nothing at all.

It was incidental. No comment defended it, no test asserted it, and the module's own header called
itself "renderer for racers, name tags, and dust trails" without ever saying in what order.

**What drawing names last costs:** one extra walk of the field per frame and one `globalAlpha` write
per label. No extra `save`/`restore` — `drawNameTag` already brackets its own. Nothing else in the
frame changes and nothing in the tag pass reads the camera.

### 1.2 (B) Why the four tracks differ — the numbers

Measured by `scripts/diag/start-formation.mjs`, which drives the real `createRaceFromIdentity`, the
real `updateCountdown` and the real `computeRenderDisplayScale` at `render-fingerprint.mjs`'s own
frame 0. At the full grid (closed 40, open 100), 1280×720:

| track        | open | N   | racer type | track width | displaySize | rows | per row | sprite (world px) |
| ------------ | ---- | --- | ---------- | ----------- | ----------- | ---- | ------- | ----------------- |
| ice-track    | no   | 40  | snowmobile | 211         | 52          | 4    | 10      | 40.09             |
| river-run    | yes  | 100 | duck       | 300         | 36          | 5    | 20      | 28.50             |
| seatrack     | yes  | 100 | dolphin    | 300         | 52          | 7    | 15      | 38.00             |
| space-sprint | yes  | 100 | rocket     | 300         | 47          | 6    | 17      | 33.53             |

| track        | label box h | row-neighbour clear air | labels overlapping | names touched by a body |
| ------------ | ----------- | ----------------------- | ------------------ | ----------------------- |
| ice-track    | 18.69       | 16.94                   | 0                  | 90.0%                   |
| river-run    | 18.69       | **4.82**                | 4 pairs, 7% of labels | 95.0%                |
| seatrack     | 18.69       | 10.26                   | 0                  | 93.0%                   |
| space-sprint | 18.69       | 5.15                    | 0                  | 98.0%                   |

**The sweep — every count from 2 to the maximum**, which is the only form of the question that can
be answered "never":

| track        | counts tested | counts WITH an overlap | first bad N | tightest at N | its clear air |
| ------------ | ------------- | ---------------------- | ----------- | ------------- | ------------- |
| ice-track    | 2..40         | **0 / 39**             | —           | 11            | 13.38 px      |
| river-run    | 2..100        | **56 / 99**            | 38          | 93            | 0.72 px       |
| seatrack     | 2..100        | **0 / 99**             | —           | 92            | 9.12 px       |
| space-sprint | 2..100        | **0 / 99**             | —           | 18            | 3.46 px       |

river-run overlaps from N=38 upward, worst at N=72 where **two thirds of all labels are hit**. The
other three never overlap at any count. That is his eye, reproduced as a number.

### 1.3 The numbers refute the obvious story — twice

**First refutation: it is not the track.** river-run and space-sprint have the *same* track width
(300), nearly the same world, are both open, and draw labels at the identical screen size. Neither
the track nor the label is the variable. The variable is the default racer type's `displaySize` —
duck 36, rocket 47, dolphin 52 — which sets how many racers share a row and how big the sprite is.

**Second refutation, and it kills my own first reading.** The plausible mechanism is lateral
crowding: 20 ducks abreast where others put 15. It is wrong. Classifying every overlapping pair by
start row:

> **Same-row overlapping pairs: 0. At every count, on every track. Every single overlap is between
> NEIGHBOURING ROWS** — 4 pairs at the full grid, 89 at river-run's worst count.

A label sits a fixed `2 × fontPx` above its own racer, so two labels in adjacent rows are separated
by exactly the rows' screen separation. The row gap is `physicalSpriteSize × rowGapMultiplier`.
river-run has the smallest sprite of the four, so the smallest row gap, so its rows come inside one
label height of each other. `displaySize` is still the root cause — but through the **row gap**, not
the lateral spacing. Recorded because it is the reading anyone would reach for first.

### 1.4 (C) The start does NOT share the framing rule — a finding

The owner's design says one framing rule for every state: anchor, guarantee, zoom
(`camera/framingRule.js`). `FRAMING_BY_STATE` lists **six** states. COUNTDOWN is not one of them.

`CameraDirector.updateCountdown` is its own path. It eases zoom from `_countdownStartZoom` to
`_overviewStateZoom`, pans to the racer centroid, and clamps to world bounds — and it never calls
`framingFor`, `corridorGuarantee` or `companyGuarantee`. So at the start there is no guarantee that
anyone stays in frame; the shot is whatever the two endpoints and the centroid produce.

It has a consequence for this very problem: at the full grid the formation already fills 69.7%
(river-run) to 87.2% (seatrack) of the frame height, and nothing is watching that number.

### 1.5 One more thing the start does not have

The decluttering that would drop a colliding label is **deliberately off** at the start —
`nameTagLayout.js`'s START-FORMATION exception, which exists because of the owner's own requirement
that every name be visible once. So at the gun there is no mechanism left to prevent an overlap.
Only geometry can. That is why (B) has no cheap render-side fix.

---

## 2. What was changed — (A) only

### 2.1 Fingerprints

| role   | before             | after              | verdict                                                                 |
| ------ | ------------------ | ------------------ | ----------------------------------------------------------------------- |
| render | `1f83ecc1fcb6fa9a` | `cf716cbdf37b2077` | **MOVED, and correctly** — the draw order is exactly what it hashes.     |
| camera | `00cafa2432add0f7` | `00cafa2432add0f7` | **unchanged**, run and confirmed. The director is untouched.             |
| world  | —                  | not run            | Deliberate: no engine file in the diff; `verify` skipped it on its own.  |

**Not minted. Not merged.** `docs/fingerprints.json` still carries the old render value. A visible
change needs his eye first (L191), and only he can authorise the mint.

`npm run verify`: **PASS 4, FAIL 0, SKIP 3**. Full client suite green (151 s), so nothing else in the
codebase asserted on the old order.

### 2.2 Tests

**Added** — `racerRendering.test.js`, the first test this module has ever had. Three property tests:
the last sprite precedes the first name at any field size; the same holds when only some racers are
labelled; and each label carries its own racer's dimming rather than the last one painted.

R7's two questions. _What breaks if I delete it:_ nothing — the order goes unprotected again. _What
goes unnoticed if it is missing:_ precisely this defect returning. The render fingerprint would move,
but a fingerprint says SOMETHING changed, never that the names went back under the sprites.

**Proved by sabotage.** Reverting to one interleaved pass fails two of the three (`expected 22 to be
less than 1`, `expected 10 to be less than 1`). The third stays green, correctly — it is a different
claim.

**Deleted or merged: none.** Nothing here was previously covered.

### 2.3 What the fix does NOT do

It guarantees no racer is drawn **on top of** a name. It does not move a name **off** a sprite. At
the full grid, 90–98% of name boxes still geometrically sit over some racer's body — the label's own
background is 65% black so the text stays legible, but that is a layout question, and it is the one
stage 3 would own. **This is the first thing to decide when you look at it.**

`drawBattleDiagMarkers` is still drawn after the names. It is a developer overlay that only draws
during BATTLE_ZOOM, so it cannot reach the start formation. Left alone rather than moved.

---

## 3. (B) — findings and proposals only. Nothing implemented.

The number that would have to move is the **screen separation between adjacent start rows**, which
must exceed one label box height (18.69 px at the shipped settings on a 720 px frame). On river-run
it falls to 0.72 px at its worst count.

### Route 1 — stagger the labels between two vertical levels *(my recommendation)*

Alternate each label's offset above its racer between two levels, so neighbouring rows never share a
horizontal band. Doubles the effective budget without touching spacing, sprite size, or the race.

- **Touches:** `nameTagLayout.js` / `racerRendering.js` only. Render fingerprint moves. **World and
  camera fingerprints do not.** No re-baseline, no fairness implication.
- **Already the design's own plan:** `nameTagLayout.js`'s header names multi-slot placement as its
  Stage 3, written down before this problem was found.
- **Cost:** labels sit at two heights, which is visually busier, and a name is further from its racer.

### Route 2 — shrink the label (`nameTagFrameFrac`)

Make the box short enough to fit the worst row gap. Simple, one number.

- **Touches:** every track and **every state**, not just the start. The label is already the smallest
  readable thing on screen, so this spends readability everywhere to fix four frames on one track.
- **Cost:** would have to drop by roughly a fifth to clear river-run's worst count. Render
  fingerprint moves.

### Route 3 — cap how many racers share a start row

Fixes the cause: fewer per row → bigger sprite → bigger row gap.

- **Touches:** the START GRID. `rowCount` changes, so `tStart` and `rowGapPx` change, so the **world
  fingerprint moves and every fairness baseline is invalidated.** That is a full re-baseline, for a
  label problem. I would not do this.

### Route 4 — zoom in at the start

The label is fixed screen px, so zooming in buys separation for free.

- **Cost, and it is disqualifying:** at the full grid the formation already fills 69.7–87.2% of the
  frame height. Zooming enough would push rear rows off-frame, and an off-frame racer loses its label
  **entirely** — which breaks the owner's requirement harder than the overlap does.

### And a fifth thing, which is not a route but is worth a decision

Stage 1.4 found the start has no framing rule at all. Bringing COUNTDOWN into `FRAMING_BY_STATE`
with a guarantee of "the whole formation stays in frame" would give the start the same contract
every other state has, and would make Route 4's failure mode impossible by construction. It is a
bigger job than any route above and it is orthogonal to the overlap.

---

## 4. What to do to see it

```
git checkout feat/start-formation-1     # then reload localhost:5173
```

The dev server serves the working tree, so the branch checkout is the whole procedure. Confirm the
build pill reads `40b4fed1 · feat/start-formation-1` with no `+dirty` before judging (R10). **I did
not touch port 5173 at any point in this block.**

---

## 5. What he has to decide

1. **Does the fix look right?** Names should now be readable on all four tracks at the start. If yes,
   the render fingerprint gets minted and the branch merges.
2. **Is a name sitting ON a sprite acceptable?** §2.3. It is legible but busy. Yes → (B) is only about
   river-run. No → this becomes a layout job on every track and is much larger.
3. **Which route for (B)?** I recommend Route 1 (stagger), and would rule out Routes 3 and 4 outright.
4. **Should COUNTDOWN join the framing rule?** §1.4 — separate question, his call.

## 6. What I did NOT do, and why

- **Did not implement (B).** The spec reserved it for him, and it is a taste question.
- **Did not re-mint the render fingerprint.** Standing rule; only he can authorise it.
- **Did not merge.** Standing rule for this block.
- **Did not run the world fingerprint.** No engine file in the diff; `verify` agreed independently.
- **Did not run a race series.** Standing rule, and nothing here needed one.
- **Did not move `drawBattleDiagMarkers` below the names.** §2.3 — it cannot reach the start.
- **Did not fix the German filename `KRAEFTE-LANDKARTE.md`** at the repo root, which breaches the
  project language rule. Out of scope here; it belongs to the documentation part.
