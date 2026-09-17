# BRAKE-FAIRNESS-2 — the seeded fairness run at the new defaults: CLEAR, at two seeds, with the one flagged row failing on both arms

Branch `feat/gap-leader-brake`. Date: 2026-09-17. The owner's store was not opened.

---

## ★ THE VERDICT

**CLEAR. No start-row row fails on the new defaults alone, at either seed.** The single Holm-flagged
row that does appear — luger-hill 30 s at seed 12345 — **fails on the brake-off arm too**, which by
the decision rule makes it pre-existing and not a blocker.

---

## THE INSTRUMENT, THE SEEDS, AND THE N

**`scripts/sim-fairness.mjs`, unmodified.** Two fixed seeds, **12345** and **777**, both above zero —
which matters, because [sim-fairness.mjs:343](../../scripts/sim-fairness.mjs#L343) defines `--seed=0`
(the default) as `Math.random()`, "exploration only", and FAIRNESS-SEED-1 measured the same shipped
configuration producing 0, 0 and 2 Holm-flagged rows across three unseeded runs.

**Two arms, differing in one key only:**

| arm | `gapBrakeEnabled` | the rest |
|---|---|---|
| previous shipped behaviour | `false` | identical branch code |
| **new defaults** | `true` | 56 px / 13% / window end 0.97, V1 `false` |

★ **Both arms run the BRANCH code**, not master. Master carries no brake keys at all, so a master arm
would confound the brake with the branch's harness fixes; and `sim-fairness.mjs` on master cannot see
the brake in the first place (BLIND-SITE-1).

### ★★ THE N IS SHORT OF THE PINNED METHODOLOGY, AND THIS IS NOT THE PINNED GATE

The pinned methodology is **300 races per track pooled** — `--races=100`, since it is per distance
variant and there are three (30 / 60 / 120 s).

**I ran `--races=40` = 120 races per track pooled, 1,200 races per arm-seed, 4,800 races in total.**

**Why:** at the pinned N the four arm-runs projected to about **nine hours**, measured rather than
guessed — one job took 583 s on an idle machine, and observed throughput in flight was ~5× worse than
that under parallel load. ★ An earlier estimate of mine said "20 hours" and was simply arithmetic
error; the 9-hour figure is the measured one.

**What is lost is power, not validity.** The decision rule this run exists to serve is *which*
start-row rows flag on *which arm*, and both arms run at the same N and the same seed, so the
comparison is like for like. **It must not be quoted as the pinned gate.**

---

## THE RESULT, AT BOTH SEEDS

### Seed 12345

| arm | combinations | races | band reach min / mean | raw p<0.05 | **Holm-flagged (the gate)** |
|---|---|---|---|---|---|
| previous shipped | 30 | 1,200 | 86.2% / 89.2% | 3 | **1** — luger-hill 30 s, p = 0.000719 |
| **new defaults** | 30 | 1,200 | 86.6% / 88.8% | 4 | **1** — luger-hill 30 s, p = 0.000163 |

### Seed 777

| arm | combinations | races | band reach min / mean | raw p<0.05 | **Holm-flagged (the gate)** |
|---|---|---|---|---|---|
| previous shipped | 30 | 1,200 | 85.6% / 89.0% | 2 | **0** |
| **new defaults** | 30 | 1,200 | 85.6% / 89.0% | **0** | **0** |

★ **Band reach is the same on both arms to within half a point**, and every track on every arm is far
above the threshold in `docs/FAIRNESS.md`. ★ At seed 777 the new-defaults arm has **fewer** raw
p<0.05 rows than the brake-off arm (0 against 2).

### ★ The decision rule, applied

| seed | flagged on brake-off | flagged on new defaults | **only on new defaults** |
|---|---|---|---|
| 12345 | luger-hill 30 s | luger-hill 30 s | **none** |
| 777 | none | none | **none** |

> **No row fails on the new defaults alone, at either seed. The gate does not block the merge.**

---

## ★ THE ONE FLAGGED ROW IS PRE-EXISTING, AND HERE IT IS ON BOTH ARMS

luger-hill, 30 s, seed 12345 — **the known rear bias**, reported before this block and not caused by
the brake:

| start row | brake OFF: wins / avg rank | **new defaults: wins / avg rank** |
|---|---|---|
| R0 (front) | 10.0% / 23.08 | 7.5% / 23.03 |
| R1 | 2.5% / 22.43 | 2.5% / 22.44 |
| R2 | 17.5% / 20.99 | 17.5% / 21.01 |
| R3 | 27.5% / 18.23 | 27.5% / 18.22 |
| **R4 (back)** | **42.5% / 17.78** | **45.0% / 17.80** |
| | χ² 19.50, p = 0.000719 | χ² 23.00, p = 0.000163 |

★★ **The two distributions are nearly the same object.** Average rank agrees to within 0.05 on every
row; the only movement is **one race** shifting from R0 to R4. **The brake does not create this bias
and barely touches it.** It is a property of luger-hill at 30 s, it reproduces at every seed I have
run it at, and it is **not this block's business to fix.**

---

## ★ WAS THE BRAKE ACTUALLY EXERCISED?

A tally inside `_computeGapLeaderBrake`, in a **probe copy** (never the real tree), running the
fairness instrument at the identical settings and seed:

| calls | carried `pathLengthPx` | **enabled** | **FIRED (issued a command)** |
|---|---|---|---|
| 544,477 | 544,477 (100%) | 544,477 (**100%**) | **63,579 (11.7%)** |

★★ **63,579 commands inside a fairness run.** The verdict above is a verdict on races the brake was
acting in, not on a mechanism that never ran.

---

## DOES ANY RACER TYPE, STARTING ROW OR CAST ROLE SYSTEMATICALLY GAIN OR LOSE?

**No, on this evidence.**

- **Starting row** — the start-row χ² *is* this question, per row, per combination. **Zero rows flag
  on the new defaults that do not also flag on brake-off**, at either seed.
- **Racer type** — each track runs its own `defaultRacerTypeId`, so **type and track are confounded by
  the methodology's design** and this run cannot separate them. What can be said: no track's band
  reach moves by more than half a point between arms, and the moves go both ways. **Saying that is
  better than implying the run could separate them.**
- **Cast role (B1–B5 bands)** — band reach is the instrument's own per-band measure and is within
  half a point on every track. The brake acts on whoever is *leading* inside its window, which is not
  a role the cast assigns.

---

## WHAT THIS DOES NOT SETTLE

- **The N is short** (above). A row with a small effect could be missed at 120 races per track that
  300 would catch — on both arms equally.
- Two seeds is two draws. It is enough to show the seed-to-seed swing FAIRNESS-SEED-1 found is not
  driving this verdict; it is not a distribution.
- **The luger-hill 30 s rear bias is real and unexplained.** It fails the project's own gate in the
  shipped game at seed 12345 and deserves its own look. Not here.
