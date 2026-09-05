# Morning sheet

**Owns:** where things stand, right now. Whoever reads this at 7 a.m. should not have to open a
single report to know where the project is.

**Last rewritten:** 2026-09-05, during the night chain of 2026-09-04. Branch `night/2026-09-04` off
master `6953722d`, pushed, **not merged — the merges are yours to decide from this sheet.**

**NOTHING IN THIS CHAIN MOVED THE PICTURE, A DEFAULT, A THRESHOLD OR A SHIPPED VALUE. NO FINGERPRINT
WAS MINTED.** All four — world, world-off, camera and render — were re-computed on the changed tree
and every one matches its recorded value in [fingerprints.json](fingerprints.json). *(The values are
not restated here; that record is their one home.)*

---

## DONE

**E · A sweep that measures nothing no longer exits clean** —
[SILENT-ZERO-TRACKS-1](../reports/night/SILENT-ZERO-TRACKS-1.md).
★ **The harness did not merely report zero — it printed `PASS`.** Measured by removing the new guard
and re-running the incident: exit 0, 43 s, *"Every frame of every race swept satisfied all five
invariants. PASS"*, over zero races. ★ **And the fix already existed here and never travelled** —
`company-spread-sweep.mjs:160` has the same guard, written after its own silent zero. Two checks now
refuse before the 72 s client build. **28 other `--tracks` entry points are named and left alone**;
`sim-fairness.mjs` has a third variant, a silent DEFAULT rather than a zero. Not wired into CI,
verify or a hook.

**G · The render fingerprint's blind spot — guard only** —
[RENDER-CAMERA-GAP-1](../reports/night/RENDER-CAMERA-GAP-1.md).
★ **The backlog says three fields; the tree says the blindness costs TWO.** `anchorRacerIndex` and
`runInArrived` are both label behaviours the instrument draws wrongly; `camera.state` is no longer
read by live code and survives only in the comment recording its removal. **The repair is NOT done —
it moves the render hash and is yours to order.** A test now pins exactly which members are missing,
so the gap cannot widen silently. Sabotage 3/3.

**H · The harness ceiling and the hardcoded lap count** —
[HARNESS-CEILING-LAPS-1](../reports/night/HARNESS-CEILING-LAPS-1.md).
★ **The track records already say how many laps they run** (`defaultLaps`, 2 on all five closed
tracks) — the driver was ignoring the data, not filling a gap in it. Measured: **0 of 10 tracks
exceed the 200 s ceiling**, longest dirt-oval at 93.1 s. The driver now reads the record and throws
rather than substituting; a truncated race throws rather than being returned as a race. **The ceiling
is NOT raised** — that is your decision; making it audible was not. Sabotage 4/4 with two controls.

**J · Why `date-fns` is in the image** — [IMAGE-DATE-FNS-1](../reports/night/IMAGE-DATE-FNS-1.md).
27.1 MB measured **inside the image**, 42% of its dependencies, pulled by
`better-sqlite3-session-store`. ★ **The package that declares it never imports it** — its only
mentions are its own `package.json` and its TEST file, and nothing else in the image imports it
either. **Not removed** — see NEEDS HIS WORD.

**K · Three document corrections** —
[BACKLOG-CORRECTIONS-2026-09-04](../reports/night/BACKLOG-CORRECTIONS-2026-09-04.md).
Player Group Selection was unbuilt on 2026-09-02 and **shipped on 2026-09-03**; verified at source
and moved to PART TWO. Gate item 2's doubling now stated plainly in the `GATE_TRACKS` comment — **and
it is now two of the three excluded tracks, not one**. No exclusion changed.

**I · What a one-command deploy actually needs** — [DEPLOY-NOTES.md](DEPLOY-NOTES.md). Nothing built,
nothing recommended. See NEEDS HIS WORD.

**C · A test that mounts `RaceScreen`** — [RACESCREEN-MOUNT-1](../reports/night/RACESCREEN-MOUNT-1.md).
It mounts, and the real camera director initialises in it. ★ **It supersedes D2, which is not
withdrawn** — you closed the question of whether to act; the chain re-opened it because the dial is
about to be built here. No production code changed. Sabotage 3/3. ★ **But the sabotage the chain
named is STILL GREEN** — blanking every track background passes 405 tests, and cannot be caught by a
mount test; the backlog item is corrected rather than struck.

**F · Characterisation tests for `sim-fairness.mjs`** — [SIM-FAIRNESS-PIN-1](../reports/night/SIM-FAIRNESS-PIN-1.md).
12 tests, file untouched. ★ **`runSingleRace` is EXPORTED and the sweep sits behind `isMain`** — two
facts the backlog does not carry, and they are what made this possible without editing the file. A
physics constant sabotage was caught by the golden; a tie-break one was not, correctly, because the
branch is unreachable. World fingerprint unmoved.

## RUNNING

**A · What each action lever actually does.** Stage 1: 29 arms × 10 tracks × **N=30 races**, one
lever at a time, everything else shipped. **0 failures**, and it flushes every cell as it lands, so
it is resumable and readable at any moment. **Five levers complete at the time of writing.**

**What is already clear — every row 10/10 tracks, N=30 races each, sign test across the ten tracks
p = 0.002:**

| lever | lead changes | held top-5 passes | leader's longest hold | field spread | finish gap |
| --- | --- | --- | --- | --- | --- |
| `pulkLeaderBrake` 0.05 → 0.15 | −37% → **+31%** | −38% → **+12%** | +55% → **−33%** | *nothing* | *nothing* |
| `pulkChallengerBoost` 0.03 → 0.12 | −10% → **+17%** | −9% → **+12%** | +8% → **−16%** | *nothing* | *nothing* |
| `pulkFrontPool` 4 → 16 | *nothing* | *nothing* | *nothing* | *nothing* | *nothing* |
| `pulkBiasGain` 1 → 4 | *nothing* | *nothing* | *nothing* | *nothing* | *nothing* |
| `pulkEnvelopeMaxEffect` 0.06 → 0.24 | **INERT** | **INERT** | **INERT** | **INERT** | **INERT** |

★ **THE SHIPPED DIAL'S TWO KEYS MOVE THE FRONT FIGHT AND LEAVE THE FIELD SPACING AND THE FINISH
ALONE.** Neither of them moves how close the field runs, and neither moves the leader's gap at the
line. `pulkLeaderBrake` is about twice `pulkChallengerBoost` on every quantity it does move.

★ **AND `pulkEnvelopeMaxEffect` IS NOT A LEVER AT ALL — it is a rail that never touches.** At HALF
its shipped value and at DOUBLE it, the race is **bit-identical** to the baseline on all ten tracks
(same finishing order, every race). The realism envelope is never reached at the shipped contest
strengths, so it clamps nothing. That is a good answer, and it means the ±12% figure is a bound the
game does not currently approach rather than a setting.

`pulkFrontPool` and `pulkBiasGain` DO change the race — the finishing orders differ — but move none
of the five quantities readably at N=30. They are reported as such and get no larger run, per the
piece's own rule.

**B · What the closing phase interrupts.** Running beside A. Ten tracks at seed 9, the shipped arm,
with the browser harness's own `--dump`. **The feasibility gate the piece set is passed:** the
closing phase's start IS observable from an existing instrument — it is the first frame on which the
director's `_runInComposingNow` is true, dumped as `comp` by `viewerProbe.js`. No instrument was
built. *(Both runs are deterministic — the sim is seeded and the viewer harness runs a fixed virtual
clock — so sharing the machine changes wall-clock only, never a number.)*

## OPEN

**Not reached tonight.** The machine is a two-P-core laptop; piece A alone is a four-hour run.

- **L · does the camera's guess match the plan's beats** — not started.
- **D · the item-7 gap** — not started. The chain's own fall order puts it last of the sweeps.
- **A's remaining levers** — nine of the fourteen candidates. The arms run lever by lever, so every
  lever is either fully measured on ten tracks or not at all; there are no half-measured rows.

## NEEDS HIS WORD

1. **Does the acceptance of 2026-09-04 reach gate item 2?** (piece K2) Item 2 and item 9 measure the
   same behaviour under different names — a closing zoom that has not arrived at the crossing. Your
   acceptance names items 9 and 10; item 2 is not on it. **luger-hill and dirt-oval are excluded from
   the gate on item 2 ALONE.** If the acceptance reaches it, both exclusions lose their last reason
   on the same day. No exclusion was changed on this observation.

2. **Is 27 MB worth it?** (piece J) Nothing in the image loads `date-fns`. The three clean ways to
   remove it are the ones the chain forbade — an `overrides` entry, dropping the session store, a
   version bump — and the only remaining route, deleting the directory in the Dockerfile, would leave
   the image's tree disagreeing with its own manifest. That is the anonymous-volume defect one layer
   over, so it was **not** taken unasked.

3. **What should the deployed client's API address BE?** (piece I) This is the one thing standing
   between here and a one-command deploy, and it is a design question, not a configuration.
   `client/src/services/api.js:16-18` bakes `VITE_API_URL` in at **build** time with the fallback
   `http://localhost:4000`, and there is no `.env` anywhere in the tree. **Measured inside the image:
   its baked bundle carries exactly one occurrence of `localhost:4000` — that fallback.** So a
   visitor loading the app from a public origin sends every API call to *their own machine*, and the
   image is origin-specific: there is no one image and therefore no one command. Three options are
   laid out in [DEPLOY-NOTES.md](DEPLOY-NOTES.md) §2 and none is chosen.

4. **The deploy decisions that are not code:** a domain, which reverse proxy terminates TLS, and
   where the data lives. **The server has no TLS at all** — searched for, not assumed — and that is a
   design decision rather than an omission: it sets `trust proxy` and issues `__Host-` Secure
   cookies, expecting a terminator in front.

---

## A discrepancy in the chain's own ordering, recorded rather than guessed at

The header says the sweeps run "A, B, D, L — in that order". The per-piece annotations say A · start
first, B · second, **L · third**, D · fourth. The two disagree on D and L. The per-piece ordinals are
the more specific instruction, so the intended run order is **A, B, L, D**. Only B was reachable
tonight, so the disagreement cost nothing.

## Two things found at source before any measurement

**1. THE ACTION DIAL IS NOT UNBUILT.** `client/src/modules/storage/defaults.js` exports
`RACE_ACTION_STAGES` — a three-position selector (`quiet` / `medium` / `wild`) applied by
`client/src/modules/raceActionStage.js`, judged on a production build and accepted **2026-08-24**. It
maps onto exactly **two** keys: `pulkChallengerBoost` and `pulkLeaderBrake`. So piece A's question is
not "what should a dial map onto" from nothing — it is "are those the right two, and what do the
other twelve candidates do". The first answer is in RUNNING above.

**2. `contestWindowStart` IS NOT AN ACTION LEVER and is excluded from piece A with reason.** It sets
`plan._contestWindowStart` (`client/src/modules/racePlanner.js:401`), which only
`scripts/sim/observers/outcome-front-battle.mjs` reads. No engine path reads it: moving it moves the
MEASUREMENT WINDOW, not the race. `docs/SWEEP-HARNESS.md:167` already says so. Sweeping it would have
produced a table of a ruler measuring itself.

## What stands from the previous sheet

The hygiene phase is closed; the durable version is
[BACKLOG.md → THE HYGIENE PHASE IS CLOSED](BACKLOG.md).
