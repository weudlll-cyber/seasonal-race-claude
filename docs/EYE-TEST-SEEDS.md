# Eye-test seeds — what a seed means

**Owns:** what a seed guarantees and what it does not — the binding practice for reproducible eye tests.

**Status: binding practice. Rewritten 2026-07-26.** An earlier version of this note warned that a typed
browser seed was _never_ a cross-tool identifier. That was true before the parity arc; it is **no longer
true**. After the RNG isolation, the plan-grid unification, the canonical speed/duration model and the
step-order alignment, **a typed seed reproduces the SAME race in the browser and in the sim.** This doc is
the current practice.

Doc-only: nothing here changes behaviour.

---

## The one-sentence rule

> **A typed seed IS a cross-tool race identifier: given the same configuration, seed `S` reproduces the
> same race in the browser and in the sim (`--seed=S --races=1`), byte-identical.**

Typing `24` into the browser Quick-Test shows you the same race the sim runs for seed 24 — same start-row
shuffle, same spread draws, same re-roll targets, same designated winner, same finishing order. Only the
camera framing and particles differ (those are render-only and off the race stream); the race itself is
identical.

**Why it holds now.** Both engines run the one shared step (`raceCore.stepRacePhysics`) over one shared
identity (`createRaceFromIdentity`): the physics RNG is isolated from render draws (`makeRaceRng(seed)`),
one per-race shuffle feeds both the plan target-ranks and the physical start rows, and there is one
canonical duration model (`client/src/modules/durationModel.js`). The golden harness proves it —
`realArm` (the real browser core) `== simArm` (the sim) is **byte-identical across the 600-identity soak**
(see [reports/parity/GOLDEN-SOAK.md](../reports/parity/GOLDEN-SOAK.md) and
[STEP-ORDER-ARC.md](../reports/parity/STEP-ORDER-ARC.md)).

---

## What a typed Quick-Test seed determines

Quick-Test writes the typed value to `racePlanSeed`
([SetupScreen.jsx](../client/src/screens/SetupScreen/SetupScreen.jsx)); the race-init effect threads it as
the one explicit physics stream (`makeRaceRng(racePlanSeed)`)
([RaceScreen/index.jsx](../client/src/screens/RaceScreen/index.jsx)). Given an identical configuration, the
seed fixes:

- the start-row shuffle (one per-race shuffle, shared with the plan grid),
- the initial `spreadFactor` draws,
- every scheduled re-roll target and its jitter,
- `createRacePlan`'s target-rank assignment,
- deterministic winner text.

**Consequence: the same seed replays the same race move-for-move, in either tool.**

### Two caveats that still hold

1. **Quick-Test only.** The normal **"Start Race" path passes `racePlanSeed: 0`** (owner decision), which
   leaves the stream unseeded — those races are **not reproducible**. Reproducibility is a Quick-Test
   (typed-seed) property.
2. **The seed is only meaningful together with the full config.** Change the field size, racer type,
   laps/seconds, or any dynamics value and the same seed produces a different race. A seed without its
   configuration is not a reference to anything — this is why an eye-test instruction always states the
   config.

Typed seeds accept any positive integer (the browser cap was lifted to `MAX_SAFE_INTEGER`; the old 9999
ceiling now bounds only auto-drawn random seeds). A sweep `--seed=1 --races=100` uses per-race seeds
`1..100`, so `--seed=S --races=1` reproduces browser seed `S`.

---

## How to write an eye-test instruction (template)

> **Eye-test — Quick-Test, track `<track>`, config `<the setting under test, e.g. gap-reroll G=0.5 s=1.0>`,
> field `<N>` × `<racer type>`, `<laps>` laps / `<D>`s.**
> Seeds **`<s1>` / `<s2>` / `<s3>`** — these reproduce identically in the browser AND are the same races
> the sim runs for those numbers. Judge the configuration across all three, not any single race.

### The rules behind the template

- **Eye-tests judge a CONFIGURATION, not a single race.** Give several seeds and ask for a verdict on the
  setting.
- **Always state the full config** alongside the seeds. Seeds are meaningless without it.
- **You CAN cross-reference a browser observation with the sim CSV row for the same seed** — they are the
  same race now. "Seed 87 showed a duo escape, and the sim row for seed 87 has 5 lead changes" is a valid
  statement about one race.
- A browser eye-test's job is to judge how a configuration **looks**; the sim quantifies the same races at
  scale. They share one identity space.

---

## To watch a specific measured sim race

- **The direct way:** type the seed into the browser Quick-Test with the same config. It is the same race.
- **Offline / reproducible fixture:** `scripts/parity/replay.mjs`. `--emit` dumps a race's full identity
  (seed / track / roster / counts / laps|seconds / `racePlanEnabled` / world hash) to an `identity.json`;
  `--replay=<identity.json>` re-runs the real browser core vs the sim and asserts they are equal (and
  flags a drifted identity). `--replay-seed=S` is the alias for `--seed=S --races=1`. The identity loads
  the same way in both engines via `createRaceFromIdentity` + `stepRacePhysics`.
