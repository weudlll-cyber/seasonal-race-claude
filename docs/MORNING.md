<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-14, during BREAKAWAY-HISTORY-1 (the night chain, still running).

**Where the code is.** Master is `b6d77637`, untouched. The night's branch is
`night/2026-09-14-history` — **measurement only, nothing built, nothing minted, no merge.**

---

## ★★ THE ANSWER, AS FAR AS IT IS RACED

You said races used to have far fewer runaway leaders than today. **Tested against raced races, the
race itself did not change at all.**

The largest lead the leader holds at any moment of a race, at **five points of master from
2026-08-04 to 2026-09-12**, same 30 seeds, same track, same field, same roster:

| | −6 weeks | −4 weeks | −2 weeks | −1 week | today |
|---|---|---|---|---|---|
| **lead in world px** — median | **113.2** | **113.2** | **113.2** | **113.2** | **113.2** |
| **lead in world px** — p90 | **223.5** | **223.5** | **223.5** | **223.5** | **223.5** |

★★ **Not "close". Every one of the 30 races is bit-identical at all five stands** — same winner, same
duration, same peak lead to the last digit. **The engine-facing defaults are identical too: zero
differences across the whole span** in `raceDynamicsConfig`, `raceBehaviorConfig`, `rowLayoutConfig`,
`baseSpeedConfig`, `autoScaleConfig`.

★ **This is not a blind instrument.** Forcing a different action stage through the product's own
stage table moves the same numbers (median 113.2 → 99.3 at `medium`, → 118.5 at `wild`). The
instrument sees a world change of that size; there was none to see.

★★ **What DID move is the camera.** Every default that changed in six weeks is a camera key —
39 of them between −6 weeks and today, and one frame-timing key. And the **screen-width** lead has a
real step in it: p90 **1.142 → 1.350**, +18%, somewhere between 2026-08-17 and 2026-08-31. The
bisect for exactly where is running now.

> **So the reading, so far: the race did not get worse. The framing did.** The same gap occupies
> about a fifth more of the screen than it did a month ago. **That is a real change and it is yours
> to judge** — but it is not the racers running away more.

---

## ★ A PUBLISHED NUMBER IS WRONG, AND IT IS LAST NIGHT'S

BREAKAWAY-FREQUENCY-1 reports your photographed lead as **0.349 canvas widths**. Measured again
tonight it is **0.698** — **exactly 2×**, and the 2 is the lap count. That report's canvas-width
figures divide the gap by `finishT` once too often.

★ **The rest of that report is unaffected**: its "1.538% of the race" agrees with tonight to three
decimals, and the holder (Breeze), the progress (0.837) and the 7th-place finish all reproduce
exactly. **It is the canvas-width column only**, and every share in it that is keyed to 0.349.

★ **The harness is verified against your own race**: replaying `QN3HDP` on the tree it was raced on
reproduces **40 of 40 finishing positions**.

---

## Done / running / open

**Done**
- Piece 1 — the portable harness, built and proven against `QN3HDP` (40/40).
- Piece 2 — the coarse ladder, 5 points × 30 races.
- Controls — positive control (stage), adapter control (camera seed), noise floor.

**Running**
- Piece 3 — the bisect of the screen step, between 2026-08-17 and 2026-08-31.

**Open**
- Piece 4 — the 300-race proof.
- Piece 5 — what changed there, read-only.

**Needs your word**
- Nothing yet. This chain changes nothing and proposes nothing.

---

## The noise floor is ZERO, which is worth knowing on its own

Master raced twice with the same 30 seeds is **bit-identical**. So on this fixture any difference
between two stands is a real difference, not scatter — which is why a flat world column can be read
as flat rather than as "within noise".

---

## Where the numbers live

`reports/evolution/BREAKAWAY-HISTORY-1.md` — written as the chain closes. The instruments are in
`C:/tmp/hist` and are swept at the end of the night; the report carries the seeds, the stand SHAs and
the fixture so any of it can be raced again.
<!-- END CHAIN STATUS -->
