# Two-part diagnostic — browser seed truth + chase-suppression at small G

Read-only measurement. No sim behavior was changed; the only source edits are additive telemetry
counters (branch-fire split) in `racePlanner.js` plus their aggregation in `sim-fairness.mjs`.
Default fingerprint re-verified after the edits: **`COMBINED 72c3360fb75225ef`** — byte-identical
to the known default. Facts only; fixes are separate, owner-approved steps.

---

## PART A — Why the browser always says "Seed: 1"

### A1. Is the displayed seed the ACTUAL seed of the race dynamics?

**No. It is the RACE-PLAN seed only, and it is neither stale nor hardcoded.**

The HUD badge is drawn at [index.jsx:1711](client/src/screens/RaceScreen/index.jsx#L1711):

```js
ctx.fillText(`Race Plan: ON  seed:${racePlanSeed}`, CANVAS_W - 168, 24);
```

`racePlanSeed` comes from the race payload — [index.jsx:681](client/src/screens/RaceScreen/index.jsx#L681),
`raceData.racePlanSeed ?? 0`, read out of `sessionStorage['activeRace']`
([index.jsx:341](client/src/screens/RaceScreen/index.jsx#L341)). The value is genuinely written by
Quick-Test ([SetupScreen.jsx:472](client/src/screens/SetupScreen/SetupScreen.jsx#L472),
`racePlanSeed: quickTestSeed`).

It reads "1" because the Quick-Test seed field defaults to `1`
([SetupScreen.jsx:349](client/src/screens/SetupScreen/SetupScreen.jsx#L349),
`useState(1)`), it is plain component state with no persistence, and the owner never changes it.
So the label is *technically true* — that really is the plan seed — but it is **misleading**,
because the plan seed does not determine the race.

### A2. Are browser races seed-deterministic at all today?

**No.** The seed fixes the *plan* (who is supposed to finish where, band targets, hero casting);
it does not fix the *dynamics*. The dynamics are drawn from **unseeded global `Math.random()`**.

Seeded (mulberry32, driven by `racePlanSeed`):

| site | what it seeds |
|---|---|
| [racePlanner.js:125](client/src/modules/racePlanner.js#L125) | plan generation (target ranks, area bonuses) |
| [racePlanner.js:380](client/src/modules/racePlanner.js#L380) | trajectory-controller draws (`plan.seed + 0x9e3779b9`) |
| [heroCurveGenerator.js:223/375/534](client/src/modules/heroCurveGenerator.js#L534) | hero casting / attacker timing |

Unseeded `Math.random()` — **this is the race**:

| site | what it decides |
|---|---|
| [index.jsx:606](client/src/screens/RaceScreen/index.jsx#L606) | initial `spreadFactor` of every racer → `baseSpeed` — the core luck draw |
| [index.jsx:609](client/src/screens/RaceScreen/index.jsx#L609) | initial re-roll jitter → first `nextRollTime` |
| [index.jsx:1108](client/src/screens/RaceScreen/index.jsx#L1108) | **every scheduled `spreadFactor` re-roll** (`rawSample`) during the race |
| [index.jsx:1151](client/src/screens/RaceScreen/index.jsx#L1151) | per-roll jitter → next roll time |
| [rowLayout.js:186](client/src/modules/rowLayout.js#L186) | start-row assignment — `computeEvenRowLayout(nRacers, rowCount)` is called at [index.jsx:527](client/src/screens/RaceScreen/index.jsx#L527) **without an `rng` argument**, so it falls back to `Math.random` |

(Plus camera, overlay-text and particle draws, which have no effect on the sim.)

That fully explains the owner's observation: the HUD is pinned at 1 while every race differs.
No empirical replay is needed to establish it — with `spreadFactor`, every re-roll, and the start
rows drawn from an unseeded generator, two runs at the same seed **cannot** replay identically.
The plan is identical across those runs; the race that plays out on top of it is not.

Note also that the **normal "Start Race" path is unseeded even at plan level** —
[SetupScreen.jsx:411](client/src/screens/SetupScreen/SetupScreen.jsx#L411) hardcodes `racePlanSeed: 0`,
and `seed > 0` is the condition for using mulberry32 at all
([racePlanner.js:125](client/src/modules/racePlanner.js#L125)).

### A3. Where does the seed come from, and what is the smallest fix?

**Source:** exactly one — the Quick-Test number input
([SetupScreen.jsx:1091-1099](client/src/screens/SetupScreen/SetupScreen.jsx#L1091), range 0…9999,
default 1). No URL parameter, no settings entry, no counter, no per-race random draw. It resets to
1 on every reload, which is why it is effectively a constant.

**How the sim gets determinism** (the pattern that already works):
[sim-fairness.mjs:602-603](scripts/sim-fairness.mjs#L602) swaps the global generator for the whole
race and restores it in a `finally` at [:2556](scripts/sim-fairness.mjs#L2556):

```js
const savedRandom = Math.random;
if (seed > 0) Math.random = makePRNG(seed);
```

Because the sim's draw sites are line-for-line twins of the browser's, that one substitution makes
all of them deterministic. The sim additionally seeds the start-row shuffle explicitly
([sim-fairness.mjs:2967-2971](scripts/sim-fairness.mjs#L2967)).

**Smallest change (NOT implemented — separate owner-approved step):**
in the race-init effect of [client/src/screens/RaceScreen/index.jsx](client/src/screens/RaceScreen/index.jsx),
*before* the `computeEvenRowLayout` call at [:527](client/src/screens/RaceScreen/index.jsx#L527),
adopt the sim's proven substitution: when `racePlanSeed > 0`, replace `Math.random` with
`mulberry32(racePlanSeed)` (already exported from
[racePlanner.js:22](client/src/modules/racePlanner.js#L22)) for the lifetime of the race and restore
the original in the effect's cleanup. That single edit makes `:527`, `:606`, `:609`, `:1108` and
`:1151` deterministic in one stroke — the HUD number at `:1711` then *is* the true seed of the
dynamics, and re-entering it re-runs the race. It also brings the browser onto the same determinism
mechanism the sim is already validated on.

Two optional follow-ups, only worth doing once the above exists:
- persist / URL-parameterise the Quick-Test seed field so it is not always 1;
- decide whether the normal "Start Race" path should draw a random seed and display it (so any race
  the owner happens to like can be replayed) instead of the current hardcoded `0`.

---

## PART B — Chase-suppression at small G: hypothesis **partly confirmed, but not in outcomes**

Setup: searound + mountainstreet, default racer each, N=50, 60s, fixed baseline seeds 1–50, three
arms — OFF / G15 (symmetric, G=1.5, strength=1.0 — the confirmed candidate) / G075 (symmetric,
G=0.75, strength=1.0 — the owner's slider setting).

**STOP gate PASSED.** OFF reproduced the known per-track baselines on exactly these seeds
(searound 14/50, mountainstreet 10/50 runaway — identical to the V0 first-50-seed subset of the
N=200 confirmation run).

### B1. The mechanism is real and it scales as predicted

The `gapBehind > G` branch does return before the `gapAhead > G` check
([racePlanner.js:952-964](client/src/modules/racePlanner.js#L952)), and the suppressed case is
measurable — DOWN-tilts applied to a racer whose gap to the racer **ahead** already exceeded its gap
to the racer **behind**:

| track | OFF | G15 | G075 |
|---|---|---|---|
| searound | 0 | 27 (7.1% of DOWN-tilts) | **188 (15.6%)** |
| mountainstreet | 0 | 18 (6.2%) | **111 (12.4%)** |
| **pooled** | **0** | **45** | **299 — 6.6× G15** |

So the smoking gun fires exactly as the hypothesis said: ~0 at G=1.5, large at G=0.75. Lowering G
roughly triples total DOWN-tilts (670 → 2099) and multiplies the *misdirected* ones by 6.6× — the
suppressed share more than doubles (6–7% → 12–16%). The branch-ordering asymmetry is confirmed.

Where they land also matches: at G=0.75 the mean `gapBehind` at a DOWN-tilt drops to ~1.45–1.49L
(from ~2.4L at G=1.5) while mean `gapAhead` stays ~0.6L — i.e. the tilt increasingly fires on racers
that have merely stretched a normal pack gap behind them, not on genuine escapees.

### B2. But the predicted OUTCOME — escapes growing vs OFF — does **not** happen

| track | metric | OFF | G15 | G075 |
|---|---|---|---|---|
| searound | runawayWinnerRate | 28.0% | 16.0% | **14.0%** |
| searound | mean escape gap @0.90 | 2.55L | 1.80L | 1.91L |
| mountainstreet | runawayWinnerRate | 20.0% | 6.0% | **8.0%** |
| mountainstreet | mean escape gap @0.90 | 2.18L | 1.63L | 1.58L |
| **pooled mean** | **runawayWinnerRate** | **24.0%** | **11.0%** | **11.0%** |

G075 does not grow escapes relative to OFF — it cuts them by the same pooled amount as G15
(24.0% → 11.0% for both arms), and mean escape gap at 0.90 falls under both. Per track the two arms
straddle each other within N=50 noise (searound: G075 better; mountainstreet: G15 better). At this
sample size the outcome difference between G15 and G075 is not resolvable.

The reason the suppression does not show up in outcomes: 77% of the misdirected DOWN-tilts land on
the **pack** (rank 6+ — 933 of 1207 total DOWN-tilts on searound at G=0.75, 700 of 892 on
mountainstreet), where they cost nothing that the runaway metric measures. DOWN-tilts on genuine
chasers (P2–P5) stay a minority at both settings (188 and 119 respectively), and the leader itself
still gets tilted down more often in absolute terms at G=0.75 (86 / 73 vs 43 / 39) — the intended
effect scales up alongside the unintended one and evidently outweighs it.

### Verdict

**The structural claim is CONFIRMED; the consequence claim is REFUTED at this sample size.**
The branch ordering does misdirect DOWN-tilts at small G, 6.6× more than at G=1.5, and the effect
grows exactly where predicted. But it does not suppress the chase enough to matter: at G=0.75 the
runaway rate is not worse than OFF and not distinguishable from the confirmed G=1.5 candidate. The
misdirection is overwhelmingly a *pack* phenomenon, not a *front-of-race* one.

Consequently, if the owner's slider at 0.75 feels wrong in an eye-test, this branch ordering is
**not** the established cause — the numbers do not support it. What the data does support is that
G=0.75 buys nothing over G=1.5 while tripling the number of rolls the mechanism touches (2099 vs 670
DOWN-tilts), i.e. it is a strictly more invasive setting for the same outcome. Whether that extra
invasiveness is visible in motion is an eye-test question, not one this run can answer.

---

## Verification

- **No sim-behavior change.** Source edits are additive telemetry only (branch-fire counters in
  `racePlanner.js` + their aggregation in `sim-fairness.mjs`); no returned draw is affected.
  Default fingerprint after the edits: `COMBINED 72c3360fb75225ef` — matches the known default.
- **STOP gate:** OFF reproduced both known per-track baselines exactly (see B).
- **Determinism:** the searound arm set was re-run from scratch into a separate output directory;
  the per-seed CSVs are byte-identical to the first run (see `DETERMINISM.md`).

## Data

- `PART-B.md` — the generated Part-B tables (source of the numbers above)
- `per-arm-track.csv` — per-(arm, track) aggregates including all branch-fire counters
- `races-<arm>-<track>.csv` — per-seed records (runaway / parade / gap@0.90 / within3)
