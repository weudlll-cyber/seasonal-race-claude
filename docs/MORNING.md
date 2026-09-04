# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-05, during the night chain of 2026-09-04. Branch `night/2026-09-04` off
master `6953722d`. **Nothing in this chain changes the picture, a default, a threshold or a shipped
value. No fingerprint is minted. Nothing is merged — the merges are yours to decide from this
sheet.**

---

## DONE

_(nothing yet — the chain has just started)_

## RUNNING

- **PIECE A — what each action lever actually does.** Stage 1 sweep launched: 29 arms
  (one baseline + 14 levers × lower/higher) × 10 tracks × **N=30** races, 10 parallel workers.
  Expected ~45 minutes. Report will be `reports/night/ACTION-LEVERS-1.md`.

## OPEN

The remaining eleven pieces of tonight's chain: B (what the closing phase interrupts), L (does the
camera's guess match the plan's beats), D (the item-7 gap), C (a test that mounts `RaceScreen`),
E (a sweep that measures nothing must not exit clean), F (characterisation tests for
`sim-fairness.mjs`), G (the render fingerprint's blind spot — guard only), H (the harness ceiling and
hardcoded lap count), I (what a one-command deploy needs), J (why `date-fns` is in the image),
K (three document corrections).

## NEEDS HIS WORD

_(nothing new yet tonight — the standing items are in [BACKLOG.md](BACKLOG.md))_

---

## Two things found at source in the first hour, before any measurement

**1. THE ACTION DIAL IS NOT UNBUILT.** `client/src/modules/storage/defaults.js:1152` exports
`RACE_ACTION_STAGES` — a three-position selector (`quiet` / `medium` / `wild`) applied by
`client/src/modules/raceActionStage.js`, judged on a production build and accepted **2026-08-24**.
It maps onto exactly **two** keys, `pulkChallengerBoost` and `pulkLeaderBrake`. So Piece A's question
is not "what should a dial map onto" from nothing — it is "are those the right two, and what do the
other twelve candidates do". The report will say so.

**2. `contestWindowStart` IS NOT AN ACTION LEVER AND IS EXCLUDED FROM PIECE A WITH REASON.** It sets
`plan._contestWindowStart` (`client/src/modules/racePlanner.js:401`), which only
`scripts/sim/observers/outcome-front-battle.mjs` reads. No engine path reads it: moving it moves the
MEASUREMENT WINDOW, not the race. `docs/SWEEP-HARNESS.md:167` already says this in as many words.
Sweeping it would have produced a table of a ruler measuring itself.

---

## A discrepancy in the chain's own ordering, recorded rather than guessed at

The chain's header says the sweeps run "A, B, D, L — in that order". The per-piece annotations say
A · start first, B · second, **L · third**, D · fourth. The two disagree on D and L. The per-piece
ordinals are the more specific instruction, so the run order is **A, B, L, D**. If that was the wrong
reading, the only cost is which of two read-only measurements ran first.

---

## What stands from the previous sheet

The hygiene phase is closed and the durable version of it is
[BACKLOG.md → THE HYGIENE PHASE IS CLOSED](BACKLOG.md). Origin holds `master` and nothing else.
