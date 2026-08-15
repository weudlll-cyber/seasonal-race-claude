# MINIMAP-MARKS-1 — the minimap says where the race starts and where it ends

**Branch `feat/minimap-start-finish`, off master `4b336419`. TWO blocks, one branch, because master
gets this visible change once. Pushed, NOT merged, NOT minted.**

| block            | what                                              | source commit | RENDER              |
| ---------------- | ------------------------------------------------- | ------------- | ------------------- |
| MINIMAP-MARKS-1  | the start and finish marks                        | `faf379fd`    | `2edf583c861a9254`  |
| MINIMAP-TAIL-1   | the unraced stretch behind the finish, washed down | `f7b960dd`    | `0e04fa4a5e9c3b85`  |

**THE OWNER JUDGED MINIMAP-MARKS-1 ON A PRODUCTION BUILD ON 2026-08-15 AND ACCEPTED IT.** The green
start bar and the checkered finish stay as they are. MINIMAP-TAIL-1 below is the one addition he
asked for, and the sections above it are the record of what he accepted, unchanged.

One piece. The minimap drew the band, its two edges and the racer dots. On an open track the band
runs on past the finish and looks there exactly as it does before it, so there was no way to see how
much race was left.

---

## What was built

Two marks, both **bars across the band** at `getPosition(t, ±0.5)`, drawn **before** the dot loop.

| topology                          | start                | finish                  | drawn as                                            |
| --------------------------------- | -------------------- | ----------------------- | --------------------------------------------------- |
| OPEN (5 tracks)                   | t 0                  | `st.finishT` (0..1)     | two marks: a solid green bar, and a checker         |
| CLOSED (5 tracks) — same point    | t 0                  | `finishT` laps → t 0    | **ONE** mark: the checker on a green plate          |

**The bar is not a new idea of where the race is.** `drawOpenTrackFinishLine` draws the world's
finish gate at `getPosition(ft, 0)` extruded by `openTrackHW`, `openTrackHW` is `trackWidthPx / 2`,
and `trackWidthPx` is the `track.width` that `getPosition` offsets by. The minimap bar is therefore
**the same segment the racers cross**, and it stays that way by construction rather than by two
places agreeing.

**The caller hands the two t values in.** The minimap still reads nothing but the shape it is given
— no config key was added, and nothing the director owns is touched. A closed race's `finishT` is a
LAP COUNT, and the wrap `((t % 1) + 1) % 1` — the same normalisation
`CameraDirector._finishLineWorldPoint` uses — turns "3 laps" back into the gate at 0. That is why
the call site needs no open/closed branch.

## The form, and why — decided against measurement, not taste

**The sizes were nearly wrong, and the way they were nearly wrong is the useful part.** The first
reading of the geometry put the bar at about 50 panel px and the marks were drawn for that. Measured
on all ten shipped tracks, **the bar is 12–22 panel px**, and everything was re-sized against that
number. A mark tuned for 50 px would have been a blob on half the game.

| decision                                    | what it is                                   | why at 280x160                                                                                        |
| ------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| a BAR, not a dot or a pin                    | inner edge to outer edge                     | it inherits the band's own width and says which way the track runs there; a dot says neither          |
| start = **solid green**                      | 4 px thick                                   | green means go, and a solid bar is the simplest thing that is not a checker                            |
| finish = **black/white checker**             | 4 px thick, cells derived from bar length     | **pattern first, colour second** — a 4 px colour stripe on a tan band is not a distinction, a checker is |
| checker cell count DERIVED, floored at 4     | `round(len / 5)`, clamped 4..10               | on a 12 px bar a fixed cell size degenerates into two blocks; the floor keeps it alternating           |
| coincidence decided in **panel px** (< 6)    | centres of the two bars                       | holds on both topologies and at any track size; two bars that close smear whatever t called them       |
| combined = checker **on a green plate**      | 3 px past each end, 1 px proud each side      | one mark saying both things; green still means start, so the language learned on open tracks holds     |

**Dropped alternatives, recorded so they are not retried:**

- **`S` / `F` letters.** The panel affords about 8 px of type, over a busy fill and beside a cyan
  edge line. Unreadable at the size that matters, and a bar carries the track's direction for free.
- **A green/white checker for the combined mark** (instead of black/white on a green plate). It
  reads on a closed track — where there is nothing to confuse it with — but it makes "checker" mean
  two different patterns depending on topology, which is the opposite of a language.
- **Two stacked bars at the coinciding point.** This is what the brief asked to avoid and it is
  right to avoid: at 4 px thick they are one smear that claims to be only the finish.

## Verified by eye, on the real module

`Minimap.js` and `EditorShape.js` were loaded into a browser over the real track JSON and drawn on a
real canvas at 1:1, then magnified with smoothing off so the **real pixel grid** is what was judged.
Four cases: luger-hill and seatrack (OPEN), city-circuit and dirt-oval (CLOSED).

- **The closed combined mark reads immediately** — a green plate with an unmistakable checker in it.
- **Both open marks read**, and are not confusable with each other or with the cyan edge.
- **The finish checker reads SMALLER than the start bar on open tracks.** Both are legible; the
  saturated green pulls the eye more than black/white does. Since "how much race is left" is the
  question the block exists for, that weighting is arguably backwards — but it is a look question,
  which is the owner's, and it is one constant away either direction.

## Fingerprints

**RENDER moved. WORLD, WORLD-OFF and CAMERA did not.** The selection was made by the tools, not by
assertion:

```
$ node scripts/engine-reach.mjs --check client/src/modules/camera/Minimap.js \
      client/src/modules/camera/Minimap.test.js \
      client/src/screens/RaceScreen/renderRaceFrame.js docs/CAMERA_DIRECTOR.md
ENGINE REACH: none of 4 path(s) can reach the race engine.        (exit 1)
```

That is WORLD and WORLD-OFF, with **explicit paths** — "none of 4", not "none of 0". CAMERA is
answered by the guard's own declaration rather than by this tool, which only knows the world hull:
`npm run verify` routed `camera-fingerprint` as **"nothing changed · declares 38 file(s) by import
closure"**, i.e. none of the changed files is inside what it drives.

**RENDER, measured FRESH on the final commit `faf379fd` (clean tree):**

```
RENDER 2edf583c861a9254  (seed=5601 camSeed=1439767152, 10 tracks, 40 racers, 5600 frames)
```

against the recorded `0d5854a652c69d87`. **NOT minted, and `docs/fingerprints.json` is untouched.**

## The stamp that tripped, and why it was re-stamped rather than re-measured

`docs/CAMERA_DIRECTOR.md`'s tracking-lag stamp declares `depends=client/src/modules/camera/`, which
`Minimap.js` is inside — so the pre-commit guard fired. It deliberately cannot tell a change that
matters from one that does not, and says so in its own header.

**What settles it is a fact, not a judgement: `scripts/tracking-lag.mjs` cannot reach the file.**
Its load closure is `lib/raceDriver.mjs` and, through it, `defaults.js`, `EditorShape.js`,
`CameraDirector.js`, `raceCore.js`, `durationModel.js`, `rowLayout.js`, `racer-types/index.js`,
plus `frameGeometry.js` and `framingRule.js` imported directly. `Minimap.js` is in none of them, and
its only importers are the draw path (`renderRaceFrame.js`) and two consumers of its panel
CONSTANTS (`overlayGeometry.js`, `WinnerCard.test.jsx`) — which did not change. A measurement that
never loads the file cannot move. The reasoning is written **beside the stamp**, not only here.

Placeholder SHA in the change commit and a follow-up commit naming the real one, which is the
convention `febffb4d` / `e91e7a61` / `2adba27f` established: a commit cannot name its own SHA.

## Tests — five added, four kept, none deleted

The brief predicted the arc-count test would break by construction. **It did not**, and the reason
is worth stating: the marks are drawn with strokes, so the arc count is untouched. It was kept and
**strengthened into the property it was really after** — the racer dots are the only circles on the
panel — and it now runs with marks passed, so a future mark drawn with dots would trip it.

The ctx mock now **records what was drawn and in what order**. Layering (marks under dots) and one
drawing being distinguishable from another are not expressible as call counts. The marks are
identified **structurally** — the only two-point strokes in the module, where band edges carry 81
points and rings carry none — so the tests do not pin the palette.

| test                                       | what breaks if it is deleted                                                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| OPEN: two marks, one per t, tellable apart | the whole point of the change goes unguarded, and start/finish could silently swap                                                  |
| CLOSED: one mark says both                 | the closed case regresses to two stacked bars claiming to be only the finish; also guards the **lap-count wrap** (3 laps → gate at 0) |
| marks drawn BEFORE the dots                | a later edit moves them below the dot loop and hides racers exactly on the line                                                     |
| no marks when none are passed              | the marks become unconditional, so a caller with no start/finish to give crashes or invents a t                                      |
| n+1 arcs, marks or not *(kept, widened)*   | a mark drawn with dots inflates the dot layer silently                                                                              |
| save/restore *(kept, reason added)*        | the module's `lineCap='butt'` escapes into the caller's context and changes how the race canvas strokes                              |

`lineCap` is set explicitly because the outer save/restore protects the **caller** from us; it does
not protect us from a caller arriving with `'round'`, which would bleed every checker cell into its
neighbour.

## Hygiene

| file                                        | before | after | delta |
| ------------------------------------------- | -----: | ----: | ----: |
| `client/src/modules/camera/Minimap.js`      |    133 |   270 |  +137 |
| `client/src/modules/camera/Minimap.test.js` |     83 |   215 |  +132 |
| `renderRaceFrame.js`                        |    481 |   488 |    +7 |

`Minimap.js` after: 167 code, 74 comment, 30 blank.

**Removed: nothing.** This change orphans no code — it adds a layer, it does not replace one. Saying
so plainly is better than manufacturing a deletion to look thorough.

**Extracted:** four helpers out of the render function (`markT`, `bandBarAt`, `grownBar`,
`drawSolidBar`, `drawCheckerBar`, `drawStartFinishMarks`), so `renderMinimap` keeps its shape: a
flat list of layers, one per paragraph.

**Noticed and deliberately left alone:**

1. **Three near-identical edge walks** in `renderMinimap` — the band fill, the outer outline and the
   inner outline each `moveTo` then loop `lineTo` over the same arrays. A faithful extraction would
   not change the draw-call order, so it is safe — but it would land **inside the same moved RENDER
   hash as the marks**, and two changes hiding in one hash is exactly what that instrument is for.
   It belongs in its own commit.
2. **`overlayGeometry.js` and `WinnerCard.test.jsx` import only the panel constants** — three
   consumers of `MINIMAP_W/H/MARGIN` and no drift between them. Nothing to do.

## Refuted, so it is not re-tried

**"The mark bar does not span the band."** Comparing `getPosition(t, ±0.5)` against
`getEdgePoints()[i]` at the **same index** reports gaps up to **502 world px** on luger-hill, which
reads as a broken mark. It is not an across-track error at all: the centre spline and the two edge
splines are arc-length parameterised on their **own** curves, so equal indices are not the same
place along the track. Measured against the **nearest point on the edge polyline** instead, the
worst gap on any of the ten tracks is **1.5 panel px**. Compare curves, not indices.

**"The dark wedges at the ends of an open band are the marks' fault."** They are not — a control
render with `marks: null` shows them unchanged, so they are pre-existing. The obvious cause was
also checked and **refuted**: the end cap `|outer[0] − inner[0]|` is **exactly** the track width on
all five open tracks (250/250, 300/300 ×4), so a mis-shapen cap is not it. Cause still open; see
PROPOSALS.

> **CORRECTION, 2026-08-15 (MINIMAP-TAIL-1) — THERE ARE NO DARK WEDGES. I misread a screenshot.**
> The paragraph above is left as written because this record is append-only, but its premise is
> wrong and so is the proposal built on it. Histogramming the actual canvas — the very
> `marks: null` luger-hill render the claim came from — gives **one** band colour,
> `109,101,68,255`, across **110601 px**; the next most common value is the panel border. There is
> no second, darker fill anywhere in the drawing. Confirmed a second way: the band drawn from
> `getEdgePoints` by index and from `getPosition(t, ±0.5)` are **visually identical**, wedges and
> all, so the index-pairing hypothesis in PROPOSAL 2 was answering a question that does not exist.
> **What is really there** is that the two END CAPS of an open band are never stroked — the
> outlines run along `outer` and along `inner` and never across the ends — so the band's last few
> pixels have no cyan boundary and read as flat against the outlined body. Downscaling the
> screenshot did the rest. **The lesson is the cheap one: a colour claim is settled by sampling
> pixels, not by looking at a resized picture.**

## Verify and handover

`npm run verify` on the final branch state — **PASS 14, FAIL 0, SKIP 6**, 222.9 s. (The pre-commit
run over the source alone was PASS 11 / SKIP 9; the three extra guards are the document ones that
`docs/CAMERA_DIRECTOR.md` brought in.) Routing selected `render-fingerprint` and skipped
`world-fingerprint` and `camera-fingerprint` as "nothing changed" — the selection this block wanted
and did not have to argue for.

**No CI run exists for this branch, and that is by design** — `.github/workflows/ci.yml` runs on
pushes to master and PRs targeting it. There is nothing to wait for until this is proposed.

**Production build served per R10**, from the branch tip, and the pill was read **from the served
bundle** rather than assumed — `branch: feat/minimap-start-finish`, `dirty: false`, `reason: null`.
**The SHA is deliberately not quoted here.** It is the branch tip at build time, and every commit on
this branch after `faf379fd` is documentation, so a SHA typed into a report would be a second home
for a number that moves. Read it in the HUD before judging; that is the half of R10 that has already
cost two test runs.

Served from `C:\Users\weudl\AppData\Local\racearena-preview` (outside the synced tree), on
**http://localhost:4173/**. The API on 4000 was checked and already answers
`access-control-allow-origin: http://localhost:4173`, so the R10 CORS trap is not armed here.

**Fastest way to see it, one open track and one closed:**

1. Open **http://localhost:4173/**, sign in, and use a **Quick Test** race (a plain "Start Race" is
   unseeded, so it cannot be replayed).
2. **CLOSED — `dirt-oval` or `city-circuit`:** the combined mark is on the band at the start/finish
   gate and is visible from the first frame after the countdown. It is the one to judge first: it is
   the mark that had to carry two meanings.
3. **OPEN — `luger-hill` or `seatrack`:** the green start bar is at the field's end of the band, the
   checker is at `finishT`, and **the band visibly continues past it**. That gap is the thing that
   did not exist before, and it reads best once the field has left the start.

## PROPOSALS (MINIMAP-MARKS-1)

1. **Give the finish mark the weight the question deserves.** On open tracks the green start bar
   currently out-shouts the checker, and "how much race is left" is about the finish. One constant
   (`MARK_THICKNESS` for the checker alone, or a thin dark rim under it) fixes it. It is a look
   change, so it wants his eye and not a measurement — worth pairing with whatever verdict he gives
   on the marks themselves.

2. **Find the open-track band wedge.** The dark shapes at both ends of an open band on the minimap
   are pre-existing and the end-cap explanation is refuted (above). The remaining suspect is the
   fill polygon pairing `inner[i]` with `outer[i]` while the two splines are parameterised on their
   own arc lengths — the same skew that made the 502 px reading. If that is it, the fix is to build
   the fill from `getPosition(t, ±0.5)`, which would make the band, the edges and the new marks all
   come from one source. **It would move RENDER**, so it is its own block.

3. **The three edge walks want one helper** (hygiene item 1). Small, safe, and it should ride its
   own commit so the RENDER hash means one thing.

4. **A "you are here" mark would complete the panel.** The minimap's stated job includes showing
   where the shot is, and today only the dots imply it. The camera's frame footprint as a thin
   rectangle would say it directly — but it reads what the director owns, which this module has
   deliberately never done, so it is a design decision and not a small one.

---

# MINIMAP-TAIL-1 — the unraced tail behind the finish

**Same branch, source commit `f7b960dd`. Still not merged, still not minted.**

The owner accepted the marks and asked for one addition: on an open track the band runs on past the
finish and that stretch is never raced, so it should read differently and make the extent of the
race obvious.

## What was built

The stretch from `finishT` to the end of the geometry is **washed down** — it keeps the band's hue
and loses its light. **Open tracks only.** A closed loop is raced in full and gets nothing, decided
by the same `shape.isOpen` the band already asks about for its `closePath`, not by a second rule
invented for this.

Draw order, and each position is load-bearing:

| # | layer                    | why there                                                                                    |
| - | ------------------------ | -------------------------------------------------------------------------------------------- |
| 1 | band fill                | unchanged                                                                                     |
| 2 | **the tail wash**        | **before the edges**, so the cyan outline still runs through it                                |
| 3 | outer + inner outlines   | unchanged                                                                                     |
| 4 | start / finish marks     | the checker lands **on** the seam, not under it                                                |
| 5 | racer dots               | dots keep full contrast over both fills                                                        |

**Position 2 is the one that matters.** Washing after the outlines would dim the cyan too, and the
tail would then read as *"the track ends here"* — the opposite of true, and the one misreading this
addition could cause.

## The seam is the checker, and it is measured

**Built from `getPosition(t, ±0.5)` — the same source the finish mark uses — so the tail's leading
cross-section IS the mark's bar.** The alternative was to take it from the band's own
`getEdgePoints(80)` by index, and the brief was right to warn: those two parameterisations disagree
by up to **502 world px** on luger-hill, which is an along-track offset and would have put the seam
visibly off the checker on the longest tail in the game.

Measured by driving the **shipped `renderMinimap`** through a recording context — not by
re-deriving the maths — on all ten tracks at four finish positions:

| measurement                                       | worst, all open tracks × `finishT` ∈ {0.6, 0.75, 0.9, 0.95} |
| ------------------------------------------------- | ------------------------------------------------------------ |
| **SEAM** — tail's leading edge vs the checker bar | **0.000000 panel px** — exact, on every case                 |
| **SLIVER** — tail's side vs the band it washes    | **1.74 panel px** (space-sprint; ≤ 0.75 on most cases)       |

Closed tracks: **no tail drawn**, one area fill, on all five.

The sliver is not zero and cannot be: the tail is washing a band drawn from the *other* source, so
the 1.5-ish px disagreement already recorded above shows up as a hairline along the tail's flank. It
is below the width of the cyan edge that covers it.

**The first version of this measurement read SEAM 60–240 px and was WRONG — the instrument was.**
Two faults, both worth naming because both are easy to repeat: the checker's cells are **separate**
two-point strokes with **different midpoints** on a curved track, so grouping them by midpoint
scattered the bar and compared against a random cell; and nearest-**vertex** distance to the band
polygon measures its 80-sample spacing, not misfit. Chaining segments by shared endpoints and
measuring point-to-**segment** gives the numbers above. A measurement that disagrees with a
construction proof should make you doubt the measurement first.

## The form, and the dropped alternatives

**A wash, not a colour.** The raced part must be what the eye finds first; darkening recedes and a
hue advances. Verified at 1× and 2× on the real module over real geometry — luger-hill (short
tail), seatrack (long), space-sprint (longest, and the worst sliver), dirt-oval (no tail).

- **Diagonal hatching** — dropped. The classic "not in play" texture, and noise on a band measured
  at 12–22 panel px.
- **A distinct hue (grey-blue, red)** — dropped. It pulls the eye, which is exactly what
  *subordinate* forbids.
- **Washing after the edge outlines** — dropped, and it is the trap: it dims the cyan and the tail
  stops reading as track.
- **A fixed sample count for the tail** — dropped. The count is derived from the tail's own span at
  the band's density, so the outline follows the curve exactly as closely as the band beneath it;
  fixed counts are coarse on a long tail and wasteful on a short one.

## The call-site comment was wrong, and is fixed

It said the field forms at t 0 on both topologies. **It does not.** On an OPEN track every row is
**ahead** of the line — `tStart = (totalRows − rowIndex) × ΔT`, `raceCore.js:149` — so the start bar
sits just **behind** the rearmost row. On a CLOSED track the front row is on it and the rest behind
(`tStart = −(rowIndex × ΔT)`). The line is the mark; the field is the dots. **The mark itself stays
at t 0**, which was and is correct — only the sentence was wrong.

## Fingerprints

```
$ node scripts/engine-reach.mjs --check client/src/modules/camera/Minimap.js \
      client/src/modules/camera/Minimap.test.js client/src/screens/RaceScreen/renderRaceFrame.js
ENGINE REACH: none of 3 path(s) can reach the race engine.        (exit 1)
```

CAMERA again by the guard's own declaration: verify routed `camera-fingerprint` as **"nothing
changed"**.

**RENDER, measured FRESH on the final source commit `9d5d3597` with a clean tree:**

```
RENDER 0e04fa4a5e9c3b85     (was 2edf583c861a9254 after MINIMAP-MARKS-1; recorded 0d5854a652c69d87)
```

**NOT minted; `docs/fingerprints.json` untouched.**

## Tests — four added, twelve total

| test                                        | what breaks if it is deleted                                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| OPEN washes a tail, fill distinct from band | the addition itself is unguarded; also pins the tail to the track END, and `getPosition` **clamps** rather than throwing, so nothing else would notice a tail running past t 1 |
| the seam IS the finish mark, to 1e-6 px     | the one thing that makes the tail honest. Building it from the mark's source is what puts the seam under the checker, and only this test says so |
| CLOSED draws no tail                        | a tail on a closed track would be a lie — and `finishT` there is a lap count that wraps to 0, so an ungated tail would wash the **entire** band |
| the tail precedes the marks and the dots    | the wash lands on the checker or the racer dots, dimming the two things it exists to make legible                              |

The ctx mock now records **fill paths** as well as strokes, so an AREA is distinguishable from a dot
without naming a colour: racer dots call `fill()` after an `arc()`, which adds no path point.

## Hygiene

| file                                        | after MARKS-1 | after TAIL-1 | delta |
| ------------------------------------------- | ------------: | -----------: | ----: |
| `client/src/modules/camera/Minimap.js`      |           270 |          332 |   +62 |
| `client/src/modules/camera/Minimap.test.js` |           215 |          288 |   +73 |
| `renderRaceFrame.js`                        |           488 |          493 |    +5 |

Against master: `Minimap.js` 133 → 332, `Minimap.test.js` 83 → 288.

**Removed: nothing.** Again this adds a layer rather than replacing one, and again saying so is
better than inventing a deletion.

**Extracted:** `drawUnracedTail`, one function, beside the mark helpers.

**Noticed and deliberately left alone:**

1. **There are now FOUR ribbon walks in the file** — band fill, outer outline, inner outline, and
   the tail. They cannot share a helper as things stand, because the first three read
   `getEdgePoints` and the tail reads `getPosition`. **That is the unification proposal below, and
   it is now much better evidenced than it was**: the tail proves the technique works on all ten
   tracks, and the sliver number *is* the distance between the two sources.
2. **The two end caps of an open band are never stroked.** Real, cosmetic, pre-existing, and the
   thing actually behind the retracted "wedge" claim. Proposal below.
3. **`getPosition` clamps t on open tracks rather than rejecting.** The tail relies on it and the
   test pins the consequence, but a caller passing 1.4 would silently get the track end. Left as
   is: that is `EditorShape`'s contract, not this module's to change.

## PROPOSALS (MINIMAP-TAIL-1)

1. **Build the band fill and the edge outlines from `getPosition(t, ±0.5)` too.** Then the band, the
   edges, the marks and the tail all come from **one** source; the sliver goes to exactly 0, the
   four ribbon walks collapse into one helper, and the "compare curves, not indices" trap stops
   existing in this file. The evidence is already in: drawn both ways side by side on luger-hill,
   seatrack and space-sprint, the bands are **visually identical**, so this is a simplification with
   no look change to argue about. **It moves RENDER**, so it is its own block.

2. **Stroke the two end caps on open tracks.** One `lineTo` at each end of the outline pass. It is
   the real defect behind the retracted wedge claim: the band's ends are the only part of it with no
   cyan boundary, which is why they read as unfinished. Cheap, and it also tidies the tail's far end.

3. **Let the tail say how much is left, not only where it ends.** The wash is binary today. If he
   wants more, the tail is the natural place to carry a progress reading — but it is a new idea
   rather than a fix, and the panel is already carrying four things.

4. **A guard for draw ORDER in this module.** Three of the twelve tests now assert layering, one per
   pair, and they will keep multiplying as layers are added. One property test — "the layers appear
   in this declared order" — would replace them and would catch a new layer inserted in the wrong
   place, which is the mistake this module is now most exposed to.

---

# THE SHIP — 2026-08-15

**The owner judged the marks and the unraced tail on a production build on 2026-08-15 and accepted
both.** One merge, one tag, one mint, because master gets a visible change once.

| | |
| --- | --- |
| merge commit | `8a2dacab` — `merge(MINIMAP-MARKS-1 + MINIMAP-TAIL-1)` |
| tag | `v-ship-minimap`, annotated, registered in `docs/TAGS.md` in the same push |
| return point | `v-ship-minimap^1` — derivable, so no `pre/*` tag was cut (TAG-SWEEP-1) |
| branch | `feat/minimap-start-finish`, deleted at the origin after the merge |

**The diff was read before merging and it is exactly the six files this work touched** — the two
minimap sources, the call site, the stamp document, and the two report files. Nothing rode along
from elsewhere.

## What was measured on the merge, and what deliberately was not

**Per instrument, the question asked was "does any merged file lie inside the closure this
instrument actually reads", computed with the repo's own `scripts/lib/routing.mjs` `closureOf`
walked from each guard's declared `reach`.** That is a stronger statement than a matching hash: a
hash says "it did not move this time", a closure says "it cannot".

| role       | closure  | merged files inside                        | action                    |
| ---------- | -------: | ------------------------------------------ | ------------------------- |
| WORLD      | 36 files | **none**                                    | not run — cannot move     |
| WORLD-OFF  | 36 files | **none** (same instrument)                  | not run — cannot move     |
| CAMERA     | 36 files | **none**                                    | not run — cannot move     |
| RENDER     | 55 files | `Minimap.js`, `renderRaceFrame.js`          | **measured fresh**        |

**`engine-reach` was deliberately not used here.** It answers "does the DIFF reach the engine", and
on a committed merge there is no working-tree diff for it to read — its verdict would have been a
sentence, not evidence. The closure walk is the same machinery `npm run verify` routes with, so it
cannot drift from what the guards themselves believe.

**A first attempt at this check was wrong and is worth recording**: it read each guard's declared
`files`/`dirs`, which are empty for all three, and concluded that *nothing* was inside *any*
closure — including RENDER, which plainly reads the file that changed. The declaration names ENTRY
POINTS in `reach`; the closure is computed transitively from them. A membership test that answers
"none" for every instrument is reporting its own bug.

## Fingerprints — before, after, and which were minted

| role       | recorded before   | measured on `8a2dacab` | minted?                                     |
| ---------- | ----------------- | ---------------------- | ------------------------------------------- |
| RENDER     | `0d5854a652c69d87` | `0e04fa4a5e9c3b85`     | **YES** — the movement the owner accepted   |
| WORLD      | `dc4647be0f55ebdb` | not run (see above)    | no — unmoved, and no movement to record     |
| WORLD-OFF  | `854018ee5d3d83e1` | not run (see above)    | no                                          |
| CAMERA     | `ff2bc42af377b5cf` | not run (see above)    | no                                          |

**RENDER was measured on the merge and not carried across from the branch.** It happens to equal the
branch tip's value, which is what a merge of a fast-forwardable branch should give — but "happens to
equal" is the point: it was re-derived rather than copied, because the branch and the merge are
different commits and only one of them is what ships. `docs/fingerprints.json` is the one home and
carries the new value, the superseded one, and why it moved.

**A mint records a MOVEMENT, so three roles were not minted.** Re-stamping an unmoved value would
put a 2026-08-15 date on a measurement nobody took.

## Sweep

`feat/minimap-start-finish` deleted at the origin and confirmed absent with `git ls-remote`. No other
remote branch is already contained in master.

## CI

Green on the merge SHA — the result, not a prediction; the run is named in the night report.
