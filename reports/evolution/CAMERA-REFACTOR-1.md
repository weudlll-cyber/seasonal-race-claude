# CAMERA-REFACTOR-1 — what the zoom settings actually mean, and every open/closed split

Measurement only. **Changes no behaviour**: the commit is this report and its INDEX entry. No engine
ceremony, no fingerprint. On branch `camera-refactor`; master is not reverted.

---

## BUILD-VS-SPEC CONFORMITY

| Step | Status | Note |
|---|---|---|
| **A1** — formula map per state | DONE | 3 different meanings across 5 states, and a 4th on open tracks. |
| **A2** — visible world width per state, per lap, his settings + defaults | DONE | His question answered: **OVERVIEW 441 px vs LEADER 427 px. 3% apart.** His eye is exactly right. |
| **A3** — are the Dev Screen values commensurable? | DONE | **No.** Plainly stated, with what would have to change. |
| **A4** — why is the min-visible floor lap-asymmetric? | DONE | **It isn't lap-asymmetric — it oscillates once per lap with track position.** Plus an unfixed CAMERA-FOCUS-5 bug inside it. |
| **B1** — every open/closed divergence | DONE | **50 sites.** 28 + 3 whole functions are projection; 13 are genuinely shape. |
| **B2** — the resolution question | DONE | Synthetic 0.5×–3× resolution sweep, closed and open, plus all 10 real tracks. **Nothing is resolution-invariant across the range.** |
| **B3** — one shared rule vs shape abstraction | DONE | |
| **C** — one proposal | DONE | |
| VERIFICATION — no simulation file in the diff | DONE | See below. |
| COMMIT — one commit, `docs(camera)`, report + INDEX only | DONE | |

**Declared deviations**

1. **I validated the formula table against the running director before reporting it.** The whole
   report rests on that table, and this planner has been wrong three times. 16 predictions, two real
   tracks (dirt-oval CLOSED 3072, mountainstreet OPEN 6144), two settings each — **all 16 match to
   better than 0.5%**. Not over-securing: it is the difference between a derivation and a
   measurement.
2. **I measured a second real track** (mountainstreet) beyond the recorded dirt-oval race, because B2
   asks for "both a closed and an open shape" and a synthetic sweep alone would have been a
   derivation dressed as a measurement.

---

## PART A — the zoom chain, measured end to end

Everything below is expressed as **how much world you can see** (the width of the visible strip, in
world pixels) and **how big a racer is on screen**. Effective-zoom numbers are in the tables for the
record, but the two columns that matter are the last two.

### A1 — which formula produces each state's zoom

**LEADER_ZOOM · LEAD_CHANGE · BATTLE_ZOOM · COMEBACK_ZOOM — the "sprite scale" states.**
The Dev Screen number is fed through `_computeZoomForSpriteScale`, which divides by the track's own
scale and then multiplies it straight back when the frame is drawn. The two cancel exactly — the
code says so ("`drawnBodyWidthRefPx` cancels out of the formula"). **The result is that the slider
value *is* the number of screen pixels per world pixel.** So:

> **visible world width = 1280 ÷ slider.** Slider 3.00 → 427 px of world, on every track, closed or
> open, whatever the racer. Slider 1.81 → 707 px.

It is capped by `MAX_INVERSE_ZOOM` — but that cap is applied *before* the multiplication, so it means
different things on the two topologies (B2).

**OVERVIEW on a CLOSED track — a completely different formula.**
OVERVIEW does not use the sprite-scale formula. At each OVERVIEW entry the director computes a *snap
zoom* whose purpose is to make a racer a fixed size on screen:

> `effective zoom = overviewTargetScreenPx × slider ÷ drawnBodyWidthRefPx`
> — i.e. **the slider multiplies a target SPRITE SIZE, not a camera distance.**
> **Racer on screen = 28 × slider pixels, always.** At slider 1.75 that is 49 px, on every track.

The amount of world you then see is whatever it takes to make the racer that big — which depends on
**how big that racer is in world pixels on that track**. Its only ceiling on closed tracks is
`MAX_INVERSE_ZOOM`. **The planner's reading is CONFIRMED by measurement: on today's closed tracks the
OVERVIEW slider is effectively uncapped.**

**OVERVIEW on an OPEN track — a third formula, because the cap always wins.**
The same snap zoom is computed, but on open tracks it is capped at `_overviewStateZoom × 0.8`.
**Measured: that cap binds on 100% of frames, at every open track, at both settings.** So the
sprite-size normalisation is entirely discarded and what actually runs is:

> **effective zoom = 0.8 × slider** → visible world width = 1600 ÷ slider.

**Summary — one control, three meanings.** The Dev Screen shows five identical sliders, all called
"Sprite scale (×)", all ranged 0.5–5.0. They mean:

| Slider | What the number actually sets |
|---|---|
| LEADER / LEAD_CHANGE / BATTLE / COMEBACK | screen pixels per world pixel (visible world = 1280 ÷ n) |
| OVERVIEW, closed track | racer size on screen in pixels (28 × n) |
| OVERVIEW, open track | 0.8 × screen pixels per world pixel (visible world = 1600 ÷ n) |

### A2 — measured, Dirt Oval seed 5601, 20 racers, canvas 1280×720

Visible world width in pixels — **bigger number = wider shot**. Medians over the frames each state
held; the whole 5746-frame race replayed through the real director with a seeded RNG.

| state | **defaults** lap 1 | lap 2 | **owner's settings** lap 1 | lap 2 |
|---|---:|---:|---:|---:|
| OVERVIEW | 773 | 773 | **441** | **441** |
| LEADER_ZOOM | 707 | 707 | **449** | **427** |
| LEAD_CHANGE | 707 | 707 | **427** | **450** |
| BATTLE_ZOOM | 456 | 456 | 456 | 456 |
| PHOTO_FINISH | – | 456 | – | 456 |

*(defaults = OVERVIEW 1.00 / LEADER 1.81; owner's = OVERVIEW 1.75 / LEADER 3.00; both with
min-racers-visible 8.)*

**The owner's question, answered directly.**

> *Why does OVERVIEW at 1.75 frame about as tight as LEADER at 3?*

**Because it does — 441 px versus 427 px, three percent apart.** Your eye is right, and the
screenshot is right.

The reason is that the two numbers are not measuring the same thing. LEADER at 3.00 means "3 screen
pixels per world pixel" → 1280/3 = **427 px of world**. OVERVIEW at 1.75 means "make the racer
28 × 1.75 = **49 pixels tall on screen**". On Dirt Oval, the horse's camera reference body is **16.9
world pixels**. To make a 16.9-px body fill 49 screen pixels the camera must zoom to 49/16.9 =
**2.90 screen pixels per world pixel** — which is 3.00 in all but name. The two settings collide.

**It is a coincidence of that racer on that track, and it does not transfer.** On Searound the manta's
reference body is 24.9 world px, so the same two slider values give:

| track | racer | body ref | OVERVIEW @1.75 | LEADER @3.00 |
|---|---|---:|---:|---:|
| dirt-oval | horse | 16.9 px | **442 px** | 427 px |
| searound | manta | 24.9 px | **650 px** | 427 px |
| luger-hill (open) | luge | 23.8 px | **914 px** | 427 px |
| mountainstreet (open) | boarder | 28.5 px | **914 px** | 427 px |

So the same pair of numbers gives a LEADER-tight OVERVIEW on Dirt Oval and a comfortably wide one on
Searound. **The setting is not wrong; the label is.**

**Validation.** The formula table was checked against the running director on two real tracks at two
settings — 16 predictions, all matching to better than 0.5%:

```
  dirt-oval      (CLOSED 3072)  owner's   OVERVIEW predicted 2.899  measured 2.899  OK   441 px
                                          LEADER   predicted 3.000  measured 3.000  OK   427 px
  mountainstreet (OPEN   6144)  owner's   OVERVIEW predicted 1.400  measured 1.400  OK   914 px
                                          LEADER   predicted 3.000  measured 3.000  OK   427 px
```

### A3 — are the Dev Screen zoom values commensurable? **No.**

Plainly: **a larger number does not mean a closer shot everywhere, and the same number in two
different states does not mean the same shot.** Three separate failures:

1. **Different units.** Four states' sliders are a world→screen scale; OVERVIEW's is a sprite size in
   screen pixels. Comparing 1.75 to 3.00 is comparing millimetres to grams.
2. **OVERVIEW's meaning depends on the racer and the track.** Because it normalises by
   `drawnBodyWidthRefPx`, the same OVERVIEW number frames 442 px on Dirt Oval and 650 px on
   Searound. The other four sliders are racer-independent and track-independent.
3. **OVERVIEW's meaning changes again on open tracks**, where the 0.8× ceiling binds 100% of the time
   and throws the sprite normalisation away.

**Ordering does hold *within* a state.** Turning any single slider up always tightens that shot. It
is only *across* states that the labels lie — and OVERVIEW is the one that lies, because it is the
one that is not a distance.

**What would have to change for "smaller number = wider shot" to hold everywhere.** One unit, chosen
once, used by all five states. Two honest candidates:

- **(i) Every slider becomes "visible world width".** Direct, but it is *not* resolution-invariant —
  the same 427 px shows a third as much track on a 9216-px world as on a 3072-px one (B2).
- **(ii) Every slider becomes "racer size on screen in pixels"** — i.e. OVERVIEW's formula, extended
  to all five states. Then 49 means the same picture everywhere, on every track and every world
  resolution, because it is defined by the thing the eye actually looks at. **This is the one that
  also satisfies the owner's resolution precondition**, and it is the recommendation in Part C.

Note that OVERVIEW's formula — the odd one out — is the *better* one. The four "normal" sliders are
the ones that need to change.

### A4 — why the min-visible floor is lap-asymmetric

**Short answer: it is not lap-asymmetric. It oscillates once per lap with the pack's position around
the oval, and the field's spread pushes that oscillation past the threshold, so it only becomes
visible in lap 2.**

First, the confirmation of the owner's eye test, as a distribution rather than a median. At his
settings LEADER asks for **427 px**; anything wider is the floor overriding it:

| min racers visible | lap | p50 | p75 | p90 | p99 | max | **frames wider than 427** |
|---|---:|---:|---:|---:|---:|---:|---:|
| **8** | 1 | 427 | 427 | 630 | 672 | 672 | **18.9%** |
| **8** | 2 | 427 | 526 | 591 | 685 | 700 | **46.3%** |
| **0** | 1 | 427 | 427 | 427 | 427 | 427 | **0.0%** |
| **0** | 2 | 427 | 427 | 427 | 427 | 427 | **0.0%** |

Nearly half of lap 2's leader frames are up to 1.6× wider than asked; with the floor off it is a flat
427 px in both laps. That is exactly what the owner saw.

**Now the mechanism.** `_zoomFloorForMinVisible` asks: *how tight can I zoom and still keep 8 racers
on the canvas?* It answers by measuring the **straight-line world distance** from the leader to every
other racer, **per axis**, and taking the 8th best. It has no notion of laps, and correctly so. But it
has two properties that make it swing:

**(1) The Y axis is much tighter than the X axis, and the oval rotates the pack between them.**
The frame is 1280 × 720, and on Dirt Oval the world maps at `bsX = 0.4167` on X but `bsY = 0.3517` on
Y. Combining both, **the Y term binds whenever a racer is more than 0.67 × its horizontal offset away
vertically** — which on an oval is most of the time the pack is rounding an end. Measured, by race
progress decile:

| progress | min-vis floor (p05 / p25 / median) | world distance to the 8th nearest | **binding racer capped by the Y axis** |
|---|---|---:|---:|
| 0.0–0.1 | 9.88 / 12.71 / 17.09 | 96 | 41% |
| 0.1–0.2 | 5.43 / 5.65 / 6.57 | 177 | **75%** |
| 0.2–0.3 | 8.39 / 8.44 / 8.79 | 185 | **0%** |
| 0.3–0.4 | 10.16 / 11.73 / 12.17 | 106 | **70%** |
| 0.4–0.5 | 11.73 / 12.12 / 14.69 | 94 | 39% |
| 0.5–0.6 | 10.01 / 10.60 / 11.95 | 139 | **1%** |
| 0.6–0.7 | 6.09 / 6.68 / 8.57 | 165 | **68%** |
| 0.7–0.8 | 8.91 / 10.11 / 13.94 | 113 | 19% |
| 0.8–0.9 | 4.45 / 4.98 / 6.60 | 220 | 55% |
| 0.9–1.0 | 8.91 / 13.29 / 15.16 | 102 | 62% |

*(LEADER at 3.00 needs a floor above 7.20; anything below overrides it.)*

The floor does **not** decline monotonically with race progress — it swings between 6.6 and 17.1 and
back, and the Y-binding column swings between 0% and 75%. **That oscillation is the pack going round
the oval**, not the lap counter and not the clock.

**(2) Field spread moves the whole oscillation down.** In lap 1 the field is still compact from the
grid, so even at the worst point of the swing the floor usually stays above 7.20. As the field strings
out, the 8th-nearest racer sits further away at every point of the swing (median 131 → 142 px, p95
194 → 247 px), so the dips now cross the threshold. Same oscillation, shifted down until it bites.

**And a third thing, which is a genuine unfixed bug.** `_zoomFloorForMinVisible` is handed **one**
scale factor and uses it on **both** axes:

```js
const divisor = this._isOpenTrack ? OPEN_TRACK_BASE_ZOOM : this._bsX;   // CameraDirector.js:2710
...
const dx = Math.abs(r.x - fx) * divisor;
const dy = Math.abs(r.y - fy) * divisor;   // <- should be bsY on closed tracks
```

This is the **same defect CAMERA-FOCUS-5 fixed in `_containAnchorInFrame`, still present here.** On
Dirt Oval the code treats the Y axis as **18.5% more compressed than it is**, so it believes racers
are further off-screen vertically than they are and zooms out further than needed. Measured:

| lap | floor as coded (p05 / med) | floor with the renderer's real Y scale (p05 / med) | frames the code forces wider than needed | override rate: coded vs true |
|---|---|---|---:|---|
| 1 | 4.77 / 10.20 | 5.65 / 11.72 | **68.9%** | 14.1% vs 11.9% |
| 2 | 4.25 / 10.63 | 5.03 / 11.13 | **58.1%** | 25.7% vs 21.9% |

So the bug makes the floor ~6–7% too low on roughly two-thirds of frames and adds 2–4 percentage
points of unnecessary widening. **It is real and it should be fixed — but it is not the main cause.**
Fixing it alone would take lap 2's override rate from 25.7% to 21.9%, not to zero. The main cause is
the oscillation above.

---

## PART B — every open/closed divergence, and the resolution question

### B1 — the divergence list: 50 sites

`CameraDirector.js` branches on `_isOpenTrack` at **38 sites** and additionally carries **three
topology-specific functions** (`_setClosedTrackTargets`, `_setOpenTrackTargets`, `_closedOffsetY`).
`Minimap.js` branches at 3, `CameraDiagnosticsHUD.jsx` at 6. **50 in total.**

They fall into exactly two kinds.

#### Kind 1 — PROJECTION. 28 sites + 3 functions. Not about shape at all.

Every one of these exists for a single reason: **the two topologies use different world→screen
scales, and `cam.zoom` means a different thing in each.**

- **Closed** uses per-axis `bsX = 1280 / worldW`, `bsY = 720 / worldH`. `cam.zoom = 1.0` means *"the
  whole world fits the canvas"* — a **relative** scale that depends on the world's resolution.
- **Open** uses a fixed `OPEN_TRACK_BASE_ZOOM = 1.5` on **both** axes. `cam.zoom = 1.0` means *"1.5
  screen pixels per world pixel"* — an **absolute** scale that ignores the world entirely.

| # | Site(s) | What differs | Why it was written that way (best reading) | Shape, or resolution? |
|---|---|---|---|---|
| 1 | `:330`, `:337` `_computeZoomForSpriteScale` | open `s/1.5`, min `overviewZoom`; closed `s/bsX`, min `1.0` | Convert a sprite scale into whichever `cam.zoom` space this topology uses | **Resolution** — and note both divide by exactly the scale the renderer multiplies back, so the *result* is identical. Only the clamps differ. |
| 2 | `:382`, `:391` `_overviewStateZoom` fallback | open `overviewZoom`, closed `1.0` | "Whole world visible" written twice, once per space | **Resolution** — these are the same intent in two notations |
| 3 | `:1018-1019` zoom-about-anchor | `_ezx/_ezy` = `1.5/1.5` open, `bsX/bsY` closed | CAMERA-SIDEJUMP-1 needed the render scale | **Resolution** |
| 4 | `:1415`, `:1427`, `:1430`, `:1433` OVERVIEW snap | divisor; ceiling `stateZoom×0.8` (open) vs `MAX_INVERSE_ZOOM` (closed); floor; `overviewMinEffZoom` open-only | The `0.8` ceiling is commented "prevents the leader leaving canvas during pan" — a **pan bug worked around with a zoom cap** | **Resolution + a workaround.** Measured: this ceiling binds 100% of open frames, so open OVERVIEW never runs the formula it appears to run |
| 5 | `:1733-1734` `_containAnchorInFrame` | per-axis closed, uniform open | CAMERA-FOCUS-5 | **Resolution** |
| 6 | `:1827-1828` `_recordDetourFrame` | same pair again | diagnostic mirror of #5 | **Resolution** |
| 7 | `:2299-2300` `_setOverviewGroupTargets` | `axisX/axisY` | OVERVIEW-FRAMING-1 | **Resolution** |
| 8 | `:2423`, `:2456`, `:2473`, `:2505`, `:2564`, `:2594`, `:2631`, `:2660` | 8 dispatches to `_setOpenTrackTargets` vs `_setClosedTrackTargets` | Two parallel implementations of the same pan+zoom resolve | **Resolution** — the two functions differ only in `BASE` vs `bsX` and in the Y handling |
| 9 | `:2483` OVERVIEW-FRAMING-1 scoping | closed → group framing; open → leader-centred | Declared as scope in that block; CAMERA-REFACTOR-0 B3 conceded it | **Neither** — this is the only one that is not even about projection. It is an unfinished feature. |
| 10 | `:2706` min-vis hard floor | open `max(leaderMinZoom, fraction)`; closed `max(1.0, fraction)` | The comment says it plainly: below `cam.zoom = 1.0` on closed tracks the pan is computed at `minEffZoom = bsX` while the render uses a lower zoom → "the black-screen bug" | **A workaround for a units bug**, not a topology fact |
| 11 | `:2710` min-vis divisor | single divisor on both axes | oversight | **Resolution — and a live bug** (A4) |
| 12 | `:2906` `updateCountdown` | two parallel clamp blocks | same as #8 | **Resolution** |
| — | `_setClosedTrackTargets` / `_setOpenTrackTargets` / `_closedOffsetY` | three functions | `_closedOffsetY` exists **only** because closed is per-axis and open is uniform | **Resolution** |

**None of Kind 1 is about whether the track is a loop.** Every one is about how world pixels become
screen pixels — which is exactly the world-resolution question.

#### Kind 2 — TRACK SHAPE. 13 sites. Genuinely about the loop.

| Site(s) | What differs | Genuine? |
|---|---|---|
| `:738` `_tDelta` | closed takes the shortest circular arc; open takes a linear delta | **Yes.** A loop wraps; a line does not. |
| `:918`, `:1546` `_transitionTargetT` | open clamps the target to `[0,1]`; closed lets it run | **Yes** |
| `:1576`, `:1581`, `:2446`, `:2451` FINISH_OVERVIEW lookback | open `max(0, t−f)`; closed wraps | **Yes** |
| `:1680-1681` `_applyLeaderForwardBias` | tangent sample points clamp vs wrap | **Yes** |
| `:2419` OVERVIEW entry pan target | clamp vs wrap | **Yes** |
| `Minimap.js:77,89,98` | `closePath()` only on a loop | **Yes** |

These 13 are all the same single question — *does the track parameter wrap?* — asked in seven places.
`EditorShape` already knows the answer and already answers it correctly inside `getPosition`
(`EditorShape.js:100-113`). The camera re-asks it because it works on the parameter *before* handing
it to the shape.

### B2 — the resolution question

**The test.** Take one authored picture — Dirt Oval's geometry, the horse, 20 racers — and re-author
it at k× resolution: world, track width and sprite all scale by k. A resolution change must not change
what the viewer sees. So the honest criterion is: **the percentage of the world visible must be the
same at every k.** Run it as CLOSED and as OPEN.

**Result: nothing is resolution-invariant across the whole range, and the two topologies fail
differently.**

**CLOSED, at the owner's settings — % of the world visible:**

| k | world | body ref | OVERVIEW | LEADER_ZOOM | BATTLE_ZOOM | what bound |
|---:|---|---:|---:|---:|---:|---|
| 0.5 | 1536×1024 | 8.5 | **14.4%** | 27.8% | 29.7% | — |
| 1.0 | 3072×2047 | 16.9 | **14.4%** | 13.9% | 14.8% | — |
| 1.5 | 4608×3071 | 25.4 | **14.4%** | 10.0% | 10.0% | `MAX_INVERSE_ZOOM` |
| 2.0 | 6144×4094 | 28.5 | 12.1% | 10.0% | 10.0% | `MAX_INVERSE_ZOOM` + W_REF 285 |
| 3.0 | 9216×6141 | 57.0 | 16.2% | 10.0% | 10.0% | `MAX_INVERSE_ZOOM` + W_REF 285 |

**OPEN, at the owner's settings:**

| k | world | OVERVIEW | LEADER_ZOOM | BATTLE_ZOOM |
|---:|---|---:|---:|---:|
| 0.5 | 1536×1024 | 59.5% | 27.8% | 29.7% |
| 1.0 | 3072×2047 | 29.8% | 13.9% | 14.8% |
| 1.5 | 4608×3071 | 19.8% | 9.3% | 9.9% |
| 2.0 | 6144×4094 | 14.9% | 6.9% | 7.4% |
| 3.0 | 9216×6141 | 16.2% | 4.6% | 4.9% |

**Three findings, in order of importance.**

**(1) OVERVIEW on a closed track is the ONLY formula that is resolution-correct — and a cap breaks
it.** Look at the OVERVIEW column: **14.4%, 14.4%, 14.4%**, then it drifts to 12.1% and 16.2%. It is
invariant for a 3× resolution range and then fails. It is invariant *because* it normalises by the
racer's world size, and it fails at k ≥ 2 because `drawnBodyWidthRefPx` stops scaling — its input
`W_REF` is capped at a **hard-coded 285 world pixels** (`RaceScreen/index.jsx:447`,
`W_REF = Math.min(285, effectiveWidth)`). ~~Above roughly a 4600-px world the reference body
saturates and the one correct formula in the camera goes wrong.~~ **The right rule is already in the
code; a magic number breaks it.**

> **CORRECTION (2026-08-02, [CAMERA-CEILING-1](CAMERA-CEILING-1.md)).** The struck sentence
> generalised this sweep wrongly, and the owner caught it. **The cap keys on TRACK width, not WORLD
> width:** `effectiveWidth = trackWidthPx × 0.95`, so it binds only when the *track* is wider than
> **300 px**. The "~4600-px world" figure is an artefact of *this table*, where world and track width
> scale together — at k = 2 the world is 6144 **and the track is 356 px**, and it is the 356 that
> trips the cap. Stated as a general rule about world width it is wrong: **Mountainstreet is a
> 6144-px world with a 300-px track, and the cap does not bind there.** Measured across all ten
> shipped tracks the distortion is **exactly 0.00%** — `300 × 0.95 = 285.00000000000000000` in exact
> IEEE arithmetic, so the widest shipped track lands precisely on the boundary without being reduced.
> The rows in the table above are correct **for a re-authored track** and remain the right warning
> for the first wide track anyone draws.
>
> Two further narrowings from the same re-check: the **0.5× column** assumed the *sprites* scaled
> with the world too; with a real, unscaled racer type the start-grid row staircase splits the field
> into two rows and 0.5× gives 4.96 track-widths, not the invariant value — so the honest invariance
> band is **1× to 1.5×**, bounded below by the row staircase and above by the 285 cap. And the
> cross-track consistency this report credits to the sprite rule (2.48 track-widths on 9 of 10
> tracks) is really `2 × W_ref / N` with one start row and `N = 20`: the track width cancels, which
> is *why* it is consistent — and the same `/N` is why it is unstable in racer count.

**(2) The other four states are resolution-blind by construction.** `effZoom = slider` is an
*absolute* screen-pixels-per-world-pixel scale, so it shows a constant number of **world pixels**, not
a constant amount of **track**. Double the resolution and you see half the track for the same slider:
27.8% → 13.9%. This is not a bug in a clamp; it is what the formula means.

**(3) `MAX_INVERSE_ZOOM` — the ceiling that has already moved once, and will bind again.** Its own
comment records it: *"raised from 5 to 10 to support worldW=6144 (Mountainstreet)"*. Because it caps
`cam.zoom` rather than the effective zoom, it means two different things:

```
  CLOSED: the largest spriteScale still reachable, per world width
    worldW | max spriteScale | tightest possible shot
      1536 |            8.33 |   154 px  = 10.0% of the world
      3072 |            4.17 |   307 px  = 10.0% of the world
      4096 |            3.13 |   410 px  = 10.0% of the world
      6144 |            2.08 |   614 px  = 10.0% of the world
      8192 |            1.56 |   819 px  = 10.0% of the world
     12288 |            1.04 |  1229 px  = 10.0% of the world

  OPEN: max spriteScale reachable = 15.00 on EVERY world width.
```

On closed tracks it is a **"never show less than 10% of the world"** rule. On open tracks it is an
**absolute 15× scale** that never notices the world at all. Two topologies, two meanings, one
constant.

**Two consequences the owner can act on:**

- **The "Sprite scale" slider runs to 5.00, but on every closed track shipped today the top 17% is
  already dead.** At worldW 3072 the highest reachable value is **4.17**; 4.20 through 5.00 do
  nothing. Silently.
- **The owner already runs LEADER at 3.00.** A closed track authored at **4267 px or wider** would
  silently clamp it — and every open track already shipped is 4096, 6000 or 6144 px. The moment a
  closed track is authored at the resolution open tracks already use, his current setting stops
  working with no message.

**The current seed set hides all of this**, which is why it has never surfaced: every closed track is
3072 px wide and every open track is 4096–6144. **Open-versus-closed and small-versus-large world are
perfectly correlated in the data**, exactly as the owner said. The code was tuned on that correlation.

**Cross-check on two real tracks, at shipped defaults** — same slider, same state, different world:

| track | topology | world | LEADER_ZOOM visible | % of world |
|---|---|---|---:|---:|
| dirt-oval | closed | 3072 | 707 px | **23.0%** |
| searound | closed | 3072 | 707 px | **23.0%** |
| luger-hill | open | 4096 | 707 px | **17.3%** |
| mountainstreet | open | 6144 | 707 px | **11.5%** |
| space-sprint | open | 6000 | 707 px | **11.8%** |

The same setting shows twice as much track on Dirt Oval as on Mountainstreet. That is the precondition
failing, stated in one line.

### B3 — what one shared rule fixes, and what needs the shape abstraction to grow

**Removable by a single rule expressed in world resolution — 28 sites + 3 functions (Kind 1).**
All of them disappear if the director stops carrying two `cam.zoom` spaces and instead holds one
**projection** object that knows `(worldW, worldH, canvasW, canvasH)` and answers `effZoomX/effZoomY`.
Then:

- `_computeZoomForSpriteScale` becomes one line with no branch (the two branches already produce the
  same effective zoom — only the clamps differ, and the clamps move into the projection where they can
  be expressed in one unit);
- `_setClosedTrackTargets` and `_setOpenTrackTargets` merge into one function; `_closedOffsetY`
  disappears (it exists only because open pretends the Y axis equals the X axis);
- `MAX_INVERSE_ZOOM`, `overviewZoom`, the `1.0` floor, the `0.8` ceiling and the `overviewMinEffZoom`
  option all become caps on **one** quantity instead of on two different ones;
- the per-axis bugs (`:2710` today, `:1733` before FOCUS-5, `:1827` in the diagnostic) become
  unwriteable, because there is only one place that knows the axis scales;
- the `W_REF = 285` cap is *not* in the camera — it is in `RaceScreen`'s sprite sizing — but it must
  be fixed with the same rule, because it breaks the one resolution-correct formula the camera has.

**Needs the shape abstraction to grow — 13 sites (Kind 2).**
All 13 ask the same question: *does the track parameter wrap?* They need `EditorShape` (or a thin
`TrackParam` wrapper over it) to expose two operations the camera currently open-codes:

```
  shape.deltaT(from, to)       // shortest arc on a loop, linear on a line   -> kills :738, :918, :1546
  shape.offsetT(t, delta)      // wrap or clamp, as appropriate              -> kills :1576/:1581/:2446/:2451, :1680-1681, :2419
```

`EditorShape` already answers this correctly for *positions*; it does not expose it for *arithmetic*.
Two methods retire all 13 camera-side branches, and the Minimap's three `closePath()` calls are
legitimately about drawing a loop and can stay.

**So the size of the refactor is:** one projection object (large, mechanical, high value) plus two
methods on the shape (small). Neither requires touching the state machine or the transition grammar.

---

## PART C — the proposal

**One change, not two, and it belongs in the projection refactor proper — not in a cleanup.**

The owner's two problems have the same root and the same fix. *"The labels lie"* and *"open and closed
must be identical at any resolution"* are both consequences of the camera carrying **two `cam.zoom`
spaces and five sliders in three units**. Fixing them separately would mean changing every zoom call
site twice.

**The smallest honest change that solves both:**

**(a) One unit for every zoom slider: racer size on screen, in pixels.**
Adopt OVERVIEW's formula for all five states — `effZoom = targetSpritePx / drawnBodyWidthRefPx`.
Then:

- *"Smaller number = wider shot"* holds everywhere, in one unit the owner can see with his own eyes
  ("the horse is 50 pixels tall").
- OVERVIEW at 49 and LEADER at 85 are directly comparable, and OVERVIEW at 49 is unambiguously the
  wider shot on every track.
- **It is resolution-invariant by construction** — B2 measured it holding across a 3× resolution range,
  which no other formula in the camera does.
- It is racer-aware, which is what the owner actually wants: a shot is "close" when the racer is big.

Migration is mechanical: today's slider `s` maps to `targetSpritePx = s × drawnBodyWidthRefPx` for the
track the owner tuned on — his current settings can be carried over exactly, per track, if he wants
them preserved.

**(b) One projection object, replacing the open/closed split.**
`makeProjection({ worldW, worldH, canvasW, canvasH })` — no `isOpenTrack` parameter, because
projection has nothing to do with topology. It owns `effZoomX`, `effZoomY`, `toScreen`, and **all**
the caps, expressed in the single unit from (a). This removes 28 branch sites and 3 functions, and
makes the per-axis bug class unwriteable.

**(c) Two methods on the shape**, `deltaT` and `offsetT`, retiring the remaining 13 branches.

**Why one block and not two.** (a) without (b) leaves five formulas that agree on the unit but still
disagree about which `cam.zoom` space they live in, and the caps still mean different things per
topology — so the labels would be honest but the framing would still differ between a 3072 and a 6144
world. (b) without (a) removes the branching but leaves OVERVIEW measuring sprite size while everything
else measures scale — the owner's original complaint, untouched. **Neither half is worth shipping
alone, and both touch the same call sites.** He is right that it should be done once.

**Three things that must NOT be in that block**, so his eye can attribute what it sees:

1. **The min-visible floor.** A4 shows it is a separate defect with its own cause (per-axis bug +
   oval oscillation). It should be fixed in its own block, before or after, with its own eye test. It
   is currently the largest single deviation from what the sliders promise, and he already has a
   workaround (set it to 0).
2. **OVERVIEW-FRAMING-1's closed-only scoping** (B1 #9). It is an unfinished feature, not a
   projection issue; CAMERA-REFACTOR-0 recommended reverting it and that recommendation stands.
3. **The `W_REF = 285` cap.** It is in `RaceScreen`'s sprite sizing, not the camera. It must be fixed
   for the resolution guarantee to hold ~~above ~4600-px worlds~~ **on any track wider than 300 px
   (see the CORRECTION above)**, but it is a different file with a different owner and deserves its
   own attributable change. **It binds on no shipped track today** — so it is a future trap, not a
   present distortion, and it does NOT gate the slider-unit decision
   ([CAMERA-CEILING-1](CAMERA-CEILING-1.md)).

**One thing worth doing immediately and cheaply, whatever else happens:** the Dev Screen tooltip for
the OVERVIEW "Sprite scale" slider should stop implying it is comparable to the others. One sentence —
*"this number sets the racer's size on screen (28 × n pixels); the other states' numbers set the camera
distance, so they are not comparable"* — would have saved the owner this whole investigation. Not a
fix; an honest label.

---

## VERIFICATION

The whole verification for this block: **the diff contains no simulation file.**

```
$ git diff --stat master..camera-refactor -- (this commit)
 reports/evolution/CAMERA-REFACTOR-1.md | (new)
 reports/evolution/INDEX.md             | 1 +
```

Two files: this report and its INDEX entry. **No source file of any kind is in the diff**, so a
fortiori no simulation file.

**Paths I treated as simulation** (the set that would have required a fingerprint had any been
touched): `client/src/modules/raceStep.js`, `raceCore.js`, `raceBehavior.js`, `raceGovernor.js`,
`racePlanner.js`, `raceBaseSpeed.js`, `raceDynamicsConfig.js`, `raceBehaviorConfig.js`,
`durationModel.js`, `raceLengths.js`, `rowLayout.js`, `heroChoreography.js`, `heroCurveGenerator.js`,
`headlessRaceSimulator.js`, `client/src/modules/parity/**`, `client/src/modules/storage/defaults.js`,
`scripts/sim-fairness.mjs` and the `scripts/exp-*.mjs` harnesses. None appear in the diff.

I *read* several of those (`rowLayout.js`, `raceBehaviorConfig.js`, `raceCore.js`) to reproduce the
sprite-size derivation, and I *ran* `sim-fairness.mjs` twice as a read-only recorder
(`--dump-frames`, which installs an observer hook and writes only to the scratchpad). Reading and
recording are not touching; the diff is the proof.

Four scratch measurement scripts were written for this block and are deliberately **not** committed —
they are throwaway instruments.

---

## What I could not determine, and why

1. **The owner's exact `minRacersVisible` and `overviewTargetScreenPx` in the session that produced
   the screenshots.** I used the shipped `overviewTargetScreenPx = 28` and the two spriteScale values
   he reported (1.75 / 3.00). If his `overviewTargetScreenPx` differs, the OVERVIEW numbers scale
   linearly with it — **the collision at 441 vs 427 px is specific to 28**. Everything else in the
   report is independent of it. One line from his Dev Screen would pin it.
2. **Whether the `0.8` open-track OVERVIEW ceiling is still needed.** Its comment says it prevents the
   leader leaving the canvas during a pan — a pan problem solved with a zoom cap. Since it binds 100%
   of the time it is doing all the work on open tracks, so removing it is not safe without knowing
   whether the pan problem it guards against still exists. That is a live eye question, not a
   measurement.
3. **Why `MAX_INVERSE_ZOOM` was raised for Mountainstreet specifically.** Mountainstreet is an *open*
   track, where the cap is `10 × 1.5 = 15` and the largest shipped slider (2.81) needs only 1.87 — so
   5 would already have sufficed. Either the track was closed at the time, or it was raised against
   the closed formula. The history would settle it; the number's present behaviour is measured either
   way.
4. **The behaviour of a genuinely large CLOSED track.** None exists to record, so B2's closed
   large-world rows are synthetic (the same authored picture rescaled), not a recorded race. The
   formula table they rest on was validated against the running director on two real tracks, so I am
   confident in the arithmetic — but no closed track above 3072 px has ever actually been played.

---

## What I judged to be over-securing, and what I did instead

1. **Running the test suite or the CI guards.** This commit is a Markdown file and one INDEX line.
   Neither would prove anything the diff does not. **I ran neither.** (In CAMERA-REFACTOR-0 I ran the
   camera suite once as a coverage *measurement*; there was no such measurement to make here.)
2. **Re-bisecting the leader-view regression.** The owner's eye has settled it — min-visible floor,
   confirmed. Re-proving a confirmed cause with a third instrument is securing the same thing a third
   way. **Instead I spent that budget on *why* the floor is asymmetric (A4)**, which was still open and
   which turned up a live unfixed bug (the per-axis divisor) that nobody had measured.
3. **A full N-race sweep across tracks.** The zoom chain is deterministic given
   `(worldW, worldH, isOpen, bodyRef, config)` — it does not vary by seed, by racer position, or by
   frame. One recorded race per topology is sufficient to prove the formulas run as derived; more races
   would produce identical numbers. **Instead I validated 16 predictions against the running director
   and swept the *resolution* axis**, which is the variable that actually moves the answer.
4. **What I did not trim:** measure before proposing — every number in Parts A and B is measured or
   validated, none is derived-and-asserted; and this block changes nothing, including the two live
   bugs it names.
