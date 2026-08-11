# GATE-TRUTH-1 — the gate tells the truth (2026-08-12)

**Branch** `fix/gate-truth`, off master `d69baee1`. Three parts, one commit each. **No product
behaviour changed, no racing threshold altered, no fingerprint reachable.** Machine quiet for every
measurement.

This is the repair of what [GATE-LINES-1](GATE-LINES-1.md) found.

---

## Part 1 — the reader, and why it cannot lie again

### What was wrong

Three harnesses derived the runaway rate themselves:

```js
rp.filter((r) => r.runawayParade?.runaway).length / rp.length
```

`runawayParade.runaway` has never existed — the classifier's boolean is `runawayWinner`. **The
optional chain is what made it silent:** `undefined` is falsy, the filter empties, and the answer is
`0/N` on every world, forever.

### What replaced it

**One way of reading it, next to the definition.** `scripts/sim/observers/runaway-parade.mjs` — the
module that owns `classifyRace` — gained `runawayRateOf(races)`, and the three harnesses call it. The
five harnesses that were already correct call `classifyRace` directly, which is the same function
underneath; there is now one definition and one way to turn a run into a rate.

**It returns a shape, not a number**, because a zero has two causes that must never look alike again:

| cause | what `runawayRateOf` does |
| --- | --- |
| the records do not carry the fields the classifier needs | `ok: false` — **a failure**, and the harness prints it. This is the defect class above. |
| the records are fine and no race qualified | `ok: true`, `rate: 0` — **a result about the world**, and it says so in words |

### The once-per-run control

`runawayRunSummary(rows)`, printed by all three harnesses at the end of **every** run. The rule it
enforces is the one this cost: **a rate that is identically zero across a whole run must be SAID.**

- live: `RUNAWAY CONTROL (run) — LIVE: pooled 2.8% over 400 race(s); worst combo searound/N100 at 7.0%…`
- zero: `RUNAWAY CONTROL (run) — ZERO ON EVERY COMBO … THIS IS A RESULT AND MUST BE REPORTED AS ONE.`
- nothing measured: `… NO rate was measured at all. Nothing here says anything about runaway.`

**It never fails a build.** An honest zero is a legitimate result about the world, and a harness that
refused to finish on one would be worse than the silence it replaces. It is deliberately **not**
generalised into a mechanism for every metric — it lives with the one metric whose silence was
actually paid for.

### The proof

**One gate command, before and after** — `node scripts/exp-flapping-gate.mjs --nlist=100`, the exact
command SHIP-CEREMONY step 1 names, on the same world, same seed, same four tracks, machine quiet.
BEFORE is the run filed yesterday as `flapping-gate-data/gate-audit.json`; AFTER is
`gate-truth.json`, produced by this branch.

| track | **runaway BEFORE** | **runaway AFTER** |
| --- | --- | --- |
| searound / manta | 0.0% | **7.0%** |
| luger-hill / luge | 0.0% | **3.0%** |
| seatrack / dolphin | 0.0% | 0.0% |
| space-sprint / rocket | 0.0% | **1.0%** |
| **pooled, 400 races** | **0.0%** | **2.8%** |

And the control line the run now ends on:

```
RUNAWAY CONTROL (run) — LIVE: pooled 2.8% over 400 race(s); worst combo searound/N100 at 7.0%.
The metric is measuring something, which is the half a 0% can never demonstrate.
```

**seatrack is 0% in both columns, and that is the point of the control**: on that track the broken
reader and the truth agree, which is exactly how a defect like this survives a casual read.

## Part 2 — the budget, written where it belongs

**`docs/SHIP-CEREMONY.md` gains step 1a: pooled runaway-winner rate ≤ 5%, reported per track as
well.** The owner's decision is quoted verbatim with a translation beside it, because an owner
verdict is evidence and translating it destroys the evidence:

> _"3 % ist total ok, das ist ja auch ein möglicher Rennausgang — wenn es nicht zu oft vorkommt,
> passt das."_ — "3% is totally fine, that is a possible race outcome after all — as long as it
> doesn't happen too often, that's OK."

**The baseline is today's measurement**: 2.8% pooled over 400 races — searound 7.0%, luger-hill 3.0%,
space-sprint 1.0%, seatrack 0.0%. **searound is recorded as the known outlier rather than averaged
away**: a pooled number that hides one track at more than double the budget would be the same kind of
silence the line exists to end.

**Why it is in the checklist and not in FAIRNESS.md**, in one sentence where the line lives: a
runaway winner is action quality, and [PROJECT-PRINCIPLES §8](../../docs/PROJECT-PRINCIPLES.md)
already rules action quality out of the fairness gates in as many words — `corrP1` is excluded for
exactly this reason. The sentence is there so the next reader does not re-open it.

### `exp-fair-arrival.mjs` stops restating the gate

It called its own criteria "preregistered, binding at N=100" and listed them — a **third** statement
of the gate, which omitted the runaway budget entirely. It now points at the two homes and calls
itself what it is.

| | before | after |
| --- | --- | --- |
| header comment | its own five-criterion list, "preregistered, binding at N=100" | points at `FAIRNESS.md §Permanent gate lines` and `SHIP-CEREMONY.md step 1a`; states that F and B bind nothing |
| banner | `=== FAIR-ARRIVAL-GATE (combo15 vs SHIP, N=…, per track) ===` | `=== FAIR-ARRIVAL SCREEN (…) ===` plus two lines naming the binding homes |
| closing line | `… \| FAIR-ARRIVAL-GATE (binding at N=…); gate-arm=…` | `… \| FAIR-ARRIVAL SCREEN at N=…; gate-arm=… \| the binding gate: docs/FAIRNESS.md §Permanent gate lines + docs/SHIP-CEREMONY.md step 1/1a` |

**No criterion changed and no number moved** — the columns, the comparisons and the PASS arithmetic
are untouched. What changed is what the output claims to be.

### The correction, dated and findable

`reports/evolution/INDEX.md` gains a **CORRECTIONS** section at the top, before the ships: every
`runaway 0%` in RACER-MOTION-2, HOLM-300-COMBINED, FAIRNESS-RECHECK-1 and ROSTER-MATRIX-1 is an
artefact, with the reason, the true numbers, and the pointer here. **The reports themselves are not
edited** — they are append-only, and a correction that rewrites the record destroys the thing the
record is for. It sits in the index because that is the page a reader passes on the way to any of
them.

**Every other number in those four reports stands.** Band arrival, `rowMin` and Holm were computed
correctly and are unaffected.

## Part 3 — `rowMin` gets one home

**The expression and the zone edges now live in `rowMinOf()` / `bandIndexOfRank()` in
`scripts/sim/observers/fairness-stats.mjs`**, and the four harnesses call it. That file already
imported `BAND_EDGES` from `racePlanner.js`, so **the edges now come from the ENGINE's own home** —
until today the harnesses carried four private copies of `[5, 15, 25, 40]` beside the engine's, which
is five statements of one fact.

**The arithmetic was carried over character-for-character**, including the sparse-array behaviour of
`rr.map`. That is deliberate: a move that quietly improved the expression would turn "the numbers are
unchanged" from a measurement into an argument.

### The identical-numbers proof

Same gate command, same N, same world — the run that produced Part 1's after-column also produces
this, so it is one measurement answering both questions:

| track | rowMin BEFORE | rowMin AFTER | identical? | band-reach B → A | Holm |
| --- | --- | --- | --- | --- | --- |
| searound | 0.8733333333333333 | 0.8733333333333333 | **YES** | 89.3% → 89.3% | UNFAIR → UNFAIR |
| luger-hill | 0.8975 | 0.8975 | **YES** | 91.3% → 91.3% | UNFAIR → UNFAIR |
| seatrack | 0.9092857142857143 | 0.9092857142857143 | **YES** | 91.5% → 91.5% | ok → ok |
| space-sprint | 0.8861538461538462 | 0.8861538461538462 | **YES** | 89.0% → 89.0% | ok → ok |

**Full float precision, not the rounded percentages** — the printed `87%`/`90%` would have hidden a
small change. `rowMin`, `bandReach` and the Holm verdict are identical on every track.

### Which kind of gate it is

**The code implements NO-REGRESSION.** The only comparison in the repository is
`exp-fair-arrival.mjs`'s `c.rowMin >= s.rowMin - 1e-9` — the candidate against the shipped arm. There
is no absolute floor anywhere in code.

**The word "floor" — in the ship checklist and in three harness headers — reads as an absolute, and
they disagree.** An absolute floor would be a DIFFERENT gate that has never been evaluated on any
world. So `FAIRNESS.md` now states the line the code actually implements, says plainly that the two
readings disagree, and **changes nothing**: turning it into an absolute floor is a change to the gate
and is the owner's decision.

## Source hygiene

| file | before | after | what happened |
| --- | --- | --- | --- |
| `sim/observers/runaway-parade.mjs` | 278 | 397 | **+119** — gained `runawayRateOf` and `runawayRunSummary` with their reasoning. The reading moved to the definition's home. |
| `sim/observers/fairness-stats.mjs` | 491 | 539 | **+48** — gained `rowMinOf` and `bandIndexOfRank`, reading the engine's `BAND_EDGES` |
| `exp-flapping-gate.mjs` | 97 | 111 | −5 lines of `BE`/`zi`, −8 of inline rowMin, −8 of the broken reader; +the two imports, the control call, and the comments that say what happened |
| `exp-fair-arrival.mjs` | 394 | 402 | −5 `BE`/`zi`, −8 inline rowMin; +the gate-restatement replaced by pointers |
| `exp-fairness-recheck.mjs` | 137 | 144 | same shape |
| `exp-roster-matrix.mjs` | 219 | 224 | same shape, plus one orphaned comment removed (`// band zones for rowMin …`, describing the `BE` that is gone) |

**Removed:** four copies of `const BE = [5, 15, 25, 40]`, four copies of the rank→band function, four
copies of the rowMin arithmetic, three copies of the broken runaway reader, and one restatement of
the gate. **Extracted:** two functions into the two observer modules that already owned the
definitions. **Net across the six files: +216 lines**, and that is honest rather than flattering —
most of it is the reasoning for why the copies were wrong, which is the part that stops them coming
back.

## Noticed and deliberately left

- **The five correct call sites still call `classifyRace` directly** rather than going through
  `runawayRateOf`. They are not wrong and converting them is risk without benefit tonight; the
  DEFINITION was already one home and still is. Worth doing when one of them is next touched.
- **`exp-gate-retune.mjs`, `exp-gs-confirm-gate.mjs`, `exp-gs-honest-150.mjs` and
  `exp-rebaseline-150.mjs` have no once-per-run control.** The brief said to keep the control to the
  gate harnesses and it was kept there. Those four are sweeps, not gates.
- **`reports/evolution/flapping-gate-data/motion.json` and `combined.json` still carry their `0%`
  rows.** They are filed measurements and are left as filed; the CORRECTIONS entry names them.
