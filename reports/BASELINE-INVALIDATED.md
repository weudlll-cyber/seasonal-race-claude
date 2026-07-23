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

## Fingerprints (shipped-default byte-identity)

| World | Pre-unification (step 1) | Post-unification (step 2a) |
|-------|--------------------------|-----------------------------|
| ON (flagless)                 | `e93ffa70dad562a1` | `0ecca5e2dbe6526e` |
| OFF (`--gapRerollEnabled=false`) | `72c3360fb75225ef` | `6e01e472b7655b9a` |

## When the new baseline is measured

**Not yet, and not by this commit.** The full re-baseline sweep runs ONCE, after the
speed/duration redesign ships, so the numbers are re-measured only when the engine is final. Until
then, treat any absolute sim figure predating parity step 2a as provisional history. Provisional
post-unification spot-checks (e.g. searound N=25) may appear in the step-2a report, clearly labelled
as sanity, not gates.

See [reports/parity/DIVERGENCE-AUDIT.md](parity/DIVERGENCE-AUDIT.md) (finding D-GRID) for the full
rationale, and [docs/SIM.md](../docs/SIM.md) for the current cross-tool equality position.
