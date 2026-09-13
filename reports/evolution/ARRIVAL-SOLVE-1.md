# ARRIVAL-SOLVE-1 — his own drive ceiling: three clauses met, one not, and the one not is not this lever's

**Branch** `night/2026-09-12b` · **not merged** · **nothing minted** · **no golden race re-recorded**.

★★ **THE HONEST HEADLINE: THE BRIEF IS NOT FULLY MET.** The lever shipped here satisfies clauses 1, 3
and 4 and **strictly dominates the shape it replaces on every clause**, but **clause 2 (no racer
breaks away) is still not satisfied for the comebacker himself** — and §5 shows the cause is a
different half of the shape, one shipped days ago, not this lever. The numbers are below; the broad
lever's are beside them so he can weigh them himself.

---

## 1 · ★ THE LEVER TABLE — WHAT EACH REACHES, WHAT IT COSTS, ★ AND WHAT IT TOUCHES

★ **THREE OF FOUR NARROW LEVERS WERE DISCARDED BY ARITHMETIC, NOT BY MEASUREMENT.** The servo commands
`clamp(1.0 + gain·error/nActive + noise, minMult, maxMult)` and saturates whenever the error exceeds
`0.05·nActive` — **2.0 ranks at N=40** (re-verified).

| lever | reaches 1.05 / 1.02? | ★ touches | verdict |
|---|---|---|---|
| ★ **his own drive CEILING** | ★ **yes, exactly, at every N** | ★ **one racer** | **BUILT AND SHIPPED** |
| cap his ERROR at k ranks | **no** — `k=1` gives 1.100 at N=20 but 1.020 at N=100 | one racer | discarded: field-size dependent unless `k` scales with `nActive`, which IS the ceiling |
| ease his TARGET asymptotically | **no** — bounds the error, so identical arithmetic to the row above | one racer | discarded by the same arithmetic |
| `maxRankRate` / curve shape | **no** — governs the AUTHORED leg BEFORE the held release; after `heldFree` the target is the drawn rank (`racePlanner.js`), not the curve | one racer | discarded by address |
| — *broad, REPORT-ONLY* — | | | |
| `servoDrive` response curve | yes, 1.001–1.019 | ★ **every steered racer** | **NOT SHIPPED** — costs 7.4 pp band-reach at N=20, halves the leader's brake |

**A ceiling IS the commanded value wherever the raw drive saturates**, so it reaches its target exactly
and — having no `nActive` in it — identically at every field size: **1.100 → 1.0875 → 1.060 → 1.0325 →
1.020** across the approach at N=20 and at N=100 alike. That is the defect that made a rank-counted
taper mean four different things at four field sizes.

---

## 2 · WHAT WAS BUILT, AND WHAT IT TOUCHES

`arrivalCeiling(rankError, maxMult)` eases HIS OWN `maxMult` from the shipped clamp down to
`ARRIVAL_CEILING_AT_PLACE` (**1.02**) over `ARRIVAL_CEILING_RANKS` (**4**), smoothstep, no corner at
either end.

★ **EVERY LINE IS INSIDE `heldFree`.** No other racer's steering, no other role, no shared clamp.
`minMult` is untouched — this bounds the DRIVE, never the brake — and the function **can only ever
tighten a ceiling, never raise one**, which a test pins.

**Deleted:** the taper — `approachDrive`, `ARRIVAL_TAPER_START_RANKS`, its application in the servo,
its two telemetry counters, and its tests. The ceiling at **1.05** was measured and **lost** (it is no
better than the taper it replaced). Zero references to either remain.

---

## 3 · ★ THE FOUR CLAUSES, SCORED

**Method.** `exp-arrival-shape.mjs`, ten tracks at their own default racer, N ∈ {20,40,60,100}, **30
races per cell — 1 200 races, 717 comebackers.** Widths and the leader come from the camera-equipped
instrument, same seeds and tracks, frozen across arms. Band-reach and Holm are the sim's OWN numbers
via `--hero-map`. Order is `finishRank`.

### ★ CLAUSE 1 — band-reach preserved: **MET**

| N | shipped world | ★ ceiling arm | delta | gate margin |
|---|---|---|---|---|
| 20 | 91.3% | **91.7%** | +0.4 pp | 21.7 pp |
| 40 | 89.7% | **89.8%** | +0.1 pp | 19.8 pp |
| 60 | 86.9% | **87.0%** | +0.1 pp | 17.0 pp |
| 100 | 88.9% | **88.9%** | 0.0 pp | 18.9 pp |

★★ **IT COSTS NOTHING** — where the broad lever cost **7.4 pp at N=20**. No field size approaches the
70% gate. **This is the clause that chose narrow over broad.**

### ★ CLAUSE 3 — fair, the drawn place is reached: **MET**

| N | block rate (n) | Holm-unfair, ceiling | Holm-unfair, shipped world |
|---|---|---|---|
| 20 | 93.7% (189) | **0** | 0 |
| 40 | 89.9% (207) | **1** | 2 |
| 60 | 89.8% (166) | **3** | 3 |
| 100 | 76.1% (155) | **5** | 7 |

**Pooled block 87.9% (n=717), above the 84% baseline.** Holm is **equal or better than today's world
at every field size.** Drift after arrival: median **0** places everywhere, worst 8.

### ★ CLAUSE 4 — it looks natural: **MET by the stated yardstick**

| N | no shape | taper (deleted) | ★ ceiling | ★ ON SCREEN |
|---|---|---|---|---|
| 20 | 1.100 | 1.051 | ★ **1.033** | ★ **28 px/s** |
| 40 | 1.092 | 1.076 | ★ **1.051** | ★ **44 px/s** |
| 60 | — | 1.053 | ★ **1.037** | ★ **32 px/s** |
| 100 | — | 1.029 | 1.048 | 41 px/s |

Against **85 px/s** untapered. TAPER-INVISIBLE-1's yardstick: *1.05 halves the apparent rush.* **Every
field size is at or below it**, and 1.077 — which he saw through three times — is gone.

★ **ONE LIMIT, STATED.** At N=100 **both** ceiling arms give the identical 1.048, which proves the
ceiling **never binds there**: the raw drive is already gentler than the schedule (1.020 at e=1 against
a 1.0325 ceiling). The deleted taper was better at N=100 (1.029) precisely because it worked where the
drive was NOT saturated. The ceiling solves the field sizes where the clamp binds and leaves a hundred
racers to the raw servo.

### ★★ CLAUSE 2 — no racer breaks away: **NOT MET for the comebacker**

His peak gap while leading, canvas widths:

| N | no shape | taper | ★ ceiling | vs no shape |
|---|---|---|---|---|
| 20 | 0.107 | 0.368 | **0.357** | ★ **3.3×** |
| 40 | 0.126 | 0.307 | **0.245** | ★ **1.9×** |
| 60 | 0.172 | 0.139 | 0.146 | 0.8× |
| 100 | 0.163 | 0.204 | 0.211 | 1.3× |

★ **THE REST OF THE FIELD IS CLEAN.** "Alone by more than a canvas width" at the finish, any racer:
**13 / 7 / 8 / 5%** against the unshaped **12 / 7 / 15 / 5%**. **No other racer breaks away.**

---

## 4 · SABOTAGE

Both bite, on `arrivalShape.test.js` (13 tests):

- **(a) remove the ceiling** (`arrivalCeiling` returns `maxMult`): **5 red**, including the two
  servo-level tests and the observation that records where it bound — the rush returns.
- **(b) break the clause it protects** (let the floor escape the shipped clamp): **exactly the one
  test** that pins "can only tighten a ceiling, never raise one" goes red.

---

## 5 · ★★ WHY CLAUSE 2 STILL FAILS, AND IT IS NOT THIS LEVER

The ceiling governs the **approach** — it is inside `!arrived`. The break-away happens **after** he
arrives, when the shape leaves him **unsteered inside his block** (band steering, `strictness = 0`)
instead of braking him toward his exact drawn rank.

ARRIVAL-TAPER-SHIP-1 established this by splitting the races: **where the comebacker never leads, the
arms are identical to every decimal.** That half was shipped days ago, reproduces variant B's known
2.7× effect, and **is also the half that produces the feel he asked for** — being left alone once he
has arrived.

★ **SO THE REMAINING CHOICE IS HIS, AND IT IS NOT A LEVER QUESTION:** keep "free inside his block" and
accept a comebacker who opens 2–3× the unshaped gap at small fields, or put the brake back and lose
the feel. **Nothing is proposed here.**

---

## 6 · THE NEW VALUES — REPORTED, NOT MINTED

**World fingerprint `9f4a9b9392a8d46c`.** Per track: city-circuit `a064eaa3147d` · dirt-oval
`446dc49324bb` · garden-path `7b31edb0be33` · ice-track `35bd55fe10de` · luger-hill `4a3c6ae9c0dd` ·
mountainstreet `81e1c2ddbb0c` · river-run `f285283a265a` · searound `2deebf5d0715` · seatrack
`a2b86618233f` · space-sprint `cd8169859641`.

**Nothing is minted and no golden race is re-recorded.**
