# PINNED-GATE-1 — the full pinned fairness gate, at last: it FAILS on the shipped arm and PASSES on the brake-off control

Branch `night/2026-09-17`, piece 1. Date: 2026-09-18. **Measurement only — nothing reverted, nothing
tuned, nothing minted, nothing merged.** The decision rule for this piece says a row failing only on
the shipped-defaults arm is a regression on master and belongs at the top of the morning sheet, and
that it is to be reported rather than repaired. **That is what this does.**

---

## ★★★ THE ONE LINE

**At the full pinned N, at one fixed seed, the shipped master carries TWO Holm-unfair start rows —
`ice-track` and `searound` — and the brake-off control carries NONE.** Band reach passes comfortably
on both arms. **By the rule as written, that is a regression on master.**

★ **And it must be read with its strength, which is one seed.** The two flagged tracks tilt in
**opposite directions**, no start row gains or loses systematically, and the record already contains a
case of the same shipped config producing 0, 0 and 2 flagged rows on three draws. **Section 6 is the
honest weighting and it is not a retraction of section 3.**

---

## 1 · THE INSTRUMENT, THE ADDRESS, AND THE CONTROL

| | |
|---|---|
| instrument | **`scripts/sim-fairness.mjs`, UNMODIFIED** — the project's own fairness harness |
| shipped arm | the real tree at master **`5b60b615`**, no config override of any kind |
| control arm | probe copy at `C:/tmp/goff`, **same commit `5b60b615`** |
| ★ the control's entire difference | **ONE file, ONE key** — `defaults.js`, `gapBrakeEnabled: true → false`. Verified tonight with `git diff`: `1 file changed, 1 insertion(+), 1 deletion(-)` |
| seed | ★ **12345, FIXED, both arms** |
| started / finished | 22:12 → **00:05**, 1 h 53 m, 8 workers |

★ **The real tree was never instrumented.** The only modified copy is the probe, and it is modified in
the one key the experiment is about.

★ **`--seed` matters here more than anywhere**: `sim-fairness.mjs --seed=0` is `Math.random()`, and
every fairness verdict taken before that was discovered was a single undeclared draw.

★ **One caveat the instrument stamps on itself, carried rather than dropped:** it prints
*"ASSUMED-DEFAULTS — no `--config` given … Every result is stamped PROVISIONAL. It describes the
owner's race ONLY if his browser is at defaults."* **This gate describes the SHIPPED race, not
necessarily the race in his browser.**

---

## 2 · N AGAINST THE PINNED N — ★ THIS ONE IS NOT SHORT

| | this run | the pinned N |
|---|---|---|
| races per track | **300** | 300 |
| how | `--races=100` × **three distance variants** (30 / 60 / 120 s), **pooled into ONE test per track** | same |
| tracks | 10, each at its own default racer | 10 |
| total | **6,000 races** (3,000 per arm) | — |

★★ **This is the first time the gate has been run at the pinned N with a fixed seed on both arms.**
BRAKE-FAIRNESS-2, which cleared the ship, ran **120 races per track** and said so. **The pinned gate is
no longer owed.**

★ **The pooling is deliberate and is the method, not a shortcut.** Sixty separate per-variant tests
are a different and under-powered measurement — the record names that as a method error. One pooled
test per track, then Holm across the ten.

---

## 3 · ★★★ THE VERDICT AGAINST THE CRITERIA

The gate is **band reach ≥ its threshold AND zero Holm-unfair start rows**, every track. Both
criteria, both arms:

### Band reach — ★ PASSES on both arms, everywhere, with room

The tightest zone is B3. Lowest value anywhere in the run is **river-run at 80.6% (shipped) / 80.7%
(control)**, against a threshold well below it. Every other track sits at **84–88%**. Overall reach is
**85.9–89.9%** on the shipped arm and **86.2–90.0%** on the control. **No track is close to the line
on either arm, and the two arms agree within half a point on every track.**

### Start-row Holm — ★★★ SHIPPED ARM FAILS 2, CONTROL PASSES 0

**SHIPPED DEFAULTS (brake ON):**

| track | rows | χ² | raw p | Holm p | verdict |
|---|---|---|---|---|---|
| ★ **ice-track** | 4 | **19.200** | **3.136e-4** | **3.136e-3** | ★ **UNFAIR** |
| ★ **searound** | 7 | **20.000** | **2.905e-3** | **2.615e-2** | ★ **UNFAIR** |
| garden-path | 3 | 6.462 | 3.851e-2 | 3.080e-1 | fair |
| city-circuit | 4 | 7.440 | 5.806e-2 | 4.064e-1 | fair |
| river-run | 2 | 1.920 | 1.619e-1 | 9.714e-1 | fair |
| dirt-oval | 4 | 2.640 | 4.527e-1 | 1.000 | fair |
| luger-hill | 5 | 2.700 | 6.123e-1 | 1.000 | fair |
| seatrack | 3 | 0.679 | 7.169e-1 | 1.000 | fair |
| mountainstreet | 2 | 0.053 | 8.027e-1 | 1.000 | fair |
| space-sprint | 3 | 0.251 | 8.778e-1 | 1.000 | fair |

**BRAKE OFF (control):**

| track | rows | χ² | raw p | Holm p | verdict |
|---|---|---|---|---|---|
| garden-path | 3 | 8.486 | 1.426e-2 | 1.426e-1 | fair |
| ice-track | 4 | 10.320 | 1.600e-2 | 1.440e-1 | fair |
| river-run | 2 | 1.920 | 1.619e-1 | 1.000 | fair |
| luger-hill | 5 | 4.433 | 3.506e-1 | 1.000 | fair |
| dirt-oval | 4 | 2.880 | 4.120e-1 | 1.000 | fair |
| searound | 7 | 6.000 | 4.237e-1 | 1.000 | fair |
| space-sprint | 3 | 0.448 | 8.007e-1 | 1.000 | fair |
| seatrack | 3 | 0.310 | 8.544e-1 | 1.000 | fair |
| city-circuit | 4 | 0.480 | 9.203e-1 | 1.000 | fair |
| mountainstreet | 2 | 0.000 | 9.505e-1 | 1.000 | fair |

### ★ APPLYING THE DECISION RULE AS WRITTEN

- flagged on **BOTH** arms (pre-existing, does not block): **none**
- ★★ flagged **ONLY on the shipped-defaults arm**: ★ **`ice-track` and `searound`**
- flagged only on the control: **none**

> **A row failing ONLY on the shipped-defaults arm is a regression on master and belongs as the FIRST
> LINE of the morning sheet — do not revert, just report.**

**Both flagged rows are that case. Nothing was reverted.**

---

## 4 · EVERY HOLM-FLAGGED ROW, PER ROW, BOTH ARMS

**`ice-track`** — 4 rows of 10, each expected to win 25.0%:

| row | ON wins | OFF wins | ON | OFF | Δ |
|---|---|---|---|---|---|
| 0 | 63 | 57 | 21.0% | 19.0% | +2.0 |
| ★ **1** | **51** | 66 | ★ **17.0%** | 22.0% | **−5.0** |
| 2 | 87 | 87 | 29.0% | 29.0% | 0.0 |
| ★ **3** | **99** | 90 | ★ **33.0%** | 30.0% | +3.0 |

★ **ice-track tilts to the REAR** — 21 / 17 / 29 / 33 against a flat 25. The control carries the same
shape more weakly (19 / 22 / 29 / 30), so the brake arm **exaggerates a gradient that is already there
rather than inventing one.**

**`searound`** — 7 rows, expected 15.0% (rows 0–4) and 12.5% (rows 5–6):

| row | ON wins | OFF wins | ON | OFF | Δ |
|---|---|---|---|---|---|
| ★ **0** | **60** | 42 | ★ **20.0%** | 14.0% | **+6.0** |
| 1 | 36 | 45 | 12.0% | 15.0% | −3.0 |
| 2 | 60 | 57 | 20.0% | 19.0% | +1.0 |
| 3 | 48 | 48 | 16.0% | 16.0% | 0.0 |
| 4 | 42 | 36 | 14.0% | 12.0% | +2.0 |
| ★ **5** | **21** | 33 | ★ **7.0%** | 11.0% | **−4.0** |
| 6 | 33 | 39 | 11.0% | 13.0% | −2.0 |

★★ **searound tilts to the FRONT** — the opposite direction from ice-track. Its control arm is flat
(14 / 15 / 19 / 16 / 12 / 11 / 13, χ² 6.000, p 0.42).

---

## 5 · DOES ANY ROW, TYPE OR CAST ROLE SYSTEMATICALLY GAIN OR LOSE? — ★ NO

Paired per track and row, shipped minus control, across all ten tracks:

| row | tracks | mean Δ win share | mean Δ avg rank | gained / lost / level |
|---|---|---|---|---|
| 0 | 10 | +0.47 pp | +0.008 | **4 / 4 / 2** |
| 1 | 10 | −0.67 pp | −0.014 | **3 / 6 / 1** |
| 2 | 8 | −0.46 pp | +0.001 | 3 / 2 / 3 |
| 3 | 5 | +2.00 pp | −0.025 | 3 / 1 / 1 |
| 4 | 2 | +0.83 pp | +0.009 | 1 / 1 / 0 |
| 5 | 1 | −4.00 pp | +0.174 | 0 / 1 / 0 |
| 6 | 1 | −2.00 pp | +0.014 | 0 / 1 / 0 |

★ **No row moves consistently.** The front row gains on four tracks and loses on four. Mean changes in
average finishing rank are **at most 0.03 of a place** over ten tracks — nothing a racer experiences.
Rows 5 and 6 exist on one track only (searound) and cannot carry a claim.

★ **RACER TYPE CANNOT BE SEPARATED FROM TRACK IN THIS DESIGN, and that is stated rather than
answered**: the gate runs each track at its own `defaultRacerTypeId`, one type per track, so "the
snowmobile loses" and "ice-track loses" are the same sentence. **Answering the type question needs a
different run.**

**Cast role is not in `fairness-data.json` at all** — the rows carry `sollRank`, `finalRank` and
`startRowIndex`, and no cast field. **Not measurable from this run; not guessed at.**

---

## 6 · ★★ HOW STRONG THIS IS — THE PART THAT DECIDES WHAT TO DO WITH IT

**The brake genuinely reached this run.** If the sim were still blind to the gap brake the two arms
would be the same race and the whole gate would be measuring nothing, so this was checked first:

| | |
|---|---|
| races differing between the arms | ★ **1,636 of 3,000 — 54.5%** |
| races changing winner | ★ **640 of 3,000 — 21.3%** |

**The arms are not the same race, on every one of the ten tracks.** The gate is measuring the brake.

★ **The brake's own firing count is NOT available from this run** — `sim-fairness.mjs` prints no brake
counter, and counting would have meant instrumenting a copy, which is not what the pinned arm may be.
The standing measurement, on this same code at a shorter N, is **63,579 brake commands on 544,477
calls** (BRAKE-FAIRNESS-2). **That figure is cited, not re-measured here.**

### ★★ Three reasons this is a flag to resolve rather than an established cause

1. ★ **ONE SEED.** FAIRNESS-SEED-1 recorded the same shipped configuration producing **0, 0 and TWO**
   Holm-flagged rows on three separate draws. **Two flagged rows at one seed sits inside the variance
   the record already documents.** The arms are paired at the same seed, which is the right design and
   is why this is worth taking seriously — but a paired design at N=1 seed still cannot separate "the
   brake did it" from "this draw did it".
2. ★★ **The two flagged tracks tilt in OPPOSITE directions** — ice-track to the rear, searound to the
   front. A mechanism that systematically advantaged a start row would not do that.
3. ★ **No row moves consistently across the ten tracks** (§5), and the average-rank effects are within
   0.03 of a place.

### ★ What would settle it, and it is cheap

**A second and third fixed seed, both arms, same N.** Tonight's run took **1 h 53 m** with the dev
server stopped — so two more seeds is one night. **If ice-track and searound flag again on the shipped
arm at a fresh seed and stay clean on the control, it is real and the brake owns it. If they move, it
was the draw.** Nothing else needs building to find out.

---

## 7 · ★ TWO THINGS THIS RUN SETTLES THAT WERE NOT ASKED

- ★★ **`luger-hill` is FAIR on both arms at the pinned N** — χ² 2.700, p 0.612 shipped; χ² 4.433,
  p 0.351 control. **The standing luger-hill failure does not reproduce when the three distance
  variants are pooled**, and tonight's piece 3 explains why: the effect is **specific to the 30 s
  variant**, where the back row's permanent bonus is 7.91% against 3.80% at 60 s. Pooling 30 / 60 / 120
  dilutes a one-variant effect below detection. **So "luger-hill fails the gate" and "luger-hill is
  fair at the pinned N" are both true, of different measurements**, and the gate as pinned does not
  see it.
- ★ **luger-hill's own rows still rise toward the rear on both arms** — shipped 17.7 / 18.0 / 20.7 /
  21.0 / **22.7%** against a flat 20.0. **That is a fifth independent measurement agreeing that the
  REAR is favoured on that track**, against the sentence in D25 and `FAIRNESS.md:156` which says the
  front is. → [FAIRNESS-SIGN-1](FAIRNESS-SIGN-1.md)

---

## THE DATA

The raw per-racer rows are **99 MB** and are not kept. What the report cites is committed beside it in
`pinned-gate-data/`: **`pinned-gate-summary.json`** (per track, per arm: row sizes, χ²/df/p, band reach
by zone, rowMin, and per-row wins / expected share / average rank) and **`pinned-gate-run.txt`** (the
aggregation output as it was read). **A second-seed run can be compared against these without
re-racing this one.**

---

## WHAT THIS DOES NOT SETTLE

- ★ **Whether the brake causes the two flags. One seed cannot say** (§6), and the direction evidence
  argues against a systematic mechanism.
- **The brake's firing count in THIS run** — the instrument carries no counter and none was added.
- **Racer type and cast role** — confounded and absent respectively (§5).
- **Whether his browser sees this race at all** — the instrument stamps every result PROVISIONAL
  because it runs shipped defaults rather than his exported world (§1).
- **Nothing was reverted, and nothing should be on this evidence alone.** The decision rule says
  report, and the strength says take a second seed before acting.
