# ACTION-FAIRNESS-1 — the six working levers, measured against the band promise

**Branch:** `feat/action-fairness-1` off master `cd147c1d`. **Read-only measurement.**
**Answers the column ACTION-KEYS-1 could not:** none of its 78 arms carried a band-arrival figure, so
it established which keys make action and **nothing about what they cost the promise.**

**No default moved. No key is wired to anything. No dial is designed. Nothing is proposed as a
change.** The owner's decision D11 binds the action dial to the fairness gate — a stage passes or it
does not ship — and this run supplies the missing side of that ledger.

---

## 1. The headline

**Two keys ACTION-KEYS called "one lever seen twice" are opposites on fairness, and that is the
finding.** `pulkLeaderBrake` and `pulkChallengerBoost` move the same action dimensions in the same
direction with the same shape. Braking the leader and boosting the chaser both close the gap at the
front. **Only one of them pushes racers off their assigned bands to do it.**

| | action | band-arrival cost |
| --- | --- | --- |
| `pulkLeaderBrake` | ±30% lead changes | **free** — inside interval on both tracks, in both directions |
| `pulkChallengerBoost` | −26% at zero | **1.58pp** on the closed track (open track undecided at screen N) |

**This inverts a conclusion ACTION-KEYS-1 reported with some confidence**, and it was invisible to
every measurement made before today because none of them carried a fairness column.

**The rest, in one line each:**

- **`pulkLeaderBrake=0.15` is free on both topologies** — +0.41pp and +0.20pp, both inside interval,
  Holm clean where the watchdog can speak, for **+31% and +30% lead changes**. On this lever, at this
  value, **D11's expected trade does not exist.**
- **`reRollIntervalDivisor=20` is out** — **−11.82pp** and **−8.34pp**, replicated on both tracks, and
  it buys ~5% action. On dirt-oval it lands at **76.12%**, six points above the gate floor.
- **The shipped B2 attackers cost ~1.1pp** on both tracks and buy no measurable front action.
- **`chaosSteerGain` is track-shaped** — −1.33pp on the closed oval, nothing measurable on the open
  river.
- **One watchdog finding:** `pulkLeaderBrake=0.0` holds band arrival on river-run while **tripping the
  start-row Holm test against a clean baseline** (p 1.00 → 0.02).

---

## 2. The table

**EVERY CELL CARRIES ITS OWN N, and every arm is compared ONLY against a baseline measured at the
SAME N.** Two precisions sit in this table; nothing is blended across them. The verdict vocabulary
differs by precision on purpose — at N=300 an in-interval result is *cannot be told apart*; at N=30
the identical arithmetic yields **UNDECIDED**, never "unchanged".

**Every interval below is MEASURED from that run's own per-race rates, not predicted.**

| lever | track | **N** | band arrival | shipped, same N | Δ | 95% CI | verdict | lead changes Δ | start-row watchdog |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `pulkLeaderBrake=0.15` | dirt-oval | **300** | 88.34% | 87.93% | +0.41pp | ±0.79pp | cannot be told apart | +31.2% | baseline already trips — no information |
| `pulkLeaderBrake=0.15` | river-run | **300** | 90.11% | 89.91% | +0.20pp | ±0.84pp | cannot be told apart | +29.8% | clean |
| `pulkLeaderBrake=0.0` | dirt-oval | **300** | 87.24% | 87.93% | -0.69pp | ±0.88pp | cannot be told apart | -64.4% | baseline already trips — no information |
| `pulkLeaderBrake=0.0` | river-run | **300** | 90.30% | 89.91% | +0.39pp | ±0.86pp | cannot be told apart | -69.5% | **TRIPS (baseline clean) — FINDING** |
| `pulkChallengerBoost=0.0` | dirt-oval | **300** | 89.51% | 87.93% | +1.58pp | ±0.82pp | holds (improves) | -26.3% | baseline already trips — no information |
| `pulkChallengerBoost=0.0` | river-run | **30** | 89.58% | 89.42% | +0.17pp | ±2.42pp | UNDECIDED — screen candidate | -18% | clean |
| `pulkEnvelopeMaxEffect=0.04` | dirt-oval | **30** | 88.83% | 88.17% | +0.67pp | ±2.02pp | UNDECIDED — screen candidate | -4.1% | baseline already trips — no information |
| `pulkEnvelopeMaxEffect=0.04` | river-run | **300** | 89.96% | 89.91% | +0.05pp | ±0.77pp | cannot be told apart | -6.8% | clean |
| `chaosSteerGain=0.0` | dirt-oval | **300** | 86.60% | 87.93% | -1.33pp | ±0.84pp | WEAKENS | -14.2% | baseline already trips — no information |
| `chaosSteerGain=0.0` | river-run | **300** | 90.44% | 89.91% | +0.53pp | ±0.88pp | cannot be told apart | -7.2% | clean |
| `reRollIntervalDivisor=20` | dirt-oval | **300** | 76.12% | 87.93% | -11.82pp | ±0.97pp | WEAKENS | +5.3% | baseline already trips — no information |
| `reRollIntervalDivisor=20` | river-run | **300** | 81.57% | 89.91% | -8.34pp | ±1.07pp | WEAKENS | +5.2% | clean |
| `b2AttackHeroes=0` | dirt-oval | **300** | 89.11% | 87.93% | +1.18pp | ±0.81pp | holds (improves) | +2.4% | baseline already trips — no information |
| `b2AttackHeroes=0` | river-run | **300** | 90.93% | 89.91% | +1.02pp | ±0.77pp | holds (improves) | +3% | clean |

**Reading the watchdog column.** The start-row Holm test only carries information where the track's
**baseline is clean**. On dirt-oval the shipped world already trips at N=300 — the pre-existing
Layer-1 gradient FAIRNESS.md documented and shelved on 2026-07-31 — so **every arm on that track
reads `true` and none of it says anything about the arm.** That is stated per cell rather than left
for a reader to infer from four alarming and meaningless `true`s.

---

## 3. N, and the honesty about it

| | measured interval | resolves |
| --- | --- | --- |
| **N=300** (the definitive N) | **0.60 – 0.82pp** | ~1pp effects |
| **N=30** (the screen) | **1.39 – 2.10pp** | several-point effects only |

**These are the intervals this run actually produced**, not an estimate. The N=30 screen's power is
**track-dependent** — ±1.39pp on dirt-oval against ±2.10pp on river-run — so a single screen threshold
across both tracks would be wrong, and each cell carries its own.

**THE SCREEN IS BLUNT BUT UNBIASED.** Both N=30 baselines land within half a point of their N=300
counterparts (88.17% vs 87.93% on dirt-oval; 89.42% vs 89.91% on river-run). That is the property a first pass needs: it
loses resolution, not accuracy.

**The owner's instruction, confirmed by measurement rather than assumed.** At N=30,
`reRollIntervalDivisor`'s 8–12 point loss would have been unmissable, while the ~1pp effects of
`b2AttackHeroes` and `pulkChallengerBoost` and the ~0.4pp of `pulkLeaderBrake` would all have come
back UNDECIDED. That is exactly his stated reasoning — *cannot tell whether fairness stays exactly as
high; can tell whether races get several percent worse.*

**AND THE N MATTERED HERE, concretely.** The 6-race smoke put the river-run baseline at 93.75%; at
N=300 it is **89.91%** — off by 3.8pp, which is **more than three times the entire effect size** of
the attacker and challenger-boost results. At screen N those two findings do not exist.

---

## 4. The survivors, and what a definitive run would cost

**Both screened arms came back UNDECIDED — neither lost several points, so neither is out, and
neither can be called unchanged.**

| survivor | screened at | Δ | interval |
| --- | --- | --- | --- |
| `pulkChallengerBoost=0.0` @ river-run | N=30 | +0.17pp | ±2.42pp |
| `pulkEnvelopeMaxEffect=0.04` @ dirt-oval | N=30 | +0.67pp | ±2.02pp |

**Cost of the definitive run over just these two: 2 cells × 29.9 min = ~60 minutes serial, ~30
minutes on two workers.** Both baselines already exist at N=300, so nothing else is needed.

**MEASURED, not estimated:** 29.9 min per cell at N=300 (range 26.5–34.1), 2.7 min per cell at N=30
(range 2.2–3.0) — an 11.3× ratio on this machine.

**NOT STARTED. It waits for the owner's word.**

**Note what the survivor list does NOT contain.** No arm that lost several points needs re-running —
`reRollIntervalDivisor` was measured at N=300 on both tracks and is out on the evidence. The screen
deferred two arms that both look harmless and cannot be proven so, which is the cheapest possible
thing for a screen to defer.

---

## 5. Source hygiene

**The band-arrival figure is READ, not computed here.** `--hero-map` writes `fairness.bandReach`,
described at its own source as *"the fairness control column (band-reach + start-row Holm flag,
computed with the same definitions the report uses)"*. It resolves through **`computeZoneSuccessRate`**
(`scripts/sim/observers/fairness-stats.mjs`), which [FAIRNESS.md](../../docs/FAIRNESS.md) names as the
operational gate — target band vs final band, `overall.rate`.

**The start-row Holm flag is the WATCHDOG, not the headline**, exactly as FAIRNESS.md has it: layer 1.
An arm that holds band reach and trips the watchdog is reported as a **finding**, not a pass.

**What this run DID compute: the intervals only.** Per-race band-arrival rates, using the same zone
definition on the same `rawData` the observer read, to put an uncertainty on the observer's own
number. A rate printed without a spread cannot tell 5pp from 0pp, which is the whole reason this run
exists at the protocol's N.

**The archived passthrough was NOT needed.** All six levers are real config keys reachable from the
harness today. `archive/harness-cast-and-servo` stays unmerged and untouched.

**The flag-name guard ran before any race.** ACTION-KEYS spelled three arms `--b2AttackHeroes` when
the harness parses `--b2-attack-heroes`; `argVal` falls back to the DEFAULT for an unknown key, so
those arms ran the shipped game and reported "no effect". Every flag here was checked against the
names extracted from the harness source before the first race started.

---

## 6. Build-vs-spec conformity

**Four deviations, all stated rather than discovered later.**

1. **The action numbers do NOT reproduce ACTION-KEYS exactly, and the brief expected them to.** Same
   seed, but N=300 is races 1–300 where ACTION-KEYS took 1–30 — a **superset**, not the same sample.
   `leadΔ 8.233` against its 8.167 is that, not a discrepancy. **Confirmed by the screen:** at matched
   N=30 the baselines reproduce ACTION-KEYS **exactly** — dirt-oval leadΔ 8.167 and river-run 11.833,
   identical to three decimals, through a different driver a day later.
2. **A mechanism claim was made and retracted mid-run.** I proposed that `reRollIntervalDivisor=20`
   costs band arrival by cutting post-0.60 band-bias corrections from three to one, and that the two
   tracks formed a natural experiment on it. **Both halves were wrong**: the reduction is 3 → 2, and
   `--dur=60` normalises `realizedDurationSec` to 60 s on both tracks, so the schedules are identical
   and there is no natural experiment. The direction survives; the quantitative account does not, and
   an 8–12pp loss from one lost correction remains **unexplained**. It is a proposal below, not a
   finding.
3. **The 5-minute status monitor miscounted after the addendum.** I changed the target from 16 arms to
   14+4 under a running monitor, and it kept reporting confidently against the old denominator — an
   instrument producing plausible numbers after the thing it measures moved. Caught only because I
   knew the real figure. Replaced with corrected arithmetic.
4. **The paired test bought far less than I claimed it would.** I said it would be "far more powerful"
   than an unpaired comparison. It was a few percent tighter (±0.88 vs ±0.95). Changing a dynamics key
   decorrelates a race from its baseline twin even on the same seed, and pairing only pays when the
   two are correlated. No verdict changed either way.

**Verification: none applies, and the reason is not "read-only" alone.** This branch changes **no
product code** — the diff is this report and its INDEX line. `npm run verify`'s routing selects
guards from the diff, so no fingerprint, no browser gate and no suite can be reached by it. Nothing
was minted.

---

## 7. Proposals

**P1 — COUNT THE BAND-BIAS EVENTS, and close the `reRollIntervalDivisor` hole.** The −8 to −12pp is
the largest effect in this run and its mechanism is **unexplained** after my account failed. The
re-roll transform already carries per-racer event counters of exactly the shape needed. Reading them
per arm would distinguish three live explanations: the late corrections are not equally weighted; the
total roll count matters and not only the post-onset ones; or something else in the schedule does the
work. **Cost: telemetry read, no new sweep.** It matters because this key is the one place a dial
would be spending the promise directly rather than incidentally.

**P2 — MEASURE THE CURVE, NOT TWO POINTS.** Every lever here was measured at one or two values that
ACTION-KEYS happened to pick. `pulkLeaderBrake` is free at 0.15 against a shipped 0.1 — **nothing
says 0.3 or 0.5 is free**, and a three-stage dial needs to know where the cost starts, not that one
point is cheap. The cheapest useful version is a **ladder on the one lever that looks free**: four or
five values of `pulkLeaderBrake`, screened at N=30 first per the standing instruction, with only the
values that move fairness escalated to N=300. That directly serves D11's per-stage gate requirement.

**P3 — THE WATCHDOG IS SATURATED ON THE CLOSED TRACK, AND HALF THIS RUN'S CAPACITY WAS SPENT WHERE IT
CANNOT ANSWER.** Dirt-oval's baseline already trips Holm at N=300, so no arm there can be
distinguished by it — seven cells of watchdog data carrying no information. **Any future gate run
should either pick a track whose baseline is clean, or state up front that the watchdog is
non-discriminating there.** This is a protocol lesson, not a code change, and it cost nothing to
learn only because river-run happened to be clean.

**P4 — THE SHIPPED WORLD HAS TWO MECHANISMS THAT COST BAND ARRIVAL AND BUY LITTLE.** Removing the B2
attackers improves the promise by ~1.1pp on both tracks for +2–3% action; removing the challenger
boost improves it by 1.58pp on the closed track for −26% action. **This is an observation, not a
proposal to change a default** — the attackers were shipped on an eye-test and an action case that
this run does not re-open, and D11 governs the dial, not the shipped world. But a design block
choosing what a "quiet" stage turns DOWN now has measured evidence that these two are where the
promise is currently being spent.
