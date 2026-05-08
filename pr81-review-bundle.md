# PR #81 — Review Bundle (v7, + Etappe 6)
**WIP: Per-State Following Camera (Phasen 1-6)**
Branch: `feat/per-state-camera-phase-1-foundation` → `master`
Datum: 2026-05-09 | Tests: 1849 passed, 0 failed
7 Commits auf Branch (Phase 1: 2, Etappe 2: 1, Etappe 3: 1, Etappe 4: 1, Etappe 4b: 1, Etappe 6: 1).

---

## 0. A2-Status — bewusst ausgelassen

**A2 (Open-Track-Pan in CameraDirector) wird nicht in Phase 1 umgesetzt.**

Grund: Der Refactor-Versuch (open-track `_setOpenTrackPanTargets()` in CameraDirector, screen-space `cam.offsetX/Y` im Render) hat eine Regression verursacht — der Leader verließ bei `LEADER_ZOOM` das Canvas. Root Cause: `targetOffsetX/Y` wurden bei pre-lerp-Zoom berechnet, aber der Render verwendete post-lerp-`effZoom` für `ctx.scale()`. Auf Tracks mit großer Zoom-Range (overview 0.21 → leader 1.07) war die Diskrepanz so groß, dass der Leader sofort off-screen ging.

Der Pfad ist architektonisch nicht trivial (world-space vs. screen-space Lerp für Open Tracks). Da das Camera-System gerade umgebaut wird (Profile, später entryTC, Lookahead), wird A2 separat und sauber in einer späteren Phase angegangen.

**Open-Track-Pan in Phase 1:** identisch mit pre-PR-#81-Stand (RaceScreen, lf=0.05, `st.camX/camY`).

---

## 1. Diff-Stats (nach A2-Revert)

```
 client/src/modules/camera/CameraDirector.js      | 161 +++++++++++-----
 client/src/modules/camera/CameraDirector.test.js | 217 ++++++++++++++++++++++-
 client/src/modules/cameraConfig.js               | 109 +++++++++++-
 client/src/modules/cameraConfig.test.js          | 103 +++++++++--
 client/src/modules/storage/defaults.js           |  80 +++++++--
 client/src/screens/RaceScreen/index.jsx          |  68 ++++---
 6 files changed, 626 insertions(+), 112 deletions(-)
```

DevScreen (`CameraZoomTuningSection.jsx`) — **nicht geändert** (Phase-3-Arbeit).

---

## 2. Vollständiger Diff der Kerndateien

### 2a. `client/src/modules/storage/defaults.js`

```diff
 export const DEFAULT_CAMERA_CONFIG = {
-  schemaVersion: 2,
-  spritePctOfCanvas: {
-    overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065,
+  schemaVersion: 4,
+  cameraStateProfiles: {
+    OVERVIEW:     { spritePct: 0.05, trackingTC: 1.5, entryTC: 1.5,
+                    lookaheadDistance: 0, lookaheadWeight: 0, innerFramePct: 0.7,
+                    maxStateDuration: 4000, minStateHold: 5000 },
+    LEADER_ZOOM:  { spritePct: 0.08, trackingTC: 0.3, entryTC: 0.3,
+                    lookaheadDistance: 0, lookaheadWeight: 0, innerFramePct: 0.7,
+                    maxStateDuration: 4000, minStateHold: 5000 },
+    BATTLE_ZOOM:  { spritePct: 0.12, trackingTC: 0.3, entryTC: 0.3,
+                    lookaheadDistance: 0, lookaheadWeight: 0, innerFramePct: 0.7,
+                    maxStateDuration: 6000, minStateHold: 5000 },
+    COMEBACK_ZOOM:{ spritePct: 0.065, trackingTC: 0.3, entryTC: 0.3,
+                    lookaheadDistance: 0, lookaheadWeight: 0, innerFramePct: 0.7,
+                    maxStateDuration: 4000, minStateHold: 5000 },
   },
+  entryConvergenceZoom: 0.05,
+  entryConvergencePx: 10,
   maxTargetScreenPx: 160, tagVisibleMaxCount: 10,
   showCameraStateHud: true, showCameraDiagnostics: false,
   battleGapThreshold: 0.05, endgameThreshold: 0.85,
-  maxStateDuration: 4000,
   postStartHoldMs: 7000,
-  battleMaxDurationMs: 6000,
   battleCooldownMs: 8000,
-  minStateHoldMs: 5000,
-  cameraTransitionSeconds: { overview: 1.5, leader: 0.3, battle: 0.3, comeback: 0.3 },
   overviewCooldownMin: 15000, overviewCooldownMax: 25000,
-  targetInnerFramePct: 0.7,
+  // Legacy fields for v3→v4 migration reads only:
+  spritePctOfCanvas: { overview: 0.05, leader: 0.08, battle: 0.12, comeback: 0.065 },
+  maxStateDuration: 4000, battleMaxDurationMs: 6000, minStateHoldMs: 5000,
+  cameraTransitionSeconds: { overview: 1.5, leader: 0.3, battle: 0.3, comeback: 0.3 },
+  targetInnerFramePct: 0.7,
 };
```

---

### 2b. `client/src/modules/cameraConfig.js`

```diff
+function buildProfilesFromLegacy(config) {
+  // Maps spritePctOfCanvas / cameraTransitionSeconds / battleMaxDurationMs / minStateHoldMs
+  // onto per-state cameraStateProfiles, preserving any user-tuned values.
+  // BATTLE_ZOOM.maxStateDuration comes from battleMaxDurationMs (had its own cap in v3).
+  ...
+}
+
+function migrateV3toV4(config) {
+  if (config.cameraStateProfiles) return { ...config, schemaVersion: 4 };
+  return { ...config,
+    cameraStateProfiles: buildProfilesFromLegacy(config),
+    entryConvergenceZoom: DEFAULT_CAMERA_CONFIG.entryConvergenceZoom,
+    entryConvergencePx:   DEFAULT_CAMERA_CONFIG.entryConvergencePx,
+    schemaVersion: 4 };
+}

 export function loadCameraConfig() {
   if (stored.schemaVersion === 2) {
     const merged = { ...DEFAULT_CAMERA_CONFIG, ...patched };
+    delete merged.cameraStateProfiles;   // strip defaults; buildProfilesFromLegacy muss laufen
     ...
-    return merged;
+    return migrateV3toV4(merged);
   }

+  if (stored.schemaVersion === 3) {
+    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
+    delete merged.cameraStateProfiles;   // strip defaults; buildProfilesFromLegacy muss laufen
+    ...
+    return migrateV3toV4(merged);
+  }

-  if (stored.schemaVersion !== 3) return { ...DEFAULT_CAMERA_CONFIG };
+  if (stored.schemaVersion !== 4) return { ...DEFAULT_CAMERA_CONFIG };
+  // v4: top-level merge + deep-merge cameraStateProfiles
   const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
-  ...
+  if (stored.cameraStateProfiles) {
+    for (const state of Object.keys(defProfiles)) {
+      merged.cameraStateProfiles[state] = { ...defProfiles[state],
+                                             ...(stored.cameraStateProfiles[state] ?? {}) };
+    }
+  }
   return merged;
 }

 export function saveCameraConfig(config) {
-  return storageSet(KEYS.CAMERA_CONFIG, { ...config, schemaVersion: 3 });
+  return storageSet(KEYS.CAMERA_CONFIG, { ...config, schemaVersion: 4 });
 }
```

**Wichtiger Fix beim Migrations-Bug:** `{ ...DEFAULT_CAMERA_CONFIG, ...stored }` kopiert `cameraStateProfiles` aus den Defaults in `merged`. `migrateV3toV4()` hätte dann `if (config.cameraStateProfiles) return early` ausgelöst und `buildProfilesFromLegacy()` nie aufgerufen. Lösung: `delete merged.cameraStateProfiles` vor dem Aufruf in v2- und v3-Branches.

---

### 2c. `client/src/modules/camera/CameraDirector.js` (relevante Sektionen)

**Neuer Export `tcToLerpFactor`:**
```diff
+export function tcToLerpFactor(tc) {
+  return 1 - Math.pow(0.1, 1 / (tc * FRAME_RATE));
+}
```

**`_computeZoomLevels` — dual read path:**
```diff
-  const pct = config?.spritePctOfCanvas ?? DEFAULT_SPRITE_PCT;
+  const profiles = config?.cameraStateProfiles;
+  if (profiles) {
+    pct = { leader: profiles.LEADER_ZOOM?.spritePct ?? ...,
+             battle: profiles.BATTLE_ZOOM?.spritePct ?? ...,
+             comeback: profiles.COMEBACK_ZOOM?.spritePct ?? ... };
+  } else {
+    const rawPct = config?.spritePctOfCanvas ?? DEFAULT_SPRITE_PCT;
+    pct = { leader: rawPct.leader, ... };
+  }
```

**`_computeTimingConfig` — dual read path + neue Maps:**
```diff
+  if (profiles) {
+    this._tcOverview = profiles.OVERVIEW?.trackingTC    ?? TC_OVERVIEW;
+    this._tcLeader   = profiles.LEADER_ZOOM?.trackingTC ?? TC_LEADER;
+    ...
+    this._minStateHoldByState = { OVERVIEW: ..., LEADER_ZOOM: ..., ... };
+    this._maxStateDurationByState = { OVERVIEW: ..., BATTLE_ZOOM: ..., ... };
+  } else {
+    // legacy flat-field path (alte Configs und bestehende Tests)
+    this._maxStateDuration    = config?.maxStateDuration    ?? MAX_STATE_DURATION;
+    this._battleMaxDurationMs = config?.battleMaxDurationMs ?? BATTLE_MAX_DURATION;
+    ...
+    this._minStateHoldByState = { alle vier States = this._minStateHoldMs };
+    this._maxStateDurationByState = { ... BATTLE_ZOOM = this._battleMaxDurationMs };
+  }
+  this._tcByState = { OVERVIEW: ..., LEADER_ZOOM: ..., ... };
+  this._lfOverview = tcToLerpFactor(this._tcOverview);
+  ...
```

**`update()` — dt-Parameter + per-state caps (A4):**
```diff
-  update(racers, ts, raceState, canvasW, canvasH) {
+  update(racers, ts, raceState, canvasW, canvasH, dt = 1000 / FRAME_RATE) {
     const stateCap = this._maxStateDurationByState[this.state] ?? this._maxStateDuration;
+    const minHold  = this._minStateHoldByState[this.state]     ?? this._minStateHoldMs;
-    if (stateAge >= Math.max(this._minStateHoldMs, stateCap) || ...) {
+    if (stateAge >= Math.max(minHold, stateCap) || ...) {
     ...
-    const lf = this._lerpFactorForState(this.state);
+    const lf60 = this._lerpFactorForState(this.state);
+    const lf   = 1 - Math.pow(1 - lf60, (dt * FRAME_RATE) / 1000);
```

**`_setTargets()` — Open Track: nur targetZoom, kein Pan (identisch mit master):**
```diff
   case CAM_STATE.LEADER_ZOOM: {
     this.targetZoom = this._leaderZoom;
-    const target = getPanTarget(...);
-    if (this._isOpenTrack) {
-      this._setOpenTrackPanTargets(target, ...);
-    } else {
-      this._setClosedTrackTargets(target, ...);
-    }
+    if (!this._isOpenTrack) {
+      const target = getPanTarget(...);
+      this._setClosedTrackTargets(target, ...);
+    }
```

**`currentTc` getter vereinfacht:**
```diff
-  get currentTc() {
-    switch (this.state) { case ...: return ...; default: return this._tcOverview; }
-  }
+  get currentTc() { return this._tcByState?.[this.state] ?? this._tcOverview; }
```

---

### 2d. `client/src/screens/RaceScreen/index.jsx` (geänderte Bereiche)

**A1 — Camera-Config-State + cameraConfigRef (A2 entfällt — Open-Track-Imports bleiben):**
```diff
+import { getPanTarget } from '../../modules/camera/panTarget.js';     // weiterhin benötigt
+import { resolveCamera } from '../../modules/camera/resolveCamera.js'; // weiterhin benötigt

-  const [showCameraStateHud] = useState(() => { const cfg = loadCameraConfig(); return cfg... });
-  const [showCameraDiagnostics] = useState(() => { const cfg = loadCameraConfig(); return cfg... });
+  const [cameraConfig, setCameraConfig] = useState(() => loadCameraConfig());
+  const cameraConfigRef = useRef(cameraConfig);
+  const showCameraStateHud    = cameraConfig.showCameraStateHud    ?? true;
+  const showCameraDiagnostics = cameraConfig.showCameraDiagnostics ?? false;
+
+  useEffect(() => {
+    cameraConfigRef.current = cameraConfig;
+    if (camDirRef.current) camDirRef.current.updateConfig(cameraConfig);
+  }, [cameraConfig]);
```

**A4 — dt übergeben:**
```diff
-  ? camDirRef.current.update(st.racers, ts, raceState, CANVAS_W, CANVAS_H)
+  ? camDirRef.current.update(st.racers, ts, raceState, CANVAS_W, CANVAS_H, dt)
```

**Open-Track-Pan — identisch mit master (A2 nicht gemacht):**
```diff
+  if (isOpenTrack) {
+    const effZoom = effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM);
+    const focusRacers = [...st.racers].sort((a,b)=>b.t-a.t).slice(0, FOCUS_GROUP_SIZE);
+    const target = getPanTarget(camDirRef.current.state, focusRacers, shapeRef.current);
+    const resolved = resolveCamera({ targetWorld: target, desiredEffZoom: effZoom,
+      worldBounds: { maxX: worldWidth, maxY: worldHeight },
+      frameSize: { width: CANVAS_W, height: CANVAS_H },
+      innerFramePct: cameraConfigRef.current.targetInnerFramePct ?? 0.7,
+      minEffZoom: effectiveZoom(camDirRef.current.overviewZoom, OPEN_TRACK_BASE_ZOOM) });
+    st.camX = isFinite(st.camX) ? st.camX + (resolved.camX - st.camX) * 0.05 : resolved.camX;
+    st.camY = isFinite(st.camY) ? st.camY + (resolved.camY - st.camY) * 0.05 : resolved.camY;
+  }
   // Open-Track render:
   ctx.translate(-(st.camX || 0) * effZoom, -(st.camY || 0) * effZoom);
```

Note: `innerFramePct` liest jetzt `cameraConfigRef.current` statt dem stale-closure `cameraConfig` — kleiner Bonus-Fix.

---

## 3. Neue Tests (+21)

### `cameraConfig.test.js`

**`describe('loadCameraConfig — v3→v4 migration: cameraStateProfiles built from legacy fields')`** (5 Tests)
- `LEADER_ZOOM.spritePct matches stored spritePctOfCanvas.leader` — sp.leader=0.11 → profiles
- `BATTLE_ZOOM.maxStateDuration picks up battleMaxDurationMs` — battleMaxDurationMs=9000 → BATTLE_ZOOM
- `OVERVIEW.trackingTC comes from cameraTransitionSeconds.overview` — tc.overview=2.5
- `minStateHold comes from global minStateHoldMs` — minStateHoldMs=7000 → alle States
- `missing legacy fields fall back to DEFAULT_CAMERA_CONFIG profile values`

**`describe('loadCameraConfig — v4 schema: deep-merge cameraStateProfiles')`** (2 Tests)
- `stored v4 cameraStateProfiles are merged with defaults (missing sub-keys get defaults)`
- `entryConvergenceZoom and entryConvergencePx are present`

### `CameraDirector.test.js`

**`describe('tcToLerpFactor (Phase 1 helper)')` — 4 Tests**
- tc=0.3s: 90%-Formel numerisch verifiziert
- tc=1.5s: kleiner als tc=0.3 (langsamer)
- tc=0.3: lf ∈ (0, 1)
- Größeres tc → kleineres lf

**`describe('CameraDirector — Phase 1: cameraStateProfiles config path')` — 7 Tests**
- `_leaderZoom` aus `profiles.LEADER_ZOOM.spritePct (0.09)`
- `_battleZoom` aus `profiles.BATTLE_ZOOM.spritePct (0.14)`
- `_tcLeader` aus `profiles.LEADER_ZOOM.trackingTC (0.25)`, `_lfLeader = tcToLerpFactor(0.25)`
- `_minStateHoldByState` per-State (BATTLE=5000, LEADER=5000)
- `_maxStateDurationByState` (BATTLE=7000, LEADER=4000)
- `updateConfig()` mit Profiles → `_leaderZoom` ändert sich sofort
- `updateConfig()` mit Profiles → `_tcBattle` und `_lfBattle` ändern sich sofort

**`describe('CameraDirector — Phase 1: dt-scaled lerp')` — 3 Tests**
- default dt (16.67ms): lf-Faktor = `_lfLeader` (rückgerechnet aus Zoom-Bewegung)
- 2× dt: größerer Schritt als 1× dt
- 2× halbes dt = 1× volles dt (Identität bis 6 Dezimalstellen)

---

## 4. A-Fixes — Wo umgesetzt

### A1 — Live-updateConfig() ✅
**Datei:** `client/src/screens/RaceScreen/index.jsx`

- `useState(() => loadCameraConfig())` + `useRef` auf Komponenten-Ebene
- `useEffect([cameraConfig]) → cameraConfigRef.current = cameraConfig; camDirRef.current.updateConfig(cameraConfig)`
- Race-start-Effekt liest `cameraConfigRef.current` statt erneutem `loadCameraConfig()`

### A2 — Open-Track-Pan ❌ Entfällt (siehe Abschnitt 0)
Open-Track-Pan bleibt in RaceScreen mit lf=0.05, identisch mit master.

### A3 — schemaVersion-Konsistenz ✅
**Datei:** `client/src/modules/cameraConfig.js`

- `saveCameraConfig()` schreibt `schemaVersion: 4` (vorher: 3)
- `loadCameraConfig()` guard: `!== 4` (vorher: `!== 3`)

### A4 — dt-Parameter ✅
**Datei:** `client/src/modules/camera/CameraDirector.js` + `RaceScreen/index.jsx`

- `update(..., dt = 1000 / FRAME_RATE)` — Standardwert erhält Backward-Compat für Tests
- `lf = 1 - Math.pow(1 - lf60, dt * FRAME_RATE / 1000)` — bei dt=16.67ms exakt = lf60
- RaceScreen übergibt `dt` als 6. Argument

---

## 5. Abweichungen von der Spec

### 5a. A2 gestrichen (Hauptabweichung)
Spec sah A2 in Phase 1 vor. Nach Browser-Test-Regression (Leader off-canvas auf open track) und Analyse der Root Cause (screen-space/zoom-Mismatch) entschieden, A2 auf spätere Phase zu verschieben. Architekturentscheidung: clean als eigene Phase angehen.

### 5b. `delete merged.cameraStateProfiles` (nicht in Spec)
Subtiler Bug: `{ ...DEFAULT_CAMERA_CONFIG, ...stored }` kopierte Default-`cameraStateProfiles` in `merged`, wodurch `migrateV3toV4()` early-returned ohne `buildProfilesFromLegacy()` aufzurufen. Fix: explizites Delete vor dem v2/v3-Migrations-Aufruf.

### 5c. dt-Formel Variante 1 gewählt
Spec bot zwei Optionen. Variante 1 (`1 - Math.pow(1-lf60, dt*60/1000)`) gewählt, weil bei dt=1000/60 exakt = lf60 → alle bestehenden Tests sehen identisches Verhalten.

### 5d. Flat-Properties beibehalten
`_maxStateDuration`, `_minStateHoldMs`, `_tcOverview`, `_lfOverview` etc. bleiben als Flat-Props für ~145 bestehende Tests, die direkt darauf zugreifen. `update()` verwendet ausschließlich die Maps.

### 5e. Open-Track-Pan: `cameraConfigRef.current` statt `cameraConfig` in Pan-Block
Kleiner Bonus-Fix: `innerFramePct` liest jetzt aus dem Ref statt der stale-closure-Variable. Funktional identisch zum master (da Config sich während der Animationsschleife nicht ändert), aber konsistent mit dem neuen Pattern.

---

## 6. Was bewusst NICHT gemacht wurde (Phase 1)

- **A2** (Open-Track-Pan in CameraDirector): entfällt, wird separat neu evaluiert
- **Phase 2** (entryTC / lerpPhase-Automat): ~~`entryTC` und `entryConvergenceZoom/Px` sind im Schema, werden nicht ausgewertet~~ → **Erledigt in Etappe 2**
- **Phase 3** (DevPanel): ~~`CameraZoomTuningSection.jsx` nicht angepasst; zeigt Legacy-Felder~~ → **Erledigt in Etappe 3**
- **Phase 4** (Lookahead): ~~`lookaheadDistance/Weight = 0` im Schema, keine Auswertung~~ → **Erledigt in Etappe 4**
- **`normalizeCameraTransitionSeconds()`**: bleibt in v2/v3-Migrations-Pfad, wird bei v4 nicht aufgerufen
- **Legacy-Lesepfad in CameraDirector**: bleibt für Backward-Compat der bestehenden Tests

---

## 7. Etappe 2 — entryTC / Lerp-Phase-Automat

**Commit:** `03af111` | 3 Dateien, 158 Insertions, 10 Deletions | Tests: 1674 passed

### Ziel
Glattere State-Übergänge durch separaten Lerp-Faktor beim State-Eintritt. Nach dem State-Wechsel startet die Kamera mit `entryTC` (langsam/glatt); sobald alle drei Dimensionen (zoom, offsetX, offsetY) konvergiert sind, schaltet sie auf `trackingTC` (schnell/klebend).

### Geänderte Dateien

#### `client/src/modules/camera/CameraDirector.js`

```diff
+    this._lerpPhase = 'entry';   // Konstruktor, nach _lastResolvedPanTarget
```

Profile-Pfad (`_computeTimingConfig`):
```diff
+      const profEntryTc = (key, fallback) => profiles[key]?.entryTC ?? fallback;
+      this._tcEntryOverview = profEntryTc('OVERVIEW', this._tcOverview);
+      this._tcEntryLeader   = profEntryTc('LEADER_ZOOM', this._tcLeader);
+      this._tcEntryBattle   = profEntryTc('BATTLE_ZOOM', this._tcBattle);
+      this._tcEntryComeback = profEntryTc('COMEBACK_ZOOM', this._tcComeback);
```

Legacy-Pfad:
```diff
+      // Legacy: entryTC = trackingTC (no distinction in old format)
+      this._tcEntryOverview = this._tcOverview;
+      this._tcEntryLeader   = this._tcLeader;
+      this._tcEntryBattle   = this._tcBattle;
+      this._tcEntryComeback = this._tcComeback;
```

Common-Sektion:
```diff
+    this._lfByState = {
+      [CAM_STATE.OVERVIEW]:      this._lfOverview,
+      [CAM_STATE.LEADER_ZOOM]:   this._lfLeader,
+      [CAM_STATE.BATTLE_ZOOM]:   this._lfBattle,
+      [CAM_STATE.COMEBACK_ZOOM]: this._lfComeback,
+    };
+    this._lfEntryOverview = tcToLerpFactor(this._tcEntryOverview);
+    this._lfEntryLeader   = tcToLerpFactor(this._tcEntryLeader);
+    this._lfEntryBattle   = tcToLerpFactor(this._tcEntryBattle);
+    this._lfEntryComeback = tcToLerpFactor(this._tcEntryComeback);
+    this._lfEntryByState = {
+      [CAM_STATE.OVERVIEW]:      this._lfEntryOverview,
+      [CAM_STATE.LEADER_ZOOM]:   this._lfEntryLeader,
+      [CAM_STATE.BATTLE_ZOOM]:   this._lfEntryBattle,
+      [CAM_STATE.COMEBACK_ZOOM]: this._lfEntryComeback,
+    };
+    this._entryConvergenceZoom = config?.entryConvergenceZoom ?? 0.05;
+    this._entryConvergencePx   = config?.entryConvergencePx   ?? 10;
```

`_lerpFactorForState()` (switch → map):
```diff
-    switch (state) {
-      case CAM_STATE.LEADER_ZOOM: return this._lfLeader;
-      case CAM_STATE.BATTLE_ZOOM: return this._lfBattle;
-      case CAM_STATE.COMEBACK_ZOOM: return this._lfComeback;
-      default: return this._lfOverview;
-    }
+    const map = this._lerpPhase === 'entry' ? this._lfEntryByState : this._lfByState;
+    return map[state] ?? this._lfOverview;
```

Konvergenz-Check in `update()` (nach den drei Lerp-Lines):
```diff
+    if (this._lerpPhase === 'entry') {
+      const zoomConverged = Math.abs(this.targetZoom    - this.zoom)    < this._entryConvergenceZoom;
+      const xConverged    = Math.abs(this.targetOffsetX - this.offsetX) < this._entryConvergencePx;
+      const yConverged    = Math.abs(this.targetOffsetY - this.offsetY) < this._entryConvergencePx;
+      if (zoomConverged && xConverged && yConverged) this._lerpPhase = 'tracking';
+    }
```

Reset in `_transition()`:
```diff
     this.state = nextState;
     this.stateEnteredAt = ts;
+    this._lerpPhase = 'entry';
```

Neuer Getter:
```diff
+  get lerpPhase() {
+    return this._lerpPhase;
+  }
```

#### `client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx`

```diff
+        lerpPhase: dir.lerpPhase ?? 'tracking',   // polling snapshot
```
```diff
+      <div>
+        phase:{' '}
+        <span style={{ color: lerpPhase === 'entry' ? '#ff6b35' : '#4cff91' }}>{lerpPhase}</span>
+      </div>
```

### Neue Tests (7)

`describe('CameraDirector — Phase 2: lerpPhase automat')`

1. `lerpPhase starts as entry on construct`
2. `lerpPhase resets to entry on state transition`
3. `lerpPhase switches to tracking when all three dimensions converge`
4. `lerpPhase stays in entry while one dimension is not converged`
5. `entry phase uses _lfEntryByState, tracking phase uses _lfByState`
6. `with entryTC == trackingTC, behavior is equivalent to phase 1 (no-op)`
7. `updateConfig() with new entryTC updates _lfEntry immediately`

### Verhalten mit Default-Config

`entryTC == trackingTC` für alle States → `_lfEntryByState[S] == _lfByState[S]` → kein sichtbarer Verhaltensunterschied zu Phase 1. Phase-Automat läuft, schaltet schnell auf 'tracking', aber Lerp-Wert ist identisch.

### Tuning-Hinweis für User-Test

Etappe 2 ist per Default verhaltens-äquivalent zu Phase 1. Um die Wirkung zu sehen:
```js
// Im Dev-Panel (F6 → Camera Behavior → Leader Zoom / Battle Zoom aufklappen):
BATTLE_ZOOM.entryTC = 1.5    // langsam reinkommen
BATTLE_ZOOM.trackingTC = 0.3  // dann schnell kleben
```

---

## 8. Etappe 3 — Dev-Panel auf cameraStateProfiles umstellen

**Commit:** `b402f0b` | 2 Dateien, 450 Insertions, 401 Deletions | Tests: 1672 passed

### Ziel
`CameraZoomTuningSection.jsx` vollständig auf `cameraStateProfiles` umgestellt. Alle
8 Profile-Felder pro State sind jetzt im Dev-Panel editierbar. Lookahead-Felder
(`lookaheadDistance`, `lookaheadWeight`) sind sichtbar und editierbar; Wirkung folgt in Etappe 4.

### Geänderte Dateien

**`client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx`**
- `StateProfileBlock`-Komponente mit `<details>/<summary>` Accordion (initial collapsed)
- 8 Felder je State-Block: spritePct, trackingTC, entryTC, lookaheadDistance, lookaheadWeight, innerFramePct, maxStateDuration, minStateHold
- "Reset state"-Button pro Block (`data-testid="reset-state-{STATENAME}"`)
- Neue Sektion "Entry Convergence": entryConvergenceZoom + entryConvergencePx
- Sektion "State Trigger Settings": battleGapThreshold, endgameThreshold, postStartHoldMs, battleCooldownMs, overviewCooldownMin/Max (unverändert)
- `battleMaxDurationMs` entfernt aus UI (Option c: bleibt in defaults.js für Migration)
- Entfernte Legacy-Controls: sprite size, transition TC, global maxStateDuration, global minStateHoldMs, targetInnerFramePct

**`client/src/screens/DevScreen/sections/CameraZoomTuningSection.test.jsx`**
- Mock auf v4-Schema (cameraStateProfiles) aktualisiert
- Tests für entfernte Labels gestrichen; neue Tests für State-Block-Summaries, Entry Convergence, per-state Reset-Buttons
- Total: 38 Tests (vorher 40, netto −2 durch Entfernung veralteter Label-Tests)

### Entscheidung 3.6 (battleMaxDurationMs)
Option c umgesetzt: Dev-Panel zeigt `battleMaxDurationMs` nicht mehr; `defaults.js` behält
es für den v3→v4-Migrations-Pfad; `handleReset()` setzt es nicht zurück. `CameraDirector`
liest es nicht direkt — BATTLE_ZOOM.maxStateDuration aus dem Profil gilt.

### User-Test (Etappe 3)
1. Race starten → F6 Dev-Panel → Camera Behavior
2. "Battle Zoom" aufklappen → entryTC auf 1.5s, trackingTC auf 0.3s
3. Race: beim BATTLE-Wechsel sieht HUD "phase: entry" → "phase: tracking"; Kamera kommt
   glatt rein, klebt dann schnell
4. "Reset state" für Battle Zoom: Werte gehen zurück auf Defaults
5. "Reset Camera Behavior": alle vier States + Convergence zurück auf Defaults

---

## 9. Etappe 4 — Lookahead (velocity-based pan lead)

**Commit:** `88fd298` | 3 Dateien, 261 Insertions, 9 Deletions | Tests: 1681 passed (+9)

### Ziel
Pan-Target wird in Fahrtrichtung des Focus-Racers vorverschoben: Die Kamera zeigt
wohin gefahren wird, nicht wo der Racer gerade ist. Stärke = `vx × lookaheadDistance × lookaheadWeight`
World-Pixel. Default (0/0) → kein Verhaltensunterschied zu Etappe 3.

### Pre-Implementation-Antworten (Klärungsfragen)

1. **Velocity-Quelle**: `r.angle` aus `EditorShape.getPosition()` — bereits jeden Frame in
   `computePositions()` berechnet. Keine extra Kosten. Kein `getTangentAt` nötig.
2. **BATTLE Velocity**: Vektor-Mittelwert von r0 und r1:
   `((cos(r0.angle)+cos(r1.angle))/2, (sin(r0.angle)+sin(r1.angle))/2)`.
3. **Performance**: Zero extra computation — `r.angle` schon auf jedem Racer.

### Geänderte Dateien

**`client/src/modules/camera/CameraDirector.js`**
- Constructor: `this._lastLookaheadDx = 0; this._lastLookaheadDy = 0;`
- `_computeTimingConfig()`: `this._lookaheadByState` pro State aus Profilen (legacy: alles 0)
- Neue Methode `_getLookaheadOffset(state, focusRacers)`:
  - LEADER: `cos/sin(r0.angle)`
  - BATTLE: Vektormittel r0+r1
  - COMEBACK: `cos/sin(r2.angle)` (index min(2, len-1))
  - OVERVIEW: immer `{dx:0, dy:0}`
- `_setTargets()`: für alle drei Zoom-States: `{x: base.x + la.dx, y: base.y + la.dy}` als Target
  (nur Closed Track — Open Track Pan liegt in RaceScreen)
- Getter `get lookaheadVec()` → `{dx, dy}` für HUD und Tests

**`client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx`**
- Neues Snapshot-Feld `lookaheadDx/Dy`, pollt `dir.lookaheadVec?.dx/dy`
- Neue HUD-Zeile "lookahead: (dx, dy) px", gelb wenn aktiv (≥0.5px), gedimmt wenn 0

**`client/src/modules/camera/CameraDirector.test.js`**
- 9 neue Phase 4 Tests: Default no-op, angle=0/PI/2, undefined angle, BATTLE Vektormittel,
  weight=0.5, OVERVIEW no-op, legacy config no-op, updateConfig() live-apply

### Tuning (Etappe 4 Verify)

Default-Werte sind 0/0 → kein sichtbarer Unterschied zu Etappe 3.

User-Tuning-Test:
1. F6 → Camera Behavior → "Leader Zoom" aufklappen
2. `lookaheadDistance = 200`, `lookaheadWeight = 1.0`
3. Race in LEADER_ZOOM: HUD zeigt "lookahead: (≠0, ≠0) px" (gelb), Camera führt den Racer an
4. Zu starkes Lookahead → Racer driftet vom Bildschirm weg → `weight` reduzieren
5. Empfohlener Startbereich: distance 50-150px, weight 0.3-0.7

---

## 10. Etappe 4b — Velocity-Betrag ergänzt (Option D)

**Commit:** `17a8ecc` | 3 Dateien, 62 Insertions, 15 Deletions | Tests: 1684 passed (+3)

### Ziel

Etappe 4 gab einen konstanten Pixel-Lead unabhängig von der tatsächlichen Fahrgeschwindigkeit.
Etappe 4b macht den Lookahead proportional zur Istgeschwindigkeit: schnelle Racers führen weiter,
gebremste/gestoppte Racers führen gar nicht.

### Entwurfsentscheidung: Option D (CC-Erweiterung zu Plan-Claudes A/B/C)

Plan-Claude hatte drei Optionen vorgeschlagen:
- **A** — Hardcoded `SPEED_NORMALIZER`-Konstante in CameraDirector
- **B** — Kein Normalizer, `r.vt` direkt × `lookaheadDistance` → hässliche UX (distance=50000)
- **C** — Velocity in Welt-Pixeln/Sekunde über Spline-Tangente (`shape.getTotalLength()`)

**Option D** (CC-Empfehlung, akzeptiert): Normalisierung an der Quelle in RaceScreen.

```js
// RaceScreen, nach dem t-Update jedes Racers:
r.vt = race_baseSpeed > 0 && !r.finished
  ? (r.baseSpeed * boost * brake + jitter) / race_baseSpeed
  : 0;
```

`r.vt ≈ 1.0` bei Normalgeschwindigkeit, `> 1.0` bei Boost, `< 1.0` bei Bremsen/Avoidance,
`0` bei finished Racers.

**Warum D besser ist als A/B/C:**
1. `lookaheadDistance` behält seine Pixel-Semantik bei Normalgeschwindigkeit — kein UI-Range-Bruch
2. Boost / Brake / Avoidance werden dynamisch reflektiert (echte Frame-Modifier statt Mittelwert)
3. Robust gegen streckende race_baseSpeed-Änderungen (schnelle vs. langsame Strecke:
   beide ergeben `vt ≈ 1.0` bei Normalpace)
4. Kein Tangenten-Abruf nötig (Option C hätte `shape.getTotalLength()` in CameraDirector gebracht)
5. Kein SPEED_NORMALIZER in CameraDirector — keine Magic Constants

**Guard `race_baseSpeed > 0`** verhindert Division-by-zero bei Pause/Race-Ende.

### Formel-Änderung in `_getLookaheadOffset()`

Vorher (Etappe 4):
```
dx = vx × lookaheadDistance × lookaheadWeight
```

Jetzt (Etappe 4b):
```
dx = vx × vtFactor × lookaheadDistance × lookaheadWeight
```

BATTLE: `vtFactor = (r0.vt + r1.vt) / n` — arithmetischer Mittelwert, konsistent mit
Richtungs-Vektormittel. Fehlender `vt` → `r?.vt ?? 0` → kein NaN, kein Crash.

### Geänderte Dateien

**`client/src/screens/RaceScreen/index.jsx`**
- Nach dem `if (!r.finished) { r.t += ... } else { runout }` Block:
  `r.vt = race_baseSpeed > 0 && !r.finished ? (r.baseSpeed * boost * brake + jitter) / race_baseSpeed : 0;`

**`client/src/modules/camera/CameraDirector.js`**
- `_getLookaheadOffset()`: `let vtFactor = 0;` vor switch, pro State gesetzt:
  - LEADER/COMEBACK: `r?.vt ?? 0`
  - BATTLE: `((r0?.vt ?? 0) + (r1?.vt ?? 0)) / n`
- Return: `dx: vx * vtFactor * la.distance * la.weight`

**`client/src/modules/camera/CameraDirector.test.js`**
- 4 bestehende Phase-4-Tests angepasst: explizites `vt` im Racer-Fixture, Erwartungswerte
  neu berechnet (verschiedene vt-Werte: `0.5`, `1.0` um Skalenbugs aufzudecken)
- 3 neue Tests:
  - `vt=2.0`: doppelter Lookahead-Vektor (`dx ≈ 400` statt 200)
  - `vt=0`: Null-Vektor trotz gültigem `angle`
  - `vt undefined`: graceful fallback zu `{dx:0, dy:0}`, kein Crash

### Tuning (Etappe 4b Verify)

Default-Werte (0/0) → kein Verhaltensunterschied zu Etappe 4.

User-Tuning-Test:
1. F6 → Battle Zoom → `lookaheadDistance=100`, `lookaheadWeight=0.5`
2. Race in BATTLE: HUD "lookahead" sollte jetzt deutlich größer sein als
   bei gleichen Etappe-4-Einstellungen (weil Velocity multipliziert)
3. Δ (Camera-Target-Distanz) sollte kleiner werden — Kamera führt mit dem Pulk
4. Reporting: wie groß ist `lookahead` im HUD? wie groß ist `Δ`?
5. Feinjustierung: weight runter wenn zu aggressiv, distance hoch wenn zu schwach

---

## Etappe 6 — Lead-In / Mitlaufen / Lead-Out (Phased Observer)

### Motivation

Etappe 4/4b (Lookahead) löste das Grundproblem nicht: Die Kamera folgte dem Racer nie exakt
(immer Δ > 0 durch den Lerp). Bei BATTLE_ZOOM ≥ 3.32× führte das zu sichtbarem Double-Image /
Aliasing auf dem Racetrack-Hintergrund.

Etappe 6 ersetzt Lookahead komplett durch ein **Drei-Phasen-System** mit `_camT` (eigene
Track-Position der Kamera) und exaktem Pin-Lock im Mitlaufen.

### Phasen

| Phase | Bedingung | Kameraverhalten |
|-------|-----------|----------------|
| **lead-in** | `dT ∈ [-dtLeadIn, 0)` | Kamera wartet bei `_camT`; Racer läuft heran |
| **follow** | `dT ≥ 0` und followedPx < followDuration | `_camT = focusT` jedes Frame; `offsetX = targetOffsetX` (kein Lerp-Lag) |
| **lead-out** | followedPx ≥ followDuration | Kamera hält; Racer läuft weiter |

`dT = focusT − _camT`, normalisiert auf `[−0.5, 0.5]` via `((dT % 1) + 1.5) % 1 − 0.5`.

`idle`: Racer ist weiter als `leadInDistance` hinter `_camT` — tritt nur bei anomal großer
Lead-In-Distanz oder direkt nach State-Wechsel auf (kein Sonderverhalten nötig, `_setTargets()`
pant zur `_camT`-Position).

### State-Initialisierung

Bei `_transition()` (Closed Track + Shape vorhanden):
```js
const leadInDt = prof.leadInDistance / shape.getTotalLength();
this._camT = focusT + leadInDt;  // Kamera startet leadInDistance vor Racer
this._observerPhase = 'idle';
this._followStartT = null;
```

`focusT` per State: LEADER → `r0.t`, BATTLE → `(r0.t + r1.t) / 2`, COMEBACK → `ordered[2].t`.
OVERVIEW → `_camT = null` (kein phased pan).

### _setTargets() — Pan-Target im lead-in und lead-out

Wenn `_camT !== null && shape` gesetzt:
```js
const panTarget = this._shape.getPosition(((this._camT % 1) + 1) % 1, 0);
this._setClosedTrackTargets(panTarget, stateEffZoom, frameSize, canvasH);
```
Damit lerpt die Kamera während Entry-Phase zur lead-in Position. Im follow/lead-out hält sie dort.

### _computePhasedPanTarget() — Follow Pin-Lock

Wird in `update()` nach dem Lerp-Schritt aufgerufen, nur wenn `_lerpPhase === 'tracking'`:
```js
// follow: keine Lerp-Lag mehr
this._camT = focusT;
const camPos = this._shape.getPosition(((this._camT % 1) + 1) % 1, 0);
const resolved = resolveCamera({ targetWorld: camPos, ... });
this.offsetX = this.targetOffsetX = -resolved.camX * resolved.effectiveZoom;
this.offsetY = this.targetOffsetY = closedOffsetY(camPos.y, ...);
```

`lead-out` ist sticky bis zum nächsten `_transition()`.

### Default-Werte

| State | leadInDistance | followDuration | leadOutDistance |
|-------|----------------|----------------|-----------------|
| OVERVIEW | 0 | 0 | 0 |
| LEADER_ZOOM | 200 | 1500 | 200 |
| BATTLE_ZOOM | 100 | 2000 | 100 |
| COMEBACK_ZOOM | 200 | 1500 | 200 |

### Geänderte Dateien

**`client/src/modules/storage/defaults.js`**
- `lookaheadDistance` / `lookaheadWeight` → entfernt
- `leadInDistance` / `followDuration` / `leadOutDistance` hinzugefügt (px-basiert)

**`client/src/modules/camera/CameraDirector.js`**
- `_getLookaheadOffset()` → gelöscht
- `_lookaheadByState` → ersetzt durch `_phasedByState`
- Constructor: `_camT = null`, `_observerPhase = 'idle'`, `_followStartT = null`, `_lastFocusT = 0`
- `_transition()`: `_camT`-Initialisierung + Observer-Reset am Ende
- `_setTargets()`: verwendet `_camT`-Weltposition als Pan-Target (wenn gesetzt)
- `_computePhasedPanTarget()`: neue Methode — Phasen-Logik + Follow-Pin-Lock
- `update()`: ruft `_computePhasedPanTarget()` nach Lerp-Schritt auf
- Getter: `lookaheadVec` → ersetzt durch `camT`, `observerPhase`, `lastFocusT`

**`client/src/screens/RaceScreen/CameraDiagnosticsHUD.jsx`**
- Lookahead-Zeile → ersetzt durch `obs: <phase> | camT: X.XXX | focusT: X.XXX`
- Farbe: `follow` = grün, `lead-in` = gelb, sonst gedimmt

**`client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx`**
- `lookaheadDistance` / `lookaheadWeight` Felder → ersetzt durch `leadInDistance` / `followDuration` / `leadOutDistance` (min 0, max 2000, step 50)

**`client/src/modules/camera/CameraDirector.test.js`**
- Phase-4-Lookahead-Suite (11 Tests) → gelöscht
- Etappe-6-Suite (18 Tests) hinzugefügt: `_camT`-Init, Phasenübergänge, Pin-Lock,
  lead-out sticky, Wraparound, `updateConfig()`, OVERVIEW no-op

### Technische Invarianten

- Open Tracks: **nicht betroffen** (phased pan nur auf Closed Tracks mit Shape)
- `_lerpPhase` Automat: **unverändert** (Entry → Tracking Konvergenzcheck bleibt)
- `r.vt` in RaceScreen: **bleibt** (für zukünftige Erweiterungen)
- Schema v4: **kein Bump** — Deep-Merge in `cameraConfig.js` lädt neue Felder aus Defaults;
  alte `lookaheadDistance/Weight` in localStorage werden stillschweigend ignoriert

### Tuning-Anleitung (Etappe 6)

1. F6 → per-State-Accordion öffnen (z.B. Leader Zoom)
2. `Lead-in distance`: wie weit (px) die Kamera vor dem Racer startet (0 = sofort follow)
3. `Follow duration`: wie weit (px) die Kamera mit dem Racer mitläuft (0 = kein Mitlaufen)
4. `Lead-out distance`: wie weit (px) der Racer nach Mitlaufen vorausläuft (0 = sofort free)
5. HUD-Diagnose: `obs: follow` (grün) = Pin-Lock aktiv, Δ sollte ≈ 0 sein
6. Empfohlener Test-State: BATTLE_ZOOM (leadIn=100, follow=2000, leadOut=100) — bei hohem
   Zoom-Faktor ist das Double-Image am deutlichsten sichtbar (vorher vs. nachher)
