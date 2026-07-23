# Finale refinement pair — strength sweep + late-escaper analysis

G is settled at **0.75**. Ships **HELD** throughout. Read-only instrumentation only; fingerprint
`efd0f4ad8eca08fa` verified unchanged after every change.

---

# PART 1 — gapRerollStrength (the visibility knob)

SCREEN tier. Arms **s=0.50 vs s=1.0** (the decisive pairing) at G=0.75 symmetric, carousel OFF,
shipped defaults otherwise. Tracks searound + city-circuit, 40 closed / 60 open, **N=25 per arm per
track (50 races per arm)**, paired seeds. **Wall-clock 6.7 min.** **s=0.75 was NOT run — early stop**
(§4).

## The visibility metrics

| s | tilt frac **median** | **saturated%** (frac=1.0) | tilt delta median | tilts/race | n events |
|---|---|---|---|---|---|
| **0.50** | **0.352** | **24.5%** | **0.041** | 1.88 | 94 |
| 1.0 | 0.740 | 41.6% | 0.076 | 1.78 | 89 |

## The price

| s | escapeDepth med | p90 | max | episode duration med | unresolved-to-line |
|---|---|---|---|---|---|
| 0.50 | 2.325 | 4.124 | 7.29 | 8.0 s | 14.4% |
| 1.0 | 2.325 | 4.044 | 6.918 | 7.3 s | 13.0% |

## Standing set — screening numbers, **no gate claims at this N**

| s | late lead chg | distinct | dead | duo | front @line | runaway | parade | band-reach |
|---|---|---|---|---|---|---|---|---|
| 0.50 | 1.64 | 2.56 | **18.0%** | **2.0%** | **3.96** | 12.0% | 2.0% | 75.4% |
| 1.0 | 1.80 | 2.74 | 22.0% | 4.0% | **4.96** | 6.0% | 2.0% | 74.5% |

Raw counts behind the rates (50 races/arm): runaway **6 vs 3**, dead **9 vs 11**, duo **1 vs 2**,
parade **1 vs 1**. The rate metrics rest on small counts and are **not conclusive individually**.

## Answers

**1. Does s=0.5 push tiltSaturatedRate down substantially? YES — decisively.**
Saturated corrections fall **41.6% → 24.5%** (−17.1 pp, −41% relative), the median applied `frac`
**halves** (0.740 → 0.352), and the median actual speed change **halves** (0.076 → 0.041). This is
exactly what the G-sweep failed to do — there, corrections got *harder* (0.74 → 0.86). **Strength is
the right knob for the visibility complaint, and it works.**

**2. The price is small.** escapeDepth median is **unchanged** (2.325 both), p90 +2%, max +5%
(6.92 → 7.29 L). Episodes last ~10% longer (7.3 → 8.0 s) and unresolved-to-line rises **+1.4 pp**
(13.0% → 14.4%). The feared "escapes run free" cost did not materialise at this N — softer corrections
did not meaningfully let escapes deepen.

**3. Regressions — mixed, one clear.**
- **Clear cost: front group at the line 4.96 → 3.96 (−20%)**, the largest and most trustworthy standing-set
  effect (a continuous mean over 50 races). Late lead changes 1.80 → 1.64 and distinct leaders
  2.74 → 2.56 also soften.
- **Clear benefit:** dead finales 22% → 18%, duo escapes 4% → 2%.
- Runaway 6% → 12% leans worse but is 3 vs 6 races — not conclusive; concentrated on searound
  (12% → 20%), already the runaway-prone track. Band-reach 74.5% → 75.4% (no gate claim at N=25).

**4. Candidate for the eye-test: (G=0.75, s=0.50).** It is the only setting measured so far that
genuinely makes an individual correction *gentler* — which is the complaint — and it costs almost
nothing in escape depth. **Early stop applied:** the ordering on the primary question is unambiguous
and monotonic, so s=0.75 was not run. It remains the obvious fallback if the eye finds the front group
too thin at the line (the one clear regression).

---

# PART 2 — Late-escaper analysis (report-only, no new arms)

Owner observation (searound): the FIRST escaper was braked and caught; a SECOND escaped later, was
never braked, and won alone — carrying no hero marker, so hero priority is excluded.

## 2a. Schedule math — where the last gap-correctable roll sits (source only, no runs)

`rollCount = max(2, floor(D / 10))` · `rollInterval = 0.95·D / rollCount` · the transform additionally
refuses to act once `elapsed > lastRollDeadline − reRollTransitionDuration (3 s)`.

**That 3-second exclusion removes the final roll entirely — costing a whole 9.5 s interval, not 3 s.**

| realized duration | rolls | interval | last roll | window end | **last CORRECTABLE roll** | uncorrectable run-out |
|---|---|---|---|---|---|---|
| 30 s | 3 | 9.50 s | 28.5 s | 25.5 s | **19.0 s** | **11.0 s = 36.7%** (free from p=0.633) |
| 60 s | 6 | 9.50 s | 57.0 s | 54.0 s | **47.5 s** | **12.5 s = 20.8%** (free from p=0.792) |
| 89 s *(searound @60 s nominal)* | 8 | 10.57 s | 84.6 s | 81.6 s | **74.0 s** | **15.0 s = 16.9%** (free from p=0.831) |
| 120 s | 12 | 9.50 s | 114.0 s | 111.0 s | **104.5 s** | **15.5 s = 12.9%** (free from p=0.871) |
| 300 s | 30 | 9.50 s | 285.0 s | 282.0 s | **275.5 s** | **24.5 s = 8.2%** (free from p=0.918) |

The absolute run-out is ~`interval + 3 s` ≈ 12.5 s at any length, so as a *fraction* it is brutal on
short races (**36.7% at 30 s**) and mild on long ones (8.2% at 300 s).

## 2b. Empirical classification (500 episodes across both arms)

**The phase split is the proof, and it is absolute:**

| arm | episodes WITH a correctable roll ahead | corrected | episodes WITHOUT one | corrected |
|---|---|---|---|---|
| s=0.50 | 224 | 27.7% | 26 | **0.0%** |
| s=1.0 | 223 | 28.7% | 31 | **0.0%** |

**Once the leader is out of correctable rolls, the correction rate is exactly zero — 0 of 57.** Not
low. Zero. That is a structural gap, not a tuning miss.

**An honest caveat on the raw rates.** Overall only ~25% of episodes are "corrected" and ~75% are not —
but that headline is misleading, and I would have misread it without the depth data. The median episode
peaks at just **1.50 L** (barely over G) and lasts **7–8 s**, *shorter than the 9.5 s roll interval*.
Most escapes simply close on their own before any roll comes round. Those are not failures; the
mechanism was never needed. Only **12%** of all episodes are genuinely out-of-rolls.

**The owner's actual signature — escapes that ran UNRESOLVED to the line:**

| arm | n unresolved | of which OUT-OF-ROLLS | had a roll ahead | start p (median) | peak med | peak p90 |
|---|---|---|---|---|---|---|
| s=0.50 | 36 | **58.3%** | 41.7% | **0.893** | 2.23 | 5.60 |
| s=1.0 | 33 | **66.7%** | 33.3% | **0.897** | 1.93 | 3.46 |
| *s=1.0, searound* | 18 | 61.1% | 38.9% | 0.888 | 1.86 | 5.42 |

Escapes that win alone begin at **p ≈ 0.89 median** — *after* searound's last correctable roll at
**p = 0.831**. **Two-thirds of them are structurally uncorrectable.**

## 2c. Phase split — is "early corrected, late free" the dominant signature? **Yes.**

Corrected episodes start at **p = 0.665** median; unresolved ones at **p = 0.893**. Exactly the pattern
the owner described: the early escaper gets braked, the late escaper is free.

## 2d. Verdict (one line)

**Structural gap — the scheduled dice run out before the race does.** The last correctable roll lands
at ~79% of a 60 s race (83% on searound), the correction rate past it is exactly 0.0%, and two-thirds
of escapes that win alone start after it. No priority conflict was found: the escaper being hero-free
is consistent with the data, and the remaining third (escape uncorrected *despite* a roll ahead) is
explained by the roll simply not falling inside the short episode, not by an overriding transform.

**Knob space that does NOT violate "scheduled dice only":**
1. **`reRollLastPositionPercent`** (95%) — where the last scheduled roll sits. The most direct lever.
2. **`reRollTransitionDuration`** (3 s) — it currently costs a *whole roll*, because the final roll at
   95% falls inside the 3 s exclusion. Shortening it, or aligning the last roll to land just before the
   cutoff, recovers one full correction opportunity for free.
3. **`reRollIntervalDivisor`** (10) — more, closer rolls late in the race.

All three keep corrections on scheduled rolls only.

---

# COMBINED RECOMMENDATION

**Send (G = 0.75, s = 0.50) to the owner's browser eye-test.** It halves the hardness of an individual
correction — the actual complaint — at essentially no cost in escape depth. Watch specifically for the
one clear regression: **a thinner front group at the line** (−20%). If that shows, **s = 0.75** is the
untested middle and costs ~7 min to screen.

**The late-escape window does not need an owner decision now — it can wait for the deck-dice evolution
step**, with one condition. Deck-dice removes late high-draw streaks *at the source*, which attacks the
cause rather than patching the correction, and would make the uncorrectable tail largely moot. Deciding
`reRollLastPositionPercent` now would be tuning a symptom that the next step may delete.

**The condition:** the uncorrectable window is **36.7% of a 30 s race**. If short races are ever on the
roadmap, this stops being a tail case and becomes the dominant regime, and it needs a decision before
that ships — not after.

Data: `screen-arms.csv`, `screen-arm-track.csv`, `screen-per-seed.csv`, `episodes-summary.csv`,
`episodes-per-episode.csv`, `episodes-unresolved.csv`, `schedule-math.json`, `meta.json`.
