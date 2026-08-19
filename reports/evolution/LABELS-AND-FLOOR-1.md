# LABELS-AND-FLOOR-1 — the name labels, and the 32.4 px pin

**2026-08-22 · branch `fix/ship-ceremony-traps` · MEASUREMENT ONLY — nothing is fixed, no key moves,
no fingerprint can move**

Two questions left open by [SPRITE-SIZE-OVERVIEW-1](SPRITE-SIZE-OVERVIEW-1.md). They are reported
together because the measurements below show they are **coupled**: which of the two problems the
owner is actually seeing depends on which label form his build is drawing, and that is question one.

---

# PART 2 — why does he see NAME labels?

## One branch is ruled out here, without his data

SPRITE-SIZE-OVERVIEW-1 offered two explanations: **his stored configuration**, or **the room test not
holding at his resolution**. The second can be settled from the source, and it is now settled:

**The label layout runs entirely in CANVAS pixels, and his display resolution cannot reach it.**

- The race canvas's backing store is **fixed at 1280 × 720** — `<canvas width={CANVAS_W}
  height={CANVAS_H}>` in `RaceScreen/index.jsx`, with `CANVAS_W/H` the module constants. There is no
  `devicePixelRatio` anywhere in the render path.
- `renderRaceFrame` is handed **the reference 1280 × 720**, not the element's measured size —
  CANVAS-SCALE-1 made that explicit at the call site precisely so layout could not drift with the
  store.
- The label font is `tagFontScreenPx(nameTagFrameFrac, canvasH)` = a fraction of **720**, and every
  clearance test in `computeTagLayout` is done in those same units.

His **1037 × 583 CSS px at devicePixelRatio 1.5** therefore scales the *finished image* and nothing
else. The layout he gets is the layout the harness gets, to the pixel. **The CSS-versus-canvas pair
that has caused this class of error here before is not the cause this time**, and that is a
measurement of the code rather than a guess.

**So the remaining explanation is his stored configuration** — which is what the shipped default
predicts: `labelNamesWhenRoom` ships **false**, so `wideLabelOf` is passed as `null` and `tagWide`,
the only thing the renderer consults to draw a name, stays empty for the whole race. **A name cannot
appear under the shipped configuration by any route.** He is seeing names, so his configuration is
not the shipped one.

## What he must paste — one line

A stored camera config beats `defaults.js` **per key, forever**, and it cannot be read from here.
With a race screen open, in the browser console:

```
copy(JSON.stringify(JSON.parse(localStorage.getItem('racearena:cameraConfig')||'{}'),null,1))
```

That copies the whole stored object to the clipboard — paste it into the chat. (`copy()` is a
DevTools built-in; if it is unavailable, replace `copy(` with `console.log(` and copy the output.)

**What I will do with it**, so the ask is not open-ended: diff it against `DEFAULT_CAMERA_CONFIG`,
report every key that differs, and re-run the room test with **his** values at **his** field size. If
names then appear, the answer is his configuration and the room test is sound. If they do not, the
room test does not hold and the finding is in the layout.

**This is the one thing in this report that is not established**, and it is deliberately not guessed:
the whole point of the ask is that `labelNamesWhenRoom` alone yields zero names across 125 frames, so
some *other* key of his is also doing work, and inventing which one would be worse than asking.

## What the owner must decide — Part 2

**Nothing yet.** He pastes the config; the determination follows from it. The only decision this part
could produce — whether the shipped default should offer names at all — should wait until we know
what his build is actually doing.

---

# PART 3 — the 32.4 px pin

## Where the floor came from, and the number's calibration context

**Commit `77a7812d`, 2026-08-03, CAMERA-MIN-DRAW-1** — "never draw a racer too small to read".

- **Why:** the owner screenshotted the **Space Sprint START formation** and said the rockets looked
  tiny. CAMERA-PICTURE-FIXES-1 had removed the old absolute-pixel floor, and the same grid that used
  to overlap slightly no longer did — the sprites had shrunk 29%, from **32.0 px to 22.8 px**.
- **Where the number came from:** his own reference image. 32.0 screen px = **4.44% of frame height**;
  the shipped `minDrawnFrameFrac` 0.045 reproduces it within 1%.
- **The tracks:** Space Sprint is the reference. The commit records it binding on Mountainstreet,
  Seatrack and Space Sprint at ×1.42, plus a ×1.01 nudge on Dirt Oval worth 0.3 px.
- **The field size — and this is the finding: `"Same 20 slots, same grid"`. The number was
  calibrated at TWENTY racers, on the START formation, on one track.**

**Yes: the reason was a small field, in one shot, on one track.** The owner's complaint now is at
**sixty** racers, mid-race. The floor has never been calibrated in that context.

## What the floor does today, per field size

`node scripts/sprite-size-truth.mjs --racers=N` — space-sprint, seed 9, the shipped configuration:

| racers | frames where the FLOOR binds | `displaySizeScale` |
| --- | --- | --- |
| 20 | **4 of 130 (3%)** | 0.60638 |
| 40 | 18 of 126 (14%) | 0.30319 |
| 60 | **79 of 125 (63%)** | 0.20213 |

**At the field size the floor was calibrated for, it is now nearly inert** — today's OVERVIEW draws a
20-racer rocket at 45.6 px, well clear of the 32.4 px floor. The commit's own arithmetic explains why:
it was calibrated against an OVERVIEW that was **1200 world px** wide under the old zoom unit. That
unit has since changed and OVERVIEW is a much tighter shot. The floor's number survived two changes of
the thing it was measured against.

## Pricing the alternatives — exact, not sampled

`--floor-sweep`. **The sweep is exact rather than re-run per value**: CAMERA-MIN-DRAW-1 pins every
state zoom byte-identical with the floor off, at the default and at an absurd 0.9, so the floor cannot
move the race, the camera, or any racer's screen position. `computeRenderDisplayScale` reduces to
`drawn = clamp(proportional, floor, ceiling)`, so one race per field size gives the exact drawn size
and the exact neighbour gaps for every candidate floor.

**Gaps are nearest-neighbour distances in canvas px minus the drawn sprite; negative means the drawn
bodies overlap. "overlapping" counts racers on screen whose nearest neighbour is closer than that.**

### The WIDE shot — the widest OVERVIEW after the start, which is the owner's frame

| floor | px | 20 racers (800 world px, 2 on screen) | 40 racers (800 px, 27 on screen) | 60 racers (800 px, 45 on screen) |
| --- | --- | --- | --- | --- |
| 0 (off) | 0 | 45.6 px · gap +56.4 · **0/2** | 22.8 px · gap +20.3 · **0/27** | 15.2 px · gap +10.5 · **4/45** |
| 0.015 | 10.8 | 45.6 · +56.4 · 0/2 | 22.8 · +20.3 · 0/27 | 15.2 · +10.5 · 4/45 |
| 0.025 | 18.0 | 45.6 · +56.4 · 0/2 | 22.8 · +20.3 · 0/27 | 18.0 · +7.7 · 8/45 |
| 0.035 | 25.2 | 45.6 · +56.4 · 0/2 | 25.2 · +17.9 · 0/27 | 25.2 · +0.5 · 18/45 |
| **0.045 (shipped)** | 32.4 | 45.6 · +56.4 · **0/2** | 32.4 · +10.7 · **10/27** | 32.4 · **−6.7** · **28/45** |

### The RACING shot — the median LEADER_ZOOM frame, the picture he approved at 0.75 corridors

| floor | 20 racers (400 px, 8 on screen) | 40 racers (400 px, 20 on screen) | 60 racers (400 px, 19 on screen) |
| --- | --- | --- | --- |
| 0 (off) | 91.2 px · gap +62.7 · 0/8 | 45.6 px · +42.3 · 5/20 | 30.4 px · +21.0 · 2/19 |
| **0.045 (shipped)** | 91.2 · +62.7 · 0/8 | 45.6 · +42.3 · 5/20 | 32.4 · +19.0 · **2/19** |

**The floor does not bind in the racing shot at 20 or 40 racers at all**, and at 60 it lifts the
sprite by 2.0 px and changes the overlap count by nothing. **Lowering the floor costs nothing in the
shot the owner approved, at any field size tested.**

### And the start grid at 60, which is the floor's own calibration frame

| floor | drawn | gap | overlapping |
| --- | --- | --- | --- |
| 0 (off) | 14.4 px | +16.4 | 0/60 |
| 0.025 | 18.0 | +12.8 | 0/60 |
| 0.035 | 25.2 | +5.6 | 0/60 |
| **0.045 (shipped)** | **32.4** | **−1.6** | **60/60** |

**The frame the floor exists to protect is the frame it now ruins**, once the field is 60 rather than
20: every racer in the start grid overlaps its neighbour, and the shipped value is the only one tested
that does it.

## What breaks if the floor is lowered

The floor's purpose is real — *never draw a racer too small to recognise*. At 60 racers with the floor
off, the wide shot draws a rocket at **15.2 px**, and the start grid at **14.4 px**. Whether that is
"a dot" is the owner's eye, not a measurement, and this report does not pretend otherwise. Two
measured anchors for that judgement:

- the size he **approved** was 32.0 px — but at 20 racers, where it is still delivered today
  **without** the floor (45.6 px);
- the size he **rejected** as tiny was 22.8 px — at 20 racers, in a 1200-world-px shot that no longer
  exists.

**Nothing in the record says what he thinks of 15–25 px at sixty racers**, because that combination
has never been put in front of him.

## Which of the two problems is he actually seeing?

**It depends on his label form, which is Part 2.** At 60 racers in the wide shot, with 26.9 px of room
between neighbours (from SPRITE-SIZE-OVERVIEW-1's mid-race frame):

| what he is running | what dominates |
| --- | --- |
| **numbers** (the shipped form) | the **SPRITE**. An 8.0 px number fits; the 32.4 px sprites overlap 28 of 45 racers. The floor is the whole problem, and 0.015 or off removes it. |
| **names** (what his screenshots show) | the **LABEL**, by 6.1× — a 60.3 px name in 26.9 px of room. The sprite overlap is real and secondary. |

**SPRITE-SIZE-OVERVIEW-1's 6.1× holds**, and it points at the labels. **So on today's evidence the
floor is the smaller of his two problems** — but it is not nothing at 60 racers, and it is the one
with a one-key fix that provably costs zero in the racing shot.

## What the owner must decide — Part 3

**One decision, and it does not need Part 2 first:** is a racer drawn at 15–25 px in a wide
sixty-racer shot still recognisable? A measurement cannot answer it; it is the same eye-test that set
32.4 px in the first place, and the number has never been re-judged at this field size.

- If **yes** → the floor can go to 0.015 or off, which takes wide-shot overlap from 28/45 to 4/45 at
  60 racers and from 10/27 to 0/27 at 40, while changing the racing shot by nothing at any field size.
- If **no** → the floor stays, the wide shot at 60 racers stays crowded, and the remedy has to be
  fewer labels rather than smaller sprites.

**A cheaper option exists and is not built here:** make the floor scale with the field, since the
problem is entirely a function of racer count. That is a new key and a new rule, so it is named, not
proposed as a change.

## PROPOSALS

**1. Put 15 px, 20 px and 25 px at sixty racers in front of him as three production builds.** The one
number this decision needs is an eye-test, the record has no data point for it, and the floor is
drawing-only so three builds are three one-line diffs with no fingerprint consequence beyond RENDER.
**Cost:** three builds and ten minutes of his time. **What he would see:** the wide shot at each size,
which is the only way the question gets answered.

**2. Re-derive the floor from the SHOT rather than the frame.** It is a fraction of frame height, so
it is blind to how much world is on screen — which is why 32.4 px reads as correct at 285 world px and
as 2.13× over-scale at 800. A floor expressed against the shot's world width would hold apparent size
steady and would have needed no re-calibration when the zoom unit changed twice. **Cost:** one key,
one line in `computeRenderDisplayScale`, RENDER moves on every track. **What it prevents:** the next
silent re-calibration when a zoom unit or a default field size moves again.

**3. Cap the number of labels drawn in OVERVIEW.** Independent of the floor, and it addresses the half
that dominates by 6.1×. The layout already drops labels by priority; it simply has no cap. **Cost:**
one key, no sizing change, RENDER moves. **What he would see:** the same sprites, far fewer labels in
the wide shot, and the leaders still named.

## Reproducing

```
node scripts/sprite-size-truth.mjs --racers=60                 # the per-frame table
node scripts/sprite-size-truth.mjs --racers=60 --floor-sweep   # the three shots x five floors
node scripts/sprite-size-truth.mjs --racers=20 --floor-sweep
git log -1 --format=%B 77a7812d                                # the floor's own reasoning
```

**One caveat that belongs beside the label widths:** node has no font, so the recording context
measures text synthetically (`length × px × 0.55`). The label *mechanism* is exact; the label
*widths* are that approximation. Every sprite and gap number above is exact.
