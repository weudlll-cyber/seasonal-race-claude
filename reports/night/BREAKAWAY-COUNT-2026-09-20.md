# BREAKAWAY-COUNT-2026-09-20 — 16 in 100, and every previous count measured the wrong distance

Branch `diag/breakaway-count-1`, blocks BREAKAWAY-COUNT-1 and BREAKAWAY-COUNT-2. Date: 2026-09-20.
**A COUNT. No engine source, no key, no default, nothing built, nothing minted.** It answers the
first sentence of the owner's requirement only; no remedy is proposed, designed or measured.

---

## ★★★ THE ONE SENTENCE

> **In today's shipped game, in the last 30% of the race, a breakaway by the owner's own definition
> happens in about 16 of every 100 races** — 48 of 300, `quiet`, ten tracks, 40 racers.

> ★★ **And measured the way this project has always measured it, the same 300 races give 2.7%.** The
> difference is not noise, it is the definition: **a six-fold difference between leader-to-second and
> back-of-group-to-front-of-field.**

---

## 1 · ★★★ THE DISTANCE WAS WRONG, AND THE RECORD SAYS SO IN ITS OWN WORDS

The owner's definition, 2026-09-20: *a racer running ALONE at the front, or a small GROUP leading
together, FAR from the chasing field — and the distance runs from the back of that group to the
**front of the field**, the beginning of the pack, never its middle.*

Every breakaway figure this project has published measured **leader-to-second**. That is not a
guess. `reports/evolution/BREAKAWAY-RECOUNT-1.md:25` quotes the original harness verbatim:

```js
C:/tmp/breakaway.mjs:79   const frac = s.finishT > 0 ? (live[0].t - live[1].t) / s.finishT : 0;
```

`live[0].t - live[1].t` — **leader minus second.** So the 71 → 44 → 20 sequence, the 56 px allowance
the gap brake acts on, and BREAKAWAY-COUNT-1's own first reading are all the same quantity, and it is
the quantity his definition excludes. **When second sits on the leader's wheel while ranks 3–40 are
far back, leader-to-second reports no breakaway and he sees a lone leader.**

★★ **This is the fourth correction in this line of counting**, and it is a different kind from the
first three. Those were a divisor error — dividing by a per-frame zoom instead of the settled camera
value, which is what moved 71 to 44 to 20. **This one is the numerator.**

### What the threshold therefore means

**157.05 world px** (0.698 canvas widths against the settled `LEADER_ZOOM` 225,
`BREAKAWAY-RECOUNT-2.md:20`) was derived by measuring **leader-to-second** in his photograph. Applied
to the pack gap it is an anchor of the right order but not a calibrated one. **It is used as the
headline anyway, because it is his only number**, and the sensitivity pair below exists so nothing
rests on it alone.

| threshold | in widths | ★ share of races, owner's definition, N=300 |
|---|---|---|
| 112.5 px | 0.5 w | **48.0%** |
| ★ **157.05 px** | **0.698 w — his** | ★★ **16.0%** |
| 225.0 px | 1.0 w | **2.0%** |

★ **The count is strongly threshold-sensitive** — halving the distance triples it, and a full canvas
width almost never happens. Any later decision that rests on "how often" must name the distance it
means, or it is not a number.

---

## 2 · HOW IT IS COMPUTED, AND WHAT IS DELIBERATELY ABSENT

Per physics step, over live racers ordered by position: the consecutive gaps **1-2, 2-3, 3-4, 4-5,
5-6**; the **breakaway gap** is the largest of those five; the **group size** is how many racers sit
ahead of it.

★ **The 5 is not a new number** — it is `BAND_EDGES[0]` (`racePlanner.js:56`), the game's own front
band, **imported, never restated**. A leading group larger than the front band is not a breakaway
group, it is the field.

★★ **No mean, median or centroid of the field is computed anywhere in the harness.** He said such a
figure tells him nothing and is not what he sees; the front of the pack is the racer immediately
behind the gap, and nothing further back is consulted.

**Sampling is on the PHYSICS STEP** — positions and finished flags snapshotted before
`stepRacePhysics`, the role map read after. Never a `runRace` frame callback, which can cover two
physics steps and read every gap one step late.

---

## 3 · ★★★ THE TABLE — TEN TRACKS, N=300, TODAY'S SHIPPED WORLD

`quiet`, `choreoOutcomeStart` 0.60, gap brake ON at its shipped values, 40 racers, the owner's
roster, fixed window **[0.70, finish]**. ★ **Each per-track row is 30 races** — a share of 20.0% is
6 races, and no per-track figure here is firmer than that.

| track | races | ★ **owner's definition** | leader-to-second | pack max med (px) | held > half peak (s) | never closed |
|---|---|---|---|---|---|---|
| ice-track | 30 | ★ **36.7%** (11) | 6.7% (2) | 139.2 | 14.75 | 36.4% |
| city-circuit | 30 | 20.0% (6) | 3.3% (1) | 121.6 | 13.17 | 16.7% |
| dirt-oval | 30 | 20.0% (6) | 3.3% (1) | 122.0 | 12.73 | 16.7% |
| luger-hill | 30 | 20.0% (6) | 6.7% (2) | 117.2 | 9.83 | 16.7% |
| searound | 30 | 20.0% (6) | 6.7% (2) | 124.4 | 9.26 | **50.0%** |
| mountainstreet | 30 | 16.7% (5) | 0.0% (0) | 100.6 | 8.93 | 40.0% |
| space-sprint | 30 | 16.7% (5) | 0.0% (0) | 113.4 | 12.24 | 20.0% |
| seatrack | 30 | 10.0% (3) | 0.0% (0) | 103.0 | 10.38 | **66.7%** |
| garden-path | 30 | **0.0%** (0) | 0.0% (0) | 104.9 | — | — |
| river-run | 30 | **0.0%** (0) | 0.0% (0) | 80.6 | — | — |
| ★ **POOLED** | **300** | ★★ **16.0%** (48) | **2.7%** (8) | **111.3** | **11.10** | **31.3%** |

★ **Two tracks never do it at all** and one does it more than twice as often as the pooled rate. The
spread is the shape of the answer, not a wrinkle in it.

### ★★ How long, and whether it is ever closed

Of the 48 qualifying races, the gap is held **above half its own peak for a median 11.10 s**, and in
**31.3% — about 31 in every 100 breakaways — the field never closes it before the finish.**

"How often" alone would mislead, which BREAKAWAY-FREQUENCY-1 said of itself: 16 in 100 that last
eleven seconds and end unresolved a third of the time is a different game from 16 in 100 that are
pulled back.

---

## 4 · ★★ IT IS USUALLY A GROUP, NOT A LONE LEADER

His definition covers both cases and nobody knew which the game produces. Of the 48 qualifying races:

| racers ahead of the gap | races | share |
|---|---|---|
| **1 — alone in front** | 8 | **16.7%** |
| **2** | 15 | ★ **31.3%** |
| **3** | 14 | ★ **29.2%** |
| 4 | 4 | 8.3% |
| 5 | 7 | 14.6% |

★★★ **Five times in six it is a leading GROUP, not a solo escape** — and most often a pair or a trio.
The picture the word "breakaway" brings to mind, one racer alone, is the **rarest** of the five.

### Who is in that group

Roles at the moment the gap first qualifies, read off `getHeroRoles()` and never guessed from the
race — 131 racer-slots across the 48 races:

| role | slots | share |
|---|---|---|
| ★ **(uncast)** | 64 | ★ **48.9%** |
| `sovereign-lead` | 41 | 31.3% |
| `comebacker` (staged) | 12 | 9.2% |
| `pursuer` | 12 | 9.2% |
| `attacker-b2` | 2 | 1.5% |

★ **Nearly half the racers in a breakaway group were never cast in any role**, which is the same
direction SHAPE-CENSUS-1 and SHAPE-UNCAST-2026-09-20 found by a different route and a different
definition of breakaway.

---

## 5 · THE WHOLE RACE, AND WHAT THE GAP BRAKE DID TO HIS NUMBER

The only comparison the record supports is leader-to-second over the whole race, because that is what
was measured on 2026-09-15 — **two days before the gap brake shipped**.

| | share | fixture |
|---|---|---|
| recorded 2026-09-15, `quiet`, **pre-brake** | **21.0%** | seeds 1–10, N=100 |
| ★ measured here, `quiet`, **brake ON** | **22.7%** (68 of 300) | seeds 1–30, N=300 |

> ★★ **The gap brake did not reduce breakaways on his measure.** 22.7% against 21.0% — flat, and if
> anything slightly higher.

★ **The fixtures are not identical** — different seeds and a different N — so this is not a paired
comparison and the 1.7-point difference is not a result. What it does rule out is a large reduction:
the brake did not move this count from ~21% to something visibly smaller.

★ And in the owner's own window the same measure gives **2.7%**, against **16.0%** by his definition.
**The brake acts on a quantity that is six times rarer than the thing he is describing.**

---

## 6 · ★★ THE CONTRADICTION IN TODAY'S OWN REPORTS — RESOLVED, AND IT WAS MINE

`BREAKAWAY-ACTION-2026-09-20` gives the shipped control at N=300 as **80% of races** above the 56 px
allowance inside [0.70, finish]. `SHAPE-UNCAST-2026-09-20` computes its per-track uncast shares from
**"N=25 breakaways over 300 races"**, same window, same allowance. Both cannot be right.

★ **Both SHARE figures were always right. The denominator label was wrong.** The 25 came from
`action-stage1.json` — the Q60 arm at **30 races**, three per track — not from stage 2's 300. The
arithmetic agrees perfectly once the population is named: **25/30 = 83.3%** at N=30 and
**240/300 = 80.0%** at N=300. What was false is the sentence "over 300 races", and with it the
implied firmness of every per-track row: they rested on **two or three races each**.

### The recomputation, over the correct N=300 population

| track | breakaways | uncast | ★ share | *superseded figure* |
|---|---|---|---|---|
| searound | 26 | 17 | **65.4%** | *50.0%* |
| mountainstreet | 14 | 9 | 64.3% | *50.0%* |
| city-circuit | 28 | 17 | 60.7% | *66.7%* |
| space-sprint | 26 | 14 | 53.8% | *66.7%* |
| luger-hill | 27 | 14 | 51.9% | ★ *100.0%* |
| ice-track | 30 | 14 | 46.7% | *33.3%* |
| river-run | 17 | 7 | 41.2% | ★ *0.0%* |
| dirt-oval | 27 | 11 | 40.7% | *33.3%* |
| seatrack | 23 | 8 | 34.8% | *50.0%* |
| garden-path | 22 | 7 | 31.8% | *50.0%* |
| ★ **POOLED** | **240** | **118** | ★ **49.2%** | *52.0%* |

★★ **The pooled finding survives; the per-track figures did not.** `luger-hill` fell from 100% to
51.9% and `river-run` rose from 0% to 41.2% — both were shares of two or three races. **The precise
claim also changes**: uncast (118) is the **largest single category**, larger than `sovereign-lead`
alone (103), but it does **not** exceed all cast roles combined (122). SHAPE-UNCAST's wording that it
does is superseded.

★ The original figures are **left in place** in that report and marked superseded there; this
directory is append-only.

---

## 7 · REUSE AND SOURCE HYGIENE

| needed | already existed | used |
|---|---|---|
| the driving loop, PRE-STEP ranking, the fixed window | `action-arms.mjs` ← `breakaway-lever.mjs` ← `breakaway-growth.mjs` | ★ reused untouched |
| the front band | `BAND_EDGES[0]`, `racePlanner.js:56` | ★ imported, not restated |
| the role detection | the plan's role map via `getHeroRoles()`, as SHAPE-CENSUS-1 reads it | reused |
| the threshold | `BREAKAWAY-RECOUNT-2.md:20`, and its provenance from `BREAKAWAY-RECOUNT-1.md:25` | recovered, not invented |

| file | lines | what changed |
|---|---|---|
| `breakaway-count-data/breakaway-count.mjs` | 0 → 156 → **196** | created for COUNT-1, then **extended** for COUNT-2 with the owner's gap, the group size, the sensitivity pair and the group roles. **No second harness was written**, as the brief required. |
| `breakaway-count-data/agg-count.mjs` | 0 → **51** | NEW — the table |
| `breakaway-count-data/count-*.json` | — | the data, four runs |

**No engine source touched. No new guard, key or default.** The leader-to-second columns were kept
rather than deleted, because the whole point of the block is the difference between the two.

### ★ NOTICED AND DELIBERATELY LEFT

- **The 56 px allowance the gap brake acts on is a leader-to-second number.** Whether the brake
  should act on the owner's distance instead is a mechanism question and is explicitly out of scope
  here — no remedy is proposed.
- **`garden-path` and `river-run` never qualify at all**, on either definition. Whether that is track
  geometry or something else was not investigated; this block counts.
