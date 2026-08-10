# SCOREBOARD-SLOT-LAYER — the places are drawn once, only the name tag moves

**Branch** `feat/scoreboard-slot-layer`, cut from `feat/scoreboard-transform-rows` (`669a1a5b`).
**NOT merged — a visible surface, and it waits for the owner's eye.** All four fingerprints unchanged.

**THE ACCEPTANCE IDEA HOLDS, AND IT WAS MEASURED RATHER THAN ARGUED.** A hundred racers, twenty-five
seconds of racing, a `MutationObserver` over the whole standings: **833 DOM mutations, every single
one of them `scoreboard-card:style`. Zero text mutations. Zero structural mutations.** An overtake is
a transform and nothing else.

---

## FIRST — the cut-off list, because it might have been ours

**It was not.** Established before anything was touched, in a real browser at 2400×1300 with 100
racers:

| build | rows container | last row bottom | in the window? |
| --- | --- | --- | --- |
| master's layout (rows in flow) | **3529.3 px** | 3623.7 | **no** |
| `feat/scoreboard-transform-rows` | **3533.3 px** | 3623.6 | **no** |

The two differ by **4 px**, and that 4 px is the last row's `margin-bottom`, which collapses out of a
flow container and is included in the explicit height the transform work gave it. **The transform
branch is 4 px LESS clipped, not more.** The clipping is older than this line of work; the panel has
been taller than any window since fields grew past about thirty racers.

The reason it is not reachable by scrolling in practice is that the whole page grew with it —
`document.scrollHeight` was **3748 px** against a 1300 px window — so watching the race and reading
`#100` were mutually exclusive.

### What was done about it

The HUD is capped at the window (`max-height: calc(100vh - 20px)`, the screen's own padding either
side; `calc(100vh - 12px)` in fullscreen, which uses 6 px) and the rows get their own scrolling
viewport inside it. The rows canvas keeps its true height, so every row is fully drawn.

Measured after, same conditions:

- page `scrollHeight` **1300** — the race screen now fits the window; the standings no longer drag
  the document past the bottom of the canvas;
- the standings viewport is **1085 px** over a **3533 px** canvas, and scrolling it to the end puts
  `#100` **fully inside both the panel and the window**;
- **at 140 racers**: the rows canvas is 4947 px, the panel is 1117 px, and `#140` is likewise fully
  visible at the scroll end. Nothing about the fix depends on the field being 100 — it is
  `max-height` plus `overflow-y`, and the field size only decides how far it scrolls.

**The honest limit, said plainly:** the last row is fully visible *at the scroll end*, not
simultaneously with the first. A hundred rows at the shipped 35.333 px pitch need 3533 px and no
window has that, and the pitch may not change because the list has to look as it does now. If the
owner wants the whole field on screen at once, that is a different change — a smaller pitch or a
multi-column column — and it is his call, not this block's.

**One thing this does NOT fix, and it is next door rather than here:** at a 1080 px-tall window the
page still scrolls, because the CANVAS is 1225 px tall at 2400 px wide (16:9 of a full-width grid
column). The standings are bounded and complete; the canvas is what is left over the fold.

## The badge, and `#100` spilling out of it

The column was a hard **28 px**. Measured max-content widths of a real badge (700 12px Inter, 1 px
border, 3 px padding): `#9` **23.6**, `#99` **31.4**, `#999` **39.2**, `#9999` **47.0**, crown 24.5.

So `#100` needed 37.2 in a 28 px box — the owner's screenshot. **And it starts earlier than he
reported:** every two-digit place already overflows by about 1.7 px a side, which reads as kerning
and is why nobody said anything.

`badgeWidthPx(fieldSize)` now returns **one width for the whole column**, from the widest place that
field can produce, using the widest digit as the upper bound: **28 up to `#9`** (today's value, kept
as a floor so small fields are pixel-for-pixel untouched), **32** to `#99`, **40** to `#999`, **47**
beyond. At 100 racers and at 140 the answer is the same **40 px**, and no badge overflows at either.

**What it costs:** the sidebar is a fixed 210 px, so the name column gives up those 12 px, and
another ~10 to the new scrollbar. At 140 racers a name ellipsises at "Racer 1 L…" where it used to
reach "Racer 1 Longn…". That is the price of the badge fitting its box, and it is visible.

## The two layers

- **`ScoreboardSlots`** — the badge column. Crown at slot 1, then `#2`, `#3` … to the field size,
  each with its colour. Memoised on the field size, which cannot change during a race, so it is built
  once and never touched again.
  **Both highlights are PLACE-bound, and the owner asked for second to be checked rather than
  assumed: it is SILVER** — `['#ffd700', '#c0c0c0', '#cd7f32']`, gold/silver/bronze, and the fourth
  place falls off the palette onto the same fallbacks the old row spelled inline.
- **`ScoreboardCard`** — icon, start number, name. Nothing it displays changes during a race, so
  `memo` skips it on every re-render RaceScreen does.

**The rank stopped being a prop.** The previous block's header argued it had to be one, and it was
right then: while the row DISPLAYED `#5`, a rank hidden on the memoised identity object would have
frozen the standings silently. This card displays no place. Keeping the rank as a prop would only
re-render a hundred cards a tick to produce one changed `transform` each — the exact cost this block
exists to remove. `scoreboardPositions.js` writes that transform straight onto the element, and
**RaceScreen's cadence tick now sets no React state at all** unless somebody has finished.

**What still reads racer state per tick — checked, not assumed.** The cadence tick's sort is the only
one, and it is the sort that was always there. The other per-frame React writes in RaceScreen are
`setCamState` and `setCamAnchor`, both already guarded to fire only on an actual change, and
`setPhase`, which fires twice a race. Nothing else in the standings path touches a racer.

**What still changes a card:** the finish time, once per racer, at the moment it crosses. One card,
once. Named, priced, left alone.

**And the colour, which is the honest residue.** The name's gold/silver/bronze is place-bound too and
lives on the card, so it cannot move into the static layer. It is written only when a card crosses
the top-three boundary: measured over a whole race, colour writes are a small fraction of moves, and
a midfield reshuffle writes none at all.

## Looks exactly as it does now — and the pixel diff caught something

An **8-racer** panel is the fair test: at that field the badge column keeps its 28 px and the list
fits without a scrollbar, so **nothing at all was supposed to change**. Screenshots of the standings
during the countdown, where the payload is fixed and the order is racer order, against the shipped
build:

**First attempt: 6367 pixels differed, max channel delta 189 — and the diff map showed every icon,
number and name identical and every BADGE changed.** The badge used to live inside a row carrying
`will-change: transform`, and text inside a composited layer is antialiased in greyscale rather than
with subpixel LCD filtering. Moved out, the same badge rasterised differently.

Compositing the static layer too puts it back: **0 pixels differ by more than 8, max channel delta 2**
— rasterisation noise, and by eye the two panels are the same panel. It costs one compositor layer
for the whole column, drawn once and never repainted.

## Two things the re-measurement corrected

**The row height is not a constant.** It is **31.333 px on the owner's 1.5× display and 32.000 on a
1:1 one** — the browser snaps the badge's border box to whole device pixels, and the badge is the
tallest thing in the row. So `ROW_PITCH_PX = 35.333` was never "height plus the 4 px margin" on
either display, and **that margin has been inert since the rows left the flow** (an absolutely
positioned box with `top` set and no `bottom` ignores its bottom margin). The pitch stays at the
shipped 35.333 because it is the spacing the owner has looked at; the comment that explained it as an
arithmetic identity is now the measurement instead.

**Which is why the card does not get a height constant.** It reserves the badge's column with a
spacer carrying the badge's own box — same font size, line height, padding and border, and one blank
line inside it — so both layers derive one height from one rule and land on 31.333 and 32.000
respectively, exactly where the old row landed. An explicit `height: calc(1.5em + 4px)`,
arithmetically the same 22 px, was tried first and lands on **32.000 where the badge lands on
31.333**: an author height and an auto height snap to device pixels differently.

## The measurement

**Conditions, and two of them were corrected by the owner mid-block.** Production bundles of both
branches, real React, 100 racers on mountainstreet, 60 s races, arm order rotated every batch.

- **The window is his own maximised browser — 1280 × 665 CSS at device-pixel-ratio 1.5, measured, not
  chosen.** The first attempt used 2400 × 1300 and he stopped it: he never races at that size, and
  FRAME-GAP-1 established the frame cost scales with window AREA, so the wrong window measures a
  machine that does not exist.
- **Both bundles were moved OUT of the OneDrive-synced tree and served by a watcher-free static
  server.** Served from `dist/` under OneDrive, one run recorded a **1016 ms** frame — a full second
  of stall — and arm-to-arm variation swamped everything. Outside it, the same arms separate cleanly.
  That is worth knowing beyond this block: a perf measurement taken inside the synced tree is not
  measuring the code.
- **It must run HEADED.** In headless Chromium the race does not advance at all: 25 s of wall clock
  produced zero changes to the standings, so every arm would have measured an idle page and agreed.

**TWO BATCHES, NOT SIX — the owner stopped the rotation.** So the frame-train numbers below are
reported per batch rather than pooled into a false precision, and the weight of the result rests on
the browser's own counters, which agree across both.

### The browser's own CPU counters — the load-robust half, per 100 frames

This is the instrument that settles it. `Performance.getMetrics` over CDP gives cumulative
style/layout/script counters; a delta across the same frame window measures **the work**, not whether
the machine happened to keep up with it.

| per 100 frames | today (`flow` @250) | **this branch @250** | reference @1000 |
| --- | --- | --- | --- |
| **layouts**, packed early | **14× / 45.1 ms**, **12.7× / 24.4 ms** | **1× / 6.6 ms**, **1× / 5.8 ms** | 1× / 5.7 ms |
| **layouts**, mid-race | 13× / 18.4 ms, 10.3× / 15.9 ms | 1.3× / **0.67 ms**, 1.3× / **0.47 ms** | 1.7× / 0.55 ms |
| style recalc, early | 24.6 ms, 15.6 ms | 15.8 ms, 14.6 ms | 10.0 ms |
| script, early | 1636 ms, 950 ms | 920 ms, 851 ms | 870 ms |

**FOURTEEN LAYOUTS PER HUNDRED FRAMES IS EXACTLY ONE PER CADENCE TICK.** At 250 ms and a 33 ms frame,
a hundred frames is thirteen ticks — so today's list forces the browser to lay the page out again on
every single tick, and this branch forces **one in a hundred frames, which is none**. Mid-race the
layout TIME falls from ~16–18 ms per hundred frames to **half a millisecond**: a factor of thirty.

### The frame train — per batch, because two batches cannot be pooled honestly

| arm | phase | missed | frame p50 | `rafLate` p50/p90 | stair ms/frame |
| --- | --- | --- | --- | --- | --- |
| flow @250 | early | 82.3 %, 68.2 % | **33.3** (30 fps) | 6.6 / 13.8 | 8.3, 7.1 |
| flow @250 | mid | 72.0 %, 37.8 % | 33.3, 16.7 | 7.5 / 13.9 | 9.1, 3.3 |
| **slot @250** | early | **42.7 %, 47.8 %** | **16.7** (60 fps) | 1.5 / 11.9 | **1.5, 3.2** |
| **slot @250** | mid | **4.7 %, 18.1 %** | **16.7** | 0.5 / 11.2 | **0.7, 2.2** |
| slot @1000 | early | 39.0 % | 16.7 | 0.8 / 12 | 1.4 |
| slot @1000 | mid | **0.0 %** | 16.7 | 0.5 / 1 | **0** |

**THE HEADLINE THE BRIEF ASKED FOR: arm 2 reaches arm 3.** In the packed early phase this branch at
250 ms sits at 42.7 % missed against the 1000 ms reference's 39.0 % — inside the batch-to-batch
spread. Mid-race it is 4.7 % against 0 %. Today's build is at 82.3 % and 72 % in the same windows.
**The lively list is close to free even in the pack**, and the frame interval says the same thing more
bluntly: today's build runs the packed phase at 30 fps and this one at 60.

**What the early phase is still paying, and it is not the list.** Even at a 1000 ms cadence the early
window misses 39 % of frames — so what remains there is the race itself at a hundred racers, not the
standings. That is the next thing to look at if he wants the pack smoother, and it is a different
block.

**One confound, named rather than buried.** Part of this branch's win comes from the panel now being
a scroll viewport: only about thirteen of the hundred cards are on screen at his window size, so the
browser paints far fewer of them. That is a real effect of this branch and it ships with it — but it
is the bounding fix doing work, not only the slot layer, and the layout COUNT (14 → 1) is the part
that is purely the slot layer.

## Tests

`ScoreboardCard.test.jsx` — the card is inert: a re-render with the same props does not run its body,
it carries no place text and no `#`, it reserves the badge column, and it hands its element to the
positioner and gives it back on unmount. **The old file's central test was DELETED with the thing it
protected** — "re-renders when the rank changes" cannot be asserted of a component that takes no
rank. The failure it feared did not go away; it moved.

`ScoreboardSlots.test.jsx` — the crown, the numbering, gold/**silver**/bronze and the fallbacks, the
pitch, a 140-slot field; and that the layer is a `memo` whose only prop is the field size, which is
what "drawn once" is made of. Stated as structure rather than as a render count, because `memo`
skipping is not observable from outside — React reuses the DOM either way — so a "behavioural"
version of that test would prove nothing. What it does catch is somebody adding a second prop.

`scoreboardPositions.test.js` — **where the silent freeze moved.** Both directions: a changed place
must move its card, and an unchanged place must write nothing. Plus late attachment (a card mounting
after a tick is positioned immediately), detachment, and the colour bound to the top three.
**It runs against real jsdom elements on purpose, and that caught a real defect:** the first version
asked "have I already written this colour?" by reading `el.style.color` back, and a browser
normalises `#ddd` to `rgb(221, 221, 221)`, so the answer was always no and every move repainted the
card — the exact cost this block exists to remove, reintroduced by a line that looks like a guard.

`scripts/scoreboard-parity.test.mjs` (was `scoreboard-row-parity`) — **rewritten to compare the
VISIBLE result**, because card data stopped carrying the place. It drives the real positioner over a
real seeded race and, at every cadence tick, checks for each visual position: which racer's card is
translated to that y, what the badge behind it reads, its colour and border, the card's own text
colour, and the finish time — against the expression the row used before any of this work started.

**What it can see:** which racer is at which y; that the ys are a permutation on the pitch grid, so
no two cards can overlap and no slot can be empty; every badge's text and colour; the icon, number
and name on every card; the finish time on exactly the racers that have finished — at every tick of a
race that runs to its end. Plus the badge-width table, and that the tick writes only what moved.

**What it cannot see:** anything needing layout. Neither node nor jsdom measures text, so nothing
there can prove the two layers line up on screen, that 35.333 is the pitch, that the badge column
fits `#100`, or that a long name ellipsises. Those are browser measurements and they are above. What
the file does instead is pin the CSS inputs each one depends on — the shared grid both layers
declare, the shared badge box, the spacer's blank line, the panel's cap and its scroll — so a change
to any of them fails and asks for a re-measurement.

## Acceptance

**All four fingerprints unchanged**, and only one of them had a question to answer at all — the
standings are DOM, so neither the camera's decisions nor the canvas draw sequence can see this work;
they are reported because the brief asks for them and because a silent skip is worse than a number
nobody needed.

| role | value | how |
| --- | --- | --- |
| WORLD | `dc4647be0f55ebdb` | `npm run verify` routed it — `defaults.js` is in the branch diff, from the inherited `SCOREBOARD-CADENCE-1` commit rather than from this one |
| WORLD-OFF | `854018ee5d3d83e1` | run by hand: verify does not route it, and the brief asks for it |
| CAMERA | `d54d6332fb8d36c6` | routed |
| RENDER | `9580ff2e3626b3b9` | routed |

`engine-reach --check` over all 23 changed paths: **1 can reach the race**, and it is `defaults.js`
from that inherited commit. Nothing this block wrote is reachable.

`npm run verify` on the branch: **PASS 13 / FAIL 1 / SKIP 3**, the one failure being `check-index`
for this report not yet being in the index — fixed, and both `check-index` and `check-doc-links` are
green after it. The full client suite (232 s) is inside that PASS.

## Open for the owner

1. **The panel scrolls; it does not shrink.** A hundred rows need 3533 px and his window offers ~450
   for the list, so about thirteen are on screen at a time. Showing the whole field at once needs
   either a smaller pitch or a multi-column layout, and both change how the list looks. His call.
2. **The name column is ~22 px narrower** at a hundred racers — 12 to the badge fitting its box, ~10
   to the scrollbar — so a long name ellipsises earlier. That is the visible price of the two fixes.
3. **The place is no longer in the accessibility tree with the racer.** The slot layer is
   `aria-hidden`, so a screen reader reading a card hears the racer and not the place. Nothing that
   worked stops working — the standings were never keyboard-reachable or labelled — but this is the
   block that made the two separable and it should be the block that says so.

## Files

`ScoreboardRow.jsx` → `ScoreboardCard.jsx`, `scoreboard-row-parity.test.mjs` →
`scoreboard-parity.test.mjs`, because a row is now a slot plus a card. New: `ScoreboardSlots.jsx`,
`scoreboardPositions.js` and their tests, and `scripts/scoreboard-bench.mjs`.
