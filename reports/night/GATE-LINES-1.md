# GATE-LINES-1 — what `runaway` and `rowMin` actually do today (2026-08-12)

**Branch** `diag/gate-lines`, off master `1cc99828`. **Measurement and reading only.** Neither
[FAIRNESS.md](../../docs/FAIRNESS.md) nor [SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md) is edited
here — the decision is the owner's.

**THE HEADLINE, and it changes the question he was going to answer.**

> **`runaway 0%` has never been measured.** The three harnesses that feed the ship gate read a
> property that **does not exist** on the record they read it from, so the filter is always empty and
> the answer is always exactly `0%`. On the same 100 races of the gate's own first track, the
> project's own classifier — named in that very file's header — says **7.0%**.
>
> So the owner is not deciding between two documents about a gate that has never bound. He is
> deciding about **a gate that has never RUN**, and whose stated threshold, if it ever did run, would
> have been red at every ship in the record. Pooled over the gate's own 400 races: it reads **0.0%**
> and the true rate is **2.8%**.
>
> **`rowMin` is sound but homeless.** It is computed correctly and its values are real — but the
> expression exists as **four identical copies in four files**, and the only place it is ever
> compared uses a RELATIVE test (`>= ship`) while the checklist calls it a "floor". It has never
> bound at any ship on record.

---

## 1. WHERE EACH IS DEFINED — quoted from source

### 1a. `runaway` — the DEFINITION has exactly one home, and it is good

`scripts/sim/observers/runaway-parade.mjs`:

```js
export const RUNAWAY_PARADE_DEFAULTS = {
  windowStart: 0.9,     // progress at which the runaway lead is first measured, and the [.,1.0] window opens
  leadLen: 3.0,         // (RUNAWAY a) rank-1 must lead rank-2 by >= this many lengths at windowStart
  challengeLen: 1.0,    // (RUNAWAY c) leader→P2 gap must never drop below this in [windowStart, 1.0]
  …
};

const runawayWinner =
  raw.leaderGapP2At090Len >= D.leadLen &&   // (a)
  winnerIsLeaderAt090 &&                    // (b)
  raw.minLeadFrom090Len >= D.challengeLen;  // (c)
```

Three clauses, one file, its own unit tests, and the sim deliberately writes only RAW records so
"the definitions stay in ONE place" (`sim-fairness.mjs`'s own comment). **This half is exemplary.**

### 1b. …but the GATE does not use it. This is the finding

`scripts/exp-flapping-gate.mjs` — the harness the ship checklist names — derives the number itself:

```js
const rp = JSON.parse(readFileSync(join(out, "runaway-parade.json"), "utf8")).races;
runaway = rp.length
  ? rp.filter((r) => r.runawayParade?.runaway).length / rp.length
  : null;
```

**`runawayParade.runaway` does not exist.** The raw record the sim writes carries exactly these keys:

```
lenScale, leaderIdxAt090, leaderGapP2At090Len, within3P1At090, minLeadFrom090Len, line,
speed095ByIndex, finalRankByIndex, formation, leadChangeCount, lateDistinctLeaders,
releaseProgress, rankAtReleaseByIndex, contestWindowStart, frontBattle, frontLiveliness, chaosSteer
```

The classifier's boolean is called **`runawayWinner`**, and it is not in the file at all — the file's
own `meta.note` says so: *"Booleans derived by scripts/sim/observers/runaway-parade.mjs
classifyRace()."* The harness reads the file and ignores the sentence.

`?.` makes it silent: `undefined` is falsy, the filter returns nothing, the division is `0/100`.

**THE SAME LINE APPEARS IN THREE HARNESSES**, all feeding ship-adjacent reports:
`scripts/exp-flapping-gate.mjs:70`, `scripts/exp-fairness-recheck.mjs:81`,
`scripts/exp-roster-matrix.mjs:136`.

**Five other harnesses do it correctly** — `exp-runaway-leader.mjs`, `exp-gate-retune.mjs`,
`exp-gs-confirm-gate.mjs`, `exp-gs-honest-150.mjs`, `exp-rebaseline-150.mjs` all call
`classifyRace(...)` and read `.runawayWinner`. **The correct measurement and the broken one have
coexisted for months in different reports**, one saying 23.5% and the other 0%, and nothing compared
them because no document holds both.

### 1c. `rowMin` — NO single home. Four copies

There is no module. The expression is written out, identically, in four harnesses:

```js
const BE = [5, 15, 25, 40];
const zi = (r) => { for (let i = 0; i < BE.length; i++) if (r <= BE[i]) return i; return BE.length; };
…
rr[row] = (rr[row] ?? 0) + (zi(r.finalRank) === zi(r.sollRank) ? 1 : 0);
rt[row] = (rt[row] ?? 0) + 1;
…
const rowMin = Math.min(...rr.map((v, i) => (rt[i] ? v / rt[i] : 1)));
```

`exp-flapping-gate.mjs:30,66` · `exp-fair-arrival.mjs:30,120` · `exp-fairness-recheck.mjs:40,74` ·
`exp-roster-matrix.mjs:92,129`. **Both the zone edges and the expression are duplicated four times.**
They all agree today. That is the state that rots, and this project has a name for it.

In words: for each start row, the share of racers whose FINAL rank lands in the same band as their
`soll` rank; `rowMin` is the worst row. It is band-reach, per start row, minimised — **a floor under
the headline number**, which is why FAIRNESS.md is the natural place for it if it is a gate at all.

### 1d. The THRESHOLDS — two homes that disagree in KIND

- **`runaway 0%`** appears in `docs/SHIP-CEREMONY.md` step 1 **and nowhere else**. No harness
  compares the value to anything; `exp-flapping-gate.mjs` only records it. It is an absolute
  threshold that exists only as prose.
- **`rowMin`** is compared in exactly one place, `exp-fair-arrival.mjs:347`:
  ```js
  const R = c.rowMin >= s.rowMin - 1e-9;   // "R rowMin≥ship"
  ```
  **Relative to the shipped arm, not an absolute floor.** SHIP-CEREMONY calls it "the per-row floor
  (rowMin) holds", which a reader will take as absolute. **The word and the code disagree about what
  kind of gate it is.**

**And there is a third statement of the gate nobody asked about.** `exp-fair-arrival.mjs` carries a
"preregistered, binding at N=100" gate whose criteria are arrival · rowMin · fC · DEAD-BORING · the
PULK watchdog — **runaway is not among them**. So the gate exists in three versions:

| where | criteria |
| --- | --- |
| `docs/FAIRNESS.md` §Permanent gate lines | band-reach ≥70% + zero Holm-unfair; arrival must not regress (85–90% target); PULK watchdog chaos maxGap ≤ ship×1.5 |
| `docs/SHIP-CEREMONY.md` step 1 | band arrival within noise; **runaway 0%**; **rowMin holds**; Holm not worsened |
| `scripts/exp-fair-arrival.mjs` FAIR-ARRIVAL-GATE | arrival; **rowMin ≥ ship**; fC ≥ ship−2pp; DEAD-BORING ≤ ship+2pp; PULK watchdog |

No two of them list the same set. **That is the finding to hand him before the two-line question he
asked.**

## 2. TODAY'S NUMBERS — the ship checklist's own harness, on the current shipped world

`node scripts/exp-flapping-gate.mjs --nlist=100`, the exact command in step 1: four tracks, N=100,
`--track-defaults`, machine quiet, no dev servers.

**What the gate printed** (label `gate-audit`, run time in brackets):

| track / racer | band arrival | rowMin | Holm | **runaway, as the gate reads it** |
| --- | --- | --- | --- | --- |
| searound / manta | 89.3% | 87% | UNFAIR (p=0.020) | **0%** (748 s) |
| luger-hill / luge | 91.3% | 90% | UNFAIR (p=0.020) | **0%** (482 s) |
| seatrack / dolphin | 91.5% | 91% | ok (p=0.280) | **0%** (589 s) |
| space-sprint / rocket | 89.0% | 89% | ok (p=1.000) | **0%** (761 s) |

Band arrival and rowMin match the filed ship numbers within noise, and the two Holm flags are the
documented pre-existing gradient FAIRNESS.md already shelves. **Every runaway cell is exactly zero.**

**THE SAME 400 RACES, DERIVED BOTH WAYS.** The raw records the gate read were re-read and put through
`classifyRace()` — the function the file's own header names:

| track | races | **the gate reads** | **`classifyRace().runawayWinner`** | parade finishes |
| --- | --- | --- | --- | --- |
| searound | 100 | 0.0% | **7.0%** | 3.0% |
| luger-hill | 100 | 0.0% | **3.0%** | 1.0% |
| seatrack | 100 | 0.0% | 0.0% | 0.0% |
| space-sprint | 100 | 0.0% | **1.0%** | 0.0% |
| **pooled** | **400** | **0.0%** | **2.8%** | 1.0% |

`typeof record.runawayParade.runaway` is `undefined` on every one of the 400 records. The zero is not
a measurement of the world; it is a measurement of a missing property.

**seatrack genuinely is 0%** — which is exactly why the defect survived: on some tracks the broken
answer and the true answer coincide, and the broken one is never obviously wrong.

## 3. WOULD EITHER EVER HAVE GONE RED?

### `runaway` — it could not have. Not once, at any ship

The recorded gate data is in the repository and answers this directly —
`reports/evolution/flapping-gate-data/`:

| file | ship it belongs to | N | runaway, every track |
| --- | --- | --- | --- |
| `motion.json` | RACER-MOTION-2 | 100 | **0%** |
| `combined.json` | HOLM-300-COMBINED (the definitive gate) | 300 | **0%** |

Every row, both files, exactly zero — which is what an undefined property returns. The same `0%`
then propagated into the prose of RACER-MOTION-2, HOLM-300-COMBINED, FAIRNESS-RECHECK-1 and
ROSTER-MATRIX-1, all of which report it as a green result.

**And the sharper half:** the true rate is not zero, so had the reader been correct and the
threshold been applied as written, **`runaway 0%` would have blocked every one of those ships.** It
is not a gate that has never bound — it is a gate whose stated value the shipped world has never
met.

### `rowMin` — it has never bound either, but honestly

Every recorded evaluation of the R column passes: `gate-stage1-binding.txt`, `gate-stage2-30s.txt`,
`gate-stage3-180s.txt` and the confirm screens all read `rowMin≥ship: PASS`, including the runs where
`fC` and `DEAD-BORING` failed and where the arrival criterion failed. `FAIR-ARRIVAL-GATE.md` records
"arrival FAIL; rowMin PASS". **In the whole record, rowMin has never been the reason anything
stopped** — but unlike runaway it was genuinely computed every time, and its values (87–91% at the
filed ships) are real.

## 4. RECOMMENDATION

**These are recommendations with numbers attached. Nothing is edited; the decision is his.**

### 4a. `runaway` — take it OUT of the ship checklist. Do not put it into FAIRNESS.md

Three reasons, in order of weight:

1. **The number in every ship record is an artefact.** Removing a line that has never been measured
   costs nothing that was ever there.
2. **As written it is unachievable.** The shipped world produces runaway winners; a `0%` gate would
   block every ship. Whatever the right threshold is, it is not zero, and inventing one here would be
   taste dressed as measurement.
3. **It is not a fairness criterion**, and this project has already settled that argument once:
   `corrP1` is action-quality context and explicitly *never a fairness gate*. Runaway is the same
   kind of quantity. Putting it into FAIRNESS.md would repeat a mistake the project has already
   named and written down.

**What to keep:** the observer, its tests, and the five harnesses that read it correctly. It is a
good measurement and belongs in reports as context — it simply is not a ship gate.

**And fix the reader regardless of the decision.** Three files, one line each,
`r.runawayParade?.runaway` → `classifyRace(r.runawayParade).runawayWinner`. That is a defect whether
or not the gate line survives, and it should be its own commit with a before/after number, not folded
into a documentation change.

### 4b. `rowMin` — give it ONE home first, then let FAIRNESS.md own the line

1. **The four copies must become one** before anything else is decided. Today's agreement between
   them is luck, and a gate line whose definition lives in four files cannot honestly be promoted to
   a canonical document.
2. **Then FAIRNESS.md should own it, not the checklist.** FAIRNESS.md is the declared home of gate
   lines; rowMin is a fairness quantity (band-reach per start row); and SHIP-CEREMONY should point at
   it exactly as it now points at the rest.
3. **State it as the RELATIVE line the code actually implements** — "must not regress against the
   shipped arm" — or change the code to match the word "floor". **The two must stop disagreeing**,
   and which way is a real decision: an absolute floor would be a new gate that has never been
   evaluated, and this report cannot tell him where to put it.

**The honest caveat on keeping it at all:** it has never bound. If he would rather carry fewer gate
lines, rowMin is a defensible one to drop — band-reach and Holm already cover start-row fairness at
higher statistical power, and the 300-race native Holm is the test the project already calls
definitive. I recommend **keeping** it, because it is the only per-row FLOOR (Holm asks whether the
gradient is significant; rowMin asks whether any single row is being left behind), and it costs
nothing — it is already computed on every run.

## 5. WHAT THIS BLOCK DID NOT DO

- **It did not fix the reader.** That changes a measured number in three harnesses and deserves its
  own before/after, not a line in a report about documents.
- **It did not touch FAIRNESS.md or the checklist**, as instructed.
- **It did not re-run the old ships' worlds.** It did not need to: the gate data those ships filed is
  in the repository, and the defect is structural — an undefined property returns zero on any world.
