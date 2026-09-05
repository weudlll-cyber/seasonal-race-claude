# RENDER-CAMERA-GAP-1 — the render fingerprint's blind spot: the guard half only

**Block:** PIECE G of the night chain of 2026-09-04. Branch `night/2026-09-04`, off master `6953722d`.
**Answers:** `docs/BACKLOG.md:85` — the guard half, which "still needs only BUILDING".

**THE REPAIR IS NOT DONE.** It moves the render hash, which makes it a mint and the owner's to order.
No fingerprint was minted; all four were re-run and are unmoved. The instrument itself is untouched —
this piece added a test and nothing else.

---

## 1. The defect, re-established at source

**The one home.** `client/src/screens/RaceScreen/frameCameraInputs.js` owns the `camera` object a
frame is drawn from. `FRAME_CAMERA_FIELDS` declares **five** fields and the function adds the
`detectBattleGroup` method — **six members**:

| member | what the renderer does with it |
| --- | --- |
| `state` | *(nothing, today — see §2)* |
| `anchorRacerIndex` | who the camera is ON; that racer keeps its name for the whole race |
| `comebackLockedRacerIndex` | the comeback HUD |
| `hudState` | the battle-focus darkening and the diagnostic HUD |
| `runInArrived` | whether labels say NAMES or numbers |
| `detectBattleGroup` | the live pulk group the focus darkening is computed over |

The game builds it through that function: `client/src/screens/RaceScreen/index.jsx:1546`,
`camera: frameCameraInputs(camDirRef.current)`.

**The instrument.** `scripts/render-fingerprint.mjs`, inside `frameArgs`, builds the same object as a
hand-written literal with **three** members:

```js
    camera: {
      hudState: cd.hudState,
      comebackLockedRacerIndex: cd.comebackLockedRacerIndex,
      detectBattleGroup: (racers) => cd.detectBattleGroup(racers),
    },
```

`frameCameraInputs` is imported by five client files and by `scripts/label-occlusion-truth.mjs:59`.
**It is not imported by the fingerprint instrument at all.** So `state`, `anchorRacerIndex` and
`runInArrived` are `undefined` on every frame the render fingerprint draws.

---

## 2. ★ THE CORRECTION — the blindness costs TWO fields, not three

The backlog describes a three-member literal against a six-member contract and leaves the reader to
conclude that three fields are missing from the picture. Three members are missing; **only two of
them cost anything**, and the difference is worth having on record.

`renderRaceFrame.js` reads:

- `camera?.anchorRacerIndex` at **:212** — `focusRacerIndex`, which decides who is exempt from the
  label-clearance test and therefore who keeps a name. Undefined in the instrument, so the leader
  fallback fires on every frame it draws.
- `camera?.runInArrived` at **:220** — `namesFromArrival`, which decides whether labels read as names
  or as numbers. Undefined in the instrument, so it draws the pre-arrival form throughout.
- `camera.hudState` at **:336** and **:356**, `camera.comebackLockedRacerIndex` at **:337**,
  `camera.detectBattleGroup` at **:177** — all three supplied.

**`camera.state` is not read by live code any more.** Its only surviving occurrence in the renderer is
inside the comment at **:284**, which records that LABEL-OVERLAP-FIX-1 *removed* that read:

> *It read `exemptAll: camera?.state === 'PHOTO_FINISH'`, and its stated reason was that AT THAT ZOOM
> every racer stays recognisable even when the labels overlap. THE PREMISE IS REFUTED…*

So `state` remains on the declared contract — correctly, it is a real director field — and the
instrument's omission of it costs the picture nothing today.

**A side observation, reported not acted on.** `frameCameraInputs.test.js:66` establishes its
required set by grepping the renderer's **raw source** for `camera.<field>`, with no comment
stripping. It therefore counts that comment at `:284` as a read. This is harmless where it sits — the
guard only ever *adds* to the set a supplier must cover, so a phantom read makes it stricter, never
laxer — but it is why "the renderer reads six fields" is not quite what the tree says.

---

## 3. What was built, and why it pins the gap instead of failing on it

A new test in `scripts/render-fingerprint.test.mjs`. It parses the keys of the instrument's `camera:`
literal out of the instrument's own source, imports `FRAME_CAMERA_FIELDS` from the one home, and
asserts **two** things:

1. the instrument supplies **no** member the one home does not declare;
2. the members it is missing are **exactly** `anchorRacerIndex`, `runInArrived`, `state` — no more,
   no fewer.

**It does not fail on the gap, because the gap is not this piece's to close.** The repair is one line
— `camera: frameCameraInputs(cd)` — and it moves the render hash. What the test buys is that the gap
can no longer widen or change *silently*: it goes red if a field is added to the contract that the
instrument does not get, if the instrument starts supplying something undeclared, or if the repair
lands — at which point the expected list is updated deliberately, alongside the mint.

It is an ordinary `scripts/*.test.mjs`, which `verify` already selects (`scripts/verify.mjs:406`
filters `git ls-files scripts` for `.test.mjs`). **It was not wired into CI or a hook.**

---

## 4. The sabotage — 3 of 3 caught

A control first, so a red is known to mean something: **unmutated, the test is green.** Each mutation
was applied to the real file, the test run, the file restored, and the restore verified byte-identical
with `Buffer.equals`.

| mutation | expected | result |
| --- | --- | --- |
| a sixth field `aNewShotField` added to `FRAME_CAMERA_FIELDS` | RED | **PASS** — *"blind spot CHANGED (missing: aNewShotField, anchorRacerIndex, runInArrived, state)"* |
| the instrument gains `state:` — i.e. **the repair lands** | RED | **PASS** — *"blind spot CHANGED (missing: anchorRacerIndex, runInArrived)"* |
| the instrument invents an undeclared member | RED | **PASS** — *"supplies camera member(s) frameCameraInputs does not declare: inventedField"* |

After all three restores, the test is green again.

---

## 5. What this does NOT cover

- **It does not make the fingerprint see the picture.** The instrument still draws two label
  behaviours wrongly. Every render-fingerprint number about labels describes a frame the game does
  not draw, and that is unchanged by this piece.
- **It checks the SET of members, not their VALUES.** An instrument that supplied
  `anchorRacerIndex: 0` unconditionally would pass. The set is what can be checked without running
  the director; the values are what the repair is for.
- **It watches one instrument.** `scripts/label-occlusion-truth.mjs` already builds its camera
  correctly; no other instrument was audited for a hand-built `camera` literal.

---

## 6. What it would take to close it — for the owner, not a recommendation

One line in `scripts/render-fingerprint.mjs` (`camera: frameCameraInputs(cd)`) plus the import. The
instrument already reaches into `client/src/screens/RaceScreen/`, so importing costs nothing
structurally. **It moves `render`, and therefore needs a mint and his eye first.** The expected list
in the new test is updated in the same change.

---

## 7. Source hygiene

| file | before | after | what changed |
| --- | --- | --- | --- |
| `scripts/render-fingerprint.test.mjs` | 73 | 167 | +94: the guard, its parser, and the source-established account in §1-§2 as its header. |

No production file was touched. Nothing was removed. No scratch file entered the repository; the
sabotage runner lives in `C:/tmp`.

`node scripts/engine-reach.mjs --check scripts/render-fingerprint.test.mjs`, verbatim:

```
ENGINE REACH: none of 1 path(s) carry a change that can reach the race engine.
  1 outside the hull (cannot reach the engine at all): scripts/render-fingerprint.test.mjs
```

All four fingerprints re-run and **UNMOVED**: world
`8a1977187e9c99b4` · world-off `aa09ed97a3a32689` · camera `152cf295c4c9ff54` · render
`733b3f100d6a819f`.
