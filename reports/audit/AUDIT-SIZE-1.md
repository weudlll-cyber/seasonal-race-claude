# AUDIT-SIZE-1 — RaceScreen is not the only one, and the second case is worse

**Measured 2026-09-04 on master `6c8683e3`. READ-ONLY — nothing was split, and nothing should be
without him.** Piece 5 of THE FULL AUDIT.

> **VERDICT ON THIS AXIS: TWO CASES, NOT ONE, and the known one is the milder.**
>
> **`RaceScreen/index.jsx` — 1,917 lines, one importer, NO TEST MOUNTS IT.** Confirmed: `App.test.jsx`
> mocks it to `() => null`, and the one test in its own folder that calls `render()` mounts a **child**
> and reads RaceScreen's source as **text**.
>
> ★ **`scripts/sim-fairness.mjs` is 6,195 lines — the largest file in the repository — and contains
> `runSingleRace`, a SINGLE FUNCTION OF 2,766 LINES.** That is 45% of the file in one function, and
> it is nearly half again the size of the whole RaceScreen. **It is the worst case on both axes and
> nobody had named it.**
>
> **Everything else large is either well tested or big because the job is big.**

---

## 1. THE LARGEST FILES

| lines | file | what it does | big because… |
| ---: | --- | --- | --- |
| **6,195** | `scripts/sim-fairness.mjs` | the headless fairness simulator — the sim half of the browser/sim parity pair | ★ **accumulated** — §3 |
| **5,351** | `client/src/modules/camera/CameraDirector.js` | the camera: states, guarantees, zoom, pan, the whole director | **the job** — and it has an **8,191-line test** |
| 3,644 | `scripts/exp-runaway-leader.mjs` | the runaway-leader experiment driver | the job (an experiment harness) |
| **2,099** | `DevScreen/sections/CameraAdvancedSection.jsx` | every advanced camera slider on the Dev Screen | **accumulated** — one control per key, ~90 keys |
| **1,917** | `client/src/screens/RaceScreen/index.jsx` | the race screen: setup, the rAF loop, HUDs, the ending | ★ **accumulated** — §2 |
| 1,456 | `DevScreen/sections/DynamicsTuningSection.jsx` | the race-dynamics sliders | accumulated, same shape as above |
| 1,425 | `client/src/modules/storage/defaults.js` | every shipped default, with its reasoning | **the job** — it is the one home, and the comments are the point |
| 1,419 | `client/src/modules/raceBehavior.js` | per-racer forces: avoidance, braking, steering, drafting | the job |
| 1,402 | `client/src/screens/SetupScreen/SetupScreen.jsx` | the setup screen | the job — and **8 test files mount it** |
| 1,287 | `client/src/modules/racePlanner.js` | the race plan and the trajectory controller | the job |

**The largest TEST file is `CameraDirector.test.js` at 8,191 lines** — larger than anything it tests.
That is a good sign, not a bad one.

---

## 2. THE KNOWN CASE, CONFIRMED PRECISELY

**`RaceScreen/index.jsx`: 1,917 lines, ONE production importer (`App.jsx`), and no test mounts it.**

The nuance matters, because ten test files name it and none of them mounts it:

| | |
| --- | --- |
| `App.test.jsx` | `vi.mock('./screens/RaceScreen/index.jsx', () => ({ default: () => null }))` — **it mocks it away** |
| `ceremonySkip.test.jsx` | calls `render()`, but on **`CeremonyBrandCard`**, a child — and separately reads RaceScreen's source with `readFileSync` and asserts on the **text** |
| the other eight | import constants or helpers from around it; none renders |

**Its two largest functions are the component itself (1,798 lines) and its `loop` (851).** The `loop`
is the per-frame render function — a real single job — but the component body around it is the
accumulation: state, effects, HUD wiring, the ending sequence and the diagnostics all in one scope.

**It also holds the deepest nesting in the repository — brace depth 10, at line 1223.**

---

## 3. ★ THE CASE NOBODY HAD NAMED, AND IT IS WORSE

**`scripts/sim-fairness.mjs` — 6,195 lines, and `runSingleRace` alone is 2,766 of them.**

| | |
| --- | --- |
| the file | 6,195 lines — **the largest in the repository**, source or test |
| its largest function | `runSingleRace`, **2,766 lines**, 45% of the file |
| its second | an anonymous `for` block of 1,221 lines |
| nesting | brace depth **10**, joint-deepest in the repository |
| a test that exercises it | **none.** `client/src/modules/sim-fairness.test.js` tests a *different* module of that name; nothing tests the script |

**Why this matters more than RaceScreen.** `sim-fairness.mjs` is not a screen — it is **the sim half
of the Sim-Browser Parity Rule**, the instrument every fairness verdict in this project has been
measured on. A 2,766-line function is not reviewable in the ordinary sense, and the one thing that
would compensate — a test — does not exist for it.

**It is accumulated, not intrinsic.** The browser's equivalent path is spread across `raceCore.js`
(727), `raceBehavior.js` (1,419), `racePlanner.js` (1,287) and `raceStep.js` — four files with tests
apiece. The sim does the same work in one function.

**Nothing was split.** That is a refactor of the instrument every fairness number rests on, and the
parity rule means it cannot be touched without moving the browser in step. **It is his.**

---

## 4. THE OTHERS — BIG BECAUSE THE JOB IS BIG, OR TESTED, OR BOTH

| | verdict |
| --- | --- |
| `CameraDirector.js` 5,351 | **the job.** A camera with named states, guarantees and two zoom regimes is intrinsically large — and its 8,191-line test and three fingerprints hold it |
| `CameraAdvancedSection.jsx` 2,099 | **accumulated, and harmlessly.** It is ~90 near-identical slider blocks — §5 of AUDIT-REDUNDANCY-1 measured the repetition at 9–10 copies of a 25–29 line block. A form with one control per config key grows one control at a time. **Mounted by a test** |
| `DynamicsTuningSection.jsx` 1,456 | same shape, **mounted by a test** |
| `defaults.js` 1,425 | **the job, and deliberately.** It is the single home for every shipped value, and most of its length is the reasoning beside each — which is the project's own rule working, not bloat |
| `SetupScreen.jsx` 1,402 | **the job**, and **8 test files mount it** |
| `TrackEditor.jsx` 1,070 | **the job**, and **4 test files mount it** (1,351 lines of test) |
| `raceBehavior.js` 1,419 / `racePlanner.js` 1,287 | **the job** — the force model and the plan; both have large dedicated tests |

**Test coverage of the large components is the reassuring part:** of the eight largest UI files,
**seven are mounted by at least one test.** RaceScreen is the exception, and it is the largest.

---

## 5. DEEPEST NESTING

| depth | where |
| ---: | --- |
| **10** | `RaceScreen/index.jsx:1223` |
| **10** | `scripts/sim-fairness.mjs:2459` |
| 9 | `raceBehavior.js:846` |
| 8 | `camera/battleGroup.js:95`, `racer-types/SpriteRacerType.js:198`, `SetupScreen.jsx:967` |

**The two deepest points are the two files §2 and §3 name.** They are the same finding measured a
second way, which is worth more than either measurement alone.

---

## 6. WHAT THIS PIECE DOES NOT COVER

- **Nothing was split, and nothing should be from here.** Splitting `RaceScreen` or `sim-fairness`
  changes behaviour a person would notice — the second one changes every fairness number this project
  has. Both are his.
- **"Big because it accumulated" is a judgement, not a measurement.** It is defended per row above
  and can be argued with; the line counts cannot.
- **Function boundaries are found by a brace walk over normalised source**, not by an AST. A
  mis-detected boundary would show as an oversized function, so the figures are an **upper** bound on
  any single function's length; the two headline cases were confirmed by opening the files.
- **Nesting is brace depth**, which counts object literals and JSX blocks as well as control flow. A
  depth of 10 in a JSX return is less alarming than 10 in a loop; both headline sites were checked
  and both are control flow.
- **`scripts/` was measured but is not held to the same bar** — an experiment driver is written to be
  thrown away. `sim-fairness.mjs` is named as an exception precisely because it is **not** throwaway.
