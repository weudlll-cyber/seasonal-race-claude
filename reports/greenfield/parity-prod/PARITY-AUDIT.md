# SIM / BROWSER PARITY AUDIT — the eye and the sweep disagree systematically

> **Partly resolved 2026-07-23.** Row 11 (grid seeding) is fixed by parity step 2a (plan-grid unification); parity step 1 fixed the RNG-stream coupling. See [reports/parity/DIVERGENCE-AUDIT.md](../../parity/DIVERGENCE-AUDIT.md) and [reports/BASELINE-INVALIDATED.md](../../BASELINE-INVALIDATED.md). Absolute numbers below are the pre-unification baseline.

**Owner STOP.** Three Quick-Test races watched to the end with G=0.75 (city-circuit 9443, searound
8835, mountainstreet 1736): **one overtake total**, no top-rank action, field strung out at the line.
Under the stored A8 finale numbers (deadFinale 15.8%) three dead finales in a row is < 1% — systematic,
not luck. All ship steps held.

---

## Part 1 — Effective-configuration diff (verified at source)

| # | Row | Owner's Quick-Test (as played) | Sweep / A8 / finale numbers | Verdict |
|---|---|---|---|---|
| 1 | **Field size** | **OWNER-CONFIRMED: 40 on CLOSED tracks, 60 on OPEN tracks.** (The Quick-Test control defaults to 20 — `SetupScreen.jsx:354` — but the owner sets it per race, so the default is irrelevant here.) | **40 everywhere** (`--racers` default, `sim-fairness.mjs:177`). All sweeps ran 40. | **closed: SAME (40 = 40)** · **open: DIFFERENT (60 vs 40)** |
| 2 | **Racer composition** | ONE type for the whole field: `effectiveTypeId` = Quick-Test selector, else `track.defaultRacerTypeId` (`SetupScreen.jsx:450-455`); one `speedMultiplier` for the race (`RaceScreen/index.jsx:425`). | ONE type per combo, pinned by `--racer`; all racers that type. | **SAME** (structure). Which type is UNKNOWN if the owner used the selector. |
| 3 | **Nominal duration** | `raceDefaults.duration` = **60 s** (`defaults.js:10`). | `--dur=60`. | **SAME** |
| 4 | **Laps (closed tracks)** | `lapsFromDuration(60)` = **2 laps**. | Same helper, same bucket → finishT = 2.000 (verified on city-circuit). | **SAME** |
| 5 | **Realized duration** | Stretched by `expectedMinSF × speedMultiplier × closedSsf`; `expectedMinSF` depends on field size. At n=20 → 0.926407. | Same formula at n=40 → 0.922628. | **DIFFERENT but negligible — ratio 1.0041 (+0.4%)** |
| 6 | **Race plan active?** | Gated: `racePlanEnabled = estimatedDurationSec >= racePlanMinDurationSec (30)`. At 60 s and above → **ON**. | `--race-plan` defaults true → ON. | **SAME** |
| 7 | **What the DevScreen G control changes** | Writes **only** `gapRerollThresholdLengths` (`DynamicsTuningSection.jsx:1073-1077`, range 0.5–4.0 step 0.25 → 0.75 is valid). | `--gapRerollThresholdLengths`. | **SAME** |
| 8 | **What the G control does NOT change** | Leaves `gapRerollEnabled`, `gapRerollMode`, `gapRerollStrength` at their stored/default values (separate controls). | Set explicitly per arm (`enabled=true, mode=symmetric, strength=1.0`). | **SAME by default; UNKNOWN if the owner's stored config differs** |
| 9 | **Gap-reroll actually applied in the browser?** | **Yes** — `computeGapBiasedTarget` is called in the live re-roll path (`RaceScreen/index.jsx:1148-1149`), gated on `gapRerollEnabled`. Config threaded into `createRacePlan` at `:758-762`. | Same shared function. | **SAME** |
| 10 | **Other dynamics values** | `loadRaceDynamicsConfig()` = `{...DEFAULT_RACE_DYNAMICS_CONFIG, ...stored}` — **localStorage overrides silently win**. Cannot be read from here. | Flagless sim = `DEFAULT_RACE_DYNAMICS_CONFIG` exactly. | **UNKNOWN — top residual risk** (see below) |
| 11 | **Grid seeding** | One `assignmentByRacer`, drawn from `mulberry32(typedSeed)`; used for **both** start positions and the plan. | Plan grid from `makePRNG(comboLayoutSeed(track, racer, GLOBAL_SEED))` — constant across the batch. | **DIFFERENT (known)** |
| 12 | **Plan grid vs actual grid** | Single grid — plan and actual agree by construction. | **Two independent grids**; plan `startRowIndex` carries ~zero information about the actual start row (71.9% differ; matches `1 − 1/rows`). | **DIFFERENT (known, finding 1c)** |
| 13 | **Plan racer ordering** | `planRacers` ordered by **racer index**. | `planRacers` ordered by **grid position**. | **DIFFERENT (known)** — changes which racer gets which target rank |
| 14 | **Seed space** | Typed seed → `mulberry32` for the whole race. | Per-race seed `(globalSeed−1)·N + raceIdx + 1`. | **DIFFERENT (known)** — same number ≠ same race |

### The residual unknowns, stated plainly

- **Row 10 is the one that could invalidate this whole audit.** The browser merges *stored* DevScreen
  values over the defaults, so if the owner's localStorage carries settings from earlier experiments
  (choreo boundaries, contest window, headroom, strictness, a stale `gapRerollEnabled: false`, …), the
  browser is running a configuration nobody has measured. **Recommended before anything ships: export
  or screenshot the owner's full DevScreen dynamics config so row 10 can be closed.**
- Rows 2 and 1: if the owner changed the Quick-Test racer selector or the count, those differ from what
  is measured below.

### Which single row should move the finale metrics most

**A hypothesis I had to discard.** My first candidate was field size, on the assumption the owner ran
the Quick-Test default of 20 against the sweep's 40 — halving traffic would weaken the physics tax
(σ = 48%) that keeps the field compressed, letting speed differences integrate into exactly the
strung-out field the owner describes. **The owner confirmed he runs 40 on closed and 60 on open.**
That kills it for the two closed tracks: city-circuit and searound were watched at *precisely* the
field size the sweeps measured. Field size cannot explain those two races, and it is the wrong lever
to reach for. It survives only as a partial factor for mountainstreet (60 vs 40, i.e. *more* traffic,
which should make the field *more* compressed, not less — the opposite of what was seen).

**So the live candidates, ranked, are:**

1. **Row 10 — the owner's stored DevScreen config (UNKNOWN).** The browser merges localStorage over
   the defaults, so any setting left over from earlier experiments silently wins. This is the only row
   that could change the mechanism wholesale, and it is the only one I cannot inspect from here.
2. **Row 13/11 — plan racer ordering + grid seeding.** These change *which racer is assigned which
   target rank*, i.e. the entire dramaturgy, in a way that differs between the two tools. They are
   invisible in paired sim-vs-sim comparisons (both arms share them) but are exactly the kind of thing
   that makes a browser race feel different from the measured distribution.
3. **city-circuit itself — never measured, on any arm, at any field size.** It is closed, 2 laps,
   `motorbike` (the fastest racer type in the roster). Part 2 measures it for the first time.

Part 2 therefore measures the owner's tracks at the owner's field sizes; if the sim stays lively there,
the divergence is in the bridge (rows 10–14), not in the configuration.

---

## Part B — Sim at the owner's exact configuration

4 arms × 4 tracks × N=100, **owner field sizes (40 closed / 60 open)**, dur 60 s, identical paired
seeds. `OWNERCFG` = the export verbatim; `OWNERCFG-NOPACK` = identical but `packReleaseEnabled=false`
(the isolating pair). city-circuit is measured here for the first time.

| arm | finale lead chg | distinct | dead finale | duoEscape | front @line | leader→median | band-reach | runaway | parade |
|---|---|---|---|---|---|---|---|---|---|
| **PROD-G075** (defaults + G=0.75) | 1.86 | 2.80 | 13.5% | 4.0% | 4.84 | 11.0 L | 75.0% | 4.8% | 1.0% |
| PROD-G15 (live today) | 1.69 | 2.65 | 16.3% | 5.0% | 4.06 | 11.8 L | 74.7% | 7.8% | 1.8% |
| **OWNERCFG** (your world) | 1.74 | 2.68 | **17.8%** | **6.5%** | 4.08 | 11.3 L | 73.1% | **8.3%** | **3.0%** |
| **OWNERCFG-NOPACK** | **1.89** | **2.83** | **14.8%** | **3.5%** | **4.72** | **10.8 L** | **75.7%** | **4.5%** | **1.0%** |

### The isolation: `packReleaseEnabled` true → false (everything else identical, same seeds)

| metric | OWNERCFG | OWNERCFG-NOPACK | change |
|---|---|---|---|
| finale lead changes | 1.74 | 1.89 | **+0.15** |
| distinct leaders | 2.68 | 2.83 | +0.15 |
| deadFinaleRate | 17.8% | 14.8% | **−3.0 pp** |
| duoEscapeRate | 6.5% | 3.5% | **−3.0 pp (nearly halved)** |
| front group at line | 4.08 | 4.72 | **+0.64 racers** |
| leader→median | 11.3 L | 10.8 L | **−0.50 L (tighter)** |
| band-reach | 73.1% | 75.7% | +2.6 pp |
| runaway | 8.3% | 4.5% | **−46%** |
| parade | 3.0% | 1.0% | **−67%** |

Every metric moves the right way together, on all four tracks. **`packReleaseEnabled: true` is the
responsible key**, and it is costly: it cancels the entire G=0.75 benefit (`OWNERCFG` lands on the
*live default*'s front-group, 4.08 vs 4.06, instead of the improved 4.84) and adds runaway and parade
on top.

**`b2AttackFinalRank: 10` is confirmed near-inert.** `OWNERCFG-NOPACK` still carries it and matches or
beats `PROD-G075` (which has the shipped 7) on every metric — 1.89 vs 1.86 lead changes, 4.5% vs 4.8%
runaway, 75.7% vs 75.0% band-reach. It needs no action beyond tidiness.

### A candidate I checked and refuted

The browser computes `rowCount` inline from the auto-scaled `physicalSpriteSize`, while
`computeRacerLayout` (which the sim uses) computes it from `minSpriteSize` — different formulas, which
would change grid geometry and therefore traffic. **They agree on all four of the owner's configs**
(city-circuit 4, searound 7, mountainstreet 3, dirt-oval 4). Validated against ground truth: the sim's
own per-combo header prints `rows=7` for searound, matching. Not a divergence here.

---

## Part C — Verdict

### 1. Does OWNERCFG reproduce what the owner saw?

**Partly — the drift is real and named, but it is not sufficient.**

- **Named:** `packReleaseEnabled: true`, isolated cleanly by the arm pair above. It is the shelved
  pack-only strictness release (pack racers inside their band get servo strictness 0 — free natural
  speed, no rank pinning), shelved default-OFF after the measured endgame-runway failure. "Field roams
  free late" is exactly the reported symptom, and the numbers confirm it: +46% runaway, 3× parade,
  −0.64 racers at the line.
- **Not sufficient:** even at `OWNERCFG`, deadFinaleRate is 17.8%, so three dead finales in a row is a
  **~0.6%** event — barely worse than the ~0.4% at shipped defaults. And `OWNERCFG` predicts **~1.74
  late lead changes per race**, i.e. roughly five across three races, against the one overtake observed.

**Two honest caveats on that residual, both of which weaken it:**
1. **n = 3.** Three races is a very small sample; 0.6% is unlikely but not impossible, and the sweep is
   the wrong instrument for adjudicating three observations.
2. **The observed and measured quantities are not the same thing.** "One overtake I noticed across
   three races" is not `leadChangeCount` in `[0.90, 1.0]`. A lead change at 0.93 that is immediately
   taken back may not register to the eye as an overtake at all, and mid-race passes outside the
   finale window are not counted by this metric in either direction.

So the residual is *suggestive of* a browser↔sim divergence, not proof of one. The known bridge
divergences (plan racer ordering, grid seeding, the plan-vs-actual grid split) remain the ranked
candidates if it turns out to be real — with the honest note that the first two are random-permutation
relabelings that should not shift aggregate distributions, while the **plan-vs-actual grid split is the
one with a directional effect**: the sim aims the PULK cohesion bias at essentially random racers,
whereas the browser aims it at the true middle field.

**Cheapest decisive check (recommended before any engineering):** reset `packReleaseEnabled` to
`false`, then run **15–20 Quick-Tests** and count dead finales. If the rate lands near 13–15%, config
drift was the whole story and the residual was small-sample noise. If it stays visibly dead, the bridge
divergence is real and a single-seed per-frame trace (browser vs sim on identical authored inputs) is
the next step. This costs no engineering and distinguishes the two branches decisively.

### 2. What would the owner's game look like on pure shipped defaults + G=0.75?

That is the `PROD-G075` arm: **the best of all four**. Versus the live default (`PROD-G15`), at the
owner's own field sizes and tracks: **+0.17 late lead changes, −2.8 pp dead finales, +0.78 racers
within 3 L at the line, a 0.8 L tighter field, −39% runaway, −43% parade**, with band-reach unchanged
(75.0% vs 74.7%, both comfortably over the ≥70% gate). This independently reproduces the earlier A8
result at product configuration, including on city-circuit which had never been measured.

### 3. Recommended owner action

**Reset, in the DevScreen:**

| key | from | to | why |
|---|---|---|---|
| **`packReleaseEnabled`** | `true` | **`false`** | **The one that matters.** Restores the shipped default and recovers the whole G=0.75 benefit; halves runaway, thirds parade. |
| `b2AttackFinalRank` | `10` | `7` | Near-inert under band-arrival, but restores parity with the measured world. Tidiness. |
| `gapRerollDevMarker` | `true` | `false` | Inert diagnostic; off is the shipped state. |
| `gapRerollThresholdLengths` | `0.75` | *keep 0.75* | It measures better than 1.5 on every metric — **but this is the pending ship decision, still yours and still held.** |

**Backlog (both justified by this incident):**
1. **A "reset to shipped defaults" control in the DevScreen.** There is currently no way to get back to
   a known state except editing keys individually, which is how a single stale key survived unnoticed
   and silently invalidated an eye-test.
2. **A config-fingerprint display in the HUD** — a short hash of the effective dynamics config, plus an
   explicit "N keys differ from defaults" badge. This incident cost a full audit cycle to discover one
   drifted boolean; a badge would have surfaced it in seconds, and it makes every future eye-test
   self-describing.

Data: `prod-arms.csv` (pooled), `prod-arm-track.csv` (per arm × track), `prod-per-seed.csv` (all 1600
races), `meta.json` (exact flags per arm). Owner export: `../owner-config/owner-world.json`; Part A
diff: `../owner-config/PART-A-DIFF.md`.
