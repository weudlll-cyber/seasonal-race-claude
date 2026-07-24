# Golden equality soak — the parity promise, measured

**Unattended night run, 2026-07-24.** Two pieces of work in one document: the **type-multiplier
amendment** (owner decision B, finished and pushed first), then the **golden equality test** and
its **600-identity overnight soak**.

Commits: ship `9e41c2b` → amendment `41aaec7` → fingerprint record `3575869` → this document and
the golden harness (SHA at the bottom). Ship and amendment were pushed together, as instructed.

The backup tag still waits for the owner's cross-check, as planned.

---

# Part A — the type-multiplier amendment (owner decision B)

## The pace formula, one line

```
paceSpeed = normalSpeedPxPerSec × speedMultiplier          [world px/s]
```

`paceSpeedPxPerSec()` in `client/src/modules/durationModel.js` is the single definition. Every
helper that previously took the bare normal speed now takes a **pace**: `naturalMaxSeconds`,
`secondsForLaps`, `lapsForApproxSeconds`, `trackDefaultSeconds` — so the derived-duration display,
the open natural maximum, the slowdown factor, the `racePlanEnabled` gate and the sim CLI all move
together. There is no second seam.

`raceBaseSpeed`'s expression is **unchanged** (`computeRaceBaseSpeed(finishT, realizedDurationSec ×
M)`); only what `realizedDurationSec` *means* changed, because the pace now carries M.

**Consequences.** Closed races are lap-bounded, so the type scales the clock:
`duration(M) = duration(1) / M`. Open races are time-bounded, so the type moves the finish line
instead: `finishT(M) = finishT(1) × M`, and the natural maximum scales by `1/M`.

## The owner's law, now a test

`durationModel.test.js` → **"the owner's law"**, over five types (snail 0.30 … rocket 1.25):

- **same type ⇒ identical px/s on a closed and an open track** — different topology, different
  track, different `finishT`, same measured `raceBaseSpeed × M × pathLengthPx × REFERENCE_FPS`.
- different M ⇒ closed duration scales by exactly `1/M`
- different M ⇒ the open natural maximum scales by exactly `1/M`
- different M ⇒ a fixed open time moves the finish line by exactly `M`
- the slowdown factor is computed at the type-aware pace

## New default durations (per-track default type, at 225 px/s)

| track | topology | default type (M) | pace px/s | default | **effective duration** |
|---|---|---|---|---|---|
| city-circuit | closed | motorbike (1.05) | 236.3 | 2 laps | **51.9 s** |
| dirt-oval | closed | horse (1.00) | 225.0 | 2 laps | **58.1 s** |
| garden-path | closed | snail (0.30) | 67.5 | 4 laps | **282.8 s** |
| ice-track | closed | snowmobile (1.10) | 247.5 | 2 laps | **49.0 s** |
| searound | closed | manta (1.10) | 247.5 | 2 laps | **41.6 s** |
| luger-hill | open | luge (1.10) | 247.5 | 90 s stored | **39 s** (natural max 39.7 s) |
| mountainstreet | open | boarder (1.00) | 225.0 | 60 s stored | **60 s** (natural max 66.1 s) |
| river-run | open | duck (0.85) | 191.3 | 60 s stored | **60 s** (natural max 64.9 s) |
| seatrack | open | dolphin (1.15) | 258.8 | 60 s stored | **44 s** (natural max 45.0 s) |
| space-sprint | open | rocket (1.25) | 281.3 | 90 s stored | **66 s** (natural max 66.8 s) |

**garden-path is back to leisurely: 282.8 s** (it had collapsed to 84.8 s under the M⁰ model), and
that is within 0.7% of its pre-ship 280.9 s — because 225 px/s was anchored on the pre-ship closed
pace at M=1.0, and restoring M restores the pre-ship duration for *every* class, not just horses.

Open-track seeds now store the **authored** seconds (the pre-ship `defaultDuration`) again instead
of the once-baked clamped value. The clamp to the natural maximum is applied at **read time**, so it
is a pure function of the pace: a faster default type lowers the ceiling (seatrack 60 → 44 s at the
dolphin's 1.15), and lowering the normal speed or choosing a slower type relaxes it again. No
shipped default opens into a slowdown warning.

## Fingerprints — old → new

Measured **once per world on the final committed state**, per the binding rule now written into
`docs/SIM.md` and the script header.

| world | speed/duration ship | **type-multiplier amendment** |
|---|---|---|
| ON (flagless) | `e80f78a0da6a9993` | **`eda28d614f5e47d9`** |
| OFF (`--gapRerollEnabled=false`) | `1cd6c9fdd62542a4` | **`83eec6cf5c8b0419`** |

They move by design: every per-track default duration changed.

## Diag A/B

`scripts/diag/micro-divergence.mjs`, seeds 1 / 7 / 42 on searound / manta / 40:

```
duration scalars bit-match : YES
finish orders identical    : YES
max per-racer |Δt| overall : 0.000e+0
SEAM CLOSED — the two arms are the same race, checkpoint diff is exactly zero.
```

## The three acceptance orders (for the owner's browser cross-check)

searound / manta / 40, canonical defaults: **2 laps**, normal speed 225 px/s × M 1.1 ⇒ pace
247.5 px/s, derived duration **41.59 s**. Browser names, rank order. Regenerate with
`node scripts/diag/acceptance-orders.mjs`.

**seed 1** — winner margin 0.144 s
`Maverick, Breeze, Hawk, Eagle, Flare, Nova, Orbit, Quasar, Raptor, Blitz, Arrow, Rocket, Thunder, Pixel, Nitro, Flash, Swift, Speedy, Drift, Mercury, Storm, Turbo, Bolt, Atlas, Sparrow, Dash, Blaze, Zephyr, Shadow, Phantom, Comet, Vortex, Titan, Ridge, Falcon, Phoenix, Raven, Apex, Surge, Gale`

**seed 7** — winner margin 0.144 s
`Surge, Breeze, Gale, Orbit, Raptor, Vortex, Atlas, Quasar, Arrow, Phantom, Dash, Rocket, Turbo, Apex, Hawk, Phoenix, Mercury, Blitz, Falcon, Titan, Eagle, Nitro, Nova, Maverick, Drift, Sparrow, Pixel, Comet, Speedy, Raven, Flash, Storm, Zephyr, Bolt, Thunder, Swift, Blaze, Ridge, Shadow, Flare`

**seed 42** — winner margin 0.144 s
`Blitz, Orbit, Drift, Blaze, Raptor, Hawk, Falcon, Surge, Shadow, Ridge, Sparrow, Vortex, Pixel, Nova, Quasar, Eagle, Breeze, Speedy, Phoenix, Dash, Atlas, Apex, Storm, Turbo, Gale, Phantom, Rocket, Thunder, Zephyr, Flare, Nitro, Bolt, Mercury, Flash, Titan, Swift, Maverick, Raven, Comet, Arrow`

These differ from the ship's orders — expected: the race changed (41.6 s at pace 247.5, vs 45.8 s
at 225 under M⁰).

---

# Part B — the golden equality test

## What it is

One **race identity** in, two **derivation chains** out, one **outcome hash** each. They must be
exactly equal.

**Race identity** (`client/src/modules/parity/raceIdentity.js`) — everything that determines a
race and nothing that does not:

```
{ seed, nRacers, isOpen, laps | requestedSeconds, racePlanEnabled,
  speedMultiplier, worldHash, trackGeometryHash, rosterHash }
```

Hashed with the existing `canonicalJson` / `hashWorld` FNV-1a from `raceConfigWorld.js` — never
re-implemented, for the same reason that module says never to re-implement it. The two hashes that
were missing are added there as shared helpers:

- `hashTrackGeometry(track)` — the shape only (closed flag, path length, width, world size, the
  three point arrays at 6-dp). Deliberately excludes id/name/colour/lights: two tracks with the
  same geometry must produce the same race, and a rename must not invalidate a soak.
- `hashRoster(racers)` — the ordered identity list plus the count.

Derived scalars (`finishT`, `realizedDurationSec`, `raceBaseSpeed`, `paceScale`) are deliberately
**absent** from the identity: deriving them identically is exactly what is under test, so baking
them in would let a derivation divergence hide inside the identity. A test pins that absence.

**Race outcome** — the finishing order (`racerIndex → finalRank, finishTimeMs`) plus per-racer `t`
at fixed 5000 ms `physicsTs` checkpoints (the diag emitter's convention), hashed the same way.
Checkpoints are what turn "the winner matched" into "the whole race matched".

## Scope — read this before trusting a green result

The two arms **share the per-frame loop** (`runSingleRace`). The forces have been single-sourced
since FORCE-PARITY, and re-implementing that loop in the harness would only test the
re-implementation. What the golden test genuinely proves is:

- **input-derivation equality** — the layer where every real divergence has actually lived
  (D-GRID, D-STREAM, D-DUR, O1), and
- **end-to-end determinism** — same identity, same race, every checkpoint.

It does **not** prove that two independent physics implementations agree, because there is only
one. The arms differ where the engines really differ: arm A reads the **browser config loaders**
(`loadBaseSpeedConfig` / `loadRaceDynamicsConfig` / `loadRaceBehaviorConfig`), the browser's
per-track default resolution, and RaceScreen's own `dynamicsConfig.X ?? fallback` plan wiring; arm B
reads the `DEFAULT_*` objects and the sim CLI's laps/seconds resolution and its own plan wiring.
The two plan-config mappings are written out **twice on purpose** — a shared helper there would
hide precisely the drift the test exists to catch.

**The stronger version** needs RaceScreen's ~200-line init effect extracted into an importable
`createRaceFromIdentity()` that the browser renders through and the harness calls directly. That is
a shipped-code change, which tonight's rules forbid — see *Autonomous decisions* below.

## How to run it

```sh
# the standing guard (4 identities, ~11 s) — runs with the normal suite
cd client && npx vitest run src/modules/parity/goldenEquality.test.js

# the broad sweep
node scripts/parity/soak.mjs                                  # full 600-identity matrix
node scripts/parity/soak.mjs --limit=50                       # smoke
node scripts/parity/soak.mjs --json=reports/parity/rows.json  # machine-readable rows
```

Files: `client/src/modules/parity/raceIdentity.js` (identity + outcome hashing),
`scripts/parity/goldenRunner.mjs` (the two arms),
`client/src/modules/parity/goldenEquality.test.js` (the standing guard),
`scripts/parity/soak.mjs` (the sweep).

---

# Part C — the overnight soak

## Matrix

**600 identities** (the spec asked for ≥ 300):

| axis | values |
|---|---|
| tracks | all 10 shipped (5 closed, 5 open) |
| types | each track's **default** type **and one non-default** type (10 distinct types in play) |
| shapes | `closed` (300), `open-in-range` (150), `open-slowdown` (150) |
| racer counts | 20 (200), 40 (200), 60 (200) |
| seeds | 1, 7, 42, 101, 2024 |
| laps | closed tracks additionally run 1 lap alongside the track default |

## Result — ALL EQUAL

```
identities checked : 600
equal              : 600
mismatched         : 0
errors             : 0
runtime            : 4585.7 s  (76.4 min)
ALL EQUAL — parity holds across the matrix.
```

**Mismatch list: empty.** Not one identity in 600 produced a different outcome hash between the
browser's derivation chain and the sim's — finishing order and every 5-second checkpoint identical,
exactly, with no tolerance applied anywhere.

Raw rows: `reports/parity/golden-soak-rows.json` (600 rows: label, identity hash, both outcome
hashes, realized duration, paceScale, finishT, racePlanEnabled). Console log:
`reports/parity/golden-soak.log`.

### Why this result is not vacuous

| check | value |
|---|---|
| distinct outcome hashes across the 600 rows | **600 / 600** — every identity produced its own race |
| shapes actually exercised | closed 300, open-in-range 150, **open-slowdown 150** |
| rows genuinely running below full pace (`paceScale < 1`) | **150** |
| rows with `racePlanEnabled = false` | **195** — the plan gate is exercised in both states |
| distinct tracks / racer types | **10 / 10** |
| racer counts | 20 (200), 40 (200), 60 (200) |
| realized duration range | **19.9 s – 282.8 s** |

A harness that made all outcomes identical would show 1 distinct hash, not 600. Separately, the
standing test carries an explicit **negative control**: feeding the two arms *different* identities
must produce unequal hashes **and** localize the first divergence (it does — `checkpoint @ 5000 ms,
max |Δt| = 4.2e-2`), while the same identity through both arms must localize `null`. Without that
control a green soak would prove nothing about the comparison itself.

### A harness fix, and why the numbers still stand

Mid-run I found a latent trap in `goldenRunner.execute()`: it re-read `laps` / `requestedSeconds`
from the identity instead of using the arm's own resolved inputs. Had those ever diverged, the
harness would have compared a race against a model of a *different* race — a false-parity risk.
Fixed: `execute()` now takes the resolved inputs from the arm that derived the model.

The soak already running had loaded the pre-fix module. The fix is **provably behaviour-neutral for
every identity `buildIdentity` emits** (closed identities always carry `laps`; open identities always
carry `requestedSeconds`, so the old `?? ` fallbacks never fired). Rather than assert that, I
captured three hashes with the **post-fix** module and checked them against the soak's rows:

| identity | expected (post-fix) | soak row (pre-fix) |
|---|---|---|
| city-circuit/motorbike/closed/n=20/seed=1 | `5b72ffce` | `5b72ffce` ✓ |
| city-circuit/motorbike/closed/n=20/seed=1/laps=1 | `04591377` | `04591377` ✓ |
| river-run/duck/open-in-range/n=20/seed=1 | `14bbb518` | `14bbb518` ✓ |

3/3 match, so the reported run stands as-is. The committed harness is the fixed one.

### What this does and does not establish

**Does:** given one race identity, the browser's input-derivation chain and the sim's produce the
same race — same finishing order, same per-racer `t` at every checkpoint — across all 10 tracks,
both topologies, all three model shapes, 10 racer types, three field sizes and five seeds. The
duration scalars agree before a frame is stepped, and the races stay identical to the finish. The
parity promise is **proven standing** at this scope.

**Does not:** prove two independent physics implementations agree — there is only one, shared. See
*Scope* above and autonomous decision 1.

---

# Autonomous decisions made tonight

The owner was asleep and the planner offline; these were decided without input, with reasons.

1. **The golden arms share the per-frame loop rather than re-implementing it.** Extracting
   RaceScreen's init into an importable factory is the correct way to make arm A independent, but
   it is a shipped-code change and tonight's rules forbid that after the amendment. Re-implementing
   the loop in the harness instead would have made every mismatch ambiguous (mirror bug vs real
   divergence) — the exact trap the earlier micro-divergence work called out. Recorded as the
   follow-up, and the scope limit is stated wherever a green result is claimed.
2. **Matrix sized to 600, not 300.** Compute was explicitly generous and the axes multiply out
   naturally to 600; a bigger sample costs only wall-clock and strengthens the claim.
3. **Alternate types are chosen for pace diversity, not surface legality.** Surface compatibility
   is a setup-screen concern; the physics and the duration model never consult it. Pairing e.g.
   `dirt-oval` with `motorbike` exercises a second multiplier on that geometry, which is the point.
4. **Open-track seeds restored to the authored seconds.** The ship had baked the once-clamped value
   into the seed; with the pace now type-aware that value was stale in a way that would keep
   drifting. Storing intent and clamping at read time makes the clamp a pure function of pace.
5. **The `laps` axis includes 1 lap.** Otherwise the closed axis would be "the track default"
   repeated five times per seed, and a lap-count-dependent divergence could hide.
6. **`t` compared at 6 dp, finish times at 6 dp.** Below that the two engines are the same float;
   pinning more digits would make the hash sensitive to noise no observer could ever see.
7. **The soak reports every mismatch and never stops early**, per the instruction that mismatches
   are findings for the morning, not bugs to fix overnight.
8. **`soak.mjs` guards `main()` behind direct invocation.** An early smoke test imported the module
   and silently launched a full 600-identity run; the guard makes importing `buildMatrix` free.
9. **Added a negative control to the standing test** after noticing a green soak would be vacuous if
   a harness bug made all outcomes identical. The comparison must be able to fail, and is now
   asserted to.
10. **Kept the running soak rather than restarting it after the `execute()` fix**, because the fix is
    provably inert for the identities in play — and verified that with three post-fix spot-check
    hashes instead of asserting it. Restarting would have cost another 76 minutes for no new
    information.

# What remains

- the owner's **browser cross-check** of the three acceptance orders above
- the owner's **final normal-speed pick** by eye (Dev Screen → Dynamics → Speed → Normal Track
  Speed; provisional 225 px/s)
- the **single full re-baseline**, which waits for that pick
- the **backup tag**, which waits for the cross-check
- the follow-up in decision 1: extract `createRaceFromIdentity()` so the golden test's browser arm
  becomes genuinely independent of the sim's loop
