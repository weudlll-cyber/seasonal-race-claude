# GATE-THREE-SEEDS-1 — the gate at three fixed seeds: last night's regression does not reproduce, and the brake is exonerated

Branch `night/2026-09-18`, piece 1. Date: 2026-09-18.
**Measurement only — nothing reverted, tuned, minted or merged.**

---

## ★★★ THE ONE LINE

**Last night's reading does not survive a second and third seed.** The two rows that flagged on the
shipped arm alone at seed 12345 behave completely differently at seeds **777** and **31337** — and at
the pooled N the **brake-OFF control is Holm-unfair on MORE tracks than the shipped defaults**
(4 against 2).

★★ **The start-row bias is real, reproducible and NOT the brake's.** `searound` and `luger-hill`
carry it on **both arms**, and the per-row win shares of the two arms agree to within about one
point on every row of every flagged track.

---

## 1 · THE RUN

| | |
|---|---|
| instrument | `scripts/sim-fairness.mjs`, **UNMODIFIED** |
| shipped arm | the real tree at master **`5b60b615`** |
| control arm | probe copy `C:/tmp/gboff`, **same commit**, differing in **one file, one key** (`gapBrakeEnabled` true→false, verified by `git diff`) |
| ★ **seeds** | ★ **12345** (last night), ★ **777**, ★ **31337** — all fixed, both arms |
| N | `--races=100` × three distance variants = **300 races/track**, the pinned N. **12,000 races tonight**, 18,000 across the three seeds |
| V1 | `servoNoiseBlindEnabled` **false on every arm** |
| workers | 8 of 14 cores; 40 jobs; 00:36 → 04:02 |

★ **Seed 12345's numbers are last night's, read from the summary committed at
`reports/night/pinned-gate-data/` on `night/2026-09-17`** — which is why that file was kept when the
99 MB of raw races was swept. **It was not re-raced, and it is not mixed with tonight's at any point
except the explicitly pooled table in §4.**

★ **The brake reached every seed.** If the arms were identical the gate would be measuring nothing:

| seed | races differing | winner changes |
|---|---|---|
| 12345 | 1,636 of 3,000 (54.5%) | 640 (21.3%) |
| **777** | **1,510 of 3,000 (50.3%)** | **560 (18.7%)** |
| **31337** | **1,487 of 3,000 (49.6%)** | **597 (19.9%)** |

---

## 2 · ★★ THE PER-SEED VERDICT — AND THE CONTROL IS NOT CLEAN EITHER

**Band reach passes everywhere, on both arms, at all three seeds** — B3 ranges **79.3 % – 87.9 %**
across the whole run, nowhere near the floor. **The gate's other criterion is the whole story.**

### Holm-flagged start rows, per seed

| seed | ★ SHIPPED DEFAULTS | ★ BRAKE OFF (control) |
|---|---|---|
| **12345** | **2** — ice-track, searound | **0** |
| **777** | **3** — searound, ice-track, luger-hill | **0** |
| ★ **31337** | **2** — searound, luger-hill | ★ **3 — searound, luger-hill, seatrack** |

★★★ **The control arm going 0, 0, 3 is the single most important number in this report.** Last
night's "the control is clean" was **one draw**. At seed 31337 the brake-off tree flags **three**
tracks — one more than the shipped tree does at the same seed.

### Is any row flagged CONSISTENTLY?

| track | flagged on SHIPPED | flagged on CONTROL |
|---|---|---|
| ★ **searound** | ★ **3 of 3 seeds** | 1 of 3 |
| luger-hill | 2 of 3 | 1 of 3 |
| ice-track | 2 of 3 | 0 of 3 |
| seatrack | 0 of 3 | 1 of 3 |

---

## 3 · ★★★ APPLYING THE DECISION RULE, AND THEN SAYING WHAT IT MEANS

**The rule as written:** *a row flagged on the shipped-defaults arm in ALL THREE seeds is a real
regression and belongs as the first line; a row flagged in one seed and not the others is a draw.*

**By the letter:**

- ★ **`searound` is flagged on the shipped arm in all three seeds.** By the rule, that is the first
  line, and it is on the morning sheet as one.
- **`ice-track` and `luger-hill` are flagged in two of three** — neither all nor one.
- **On the control, `searound`, `luger-hill` and `seatrack` are each flagged in exactly one seed** —
  **draws**, by the rule, and reported as such.

★★ **And then the part the rule cannot say for itself: `searound` is not a regression, because it is
not the brake's.** The same track is **Holm-unfair on the brake-OFF control** at seed 31337, and
**Holm-unfair on the control at the pooled N** (§4). A row that fails with the mechanism switched
off is not caused by the mechanism.

★ **`ice-track`, which was half of last night's headline, reverses.** It flagged on the shipped arm
alone at seed 12345; at 31337 it flags on neither arm; and **pooled over 900 races it is Holm-unfair
on the CONTROL and fair on the shipped defaults.** ★ **Reading last night's single seed as a
regression would have been exactly wrong about the direction.**

---

## 4 · ★★ POOLED OVER THE THREE SEEDS — THE CONTROL IS WORSE

Per-row **win counts summed across the three seeds — 900 races per track** — then one χ² per track
and Holm across the ten. ★ **This is NOT the gate**: the pinned N is 300 races and the gate is §2.
Pooling triples the power, so more tracks flag on **both** arms; it is here to answer *"which of these
is real"*, not *"does it pass"*.

| track | ★ SHIPPED χ² / Holm p | ★ CONTROL χ² / Holm p |
|---|---|---|
| **searound** | **48.373** / 3.06e-7 **UNFAIR** | **33.307** / 1.22e-4 **UNFAIR** |
| **luger-hill** | **32.300** / 2.99e-5 **UNFAIR** | **36.789** / 5.26e-6 **UNFAIR** |
| ice-track | 9.280 / 0.179 fair | ★ **14.880** / 1.67e-2 ★ **UNFAIR** |
| river-run | 7.111 / 6.05e-2 fair | ★ **9.000** / 2.01e-2 ★ **UNFAIR** |
| the other six | fair | fair |
| ★ **total flagged** | ★ **2** | ★ **4** |

★★★ **At the pooled N the brake-off control is Holm-unfair on twice as many tracks as the shipped
defaults.** Whatever is wrong with these start rows, **turning the brake off does not fix it and does
not cause it.**

---

## 5 · ★★ WHY IT IS NOT THE BRAKE — THE ROWS THEMSELVES

Pooled win share per start row, 900 races per arm. **This is the evidence that settles it**: if the
brake were moving start-row fairness the two columns would differ.

**`luger-hill`** — expected 20.0 % per row:

| row | ★ SHIPPED | ★ CONTROL | expected |
|---|---|---|---|
| 0 (front) | **16.3 %** | **14.9 %** | 20.0 % |
| 1 | 17.1 % | 18.1 % | 20.0 % |
| 2 | 18.0 % | 18.0 % | 20.0 % |
| 3 | 22.1 % | 22.6 % | 20.0 % |
| ★ 4 (back) | ★ **26.4 %** | ★ **26.4 %** | 20.0 % |

★ **Monotone toward the rear on both arms, and the back row is identical to the decimal.**

**`searound`** — the bias is a middle-row spike, not a gradient, and again the same on both arms:
row 2 takes **21.7 %** (shipped) / **19.7 %** (control) against 15.0 % expected, and row 6 takes
**15.7 % / 16.0 %** against 12.5 %.

**`ice-track`** — shipped 21.7 / 26.3 / 23.7 / 28.3 %, control 21.3 / 25.3 / 23.3 / **30.0 %** against
25.0 %. ★ **The control's back row is the more extreme of the two**, which is why the control is the
arm that flags at the pooled N.

★★ **Across every flagged track the two arms agree to within about one point on every row.** The
brake changes *who wins* in a fifth of races — and does not change *which start row* they come from.

---

## 6 · DOES ANY ROW, RACER TYPE OR CAST ROLE FLAG CONSISTENTLY?

- ★ **Start row: no row index is implicated across tracks.** luger-hill's bias is a rear gradient,
  searound's is a middle spike, ice-track's is rear-ish — **three different shapes.** What is
  consistent is the **track**, not the row.
- **Racer type: cannot be separated from track by this design** — the gate runs each track at its own
  `defaultRacerTypeId`, one type per track, so "the manta loses" and "searound loses" are the same
  sentence. **Unchanged from last night and still not answerable here.**
- **Cast role: not in `fairness-data.json` at all** — the rows carry `sollRank`, `finalRank` and
  `startRowIndex`, and no cast field. **Not measurable from this run.**

---

## 7 · ★ WHAT THIS SETTLES

1. ★★ **The shipped gap brake does not cause a start-row regression.** Three seeds, both arms, 18,000
   races. **Nothing needs reverting, and the brake stands.**
2. ★★ **The game has a real start-row problem on `searound` and `luger-hill`, independent of the
   brake** — reproducible across three seeds on both arms, and Holm-unfair at 900 races on both.
   **This is the standing issue the record has carried since 2026-07-31, now much better evidenced.**
3. ★ **`luger-hill`'s rear gradient is confirmed at 900 races on the CONTROL arm** — front row
   **14.9 %**, back row **26.4 %**, against 20.0 % expected. **That is a sixth independent measurement
   against the sentence in D25 and `FAIRNESS.md:156` which says the front rows are favoured there.**
   → [D25-SIGN-1](D25-SIGN-1.md)
4. ★ **One seed cannot support a fairness verdict, and now there is a clean demonstration**: the same
   control tree gave **0, 0 and 3** flagged rows on three draws. **Any future gate claim needs more
   than one seed**, and this is the second time that lesson has had to be learned here.

---

## WHAT THIS DOES NOT SETTLE

- ★ **What causes the searound and luger-hill biases.** luger-hill's candidate is on record
  (`rowLayout.js:119`, the open-track denominator); **searound's middle-row spike has no candidate at
  all** and is closed-track, so the open-denominator explanation does not reach it.
- **Whether the pooled table should ever be the gate.** It is not, here — the pinned N is 300 and §2
  is the gate. **Pooling three seeds finds more because it has more power, on both arms.**
- **Racer type and cast role** remain confounded and absent respectively (§6).
- ★ **The instrument still stamps every result PROVISIONAL** — it runs shipped defaults, not the
  owner's exported browser world, so this describes **the shipped race**.
- **Seed 12345 was not re-raced**; its rows come from the committed summary and are labelled as such.
