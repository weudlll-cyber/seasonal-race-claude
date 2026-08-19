# LABEL-OVERLAP-3 — the screen was right, the instrument was wrong three times over

**2026-08-22 · branch `invest/label-overlap-3` off master `eaca23cf` · INVESTIGATION ONLY — no
repair, no default, `labelNamesWhenRoom` untouched · nothing changes in the product, so no
fingerprint can move and none was run · 4173 left alone**

## The verdict, first

**The room test is BROKEN.** In the owner's own frame, measured by pixels with real fonts:
**7 of 12 name labels collide.** The layout said 0.

**And every single collision is name-versus-NUMBER** — never name-vs-name, never name-vs-body. That
asymmetry names the defect exactly.

**So LABEL-NAMES-2's conclusion falls, and with it the reversal it forced on LABELS-AND-FLOOR-1.**
The labels are *not* fine. The sprite-floor decision waiting on his eye is now one of **two** real
defects, not the only one.

---

## The defect, with file and line

**`client/src/screens/RaceScreen/nameTagLayout.js:184` — `const YIELD_OVERLAP_FRAC = 0.35;`**
applied at **`nameTagLayout.js:413`** in `fits(box, hasTenure)`:

```js
const budget = hasTenure ? yieldOverlapFrac * area : 0;
```

**A name is admitted with ZERO tolerance. A number is then allowed to land ON it with a 35 % budget.**

The placement pass runs in priority order. A name is admitted only if `nameClear` — its wide box
against everything placed so far, no tolerance at all. But a label placed *later* that already has
tenure is tested with `fits`, which forgives intrusion up to **35 % of its own area**. The name was
cleared against the world as it stood; the world then moved onto it, and nothing re-checked.

**The measured intrusions confirm it term for term.** A two-digit number box at 15.84 px is about
28 × 21 px ≈ 588 px², so an incumbent's budget is ≈ 206 px². Every observed intrusion in his frame:

| name | collides with | intrusion | inside the 35 % budget? |
| --- | --- | --- | --- |
| Hawk | number `16` | 192 px² | yes |
| Comet | number `54` | 99 px² | yes |
| Amber | number `34` | 57 px² | yes |
| Ridge | number `39` | 50 px² | yes |
| Rocket | number `12` | 49 px² | yes |
| Crimson | number `43` | 44 px² | yes |
| Vortex | number `48` | 31 px² | yes |

**Seven for seven.** Not one of them is a near miss or a rounding artefact; every one is a number
spending exactly the allowance the code grants it.

**The code's own justification is inverted from the failure.** `nameTagLayout.js` argues (line ~479)
that `fits` need not be consulted for the wide box because *"`nameClear` is strictly stronger … ZERO
tolerance where `fits` has an incumbent's budget."* That is true **about the name's own admission**
and says nothing about what is allowed to be placed on the name afterwards — which is where all the
damage is.

### The second, separate one: PHOTO_FINISH bypasses the test entirely

**`client/src/screens/RaceScreen/renderRaceFrame.js:258`** — `exemptAll: camera?.state ===
'PHOTO_FINISH'` — and **`nameTagLayout.js:440`**, where an exempt label's wide box is placed with no
clearance test at all.

That is deliberate, and its stated reason is *"at that zoom every racer stays recognisable even when
the labels overlap"*. **The premise is false.** Measured at t = 57 s in his race:

| | |
| --- | --- |
| shot width | **1951 world px — the WIDEST shot of the entire race**, wider than the OVERVIEW's 800 |
| labels on canvas | 34 of 41 |
| names overlapping, by pixels | **40 of 41** |
| names clipped by the canvas edge | **9** |
| worst pair | Raptor / Phoenix, 1159 px² |

"At that zoom" assumed PHOTO_FINISH is the tightest shot in the race (0.4 corridors). It is not any
more: the guarantee widens it, and at 1951 px the exemption dumps forty overlapping names on screen.
**"Sit on top of one another and clip" is a literal description of this frame.**

---

## The captured frame, beside the layout's claim

space-sprint, seed 9, 60 racers, 1280 × 720, his eleven config values, **his roster** — the wide
OVERVIEW mid-race, t = 20 s, 800 world px, 60 racers on screen.

| | layout's own count | **by the pixels, real font** |
| --- | --- | --- |
| labels drawn | 58 | 58 |
| names | 12 | 12 |
| **names overlapping** | **0** | **7** |
| of which the exempt subject | 0 | **0** — every one is an ordinary name |

Rendered to a real canvas at 1280 × 720 and classified per label: 7 red, 5 green. The pixel count is
independent of the layout — it re-measures every box with the browser's own `measureText` and tests
the drawn rectangles.

---

## Why the instrument said zero — three defects, all in my harness

The brief said to assume the instrument. It was right three times over, and all three are in
`scripts/label-names-truth.mjs` as LABEL-NAMES-2 ran it.

**1. The audit shared the layout's own measurement function.** It measured label widths with the same
synthetic `length × px × 0.55` the layout used, so it could only ever *confirm* the layout. It was
never an independent check — it could catch a geometry or anchor bug and nothing else. **This is the
one that matters**, and it is why "0 of 8" was reported with confidence.

**2. The wrong roster.** It ran `QUICK_TEST_NAMES_MIXED`; his screenshot names — Crimson, Hawk,
Nebula, Pulsar, Garnet — are in `QUICK_TEST_NAMES`, which `DEFAULT_NAME_SET` resolves to and which
the owner confirmed he was using. **A racer's name is an engine input** (`stablePairBit` hashes it),
so that was a different race at the same seed, not a neighbouring frame of the same one.

**3. Every number label was the empty string.** `assignRaceNumbers(count, seed)` takes a count and
*returns* an array; the harness called `assignRaceNumbers(st.racers)`, which resolved the array to 0
and returned `[]`. No racer had a `raceNumber`, so `raceNumberLabel(undefined)` gave `''` and every
non-name label was a **10 px box of pure padding** instead of the 20–27 px the game draws. The room
test was handed a picture with far more space than it has — which is precisely why it admitted names
without collisions. Every other harness in the repo already does this correctly
(`render-fingerprint.mjs:357`, `label-degrade-truth.mjs:99`); this one did not.

**All three are fixed in the harness and the file records each at its site.** Defect 3 is also
present in **`scripts/sprite-size-truth.mjs:124`** and is *not* fixed there, because that harness's
published numbers are sprite and gap measurements which do not read a label — but its label columns
are affected and should not be quoted.

**Ruled out, with the measurement that ruled it:**

| candidate | verdict |
| --- | --- |
| synthetic vs real font metrics | **not the cause** — median real/synthetic ratio **1.01** across his roster (range 0.75–1.19), measured in Chrome at `bold 15.84px sans-serif` |
| layout and renderer using different fonts or boxes | **no** — both set `bold ${tagFontPx}px sans-serif` and both call `labelBoxWidth(measureText(text))`; one measurement, one box |
| the test running in a different coordinate space | **no** — `boxAt` (`nameTagLayout.js:283`) includes `labelOffsetAbove` and `labelBoxHeight`, the same terms `drawNameTag` uses; both are canvas px |
| his display resolution / DPR | **no** — established in LABELS-AND-FLOOR-1 and unchanged: the backing store is a fixed 1280 × 720 |
| the declutter step being skipped, roll-call style | **partly YES — in PHOTO_FINISH only**, via `exemptAll`. In OVERVIEW the declutter runs and is simply too permissive |

---

## Which of LABEL-NAMES-2's numbers survive

| claim | status |
| --- | --- |
| **`labelNamesWhenRoom` is the key that produces the names** | **STANDS**, and it is structural rather than statistical: `renderRaceFrame.js:248` passes `wideLabelOf` only when that key is true, and without it `e.wide` is null so no name can be drawn by any path |
| `highlightHeroes` draws a ring, not a label | **STANDS** — `racerRendering.js:190`, a `ctx.arc` stroke |
| the room test is behaving correctly; 0 of 8 non-exempt overlaps | **WITHDRAWN — it is wrong.** 7 of 12 in the same frame |
| every name/number COUNT (670 total, 6 names, 11 labels…) | **WITHDRAWN** — wrong roster, empty numbers |
| the leave-one-out DELTAS | **RE-RUN on the corrected harness — the shape holds, the numbers move** |
| `minRacersVisible` 8-vs-5 barely matters | **STANDS** — now −6 of 767 (0.8 %) |

### The leave-one-out, re-run with the right roster and real numbers

| reverted key | names (total) | Δ |
| --- | --- | --- |
| **`labelNamesWhenRoom`** | **0** | **−767** |
| `OVERVIEW.trackingTC`, `minRacersVisible` | 761 | −6 |
| `highlightHeroes`, `battlePulkThresholdT`, `battleCooldownMs`, `finishPauseMs`, `winnerCardMs`, `corridorCapArriveMs` | 767 | 0 |
| `battleWeight` | 821 | +54 |
| `outcomePhaseThreshold` | 864 | +97 |

**Same answer, different totals** (767 rather than 670): one key takes it to zero, no pair is needed,
and two of his keys still go the other way. LABEL-NAMES-2's *conclusion* on this question was right
for the wrong-roster, empty-number reason; it is now right for the right one.

LABELS-AND-FLOOR-1's reversal — "the sprites are the problem, the labels are not" — **falls with it.**
Both are real. The sprite floor still overlaps sprites by 3.2 px in this frame; the labels now also
overlap, 7 of 12.

---

## What the owner must decide

**Nothing yet — this is a defect to fix, not a preference to choose.** Two decisions follow once it
is fixed, and they are separable:

1. **Should a name be re-checked when something later lands on it, or should a tenured number simply
   not be allowed to intrude on a NAME?** The smallest correct fix is the second: give `fits` no
   budget against a box holding a wide form. It is one condition, it keeps the anti-churn budget
   everywhere it was earned, and it cannot make labels flicker more than they do now.
2. **Is the PHOTO_FINISH exemption still wanted now that the shot can be the widest in the race?**
   Its premise was "at that zoom"; the zoom moved. Either re-scope the exemption to a width, or drop
   it.

Neither is built here.

## PROPOSALS

**1. The smallest correct fix for the room test: deny the incumbent budget against a wide box.**
`fits` currently forgives 35 % intrusion into anything in `placed`. Tagging the entries that hold a
NAME and giving them zero tolerance costs one field and one condition, leaves the churn budget intact
between numbers, and directly removes all seven collisions measured here. **Not built.**

**2. Re-scope the PHOTO_FINISH exemption to the shot it was written for.** The reason it is safe is a
statement about WIDTH, so it should be a test on width rather than on the state name — the same
correction the sprite floor needs, and for the same reason: a number calibrated against a shot that
has since changed. **Not built.**

**3. Make the label instrument measure pixels, not the layout's opinion of pixels.** The audit that
reported "0 of 8" shared the layout's metric by construction. An instrument that re-measures the
drawn boxes independently — as this report's browser pass does — is the only kind that can ever
contradict the layout, which is the only reason to have it. **Cost:** the browser pass here, made
repeatable. **What it prevents:** the fourth instance of this exact week.

## Reproducing

```
node scripts/label-names-truth.mjs --roster=current                 # his race, his config
node scripts/label-names-truth.mjs --roster=current --dump-at=20    # the frame, as drawn
node scripts/label-names-truth.mjs --roster=current --dump-at=57    # the PHOTO_FINISH frame
```

The pixel count is a browser pass over the dumped frame: real `measureText` at
`bold 15.84px sans-serif`, boxes rebuilt at `labelOffsetAbove` / `labelBoxHeight`, rectangles tested
for shared pixels. **It reads nothing from the layout** — that is the whole point of it.
