# ENDGAME-FALLBACK-1 — one home for `endgameThreshold`, and the fallback was reachable after all

**Branch `fix/endgame-fallback`, 2026-08-18. The first ship under the new SHIP ORDER**, so this
report also states plainly whether the tag's own SHA passes.

**Nothing minted**: CAMERA and RENDER were measured on the merged tree and are byte-identical to
their recorded values. A mint records a MOVEMENT and there was none.

---

## 1. Removed, not synced

`cameraTimingComputation.js` carried `const ENDGAME_PROGRESS_THRESHOLD = 0.85;` beside the key —
**two ships stale**, 0.9 and then 0.95 having gone past it — alive behind a granted "UNFIREABLE"
exception in `check-fallback-agreement`.

**It could simply be deleted, so it was.** The file already imports `DEFAULT_CAMERA_CONFIG`, and
every other top-level key in `computeTimingFromConfig` already reads it; this was the last literal
among them. The line is now `config?.endgameThreshold ?? DEFAULT_CAMERA_CONFIG.endgameThreshold` and
the constant is gone. **A mirror that cannot drift beats a mirror that is currently in step** —
Lesson 207, which the second copy was a standing example of.

**The exception was DELETED rather than updated.** With no second copy there is nothing to except.

## 2. Which reason the guard is green for

`check-fallback-agreement` passes **because the mirror is gone, not because the two numbers now
agree.** That distinction is the whole point of the block: a synced copy would have been green today
and stale again at the next ship, which is exactly what happened twice already. The guard's census
now reads **392 mirrored fallbacks, 351 by reference, 36 disagreeing (36 exempted, 0 new)** — one
fewer disagreement than before, and it left the list by disappearing.

## 3. THE FALLBACK WAS REACHABLE — by the tests, not by the product

The exception's justification was "the director is always constructed with a loader-resolved camera
config, so the fallback is never reached". **That is true of every shipped path and false of the test
suite**, which builds `new CameraDirector()` with no config at all. Three tests went red on the
removal:

- `LEAD_CHANGE blocked during endgame when cooldown not elapsed`
- `_camT is snapped to new leader T at LEAD_CHANGE entry (endgame path)`
- `mandatory endgame LEADER fires even with all pool weights 0`

All three drove a leader at a `t` chosen to clear the old literal `0.85`, and none of them clears the
shipped default. **So the wrong number was not merely documentation — it was the number three tests
were silently written against.** They were passing for a reason that had nothing to do with the
product.

**All three fixtures are DERIVED now**, from `DEFAULT_CAMERA_CONFIG.endgameThreshold`. The third one
needed **both** gates rather than one: placed midway between the threshold and the line it landed
past `photoFinishLeadProgress`, where the photo finish takes the shot and the endgame `LEAD_CHANGE`
path the test is about never runs. It sits midway between `endgameThreshold` and
`photoFinishLeadProgress` and follows both.

**The `no config` test now asserts the RULE rather than a number** — `_endgameThreshold` equals
`DEFAULT_CAMERA_CONFIG.endgameThreshold` — so it cannot go stale when the default moves again.
**IF DELETED:** nothing states that a director built with no config still resolves this key to the
shipped value, which is the property that made the old literal unreachable in production and
therefore invisible for two ships.

## 4. Fingerprints — measured where the closure said to

| instrument | closure | contains `cameraTimingComputation.js`? | action |
| --- | ---: | :---: | --- |
| `camera-fingerprint.mjs` | 36 | **YES** | measured — **unmoved** |
| `render-fingerprint.mjs` | 55 | **YES** | measured — **unmoved** |
| `fingerprint-default.mjs` (WORLD, WORLD-OFF) | 36 | no | not measured |

**Both byte-identical to their recorded values, so nothing was minted.** The brief called a movement
here "the finding — the path was reachable after all". It did not move, and that is the proof the
product never took the path: the reachability turned out to be entirely inside the test suite, where
a fingerprint cannot see it.

Tracking lag was **re-stamped, not re-measured**, and the corroboration is arithmetic rather than the
usual closure argument — `cameraTimingComputation.js` genuinely IS inside `tracking-lag.mjs`'s load
closure, so "the tool cannot reach it" was not available. Two unmoved fingerprints are a stronger
statement: no camera decision and no framing changed, so the lag inside states cannot have moved.

## 5. The siblings — a finding, deliberately not fixed

**Three keys in the same file still carry a second copy, and all three are stale:**

| key | default | fallback in `cameraTimingComputation.js` |
| --- | ---: | ---: |
| `comebackMinStartGap` | 0.25 | **0.4** |
| `comebackMaxCurrentRankPct` | 0.2 | **0.1** |
| `maxStateDuration` | 4000 | **8000** |

The first two are worse than stale: they are **wrong in the same direction in two files at once** —
`CameraAdvancedSection.jsx` carries the identical wrong pair, so a reader who cross-checks finds
agreement and concludes the numbers are right. `maxStateDuration`'s fallback is **double** the
shipped value.

**Not fixed here, per the brief.** Each needs the same treatment this one got — delete the copy,
re-point whatever pins the literal — and each will surface its own set of fixtures written against
the wrong number, which is a bigger block than this one. Repository-wide the census stands at **36
disagreeing mirrors**, all exempted, all of them this same shape.

## 6. The new ship order, used rather than argued

This is the first ship under [SHIP-CEREMONY § THE SHIP ORDER](../../docs/SHIP-CEREMONY.md): the
register line for `v-ship-endgame-fallback` is written **on the branch**, so the merge commit
registers its own tag.

**One correction to that order came out of using it, and it is recorded in the ceremony rather than
here**: step 6 said `npm run verify` on the branch would now include `check-tags`. It cannot. A
register line for a tag that has not been pushed yet fails the guard's SECOND direction — "every
registered tag exists at origin" — for as long as the branch is unmerged.

**That is not a defect in the new order; it is the inconsistency window moving, and it moves in the
right direction:**

| | old order | new order |
| --- | --- | --- |
| where the inconsistency lives | **in history, permanently** — the merge commit forever fails `check-tags` | **on the unmerged branch, transiently** |
| when it ends | never | the moment master and the tag are pushed together |
| what a checkout of the tag shows | red | green |

**Whether the tag's own SHA passes** is stated at the end of this report, after the fact rather than
before it.

---

## PROPOSALS

1. **Do the three siblings as one block, not three.** §5 shows they share a shape, a file and — for
   two of them — a second wrong copy in the Dev Screen. Removing all three copies at once costs one
   pass over the fixtures instead of three, and it would take `cameraTimingComputation.js` to zero
   literal fallbacks, which is a state worth being able to assert.
2. **When an exception says "UNFIREABLE", record WHO can still reach it.** This one said the product
   cannot, and was right; it did not say the test suite can, and three tests were quietly depending
   on the value. **An exception that names the reachable callers would have predicted every red in
   this block** — and would have made the 36 remaining exceptions honest about what a removal costs.
3. **Ask whether `maxStateDuration`'s doubled fallback is really unreachable**, before it is merely
   synced. It is the one of the three where a wrong value would change the picture rather than a
   number in a file, and "no shipped caller omits the key" is a claim about today's call graph that
   nobody re-checks.
