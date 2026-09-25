# ROCKET-SHAPE-TRUTH-1 — what the shape lever costs, and what it cannot reach

**2026-09-25. Measurement only.** No shipped value changed, nothing minted, no default or config key
added. The arm is applied in memory for the duration of one diagnostic run and written nowhere.

---

## 1 · Does this change the race, or only the picture?

**Both — and it reaches all four fingerprints plus the golden races.**

**Consumers of rocket's `bodyFillX` / `bodyFillY`** (live code only; all twenty racer types declare
the same pair, and many reports quote them — neither is a consumer):

| where | what it does with them |
|---|---|
| `scripts/lib/raceDriver.mjs:372-384` | reads them off the registry; `bodyFillNarrow` = min, `bodyFillLong` = max, into the race |
| `client/src/modules/headlessRaceSimulator.js:181-203` | the same min/max, then `drawnBodyLengthPx` |
| `client/src/modules/raceCore.js:121,214` | `drawnBodyWidthRefPx × bodyFillLong / bodyFillNarrow` — the engine's body length |
| `client/src/modules/raceParams.js:76-133` | the identity's four body facts |
| `client/src/modules/rowLayout.js:236-254` | `computeBodyNarrowRef` — **narrow axis only** |
| `scripts/lib/racerFacts.mjs:51-52` | the registry-vs-instrument comparison set |
| `client/src/screens/RacerEditor/canvasUtils.js` | `measureBodyFill`, which PRODUCES them from artwork |
| `server/src/routes/racers.js` | serves the registry |

**The fingerprint answer, from the tool rather than from judgement.** A one-digit probe
(`bodyFillY: 0.801 -> 0.802`, reverted byte-clean afterwards) put to `engine-reach --check`:

```
ENGINE REACH: 1 of 1 path(s) can change the race:
  client/src/racer-types/RocketRacerType.js
```

and `verify --premerge --dry` on the same probe selected **`world-fingerprint`**,
**`camera-fingerprint`**, **`render-fingerprint`**, **`golden-races`** and `fingerprint-containment`
— every one of the four, plus the goldens.

**The consequence, in one sentence:** a ratio change is a **RACE change and a fingerprint change**,
and — as §3 establishes — it is **not** a drawing change at all.

★★ **THE LARGER FINDING: `bodyFillX/Y` ARE NOT SETTINGS.** `docs/RACER_DATA_MODEL.md:232-253`
defines them as the opaque bounding box of the sprite sheet, union over every frame, alpha >= 10, to
three decimals — a **measurement of the artwork**, under a rule the owner set on 2026-09-02.
`scripts/audit-sprite-crops.mjs` exists to compare the registry against the sheet (a manual
diagnostic, wired into no gate). **A ratio reached by editing the number describes a body the sprite
does not have.** Everything below answers *what the residual would be at that shape*; reaching any of
these shapes means redrawing the sheet.

---

## 2 · The sweep, on the ratio

**How the arms were derived.** The two tracks in the comparison are the two endpoints: space-sprint
runs **rocket** at `0.801 / 0.278 = 2.8813`; river-run runs **duck** at `0.875 / 0.875 = 1.0000`; and
the target is river-run's `residual0 = 29`. The bracket is therefore **[1.0000, 2.8813]** — today's
shape at one end, the shape that already scores 29 at the other — sampled at 2.8813, 2.40, 2.00,
1.60, 1.20 and 1.00. `bodyFillX` is held and only the long axis moves, because SPRITE-PREMISE-1
established that the long axis is the one the rocket is exceptional in and the one this residual is
measured along.

**N = 30 races per cell**, 42 000–45 400 frames per cell, margin 90, both tracks, every arm.

| ratio | space-sprint `residual0` | `residual` | `clipped` | river-run `residual0` | `residual` | `clipped` |
|---|---|---|---|---|---|---|
| **2.8813** (today) | **446** | 973 | 1169 | 159 ✖ | 336 | 537 |
| 2.40 | 430 | 910 | 1130 | 104 ✖ | 239 | 457 |
| 2.00 | 364 | 699 | 980 | 132 ✖ | 250 | 527 |
| 1.60 | 286 | 666 | 890 | 64 ✖ | 183 | 398 |
| 1.20 | 222 | 472 | 605 | 33 ✖ | 83 | 258 |
| **1.00** | **166** | 384 | 516 | **29** | 111 | 199 |

✖ **The river-run cells above ratio 1.00 are NOT physical and must not be read as results.** The arm
scales the duck's own `bodyFillY = 0.875`, so any ratio above **1.143** gives it a body box taller
than its own sprite frame — 1.05 at r=1.2, rising to 2.52 at r=2.88. Only river-run's r=1.00 row
describes a real duck, and it reproduces the baseline 29 exactly. For the rocket all six arms are
physical (`0.278 × 2.8813 = 0.801 <= 1`).

### ★★ The lever moves the number a long way and still cannot reach the target

From **446 to 166** — a 63% reduction — by going all the way to the duck's own shape. **River-run
sits at 29.** A **5.7x** gap survives the most extreme physical arm, so the ratio is **not
sufficient** and something else carries the rest. SPRITE-PREMISE-1 already named a candidate: the
companion "41% less room" is track ORIENTATION — space-sprint's heading runs `|ux| 0.354` against
river-run's 0.951, so a diagonal road is bounded by the frame's 720 px height instead of its 1280 px
width. That is not a sprite property and no shape arm can move it.

### ★★ A caution about reading small differences in this table

The un-armed baseline (`bodyFillY = 0.801` exactly) gives **463**. The armed cell at the *same*
nominal shape (`0.278 × 2.8813 = 0.801001`) gives **446**. **A change of one part in 800,000 moved
the result by 3.7%.** Differences of a few percent between adjacent arms are therefore not
meaningful. The 446 -> 166 trend is, because it is an order of magnitude larger than that
sensitivity.

### Bodies touching

`clipped` falls with the ratio as well — 1169 -> 516 on space-sprint — so in this measurement a
narrower body does not buy the residual at the price of more clipping. Overlap *between* bodies is
not something this diagnostic reports, so nothing here rules a pile-up in or out.

---

## 3 · The pictures — and why there is nothing to photograph

★★ **A ratio arm changes no pixel of the rocket, so a side-by-side would be a set of identical
images.** Established, not assumed:

- `bodyFillNarrow = min(X, Y)` is what `computeBodyNarrowRef` (`rowLayout.js:236-254`) uses to size
  the drawn sprite, and the arm **holds `bodyFillX`** — so the narrow-axis normalisation never moves.
- `bodyFillLong` reaches only `drawnBodyLengthPx` (`raceCore.js:214`,
  `headlessRaceSimulator.js:203`) — the engine's *model* of body length, used for spacing and
  separation.
- The draw path reads no `bodyFill` at all: a search of `client/src/screens/RaceScreen/drawing/`
  returns a single match, inside a test.

**So the arm changes what the engine BELIEVES about the body's length, not what is drawn.** This is
the trap the brief names for `displaySize`, wearing different clothes: sweeping it would have
produced a gallery of identical pictures and looked like evidence. **To change how the rocket looks,
the sheet has to be redrawn** — after which `bodyFillY` is re-measured from it rather than chosen.

### What he can actually look at

Today's rocket, at the moment it is biggest on screen:

| | |
|---|---|
| track | **space-sprint** |
| Quick Test seed | **9** |
| stage | `quiet` |
| when | **35.4 s** — a `BATTLE_ZOOM` at about 21% of the race, the tightest shot of the mid-race (`effZoomX` 4.36) |

**What to look for:** whether the rocket reads as a long thin body at that size, and whether the gap
it keeps to the racers beside it looks right. The measurement says the long axis is **2.881x** the
narrow one, and that only that ratio reaches the screen; his eye is the only thing that can say
whether that is the shape he wants drawn.

★ The second is taken from the harness arm's dump of space-sprint seed 9 (5,869 frames), which runs
40 racers where a Quick Test runs 20 — so the clock is a guide to the phase, not a frame-accurate cue.
