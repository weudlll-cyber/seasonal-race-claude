# HARNESS-OUTCOME-1 — the harness camera is not the browser camera

**Day chain 2026-09-08, piece 6 of 7** · branch `night/2026-09-07` · **unmerged.**

# ★★ STOPPED AT THE FORK. NOTHING WAS MINTED. THE FIX IS ON THE BRANCH, AWAITING HIS WORD. ★★

---

## THE FINDING, IN ONE TABLE

| | value |
|---|---|
| camera fingerprint, **recorded** | `152cf295c4c9ff54` |
| camera fingerprint, **measuring the way the browser does** | **`75aef5cd474c54e5`** |
| tracks moved | **4 of 10** |

**The four:** `city-circuit`, `dirt-oval`, `ice-track`, `space-sprint`.
**The six unchanged:** `garden-path`, `luger-hill`, `mountainstreet`, `river-run`, `searound`,
`seatrack`.

| track | recorded | with the browser's value | |
|---|---|---|---|
| city-circuit | `4c3d41af8cb0f312` | `2dfbe7b6a4327a7d` | **★ MOVED** |
| dirt-oval | `b0b16050e4166e87` | `5c89252223baaf6f` | **★ MOVED** |
| garden-path | `a7d574789495d43e` | `a7d574789495d43e` | — |
| ice-track | `93dbec30a1879218` | `d7065f4e61574e3e` | **★ MOVED** |
| luger-hill | `709028e8d3b455c5` | `709028e8d3b455c5` | — |
| mountainstreet | `e21258f7a23381e5` | `e21258f7a23381e5` | — |
| river-run | `141c9f8232e1684f` | `141c9f8232e1684f` | — |
| searound | `7b75b160d2d84195` | `7b75b160d2d84195` | — |
| seatrack | `55e26b59e2cae713` | `55e26b59e2cae713` | — |
| space-sprint | `39716fb9cd42c1ff` | `16122638d5e4bd0a` | **★ MOVED** |

**OUTCOME-WINDOW-1 said four of ten would move. Four of ten moved.** That was re-established here by
measuring both ways on this tree, not carried over as a claim — the two columns above are two runs of
the same instrument, one per side.

---

## THE CAUSE, established at source

| where | what it says |
|---|---|
| **the browser** — `RaceScreen/index.jsx:1492` | `isOutcomePhase: diagDataRef.current.rpPhase === 'OUTCOME'` |
| where that comes from — `index.jsx:1271` | `d.rpPhase = racePlanController.getPhase(physicsTs, st.raceProgress)` |
| **the instrument** — `camera-fingerprint.mjs:274` | `isOutcomePhase: false` |
| **the shared driver** — `raceDriver.mjs:500` | `isOutcomePhase: false` |
| what reads it — `CameraDirector.js:1717` | `(raceState?.isOutcomePhase \|\| _internalOutcomePhase) && …` |

The harness told the director the outcome window was **permanently shut**. The director has an
internal fallback (`_internalOutcomePhase`, a progress threshold), which is why six tracks agree
anyway — on those the internal threshold opens the window at about the same moment the plan does. On
the other four it does not, and there the instrument has been measuring a shot the product never
takes.

### ★ AND THE PREMISE NEEDED CORRECTING: IT IS TWO SITES, NOT ONE

The brief describes *"the shared driver supplies its own `isOutcomePhase`"*. That is true and it is
not the whole story: **`camera-fingerprint.mjs` does not use the shared driver.** `raceDriver.mjs`'s
own header says so — *"the fingerprint instruments … are deliberately NOT ported"* — and it carries
its **own** `isOutcomePhase: false` at line 274.

**Fixing the driver alone would have moved nothing**, because the fingerprint is defined on the
instrument. Both were fixed, and both had to be.

### ★ THERE IS A THIRD SITE, AND IT WAS DELIBERATELY LEFT

`render-fingerprint.mjs:584` carries the same `isOutcomePhase: false`. It was **not** touched — the
brief's rule is "change no other instrument" — and the consequence is measured rather than assumed:

**the render fingerprint is UNMOVED at `74946ddbeca517a9`.**

So the render instrument is still measuring the shut window. That is a real, named gap, and it is his
to order, not mine to close inside a piece that was told not to.

---

## WHAT THE FIX IS

At both harness sites, the browser's own expression — the same call with the same two arguments, so
the harness and the product cannot disagree about the window:

```js
isOutcomePhase:
  raceCfg.racePlanController?.getPhase(st.physicsTs, st.raceProgress) === "OUTCOME",
```

**Nothing about what the camera DOES was changed.** `CameraDirector.js` is untouched. The only change
is what the harness *tells* it, and it now tells it what `RaceScreen` tells it.

---

## ★ WHY NOTHING WAS MINTED

The brief gave no minting permission and the record predicted the move. A moved camera fingerprint
here is **not** a camera change — it is the instrument beginning to measure the right thing — but
that distinction is exactly the kind a mint would erase. The recorded value describes a shot the
product does not take; the new value describes the one it does. **Which of those the record should
hold is his decision**, and it has two parts:

1. **Accept the new value** — the instrument becomes truthful on all ten tracks, and every camera
   claim made against the old value on `city-circuit`, `dirt-oval`, `ice-track` and `space-sprint`
   was made against a shot the product never took.
2. **Decide what to do about `render-fingerprint.mjs:584`**, which still carries the same constant.
   Fixing it would move the render fingerprint too, and that is a second mint.

**The fix is on the branch and is not minted. `docs/fingerprints.json` is untouched.**

---

## CHECKS

| | |
|---|---|
| camera fingerprint | **MOVED** — `152cf295c4c9ff54` → `75aef5cd474c54e5`, 4 of 10 tracks |
| render fingerprint | **UNMOVED** `74946ddbeca517a9` — its own site was left alone on purpose |
| world fingerprint | **UNMOVED** `8a1977187e9c99b4` |
| world-off fingerprint | **UNMOVED** `aa09ed97a3a32689` |
| **golden races** | **PASS** — 2 races, every finishing position and time as recorded |
| `npm run verify` (plain) | **PASS 19 · FAIL 1** — and the one failure is `camera-fingerprint`, **on purpose** |

### ★ `verify` IS RED ON THIS BRANCH, DELIBERATELY

```
── camera-fingerprint FAILED
FAIL: CAMERA fingerprint does not match the record.
      recorded : 152cf295c4c9ff54
      measured : 75aef5cd474c54e5
      … If it WAS meant to, this is the ship ceremony asking for a deliberate
      mint; see docs/SHIP-CEREMONY.md. Do not edit the record to make this pass.

  VERIFY FAILED — 1 guard(s) failed: camera-fingerprint. Do not commit.
```

**That is the fork, printed by the guard itself.** The instrument is asking for a deliberate mint,
and no minting permission was given. The record was not edited, the fix was not reverted, and the
other nineteen guards pass — including `check-runin-frame`, `check-ending-frame` and the golden races.

**A reader of this branch should expect `verify` to be red on exactly this one guard and nothing
else.** It goes green the moment he says which value the record should hold.

The world and golden results are what say this changed no race: the harness tells the *camera*
something different, and the physics never hears it.

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check scripts/camera-fingerprint.mjs scripts/lib/raceDriver.mjs

ENGINE REACH: none of 2 path(s) carry a change that can reach the race engine.
  2 outside the hull (cannot reach the engine at all): scripts/camera-fingerprint.mjs,
  scripts/lib/raceDriver.mjs
```

---

## SOURCE HYGIENE

| file | before | after | what changed |
|---|---|---|---|
| `scripts/camera-fingerprint.mjs` | 451 | 458 | `isOutcomePhase` now the browser's expression |
| `scripts/lib/raceDriver.mjs` | 548 | 555 | the same, at the shared driver's own call site |

**Nothing was removed; nothing in the touched area was dead.** One constant became an expression, at
two sites, with the reasoning written beside each.

**Reused, not rebuilt:** `racePlanController.getPhase()` — the browser's own accessor, called with
the browser's own arguments. No second derivation of "is it OUTCOME" was written.

**Noticed and left, and it matters:**
- `render-fingerprint.mjs:584` — the third site, named above, deliberately untouched.
- Changing `raceDriver.mjs` changes what **every** instrument on that driver is told, not only the
  camera one. None of the others has a recorded fingerprint, so nothing else has a value to move —
  but a number taken from `his-shot-truth` or another driver-based tool before this change and after
  it is not comparable, and that is worth knowing rather than discovering.

**No scratch files entered the repository.** The before/after per-track comparison was taken by
reverting the two files, measuring, and restoring them from copies held in the session scratchpad.
`git stash` was not used.
