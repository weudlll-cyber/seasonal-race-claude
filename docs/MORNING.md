<!-- BEGIN CHAIN STATUS — rewritten after every piece -->
# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-14, at the close of BREAKAWAY-HISTORY-1.

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
39 of them between −6 weeks and today, and one frame-timing key. The **screen-width** lead steps at
**one merge: `d4bad558`, 2026-08-22 (ENDGAME-LAND-CLEAN-1)**.

★★ **Proved at 300 races across that merge:** the race is **bit-identical in all 300** — every max
lead, every 40-position finishing order, every duration — while **84 of the 300 changed how big the
gap LOOKS: 80 larger, 4 smaller.** At p90 the same gap covers **7.8% more screen**.

★★ **One key does all of it: `contentionWatch`.** Turned back off, the p90 returns to exactly the
pre-merge value; `bandFloor` explains none of it and `runInSchedule` about a tenth. It drops racers
who can no longer win out of the framing set, so the shot holds fewer racers and sits tighter.

> **So: the race did not get worse. The framing did.** The same running looks bigger. **That is a
> real change and it is yours to judge** — it is not the racers running away more.

★ **And a revert is not free**, which is why nothing was touched: the ship gate's item 7 is built on
that key, the camera and render fingerprints were minted three weeks after it shipped, and
`defaults.js:592-595` records that **you judged a production build with it on and accepted the
picture.**

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

**Done — the chain is complete.**
- Piece 1 — the portable harness, proven against `QN3HDP` (**40 of 40 finishing positions**).
- Piece 2 — the coarse ladder, 5 points × 30 races. World column flat; two stands not measurable.
- Piece 3 — the bisect: two steps, both in August, both camera.
- Piece 4 — the 300-race proof, plus the control that the measuring track did not move.
- Piece 5 — attributed to one key by measurement, with its reason and its revert cost.
- Controls — positive (stage), adapter (camera seed), noise floor (**zero**).

**Open**
- Nothing in this chain.

**Needs your word**
- **Nothing is required.** One thing is worth your eye if you want it: whether the tighter endgame
  shot is what you want, now that its cost is measured. It was accepted on the picture; the
  side-effect on how large a gap reads was not measured at the time and now is. **No proposal
  attached** — a change there would move two fingerprints and the ship gate's item 7.

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
