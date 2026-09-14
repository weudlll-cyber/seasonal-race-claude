# RUNIN-FRAME-SHAPE-1 — the run-in defect is NOT this branch's, and the repair is yours to decide

**Branch** `night/2026-09-12b` · **MEASUREMENT ONLY — NOTHING BUILT, nothing minted, nothing merged.**
The decision rule fired on its **second** branch: the repair would change the picture on tracks and
races that are not failing, so this stops at the measurement and the options.

---

## ★★ THE ONE LINE

> **`check-runin-frame` is red on this branch and green on master — and the defect is on master too.**
> The camera is **byte-identical** on both trees. On `dirt-oval` at 40 racers the line leaves the
> canvas on **1 seed in 12 on the branch (seed 9) and 1 seed in 12 on master (seed 11)**, with the
> same signature, the same mechanism and the same progress fraction. **`983d9201` did not create it.
> It moved which seed lands on it — and the guard samples exactly one seed.**

★ **The repair is a camera change**, and the camera's endgame is a picture you accepted. So: **stop.**

---

## 1 · THE UPPER-BOUND QUESTION, ANSWERED FIRST

**Could the shot have shown the line at all in those frames?** ★ **YES on both cases. It was
geometrically available and the shot did not take it.**

| | delivered zoom | zoom that reaches the canvas edge | verdict |
|---|---|---|---|
| `dirt-oval` n=40 | **2.3786** | **1.6384** | the delivered shot is **1.45× TIGHTER** than it needed to be |
| `luger-hill` n=100 | **0.9278** | **0.8226** | the delivered shot is **1.13× TIGHTER** than it needed to be |

The projection scales about the camera centre, so a wider shot pulls an off-screen point toward the
middle; the figure above is the zoom at which the best band point sits exactly on the canvas edge,
derived from the delivered frame rather than from a model. **This is not an impossible frame.**

---

## 2 · THE SHAPE OF THE FAILING FRAMES

| | `dirt-oval` n=40 | `luger-hill` n=100 |
|---|---|---|
| window frames | 395 | 256 |
| **off canvas** | ★ **15** | ★ **5** |
| progress | ★ **0.9500 – 0.9529** | ★ **0.9502 – 0.9514** |
| depth, **screen px** — med / p90 / max | **144 / 259 / 289** | **46 / 74 / 82** |
| depth, **world px** — med / p90 / max | **145 / 261 / 292** | **33 / 53 / 59** |
| binding term | ★ **`state` on 15 of 15** | ★ **`state` on 5 of 5** |
| camera state | OVERVIEW ×15 | LEADER_ZOOM ×5 |
| schedule is sole author | ★ **15 of 15** | ★ **5 of 5** |

★★ **EVERY FAILING FRAME IS IN THE FIRST 3% OF THE WINDOW.** The deciles the guard prints say the
rest of the run-in is comfortable: `dirt-oval` reads **−353, then +120, +119, +119, +115, +114, +109,
+97, +86, +191**. **Only the opening is lost**, and the line comes back as the race advances rather
than as the camera opens.

★ **`binding: state` means the SCHEDULE placed the shot** — during the scheduled endgame
`_ceilings.state` **is** the schedule's own ceiling
([CameraDirector.js:4808](../../client/src/modules/camera/CameraDirector.js#L4808)), and the separate
`line` term is retired to `Infinity` on the same line, by design.

---

## 3 · ★★ THE MECHANISM — THE LINE FLOOR IS ARMED, AND IT IS WRONG

`_scheduleClose` already carries the protection this failure is about
([CameraDirector.js:4078](../../client/src/modules/camera/CameraDirector.js#L4078)):
`if (Number.isFinite(demand) && demand < z) return demand;` — the close may not go tighter than the
width at which the line is framed. **It is not missing. It reports satisfied while the band is 289 px
off the canvas.** Measured by wrapping `_lineCeiling` on the live director, changing no source:

```
 progress  hud          zoom   demand  floor?  engaged widenDone afterDL  canvas
 0.9496    OVERVIEW     2.382  2.366   ARMED   true    false     false     -332
 0.9498    OVERVIEW     2.379  2.374   ARMED   true    false     false     -310
 0.9500    OVERVIEW     2.379  2.384   slack   true    TRUE      TRUE      -289   <== OFF CANVAS
 0.9502    OVERVIEW     2.379  2.393   slack   true    true      true      -268   <== OFF CANVAS
```

★★ **The widen "completes" at 0.9498 because `zoom (2.379) <= demand (2.374)`** — the condition at
[CameraDirector.js:3705](../../client/src/modules/camera/CameraDirector.js#L3705). From the next frame
the floor is slack and the close runs free. **The demand says the line is framed. It is 289 px outside
the canvas.**

**WHY THE DEMAND IS WRONG.** `demand` is `_lineCeiling(…, COMPANY_FRAME_PCT)`
([CameraDirector.js:3680](../../client/src/modules/camera/CameraDirector.js#L3680)), which measures the
room from where the framing rule **intends** to put the anchor —
[CameraDirector.js:3482](../../client/src/modules/camera/CameraDirector.js#L3482),
`const at = atOverride ?? this._anchorScreen(...)` — **not from where the pan actually is.** At the
deadline the opening glide is still running: the schedule engages at **p≈0.9418** and
`_beginRunInGlide` runs for `runInOpenMs` = **1250 ms**
([defaults.js:455](../../client/src/modules/storage/defaults.js#L455)), which on this race outlasts the
0.0082 of the race between engagement and the **0.95** deadline
([defaults.js:324](../../client/src/modules/storage/defaults.js#L324)). **The pan has not converged,
so the shot is not where the demand assumed it would be.**

★ **That gap is DELIBERATE and documented.** ENDGAME-REPAIR-1 moved the measurement off the observed
anchor on purpose — from the observed anchor the demand was *undefined on 63–84% of frames on six
tracks* and reached *2108 corridors on city-circuit*. Its own header names what it left behind:
*"Keeping the line in frame DESPITE a displaced pan is a real requirement, and it is enforced where it
belongs: as a term that widens when the line is actually near the edge."* ★★ **That term is
`_ceilings.line` — and it is exactly the term set to `Infinity` while the schedule composes.**

---

## 4 · ★★ IT IS NOT THIS BRANCH'S DEFECT — MEASURED, NOT ARGUED

**The camera is byte-identical.** `git diff origin/master HEAD -- client/src/modules/camera/
client/src/modules/storage/defaults.js scripts/check-runin-frame.mjs` returns **empty**. The guard did
not get stricter and the camera did not change.

**`983d9201` reaches these terms only through the RACE.** By path: `heroCurveGenerator.js` +
`racePlanner.js` change who is cast and where he runs → racer positions at the threshold → the
director's `subjects` and camera state → the anchor → both `demand` and the delivered pan. ★ Its one
camera-adjacent file, `RaceScreen/index.jsx`, adds **an inert probe** — its own comment says *"INERT
UNLESS SWITCHED ON"* — so **no camera-facing code changed at all.**

**The same seed sweep on both trees, `dirt-oval` n=40, seeds 1–12:**

| | seeds that lose the line | worst | at progress |
|---|---|---|---|
| **master** `b6d77637` | ★ **1 of 12 — seed 11**, 15 frames | **−210 px** | **0.9502** |
| **branch** `8166c757` | ★ **1 of 12 — seed 9**, 15 frames | **−289 px** | **0.9500** |

★★ **Identical rate, identical frame count, identical progress.** And master's seed 11 shows the
identical mechanism — `zoom 2.380, demand 2.382, slack, widenDone=true, 225 px off canvas`. ★ Master's
seed 12 sits at **+7 px**: one seed away from failing on its own.

> ★★ **THE GUARD SAMPLES ONE SEED PER TRACK, AND IT SAYS SO** — its own `blind` list carries *"one
> seed per track; a line that leaves only on some other race is not covered."* Green on master was
> **the luck of the draw**, not a property of master.

---

## 5 · THE DECISION RULE, APPLIED LITERALLY

**Not the first branch.** The cause is not one term or a scoped miss in `983d9201`; it is the
interaction of two accepted camera rules, on a tree where `983d9201` changed no camera code.

**The second branch fires.** Every available repair changes the picture on races that are **not**
failing:

| option | what it costs |
|---|---|
| **A — measure the demand from the OBSERVED anchor** | re-introduces exactly what ENDGAME-REPAIR-1 removed: a singularity in the ramp's endpoint, undefined on 63–84% of frames on six tracks. **Re-opens a closed decision.** |
| **B — un-retire `_ceilings.line` during the schedule** | breaks *"the schedule is the sole author"* (ENDGAME-SCHEDULE-2), whose measurement was that a clipped schedule produces the worst single-frame zoom steps of the race — the owner's *"the zoom visibly hops"*. **Changes every endgame on every track.** |
| **C — start the widen earlier, or move the deadline** | changes when the endgame opens on **all ten tracks and every race**. |
| **D — make the glide finish before the deadline** | same reach as C; `runInOpenMs` paces the opening everywhere. |

**And the third branch fires too.** The failing frames sit inside a rule already accepted: the run-in
that owns the framing (`runInShot`,
[defaults.js:750](../../client/src/modules/storage/defaults.js#L750)) and the schedule as sole width
author are the design of RUNIN-OWNS-1 and ENDGAME-SCHEDULE-1/2, whose picture the owner judged on a
production build. **Re-tuning it is not a repair, it is a new decision.**

> ★★ **SO: BUILD NOTHING. Not merged, not minted, not tagged, branch not deleted, branch pushed.**

---

## 6 · WHAT THIS DOES AND DOES NOT CHANGE ABOUT THE MERGE

★ **It does NOT clear the branch to merge, and this report does not ask for that.** What it changes is
the **classification**: MERGE-HALTED-2026-09-14 recorded the failure as class **(b), a real defect
introduced here**, with the cause traced to `983d9201`. ★ **That attribution is wrong and is withdrawn:
the defect is pre-existing, the camera is untouched, and master fails the same check on seed 11.**

★ **What is still true** is that the branch's race walks into it on the seed the guard samples, so the
check is red and a red check is not merged on my authority. **The decision that is actually open is
whether the camera's endgame opening is repaired at all** — on master, where the defect lives — and
that is a separate piece with your eye on the picture.

---

## 7 · REPRODUCING IT

- Guard: `node scripts/check-runin-frame.mjs` (41 s, both failing cases in its requirement-5 block).
- Instruments, in `C:/tmp/rif`, swept at the end: `shape.mjs` (binding term, depths, upper bound),
  `demand.mjs` (wraps `_lineCeiling` on the live instance — **changes no source**), `seedsweep.mjs`
  (the 12-seed comparison).
- Master was raced from `git archive origin/master client/src scripts` with **`server/data/tracks`
  copied in**, so both trees read the same track records — `server/data/**` is gitignored and an
  extracted tree would otherwise silently fall back to `server/seeds/tracks`.
- Case, copied from the guard rather than re-chosen: seed 9, 40 racers closed / 100 open, the default
  roster, the browser's derived camera seed, `slowmo: true`.
