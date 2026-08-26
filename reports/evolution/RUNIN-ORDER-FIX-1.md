# RUNIN-ORDER-FIX-1 — the acceptance test failed, and the measurement says why

**Date:** 2026-08-26 · **Branch:** `feat/runin-level-set-1` · **NOT MERGED, and nothing was shipped**
— the source is byte-identical to the branch tip. Three measure-only diagnostics were added.

**No fingerprints were run and no browser gate, for the reason that decides it: no product file
changed.** World, world-off, camera and render are untouched by construction, not by measurement.

## THE ANSWER FIRST — THE FOUR PATCHES COULD NOT GO, AND I STOPPED

The piece was gated on one test, and it is the right test: **the ordering repair must let four of the
five patches be DELETED.** It does not. Two can go. Two cannot, and removing them is not a small
regression — **it is seven times worse than doing nothing.**

Per the instruction, I stopped, reverted the build, and did not keep a resistant patch or build
around it. **The verdict is re-opened for the owner.**

### What I predicted, before building

| patch | line | prediction | outcome |
| --- | --- | --- | --- |
| P1 — VIEWER-INVARIANTS-2 re-statement (`_schedZoom`) | 1166 | goes | **goes — confirmed** |
| P4 — RUNIN-PAN-STALE-ZOOM-1 re-statement (follow) | 1316 | goes | **goes — confirmed** |
| P5 — CAMERA-SIDEJUMP-1 pivot (follow) | 1371–1385 | goes | **RESISTED** |
| P3 — VIEWER-INVARIANTS-1 pivot (glide) | 1215–1226 | goes | **RESISTED** |
| P2 — CAMERA-GLIDE-TARGET-1 endpoint framing | 4272 | stays | stays — confirmed |

### Which patch resisted, and what it preserves that the ordering does not

**P5, and P3 which is its twin for the glide.** They are not compensations for the stale aim. They
are the correct propagation of the *delivered* offset through a zoom change, and the ordering repair
does not do that job because **the ordering only fixes the TARGET.**

The algebra is short and it is the whole finding. Write `at.x` for the screen point the framing rule
intends for the anchor, `e0`/`e1` for the effective zoom before and after this frame's transition,
and `lag` for the smoother's outstanding error:

- **What the pivot does.** `offset_new = offset_old − anchor.x · axisX · dz`. With
  `offset_old = target_old + lag`, this comes out as **`target_new + lag`, exactly.** The pivot
  carries the screen-space lag through the zoom change and nothing else.
- **What the ordering alone does to the delivered offset.** Nothing. If the delivered offset is
  instead restated to hold the camera's world position — the same operation the ordering performs on
  the target — the anchor lands at **`at.x · (e1/e0)`**. That is an error proportional to the zoom
  ratio: negligible per frame while the zoom creeps, and enormous at the width step, where seed 13
  moves `e1/e0 = 1.95` in one frame.

So the target and the delivered offset need *different* treatments, and only the target's was ever
wrong. **RUNIN-VIABLE-1 miscounted.** It classified all five as machinery for one ordering property.
Two of them are (P1, P4). Three are not: P2 is a framing decision, and P3/P5 are the delivered
quantity's own propagation — a mechanism with its own job, not a patch.

## THE MEASUREMENT — three arms, same instrument, same eight races

`runin-aim-axes.mjs` from RUNIN-VIABLE-1, reused rather than rewritten. The measure is the worst
single-frame ACROSS-track jump of the subject against the point the framing rule chose for it.

| race | **baseline** (branch tip, all five) | **arm A** — ordering, all four removed | **arm B** — ordering, P1+P4 removed, P3+P5 unified |
| --- | --- | --- | --- |
| mountainstreet 20 s32 | 20.72 | **164.54** | 0.83 |
| river-run 20 s13 | 39.40 | **295.33** | **0.05** |
| river-run 20 s49 | 42.64 | **338.22** | **0.03** |
| seatrack 20 s7 | 38.63 | **263.56** | 0.78 |
| mountainstreet 20 s24 | 22.79 | **136.92** | **1.22** |
| river-run 20 s18 | 59.07 | **360.04** | **0.04** |
| city-circuit 20 s7 | 21.45 | **129.46** | 0.02 |
| dirt-oval 20 s171 | 22.96 | **138.04** | 0.12 |
| **jumps > 4 px, pooled** | **30** | **209** | **0** |

**Arm A is the acceptance test, and it fails loudly.** Deleting all four multiplies the defect the
piece exists to remove by roughly seven. That is the empirical form of the algebra above.

**Arm B is reported because it is the useful number, not because it is shippable.** Unifying P3 and
P5 into one pivot placed after the hoisted zoom transition, and deleting only P1 and P4, takes the
worst sideways jump across the whole corpus from **59.07 px to 1.22 px** and the jump count from 30
to **zero**. The sideways jolt is, on this evidence, removable.

## WHY ARM B WAS NOT SHIPPED EITHER — a second finding, and it is the more serious one

**Arm B regresses the owner's own rule.** With the ordering in place it fails six tests, and two of
them are the level set:

- `holds a member who is far to the side, where today he is cut` — **48 frames cut**, expected 0.
- `holds TWO members on opposite sides at once — river-run seed 49 in miniature` — same shape.

The spec is explicit that a fix reintroducing one of those is not a fix, and it is right. Three more
failures are tests that pin the old ordering and would legitimately be replaced
(`ENTRY/TRACKING endpoint still tracks the live zoom`, invariant 6's `the pan target names the same
world position…`, and the glide path test); the two level-set failures are not in that category.

**I did not chase it.** The stop condition had already been met by arm A, independently, and
continuing would have been the thing this strand keeps doing. **But it is the finding that matters
most for the owner's decision:** the ordering does not sit underneath the width guarantees the way
RUNIN-VIABLE-1 assumed. Moving where the aim is resolved changes what `resolveCamera` is asked for,
and the level guarantee is downstream of that. **The coupling is deeper than RUNIN-VIABLE-1 found**,
and that block's verdict of REPAIRABLE now rests on one fewer piece of evidence than it did.

## WHAT WAS AND WAS NOT ESTABLISHED

- **Established:** the ordering is real and the aim can be expressed at the drawn scale; doing so
  plus one unified pivot removes the sideways jolt to under 1.3 px on eight races.
- **Established:** P3 and P5 are load-bearing and cannot be deleted; the four-patch test fails.
- **Established:** the ordering as built regresses the level set on 48 frames.
- **NOT established:** whether the level-set regression is caused by the ordering itself or by the
  unified pivot running on paths the old P5 never reached (it now fires on entry frames too). **That
  is one experiment, and it is the first thing the next block should run.**
- **NOT established:** anything about the browser picture. Nothing was built, so nothing was judged
  by eye.

## SOURCE HYGIENE

**Product source: unchanged.** `git diff HEAD -- client/ server/` is empty. The refactor was built,
measured on three arms, and reverted in full; `levelSet.test.js` and `zoomPivot.test.js` were re-run
against the reverted tree and are **22/22 green**.

**Added — three files, all measure-only, none imported by product code:**
`scripts/diag/runin-aim-axes.mjs`, `scripts/diag/runin-aim-sum.mjs`, `scripts/diag/runin-authors.mjs`
— RUNIN-VIABLE-1's instruments, carried from `diag/runin-viable-1` onto this branch because the spec
assumed they were here and they were not. **That is itself worth recording:** the report those
instruments produced is on master while the instruments were on a branch, which is the stranding
pattern CLEANUP-2026-08-26 was written to prevent.

**WHAT I NOTICED AND LEFT, with the reason for each:**

- **`_lastPivotAnchorX` has two diagnostic readers** — `scripts/diag/runin-anatomy.mjs:304` and
  `scripts/diag/start-frame-capture.mjs:299`. Had P5 gone, both would have needed updating. Left
  because P5 stays.
- **`panStaleZoom.test.js` (6 tests) pins the deleted helper.** It would have gone with P4 and been
  replaced by an ordering test. Left because nothing was deleted.
- **The stale conflict marker in `reports/evolution/INDEX.md`** (`||||||| 5204b10b`, line ~849 on
  master) is still there. Out of scope again; recorded again.
- **`_setTargets` is ~400 lines and mixes width and aim.** The split at `this.targetZoom = …` is
  clean and I made it in the reverted build; it is the one part of the refactor I would keep. Left
  because it is only useful with the rest.
- **`resolveCamera` can return an `effectiveZoom` different from the one requested** (its adaptation
  loop widens to fit). So even with a perfect ordering the aim can be stated at a scale the frame is
  not drawn at. **Not measured, not chased** — and it is a candidate explanation for the level-set
  regression.

## CONFORMITY — asked against delivered

| asked | delivered |
| --- | --- |
| identify all five at source; say which four go and which stays BEFORE building | done, stated before the first edit; table above |
| build, then delete them | built; deletion attempted; **two resisted** |
| IF THEY CANNOT GO — STOP, do not keep "just in case", do not build around it | **stopped and reverted in full** |
| report which patch resisted and what it preserves that the ordering does not | P5/P3; the delivered offset's screen-space lag; algebra and measurement above |
| leave the verdict re-opened for the owner | done |
| establish the current order at source and state it | stated: `_setTargets` resolves the pan at `effX(this.zoom)` before any path settles this frame's zoom; the ENTRY path already hoists its lerp and carries none of the five |
| one mechanism, one home — say what happens to the helper | it would have disappeared into the ordering; moot, nothing shipped |
| no new key, no new constant, no second smoother | none added |
| leave no rubble | nothing was removed, so there is no rubble; what would have gone is listed under hygiene |
| the measure, before and after, 221-of-221 recomputed | three arms above; the 221 figure is **not** recomputed on a built tree, because there is no built tree — stated rather than fabricated |
| camera fingerprint expected to move, not re-minted | nothing moved; nothing minted |
| tests with sabotage arms | none written — there is no change to pin |
| hand-off: production build, badge, push, do not merge | done; the branch is unchanged apart from the three instruments |

**Not delivered, and the reason:** the repair itself. The gate said stop, and it was the right gate.

## PROPOSALS

### A — Run the one experiment that separates the two causes
Arm B with the unified pivot restricted to exactly the frames old-P5 covered (follow, non-entry).
If the level-set regression disappears, the ordering is sound and the pivot's scope was the fault —
and arm B's numbers become shippable. **One change, one test run.** This is the cheapest decisive
next step and it should happen before anything else in this strand.

### B — MINE: fix the target's ordering ONLY, and leave both pivots alone
P1 and P4 are the two that provably go. Deleting just those and hoisting the zoom transition is a
strictly smaller change than arm B — five mechanisms become three, the two opposite invariants stop
blending, and nothing touches the delivered offset. It will not reach 0.05 px, but it removes the
duplicated re-statement without going near the level set.

### C — MINE: pin the delivered offset's propagation as a named invariant
The reason this piece nearly deleted a load-bearing mechanism is that P5 looked like a patch and was
never stated as a rule. It has one: *a zoom change carries the smoother's screen-space lag, it does
not reset it.* Written down and tested, it would have made the four-patch prediction impossible to
make.

### D — MINE: correct RUNIN-VIABLE-1's count in the record
That report says five mechanisms compensate for one ordering property. Two do. It is on master and
its verdict is being acted on, so the correction belongs in the INDEX's CORRECTIONS section rather
than only here.

### E — Land the three instruments somewhere they cannot strand
They now exist on two branches and no released tree, behind numbers cited in two reports on master.

## WHAT OUTLIVES THIS REPORT

A gate that worked. The four-patch test was proposed by the block before this one, and it caught a
repair that would have made the defect seven times worse — before any of it reached the owner. The
algebra that says why: the target and the delivered offset are different quantities with different
correct treatments, and only one of them was ever wrong. And a measured demonstration that the
sideways jolt is removable — 59 px to 1.22 px — held back because the same build cuts the owner's
level set on 48 frames, which is exactly the trade this strand must stop making.
