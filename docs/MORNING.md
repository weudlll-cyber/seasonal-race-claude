# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-02, after piece 4 of THE OPEN POINTS merged.

---

## ★ THE ONE DECISION THAT WAS TAKEN IN YOUR ABSENCE: PIECE 1'S MINT

**The world fingerprint was re-minted. The race did not change.**

You granted permission for this mint and no other, on the condition that the movement be **fully
explained by the instrument**. It was, and the conditions you set were met before anything was
written:

| your condition | result |
|---|---|
| the OLD instrument on the NEW tree must equal today's record **exactly** | it does — `bc01b74fd4f3cfc8`, the value being replaced |
| the NEW instrument on the OLD tree must equal the value being minted | it does |
| both controls reported in the mint text | they are, in `docs/fingerprints.json` |

**And a third control you did not ask for, which is the conclusive one: of the ten per-track hashes,
exactly ONE moved** — garden-path. The other nine are byte-identical. Camera and render did not move
at all, because they already read each track's own default racer and never had the defect.

**What this mint is NOT.** A moving world hash normally means the simulation changed, and
SHIP-CEREMONY's world-changing half — REBASELINE, the SIM lineage entry, the golden re-pin — exists
for that case. **It does not apply here.** The diff contains no engine file, no default, no config
and no seed. What moved is *which race the instrument runs*. That is written into the mint entry and
into [TAGS.md](TAGS.md) in plain words so a reader in six months does not conclude the race changed
on 2026-09-02.

**No ship tag was cut**, decided by SHIP-CEREMONY and not by convenience: a `v-ship-*` tag records a
picture you judged, and its value is the return point. There is nothing here for your eye — the
picture is byte-identical — and the return point would restore an instrument that races a snail.

→ [FINGERPRINT-TRACK-DEFAULTS-1](../reports/evolution/FINGERPRINT-TRACK-DEFAULTS-1.md)

---

## THE CHAIN — THE OPEN POINTS

| # | piece | state |
|---|---|---|
| **1** | **The fingerprint racing a snail** | **DONE — merged `fa553f50`, minted, pushed.** |
| **2** | **The 74px anchor miss** | **RUNNING.** Read-only analysis in flight; nothing written yet. |
| **3** | **The four groups with no source of truth** | **RUNNING.** Read-only analysis in flight; nothing written yet. |
| **4** | **Repair the sprite audit, then run it** | **DONE — merged `ac1d7acc`, pushed. NO RACER'S VALUES CORRECTED.** |
| **5** | **Price the engine-reach closure** | **RUNNING.** Read-only analysis in flight; nothing written yet. |

Pieces 2, 3 and 5 are read-only and overlap freely, so they run together. Pieces 1 and 4 involved
runs and went one at a time in the main tree — never two writers, two merges or two checks at once,
and no worktrees with junctions.

---

## PIECE 1 — what was actually wrong, in two sentences

`scripts/fingerprint-default.mjs` carried a **literal** table of ten track/racer pairs under a
comment claiming it ran each track's default. The seed has said `beetle` for garden-path since
2026-08-25 and nothing followed, so for **eight days** the project's primary change-detector for the
race ran a snail on a track the product runs with a beetle.

**The premise was repaired, not the pair.** Swapping one word would have reproduced the defect at the
next default change; the instrument now READS `defaultRacerTypeId` from the shipped seed and
**throws** rather than substituting one. The track ORDER stays fixed and listed, because it feeds the
combined hash and a track added to the seeds must not silently join the instrument.

**Three other sites were triaged rather than assumed.** `goldenRunner`'s table was established as
drift and not a pinned fixture — its only consumer is `soak.mjs`, and no golden case is garden-path.
`sweep-bufferPct-driver` was wrong on **two** axes, and one of its entries had **never** been right.
`docs/ARCHITECTURE.md` cannot read a seed, so it is corrected and now labelled a snapshot.

**The record is corrected too.** The 2026-08-25 re-mint argued all four values had to move because
every instrument runs all ten tracks at track defaults. The racer half of that reasoning could not
reach this instrument — which is exactly why the stale pairing survived unnoticed.

---

## PIECE 4 — the sprite audit, and the finding that was not in the brief

**Repaired, run, and nothing corrected.** The tool carried a 20-row table of frame geometry and
display sizes that had **never** agreed with the registry — it entered in `11093fff` (2026-06-03)
disagreeing on eight frame geometries and five display sizes. Run that way it slices a 150-px sheet
into 128-px windows and reports a fill ratio for a window that is not a frame. Frame **size** now
comes from the decoded PNG; frame **count** comes from the registry, because it is the one input a
PNG cannot yield.

### ★ There are TWO measuring rules, and they disagree on five types

This was not in the brief and is the more interesting half.

- The **plain** opaque bounding box wrote the registry's forty pinned values.
- The product's `computeSpriteBoundingBox` additionally **sheds sparse edge strips**, and is what the
  Racer Editor's `measureBodyFill` returns today.

**Dates settle which authored the pins, so this is not inference:** the shedding landed `d2c2ee6e`
(2026-05-28); the values landed `7ea80484` (2026-06-04), a week later and without it.

| against | result |
|---|---|
| the **plain** rule — the one that wrote them | **20 of 20 agree**, and frame geometry agrees on all twenty |
| the **product** rule — what the editor would measure today | **5 differ**: dragon, plane, beetle, koi, **manta** |

Every difference is in **one axis only** and **always downward**, which is what shedding must do
since it can only trim. **manta is the outlier by a factor of four.**

**Nothing was corrected, and that is not caution.** `bodyFillX`/`bodyFillY` reach
`headlessRaceSimulator.js`, `RaceScreen/index.jsx` and start-row layout. Moving manta would move the
world fingerprint and change who wins races. You have judged neither the number nor the picture.

**It ships nothing, and that was proven rather than asserted:** one file, outside the engine hull,
and **all four fingerprint guards reported `nothing changed`** because the file is in no
fingerprint's import closure.

→ [SPRITE-AUDIT-DERIVATION-1](../reports/evolution/SPRITE-AUDIT-DERIVATION-1.md)

---

## NEEDS YOUR WORD

1. **The five sprite disagreements.** Which rule should own `bodyFillX`/`bodyFillY`? If the editor's
   rule is right, five racers' recorded values are stale and correcting them changes races. If the
   plain rule is right, the editor will quietly write a different number the next time anyone
   regenerates one of those five sheets. **Today both are true at once and neither is written down.**
   Nothing was changed either way.
2. **The engine-reach closure, 36 → 76 files.** Still open from the census. Importing the racer
   registry pulls in 40 modules, so editing *any* racer type now selects the world fingerprint and
   asks for a mint. **Piece 5 is pricing this right now** and will land a number here; the decision
   is still yours.
3. **A racer's NAME is physics.** `stablePairBit` hashes `r.name`, so renaming a racer changed the
   winner in 14 of 24 races. Long-standing, unfixed, and not touched by this chain.

---

## WHAT SHIPPED BEFORE THIS CHAIN — corrected, because the last sheet had it wrong

The previous morning sheet showed the two aim-lever branches as unmerged and candidate B as pending
your eye. **Both shipped.** The record now:

- **The aim room floor SHIPPED** — candidate B merged, candidate A removed entirely, tag
  `v-ship-aim-room`, merge `73053d25`. Candidate A is kept on `archive/aim-levers-candidates` rather
  than deleted. Neither branch exists any more.
- **COMPANY-HEADCOUNT-1 SHIPPED** — tag `v-ship-company-headcount`. The company guarantee had been
  deducting one racer unconditionally since CAMERA-LATERAL-1 moved its anchor to the track
  centreline: a true comment left standing while its premise moved underneath it. A promise of five
  asked for four and got four. It now derives whether a racer stands on its anchor instead of
  assuming one does.
- **The two changes were measured TOGETHER first**, and the restlessness on seatrack was attributed
  to candidate B alone by a third measured arm rather than by argument.

**One thing worth carrying forward: the same defect shape has now appeared three times in four
days** — the company headcount, the fingerprint's track table, and the sprite audit's geometry table.
In each case a statement that was true when written stayed put while its premise moved. None was
found by a check.

---

## NOT STARTED

Nothing. All five pieces of THE OPEN POINTS are either merged or in flight.
