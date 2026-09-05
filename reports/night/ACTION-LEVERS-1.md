# ACTION-LEVERS-1 — what each action lever actually does

**Block:** PIECE A of the night chain of 2026-09-04 — the point of the night. Branch
`night/2026-09-04`, off master `6953722d`.
**Answers:** `docs/BACKLOG.md` — *HOW MUCH ACTION, a host-facing control (2026-08-22, the owner's
order)*, one measurement further on than
[ACTION-KEYS-1](ACTION-KEYS-1.md).

**READ-ONLY. No default was moved** — every setting was passed as a flag for the run and nothing was
written back. **No mapping, curve, key name or dial was designed.** No fingerprint was minted.

**★ THE RUN IS COMPLETE: 290 cells, 0 failures, all 14 candidates on all ten tracks at N = 30.**
*(An earlier revision of this report was written while it was still running and said five levers were
done; it finished afterwards. Every table below is the full set, and §8 records what the partial
version got wrong.)*

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

**★ AND THE SECOND HALF HAS A SINGLE SHAPE: EVERY CAP IN THE PULK MECHANISM IS SLACK.** Four arms
raise a ceiling — the realism envelope, the boost headroom, the attacker slots, and the envelope
again downward — and **three of them produce a BIT-IDENTICAL RACE on all ten tracks.** The game never
reaches any of its own caps. **Lowering them changes the race; raising them cannot.** §5.

**★ AND THE KEY THE TREE ITSELF CALLS "the future Action-slider backing" MOVES NOTHING.**
`choreoIntensity` at 0.3 and at 0.9 changes the race on all ten tracks and moves **not one** of the
five quantities readably. §6.

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
ships at 2. There is no "clearly higher" setting the engine can honour. **It was swept upward anyway,
at 3, precisely to test that reading — and the race came back BIT-IDENTICAL on all ten tracks, which
is what a clamp to the shipped value must produce.** The source claim is therefore confirmed by
measurement rather than by reading alone (§5).

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

## 5. ★ THE CAPS ARE ALL SLACK — three arms give a BIT-IDENTICAL race

This is the night's cleanest result and it has one shape. **Three of the fourteen levers, raised,
change nothing at all** — not "nothing measurable", but nothing: the race signature is identical on
every one of the ten tracks, meaning the same finishing order in every one of the 300 races.

| arm | signature differs from baseline | what it is |
| --- | --- | --- |
| `pulkEnvelopeMaxEffect` = 0.06 *(half)* | **0 of 10** | the PULK realism envelope |
| `pulkEnvelopeMaxEffect` = 0.24 *(double)* | **0 of 10** | the same |
| `pulkBoostHeadroom` = 0.2 *(double)* | **0 of 10** | additive ceiling headroom above the band max |
| `pulkLeadRotationAttackerSlots` = 3 *(above the range)* | **0 of 10** | parallel attacker slots |

**Every one of them is a CEILING, and the game never reaches any of its own ceilings.**

- **`pulkEnvelopeMaxEffect` is inert in BOTH directions.** It clamps `|governorMult − 1|`, and at the
  shipped contest strengths the governor is never near it — so halving the clamp binds nothing and
  doubling it releases nothing. **The documented bound is a rail the game does not currently touch,
  not a setting**, and it cannot be a dial position.
- **`pulkBoostHeadroom` is inert UPWARD and a real lever DOWNWARD** — see §6a. So the headroom the
  game has is being used; there is simply none left above it.
- **`pulkLeadRotationAttackerSlots = 3` is inert because it is CLAMPED.**
  `client/src/modules/raceGovernor.js:197` is `Math.max(1, Math.min(2, …))`, so 3 becomes 2, which is
  the shipped value. **This is the source claim in §2 confirmed by measurement rather than by
  reading** — a bit-identical race is exactly what a clamp to the shipped value must produce, and it
  is the strongest possible evidence that the clamp is live.

**What this means for a dial:** three of the fourteen candidates can only ever be turned DOWN. A dial
built on them would have a dead half.

---

## 6. The levers that MOVE something, beyond the two on the shipped dial

Four more arms clear the screen. **All of them are smaller than `pulkLeaderBrake`, and two of them
point the opposite way from what their names suggest.**

### 6a. `pulkBoostHeadroom` — a real lever, downward only

`0` (shipped 0.1): signature differs on 10 of 10.

| quantity | change | tracks up/down | p |
| --- | --- | --- | --- |
| lead changes | **−8.8%** | 0/10 | 0.002 |
| held top-5 passes | **−15.1%** | 0/10 | 0.002 |
| longest single-leader hold | **+13.0%** | 9/1 | 0.021 |

**Removing the headroom removes real action** — the largest single effect after the two dial keys.
Raising it does nothing (§5). So the key is *contributing* at its shipped value and is *saturated*
above it.

### 6b. `pulkLeadRotationAttackerSlots` — the same story

`1` (shipped 2): signature differs on 10 of 10. **Lead changes −7.8%** (0/10, p = 0.002) and **held
top-5 passes −8.4%** (0/10, p = 0.002). Dropping to one attacker slot costs about 8% of both. The
upward arm is impossible (§5).

### 6c. ★ `chaosSteerGain` runs BACKWARDS, and it is not monotone

| arm | lead changes | held passes | longest hold |
| --- | --- | --- | --- |
| `0.03` *(half)* | **+7.0%** — 10/0, p = 0.002 | +2.1% | **−3.5%** — 1/9, p = 0.021 |
| `0.12` *(double)* | **−1.7%** — 1/8, p = 0.039 | **−2.7%** — 1/9, p = 0.021 | −1.4% |

**LESS chaos steer gives MORE lead changes and a SHORTER leader hold; MORE gives fewer.** Both
directions are sign-consistent and they point opposite ways, so this is a direction, not noise — but
only the `0.03` arm clears the 5% size bar, and the `0.12` arm's effects are ~2%.

**The sign is the finding, and it is contrary to the key's name.** Steering the field harder during
chaos does not buy front action; it costs a little. *(Consistent with ACTION-KEYS-1's note that this
key is saturated, and stronger: it is saturated on the high side and mildly inverted.)*

### 6d. ★ `b2AttackHeroes` — more attackers make the field TIGHTER and the passes FEWER

| arm | held passes | top-5 spread at 0.90 | longest hold | leader→P2 at the line |
| --- | --- | --- | --- | --- |
| `0` *(shipped 3)* | +3.0% (9/1, p = 0.021) | +9.1% | **−8.2%** — 0/10, p = 0.002 | +13.5% |
| `6` | **−5.2%** — 1/9, p = 0.021 | **−8.4%** — 1/9, p = 0.021 | +4.1% | −6.2% |

**Doubling the attackers tightens the front group by 8% and costs 5% of the held passes.** Removing
them entirely shortens the leader's longest hold by 8%.

**★ THIS IS NOT A CONTRADICTION OF THE KEY'S OWN RECORD, AND THE DIFFERENCE MATTERS.**
`defaults.js` records this key as shipping at 3 for **"+21% top-5 OUTCOME action vs the no-attacker
floor"**. That figure is measured over the **OUTCOME** window by `outcome-front-battle.mjs`. **None of
this piece's five quantities is that measure** — `heldTop5Overtakes` is the PULK window, and the two
gap quantities are checkpoints. So these numbers describe a *different window* and do not test the
claim the key was shipped on. **They say the attackers are not free elsewhere in the race**, which is
a new fact beside the old one rather than against it.

---

## 7. The levers that change the race and move nothing readably

Reported as such and, per the piece's own rule, **given no larger run**. All of these change the race
— the signature differs on all ten tracks — so these are not blind cells; they are keys that move
none of the five quantities by 5% with a consistent sign.

| lever | arms | the largest single move |
| --- | --- | --- |
| **`choreoIntensity`** | 0.3, 0.9 | top-5 spread −4.0% (p = 0.021) at 0.3; nothing else past 3% |
| `pulkFrontPool` | 4, 16 | lead changes −2.5% at 4 (0/9, p = 0.004 — real sign, tiny size). **At 16 the race is IDENTICAL on 3 of 10 tracks** — the pool already exceeds those tracks' front group |
| `pulkBiasGain` | 1, 4 | nothing above 1.4%, no p ≤ 0.05 |
| `pulkLeadRotationDropDepthLengths` | 4, 16 | nothing — despite `defaults.js` calling it *"the depth lever"* |
| `pulkLeadRotationOutsiderMaxReachLengths` | 8, 30 | nothing |
| `gapRerollStrength` | 0.5, 2 | nothing |
| `gapRerollThresholdLengths` | 0.25, 1 | nothing |

**★ `choreoIntensity` IS THE ONE TO NOTICE.** `defaults.js` calls it *"the future Action-slider
backing"* — it is the key the dial was expected to be built on — and on all five quantities, in both
directions, over ten tracks at N = 30, **it does not move the action.** It changes the race; it does
not change how much is happening in it.

**The two gap-reroll keys are an expected null and are recorded as one.** ACTION-KEYS-1 established
that gap-reroll's transform is gated on `phaseProgress ≥ corridorStart`, which is disjoint from the
`--front-action` window — so three of these five quantities could not have seen it. The two
`--gap-metrics` quantities CAN see past that boundary (0.90 and at-the-line) and they show nothing
either, which is the part that is new here.

---

## 8. ★ What the partial version of this report got wrong

Recorded rather than quietly overwritten, because it is the same class of error this chain keeps
finding in other people's documents.

An earlier revision was written while the sweep was still running and said **five levers were
complete and nine were not reached**. It also said `pulkEnvelopeMaxEffect` was inert *"at half and at
double"* when the double arm had reached **two tracks**, not ten — caught by re-reading the run's own
journal rather than trusting the analyser's roll-up, and corrected before it was pushed. **The run
then finished, and both halves of that claim are now true on all ten tracks.**

**The lesson is the roll-up, not the impatience:** an analyser that averages whatever rows exist will
happily present a 2-track arm and a 10-track arm in one table. The per-arm track count is printed on
every row of the raw analysis for exactly that reason, and it is what caught this.

## 9. Source hygiene

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
