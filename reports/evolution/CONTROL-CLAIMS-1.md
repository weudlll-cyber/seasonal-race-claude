# CONTROL-CLAIMS-1 — the class is SIX, not one, and every one of them is in the card that TYPES its numbers instead of reading them

> **READ-ONLY.** Nothing was edited on this branch. Four kinds of claim were measured across all 24
> Dev Screen files; the two that were repaired tonight are marked as repaired and by which piece.

---

## THE COUNT, BY KIND

| kind — what the control claims about its value | measured | **false** |
| --- | --- | --- |
| **A. its BOUNDS contain the shipped value** | 96 controls resolved | **1** *(fixed, piece 1)* |
| **B. its STEP can REACH the shipped value** | 96 controls resolved | **3** |
| **C. its LABEL's stated range matches min/max** | 6 labels state a range at all | **0** *(1 fixed, piece 1)* |
| **D. its TOOLTIP names the shipped value** | 22 value claims pairable with a key | **2** *(4 more fixed, piece 3)* |
| | | **6 tonight; 4 repaired, 2 standing** |

**The class is six, not one.** Piece 1 asked how many controls could not *represent* their value and
the honest answer was one. **That was the smallest of the four kinds.**

---

## 1. ★ THE STRUCTURAL FINDING — ONE CARD TYPES ITS NUMBERS, THE OTHER READS THEM

| | `DynamicsTuningSection.jsx` | `CameraAdvancedSection.jsx` |
| --- | --- | --- |
| tooltips | 45 | 53 |
| **tooltips that interpolate the LIVE value** (`Currently: ${config.x ?? DEFAULT.x}`) | **0** | **24** |
| typed numeric value claims | 15 `"N = shipped"` + 4 `"Default: N"` | **1** |
| **false value claims found tonight** | **6** | **0** |

**Every defect in kind D is in the card that types.** The camera card's per-state tips are
`tip: (v) => …` — functions of the live value — and its section tips interpolate. **A tooltip that
reads the value it describes cannot drift**, and one card already does it.

**That is the repair, and it needs no guard**: the fix for kind D is to interpolate, not to check.
It is also the reason a guard would be awkward — a value claim can be spelled `"0.5 = shipped"`,
`"Default: 67%"`, `"every state ships 0.25s"` or `"2000 was the calmest value"`, and the last of
those is a measurement, not a config claim. **See §5.**

---

## 2. KIND B — THREE CONTROLS WHOSE SHIPPED VALUE IS OFF THEIR OWN STEP GRID

This is piece 1's defect one level subtler, and **Rule C declares itself blind to it in as many
words**: *"`step` — whether the shipped value is REACHABLE by stepping from min, as opposed to merely
inside the bounds."*

| control | ships | min | step | the grid | consequence |
| --- | --- | --- | --- | --- | --- |
| `maxLateralSpeedPerStep` | **0.028** | 0.005 | 0.005 | 0.005, 0.010, … 0.025, **0.030** | one arrow-click lands on 0.025 or 0.030 and **cannot return to 0.028 by stepping** |
| `lookBeforeBrakeMinDifferential` | **0.005** | 0.001 | 0.005 | 0.001, **0.006**, 0.011 … | the shipped value is not even the first stop |
| `entryConvergenceZoom` | **0.05** | 0.001 | 0.005 | 0.001, 0.006 … 0.046, **0.051** | same |

**Why this is not pedantry.** `<input type="number">` with `min` and `step` marks an off-grid value
`stepMismatch` — the browser reports the field invalid — and the arrows snap to the grid. So the
symptom is exactly `choreoOutcomeStart`'s: **touch the control and the shipped value is gone with no
way back by the same means.** It is milder only because typing the number still works.

**Three more controls have an unreachable MAX** for the same arithmetic — `draftingConeAngle`'s range
[5, 89] at step 5 stops at 85, and the three above cannot reach their own maxima either. That is a
smaller fault: nobody loses a shipped value to it.

---

## 3. KIND D — THE TWO THAT ARE STILL FALSE TONIGHT

| site | the tooltip says | it ships |
| --- | --- | --- |
| `DynamicsTuningSection.jsx:831` — *Bonus active until (% race)* | **"Default: 67%"** | `racePlanBonusTransitionEnd` = **0.75** → **75%** |
| `DynamicsTuningSection.jsx:881` — *P-Controller starts (% race)* | **"Default: 67%"** | `racePlanCorridorStart` = **0.55** → **55%** |

**The second is doubly misleading, and that is worth stating separately.** `racePlanCorridorStart` is
**overwritten at plan build** — `PHASE-CONTRACT.md` §3: *"The `racePlanCorridorStart` literal is
overwritten and never survives to a live race"*, because `corridorStart := choreoOutcomeStart`. So
its tooltip names a wrong number for a key that does not reach a race at all. An operator reading it
is told two false things at once.

**Two of the four "Default: N" claims in that card are right** (`racePlanBonusFadeDuration` 1500 ms
and `racePlanCorridorEnd` 100%), which is why this reads as drift rather than as a convention nobody
follows.

**Not fixed here.** The brief says this piece measures the class and fixes nothing. **They are on the
morning sheet with their line numbers, ready to apply.**

### The four that piece 3 did fix, recorded so the count is legible

The gap-reroll card's three tooltips carried **G=0.75** and **strength=0.5** — the values of the
2026-07-23 retune the owner **flipped on 2026-07-26** — and one described the opposite trade-off from
the one the confirm gate found. **39 days.** CITATIONS-1 applied them because they are shipped-value
claims contradicting `defaults.js`, which is that piece's declared class.

---

## 4. KIND C — THE LABEL RANGE, AND WHY ITS ZERO MEANS LESS THAN IT LOOKS

**Six labels in the entire Dev Screen state a numeric range.** Five are in
`DynamicsTuningSection.jsx`, one in `CameraAdvancedSection.jsx`. All six agree with their control's
`min`/`max` today — **one of them because piece 1 corrected it hours ago.**

**So the honest reading is not "kind C is clean". It is "kind C barely exists."** 6 stated ranges
against 90 numeric inputs. A convention followed by 7% of the controls cannot be measured for drift
in any useful way, and the sample is far too small for the zero to mean the practice is safe.

---

## 5. WHAT THIS CENSUS CANNOT SEE — DECLARED, NOT DISCOVERED LATER

- **A value claim in prose that names no number in a form I searched.** I matched `"N = shipped"`,
  `"Default N"`, `"Default: N"`, `"ships N"` and `"shipped N"`. *"the sweet-spot is tuned with the
  governor sweep"* is a claim about a value and is invisible here — correctly, since it names none.
- **Measurements that are not config claims.** The camera card says *"2000 was the calmest value on
  the measurement; 1200 is what your eye asked for"*. **1200 is the shipped value and 2000 is a
  measurement**, and no mechanical rule separates them. Any guard for kind D would have to, or it
  would fire on the sentence that is doing the most good in that tooltip.
- **The key-pairing is a HEURISTIC and it is wrong sometimes.** It reads the nearest config key in
  the control's own block; on a first pass with a wider window it mis-attributed three tooltips,
  including `pulkBiasGain`'s correct *"2.0 = shipped"*, which it blamed on `rowBonusPulk`. **Every
  finding above was re-checked by hand against the source**; the scan located them, it did not judge
  them. **That is also why this class does not get a guard tonight.**
- **Checkboxes and selects.** *"ON = shipped"*, *"OFF = shipped"*, *"symmetric = shipped"* were
  counted as claims but not paired — a boolean has no numeric grid — so kind D's denominator is
  numeric claims only.
- **Everything outside `client/src/screens/DevScreen/`.** The Racer Editor and the Track Editor have
  their own controls and are out of scope.

---

## Limits

**"96 resolved" is the same 96 Rule C reports, and 18 controls remain unresolvable** — helper rows
whose bounds are parameters, previews, and per-racer fields with no shipped default at all. This
census inherits Rule C's reach exactly, so its zeroes are zeroes over that reach and not over the
screen.

**Kinds A and B are now measured on every `verify`; kinds C and D are not.** Rule C gates on A and
declares B, C and D as blind spots. **So half of what this report counted has no standing check**, and
the two false tooltips will not be caught if they are reintroduced.

**One night, one reading.** The two outstanding defects were verified by hand; the *absence* of
others rests on five search spellings over 24 files. **6 is a floor.**
