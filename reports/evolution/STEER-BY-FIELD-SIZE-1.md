# STEER-BY-FIELD-SIZE-1 — the divisor is real, its consequence is not the one expected, and the BAND TABLE is the N=40 artefact

2026-09-11 · branch `night/2026-09-11` · piece 3 of the night chain · **REPORT ONLY. The divisor was
not changed, `gain` was not touched, nothing was tuned and nothing is minted.**

---

## 0 · ★ THE ANSWER, AND IT CORRECTS THE PREMISE IT WAS GIVEN

The brief's framing was *"the director steers weaker the bigger the field"*. The divisor is real and
is confirmed at source. ★ **But measured, the director is EQUALLY accurate at every field size in
proportional terms, and what degrades is the BAND TABLE it is judged against.**

| | |
|---|---|
| ★ median landing error | **a constant 5% of the field** at N=20, 40, 60 and 100 |
| ★ band-reach against the shipped table | **falls monotonically 95.8% → 70.5%** |
| ★ and at N=100 | **70.5% against a 70% gate line** — half a point of margin |

**Both are true, and the second is caused by `BAND_EDGES` being a fixed `[5, 15, 25, 40]` table
rather than by the controller.**

---

## 1 · THE DIVISOR, RE-VERIFIED AT SOURCE

`client/src/modules/racePlanner.js:891`:

```js
const rawTarget = clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult);
```

with `nActive = active.length` (`:680`) — the live field size — and the shipped `gain: 2.0`,
`maxMult: 1.1`, `minMult: 0.85`.

★ **A CORRECTION TO MY OWN EARLIER NOTE.** HOLD-GRID-1 cited this as `racePlanner.js:910`. That was
a line number taken while a temporary measurement arm was in the file. **On the clean tree it is
`:891`**, which is what the brief said. The mechanism described was right; the address was off by the
arm's own length.

★ **What it means arithmetically is the FUNCTION'S OWN, not a model of the race:** the error is in
RANKS and is divided by the field size, so saturating the 0.85 brake needs `error ≤ -0.075 × nActive`
— under one rank at N=10, about 7.5 ranks at N=100.

---

## 2 · ★ WHAT IT ACTUALLY DOES — A CONSTANT PROPORTIONAL ERROR

**Method:** `sim-fairness.mjs`, each track's own `defaultRacerTypeId` read from `server/seeds/tracks/`,
60 s, seed 1, 20 races per cell, race plan on, **all ten tracks at each of five field sizes** —
2 000 to 20 000 racer-rows per size.

**How far each racer finishes from the place he drew:**

| N | rows | median \|error\| | p90 \|error\| | ★ median as a share of the field |
|---|---|---|---|---|
| 10 | 2 000 | 1 | 2 | 10.0% |
| 20 | 4 000 | 1 | 4 | **5.0%** |
| 40 | 8 000 | 2 | 6 | **5.0%** |
| 60 | 12 000 | 3 | 8 | **5.0%** |
| 100 | 20 000 | 5 | 15 | **5.0%** |

★ **Flat at 5% of the field from 20 racers upward.** The error in RANKS grows with N exactly in
proportion — 1, 2, 3, 5 — which is what a controller normalised by field size should produce.

★ **SO THE DIVISOR IS NOT A DEFECT ON ITS OWN TERMS.** `error / nActive` makes the servo proportional
in *normalised* rank space, and the steady state it reaches is the same fraction of the field at every
size. **"The director steers weaker the bigger the field" is true per RANK and false per FIELD, and
the second is the one the racers experience.**

---

## 3 · ★ WHAT DOES DEGRADE — AND IT IS THE BAND TABLE

`racePlanner.js:56` — `export const BAND_EDGES = [5, 15, 25, 40];` — and `bandOfRank` returns a
fifth band for anything past 40. **The table is a 40-racer table.** Band-reach with it:

| N | B1 | B2 | B3 | B4 | B5 | ★ TIGHTEST |
|---|---|---|---|---|---|---|
| 10 | 95.8 | 95.8 | — | — | — | **95.8** |
| 20 | 92.3 | 91.5 | 90.8 | — | — | **90.8** |
| 40 | 87.0 | 88.0 | 86.7 | 94.7 | — | **86.7** |
| 60 | 82.5 | 83.3 | 81.2 | 85.3 | 94.3 | **81.2** |
| **100** | 72.5 | 72.8 | **70.5** | 79.3 | 97.3 | ★ **70.5** |

★ **A monotone fall of more than twenty-five points, and at 100 racers the tightest zone is 70.5%
against a gate line of 70%.** The gate would fail on a slightly unluckier run.

★ **THE CAUSE IS THE FIXED TABLE, NOT THE CONTROLLER.** The error stays at 5% of the field; the bands
do not scale with it. At N=40 a 2-rank error rarely crosses an edge of a 5/10/10/15-wide band. At
N=100 a 5-rank error crosses the edges of the SAME 5/10/10-wide bands far more often — while B5
(ranks 41–100, **60% of the field in one band**) reads a meaningless 97.3%.

**Asked fairly — bands scaled to the field — the picture is not monotone at all:**

| N | 10 | 20 | 40 | 60 | 100 |
|---|---|---|---|---|---|
| tightest, bands scaled | 41.5 | 61.0 | **86.7** | 76.1 | 71.9 |

★ **The two tables disagree, and that disagreement is the finding.** Which one is "band-reach at
N=100" is undefined today, because **the shipped band structure only describes a 40-racer field.**

---

## 4 · ★ THE MEASUREMENT READ AS GENERAL — AND IT IS IN A LIVING DOC, NOT A REPORT

The brief asked whether any existing headline was taken at one field size and read as a fact about
the game. A search of every report in `reports/evolution` and `reports/night` for starred
race-behaviour percentages with no field size within four lines returned **two**, both in
COMEBACK-SAME-RACER-1, and **both are covered by an N stated in that report's own method**. The
reports are disciplined about it.

★ **`docs/FAIRNESS.md` is not.** It is the canonical document, and:

- `:42` — *"**COMBO15 delivers 85–90% / track** (binding N=100 record)"*
- `:123` — *"The Layer-1 start-row gradient at **N=300**"*
- `:130` — *"**N=300 races/track**, native pooled Holm"*

★ **In that document "N" means the number of RACES, every time. The FIELD SIZE is never stated at
all** — and every figure in it comes from 40-racer races, because that is the sim's default.

★ **So the 70% gate, the 85–90% headline and the zero-Holm-unfair requirement are all 40-racer facts
presented as facts about the game** — and §3 shows the tightest zone at 100 racers is **70.5%**. The
document's own gate is within half a point of failing at a field size the owner races.

★ **Nothing in `docs/FAIRNESS.md` was edited.** It is canonical, the correction is a decision about
what the gate MEANS, and that is his.

---

## 5 · WHAT WAS NOT MEASURED, AND SAID SO

★ The brief asked for **how long the director takes to correct a given rank error, by field size**.
That was **not measured separately.** What §2 reports is the **steady state** — where racers actually
end up — which answers the same concern more directly and comes from 46 000 racer-rows rather than a
purpose-built probe. **The transient is still unmeasured**, and if the divisor is ever revisited it is
the measurement to take.

---

## 6 · CHECKS

```
node scripts/engine-reach.mjs --check reports/evolution/STEER-BY-FIELD-SIZE-1.md

ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): reports/evolution/STEER-BY-FIELD-SIZE-1.md
```

| | |
|---|---|
| world fingerprint | `8a1977187e9c99b4` — **UNMOVED** |
| golden races | **PASS** |
| `npm run verify`, plain | **PASS 23 · FAIL 2** — both reds are piece 4's camera/render values awaiting his word |

**No source file was changed by this piece. `git stash` was not used. No `--no-verify`.**

---

## 7 · WHAT IS OPEN, AND IT IS HIS

1. ★ **Should `BAND_EDGES` scale with the field?** It is a 40-racer table used at every size, and it
   is the reason band-reach falls while the controller's accuracy does not.
2. ★ **Does the 70% gate mean anything at 100 racers?** Measured 70.5% today — the gate is nearly
   failing, and `docs/FAIRNESS.md` never says which field size it describes.
3. **The divisor itself needs no defence on these numbers.** Whether the director should steer equally
   hard per RANK at every field size remains a design question, but the field-relative outcome it
   currently produces is constant, which is a reason to leave it alone.
