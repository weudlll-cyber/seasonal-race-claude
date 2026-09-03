# BOARD-PORTRAIT-FIT-1 — the beetle is SEVENTH. The board sized one axis of a two-axis picture, and 13 of 20 types spilled onto the number

> **NOT MERGED. `fix/board-portrait-fit-1`, off master, and your eye is owed** — see §6 for what to
> look at and where.
>
> ★ **THE RENDER FINGERPRINT MOVED, deliberately: `485b73d527602a0e` → `733b3f100d6a819f`.** It
> samples the STARTERS board, so a visible board change must move it. **Nothing was minted.**
> **World `8a1977187e9c99b4` and camera `152cf295c4c9ff54` are both UNMOVED** and verified (R17).
>
> **It predates 2026-08-25 and has nothing to do with the beetle.**

---

## 1. THE CAUSE — `displaySizeScale` SIZES ONE AXIS, AND THE BOARD BELIEVED IT SIZED A PICTURE

The board asked for a 26.3 px portrait like this:

```js
const spriteScale = displaySize > 0 ? portraitPx / displaySize : 1;
```

`displaySizeScale` is **the visible body's NARROW reference divided by displaySize**. `_drawBody`
divides by the body fill to get frame units, so the narrow axis lands on `portraitPx` — and **the
other axis is not bounded at all.** It follows the sprite's own proportions.

**And every shipped type has `baseRotationOffset = π/2`, which lays that unbounded axis ACROSS the
screen** — straight at the number chip on its left.

**The board's own comment says what it believed:** *"The drawn portrait is 94 % of it, so it goes
from ~30.1 px to ~26.3 px."* **26.3 px was only ever its height.**

---

## 2. THE MEASUREMENT — 13 OF 20 BY GEOMETRY, 14 OF 20 BY INK, AND THE BEETLE IS NOT THE WORST

The portrait's centre sits 20 px right of the number chip's edge, so anything wider than 40 px lands
on the number. **Drawn body width, at scale 1, for every shipped type:**

| | width | over the chip | | | width | over the chip |
| --- | --- | --- | --- | --- | --- | --- |
| rocket | 75.8 | **+17.9** | | snowmobile | 45.7 | +2.9 |
| giraffe | 74.5 | **+17.2** | | f1 | 45.2 | +2.6 |
| **horse** | **59.6** | **+9.8** | | **beetle** | **44.4** | **+2.2** |
| dolphin | 58.1 | +9.0 | | koi | 41.6 | +0.8 |
| snake | 56.7 | +8.4 | | snail | 34.0 | — |
| luge | 53.9 | +7.0 | | manta / turtle | 33.5 / 33.4 | — |
| motorbike | 52.6 | +6.3 | | plane / dragon | 29.3 / 28.3 | — |
| boarder | 47.5 | +3.8 | | buggy / duck | 27.3 / 26.3 | — |
| elephant | 45.8 | +2.9 | | | | |

**And in actual ink**, measured from the artwork with `sharp` at alpha ≥ 10, frame 0 — how many
opaque pixels land on the chip:

| | screen px² on the number | | | screen px² |
| --- | --- | --- | --- | --- |
| giraffe | **161.5** | | rocket | 53.1 |
| dolphin | **110.9** | | snake | 50.7 |
| luge | **97.5** | | **beetle** | **42.7** |
| **horse** | **61.8** | | boarder … koi | 41.1 → 3.5 |

**14 types put real pixels on the number. The beetle is seventh.** The horse — the default racer on
most tracks — puts **45 % more ink on it than the beetle does**.

### Answering the four questions directly

| question | answer |
| --- | --- |
| **Is the beetle's icon genuinely larger?** | **No.** Its `displaySize` is **38**, below the median of the twenty (luge 80, manta 56, koi 52, horse 47). |
| **Does the board size icons per type, or assume one size?** | **Per type, on ONE AXIS.** It sizes the narrow axis correctly for all twenty and leaves the long one free. The assumption is that **a body is roughly square**, and thirteen are not. |
| **Do other types have the same problem?** | **Thirteen do by geometry, fourteen by ink, and six are worse than the beetle.** |
| **Did it arrive on 2026-08-25?** | **No.** `d73ec6a9` made the beetle garden-path's default that day, which is when a *beetle* board became reachable — the defect is in the board's sizing rule and is as old as the portrait column. |

**Why he saw it on the beetle and not the horse, I do not know and did not measure.** The honest
statement is that it is not because the beetle is bigger. A plausible reason — the beetle's body is a
solid compact mass where the horse's overflow is thin legs and tail — is a guess, and the bounding
box is what I measured, not the density of what fills it.

---

## 3. THE FIX IS THE ASSUMPTION, NOT THE SPRITE

**Nothing in `client/public/assets/` or in any racer's config was touched.**

`SpriteRacerType` gains three things, and the first two are the important ones:

- **`_guardedFillNarrow()` and `_frameScale()`** — the fill/guard/scale arithmetic that `_drawBody`
  computed inline, extracted so there is **one home**. `getBodyBox` has to agree with it exactly, and
  two copies of a formula whose only job is *"how big is this drawn"* is precisely how a caller comes
  to believe a size it is not getting.
- **`getBodyBox(scale)`** — the drawn body's **on-screen** bounding box, rotation included.
- **`getPortraitFitScale(boxW, boxH)`** — the scale that fits a box. **The type answers, not the
  caller**, because the body fill, the rotation and the silhouette scale are its own.

The board now asks:

```js
const spriteScale =
  typeof racerType?.getPortraitFitScale === 'function'
    ? racerType.getPortraitFitScale(portraitPx, L.cellH * PORTRAIT_FRAC)
    : displaySize > 0 ? portraitPx / displaySize : 1;
```

**Result: every one of the twenty fits, on both axes, and none reaches the chip.** Portraits are now
a common **26.3 px wide**, with heights that follow each animal's real proportions.

**The race is untouched, and a test holds that.** On the track, sizing by the narrow axis is
*correct* — body fill feeds row layout and contact braking, and a racer that shrank to fit a box
would change who wins. `getPortraitFitScale` is UI-only and nothing on the track calls it.

---

## 4. ★ THE COST, WHICH IS REAL AND IS YOURS TO JUDGE

Fitting the width means long racers get **shorter** portraits:

| | before | after | height |
| --- | --- | --- | --- |
| rocket, giraffe | 75 × 26 | 26.3 × **9.2** | **35 %** |
| horse | 59.6 × 26.3 | 26.3 × **11.6** | 44 % |
| beetle | 44.4 × 26.3 | 26.3 × **15.6** | 59 % |
| duck | 26.3 × 26.3 | 26.3 × 26.3 | **100 %, unchanged** |

**That is the column's geometry, not the fix's fault.** The portrait's centre has 20 px of room to
its left and 14 px to its right before the row marker — **so a portrait wider than ~28 px cannot
exist here**, and a rocket at 75 px never could.

**If the portraits are now too small, the column has to grow, and that costs the name.**
START-BOARD-5 narrowed this column 32 → 28 at your word that it "may be a little smaller". For a
number: **a 40 px column would give the horse a 17.7 px portrait instead of 11.6.** That is a
decision about the board's proportions and is not one I should take.

---

## 5. WHAT IS PINNED — AND THE FIRST VERSION OF THE TESTS WAS WORTHLESS

Ten tests. Every one measures **all twenty types**, never the beetle — pinning the beetle would have
pinned the instance and left the class.

★ **THE SABOTAGE THAT MATTERED WAS THE ONE THAT DID NOT FIRE.** I put the old
`portraitPx / displaySize` back into the board and **all eight tests stayed green**, because every
one of them measured `getPortraitFitScale`'s arithmetic and none had ever asked what the *board*
passes. **A rule the caller does not use is a rule that is not in force**, and a test that cannot
tell the difference reports a fix that is not there.

Two wiring tests were added: one drives `drawStartBoard` with a spy racer type and asserts it
**asks** for a fit and draws at **exactly** the scale it got back — and that this is *not* the old
rule's answer; one asserts a type without the helper still gets drawn. **Re-run against the same
sabotage: red.** Restored: 10/10.

Also pinned, so a later reading of this history cannot soften it: **the old rule overflowed on at
least ten types, including the horse**, and **the beetle is not the largest**.

---

## 6. WHAT TO LOOK AT, AND WHERE

**On any track, during the countdown, when the STARTERS board is up.**

1. **`garden-path`** — the beetle, which is what you reported. The portrait should now sit clear of
   its number chip.
2. **★ Any track with the `horse`** — this is the one that decides whether the fix is right, because
   the horse was overflowing **four and a half times as far** as the beetle and you have been looking
   past it. It should now be clear too, and noticeably shorter than it was.
3. **`luger-hill`** — the luge, the largest `displaySize` of the twenty (80), and a good check that
   nothing shrank that did not need to.
4. **The duck, if you have a track running it** — it must look *exactly* as it did. A fix that
   changed every portrait would be a different defect.

**The question for your eye is §4:** the portraits of long racers are now noticeably shorter. If that
is worse than the overlap, the column needs to widen and the name pays for it.

---

## Limits

**The render fingerprint moved and was NOT minted.** `485b73d527602a0e` → `733b3f100d6a819f`, on all
ten tracks, because the board is one of its sampled beats. That is the ceremony asking for a
deliberate mint and only you can order it. **World and camera were re-run and are unmoved**, which is
the R17 pairing: this block names what must not move and shows it did not.

**The ink measurement is frame 0 only**, which is what the board draws. The union over an animation
would be larger for types whose limbs sweep; it would not change the ranking of the top few.

**The 90° rotation is universal today and the helper does not assume it** — `getBodyBox` takes the
axis-aligned box of the rotated body, so it is right for any angle. Untested at angles other than 0
and 90 because none exists.

**The cell HEIGHT was never the problem.** `CELL_H` is 30 and the old portraits were 26.3 tall, so
they fitted vertically all along. The new box uses `cellH × 0.94` = 28.2, which is slightly more
generous — no type is height-limited today, so it is a bound rather than a change.

**Nothing was measured in a browser.** The geometry is arithmetic and the ink is read from the PNGs;
what a rasteriser does with a 9-px-tall rocket is a question for your eye and not for this report.
