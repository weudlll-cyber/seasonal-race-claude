# BREAKAWAY-RECOUNT-1 — breakaways are LESS common than he was told, and the stage DOES cause them

**Branch** `fix/breakaway-recount-1` · **READ-ONLY on the record — no source changed, nothing minted,
nothing merged, nothing re-tuned.** The owner's store was **not opened at all** in this block.

---

## ★★ THE ONE SENTENCE

> **Less common.** He was told a racer runs at least as far ahead as the one he photographed in
> **71 races in 100**. Corrected, it is **44 in 100** (N=100 races, `wild`, N=40 field).
>
> ★★ **And the report's headline conclusion is REVERSED.** It said the action stage does not cause
> breakaways — *quiet 70, medium 69, wild 71*, flat. Corrected: **quiet 32, medium 37, wild 44.**
> **The stage does cause them, and his own setting is the worst of the three.**

---

## 1 · THE FORMULA, QUOTED FROM THE PRODUCING CODE

The producing instrument survives at `C:/tmp/breakaway.mjs` (outside the repository; **left exactly
as it is**, as the evidence of what produced the published numbers). Two lines:

```
C:/tmp/breakaway.mjs:79   const frac = s.finishT > 0 ? (live[0].t - live[1].t) / s.finishT : 0;
C:/tmp/breakaway.mjs:87   gapW: vw > 0 ? (frac * PATH_PX) / vw : 0,
```

★ **Line 79 is correct for what it is named**: `frac` is the gap as a **fraction of the race**, and
the report's "% of the race" column is right because of it. ★ **Line 87 is where the error sits**: it
multiplies `frac` by `pathLengthPx` as if `frac` were the gap in **path lengths**. It is not — `t` is
*already* measured in path lengths ([durationModel.js:22](../../client/src/modules/durationModel.js#L22)),
so the division at line 79 is carried through one time too many.

|  | expression |
|---|---|
| published | `gapW = (dt / finishT) × pathLengthPx / visibleWorldPx` |
| ★ **correct** | `gapW = dt × pathLengthPx / visibleWorldPx` |
| relation | ★ **corrected = published × `finishT`** — exact, and `finishT` is constant within a race |

---

## 2 · WHO IS AFFECTED — AND A SINGLE RESCALING IS NOT VALID

`finishT` per track, measured at each track's own default racer (the report's own method):

| track | topology | default racer | `finishT` | ★ multiplier on the published figure |
|---|---|---|---|---|
| city-circuit | closed | motorbike | 2.00000 | ★ **×2.000** |
| dirt-oval | closed | horse | 2.00000 | ★ **×2.000** |
| garden-path | closed | beetle | 2.00000 | ★ **×2.000** |
| ice-track | closed | snowmobile | 2.00000 | ★ **×2.000** |
| searound | closed | manta | 2.00000 | ★ **×2.000** |
| luger-hill | open | luge | 0.95000 | ×0.950 |
| seatrack | open | dolphin | 0.84451 | ×0.845 |
| river-run | open | duck | 0.58573 | ×0.586 |
| mountainstreet | open | boarder | 0.57452 | ×0.575 |
| space-sprint | open | rocket | 0.56897 | ★ **×0.569** |

★★ **NO TRACK HAS MULTIPLIER 1. NOT ONE IS UNAFFECTED.** And the error runs in **both directions**:
the five closed tracks were published at **half** the true value, the five open ones at up to
**1.76× too much**. The spread is ×0.569 to ×2.000 — a factor of **3.5** between the least and most
wrong track.

> ★★ **SO A SINGLE RESCALING IS NOT VALID, AND THE POOLED SHARES CANNOT BE REPAIRED ARITHMETICALLY.**
> Every pooled figure mixes ten tracks with ten different multipliers, five of them above 1 and five
> below. There is no constant that fixes them. **They had to be recomputed race by race, and were.**

★ **The clearest demonstration of that, from the recount** (`wild`, N=40, 100 races):

| subset | published ≥0.349 | ★ corrected ≥0.698 |
|---|---|---|
| the 5 **CLOSED** tracks (50 races) | 52.0% | ★ **52.0% — IDENTICAL** |
| the 5 **OPEN** tracks (50 races) | 90.0% | ★ **36.0% — COLLAPSES** |

On closed tracks the value and the threshold both double and the share is unchanged by coincidence of
arithmetic. **The entire overstatement came from the open tracks**, where the published gaps were
inflated while the threshold was not.

---

## 3 · THE RAW DATA IS GONE — SO IT WAS RE-RACED, AND THE RE-RACE IS PROVEN FAITHFUL

★ **The raw per-race output does not survive.** No `bf-sweep-*.json` exists anywhere under `C:/tmp`.
The stored numbers alone cannot be corrected, for the reason in §2.

★ **The report does NOT name its seeds.** Its method line reads *"ten tracks at their own default
racer × {40, 20, 60, 100} × 10 seeds"* — **ten seeds, but not which ten.** That is a real gap in the
record and it is reported rather than worked around. `--seeds=1..10` was the reconstruction.

★★ **IT IS CHECKED, NOT ASSUMED.** The recount records the gap **twice** — once through the published
expression and once through the correct one — so the published figures can be reproduced before they
are corrected. **Every single published figure reproduces to the digit:**

| published figure | published | recount, published column |
|---|---|---|
| ≥0.349 share, N=40 / 20 / 60 / 100 | 71.0 / 57.0 / 79.0 / 76.0 | ★ **71.0 / 57.0 / 79.0 / 76.0** |
| ≥0.5 share | 47.0 / 44.0 / 65.0 / 56.0 | ★ **47.0 / 44.0 / 65.0 / 56.0** |
| ≥1.0 share | 14.0 / 17.0 / 19.0 / 14.0 | ★ **14.0 / 17.0 / 19.0 / 14.0** |
| ≥1.5 share | 6.0 / 5.0 / 4.0 / 5.0 | ★ **6.0 / 5.0 / 4.0 / 5.0** |
| median race max | 0.483 / 0.426 / 0.571 / 0.527 | ★ **identical** |
| p90 | 1.342 / 1.221 / 1.330 / 1.292 | ★ **identical** |
| MAX | 2.387 / **3.188** / 1.948 / 2.944 | ★ **identical** |
| spells ≥0.349 at N=40, never reeled in | 139 spells, 28.1% | ★ **139 spells, 28.1%** |
| per-stage ≥0.349, quiet / medium / wild | 70.0 / 69.0 / 71.0 | ★ **70.0 / 69.0 / 71.0** |
| per-racer over-representation | comebacker 8.4× · sovereign-lead 22.8× · attacker-b2 0% | ★ **8.4× · 22.8× · 0%** |

★★ **The fixture and the seeds are therefore confirmed**, and the corrected column comes from the
same races, the same frames and the same spells. **400 races on `wild`, 100 each on `quiet` and
`medium`, 0 errored.**

---

## 4 · THE CORRECTED TABLE

★ **The threshold moves with the column.** His photographed lead is the anchor: published **0.349**
canvas widths, correctly **0.698** — his race is city-circuit, `finishT` 2, so exactly ×2. Verified on
that race itself. **All "≥ his lead" figures below compare the corrected column against 0.698.**

### 4.1 · How often a breakaway happens — `wild`, N=100 races per row

| field | ★ published ≥0.349 | ★★ **corrected ≥0.698** | does the statement hold? |
|---|---|---|---|
| ★ **40 — his** | **71.0%** | ★★ **44.0%** | ❌ **NO — overstated by 27 points** |
| 20 | 57.0% | ★ **26.0%** | ❌ NO — overstated by 31 |
| 60 | 79.0% | ★ **47.0%** | ❌ NO — overstated by 32 |
| 100 | 76.0% | ★ **44.0%** | ❌ NO — overstated by 32 |

### 4.2 · The race-max gap — both unit systems, N=100 per row, `wild`

| field | pub med / p90 / MAX | ★ **corrected canvas widths** med / p90 / MAX | ★ **world px** med / p90 / MAX |
|---|---|---|---|
| **40** | 0.483 / 1.342 / 2.387 | ★ **0.593 / 1.199 / 1.472** | **102.2 / 188.5 / 242.9** |
| 20 | 0.426 / 1.221 / **3.188** | ★ **0.503 / 1.074 / 1.814** | 84.3 / 163.2 / 254.0 |
| 60 | 0.571 / 1.330 / 1.948 | ★ **0.681 / 1.217 / 1.688** | 116.7 / 206.3 / 303.5 |
| 100 | 0.527 / 1.292 / 2.944 | ★ **0.650 / 1.227 / 1.755** | 110.3 / 210.7 / 334.3 |

★ **The typical gap is BIGGER than published and the extremes are much SMALLER** — the two directions
of §2, visible in one table. ★★ **"THE WORST IN 400 RACES IS 3.188 CANVAS WIDTHS — NINE TIMES HIS" IS
WRONG TWICE OVER: the worst is 1.814, and against his corrected 0.698 that is 2.6× his, not nine.**

### 4.3 · Never reeled in — `wild`

| field | pub spells ≥0.349 / never | ★★ **corrected spells ≥0.698 / never** | holds? |
|---|---|---|---|
| **40** | 139 / **28.1%** | ★ **51 / 43.1%** | ❌ **NO — understated by 15 points** |
| 20 | 122 / 26.2% | 30 / **53.3%** | ❌ NO |
| 60 | 160 / 30.0% | 55 / **36.4%** | ❌ NO |
| 100 | 143 / 30.8% | 56 / **42.9%** | ❌ NO |

★ **The direction here is the opposite of §4.1** and it matters: **breakaways at his size are rarer
than he was told, but a larger share of the ones that do happen are never closed** — 43 in 100 rather
than 28.

### 4.4 · ★★ THE PER-STAGE SPLIT — THE CONCLUSION REVERSES

N=100 races per stage, N=40 field. **All corrected shares are at the same thresholds as published,
recomputed on the corrected column.**

| stage | boost / brake | pub ≥0.349 | ★★ **corr ≥0.698** | pub ≥1.0 | ★ **corr ≥1.0** | pub ≥1.5 | ★ **corr ≥1.5** | pub med / p90 | ★ **corr med / p90** |
|---|---|---|---|---|---|---|---|---|---|
| **quiet** | 0.06 / 0.10 | 70.0% | ★★ **32.0%** | 6.0% | **19.0%** | 2.0% | **3.0%** | 0.554 / 0.825 | **0.549 / 1.240** |
| **medium** | 0.12 / 0.10 | 69.0% | ★★ **37.0%** | 10.0% | **14.0%** | 3.0% | **2.0%** | 0.489 / 1.076 | **0.551 / 1.193** |
| ★ **wild — his** | 0.12 / 0.15 | 71.0% | ★★ **44.0%** | 14.0% | **19.0%** | 6.0% | ★ **0.0%** | 0.483 / 1.342 | **0.593 / 1.199** |

★★ **THE REPORT'S CENTRAL CLAIM DOES NOT HOLD.** It concluded *"it is not the action stage that puts
it there"* from 70 / 69 / 71. Corrected, the same races give **32 / 37 / 44 — a monotone rise of 12
points across the three stages, and his own setting is the highest.** ★ **The stage does cause
breakaways at his threshold**, and the flatness was an artefact of pooling tracks whose error ran in
opposite directions.

★ **The stage's own sub-claim also fails in the other direction**: the report said races reaching
1.5 widths go **2% → 3% → 6%** with the stage. Corrected they go **3% → 2% → 0%** — ★ **`wild`
produces NO race reaching 1.5 corrected canvas widths at all**, because the corrected maximum at
N=40 `wild` is 1.472.

### 4.5 · The roles — AFFECTED THROUGH THE SELECTION, and the report must say so

★★ **The role figures depend on the broken column, and the dependence is the SELECTION, not the
arithmetic.** `C:/tmp/breakaway.mjs:222` — `over: sp.filter((x) => x.peakW >= 0.349)` — chooses which
spells enter the role table **using the broken value**. The counting that follows is clean; the set it
counts over is not. **Correcting the threshold drops the qualifying races from 71 to 44**, and the
figures move with it:

| role | population (of 4 000 racer-slots) | ★ pub holds / per-racer | ★★ **corr holds / per-racer** | holds? |
|---|---|---|---|---|
| `sovereign-lead` | 37 | 15 (21%) / **22.8×** | ★ **12 (27%) / 29.5×** | ❌ **NO — understated** |
| `comebacker` | 168 | 25 (35%) / **8.4×** | ★ **15 (34%) / 8.1×** | ★ **substantially holds** |
| `attacker-b2` | 297 | 0 (0%) / **0.0×** | ★ **0 (0%) / 0.0×** | ✅ **HOLDS EXACTLY** |
| `faller` | 49 | 0 (0%) / 0.0× | 0 (0%) / 0.0× | ✅ holds |
| uncast | 3 449 | 31 (44%) / 0.5× | 17 (39%) / 0.4× | roughly holds |

★ **`attacker-b2` holding the largest gap in 0 of 71 — and now 0 of 44 — is the one role claim the
error could not touch**: zero is zero at any threshold.

---

## 5 · WHAT THIS DOES AND DOES NOT SAY

**It says:** the corrected shares come from the same instrument, the same fixture and the same seeds
as the published ones, with the published column reproduced digit for digit as the control. Every
figure is N=100 races per cell, 400 races on `wild` in total.

**It does not say:**
- anything about seeds other than 1–10, which the report does not name and this recount assumes;
- that the published *"% of the race"* column is wrong — **it is not**, line 79 is correct for that
  quantity and the report's 1.538% for his race stands;
- that the breakaway is or is not a problem. **Fewer, but a larger share of them never close** — that
  is a trade, and judging it is the owner's.

---

## 6 · NOTICED, AND DELIBERATELY LEFT ALONE

- ★ **`C:/tmp/breakaway.mjs` is NOT fixed.** It is the evidence of what produced the published
  numbers, and this block was told to change no source. The recount is a separate file.
- ★ **The report does not name its seeds.** That is recorded in §3 as a finding about the record, not
  repaired — I have not edited the method line to add a reconstruction I inferred.
- ★ **The `MAX` column at N=20 was `3.188` and is now `1.814`, from a DIFFERENT track.** The published
  extreme came from an open track (inflated); the corrected one does not. I did not chase which race
  it was — it is not this block's question.
- The half-peak-hold and lead→turn durations (report §3) are **times, not widths**, so the error does
  not reach them. They were reproduced but are not re-published here.

---

## 7 · THE LEVER, IN ONE SENTENCE, AND THEN I STOP

**If the stage is now shown to cause breakaways — 32 → 37 → 44 across quiet/medium/wild — then the
lever is the action stage itself, and the question the owner has already been asked once (whether
`wild` is worth its price) has a different answer than the one he was given.**

---

## 8 · THE STORE

★ **The owner's store was not opened in this block at all** — no race record was read, and nothing
under `server/data/` was touched. Every number above comes from races run by the harness.
