# BRAKE-DEEP-1 — 56 px / 13% at ten times the sample: it does not reduce the escape, and it cuts the worst leads nearly in half

Branch `feat/gap-leader-brake`. Date: 2026-09-16. **No shipped default changed — `git status` is clean
and tonight touched no source file at all. Nothing minted, nothing merged, nothing tagged.** V1 OFF
throughout. The owner's store was not opened.

---

## ★ ONE LINE

**At N = 3,000 races per arm the brake's effect on the escape collapses to nothing — 43 fixed, 39
caused, net +4, p = 0.74 — while the worst lead it is asked to control falls 492.7 → 258.5 px, a 48%
cut, for no measurable cost.**

---

## ★★ THE CONTROL PASSED FIRST

The chain requires the N=30 grid to be re-measured inside the N=300 run; if the numbers move, the
measuring track moved and the whole grid is void.

> **300 of 300 races byte-identical to the grid, to the millisecond. The measuring track did not
> move.** The grid stands.

---

## THE NUMBERS, N = 3,000 PAIRED RACES PER ARM

10 tracks × seeds 1–300, 40 racers, owner's roster, `wild`, V1 OFF. The same seeds in both arms.

| | SHIPPED med / p90 / **MAX** | **56 px / 13%** med / p90 / **MAX** |
|---|---|---|
| largest lead **to the window end** (px) | 90.1 / 170.8 / **492.7** | 87.3 / **130.4** / **258.5** |
| largest lead **to the finish** (px) | 120.0 / 193.3 / **492.7** | 112.1 / **161.0** / **306.2** |
| lead changes | 40 / 43 / 48 | 40 / 43 / 49 |
| distinct leaders | 37 / 39 / 40 | 37 / 39 / 40 |
| field spread at the winner's crossing (px) | 662.6 / 841.6 / 1114.7 | 652.6 / 827.8 / 1078.6 |

★★ **The worst race is transformed**: the largest lead inside the window falls **492.7 → 258.5 px
(−48%)**, and the p90 **170.8 → 130.4 px (−24%)**.
★ **And at this N the lead to the finish falls too** — 492.7 → 306.2 px (−38%). The N=300 grid did not
show that, because it did not contain the extreme races; **this is a case where ten times the sample
changed the answer, and the N=300 figure should not be quoted for it.**
★ **The median race is barely touched** (90.1 → 87.3 px). The brake works in the tail, which is what a
fallback should do.

### The escape — the number the brake exists to reduce

| | SHIPPED | 56 px / 13% |
|---|---|---|
| races won after an unopposed run-in past 90 px | **317 / 3000** | **313 / 3000** |
| fixed | — | **43** |
| **caused** | — | **39** |
| net | — | **+4** |
| **McNemar p** | — | **0.7407** |

★★★ **At N = 3,000 the effect is indistinguishable from nothing, and more clearly so than at
N = 300**, where the same cell showed net +6 at p = 0.146. **The larger sample removed the apparent
effect rather than confirming it** — the brake fixes 43 escapes and causes 39, and which races fall
on which side is close to a coin toss.

### The cost, measured rather than assumed

| | SHIPPED | 56 px / 13% |
|---|---|---|
| contested finishes | 1404 / 3000 | 1364 / 3000 |
| largest single-step multiplier move | 0.011762 | **0.011762 (1.000×)** |
| largest one-frame speed change | 258.82 px/s | **258.82 px/s (1.000×)** |
| races the brake commands in | 0 | 2438 / 3000 (81%) |

★★ **Both abruptness measures are identical to six decimals at N = 3,000.** The brake alone is
invisible by his standing rule, confirming BRAKE-WINDOW-2 at ten times the sample.
★ Contested finishes fall by 40 of 3,000 — **1.3 percentage points**, the only monotony number that
moves at all, and it moves against the brake.

---

## FAIRNESS — AND THE REASON IT IS NOT REPORTED AS A GATE HERE

I ran the pinned fairness gate on this pair and found one Holm-flagged start-row row. **That finding
is withdrawn**, because the instrument was running unseeded: `scripts/sim-fairness.mjs` defaults to
`--seed=0`, which its own header defines as `Math.random()`, "exploration only". Three runs of the
**shipped** configuration produced 0, 0 and **2** Holm-flagged rows with nothing changed between them.

→ **[FAIRNESS-SEED-1](FAIRNESS-SEED-1.md)** has the measurement, the address, and the one-flag fix.

**Consequence for this report:** I have no trustworthy fairness verdict for 56 px / 13%, and neither
does the record have one for shipped. A fixed-seed comparison of both arms was started and is
reported in the morning sheet with its N; **it is short of the pinned methodology and must not be
quoted as the gate.**

★ What does survive from the unseeded runs is **band reach**, which was stable to within a point
across repeats: **mean 89.1%** for 56 px / 13% against **89.3%** for shipped, both far above the
threshold in `docs/FAIRNESS.md`.

---

## HIS OWN RACE — ice-track, Quick Test seed 3

| | SHIPPED | **56 px / 13%** |
|---|---|---|
| largest lead, to the window end | 196.6 px | **115.8 px** |
| largest lead, to the finish | 213.1 px | **115.8 px** |
| winner | **Flare** | **Bolt** |
| Flare finishes | 1st | **2nd — caught** |
| margin to 2nd | 0.256 s | 0.528 s |

**The brake engaged once**, at progress 0.8161, on Flare, at a gap of **90.1 px**; it was the obeyed
value for **9.94 s (621 frames)** and reached **0.1259** of its 0.13 ceiling.

★ **On this race it does exactly what he asked for.** ★ **And the grid says it is not reliable** —
both halves are true and the second is the one that decides.

---

## `verify` AND THE FINGERPRINTS

**Tonight changed no source file.** `git diff --name-only edee568f..HEAD` excluding `reports/` and
`docs/` is **empty** — 5 files changed, all of them prose. The engine is byte-identical to the state
that verified **26 PASS / 0 FAIL** last night, and `verify` run tonight skipped 24 guards for exactly
that reason (10 PASS / 0 FAIL of the 10 it had cause to run).

**All four fingerprints, measured with the key at its shipped OFF:**

| role | record | measured |
|---|---|---|
| world | `b35cf477c09a1116` | **`b35cf477c09a1116`** |
| world-off | `19ccb497041a0dae` | **`19ccb497041a0dae`** |
| camera | `3df640a42e934312` | **`3df640a42e934312`** |
| render | `6a84085e79535dd6` | **`6a84085e79535dd6`** |

★ **Four of four on the record. The default really is off, and there is nothing to mint.**

---

## WHAT THIS DOES NOT SETTLE

- N = 3,000 races per arm. The escape effect is not distinguishable from zero *at this N*; a very
  large effect is excluded, a tiny one is not.
- **No trustworthy fairness verdict exists for this pair**, for the reason above.
- The lead-to-finish reduction (−38%) appears at N=3,000 and not at N=300. I trust the larger sample,
  but it rests on the extreme tail of the distribution, which is where sampling hurts most.
- `gapBrakeWindowEnd` was held at his value throughout. BRAKE-GRID-1 argues the evidence points there;
  this report does not test it.
