# The speed-150 re-baseline — morning report

**Autonomous overnight run, 2026-07-25.** One document. It ships the staged speed-150 world (STEPs 1–3),
resolves the long-standing [reports/BASELINE-INVALIDATED.md](../BASELINE-INVALIDATED.md) with the single
full re-baseline the owner's speed pick was waiting on, mints the new shipped-default fingerprint pair,
and — on the committed honest world — screens whether the shipped gap-reroll knobs (G=0.75, s=0.5) still
sit at their optimum. No owner input was available; every choice is recorded with its reason. Nothing was
tuned or shipped from the G/s sweep — it MEASURES; the owner decides in the morning.

---

## 0. What shipped (STEPs 1–3, staged → committed together)

The owner's speed pick landed on **`normalSpeedPxPerSec = 150`** (down from the provisional 225) — a
calmer, more readable pace chosen by eye after the speed-candidate sweep (the faster 225/270 arms raised
runaway; see [STEP-ORDER-ARC.md](STEP-ORDER-ARC.md) §3). Three staged workstreams shipped together in one
commit so the gate, the fingerprint and the docs all describe the same committed state:

- **STEP 1 — the pace pick (150 px/s).** `DEFAULT_BASE_SPEED_CONFIG.normalSpeedPxPerSec` 225 → 150
  ([defaults.js](../../client/src/modules/storage/defaults.js)); the comment now records 150 as the
  owner's shipped pick and points here. Test anchors moved to 150 (`baseSpeedConfig.test.js`,
  `durationModel.test.js` derive from `V` so they follow the constant), and the two parity winner-anchors
  were re-pinned to the 150 outcome (the equality/hash checks are the real guarantee; the winner index is a
  concrete anchor and a different pace consumes the re-roll stream differently, so the finishing order
  moved): `goldenEquality.test.js` seeds 1/7/42 → winners {38, 17, 7}; `replay.test.js` seed 7 order →
  Surge 1st / Gale 3rd.
- **STEP 2 — "Reset All Defaults" ↔ badge alignment.** New single source of truth
  [`raceRelevantReset.js`](../../client/src/screens/DevScreen/sections/raceRelevantReset.js): the Race
  Tuning card's master reset restores EXACTLY the five RACE-RELEVANT blocks (raceDynamics, raceBehavior,
  rowLayout, baseSpeed, autoScale) — the same blocks the HUD badge's race count is computed over — and
  deliberately leaves the two COSMETIC blocks (camera, frameTiming) untouched. Invariant pinned in
  `raceRelevantReset.test.js`: after the reset `splitConfigDiffs(...).race.count === 0`, so the badge reads
  grey "0 race" by construction and the button and badge can never disagree. (Before this the button reset
  frameTiming — cosmetic — and missed autoScale — a race block; both corrected.) Documented in
  [DEVSCREEN-INVENTORY.md](../../docs/DEVSCREEN-INVENTORY.md) §0.
- **STEP 3 — speed-source capture, realigned to the shared step.** The `--speed-source` diagnostic's
  per-racer FACTOR decomposition (baseSpeed/boost/brake/… product) was retired when Pass-2 moved inside
  `stepRacePhysics` (it needed a pre-advance snapshot that no longer exists). The SATURATION view the
  runaway diagnostics need is still measurable between steps from `trajectoryMult` (servo output) and
  `spreadFactor` (natural draw), which persist on each racer — observe-only, it never steers, and the
  block runs ONLY under `--speed-source`, so the shipped-default byte-identity fingerprint (measured
  without the flag) is untouched by construction.

**Default-duration table at 150 px/s** (canonical per-track default; `deriveRaceDuration`, exact):

| track | topo | racer (M) | laps | realized duration | paceScale | slowdown |
|---|---|---|---|---|---|---|
| luger-hill | open | luge (1.1) | 1 | **59.0 s** | 1.000 | no |
| mountainstreet | open | boarder (1.0) | 1 | **60.0 s** | 1.000 | no |
| searound | closed | manta (1.1) | 2 | **62.4 s** | 1.000 | no |
| dirt-oval | closed | horse (1.0) | 2 | **87.2 s** | 1.000 | no |

`paceScale = 1` on every track — no open track is forced into a uniform slowdown at 150. The slower pace
lengthens every race vs the 225-era numbers (as designed).

---

## 1. The re-baseline gate — the single full re-measure

**This resolves [reports/BASELINE-INVALIDATED.md](../BASELINE-INVALIDATED.md).** That note held every
absolute sim figure as provisional history through two engine moves (the plan-grid unification / D-GRID
and the speed/duration ship) and the step-order alignment, explicitly deferring the single re-baseline
until the owner picked the normal speed. The pick is 150; this is that measurement.

**Method.** The shipped defaults, unmodified: 150 px/s, gap-reroll ON at the shipped default (G=0.75,
s=0.5), each track at its own canonical per-track default (`--track-defaults`: laps for closed, seconds
for open). The 4 standard gate tracks (`luger-hill`, `mountainstreet` open; `searound`, `dirt-oval`
closed) at their default racer types, owner-standard fields (40 closed / 60 open), **N=100 per track →
400 pooled races**, band-reach racer-row weighted. Driver:
[`scripts/exp-rebaseline-150.mjs`](../../scripts/exp-rebaseline-150.mjs). Read-only observers; no steering.
Machine-readable output: [`rebaseline-data/rebaseline-150.json`](rebaseline-data/rebaseline-150.json).

### Pooled (400 races), racer-row weighted

| metric | value |
|---|---|
| **band-reach (racer-row weighted)** | **71.0% — CLEARS 70%** |
| Holm-unfair start-row tracks | 3 / 4 |
| runaway / parade / duo | 12.8% / 2.5% / 4.8% |
| dead finales | 15.5% |
| front group @ line | 3.65 |
| finale lead-changes / distinct leaders | 1.80 / 2.77 |
| escape depth med / P90 / max (racer-lengths) | 2.19 / 4.59 / 10.15 |
| saturated-correction rate | 7.1% |
| mean derived duration | 67.2 s |

### Per track

| track | topo | N | band-reach | Holm | dead | front@line | runaway | parade | duo | escDep med / P90 | servoSat | dur |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| luger-hill | open | 100 | 68.1% | **UNF** | 7.0% | 3.60 | 15.0% | 3.0% | 6.0% | 2.26 / 4.09 | 6.4% | 59.0 s |
| mountainstreet | open | 100 | 70.0% | ok | 14.0% | 3.96 | 6.0% | 3.0% | 6.0% | 2.05 / 4.15 | 5.3% | 60.0 s |
| searound | closed | 100 | 72.5% | **UNF** | 22.0% | 2.82 | 19.0% | 3.0% | 4.0% | 2.41 / 5.48 | 9.2% | 62.4 s |
| dirt-oval | closed | 100 | 75.6% | **UNF** | 19.0% | 4.22 | 11.0% | 1.0% | 3.0% | 2.15 / 4.61 | 7.7% | 87.2 s |

### The 70% verdict — plainly

**PASS.** Pooled band-reach is **71.0%**, clearing the 70% bar at the shipped 150 config. This is the new
official baseline anchor. Two honest caveats, stated rather than buried:

1. **It clears by 1.0 pp, not comfortably.** `luger-hill` (68.1%) sits below 70% on its own and is the
   binding track; `mountainstreet` is exactly on the line (70.0%). The closed tracks carry the pool
   (72.5% / 75.6%). Post-alignment the sim runs the browser's genuinely different race, and the fairness
   anchor sits lower than the pre-alignment gate's 71.6% — this 71.0% is the honest current figure, not a
   regression to fix.
2. **Holm flags 3 / 4 tracks.** Per the project's fairness methodology, band-reach ≥ 70% is the pass gate;
   the Holm start-row flag is diagnostic context, not itself a fail (see
   [feedback: corrP1 is not a gate] and the fairness-gate methodology memory). `luger-hill` has been
   Holm-flagged at every speed measured (STEP-ORDER-ARC §3); this is a standing property of that track's
   start-row geometry, carried forward, not introduced by the 150 pick.

---

## 2. Duration-scaling pass — does the baseline hold when races run long?

Reduced N (**N=25 per track per duration**), the same four tracks, at protocol seconds **30 / 120 / 300**
(the 300 s shape is the long-race stress). Confirms the baseline is not an artefact of the ~60–87 s default
durations.

| dur | pooled band-reach | runaway | parade | dead | servoSat |
|---|---|---|---|---|---|
| 30 s | 65.8% | 21.0% | 2.0% | 27.0% | 7.8% |
| 120 s | 74.9% | 2.0% | 3.0% | 11.0% | 6.3% |
| 300 s | 76.8% | 0.0% | 0.0% | 8.0% | 5.7% |

Per-track detail is in the JSON; the pooled shape is the story.

**Reading.** Band-reach **rises monotonically with race length** (65.8 → 74.9 → 76.8%) and the endgame
**cleans up** as it lengthens — runaway collapses (21% → 2% → 0%), dead finales fall (27% → 11% → 8%),
saturated-correction eases (7.8% → 5.7%). This is the re-roll-density mechanism read forwards: a longer
race schedules more gap-rerolls, so its dice-free late window is a smaller share of the finish and a late
escapee is more likely reeled in. The **30 s stress dips under 70%** (65.8%) and spikes runaway/dead —
that is the known short-race failure mode, not a defect of the 150 pick. The shipped default durations
(59–87 s) sit **above** the 30 s stress and **below** the 120 s point, and the main gate at those canonical
defaults **clears 70% (71.0%)**. So: the baseline holds at the shipped durations and only strengthens as
races run longer. **A shorter series would be the risk, not a longer one** — worth remembering if a future
short-format mode is ever added.

---

## 3. Fingerprints — old → new (minted ONCE on the committed state)

The step-order alignment already moved the shipped-default fingerprints by design; the 150 pace moves them
again (the race the sim runs is genuinely different at a different speed). Per the binding rule in
[docs/SIM.md](../../docs/SIM.md), the pair below was computed EXACTLY ONCE per world, on the final
committed state (`scripts/fingerprint-default.mjs`, seed=1 races=3 `--track-defaults`, 10 standard tracks;
OFF = extra arg `--gapRerollEnabled=false`).

| World | Pre-150 (step-order alignment, 225) | **Post-150 (shipped, committed)** |
|---|---|---|
| ON (flagless) | `8b13ccbe96992cc0` | **`6fdfe851dbb4ca72`** |
| OFF (`--gapRerollEnabled=false`) | `e07150f936361a73` | **`f8f7d9c2fd3283e9`** |

_(Minted on commit `13b654d` — the speed-150 ship — and recorded here in the immediate docs-only
follow-up, per the once-only fingerprint rule: the docs commit cannot move a behaviour hash.)_

---

## 4. G/s optimum sweep on the honest 150 world (MEASUREMENT — owner decides)

Runs AFTER the speed-150 commit, on the shipped engine, via CLI flags only (no code change). Full protocol
and ranked table: [HONEST-WORLD-GS-SCREEN.md](HONEST-WORLD-GS-SCREEN.md). Summary:

__GS_SUMMARY__

---

## 5. Commit SHAs

__SHAS__

---

## 6. The owner's morning list

1. **Hard reload** the app (a stale bundle would invalidate the eye-check).
2. Dev Screen → Race Tuning → **Reset All Defaults**.
3. Confirm the HUD config badge reads grey **"0 race / N cosmetic"** (N = however many camera / frame-timing
   overlays you happen to have set — cosmetic drift is expected and fine; the RACE count must be 0).
4. Run **a few races on the series at 150 px/s** — eye-check the calmer pace and the finales.
5. **Then the backup-tag block** (post-ship anchor) — that comes from the planner, not this run; this run
   only cut the pre-tag `pre/speed-150-rebaseline` (return point BEFORE the ship).
6. **Only if the G/s sweep (§4) recommends a change:** the G/s decision. If §4 says shipped is optimal,
   there is nothing to decide — the knobs stay G=0.75, s=0.5.
