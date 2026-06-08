# jscpd Duplicate-Code Review

**Date:** 2026-06-08  
**HEAD:** 2410d78  
**Scope:** J01, J02, J03 from `STATIC-ANALYSIS.md`  
**Status:** READ-ONLY. No code changed.

---

## Summary Table

| Cluster | Files | Identical? | Lines saved | Risk | Verdict |
|---------|-------|-----------|------------|------|---------|
| J01 | `surfaceClassApi.js` vs `trackApi.js` | Yes — byte-for-byte | ~40 (the 2 shared functions) | Low-Medium | **MERGE-WORTH** |
| J02 | `surfaceClasses.js` vs `tracks.js` (`atomicWriteJson`) | Yes — byte-for-byte | ~11 (one function) | Low | **MERGE-WORTH** |
| J03 | `validateTrackBodyForCreate` vs `validateTrackBodyForUpdate` | No — same-shape but diverging | ~15 (shared sub-blocks) | Medium-High | **LEAVE** |

---

## J01 — Client API boilerplate: surfaceClassApi.js vs trackApi.js

### Duplicated block (lines 1–54 in both files)

`client/src/services/surfaceClassApi.js:12–54`  
`client/src/services/trackApi.js:12–54`

```javascript
const TIMEOUT_MS = 8000;

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error('Server nicht erreichbar…')),
        ms
      )
    ),
  ]);
}

async function apiCall(url, options = {}) {
  let res;
  try {
    res = await withTimeout(fetch(url, options), TIMEOUT_MS);
  } catch (err) {
    throw new Error(
      err.message.includes('docker-compose')
        ? err.message
        : 'Server nicht erreichbar…'
    );
  }
  if (!res.ok) {
    let errMsg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body.error) errMsg = body.error;
    } catch { /* ignore */ }
    throw new Error(errMsg);
  }
  return res;
}
```

### Identical?

**Yes — byte-for-byte.** The TIMEOUT_MS constant, the `withTimeout` function, and the `apiCall` function are character-for-character identical in both files. The only structural difference is that `surfaceClassApi.js` additionally defines `const BASE_URL = \`${API_BASE_URL}/api/surface-classes\`` (line 13) and uses it throughout — `trackApi.js` does not define a BASE_URL constant and instead constructs each URL inline at each call site. This difference is in the per-file usage layer, not in the shared block.

### What a merged version looks like

Create `client/src/services/apiClient.js`:
```javascript
// Shared fetch boilerplate used by all API service modules.
const TIMEOUT_MS = 8000;

export function withTimeout(promise, ms) { /* ... */ }
export async function apiCall(url, options = {}) { /* ... */ }
```

Each call site becomes:
```javascript
// surfaceClassApi.js
import { apiCall } from './apiClient.js';
const BASE_URL = `${API_BASE_URL}/api/surface-classes`;
// all other lines unchanged

// trackApi.js
import { apiCall } from './apiClient.js';
// all other lines unchanged
```

**Lines saved:** ~40 lines removed from the two files; ~12 lines added for the new module. Net: −28 lines.  
**Files touched:** 3 (new file + 2 edits).

### Risk

Low-Medium. The `apiCall` function is on the critical path for every server request — a bug in the shared version breaks all API operations simultaneously. However, the function is simple and already tested implicitly by many existing tests. The risk is proportional to the test coverage of these paths, which is reasonable.

The main open question is: are there future divergence scenarios? The surface-classes API and the tracks API are both stable CRUD endpoints. The shared boilerplate (timeout, error wrapping) is genuinely generic. There is no obvious reason they need different timeout values or error-message strings.

### Verdict: MERGE-WORTH

The duplication is purely accidental (copy-paste when the second API file was created). The shared helper is completely generic. Merging removes the risk of the two files diverging in the error-handling path — e.g., if someone fixes the German error message in one file but not the other (this has already happened: `surfaceClassApi.js:6` comment says "Mirrors the pattern of trackApi.js" but does not call out the language of the error message). Low risk, clean win.

---

## J02 — Server `atomicWriteJson` function

### Duplicated block

`server/src/routes/surfaceClasses.js:58–68`  
`server/src/routes/tracks.js:286–296`

```javascript
function atomicWriteJson(filePath, data) {
  const json = JSON.stringify(data, null, 2);
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, json, 'utf8');
  try {
    renameSync(tmp, filePath);
  } catch {
    writeFileSync(filePath, json, 'utf8');
    try { unlinkSync(tmp); } catch {}
  }
}
```

### Identical?

**Yes — byte-for-byte.** The function bodies are character-for-character identical.

One small asymmetry: `tracks.js:283–285` has a 3-line explanatory comment above the function explaining the Windows/OneDrive EPERM fallback. `surfaceClasses.js` has no such comment. This is a documentation difference only — the code is identical.

### What a merged version looks like

Extract to `server/src/utils/atomicWriteJson.js` (or inline in `server/src/app.js`):
```javascript
export function atomicWriteJson(filePath, data) { /* ... */ }
```

Each route imports it:
```javascript
import { atomicWriteJson } from '../utils/atomicWriteJson.js';
```

**Lines saved:** ~11 lines from each file (−22 total); ~7 lines for the new utility file. Net: −15 lines.  
**Files touched:** 3 (new file + 2 edits).

### Risk

Low. `atomicWriteJson` is a simple filesystem utility with no request-path logic. Both routes use it identically — one call per write. Extracting it to a shared utility couples the two routes only via a utility function that has no business logic, similar to how both already share `writeFileSync` from `node:fs`. No behavior change on merge.

### Verdict: MERGE-WORTH

Identical utility function duplicated across two route files. No divergence reason exists — the function is pure filesystem I/O. The Windows/OneDrive comment from `tracks.js` should accompany the shared version. Straightforward, low-risk extraction.

---

## J03 — `validateTrackBodyForCreate` vs `validateTrackBodyForUpdate` (same-shape blocks)

### Duplicated blocks

`server/src/routes/tracks.js:367–392` — within `validateTrackBodyForCreate`  
`server/src/routes/tracks.js:417–447` — within `validateTrackBodyForUpdate`

The shared sub-blocks are `surfaceClasses`, `maxRacers`, and `trackLights` validation:

```javascript
// Shared in both validators:
if ('surfaceClasses' in body) {
  if (!Array.isArray(body.surfaceClasses) || !body.surfaceClasses.every((c) => typeof c === 'string')) {
    errors.push('surfaceClasses must be an array of strings');
  }
}
if ('maxRacers' in body) {
  if (body.maxRacers !== null && (typeof body.maxRacers !== 'number' || body.maxRacers <= 0)) {
    errors.push('maxRacers must be a positive number or null');
  }
}
if ('trackLights' in body) {
  const err = validateTrackLights(body.trackLights);
  if (err) errors.push(err);
}
```

### Identical?

**No — same shape but structurally diverging.**

Key differences between the two validators:

| Check | `validateTrackBodyForCreate` | `validateTrackBodyForUpdate` |
|-------|------------------------------|------------------------------|
| `name` | Required unconditionally | Only validated `if ('name' in body)` |
| `closed` | Required unconditionally | Only validated `if ('closed' in body)` |
| `worldWidth/Height` | Both required unconditionally | Each validated individually `if ('worldWidth' in body)` |
| Geometry | Required: must have full centerPoints OR innerPoints+outerPoints | Optional: only required if ANY geometry key present |
| `geometryId` | Not checked | Validated `if ('geometryId' in body)` |

The shared sub-blocks (`surfaceClasses`, `maxRacers`, `trackLights`) are identical and could be extracted. But they are sandwiched between diverging logic on both sides, and their shared pattern (`if (key in body) { validate... }`) is actually the UPDATE-style conditional check applied to fields that happen to be optional in both paths.

### What a merged version could look like

Extract only the 3 shared sub-blocks into a `validateOptionalFields(body, errors)` helper:

```javascript
function validateOptionalTrackFields(body, errors) {
  if ('surfaceClasses' in body) { /* ... */ }
  if ('maxRacers' in body) { /* ... */ }
  if ('trackLights' in body) { /* ... */ }
}
```

Both validators call it at the end. **Lines saved:** ~15 lines (one copy of the 3 blocks removed). **Files touched:** 1 (tracks.js only, since both functions are in the same file).

### Risk

Medium-High. These two functions sit on the validation path for all POST and PUT requests to `/api/tracks`. The fact that they share some blocks reflects that some fields are optional in both contexts — but the overall shape of each function represents a distinct contract (CREATE requires geometry; UPDATE requires nothing but validates what's present). Extracting only the shared tail:

1. Reduces readability — both functions become harder to follow as a self-contained spec because part of their validation is hidden in a helper
2. Couples future changes: if `maxRacers` validation needs to differ between CREATE and UPDATE, you'd need to split the helper back out
3. The two functions are in the same file, making the duplication less problematic than cross-file duplication — a developer reading either function sees them side by side and understands the pattern immediately

The 15-line saving does not outweigh the reduced readability and future-change coupling for a request-validation path.

### Verdict: LEAVE

The duplication is intentional structural mirroring — the two validators represent two distinct validation contracts for the same resource. The shared sub-blocks are genuinely similar because the 3 fields are optional in both contexts, not because someone lazily copy-pasted. The functions live in the same file and are readable side-by-side. Merging the shared sub-blocks saves ~15 lines at the cost of splitting a self-contained validation contract across two functions. Risk > benefit.
