# CAMERA-MINT-TRIPWIRE-1 — the folder test was a test of folders

Branch `camera-refactor`. Docs-only: no behaviour change, no eye test. The measurement that prompted
it is recorded here because it is the evidence the rule rests on.

The owner asked whether the physics still held: overtaking on Space Sprint looked far too easy, and
his reasoning was sound — if racers are drawn smaller and avoidance uses the drawn body, the bodies
shrank and the racing changed. He also spotted that **our verification would not have caught it**.

---

## 1. THE MEASUREMENT — the fingerprint did not move

| | COMBINED | space-sprint |
|---|---|---|
| **master** (`e5f0afa6`) | `dc4647be0f55ebdb` | `721f192e8b08` |
| **camera-refactor** (`09dda6eb`) | `dc4647be0f55ebdb` | `721f192e8b08` |

Identical, and Space Sprint's bias values match to sixteen decimals
(`planBiasDeltaMean 0.09212477797359454`, `pulkBiasEventCount 49`). **The racing is bit-identical to
master, on that track and on all ten.** No camera block on this branch moved the fingerprint.

## 2. WHY IT COULD NOT HAVE MOVED

**What physics reads.** `raceBehavior.js` reads `rA.drawnBodyWidthPx` / `rA.drawnBodyLengthPx`,
stamped onto each racer once in `raceCore.js:176` from the `drawnBodyWidthRefPx` argument.

**Where that comes from.** `RaceScreen/index.jsx`, in the race-init effect, before the first frame:

```
drawnBodyWidthRefPx = displaySize × (computeBodyNarrowRef(W_REF, nRacers, displaySize,
                                     bodyFillNarrow, autoScaleConfig).bodyNarrow / displaySize)
W_REF = min(285, trackWidthPx × startSpreadRange)
```

Inputs: track width, racer count, the authored `displaySize` and `bodyFillNarrow`, and
`autoScaleConfig.minScale/maxScale`. **All world-space, all known before the race starts.** No canvas
dimension, no zoom, no camera state. Computed once, frozen onto each racer, never recomputed.

**The camera-dependent sprite quantity is a different function.**
`computeRenderDisplayScale(displaySize, displaySizeScale, frameEffZoom, …)` takes the camera's zoom
and its result goes to `drawRacer` and nowhere else — never written back onto a racer, never passed
to `raceCore`. The owner's own reasoning was right and is stronger than he put it: had it fed
physics, the camera would change the race, and the parity harness would have caught it years ago,
because `headlessRaceSimulator.js` has no camera at all. A camera-dependent body would have made
browser and sim diverge on every race. **That floor no longer exists either** — CAMERA-PICTURE-FIXES-1
removed it.

## 3. THE HOLE IS STILL REAL

`autoSpriteScale.js` **is** in the branch diff — and it is exactly the file that could have been the
hole, because it also exports `DEFAULT_AUTO_SCALE_CONFIG`, which the start-grid packing reads.

Checked: the change is confined to `computeRenderDisplayScale` and the deletion of
`getEffectiveMinTargetScreenPx`. `computeAutoScaleFactor` is untouched and every value in
`DEFAULT_AUTO_SCALE_CONFIG` — `minScale`, `maxScale`, `referenceValue`, `minTargetScreenPx` — is
untouched. In `defaults.js` the diff is inside `DEFAULT_CAMERA_CONFIG` plus a new `DEFAULT_CONFIG_WORLD`
aggregate that only *references* the physics constants. In `RaceScreen/index.jsx` no race-init
argument changed.

**So we were lucky, not safe.** A race-moving value can sit in a camera diff and pass both of our
checks: "no simulation file in the diff" is a test of FOLDERS, and the engine's inputs are not
confined to one.

## 4. THE RULE, ADOPTED NOW

> Camera work still skips the ceremony. **Mint once at the end of any block whose diff touches a file
> under `client/src/modules/` that is NOT under `client/src/modules/camera/`.**

No list, no judgement call. A block that stays inside `camera/` pays nothing; anything that strays out
pays about two minutes. It would have flagged `autoSpriteScale.js` in CAMERA-PICTURE-FIXES-1 — the
block that caused this scare. Written into [SHIP-CEREMONY.md](../../docs/SHIP-CEREMONY.md) under
**THE MINT TRIPWIRE**, so it survives the session.

**Stage 2 is deliberately NOT built here**, at the owner's instruction: the enumerated list of modules
whose values reach `createRaceFromIdentity` / `stepRacePhysics`, beside `WORLD_CONFIG_KEYS`, with a
test that fails when `raceCore.js` imports something not on it. It belongs in the hygiene phase and
deserves a proper look. Registered in [BACKLOG.md](../../docs/BACKLOG.md) → *Measurement
infrastructure*.

**Why keep both:** the mint rule catches what someone remembers; the list catches what nobody does.
In this project the second kind is what has held.

## 5. HYGIENE, TESTS, AND WHAT THIS DOES NOT HAVE

**Nothing orphaned.** This adds a rule to an existing doc and an item to an existing backlog section.

**No test, and that is the point.** A prose rule in a checklist cannot be tested — which is precisely
why stage 2 exists and why it is recorded rather than trusted to memory. The guards that do run
(`check-index`, `check-tags`, `check-doc-links`) pass, and the doc links added here resolve.

**No fingerprint claim needed and none avoided:** this block's own diff is docs-only, and the mint it
prescribes was already run above — `dc4647be0f55ebdb`, unchanged.

## 6. THE OWNER'S SPACE SPRINT OBSERVATION

The racing is identical, so what changed is the picture — and it changed a lot on that track:

| | LEADER shot on Space Sprint |
|---|---:|
| before CAMERA-REFERENCE-WIDTH-1 | 2 track widths = **600 world px** |
| now | 0.75 corridors = **225 world px** |

**2.67× tighter.** A pass covering 20 world px was 3.3% of the old frame and is 8.9% of the new one;
CAMERA-LATERAL-1 then stopped the camera swinging sideways with the lane, so the overtake reads as the
racer crossing the frame rather than the camera moving under him.

Testable in a minute: set Space Sprint's LEADER to **2.0** corridors and the passes should look
exactly as hard as they used to.
