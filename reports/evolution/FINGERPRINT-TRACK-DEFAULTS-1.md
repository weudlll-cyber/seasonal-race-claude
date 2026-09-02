# FINGERPRINT-TRACK-DEFAULTS-1 — the world fingerprint was racing a snail; the premise is repaired, not the pair

> **AN INSTRUMENT CORRECTION, NOT A WORLD CHANGE.** The simulation is untouched: the diff contains no
> engine file, no default, no config and no seed. **World and world-off are re-minted; camera and
> render are not, because they never had the defect.**

**What he is agreeing to: the recorded world value changes because the instrument was wrong, not
because the game did.**

---

## 1. THE DEFECT

`scripts/fingerprint-default.mjs:150` carried a literal table of ten track/racer pairs under a comment
reading *"10 standard tracks × default racer"*. That was true when written and **false from
2026-08-25**, when GARDEN-PATH-DEFAULTS-1 changed that track's `defaultRacerTypeId` from `snail` to
`beetle` in `server/seeds/tracks/garden-path.json` and nothing here followed.

For **eight days** the project's primary change-detector for the RACE ran a **snail** on a track the
product runs with a **beetle**. One of its ten tracks did not cover the shipped race at all, while the
combined hash carried on looking authoritative.

**This is the same class as the company-headcount defect: a true statement left standing while its
premise moved underneath it.**

---

## 2. THE PREMISE IS REPAIRED, NOT THE PAIR

**Swapping `snail` for `beetle` would have reproduced the defect the next time a default moves.** The
instrument now **reads** each track's `defaultRacerTypeId` from the shipped seed on every run, and
**throws** rather than substituting one if a seed lacks it — a silent fallback here would put it
straight back to racing a racer nobody chose.

**The track ORDER stays listed and fixed**, because it feeds the combined hash: a track added to the
seeds must not silently join the instrument and move the value without anyone deciding to. Only the
racer half is resolved.

### The other three sites — two were drift, one cannot be

| site | verdict | what was done |
|---|---|---|
| `scripts/parity/goldenRunner.mjs:91` | **DRIFT** | now reads the seeds |
| `client/scripts/sweep-bufferPct-driver.mjs:26` | **DRIFT, on two axes** | now reads the seeds |
| `docs/ARCHITECTURE.md:438` | **cannot self-update** | corrected and **labelled a snapshot** |

**`goldenRunner`'s table is drift and not a pinned fixture, and that was established rather than
assumed.** It is imported by exactly one consumer, `scripts/parity/soak.mjs`; the golden cases name
their own pairs in `client/src/modules/parity/goldenCases.js` and **none of them is garden-path**, so
no recorded expectation depended on this pairing. It is now `trackDefaultPairs()` — a **function, not
a const**, because four vitest files import that module and reading ten seed files at import time
would put the cost on every golden test for a value only the soak uses.

**The sweep driver was wrong on two axes, and one entry was never right.** Its comment named the seed
files as its source, which is what made it look checked. The racer half was wrong on garden-path
(`snail`) and on **city-circuit (`buggy`, where the seed has said `motorbike` since 2026-06-30 — a
week BEFORE this file was written**, so that entry was never correct). The **topology** half was wrong
too: river-run and space-sprint were marked closed and are open in the seeds. Reading the seed removes
all three at once.

**`docs/ARCHITECTURE.md` is a document and cannot read a seed.** Its row is corrected to
`beetle (0.90)` / `2 laps` and the table is now explicitly labelled a snapshot, naming the seed as the
source and the three code sites as the ones that can no longer drift. It is left as prose deliberately
— the alternative is a generated block, and that table's other columns are history nothing can
regenerate.

---

## 3. THE MOVEMENT IS DEMONSTRATED, NOT ARGUED

Minting a change-detector on trust would spend exactly the protection it provides. Both controls were
run, and a third that is stronger than either.

| control | value | |
|---|---|---|
| **A** — old instrument, old tree | `bc01b74fd4f3cfc8` | today's record |
| **B** — **old instrument, NEW tree** | **`bc01b74fd4f3cfc8`** | **equals A exactly — nothing but the instrument changed** |
| **C** — **NEW instrument, old tree** | **`8a1977187e9c99b4`** | **equals D exactly — the other three repairs are inert for this hash** |
| **D** — new instrument, new tree | `8a1977187e9c99b4` | the value being minted |

### The conclusive one: exactly one track moved

| track | old | new | |
|---|---|---|---|
| city-circuit | 7a9b3fdcbebe | 7a9b3fdcbebe | same |
| dirt-oval | 2a991966ae01 | 2a991966ae01 | same |
| **garden-path** | **fc492a4f8a63** | **09df6c0a2f35** | **MOVED** |
| ice-track | 7ee3787b52d6 | 7ee3787b52d6 | same |
| luger-hill | dfdd49b99985 | dfdd49b99985 | same |
| mountainstreet | 79f66e6e1fba | 79f66e6e1fba | same |
| river-run | 79bdef5367c2 | 79bdef5367c2 | same |
| searound | a5432dac2190 | a5432dac2190 | same |
| seatrack | 3761a2f183c6 | 3761a2f183c6 | same |
| space-sprint | 721f192e8b08 | 721f192e8b08 | same |

**Nine of ten byte-identical.** The tenth is the track whose pairing changed.

---

## 4. ALL FOUR FINGERPRINTS, ONE LINE EACH

| role | before | after | |
|---|---|---|---|
| **world** | `bc01b74fd4f3cfc8` | **`8a1977187e9c99b4`** | **MOVED** — the instrument now races garden-path's beetle instead of a snail |
| **world-off** | `daf78ff18eca83c6` | **`aa09ed97a3a32689`** | **MOVED** — the same instrument and the same pairing change, measured with gap-reroll off |
| camera | `152cf295c4c9ff54` | `152cf295c4c9ff54` | **UNMOVED** — it resolves each track's racer from the loaded track record, so it was already racing the beetle |
| render | `485b73d527602a0e` | `485b73d527602a0e` | **UNMOVED** — same reason |

**World-off moving in step with world is the second check and it passes.** It is the same instrument
over the same ten tracks with one mechanism flag, so the pairing change must reach it identically, and
it does. **Camera and render holding is corroboration rather than an absence**: the two instruments
that were already correct are exactly the two that do not move, which is what "the pairing alone" has
to look like.

---

## 5. THE RECORD CORRECTED

The 2026-08-25 re-mint argued that **all four** values had to move because *every instrument runs all
ten tracks at track defaults*. **The racer half of that reasoning could not reach this instrument** —
`fingerprint-default.mjs` was reading a literal, not the track's default. Only the **lap-count** half
of GARDEN-PATH-DEFAULTS-1 could move the world hash that day; the racer change did not, and that is
precisely why it went unnoticed for eight days. Put in the INDEX corrections block, leaving the
original report append-only.

---

## 6. NO SHIP TAG, and the reason

**Decided by SHIP-CEREMONY: not warranted.** A `v-ship-*` tag records a picture the owner judged and
accepted, and its value is the return point `^1`. Here there is **nothing for his eye** — the picture
is byte-identical, camera and render prove it — and the return point would restore *an instrument that
races a snail*, which is a defect and not a world anyone would want back. The change is recorded where
it belongs: in `docs/fingerprints.json`, the one home for the values, with the superseded pair and its
reason.

**SHIP-CEREMONY's world-changing half does not apply either** — no REBASELINE, no SIM lineage entry
for a moved world, no golden re-pin. Those exist for the case where the RACE moved. It did not, and
the diff shows it.

---

## Limits

**The controls prove the movement is the instrument's, not that the new value is "right".** What is
established is that nine tracks are unchanged and the tenth now runs the racer the seed names.
Whether garden-path's beetle race is itself well-behaved is a different question and is not asked
here.

**`--cheap` mode was not exercised.** The instrument's reduced-track path shares the new resolution
but was not run.

**The soak was not run.** `goldenRunner.trackDefaultPairs()` is exercised by importing it and by the
client suite's use of the module, not by a soak run, which is a manual instrument costing hours.
