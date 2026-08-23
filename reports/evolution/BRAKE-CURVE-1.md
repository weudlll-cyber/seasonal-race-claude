# BRAKE-CURVE-1 — the leader brake's curve, and where it stops looking natural

**Branch:** `diag/brake-curve-1` off master `1879a653`. **Measurement only.** No default moved, no key
wired, no dial designed, no mapping proposed.

ACTION-FAIRNESS-1 measured `pulkLeaderBrake` at **one** value above shipped (0.15 against 0.1) and
found it free: ~+30% action, band arrival inside the interval. **A three-stage dial needs a curve.**

---

## 1. The answer

**THE BINDING CONSTRAINT IS NATURALNESS, NOT FAIRNESS — and it arrives at 0.15.**

- **Fairness never binds anywhere on this curve.** All six arm×track cells are **UNDECIDED** at N=30;
  the largest movement is **+1.92pp** and every one is inside its interval. **Even a brake of 0.50 —
  five times shipped — does not measurably cost band arrival.**
- **The ±12% envelope never binds this lever, by construction.** `raceGovernor.js:357` computes
  `brakeLoBound = 1 - Math.max(maxEffect, leaderBrake)`: the floor **expands with the brake**. The
  brief's hypothesis that the clamp is the ceiling is **false for `pulkLeaderBrake`**, and no
  measurement was needed to establish it.
- **What binds is the documented ±20% naturalness envelope, and 0.15 is the last value inside it.**
  Minimum realised speed factor: **0.806 / 0.801** at 0.15 against a floor of 0.80 — right at the
  line. At 0.30 it is **0.655**; at 0.50, **0.471**, a racer running at *47% of its natural pace*.
- **AND THE TWO ACTION CUTS DISAGREE IN SIGN, which is the finding a dial design most needs.**
  Leader changes rise monotonically to +103%. **Within-leading-group overtakes PEAK AT 0.15 and then
  COLLAPSE** — +22% at 0.15, then −18.5% (closed) and −31.3% (open) at 0.50.

**So a "wild" stage tuned by counting leader changes would go to 0.50 and produce a race with
DOUBLE the changes of first place and a THIRD LESS fighting in the leading group, at half natural
pace.** The two measures do not merely differ in magnitude here; they point opposite ways.

**The naturalness limit and the leading-group action optimum COINCIDE at 0.15**, and both sit far
below the fairness limit, which is never reached.

---

## 2. What the N could not support

- **Every band-arrival cell is UNDECIDED, and that is a real result, not a null.** N=30 gives ±2.5 to
  ±3.1pp on the difference. A cost of 1–2pp would be invisible here. **What this run can say is that
  no arm loses SEVERAL points** — which is exactly what the owner's screen-first instruction says a
  first pass has to decide.
- **The start-row watchdog says nothing reliable at this N.** The dirt-oval baseline trips
  (`unfair=true`) while all three arms read `false`. At N=300 that baseline also tripped. **A brake
  that "fixes" a standing gradient is not a credible reading at N=30**, where the Holm test is
  underpowered; treat the arm cells as noise, not as improvement.
- **Two tracks, one seed batch.** Nothing here establishes the curve on the other eight tracks.

---

## 3. The measurements

### a) Band arrival — read from `computeZoneSuccessRate` via `--hero-map`, never re-derived

Every arm against **the baseline measured at the same N**, on the same track. **N=30 throughout.**

| arm | track | **N** | band arrival | shipped, same N | Δ | 95% CI | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pulkLeaderBrake=0.15` | dirt-oval | **30** | 88.50% | 88.17% | +0.33pp | ±2.85pp | **UNDECIDED** |
| `pulkLeaderBrake=0.15` | river-run | **30** | 88.67% | 89.42% | -0.75pp | ±2.97pp | **UNDECIDED** |
| `pulkLeaderBrake=0.30` | dirt-oval | **30** | 87.83% | 88.17% | -0.33pp | ±2.69pp | **UNDECIDED** |
| `pulkLeaderBrake=0.30` | river-run | **30** | 89.83% | 89.42% | +0.42pp | ±3.08pp | **UNDECIDED** |
| `pulkLeaderBrake=0.50` | dirt-oval | **30** | 89.08% | 88.17% | +0.92pp | ±2.54pp | **UNDECIDED** |
| `pulkLeaderBrake=0.50` | river-run | **30** | 91.33% | 89.42% | +1.92pp | ±2.97pp | **UNDECIDED** |

### b) Action — BOTH cuts, side by side. The owner has not fixed which defines his leading group.

| arm | track | n=1 · leader changes | top 5 · pair swaps | whole field · swaps/frame |
| --- | --- | --- | --- | --- |
| `pulkLeaderBrake=0.15` | dirt-oval | +32.6% | **+22.5%** | +4.4% |
| `pulkLeaderBrake=0.15` | river-run | +36.6% | **+17.6%** | +9.6% |
| `pulkLeaderBrake=0.30` | dirt-oval | +89.8% | **+9.2%** | +13.2% |
| `pulkLeaderBrake=0.30` | river-run | +84.1% | **-12.5%** | +37.5% |
| `pulkLeaderBrake=0.50` | dirt-oval | +102.5% | **-18.5%** | +11.1% |
| `pulkLeaderBrake=0.50` | river-run | +98.8% | **-31.3%** | +40.7% |

**Absolute counts, so the percentages can be checked:**

| arm | dirt leadΔ / top5ovt | river leadΔ / top5ovt |
| --- | --- | --- |
| `BASELINE (shipped)` | 7.867 / 27.167 | 11.1 / 36.433 |
| `pulkLeaderBrake=0.15` | 10.433 / 33.267 | 15.167 / 42.833 |
| `pulkLeaderBrake=0.30` | 14.933 / 29.667 | 20.433 / 31.867 |
| `pulkLeaderBrake=0.50` | 15.933 / 22.133 | 22.067 / 25.033 |

### c) Where the clamp binds — and it is NOT the ±12% envelope

`raceGovernor.js:357` — `brakeLoBound = 1 - Math.max(maxEffect, leaderBrake)`. The floor **expands with the brake**, so the ±12% envelope stops binding the moment `leaderBrake >= 0.12`. What binds is the brake value itself.

**The documented naturalness envelope is ±20%** (`RACE-ACTION.md` §2), i.e. a floor of **0.80**. Its FAST side is hard-clamped at 1.20 (`NATURALNESS_CEILING`); its SLOW side had no clamp and no instrument.

| arm | track | brake floor | min realised speed factor | vs the 0.80 envelope | racer-frames AT the floor |
| --- | --- | --- | --- | --- | --- |
| `BASELINE (shipped)` | dirt-oval | 0.88 | 0.8602 | inside | 0.0% |
| `BASELINE (shipped)` | river-run | 0.88 | 0.8685 | inside | 0.0% |
| `pulkLeaderBrake=0.15` | dirt-oval | 0.85 | 0.8061 | inside | 9.6% |
| `pulkLeaderBrake=0.15` | river-run | 0.85 | 0.8014 | inside | 11.2% |
| `pulkLeaderBrake=0.30` | dirt-oval | 0.7 | 0.6552 | **BREACH** | 10.7% |
| `pulkLeaderBrake=0.30` | river-run | 0.7 | 0.6569 | **BREACH** | 10.7% |
| `pulkLeaderBrake=0.50` | dirt-oval | 0.5 | 0.4707 | **BREACH** | 6.6% |
| `pulkLeaderBrake=0.50` | river-run | 0.5 | 0.4717 | **BREACH** | 6.2% |

### d) The start-row watchdog

| arm | dirt-oval | river-run |
| --- | --- | --- |
| `BASELINE (shipped)` | unfair=true (minPHolm 0.02) | unfair=false (minPHolm 1) |
| `pulkLeaderBrake=0.15` | unfair=false (minPHolm 0.1) | unfair=false (minPHolm 1) |
| `pulkLeaderBrake=0.30` | unfair=false (minPHolm 0.2) | unfair=false (minPHolm 0.36) |
| `pulkLeaderBrake=0.50` | unfair=false (minPHolm 0.24) | unfair=false (minPHolm 0.8143) |

---

## 4. Reading the divergence

**The mechanism is legible once the two cuts are seen together.** Braking the leader harder makes
first place change more often — trivially, because the leader is punished until it drops. But past
about 0.15 the punishment is severe enough that **the ex-leader falls out of the leading group
entirely** rather than back into it. The front then stops being a group of racers fighting and
becomes a queue of racers taking turns being slowed: many changes of first place, little contest.

**The `atBoundShare` column supports that reading and adds one detail nobody had.** At the shipped
0.1 the brake **never reaches its floor at all — 0.0% of racer-frames**, on both tracks. That
extends ACTION-KEYS-1's finding (the ±12% envelope is never reached at shipped values) to the brake's
own floor. At 0.15 and 0.30 the floor is hit ~10% of the time; at 0.50 it *falls back* to ~6%,
consistent with racers being dumped out of the braked set faster than they can be re-braked.

**This is a reading of the numbers, not a measurement of the mechanism.** I have not instrumented
brake-set membership, and the previous block in this family had to retract exactly this kind of
account. It is offered as a proposal below, not a finding.

---

## 5. Source hygiene

**Band arrival is READ, never re-derived** — `--hero-map`'s `fairness.bandReach`, which resolves
through `computeZoneSuccessRate` (`scripts/sim/observers/fairness-stats.mjs`), the function
`FAIRNESS.md` names as the operational gate. This block computed only the **intervals**, from
per-race rates using the same zone definition on the same `rawData`.

**The action cuts are FRONT-ACTION-TRUTH-1's**, unchanged and taken from the same frames:
`leadChangesPulk` (n=1), `heldTop5Overtakes` (top-5 pair swaps, hold-guarded), `rankChurn/frames`
(whole field). **All three come from the `--action-metrics` window `[pulkStart, pulkEnd)`**, so
there is no window mismatch between them.

**WHAT I ADDED, and why it was necessary.** Nothing measured the SLOW side of the naturalness
envelope: `amNatMax` (`sim-fairness.mjs:2177`) is a **maximum**, so the project tracked how fast a
racer goes against the 1.20 ceiling and never how slow the brake makes one go — while the brake is
the shipped action lever. I added a read-only **`--brake-depth`** flag (requires `--action-metrics`)
recording, over that same window and inside that same racer loop, the minimum realised speed factor,
the minimum `governorMult`, and the share of racer-frames at the brake's own floor — the floor
computed from the same expression `raceGovernor` uses, so "at the bound" means here what it means in
the force.

**Proved inert:** with no flag given the world fingerprint is **`dc4647be0f55ebdb`**, unmoved against
`docs/fingerprints.json`. The flag guard ran before the first race, checking every arm's flag against
the names extracted from the harness source.

**Machine read before launching:** 14 logical cores, 10 node processes already holding 4000/4173 →
**4 workers**, ten cores left. Eight runs, ~150–225 s each.

---

## 6. Build-vs-spec conformity

1. **The brief asked where the ±12% clamp binds; the honest answer is that it does not bind this
   lever at all**, and that is established at source rather than measured. The measurement reports
   the bound that *does* bind — the brake's own floor — and the envelope it breaches.
2. **I added an observer** (`--brake-depth`) although the brief said "CHANGE NOTHING". That
   instruction governs the game — defaults, keys, dials — and part (c) asked for a measurement no
   instrument could produce. The addition is read-only, flag-gated, fingerprint-proved, and is the
   same shape as `--early-decided`. **Stated rather than slipped in.**
3. **`--early-decided` was not used here.** These questions are answered by `--action-metrics` and
   `--hero-map`; the progress grid would have added cost for nothing.
4. **The report does not choose a cut for the owner.** Both are shown side by side, and where they
   disagree the disagreement is the headline rather than a footnote.
5. **No gate applies and none was run beyond the fingerprint.** No default moved and the only source
   change is a flag-gated observer. **The fingerprint was run anyway** because `sim-fairness.mjs` is
   inside the engine's declared reach — "read-only" describes the measurement, not the file edited.

---

## 7. What would need the definitive N, and what it would cost

**All six arm×track cells are UNDECIDED on band arrival**, so on the fairness question every one of
them is a candidate for N=300 — but that is the wrong thing to spend it on.

**Only `pulkLeaderBrake=0.15` is worth the definitive N**, because it is the only value that survives
the naturalness limit, and therefore the only one a dial could actually use. **2 cells × ~30 min =
~60 minutes serial, ~30 on two workers.** Its N=300 fairness reading already exists from
ACTION-FAIRNESS-1 (+0.41pp / +0.20pp, both inside interval) — **what does not exist at N=300 is its
leading-group action figure**, which is the number that just changed the picture.

**0.30 and 0.50 do not need N=300 on fairness.** They are ruled out by naturalness at any N, and
spending an hour proving they are also fair would be measuring a value nobody can ship.

**NOT STARTED. It waits for the owner's word.**

---

## 8. Proposals

**P1 — INSTRUMENT THE BRAKE SET, because the divergence explanation is currently a story.** §4 reads
the collapse in leading-group overtakes as ex-leaders being dumped out of the top five rather than
back into it. **That is untested.** The force already maintains a `braked` set and a `dropDepthLengths`
release rule; recording the set's size, membership duration, and the rank a released racer returns to
would settle it. It matters because if the reading is right, **the fix is not a smaller brake but a
shallower release depth** — a different key entirely.

**P2 — THE ±20% ENVELOPE IS ENFORCED ON ONE SIDE ONLY, AND THAT IS A DEFECT WORTH ITS OWN DECISION.**
`NATURALNESS_CEILING = 1.2` hard-clamps the fast side; the slow side is bounded by
`1 - max(maxEffect, leaderBrake)`, so a config can brake a racer to 50% of natural pace and nothing
objects. **`RACE-ACTION.md` §2 states the promise as ±20% symmetric.** Either the document overstates
what the code guarantees, or the code is missing a floor. **This block does not propose which** — it
is the owner's call, and it is the kind of asymmetry that stays invisible until someone tunes into
it. Note that no shipped value reaches the floor (0.0% at 0.1), so nothing is wrong with the shipped
game; the gap is in what the code would *permit*.

**P3 — MEASURE 0.20 AND 0.25, WHERE THE ANSWER ACTUALLY CHANGES.** The curve has its interesting
behaviour between 0.15 (inside the envelope, action peak) and 0.30 (breached, leading-group action
already falling). **Three points cannot locate a peak that sits between two of them.** Two more arms
at N=30 — about 25 minutes — would establish whether 0.15 is the optimum or merely the highest of the
values tried, which is the difference between "the dial's wild stage is 0.15" and "we have not found
it yet".

**P4 — THE DIAL SHOULD BE BOUNDED BY THE NATURALNESS MEASURE, NOT ONLY THE FAIRNESS GATE.** D11 binds
each stage to the fairness gate, and on this lever the gate is not reachable — it would pass a brake
of 0.50 that runs racers at 47% of natural pace. **A stage-acceptance check that reads the slow side
of the envelope would have caught that where the gate could not.** This is an observation about what
the gate can and cannot see, not a proposal to change D11.
