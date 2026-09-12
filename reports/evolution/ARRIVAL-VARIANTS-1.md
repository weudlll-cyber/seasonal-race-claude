# ARRIVAL-VARIANTS-1 — four arrivals measured side by side, and his proposal makes the runaway worse

2026-09-12 · branch `night/2026-09-12b` · **FOUR VARIANTS BUILT AND MEASURED ON THE SAME RACES.
Nothing minted, no golden race re-recorded, not merged. No recommendation — the table is the answer.**

★★ **THE ONE-LINE ANSWER, AND IT IS AN AWKWARD ONE.** Your proposal — free on arrival — **gives
exactly the feel you asked for**: the multiplier sits at **1.0000** while he leads, braked in **1% of
frames** instead of 72%. ★ **But it makes the gap nearly three times bigger on screen** (median
**0.179** canvas widths against today's **0.066**), and "never break away too far" is the one fault
you named. **Today's brake is what has been containing the gap.**

★ **The guard variant (D) recovers most of that** — 0.089 widths, still unsteered — **at a cost of four
points of block fairness.** The choice is yours and §7 lays out what each one buys and costs.

---

## 1 · THE FOUR VARIANTS

| | what it does |
|---|---|
| **A** | **today.** After the release his target stays his drawn rank, so being AHEAD of it is a negative error and the servo brakes him for leading. |
| **B** | ★ **your proposal — free on arrival.** The first time he reaches his drawn place the target becomes 1.0: neither braked nor pushed, an ordinary racer from then on. Slew-smoothed through `_setTarget`, not snapped. |
| **C** | **free on arrival, and stop pushing as he closes.** As B, plus the drive is tapered over the last five ranks so he is not still on the `maxMult` ceiling when he crosses. |
| **D** | ★ **as C, plus a runaway guard.** Built because your one stated fault is "never break away too far" and **B and C both remove every brake once he is free — nothing else in the set can answer a gap that keeps growing.** Ordinary steering resumes ONLY while he is more than two ranks clear of his drawn place, so it never pins him to an exact rank: one or two ranks ahead he stays free, which your fairness correction says is fair. |

★ **NEITHER CLAMP NUMBER, THE GAIN NOR THE EASE DURATION IS TOUCHED BY ANY VARIANT**, and every branch
is inside the `heldFree` test, so no other role is reached.

★ **THE SCAFFOLD IS INERT BY DEFAULT AND THAT IS PROVED, NOT ASSERTED.** With `RA_ARRIVAL_VARIANT`
unset the world fingerprint is **`bdf4a3c8ce6e0316`** — bit for bit what it was before this piece.
Each variant moves it, which is also the per-variant sabotage the brief asked for: **undo the variant
and A's behaviour returns exactly.**

| variant | world fingerprint |
|---|---|
| A (unset) | `bdf4a3c8ce6e0316` — today, unchanged |
| B | `1ce5295139cc233c` |
| C | `a8414e0a25562d7e` |
| D | `d3dcc274b6cae555` |

---

## 2 · ★ THE PEAK GAP AFTER HE TAKES THE LEAD — A IS BEST, B IS WORST

**Method.** 10 tracks × {20, 40, 60, 100} racers × 2 seeds = **80 race slots per variant, the same 80
every time**; 51 cast a held comebacker in every arm, 34–37 of those reached the front. The screen
figure is the camera's own `visibleWorldPx` (`CameraDirector.js:540`) — the class's falsifiable
reading — not a hand-written projection, because open and closed tracks scale differently.

| v | leaders | median % of race | p90 % | max % | median widths | p90 widths | ★ max widths |
|---|---|---|---|---|---|---|---|
| **A** | 37 | ★ **0.307** | ★ **0.801** | ★ **1.338** | ★ **0.066** | ★ **0.300** | ★ **0.597** |
| **B** | 36 | 0.500 | 1.309 | 1.588 | **0.179** | 0.549 | 0.837 |
| **C** | 34 | 0.476 | 1.259 | 1.690 | 0.120 | 0.413 | 0.769 |
| **D** | 34 | 0.445 | 1.259 | 1.690 | **0.089** | 0.413 | 0.769 |

★★ **TODAY WINS EVERY COLUMN.** Removing the brake does what removing a brake does: **B's median gap
on screen is 2.7× today's**, and its worst case is 0.837 of a canvas width against 0.597.

★ **AND THE ORDER B → C → D IS THE STORY.** Stopping the push as he closes (C) takes the median from
0.179 to 0.120 widths; adding the runaway guard (D) takes it to 0.089. **Each addition claws back part
of what freeing him gave away, and none of them gets back to A.**

---

## 3 · HOW LONG IT OPENS, AND HOW FAST IT CLOSES

| v | time to the peak | time to halve it | came back down |
|---|---|---|---|
| **A** | ★ **2.8 s** | 1.6 s | 34/37 |
| B | 4.5 s | ★ **0.7 s** | 35/36 |
| C | 4.5 s | 0.8 s | 33/34 |
| D | 4.1 s | ★ **0.7 s** | 33/34 |

★ **The free variants open for LONGER but close FASTER.** Today's brake catches the gap early and then
drags it back slowly; an unsteered racer keeps drifting out for four and a half seconds and then the
field simply reels him in. **Which of those reads better on screen is a judgement, not a number.**

---

## 4 · ★ HIS PACE — THE PROPOSAL DELIVERS THE FEEL EXACTLY

| v | first second after ARRIVING | whole leading period | ★ share of leading frames braked |
|---|---|---|---|
| **A** | 1.0724 | **0.9644** | ★ **72%** |
| **B** | 1.0258 | ★ **1.0000** | ★ **1%** |
| **C** | ★ **1.0117** | ★ **1.0000** | 2% |
| **D** | ★ **1.0117** | ★ **1.0000** | 6% |

★★ **THIS IS THE ONE YOUR PROPOSAL WINS OUTRIGHT.** Today he is measurably braked in **72%** of the
frames he spends in front — that is the thing you objected to, and it is real. Under B, C and D he is
at **exactly 1.0**: neither braked nor pushed, an ordinary racer, as asked.

★ **AND THE TAPER IS WORTH HAVING**: C and D arrive at **1.0117** against B's 1.0258, so they cross
their drawn place nearly at pace instead of still accelerating. That is the `maxMult`-at-one-rank-out
finding paying off.

---

## 5 · ★ DOES HE LAND IN THE RIGHT BLOCK? — your fairness test, not the exact rank

| v | cast | ★ top-5 BLOCK | reached his drawn place | took the lead |
|---|---|---|---|---|
| **A** | 51/80 (64%) | 41/51 (**80%**) | 47/51 (92%) | 37 |
| **B** | 51/80 (64%) | ★ **42/51 (82%)** | 47/51 (92%) | 36 |
| **C** | 51/80 (64%) | 39/51 (**76%**) | 45/51 (88%) | 34 |
| **D** | 51/80 (64%) | 39/51 (**76%**) | 45/51 (88%) | 34 |

★ **Cast rate is identical in all four — 64%**, so no variant trades the comebacker away. (The 64%
here against the 68% reported earlier is the smaller seed set, not a regression: same instrument, two
seeds instead of three.)

★ **B is the only variant that does not cost block fairness** — 82% against today's 80%. ★ **C and D
cost four points**, which is the taper: stopping the push early means four more racers in fifty-one
end the race outside the top-5 band. **That is the price of the smaller gap, and it is the honest
reading of why D is not simply better than B.**

---

## 6 · ★ DOES HE DRIFT BACK AFTER BEING FREED? — a number, not a verdict

You have not said whether an unsteered leader losing places again is acceptable, so this is reported
and not judged. Of those who reached their drawn place, how far they fall from their BEST rank:

| v | drifted at all | median | p90 | max | finished worse than 5th |
|---|---|---|---|---|---|
| A | 47/47 | 5 | 27 | 38 | 6 |
| B | 47/47 | **8** | 31 | **54** | 5 |
| C | 45/45 | 7 | 24 | 52 | 7 |
| D | 45/45 | 6 | 24 | 52 | 7 |

★★ **EVERY RACER DRIFTS, IN EVERY VARIANT, INCLUDING TODAY'S.** This is not something the free
variants introduce — a racer at the front late in a race gives places back whatever the servo is
doing. **What the free variants change is how far: a median 8 places under B against 5 today, and a
worst case of 54.** ★ **The drift is far larger than the peak gap in every arm, and nobody had
measured it before this piece.**

---

## 7 · ★★ WHAT EACH ONE COSTS AND BUYS — ONE LINE EACH

| | buys | costs |
|---|---|---|
| **A — today** | the smallest gap on every measure: median **0.066** widths, worst **0.597** | he is visibly **braked in 72%** of the frames he leads — the thing you objected to |
| **B — free on arrival** | **exactly the feel you asked for** (1.0000, braked 1%) and the best block fairness, **82%** | **the gap is 2.7× bigger on screen** (0.179 widths) and the drift worst case is 54 places |
| **C — free, and stop pushing early** | the feel, plus he arrives at pace (**1.0117**) and a third of B's extra gap is gone | **four points of block fairness** (76%), and the gap is still 1.8× today's |
| **D — C plus a runaway guard** | ★ **the feel AND most of the containment** — 0.089 widths, nearest today of the three | the same **four points of block fairness**, and one more mechanism to keep honest |

★ **NO RECOMMENDATION IS MADE.** If the braking is what you cannot live with, **B is your proposal and
it works as described**; **D is the same feel with the runaway mostly contained**; and **A remains the
best answer to "never break away too far"**, which is awkward because it is also the one you asked to
change.

---

## 8 · FAIRNESS, AND WHAT IS LEFT IN THE TREE

**Method.** `sim-fairness.mjs`, ten tracks each at ITS OWN `defaultRacerTypeId`, 30 races × 40 racers
at the track's shipped default duration, `--seed=1` — **300 races, 12 000 finishes**. Smaller than
`docs/FAIRNESS.md`'s 300-per-track methodology and stated as such.

★ **RUN ON D ONLY, AND THE REASON IS STATED RATHER THAN HIDDEN.** Four fairness sweeps is four times
twenty minutes; D is the variant that both does what you asked AND contains the runaway best, so it is
the one whose gates had to be checked. **If you choose B or C instead, its fairness sweep is owed.**

| | baseline (A) | ★ variant D |
|---|---|---|
| Holm-unfair tracks | **0 of 10** | ★ **0 of 10** — smallest p **0.196** (ice-track) |
| band-reach, every band, every track | 82–95% | ★ **83–96%** |

★★ **D DOES NOT TRADE THE FAIRNESS GATES AWAY.** Zero unfair tracks and the band-reach floor is a
point HIGHER than the baseline's, not lower. **The four points of block fairness in §5 are a
comebacker-specific cost, not a field-wide one** — and that distinction matters, because the
field-wide gate is the one `docs/FAIRNESS.md` actually states.

### ★ WHAT IS LEFT IN THE TREE, AND HOW TO WATCH EACH ONE

★ **THE DEFAULT IS STILL `A` — TODAY'S RACE — AND NOTHING IS SHIPPED.** All four variants are in the
tree behind one switch, with **two doors**, because the sweeps are node and you watch in a browser:

- **in a browser, no rebuild needed:** `localStorage['racearena:arrivalVariant'] = 'D'` (or `'B'`,
  `'C'`), then run a race. Remove the key to go back to today.
- in node: `RA_ARRIVAL_VARIANT=D`.

★ **I HAVE NOT PICKED ONE FOR YOU.** The brief said leave the best in the tree; the measurements make
"best" depend on which fault you weigh, so **all four are live and switchable from the screen you
watch on** rather than one being chosen behind your back.

---

## 9 · THE BROWSER

★ **IT PASSES, ON VARIANT D, IN REAL CHROMIUM** — `client/e2e/arrival-variant.spec.js`, Dirt Oval,
Quick Test seed 41003:

```
[arrival-variant D] racer 0: at release 8, best 1, frames in the top five 1991,
                    median mult 1.0000, braked in 18% of them
```

★★ **WHAT A PERSON SEES.** He is released in 8th, climbs all the way to the front, and once he is in
the top five the servo is applying **exactly 1.0** — he is racing, not being held. **Braked in 18% of
those frames against today's 72%.** The variant is selectable from the browser and it demonstrably
runs there.

★ **WHAT THE SPEC DELIBERATELY DOES NOT ASSERT**: which variant is best (that is 80 races per arm,
§2–§6), a finishing place (a racer's NAME is physics and Quick Test's roster is not the harness's), or
that he never runs away (one race is not a distribution).

---

## 10 · CHECKS

| check | result |
|---|---|
| ★ **world fingerprint, default (A)** | ★ **`bdf4a3c8ce6e0316` — unchanged, the scaffold is inert** |
| world fingerprint, B / C / D | `1ce5295139cc233c` / `a8414e0a25562d7e` / `d3dcc274b6cae555` |
| ★ per-variant sabotage | ★ **unset the switch and A's fingerprint returns exactly** — each variant proved live AND reversible |
| `npm run verify` plain | **PASS 21 · FAIL 5** — see below |
| browser test | ★ **2 passed** |

★ **TWO REDS WERE MINE AND BOTH ARE FIXED**: `check-index` (this report, now indexed) and
`check-fallback-agreement` — the variant switch shifted the lines a `docs/FORCE-MAP.md` symbol
citation pointed at, repointed. The rest are carried forward: the world / camera / render fingerprints
differ from the RECORD (the record still predates DIRECTION-AUTHORITY-1), `check-runin-frame` on
luger-hill, and three client-suite RECORDED outcomes whose live `real == sim` byte-identity passes.

★ **THE SABOTAGE THE BRIEF ASKED FOR IS THE FINGERPRINT TABLE.** "Undo it and confirm the baseline
behaviour returns" is exactly what an unset switch does, and the returned value is bit-identical to
the pre-piece one — a stronger proof than a test that merely goes red.

★ **`places gained` WAS NOT RE-MEASURED** and is named rather than quietly dropped: it needs the rank
at the 0.70 release, which this instrument does not record, and re-running 320 races to add one column
was not worth the night. **The block test in §5 is the criterion you restated**, and it is measured for
every variant.

**`git stash` was not used. `--no-verify` was not used.**

---

## 11 · WHAT IS OPEN

1. ★★ **Which picture do you want?** §7 is the whole question.
2. **The drift** (§6) is bigger than the gap in every variant and nobody has judged it.
3. **C and D cost four points of block fairness.** Whether that matters at 51 casts is a judgement;
   the fairness sweep in §8 is the wider check.
