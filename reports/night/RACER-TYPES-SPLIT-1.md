# RACER-TYPES-SPLIT-1 — the registry the engine reads stops carrying the network

Day chain 2026-09-10, piece 4 · branch `night/2026-09-09` · **nothing minted. All four fingerprints
measured and UNMOVED; golden races pass.**

HULL-FIX-1 established the over-report and stopped: `racer-types/index.js` carried **both** the
registry the race engine reads **and** the HTTP layer for editing racer types, so three `services/`
files sat inside a 197-file hull and could never move a race. It stopped because that is product
code. This is the separation.

---

## ★ THE STOP CONDITION — NOT TRIPPED

| role | record | measured | |
|---|---|---|---|
| world | `8a1977187e9c99b4` | `8a1977187e9c99b4` | **matches** |
| world-off | `aa09ed97a3a32689` | `aa09ed97a3a32689` | **matches** |
| camera | `75aef5cd474c54e5` | `75aef5cd474c54e5` | **matches** |
| render | `40b2de6fcc5bafd8` | `40b2de6fcc5bafd8` | **matches** |

Golden races: **PASS**. Client tests over every touched area: **64 files, 1 075 tests, all pass.**

**This is a pure separation. Nothing was copied and nothing new ships.**

---

## WHAT MOVED, AND THE ONE-WAY DEPENDENCY

`client/src/modules/racer-types/serverRacerTypes.js` (new) takes `loadServerRacerTypes`,
`registerRacerType`, `removeRacerType`, `_runLoad`, `_dataUrlToFile` and the single-flight guard —
**every caller of `services/racerApi.js` and every use of `API_BASE_URL`.**

The registry keeps a three-function seam: `_ingestServerRacerConfigs`, `_markRacersReadyFromLoader`,
`_hasLoadedRacerType`.

★ **The sprite URL is built by the CALLER, not the registry.** `API_BASE_URL/api/racers/<id>/sprite`
is a server address; building it inside `index.js` would import `services/api.js` straight back and
undo the split. The editing module owns the network's address; the registry owns what a racer type IS.

★ **`serverRacerTypes.js` is NOT re-exported from `index.js`, and must never be** — a re-export would
put those imports back into the registry's closure while looking tidy. Every importer names the half
it needs:

| importer | now reads |
|---|---|
| `components/RacerSyncOnAuth.jsx` | `serverRacerTypes.js` |
| `screens/DevScreen/sections/RacerManager.jsx` | `serverRacerTypes.js` |
| `screens/RacerEditor/RacerEditor.jsx` | `serverRacerTypes.js` |

---

## ★ THE HULL — AND ONLY ONE FILE LEFT, NOT THREE

**197 → 196.** The file that left:

- `client/src/services/racerApi.js`

★ **`services/api.js` and `services/apiClient.js` did NOT leave, and HULL-FIX-1's attribution was
therefore incomplete.** It named all three as pulled in through `racer-types/index.js:75-82`. They
have a **second, independent path**, found by re-running the hull rather than assuming the split
would clear them:

```
client/src/modules/storage/surfaceClassLoader.js:10
  import { fetchSurfaceClasses } from '../../services/surfaceClassApi.js';
```

`surfaceClassLoader.js` is imported by `RaceScreen`, so `surfaceClassApi.js` is in the hull and drags
`api.js` and `apiClient.js` with it. **That is the same shape as this piece's defect in a different
module, and it is NAMED AND LEFT** — a second product split is a second decision, and the brief asked
for this one.

---

## ★ THE SABOTAGE — AND THE FIRST ONE WAS A FALSE GREEN

**Attempt 1.** Point `RacerSyncOnAuth.jsx` at the registry half instead of the server half and run its
test: **11 passed.** Not a finding — chased down rather than reported. The reason is at
`RacerSyncOnAuth.test.jsx:15`:

```js
vi.mock('../modules/racer-types/index.js', () => ({ loadServerRacerTypes: vi.fn() }));
```

**The test mocked the module the sabotage pointed at**, so the mock supplied the missing name. A
mocked import path can absorb any import-path defect.

★ **And that exposed a real consequence of the split**: the mock was still aimed at `index.js` while
the component now imports `serverRacerTypes.js`, so the *real* registry was loading — boot side
effects and all — while the thing under test came from elsewhere. **Fixed**: the mock and the import
both name the server half, and the file says why.

**Attempt 2 — the same sabotage against the client BUILD**, which no mock can absorb:

```
error during build:
[MISSING_EXPORT] "loadServerRacerTypes" is not exported by "src/modules/racer-types/index.js".
```

★ **Red.** The split is load-bearing: an importer reading the wrong half cannot be built.

---

## CHECKS

```
node scripts/engine-reach.mjs --check <the 11 changed paths>

ENGINE REACH: 1 of 6 path(s) can change the race:
  client/src/modules/racer-types/index.js
```

(the reach tool naming the registry — correctly — as the one changed file inside the hull)

## SOURCE HYGIENE

| file | change |
|---|---|
| `racer-types/serverRacerTypes.js` | **NEW**, with a header saying what it owns and what it does not |
| `racer-types/index.js` | HTTP imports removed; three seam functions added; the moved block gone |
| 3 product importers | repointed, each with the reason |
| 5 test files | imports and `vi.mock` targets repointed to the half they exercise |

**A move that overshot, caught and corrected:** the first cut took
`_setLoadedRacerTypeForTesting` with the block — it writes `_loadedRacerTypes`, which stays in the
registry — and 13 tests went red with `_setLoadedRacerTypeForTesting is not a function`. It is back in
`index.js`. **Recorded because the tests are what caught it, not a reading.**

**Nothing dead is left behind.** No function exists twice; `index.js` has no unused import left.

**NOTICED AND LEFT:** the `surfaceClassApi.js` path above.

**No record was created by hand. `git stash` was not used.**
