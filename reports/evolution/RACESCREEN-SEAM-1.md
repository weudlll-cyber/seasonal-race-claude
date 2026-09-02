# RACESCREEN-SEAM-1 — the seam is ONE LINE and the file does not need it: the only thing jsdom cannot supply is a 2D context, and every layer behind that context is already driven headlessly by an instrument better than a mount test

**Read-only investigation. Nothing in the repository was changed. The diff in §3 is a PROPOSAL, not applied.**

---

## 0. The headline, stated before the evidence

The two "known blockers" in the brief are **not blockers**. `sessionStorage` and the track geometry
are both plain browser storage that jsdom implements; a test seeds two keys and both effects proceed.
The single thing that stops a mount is `client/src/screens/RaceScreen/index.jsx:399` —
`canvas.getContext('2d', { alpha: true })` returns **null** under jsdom (measured, §1.3), and the
next line dereferences it.

So the minimum seam is exactly one injectable: how the component obtains its drawing context. One
default parameter, one call site. It is genuinely small and genuinely low-risk.

**And it should not be added,** because the four things a mount would exercise — the physics init,
the draw sequence, the camera, the standings DOM — each already have a dedicated headless driver
that runs the *same* code, and the fifth — "the screen comes up, races, and shows the field" — is
already asserted in a **real browser with a real rasteriser** at `client/e2e/d9-smoke.spec.js:377-441`.
What would remain new is two narrow things (§4.3): the effect's **teardown**, and the
**race-payload-to-`createRaceFromIdentity` wiring**. Both are real gaps. Neither is worth a mount of
this particular file, and §4.4 says why the wiring gap has a different and better fix.

---

## 1. What a test would have to supply to get past BOTH effects

### 1.1 Effect one — the session read (`index.jsx:382-390`)

```js
useEffect(() => {
  try {
    const raw = sessionStorage.getItem('activeRace');
    if (!raw) throw new Error('No race data. Please start a race from Setup.');
    setRaceData(validateActiveRace(JSON.parse(raw)));
  } catch (e) { setError(e.message); }
}, []);
```

- **Key:** `sessionStorage['activeRace']`, a JSON string. jsdom implements `sessionStorage` fully.
- **Required shape** — from `client/src/screens/RaceScreen/raceSession.js:20-31`, the validator
  demands only three things: a non-null object, a non-empty `racers` array, and a non-empty string
  `geometryId`. Everything else is optional-with-fallback and read in effect two.
- **Fields effect two actually consumes** (`index.jsx:403-570`): `racers[]` (each entry's own keys are
  copied onto the physics racer at :729 — `name` is load-bearing, it is hashed for coat/pattern and
  is a physics tiebreak), `geometryId`, `racerTypeId` (default `'horse'`), `worldWidth` (1280),
  `worldHeight` (720), `targetLaps` (`MIN_LAPS`), `targetDurationSec`/`targetDuration` (60),
  `racePlanSeed` (0), `racePlanEnabled`, `raceActionStage`, `trackSurfaceClasses` (`[]`),
  `trackId`, `eventName`.
- **No seam needed.** A test writes the key. Effect one is six lines and its only real logic is
  already unit-tested in `client/src/screens/RaceScreen/raceSession.test.js`.

**Ordering is not a blocker either.** `setRaceData` re-renders with the full tree (the loading branch
at :1752-1767 renders no canvas), and only *then* does the `[raceData]` effect run — so
`canvasRef.current` is populated by the time :394 tests it. There is no chicken-and-egg.

### 1.2 Effect two — the race build and rAF loop (`index.jsx:393-1712`)

**The geometry is NOT a fetch.** `getTrack` (`client/src/modules/track-editor/trackStorage.js:138`)
is a synchronous `localStorage.getItem('racearena:trackGeometries:<id>')` + `JSON.parse`. The network
lives in `client/src/modules/storage/trackLoader.js:34` (`GET {API_BASE_URL}/api/tracks/:id`), which
runs on **SetupScreen**, not here, and writes the same localStorage key. RaceScreen never fetches.

> The header comment at `ceremonySkip.test.jsx:14` says `raceData` is filled "from storage **and the
> track API**". That is inaccurate for this component; nothing in `index.jsx` touches the API. Worth
> correcting if that file is ever edited for another reason — not worth a commit on its own.

- **Key:** `localStorage['racearena:trackGeometries:<geometryId>']`, JSON. Fields read:
  `width` (falls back to `shape.getActualTrackWidth()`), `pathLengthPx` (0), `backgroundImage`
  (null), `closed`, `innerPoints`, `outerPoints`, `trackLights`, `effects` (`[]`).
  `EditorShape` (`index.jsx:427`) needs the point arrays; `getEdgePoints(800)` at :443 needs them to
  be real geometry.
- **`document.createElementNS('path')`** — `EditorShape`/`catmullRom` use SVG path geometry.
  `getTotalLength`/`getPointAtLength` are unimplemented in jsdom and are **already mocked** in
  `client/src/test/setup.js:27-82`. Free.
- **Track effects** (`index.jsx:449-455`): `getEffect(id).create(canvas, config)` — a geometry with
  `effects: []` avoids this entirely. A test geometry supplies none.
- **`new URLSearchParams(window.location.search)`** at :423 — jsdom URL is `http://localhost:3000/`.
  Fine.

### 1.3 The canvas — the ONE real blocker

`index.jsx:399-401`:

```js
const ctx = canvas.getContext('2d', { alpha: true });
ctx.imageSmoothingQuality = 'low';        // <- TypeError: Cannot set property of null
```

**Measured** against this repo's own jsdom (`jsdom 29.0.2`, `client/node_modules`):

```
getContext('2d', {alpha:true}) -> null
Image? function          ResizeObserver? undefined
PerformanceObserver? undefined            (rAF undefined in bare jsdom)
```

- **No canvas mock exists.** `client/package.json` has no `canvas`, no `vitest-canvas-mock`, no
  `jest-canvas-mock`; `client/vitest.config.js` loads exactly one setup file
  (`./src/test/setup.js`), and that file polyfills only `ImageData` and SVG path geometry.
- **rAF is fine under vitest.** The vitest jsdom environment defaults `pretendToBeVisual: true`
  (`client/node_modules/vitest/dist/chunks/index.DC7d2Pf8.js:434`), so `requestAnimationFrame` and
  `cancelAnimationFrame` exist. A test that wants to *drive* the race would stub them anyway —
  test-side, no seam.
- **`ResizeObserver` is not used** by this component. Not a blocker.
- **`PerformanceObserver` is absent but guarded**: `startLongTaskObserver`
  (`client/src/screens/RaceScreen/perfLog.js:124-131`) checks `typeof PerformanceObserver` and sets
  `supported = false`. It is also behind `enablePerfLog`, which is off by default. `initProbe`
  (`client/src/modules/rAFProbe.js:67-73`) is behind a `sessionStorage` flag and try/catch. Free.
- **Images never load** — jsdom does not fetch resources by default. Two consequences, both benign:
  - The background branch at `index.jsx:1507-1516` (the file's *second* `getContext`, at :1512) is
    behind `bgImagePath && getBackgroundImage(bgImagePath)` returning a loaded image. Never taken.
    **So :399 is the only unguarded context acquisition in the whole reachable tree.**
  - `SpriteRacerType.js:197` (`off.getContext('2d')`) is behind `getCachedSprite()` returning an
    image AND is itself `if (oCtx)`-guarded. Racers take the procedural fallback branch — exactly what
    `scripts/render-fingerprint.mjs` documents at its lines 34-37.

### 1.4 Router context

`useFadeNavigate` (`client/src/contexts/TransitionContext.jsx:44-48`) falls back to `useNavigate()`,
which **throws without a Router**. A bare `render(<RaceScreen />)` dies here before it ever reaches
the canvas. Fix is test-side: wrap in `<MemoryRouter>`. No seam.

### 1.5 The complete list, then

| Input | Where | Test supplies it how | Seam needed? |
|---|---|---|---|
| `sessionStorage['activeRace']` | `index.jsx:384` | write the key | no |
| `localStorage['racearena:trackGeometries:<id>']` | `trackStorage.js:138` | write the key | no |
| Router context | `TransitionContext.jsx:45` | `<MemoryRouter>` | no |
| SVG path geometry | `EditorShape` | already in `src/test/setup.js` | no |
| rAF / cancelAnimationFrame | `index.jsx:1690,1693,1699` | vitest jsdom provides; stub to drive | no |
| `PerformanceObserver`, probes | `perfLog.js:126`, `rAFProbe.js:69` | guarded, absent is fine | no |
| Images / background / sprites | `index.jsx:1507`, `SpriteRacerType.js:197` | guarded, never load | no |
| **2D context** | **`index.jsx:399`** | **jsdom returns null** | **YES — the only one** |

---

## 2. The two tests that name it in order to avoid it

### 2.1 `client/src/App.test.jsx:18` — mocked to nothing

```js
vi.mock('./screens/RaceScreen/index.jsx', () => ({ default: () => null }));
```

One of nine screen mocks (`:16-24`) under the header comment `Module mocks (screens + infra only —
storage/branding are real)`. The test is about `document.title` reactivity; RaceScreen is replaced by
a null component so the route tree can be mounted at all. Honest and correct — but it means the
project's own route-level test has never rendered this screen.

### 2.2 `client/src/screens/RaceScreen/ceremonySkip.test.jsx` — a transcribed copy plus source-text guards

The header (`:11-24`) is the most explicit statement of the problem anyone has written in this repo:

> **WHY THESE MOUNT A FIXTURE AND NOT `RaceScreen`**
> The handler is a closure inside a 1907-line component whose first paint waits on `raceData`, which
> an effect fills from storage and the track API, and whose draw loop wants a canvas context and
> rAF. Mounting all of that would test the scaffolding, not the guards, and every one of its
> failure modes would land on this file as a flake.

What it does instead:

- `:39-49` — `makeHandler`, "the handler, **transcribed** from `RaceScreen/index.jsx` — same guards,
  same order, same arithmetic", with dependencies passed in rather than closed over.
- `:55-70` — `Fixture()`, "The screen's own DOM shape": a `.race-canvas-wrapper` div carrying
  `onMouseDown`, with two `<canvas>` children and a real `CeremonyBrandCard`. A hand-built replica of
  `index.jsx:1792-1812`.
- `:77-94` — the transcription is checked against the source **as text**: `readFileSync(... 'index.jsx')`,
  slice out the handler, assert six literal substrings are present.
- `:108-139` — the attachment is checked as text too: exactly one `className="race-canvas-wrapper"`,
  its opening tag contains `onMouseDown={onCeremonyClick}`, `onCeremonyClick` appears exactly twice,
  and no `<canvas>` in the file carries `onMouseDown`.
- `:22-24`, explicitly: "What it deliberately does not prove is that `RaceScreen` wires this handler
  to this element; that is one line, it is visible in the diff."

**Two more files read `index.jsx` as a string rather than importing it**, using the same technique:
`client/src/modules/buildIdentitySource.test.js:25` (asserts `build: RA_BUILD.commit`,
`const commit = RA_BUILD.commit`, `buildBadge: RA_BUILD` all appear, and `__RA_COMMIT__` does not),
and `client/src/modules/camera/CameraDirector.test.js:6968` (asserts the file calls
`detectBattleGroup` by its public name). So the file already has **four** tests pointed at it and
**zero** that execute it — grep-as-assertion is this file's established, load-bearing test strategy.

---

## 3. The smallest change that lets a test mount it

### 3.1 The diff

Two lines. One default parameter, one call site.

```diff
--- a/client/src/screens/RaceScreen/index.jsx
+++ b/client/src/screens/RaceScreen/index.jsx
@@ -118,7 +118,11 @@
 const FIXED_DT = 16;

-export default function RaceScreen() {
+// TEST SEAM, and the ONLY one: jsdom's <canvas> returns null from getContext, so this is the single
+// thing a headless mount cannot supply. The default IS the shipped behaviour; the app renders
+// <RaceScreen /> with no props (App.jsx:76) and therefore always takes it.
+export default function RaceScreen({
+  acquireContext = (c) => c.getContext('2d', { alpha: true }),
+} = {}) {
   const fadeNavigate = useFadeNavigate();
@@ -397,7 +401,7 @@
     const canvas = canvasRef.current;
-    const ctx = canvas.getContext('2d', { alpha: true });
+    const ctx = acquireContext(canvas);
```

### 3.2 What a test would then look like — and it needs no new fake

The stand-in already exists **inside the client tree**:
`client/src/modules/parity/recordingContext.js` (230 lines, `createRecordingContext()`), written for
RENDER-FINGERPRINT-1. It covers 18 settable state properties including `imageSmoothingQuality`
(`:38-57`), 31 void methods (`:60-86`), image identity without pixels (`:96-108`), and a synthetic
`measureText`. It is precisely a `CanvasRenderingContext2D` stand-in for exactly this code path.

```js
render(
  <MemoryRouter>
    <RaceScreen acquireContext={() => createRecordingContext()} />
  </MemoryRouter>
);
```

Nothing else new is required. Two storage keys, a MemoryRouter, one prop.

### 3.3 What it costs in risk

**Very little, and I want to be accurate about that rather than inflate it to support the verdict.**

- **The shipped path is unchanged by construction.** `App.jsx:76` renders `<RaceScreen />` with no
  props, so production always takes the default, which is character-for-character the current
  expression.
- **Fingerprints do not move.** `index.jsx` is **not** in the engine hull — `node scripts/engine-reach.mjs --list`
  reports 76 files from `raceCore.js` and RaceScreen is not among them (verified: zero matches).
  `renderRaceFrame.js` is untouched, so the render fingerprint cannot move either.
- **Lint is clean.** `react/prop-types` is `'off'` (`client/eslint.config.js:58`). The effect already
  carries `// eslint-disable-next-line react-hooks/exhaustive-deps` (`index.jsx:1711`), so the new
  closure variable does not need to enter the `[raceData]` deps — and must not, since a changing
  identity would restart the race loop (the comment at :1708-1710 says exactly this).
- **The existing source-text tests survive.** `ceremonySkip.test.jsx`'s counts are over
  `onCeremonyClick`, `className="race-canvas-wrapper"` and `<canvas ... />` tags; `buildIdentitySource`
  is over `RA_BUILD`. The diff touches none of them.
- **The one genuine risk, named:** a props signature on this component is an invitation. The next
  person who wants something testable adds a second injectable, then a third, and the "minimum seam"
  becomes a dependency-injection surface on the file the whole race runs through — with each
  injectable's *default* being the only path anyone ever runs, i.e. code paths that exist solely for
  tests and are never exercised in production. That is the failure mode of test seams generally, and
  it is a policy risk rather than a code risk. It is also the reason to say no once rather than to
  say no repeatedly.

---

## 4. What the seam would let anyone assert that nobody can assert today

### 4.1 What it would NOT buy, because a better instrument already exists

Every layer a mount would drag in is already driven headlessly by something that runs the *same*
code, not a copy of it:

| Layer | Existing instrument | Why it beats a mount |
|---|---|---|
| Race init (`createRaceFromIdentity`, `index.jsx:551`) | `client/src/modules/parity/goldenRealArm.test.js` — its header (`:8`) says `realArm` runs "**RaceScreen's OWN init** + per-step advance (raceCore)" | byte-identity against the sim across many seeds/tracks; a mount asserts one race |
| The whole draw sequence (`renderRaceFrame`, `index.jsx:1518`) | `scripts/render-fingerprint.mjs` + `recordingContext.js` — one hash over the ordered draw calls at fixed frames on ten tracks, including ceremony beats and the finish window | catches layer-order swaps across ten tracks; a jsdom mount would produce *the same recording context* on *one* track |
| The camera | `scripts/camera-fingerprint.mjs` (renders through `PHASE.FINISHED`, `:220-249`), `CameraDirector.test.js` | — |
| Standings DOM (`Scoreboard`) | `standingsInvariant.test.jsx` — mounts the **real** `Scoreboard.jsx` under a `MutationObserver` | already mounts the real thing |
| Ending schedule / winner card | `endingSchedule.test.js`, `endingPicture.test.js`, `WinnerCard.test.js` | — |
| Frame accumulator | `frameTimingStabilization.test.js` | — |
| Ceremony click guards | `ceremonySkip.test.jsx` | source-text + fixture (§2.2) |

**And the mount-shaped assertions are already made in a real browser.**
`client/e2e/d9-smoke.spec.js:377-441` seeds *exactly* what §1 describes — geometry into localStorage,
race payload into sessionStorage (`seedRaceSession`, `:345-374`) — then `page.goto('/race')` and asserts:

- `:377-385` no page errors on a 2-lap closed race;
- `:387-397` `canvas.race-canvas` visible past the countdown **and** the scoreboard shows `Alpha`;
- `:399-424` clean load for horse / snail / rocket (three `speedMultiplier` values);
- `:426-433` the `<- Setup` button navigates to `/setup`;
- `:435-441` all three racer names appear in the standings.

That is the whole of what a jsdom mount test could plausibly assert, asserted with a **real 2D
context, real rAF, real fonts, real image loading and a real rasteriser**. A jsdom version would be a
strictly weaker copy of it. (Note: e2e is *not* in `npm run verify` — it is `npm run test:e2e` — so
the coverage is real but is not on the per-commit gate. That is a scheduling question about the e2e
suite, not an argument for a jsdom duplicate of it.)

### 4.2 The blunt answer to the question as asked

**Very little of value, because everything worth asserting was already moved out.** That is not a
hedge; it is the design working. Nineteen sibling modules with their own tests sit in
`client/src/screens/RaceScreen/`, and `index.jsx` is what is left when the testable parts have been
removed one at a time: a React shell that reads two storage keys, calls fourteen loaders, hands the
result to `createRaceFromIdentity`, and pumps `stepRacePhysics` + `renderRaceFrame` from an rAF
accumulator. Mounting it re-tests the callees through a worse instrument.

### 4.3 The two things that would genuinely be new — stated honestly

**(a) Teardown.** `index.jsx:1694-1706` cancels rAF, stops the long-task observer, nulls
`markerBuildRef`, clears the finish-nav timer, clears every winner-card timer, and calls `destroy()`
on each track effect. **Nothing asserts any of this.** A mount + unmount with a stubbed rAF could
assert "after unmount, no further frames and no live timers." A leak here is real — an outlived
`finishNavTimerRef` navigates away from a screen the user has already left. Genuine gap.

**(b) Payload-to-init wiring.** `index.jsx:403-570` contains ~30 mappings that exist nowhere else:
`raceData.targetLaps ?? MIN_LAPS`, `targetDurationSec ?? targetDuration ?? 60`, `racePlanSeed ?? 0`,
`geometry.width ?? shape.getActualTrackWidth()`, and — the sharpest — `normalizeRaceActionStage(raceData.raceActionStage)`
at :475, whose comment states the *rule* that the stage comes from the payload and not the live Dev
Screen setting. **Nothing executes that rule.** A mount could assert it. Genuine gap.

### 4.4 Why neither gap justifies the seam

**(a) Teardown** is one test, and it is the strongest case in this document. But an unmount test on
this component still mounts all 1907 lines to observe six lines of cleanup, and it inherits every
failure mode `ceremonySkip.test.jsx:16-18` warned about as flake on the tightest file in the tree.
Under R7's first question — *what breaks if I delete it* — the answer is "a timer leak on unmount",
which the e2e `<- Setup` test (`d9-smoke.spec.js:426-433`) already exercises in the direction that
matters, without asserting it. Adding the assertion there is cheaper and stronger than a jsdom mount.

**(b) The wiring gap is real but a mount test is the wrong fix for it.** The wiring is duplicated:
`index.jsx:551`, `scripts/render-fingerprint.mjs:303`, `scripts/parity/goldenRunner.mjs`, and
`scripts/sim-fairness.mjs` each build the same call with their own arguments. A mount test would pin
`index.jsx`'s copy **against itself** — it would assert that today's behaviour is today's behaviour,
and would need re-blessing on every honest change to the payload. That is precisely the "assert
instances, re-bless on refactor" failure R7 names in its *Why it is safe* paragraph. What catches
drift between four copies is a comparison across them, which is what the Sim-Browser Parity Rule is
already for. **The gap points at parity, not at a mount.**

### 4.5 R7, applied

`docs/VERIFY-RULES.md:208-212`:

> Two questions, before the test exists: *what breaks if I delete it*, and *what goes unnoticed if it
> is missing*. If neither has an answer, do not write it. Prefer one test that asserts a PROPERTY
> over several that assert instances.

For a RaceScreen mount test: *what breaks if I delete it* — nothing, because `goldenRealArm`,
`render-fingerprint`, `camera-fingerprint`, `standingsInvariant` and `d9-smoke` all stay. *What goes
unnoticed* — the teardown and the payload mapping, and §4.4 shows each has a cheaper home. Neither
question has an answer that survives contact with the existing instruments.

---

## 5. Verdict

**Leave the file alone.** The seam is one line and cheap, and it is a fair thing to hold in reserve —
if a defect ever lands specifically in the effect's teardown or in the payload mapping, §3.1 is the
change to make and `createRecordingContext()` is already there to drive it. But it should be added in
response to a defect, not in advance of one. Today the honest finding is:

- **The stated blockers are wrong.** Storage is not a blocker; the geometry is a synchronous
  localStorage read, not a fetch. The one true blocker is `getContext` -> `null`, at a single line.
- **The file is untestable-by-mount for one reason and it is trivial to fix.**
- **Fixing it buys almost nothing,** because the file has been hollowed out on purpose and every
  extracted layer has a better instrument than a jsdom mount could be.
- **The two residual gaps are real** and should be written down as backlog items pointing at
  `d9-smoke.spec.js` (teardown) and the parity rule (payload wiring), not at a new mount test.

The absence of a mount test for `RaceScreen/index.jsx` is not a hole in the suite. It is the shape
the extraction left behind, and it is the correct shape.

---

### Appendix — every file:line this report rests on

- `client/src/screens/RaceScreen/index.jsx` — :120 signature - :382-390 session effect - :393-1712 race effect - :399 **the blocker** - :417 `getTrack` - :427 `EditorShape` - :449-455 effects - :475 `normalizeRaceActionStage` - :551 `createRaceFromIdentity` - :1084-1155 finish block - :1507-1516 background (2nd `getContext`, guarded) - :1518 `renderRaceFrame` - :1690-1706 rAF + teardown - :1752-1767 loading branch - :1792-1812 wrapper + canvases
- `client/src/screens/RaceScreen/raceSession.js:20-31` — the validator
- `client/src/modules/track-editor/trackStorage.js:138-150` — `getTrack`, synchronous localStorage
- `client/src/modules/storage/trackLoader.js:34` — the API fetch, on SetupScreen, not here
- `client/src/contexts/TransitionContext.jsx:44-48` — `useNavigate` fallback, needs a Router
- `client/src/test/setup.js:9-82` — `ImageData` + SVG path mocks; **no canvas mock**
- `client/vitest.config.js` — one setup file, `maxWorkers: 4`, `retry: 0`
- `client/package.json` — no canvas mock dependency of any kind
- `client/eslint.config.js:58` — `react/prop-types: 'off'`
- `client/src/App.test.jsx:16-24` — the mock (§2.1)
- `client/src/screens/RaceScreen/ceremonySkip.test.jsx:11-24, 39-49, 55-70, 77-94, 108-139` — the fixture (§2.2)
- `client/src/modules/buildIdentitySource.test.js:25` - `client/src/modules/camera/CameraDirector.test.js:6968` — source-text readers
- `client/src/modules/parity/recordingContext.js:34-108` — the stand-in that already exists
- `scripts/render-fingerprint.mjs:10-45, 84-88, 303, 509` — the headless render driver
- `client/src/modules/parity/goldenRealArm.test.js:8` — "RaceScreen's OWN init"
- `scripts/camera-fingerprint.mjs:220-249` — renders through `PHASE.FINISHED`
- `client/src/screens/RaceScreen/standingsInvariant.test.jsx:21-27` — mounts the real `Scoreboard.jsx`
- `client/e2e/d9-smoke.spec.js:345-441` — the browser mount test that already exists
- `docs/VERIFY-RULES.md:208-212` — R7
- `scripts/engine-reach.mjs --list` — 76 files, `RaceScreen` absent
