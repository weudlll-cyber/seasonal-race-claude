# FRONT-ACTION-TRUTH-1 — count the fights in the leading group, not only the changes of first place

**Branch:** `diag/front-action-truth-1` off master `9c5e2622`. **Read-only recomputation — NO RACE
WAS RE-RUN.** Every number here comes from data already stored by
[ACTION-KEYS-1](../night/ACTION-KEYS-1.md) and [ACTION-FAIRNESS-1](ACTION-FAIRNESS-1.md).

**No default moved, no key wired, no dial designed, nothing proposed as a change, and no conclusion
of the two merged reports is edited.** This block produces the number those conclusions should be
re-read against, and says where it contradicts them.

---

## 1. The answer, before the qualifications

**The candidate ranking is NOT largely an artefact of the measure — but one candidate was
misjudged, and `pulkLeaderBrake`'s dominance is scope-dependent.**

- **The measure the brief asked me to build ALREADY EXISTED and was ALREADY STORED.**
  `heldTop5Overtakes` counts every order flip between two racers **both inside the top 5**, first
  place not privileged, with a jitter guard. It sat in the same JSON as the headline both reports
  used. **Nothing had to be computed; it had to be looked at.**
- **`pulkLeaderBrake`'s advantage SURVIVES a measure that does not privilege first place.** At the
  top-5 cut it is still first and still ~3× the next lever. **But at whole-field scope it is
  SECOND**, behind `pulkChallengerBoost`.
- **ONE candidate of 38 reads inert on leader changes and is not inert: `chaosSteerGain=0.0`.**
  −3.8% on leader changes, +2.2% at the top-5 cut — and **−18.8% on the whole field** (−21.7% at
  N=300). It stirs the field without touching the leading group, which is precisely the failure mode
  the brief anticipated, in the direction it did not name.
- **`pulkEnvelopeMaxEffect=0.04` was under-read too** — −7.3% on leader changes, **−31.2% on the
  whole field.**
- **The cuts DISAGREE.** n=1 and top-5 rank almost alike; the whole-field cut reorders four of seven
  places. **So the choice of group size does matter, and it is the owner's to make.** §5 gives the
  numbers it turns on.

---

## 2. What the stored frames CANNOT support — the limit that shaped this block

**THERE IS NO PER-FRAME ORDERING STORED ANYWHERE.** Established by reading every artefact both runs
left behind:

| artefact | what it holds | per-frame ordering? |
| --- | --- | --- |
| `fairness-data.json` → `rawData` | one row per racer per race: `sollRank`, `sollBereich`, `finalRank`, `finishTime` | **no** — final results only |
| `results/action-metrics/am-*.json` | one row per RACE: `rankChurn`, `heldTop5Overtakes`, `leadChangesPulk`, `frontTop5Turnover`, … | **no** — in-loop aggregates |
| `results/gap-metrics/gm-*.json` | one row per race + **four** checkpoints (0.25 / 0.50 / 0.75 / 0.90) | **no** — sparse samples |
| `results/front-action/*.json` | per-combo aggregates | **no** |
| `hero-map.json` | per-hero climb signals + the fairness column | **no** |

The observers consume the frames inside the race loop and discard them. **So two of the three cuts
the brief asked for cannot be computed at all:**

- **The top-10 cut is IMPOSSIBLE.** Nothing was computed at that group size, and the frames needed to
  compute it now are gone.
- **The body-length cut is IMPOSSIBLE as an ORDERING measure.** A body-length-derived quantity does
  exist — `gapThresholdLen` is **3 racer lengths**, derived from `govLenScale`, the racers' own
  geometry, exactly as the brief wanted — and `maxLinkGapLenP90` / `framesOver3LShare` use it. **But
  those measure GAPS, not swaps.** There is no stored ordering at a body-length cut, and inventing
  one from gap statistics would be the quiet approximation the brief forbade.

**What IS available is three nested cuts**, and they come from the identical frames of the identical
races — no window mismatch:

| cut | stored field | counts | filter |
| --- | --- | --- | --- |
| **n = 1** | `leadChangesPulk` | changes of first place | none |
| **top 5** | `heldTop5Overtakes` | **every pair swap inside the top 5** | hold-guarded |
| **whole field** | `rankChurn` | adjacent-pair order flips across the entire field | none |

---

## 3. Two data-integrity findings, both stated because neither was expected

**(a) SIXTEEN of ACTION-KEYS-1's 78 `action-metrics` dumps were OVERWRITTEN.** Both runs derive
`diagLabel` the same way, so ACTION-FAIRNESS-1's N=300 arms wrote over ACTION-KEYS-1's N=30 dumps of
the same name; two more were overwritten by an N=6 smoke. **The numbers survived anyway** — ACTION-KEYS-1's
driver had already extracted the within-group fields into its own `results2-*.json`, so all 38 of its
arms are intact at N=30. **Had it not extracted them, this block would have been impossible.**

**Two cells are genuinely unusable and are reported as gaps, not estimated:**
`pulkChallengerBoost=0.0 @ river-run` and `pulkEnvelopeMaxEffect=0.04 @ dirt-oval` — their N=300
dumps hold an N=6 smoke. Those two levers therefore have **one track at N=300 and no second track**,
which is why their rows below carry a dash.

**(b) The N=30 screen of ACTION-FAIRNESS-1 carries NO within-group data at all.** It was run with
`--hero-map --front-action` and **not** `--action-metrics`, so its four runs have no `rankChurn` or
`heldTop5Overtakes`. That was my omission in writing that screen, and it is why the two survivor arms
cannot be re-read here at screen precision.

---

## 4. The tables

**A confound checked and removed.** `rankChurn` is a per-frame SUM, so it would move mechanically if
an arm changed the window length. Frame counts vary by at most **5.4%** across arms (most within 2%),
and the whole-field column below is reported as **swaps per frame**, which changes the numbers by
under a point (−45.9% → −46.4%, −41.3% → −37.9%). The effects are not window artefacts.

### N=300 — ACTION-FAIRNESS-1 arms, all three cuts from the SAME frames

Every cell is the **weaker of the two tracks** (the ranking statistic both prior reports used); per-track values follow in the next table.

| lever | n=1 · first place | top 5 · pair swaps | whole field · swaps/frame | top-5 turnover |
| --- | --- | --- | --- | --- |
| `pulkChallengerBoost=0.0` | -29.0% | -20.6% | **-46.4%** | -4.7% |
| `pulkLeaderBrake=0.0` | -74.9% | -59.3% | **-37.9%** | -26.9% |
| `pulkEnvelopeMaxEffect=0.04` | -7.3% | -6.7% | **-31.2%** | -1.0% |
| `chaosSteerGain=0.0` | -2.5% | -1.7% | **-21.7%** | -4.1% |
| `pulkLeaderBrake=0.15` | +33.4% | +14.7% | **+7.6%** | +26.4% |
| `reRollIntervalDivisor=20` | +4.4% | +4.3% | **-4.1%** | +0.2% |
| `b2AttackHeroes=0` | +1.6% | -1.5% | **-0.9%** | -5.8% |

### The same, per track (N=300)

| lever | n=1 dirt / river | top 5 dirt / river | field dirt / river |
| --- | --- | --- | --- |
| `pulkLeaderBrake=0.0` | -74.9% / -79.0% | -59.3% / -66.8% | -38.7% / -37.9% |
| `pulkLeaderBrake=0.15` | +33.4% / +33.7% | +23.0% / +14.7% | +7.6% / +12.1% |
| `pulkChallengerBoost=0.0` | -29.0% / — | -20.6% / — | -46.4% / — |
| `pulkEnvelopeMaxEffect=0.04` | — / -7.3% | — / -6.7% | — / -31.2% |
| `chaosSteerGain=0.0` | -2.5% / +5.0% | -1.7% / +6.2% | -25.7% / -21.7% |
| `reRollIntervalDivisor=20` | +4.4% / +6.6% | +4.4% / +4.3% | -6.2% / -4.1% |
| `b2AttackHeroes=0` | +1.6% / +2.7% | -1.5% / +5.1% | +1.0% / -0.9% |

### The ranking under each cut (N=300)

| # | n=1 · first place *(the reports’ measure)* | top 5 · pair swaps | whole field · swaps/frame |
| --- | --- | --- | --- |
| 1 | `pulkLeaderBrake=0.0` | `pulkLeaderBrake=0.0` | `pulkChallengerBoost=0.0` **(↑2)** |
| 2 | `pulkLeaderBrake=0.15` | `pulkChallengerBoost=0.0` **(↑1)** | `pulkLeaderBrake=0.0` **(↓1)** |
| 3 | `pulkChallengerBoost=0.0` | `pulkLeaderBrake=0.15` **(↓1)** | `pulkEnvelopeMaxEffect=0.04` **(↑1)** |
| 4 | `pulkEnvelopeMaxEffect=0.04` | `pulkEnvelopeMaxEffect=0.04` | `chaosSteerGain=0.0` **(↑2)** |
| 5 | `reRollIntervalDivisor=20` | `reRollIntervalDivisor=20` | `pulkLeaderBrake=0.15` **(↓3)** |
| 6 | `chaosSteerGain=0.0` | `chaosSteerGain=0.0` | `reRollIntervalDivisor=20` **(↓1)** |
| 7 | `b2AttackHeroes=0` | `b2AttackHeroes=0` | `b2AttackHeroes=0` |

### N=30 — all 38 ACTION-KEYS arms: does any "inert" candidate move at a wider cut?

An arm counts as reading INERT if its leader-change effect is under 6% on the weaker track.

| lever | n=1 | top 5 | whole field | |
| --- | --- | --- | --- | --- |
| `chaosSteerGain=0.0` | -3.8% | +2.2% | **-18.8%** | **reads inert on first place, moves the field** |

**1 of 38 arms flip.** Every other arm keeps its verdict at every cut.

---

## 5. Do the cuts agree?

**No — and the disagreement is specific enough to decide on.**

- **n=1 and top-5 agree closely.** Same first place, and no lever moves more than one rank between
  them. **So privileging first place is NOT, by itself, what distorted the ranking.**
- **The whole-field cut reorders four of seven places.** `pulkChallengerBoost` rises two to first;
  `pulkEnvelopeMaxEffect` and `chaosSteerGain` rise to third and fourth; `pulkLeaderBrake=0.15` falls
  three to fifth.

**What it would change, concretely.** If the owner's leading group means **the top five**, both prior
reports' rankings stand essentially as written and `pulkLeaderBrake` is the lever to build a dial on.
If it means **the whole field in motion**, then `pulkChallengerBoost` is the strongest lever, and two
keys the reports treated as minor — `pulkEnvelopeMaxEffect` and `chaosSteerGain` — are third and
fourth rather than sixth and seventh.

**This is his to decide, and it is now a decision about a group size rather than about a guess.**
The one thing the data settles on its own: **the top-10 and body-length cuts cannot be checked
without re-running**, so a decision that depends on them needs new races.

---

## 6. `pulkLeaderBrake` — its own paragraph, as asked

**It acts ON THE LEADER, so it moves the very quantity both reports measured. That is a real reason
to suspect its result, and the suspicion is PARTLY justified.**

| cut | effect (weaker track) | rank | margin over the next lever |
| --- | --- | --- | --- |
| n=1 · first place | **−74.9%** | **1st** | 2.6× |
| top 5 · pair swaps | **−59.3%** | **1st** | 2.9× |
| whole field · swaps/frame | −37.9% | **2nd** | — (behind −46.4%) |

**Its advantage SURVIVES the measure that does not privilege first place.** At the top-5 cut — every
pair swap inside the leading group, first place counting no more than any other pair — it is still
first, and its margin over the next lever is if anything slightly *larger* than under leader changes.
**So the leading-group result is not an artefact of measuring the leader.**

**What does not survive is the unqualified word "dominates".** At whole-field scope it is second, and
`pulkChallengerBoost` — which ACTION-KEYS called the same lever seen twice, and ACTION-FAIRNESS
separated on cost — moves 23% more of the field. **The honest statement is: `pulkLeaderBrake` is the
strongest LEADING-GROUP lever at every cut that looks at the leading group, and the second strongest
lever on the field as a whole.**

**And the additive direction is where the scope matters most.** `pulkLeaderBrake=0.15` is +33.4% on
leader changes, +14.7% at the top-5 cut, and only **+7.6%** per frame across the field. The lever
that adds action adds it *concentratedly at the front* — which may be exactly what is wanted, but it
is a different claim from "it adds 33% more action".

---

## 7. Source hygiene

**Nothing was recomputed from raw frames, because there are none.** Every figure is either read
directly from a stored per-race field or aggregated (mean over races) from one.

**The within-group measure is `makeHeldOvertakeTracker`** in
`scripts/sim/observers/pulk-contest.mjs`. Its own header states the definition this block was asked
to build: *"It watches every pair of racers that are BOTH currently in the top 5: when their relative
order flips versus the last CONFIRMED order and the flip persists >= holdProgress, it counts one held
overtake. A flip that reverts before holdProgress is discarded (jitter)."*

**THE WINDOW TRAP WAS AVOIDED, and it is the same one ACTION-KEYS nearly shipped.** The reports'
headline `leadChangesMean` is measured over `progress < corridorStart`; the within-group measures are
measured over `[pulkStart, pulkEnd)`. **Comparing those two directly would compare different stretches
of race.** So the n=1 cut used throughout is `leadChangesPulk` — the leader-change count over the
**same frames** as the within-group measures. Same window, same races, same frames, same observer.

**The ranking statistic is the WEAKER of the two tracks**, as in both prior reports: a lever that
works on one topology is not a lever. Per-track values are given beside it so the reader can see the
spread rather than trust the summary.

---

## 8. Build-vs-spec conformity

1. **Two of the three requested cuts were not built, because the data cannot support them.** The
   top-10 cut and the body-length cut both require per-frame ordering, which no artefact stores. §2
   states this rather than approximating either quietly. **The brief anticipated this possibility and
   asked for exactly this answer.**
2. **The measure was not built — it was found.** The brief said "a recomputation… count position
   changes within the leading group". That counter already existed, ran on every arm of both runs,
   and its output was already on disk. Building a second one would have produced a rival definition
   of the same thing.
3. **Two cells are missing at N=300** (`pulkChallengerBoost=0.0 @ river-run`,
   `pulkEnvelopeMaxEffect=0.04 @ dirt-oval`) because a label collision overwrote their dumps with an
   N=6 smoke. Reported as gaps; not estimated, not back-filled from the N=30 run.
4. **The N=30 screen has no within-group data**, because I omitted `--action-metrics` when writing it
   in the previous block. Stated in §3 as my omission.
5. **`rankChurn` is a per-frame sum and was normalised** to swaps-per-frame before ranking, after
   checking that frame counts vary by ≤5.4%. Both raw and normalised figures agree within a point.

**Verification: none applies, and not merely because it is read-only.** This branch changes **no
product code** — the diff is this report and its INDEX line — so `npm run verify`'s routing can reach
no fingerprint, no suite and no browser gate. Nothing was minted.

---

## 9. Proposals

**P1 — STORE THE FRAMES, OR AT LEAST THE FRONT ONES, BEHIND A FLAG.** This block could answer one of
three questions asked of it, and the other two are unanswerable *forever* on the existing runs
because the frames are gone. A `--dump-front-order` flag writing the top-N racer indices per sampled
frame would make every future cut recomputable without re-racing. **Sizing it honestly:** at ~1,200
frames × 300 races × 10 indices that is a few MB per arm, so it wants a sampling stride and a
scratchpad destination, not the OneDrive tree. **The value is that the group-size question above
becomes free to re-ask** instead of costing a fresh sweep every time the definition is refined.

**P2 — THE DIAGLABEL COLLISION IS A REAL DATA-LOSS BUG AND WILL RECUR.** Sixteen dumps were silently
overwritten because two runs on different days chose the same label, and nothing warned. This block
survived only because one driver happened to extract the fields it needed. **The cheap fix is to
refuse rather than overwrite:** have the observer writers fail if the target file exists with a
different `nRaces` or `seed`, or fold the N and a run id into the label. **It is worth doing before
the next sweep, not after the next loss.**

**P3 — RE-READ THE TWO MERGED REPORTS AGAINST §5 RATHER THAN EDITING THEM.** Both are append-only
lab-journal entries and neither is wrong on its own terms — they measured what they said they
measured. What changed is that "front action" now has three numbers instead of one. **The specific
sentence to re-read is ACTION-KEYS-1's `chaosSteerGain` verdict**, which called it a fourth-place
front lever; at whole-field scope it is fourth *overall* and it barely touches the front at all. A
one-line CORRECTIONS entry in `reports/evolution/INDEX.md` would be the project's normal instrument
for this, and this block deliberately does not write one — that is a judgement about another
report's standing, and it is not this block's to make.

**P4 — THE INTERESTING QUESTION THIS OPENED IS *WHERE* EACH LEVER ACTS, NOT HOW MUCH.**
`pulkLeaderBrake` concentrates its effect at the front (+33% at n=1 decaying to +7.6% across the
field); `chaosSteerGain` and `pulkEnvelopeMaxEffect` do the opposite, moving the field while leaving
the leading group almost untouched. **That is a two-dimensional property — magnitude and locality —
and a dial built on "how much action" alone cannot express it.** A stage that wants a visible front
fight and a stage that wants a churning field are different asks, and the levers separate cleanly
along that axis. Measuring locality directly (front share of total churn) would need P1's frames.
