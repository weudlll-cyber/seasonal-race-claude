# ⚠️ Absolute sim numbers before the plan-grid unification are a PRE-UNIFICATION BASELINE

**Date: 2026-07-23. Applies to: every absolute simulator metric recorded in this repo before the
parity step-2a commit (plan-grid unification / D-GRID).**

## What changed

Parity step 2a unified the sim's start-row grid with the browser's. Before it, the sim built the
race plan's target-rank grid from a **separate per-combo FNV shuffle** (`comboLayoutSeed`) while the
racers physically started in a **different per-race shuffle**. The plan therefore steered a grid the
racers did not stand in, and one grid was frozen across a whole batch. After unification, ONE
per-race shuffle — drawn from the shared physics stream — feeds both the plan and the physical
placement, exactly as the browser does, and every race reshuffles.

This **moves the start-row → target-rank mapping**, which is the input to the entire fairness
pipeline. So every absolute figure the sim produced before this commit was measured on a different
(now-retired) grid.

## Which numbers are affected (do NOT read pre-commit values as current truth)

- **band-reach / zone success rate** (B1–B5, overall)
- **runaway-winner and parade-finish rates**
- **dead-finale / P1-contest** metrics (leadChangeCount, distinctLeaders, sustained-P1 windows)
- **physics tax** (avoidance-braking distance loss)
- **fair-chance** placement (exact/top-5 hit rates by start row)
- **all gate results and sweep tables under `reports/`** (greenfield, results-salvage, exp-archive,
  gate-retune, parity-prod, grid-split, proposals, …)
- **the shipped-default fingerprints** — see the old → new table below

The numbers stay in place as **history** — they correctly describe the pre-unification engine. They
are simply no longer the current baseline.

## Superseded — the speed/duration ship invalidated the baseline AGAIN (2026-07-23)

The speed/duration ship replaced both speed normalisations, the laps staircase and the two meanings
of "duration" with ONE canonical model (`client/src/modules/durationModel.js`): a single normal
track speed in px/s, laps for closed tracks, bounded time for open tracks. **Race durations, the
finish line, the pace and the re-roll schedule all moved**, on both sides — so every absolute figure
in the affected list above is invalidated a second time, for a second reason.

Two further method changes matter when comparing old numbers:

- The shipped-default fingerprint now runs `--track-defaults` (each track at its own canonical
  default) instead of `--dur=60`. It measures the shipped game; `--dur=60` no longer describes one.
- Closed-track sweeps are specified in **laps**, open-track sweeps in **seconds**. A pre-ship
  "60 s closed" row is not comparable to any post-ship row without going through the documented
  protocol mapping in [docs/SIM.md](../docs/SIM.md).

## Fingerprints (shipped-default byte-identity)

| World | Pre-unification (step 1) | Post-unification (step 2a) | Speed/duration ship | Type-multiplier amendment (current) |
|-------|--------------------------|-----------------------------|---------------------|--------------------------------------|
| ON (flagless)                 | `e93ffa70dad562a1` | `0ecca5e2dbe6526e` | `e80f78a0da6a9993` | `eda28d614f5e47d9` |
| OFF (`--gapRerollEnabled=false`) | `72c3360fb75225ef` | `6e01e472b7655b9a` | `1cd6c9fdd62542a4` | `83eec6cf5c8b0419` |

The amendment (owner decision B, `41aaec7`) restored the racer-type multiplier on the pace —
`paceSpeed = normalSpeedPxPerSec × speedMultiplier` — so every per-track default duration moved
again (garden-path 84.8 s → 282.8 s at the snail's 0.30; seatrack's open ceiling 51 s → 44 s at the
dolphin's 1.15). Numbers measured once per world on the final committed state, per the binding
fingerprint rule in [docs/SIM.md](../docs/SIM.md).

## When the new baseline is measured

**Not yet, and not by this commit.** The full re-baseline sweep runs **ONCE**, after the owner picks
the final **normal track speed** by eye (Dev Screen → Dynamics → Speed → Normal Track Speed;
provisional 225 px/s). Re-baselining before that pick would measure a pace that is about to change,
so the single sweep waits for it. Until then, treat every absolute sim figure in this repo as
provisional history. Provisional spot-checks (e.g. the searound / river-run N=25 sanity in the
speed/duration ship report) are clearly labelled as sanity, not gates.

See [reports/parity/DIVERGENCE-AUDIT.md](parity/DIVERGENCE-AUDIT.md) (finding D-GRID) for the full
rationale, and [docs/SIM.md](../docs/SIM.md) for the current cross-tool equality position.
