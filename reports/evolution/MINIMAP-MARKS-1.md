# MINIMAP-MARKS-1 — the minimap says where the race starts and where it ends

**Branch `feat/minimap-start-finish`, off master `4b336419`. Final SOURCE commit `faf379fd` — this
report is the commit after it, and adds no code. Pushed, NOT merged, NOT minted — this is visible
and the owner judges it first.**

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

## PROPOSALS

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
