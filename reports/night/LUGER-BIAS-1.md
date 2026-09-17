# LUGER-BIAS-1 — the rear bias belongs to luger-hill, the record has carried it since 2026-07-31,
and what is new is that it is a DURATION effect on an OPEN track

Branch `night/2026-09-17`. Date: 2026-09-18. **NO REPAIR. Investigation only** — it changes the
shipped race for every viewer and that is the owner's decision. The owner's store was not opened.

---

## ★ WHAT IT IS

At the 30 s duration variant the shipped game's start rows do not win equally on **luger-hill**, and
the direction is **rear-favouring**: the front row wins too seldom and the back row too often. It is
present with the **brake off**, so it predates every mechanism shipped this month.

★★ **NEITHER THE BIAS NOR ITS CANDIDATE MECHANISM IS NEW, AND AN EARLIER DRAFT OF THIS REPORT SAID
THE RECORD WAS SILENT. IT IS NOT** — see "WHAT THE RECORD ALREADY SAYS" below. luger-hill has been
Holm-unfair on start rows since **2026-07-31**, the rear direction was established on **2026-08-24**,
and `rowLayout.js:99 computeSpeedBonus` was named as the candidate in that same report. **What this
block adds is narrower**: that the size of the effect depends on the race DURATION, through the
OPEN-track branch of the denominator, which is why luger-hill at 30 s is the extreme case.

**The 30 s duration alone does not produce it** — running at 30 s does not tilt tracks in general, it
tilts this one. (That is not the same as saying duration is irrelevant to it: on luger-hill the
duration sets the SIZE, which is §"WHAT IS ACTUALLY NEW HERE" below. The point here is that the other
nine tracks sit at 30 s without separating.) Same instrument, same seed, brake off, 100 races per
track, **30 s variant only**, all ten tracks:

| track | rows | χ² | p | front row wins | **back row wins** | expected |
|---|---|---|---|---|---|---|
| city-circuit | 4 | 3.6 | 0.308 | 29.0% | 26.0% | 25.0% |
| dirt-oval | 4 | 1.2 | 0.756 | 29.0% | 22.0% | 25.0% |
| garden-path | 3 | 0.7 | 0.703 | 31.0% | 34.0% | 35.0% |
| ice-track | 4 | 5.8 | 0.118 | 25.0% | 33.0% | 25.0% |
| **luger-hill** | **5** | **9.4** | **0.051** | **13.0%** | **25.0%** | **20.0%** |
| mountainstreet | 2 | 0.6 | 0.429 | 46.0% | 54.0% | 50.0% |
| river-run | 2 | 0.2 | 0.691 | 48.0% | 52.0% | 50.0% |
| searound | 7 | 4.1 | 0.661 | 19.0% | 9.0% | 15.0% |
| seatrack | 3 | 0.6 | 0.746 | 34.0% | 36.0% | 35.0% |
| space-sprint | 3 | 0.8 | 0.662 | 31.0% | 33.0% | 35.0% |

★ **Nine of ten tracks are unremarkable at 30 s.** Only luger-hill separates, and it is the only
track whose front row is at little more than half its expected share.

★ **Note searound**, which has the MOST rows (7) and whose back row *under*-performs (9.0% against
15.0%). Row count alone does not produce the effect.

---

## ★★ THE MECHANISM THAT WOULD PRODUCE IT

★ **This mechanism was named on 2026-08-24, not tonight.** ROW-ADVANTAGE-1 §4 says in terms:
*"`rowLayout.js:99 computeSpeedBonus` gives every rear row a speed bonus for the WHOLE RACE"*, and that
the compensation is *"a fixed distance at the start"* repaid as *"a permanent speed multiplier"* —
*"not the same shape"*. I arrived at the same line independently; the credit is that report's.

`computeSpeedBonus` at [rowLayout.js:99-122](../../client/src/modules/rowLayout.js#L99-L122) gives every
row behind the front a **permanent speed multiplier** to compensate for starting further back:

```
tOffset      = rowGapPx / pathLengthPx
row0Distance = finishT                          (closed)
               finishT − totalRows × tOffset    (OPEN — rowLayout.js:119)
bonus_N      = N × tOffset / row0Distance × speedBonusFactor
```

**The denominator is the race's own length in t.** A shorter race therefore produces a *larger*
permanent bonus for the same physical start deficit — and on an **open** track the denominator is
reduced again by `totalRows × tOffset`.

Evaluated on each track's own geometry (no simulation — the formula on the shipped values):

| track | rows | **back row's bonus at 30 s** | at 60 s | at 120 s | finishT at 30 s |
|---|---|---|---|---|---|
| city-circuit | 4 | 1.37% | 1.37% | 1.37% | 2.000 (closed) |
| dirt-oval | 4 | 1.16% | 1.16% | 1.16% | 2.000 |
| garden-path | 3 | 0.84% | 0.84% | 0.84% | 2.000 |
| ice-track | 4 | 1.49% | 1.49% | 1.49% | 2.000 |
| **luger-hill** | **5** | **★ 7.91%** | 3.80% | 3.80% | **0.478 (open)** |
| mountainstreet | 2 | 0.97% | 0.48% | 0.29% | 0.287 |
| river-run | 2 | 1.14% | 0.57% | 0.35% | 0.293 |
| searound | 7 | 3.63% | 3.63% | 3.63% | 2.000 |
| seatrack | 3 | 2.45% | 1.20% | 1.07% | 0.422 |
| space-sprint | 3 | 2.24% | 1.10% | 0.66% | 0.284 |

★★★ **luger-hill's back row carries a 7.91% permanent speed bonus at 30 s — by far the largest in the
set**, more than double the next (searound 3.63%) and **2.1× its own value at 60 s**.

**Why it is luger-hill specifically:** it is the **only open track with five start rows**. The open
branch at [rowLayout.js:119](../../client/src/modules/rowLayout.js#L119) subtracts `totalRows × tOffset`
from an already-small `finishT`, so rows and shortness compound. The closed tracks divide by
`finishT = 2.0` and never get near this; the other open tracks have two or three rows.

★ **For scale**: the natural speed spread the game draws from is about ±10%, so a 7.91% permanent
bonus is most of a full spread band, held for the entire race.

---

## IS THE COMPENSATION WRONG, OR JUST LARGE?

**In t-space the formula is exact by construction**: a racer starting `N × tOffset` behind covers
`finishT × (1 + bonus) = finishT + N × tOffset` over the race, which is precisely the deficit. So the
arithmetic is not the error.

★ **ROW-BONUS-TIMING-1 (2026-08-24) established exactly this and went further**: the catch-up point is
progress **1.000 for every rear row on every track**, so *"the leftover is identically ZERO"* — which
is why the owner's question of switching the bonus off once its purpose is served *"has nothing to
switch off"*. That report also tested the bonus SIZE against the tilt and found the association
**carried entirely by two tracks**: r = 0.909 over ten, **0.587 without luger-hill, 0.100 without
luger-hill and searound** — no relationship at all among the eight ordinary tracks. ★ **So its verdict
"the tilt is NOT explained by this mechanism" is a verdict about the ORDINARY tracks. It does not
acquit the bonus on luger-hill, which is one of the two tracks carrying the whole association** — and
the table above says why luger-hill is one of them.

**What the derivation does not account for is everything that happens to a racer between the flag and
the line.** A racer carrying a large permanent multiplier meets the two-sided clamp
(`[minMult, maxMult]` on the servo's target), the drafting and avoidance factors, the area bonus, and
the re-roll band — all of which are multiplicative and none of which is in the compensation's
derivation. **Whether that is what turns an exact compensation into a rear advantage is NOT
established here**; it is the candidate the evidence points at, and testing it means changing the
shipped race.

---

## ★★ WHAT THE RECORD ALREADY SAYS — AND THE CORRECTION OF MY OWN FIRST DRAFT

★ **An earlier draft of this section read "I searched … There is none." That was written before the
searches were run and it is false.** The brief's rule is that an absence claim not backed by the
search text counts as not checked; this one was not checked, and the record is in fact rich. What the
searches actually return:

| date | record | what it already established |
|---|---|---|
| 2026-07-20 | `reports/results-salvage/lbb-gate/luger-hill/fairness-report.md` | luger-hill start rows **χ²(6) = 11.93, n.s.** — measured and **NOT flagged** at that protocol. The earliest start-row measurement of this track I can find. |
| 2026-07-31 | `reports/evolution/HOLM-300-COMBINED.md` | ★ **The earliest FLAG.** luger-hill **UNFAIR p = 0.020** on the native pooled Holm, together with searound and seatrack, *"at the ship"*. |
| 2026-07-31 | `reports/evolution/RACER-MOTION-2.md` | The same two tracks flagged at N=100 — *"searound + luger"* — and called a **pre-existing start-row gradient**, not that block's doing. |
| 2026-08-24 | `reports/evolution/ROW-ADVANTAGE-1.md` | ★★ **The direction, the magnitude and the mechanism.** *"THE ADVANTAGE RUNS BACKWARDS. The BACK rows are the favoured ones"* on 10 of 10 tracks; luger-hill the extreme — front row **2 wins in 100 against an even share of 11**, finishing **4.32 ± 2.09 places** worse. Names `rowLayout.js:99 computeSpeedBonus`. Its **P3 asks for exactly this block**: *"LUGER-HILL SHOULD BE LOOKED AT ON ITS OWN, BECAUSE IT IS NOT A SMALL VERSION OF THE OTHERS."* |
| 2026-08-24 | `reports/evolution/ROW-BONUS-TIMING-1.md` | The leftover is **identically zero by construction**; the bonus-size association is **carried entirely by luger-hill and searound** (r 0.909 → 0.100 with both removed). |
| 2026-09-11 | `reports/evolution/STAGING-START-ROWS-1.md` | ★ **χ² 23.100, p 1.562e-4, Holm-UNFAIR, 1 of 10 on master** — and it *"reproduces an independent run on another branch digit for digit"*. Title: *"luger-hill was already unfair"*. |
| 2026-09-16/17 | `FAIRNESS-SEED-1.md`, `BRAKE-FAIRNESS-2.md` | This week's own runs, which is all my first draft's `rear.bias` search was returning. |

★ **So it is dated: the flag first appears 2026-07-31 and has been reproduced on at least four
separate branches since.** The 2026-07-20 measurement at χ²(6) = 11.93 n.s. is the one point that
reads clean, and it ran a different protocol (7 rows there against 5 here), so **it is not evidence
that the tree was fair in July** — only that that run did not flag it.

### ★ A FIELD-SIZE DIFFERENCE, SO THE TWO RECORDS ARE NOT QUOTED AS IF THEY WERE ONE RUN

ROW-ADVANTAGE-1 says luger-hill has **9 rows**; the table above says **5**. Both are right.
That block's brief specified **80 racers on open tracks and 40 on closed**; the fairness gate, and
every run in this report, uses **40 everywhere**. Verified at the tree tonight, all ten tracks at both
field sizes:

- luger-hill is **OPEN**, and carries **5 rows at 40 racers, 9 at 80** — which is where its 9 came from.
- ★ **ROW-ADVANTAGE-1's supporting sentence — *"It also has 9 rows where the next-most has 7"* — does
  not survive the check.** searound carries **7 rows at 40 and 14 at 80**, more than luger-hill at
  either size. It reads as the most-rows track in that report only because its **closed** topology put
  it at the 40-racer field while luger-hill sat at 80. **Row count is therefore NOT what separates
  luger-hill**, which is the same conclusion the 30 s table above reaches from the other direction:
  searound has the most rows and its back row *under*-performs.

**That strengthens rather than weakens this block's reading.** The discriminator is not how many rows
a track has; it is **openness × shortness**, through the denominator at rowLayout.js:119.

---

## ★ WHAT IS ACTUALLY NEW HERE

Stated narrowly, because most of the picture was already drawn:

1. **The effect is duration-dependent, and nobody had measured that.** ROW-ADVANTAGE-1 and
   ROW-BONUS-TIMING-1 both ran at **60 s**. luger-hill's back-row bonus is **3.80% at 60 s and 7.91%
   at 30 s** — it slightly more than doubles, while on the five closed tracks it does not move at all.
2. **The open-track branch at rowLayout.js:119 is named as the reason**, rather than row count. It is
   the term that makes the denominator shrink twice over on a short open track.
3. **Nine of ten tracks are unremarkable at 30 s on wins**, so the 30 s variant does not simply make
   every track noisier — it separates one.

## ★ THE CANDIDATES, NAMED, WITH NOTHING CHANGED

1. **The open-track denominator** — [rowLayout.js:119](../../client/src/modules/rowLayout.js#L119).
   Subtracting `totalRows × tOffset` inflates the bonus exactly where rows are many and the race is
   short. luger-hill is the only track where both hold.
2. **`speedBonusFactor` is a single global** — one value for every track and every duration, where
   the compensation it scales varies by 9× across the set (0.84% to 7.91%).
3. **The compensation is derived in isolation** from the multiplicative chain it then lives inside
   (above). ★ **This candidate is ROW-ADVANTAGE-1's, dated 2026-08-24, not mine** — it reads there as
   *"it is faster in every mid-race interaction as well"*. It remains untested: **nothing in the record
   varies `speedBonusFactor` and measures the response**, which that report also says of itself.
4. **The 30 s variant may simply be outside the intended range.** It is a *measurement-protocol*
   input — [sim-fairness.mjs:325](../../scripts/sim-fairness.mjs#L325) calls the 30/60/120/300 s runs the
   "retained MEASUREMENT-PROTOCOL input" — and a player's race is the track's own default duration,
   not 30 s. **Whether any real race is ever run at luger-hill's 30 s geometry is not established
   here**, and it bears on whether this matters at all.

**No repair was made and none is proposed.**

---

## WHAT THIS DOES NOT SETTLE

- **N = 100 races per track at one seed.** luger-hill's p here is **0.051**, which is not itself
  significant; the case rests on it being the only track that separates at all, plus the mechanism.
- ★ **The magnitude is seed- and run-shape-dependent.** The same track, seed and arm gave p = 0.000719
  in the three-variant run (BRAKE-FAIRNESS-2) and p = 0.051 here with `--dur=30` alone. **The
  direction reproduces; the strength does not**, and the likely reason is that the variant loop
  changes which races each seed produces. That is a caveat on every number in the first table.
- Candidate 3 is a hypothesis with no measurement behind it. Testing it changes the shipped race.
- I did not check whether any shipped track default resolves to a 30 s race.
- ★ **The bonus table is the FORMULA evaluated on each track's geometry, not a simulation.** It shows
  what the compensation is worth; it does not show what a racer does with it. The step that would join
  the two — varying `speedBonusFactor` and measuring the tilt — has never been run, here or in the
  record.
- ★ **The win-rate numbers in the first table are the weakest in this report**, and ROW-ADVANTAGE-1
  §5 says why in general terms: a row's win count over 100 races carries an interval of roughly
  **±6 to ±16 wins per 100**, so only a large gap is visible at all. luger-hill's 13.0% against an
  expected 20.0% is near that edge.
