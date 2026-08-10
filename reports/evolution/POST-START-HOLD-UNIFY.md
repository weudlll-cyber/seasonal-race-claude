# POST-START-HOLD-UNIFY — there were never two clocks. There was one clock and one dead parameter.

**Branch** `feat/post-start-hold-unify`, cut from `feat/canvas-scale-1`. **Not merged.**
**WORLD `dc4647be0f55ebdb` unchanged** — byte-identical by construction and re-measured to say so.
Camera and render untouched.

The owner's decision was to unify the two `postStartHoldMs` clocks, "since it happens so rarely".
The constraint on the piece was that "rarely" is not "harmlessly" when the thing on the other side is
the race outcome. **The constraint turned out not to bind, for a reason nobody had established: one
of the two clocks was never wired to anything.**

---

## 1. WHICH MEANING IS CORRECT — and the evidence

**The camera's.** `postStartHoldMs` is a DURATION measured from the END of the 3 s start overview, so
the hold ends at `START_PHASE_DURATION + value` — 10 s after the gun at the shipped 7000. Every
independent statement of the key agrees:

- `CameraDirector.js` tests `raceElapsed < START_PHASE_DURATION + this._postStartHoldMs` — the `+`
  is the meaning.
- the `defaults.js` comment: _"ms of forced LEADER after the 3s start phase (no BATTLE before 10s
  total)"_ — a duration, and it even names the total.
- the Dev Screen tooltip: _"After the 3s start overview the camera holds LEADER_ZOOM for this
  duration"_.
- `docs/CAMERA_DIRECTOR.md`: _"Post-start hold (`+ postStartHoldMs`)"_.

**Nothing supports the planner's reading.** `racePlanner.js` took the same key as an ABSOLUTE floor
from zero — `pulkStart = Math.max(postStartHoldMs, fraction × duration)` — with no comment
justifying it. Read as "the PULK phase may not begin while the camera is still forced on the
leader", which is the only intent that makes sense of it, it was **3000 ms wrong on its own terms**.

## 2. THE FINDING: the planner's clock has never run

`config.postStartHoldMs ?? 0`. **No caller of `createRacePlan` anywhere in the repository passes that
key.** All five were read:

| caller | passes `postStartHoldMs`? |
| --- | --- |
| `client/src/modules/raceCore.js` — the browser and the golden harness | **no** |
| `scripts/sim-fairness.mjs` | **no** |
| `scripts/parity/goldenRunner.mjs` | **no** |
| `scripts/diag/acceptance-orders.mjs` | **no** |
| `scripts/diag/micro-divergence.mjs` | **no** |

So the fallback resolved to 0 on every race ever run, and `Math.max(0, x)` is `x` for every `x` that
expression can produce. **The floor has never bound. There was no second clock — there was a
parameter that looked like one.**

This also corrects a claim the repository was carrying. `scripts/check-fallback-agreement.mjs`
justified its exception for this pair with _"raceCore sets postStartHoldMs in the plan config, so
`?? 0` never runs"_. It does not, and the fallback ran on every race. The entry was right that it
could not fire and wrong about why — recorded here rather than quietly deleted.

## 3. WHAT WAS BUILT — the direction that leaves the world untouched

The brief's rule 2: prefer the direction that does not move the world. Removing the dead reading is
that direction, and it is stronger than "does not move the world in the sample" — it is
**byte-identical for every duration, every track and every seed, by construction**. Re-measured
anyway: `node scripts/fingerprint-default.mjs` → **`dc4647be0f55ebdb`**, all ten per-track values
unchanged.

- `racePlanner.js` — the floor is gone; `pulkStart` is `fraction × duration`, full stop. The comment
  in its place says why it could go and what wiring it properly would cost.
- The stale comment in `createTrajectoryController` ("including any postStartHold offset baked into
  pulkStart") no longer describes anything and says so.
- `check-fallback-agreement.mjs` — the exception is removed (the guard fails on a stale exception, so
  this was not optional) and the header's "two of these" is now "one".
- **Two tests changed rather than deleted.** `respects postStartHoldMs as minimum pulkStart` was the
  ONLY place in the repository where that floor was ever exercised; it is **inverted** into
  `does not read postStartHoldMs — it is a CAMERA key and the planner ignores it`, which pins the
  property the removal establishes and is what a well-meaning re-introduction would break. The
  single-source fraction test used `postStartHoldMs` as a vehicle to make the derived fraction differ
  from the raw one; it now uses a caller-supplied `pulkStart` fraction and states the property
  directly.

## 4. WHAT THE CORRECT WIRING WOULD COST — measured, because the owner may still want it

The brief's rule 3 asks for this even though it did not fire. If the planner's floor were **wired
correctly** — a floor at the moment the camera's hold ends, `3000 + 7000 = 10000 ms` — here is the
bill, measured by running `fingerprint-default.mjs` against exactly that change and then reverting
it:

**New world fingerprint would be `792299983c98d25d`** (from `dc4647be0f55ebdb`).

**Per track — 5 of 10 outcome hashes change:**

| moved | held |
| --- | --- |
| luger-hill, mountainstreet, river-run, searound, seatrack | city-circuit, dirt-oval, garden-path, ice-track, space-sprint |

**Why those, and what the boundary actually does.** The floor binds when
`0.15 × realizedDuration < 10000`, i.e. **whenever a race finishes in under 66.7 s**. Realized
durations, measured through `scripts/lib/raceDriver.mjs` at n=40, raceSeed 5601, 60 s requested:

| track | realized | `0.15 × duration` | floor at 10000 |
| --- | --- | --- | --- |
| garden-path | 212.1 s | 31818 | inert |
| dirt-oval | 87.2 s | 13083 | inert |
| city-circuit | 77.8 s | 11676 | inert |
| ice-track | 73.5 s | 11028 | inert |
| searound | 62.4 s | 9358 | **binds** → 10000 |
| luger-hill, mountainstreet, river-run, seatrack, space-sprint | 60.0 s | 9000 | **binds** → 10000 |

**Six boundaries move; five outcomes move.** space-sprint is the honest anomaly and worth stating:
its CHAOS→PULK boundary moves by a full second and its outcome hash does not. A moved phase boundary
is not automatically a moved race, which is exactly why this was measured rather than argued from
the arithmetic.

**That is a REBASELINE and it is his.** It would need the full ship ceremony — the paired N=100 gate,
the new baseline block, the lineage, the golden re-pins. Nothing here does any of it.

## 5. The name

**The key is deliberately NOT renamed.** After §3 there is one quantity with one reader, so the two
meanings the brief was worried about no longer coexist — and a rename would cost the owner his stored
value: the camera loader rebuilds the live config **key by key from the default keys**, so a stored
`postStartHoldMs` with no matching default is silently dropped (this is the exact mechanism
`check-config-keys.mjs` exists for). A cosmetic gain is not worth a silently discarded setting.

What the key measures is instead stated **at its definition**, in the three places a reader lands:
`defaults.js` (the definition), `CameraDirector.js` (the only reader), and
`docs/CAMERA_DIRECTOR.md` (the description of the priority chain). All three now say the same thing:
a duration added to the 3 s overview, so the hold ends at 3000 ms plus the value.
