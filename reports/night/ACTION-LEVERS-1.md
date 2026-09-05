# ACTION-LEVERS-1 — what each action lever actually does

**Block:** PIECE A of the night chain of 2026-09-04 — the point of the night. Branch
`night/2026-09-04`, off master `6953722d`.
**Answers:** `docs/BACKLOG.md` — *HOW MUCH ACTION, a host-facing control (2026-08-22, the owner's
order)*, one measurement further on than
[ACTION-KEYS-1](ACTION-KEYS-1.md).

**READ-ONLY. No default was moved** — every setting was passed as a flag for the run and nothing was
written back. **No mapping, curve, key name or dial was designed.** No fingerprint was minted.

**★ THIS RUN IS INCOMPLETE AND SAYS SO IN EVERY TABLE.** The machine is a two-P-core laptop and the
sweep is a four-hour run; it was still going when the night ended. **Every lever below is either
fully measured on all ten tracks or absent — the arms run lever by lever, so there are no
half-measured rows.** §7 names exactly which candidates were not reached.

---

## 1. The headline

**★ THE ACTION DIAL IS NOT UNBUILT, AND THAT CHANGES THE QUESTION.** Established at source before any
measurement: `client/src/modules/storage/defaults.js` exports `RACE_ACTION_STAGES`, a three-position
host-facing selector (`quiet` / `medium` / `wild`) applied by
`client/src/modules/raceActionStage.js` and **judged on a production build and accepted on
2026-08-24**. It maps onto exactly **two** keys — `pulkChallengerBoost` and `pulkLeaderBrake`. So the
open question is not "what should a dial map onto" from nothing. It is **"are those the right two,
and what do the other candidates do"**.

**And the answer to the first half is that the two shipped keys do one job and only one:**

> **THEY MOVE THE FRONT FIGHT. THEY DO NOT MOVE HOW CLOSE THE FIELD RUNS, AND THEY DO NOT MOVE THE
> FINISH.**

Both change lead changes, passes and how long the leader is uncontested, by large and perfectly
sign-consistent amounts. Neither moves the field's spread at 0.90, and neither moves the leader's gap
at the line. **A host turning the shipped dial to "wild" gets a busier front and the same finish.**

**★ AND ONE CANDIDATE IS NOT A LEVER AT ALL.** `pulkEnvelopeMaxEffect` — the realism envelope — gives
a **bit-identical race on all ten tracks at HALF its shipped value**. It clamps nothing, because the
contest strengths never reach it. That is a good answer and it retires the key from the dial
question. *(The DOUBLE arm reached only two tracks before the night ended, and agrees on both. §5
keeps the two Ns apart rather than averaging them into one claim.)*

---

## 2. The candidate list, re-established at source

**Not taken from ACTION-KEYS-1.** `DEFAULT_RACE_DYNAMICS_CONFIG` was read out of
`client/src/modules/storage/defaults.js` (60 keys) and the candidates picked by what the tree itself
calls them, then checked against the harness's real flag surface.

| # | key | shipped | the tree's own words |
| --- | --- | --- | --- |
| 1 | `pulkLeaderBrake` | 0.1 | *"SHIPPED pulk contest STRENGTHS… the realism-bounded speed knobs"* |
| 2 | `pulkChallengerBoost` | 0.06 | same block |
| 3 | `pulkBoostHeadroom` | 0.1 | same block, additive ceiling headroom |
| 4 | `pulkEnvelopeMaxEffect` | 0.12 | *"the PULK phase's OWN REALISM ENVELOPE"* |
| 5 | `pulkFrontPool` | 8 | PulkLeadRotation's pool |
| 6 | `pulkBiasGain` | 2.0 | PULK field-cohesion bias gain |
| 7 | `pulkLeadRotationAttackerSlots` | 2 | *"THE pulk-phase mechanism… It COMPLETES lead changes"* |
| 8 | `pulkLeadRotationDropDepthLengths` | 8 | *"the depth lever"* |
| 9 | `pulkLeadRotationOutsiderMaxReachLengths` | 15 | outsider reachability cap |
| 10 | `chaosSteerGain` | 0.06 | the chaos steer |
| 11 | `b2AttackHeroes` | 3 | *"OUTCOME front-action lever; SHIPPED ON at count 3"* |
| 12 | `gapRerollStrength` | 1.0 | gap-reroll |
| 13 | `gapRerollThresholdLengths` | 0.5 | gap-reroll |
| 14 | `choreoIntensity` | 0.6 | *"the future Action-slider backing"* |

### ★ Two candidates were EXCLUDED with reason, and both exclusions are findings

**`contestWindowStart` is not an action lever — it is a ruler.** It sets `plan._contestWindowStart`
(`client/src/modules/racePlanner.js:401`), and the only thing that reads it is
`scripts/sim/observers/outcome-front-battle.mjs`. **No engine path reads it.** Moving it moves the
MEASUREMENT WINDOW, not the race. `docs/SWEEP-HARNESS.md:167` already says so. Sweeping it would have
produced a table of a ruler measuring itself.

**`pulkLeadRotationAttackerSlots` cannot be raised.**
`client/src/modules/raceGovernor.js:197` is
`Math.max(1, Math.min(2, Math.round(cfg.attackerSlots ?? 2)))` — **hard-clamped to [1, 2]**, and it
ships at 2. There is no "clearly higher" setting; the key can only go down. It is measured downward
only, and its upward arm is **unmeasurable by construction**, not unmeasured.

### Where the tree and the report disagree

ACTION-KEYS-1's driver, its cast/servo flags and its `feat/harness-cast-and-servo` branch **are not
on master**, so none of its extra reachability exists here. Everything below runs through the harness
as master holds it. Its central claim — that `pulkLeaderBrake` dominates by about a factor of two —
**reproduces** (§4), on ten tracks instead of two.

---

## 3. Protocol

| | |
| --- | --- |
| harness | `scripts/sim-fairness.mjs`, as master holds it |
| tracks | **all ten**, each at its **own `defaultRacerTypeId`** read from `server/seeds/tracks/<id>.json` — never hardcoded |
| field | 40 racers, `--dur=60`, `--seed=1`, `--race-plan=true` |
| races | **N = 30 per arm per track.** Paired: every arm sees the identical seed sequence |
| arms | one baseline + each lever at a clearly lower and a clearly higher value, **one lever at a time, everything else at shipped defaults** |
| measures | `--front-action`, `--action-metrics`, `--gap-metrics` — **three EXISTING observers. No new metric was invented and no new instrument was built.** |

### The five quantities, each mapped to one existing instrument

| the piece's question | the instrument | field |
| --- | --- | --- |
| how often the lead changes | `--front-action` (pre-`corridorStart` window) | `leadChangesMean` |
| how often a pass happens | `--action-metrics` / `pulk-contest` — a top-5 swap that **stuck ≥ 750 ms** | `heldTop5Overtakes` |
| how close the field runs | `--gap-metrics` checkpoint at progress 0.90, in racer lengths | `top5SpreadLen` |
| how long the leader is uncontested | `--action-metrics` — longest single-leader hold as a share of the PULK window | `p1MaxHoldShare` |
| whether the closing phase finds a real contest | `--gap-metrics` at the line, in racer lengths | `leaderGapToP2LineLen` |

### ★ THE STATISTIC, and why it is a sign test

**The unit of replication is the TRACK.** Each cell is a mean over 30 races on one track, so each arm
has **ten paired observations**, one per track, against that track's own baseline. A key that moves a
quantity on one track and not the others is not a lever, so the screen is the **two-sided sign test
across the ten tracks (n = 10)**, not the size of an average — which would hide exactly that.
`10/0` or `0/10` gives **p = 0.002**; `9/1` gives p = 0.021.

An arm counts as **READABLE** when a quantity is both sign-consistent (p ≤ 0.05) and moved by ≥ 5% at
the median. Everything else is reported as **"nothing at N=30"** and, per the piece's rule, **gets no
larger run.**

### Two ways this could have lied, both guarded

- **A MISTYPED FLAG RUNS THE SHIPPED GAME.** The orchestrator extracts every flag name the harness
  actually parses **from the harness source** (87 `argVal` keys, 21 boolean flags) and refuses to
  start if any arm names one that is not in that set. This is ACTION-KEYS-1 §2b's trap, and it is
  live: `b2AttackHeroes` is spelled **`--b2-attack-heroes`** in the harness, and only that spelling
  works.
- **THE RACE MIGHT NOT HAVE CHANGED AT ALL.** Every cell carries a **race signature** — a hash of
  every race's finishing order. It is what distinguishes *"the metric is blind to this key"* from
  *"this key does nothing"*, and it is what produced §5's finding.

---

## 4. The levers that MOVE the front fight

### `pulkLeaderBrake` — the dominant lever, and by roughly a factor of two

10/10 tracks, N = 30 races each. Race signature differs from baseline on **10 of 10**.

| quantity | 0.05 (shipped 0.1) | 0.15 | sign test |
| --- | --- | --- | --- |
| lead changes | **−37.5%** | **+31.3%** | 0/10 and 10/0, p = 0.002 |
| held top-5 passes | **−37.6%** | **+12.1%** | 0/10 and 10/0, p = 0.002 |
| longest single-leader hold | **+55.0%** | **−32.7%** | 10/0 and 0/10, p = 0.002 |
| top-5 spread at 0.90 | +6.0% | −9.3% | 7/3 and 3/7, **p = 0.344 — nothing** |
| leader→P2 at the line | +8.4% | −2.0% | 8/2 and 5/5, **p = 0.109 / 1.000 — nothing** |

**Perfectly monotone and perfectly sign-consistent on the three front quantities, on all ten tracks,
in both directions.** This is the lever.

### `pulkChallengerBoost` — the same job, about half the size

10/10 tracks. Race signature differs on **10 of 10**.

| quantity | 0.03 (shipped 0.06) | 0.12 | sign test |
| --- | --- | --- | --- |
| lead changes | **−10.3%** | **+17.1%** | 0/10 and 10/0, p = 0.002 |
| held top-5 passes | **−8.9%** | **+12.1%** | 0/10 and 10/0, p = 0.002 |
| longest single-leader hold | +7.9% | **−16.2%** | 8/2 (p = 0.109) and 0/10 (p = 0.002) |
| top-5 spread at 0.90 | +1.4% | +0.3% | **nothing** |
| leader→P2 at the line | +4.1% | +6.8% | **nothing** |

**The two shipped dial keys are the same lever at two strengths**, and `pulkLeaderBrake` is about
twice `pulkChallengerBoost` per step of its own range. **Neither touches the field's spread or the
finish gap.**

---

## 5. ★ The lever that is a rail: `pulkEnvelopeMaxEffect` is INERT

**At HALF the shipped value — 0.06, all ten tracks — the race signature differs from baseline on
0 of 10.** Every race is **bit-identical**: same finishing order, every race, every track.

**At DOUBLE — 0.24 — only TWO tracks were reached before the night ended** (city-circuit and
dirt-oval), and both are bit-identical too. **That is suggestive, not established**, and it is
reported at its own N rather than folded into the row above.

**This is not the metric being blind — the signature says the race did not change.** The realism
envelope is a clamp on `|governorMult − 1|`, and **on the ten-track evidence at 0.06 the governor
never reaches it**, so halving the clamp binds nothing. The documented ±12% is a bound the game does
not currently approach rather than a setting, and on that evidence it cannot be a dial position:
loosening or tightening it changes no race.

★ **THE ONE THING THIS DOES NOT YET ESTABLISH** is the upward direction at full breadth. Two tracks
at 0.24 agree with the ten at 0.06, and the mechanism says they should — a clamp that never binds is
insensitive in both directions — but two is two. **Finishing that arm is the cheapest remaining
question in this piece.**

*(Consistent with, and on the downward side stronger than, ACTION-KEYS-1's note that the key "has NO
headroom": measured here on ten tracks with a race SIGNATURE rather than a metric, so "no effect" is
distinguished from "the instrument could not see one".)*

---

## 6. The levers that change the race but move nothing readably

Reported as such, and **given no larger run**, which is the piece's own rule.

### `pulkFrontPool` — 4 and 16 (shipped 8)

| | signature differs | the largest move |
| --- | --- | --- |
| 4 | 10 of 10 | lead changes −2.5% (0/9, p = 0.004 — **sign-consistent but far below 5%**) |
| 16 | **7 of 10** | nothing above 1% |

Two things worth keeping. **At 16 the race is IDENTICAL on 3 of 10 tracks** — the pool is already at
or beyond the front group those tracks produce, so raising it is a no-op there. And at 4 the *sign*
is consistent while the *size* is 2.5%: **a real but tiny effect, which is exactly what the two-part
screen is for.** A test that looked only at p would have called this a lever.

### `pulkBiasGain` — 1 and 4 (shipped 2)

Signature differs on 10 of 10 in both arms. **No quantity moves more than 1.4% and no sign test
reaches p ≤ 0.05.** It changes the race and does not change the action.

---

## 7. ★ What was NOT reached, and it is most of the list

**Nine of the fourteen candidates.** The sweep is 290 cells at 30 races each on a two-P-core laptop,
and it was still running when the night ended.

Not measured: `pulkBoostHeadroom` · `pulkLeadRotationAttackerSlots` ·
`pulkLeadRotationDropDepthLengths` · `pulkLeadRotationOutsiderMaxReachLengths` · `chaosSteerGain` ·
`b2AttackHeroes` · `gapRerollStrength` · `gapRerollThresholdLengths` · `choreoIntensity`.

**The remaining arms were re-ordered part-way through so the most informative candidates run first**
— `b2AttackHeroes` (the tree's own "OUTCOME front-action lever"), `choreoIntensity` ("the future
Action-slider backing"), `chaosSteerGain` (the owner's own candidate), then the rest. That changes
only the ORDER; every lever is measured identically, and the run resumes from a per-cell journal, so
finishing it is a matter of leaving it running.

**Nothing here is a recommendation, a mapping, a curve or a stage definition**, and nothing about
fairness is measured — the levers' fairness cost is
[ACTION-FAIRNESS-1](../evolution/ACTION-FAIRNESS-1.md)'s, and it is not revisited.

---

## 8. Source hygiene

**No file in the repository was changed by this piece.** The orchestrator and the analysis live in
`C:/tmp/night-2026-09-04/pieceA/` and no scratch file entered the repository. Every arm's settings
were passed as flags; nothing was written back to `defaults.js`.

The harness writes its observer dumps to `results/` (gitignored); each cell's dumps were **deleted
immediately after being read**, so the run's disk footprint stayed bounded.

**Noticed and deliberately left:** `pulkLeadRotationAttackerSlots`'s clamp (§2) — the key is
advertised as `(1–2)` in `defaults.js` and enforced as such in `raceGovernor.js`, which agree; it is
only a problem for a dial that wanted headroom there.

`engine-reach --check` was not run because **no path changed**. All four fingerprints were confirmed
unmoved earlier in the night, on the tree these numbers were taken from.
