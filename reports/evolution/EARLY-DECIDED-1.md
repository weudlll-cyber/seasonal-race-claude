# EARLY-DECIDED-1 — how early is the top five already the top five?

**Branch:** `diag/early-decided-1` off master `fe24ddf3`. **Measurement only.** No default moved, no
key wired, nothing proposed, no fix designed.

**The owner observes that by 50–60% of a race a viewer can usually tell that the racers currently in
front will settle the win among themselves. Nothing on record counted this.** This is the baseline.

---

## 1. The answer, and it depends entirely on what "in front" means

**AT THE LITERAL READING — the top FIVE — the premise is FALSE, and not marginally.**

At progress 0.60, on average **1.1 of 5** (closed) and **1.2 of 5** (open) of the eventual top five
are in the top five. The eventual winner is **leading in 0–3% of races** and is somewhere in the top
five in **20%**. **The final top five is not settled until a median progress of 0.96–0.98**, and
**29 of 30 races on each track are still unsettled after 0.80**.

**AT THE FRONT-GROUP READING — the top FIFTEEN of forty — it is PARTLY TRUE, and TRACK-DEPENDENT.**

At 0.60 on the **closed** track, **3.50 of 5** of the eventual top five are already inside the front
fifteen, and the winner is in that group in **77%** of races. On the **open** track the same figures
are **2.63 of 5** and **43%**.

**So the honest statement is:** the specific five that will contest the finish are NOT identifiable at
0.60 — but on a closed track the POOL they come from largely is. **His observation is most defensible
as a claim about the front third of the field on a closed oval, and it is materially weaker on an
open track.**

**I widened the measurement mid-block for this reason and state it as a deviation** (§6): my first
grid stored only the top five, which answers the literal question and would have reported "the
premise is wrong" against a reading he may not have meant.

---

## 2. What could NOT be established

- **Whether the owner's 50–60% impression refers to the top five, the front fifteen, or something
  else.** This block measures three cuts and reports all three; it cannot resolve which one matches
  what he sees. **That is his to say, and §7 proposes the cheapest way to ask.**
- **Anything about the browser.** These are sim races. The camera shows a subset of the field and
  draws its own seed per race, so what a viewer can *see* at 0.60 is not established here.
- **Whether the pattern holds beyond these two tracks or one seed batch.** N=30, `--seed=1`.

---

## 3. The numbers

### dirt-oval (closed, horse) — N=30

**How many of the FINAL top five were already in the top five** — full spread, not just the mean.

| progress | 0 of 5 | 1 | 2 | 3 | 4 | 5 of 5 | mean |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **0.60** | 7 | 15 | 6 | 2 | 0 | 0 | 1.10 |
| **0.70** | 0 | 3 | 12 | 13 | 2 | 0 | 2.47 |
| **0.80** | 0 | 0 | 5 | 12 | 11 | 2 | 3.33 |
| **0.90** | 0 | 0 | 0 | 8 | 12 | 10 | 4.07 |

**Widening the front group** — mean of the final five already inside the front-K.

| progress | K=5 | K=10 | K=15 |
| --- | --- | --- | --- |
| **0.60** | 1.10 | 2.63 | 3.50 |
| **0.70** | 2.47 | 3.47 | 4.00 |
| **0.80** | 3.33 | 4.17 | 4.63 |
| **0.90** | 4.07 | 4.80 | 4.90 |

**THE WINNER ALONE — three separate claims, never blended.** Wilson 95% interval at this N.

| progress | already LEADING | already in top 3 | already in top 5 | already in top 15 |
| --- | --- | --- | --- | --- |
| **0.60** | 0% <sub>[0–11]</sub> | 7% <sub>[2–21]</sub> | 20% <sub>[10–37]</sub> | 77% <sub>[59–88]</sub> |
| **0.70** | 13% <sub>[5–30]</sub> | 37% <sub>[22–54]</sub> | 50% <sub>[33–67]</sub> | 87% <sub>[70–95]</sub> |
| **0.80** | 40% <sub>[25–58]</sub> | 70% <sub>[52–83]</sub> | 83% <sub>[66–93]</sub> | 93% <sub>[79–98]</sub> |
| **0.90** | 63% <sub>[46–78]</sub> | 83% <sub>[66–93]</sub> | 90% <sub>[74–97]</sub> | 100% <sub>[89–100]</sub> |

**LAST progress at which the final top five was NOT yet settled** — min 0.77 · p25 0.89 · **median 0.96** · p75 0.99 · max 0.99. Still unsettled after 0.80: **29/30**; after 0.90: **20/30**.

**Late traffic** — racers ENTERING the final top five after 0.80: **1.67/race**; after 0.90: **0.93/race**. Racers LEAVING the top five after 0.80: **1.67/race**.

### river-run (open, duck) — N=30

**How many of the FINAL top five were already in the top five** — full spread, not just the mean.

| progress | 0 of 5 | 1 | 2 | 3 | 4 | 5 of 5 | mean |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **0.60** | 9 | 10 | 9 | 1 | 1 | 0 | 1.17 |
| **0.70** | 0 | 4 | 11 | 11 | 4 | 0 | 2.50 |
| **0.80** | 0 | 1 | 5 | 10 | 13 | 1 | 3.27 |
| **0.90** | 0 | 0 | 0 | 10 | 7 | 13 | 4.10 |

**Widening the front group** — mean of the final five already inside the front-K.

| progress | K=5 | K=10 | K=15 |
| --- | --- | --- | --- |
| **0.60** | 1.17 | 1.87 | 2.63 |
| **0.70** | 2.50 | 3.47 | 3.77 |
| **0.80** | 3.27 | 4.27 | 4.47 |
| **0.90** | 4.10 | 4.87 | 4.93 |

**THE WINNER ALONE — three separate claims, never blended.** Wilson 95% interval at this N.

| progress | already LEADING | already in top 3 | already in top 5 | already in top 15 |
| --- | --- | --- | --- | --- |
| **0.60** | 3% <sub>[1–17]</sub> | 17% <sub>[7–34]</sub> | 20% <sub>[10–37]</sub> | 43% <sub>[27–61]</sub> |
| **0.70** | 7% <sub>[2–21]</sub> | 40% <sub>[25–58]</sub> | 57% <sub>[39–73]</sub> | 80% <sub>[63–90]</sub> |
| **0.80** | 27% <sub>[14–44]</sub> | 63% <sub>[46–78]</sub> | 80% <sub>[63–90]</sub> | 100% <sub>[89–100]</sub> |
| **0.90** | 63% <sub>[46–78]</sub> | 90% <sub>[74–97]</sub> | 100% <sub>[89–100]</sub> | 100% <sub>[89–100]</sub> |

**LAST progress at which the final top five was NOT yet settled** — min 0.79 · p25 0.87 · **median 0.98** · p75 0.99 · max 0.99. Still unsettled after 0.80: **29/30**; after 0.90: **18/30**.

**Late traffic** — racers ENTERING the final top five after 0.80: **1.73/race**; after 0.90: **0.90/race**. Racers LEAVING the top five after 0.80: **1.73/race**.

**Reading the intervals.** Percentages carry a Wilson 95% interval. **At N=30 the intervals are wide
— typically ±16 points** — so *individual* percentages separate only large differences. **The
distributions and the monotone trend across the four checkpoints are what this N supports**; a
3-point difference between two cells does not exist at this N.

**Where the N is too sparse to say anything, it is left unsaid:** the per-race count distributions at
0.60 have 6 cells over 30 races, so cells of 0–2 races are not a shape and no shape is claimed from
them.

---

## 4. What the distributions show that a mean would have hidden

**The brief was right that the mean hides the answer.** At 0.80 the closed track's mean is 3.33 of 5,
which sounds like "mostly settled". The spread is **2:5 · 3:12 · 4:11 · 5:2** — so a *fifth* of races
still have only two of the eventual five in place, and **only 2 of 30 races are fully settled**. The
mean and the mode tell different stories.

**The late traffic is the same finding from the other side.** After 0.80, on both tracks, roughly
**1.7 racers per race enter** the final top five and **1.7 leave** it. After 0.90, roughly **0.9
enter**. The owner's two examples — racers entering the top five late, and band-2/band-3 racers
dropping back late — **already happen, about 1.7 times per race each.** What is not established is
whether they are *visible* (§2).

---

## 5. Source hygiene

**NO EXISTING OBSERVER TRACKS PER-FRAME ORDERING, so one had to be added — and the brief anticipated
this.** Established at source:

- `gap-metrics` samples at fixed progress points (`sim-fairness.mjs:2942`, `GM_CPS = [0.25,0.5,0.75,0.9]`)
  but records **gaps, not identities** — `frontGaps` is an array of distances.
- `action-metrics` keeps only first / last / min / max rank per racer (`sim-fairness.mjs:1789-1792`).
- `hero-map` records progress-at-front for **heroes only**.
- FRONT-ACTION-TRUTH-1 had already established that no artefact stores per-frame ordering.

**WHAT I ADDED, exactly:** a `--early-decided` flag (requires `--gap-metrics`) that records the
**top-fifteen racer indices on a 0.01 progress grid** — 100 rows per race. It rides **inside the
existing gap-metrics block** and reuses **that block's own `gmOrder`** (`sim-fairness.mjs:2854`, live
order by `t` descending) and **its checkpoint trigger idiom** (first frame at or past a grid point).
**So "position at progress p" has exactly one definition in the tree, and this block did not write a
second one.** Every figure above — the four checkpoints, the winner claims, the last-unsettled point,
entries and drop-outs — is derived from that one array in post-processing.

**The FINAL top five is read from `perRacer.finalRank`, not from the grid**, so the observation and
the thing it is compared against come from different fields.

**PROVED INERT, though the brief said no gate applies.** `scripts/sim-fairness.mjs` is inside the
engine's declared reach, so a change to it *can* move the race. It does not: with no flag given the
world fingerprint is **`dc4647be0f55ebdb`**, unmoved against `docs/fingerprints.json`. I ran that
deliberately against the brief's instruction, because "read-only" describes the measurement and not
the file I edited, and an unproved claim of inertness in an engine-reachable file is exactly what the
ship ceremony exists to prevent.

**A free determinism check.** The first pass stored the top five only; the second stored fifteen.
Same seeds, same settings. The top-5 figures reproduce **exactly** — 1.10 and 1.17 at 0.60 — across
two independent runs with a different capture width.

**WHERE THE FLAG LIVES, and it is NOT master.** This block's merge permission covers the REPORT only,
so `--early-decided` is **not merged**. It sits on `diag/early-decided-1`, one commit, pushed. **The
numbers above are therefore not reproducible from master today** — re-running them means checking out
that branch. That is a deliberate consequence of the permission, not an oversight, and it is the same
shape as ACTION-KEYS-1's measurement passthrough, which was later archived as an annotated tag on the
owner's instruction (`archive/harness-cast-and-servo`). **The same route is available here and is not
taken unasked.**

---

## 6. Build-vs-spec conformity

1. **I widened the capture from top-5 to top-15 mid-block and re-ran both tracks.** The brief asked
   for top-five membership. That answers the literal question and contradicts the premise; the
   front-group reading is the more likely meaning of *"the racers currently in front"*, and without
   it the report would have been decisive about the wrong question. **Both readings are reported.**
2. **The worker-pool instruction is nearly moot here and I did not pretend otherwise.** This is a
   single-arm measurement — shipped defaults, two tracks — so it is **2 runs**, not a sweep. Machine
   read first as instructed (14 logical cores, 10 node processes already holding 4000/4173); the two
   runs were launched concurrently, leaving twelve cores. Sizing a pool from the core count would
   have been ceremony.
3. **I ran the world fingerprint** although the brief said no gate applies — see §5 for why.
4. **The report gives no direction.** Where the numbers suggest one, it is a question in §7.

**No other gate was run and none applies:** no browser gate, no client suite, no camera or render
fingerprint. The only source change is a flag-gated observer that is byte-identical when the flag is
absent.

---

## 7. Proposals

**P1 — ASK HIM WHICH CUT HE MEANS, WITH A PICTURE RATHER THAN A NUMBER.** The whole interpretation
turns on whether *"in front"* is five racers or fifteen, and this block cannot settle it. The cheapest
resolution is not another sweep: it is **one race, replayed at a fixed seed, paused at 0.60**, and the
question *"of these, which will finish in the top five?"* His answer decides whether the baseline
above reads as *"the premise is wrong"* or *"the premise is right about the pool"*. **Everything a
later change is judged against depends on that choice.**

**P2 — THE TRACK SPLIT IS THE MOST ACTIONABLE THING IN THESE NUMBERS AND WAS NOT ASKED FOR.** At 0.60
the winner is in the front fifteen **77% of the time on the closed track and 43% on the open one** —
a gap far larger than anything else measured here. If predictability is the complaint, it is
substantially a **closed-track** complaint. **The question that would decide it: does the same split
hold on the other three closed and three open tracks?** That is 6 more runs at N=30, roughly 20
minutes, and it would establish whether "the race is predictable" is a property of the engine or of
the oval.

**P3 — THE LATE MOVEMENT ALREADY EXISTS; WHAT IS UNKNOWN IS WHETHER IT IS VISIBLE.** About 1.7
racers per race enter the final top five after 0.80 and 0.9 after 0.90. The owner asks for *more*
racers entering the top five late — but the engine already delivers roughly two, and he does not
report seeing them. **Before adding more, it is worth asking whether the existing ones are on
screen.** The camera measurements on record are about framing and the finish; none counts whether a
late top-five entrant was in frame while it happened. That is a camera question, not a physics one,
and it is cheaper to answer than any dynamics change.

**P4 — A "DECIDEDNESS" CURVE WOULD BE A BETTER STANDING METRIC THAN A CHECKPOINT TABLE.** The four
checkpoints were specified, and they work — but the grid already holds 100 samples per race, so the
natural object is **the whole curve of "how many of the final five are in place" against progress**,
one line per track. A single number falls out of it — the progress at which the curve crosses, say,
4 of 5 — which is comparable across changes in a way a four-row table is not. **It costs nothing
extra: the data is already captured.**
