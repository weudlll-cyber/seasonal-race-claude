# RUNIN-EASED-ADMIT-1 — the width jumped because the ceiling had no continuity contract, not because the admit was instant

**Date:** 2026-08-26 · **Branch:** `feat/runin-level-set-1` · **BUILT, NOT MERGED** — his eye decides.

---

# THE CAUSE, FIRST — AND IT WAS NOT THE ONE-SIDED ADMIT ALONE

His instruction was to find the cause and not bridge over it. Following it changed what got built.

**The obvious answer was the asymmetry: the admit snaps, the release eases. That is real — but it is
one of THREE ways this term stepped, and it is not the one that produced the worst step in the
corpus.** Measured per stepping event over the closing phase, the worst single-frame corner movement
in each race divides like this:

| cause of the worst frame | races |
| --- | --- |
| ADMIT (set grows) | 3 — river-run s13, seatrack s7, city-circuit s7 |
| ADMIT + CROSSOVER | 1 — mountainstreet s24 |
| **RELEASE (set shrinks)** | **2 — river-run s18 (580.58 px, the worst in the corpus), dirt-oval s171** |
| RELEASE + CROSSOVER | 2 — mountainstreet s32, river-run s49 |

**The single largest step in the whole corpus is a RELEASE — and release was already eased.** An
eased admit would not have touched it. That is the finding that redirected the build.

## Why an already-eased quantity stepped by ×1.77

`river-run` seed 18, at the frame the level set drops 2 → 1:

```
 -0.150   guaranteed 1.370319   levelCeil 1.370319   levelPre 3.982388   set 2
 -0.133   guaranteed 2.425137   levelCeil 2.425137   levelPre 3.986762   set 1
```

**`levelPre` — the shot that would have been without the rule — is smooth across it (3.945 → 3.999).
The ceiling is what jumped.** And the ease was already running at the time.

The reason is its parameterisation. It anchored `_levelRiseFrom` **once** and then interpolated
toward a **live** target with a **running** clock. When the target moved mid-ease, the
already-elapsed fraction `e` was applied immediately to the new, much larger ratio — so the output
jumped by `(newTarget/oldTarget)^e` in a single frame. The arithmetic reproduces the observation
exactly: `1.34 × (3.9868/1.34)^0.544 = 2.4251`.

**A smoother that passes a step through, scaled by how far it happens to have travelled, is not a
smoother.** It is why easing the admit alone would have been the bridge he refused: it would have
added a second filter on top of a filter that does not filter.

## And a third boundary nobody had named: the exit

`mountainstreet` seed 32, at the crossing:

```
 -0.017   guaranteed 1.313935   levelCeil 1.313935   levelPre 3.998971   runInActive true    binding level
 -0.000   guaranteed 4.0        levelCeil null       levelPre 4.0        runInActive false   binding state
```

**×3.05 in one frame.** The ceiling was returned as `Infinity` and its state cleared the moment
`_runInComposingNow` went false. The rule's WINDOW ending is a fact about the rule; it is not a
licence for the picture's width to be discontinuous.

## So: is the jump the quantity's own, or an artefact of how the authors meet?

**Neither, and that is the answer that decided the build.** It is not the demand's own — `preLevel`
is smooth across every stepping frame measured. It is not primarily the `Math.min` crossover either:
on the two biggest steps the binding authority does not even change (`level → level`); the crossover
appears at the crossing only *because* the level term vanishes, so it is downstream, not a
co-equal cause.

**The defect is that the level ceiling was allowed to be a discontinuous function of a continuous
demand, at all three of its boundaries.** The repair is to give the quantity the contract it lacked.
After it, the value is continuous — there is nothing left to disguise, which is the test for whether
a fix is a cause or a bridge.

## What was built — one rule, `_levelEaseTo`

Re-anchor whenever the target moves (start from the value currently held, restart the clock); ease in
log space on the same smoothstep over the same `runInOpenMs` the release already used; and leave only
by **arriving** — when the ceiling has reached the un-leveled shot **and** nothing is still asking it
to be wider. Both exits that used to drop it are gone.

**No new config key, no new constant, no second smoother.** The old release is this function's
`target > held` case and now behaves as it always meant to. The admit is the same function's
`target < held` case, which is his requested shape — arrived at as a consequence of the cause rather
than as the fix itself.

**Two consequences, stated rather than buried.** The ceiling now outlives `_runInComposingNow` by at
most `runInOpenMs`, so the run-in hands back over a window instead of on a frame — the shot it hands
back *to* is unchanged. And a newly admitted member is **not** fully guaranteed while the width grows
onto him, which is the trade he accepted on 2026-08-26.

---

# THE CORNER-PIXEL MEASURE — before and after

The largest single-frame movement of the picture at the frame corner, whole corpus:

| race | **before** | **after** |
| --- | --- | --- |
| **river-run 20 s18** | **580.58** | **9.73** |
| mountainstreet 20 s24 | 445.53 | 11.86 |
| **river-run 20 s13** | **368.65** | **10.05** |
| dirt-oval 20 s171 | 345.27 | 11.86 |
| seatrack 20 s7 | 331.30 | 14.41 |
| city-circuit 20 s7 | 324.99 | 12.73 |
| river-run 20 s49 | 226.27 | 10.13 |
| mountainstreet 20 s32 | 222.15 | 10.81 |

**580 px → 9.73 px. The worst anywhere in the corpus is now 14.41 px** — a 40× reduction, and below
the ~13 px (1% of frame) floor at which this strand has been calling a movement noticeable at all.

**Every remaining worst frame is charged to `OTHER`** — not an admit, not a release, not a crossover,
with the binding authority unchanged across it. What is left is ordinary pan and zoom motion, which
is what the closing phase is supposed to look like.

**How many races still carry a movement a viewer would notice: ZERO by the strand's own rule** (>5×
that race's median AND >1% of frame width). Before this block, two did.

## Nothing regressed

| | required | measured |
| --- | --- | --- |
| worst across-track jump | 1.22 px | **1.33 px**, zero jumps on all eight races |
| across-track jumps > 4 px | 0 | **0** |
| level-set frames cut | 0 | **0** — `levelSet.test.js` 17/17 |
| finish line in frame | 85.7% | `check-runin-frame` **PASS**, both tracks |
| camera suite | 885/885 | **885/885** |

**The across-track figure moved from 1.22 to 1.33 px on one race** (mountainstreet s24) and 0.83 →
1.10 on another. That is a real, if tiny, worsening and it is reported rather than rounded away: both
remain three times under the 4 px threshold and the jump count stays zero.

## VERIFICATION

| role | recorded | engine | verdict |
| --- | --- | --- | --- |
| **world** | `dc4647be0f55ebdb` | same | **UNMOVED** |
| **world-off** | `854018ee5d3d83e1` | same | **UNMOVED** |
| camera | `0434cd0385eacc7b` | `4aef03dc22ab08b3` | **MOVED — expected** |
| render | `57b2eb101d806b22` | `ee4f4b016051a1e6` | **MOVED — follows** |

**NOTHING RE-MINTED.** `docs/fingerprints.json` is untouched. As before, the recorded column is this
branch's record, which differs from master's for reasons that belong to master.

**Stamps re-measured, both identical to the digit:** `tracking-lag` (8626/5.81/10.05, 159/4.84/7.40,
13282/5.07/9.71, 8473/4.64/7.45, 4130/2.75/16.00, 2089/2.81/8.59) and `straggler-truth`
(6.18/4.57, 7.53/5.75, 4.45/2.30, 5.95/4.38). The second **had** to be run: the ceiling now overlaps
the start of the ending, so the "windows are disjoint" argument no longer covers it.

## SOURCE HYGIENE

**`CameraDirector.js`: 5,122 → 5,212 lines (+90)**, of which the great majority is the comment block
recording the three boundaries and their measurements. The executable change is roughly 30 lines.

**Extracted:** `_levelEaseTo(target, preLevel, ts)` — the ceiling's whole continuity rule in one
place, called from both the composing path and the window-closed path.

**Removed, proven unreferenced tree-wide with `git grep` before deletion:**

| removed | was |
| --- | --- |
| `_levelRiseFrom`, `_levelRiseAt` | the one-directional ease's state; superseded by `_levelEaseFrom` / `_levelEaseAt` / `_levelEaseTarget`, the last of which is what makes the re-anchor possible |
| the instant-admit branch | `target <= _levelHeld → _levelHeld = target` |
| the two dropping exits | `return Infinity` on an empty set and on `!_runInComposingNow` |
| `admitting is instant even though releasing is eased` (1 test) | pinned the asymmetry by name; replaced |

**Comments:** the ease's own note kept its reasoning about why an empty set is "release toward the
shot that would have been" and now names the right mechanism. **Documents corrected in this commit:**
`docs/CAMERA_DIRECTOR.md` gains §3.4a (the continuity contract, with all three measured boundaries),
and both measured stamps.

**WHAT I NOTICED AND LEFT, with the reason:**

- **A bug of my own, found by the tests and fixed rather than argued.** My first version checked only
  `_levelHeld >= preLevel` to disengage. Because the ease now *engages* at `preLevel` (that is what
  makes the admit's first frame cost zero), that check fired on the engagement frame and the term was
  **inert on every frame**. Four invariant tests caught it — including "EVERY FRAME BEFORE THE RUN-IN
  IS UNCHANGED", whose final assertion exists precisely to fail on a build that does nothing. The
  disengage now requires arrival **and** no outstanding demand.
- **The `Math.min` crossover is still a `Math.min`.** It is no longer producing steps because the
  level term no longer jumps, but two bounds meeting are still continuous in value and not in
  derivative. Left; see proposal B.
- **`_levelSet` is still assigned in the window-closed path** purely so diagnostics read 0 rather than
  a stale count. Kept deliberately.
- **The stale conflict marker in `reports/evolution/INDEX.md`** (`||||||| 5204b10b`) — fourth report
  in a row to record it. Still out of scope.

## CONFORMITY

| asked | delivered |
| --- | --- |
| establish the cause per stepping event before any build | done first; the split table above, and it redirected the build |
| separate admit from crossover with numbers | done — and found a third cause neither candidate named |
| is the jump the quantity's own, or how the authors meet? | neither: the term was discontinuous in a continuous demand. Answered with `levelPre` measured smooth across every stepping frame |
| check the tightening direction too | yes — the exit *is* the tightening direction, and it was the ×3.05 |
| build for the cause found, and say why if you depart | departed: one continuity contract, not an eased admit. Reason above |
| do not ship an eased admit that leaves a 2.35× handover | the handover steps are gone with the rest — every worst frame is now `OTHER` |
| same easing, same duration, one home, no new key | `runInOpenMs`, log-space smoothstep, one function, no key |
| leave no rubble; prove removals with `git grep` | hygiene section |
| corner px before/after, races still noticeable, with seeds | 580.58 → 9.73; **zero** races still noticeable |
| across-track and level-set frames unregressed | 1.33 px worst / 0 jumps / 0 cut |
| world and world-off must not move | both unmoved |
| camera fp moves, reported, never re-minted | reported; record untouched |
| test proving a new member does not move the width by his full demand in one frame | `a newly admitted member does not move the width by his full demand in one frame` — asserts the first frame is under 2% in log space, that the guarantee still arrives, and carries a sabotage arm |

## PROPOSALS

### A — MINE: give every width authority the same contract, not just this one
The level ceiling now cannot jump. `company`, `field`, `line` and the corridor cap have no such rule
and are one membership-style boolean away from the same fault. The contract is 30 lines and already
written; applying it where a bound can appear or vanish would close the class rather than the case.

### B — MINE: the `Math.min` is still derivative-discontinuous
It stopped producing visible steps because its inputs stopped jumping, not because the meeting was
fixed. If a future bound moves fast, the crossover will show again. A short log-space blend at the
crossover — the device the corridor cap already uses — would close it.

### C — MINE: make the corner-pixel figure the run-in's acceptance test
`runin-camera-motion.mjs` is the only instrument that measures what the owner actually reports, and
it caught a cause two blocks of subject-displacement measurement had pointed away from. It should be
what a run-in change is judged on.

### D — Re-check the eased hand-back against the ending on his eye
The ceiling outliving the run-in is the one change here he has not seen. The instruments say the
ending is unmoved to the digit, but "the run-in hands back over a window" is a described behaviour
change and belongs in the eye test rather than only in a table.

### E — The width is fixed; the remaining motion is the pan
With the corner at ~10–14 px, the pan term is now the larger half again. If he still sees movement,
that is where to look next, and it is a different order of magnitude from where this strand started.

## WHAT OUTLIVES THIS REPORT

A cause instead of a seventh patch: a quantity that was allowed to be discontinuous at three
boundaries while its own demand stayed smooth, and the arithmetic showing an ease that amplified
steps rather than absorbing them. The width step is gone — 580 px to under 10 — and the instrument
that found it disagreed with two previous blocks about where to look.
