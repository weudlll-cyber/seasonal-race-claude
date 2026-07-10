# NIGHT SWEEP — GAP SPACE: the first honest measurement

**Date:** 2026-07-10 · **Branch:** `chore/sim-trust` · **Runner:** `scripts/night-sweep/run-gapspace.mjs`
**Frozen data:** `scripts/night-sweep/results/gap-space/{gm,hm,log}-ns2-<arm>-<track>.json`, `summary.json`, `status.jsonl`
**Analyzer:** `scripts/night-sweep/analyze-gapspace.mjs`

> **⚠️ STAMP: ASSUMED-DEFAULTS (PROVISIONAL).** Every cell ran without `--config world.json`; the world
> hash is `ASSUMED-DEFAULTS` (verified in each `hm-*.json` `meta.world`). Per the owner's own note, his
> exported browser world differs from shipped defaults in **four values** — so these numbers describe the
> owner's race **only if** his browser is at defaults, which has repeatedly not held. To bind them to his
> race: export `world.json`, re-run with `--config`, and the stamp becomes his world hash.

> **⚠️ RAW DISTRIBUTIONS ONLY. NO GATE, NO TUNING.** X / Y / Z and the dead-race threshold are the
> owner's to calibrate against a race he watches. Every `deadRaceFlag` / `visibleComeback` count below uses
> the **proposed** thresholds (X=2 s, Y=5 s, Z=1.5 s, deadGap=3 s) and is **provisional** — a label on a
> distribution, never a verdict. The underlying seconds are emitted so any threshold can be applied later.

---

## 1. Concept-check verdict — this is MEASUREMENT

**Confirmed in writing:** no shipped race module was modified. The only code touched is the measurement
harness `scripts/sim-fairness.mjs` (a sim script, not a shipped race module — the shipped modules live in
`client/src/modules/`). The gap-space observer is flag-gated behind `--gap-metrics` and **byte-neutral when
off**: all observer state and emission sit inside `if (gapMetrics)` guards
([sim-fairness.mjs:1811](../sim-fairness.mjs#L1811), [:2042](../sim-fairness.mjs#L2042),
[:3393](../sim-fairness.mjs#L3393)). The lateral
rule was never weakened.

Two in-spec gaps in the existing sampler were closed (byte-neutral, sim-only — see Autonomous Decisions):
the **0.25 checkpoint** was missing from `GM_CPS`, and the spec's **"front group vs field median over
time"** had no field-median sample. Both added; golden test still 5/5.

### Every observer, verified at source — window · units · population

All in [scripts/sim/observers/gap-metrics.mjs](../sim/observers/gap-metrics.mjs), wired in
[scripts/sim-fairness.mjs](../sim-fairness.mjs). "tv-gap" = how long ago the leader was where this racer is
now, read off the leader's own monotonic progress-vs-time trace (`gmTrace`, pushed every physics frame after
`advanceRacerT`, before the finish check — [sim-fairness.mjs:1811-1814](../sim-fairness.mjs#L1811)).

| Observer | Definition (file:line) | Window | Units | Population |
|---|---|---|---|---|
| `secondsBehindLeader` | [gap-metrics.mjs:65](../sim/observers/gap-metrics.mjs#L65) `max(0,(nowTs−leaderTsAtPosition)/1000)` | any frame | seconds | one racer |
| checkpoint `leaderGapToP2` | [sim-fairness.mjs:1837](../sim-fairness.mjs#L1837) sBL of 2nd-by-t racer | @0.25/0.50/0.75/0.90 leader progress | seconds | field, live order |
| checkpoint `top5Spread` | [:1838](../sim-fairness.mjs#L1838) sBL of 5th-by-t racer | same | seconds | field |
| checkpoint `fieldSpreadP10P90` | [:1839](../sim-fairness.mjs#L1839) p90−p10 of field sBL | same | seconds | whole field (N=40) |
| checkpoint `fieldMedianBehind` **(added)** | [:1840](../sim-fairness.mjs#L1840) p50 of field sBL | same | seconds | whole field |
| line `leaderGapToP2` / `top5Spread` | [gap-metrics.mjs:92](../sim/observers/gap-metrics.mjs#L92) `gapsAtLine` on sorted finish times | at the line | seconds | finishers |
| `inContentionFraction` | [:103](../sim/observers/gap-metrics.mjs#L103); accum [sim-fairness.mjs:1828](../sim-fairness.mjs#L1828) | frames **after chaos** (`raceProgress > pulkStartLive≈0.25`) | fraction ∈[0,1] | one racer, full post-chaos series |
| `maxBehindAfterChaosSec` | [sim-fairness.mjs:1827](../sim-fairness.mjs#L1827) running max sBL | post-chaos | seconds | one racer |
| `finalBehindSec` | [:2048](../sim-fairness.mjs#L2048) `r.finishTime − leaderFinish` | at the line | seconds | one racer |
| `visibleComeback` | [gap-metrics.mjs:113](../sim/observers/gap-metrics.mjs#L113) `maxBehind≥Y && finalBehind≤Z` | whole race | boolean (prov) | one racer |
| `deadRaceFlag` / `deadRaceFinalThirdOverFrac` | [:119](../sim/observers/gap-metrics.mjs#L119); series [sim-fairness.mjs:1819](../sim-fairness.mjs#L1819) leader→P2 gap | **final third** (`raceProgress≥2/3`) | boolean / fraction | field |
| **Context:** `bandReach`, `startRowUnfair` (Holm) | [sim-fairness.mjs:3191](../sim-fairness.mjs#L3191), [:3203](../sim-fairness.mjs#L3203) | whole run | fraction / boolean | pooled, N=100 races |

No cell measures the wrong thing. The golden test ([gap-metrics.test.mjs](../sim/observers/gap-metrics.test.mjs))
still proves rank metrics are blind to the bunched/strung difference these catch: **5/5 pass**.

---

## 2. Exact flag set · world stamp · effective forces

**Common (all 12 cells):** `--dur=60 --races=100 --seed=1 --race-plan=true --pulkBiasGain=2.0 --bonusMult=2.0
--baseSpeedMin=0.00096 --baseSpeedMax=0.00113 --gap-metrics --hero-map --skip-main-output`. Density = the
**shipped** speed range (±8.1%), not swept.

| Arm | Description | Distinguishing flags |
|---|---|---|
| **A** | v4-OFF reactive director — **the shipped default** | `--directorV4Enabled=false --governorDirectorEnabled=true` |
| **B** | v4-ON at shipped v4 defaults | `--directorV4Enabled=true --governorDirectorEnabled=false --directorV4Intensity=0.6 --directorV4PackBandStrictness=0.5` |
| **C** | v4-ON at **the owner's own settings** (he watched this) | `... --directorV4Intensity=0.9 --directorV4PackBandStrictness=0.8` |

**World stamp:** `ASSUMED-DEFAULTS` / schema v2 / provisional=true (all cells).
**Effective force list:** the t-update multiplier chain is single-source and identical browser↔sim after INFRA
4/5A — `t += baseSpeed·boost·brake·rowEnvMult·trajectoryMult·areaBonusMult·governorMult·dt`, finish-clamped
([docs/FORCE-PARITY.md](../../docs/FORCE-PARITY.md), verified there force-by-force; **no active divergence at
shipped config**). Effective knobs per cell are stamped in each `hm-*.json` `meta` (directorV4Enabled,
intensity, packBandStrictness, governorDirectorEnabled, pulkBiasGain=2.0, bonusMult=2.0, baseSpeed 0.00096–
0.00113). Under Arm A the governor runs and v4 is off; under B/C v4 runs and the governor is structurally
gated off (`racePlan && governorDirectorEnabled && !directorV4Enabled` — FORCE-PARITY row 17).

**Run health:** 12/12 cells, 0 errors, 100 races each (4,000 racer-slots/cell), seed=1 deterministic. Runner
finished in 1,112 s; **zero orphan processes** (verified: 0 `run-gapspace`/`sim-fairness` node processes
alive at exit; the runner tracks its own PIDs and kills-on-interrupt).

---

## 3. Raw distributions (percentiles, per arm per track)

Fairness context first — so a "fair" and a "dead" race sit in one table:

### 3.0 Context: band-reach + start-row (Holm) + win-bias χ²

| Track | band A / B / C | startRowUnfair A/B/C | nativeWinP A / B / C |
|---|---|---|---|
| searound (closed) | 78.0 / **82.2** / 82.5 % | T / T / T | 0.545 / 0.513 / **0.173** |
| dirt-oval (closed) | 78.6 / **83.9** / 81.9 % | T / T / T | 0.989 / 0.904 / **0.351** |
| mountainstreet (open) | 80.9 / **84.3** / 83.0 % | **F / F / F** | 0.951 / 0.822 / 0.822 |
| luger-hill (open) | 78.0 / **83.0** / 82.0 % | T / T / T | 0.480 / 0.407 / **0.087** |

Only **mountainstreet** passes the strict fairness definition (band ≥70% **and** startRow fair) in every arm.
v4-ON lifts band-reach +3–5 pts everywhere but does **not** fix the start-row bias on 3 of 4 tracks. Arm C
drives win-concentration up sharply (nativeWinP falls, e.g. luger 0.41→0.087).

### 3.1 Field MEDIAN seconds-behind-leader over time (p50 across 100 races)

| Track·Arm | @0.25 | @0.50 | @0.75 | @0.90 |
|---|---|---|---|---|
| searound A | 1.50 | 1.99 | **3.13** | 3.94 |
| searound B | 2.78 | 3.16 | **3.49** | 4.11 |
| searound C | 2.78 | 3.19 | **3.32** | 3.15 |
| dirt-oval A | 1.31 | 2.09 | **3.59** | 5.00 |
| dirt-oval B | 2.66 | 3.55 | **4.18** | 4.56 |
| dirt-oval C | 2.66 | 3.33 | **3.30** | 3.36 |
| mountainstreet A | 0.58 | 0.83 | **1.93** | 2.60 |
| mountainstreet B | 1.09 | 1.68 | **2.27** | 2.46 |
| mountainstreet C | 1.09 | 1.60 | **2.12** | 2.37 |
| luger-hill A | 1.15 | 1.46 | **2.31** | 3.06 |
| luger-hill B | 1.71 | 2.05 | **2.68** | 2.89 |
| luger-hill C | 1.71 | 1.90 | **2.25** | 2.47 |

*(B and C are identical at @0.25 by construction: v4 OUTCOME steering starts at `directorV4OutcomeStart=0.25`,
so the two settings have not yet diverged at the chaos boundary — a sanity check, not a bug. v4-ON strings the
field out **earlier and further** through mid-race than v4-OFF.)*

### 3.2 leader→P2 gap AT THE LINE (seconds)

| Track·Arm | p10 | p25 | p50 | p75 | p90 | max |
|---|---|---|---|---|---|---|
| searound A | 0.22 | 0.35 | 0.90 | 1.86 | 2.88 | 6.53 |
| searound B | 0.16 | 0.32 | 0.62 | 1.84 | 3.27 | 5.89 |
| searound C | 0.13 | 0.27 | 0.62 | 1.96 | 3.25 | 5.78 |
| dirt-oval A | 0.17 | 0.42 | 1.22 | 3.16 | 4.75 | 6.40 |
| dirt-oval B | 0.13 | 0.32 | 0.72 | 2.39 | 3.86 | 7.78 |
| dirt-oval C | 0.14 | 0.29 | 0.50 | 1.80 | 4.59 | 6.96 |
| mountainstreet A | 0.05 | 0.16 | 0.30 | 0.88 | 1.77 | 2.80 |
| mountainstreet B | 0.05 | 0.13 | 0.27 | 0.62 | 1.43 | 3.15 |
| mountainstreet C | 0.06 | 0.12 | 0.26 | 0.78 | 1.89 | 3.15 |
| luger-hill A | 0.17 | 0.38 | 0.69 | 1.44 | 2.31 | 4.45 |
| luger-hill B | 0.08 | 0.24 | 0.46 | 1.14 | 2.12 | 4.45 |
| luger-hill C | 0.06 | 0.25 | 0.57 | 1.37 | 2.12 | 5.92 |

### 3.3 Dead-race signal — leader→P2 over-fraction of the final third (raw), + provisional flag count

| Track·Arm | overFrac p50 | overFrac p90 | max | deadFlag /100 (prov, gap>3 s >50% of final third) |
|---|---|---|---|---|
| searound A | 0.059 | 0.186 | 0.748 | **1** |
| searound B | 0.087 | 0.549 | 1.000 | **13** |
| searound C | 0.058 | 0.769 | 1.000 | **18** |
| dirt-oval A | 0.111 | 0.495 | 0.839 | **10** |
| dirt-oval B | 0.105 | 0.802 | 0.969 | **17** |
| dirt-oval C | 0.066 | 0.730 | 1.000 | **15** |
| mountainstreet A | 0.027 | 0.112 | 0.224 | 0 |
| mountainstreet B | 0.013 | 0.120 | 0.348 | 0 |
| mountainstreet C | 0.000 | 0.085 | 0.691 | **1** |
| luger-hill A | 0.059 | 0.149 | 0.359 | 0 |
| luger-hill B | 0.040 | 0.165 | 0.507 | **1** |
| luger-hill C | 0.011 | 0.141 | 0.749 | **2** |

### 3.4 Field spread at the line, contention, comeback ingredients (selected percentiles)

| Track·Arm | line fieldSpread p50 (p90) | inContention p50 (X=2 s) | maxBehindAfterChaos p50 | finalBehind p50 | visibleComebacks /4000 (prov Y/Z) |
|---|---|---|---|---|---|
| searound A | 2.85 (4.86) | 0.37 | 6.33 | 4.48 | 176 |
| searound B | 2.74 (5.41) | 0.07 | 6.52 | 4.35 | 209 |
| searound C | 2.30 (4.30) | 0.11 | 5.56 | 3.63 | 167 |
| dirt-oval A | 3.61 (6.15) | 0.31 | 8.56 | 6.26 | 184 |
| dirt-oval B | 3.31 (5.17) | 0.04 | 7.58 | 5.01 | 212 |
| dirt-oval C | 2.57 (4.65) | 0.11 | 6.20 | 3.84 | 187 |
| mountainstreet A | 1.89 (3.30) | 0.62 | 4.42 | 2.96 | 141 |
| mountainstreet B | 2.00 (3.41) | 0.52 | 4.19 | 2.74 | 136 |
| mountainstreet C | 1.52 (2.88) | 0.58 | 3.64 | 2.38 | **92** |
| luger-hill A | 2.48 (3.72) | 0.49 | 5.61 | 3.81 | 168 |
| luger-hill B | 2.11 (3.34) | 0.32 | 5.14 | 3.28 | 152 |
| luger-hill C | 1.72 (3.03) | 0.44 | 4.31 | 2.76 | 125 |

Full percentiles (p10/p25/p50/p75/p90/max) for every field, cell, and checkpoint are in
[`summary.json`](results/gap-space/summary.json) and the per-race raw in `gm-ns2-*.json`.

---

## 4. The five questions, in plain language

**1. How many seconds behind the leader is the field at three-quarters distance?**
Field **median** behind at progress 0.75: **closed tracks ~3.1–4.2 s** (searound 3.1–3.5 s, dirt-oval 3.3–4.2 s);
**open tracks ~1.9–2.7 s** (mountainstreet 1.9–2.3 s, luger 2.3–2.7 s). v4-ON pushes the closed-track field
slightly further back mid-race than v4-OFF, then partly reels it in by the line.

**2. Does the leader run away?**
Mostly no at the median (leader→P2 at the line p50 < 1 s on 10 of 12 cells), **but there is a fat processional
tail on closed tracks**: leader→P2 p90 reaches **2.9–4.8 s**, and the final-third over-fraction (leader >3 s
clear for most of the run-in) has p90 of **0.55 (searound-B), 0.77 (searound-C), 0.80 (dirt-B), 0.73 (dirt-C)**.
On open tracks the leader essentially never runs away (p90 over-fraction ≤ 0.17, flag ≈ 0).

**3. Is v4-ON better or worse than v4-OFF — in GAP space?**
**Worse on closed tracks; roughly neutral on open.** In rank space v4-ON looked strictly better (+3–5 pts
band-reach everywhere). In gap space the same v4-ON **multiplies dead races on closed tracks**: searound
provisional dead-flag **1 → 13** (A→B), dirt-oval **10 → 17**, and the final-third over-fraction p90 roughly
doubles-to-triples. v4-ON strings the field out earlier (median-behind at 0.25 nearly doubles on every track).
The rank-space "comeback improvement" is, on closed tracks, partly a **strung-out field with reshuffled ranks**
— exactly the gap the golden test predicted. On open tracks v4-ON is close to neutral (marginally more mid-race
spread, similar or slightly tighter finish).

**4. Do the owner's own settings (Arm C) make it worse than the defaults (Arm B)?**
**On the signals that read as "dead," yes.** Arm C (int 0.9 / strict 0.8 — what he watched) vs Arm B:
win-concentration rises sharply (nativeWinP luger 0.41→**0.087**, searound 0.51→**0.17**, dirt 0.90→**0.35**);
searound dead-flag **13 → 18** and its over-fraction p90 **0.55 → 0.77**; and **visible comebacks fall on both
open tracks** (mountainstreet 136 → **92**, luger 152 → **125**). Arm C does tighten the *finish* line-spread a
little, but it concentrates wins and removes closers. **The settings the owner watched are the ones that
maximise the dead-race and win-concentration signals** — consistent with what his eye saw.

**5. One concrete race that is "fair" and visibly dead — does it exist?**
**Yes.** Restricting to cells that pass the strict fairness definition (band ≥70% AND start-row fair — only
mountainstreet qualifies):
- **Arm C · mountainstreet · race #26** — band-reach **83.0 % (FAIR)**, yet final-third over-fraction **69 %**,
  provisional deadFlag **TRUE**, leader **3.06 s** clear of P2 at the line (top-5 spread 4.02 s). A race the
  fairness gate calls clean and the eye calls dead.
- Arm B · mountainstreet · race #26 — band 84.3 % (FAIR), over-fraction 35 %, leader→P2 **3.15 s** at the line.
- Arm A · mountainstreet · race #67 — band 80.9 % (FAIR), over-fraction 22 %, leader→P2 0.85 s (mildest).

On the closed tracks (which pass band-reach but fail start-row) fair-and-dead races are far more common still
(searound-C: 18/100 flagged). **The dead race and the fair race are the same race** — the headline this run
existed to produce.

---

## 5. Proposed X / Y / Z — **AWAITING THE OWNER'S CALIBRATION** (not decided here)

Reasoning from the raw distributions, marked provisional. **These are inputs to the owner's eye-test, not
gates.** The owner should watch one race, read its seconds off, and fix the thresholds himself.

| Knob | Proposed | Why (from the data) | Caveat |
|---|---|---|---|
| **X** in-contention | **2.0 s** | On the "alive" open tracks the field median sits at ~1.9–2.3 s at 0.75 and top-5 spread p50 ≈ 1.4–1.5 s; 2 s captures the visible front group. | Knife-edge — the field median crosses 2 s right around 0.75, so results are sensitive near this value. Owner may prefer 1.5–2.5 s. |
| **Y** comeback depth | **5.0 s** | Per-racer maxBehindAfterChaos p50 is ~4–8 s; 5 s selects the median-and-deeper chaser as "had a real deficit." | Lower Y counts shallower recoveries as comebacks. |
| **Z** comeback finish | **1.5 s** | finalBehind p10 ≈ 0.7 s (open), p25 ≈ 1.6 s; 1.5 s ≈ the closest ~20–25 % of finishers — a photo-ish close. | Stringent; Z=2.0 s would roughly double the visible-comeback count. |
| **deadGap** | **3.0 s** | Cleanly separates the two regimes: open-track leader→P2 at the line rarely exceeds ~2 s (p90 1.4–2.3 s), while the closed-track dead tail lives at 3–5 s. | Well-placed at 3 s; nudging to 2.5 s pulls in some borderline closed-track run-ins. |

---

## 6. Autonomous decisions & explicit refusals

**Decisions (each: what best served the stated goal, written down):**
1. **Added the 0.25 checkpoint** to `GM_CPS` (`[0.5,0.75,0.9]` → `[0.25,0.5,0.75,0.9]`). The spec's WHAT-TO-MEASURE
   lists 0.25 and it was absent. Byte-neutral when `--gap-metrics` off; 0.25 = the choreo/chaos boundary, the
   earliest "is the field already strung out?" snapshot. ([sim-fairness.mjs:995](../sim-fairness.mjs#L995))
2. **Added `fieldMedianBehind`** to each checkpoint. The spec wants "front group vs field median over time";
   with the leader at 0 this median IS that gap. Uses the already-computed `behindArr`; byte-neutral.
   ([sim-fairness.mjs:1840](../sim-fairness.mjs#L1840))
3. **Ran ASSUMED-DEFAULTS with flag-driven arms** (no `world.json`), because the arms need CLI knob overrides
   the world file cannot carry, and the run's job is to replace the void flagless numbers. Declared loudly at
   top; the owner's real world differs in 4 values — bind by re-running with `--config`.
4. **Set `governorDirectorEnabled=false` explicitly for arms B/C** so no dormant flag rides along (it is
   structurally gated off under v4 anyway).
5. **Passed the density flags at shipped values** for provenance (byte-identical to default); did **not** sweep
   density.
6. **Concurrency 6**, fail-soft per cell, checkpointed/resumable via `status.jsonl`, per-cell PID tracking with
   kill-on-interrupt → zero orphans.

**Refusals (things I would not force):**
- **Did not tune, judge, or optimise anything.** X/Y/Z are reported raw + a proposal explicitly marked awaiting
  calibration. No malus, no limiter, no casting change, no density sweep — as instructed.
- **Refused to build the "held-overtake still-ahead-at-N∈{1,2,3}s" observer overnight.** No verified observer
  for it exists; the harness has hold-based clean-overtake counts (750 ms, `--strip-metrics`) but not the
  N-second-hold curve the spec names. Building a new pair-tracking observer with no owner eye-check risks
  emitting a subtly-wrong number — the exact failure this whole week fought. **Not measured this run; named,
  not faked.** Recommend adding it as a dedicated, golden-tested observer in daylight.

---

## 7. Bottom line for the owner

Your eye and the rank numbers were both right — they measured different spaces. In **rank** space v4-ON looks
better everywhere (+3–5 pts band-reach). In **gap** space, on the **closed tracks** and especially at **your
own Arm-C settings**, v4-ON **multiplies processional races** (searound dead-flag 1→13→18), **concentrates
wins** (nativeWinP 0.41→0.087 on luger), and **removes closers** (open-track visible comebacks 152→125,
136→92). And a race can be **fair and dead at once** — Arm C, mountainstreet, race #26: band-reach 83 %, leader
3 s clear at the line. That is the number that agrees with your eyes. **Calibrate X/Y/Z against a race you
watch; nothing here is a decision.**
