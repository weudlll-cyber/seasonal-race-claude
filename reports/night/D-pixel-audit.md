# NIGHT-TOOLS-1 — Stage D: pixel audit (FINDINGS ONLY, nothing changed)

Fixed numeric constants that ought to scale with world or track size. **No fixes in this block** —
every one of these is visible and needs the owner's eye. Canvas is fixed 1280×720 and the browser
scales it by CSS only; screen resolution is not an axis here.

---

## D0 — the audit's own starting point does not exist

**`_DEFAULT_OVERVIEW_OFFSET_PX = 150` is not in the tree.** No constant matching `*OFFSET_PX =`
exists anywhere under `client/src/` or `scripts/`. `git log -S` shows the string last changed in
**`74bf88b1` (CAMERA-PICTURE-FIXES-1)**, which removed it; `git grep OVERVIEW_OFFSET HEAD` returns
nothing.

- **Severity: harmless** — it was deleted, and the deletion is what should have happened.
- **Why it is reported anyway:** the brief called it a _confirmed_ starting point that _exists
  twice_. It exists zero times. Working from a remembered inventory rather than the tree is the same
  failure class this project keeps recording, and it cost the first ten minutes of this stage.

---

## D1 — `LIGHT_SPACING_PX = 30`, and a test that cannot fail

`client/src/modules/trackLights.js:9` · consumed at `render-fingerprint.mjs:269-270` and in the
RaceScreen drawing path.

- **What the name claims:** pixels.
- **What it actually does:** `sampleBoundaryAtInterval(points, spacing)`
  (`trackLights.js:27`) walks the boundary polyline accumulating **euclidean distance in WORLD
  units**. So it is world px, and the name is honest.
- **Does it need to scale?** **No — and this is the finding.** Constant world spacing is the
  physically correct behaviour: a longer boundary gets proportionally more lights, at the same
  apparent density. A track twice the size looks the same, which is what you want. Scaling it with
  track size would make big tracks look sparser.
- **Duplicated?** No. One definition, imported by both consumers.
- **What breaks on a track with different dimensions:** nothing. Light COUNT grows linearly with
  boundary length; there is no cap, so a pathological boundary would cost draw calls, not
  correctness.
- **The real defect is the test.** `client/src/modules/trackLights.test.js:101`:
  ```js
  it("LIGHT_SPACING_PX is 30", () => {
    expect(LIGHT_SPACING_PX).toBe(30);
  });
  ```
  This asserts the constant equals itself. It cannot fail for any reason that matters: changing the
  spacing changes the test, so it never objects; and it protects no behaviour, because nothing about
  the spacing's _effect_ is asserted. It is the shape L203 exists to name.
- **Proposed fix (one line):** replace it with a consequence test — halving the spacing must roughly
  double the light count on a fixed boundary.
- **SEVERITY: trap.** Not a live defect; a test that looks like coverage and is not.

---

## D2 — track data living in the simulator

`client/src/modules/headlessRaceSimulator.js:45-46`

```js
export const DIRT_OVAL_PATH_LENGTH_PX = 3245;
const DIRT_OVAL_TRACK_WIDTH_PX = 93;
```

- **What the names claim:** measurements of one specific shipped track.
- **What they actually do:** they are **fallbacks**, used only when no track config is supplied —
  `trackConfig?.pathLengthPx ?? DIRT_OVAL_PATH_LENGTH_PX` (line 150) and the same for width (151).
- **Duplicated?** The values also exist, authoritatively, in `server/seeds/tracks/dirt-oval.json`.
  So yes: **one track's geometry has two homes**, and only one of them is the track.
- **What breaks on the first track with different dimensions:** nothing _automatically_ — a caller
  that passes `trackConfig` never touches these. The trap is a caller that does NOT pass one and
  silently simulates dirt-oval's geometry while believing it simulated the track it named. That is a
  wrong ANSWER, not a crash, which is the expensive kind.
- **Proposed fix (one line):** make `trackConfig` required and throw when absent, so the fallback
  cannot be reached by accident.
- **SEVERITY: trap**, bordering on live defect — it depends entirely on whether any caller omits the
  config. I did not audit every caller; that is the next step and it is cheap.

---

## D3 — `CANVAS_W = 1280` is defined independently in THREE places, not two

| where                                                       | how                                                               |
| ----------------------------------------------------------- | ----------------------------------------------------------------- |
| `client/src/modules/camera/projection.js:37`                | `export const REFERENCE_CANVAS_W = 1280` — **the canonical home** |
| `client/src/screens/RaceScreen/index.jsx:83`                | `const CANVAS_W = 1280` — independent literal                     |
| `client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx:14` | `const CANVAS_W = 1280` — independent literal                     |

Three other sites do it correctly by importing: `camera/CameraDirector.js:115`,
`camera/zoomUnit.js:68`, `RaceScreen/drawing/trackRendering.js:14`,
`RaceScreen/drawing/battleDiagRendering.js:14` — all `const CANVAS_W = REFERENCE_CANVAS_W`.
(`DevScreen/sections/SurfaceClassPreview.jsx:16` is `440` and is a different, unrelated canvas.)

- **What the name claims:** the canvas width.
- **What it actually does:** the same thing in all three — but only one of them would follow a change.
- **What breaks if the canvas is ever not 1280:** the two literals silently disagree with the
  projection. The camera would compute its framing against one width while `index.jsx` laid out
  against another. Nothing would throw; the picture would simply be wrong by the ratio.
- **Proposed fix (one line each):** import `REFERENCE_CANVAS_W` in both, as four other files already
  do.
- **SEVERITY: trap.** Harmless while the canvas is fixed, and the fix is mechanical — but it is
  exactly the "one value, two homes" shape, at three homes.

---

## What I did not check

- Whether any caller of `headlessRaceSimulator` actually omits `trackConfig` (D2's severity turns on
  it).
- `CANVAS_H` / `REFERENCE_CANVAS_H`, by symmetry — likely the same picture, not verified.
- `FALLBACK_TRACK_WIDTH_PX = 140` (`CameraDirector.js:121`), found in passing: a fourth fixed-px
  fallback, deliberately documented at its site as the "no shape and no caller value" last resort.
  It is reached only by a bare `new CameraDirector()`, which is tests. Recorded, not audited.
- Anything under `server/`, which the brief did not ask for.
