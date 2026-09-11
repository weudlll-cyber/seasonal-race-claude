<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-11, after COMEBACK-BAND-1 — the chain's last piece. Both pieces are on
`night/2026-09-10`, pushed, **not merged**.

**Where the code is.** Master is `04f40f17` (CI green) and carries everything from the 2026-09-09
night — the comeback precedence, the hull split, the start-sequence skip. `night/2026-09-10` carries both
pieces of the night and is **NOT merged** — it waits for your eye, and piece 2 needs a decision from
you before it goes anywhere.

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

---

## ★ AND THE SECOND PIECE BUILT YOUR DEFINITION — IT WORKS, AND IT BARELY FIRES

The plan now casts its comebacker from a band worth climbing: **nobody below 20 racers, half the
field up to 60, the third band above it.** Every number read off the grid above.

### First, what you suspected is confirmed with a number

Today's "comebacker" is cast from **median post-chaos rank 5 of 30, and 9 of 40** — in essentially
every race. **That is the 6th→3rd shape you rejected, and it was the shipped meaning of the role.**

### ★ THREE THINGS TO WEIGH, AND ALL THREE ARE YOURS

**1 · The repair works — and the role nearly disappears at your common sizes.** Cast comebackers now
start at rank 10 of 20, 20 of 40, 49 of 100. But the role is cast in **0 to 2 races out of 30 at
N=20–40**, because a racer the plan has assigned a top-5 finish is almost never also deep after the
chaos phase. ★ **And the camera cut that shipped yesterday follows the CAST comebacker — so it would
go nearly silent at those sizes.** The comeback SHOT does not vanish with it; the camera falls back
to a wider pool. What changes is that the shot stops being the story's choice.

**2 · ★ NOTHING DELIVERS A DEEP RACER TO THE TOP 5 — AND IT NEVER DID.** Measured on the tree BEFORE
this change: today's comebacker *loses* places after the release at every size from 30 up (**−9,
−17, −19**) and reaches the top 5 in **12 of 53** and **7 of 55**. The new deep racers do no better.
**This change exposes that; it did not cause it.** It is the next real problem and it is bigger than
a casting rule.

**3 · ★ FAIRNESS — one half passes, one half is red, and half the red is not new.** Band-reach is
**86.7%** against the 70% line, comfortably. The start-row test gives **2 unfair tracks against the
control's 1**: **luger-hill is already unfair on master today** (χ² 23.100 against 23.033 — nothing
to do with this change), and **dirt-oval is this change's** (6.133 → 12.933). Nothing was tuned to
recover it.

**Nothing is minted, the golden races are left red on purpose, and the branch is not merged.**

---

## NEEDS HIS WORD

- ★ **Ship the honest band, or keep the frequent fake?** The band is right and it fires in 0–2 of 30
  races at N=20–40. That is the whole decision on piece 2.
- ★ **dirt-oval became start-row unfair**, and **luger-hill already is on master.** Your call whether
  one more is worth the repair.
- ★ **The grid's choice above N≈40**: a big climb, or an arrival in the top 5. Holding alone cannot
  give both.
- ★ **Your eye on the MILD precedence**, now on master and unwatched
  ([COMEBACK-PRECEDENCE-1](../reports/evolution/COMEBACK-PRECEDENCE-1.md)). Two of the arm's four
  numbers did not reproduce and the report says why.
- ★ **`holdGate = Math.max(minHold, stateCap)`** — a *maximum* acting as a floor in five of six
  states. It is the lever behind every comeback number.
- **The e2e `Failed to fetch`** — harness or serving defect, unresolved on purpose.

<!-- END CHAIN STATUS -->
