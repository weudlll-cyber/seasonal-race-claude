# Camera System Inventory — 2026-05-14

> Read-only analysis on branch `master` (commit `5088639`). No code changes.

---

## 1. Kamera-Architektur

### Beteiligte Dateien

| Datei | Zeilen | Zweck |
|-------|--------|-------|
| `client/src/modules/camera/CameraDirector.js` | ~1100 | Haupt-State-Machine (TV-Kamera) |
| `client/src/modules/camera/resolveCamera.js` | 118 | Pan+Zoom-Resolver (pure function) |
| `client/src/modules/camera/openTrackCamera.js` | 22 | Open-Track-Zoom-Utilities |
| `client/src/modules/camera/panTarget.js` | 75 | Pan-Target-Identifikation |
| `client/src/modules/cameraConfig.js` | 210 | Config-Storage & Migration |
| `client/src/screens/RaceScreen/index.jsx` | ~1400 | Canvas-Integration & Render-Pipeline |
| `client/src/screens/DevScreen/sections/CameraZoomTuningSection.jsx` | 519 | DevPanel-UI für Kamera-Tuning |
| `client/src/screens/DevScreen/sections/CameraStateHudSection.jsx` | 89 | DevPanel-HUD-Toggles |
| `client/src/components/CameraStateHUD.jsx` | 98 | Laufzeit-HUD (State-Anzeige) |
| `client/src/components/CameraDiagnosticsHUD.jsx` | 420 | Laufzeit-Diagnostics-Overlay |

### Kernfunktionen & Module

**`CameraDirector` (Klasse, Haupt-State-Machine):**

- `constructor(worldW, worldH, isOpenTrack, config, referenceSpriteSize, shape)` — Zeile 87
- `update(racers, ts, raceState, canvasW, canvasH, dt)` — Haupt-Frame-Update, Zeile 389
- `updateConfig(config)` — Live-Config-Reload, Zeile 155
- `_transition(racers, ts, raceState)` — State-Machine-Logik, Zeile 517
- `_setTargets(racers, canvasW, canvasH, raceState)` — Pan/Zoom-Ziele berechnen, Zeile 764
- `_computeZoomLevels(config)` — Zoom aus Sprite-Größen ableiten, Zeile 209
- `_computeTimingConfig(config)` — Timing-Parameter laden, Zeile 242
- `_isPulk(racers)` — Engstand-Erkennung, Zeile 699
- `_focusRacers(racers)` — Top-N nach Position, Zeile 687
- `_computePhasedPanTarget(...)` — Lead-in/Follow/Lead-out-Observer, Zeile 864
- `_setClosedTrackTargets(...)` — Closed-Track Pan+Zoom, Zeile 738
- `_closedOffsetY(...)` — Y-Achsen-Offset für nicht-quadratische Welten, Zeile 718

**Hilfsfunktionen (separate Module):**

- `resolveCamera()` — Adaptiver Pan/Zoom-Resolver (`resolveCamera.js:53`)
- `getPanTarget()` — Pan-Target nach State (`panTarget.js:29`)
- `effectiveZoom()` — Director-Zoom + Base-Zoom kombinieren (`openTrackCamera.js:19`)
- `tcToLerpFactor()` — Time-Constant → Per-Frame-Lerp-Faktor (`CameraDirector.js:60`)

### Öffentlicher State (für externe Consumer)

```javascript
this.state          // CAM_STATE-Enum-Wert
this.zoom           // Aktueller Zoom (lerpt zu targetZoom)
this.offsetX/Y      // Aktueller Pan-Offset (Closed Tracks)
this.targetZoom     // Ziel-Zoom nach Transition
this.targetOffsetX/Y
this.overviewZoom   // Adaptiver Overview-Zoom (Welt-Fit)
```

### Render-Pipeline-Integration (`RaceScreen/index.jsx`)

**Closed Tracks** (Zeilen 1157–1177):
```javascript
const cam = camDirRef.current.update(st.racers, ts, raceState, CANVAS_W, CANVAS_H, dt);
ctx.save();
ctx.translate(cam.offsetX, cam.offsetY);        // Pan in Screen Space
ctx.scale(cam.zoom * bsX, cam.zoom * bsY);      // Zoom (bsX/bsY skalieren Weltkoordinaten)
// … Welt zeichnen …
ctx.restore();
```
Effektiver Zoom: `cam.zoom × bsX` (wobei `bsX = CANVAS_W / worldWidth`)

**Open Tracks** (Zeilen 1136–1156):
```javascript
const effZoom = effectiveZoom(cam.zoom, OPEN_TRACK_BASE_ZOOM);  // 1.5 × cam.zoom
ctx.save();
ctx.translate(-(st.camX || 0) * effZoom, -(st.camY || 0) * effZoom);
ctx.scale(effZoom, effZoom);
ctx.restore();
```
Effektiver Zoom: `OPEN_TRACK_BASE_ZOOM (1.5) × cam.zoom`

---

## 2. Kamera-Phasen

### Rennverlauf-Phasen (RaceScreen-Ebene)

```javascript
// RaceScreen/index.jsx, Zeile 99
const PHASE = { COUNTDOWN: 0, RACING: 1, FINISHED: 2 };
```

| Phase | Dauer | Kamera-Verhalten |
|-------|-------|-----------------|
| `COUNTDOWN` | 0–4000 ms fest | CameraDirector inaktiv; Racer an Startposition |
| `RACING` | 4000 ms – Rennende | CameraDirector aktiv (State Machine) |
| `FINISHED` | ~2000 ms nach Zieleinlauf | CameraDirector inaktiv; Fade zu Results |

### Kamera-States (CameraDirector-Ebene)

```javascript
// CameraDirector.js, Zeilen 14–19
export const CAM_STATE = {
  OVERVIEW:       'OVERVIEW',
  LEADER_ZOOM:    'LEADER_ZOOM',
  BATTLE_ZOOM:    'BATTLE_ZOOM',
  COMEBACK_ZOOM:  'COMEBACK_ZOOM',
};
```

### Phasen-Übergänge: Trigger-Bedingungen

| Übergang | Bedingung | Code-Zeile |
|---------|-----------|------------|
| → `OVERVIEW` (Start-Forced) | `raceElapsed < 3000 ms` | Zeile 557 |
| → `LEADER_ZOOM` (Post-Start) | `raceElapsed ∈ [3000, 10000]` ms (postStartHoldMs) | Zeile 563 |
| → `BATTLE_ZOOM` | ≥3 Top-10-Racer innerhalb 200 px + off cooldown | Zeile 577 |
| → `COMEBACK_ZOOM` | Gap(1→Last) > 30 % + Gap(1→2) ≥ 10 % + kein Pulk | Zeile 583 |
| → `LEADER_ZOOM` (Endgame) | Leader-Progress > `endgameThreshold = 0.85` | Zeile 568 |
| → `OVERVIEW` (Periodisch) | Cooldown abgelaufen (15–25 s jittered) | Zeile 575 |
| → `LEADER_ZOOM` (Default) | Keine andere Bedingung zutrifft | Zeile 587 |

### Übergänge: Animation vs. Hard Cut

- **State-Wechsel selbst**: Hard Cut (kein Blend; neuer Ziel-Zoom/Pan wird sofort gesetzt, Zeile 603)
- **Zoom/Pan-Angleich**: Smooth Lerp mit per-State-Time-Constant
- **Entry-Phase** (langsamer TC, z.B. 0.8 s) → **Tracking-Phase** (schneller TC, z.B. 0.25 s)
- Konvergenz-Gates (Zeilen 469–476): Wechsel zu Tracking wenn `Δzoom < 0.05` **und** `Δpan < 10 px`

---

## 3. Pro Phase im Detail

### OVERVIEW

| Parameter | Wert |
|-----------|------|
| **Zoom-Faktor** | Closed: `1.0` (Zeile 779) / Open: `CANVAS_W / worldW` (adaptiv) |
| **Sichtfeld** | Gesamtes Feld (Closed: ganzer Track bei `zoom=1`; Open: gesamte Weltbreite) |
| **Folge-Verhalten X** | Schwerpunkt der fokussierten Racer (Top-3) |
| **Folge-Verhalten Y** | `_closedOffsetY()` mit Welt-Skalierung (Closed) / `resolveCamera()` (Open) |
| **Entry TC** | 1.5 s (Zeile 134) |
| **Tracking TC** | 1.5 s (Zeile 133) |
| **Lerp-Faktor** | `tcToLerpFactor(1.5)` ≈ 0.331 pro Frame bei 60 fps |
| **Phased Observer** | Kein Lead-in / Lead-out (Dauer = 0) |
| **Lead-in Dauer** | 0.0 s |
| **Lead-out Dauer** | 0.0 s |

Sichtbarer Welt-Bereich: `CANVAS_W / effectiveZoom` × `CANVAS_H / effectiveZoom` Welt-Pixel.

---

### LEADER_ZOOM

| Parameter | Wert |
|-----------|------|
| **Zoom-Faktor** | Invers aus `spritePct = 0.09` (9 % von `CANVAS_H_REF = 720`) → Zielgröße 64.8 px; `zoom = 64.8 / (refSprite × scale)` |
| **Clamp** | `[minZoom, MAX_INVERSE_ZOOM = 5.0]` |
| **Sichtfeld** | Führender Racer zentriert |
| **Folge-Verhalten X** | Position des Führenden (exakt, Zeile 804) |
| **Folge-Verhalten Y** | `_closedOffsetY()` (Closed) / Standard-Offset (Open) |
| **Entry TC** | 0.8 s (Zeile 144) → Lerp ≈ 0.594/Frame |
| **Tracking TC** | 0.25 s (Zeile 143) → Lerp ≈ 0.917/Frame (sehr sticky) |
| **Phased Observer** | Lead-in: 1.0 s voraus / Follow: pinned / Lead-out: 1.5 s EMA-Decel |
| **Lead-in Dauer** | 1.0 s (Zeile 145) |
| **Lead-out Dauer** | 1.5 s (Zeile 146) |

---

### BATTLE_ZOOM

| Parameter | Wert |
|-----------|------|
| **Zoom-Faktor** | Invers aus `spritePct = 0.14` (14 %) → Zielgröße 100.8 px |
| **Clamp** | `[minZoom, 5.0]` |
| **Sichtfeld** | Mittelpunkt zwischen 1. und 2. Platz |
| **Folge-Verhalten X** | Midpoint (Euclidean oder Arc-Length-Interpolation auf Kurven, `panTarget.js:48`) |
| **Folge-Verhalten Y** | Analog LEADER_ZOOM |
| **Entry TC** | 0.8 s (Zeile 154) |
| **Tracking TC** | 0.25 s (Zeile 153) |
| **Phased Observer** | Lead-in: 0.5 s / Follow: pinned / Lead-out: 1.0 s |
| **Min-Hold** | 3000 ms (bleibt aktiv auch wenn Pulk sich auflöst) |
| **Max-Duration** | 6000 ms (Hard Cap, Zeile 282) |
| **Cooldown nach Exit** | 8000 ms (Zeile 535) |

---

### COMEBACK_ZOOM

| Parameter | Wert |
|-----------|------|
| **Zoom-Faktor** | Invers aus `spritePct = 0.07` (7 %) → Zielgröße 50.4 px |
| **Clamp** | `[minZoom, 5.0]` |
| **Sichtfeld** | 3. Platz (Underdog / letzter in Fokus-Gruppe) |
| **Folge-Verhalten X** | Position von `racers[2]` bzw. `racers[last]` (`panTarget.js:61`) |
| **Entry TC** | 0.8 s (Zeile 164) |
| **Tracking TC** | 0.25 s (Zeile 163) |
| **Phased Observer** | Lead-in: 1.0 s / Follow: pinned / Lead-out: 1.5 s |

---

## 4. DevScreen-Werte für Kamera

### Per-State-Profile (`CameraZoomTuningSection.jsx`)

Für jeden State (OVERVIEW, LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM):

| Feld | Typ | Default (je State) | Min | Max | Step | Zweck |
|------|-----|--------------------|-----|-----|------|-------|
| `spritePct` | float | OVERVIEW: 0.05 / LEADER: 0.09 / BATTLE: 0.14 / COMEBACK: 0.07 | 0.01 | 0.3 | 0.005 | Sprite-Zielhöhe als % Canvas-Höhe; treibt inversen Zoom |
| `trackingTC` | float | OVERVIEW: 1.5 / alle anderen: 0.25 | 0.05 | 5 | 0.05 | Lerp-Zeitkonstante im stabilen Tracking |
| `entryTC` | float | OVERVIEW: 1.5 / alle anderen: 0.8 | 0.05 | 5 | 0.05 | Langsamerer Lerp beim State-Eintritt bis Konvergenz |
| `leadInDuration` | float | OVERVIEW: 0.0 / LEADER: 1.0 / BATTLE: 0.5 / COMEBACK: 1.0 | 0 | 5 | 0.1 | Sekunden Kamera zeigt Strecke voraus bevor Follow |
| `leadOutDuration` | float | OVERVIEW: 0.0 / LEADER: 1.5 / BATTLE: 1.0 / COMEBACK: 1.5 | 0 | 5 | 0.1 | Sekunden EMA-Deceleration vor State-Ende |
| `innerFramePct` | float | 0.7 | 0.3 | 1 | 0.05 | Fraktion Canvas-Achse für Inner-Frame-Grenze |
| `maxStateDuration` | int (ms) | OVERVIEW: 4000 / alle anderen: 8000 | 1000 | 15000 | 500 | Hard Cap in diesem State |
| `minStateHold` | int (ms) | 5000 | 1000 | 10000 | 500 | Mindestzeit im State vor Switch |

### Globale Trigger-Einstellungen

| Feld | Default | Min | Max | Step | Zweck |
|------|---------|-----|-----|------|-------|
| `battlePulkThresholdPx` | 200 | 20 | 500 | 10 | Welt-Pixel-Radius für Pulk-Erkennung |
| `battleMinDurationMs` | 3000 | 500 | 10000 | 500 | Min-Verweildauer BATTLE nach Eintritt |
| `endgameThreshold` | 0.85 | 0.5 | 1.0 | 0.05 | Leader-Progress-Fraktion für Endgame-Lock |
| `postStartHoldMs` | 7000 | 0 | 15000 | 500 | LEADER-Zwang nach 3 s Start-Phase |
| `battleCooldownMs` | 8000 | 0 | 20000 | 500 | Mindestpause zwischen zwei BATTLE-States |
| `overviewCooldownMin` | 15000 | 5000 | 60000 | 1000 | Min-Intervall periodische OVERVIEW |
| `overviewCooldownMax` | 25000 | 5000 | 60000 | 1000 | Max-Intervall (jittered) |

### Konvergenz-Einstellungen

| Feld | Default | Min | Max | Step | Zweck |
|------|---------|-----|-----|------|-------|
| `entryConvergenceZoom` | 0.05 | 0.001 | 0.5 | 0.005 | Entry→Tracking wenn `Δzoom < dieser Wert` |
| `entryConvergencePx` | 10 | 1 | 100 | 1 | Entry→Tracking wenn `Δpan < dieser Wert` (px, je Achse) |

### HUD-Toggles (`CameraStateHudSection.jsx`)

| Toggle | Default | Zweck |
|--------|---------|-------|
| `showCameraStateHud` | `true` | Kleines State-Overlay (oben links) |
| `showCameraDiagnostics` | `false` | Diagnostics-Overlay + Console-Logging |

Diagnostics-Ausgabe enthält: live `cam.zoom`, berechnete Sprite-Pixelgröße, aktueller State + TC, jede State-Transition mit Reason/gap01/leaderProgress.

### Legacy-Felder (Schema vorhanden, nicht mehr gelesen)

| Feld | Ersetzt durch | Notiz |
|------|---------------|-------|
| `spritePctOfCanvas` | Per-State `spritePct` in Profilen | v3-Migration, `cameraConfig.js:194` |
| `cameraTransitionSeconds` | Per-State `trackingTC` / `entryTC` | v3-Migration, `cameraConfig.js:203` |
| `battleMaxDurationMs` (global) | Per-State `maxStateDuration` | In Profile verschoben |
| `minStateHoldMs` (global) | Per-State `minStateHold` | In Profile verschoben |
| `battleGapThreshold` | `battlePulkThresholdPx` | Weltpixel statt Arc-Length-Fraktion |

---

## 5. Bekannte Zoom-Faktoren

### Hart Kodierte Konstanten

| Konstante | Wert | Datei / Zeile | Zweck |
|-----------|------|---------------|-------|
| `OPEN_TRACK_BASE_ZOOM` | `1.5` | `CameraDirector.js:23`, `openTrackCamera.js:11` | Basis-Zoom-Multiplikator für Open Tracks |
| `MAX_INVERSE_ZOOM` | `5.0` | `CameraDirector.js:43` | Clamp-Obergrenze für inversen Zoom |
| `CANVAS_W` | `1280` | `CameraDirector.js:44` | Referenz-Canvas-Breite |
| `CANVAS_H_REF` | `720` | `CameraDirector.js:45` | Referenz-Canvas-Höhe |
| `FALLBACK_REFERENCE_SPRITE_SIZE` | `36` | `CameraDirector.js:47` | Fallback wenn kein Sprite-Size übergeben |
| `LEAD_OUT_DECAY` | `0.05` | `CameraDirector.js:50` | EMA-Decay-Faktor pro 60-fps-Frame im Lead-out |
| `ZOOM_STEP` | `0.9` | `resolveCamera.js:20` | Zoom-Reduktion pro Step im Resolver (10 %) |
| Open-Track Cam Lerp | `0.05` | `RaceScreen/index.jsx:1132` | Per-Frame-Lerp für `st.camX/camY` (Open Track, nicht über Config steuerbar) |

### Berechnete Zoom-Werte (nicht hart kodiert)

**Overview-Zoom** (adaptiv per Track):
```
overviewZoom = CANVAS_W / worldW
Beispiele:
  1280 px Weltbreite → 1.0×
  1600 px             → 0.8×
   960 px             → 1.33×
```

**Leader/Battle/Comeback-Zoom** (invertiert aus Sprite-Zielgröße):
```
targetSizePx = spritePct × CANVAS_H_REF
zoom = targetSizePx / (refSpriteSize × scale)
Skaliert mit Racer-Typ-displaySize und Track-Breite.
```

### Letzte ~20 Commits mit Kamera-Bezug

| Commit | Datum | Änderung |
|--------|-------|----------|
| `cf77972` | 2026-05-12 | Doku-Update; keine Zoom-Änderung |
| `68ef032` | 2026-05-08 | Schema v5: Lead-in/out von Pixel auf Zeit-basiert; `leadInDistance`/`followDuration`/`leadOutDistance` → `leadInDuration`/`leadOutDuration`; keine Zoom-Werte geändert |
| `fc7ed46` | 2026-04-30 | `_display*`-Workaround-Felder entfernt (Render-Optimierung); kein Zoom |
| `0e92670` | 2026-04-29 | Lead-out: EMA statt Hard Stop; kein Zoom |
| `395e8d0` | 2026-04-28 | Diagnostics-Felder hinzugefügt (Δv, follow%, Pixel-Snap-Check); kein Zoom |
| `ca419ed` | 2026-04-23 | Phase-1-Foundation: Lead-in/Follow/Lead-out, zeitbasiert; kein Zoom |
| `a36f138` | 2026-04-20 | EditorShape-Interpolation für BATTLE-Midpoint auf Kurven-Tracks; kein Zoom |
| `5bf3f24` | 2026-04-18 | Pan-Target-Reform (3-Layer-Pipeline); kein Zoom |
| `8eb16e0` | 2026-04-16 | Pacing-Tunables, Plan-B-Pan; kein harter Zoom-Wert geändert |
| `769fc05` | 2026-04-10 | OVERVIEW-Zoom respektiert Track-Typ; `overviewZoom`-Formel etabliert |
| `750d826` | 2026-02-17 | Feature D7a: Proportionale Sprite-Skalierung; Inverse-Zoom-Architektur eingeführt |
| `7cdde15` | 2026-02-04 | Feature "adaptive zoom": Basis-Foundation für per-Track `overviewZoom` |

**Größte Zoom-relevante Änderungen:**
- **`750d826`** (Feb 2026): Inverse-Zoom-Architektur (sprite-size-getrieben) eingeführt — vorher waren Zoom-Werte direkt konfiguriert.
- **`68ef032`** (Mai 2026): Schema-Migration v4→v5 — Phasing-Zeiten geändert, Zoom-Werte selbst unverändert.

---

## 6. Offene Fragestellungen

### Magic Numbers ohne Erklärung

| Magic Number | Ort | Kontext |
|---|---|---|
| `0.05` | `resolveCamera.js:20` als `ZOOM_STEP = 0.9^(1/step)` | 10 % Zoom-Reduktion pro Resolver-Step; kein Kommentar warum 10 % |
| `0.05` | `RaceScreen/index.jsx:1132` | Open-Track-Pan-Lerp; hardcoded, nicht über Config steuerbar |
| `0.05` | `CameraDirector.js:50` als `LEAD_OUT_DECAY` | EMA-Decay für Lead-out-Phase; kein Kommentar |
| `10` | `entryConvergencePx` Default | Pixel-Threshold für Entry→Tracking; zoomabhängig, aber Wert ist absolut |

### Inhärente Inkonsistenzen

**1. Open-Track-Pan-Smoothing ist von Config abgekoppelt**
- Closed Tracks: Lerp-Faktor aus `trackingTC` (konfigurierbar über DevPanel)
- Open Tracks: Festes `0.05` per Frame in `RaceScreen/index.jsx:1132`, ignoriert `dt`, ignoriert Config
- Folge: Gleiche TC-Einstellungen wirken auf Open Tracks anders als auf Closed Tracks

**2. Pulk-Erkennung nutzt Top-10, Kamera fokussiert Top-3**
- `_isPulk()` prüft Racers 1–10 (Zeile 701)
- `_focusRacers()` gibt nur Top-3 zurück (Zeile 688)
- Ein Pulk bei Racern 4–6 triggert BATTLE_ZOOM, aber die Kamera schaut auf Racer 1–2

**3. `innerFramePct` existiert per-State in Schema, wird aber global gesetzt**
- `defaults.js:137`: `innerFramePct` ist per-State-Profilfeld
- `CameraDirector.js:234`: `this._innerFramePct` wird einmalig global gesetzt (nicht per-State gelesen)
- Per-State-Konfiguration ist Dead Code

**4. Lead-out-Decay nicht per-State konfigurierbar**
- `leadOutDuration` ist per-State einstellbar (funktioniert)
- `LEAD_OUT_DECAY = 0.05` (Smoothness der Deceleration) ist hardcoded — kein DevPanel-Feld
- Kann nicht ohne Code-Änderung angepasst werden

**5. Sprite-Größen-Fallback ist nicht in Diagnostics sichtbar**
- Wenn `referenceSpriteSize ≤ 0`: Fallback auf `36px` + Console-Warn (Zeile 210)
- DevPanel-Diagnostics zeigen die berechnete Sprite-Größe, aber nicht ob Fallback aktiv ist
- Falsche Zoom-Kalibrierung kann unbemerkt auftreten

**6. Keine Absicherung gegen nicht-monotone `raceElapsed`-Werte**
- `raceElapsed = ts - st.raceStart` (keine Guards)
- Timing-Gates (Start-Phase, Post-Start-Hold) würden bei negativem oder springendem Wert brechen

**7. Arc-Length-Interpolation in `panTarget.js` undokumentiert**
- `shape.getPosition(tMid, 0)` für BATTLE-Midpoint auf Kurven-Tracks (Zeile 48)
- Parameter-Semantik von `t` nicht erklärt (0–1, zyklisch, linear?)
- Verhalten bei Open-Track-Shapes vs. Closed-Track-Shapes nicht kommentiert

**8. Config-Reload snapped Zoom nicht**
- `updateConfig()` ruft `_computeZoomLevels()` auf (Zeile 155)
- Neuer Ziel-Zoom wird gesetzt, aber `this.zoom` bleibt am alten Wert
- Kamera lerpt von altem Wert zum neuen — bei großen Wert-Änderungen sichtbarer "Slide"
