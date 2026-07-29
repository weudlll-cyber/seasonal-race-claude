# MERGE-SHIP-1 — COMBO15 becomes the game; the source gets clean

**Branch `exp/fair-arrival` → `master`. Author: CC.** The owner's charter: promote COMBO15 from a
flag-gated candidate to the DEFAULT shipped world, PROVE the flip is exactly combo15 (not an approximation),
strip the experiment scaffolding out of the client source, re-seal every gate, and merge. No tuning — the
mechanism and its gains are the ones the binding N=100 gate already recorded; this task ships them.

## VERDICT (read first): SHIPPED. Flip is byte-exact; source is clean; all seals green.
The new defaults reproduce the combo15 explicit-flag world **hash-for-hash on every track** (equality proof
below). The client source no longer contains the `?world`/`?eye` viewer, `worldMode.js`, or the dead
`steerBoostCap` lever — the mechanism survives only as ordinary config keys. Full client suite **3319/3319
green**, fingerprint **`ded0a126048e4cdb`** minted on the committed state, eslint + production build clean.

---

## 1. THE EQUALITY PROOF — the flip is exactly COMBO15

The flip pins six values into `DEFAULT_RACE_DYNAMICS_CONFIG`: `racePlanPulkStart 0.25→0.15`, and the new keys
`chaosSteer:true / chaosSteerGain:0.06 / bandBias:true / bandBiasR:0.6 / bandBiasGain:0.1`. To prove the
flagless default now IS combo15 (and not a near-miss), two fingerprint runs over all 10 tracks, seed=1,
races=3, track-defaults:

| run | how COMBO15 is reached | COMBINED hash |
|---|---|---|
| flagless default (`fingerprint-default.mjs on`) | the pinned defaults, no flags | **`ded0a126048e4cdb`** |
| explicit flags (`--chaosSteer=true --chaosSteerGain=0.06 --bandBias=true --bandR=0.60 --bandBiasGain=0.10 --pulkStart=0.15`) | forced on top of the old defaults | **`ded0a126048e4cdb`** |

**Per-track hashes are identical (diff empty).** The flip is combo15 exactly — the shipped game is the world
the gate measured. The OFF invariant `f8f7d9c2fd3283e9` is unchanged; setting `chaosSteer:false bandBias:false
pulkStart:0.25` reproduces the pre-combo15 anchor `7c70b1eae7d31e22` (valid slider positions — parity rule).

A **defaults-pinning unit test** locks the six values: `raceDynamicsConfig.test.js` now asserts the loaded
config equals the combo15 numbers (`pulkStart:0.15` + the five new keys) and carries a dedicated
`it('COMBO15 is the shipped world …')` block. If anyone edits a default, this test fails loudly.

---

## 2. WHAT WAS REMOVED — file by file (STAGE 2 cleanup)

The owner's order was "the source stays clean": the experiment's viewing/attribution scaffolding leaves the
client; the shipped mechanism stays as plain config; all observers/harnesses/reports stay in `scripts/` &
`reports/`.

| file | change | lines |
|---|---|---|
| `client/src/utils/worldMode.js` | **DELETED** (`git rm`) — the `activeWorld()`/`worldFlags()` `?world` machinery | −59 |
| `client/src/screens/RaceScreen/index.jsx` | removed the `worldMode` import, the `?world` flag injection + fresh-seed override, the green/blue/red WORLD **badge**, the race-start **console proof** line, the frame-loop **in-band-at-chaos-end LIVE PROOF** block, and reverted the two HUD-pill y-shifts that made room for the badge | +3 / **−96** |
| `client/src/modules/racePlanner.js` | removed the **`steerBoostCap`** boost-side clamp (dead lever — STEER-CAP-1 earned-KILL): `_chaosSteer` back to `{ gain }`, the OUTCOME clamp back to `maxMult` | +2 / −12 |
| `scripts/sim-fairness.mjs` | removed `FA_STEER_BOOST_CAP` + its `steerBoostCap:` threading; the FA flag defaults now **inherit `DEFAULT_RACE_DYNAMICS_CONFIG`** so a flagless sim run reproduces the shipped world (same shared-default pattern as `pulkStart`) | +11 / −11 |
| `scripts/exp-fair-arrival.mjs` | removed the `combo15cap104` / `combo15cap106` boost-cap sweep arms (the dead lever's driver) | −3 |

**KEPT, as ordered:** the mechanism as ordinary config keys (`defaults.js`); the read-only observers
(`scripts/sim/observers/front-liveliness.mjs`, LAW + PULK watchdog); the gate/driver harnesses
(`exp-fair-arrival.mjs` arms ship/chaosSteer/faB60/combo/ship15/combo15); every report. The old-world values
(0.25 window, steer/bias OFF) remain reachable as normal config numbers — nothing that was a valid slider
position was deleted.

**Dangling-reference sweep:** `grep -rn "worldMode|activeWorld|worldFlags"` and `"steerBoostCap|boostCap"`
over `client/src` + `scripts` → **zero hits**. No `?world`/`?eye` query reads remain in RaceScreen.

---

## 3. THE SEALS (STAGE 3)

- **Golden parity re-recorded.** The sim arm's `simPlanConfig` (goldenRunner.mjs) was missing the combo15
  keys the real browser arm (raceCore) already threaded, so realArm ≠ simArm under the new defaults. Fixed by
  mirroring the combo15 keys into `simPlanConfig` (matching `browserPlanConfig`). After the fix **realArm ==
  simArm holds byte-for-byte** on all seeds (the parity guarantee). The one hardcoded outcome anchor that
  moved: `goldenEquality` seed=1 winner **idx 27 → 38** (seeds 7→17, 42→21 unchanged); re-recorded with the
  pre-combo15 value noted in the comment. Precedent: BASELINE-INVALIDATED — a defaults change moves outcome
  hashes; the equality/hash check is the guarantee, the winner index is a concrete anchor.
- **Full client suite: 161 files / 3319 tests, all green.**
- **Fingerprint re-minted on the committed state:** `ded0a126048e4cdb` (ON) / `f8f7d9c2fd3283e9` (OFF).
  Documented in [docs/SIM.md](../../docs/SIM.md) *Fingerprint rule*; the pre-combo15 print `7c70b1eae7d31e22`
  is recorded as the anchor with the exact flags to reproduce it.
- **eslint** (`eslint src`) exit 0. **Production build** (`npm run build`) exit 0 (232 modules).

---

## 4. THE SHIP (STAGE 4)

- **REBASELINE.md** ([reports/parity/REBASELINE.md](../parity/REBASELINE.md)) carries a new
  current-baseline block at the top: COMBO15 is the shipped truth on top of the speed-150 + G0.5/s1.0
  substrate; golden numbers from the gate record (arrival 85–90%/track, per-row floors ≥ship on all 10,
  frontContest ≥ship on all 10, Holm worsened on none, the pulk-fix means); the **v2 duration-relative PULK
  watchdog** (chaos maxGap ≤ ship×1.5) is written in as the permanent gate line, with the documented residuals
  (space-sprint ~1.6× chaos-gap overshoot, garden-path arrival ceiling 86%).
- Merged `exp/fair-arrival` → `master`; tag `v-ship-combo15` + return point `pre/ship-combo15` (`215afde`)
  both on origin. `git log origin/master --oneline -5` verified (see foot).

---

## THE FIVE SENTENCES
1. The flagless shipped default now reproduces the combo15 explicit-flag world hash-for-hash on all ten tracks
   (`ded0a126048e4cdb` both ways, per-track diff empty), so the flip is combo15 exactly, not an approximation.
2. The mechanism ships as six ordinary config keys — `pulkStart:0.15` + `chaosSteer/chaosSteerGain/bandBias/
   bandBiasR/bandBiasGain` — with a pinning unit test that fails if any default drifts, and the OFF world
   (steer/bias off, window 0.25) still reproduces the pre-combo15 game byte-for-byte.
3. The client source is clean: `worldMode.js` deleted, the `?world` viewer + badge + console/LIVE-PROOF blocks
   removed from RaceScreen (−96 lines), and the dead `steerBoostCap` lever pulled from racePlanner + sim +
   driver, with a zero-hit dangling-reference grep.
4. Every seal is green — full client suite 3319/3319, the golden parity re-recorded (realArm == simArm
   byte-identical; seed-1 winner anchor 27→38), fingerprint `ded0a126048e4cdb` minted on the committed state,
   eslint + build clean.
5. REBASELINE.md now names COMBO15 the current baseline with the gate's golden numbers and the v2
   duration-relative PULK watchdog as a permanent gate line, and the ship is merged, tagged, and pushed.

## PROPOSALS (≥2)
1. **Chase the one real chaos-gap miss (space-sprint ~1.6× ship) with the boost-side gain shaping, NOT a new
   force.** STEER-CAP-1 killed the crude upper-clamp (capping the boost let chasers close less, so the P1→P2
   gap widened — the opposite of the goal). The live lever is the *shape* of the steer near the band edge: a
   partial-sort / band-edge target that reduces how far the deepest out-of-band racer is flung toward the
   ceiling during chaos, blunting the breakaway depth without lowering arrival or touching the pulk hold. One
   flag, sim-first, gated against the v2 watchdog — the only track it needs to move is space-sprint.
2. **Treat garden-path's 86% arrival ceiling as a track-geometry property, not a mechanism gap, and document
   it as an accepted floor exception.** Ship already sits at 83% there and combo15 lifts it only to 86%; the
   +3pp shape matches every other track, so the ceiling is structural (that track's start-row geometry), not a
   steer failure. Rather than tune the global mechanism to chase one track past 88%, add a per-track
   accepted-floor note to the gate so garden-path stops reading as a recurring "miss" on every future run.
3. **Now that the viewer scaffolding is gone, if the owner wants future eye-tests they should come from a
   DevScreen toggle over the real config keys, not a `?world` URL hack.** The keys are all live and
   UI-configurable already; a small "load COMBO15 / load pre-combo15" preset pair in the Race Tuning card
   would give the same A/B the `?world` viewer gave, but through the shipped config path (parity-safe, no
   dev-only source to strip next time).

---
**Branch `exp/fair-arrival` → `master`.** Backup/return point `pre/ship-combo15` = `215afde` (on origin).
Ship fingerprints: ON `ded0a126048e4cdb`, OFF `f8f7d9c2fd3283e9` (pre-combo15 anchor `7c70b1eae7d31e22`).
Gate record: [FAIR-ARRIVAL-GATE.md](FAIR-ARRIVAL-GATE.md). **Merged, tagged `v-ship-combo15`, pushed.**
STOP for the owner's browser sanity race on master (no param — the game IS combo15). The DOCS spec follows as
its own block.
