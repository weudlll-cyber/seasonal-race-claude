# SPRITE-SIZE-OVERVIEW-1 — why the racers are bigger in the wider shot

**2026-08-19 · branch `invest/sprite-size-overview` off master `27a63dee` · INVESTIGATION ONLY ·
nothing changed, so no fingerprint can move · 4173 untouched**

## The one-line answer

**The sprite size stops following the zoom.** `minDrawnFrameFrac` ([defaults.js:208](client/src/modules/storage/defaults.js#L208))
pins the drawn racer at **32.4 screen px** — `0.045 × 720` — on every shot wider than about 285
world px across the frame. Above that width the sprite is a **constant**, so the wider the shot gets,
the bigger the racers are *relative to the world behind them*. That is what the eye reports as
"bigger".

The binding line: [autoSpriteScale.js:118](client/src/modules/autoSpriteScale.js#L118) —
`if (proportionalScreenPx < minScreenPx) return minScreenPx / (displaySize * frameEffZoom)`, reached
from [renderRaceFrame.js:137-145](client/src/screens/RaceScreen/renderRaceFrame.js#L137-L145).

**One correction to the premise, and it matters.** The sprite is never *larger in canvas pixels* in
the wider shot. It is **identical** — 32.4 px in both of the owner's frames. What grows is the ratio
between the drawn sprite and the racer the world actually contains: **1.75× → 2.13×**.

## The two moments, side by side

space-sprint, seed 9, 60 racers, 1280×720, shipped camera config, the Quick-Test roster (a racer's
name is an engine input, so a nameless field runs a different race).

| | **A — mid-race, spread, legible** | **B — wider, piled up** |
| --- | --- | --- |
| when | t = 40.0 s, leader at 0.70 | t = 42.0 s, leader at 0.74 |
| state | OVERVIEW | OVERVIEW |
| delivered zoom | 1.29707 | 1.06667 |
| **world across frame** | **658 px** | **800 px** (21.6 % wider) |
| reference width (`bodyNarrow`) | 9.5 world px | 9.5 world px |
| proportional size before bounds | 18.5 px | 15.2 px |
| FLOOR `minDrawnFrameFrac × 720` | 32.4 px | 32.4 px |
| CEILING `maxTargetScreenPx` | 160 px | 160 px |
| **binding term** | **FLOOR** | **FLOOR** |
| **drawn sprite** | **32.4 px** | **32.4 px** |
| over-scale (drawn ÷ true) | **1.75×** | **2.13×** |
| nearest-neighbour distance | 44.6 px | **26.9 px** |
| gap between drawn bodies (median) | **+12.2 px** | **−5.5 px** |
| racers on screen | 18 | 51 |
| racers overlapping a neighbour | 4 | **40** |
| label form | numbers | numbers |
| label width | 8.0 px | 8.0 px |

**What sets the sprite size at A:** the readability floor — the proportional size (18.5 px) is below
32.4 px, so the floor replaces it.
**What sets the sprite size at B:** the same floor, by a wider margin — 15.2 px against the same
32.4 px.

The floor is binding on **79 of the 125 sampled frames** of this race, and on **every OVERVIEW frame
below zoom 2.27**. Sprite size and zoom are decoupled across that whole range.

## The three parked candidates — checked, with values

| candidate | verdict |
| --- | --- |
| **the single body size** | **ACTIVE, not the cause.** `displaySizeScale` = 0.20213 (`bodyNarrow` 9.5 world px against `displaySize` 47). It is one number for the whole race and is *identical* in both frames, so it cannot explain a difference between them. |
| **the 285 cap** | **DOES NOT BIND HERE.** space-sprint's effective start width is exactly 285.0 px, so `Math.min(285, effW)` returns `effW` unchanged: capped `bodyNarrow` 9.5000 = uncapped 9.5000. Ruled out on this track. It would bind on a wider one. |
| **`_drawnBodyWidthRefPx` ≈ 40 % of the drawn sprite** | **ACTIVE, and it is the floor's shadow.** The reference is **57.1 %** of the drawn sprite at A and **46.9 %** at B — bracketing the median 44.6 % that [CameraDirector.js:2198](client/src/modules/camera/CameraDirector.js#L2198) already records. It is not an independent defect: the reference follows the world while the drawing is pinned, so the gap between them *is* the over-scale. Everything reasoning about the reference — the corridor guarantee, the label offset — is reasoning about a racer half the size of the one on screen. |

**None of the three explains "bigger in the wider shot", because nothing does — the sprite is
constant.** What explains it is the floor, above.

## The second question: would numbers be readable at that size?

Measured at moment B's zoom, for the 51 racers carrying a label:

| | width | against 26.9 px of space between neighbours |
| --- | --- | --- |
| **start number** (≤3 chars) | **8.0 px** | 30 % — fits with room to spare |
| **name** (median) | **60.3 px** | **224 %** — cannot fit |
| **name** (longest in this field) | 164.8 px | 613 % |

**How much of the overlap is sprite and how much is label:**

- sprite: neighbours overlap by **5.5 px**, which is 17 % of the 32.4 px sprite;
- name: would overlap by **33.4 px**, 124 % of the space available — **6.1× the sprite's
  contribution**.

**So: it is both, and the labelling dominates.** At 32.4 px the sprites do overlap and that is the
floor's doing — but by a sixth of what a name costs. **With numbers the picture is readable at that
size; with names it is not, and no plausible sprite size rescues it** — the sprites would have to
drop to about 10 px, a third of the readability floor, before a 60 px name stopped colliding.

## What I could NOT establish

**Where the owner's NAMES come from — not established.** Under the shipped config every label on the
track is a start number and the name form is never even offered:
`labelNamesWhenRoom` is **false** ([defaults.js:757](client/src/modules/storage/defaults.js#L757)),
so `wideLabelOf` is passed as `null` ([renderRaceFrame.js:248](client/src/screens/RaceScreen/renderRaceFrame.js#L248))
and `tagWide` stays empty, which is the only thing the renderer consults to draw a name. Ruled out,
by running each:

- **the shipped default** — 0 names on all 125 sampled frames;
- **`labelNamesWhenRoom: true`** — still 0 names on all 125 frames. With 40–51 racers overlapping,
  a 60.3 px name box is never clear for the 1200 ms the entitlement needs, so the layout correctly
  refuses every one;
- **the start-formation roll call** — see the defect below; it draws numbers.

The remaining explanation is a **stored camera config** differing from `defaults.js` in a way this
harness cannot see — a stored key beats the default per key, forever. Reading
`localStorage['racearena:cameraConfig']` on his machine would settle it in one line.

**The finish gate before the run-in — not reproduced.** In this race the gate is on screen only at
t ≥ 61.5 s, *after* the leader crosses (progress 1.01), during the ending zoom-out — and those frames
are **not** floor-bound (drawn 36.5–54.1 px, larger than the floor and correctly following the zoom).
No OVERVIEW frame before the run-in has the gate in shot. His second frame may therefore be the
ending rather than the approach; the sizing answer is unchanged either way, because the ending frames
are the ones where the floor is *not* binding.

## A defect found on the way, unrelated to the sizing

**The start-formation roll call shows NUMBERS, not names — and its own comment says otherwise.**
[nameTagLayout.js:366](client/src/screens/RaceScreen/nameTagLayout.js#L366): the `showAll` branch
adds every racer to `shown` and returns `wide` **untouched and empty**, while the comment inside it
reads *"The start formation shows every NAME already (the roll call), so the wide form is what it
means by a label"*. Isolated with three racers far apart, all entitled to their names:

```
showAll=false  shown=3  wide=3   → three names
showAll=true   shown=3  wide=0   → three numbers
```

The owner's stated requirement for this exception is that *every* name be visible during the start
formation so a spectator can find their racer once. That is not what it does. **Not fixed here** —
this is an investigation, and the repair is a behaviour change to a feature he specified.

## PROPOSALS — written, not built

**1. Make the floor a fraction of the SHOT rather than of the frame.** The floor exists so a racer is
never too small to recognise, and as a fraction of frame height it does that — but it is blind to how
much world is behind it, which is why 32.4 px reads as correct at 285 world px and as 2.13× over-scale
at 800. A floor expressed against the shot's world width would hold the *apparent* size steady.
**Cost:** one key, one line in `computeRenderDisplayScale`, and it moves RENDER on every track — the
sprite size changes on ~63 % of frames. **What he would see:** racers that stay the same size against
the track instead of swelling as the shot opens; the start formation, which is where the current floor
was tuned, would be the frame most at risk of getting smaller again.

**2. Cheaper, and it addresses the readability half directly: cap the number of labels in OVERVIEW.**
51 labels on a frame with 40 overlapping sprites is the real unreadability, and the label layout
already has the machinery to drop labels by priority. **Cost:** no sizing change, no fingerprint on
WORLD or CAMERA, RENDER moves. **What he would see:** the same sprites, far fewer labels in the wide
shot, and the leaders still named.

**3. Fix the roll-call branch so it does what its comment says.** One line — populate `wide` in the
`showAll` branch when a wide form is on offer. **Cost:** trivial; RENDER moves; only affects the
countdown and the first 8 s. **What he would see:** names during the start formation, which is what
he asked for — and, on this evidence, names on the most crowded frame of the race, so it should be
judged together with proposal 2.

## Reproducing

```
node scripts/sprite-size-truth.mjs           # OVERVIEW frames, shipped config
node scripts/sprite-size-truth.mjs --all     # every sampled frame, all states
node scripts/sprite-size-truth.mjs --names   # the labelNamesWhenRoom: true arm
```

It drives the real `renderRaceFrame` through `scripts/lib/raceDriver.mjs` and reads every sizing term
back from what that function returned, rather than recomputing it. **One caveat that belongs beside
the label numbers:** node has no font, so `createRecordingContext` measures text synthetically
(`length × px × 0.55`). The label *mechanism* is exact; the label *widths* are that approximation,
and every width quoted above depends on it.
