# RaceArena — Security Audit Report

**Date:** 2026-06-08  
**Scope:** server + client source (backup/favicon start point).  
**Method:** READ-ONLY static analysis — no code changed, no data changed, tests not run.  
**Out of scope:** Authentication / authorization (planned later, explicitly excluded by spec).

---

## Severity Table

| ID  | Area                          | Severity | Category           | Fix class         |
|-----|-------------------------------|----------|--------------------|-------------------|
| C1  | Track effects — count OOM     | HIGH     | CONFIRMED          | SAFE-SMALL-FIX    |
| C2  | Geometry coordinates untyped  | MEDIUM   | CONFIRMED          | SAFE-SMALL-FIX    |
| C3  | No rate limiting              | MEDIUM   | CONFIRMED          | OWNER-DECISION    |
| C4  | Upload MIME / no nosniff      | MEDIUM   | CONFIRMED          | SAFE-SMALL-FIX    |
| H1  | importAllStorage no schema    | MEDIUM   | HARDENING          | OWNER-DECISION    |
| H2  | multer err.message exposed    | LOW      | HARDENING          | SAFE-SMALL-FIX    |
| H3  | No global error handler       | LOW      | HARDENING          | SAFE-SMALL-FIX    |
| H4  | No string length limits       | LOW      | HARDENING          | SAFE-SMALL-FIX    |
| H5  | qs MODERATE npm advisory      | LOW      | HARDENING          | SAFE-SMALL-FIX    |
| H6  | CORS wildcard                 | LOW      | HARDENING          | OWNER-DECISION    |

---

## CONFIRMED EXPLOITABLE

These findings let a caller directly manipulate the game, corrupt data, crash clients, or exhaust server resources.

---

### C1 — Track effects: `config.count` not validated → browser OOM/crash (HIGH)

**Files:**  
- `server/src/routes/tracks.js:472–504` (POST handler, `...rest` spread)  
- `server/src/routes/tracks.js:511–537` (PUT handler, `...rest` spread)  
- `client/src/modules/track-effects/effects/dust.js:30`  
- `client/src/modules/track-effects/effects/stars.js` (similar pattern in all effect files)

**What:** The `effects` array on a track is part of `...rest` in both POST and PUT handlers and is saved to disk verbatim. The server's validation functions (`validateTrackBodyForCreate`, `validateTrackBodyForUpdate`) do not check `effects` at all. Each effect's `config` object (e.g., `{count, size, color, opacity, drift, direction}`) is also stored without range checks.

On the client, every effect's `create(canvas, config)` call uses `config.count` directly:

```javascript
// dust.js:30
const particles = Array.from({ length: config.count }, () => ({ ... }));
```

**Exploit scenario:**  
```bash
PUT /api/tracks/dirt-oval
Content-Type: application/json

{
  "effects": [{"id": "dust", "config": {"count": 1e12, "size": 1, "color": "#fff", "opacity": 0.5, "drift": 1, "direction": "random"}}]
}
```

The request passes all validation and is stored. Every browser that starts a race on `dirt-oval` executes `Array.from({ length: 1e12 }, ...)`, which causes an immediate OOM / browser-tab crash. This affects all users of the default track.

The attack is persistent: the track is corrupted until an owner manually PUTs a corrected `effects` array.

**Recommended fix:**  
In `validateTrackBodyForCreate` and `validateTrackBodyForUpdate`, validate `effects` when present: each element must have a known `id` (cross-checked against a server-side allowlist or a minimum/maximum list) and each numeric `config` field must be within the schema-defined bounds. Minimum viable fix: add a cap on known numeric effect config fields (e.g., `count <= 1000`). SAFE-SMALL-FIX.

---

### C2 — Geometry point coordinates not type- or range-validated → race physics corruption (MEDIUM)

**File:** `server/src/routes/tracks.js:342–376` (`validateTrackBodyForCreate`) and `:384–431` (`validateTrackBodyForUpdate`)

**What:** Validation confirms that `centerPoints` / `innerPoints` / `outerPoints` are arrays with at least 2 elements, but does NOT validate that each element is a `[number, number]` pair, or that the numbers are finite, within canvas bounds, or non-NaN.

**Exploit scenario:**  
```json
{ "centerPoints": [[null, "hello"], [Infinity, -Infinity]], ... }
```
passes all server-side validation checks. The coordinates are stored and served to all clients. The client's spline computation and racer physics receive NaN/Infinity values, producing:
- Racers that cannot progress (stuck at NaN position)
- Finish-line detection that never fires
- Division-by-zero in length computations

The race is permanently broken for all users loading that track.

**Recommended fix:**  
In both validate functions, after the length check, verify every point is a two-element array of finite numbers:
```javascript
function isFinitePoint(p) {
  return Array.isArray(p) && p.length === 2 && isFinite(p[0]) && isFinite(p[1]);
}
```
Apply this to all three geometry arrays. SAFE-SMALL-FIX.

---

### C3 — No rate limiting → disk/memory exhaustion (MEDIUM)

**File:** `server/src/app.js` (no rate-limit middleware)

**What:** There is no `express-rate-limit` or equivalent middleware on any endpoint. The server holds all tracks in an in-memory `Map` (`tracksMap`) loaded at startup, and adds to it on every POST:

```javascript
tracksMap.set(id, track); // unbounded; grows until server is restarted
```

Every POST also writes a timestamped backup file. Every 10 MB upload POST writes to `server/data/backgrounds/`.

**Exploit scenario:**  
A script POSTing minimal valid tracks in a loop:
- Fills `tracksMap` until the Node.js process runs out of heap memory, crashing the server.
- Writes unbounded `.json` files to `server/data/tracks/` and `server/data/tracks-backups/`, filling disk.
- Similarly, repeated 10 MB uploads fill `server/data/backgrounds/`.

**Recommended fix:**  
Add `express-rate-limit` per IP (e.g., 60 requests/minute on write endpoints). Add a track count cap: `if (tracksMap.size >= MAX_TRACKS) return res.status(429).json(...)`. Add a surface-class cap. OWNER-DECISION (threshold values are a product decision).

---

### C4 — Background upload: MIME from user header, no fileFilter, no `nosniff` → polyglot stored XSS risk (MEDIUM)

**File:** `server/src/routes/tracks.js:35–38` (multer config), `:598–599` (MIME derivation), `:461` (background serve)

**What:** The multer configuration has no `fileFilter`:

```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BG_BYTES },
  // No fileFilter — any file accepted
});
```

The extension and served Content-Type are derived entirely from the client-supplied `Content-Type` multipart header (the `req.file.mimetype` field), which is attacker-controlled:

```javascript
const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
```

A file uploaded with `Content-Type: image/png` but containing HTML/JS (a "polyglot") is stored as `.png`. When served:

```javascript
// background serve endpoint — no X-Content-Type-Options header set
res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
stream.pipe(res);
```

No `X-Content-Type-Options: nosniff` is set. In browsers that MIME-sniff (pre-Chrome hardening, IE11, or misconfigured proxies), the response could be interpreted as HTML and execute embedded script.

**Exploit scenario:**  
1. Upload `<html><script>…exfiltrate localStorage…</script>` with `Content-Type: image/png`.  
2. File stored as `<trackid>.png`, served as `image/png`.  
3. In a MIME-sniffing browser, navigating directly to `/api/tracks/<id>/background` executes the script in the server origin.

**Recommended fix (two parts):**  
1. Add a `fileFilter` that rejects non-image MIME types, AND validate magic bytes using a library like `file-type` for defense-in-depth (MIME header is attacker-controlled).  
2. Add `res.setHeader('X-Content-Type-Options', 'nosniff')` to the background serve endpoint (and ideally as app-level middleware). SAFE-SMALL-FIX.

---

## HARDENING

Defense-in-depth items. Not directly exploitable in the current architecture, but remove risk from future changes or edge conditions.

---

### H1 — `importAllStorage` writes any JSON backup without schema validation (MEDIUM)

**File:** `client/src/modules/storage/storage.js:92–95`

```javascript
export function importAllStorage(data) {
  for (const [key, val] of Object.entries(data)) {
    if (key.startsWith('racearena:')) storageSet(key, val);
  }
}
```

**What:** A crafted JSON backup file can overwrite any `racearena:*` key with arbitrary values — malformed tracks (see C2), corrupted player groups, corrupted race history, or invalid config objects. No type or schema checks are applied before writing to localStorage.

**Exploit scenario:** An attacker distributes a "share your race config" `.json` file via a third-party channel. The operator imports it via the DevScreen. All game data is replaced with attacker-controlled values; the app may crash on next load or silently produce manipulated race outcomes.

**Recommended fix:** Validate the top-level shape of each known key before importing (e.g., `TRACKS` must be an array, `RACE_DEFAULTS` must be an object). OWNER-DECISION — the level of validation is a product decision.

---

### H2 — multer `err.message` exposed verbatim in 400 response (LOW)

**File:** `server/src/routes/tracks.js:589`

```javascript
return res.status(400).json({ error: err.message });
```

If multer throws an unexpected internal error (not `LIMIT_FILE_SIZE`), the raw `err.message` is returned to the caller. Current multer messages are low-risk, but this creates a habit of leaking internal library text. Prefer a fixed string: `'File upload failed.'`. SAFE-SMALL-FIX.

---

### H3 — No global error handler; `NODE_ENV` not forced to `production` (LOW)

**Files:** `server/src/app.js`, `server/src/index.js`

**What:** Express 4.x includes a default error handler that renders the error `stack` in the HTML body when `NODE_ENV !== 'production'`. The Docker `command:` and `environment:` in `docker-compose.yml` do not set `NODE_ENV=production`. If an unhandled throw escapes a route handler (e.g., `atomicWriteJson` failing on a full disk), Express's default handler returns the Node.js stack trace — which includes absolute container file paths — to the caller.

**Recommended fix:** Add `NODE_ENV=production` to `docker-compose.yml` environment block, and add a global error handler in `app.js`:
```javascript
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});
```
SAFE-SMALL-FIX.

---

### H4 — No string length limits on track name / surface-class label (LOW)

**Files:** `server/src/routes/tracks.js:343`, `server/src/routes/surfaceClasses.js:70`

Track `name` and surface-class `label` are validated for presence but not length. A 999 KB name string is accepted (body limit is 1 MB). That value is stored to disk and returned in every `GET /api/tracks` summary response, bloating the list for all callers indefinitely.

**Recommended fix:** Add `body.name.length > 200` checks in both validators. SAFE-SMALL-FIX.

---

### H5 — npm advisory: `qs` MODERATE DoS (LOW)

**Path:** `server/node_modules/qs` (transitive via `express@4.21.x` → `body-parser` → `qs@6.x`)

`qs.stringify` crashes with `TypeError` when an entry in a comma-format array is `null`/`undefined` and `encodeValuesOnly` is set (GHSA-q8mj-m7cp-5q26, CVSS 5.3). This code path is not triggered by RaceArena — the app uses `express.json()`, not `express.urlencoded()` with `qs.stringify`. Exploitability in this app is **nil**, but the package should be updated as routine hygiene.

**Client:** 0 vulnerabilities.

---

### H6 — CORS wildcard (LOW)

**File:** `server/src/app.js:16`

```javascript
app.use(cors()); // reflects any Origin header
```

The wildcard CORS configuration means any web page on any origin can issue cross-origin requests to the API and read responses. Combined with missing authentication, this allows a malicious page opened in the operator's browser to read/modify all track and surface-class data.

For a local-only deployment, this is acceptable by design. For a deployed instance, restrict to the known client origin. OWNER-DECISION.

---

## Additional Notes

### Prototype pollution — NOT exploitable

Both routes use `{ ...req.body }` spread patterns. In V8 (Node.js 18+), spreading a JSON-parsed object with a `__proto__` key creates an own property named `__proto__` — it does NOT pollute `Object.prototype`. The surface-class `id` field is validated with `/^[a-z0-9_-]+$/` before any file path construction, blocking path traversal. No prototype pollution risk found.

### Path traversal — NOT exploitable

`backgroundImageFile` used in `GET /:id/background` is server-generated (`${track.id}.${ext}`) where `track.id` is a UUID substring — never user-supplied. Surface-class IDs pass through regex validation before path construction. Track IDs used in file operations come from the server's in-memory map, not raw URL params. No path traversal risk found.

### XSS via React rendering — NOT exploitable

All user-supplied strings (track names, icons, player names, labels) are rendered as React JSX text nodes, which auto-escape HTML entities. No `dangerouslySetInnerHTML`, `innerHTML`, or `insertAdjacentHTML` usage was found in the client source. Canvas `ctx.fillStyle` is not a code-execution sink.

---

*Report ends. No source, data, or test files were changed. Tests remain at 2591/2591.*
