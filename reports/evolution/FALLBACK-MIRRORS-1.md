# FALLBACK-MIRRORS-1 — the last three copied defaults in the camera, and what "unreachable" meant this time

**Branch `fix/fallback-mirrors`, 2026-08-18.** Shipped under the corrected ceremony order: the
register line, the report and its INDEX entry are written on the branch, so the merge commit
registers its own tag.

**Nothing minted.** CAMERA and RENDER were measured on the merged tree and are byte-identical to
their recorded values — the proof no shipped path was taking a stale value.

---

## 1. Reachability, established per key BEFORE anything changed

The last block's exception said "unreachable" and was false — four tests reached the path. So this
time the question was asked of each key first, and **measured** rather than read.

| key | shipped default | stale copy | which callers reach the fallback | shipped path? | tests on the literal |
| --- | ---: | ---: | --- | :---: | ---: |
| `comebackMinStartGap` | 0.25 | **0.4** ×2 files | only a caller passing a config without the key | **no** | **0** |
| `comebackMaxCurrentRankPct` | 0.2 | **0.1** ×2 files | same | **no** | **0** |
| `maxStateDuration` | 4000 | **8000** | only the LEGACY branch — a config with no `cameraStateProfiles` | **no** | **3** |

**The comeback pair.** Both sites — `cameraTimingComputation.js` and `CameraAdvancedSection.jsx` —
read a loader-resolved config, so neither `??` ever fires. `computeTimingFromConfig(DEFAULT_CAMERA_CONFIG)`
resolves them to **0.25 / 0.2**; only `computeTimingFromConfig(null)` produced 0.4 / 0.1. No test
named either literal.

**`maxStateDuration` is not the simple case it looked like, and the difference decided the fix.**
`MAX_STATE_DURATION = 8000` is used in **two different roles** in the same file:

- In the **legacy branch**, `config?.maxStateDuration ?? MAX_STATE_DURATION` — a genuine mirror of
  the top-level key, and the one the guard flagged.
- In the **profiles branch**, `profMax('LEADER_ZOOM', MAX_STATE_DURATION)` — the fallback for a
  per-state PROFILE that lacks the field. **That is a different quantity that happens to share a
  name**, and pointing it at the top-level default would have been the wrong fix.

Measured on the shipped config: `cameraStateProfiles` is present, so **the profiles branch is taken
and the legacy line never runs.** The resolved `maxStateDuration` is 4000 — and it comes from
`cameraStateProfiles.OVERVIEW.maxStateDuration`, not from the top-level key at all, which happens to
be the same number. **So the top-level `maxStateDuration` default is unread in the shipped path**, and
the guard's pairing of it against the legacy fallback compares two numbers that never meet.

## 2. What was removed, and why the guard is green

**All four copies REMOVED, none synced.** Every one could read `defaults.js`, and both files already
imported it.

| key | site | reason the guard is green |
| --- | --- | --- |
| `comebackMinStartGap` | `cameraTimingComputation.js` | **mirror gone** |
| `comebackMinStartGap` | `CameraAdvancedSection.jsx` | **mirror gone** |
| `comebackMaxCurrentRankPct` | `cameraTimingComputation.js` | **mirror gone** |
| `comebackMaxCurrentRankPct` | `CameraAdvancedSection.jsx` | **mirror gone** |
| `maxStateDuration` (legacy branch) | `cameraTimingComputation.js` | **mirror gone** |

Not one is "synced". `MAX_STATE_DURATION` survives in the file because its OTHER role is real and is
not a mirror of anything — that is stated at the site so the next reader does not "finish the job".

**The guard then failed for a new reason, and it was right to.** With the copies gone it reported the
five exception entries as **STALE** — an exception that no longer describes a real disagreement. It
refuses to let a granted exemption outlive its defect, which is exactly the property that would have
caught this drift earlier. The five entries are deleted.

**The two identical wrong copies were the dangerous part.** `CameraAdvancedSection.jsx` carried the
same 0.4 and 0.1 as the engine, so a reader cross-checking the pair found **agreement** and concluded
the numbers were right. **Two copies of one wrong number are worse than one, because they manufacture
corroboration** — and one of them sat in the panel you would open to judge that very number.

## 3. Three tests were written against the `maxStateDuration` literal

The pattern from the last block repeated, and only the suite revealed it — two were found by name and
**the third only by running everything**:

- `computeTimingFromConfig — null config › uses fallback maxStateDuration` (8000)
- `CameraDirector › no config: fallback _maxStateDuration=8000 …`
- **`CameraDirector › does not transition before 8s have elapsed`** — the "8s" and its drive point of
  7999 ms *were* the legacy fallback. Nothing in its name mentioned the key.

All three now assert the **rule**: `DEFAULT_CAMERA_CONFIG.maxStateDuration`. The third drives at
`maxStateDuration - 1` and is renamed *"does not transition before the state cap has elapsed"* —
what it states is unchanged.

**IF DELETED:** the first two leave nothing stating that the legacy path — the only path where the
top-level key is read at all — resolves this key; the third leaves nothing stating that a state does
not transition before its own cap, which is the behaviour the cap exists for. Full suite:
**4091 passed**.

## 4. Fingerprints — measured where the closure said, and nothing moved

| instrument | closure | contains a changed file? | result |
| --- | ---: | :---: | --- |
| `camera-fingerprint.mjs` | 36 | **YES** (`cameraTimingComputation.js`) | **unmoved** |
| `render-fingerprint.mjs` | 55 | **YES** (same) | **unmoved** |
| `fingerprint-default.mjs` (WORLD, WORLD-OFF) | 36 | no | not measured |

`CameraAdvancedSection.jsx` is in no instrument's closure — it is a Dev Screen panel.

**Both byte-identical, so the block merges without a mint**, and that is the evidence the brief asked
for: no shipped path was taking a stale value. Had either moved, the picture would have changed and
this would have stopped before the merge for the owner's eye.

## 5. The sibling census — reported, not fixed

**The camera is now clean: zero disagreeing mirrors in any `camera/` file.** What remains is all in
the race engine and one Dev Screen panel:

| file | disagreeing keys | inside the WORLD closure? |
| --- | ---: | :---: |
| `client/src/modules/raceCore.js` | 13 | **YES** |
| `client/src/modules/racePlanner.js` | 5 | **YES** |
| `client/src/screens/DevScreen/sections/DynamicsTuningSection.jsx` | 3 | no |
| `client/src/modules/raceBehavior.js` | 2 | **YES** |
| `client/src/modules/heroCurveGenerator.js` | 2 | **YES** |

Repository-wide the census now reads **392 mirrored fallbacks, 358 by reference (was 351), 29
disagreeing (was 36), all exempted, 0 new.**

**One reconciliation, because the two numbers do not match and guessing would be worse than saying
so.** The header counts 29 while the printer lists 25 unique `file:key` lines. Removing 5 printed
lines dropped the header by 7, which is the arithmetic of it: **the header counts SITES and the
printer lists unique file:key pairs**, and the Dev Screen carried each comeback key at two sites
(`value=` and `display=`). Nothing is missing; the two numbers measure different things.

**Deliberately not fixed here.** Twenty-two of the twenty-nine sit **inside the WORLD closure**,
where this block's "measure and merge if nothing moves" would become "measure and stop if anything
moves" — with the owner's eye owed on any movement. That is a different block with a different risk
profile, and it is the next decision rather than this one's.

---

## PROPOSALS

1. **Do the engine mirrors as a MEASURE-FIRST block, not a hygiene block.** The 22 sites inside the
   WORLD closure are the same shape as these five, but the stakes invert: here a moved fingerprint
   would have been a surprise, there it would be a changed race. **Sequence it as: remove copies →
   measure WORLD and WORLD-OFF → if either moves, stop and name the key.** The one useful thing this
   block proves is that the sequence works and costs one measurement.
2. **Make an exception state WHO can reach it, not merely that nobody does.** Two blocks running,
   "UNFIREABLE" meant "no shipped caller" and hid a test suite that reached the path — four tests
   last time, three this time, one of which named neither the key nor the value. **An exception that
   listed its reachable callers would have predicted every red both times**, and would make the
   remaining 29 honest about what removing them costs.
3. **Ask whether the top-level `maxStateDuration` key should exist at all.** §1 shows the shipped
   config never reads it: `cameraStateProfiles` decides, and the top-level default is live only on a
   legacy branch nothing takes. A config key that cannot affect the product is the same class of
   thing this block just deleted, one level up — and it has a Dev control.
