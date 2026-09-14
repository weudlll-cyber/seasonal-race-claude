# SERVO-RANKS-1 — the servo had no gradation near the target, and that is why he arrived at the ceiling

**Branch** `night/2026-09-12b` · **not merged** · **nothing minted**.

---

## 1 · ★ THE CAUSE, RE-VERIFIED AT SOURCE

`racePlanner.js:1173` commands `clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult)`,
with `gain 2.0`, `maxMult 1.1`, `minMult 0.85`. Because the error is divided by the FIELD SIZE, the
drive reaches the ceiling after `(maxMult - 1) * nActive / gain = 0.05 * nActive` ranks of error:

| field | ranks of error that already saturate | ★ baseline arrival pace |
|---|---|---|
| 20 | **1.0** | **1.100** — the ceiling, exactly |
| 40 | 2.0 | 1.092 |
| 60 | 3.0 | 1.070 |
| 100 | 5.0 | 1.050 |

★★ **THE TWO COLUMNS TRACK EACH OTHER WITH NO EXCEPTION** (2 000 races, ARRIVAL-SHAPE-E-1). At twenty
racers there is NO gradation near the target at all — a racer one rank out is driven exactly as hard
as one ten ranks out — so his multiplier sits pinned at 1.100 for the whole approach and must fall
the entire 0.10 the instant he arrives. It cannot: `_setTarget` restarts a 1 s ease every frame the
target moves, so the multiplier chases with a ~1 s time constant.

★ **AND `nActive` IS THE UNFINISHED COUNT, NOT THE FIELD SIZE.** `active` is
`racers.filter(r => !r.finished)`, so the shipped divisor SHRINKS as racers cross the line and its
response steepens through the endgame — the same defect at a hundred racers, arriving late instead of
always. (This corrects a claim made earlier in this work that the change was a no-op at N=100 by
construction. It is not; it is a no-op there **empirically**, see §4.)

---

## 2 · WHAT WAS BUILT

    drive = (maxMult - 1) * error / BAND_EDGES[0]

The error is counted in RANKS, and full drive is reached at one BLOCK — `BAND_EDGES[0]`, the same
five ranks the fairness bands already call a block, read from that one home rather than a new
literal. One rank from your place then means the same thing in a field of twenty and a field of a
hundred.

- **It still converges.** At five or more ranks of error the drive is the full `maxMult` at every
  field size, exactly as today. The easing is NEAR the target, not everywhere.
- **Neither clamp moves. No role is named** — comebackers, attackers, fallers, sovereign-leads and
  the pack all run this one servo, which is the owner's "one steering, not two".
- **The CHAOS-phase steer is deliberately untouched** and says so at source: a different steering in
  a different phase.
- **Switchable** by the same mechanism as the arrival variants: `racearena:servoResponse` /
  `RA_SERVO_RESPONSE`, values `field` (default, today) and `ranks`. Unset, the world fingerprint is
  `bdf4a3c8ce6e0316` — unchanged.

---

## 3 · METHOD

Comebacker metrics: `sim-fairness.mjs --arrival-shape` via `scripts/exp-arrival-shape.mjs`, **10
tracks (each at its OWN `defaultRacerTypeId`) × {20,40,60,100} racers × 10 races**, `--seed=1`,
`--track-defaults` — 228 held comebackers per arm. Order is **`finishRank`** (crossing order).

Field-wide gate: `sim-fairness.mjs --hero-map` via `scripts/exp-band-scale.mjs`, same ten tracks and
field sizes at **20 races each — 44 000 racers per arm**. `bandReach` and the start-row Holm flag are
the sim's OWN numbers, READ from `hero-map.json`, not recomputed here.

**Not measured: canvas widths.** The sim has no camera. The gap is in race distance (% of the race),
which is what compares across arms. Stated rather than substituted.

---

## 4 · ★ WHAT IT BUYS — 228 comebackers per arm

| arm | arrival pace | at 1.0 | block | gap med | gap p90 | ★ gap max |
|---|---|---|---|---|---|---|
| **today** | 1.084 | 9% | 83% | ★ **0.292%** | 0.924% | 2.549% |
| taper E4 only | 1.042 | 20% | ★ **87%** | 0.352% | 1.227% | 2.033% |
| servo alone | 1.040 | 13% | 81% | 0.320% | 0.871% | 1.892% |
| ★ **servo + taper E4** | ★ **1.019** | ★ **30%** | 84% | 0.352% | ★ **0.855%** | ★ **1.704%** |

★★ **AT TWENTY RACERS, WHERE THE DEFECT WAS TOTAL, IT IS SOLVED**: arrival pace **1.100 → 1.001**,
and **11% → 52%** of comebackers arrive at pace.

★ **THE WORST-CASE GAP IS A THIRD SMALLER** — 2.549% → 1.704% of the race.

★ **THE SERVO ALONE DOES NOT SUFFICE**, which the chain asked to be told plainly: alone it reaches
1.040 and 13% at pace, against 1.019 and 30% combined. **The taper is therefore not dropped.**

★ **AT A HUNDRED RACERS THE SERVO IS EMPIRICALLY A NO-OP** — today and servo-alone agree to three
decimals on all six columns across 61 comebackers. The divisor does shrink (§1), but finishing
happens after the steering that matters, so the divergence never materialises.

---

## 5 · ★★ WHAT IT COSTS — AND THE GATE IS NOT BREACHED

Field-wide band-reach, shipped edges, 44 000 racers per arm (±SE 0.22–0.58 pp):

| N | today | new arm | ★ delta | gate margin |
|---|---|---|---|---|
| 20 | 91.3% | **83.9%** | ★ **−7.4 pp** | 13.9 pp |
| 40 | 89.7% | 85.5% | **−4.2 pp** | 15.5 pp |
| 60 | 86.9% | 84.6% | −2.3 pp | 14.6 pp |
| 100 | 88.9% | 89.2% | +0.3 pp | 19.2 pp |

★ **THE GATE HOLDS.** `docs/FAIRNESS.md` requires band-reach ≥ 70%, every track. The worst cell in
the new arm is **river-run at N=20, 76.3%**. No track at any field size goes under. **This piece
therefore does NOT stop** — but the cost is stated here rather than averaged away.

★ **IT IS THE SERVO, NOT THE TAPER, AND THAT IS BOUNDED RATHER THAN ARGUED.** The taper touches ONE
racer per race, so at twenty racers its maximum possible field-wide effect is 1/20, and the
comebacker's own measured block drop (93% → 81%) accounts for **−0.6 pp**. The remaining ~6.8 pp is
the servo.

★ **AND `docs/FAIRNESS.md`'s HEADLINE, NOT ITS GATE, IS BREACHED.** That document states the shipped
world delivers **85–90% per track**; the new arm reads 83.9% at N=20 and 85.5% at N=40. The GATE is
70% and holds; the HEADLINE does not. **Not edited — that is the owner's document and his call.**

**Start-row Holm**, and whether each unfair track was unfair BEFORE:

| N | today | new arm | newly unfair |
|---|---|---|---|
| 20 | 0 | 0 | — |
| 40 | 2 (luger-hill, searound) | 4 | ice-track, river-run |
| 60 | 3 | 3 | dirt-oval (garden-path recovers) |
| 100 | **7 of 10** | 7 of 10 | mountainstreet (city-circuit recovers) |

★ **TODAY'S WORLD ALREADY FAILS "ZERO HOLM-UNFAIR" AT N ≥ 40** — seven of ten tracks at a hundred
racers, with `luger-hill` and `searound` unfair in BOTH arms everywhere. The new arm is unchanged at
N=20, 60 and 100 and **worse at N=40 (2 → 4)**.

---

## 6 · SABOTAGE

Both bite, on `client/src/modules/servoResponse.test.js` (9 tests):

- **(a) restore the old response** — 3 red, including the two gradation properties; the ceiling
  arrival returns.
- **(b) ease the drive far from the target too** (a saturating curve everywhere) — 4 red, and the one
  that breaks is **CONVERGENCE**: full drive at a block of error is no longer reached at any field
  size.

---

## 7 · ★ THE TRADE, STATED FOR A DECISION

| | arrival | at pace | worst gap | field-wide band-reach cost |
|---|---|---|---|---|
| **taper E4 only** | 1.042 | 20% | 2.033% | **~0.6 pp** |
| **servo + taper E4** | **1.019** | **30%** | **1.704%** | **~7 pp at N=20, ~4 pp at N=40** |

The servo buys the last stretch and charges small-field fairness for it. The gate is not breached and
the cost lands where the margin is (13.9 pp at N=20, against 19.2 pp at N=100 which is untouched) —
**but it is his fairness rule, and the cheaper arm is on the table.**

**Open for the owner:**
1. Whether seven points of band-reach at twenty racers is worth 1.042 → 1.019 and a further 16% off
   the worst gap.
2. Whether `docs/FAIRNESS.md`'s 85–90% headline should be restated, given the new arm reads 83.9% at
   N=20 — **and given that today's world already misses its "zero Holm-unfair" clause at N ≥ 40.**
