# CAMERA-MIN-DRAW-1 — never draw a racer too small to read

Branch `camera-refactor`, one commit. Return tag `pre/min-draw` (`766a6f94`), registered in
[TAGS.md](../../docs/TAGS.md) in the same step.

**Mint tripwire: APPLIED, and this is its first block.** The diff touches `autoSpriteScale.js` and
`storage/defaults.js` — under `client/src/modules/`, outside `camera/` — so the rule added in
CAMERA-MINT-TRIPWIRE-1 required a mint. Result: **`dc4647be0f55ebdb`, unchanged**; `space-sprint`
`721f192e8b08`, unchanged. Presentation-only, now measured rather than assumed.

---

## 1. THE CAUSE WAS OURS, AND SO WAS THE MISREADING

CAMERA-PICTURE-FIXES-1 removed `computeRenderDisplayScale`'s
`Math.max(proportionalScreenPx, minTargetScreenPx)`. The measurement said it bound only in OVERVIEW —
but there on 9 of 10 tracks. **The start runs in OVERVIEW**, which is exactly what the owner
screenshotted.

The planner misread his reaction at the time: *"the horses are noticeably smaller in overview"* was an
observation that the change had landed, not a judgement that he liked it. His evidence this time
settles it — the Space Sprint start formation **used to overlap slightly and no longer does**. Same 20
slots, same grid, smaller sprites.

This is the same shape as the min-racers floor in CAMERA-COMPANY-1: **a legitimate purpose inside a
broken implementation.** The purpose here is readability.

## 2. THE MEASUREMENT THAT SETS THE DEFAULT

A racer's drawn screen size is `drawnWorldSize × frameEffZoom`, both camera-free until the frame is
drawn. At 40 racers on the shipped defaults:

| track | drawn (world) | OVERVIEW 1.5 | LEADER 0.75 |
|---|---:|---:|---:|
| Searound | 24.9 | 47.2 px (6.6%) | 94.4 px |
| Dirt Oval | 16.9 | 32.1 px (4.5%) | 64.1 px |
| River Run | 28.5 | 45.6 px (6.3%) | 91.2 px |
| **Mountainstreet** | 14.3 | **22.8 px (3.17%)** | 45.6 px |
| **Seatrack** | 14.3 | **22.8 px (3.17%)** | 45.6 px |
| **Space Sprint** | 14.3 | **22.8 px (3.17%)** | 45.6 px |

**The anchor is his own reference image, not the old value.** Under the old unit OVERVIEW was 4 of the
track's *own* corridors — 1200 world px on Space Sprint — so the rockets would have been drawn at
**8.6 px** and the old 32 px floor lifted them **3.74×**. What he approved is therefore
**32.0 screen px = 4.44% of frame height**.

Today, without a floor, the same formation is **22.8 px** — a **29% shrink**, and the reason the
overlap disappeared.

**Proposed default: 0.045 (4.5% of frame height = 32.4 px)** — reproducing the picture he approved to
within 1%, in a unit that survives the next change of zoom rule.

### Where it binds

| floor | = px | binds |
|---:|---:|---|
| 3.0% | 21.6 | nowhere |
| 4.44% | 32.0 | OVERVIEW on 3 tracks |
| **4.5%** | **32.4** | **OVERVIEW on 4 tracks** |
| 5.0% | 36.0 | OVERVIEW on 6 |
| 6.0% | 43.2 | OVERVIEW on 8 |

At the default it lifts **Mountainstreet, Seatrack and Space Sprint ×1.42** (22.8 → 32.4 px) and
**Dirt Oval ×1.01** — a 0.3 px nudge, below anything the eye separates. **Nothing outside OVERVIEW is
touched at any value up to 6%**, because LEADER's 0.75 corridors already draws the smallest racer at
45.6 px.

If you would rather it bind on exactly the three tracks that need it, **4.4%** does that and is within
1% of the same picture. The 0.1% difference is 0.7 screen px.

## 3. DRAWING ONLY — pinned, not promised

The old floor's real defect was that it became a second, silent zoom authority fighting the owner's
own setting. The new one bounds **one multiplication in the render loop**.

That is a test, not a claim: every state zoom is asserted **byte-identical** with the floor off, at the
default, and at an absurd 0.9 — and identical again to a config that does not carry the key at all.
The camera cannot read the value because nothing in the camera path is given it.

**Presentation-only, confirmed after the change.** The engine reads `drawnBodyWidthRefPx`, computed
once per race from world-space inputs and frozen onto each racer. This floor lives in
`computeRenderDisplayScale`, whose output goes to `drawRacer` alone. The mint above is the proof.

## 4. THE CONNECTION WORTH NOTING

This puts a **lower bound under the parked row-count defect** — the one where Mountainstreet, Seatrack
and Space Sprint draw a boarder, a dolphin and a rocket at exactly the same 14.3 world px because all
40 racers fit in one start row.

It does not fix it. Those three still draw at an identical size, and the artwork is still erased
between them. What it stops is that erasure also being *unreadable*: at 32.4 px you can at least see
what the thing is. The real fix — taking the drawn size from the authored sprite instead of the
packing formula — remains parked, because that value is an engine input.

## 5. HYGIENE AND TESTS

**New key:** `minDrawnFrameFrac` in `DEFAULT_CAMERA_CONFIG`, next to its twin `maxTargetScreenPx` —
the ceiling already lived there, so the floor introduces no new home. No schema, no migration:
defaults underneath, stored values on top, so it reaches a stored config on first load.

**Not restored, deliberately:** `getEffectiveMinTargetScreenPx`, the old per-type absolute-pixel
override. It belonged to the pixel implementation and nothing asked for it back.

**Left, and listed:** `autoScaleConfig.minTargetScreenPx` (still read by the Racer Editor's per-type
min-size preview) — a pre-existing orphan for the render path, in a race-relevant config block, so
removing it moves the world hash and needs the engine ceremony.

| file | before | after |
|---|---:|---:|
| `modules/autoSpriteScale.js` | 105 | **128** |
| `modules/autoSpriteScale.test.js` | 246 | **322** |
| `modules/storage/defaults.js` | 743 | 756 |
| `camera/zoomUnit.test.js` | 350 | **394** |
| `screens/RaceScreen/index.jsx` | 1622 | 1626 |
| `DevScreen/sections/CameraAdvancedSection.jsx` | 1456 | 1477 |

**9 new tests.** The floor guarantees the fraction exactly and not a pixel more; does nothing once the
sprite is big enough; remains a floor rather than a target (size still rises with zoom above it); 0
turns it off; **it is a fraction — a 1440-tall canvas gets exactly twice the floor**, which is the
whole reason it is not 32 pixels any more; it outranks the ceiling when the two contradict. Plus the
**failure proof** — the owner's own picture as arithmetic: without the floor Space Sprint's start draws
at 22.8 px (3.17%), with it at 32.4 px, a ratio of 1.42. And the **zoom-independence** pair above.
**3438 green.**

## 6. THE OWNER'S EYE

**The Space Sprint START formation — you already have the reference image.** It used to overlap
slightly and you were happy with that. Does it now read the way it used to?

**The target is readable, not identical.** The unit underneath has changed twice since that
screenshot: OVERVIEW was 4 of Space Sprint's own corridors (1200 world px) and is now 1.5 standard
corridors (450). The floor restores the racer to 32.4 screen px, the size in your picture — but the
amount of *track* around it is deliberately different now.

If it is still too small, the control is **"Minimum racer size (% of frame)"** in Camera Advanced;
5% and 6% are one and two steps up, and the table in §2 says what each would touch. 0 turns it off and
gives you the picture you have been looking at.

Press **M** and send the **whole** line.
