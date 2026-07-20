# LBB-SPRING-SWEEP — how long does a lane change take, at which angle, and does he brake again?

Throwaway branch `trace/lbb-dodge-speed`. Env-gated levers only (no config key, no defaults change, no merge).
Two axes: `lookBeforeBrakePassStrength` ∈ {0.5, 0.35, 0.25, 0.15} (via `--behavior`), × trigger {`tLat` as-is
vs `tLat` = `ln(0.1)/ln(1 − 0.19·passStrength)` from the SAME spring constant, env-gated `LBB_TLAT_CORRECTED=1`}.
Measurement only. Numbers reported; not reconciled with the prediction.

**LOCK ✓** — with both levers off, `node scripts/fingerprint-default.mjs` prints `62f7ebeb37880765`
(unchanged). Control cell (0.5, as-is) = the existing LBB-DODGE-SPEED run, reproduced (honest 1.9%, the six
sustained dodges, 46° peak).

## SCOPE — what this rig can and cannot measure (stated, not worked around)

- **Duration / angle / no-reach / gate-flicker** need per-frame data → measured from a **1-race** LBB_JERK dump
  per cell on **mountainstreet/boarder** (per-frame dumps cannot scale to 50 races — 64 MB/race). Dodge counts
  per cell are given so the thin cells are visible.
- **`honestOverlapRate`** — computed by sim-fairness (the `LateralQ` line), reported per cell (1 race).
- **`brakeThenDodge` median braked frames (item 3) — NOT AVAILABLE on this branch.** The observer
  `scripts/sim/observers/look-before-brake.mjs` is off-branch (commit `c32cc61`), as found in
  LBB-WEAVE-BASELINE. The `LateralQ` line's `brake=%` is the OVERALL brake-frame fraction, **not** the Owner's
  braked-then-dodged-same-leader metric. I report `brake%` as a weak proxy and the **no-reach rate** as the
  direct measure of "starts a move it cannot finish", but the definitive braking-return number is not here.
- **Visible-weave detector (item 6)** is single-race post-process hardwired to the trace-2 dump — not runnable
  as a per-cell sweep metric here.
- **4 tracks × 50 races** is the full fairness rig; this is **1 track × 1 race per cell**. The 4-track/50-race
  run with the brakeThenDodge observer restored is the build step, not run here.

## The headline — measured dodge duration vs what the trigger assumes

Sustained dodges (contiguous `pass` run ≥ 12 frames — the real sideways move) at the control (0.5, as-is):
**median 23 frames (368 ms)** to reach within 10% of target — and **only 50% reach it at all**; the gate
withdraws first on the other half. The trigger's assumed duration on this branch is `tLat + lagFrames` =
**5.4 + 2 = 7.4 frames (118 ms)** — roughly **3× optimistic**. (The brief's "3.4 f" is the pre-launch-ramp
`tLat`; the ramped value on `fix/lbb-launch-ramp` is 5.4.)

## Two-axis table — mountainstreet/boarder, seed 1, 60 s, 1 race per cell

Per cell: sustained-dodge count / **reach%** (reached target vs gate-withdrew) / **duration median (reached)** /
peak-angle (median-of-dodge-peaks) / max angle / gate-flicker per 1000 frames / **honestOverlap** / brake%
(proxy, not brakeThenDodge) / the trigger's assumed `tLat`.

### Trigger `tLat` AS-IS (today)

| passStrength | sustained n | reach% | dur median (reached) | peak° (med) | max° | flicker/1k | honestOverlap | brake% | assumed tLat |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| **0.5 (control)** | 101 | **50%** | **23 f / 368 ms** | 13.4 | 46.4 | 3.90 | 1.9% | 49.3% | 5.4 f |
| 0.35 | 113 | 41% | 28 f / 448 ms | 10.7 | 38.2 | 4.85 | 1.9% | 49.7% | 5.4 f |
| 0.25 | 95 | 23% | 31 f / 496 ms | 6.7 | 30.1 | 6.00 | 2.1% | 51.6% | 5.4 f |
| 0.15 | 103 | 21% | 33 f / 528 ms | 4.1 | 19.5 | 6.78 | 2.0% | 51.5% | 5.4 f |

### Trigger `tLat` CORRECTED (measured-law duration to 90%)

| passStrength | sustained n | reach% | dur median (reached) | peak° (med) | max° | flicker/1k | honestOverlap | brake% | assumed tLat |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 0.5 | 72 | **58%** | 22 f / 352 ms | 8.0 | 48.7 | 5.34 | 2.0% | 51.7% | 23.1 f |
| 0.35 | 60 | 43% | 31 f / 496 ms | 9.7 | 38.4 | 3.91 | 2.1% | 54.5% | 33.5 f |
| 0.25 | 36 | 17% | 37 f / 592 ms | 4.6 | 32.1 | 2.51 | 2.1% | 53.1% | 47.3 f |
| 0.15 | 15 | 7% | (n=1) | 4.4 | 17.7 | 0.59 | 1.9% | 52.0% | 79.6 f |

Field soft-steering reference angle (the "normal" lateral motion, every cell): **peak 61.4°, mean 2.4°**.

## What the tables show (no interpretation beyond them)

**1. Duration.** Measured sustained-dodge duration is **22–37 frames** across all cells (median), against an
assumed `tLat` of **5.4 f (as-is)**. The corrected `tLat` at 0.5 is **23.1 f — equal to the measured 23 f**;
at weaker springs it grows to 33/47/80 f.

**2. No-reach (the trigger being optimistic).** As-is: reach falls **50% → 41% → 23% → 21%** as the spring
weakens — most dodges do not complete. Corrected trigger raises reach at 0.5 (**50% → 58%**) but at weaker
springs the dodge count collapses (**101 → 15** sustained dodges at 0.15) and reach falls to **7%** — with a
79.6-frame `tLat`, `dTStart` grows past the gate window and racers barely start dodging.

**3. Angle.** Peak angle falls with the spring: as-is **46.4° → 38.2° → 30.1° → 19.5°**. Only passStrength
0.15 brings the peak near the ~20° "steering" range — and the soft-steering reference peak is **61.4°**,
steeper than any dodge.

**4. honestOverlap — flat.** 1.9–2.1% in every cell, both triggers. No cell raises it.

**5. Gate flicker.** As-is: rises with weaker spring (3.90 → 6.78 /1k). Corrected: falls at weaker spring
(down to 0.59 /1k at 0.15) — because dodges rarely fire at all.

**6. Braking.** `brakeThenDodge` (the Owner's metric) is **not measurable here** (observer off-branch). The
overall `brake%` proxy creeps **49.3% → 51.6%** (as-is, weaker spring) and **49.3% → 54.5%** (corrected). The
no-reach rate — half of dodges at control, up to 93% at weak-spring cells — is the visible signal that dodges
are being authorised and abandoned; whether that converts to the Owner's braked-then-dodged encounters cannot
be confirmed without the missing observer.

## The cross-cell pattern, stated plainly (per the table)

- No cell in this rig has BOTH a near-natural angle (≤ ~20°, i.e. passStrength ≤ 0.15) AND a high dodge-reach:
  the angle-natural cells all have reach ≤ 21% (as-is) or barely fire (corrected).
- The corrected `tLat` at 0.5 equals the measured duration (23 f) and improves reach (58%) at flat overlap,
  but does not lower the angle (48.7° max, similar to control).

## What I did NOT check (marked)

- **One track (mountainstreet), one race per cell.** The 4-track × 50-race fairness numbers are not here; the
  weak-spring corrected cells are thin (n = 15–36 sustained dodges, 1–9 reached).
- **`brakeThenDodge`** — the definitive "does he still not brake" metric — is off-branch and unmeasured; only
  overall `brake%` and no-reach are reported.
- **Visible-weave count** — single-race post-processor only; not run as a sweep metric.
- **Angle basis** is along-track (Δt × path length), not screen-chord; this is the sim (physics parity), not
  the renderer.
