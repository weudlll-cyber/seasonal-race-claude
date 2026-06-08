# RaceArena — Hygiene Audit

**Date:** 2026-06-08  
**Start point:** backup/sec2  
**Method:** READ-ONLY — no changes made.

---

## Triage Table

| ID  | Finding | Priority | Fix class |
|-----|---------|----------|-----------|
| H-01 | German error strings in `apiClient.js` (CLAUDE.md violation) | HIGH | SAFE-SMALL-FIX |
| H-02 | Duplicate physics constants in `CameraDirector.js` + `cameraTimingComputation.js` | MEDIUM | SAFE-SMALL-FIX |
| H-03 | `knip` reports 5 unused component files in `client/src/components/` | MEDIUM | OWNER-DECISION |
| H-04 | `knip` reports 1 unused devDep: `lint-staged` (also verified: `lint-staged` IS used by pre-commit hook — knip false-positive; still document) | LOW | OWNER-DECISION |
| H-05 | Module-level caches in `spriteLoader.js`, `bgImageCache.js`, `spriteTinter.js` have no documented size bound | MEDIUM | OWNER-DECISION |
| H-06 | Vite dev-proxy **not configured** — browser direct-fetch to `/api/*` gets 404; `API_BASE_URL` hardcodes `localhost:4000` | MEDIUM | OWNER-DECISION |
| H-07 | `apiClient.js`: `withTimeout` timeout constant duplicated; internal `apiCall` error-test on `docker-compose` substring is fragile | LOW | SAFE-SMALL-FIX |
| H-08 | React Router v6 `<BrowserRouter>` future-flag warnings not opted into | LOW | SAFE-SMALL-FIX |
| H-09 | Stale hex-ID refs to `90d3020197da` only in `server/data/tracks-backups/` — active code is clean | INFO | no action |
| H-10 | `docs/API.md` labelled "Phase 5 placeholder" in `ARCHITECTURE.md` — but the file is now non-trivial | LOW | SAFE-SMALL-FIX (doc) |
| H-11 | `npm audit`: server `qs` MODERATE (H5 from SECURITY.md) — no new findings | LOW | OWNER-DECISION |
| H-12 | `DiagnoseVerteilung` route is URL-only internal debug screen; not documented in SETUP or ARCHITECTURE | LOW | OWNER-DECISION |
| H-13 | `depcheck`: no unused dependencies in either package (clean) | INFO | no action |

---

## Detail

### H-01 — German error strings in `apiClient.js` (HIGH — CLAUDE.md violation)

**File:** `client/src/services/apiClient.js:26, :43`

```javascript
'Server nicht erreichbar. Bitte prüfe ob der Backend-Server läuft (docker-compose up im Repo-Verzeichnis), dann erneut versuchen.'
```

This string appears in two places inside `withTimeout` and the catch branch of `apiCall`. CLAUDE.md mandates English for all user-facing text without exception. These strings are shown directly to the user when the backend is unreachable (e.g., from the Track Editor save flow). A matching test (`trackApi.test.js:67`) also asserts on the German fragment `Server nicht erreichbar`, which will need updating in the same fix.

**Recommended fix:** Replace both occurrences with English equivalents, e.g.:  
`'Server not reachable. Check that the backend is running (docker compose up in the project root), then try again.'`  
Update the test assertion. SAFE-SMALL-FIX.

---

### H-02 — Duplicate physics constants across camera modules (MEDIUM)

**Files:**  
- `client/src/modules/camera/CameraDirector.js:31–32` — `_BATTLE_PULK_THRESHOLD_PX = 200`, `_BATTLE_PULK_THRESHOLD_T = 0.12`  
- `client/src/modules/camera/cameraTimingComputation.js:14–15` — `BATTLE_PULK_THRESHOLD_PX = 200`, `BATTLE_PULK_THRESHOLD_T = 0.12`  

The same constants are defined with identical values in both files. `CameraDirector.js` uses the prefixed `_` variants as private fallbacks; `cameraTimingComputation.js` defines its own copies as module-level fallbacks. If either value is ever tuned, the change must be made in two places.

Neither file imports from the other for this purpose. The duplication arose when `cameraTimingComputation.js` was extracted from `CameraDirector.js` (hygiene PR, `e180a6b`).

**Recommended fix:** Move the four constants to `cameraTimingComputation.js` and import them into `CameraDirector.js`. SAFE-SMALL-FIX, but requires care not to alter the underscore-prefixed private naming convention in `CameraDirector.js`.

---

### H-03 — `knip`: 5 unused component files (MEDIUM)

**Tool:** `npx knip` (client)

```
src/components/Button/index.js
src/components/ColorPicker/index.js
src/components/InputField/index.js
src/components/LogoUploader/index.js
src/components/Modal/index.js
```

These five barrel/component files have zero imports in the source tree according to knip's static analysis. They may be candidates for removal or may be intentionally kept as a design-system library. Note: `LogoUploader` is documented in the BACKLOG as part of the branding/team-logo feature (Phase 5 area); the others appear to be generic UI primitives that are either pre-built for future use or superseded by inline implementations.

**Recommended fix:** Owner to confirm intended status: design-system stubs (keep + document) or dead code (delete). OWNER-DECISION.

---

### H-04 — `knip`: reports `lint-staged` unused (LOW)

**File:** `client/package.json:25`

Knip reports `lint-staged` as an unused devDependency. However, `lint-staged` IS used — it is invoked by the `.husky/pre-commit` hook and configured in `package.json` under `"lint-staged": { ... }`. Knip does not follow the `.husky/` hook path to detect this usage, making it a false-positive.

No action required on the dependency itself. Worth noting because it will continue to appear in knip reports; the resolution is to add a `knip.config` entry to mark it as used or to ignore the lint-staged false-positive.

---

### H-05 — Unbounded module-level caches (MEDIUM)

Three module-level `Map` instances grow without bound:

| File | Cache | Keys |
|------|-------|------|
| `client/src/modules/racer-types/spriteLoader.js:11` | `_cache: Map` | sprite URLs → `HTMLImageElement` |
| `client/src/modules/track-effects/bgImageCache.js:10` | `_cache: Map` | background paths → `{img, ready, failed}` |
| `client/src/modules/racer-types/spriteTinter.js:15,23,27,137` | `_variantCache`, `_patternTileCache`, `_patternedVariantCache`, `_maskedVariantCache` | coat/tint/pattern keys → canvas images |

In a long session with many user-created racer types and custom background tracks, these caches accumulate `HTMLImageElement` and `HTMLCanvasElement` objects that are never evicted. Each `HTMLCanvasElement` holds pixel data — a 1536×1024 background canvas is ~6 MB. With 10 tracks + multiple coat variants per racer type, a session could hold tens or hundreds of MB of decoded image data.

This matches the issue flagged in the prior audit as F1-a/B2. There is no documented size cap anywhere. The `_clearXxxCache()` test helpers confirm clearing is possible but these are not called at runtime.

**Recommended fix (owner decision):** Document an intended bound in each cache (or add an LRU eviction policy). `bgImageCache` is the highest-priority target since background images are the largest per-entry cost. OWNER-DECISION on whether to add eviction or just document the accepted risk.

---

### H-06 — No Vite dev-proxy: `API_BASE_URL` hardcodes `localhost:4000` (MEDIUM)

**Files:**  
- `client/vite.config.js` — no `server.proxy` configuration  
- `client/src/services/api.js:4` — `export const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000'`

The client makes absolute cross-origin requests to `http://localhost:4000/api/*` in both dev and production. Consequences:

1. **Dev-proxy 404s from browser JS**: A browser `fetch('/api/...')` will miss entirely (404 from the Vite dev server) unless the full absolute URL is used. All production code uses `API_BASE_URL`, so this is currently not a runtime bug — but if any code ever uses relative paths it will silently break.

2. **CORS wildcard dependency**: The server runs `cors()` with no origin restriction (H6 in SECURITY.md). The setup works precisely because `cors()` allows all origins. If CORS is ever restricted, the dev setup breaks without adding a proxy.

3. **Documentation gap**: `docs/SETUP.md` and `ARCHITECTURE.md` do not explain that no proxy is configured and why (intentional). The dev proxy 404 observed in the security verification pass was confusing.

**Recommended fix:** Either add a `server.proxy` in `vite.config.js` (maps `/api` → `localhost:4000` so relative paths work) or document explicitly that absolute URLs are intentional and proxy-less is by design. OWNER-DECISION.

---

### H-07 — `apiClient.js`: duplicated timeout constant + fragile error-type check (LOW)

**File:** `client/src/services/apiClient.js`

Two distinct issues in the same file:

1. **Duplicated timeout:** `apiClient.js` defines `TIMEOUT_MS = 8000` at line 16. The `trackLoader.js` and `surfaceClassLoader.js` each define their own `TIMEOUT_MS = 5000` (described in the module header as "intentionally different"). The header comment explains the distinction correctly, but the value in `apiClient.js` is never referenced outside that file and has no cross-module source of truth.

2. **Fragile error-type check:** `apiCall` catches fetch errors and re-wraps them, using `err.message.includes('docker-compose')` to distinguish "is this our own timeout error?" from "is this a network error?". This is fragile: if the error message text changes, the branching fails silently. A typed error or a tagged property would be more robust.

**Recommended fix:** Replace the `includes('docker-compose')` sentinel with a tagged error class or `err.code === 'TIMEOUT'`. SAFE-SMALL-FIX.

---

### H-08 — React Router v6 future-flag warnings (LOW)

**File:** `client/src/App.jsx:71` — `<BrowserRouter>` with no `future` prop

React Router v6.24+ emits console warnings for two pending v7 breaking changes unless the app opts in with future flags:

- `v7_startTransition` — wraps state updates in `React.startTransition`
- `v7_relativeSplatPath` — changes relative-path resolution in splat routes

At the installed version (`^6.24.0`), both flags are opt-in. Neither changes behaviour in this app (no splat routes; `startTransition` is a no-op for synchronous navigation). Adding the flags now eliminates the warnings and makes the eventual v7 upgrade trivial.

**Recommended fix:**
```jsx
<BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```
SAFE-SMALL-FIX.

---

### H-09 — Stale `90d3020197da` refs: backup files only, active code clean (INFO)

A search for `90d3020197da` (the old hex Luger Hill track ID) across all non-`node_modules` source returns hits only in `server/data/tracks-backups/` (timestamped backup JSON files from 2026-05-27 and -29, before the rename commit). The live track file is `luger-hill.json`, scripts use `luger-hill`, and the in-memory ID is `luger-hill`.

The backup files are intentionally immutable snapshots and do not affect runtime. The `BACKLOG.md:674` entry that tracked this rename is now stale (the rename is done) — it should be marked complete. **No code change needed.**

---

### H-10 — `docs/API.md` labelled "Phase 5 placeholder" in ARCHITECTURE.md (LOW)

**File:** `docs/ARCHITECTURE.md:107` — `│   ├── API.md  # Phase 5 placeholder`

`API.md` is no longer a placeholder — it is a real 98-line reference document covering the Tracks API, Surface-Class API, and Health endpoint, with full request/response schemas. The label in the tree diagram is stale.

**Recommended fix:** Update the comment to `# REST API reference (Tracks + Surface Classes)`. SAFE-SMALL-FIX (doc).

---

### H-11 — `qs` MODERATE npm advisory (server) (LOW)

Confirmed from `npm audit` in security audit (H5). `qs@6.x` in `server/node_modules` has a remotely triggerable DoS in `qs.stringify` with comma-format arrays and `encodeValuesOnly`. Not exploitable in this app. Upgrade available (`express@5.x` bundles a clean `qs`). **No new findings since security audit.**

---

### H-12 — `DiagnoseVerteilung` internal debug route undocumented (LOW)

**File:** `client/src/App.jsx:81–84`

```jsx
{/* INTERNAL: URL-only diagnose route. Not linked in UI */}
<Route path="/diagnose-verteilung" element={<DiagnoseVerteilung />} />
```

The route exists and the component is used (knip does not flag it as unused), but it is not mentioned in `SETUP.md`, `ARCHITECTURE.md`, or `ROADMAP.md`. A new developer who discovers it cannot know its purpose or status (active tool vs. forgotten debug screen). The module comment in `DiagnoseVerteilung.jsx` should say "internal distribution-analysis diagnostic" but this is a naming hygiene issue: the route name and file name mix English and German (`Diagnose` + `Verteilung`).

**Recommended fix (owner decision):** Either document its purpose in SETUP.md or rename to `DiagnoseDistribution` with an English route `/diagnose-distribution`. OWNER-DECISION.

---

### H-13 — `depcheck`: no unused dependencies (INFO)

`npx depcheck` in both `client/` and `server/` reports **"No depcheck issue"**. All listed dependencies in `package.json` are actively referenced. Clean.

---

## Summary

The most actionable items are:

1. **H-01** (HIGH): Fix the two German error strings in `apiClient.js` — this is a documented CLAUDE.md rule violation visible to users.
2. **H-06** (MEDIUM): Document the intentional absence of a Vite dev-proxy, or add one to remove the confusing 404-on-relative-path behavior.
3. **H-05** (MEDIUM): Document the intended size bounds (or lack thereof) for the three module-level image caches before memory pressure becomes a production issue.
4. **H-02** (MEDIUM): Consolidate the four duplicate camera constants.
