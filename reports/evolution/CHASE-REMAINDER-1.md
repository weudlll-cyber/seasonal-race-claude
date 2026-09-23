# CHASE-REMAINDER-1 — what is left after the ship, and it is a worst-case question on two tracks

> **In one sentence: at WILD — the stage he actually watches — nothing is left that is worse than
> before the ship on any measure, and at QUIET the typical race got better while the single worst
> race got WORSE (268 → 349 px), so what remains is not a frequency problem but one ugly race on
> one or two tracks.**

**Branch `read/chase-remainder-1`, off master `f0bfa6d1`. 2026-09-23. READ-ONLY — no source file
under `client/src/` was touched, no default moved, no key added. Nothing is built and nothing is
proposed.** Instrument and data: `reports/evolution/chase-remainder-data/`.

★ **My hypothesis was REFUTED and that is the second result.** I expected the remaining ugly races
to be chasers who closed the gap, overshot, and formed a new leading group. They are not. §(B).

---

## THE THREE CHECKS, BEFORE ANY NUMBER

### CHECK A — the ship reproduces itself. **PASS**

The shipped world must reproduce the G5 arm the owner approved, race for race, against the committed
`reports/evolution/chase-build-data/`:

| | paired | `packBreakaway` mismatches | `packMaxPx` (3 dp) mismatches | breakaways |
|---|---|---|---|---|
| quiet | **300/300** | **0** | **0** | 22/300 = **7.3%** — the approved figure |
| wild | **300/300** | **0** | **0** | 5/300 = **1.7%** — the approved figure |

★ This matters more than anything else in this report: it says the world on master IS the world he
looked at. The arm was measured as a config OVERRIDE on a chase-off tree; it is now three DEFAULTS.
Those are different code paths to the same numbers, and they agree to the third decimal on all 600.

### CHECK B — pure observation. **PASS, and it caught a defect in my own instrument**

Race signature with the measurement active vs. stripped out, dirt-oval, 5 seeds: **5/5 identical.**

★★ **It failed first, on 4 of 5, and the instrument was wrong rather than the race.** The parent
BREAKS its stepping loop once fewer than two racers are unfinished — harmless there, because the
parent reports no signature. This file does report one, and breaking left the **last racer never
finishing**: 39 of 40 home, its rank and time unset, so the signature differed from a bare run while
the race was **bit-identical**. Changed to `continue`. Every measured value is unchanged by the fix
(`packMax` 125.184 / 135.972 / 146.034 / 180.076 / 86.633 before and after), which is how I know the
defect was in the signature and not in the measurement. **A check that exists to catch a
perturbation must not be trippable by the harness itself**, and this one was.

### CHECK C — the boost record is really read (sabotage). **PASS**

In a scratch copy only — never committed, and the first draft's `--sabotage-blind-boost` flag was
**removed** from the instrument before any data was produced, because a committed switch that
silently blinds an instrument is a foot-gun. The reader was patched to return nothing; six races
against a control of the same six:

| | result |
|---|---|
| races where any (B) number SURVIVED the sabotage | **0 of 6** |
| races whose RACE SIGNATURE the sabotage changed | **0 of 6** |

Both halves matter. The first says (B) is really reading the boost record. The second says the
sabotage only blinds the READER, so the collapse to zero cannot be explained by the sabotaged run
having raced differently.

★ **On the two-stage rule (owner rule 19):** it governs ARMS, and this block has none — it is one
observational pass on the shipped world, and the cases only exist at N=300. N=300 was run directly.

---

## (A) HOW BAD, NOT ONLY HOW OFTEN

Every one of the 300 races per stage, not only the ones over threshold. At wild only 5 cross, so a
worst-case claim built on those five would be worthless; the gap SIZE is measurable on all 300.

| | | median | p90 | **max** |
|---|---|---|---|---|
| **quiet** | pre-chase | 111.3 | 167.2 | **267.9** |
| | **shipped** | **98.2** | **145.7** | **★ 349.3** |
| **wild** | pre-chase | 111.5 | 157.0 | 300.8 |
| | **shipped** | **75.2** | **123.0** | **207.6** |

★★★ **THE ANSWER TO THE QUESTION THE BRIEF ASKED: YES, THE WORST CASE AT QUIET IS STILL WORSE THAN
BEFORE THE SHIP.** 267.9 → **349.3 px**, and it is one race — `city-circuit` seed 30, which went
168.9 → 349.3, a gap that **more than doubled**. At wild the worst case is **better**, 300.8 → 207.6.

★ **The typical race improved decisively in both stages.** Paired race by race: the maximum gap is
smaller in **199 of 300** quiet races (sign test p = 1.6 × 10⁻⁸) and **247 of 300** wild races
(p = 4.3 × 10⁻³¹). The median race improves by 13 px at quiet and 36 at wild. **The tail is the
finding; the centre is not in question.**

### Per track — shipped against pre-chase, world px

| track | quiet med | quiet p90 | **quiet max** | pre max | wild med | wild p90 | **wild max** | pre max |
|---|---|---|---|---|---|---|---|---|
| city-circuit | 108.1 | 214.8 | **★ 349.3** | 267.9 | 93.0 | 142.0 | 167.4 | 196.2 |
| dirt-oval | 116.2 | 180.1 | 205.0 | 233.1 | 94.2 | 133.9 | **★ 207.6** | 164.3 |
| garden-path | 84.4 | 127.3 | 134.6 | 154.0 | 80.4 | 132.7 | **★ 202.3** | 200.0 |
| ice-track | 122.3 | 169.8 | 214.2 | 235.0 | 96.6 | 147.3 | 157.3 | 242.9 |
| luger-hill | 109.4 | 144.6 | 165.5 | 236.3 | 76.7 | 117.8 | 146.4 | 187.5 |
| mountainstreet | 71.9 | 122.1 | 148.6 | 195.1 | 52.7 | 106.2 | 125.1 | 131.6 |
| river-run | 71.8 | 126.5 | **★ 152.2** | 125.9 | 52.9 | 76.4 | 101.9 | 145.5 |
| searound | 112.4 | 175.5 | 243.8 | 248.2 | 98.0 | 140.7 | 157.0 | 300.8 |
| seatrack | 95.4 | 127.4 | 174.5 | 210.4 | 67.1 | 122.7 | 146.1 | 195.2 |
| space-sprint | 98.1 | 146.5 | 189.0 | 248.6 | 65.9 | 110.5 | 140.4 | 192.8 |

★ **stars mark a worse maximum than before the ship — four cells of twenty.** Quiet: `city-circuit`
(+81 px, the big one) and `river-run` (+26, on a track that has never produced a breakaway at all and
whose worst is still well under the 157.05 px threshold). Wild: `dirt-oval` (+43) and `garden-path`
(+2, which is noise on one race). **Every other cell is better, and every median and every p90 in
both stages is better.**

★★ **So the remainder is concentrated, not diffuse: ONE track at quiet.** `city-circuit` is the only
cell where a worse maximum is also a large maximum.

---

## (B) ★★★ MY HYPOTHESIS, TESTED AND **REFUTED**

**The hypothesis, labelled as mine and not as a finding:** the races the chase made worse are ones
where the chasers close the gap, **overshoot**, and form a NEW leading group that then runs away.

**The test.** At the moment the owner's gap first crosses the threshold, compare the racers AHEAD of
the gap against the field behind it, on how many in-window physics steps each held a boost slot
BEFORE that crossing. If the hypothesis is right the leading group should be boosted MORE, and
should largely be racers who were not at the front when the window opened.

| | quiet (22 crossings) | wild (5 crossings) |
|---|---|---|
| mean pre-cross boost steps, **leading group** | **54.7** | **45.5** |
| mean pre-cross boost steps, **the field behind** | **60.0** | **83.5** |
| ratio | **0.91×** | **0.55×** |
| races where the leading group was boosted MORE | **6 of 21** | **1 of 5** |
| median per-race ratio | **0.37×** | **0.00×** |
| leading-group racers who are NEWCOMERS | 17 of 56 = **30%** | 4 of 13 = **31%** |
| crossings where **NOT ONE** of the leading group was boosted | **9 of 22** | **3 of 5** |

★★★ **REFUTED, and the evidence points the opposite way.** The racers who end up ahead of the gap
were boosted **LESS** than the field they left behind, in about three-quarters of the crossings
(two-sided sign test on the 21 decided quiet races, p = 0.078 — not significant at 0.05, but the
direction is the reverse of the prediction and nothing in the data supports the prediction).
**70% of the leading group were already in the front band when the window opened**, and in **9 of
the 22** quiet crossings not a single racer in the leading group had been boosted at all.

★★ **The three worst remaining races at quiet all have `0/3` boosted-ahead** — `city-circuit` 30,
`city-circuit` 5, `searound` 5. The leading group in the ugliest races is precisely the group the
chase never touched.

★ **What that leaves, stated as the finding rather than a new hypothesis.** The chase is doing what
it was built to do — it boosts chasers, and the racers who end up in front are the ones who got
there without help. The remaining breakaways are therefore **not a side effect of the chase's boost
landing on the wrong racers**. The chase still CHANGED those races (it changes every race), and
`city-circuit` 30 is worse than it was; but the mechanism by which it got worse is not the one I
proposed, and this block does not know what it is. **Naming that cause would be a new measurement,
not a re-reading of this one.**

★ A detail for the eye rather than the statistics: **5 of the 22 quiet breakaways and 2 of the 5 at
wild reach their peak gap at progress ≥ 0.95** — the gap is at its widest as the field crosses the
line, rather than opening mid-window and being reeled in. Those may well watch differently from a
mid-race escape. That is a question for his eye, not for this instrument.

---

## (C) THE SHORTLIST FOR HIS EYE

Worst first, by in-window maximum gap. **`track` + quick-test `seed`, ready to type into the Quick
Test**, with the same race's pre-chase value so the direction is visible. `boosted` is how many of
the leading group had been boosted before the crossing.

### quiet — the shipped stage

| # | track | seed | gap px | pre-chase | Δ | group | peak @ | boosted |
|---|---|---|---|---|---|---|---|---|
| 1 | **city-circuit** | **30** | **349.3** | 168.9 | **+180.4** | 3 | 0.98 | 0/3 |
| 2 | city-circuit | 5 | 262.4 | 267.9 | −5.5 | 3 | 0.79 | 0/3 |
| 3 | searound | 5 | 243.8 | 109.4 | **+134.4** | 3 | 0.85 | 0/3 |
| 4 | city-circuit | 18 | 214.8 | 139.6 | +75.2 | 3 | 0.81 | 2/3 |
| 5 | ice-track | 20 | 214.2 | 164.8 | +49.4 | 2 | 0.98 | 1/2 |
| 6 | dirt-oval | 20 | 205.0 | 214.6 | −9.5 | 1 | 0.73 | 0/1 |
| 7 | searound | 28 | 190.6 | 138.7 | +52.0 | 3 | 0.85 | 1/3 |
| 8 | space-sprint | 27 | 189.0 | 248.6 | −59.7 | 2 | 0.76 | 0/2 |
| 9 | dirt-oval | 24 | 183.9 | 168.7 | +15.3 | 2 | 0.81 | 1/2 |
| 10 | ice-track | 17 | 182.2 | 96.8 | +85.4 | 3 | 0.92 | 1/3 |

### wild — the stage he tests

| # | track | seed | gap px | pre-chase | Δ | group | peak @ | boosted |
|---|---|---|---|---|---|---|---|---|
| 1 | **dirt-oval** | **9** | **207.6** | 138.6 | +69.0 | 2 | 1.00 | 0/2 |
| 2 | garden-path | 13 | 202.3 | 119.4 | +82.9 | 2 | 0.85 | 1/2 |
| 3 | city-circuit | 15 | 167.4 | 193.6 | −26.2 | 5 | 1.00 | 3/5 |
| 4 | dirt-oval | 3 | 165.9 | 149.4 | +16.5 | 1 | 0.74 | 0/1 |
| 5 | ice-track | 29 | 157.3 | 242.9 | −85.7 | 3 | 0.72 | 0/3 |
| 6 | searound | 13 | 157.0 | 104.0 | +53.0 | — | 0.80 | — |
| 7 | searound | 3 | 155.0 | 126.0 | +28.9 | — | 1.00 | — |
| 8 | ice-track | 18 | 152.8 | 189.3 | −36.6 | — | 0.87 | — |
| 9 | city-circuit | 24 | 150.4 | 196.2 | −45.7 | — | 0.89 | — |
| 10 | ice-track | 3 | 147.3 | 135.5 | +11.8 | — | 0.83 | — |

★ Rows 6–10 at wild did **not** cross the 157.05 px threshold (or crossed only on the sensitivity
pair), so they have no crossing group — they are the worst races that are *not* breakaways by his
definition, included because at wild only five races cross and a top-ten of five would hide how
quickly the tail falls off. **By row 6 the wild list is already at the threshold itself.**

★★ **If only one race is watched, watch `city-circuit` seed 30 at quiet.** It is the largest gap
anywhere in 600 races, it more than doubled at the ship, and it peaks at 0.98 — at the line.

---

## WHAT THIS DOES **NOT** ESTABLISH

- ★★ **IT MEASURES GAPS, NOT WHETHER A RACE LOOKS BAD.** Every number here is a distance in world
  px between the back of a leading group and the front of the field. Whether 349 px on
  `city-circuit` is ugly to watch, or merely a number, **only his eye answers** — the shortlist
  exists so that it can. A gap that peaks at the line may watch quite differently from the same gap
  opening at 0.75, and nothing here distinguishes them.
- **It does not name the cause of the remaining worst races.** (B) refutes one candidate cause and
  puts nothing in its place. `city-circuit` 30 got worse and this block does not know why.
- **It does not establish that the chase caused the two worse cells.** Paired seeds share an
  identity, not a counterfactual: the chase changes every race, so a race being worse after it is
  not evidence that the chase made it worse *by acting on that race's leaders* — (B) is the only
  causal question asked, and it came back negative.
- **The 157.05 px threshold is his single anchor**, recovered from `BREAKAWAY-RECOUNT-2:20`, and it
  was calibrated on leader-to-second, not on the owner's own gap. The sensitivity pair (112.5 /
  225.0 px) is recorded per race in the data for anyone who wants to re-cut the counts.
- **One fixture.** 40 racers, 60 s, track-default racer, quick-test roster. Field size and racer
  type are not varied, and the clustering caveat applies to the sign tests: 30 seeds over ten tracks
  are not 300 independent races, so the quoted p-values are anti-conservative.

---

## SO: IS THERE SOMETHING WORTH FIXING?

★ **Not a frequency problem. The ship settled that** — 16.0% → 7.3% at quiet, 9.7% → 1.7% at wild,
with the median and p90 gap down in both stages and 199 of 300 (quiet) / 247 of 300 (wild) individual
races improved.

★ **At wild, nothing is left that is worse than before on any measure this block can compute** —
frequency, median, p90 and worst case all improved. If wild is the stage that matters, the honest
answer is **nothing left worth rebuilding for.**

★★ **At quiet there is exactly one cell worth his eye: `city-circuit`.** Its worst race more than
doubled and is the largest gap in 600. **Whether that is worth structural work depends on whether it
looks as bad as 349 px sounds, and this block cannot answer that.** One race on one track, with the
refuted hypothesis meaning nobody yet knows its cause, is **not** a case for rebuilding the servo's
core — it is a case for watching `city-circuit` seed 30.

**Nothing is recommended.**
