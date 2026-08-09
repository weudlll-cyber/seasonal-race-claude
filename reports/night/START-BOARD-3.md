# START-BOARD-3 — the numbers come back, and the alphabet is whole again

**Branch** `feat/start-board-3` off `feat/start-board-2` · 2026-08-09 ·
**built, measured, NOT minted, NOT merged**

---

## 1. Conformity, element by element — before any numbers

| the spec asked | done | where |
| --- | --- | --- |
| **1(a)** diagnose the missing numbers FIRST, do not assume which cause | yes | **§3 — and NEITHER hypothesis is right** |
| **1(b)** fix it at every field size; pin the number column's width | yes | §4 — `startBoardNumberBox()`, independent of `CELL_W` |
| **1(c)** a test that fails if an entry is drawn without its number | yes | §4, §7 — three of them |
| **2(a)** back to ONE globally alphabetical list | yes | §5 |
| **2(b)** keep the row as a per-entry marker; not confusable with the number | yes | §5 — four separations, not one |
| **2(c)** every racer once · no overlap · nothing clipped · 40 and 100 · small field compact | yes | §6, §7 — the old tests still pass |
| **2(d)** report the layout at 8/20/40/100, and say what the cell width is now | yes | §6 — **236 px again** |
| Do not touch: board timing and sliders, ceremony beats, track numbers, label offset, name toggle | held | §9 — the diff is two files |
| RENDER expected to move; CAMERA and WORLD must not | **exactly that** | §8 |
| `engine-reach --check` on the actual diff, run what it says is owed | yes | §8 |
| DO NOT mint, DO NOT merge | held | §8 |
| verify ONCE at the end; `--cheap` for wiring checks | held | §8 |
| Source hygiene | yes | §9 |
| Two proposals | yes | §11 |
| Name but do not build: sprite avoidance for labels | yes | §12 |

---

## 2. What he will see

The board is **one alphabetical list** again — A to Z straight down the columns, no row headings to
search through. Every line is **number · racer · name · row**: the number now sits on a small chip at
the same size as the name, and the start row rides at the far right as a dim `R7`. The cell is
**wider** than it was, so long names have 36 px more room.

---

## 3. (1a) THE DIAGNOSIS — and both hypotheses were wrong

**The number was never missing from the draw.** Driving the real `drawStartBoard` through the
recording context at n = 100:

```
fillText calls total : 211
  of which NUMBERS   : 100     ← expected 100
  of which names     : 100
first number call    : fillText "1" x=74 y=133
first sprite call    : translate 90 133
```

So, against the two candidates the spec named:

- **`raceNumber` absent on the board's objects — NO.** All 100 numbers were emitted, with values.
- **The number column collapsed when the cell narrowed 236 → 200 — NO.** `NUMBER_BOX` was a constant
  34 px and never a share of the cell. Measured on the ops: the cell begins at x = 40 and the
  right-aligned number is drawn at x = 74. The gutter was intact.

**A third candidate I checked and eliminated: the portrait covering it.** START-BOARD-2 grew the
portrait from ~21 px to ~30 px, and the sprite is drawn *after* the number, so it would win. But the
drawn image is mostly transparent padding — the **visible body** is what matters, and for every one
of the ten racer types it is 30.1 px wide, spanning **x ∈ [35, 65]** of the cell. The number's
gutter is [0, 34]. It never reaches.

**What actually regressed is legibility, and it was one commit.** START-BOARD-2 changed three things
at once:

1. the number moved from **between the sprite and the name** to the **far left** of the cell;
2. it stayed at **12 px** while the name went to 13 px;
3. a **bold gold `ROW n` heading** began recurring in that same left strip, at the same 12 px bold.

The result is that the leftmost element of every cell is a small pale digit, with gold furniture
appearing in the same strip every few rows. It stopped reading as *this racer's number* and started
reading as part of the column's structure. His words — "no numbers at all" — describe what the strip
communicates, not what the canvas contains.

I am naming this as a **legibility** finding rather than a mechanical one, because that is what the
evidence supports. The ops prove the draw; nothing I can measure proves the perception. What I can do
is remove all three causes and pin the column so a future narrowing cannot make it worse silently —
§4.

---

## 4. (1b, 1c) The fix, and the pin

**The number is now a badge, not a digit.** Same font size as the name (13 px), brighter
(`#bdf0ff`), centred on its own translucent chip. A chip is what makes a number read as *belonging to
this line* rather than as text that happens to be at the left margin. The competing gold heading is
gone with finding 2.

**The column is pinned, and by a function rather than a comment.** `startBoardNumberBox()` is
exported and returns a constant that **does not depend on `CELL_W`**. Three tests hold it:

- one number per racer, at 40 and at 100 — *the test that did not exist, which is why his eye was
  the first thing to catch this*;
- each number **on its own line, inside its own column** — so numbers cannot all be right and all
  belong to the wrong entries;
- the column is wide enough for the widest label `raceNumberLabel` can return, and is **the same at
  every field size** — i.e. it is not a share of the cell, which is the failure mode that would
  reproduce the symptom.

---

## 5. (2a, 2b) One list, and the row rides along

**Back to one globally alphabetical list.** His own correction, and he is right about the mechanism:
an alphabetical list lets you *jump*; ten alphabetical lists make you scan all ten, because you do
not know which row you are in — which is the very thing you came to the board to learn. The grouping
answered a question with a structure that presumed the answer.

**The row survives as a per-entry marker**, so name, number and row are read in one line.

**It cannot be confused with the number, and four things separate them rather than one** — because
any single distinction is weak at a glance across a hundred entries:

| | the number | the row marker |
| --- | --- | --- |
| position | far **left** of the cell | far **right** |
| size | 13 px bold | 10 px regular |
| colour | bright blue `#bdf0ff` on a chip | dim grey, no chip |
| form | bare digits | **`R` prefix** |

A racer with no start-row assignment gets **no marker**, rather than a wrong one — asserted.

---

## 6. (2c, 2d) The layout, and the cell width

| field | cols × rows | block px | scale | overlapping | clipped |
| ---: | --- | --- | ---: | ---: | ---: |
| 8 | 2 × 6 | 472 × 180 | **1.000** | 0 | 0 |
| 12 | 2 × 6 | 472 × 180 | **1.000** | 0 | 0 |
| 20 | 4 × 6 | 944 × 180 | **1.000** | 0 | 0 |
| 40 | 5 × 8 | 1180 × 240 | **1.000** | 0 | 0 |
| 100 | 5 × 20 | 1180 × 600 | **1.000** | 0 | 0 |
| 140 | 7 × 20 | 1212 × 440 | 0.734 | 0 | 0 |

**The cell is back to 236 px, and the spec's suspicion was right: the 200 was the grouping's price.**
Grouping cost one heading slot per start row, so a hundred racers needed **110 slots**, and 236 px
only fits 100 at full size — which is why START-BOARD-2 narrowed it rather than shrink the type. With
the headings gone, 100 racers is 100 slots again and **5 × 20 × 236 px fits exactly**. Measured
capacity at scale 1.0: 236 px → 5 × 20 = 100; 200 px → 6 × 20 = 120.

The 36 px goes to the name, which a long roster needs most: the name's room rises from 129 px to
**139 px** even after giving 26 px to the new row marker.

A small field still gets a compact centred block (8 racers → 2 × 6), not a strip.

---

## 7. Tests

**Added: 9. Rewritten: 14 (the file). Deleted: 5.** Client suite: **189 files, 3754 tests, green.**

**Deleted, and why:** the five grouping tests — that the groups partition the field, that groups are
in row order with alphabetical contents, that heading slots get distinct cells, and the two that
counted slots including headings. They assert a structure that no longer exists. Adapting them would
have meant inventing assertions for deleted code.

| new test | what breaks if deleted | what goes unnoticed if it is missing |
| --- | --- | --- |
| one number per racer, at 40 and 100 | **the reported defect, with nothing left to catch it** | a board of names nobody can act on — it reads as a working feature |
| the number is on its own line, in its own column | the pairing | a number belonging to the line above — worse than none |
| the number column is pinned and cell-width-independent | the pin | exactly the narrowing that happened once already |
| a racer with no number draws no empty string | — | a blank chip that reads as a missing racer |
| ONE globally alphabetical list | the correction he asked for | a board that looks orderly and cannot be scanned |
| every entry carries its start row | what the grouping was FOR | a viewer who finds their name and still cannot tell where they start |
| the marker is at the opposite end, and prefixed | requirement 2(b) | two numbers on one line, and the wrong one carried to the race |
| no assignment → no marker | — | `R1` on every entry of a race that has no row data |
| the marker is 1-based | — | a viewer sent to the wrong row by one |

Everything 2(c) asked to keep is still asserted: every racer exactly once, distinct cells, no
overlap, nothing clipped at 40 and 100 and beyond, small field compact, portrait through the shipped
`drawRacer` at frame 0, nothing between sprite and name.

---

## 8. Fingerprints

`node scripts/engine-reach.mjs --check` on the actual diff: **`none of 2 path(s) can reach the race
engine`** — the diff is `startBoardRendering.js` and its test, so no world fingerprint was owed. It
ran anyway as part of the one `verify`, and confirms it.

| role | before | after | expected? |
| --- | --- | --- | --- |
| world | `dc4647be0f55ebdb` | `dc4647be0f55ebdb` | must not move — it did not |
| camera | `3af58f4d7b0b073f` | `3af58f4d7b0b073f` | must not move — it did not |
| render | `58476ade8198fb90` | **`0a7b687d94bc3e49`** | **moves — the board draws differently** |

**NOT MINTED, NOT MERGED.**

**Cost discipline:** `npm run verify` once, at the end. Wiring checked with `--cheap` (city-circuit
`d2323508df86253c` → `82b36f1a3c403794`, three seconds). The client suite was teed and read once. The
diagnosis in §3 was done by driving `drawStartBoard` directly through the recording context — no
fingerprint run was needed to answer it.

**One guard tripped, and it is the same false positive as last block.** `check-measured-stamps` calls
the tracking lag stale because `client/src/modules/camera/` changed after the stamp — the change is
`startCeremony.**test**.js`, reformatted by the pre-commit hook in START-BOARD-2's *report* commit. A
test file is not read by `tracking-lag.mjs` and cannot move its numbers, so this is a **deliberate
re-stamp**, which is the guard's own documented escape, with the reason in the commit. It has now
cost two blocks in a row; §11.2 is the one-line fix.

---

## 9. Hygiene

**Lines.** `startBoardRendering.js` 308 → **294**. Its test 358 → 404. **Nothing else was touched** —
the diff is two files, which is why the "do not touch" list needed no discipline to honour.

**Removed, because the grouping orphaned it:**

- **`startBoardGroups()`** — the exported grouping function, its row bucketing and its per-group sort.
- **The heading slot arithmetic**: the `slots` array with its `{kind:'heading'|'racer'}` union, the
  `slotCount` that summed one heading per group plus one per racer, and the two-branch draw loop.
- **`HEADING_H`** — a constant that existed only for the heading's row height.
- **The heading's rule stroke** (`strokeStyle`/`moveTo`/`lineTo`/`stroke`), and with it the only use
  of stroking in this module.
- **The 200 px `CELL_W`**, replaced by 236 — it existed only to absorb the heading slots (§6).
- **Five tests** asserting the grouped structure.

**Moved out:** nothing.

**Noticed and deliberately left:**

- **`MIN_ROWS = 6` now binds at smaller fields than it used to.** With headings gone, 8 racers is 8
  slots rather than 10, so the floor is doing more of the work in keeping a small field a block. It
  is correct and it is measured (§6), but it is a constant whose job quietly changed.
- **`CameraDirector._ceremonyBeat` is still write-only.** Fifth block to walk past it. Not orphaned
  by this change.
- **The name still clips rather than shrinks** at the longest rosters (23-character names in a
  139 px column at 13 px is about 21 characters). Better than before, still a clip. Named in
  START-BOARD-2 and unchanged here.
- **The board's geometry is still literals**, now with one more (`ROW_BOX`). Layout, not taste.

---

## 10. Decisions made alone

1. **I reported the diagnosis as a legibility regression rather than a mechanical one**, because the
   ops prove the draw and nothing I can measure proves the perception. Claiming a mechanical cause I
   had disproved would have been the more comfortable answer and the wrong one.
2. **A chip behind the number**, rather than only making it bigger. Size alone would have left it a
   digit at the margin; the chip is what makes it a badge that belongs to the line.
3. **Four separations between the marker and the number**, not one. Position alone fails at a glance
   across a hundred entries; so does colour alone.
4. **The row marker is 1-based** (`R1`, not `R0`), because a viewer counts rows from one and the
   internal `rowIndex` is an implementation detail.
5. **236 px rather than the 240 the space technically allows.** 240 also fits 5 columns, but 236 was
   the width the board shipped at through two eye tests; going back to a known-good number rather
   than to the maximum keeps this change about the grouping and not about the type metrics.
6. **The row marker takes 26 px from the name rather than from the number or the sprite.** The name
   still nets +10 px against the grouped layout, and the two things the owner said he must carry away
   — number and portrait — kept their full columns.
7. **Deliberate re-stamp rather than a re-measure** (§8).

---

## 11. Two proposals of my own

**11.1 — The board should be able to say what it could not fit.** Twice now a board defect has been
invisible until his eye found it: 70 of 100 racers, and numbers that read as furniture. Both are
cases where the board *rendered successfully* and communicated something false. A one-line footer —
`100 starters · 5 × 20 · scale 1.00` — would make the board state its own completeness, and the day a
field is short or the type has shrunk, the board says so instead of looking fine. It costs one
`fillText` and it turns two classes of silent defect into visible ones.

**11.2 — `check-measured-stamps` should ignore test files, and it has now cost two blocks.** The
guard's `depends=client/src/modules/camera/` matches `*.test.js`, so a prettier pass over a test file
in a *report* commit marks a seven-minute measurement stale. Neither of the two trips was a real
staleness. The fix is one line in the guard's newest-commit query — exclude `*.test.*` — and it is
the same principle as the `inertChange` rule VERIFY-COST-2 added for comments: a change that
provably cannot move the number should not demand the number be re-taken. I did not build it here
because this block's diff is two files and widening it to a guard would have been scope I was not
given.

---

## 12. NAMED, NOT BUILT — a name can sit on top of a racer

With the name toggle ON, a label can cover another racer completely, because **`computeTagLayout`
tests labels against LABELS and never against RACERS**. Its own header already names this as stage 3
("SPRITE avoidance — a label must also not cover a racer"), and `drawnRacerScreenPx` now supplies the
missing input: the racer's drawn height in screen px, which is what a sprite box needs.

**What the stage would cost, so the decision is informed:**

- **The inputs are already there.** Every racer's screen position is computed in the eligibility loop,
  and `racerScreenH` is already passed in and already used for the label offset. A sprite box is
  `(sx ± visibleW/2, sy ± racerScreenH/2)`. **No new plumbing.**
- **The horizontal half-width is the one thing missing.** `racerScreenH` is the *narrow* axis;
  the visible long axis is `bodyFillLong / bodyFillNarrow` times it — up to 2.88× (rocket). That
  ratio lives on the racer type's config and would have to reach the layout, which today receives no
  racer type at all. **That is the only new argument**, and it is the piece I would scrutinise: it is
  a per-type constant travelling into a module that has deliberately known nothing about racer types.
- **The cost is in the pass, not the plumbing.** The placement loop is O(placed) per candidate today.
  Adding sprite boxes makes it O(placed + racers) — at 100 racers that is a 100-element scan per
  label per frame, against ~40 today. Bounded and cheap, but it is the first time the layout would
  read the whole field rather than the eligible labels.
- **The real risk is that it makes labels scarcer, not that it is slow.** Every racer becomes an
  obstacle, so at 100 racers on a bunched track the number of labels that can be placed at all would
  fall — and LABEL-DEGRADE-1 already measured that losing labels is the cost that matters. I would
  want the same before/after harness pointed at it before it shipped, and I would expect the honest
  answer to be a *second* fallback (label below the racer, or offset sideways) rather than simply
  dropping more labels.

**Estimate: a day's block, of which the measurement is half.** Not built here.

---

## 13. What I did NOT do, and why

- **Did not touch the board's timing or sliders, the ceremony beats, the track numbers, the label
  offset, or the name toggle.** The diff is two files.
- **Did not build sprite avoidance.** §12 — named and costed, as asked.
- **Did not widen the guard fix.** §11.2 — out of scope for a two-file block.
- **Did not change the entry ORDER** (number · sprite · name). It was his explicit instruction last
  block and the number's legibility was fixable without moving it.
- **Did not mint. Did not merge.**

---

## 14. How to see it

**5173 is on this branch**, `feat/start-board-3`. The build pill names the branch.

**What to look at:** mountainstreet at 100 — the same race that produced both findings. The board
should now be one A-to-Z list with a blue number chip at the start of every line and a dim `R7` at
the end of it. Then a small field of 8–12, to confirm it is still a compact block.

**What still needs your decision:** a Quick Test at 100 still starts only **70** racers (the roster
has 70 names, START-BOARD-2 §5) — that is a name change, which is an engine input, and it is yours.
