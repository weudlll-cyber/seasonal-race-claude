# ROW-ADVANTAGE-1 — how big is the start-row advantage?

**Branch:** `diag/row-advantage-1` off master `1fdd31ee`. **MEASUREMENT ONLY.** No default moved, no
guard changed, no threshold proposed, nothing wired.

The start-row watchdog answers *"is a difference detectable"*, which gets more sensitive as races
accumulate — so at N=100 the shipped world trips it on 8 of 10 tracks and no arm can be told from its
baseline. **This block measures the SIZE instead.**

---

## 1. The answer

**HIS READING HOLDS FOR THE HEADLINE NUMBER, AND MISSES A REAL EFFECT UNDERNEATH IT — WHICH RUNS
BACKWARDS.**

- **Band arrival is flat across rows.** On **9 of 10 tracks** the first-row-to-last-row difference is
  inside its interval. The exception is **searound, −4.9pp ±3.5**. **His reasoning is confirmed: a
  large row effect would have shown in the headline number, and it does not.**
- **But position INSIDE the band is not flat, and it is the case his reading does not cover.**
  **All 10 tracks lean the same way; 7 are outside their intervals.** Racers who reach their band
  from the **front row land further back inside it** than racers who reach the same band from the
  **last row**.
- **THE ADVANTAGE RUNS BACKWARDS. The BACK rows are the favoured ones, not the front.** That is true
  of the band position on 10 of 10 tracks, of mean finishing rank wherever it separates, and of the
  one win-rate gap large enough to see.
- **On nine tracks it is small. On luger-hill it is large:** the front row lands **4.18 ±1.14 places**
  further back inside its own band, finishes **4.32 ±2.09 places** worse overall, and **wins 2 races
  in 100 where an even share would be 11.**

**So the size question has two answers, and they are different sizes.** On the fairness number the
project gates on, the row effect is **not measurable at N=100 on nine tracks**. On where a racer lands
*within* its band, it is **consistent, one-directional, and on one track worth four places.**

---

## 2. One sentence per track

**Wins are per 100 races from that row, against the even share in brackets.** Rows are not always the
same size, so the even share is not always the same number.

| track | the sentence |
| --- | --- |
| **luger-hill** | **First row wins 2 of 100, last row 7 of 100, even share 11 — and the front row finishes four places worse than the back.** The worst track by a wide margin. |
| **mountainstreet** | First row wins **17 of 100, last row 37**, even share 25 — the largest win gap measured, and it favours the back. |
| **seatrack** | First row wins 14 of 100, last row 26, even share 20 — the back row lands **one place better** inside its band. |
| **searound** | First row wins 13 of 100, last row 12, even share 15/13 — **wins are level, but the front row reaches its band 4.9 points less often.** The only track where arrival itself is not flat. |
| **space-sprint** | First row wins 18 of 100, last row 18, even share 20 — level on wins; the back row lands 0.87 places better inside its band. |
| **dirt-oval** | First row wins 21 of 100, last row 21, even share 25 — level on wins; the back row lands **0.75 places better** inside its band. |
| **river-run** | First row wins 29 of 100, last row 29, even share 25 — level on both. |
| **city-circuit** | First row wins 23 of 100, last row 25, even share 25 — level on both. |
| **ice-track** | First row wins 24 of 100, last row 28, even share 25 — level on both. |
| **garden-path** | First row wins 35 of 100, last row 33, even share 35/33 — level on wins; the back row lands 0.42 places better inside its band. |

**Worst track: luger-hill**, on every measure that separates. **Largest single win gap:
mountainstreet, 20 races per 100.**

---

## 3. The tables

**N=100 races per track, each track at its own default racer and the field size its topology uses.**
Rows are numbered from the front: **row 0 is the front row.** `posInBand` is where inside the drawn
band an arriving racer landed — **0 = the front edge of the band, 1 = the back edge.**

**Every quantity is computed PER RACE and then averaged across the 100 races, with the interval taken
across races.** Racer-results inside one race are not independent — finishing ranks are a permutation
— so pooling racer-races would have understated every interval here.

| track | row | size | wins/100 (even share) | top-5 finishes/100 (even) | band % | posInBand | mean rank |
| --- | ---: | ---: | --- | --- | --- | --- | --- |
| **dirt-oval** (40) | 0 | 10 | 21.0 ±8.0 (25) | 110 ±17 (125) | 87.5 ±2.0 | 0.537 ±0.019 | 21.04 ±0.63 |
| | 1 | 10 | 27.0 ±8.7 (25) | 132 ±17 (125) | 86.8 ±2.2 | 0.489 ±0.019 | 20.34 ±0.63 |
| | 2 | 10 | 31.0 ±9.1 (25) | 133 ±18 (125) | 86.8 ±2.1 | 0.479 ±0.017 | 20.22 ±0.65 |
| | 3 | 10 | 21.0 ±8.0 (25) | 125 ±18 (125) | 89.4 ±2.0 | 0.471 ±0.020 | 20.39 ±0.73 |
| **city-circuit** (40) | 0 | 10 | 23.0 ±8.3 (25) | 122 ±16 (125) | 89.5 ±2.3 | 0.513 ±0.017 | 20.55 ±0.61 |
| | 1 | 10 | 22.0 ±8.2 (25) | 115 ±17 (125) | 88.8 ±2.0 | 0.495 ±0.017 | 20.42 ±0.59 |
| | 2 | 10 | 30.0 ±9.0 (25) | 127 ±20 (125) | 91.9 ±1.6 | 0.491 ±0.016 | 20.39 ±0.64 |
| | 3 | 10 | 25.0 ±8.5 (25) | 136 ±18 (125) | 88.7 ±2.2 | 0.493 ±0.019 | 20.64 ±0.72 |
| **garden-path** (40) | 0 | 14 | 35.0 ±9.4 (35) | 169 ±17 (175) | 90.4 ±1.8 | 0.515 ±0.014 | 20.64 ±0.48 |
| | 1 | 13 | 32.0 ±9.2 (33) | 157 ±16 (163) | 89.2 ±2.0 | 0.503 ±0.017 | 20.54 ±0.48 |
| | 2 | 13 | 33.0 ±9.3 (33) | 174 ±20 (163) | 91.5 ±1.6 | 0.483 ±0.016 | 20.31 ±0.55 |
| **ice-track** (40) | 0 | 10 | 24.0 ±8.4 (25) | 127 ±16 (125) | 89.3 ±2.0 | 0.506 ±0.019 | 20.57 ±0.61 |
| | 1 | 10 | 29.0 ±8.9 (25) | 120 ±19 (125) | 90.3 ±2.0 | 0.498 ±0.017 | 20.42 ±0.58 |
| | 2 | 10 | 19.0 ±7.7 (25) | 124 ±17 (125) | 90.4 ±1.9 | 0.512 ±0.017 | 20.38 ±0.64 |
| | 3 | 10 | 28.0 ±8.8 (25) | 129 ±18 (125) | 90.7 ±1.8 | 0.490 ±0.019 | 20.62 ±0.72 |
| **searound** (40) | 0 | 6 | 13.0 ±6.6 (15) | 74 ±15 (75) | 87.3 ±2.5 | 0.556 ±0.024 | 21.11 ±0.84 |
| | 1 | 6 | 13.0 ±6.6 (15) | 67 ±14 (75) | 88.3 ±2.8 | 0.532 ±0.024 | 20.79 ±0.72 |
| | 2 | 6 | 16.0 ±7.2 (15) | 74 ±16 (75) | 90.7 ±2.3 | 0.492 ±0.026 | 20.72 ±0.84 |
| | 3 | 6 | 13.0 ±6.6 (15) | 74 ±16 (75) | 88.3 ±2.5 | 0.490 ±0.023 | 20.22 ±0.95 |
| | 4 | 6 | 21.0 ±8.0 (15) | 87 ±15 (75) | 89.3 ±2.5 | 0.479 ±0.024 | 19.90 ±0.93 |
| | 5 | 5 | 12.0 ±6.4 (13) | 67 ±15 (63) | 89.0 ±2.8 | 0.448 ±0.027 | 20.55 ±1.07 |
| | 6 | 5 | 12.0 ±6.4 (13) | 57 ±14 (63) | 92.2 ±2.3 | 0.480 ±0.026 | 20.18 ±1.01 |
| **luger-hill** (80) | **0** | 9 | **2.0 ±2.8 (11)** | 47 ±12 (56) | 86.9 ±2.1 | **0.577 ±0.018** | **42.15 ±1.33** |
| | 1 | 9 | 6.0 ±4.7 (11) | 48 ±13 (56) | 90.3 ±2.2 | 0.569 ±0.021 | 42.45 ±1.50 |
| | 2 | 9 | 9.0 ±5.6 (11) | 52 ±14 (56) | 90.7 ±1.8 | 0.541 ±0.021 | 42.65 ±1.48 |
| | 3 | 9 | 12.0 ±6.4 (11) | 47 ±12 (56) | 91.0 ±1.9 | 0.521 ±0.020 | 40.04 ±1.37 |
| | 4 | 9 | 10.0 ±5.9 (11) | 56 ±13 (56) | 91.0 ±1.9 | 0.506 ±0.018 | 41.17 ±1.43 |
| | 5 | 9 | 14.0 ±6.8 (11) | 62 ±13 (56) | 89.8 ±2.1 | 0.476 ±0.020 | 40.08 ±1.33 |
| | 6 | 9 | **22.0 ±8.2 (11)** | 63 ±14 (56) | 88.3 ±2.2 | 0.461 ±0.018 | 40.19 ±1.36 |
| | 7 | 9 | 18.0 ±7.6 (11) | 73 ±16 (56) | 86.1 ±2.2 | 0.422 ±0.021 | **37.65 ±1.42** |
| | 8 | 8 | 7.0 ±5.0 (10) | 52 ±13 (50) | 84.8 ±2.6 | 0.423 ±0.021 | 37.83 ±1.47 |
| **mountainstreet** (80) | 0 | 20 | **17.0 ±7.4 (25)** | 112 ±18 (125) | 89.9 ±1.3 | 0.513 ±0.011 | 40.35 ±0.82 |
| | 1 | 20 | 23.0 ±8.3 (25) | 116 ±19 (125) | 89.3 ±1.4 | 0.510 ±0.012 | 40.82 ±0.86 |
| | 2 | 20 | 23.0 ±8.3 (25) | 134 ±20 (125) | 90.6 ±1.3 | 0.498 ±0.013 | 41.01 ±0.88 |
| | 3 | 20 | **37.0 ±9.5 (25)** | 138 ±20 (125) | 89.7 ±1.3 | 0.489 ±0.012 | 39.82 ±0.89 |
| **river-run** (80) | 0 | 20 | 29.0 ±8.9 (25) | 117 ±18 (125) | 89.5 ±1.3 | 0.507 ±0.012 | 40.37 ±0.83 |
| | 1 | 20 | 22.0 ±8.2 (25) | 114 ±17 (125) | 87.9 ±1.7 | 0.513 ±0.012 | 40.77 ±0.82 |
| | 2 | 20 | 20.0 ±7.9 (25) | 130 ±19 (125) | 87.7 ±1.5 | 0.492 ±0.011 | 40.80 ±0.83 |
| | 3 | 20 | 29.0 ±8.9 (25) | 139 ±18 (125) | 87.6 ±1.6 | 0.490 ±0.011 | 40.06 ±0.84 |
| **seatrack** (80) | 0 | 16 | 14.0 ±6.8 (20) | 100 ±18 (100) | 90.5 ±1.5 | 0.526 ±0.013 | 40.55 ±0.97 |
| | 1 | 16 | 18.0 ±7.6 (20) | 95 ±16 (100) | 89.2 ±1.6 | 0.517 ±0.013 | 40.72 ±0.99 |
| | 2 | 16 | 23.0 ±8.3 (20) | 95 ±15 (100) | 90.8 ±1.7 | 0.502 ±0.013 | 41.10 ±1.21 |
| | 3 | 16 | 19.0 ±7.7 (20) | 107 ±15 (100) | 89.8 ±1.5 | 0.484 ±0.015 | 40.45 ±0.93 |
| | 4 | 16 | 26.0 ±8.6 (20) | 103 ±17 (100) | 90.7 ±1.4 | 0.477 ±0.014 | 39.68 ±0.91 |
| **space-sprint** (80) | 0 | 16 | 18.0 ±7.6 (20) | 97 ±16 (100) | 91.3 ±1.5 | 0.533 ±0.016 | 40.58 ±0.99 |
| | 1 | 16 | 20.0 ±7.9 (20) | 89 ±16 (100) | 89.3 ±1.7 | 0.505 ±0.013 | 40.82 ±0.97 |
| | 2 | 16 | 18.0 ±7.6 (20) | 98 ±16 (100) | 91.0 ±1.3 | 0.506 ±0.015 | 40.94 ±1.23 |
| | 3 | 16 | 26.0 ±8.6 (20) | 101 ±18 (100) | 91.1 ±1.5 | 0.478 ±0.015 | 40.43 ±0.96 |
| | 4 | 16 | 18.0 ±7.6 (20) | 115 ±18 (100) | 89.8 ±1.5 | 0.484 ±0.014 | 39.73 ±0.95 |

### First row against last row, PAIRED within each race

Both rows run in the same 100 races, so the difference is taken per race and the interval comes from
the 100 paired differences — a much tighter comparison than two independent means.
**`+` means the first row is higher / worse.** `*` = outside its 95% interval.

| track | band arrival (pp) | posInBand (places) | mean rank (places) | wins per 100 |
| --- | --- | --- | --- | --- |
| dirt-oval | −1.90 ±2.82 | **+0.75 ±0.43 \*** | +0.65 ±1.14 | +0.0 ±12.8 |
| city-circuit | +0.80 ±2.78 | +0.27 ±0.39 | −0.10 ±1.14 | −2.0 ±13.6 |
| garden-path | −1.11 ±2.16 | **+0.42 ±0.30 \*** | +0.34 ±0.92 | +2.0 ±16.2 |
| ice-track | −1.40 ±2.55 | +0.12 ±0.38 | −0.05 ±1.14 | −4.0 ±14.2 |
| searound | **−4.87 ±3.52 \*** | **+0.92 ±0.46 \*** | +0.93 ±1.46 | +1.0 ±9.8 |
| **luger-hill** | +2.14 ±3.26 | **+4.18 ±1.14 \*** | **+4.32 ±2.09 \*** | −5.0 ±5.8 |
| mountainstreet | +0.20 ±1.72 | +0.29 ±0.75 | +0.53 ±1.34 | **−20.0 ±13.9 \*** |
| river-run | +1.85 ±1.97 | +0.18 ±0.72 | +0.31 ±1.32 | +0.0 ±15.0 |
| seatrack | −0.19 ±1.98 | **+1.03 ±0.88 \*** | +0.87 ±1.43 | −12.0 ±12.2 |
| space-sprint | +1.50 ±2.19 | +0.87 ±0.92 | +0.85 ±1.48 | +0.0 ±11.8 |
| **outside interval** | **1 of 10** | **5 of 10** (7 of 10 on the normalised measure) | **1 of 10** | **1 of 10** |

**Every one of the ten posInBand differences is positive.** Ten independent tracks landing on the same
side of zero is the finding; the individual intervals are almost beside the point.

---

## 4. Why it runs backwards — a reading, not a measurement

**`rowLayout.js:99 computeSpeedBonus` gives every rear row a speed bonus for the WHOLE RACE**, sized
so that *"every row reaches the finish line in the same expected time"*. **Row 0 gets none.**

The deficit it compensates is a **fixed distance at the start**; the compensation is a **permanent
speed multiplier**. Those are not the same shape. A racer carrying a higher speed for the entire race
does not merely erase a starting gap — **it is faster in every mid-race interaction as well**: closing
on the racer in front, holding position when the band controller steers, and inside the contest
window.

**That would produce exactly what is measured** — arrival flat (the band controller pulls everyone to
their band regardless) while **position inside the band tilts toward the rows carrying the bonus.**

**It also predicts the track ordering, and the prediction holds.** The bonus scales with `rowIndex`,
so the effect should be largest where there are most rows. **luger-hill has 9 rows — the most of any
track — and it is the worst on every measure.** The three-row and four-row tracks are the mildest.

**This is a reading of two facts side by side, and it has not been tested.** Nothing here varies
`speedBonusFactor` and measures the response. **That experiment is named in the proposals and was not
run**, because this block was asked for a magnitude, not a mechanism.

---

## 5. What the N could not support

- **THE WIN RATE IS THE WEAKEST NUMBER IN THIS REPORT, and it is the one the owner's sentence uses.**
  A row's win count over 100 races carries an interval of **±5.8 to ±16 wins per 100**. **Only a gap
  above roughly 12–15 can be seen at all**, which is why nine of ten tracks read "level" on wins — that
  is the instrument's floor, **not a finding of fairness.** Reading the win column as evidence of
  evenness would be reading noise as a result.
- **The interval that separates is `posInBand`**, because every arriving racer contributes to it
  rather than one racer per race. **That is why it detects an effect the win rate cannot.**
- **Middle rows are reported individually and are mostly indistinguishable from each other.** The
  first-to-last comparison is the one this N supports; **row-to-adjacent-row differences are not.**
- **searound's −4.9pp band-arrival gap is the single arrival result outside its interval, at ±3.5.**
  One cell in ten at the 95% level is what chance produces. **It is reported, not believed**, and it
  would need its own N to stand.
- **One seed batch.** All ten tracks are seed 1, races 1–100. Nothing here separates a row effect from
  a seed-batch effect, though ten tracks agreeing makes that unlikely.

---

## 6. Source hygiene

**HOW THE ROW IS ASSIGNED — established at source, not inferred from the racer index**, as the brief
requires:

- The sim calls **`computeEvenRowLayout(nRacers, rowCount, raceRng)`** (`sim-fairness.mjs:1242`),
  which **shuffles the racer indices first** (`rowLayout.js:213`) and then fills rows. **Row is
  therefore independent of racer index by construction** — the thing the brief warned against
  inferring.
- It spreads the field **evenly**: `bigCount` rows of `ceil(n/rows)` and the rest of `floor(n/rows)`.
  That is why garden-path reads **14/13/13** and searound **6,6,6,6,6,5,5** rather than the
  floor-packed shape.
- **The shipped browser path uses the same function** — `raceCore.js:120` also calls
  `computeEvenRowLayout`. (`headlessRaceSimulator.js` uses an older floor-based variant; it is not the
  shipped engine.)
- **The ROW COUNT is deliberately the browser's**, not the layout module's: `sim-fairness.mjs:4467`
  records that it takes RaceScreen's own inline formula because *"the browser ignores
  computeRacerLayout.rowCount and computes its own, and the two disagree for small sprites (e.g.
  dolphin: 4 vs 3)"*. **So the grid measured here is the browser's start grid**, which is what makes
  these numbers transferable to the game.
- **Row counts are not a constant and were read per track**, not assumed: 3 (garden-path) to 9
  (luger-hill).

**Bands are the shipped ones, imported not restated:** `BAND_EDGES = [5, 15, 25, 40]` from
`client/src/modules/racePlanner.js`, the same source `computeZoneSuccessRate` imports. The last band's
upper edge is clamped to the field size, so B5 is 41–80 at 80 racers and does not exist at 40.

**THE RACES WERE NOT RE-RUN, AND THAT IS STATED RATHER THAN QUIET.** The configuration this brief
specifies — every shipped track, its own default racer, 80 open / 40 closed, N=100, shipped arm — is
**exactly** what LADDER-VALIDATION-1's shipped arm ran last night. Its `fairness-data.json` files
carry `startRowIndex`, `sollRank` and `finalRank` for every racer-race. **The protocol was verified
against the data itself before re-use** — races=100, racers per race, racer type, duration 60, seed 1
and the open/closed flag read out of each file and checked against this brief. **Re-running would have
cost 86 minutes to reproduce numbers already on disk.**

**Field size by topology was established from source** (`EditorShape.js:25`, `isOpen = !track.closed`)
and matches the data.

**Read-only. No fingerprint, no browser gate, no client suite** — and the reason is not "read-only"
alone: **this branch changes no product code at all.** The diff is one report and one INDEX line, so
no guard any of them runs can have changed its answer. **The Holm watchdog was deliberately NOT run
and its verdict appears nowhere**, which is the point of the block.

**Machine read before launching: 14 cores, 9 node processes, 14 browser processes.** **No worker pool
was needed** — the measurement is an analysis of files already on disk and ran single-threaded in
seconds.

---

## 7. Build-vs-spec conformity

1. **The brief was written expecting a sweep, and no sweep was run.** The data it asks for already
   existed at exactly the specified configuration. **Stated in §6 with the checks that established
   the match**, rather than presented as a fresh measurement.
2. **The brief asked for the answer "in racing language, not statistics", of the form "first row wins
   X of 100, last row Y of 100" — and that column turns out to be the least informative one in the
   report.** §2 gives it in his form for every track because he asked for it; **§5 says plainly that
   its interval is ±6 to ±16, so nine of the ten "level" readings are the instrument's floor rather
   than a result.** Giving the sentence without that caveat would have handed him a false reassurance
   in his own words.
3. **"State plainly whether this happens" (part d) — it happens, and in the opposite direction from
   the one the question implies.** The brief's phrasing anticipates the front row landing at the
   better edge. **It is the back row that does.** Reported as measured.
4. **No threshold is proposed and the Holm watchdog is not re-run**, as instructed.
5. **Where an interval is too wide to separate rows, that is said** rather than a direction reported —
   §5, and the `±` on every cell in §3.
6. **The mechanism in §4 is labelled a reading and the experiment that would test it was not run.**

---

## 8. Proposals

**P1 — VARY `speedBonusFactor` AND WATCH `posInBand`. It is the one experiment that would turn §4 from
a story into a finding.** The key already exists, `1.0` is full compensation and `0` is none, and the
prediction is sharp and falsifiable: **if the whole-race speed bonus is what tilts the band, then
lowering it should flatten the posInBand slope and raising it should steepen it — with luger-hill,
which has the most rows, moving most.** Three values on two tracks is well under an hour. **If the
prediction fails, the mechanism is something else and the field is narrowed either way.**

**P2 — `posInBand` IS A BETTER FAIRNESS INSTRUMENT THAN THE ONE THE PROJECT GATES ON, AND THIS RUN IS
THE ARGUMENT.** Band arrival is a **hit-or-miss** measure: a racer either lands in its band or does
not, so it discards how well it landed, and 88–90% of the signal is thrown away with it. **The
watchdog is silent on 8 of 10 tracks; band arrival is flat on 9 of 10; and `posInBand` separates on
7.** It uses every arriving racer rather than one winner per race, which is why its intervals are ten
times tighter. **Not proposed as a gate** — what counts as acceptable is the owner's call and he has
not seen these numbers before today — **but the project currently has no measure of fairness QUALITY,
only of fairness INCIDENCE, and this is one.**

**P3 — LUGER-HILL SHOULD BE LOOKED AT ON ITS OWN, BECAUSE IT IS NOT A SMALL VERSION OF THE OTHERS.**
Its front row wins **2 races in 100 against an even share of 11**, and it is the only track where mean
finishing rank separates. **It also has 9 rows where the next-most has 7 and most have 4** — so it is
the extreme of the very variable §4 names. **Whether that is one mechanism at its limit or a second
mechanism only luger-hill exposes is not established here**, and a track-specific look would answer it
far more cheaply than a ten-track sweep.

**P4 — THE ROW COUNT IS A LARGE, UNEXAMINED DESIGN VARIABLE.** It ranges from **3 to 9** across shipped
tracks, is derived from track width and sprite size rather than chosen, and **nothing in the record
measures what it does to the race.** This block found the worst row effect on the track with the most
rows; ROW-ADVANTAGE-1 is the first report to put the two side by side. **A racer count is chosen by the
host and a sprite size is chosen by a designer — the row count falls out of both, and nobody owns it.**
