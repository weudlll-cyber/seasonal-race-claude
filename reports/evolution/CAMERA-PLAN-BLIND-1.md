# CAMERA-PLAN-BLIND-1 — the camera instruments ran a camera the browser cannot produce

2026-09-11 · branch `night/2026-09-11` · piece 4 of the night chain, taken first · **the fix is built
and NOT MINTED. The camera and render fingerprints are RED on purpose and await his word.**

---

## 0 · THE HOLE, RE-VERIFIED AT BOTH ADDRESSES

```
scripts/lib/raceDriver.mjs:373        cd.updateRacePlan(built.meta.rpPlanInfo.b1Indices);
scripts/camera-fingerprint.mjs:201    cd.updateRacePlan(meta.rpPlanInfo.b1Indices);
```

Both pass **`b1Indices` only** and **neither ever calls `setCameraPlan`**. The product does, at
`client/src/screens/RaceScreen/index.jsx:1072-1078` — **once, mid-race, on the first frame the plan
exists**, because the heroes are cast inside `racePlanController.update` and the plan is null at the
start line.

★ **The consequence is exact.** `comebackDetector.setPlan(null)` leaves `_cast` null forever, so
`isCast()` is false for every racer and **anything gated on a racer being CAST as a comebacker cannot
fire on an instrument.** COMEBACK-PRECEDENCE-1 shipped a change that alters what the camera shows in
47 of 96 races and **the camera fingerprint went green.** Blind by construction, not inert.

---

## 1 · ★ WHERE ELSE THE HOLE IS — TEN INSTRUMENTS, NINE BLIND

Every script that constructs a `CameraDirector`, and whether it ever hands over a plan:

| instrument | delivers a plan? |
|---|---|
| `scripts/camera-replay.mjs:345` | ★ **yes** — the only one that did |
| `scripts/lib/raceDriver.mjs` | no → **fixed here** |
| `scripts/camera-fingerprint.mjs` | no → **fixed here** |
| `scripts/render-fingerprint.mjs` | no → **fixed here** |
| `scripts/check-ending-frame.mjs` | ★ **no — still blind** |
| `scripts/diag/start-formation.mjs` | ★ **no — still blind** |
| `scripts/exp-anchor-truth-ab.mjs` | ★ **no — still blind** |
| `scripts/exp-camera-bisect.mjs` | ★ **no — still blind** |
| `scripts/finish-band-truth.mjs` | ★ **no — still blind** |
| `scripts/sim-race-visual.mjs` | ★ **no — still blind** |

★ **Each of the ten builds its OWN frame loop** — none of them runs on `raceDriver`'s `runRace` — so
fixing the driver does **not** fix them by inheritance. **The six still-blind ones are NAMED and
LEFT**, per the chain rule: they are outside what this piece touched, and widening a mint-gate repair
into six diagnostics at the same time is how a change stops being reviewable.

---

## 2 · THE FIX — ONE PLACE, NOT NINE COPIES

`scripts/lib/cameraPlanDelivery.mjs` (new) holds the rule and carries a header saying what it owns
and what it deliberately does not do:

```js
export function makeCameraPlanDelivery(cd, racePlanController) {
  let delivered = false;
  return () => {
    if (delivered || !racePlanController || !cd) return false;
    const cp = racePlanController.getCameraPlan?.();
    if (!cp) return false;
    cd.setCameraPlan(cp);
    delivered = true;
    return true;
  };
}
```

It **mirrors** the product: once, mid-race, on first availability. It does **not** invent a plan when
the race has none, does **not** deliver at the start line (the product cannot know the cast before
the choreo boundary), and does **not** re-deliver every frame.

Called from the frame body, before `cd.update(...)`, in `raceDriver.mjs`, `camera-fingerprint.mjs`
and `render-fingerprint.mjs`.

### ★ THE MECHANISM IS PROVED TO ENGAGE, BEFORE ANY NUMBER IS TAKEN FROM IT

This week produced four false greens, so the delivery was checked rather than assumed:

```
frames: 5588
★ cast delivered at race progress: 0.1503   cast size: 2
```

**The cast arrives at 0.1503** — just past the choreo boundary at `pulkStart` 0.15, which is exactly
where the product's heroes are cast. Not at the start line, and not never.

---

## 3 · ★ WHAT MOVED — PER TRACK, AND MEASURED ON THE SAME TREE BOTH WAYS

**BEFORE was re-measured on this branch** with the three files checked out from HEAD, not carried
from an earlier report. It came back `75aef5cd474c54e5` / `40b2de6fcc5bafd8` — **the record exactly**,
which is what makes the AFTER column a clean difference.

### CAMERA — `75aef5cd474c54e5` → ★ `92ab7120a80af8ed`

| track | before | after | |
|---|---|---|---|
| city-circuit | `2dfbe7b6a4327a7d` | `37f506f6443e32fe` | moved |
| dirt-oval | `5c89252223baaf6f` | `ae53308862aab9c2` | moved |
| garden-path | `a7d574789495d43e` | `9fca116dea694b36` | moved |
| ice-track | `d7065f4e61574e3e` | `8233ecf11ffb8770` | moved |
| luger-hill | `709028e8d3b455c5` | `33afdcdb6ab6e88d` | moved |
| mountainstreet | `e21258f7a23381e5` | `f55e3acaf162bf21` | moved |
| **river-run** | `141c9f8232e1684f` | `141c9f8232e1684f` | ★ **UNMOVED** |
| searound | `7b75b160d2d84195` | `eae1fc0566c69890` | moved |
| seatrack | `55e26b59e2cae713` | `318f61d537fbd88e` | moved |
| space-sprint | `16122638d5e4bd0a` | `39716fb9cd42c1ff` | moved |

★ **Every per-track FRAME COUNT is identical** (5346, 5888, 4916, …). **The race did not change — only
the camera did**, which is exactly what an instrument fix must do.

### RENDER — `40b2de6fcc5bafd8` → ★ `5e5fdc3fb6656d68`

Moved on **7 of 10**; `city-circuit`, `mountainstreet` and `space-sprint` are unmoved.

### ★ WHY IT MOVED, WITH THE CAUSE NAMED PER TRACK

The plan was delivered on **all ten** tracks. What differs is what the director then did with it:

| track | cast size | ★ precedence fired | comeback shots | camera |
|---|---|---|---|---|
| city-circuit | 2 | **1** | 1 | moved |
| dirt-oval | 2 | **1** | 1 | moved |
| ice-track | 2 | **1** | 1 | moved |
| searound | 3 | **1** | 1 | moved |
| seatrack | 2 | **1** | 1 | moved |
| garden-path | 2 | 0 | 0 | moved |
| luger-hill | 1 | 0 | 0 | moved |
| mountainstreet | 2 | 0 | 0 | moved |
| space-sprint | 1 | 0 | 0 | moved |
| **river-run** | 2 | 0 | 0 | ★ **unmoved** |

★ **On five tracks the precedence actually fires** — the camera demonstrably shows a shot it did not
show before, and that is the defect COMEBACK-PRECEDENCE-1 could not see.

★ **On four more it moved with NO shot at all.** The cause is the candidate POPULATION:
`comebackDetector.js:157` switches from the wide `_b1` fallback to `_cast`, so `best()` can answer
with a different racer, and the weighted draw and `_acceptsOffer` rolls diverge from there even when
no comeback shot results.

★ **river-run is UNEXPLAINED, and it is named rather than dressed.** My first hypothesis was that the
detector never offers anybody there. **I checked it and it is wrong** — the detector offers a
candidate on **768 of 3 862 frames**. What is left is that the offered racer may be the same under
both populations, so nothing diverges; **that is not established here** and I am not asserting it.

★ **AND ONE TENSION I CANNOT CLOSE: river-run's RENDER moved while its CAMERA did not.** The two
instruments do not cover the same window — the camera hash ends 300 frames after the last crossing
(4 162 frames on river-run) while the render samples fixed frames up to 5 450 of 5 600. **A
difference beyond frame 4 162 is invisible to one and sampled by the other**, which is a plausible
account and is not proved here.

---

## 4 · CHECKS

```
node scripts/engine-reach.mjs --check scripts/lib/cameraPlanDelivery.mjs scripts/lib/raceDriver.mjs \
  scripts/camera-fingerprint.mjs scripts/render-fingerprint.mjs

ENGINE REACH: 4 of 4 path(s) can change the race:
  scripts/lib/cameraPlanDelivery.mjs
  scripts/lib/raceDriver.mjs
  scripts/camera-fingerprint.mjs
  scripts/render-fingerprint.mjs
```

★ **The hull tool is conservative about `scripts/lib/` and says all four can reach the engine. The
measurement says otherwise and is the stronger evidence:**

| | |
|---|---|
| world fingerprint | `8a1977187e9c99b4` — ★ **UNMOVED**, matches the record |
| golden races | ★ **PASS** — 2 races, every finishing position and time as recorded |
| per-track frame counts | ★ **identical before and after, all ten tracks** |

**The race is untouched. This changes only what the instruments see.**

`npm run verify`, plain: **PASS 15 · FAIL 2** — `camera-fingerprint` and `render-fingerprint`, and
**those two reds are the piece**. A first run also reddened `script-suite` on the two generated hull
blocks, because the new file took the hull from 192 to **193**; both were regenerated
(`gen-engine-reach-doc.mjs`, `gen-ceremony-costs.mjs`) and that red is gone.

★ **NOTHING IS MINTED. No minting permission was given.** The two values are recorded here and the
guard stays red until he has looked.

**`git stash` was not used. `--no-verify` was not used. The probe scripts were deleted.**

---

## 5 · WHAT THIS MEANS FOR THE RECORD

★ **Every camera fingerprint taken before today was taken on a camera without a cast.** That does not
invalidate the values — they are what that instrument produced — but it does mean **a green camera
fingerprint has never been evidence about anything gated on the plan's cast**, and two pieces this
week read it as though it were.

★ **The same shape, at a third address**, after the `isOutcomePhase` defect that cost two mints and
CAMERA-SEED-AND-LINE-1's pinned camera seed. The pattern is an instrument that omits an input the
product supplies, and stays green because omission is silent.
