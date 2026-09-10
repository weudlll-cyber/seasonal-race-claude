<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-11, after HOLD-GRID-1 (night chain 2026-09-10, piece 1 of 2).

**Where the code is.** Master is `04f40f17` (CI green) and carries everything from the 2026-09-09
night — the comeback precedence, the hull split, the start-sequence skip. `night/2026-09-10` is the
current branch, **NOT merged**, and piece 2 is still running as this is written.

**Your services.** 4000 (API) and 4173 (production build) — see the last line of this sheet for the
URL and the build badge.

---

## ★ THE GRID YOU ASKED FOR — AND TWO THINGS IN IT ARE NOT WHAT ANYONE EXPECTED

1 238 races. Six field sizes × five hold positions × ten tracks, released at 0.70, holding a racer
**the plan had actually cast** as a comebacker. The number in each cell is **how many places he
gains** — your own yardstick, since you rejected a 6th→3rd move as not a comeback.

| N | 0.25 | 0.33 | **0.40** | **0.50** | 0.60 |
|---|---|---|---|---|---|
| **10** | +1 | +1 | **+2** | **+3** | +4 |
| **20** | −2 | 0 | **+1** | **+4** | +7 |
| **30** | −8 | −1 | **+1** | **+7** | +12 |
| **40** | −11 | −8 | **−1** | **+12** | +18 |
| **60** | −6 | +3 | **+9** | **+18** | +29 |
| **100** | −8 | +6 | **+24** | **+35** | +45 |

### ★ 1 · YOUR AMBIGUITY IS ANSWERED, AND THE ANSWER IS "NOT A FLOOR"

You said the hold position moves with the field, approaching the end of the first third at large
sizes. **It cannot also be five places at ten racers.** At N=10 the third band is **rank 3** — already
inside the top 5 — and the whole row yields **one to four places.** There is nothing to come back
from. **Five places needs 0.50 or deeper, and only from N=20 upward.**

### ★ 2 · A SHALLOW HOLD IS A FALL, NOT A COMEBACK

The negatives are real and they are not a broken instrument. Holding a racer at rank 10 of 40 puts
him **further forward than the race would have**, so the release is him losing a place that was being
lent to him: **release rank 8, finish 19, minus eleven places.**

### ★ 3 · THE TWO THINGS YOU WANT COME APART ABOVE ABOUT FORTY RACERS

At N=100 the deepest holds give the **biggest climbs in the whole grid — 35 and 45 places** — and the
**worst arrival: he reaches the top 5 in 9 of 29 and 6 of 29 races.** Released from rank 50 of 100 he
gains enormously and finishes tenth. **No cell in the grid achieves both a real climb and a top-5
arrival at that size.** That is a genuine choice and it is yours.

---

## ★ AND ONE FINDING ABOUT THE ENGINE THAT OUTLIVES THIS EXPERIMENT

`racePlanner.js:910` — the servo divides its rank error by the **field size**:

```js
clamp(1.0 + gain * (error / nActive) + noise, minMult, maxMult)
```

So the brake's authority **per rank falls as 1/N**. Saturating it takes **under one rank at N=10 and
7.5 ranks at N=100**, while the strongest brake available is the same 0.85 at every size. **Deep
positions become progressively unholdable as the field grows** — measured, monotone, on every size:
the arm landed where it aimed in 100% of races at N=20 and **10–41% at N=100**, always shallower than
asked. **No speed limit was relaxed to hide this.** It bears on anything that steers by rank, not
just on comebacks.

---

## NEEDS HIS WORD

- ★ **The grid's choice above N≈40**: a big climb, or an arrival in the top 5. Holding alone cannot
  give both.
- ★ **Your eye on the MILD precedence**, now on master and unwatched
  ([COMEBACK-PRECEDENCE-1](../reports/evolution/COMEBACK-PRECEDENCE-1.md)). Two of the arm's four
  numbers did not reproduce and the report says why.
- ★ **`holdGate = Math.max(minHold, stateCap)`** — a *maximum* acting as a floor in five of six
  states. It is the lever behind every comeback number.
- **The e2e `Failed to fetch`** — harness or serving defect, unresolved on purpose.

<!-- END CHAIN STATUS -->
