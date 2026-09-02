# Morning sheet

**Owns:** where the chain stands, right now. Rewritten after every piece, not at the end.
Whoever reads this at 7 a.m. should not have to open a single report to know where things are.

**Last rewritten:** 2026-09-02, after all five pieces of THE OPEN POINTS merged. **The chain is
finished.**

---

## ★ THE ONE DECISION TAKEN IN YOUR ABSENCE: PIECE 1'S MINT

**The world fingerprint was re-minted. The race did not change.**

You granted permission for this mint and no other, on condition the movement be **fully explained by
the instrument**. It was, and the conditions were met before anything was written:

| your condition | result |
|---|---|
| the OLD instrument on the NEW tree must equal today's record **exactly** | it does — `bc01b74fd4f3cfc8`, the value being replaced |
| the NEW instrument on the OLD tree must equal the value being minted | it does |
| both controls reported in the mint text | they are, in `docs/fingerprints.json` |

**And a third control you did not ask for, which is the conclusive one: of the ten per-track hashes,
exactly ONE moved** — garden-path. The other nine are byte-identical. Camera and render did not move
at all, because they already read each track's own default racer.

**What this mint is NOT.** A moving world hash normally means the simulation changed, and
SHIP-CEREMONY's world-changing half — REBASELINE, the SIM lineage entry, the golden re-pin — exists
for that case. **It does not apply here.** The diff contains no engine file, no default, no config
and no seed. What moved is *which race the instrument runs*. That is written into the mint entry and
into [TAGS.md](TAGS.md) in plain words.

**No ship tag was cut**, decided by SHIP-CEREMONY: there is nothing here for your eye, and the return
point would restore an instrument that races a snail.

---

## THE CHAIN — all five done, plus one repair that was not in the brief

| # | piece | state |
|---|---|---|
| **1** | The fingerprint racing a snail | **DONE** — merged `fa553f50`, minted, pushed |
| **2** | The 74 px anchor miss | **DONE** — merged `70380c86`. Read-only, nothing built |
| **3** | The four groups with no source of truth | **DONE** — merged `6095240f`. Read-only |
| **4** | Repair the sprite audit, then run it | **DONE** — merged `ac1d7acc`. **No racer's values corrected** |
| **5** | Price the engine-reach closure | **DONE** — merged `0b3b7fe5`. Read-only |
| **+** | **A regression piece 1 introduced** | **DONE** — merged `d640b238`. Found by piece 3, confirmed independently, fixed |

Pieces 2, 3 and 5 ran in parallel; 1 and 4 went one at a time in the main tree. Never two writers,
two merges or two checks at once, and no worktrees.

---

## ⚠ PIECE 1 BROKE THE PARITY SOAK, AND IT BROKE IT THE SAME WAY IT FIXED THE FINGERPRINT

**This is the thing to read first if you read only one.** Making the soak's track axis read the
shipped seeds left its **racer roster** hand-listed as ten types. garden-path then returned `beetle`,
which was not among them, and `buildMatrix()` threw on every run from that merge until the fix.

**Nothing went red.** The soak is in no CI path and no verify guard, so a tool that could not start
looked exactly like a tool nobody ran.

Measured at three points rather than argued: **600 rows before, throws after, 600 rows now.**

**It is the same defect one layer down.** Fixing the premise above a hand-maintained list *moved* the
fault rather than removing it — from a silent wrong answer to a loud crash nothing was listening for.
The roster is now derived from the registry. The ten pre-existing entries were JSON-compared
byte-identical to master's, and the goldens ran 50/50 green twice.

Two things deliberately **not** done: `surfaceClasses` is untouched (deletion proposed three times
now, still not mine to decide), and `racerFacts.mjs` is untouched — a re-export through it was
reverted once `engine-reach --check` showed **that file is inside the engine hull**, and this chain
carries no minting permission.

→ [SOAK-ROSTER-1](../reports/evolution/SOAK-ROSTER-1.md)

---

## NEEDS YOUR WORD — four things, in the order I would ask them

### 1. Which rule defines a racer's body? (piece 4 + piece 3)

The sprite audit now works, and it exposed something not in the brief: **there are two measuring
rules and they disagree on five racers.**

- The **plain** opaque bounding box wrote the registry's forty pinned values.
- `computeSpriteBoundingBox` additionally **sheds sparse edge strips**, and is what the Racer
  Editor's `measureBodyFill` returns today.

Dates settle which authored the pins rather than leaving it to inference: shedding landed `d2c2ee6e`
(2026-05-28), the values `7ea80484` (2026-06-04) — a week later and without it.

| against | result |
|---|---|
| the plain rule | **20 of 20 agree**; frame geometry agrees on all twenty |
| the product rule | **5 differ** — dragon, plane, beetle, koi, and **manta, the outlier by a factor of four** |

Every difference is one axis only and always downward, which is what shedding must do.

**Nothing was corrected, and that is not caution.** `bodyFillX`/`bodyFillY` reach the headless
simulator, the race screen and start-row layout — moving manta would move the world fingerprint and
change who wins. **Today both rules are true at once and neither is written down as the owner.** The
next person to regenerate one of those five sheets silently picks one.

### 2. The anchor miss: one defect, and a defensible option to do nothing (piece 2)

**The aim is right** — proven exact, 0.0000 px at max on 39,712 frames. **The smoothing is honest**,
and better than that: removing the pan lag alone makes the promise *worse*, so it is currently paying
for part of it. **45 + 59 does not make 74 because the vectors are near-perpendicular** — quadrature
gives 74.11 against the recorded 74.22.

**One term is genuinely wrong**: the lateral guarantee shifts the anchor *thirty lines after* the
ceilings were sized around the un-shifted one. It is the entire remaining company shortfall — worth
**1.8% of frames on mountainstreet, 0.3% on seatrack, 0.0% on the other eight.**

**Three options, and P3 is defensible**: do neither, and record the account. A third change to the
framing rule before you have judged the second is the pattern this arc has already paid for.

A cheaper fifth finding sits alongside it, with **no circularity at all**: the guarantees measure
from the raw centreline point while the pan is built on the smoothed one, ten lines apart in the same
function.

### 3. The engine-reach closure — priced, and my recommendation is keep it (piece 5)

**9 to 86 seconds a week of your wait, and zero in CI** — not a rounding; no workflow invokes any of
it. The fact that decides it is an exclusivity flag, not a duration: the client suite runs *alone*, so
the fingerprint does not hide inside it. Marginal cost is **+39 s per verify run**, on 27 commits in
90 days — **24 of them in two weeks of June, and 2 since July.**

**Recommendation: do not narrow it.** The one narrowing that gives up nothing saves 3 s/week at the
current rate and costs a code change to the file every harness reads. Two other tempting narrowings
are refused by name in the report, one of which would re-create piece 1's exact defect one level up.

### 4. Still open from before: a racer's NAME is physics

`stablePairBit` hashes `r.name`, so renaming a racer changed the winner in 14 of 24 races.
Long-standing, unfixed, untouched by this chain.

---

## THE CENSUS'S "FOUR GROUPS WITH NO SOURCE OF TRUTH" — no longer four (piece 3)

| | verdict |
|---|---|
| `bodyFillX`/`bodyFillY` | **CLOSED** the same day — proven by *running* the repaired tool |
| `AUDIT_RENDERED_BODY_H` | **half-repaired** — all 20 pins agree, but the credited script still never prints the number. CHEAP |
| `surfaceClasses` | **still open** — unread, 6 of 10 differ, two tags are not surface classes anywhere. CHEAP |
| old `defaultDuration` | **mis-classified** — it has a home in seed git history; 10 of 10 reproduce exactly |

**The pattern across all four is one thing: a comment asserting a provenance that nothing enforces.**

---

## ONE DOCUMENT WAS CORRECTED, and it is the only thing I changed outside a brief

`docs/SHIP-CEREMONY.md` claimed `racer-types/` is inside **no** instrument's closure and that
`engine-reach --check` on `SpriteRacerType.js` reports it cannot reach the engine. Both halves were
re-checked directly and both are false since 2026-09-02. The generated counts block ten lines above
was regenerated by the ship; that hand-written paragraph was not.

Corrected in place, keeping what the row said when it was written — **the gap it describes is why the
closure was closed** — and its conclusion, that a racer's *drawing* is covered by your eye and
nothing else, is still true.

---

## WHAT SHIPPED BEFORE THIS CHAIN — corrected, because the last sheet had it wrong

The previous sheet showed the two aim-lever branches as unmerged and candidate B as pending your eye.
**Both shipped**, and it was confirmed against git rather than taken on trust:

- **The aim room floor SHIPPED** — candidate B merged, candidate A removed entirely, tag
  `v-ship-aim-room`, merge `73053d25`. Candidate A is kept on `archive/aim-levers-candidates`.
  **Neither branch exists any more.**
- **COMPANY-HEADCOUNT-1 SHIPPED** — tag `v-ship-company-headcount`. The guarantee had been deducting
  one racer unconditionally since CAMERA-LATERAL-1 moved its anchor to the centreline, so a promise
  of five asked for four.

---

## ★ THE PATTERN, stated once because it is now the finding rather than an incident

**The same defect shape appeared FIVE times in four days**, and this chain found four of them:

1. the company guarantee's headcount,
2. the world fingerprint's track table,
3. the sprite audit's geometry table,
4. the parity soak's racer roster — **caused by fixing number 2**,
5. `SHIP-CEREMONY.md`'s closure paragraph — **caused by fixing the closure it describes**.

In every case a statement that was true when written stayed put while its premise moved beneath it.
**None was found by a check.** Two of the five were *created* by repairing another one, which is the
part worth sitting with: fixing a premise one layer up does not remove this fault, it relocates it.

---

## NOT STARTED

Nothing. Every piece of THE OPEN POINTS is merged and pushed, master is finished and green after each
one, and every branch is pushed.
