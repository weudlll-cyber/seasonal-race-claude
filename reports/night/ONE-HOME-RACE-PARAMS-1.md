# ONE-HOME-RACE-PARAMS-1 — the race-params derivation gets one home

**Night chain 2026-09-07, piece 1 of 9** · branch `night/2026-09-07` off `fe4e111c` · **unmerged.**

---

## ★ THE PREMISE DID NOT SURVIVE RE-VERIFICATION

The brief, from REPEAT-RECOMPUTE-6: the derivation *"has ALREADY been mirrored twice knowingly —
`camera-replay.mjs:164` and `goldenRunner.mjs:655-692`"*.

**It is mirrored thirteen times, not twice.**

The three named sites are real and were opened at their lines before anything was touched
(`camera-replay.mjs` at 164 is inside the `buildRace` transcription that runs to 232;
`goldenRunner.mjs` at 655 is the second of **two** derivation points in that one file — the first is
at 439). But the count was wrong, and it was wrong in the direction that mattered: the recompute
piece stopped because a third mirror would be one too many to keep in step, and there were already
fourteen copies of the arithmetic in the tree.

### How the census was established

Not by the term. The derivation's own signature is a `computeRacerLayout(...).spriteSize` standing
beside a `computeBodyNarrowRef(Math.min(285, effW), ...)`, so the search was for **the shape**:
`computeRacerLayout`, `computeBodyNarrowRef`, `W_REF`, and the literal `Math.min(285` — uncapped,
whole tree, every spelling and wrapping, `.js`/`.jsx`/`.mjs`. 136 occurrences across 34 files, then
each opened and classified by hand.

| kind | what it does | count |
|---|---|---|
| **FULL mirror** | both halves — `physicalSpriteSize` *and* the body-narrow reference — feeding `createRaceFromIdentity` | **14** |
| **PARTIAL** | body-narrow reference only, for a camera or measurement question | 4 |
| the function's own test | `rowLayout.test.js`, testing `computeBodyNarrowRef` directly | 1 |

The fourteen full mirrors: `RaceScreen/index.jsx`, `headlessRaceSimulator.js`, `camera-replay.mjs`,
`parity/goldenRunner.mjs` (×2 points), `golden/goldenRace.mjs`, `lib/raceDriver.mjs`,
`camera-fingerprint.mjs`, `render-fingerprint.mjs`, `check-ending-frame.mjs`,
`exp-anchor-truth-ab.mjs`, `finish-band-truth.mjs`, `diag/start-formation.mjs`,
`sprite-size-truth.mjs`, `sim-fairness.mjs`.

### ★ AND THE COPIES WERE NOT COPIES

`RaceScreen/index.jsx` and `camera-replay.mjs` derive **only** when auto-scale is enabled and the
racer type carries no `displaySize` override. **Every other site derives unconditionally.** The two
forms agree today only because `DEFAULT_AUTO_SCALE_CONFIG.enabled` is `true`
(`autoSpriteScale.js:19`, opened) and no harness sets an override — an agreement held up by a
default, not by construction. Turning that default off would have made the browser and every
instrument disagree silently.

The shared module carries the **guarded** form, because that is what the product does.

---

## WHAT WAS BUILT

**`client/src/modules/raceParams.js`** — one exported function, `deriveSpriteGeometry`, plus
`W_REF_MAX`. It is in `client/` deliberately: `scripts/` already imports from `client/src/` freely
(that is how every harness reaches `createRaceFromIdentity`), so one module there serves both sides.
It reads no configuration and no storage — every input is a parameter, because
`golden/goldenRace.mjs` pins its **own** `autoScale` config and a module that reached for
`DEFAULT_AUTO_SCALE_CONFIG` would have silently broken that fixture's isolation.

### Sites converted — 8 mirrors deleted, 0 added

| site | was | now |
|---|---|---|
| `client/src/screens/RaceScreen/index.jsx` | 35 lines inline | one call · **the original** |
| `scripts/camera-replay.mjs` | 30 lines | one call · *named in the brief* |
| `scripts/parity/goldenRunner.mjs` | two points, 22 lines | two calls · *named in the brief* |
| `scripts/golden/goldenRace.mjs` | 15 lines | one call · **the golden path** |
| `scripts/lib/raceDriver.mjs` | 18 lines | one call · the shared driver |
| `scripts/camera-fingerprint.mjs` | 13 lines | one call · **an instrument** |
| `scripts/render-fingerprint.mjs` | 13 lines | one call · **an instrument** |
| `scripts/check-ending-frame.mjs` | 13 lines | one call · **an instrument** |

The instruments were included on purpose: a mirror inside a fingerprint instrument is the one place
where drift does not merely produce a wrong race, it produces a **wrong measurement of a right
race**, which is the failure nothing else in this project would catch.

`rowLayout.test.js` also stopped declaring its own `const W_REF_MAX = 285; // must match the constant
in RaceScreen/index.jsx` and imports it instead. A number kept in step with another file by a comment
is the shape this module exists to end.

### Sites NOT converted, named rather than left silent

- **`scripts/sim-fairness.mjs:1106-1125`** — it is a declared reach entry of the **world**
  fingerprint, and piece 9(d) of this same chain is to put characterisation tests on it. Converting it
  here would entangle two pieces and put a fingerprint at risk for no gain tonight. Its copy also
  carries extra row-count subtleties (`:4357`, "the browser ignores computeRacerLayout.rowCount")
  which deserve reading, not a mechanical swap.
- **`client/src/modules/headlessRaceSimulator.js:175`** — a full mirror inside `client/`. Left
  because it is a second *simulator*, not a harness, and whether it should share this derivation is a
  question about what that module is for.
- **`exp-anchor-truth-ab.mjs`, `finish-band-truth.mjs`, `diag/start-formation.mjs`,
  `sprite-size-truth.mjs`** — experiment and diagnostic scripts. Same five-line swap, no measurement
  depends on them being right tonight.
- **The four PARTIAL sites** (`endgame-width-truth`, `floor-reach-truth`, `line-visible-truth`,
  `label-names-truth`) — they want only the body-narrow reference and never build a race. A narrower
  helper would serve them; that is a different duplication from this one.

**Six full mirrors remain.** That is stated plainly rather than rounded to "one home now".

---

## ★ THE STOP CONDITION: ALL FOUR FINGERPRINTS

Measured after every conversion, against `docs/fingerprints.json`. **Nothing moved, so nothing was
minted** — and nothing needed to be.

| role | recorded | measured | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | **unmoved** |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | **unmoved** |
| camera | `152cf295c4c9ff54` | `152cf295c4c9ff54` | **unmoved** |
| render | `74946ddbeca517a9` | `74946ddbeca517a9` | **unmoved** |

Method: the `reproduce` command each role declares in `docs/fingerprints.json`, run on the converted
tree — `fingerprint-default.mjs` (seed=1, races=3 track-defaults, 10 tracks, default config) for the
two world roles, `camera-fingerprint.mjs --quiet` and `render-fingerprint.mjs --quiet` for the other
two. Two of those instruments are themselves converted sites, so they measure the extraction with the
extraction in the loop.

**Golden races PASS** — 2 races, every finishing position and time as recorded.

---

## ★ THE SABOTAGE FOUND SOMETHING BEFORE IT PROVED ANYTHING

Sabotage: make the extracted module disagree with its callers — `physicalSpriteSize × 1.01`, which is
the physics half (it drives `rowGapPx` and `rowCount`, so it moves where every racer starts).

**The first run came back GREEN, and that was the finding.** `check-golden-races` runs through
`scripts/golden/goldenRace.mjs`, which at that moment was still one of the fourteen mirrors — so the
golden path never reached the shared module at all. An extraction that the project's strongest test
cannot see is worth much less than one it can.

`goldenRace.mjs` was converted, and with the module still sabotaged:

```
golden race "closed-garden-path-12" — A FINISHING TIME MOVED.
  Flash (position 1): expected 36.592 s, got 36.368 s  (-0.224 s)

golden race "open-river-run-6" — A FINISHING TIME MOVED.
  Rocket (position 1): expected 27.936 s, got 27.920 s  (-0.016 s)
```

**Exit 1.** The sabotage was reverted and the golden races went green again; the module on the branch
carries no `SABOTAGE` line (`grep -c` → 0).

### A tension worth naming rather than smoothing over

`engine-reach --check` reports **all ten changed paths as outside the engine hull** — verbatim below.
Yet sabotaging `raceParams.js` moved both golden races' finishing times by a measurable amount. Both
statements are true, so the hull's definition is narrower than "can change how a race comes out".
This is **not** a defect found in this piece and nothing was changed about it, but a reader who takes
that line as "this code cannot affect a race" would be wrong, and the sabotage above is the proof.

---

## CHECKS

| | |
|---|---|
| golden races | **PASS** — 2 races, every position and time as recorded |
| client suite | **PASS** — 254 files, 4630 tests, 232.2 s |
| `npm run verify` (plain) | **PASS 22 · FAIL 0 · SKIP 11**, 364.1 s — golden-races, camera-fingerprint, render-fingerprint, check-ending-frame, check-runin-frame and check-standings-invariant all among the passes |

### ★ `verify` FAILED FIRST, on something the extraction caused

The first run came back **PASS 18 · FAIL 2** — `check-fallback-agreement` and `script-suite`. Neither
was a flake and neither was unrelated: shortening `RaceScreen/index.jsx` by 15 lines moved every line
below the edit, and **five line-number citations in `docs/FORCE-MAP.md` pointed at the wrong code**:

```
docs/FORCE-MAP.md: cites `index.jsx` → `bodyFillNarrow` at L555, and bodyFillNarrow is NOT in those lines
docs/FORCE-MAP.md: cites `index.jsx` → `rowLayout`      at L645-L664 ...
docs/FORCE-MAP.md: cites `index.jsx` → `hudCapHit`      at L950-L960 ...
docs/FORCE-MAP.md: cites `index.jsx` → `holdMs`         at L1212-L1224 ... (twice)
```

The guard's own words are the right comment on it: *"a line number cannot be wrong out loud, and this
can."* Every one was re-pointed **after opening the file at the new line** — `bodyFillNarrow` L567,
`rowLayout` L642-L661, `hudCapHit` L935-L945, `holdMs` L1197-L1209 — and RULE F now resolves all 69
citations in 37 documents with 0 disagreements. This is recorded rather than quietly fixed, because
it is the ordinary cost of moving code in a repository that cites line numbers, and the next
extraction will pay it too.
| eslint · prettier | clean on every changed client file |

### Fingerprints — verbatim

```
node scripts/engine-reach.mjs --check client/src/modules/raceParams.js \
  client/src/screens/RaceScreen/index.jsx client/src/modules/rowLayout.test.js \
  scripts/camera-replay.mjs scripts/parity/goldenRunner.mjs scripts/golden/goldenRace.mjs \
  scripts/lib/raceDriver.mjs scripts/camera-fingerprint.mjs scripts/render-fingerprint.mjs \
  scripts/check-ending-frame.mjs

ENGINE REACH: none of 10 path(s) carry a change that can reach the race engine.
  10 outside the hull (cannot reach the engine at all): client/src/modules/raceParams.js,
  client/src/screens/RaceScreen/index.jsx, client/src/modules/rowLayout.test.js,
  scripts/camera-replay.mjs, scripts/parity/goldenRunner.mjs, scripts/golden/goldenRace.mjs,
  scripts/lib/raceDriver.mjs, scripts/camera-fingerprint.mjs, scripts/render-fingerprint.mjs,
  scripts/check-ending-frame.mjs
```

---

## SOURCE HYGIENE

| file | before | after | what changed |
|---|---|---|---|
| `client/src/modules/raceParams.js` | — | **126** | **new** — the one home |
| `client/src/screens/RaceScreen/index.jsx` | 2084 | 2069 | 35 lines → one call; a dead `rowLayout.js` import replaced |
| `client/src/modules/rowLayout.test.js` | 901 | 904 | imports `W_REF_MAX` instead of restating 285 |
| `scripts/camera-replay.mjs` | 815 | 793 | transcription → one call |
| `scripts/parity/goldenRunner.mjs` | 776 | 771 | two derivation points → two calls |
| `scripts/golden/goldenRace.mjs` | 164 | 158 | → one call; **the golden path** |
| `scripts/lib/raceDriver.mjs` | 549 | 548 | → one call |
| `scripts/camera-fingerprint.mjs` | 447 | **451** | → one call |
| `scripts/render-fingerprint.mjs` | 796 | **801** | → one call |
| `scripts/check-ending-frame.mjs` | 390 | **395** | → one call |
| `docs/FORCE-MAP.md` | 509 | 509 | five line-number citations re-pointed after the shift |

**Three files got LONGER**, and it would be easy to leave that out. `camera-fingerprint.mjs`,
`render-fingerprint.mjs` and `check-ending-frame.mjs` each held the derivation in a compact form
(`const pss = computeRacerLayout(effW, N, ds, W.autoScaleConfig).spriteSize;`), and a named-argument
call with a five-key destructure costs a few lines more than that. **Line count was never the point** —
the point is that those five lines are now the same five lines as the browser's, and cannot drift
from them. Net across all ten files: **−26 lines**, plus a 126-line module that did not exist.

**Removed:** eight copies of the derivation, and with them eight `computeRacerLayout` /
`computeBodyNarrowRef` import pairs that no longer had a consumer (checked per file: 0 residual
references in all eight). **Nothing else in the touched area was dead.**

**Reused, not rebuilt:** `computeRacerLayout` and `computeBodyNarrowRef` are untouched — the new
module composes them, it does not reimplement them. `createRaceFromIdentity` is untouched.

**Noticed outside the touched area, named and left:** the six remaining full mirrors listed above;
`goldenRunner.mjs:438`'s comment about `computeRacerLayout.rowCount` disagreeing with the browser's
own formula for small sprites (dolphin 4 vs 3), which is a real and deliberate divergence documented
where it happens.

**No scratch files entered the repository.** The pre-sabotage copy of the module was kept in the
session scratchpad and the file restored from it. `git stash` was not used.

## WHAT THIS PIECE DID NOT DO

- **It did not build the recompute.** That is a separate piece and needs the owner's word.
- It minted nothing.
- It changed no behaviour: four fingerprints and the golden races say so.
