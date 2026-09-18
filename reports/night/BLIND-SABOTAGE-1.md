# BLIND-SABOTAGE-1 — the six blind instruments are in THREE states, not two, and only one of the three "fixed" ones can be proven by sabotage

Branch `night/2026-09-18`, piece 6. Date: 2026-09-18.
**★ THE REAL TREE WAS NEVER INSTRUMENTED.** Every sabotage was applied to a detached probe worktree
at master (`C:/tmp/sabcam`), and the real tree supplied only the control arm.

---

## ★★ THE ONE LINE

**Of the three instruments recorded as fixed, exactly ONE goes red when the fix is sabotaged.** The
other two deliver the camera plan correctly and **their answer does not depend on it** — proven by a
sabotage that is both semantic and reachable, not by observing that a number failed to move.

★ **So "six blind instruments" was never one job, and it is not two either. It is three:**

| state | instruments |
|---|---|
| ★ **was blind, now demonstrably sighted** | `exp-anchor-truth-ab.mjs` |
| ★ **delivers the plan, but the cast cannot reach what it measures** | `check-ending-frame.mjs`, `finish-band-truth.mjs` |
| ★ **cannot deliver a plan at all** | `diag/start-formation.mjs`, `exp-camera-bisect.mjs`, `sim-race-visual.mjs` |

---

## 1 · CONFIRMED AT THE TREE FIRST, WITH THE SEARCH TEXT

`grep -c 'makeCameraPlanDelivery'` and `grep -c 'cameraPlanDelivery'` on each of the six, at master
`5b60b615`:

| instrument | calls | mentions |
|---|---|---|
| `scripts/check-ending-frame.mjs` | **2** | 2 |
| `scripts/finish-band-truth.mjs` | **2** | 1 |
| `scripts/exp-anchor-truth-ab.mjs` | **2** | 1 |
| `scripts/diag/start-formation.mjs` | **0** | 1 |
| `scripts/exp-camera-bisect.mjs` | **0** | 1 |
| `scripts/sim-race-visual.mjs` | **0** | 1 |

★ **The three zeros each carry exactly one mention, and it is a header comment naming the helper and
the reason** — `start-formation.mjs:32`, `exp-camera-bisect.mjs:26`, `sim-race-visual.mjs:25`. **None
of the three is silently blind.**

---

## 2 · ★★ THE SABOTAGE

**The mutation**, applied in the probe only: replace `makeCameraPlanDelivery(cd, …)` with
`() => {}` — **precisely the pre-fix behaviour**, so a caught sabotage means the fix is load-bearing.

### ★ `exp-anchor-truth-ab.mjs` — CAUGHT

| arm | dumpHash |
|---|---|
| real tree, delivery ON | **`e1e833b69d656084`** |
| probe, delivery no-op | ★ **`76aae5fde8a0fb3e`** |

★ **The instrument goes red when the thing it watches is broken. The fix is proven.**

### `check-ending-frame.mjs` — NOT CAUGHT

Identical on both arms, to the line: *"city-circuit, one FINISHED frame, **17 fillRect call(s)**
recorded"* and *"nothing covers the race picture during the ending. **PASS**"*.

### `finish-band-truth.mjs` — NOT CAUGHT

**33 lines of output, byte-identical on both arms** (`diff` clean, warm-up noise and the elapsed
stamp excluded).

---

## 3 · ★★★ A FAILED SABOTAGE IS NOT A FINDING UNTIL THE MUTATION IS PROVEN REACHABLE

**This is the step that makes the two null results mean something**, and without it "not caught" is
indistinguishable from "never executed".

**The mutation is semantic**: it replaces a real delivery with a no-op, which is the exact
before-state of the fix.

**The line is reachable — proven, not assumed.** Re-armed in the probe as
`() => { throw new Error('REACHABILITY PROBE: deliverCameraPlan WAS called'); }`, both scripts **die
on it**:

```
at deliverCameraPlan (…/check-ending-frame.mjs:281:41)
at …/check-ending-frame.mjs:296:3

at deliverCameraPlan (…/finish-band-truth.mjs:314:43)
at …/finish-band-truth.mjs:324:5
```

★ **So the delivery IS invoked during both runs, and both instruments return the same answer whether
the cast reaches them or not.**

★ **And the positive control is in the same table**: `exp-anchor-truth-ab` ran the identical mutation
and DID move. **If all three had come back identical I could not have separated "inert fix" from
"broken sabotage" — one of them moving is what licenses the other two as findings.**

---

## 4 · ★ WHAT THAT MEANS, AND IT IS A CORRECTION OF EMPHASIS

`INSTRUMENT-PLAN-2` recorded these two as *"fixed"* with output *"byte-identical"*. **That is accurate
and it reads as reassurance — "we fixed it and nothing moved".** The sabotage says something sharper:

★★ **For `check-ending-frame` and `finish-band-truth` the fix buys nothing measurable. They were never
blind to anything THEY measure** — they were blind to something that does not affect their answer. **A
green from either is exactly as trustworthy as it was before the fix, neither more nor less.**

★ **The fix is still right and should stay**: both now build the camera the product builds, so a
FUTURE change that does depend on the cast will be seen. **What is wrong is reading their green as
evidence that the blindness mattered there.**

★ **Only `exp-anchor-truth-ab` had a real answer riding on it** — which is consistent with
`INSTRUMENT-PLAN-2`'s own note that three of ten tracks changed, and with its warning that any anchor
conclusion previously drawn from city-circuit, garden-path or luger-hill was drawn on a blind camera.

### ★ ITS BASELINE HAS MOVED SINCE THE RECORD, AND THAT IS THE BRAKE, NOT A REGRESSION

| | dumpHash |
|---|---|
| `INSTRUMENT-PLAN-2`, 2026-09-12 (pre-brake) | `ae72523ffb80e39c` |
| ★ this tree, 2026-09-18 (brake shipped) | **`e1e833b69d656084`** |

**Reported side by side rather than silently replaced.** The gap leader brake shipped to master on
2026-09-17 and changes the race, so an instrument that dumps camera state over a real race is
expected to move with it. ★ **Nothing was minted and this value is not a recorded one** — it is an
experiment writing to a caller-named `--out` file.

---

## 5 · THE THREE THAT CANNOT DELIVER A PLAN — WHAT EACH WOULD TAKE

**None was fixed, and the decision rule for this piece is why: each "fix" is a rebuild that changes
what the instrument measures.**

### `diag/start-formation.mjs` — ★ not fixable, and not a defect

Its own header: *"This runs the COUNTDOWN only. The heroes are cast inside `racePlanController.update`
well after the gun, so there is no cameraPlan to deliver at any point this instrument observes."*

★ **Verified by reading the code, and it is right.** It measures the start formation, which exists
**before casting happens**. Delivering a plan here would mean fabricating one that the product does
not have at that moment. **What it would take: nothing, because there is nothing to fix.** The header
already tells a reader that a green here is not a clearance for anything gated on a racer being cast.

### `exp-camera-bisect.mjs` — a rebuild with data loss

It *"replays RECORDED frames into five camera versions and builds no race-plan controller"*.

★ **What it would take:** the dump format would have to carry the cameraPlan, and **every existing
recorded dump would become invalid and need re-recording.** That is not a fix to the instrument; it
is a change to its inputs that discards the corpus it exists to replay.

### `sim-race-visual.mjs` — the most fixable, and still a rewrite

★ **Checked at source rather than taken from the note.** Its imports are `raceBehavior.js`,
`rowLayout.js`, `durationModel.js`, `EditorShape.js`, `CameraDirector.js` — **it does not import
`scripts/lib/raceDriver.mjs` or `raceCore.createRaceFromIdentity`, and rolls its own physics loop.**

★ **What it would take:** rebuilding it onto the shared driver (`RD.buildRace`, which does produce a
`racePlanController` — piece 2's harness uses exactly that). **That would give it the plan, and it
would change every PNG it has ever produced**, because it would then be running the product's race
instead of its own. **A worthwhile job, and a different one from "deliver the plan".**

---

## WHAT THIS DOES NOT SETTLE

- ★ **The two null results are about TODAY'S tree.** They say the cast does not reach what those two
  instruments measure *as they are now*; they do not say it never could.
- **One track only for `check-ending-frame`** — it reports on city-circuit, so its null is a
  one-track null.
- **I did not fix any of the three structural cases**, and the decision rule is the reason: each is a
  rebuild that changes what the instrument reports, which is the owner's call and not a tooling fix.
- **No fingerprint was run for this piece** and none was needed: **no product source was touched**,
  in the real tree or in the probe. The probe's only edits are to `scripts/`, and the probe is swept.
