# ROW-BONUS-TIMING-1 — when is the start-row deficit made up, and what is left over?

**Branch:** `diag/row-bonus-timing-1` off master `5589a419`. **MEASUREMENT ONLY.** No default moved,
no key wired, no fix designed, nothing proposed as work.

ROW-ADVANTAGE-1 found position-within-band leaning toward the BACK rows on all ten tracks and named
the row speed bonus as the candidate. The owner asked whether it could be switched off once its
purpose is served. **Before that can be designed, its timing has to be known — and the timing turns
out to answer the question by itself.**

---

## 1. The answer

**THERE IS NO LEFTOVER. THE BONUS IS EXACTLY CONSUMED AT THE FINISH LINE, BY CONSTRUCTION.**

- **The catch-up point is progress 1.000 for every rear row, on every track.** Not approximately —
  exactly, and the same for row 1 and row 8. It falls out of the formula algebraically and needs no
  races.
- **The leftover is therefore ZERO**: zero remaining fraction of the race, zero extra distance.
- **So the switch-off the owner asked about has nothing to switch off.** "Once its purpose is served"
  is the finish line. **A cut-off at the catch-up point is a no-op; any cut-off before it
  under-compensates.** That is the addendum's *"impossible rather than merely worse"* case, and it is
  this one.
- **AND THE TILT IS NOT EXPLAINED BY THIS MECHANISM.** The leftover is identically zero and identical
  across rows and tracks; the tilt varies by both. Testing the bonus SIZE instead: the association is
  **carried entirely by two tracks** — r = 0.909 over ten, **0.587 without luger-hill, 0.100 without
  luger-hill and searound.** **Among the eight ordinary tracks there is no relationship at all.**

**The brief's own instruction for this outcome: "if they do not [match], say so plainly — the tilt
would then have another source and this whole line is aimed at the wrong thing." It does not match,
and I am saying so.**

**AND THERE IS A CANDIDATE SOURCE THAT IS NOT THE BONUS — one that questions my own previous
report.** See §5.

---

## 2. (a) The catch-up point — derived, not raced

**The definition follows from the bonus formula rather than from a guess**, as the brief requires: a
racer has made up his row's deficit when he reaches **the position he would hold had he started in
row 0 at the same base speed** — i.e. when his `t` equals the row-0 racer's `t`.

**Closed tracks** (`raceCore.js:150`): row 0 starts at `t = 0`, row N at `t = −N·δ`, where
`δ = deltaT_per_row = rowGapPx / pathLengthPx` (`raceCore.js:117`) — **the same expression the bonus
formula calls `tOffset`** (`rowLayout.js:118`). With base speed `v` and bonus `b_N`:

```
t_N(τ) = −N·δ + v(1+b_N)·τ          t_0(τ) = v·τ
equal  ⇒  v·b_N·τ = N·δ  ⇒  τ_catch = N·δ / (v·b_N)
b_N    = (N·δ / row0Distance)·f     [rowLayout.js:121]
⇒ τ_catch = row0Distance / (v·f)
```

**Open tracks** (`raceCore.js:149`): row 0 starts at `t = rows·δ`, row N at `(rows−N)·δ`, and
`row0Distance = finishT − rows·δ`. **The same algebra gives the same result** — the deficit `N·δ` and
the bonus `b_N` both carry the factor `N`, so **N cancels.**

**Row 0 finishes at `τ_finish = row0Distance / v`.** Therefore:

> **τ_catch / τ_finish = 1 / f**, and the shipped `speedBonusFactor` is **`f = 1.0`**
> (`defaults.js:65`).

**⇒ catch-up at progress 1.000, on every track, for every rear row.**

| track | rows | bonus, last row | catch-up (progress) | share catching up after 0.60 |
| --- | ---: | ---: | ---: | ---: |
| dirt-oval | 4 | 1.16% | **1.000** | **100%** |
| city-circuit | 4 | 1.37% | **1.000** | **100%** |
| garden-path | 3 | 0.84% | **1.000** | **100%** |
| ice-track | 4 | 1.49% | **1.000** | **100%** |
| searound | 7 | 3.63% | **1.000** | **100%** |
| **luger-hill** | **9** | **6.95%** | **1.000** | **100%** |
| mountainstreet | 4 | 1.45% | **1.000** | **100%** |
| river-run | 4 | 1.71% | **1.000** | **100%** |
| seatrack | 5 | 2.12% | **1.000** | **100%** |
| space-sprint | 5 | 1.95% | **1.000** | **100%** |

**There is no distribution to report and no spread.** The catch-up point is a single value, identical
for every racer in every rear row. **The share falling after 0.60 is 100% because it is 1.0.**

**Per-row bonus, %** — the quantity that does vary:

| track | row 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| dirt-oval | 0 | 0.39 | 0.78 | 1.16 | | | | | |
| city-circuit | 0 | 0.46 | 0.92 | 1.37 | | | | | |
| garden-path | 0 | 0.42 | 0.84 | | | | | | |
| ice-track | 0 | 0.50 | 0.99 | 1.49 | | | | | |
| searound | 0 | 0.60 | 1.21 | 1.81 | 2.42 | 3.02 | 3.63 | | |
| **luger-hill** | 0 | 0.87 | 1.74 | 2.60 | 3.47 | 4.34 | 5.21 | 6.08 | **6.95** |
| mountainstreet | 0 | 0.48 | 0.97 | 1.45 | | | | | |
| river-run | 0 | 0.57 | 1.14 | 1.71 | | | | | |
| seatrack | 0 | 0.53 | 1.06 | 1.59 | 2.12 | | | | |
| space-sprint | 0 | 0.49 | 0.97 | 1.46 | 1.95 | | | | |

---

## 3. (b) The leftover — zero, and confirmed against the races

**Leftover = 0 for every row on every track**: the uplift runs out exactly as the line is crossed, so
the remaining fraction of the race is `1 − 1 = 0` and the extra distance it buys after catch-up is
`0`.

**THE DERIVATION WAS CHECKED AGAINST THE RACES RATHER THAN LEFT AS ALGEBRA.** If the compensation is
exact, **mean finishing TIME must be flat across start rows.** From LADDER-VALIDATION-1's shipped arm,
paired within each race:

| track | first row (s) | last row (s) | paired difference |
| --- | ---: | ---: | --- |
| dirt-oval | 46.035 | 45.961 | +0.074 ±0.114 |
| city-circuit | 81.196 | 81.183 | +0.013 ±0.155 |
| garden-path | 111.018 | 110.879 | +0.139 ±0.173 |
| ice-track | 76.596 | 76.557 | +0.039 ±0.149 |
| searound | 65.890 | 65.779 | +0.112 ±0.173 |
| **luger-hill** | 58.211 | 57.924 | **+0.287 ±0.137 \*** |
| mountainstreet | 60.713 | 60.655 | +0.058 ±0.085 |
| river-run | 60.624 | 60.585 | +0.039 ±0.085 |
| seatrack | 60.440 | 60.360 | +0.080 ±0.094 |
| space-sprint | 60.949 | 60.863 | +0.086 ±0.101 |

**Nine of ten are inside their intervals — the compensation is exact to within what 100 races can
resolve.** The exception is **luger-hill at +0.287 s**, and the sign is the opposite of the concern
that prompted this block: **the front row finishes LATER**, i.e. luger-hill is very slightly
**under**-compensated, by 0.29 s in a 58 s race (**0.49%**).

**All ten differences are positive**, so there is a consistent hair of under-compensation; only
luger-hill's separates from zero.

---

## 4. (c) Does it match the tilt? — **NO**

**The leftover cannot explain the tilt because the leftover is zero and the tilt is not.** Testing the
next-best candidate — the bonus SIZE — the association does not survive contact with its own data:

| sample | Pearson r |
| --- | ---: |
| all 10 tracks | **0.909** |
| without luger-hill | 0.587 |
| **without luger-hill and searound** | **0.100** |
| the eight tracks with bonus < 2.2% | **0.100** |

**Two tracks carry the whole correlation.** luger-hill has the largest bonus and the largest tilt;
searound has the second of each. **Among the other eight, ordering the tracks by bonus size tells you
nothing about their tilt** — garden-path has the smallest bonus (0.84%) and a middling tilt (0.032),
while ice-track has nearly twice the bonus (1.49%) and the smallest tilt (0.015).

**Spearman's rank correlation over all ten is 0.467**, which is what a relationship looks like when
two points supply it.

**Verdict: the row speed bonus is NOT established as the source of the tilt.** It remains the source
on luger-hill by every measure. **On the other nine it is not supported by this evidence.**

---

## 5. A candidate source that is not the bonus — and it questions my own report

**Line up the three measures, and only the CONDITIONED one tilts:**

| measure | conditioned on anything? | tracks where first row ≠ last row |
| --- | --- | ---: |
| mean finishing **time** (§3) | no | **1 of 10** (luger-hill) |
| mean finishing **rank** (ROW-ADVANTAGE-1) | no | **1 of 10** (luger-hill) |
| **position within the band** | **yes — only racers who REACHED their band** | **7 of 10** |

**`posInBand` is measured only among arrivals.** Roughly 10% of racers do not arrive, and *which* 10%
is not random with respect to how the race went. **A statistic conditioned on an outcome can show a
difference that the unconditioned outcome does not have** — and here the unconditioned measures are
flat on nine of ten tracks while the conditioned one tilts on seven.

**That is a candidate explanation in which the row bonus plays no part at all**, and it points at
ROW-ADVANTAGE-1 — my own report of two days ago. **Its measurement is correct and I have not
re-computed it. What is now in doubt is the reading placed on it:** "the back rows are favoured" is a
claim about the race, and the two measures that describe the race without conditioning **do not show
it**, outside luger-hill.

**This is NOT established either.** Distinguishing a selection effect from a real one needs the same
tilt computed over ALL racers with a rank-based position measure that does not require arrival —
which this block did not do, because it was commissioned to time the bonus, not to re-audit the tilt.
**It is the first proposal.**

---

## 6. (d) The two extreme tracks

**`luger-hill` — 9 rows, and the only track where anything separates.**
The bonus reaches **6.95%** on row 8 — **more than three times any track's except searound** (seatrack is next at 2.12%). It is
the one track where the front row finishes measurably later (**+0.287 s ±0.137**), the one where mean
rank separates (**+4.32 ±2.09** places, ROW-ADVANTAGE-1), and the one with the largest tilt
(**0.154**). **Every measure agrees here, and only here.** Its nine rows are the most of any shipped
track — the next has seven and most have four — so it is the extreme of the variable the bonus scales
with. **On luger-hill the row bonus being the mechanism is well supported.**

**`mountainstreet` — the largest win gap, and the bonus does not explain it.**
Its win gap is **20 races per 100** (first row 17, last row 37), the largest measured. But its bonus
is **1.45%**, ordinary, and its tilt is **0.024**, the third-smallest. Its finishing time is flat
(+0.058 ±0.085) and its mean rank is flat (+0.53 ±1.34). **A 20-in-100 win gap sits on a track where
every continuous measure says the rows are even.** With a win-rate interval of ±13.9 that gap is
outside its interval but only just, and **one win gap out of ten tracks at the 95% level is what
chance produces.** **Nothing here explains mountainstreet, and the bonus is not a candidate for it.**

---

## 7. The addendum: the fade shape, beside the switch-off

### (a) The compensation shortfall

Today's bonus delivers exactly the deficit: `∫ v·b_N dτ = N·δ` over the race. **Any shape that ends
earlier or declines delivers less.** For a linear fade from `b₀` to zero, ending at progress `p`:

```
delivered / today's total = p / 2
```

**Fade lengths chosen: p = 1.00, 0.75, 0.50** — the full race, three-quarters, and half. They are
chosen to bracket the design space rather than to model a proposal: p = 1.00 is the mildest fade that
still reaches zero, and p = 0.50 is where a fade would have to end to be over before the outcome
machinery takes hold at 0.60.

| fade ends at p | delivered | **shortfall of the row deficit** |
| ---: | ---: | ---: |
| 1.00 | 0.500 | **50.0%** |
| 0.75 | 0.375 | **62.5%** |
| 0.50 | 0.250 | **75.0%** |

**A fade over the WHOLE race under-compensates by half.** The last row of luger-hill would make up
only half of a deficit worth 6.95% of race pace. **That is a fairness cost in the opposite direction
from the one it replaces, and it is larger than the effect being corrected.**

### (b) The re-sized variant, and the ±20% envelope

The shortfall is removed by starting higher: `b₀ = 2·b_today / p`.

| track | rows | today | p=1.00 | p=0.75 | p=0.50 | breaches ±20% at |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| dirt-oval | 4 | 1.16% | 2.33% | 3.10% | 4.65% | never |
| city-circuit | 4 | 1.37% | 2.75% | 3.66% | 5.50% | never |
| garden-path | 3 | 0.84% | 1.69% | 2.25% | 3.38% | never |
| ice-track | 4 | 1.49% | 2.97% | 3.97% | 5.95% | never |
| searound | 7 | 3.63% | 7.25% | 9.67% | 14.51% | never |
| **luger-hill** | **9** | **6.95%** | 13.89% | **18.52%** | **27.79%** | **p = 0.50** |
| mountainstreet | 4 | 1.45% | 2.91% | 3.87% | 5.81% | never |
| river-run | 4 | 1.71% | 3.43% | 4.57% | 6.86% | never |
| seatrack | 5 | 2.12% | 4.24% | 5.65% | 8.48% | never |
| space-sprint | 5 | 1.95% | 3.89% | 5.19% | 7.78% | never |

**The addendum's guess was right: luger-hill is where it breaches, and it is the only one.** At
p = 0.50 the re-sized start value is **27.79%**, comfortably outside the ±20% naturalness envelope. At
p = 0.75 it is **18.52%** — inside, with 1.5 points of margin, **on a rule the project enforces
elsewhere with a hard clamp.**

### (c) The two shapes on the quantity that started this

| | today | HARD SWITCH-OFF at catch-up | LINEAR FADE (p = 1.00) |
| --- | --- | --- | --- |
| catch-up point | progress 1.000 | progress 1.000 | never reached |
| **leftover uplift** | **0** | **0 — nothing to switch off** | **0** (it under-delivers instead) |
| compensation | exact | exact (identical to today) | **50% short** |
| re-sized to be exact | — | — | 2× the start value; luger-hill 13.89% |

**The switch-off is a no-op and the fade is a shortfall.** Neither improves the leftover, **because
there is no leftover to improve.** For `luger-hill` the fade at p = 1.00 would leave the last row
**3.47% of race pace short** over the race; for `mountainstreet`, **0.73%**.

### (d) Visibility

**Reference: the project's own per-frame slew limit is `pulkEnvelopeMaxStepPerFrame = 0.01`** — 1% of
speed factor per frame, the bound the governor's contest terms ride.

| track | race (s) | frames @60 | **HARD switch: step** | **FADE: slope per frame** | fade vs the slew limit |
| --- | ---: | ---: | ---: | ---: | --- |
| dirt-oval | 87.2 | 5233 | 0.01163 | 2.2e-6 | 1/4499 |
| city-circuit | 77.8 | 4670 | 0.01374 | 2.9e-6 | 1/3399 |
| garden-path | 212.1 | 12727 | 0.00845 | 6.6e-7 | 1/15070 |
| ice-track | 73.5 | 4411 | 0.01487 | 3.4e-6 | 1/2966 |
| searound | 62.4 | 3743 | 0.03627 | 9.7e-6 | 1/1032 |
| **luger-hill** | 60.0 | 3600 | **0.06946** | 1.9e-5 | **1/518** |
| mountainstreet | 60.0 | 3600 | 0.01453 | 4.0e-6 | 1/2478 |
| river-run | 60.0 | 3600 | 0.01715 | 4.8e-6 | 1/2099 |
| seatrack | 60.0 | 3600 | 0.02120 | 5.9e-6 | 1/1698 |
| space-sprint | 60.0 | 3600 | 0.01946 | 5.4e-6 | 1/1850 |

**A hard switch is a step of up to 0.0695 — SEVEN TIMES the project's own one-frame slew limit**, in a
single frame, on luger-hill. **A fade is a slope of 1.9e-5 per frame — one five-hundredth of that
limit**, and on garden-path one fifteen-thousandth.

**So on visibility the two shapes are not close: the step would be seven times what the project
elsewhere refuses to allow in a frame; the fade is far below anything the slew limit was written to
catch.**

---

## 8. What the N could not support

- **The catch-up point and the leftover carry NO sampling error at all** — they are algebra over the
  shipped configuration. **No N could make them more certain, and no N was used.**
- **The finish-time check is the part with an interval**, and at N=100 it resolves about **±0.09 to
  ±0.17 s**. A systematic over-compensation of a tenth of a second would be invisible on most tracks.
  **What it establishes is that no LARGE mis-compensation exists**, not that the compensation is
  perfect.
- **The correlation in §4 has n = 10 and one dominant point.** Removing luger-hill halves it; removing
  two kills it. **Neither "the bonus explains the tilt" nor "it does not" is settled by ten tracks** —
  what IS settled is that the ten tracks on the record do not support the first.
- **§5's selection-effect explanation is untested.** It is consistent with all three measures but
  nothing here distinguishes it from the alternatives.
- **One seed batch**, inherited with the data.

---

## 9. Source hygiene

**NO RACES WERE RUN, and that is the brief's stated preference** — *"if the numbers can be derived
from the layout and the shipped configuration without racing, do that instead and say so."* They can:
the catch-up point is algebraic and the bonus magnitudes come from the layout.

**The derivation reuses the shipped functions rather than re-implementing them.** The per-track table
in §2 is produced by importing `computeRacerLayout`, `computeStartRowCount` and **`computeSpeedBonus`
itself** from `client/src/modules/rowLayout.js`, plus `deriveRaceDuration`, `RACER_CONFIGS` and the
shipped default configs. **The bonus numbers are the function's own output, not a restatement of its
formula.**

**The derivation was validated against the races two ways**, so it is not left as algebra:

1. **The row counts it computes match the row counts observed in 100 real races on every one of the
   ten tracks** — 3 for garden-path, 9 for luger-hill, and so on down the list.
2. **Finishing time is flat where the derivation says it must be** (§3), on 9 of 10 tracks.

**The races it was validated against are LADDER-VALIDATION-1's shipped arm**, already on disk — the
same re-use ROW-ADVANTAGE-1 made, and for the same reason. **No new races were run for this block.**

**`deltaT_per_row` and `tOffset` were confirmed to be the same quantity** (`raceCore.js:117` against
`rowLayout.js:118`) rather than assumed — the whole derivation rests on that identity, so it is
checked rather than eyeballed.

**Read-only, and the reason is not "read-only" alone: this branch changes no product code.** The diff
is one report and one INDEX line. **No fingerprint, no browser gate and no client suite** — none of
them reads a file this branch touches, so none of them can have changed its answer. **Nothing was
minted.**

**Machine read before launching: 14 cores. No worker pool was needed and none was created** — the
computation is algebra plus a pass over files already on disk, and ran single-threaded in under a
second. **Leaving cores free was trivially satisfied by using one.**

---

## 10. Build-vs-spec conformity

1. **The brief asks for a distribution of catch-up points, its spread, and the share after 0.60. There
   is no distribution.** The catch-up point is a single exact value, 1.000, for every rear row on every
   track. **Reported as the finding rather than dressed up as a distribution with zero variance.**
2. **The brief's premise — that there is leftover uplift after the purpose is served — is FALSE**, and
   the block says so rather than measuring something adjacent to make the question answerable.
3. **The (c) verdict is NO**, which is the outcome the brief explicitly asked to be stated plainly.
   **§5 goes one step further than commissioned** by naming a candidate source that implicates the
   measurement in my own previous report. **That is outside the brief's scope and is flagged as such**
   — it seemed worse to leave it out than to state it as unestablished.
4. **The addendum's "impossible rather than merely worse" case is the SWITCH-OFF**, not the fade —
   the opposite of what the framing suggests, since the fade at least does something.
5. **Neither shape is recommended and no key, cut-off or formula change is proposed.** §11 describes
   shapes and costs only, as permitted.
6. **The band-based cut-off objection is carried to the owner as an open question**, §11 P4, not
   decided here.

---

## 11. Proposals

**P1 — MEASURE THE TILT WITHOUT CONDITIONING ON ARRIVAL. It is the one thing that would settle §5, and
it is cheap.** `posInBand` exists only for racers who reached their band; the two unconditioned
measures are flat on nine of ten tracks. **A position measure defined for every racer — for instance
final rank minus drawn rank, which needs no arrival — computed per start row over the same data on
disk, would separate "the back rows are favoured" from "the arrivals are a selected sample".** No
races, and it either confirms ROW-ADVANTAGE-1's reading or retires it.

**P2 — LUGER-HILL IS A ONE-TRACK PROBLEM AND SHOULD BE TREATED AS ONE.** It is the only track where
every measure separates, the only one whose re-sized fade would breach the naturalness envelope, and
the only one where a hard switch would be seven times the slew limit. **Its bonus is 6.95% because it
has nine rows; the next-most has seven and most have four.** **A change to the bonus SHAPE would be
applied to ten tracks to fix one.** Whether the row count on that track is what should be looked at
instead is a different and much narrower question — and ROW-ADVANTAGE-1's P4 already noted that the
row count falls out of track width and sprite size and **nobody owns it.**

**P3 — A THIRD SHAPE NEITHER THE BRIEF NOR THE ADDENDUM NAMES: leave the bonus alone and give row 0 the
mirror of it.** Today row 0 is the reference and every other row is lifted. The same compensation could
be expressed as a small BRAKE on the front rows with the rear rows unchanged, or split symmetrically
about the middle row. **The total compensation is identical, the catch-up point is identical, and
nothing about fairness changes** — but the peak deviation from natural pace is **halved**, because it
is shared between the ends instead of loaded onto one. **On luger-hill that turns a 6.95% uplift into
roughly ±3.5%**, which is the number that decides whether any re-sized variant fits the envelope.
**Cost: it changes every row's speed, so every fingerprint moves and a re-baseline is needed** — which
is why it is a proposal and not a suggestion.

**P4 — THE BAND-BASED CUT-OFF, CARRIED TO THE OWNER AS HIS QUESTION.** He raised tying the cut-off to
the racer's DRAWN BAND rather than to the spatial deficit. **The objection, stated as an objection and
not as a decision:** a racer drawn into a deep band is "in his band" from the first frame **without
having made up any of his deficit**, so his bonus would end immediately and he would keep the full row
handicap for the whole race; a racer drawn into band 1 would carry the uplift almost to the finish.
**That rewards and punishes by drawn rank, which is the one thing the band draw is supposed not to
do** — the bands are drawn precisely so that the outcome is not decided by them. **It is his call, and
this block does not make it.** What can be said from the numbers here: **the spatial deficit and the
drawn band are unrelated quantities**, since rows are assigned by a shuffle (`rowLayout.js:213`) and
the band is drawn independently — **so the two cut-offs would fire at unrelated times for the same
racer.**
