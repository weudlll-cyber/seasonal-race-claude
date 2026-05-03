# PR-A2 Diagnose — Speed-Pipeline-Refactor-Analyse

**Branch:** `docs/pr-a2-diagnose`
**Stand:** 2026-05-03
**Kontext:** PR-A1 gemerged (master `ba7dd7f`). Q-25 behoben (maxScale=10). Architectural Gap bleibt: `openTrackFinishT` invertiert `speedScaleFactor` nicht → Open-Track-Duration-Slider hat auf langen Strecken keine Wirkung.

---

## Sektion 1 — Ist-Zustand der Speed-Pipeline

### 1.1 Beteiligte Dateien und Funktionen

| File | Funktion | Rolle |
|------|----------|-------|
| `client/src/modules/speedScale.js:23` | `computeSpeedScaleFactor(pathLengthPx, config)` | Berechnet Divisor = clamp(pathLengthPx / referencePathLength, minScale, maxScale) |
| `client/src/modules/speedScale.js:29` | `loadSpeedScaleConfig()` | Lädt `racearena:speedScaleConfig` aus localStorage |
| `client/src/modules/camera/lapUtils.js:46` | `openTrackFinishT(targetSeconds, speedMultiplier, baseSpeedMax)` | Berechnet finishT für Open-Tracks — **enthält den Architectural Gap** |
| `client/src/modules/camera/lapUtils.js:56` | `openTrackDurationRange(pathLengthPx, ...)` | Slider-Range Min/Max für SetupScreen — korrekt implementiert |
| `client/src/modules/camera/lapUtils.js:21` | `lapsFromDuration(seconds)` | Closed-Track: 1–4 Runden aus Duration-Wert |
| `client/src/modules/camera/lapUtils.js:39` | `estimatedSecondsPerLap(speedMultiplier, baseSpeedMean)` | Estimated-Duration für Closed-Track-Anzeige |
| `client/src/modules/baseSpeedConfig.js:18` | `loadBaseSpeedConfig()` | Lädt `racearena:baseSpeedConfig` — min/max Spread-Range |
| `client/src/modules/storage/defaults.js:112` | `DEFAULT_SPEED_SCALE_CONFIG` | { enabled, referencePathLength: 2000, minScale: 0.5, maxScale: 10.0 } |
| `client/src/modules/storage/defaults.js:121` | `DEFAULT_BASE_SPEED_CONFIG` | { min: 0.00091, max: 0.00118 } — ±12.9% Spread |
| `client/src/screens/RaceScreen/index.jsx:182` | Race-Init Speed-Block | speedScaleFactor, baseSpeedConfig, finishT-Berechnung |
| `client/src/screens/RaceScreen/index.jsx:286` | Per-Racer baseSpeed | `(random[MIN,MAX] * speedMultiplier / speedScaleFactor) * (1 + bonus)` |
| `client/src/screens/RaceScreen/index.jsx:718` | rAF-Loop t-Inkrement | `r.t += (r.baseSpeed * boost * brake + jitter) * (dt / 16)` |
| `client/src/screens/SetupScreen/SetupScreen.jsx:206` | `openTrackSliderRange` | useMemo: ruft `openTrackDurationRange` auf |
| `client/src/screens/DevScreen/sections/SpeedScaleSection.jsx:37` | Formula-Preview | UI-Visualisierung des computeSpeedScaleFactor-Werts |
| `client/src/screens/DevScreen/sections/BaseSpeedSection.jsx` | Spread-Preview | Min/Max-Tuning der baseSpeed-Range |

### 1.2 Konstanten

| Konstante | Wert | Quelle |
|-----------|------|--------|
| `REFERENCE_FPS` | 62.5 | `lapUtils.js:18` (1000ms / 16ms) |
| `baseSpeedMin` | 0.00091 | `defaults.js:121` |
| `baseSpeedMax` | 0.00118 | `defaults.js:121` |
| `baseSpeedMean` | 0.001045 | `(min + max) / 2` in `lapUtils.js:16` |
| `referencePathLength` | 2000 px | `DEFAULT_SPEED_SCALE_CONFIG` |
| `minScale` | 0.5 | `DEFAULT_SPEED_SCALE_CONFIG` |
| `maxScale` | 10.0 | `DEFAULT_SPEED_SCALE_CONFIG` (nach PR-A1) |
| `runoutZone` | 0.05 | `DEFAULT_RACE_BEHAVIOR_CONFIG` |

### 1.3 Pipeline-Datenfluss (IST-Zustand)

```
SetupScreen (User-Input)
  ├── Closed Track: selectedLaps (1–4) → raceData.targetLaps
  └── Open Track:  openTrackDuration (Slider, 30–144s) → raceData.targetDuration

RaceScreen Init (race start)
  ├── speedScaleConfig = loadSpeedScaleConfig()  → { referencePathLength:2000, maxScale:10, ... }
  ├── speedScaleFactor = clamp(pathLengthPx / 2000, 0.5, 10.0)
  ├── baseSpeedConfig  = loadBaseSpeedConfig()   → { min:0.00091, max:0.00118 }
  ├── behaviorConfig   = loadRaceBehaviorConfig() → { runoutZone:0.05, ... }
  │
  ├── finishT (Closed):  raceData.targetLaps ?? lapsFromDuration(duration)  [integer: 1,2,3,4]
  ├── finishT (Open):    Math.min(
  │     openTrackFinishT(targetDuration, speedMultiplier, baseSpeedMax),   ← BUG HIER
  │     1.0 - runoutZone
  │   )
  │
  └── Per-Racer init:
        r.baseSpeed = (random[0.00091, 0.00118] * speedMultiplier / speedScaleFactor)
                      * (1 + speedBonus_for_row)

rAF Loop (pro Frame, dt ≈ 16ms)
  └── r.t += (r.baseSpeed * boost * brake + jitter) * (dt / 16)

Finish detection:
  └── r.t >= st.finishT → r.finished = true
```

### 1.4 Warum der Slider nicht wirkt (Architectural Gap)

`openTrackFinishT` (lapUtils.js:46):
```js
return Math.min(1, baseSpeedMax * speedMultiplier * REFERENCE_FPS * targetSeconds);
```

Das ist das t-Level das der SCHNELLSTE Racer ohne speedScaleFactor-Division in `targetSeconds` erreichen würde. Aber der tatsächliche Racer bewegt sich mit:
```
r.baseSpeed = baseSpeedMax * speedMultiplier / speedScaleFactor
```

Für Space Sprint (ssf ≈ 9.886):
- `openTrackFinishT(30s, 1.0, 0.00118)` = 0.00118 × 62.5 × 30 = **2.21 → geclampt auf 1.0**
- Aber r.baseSpeed × REFERENCE_FPS = 0.00118 / 9.886 × 62.5 = **0.00746 per second**
- Auf finishT=0.95 zu kommen dauert 0.95 / 0.00746 ≈ **127s** — unabhängig vom Slider-Wert

Slider-Wert 30s, 60s, 100s, 130s → **identische finishT = 0.95**. Duration-Wahl hat null Effekt.

Die korrekte Formel wäre: `openTrackFinishT = baseSpeedMax * speedMultiplier * REFERENCE_FPS * targetSeconds / speedScaleFactor`

Für Space Sprint / 30s: `2.21 / 9.886 = 0.224` — plausibel. Race wäre tatsächlich 30s kurz.

### 1.5 Wie r.t pro Frame inkrementiert wird

```js
// RaceScreen/index.jsx:717-718
r.t = Math.min(
  r.t + (r.baseSpeed * boost * brake + jitter) * (dt / 16),
  st.finishT + 0.001
);
```

- `dt` = tatsächliche Frame-Zeit in ms (nominell 16ms bei 60fps)
- `(dt / 16)` normiert auf REFERENCE_FPS=62.5
- `jitter` = `Math.sin(ts * r.jitterFreq + r.jitterPhase) * 0.00012` — kleines Wobble pro Racer
- `boost` = 1.1 wenn `draftingBoostActive`
- `brake` = 0.95 wenn `avoidanceActive`

### 1.6 finishT-Verwendung

| Track-Typ | finishT | Bedeutung | Finish-Bedingung |
|-----------|---------|-----------|-----------------|
| Closed | integer (1–4) | Anzahl Runden | `r.t >= finishT` (t akkumuliert über Runden: t=1.0 = 1 Runde, t=2.0 = 2 Runden) |
| Open | float (0..1) | Positions-Schwelle auf dem Pfad | `r.t >= finishT` (t=0..1 = Start bis Ende) |

`maxLaps` = finishT bei closed, 1 bei open. Wird für `currentLap()` und `lapProgress()` verwendet.

### 1.7 runoutZone und MAX_STATE_DURATION

- **runoutZone** (0.05 default): Open-Track-Sicherheitspuffer. finishT = min(openTrackFinishT_result, 0.95). Racer die finishT überschreiten fahren aus ("runout": `r.runoutDecay *= 0.97` pro Frame).
- **MAX_STATE_DURATION** (8000ms): Camera-Director-Timeout, **nicht** Speed-Pipeline. Irrelevant für PR-A2.

---

## Sektion 2 — Betroffene Files und Funktionen

### 2.1 Code-Files

| File | Änderungs-Art | Geschätzter LOC-Impact |
|------|---------------|------------------------|
| `client/src/modules/speedScale.js` (36 LOC) | `computeSpeedScaleFactor` wird intern oder entfällt als Public-API; `loadSpeedScaleConfig`/`saveSpeedScaleConfig` eventuell entfernt | −20 bis −36 LOC |
| `client/src/modules/storage/defaults.js` (157 LOC) | `DEFAULT_SPEED_SCALE_CONFIG` entfernt oder als interne Konstante in `raceBaseSpeed.js`; `DEFAULT_BASE_SPEED_CONFIG` bleibt als Spread-Konfiguration | −10 bis −15 LOC |
| `client/src/modules/storage/storage.js` | `SPEED_SCALE_CONFIG`-Key entfernt (wenn SpeedScaleSection entfällt) | −1 LOC |
| `client/src/screens/RaceScreen/index.jsx` (1032 LOC) | Zeilen 182–295: `speedScaleConfig`/`speedScaleFactor` ersetzen durch `computeRaceBaseSpeed`-Aufruf; `finishT`-Berechnung vereinfachen | −30 bis +20 LOC (netto −10) |
| `client/src/modules/camera/lapUtils.js` (69 LOC) | `openTrackFinishT` obsolet oder fix; `openTrackDurationRange` bleibt; `import computeSpeedScaleFactor` entfällt | −15 bis −20 LOC |
| `client/src/screens/SetupScreen/SetupScreen.jsx` (~600 LOC) | `openTrackSliderRange` useMemo: `openTrackDurationRange`-Aufruf vereinfacht; `handleStartRace` minimal | −5 bis +5 LOC (netto neutral) |
| `client/src/screens/DevScreen/sections/SpeedScaleSection.jsx` (184 LOC) | Komplett überarbeiten oder entfernen — SpeedScale als UI-Konzept entfällt | −184 LOC (oder Umbau) |
| `client/src/screens/DevScreen/sections/BaseSpeedSection.jsx` | Tooltips/Labels anpassen: "Spread around race_baseSpeed" statt "raw baseSpeed range" | −5 bis +5 LOC |
| `client/src/modules/baseSpeedConfig.js` (41 LOC) | Bleibt als "Spread Config" für ±%-Variation um race_baseSpeed herum | ~0 LOC |
| **NEU:** `client/src/modules/raceBaseSpeed.js` | `computeRaceBaseSpeed({finishT, targetDurationSeconds})` + Tests | +30 bis +50 LOC |

**Weitere Files mit indirekten Abhängigkeiten:**

| File | Änderungs-Art | Geschätzter LOC-Impact |
|------|---------------|------------------------|
| `client/src/modules/storage/defaults.js` | `DEFAULT_RACE_DEFAULTS.duration` bleibt; kein Migration-Bedarf | 0 LOC |
| `client/src/screens/SetupScreen/SetupScreen.jsx` | `loadSpeedScaleConfig`-Import entfällt | −1 LOC |
| `client/src/screens/RaceScreen/index.jsx:50` | `import { loadSpeedScaleConfig, computeSpeedScaleFactor }` entfällt | −1 LOC |
| `client/src/screens/DevScreen/DevScreen.jsx` | Navigation-Item für SpeedScale-Sektion eventuell entfernen | −3 LOC |

### 2.2 Geschätzte Gesamt-Dateien: 10–11 Code-Files + 1 neues Module

### 2.3 Test-Files

| Test-File | Änderungs-Art | Kategorie |
|-----------|---------------|-----------|
| `client/src/modules/speedScale.test.js` (145 LOC) | Alle `computeSpeedScaleFactor`-Tests: Formeln ändern sich; Q-25-Tests obsolet | Strukturell umschreiben oder großteils löschen |
| `client/src/modules/camera/lapUtils.test.js` (207 LOC) | `openTrackFinishT`-Tests: neues Verhalten; `openTrackDurationRange`-Tests: leicht anpassen | Test-Erwartungen anpassen |
| `client/src/modules/baseSpeedConfig.test.js` (125 LOC) | Bleibt: Spread-Config unverändert | Unverändert grün |
| `client/src/screens/SetupScreen/SetupScreen.test.jsx` | Open-Track-Slider-Tests: Berechnung ändert sich leicht | Test-Erwartungen anpassen |
| **NEU:** `client/src/modules/raceBaseSpeed.test.js` | Unit-Tests für `computeRaceBaseSpeed` | Neu schreiben |
| `client/e2e/b1617-smoke.spec.js` (144 LOC) | SpeedScale-Section-Tests: entfallen oder umbenennen wenn Sektion entfernt | Obsolet oder umbenennen |
| `client/e2e/camera-polish-smoke.spec.js` (69 LOC) | BaseSpeed-Section-Tests: Spread-Labels eventuell anpassen | Grün oder minimal anpassen |
| `client/e2e/camera-polish-ux-verification.spec.js` (614 LOC) | V8-V12: BaseSpeed-Tests bleiben; V11-targetDuration-Test muss mit neuer Logik funktionieren | Teilweise anpassen |
| `client/e2e/d9-smoke.spec.js` (379 LOC) | Estimated-Duration-Assertions (Lap-Anzeige) bleiben; Open-Track targetDuration-Handling ändert sich | Test-Erwartungen anpassen |

**Gesamt Test-Files:** 9 (4 Unit + 5 E2E; davon 1 neu)

---

## Sektion 3 — Test-Impact-Analyse

### 3.1 Tests die Speed-Pipeline-Output prüfen

- **`speedScale.test.js`** — testet `computeSpeedScaleFactor` direkt mit konkreten Formeln. Die Funktion ändert sich strukturell → Tests müssen neu gedacht werden.
- **`lapUtils.test.js`** — `openTrackFinishT`-Tests prüfen die fehlerhafte Formel. Nach Fix/Ersatz müssen Assertions geändert werden (Test-Sinn bleibt: "finishT passt zur gewählten Dauer").
- **`camera-polish-ux-verification.spec.js:V11`** — testet Open-Track-Race mit `targetDuration: 30`. Wenn finishT nun korrekt 0.224 statt 0.95 beträgt, läuft Race in 30s durch — kein Fehler, aber `waitForTimeout`-Timings können falsch sein.

### 3.2 Tests die relative speedMultiplier-Verhältnisse prüfen

- **`d9-smoke.spec.js:128`** — "Estimated duration is ~3× higher for Snail than for Horse": bleibt gültig, da speedMultiplier-Verhältnisse erhalten bleiben.
- **`d355-smoke.spec.js`** — speedMultiplier-Override-Tests: unabhängig von Basis-Speed-Architektur → grün.

### 3.3 Tests die konkrete Renndauer-Werte prüfen

- **`speedScale.test.js:137`** — "Space Sprint race duration ~144s" → obsolet wenn speedScaleFactor entfällt.
- **`lapUtils.test.js:145`** — "Space Sprint max ~144s at maxScale=10" → bleibt in `openTrackDurationRange` (Slider-Range-Berechnung, die weiterhin ssf nutzt).
- **`d9-smoke.spec.js:200-205`** — Open-Track targetDuration-Session-Daten: Wert selbst ändert sich nicht, nur was er bewirkt.

### 3.4 Kategorisierung aller Tests

**Grün bleiben (unverändert):**
- `baseSpeedConfig.test.js` (125 LOC) — Spread-Config bleibt
- `d355-smoke.spec.js` — speedMultiplier-Override-UI
- `d3-5-5-ux-verification.spec.js` — Per-Type-Tuning-UI
- `camera-polish-smoke.spec.js` — BaseSpeed-Section-UI-Smoke
- `d9-smoke.spec.js: Closed-Track-Teil` — Lap-Picker, Session-Daten für Closed-Track
- `lapUtils.test.js: lapsFromDuration, lapProgress, currentLap, estimatedSecondsPerLap` — unverändert
- `lapUtils.test.js: openTrackDurationRange` — Slider-Range-Berechnung bleibt korrekt

**Test-Erwartungen anpassen (gleicher Sinn, neue Zahlen):**
- `lapUtils.test.js: openTrackFinishT` — Formel ändert sich; Tests müssen neue Berechnung widerspiegeln
- `SetupScreen.test.jsx: open-track-duration-slider` — Slider-Range evtl. leicht andere Werte
- `camera-polish-ux-verification.spec.js: V11` — targetDuration=30s Race läuft jetzt tatsächlich schnell durch
- `d9-smoke.spec.js: open-track-session-data` — targetDuration wird korrekt umgesetzt (kein Bug mehr)

**Strukturell umschreiben:**
- `speedScale.test.js` — `computeSpeedScaleFactor` als Public-API entfällt; Q-25-Tests obsolet; evtl. ersetzt durch `raceBaseSpeed.test.js`-Tests

**Obsolet (können gelöscht werden):**
- `b1617-smoke.spec.js: B-17 SpeedScale-Section` — wenn SpeedScaleSection-UI entfernt wird
- `speedScale.test.js: maxScale=10 Q-25-Tests` — Architectural-Intent ändert sich

**Neu zu schreiben:**
- `raceBaseSpeed.test.js` — `computeRaceBaseSpeed(finishT, targetDuration)` für Open- und Closed-Track-Fälle

---

## Sektion 4 — Pattern-Brüche und Architektur-Entscheidungen

### 4.1 speedScaleFactor entfällt als eigenständiger Begriff

**Aktuell:** `speedScaleFactor` ist ein für User sichtbarer Tunable in `SpeedScaleSection`. Es ist ein px-proportionaler Korrekturfaktor.

**Nach PR-A2:** Die Formel `pathLengthPx / referencePathLength` kann als **interne Implementierungsdetail** in `computeRaceBaseSpeed` einfließen — oder sie entfällt ganz, da race_baseSpeed direkt aus Renndauer berechnet wird ohne Pfad-Längen-Normierung.

**Pattern-Bruch:** `SpeedScaleSection.jsx` als UI-Sektion wird überflüssig. Konzept "speed scale factor" verschwindet aus User-Vokabular. `DEFAULT_SPEED_SCALE_CONFIG`-Key in localStorage wird Waise.

### 4.2 DEFAULT_SPEED_SCALE_CONFIG-Obsoleszenz

- `DEFAULT_SPEED_SCALE_CONFIG` (enabled, referencePathLength, minScale, maxScale) → nur noch intern relevant wenn überhaupt
- `racearena:speedScaleConfig` in localStorage → kann ignoriert werden (kein Breaking Change, wird einfach nicht mehr gelesen)
- **Keine Migration nötig** — bestehende Tracks haben kein `speedScaleFactor`-Feld

### 4.3 Setup-Screen für Closed-Tracks mit optionaler Wunsch-Dauer

Aktuell: Closed-Track = Rundenzahl-Picker (1–4). Kein Duration-Slider.

CAMERA_DIRECTOR.md §7.4 erwähnt "Closed-Tracks: Spielleiter wählt Rundenzahl + optionale Wunsch-Dauer". Das ist eine substantielle UI-Erweiterung:
- Neuer optionaler Duration-Slider unter dem Lap-Picker
- Race_baseSpeed so berechnen dass N Runden in ≈ Wunsch-Dauer passen
- `estimatedSecondsPerLap`-Anzeige wird redundant falls Duration-Slider vorhanden

**Offene Frage (Sektion 8, Q1):** Ist dies Teil von PR-A2 oder separate PR?

### 4.4 finishT bleibt retroaktiv unveränderlich bei laufendem Race

`race_baseSpeed` wird bei Race-Init berechnet und in `r.baseSpeed` per Racer eingefroren. Wenn Spielleiter im Dev-Panel `baseSpeedConfig` live ändert, hat das **keinen Effekt auf das laufende Race**. Gleiche Semantik wie heute. ✓

### 4.5 maxScale-Tunable entfällt

`maxScale` im Dev-Panel (Speed Scale Section) ist ein Symptom-Fix für Q-25. Nach PR-A2 ist Q-25 strukturell gelöst — `maxScale` verliert seine Bedeutung. Der Tunable entfällt zusammen mit `SpeedScaleSection`.

---

## Sektion 5 — Komponenten-Design

### 5.1 computeRaceBaseSpeed

**Signatur:**
```js
// client/src/modules/raceBaseSpeed.js

/**
 * Computes the per-frame t-progress rate such that a racer with
 * speedMultiplier=1.0 and no spread reaches finishT in exactly targetDurationSeconds.
 *
 * Individual racer baseSpeed = computeRaceBaseSpeed(...) * speedMultiplier * spreadFactor
 * where spreadFactor = random from baseSpeedConfig range normalized around 1.0.
 *
 * @param {number} finishT  - Target position (laps for closed, 0..1 for open)
 * @param {number} targetDurationSeconds  - Desired race duration for median racer
 * @returns {number}  race_baseSpeed — t-progress per frame at REFERENCE_FPS
 */
export function computeRaceBaseSpeed(finishT, targetDurationSeconds) {
  if (!targetDurationSeconds || targetDurationSeconds <= 0) return 0;
  return finishT / (REFERENCE_FPS * targetDurationSeconds);
}
```

**Inputs/Outputs:**
- `finishT`: für Open-Track = `1.0 - runoutZone = 0.95`; für Closed-Track = `targetLaps` (1, 2, 3, 4)
- `targetDurationSeconds`: vom Spielleiter gewählte Renndauer
- Return: Skalarer Wert (t-progress per frame bei 16ms)

**Beispielrechnung:**
- Open-Track, 30s: `0.95 / (62.5 × 30) = 0.000507 per frame`
- Closed-Track, 2 Runden, 60s: `2 / (62.5 × 60) = 0.000533 per frame`
- Horse (speedMultiplier=1.0): `r.baseSpeed = 0.000507 × 1.0 × spreadFactor`
- Rocket (speedMultiplier=1.25): `r.baseSpeed = 0.000507 × 1.25 × spreadFactor` → 25% schneller, beendet Race in 24s

**spreadFactor** ersetzt `random[MIN, MAX] / BASE_SPEED_MEAN`:
```js
// In RaceScreen init — statt altem: random[MIN,MAX] / speedScaleFactor
const spreadFactor =
  (BASE_SPEED_MIN + Math.random() * (BASE_SPEED_MAX - BASE_SPEED_MIN)) / BASE_SPEED_MEAN;
// BASE_SPEED_MEAN und BASE_SPEED_MIN/MAX bleiben in DEFAULT_BASE_SPEED_CONFIG
```

**Wo liegt sie:** `client/src/modules/raceBaseSpeed.js` (neues Module, analog zu `speedScale.js` / `baseSpeedConfig.js`)

**Wie von RaceScreen aufgerufen:**
```js
// RaceScreen/index.jsx — Race Init, ersetzt bisherige speedScale-Logik
import { computeRaceBaseSpeed } from '../../modules/raceBaseSpeed.js';
import { REFERENCE_FPS } from '../camera/lapUtils.js';  // oder in raceBaseSpeed.js re-exportieren

const finishT = isOpenTrack
  ? 1.0 - behaviorConfig.runoutZone
  : (raceData.targetLaps ?? lapsFromDuration(duration));

const race_baseSpeed = computeRaceBaseSpeed(finishT, targetDuration);

// Per-racer: r.baseSpeed = race_baseSpeed * speedMultiplier * spreadFactor * (1 + speedBonus)
```

**Testbarkeit:**
```js
// raceBaseSpeed.test.js
it('computeRaceBaseSpeed returns correct finishT in targetDuration', () => {
  const rbsp = computeRaceBaseSpeed(0.95, 30);   // 30s, open track
  expect(rbsp * 62.5 * 30 * 1.0).toBeCloseTo(0.95, 5); // median racer reaches finishT
});
it('closed track 2 laps in 60s', () => {
  const rbsp = computeRaceBaseSpeed(2, 60);
  expect(rbsp * 62.5 * 60 * 1.0).toBeCloseTo(2, 5);
});
```

### 5.2 openTrackFinishT-Überarbeitung

Die aktuelle `openTrackFinishT`-Funktion wird obsolet — ihr Zweck war, die Finish-Linie zu positionieren. Unter dem neuen Modell ist die Finish-Linie immer bei `1.0 - runoutZone` (Open-Track). Die Funktion kann entfernt oder auf eine Trivialimplementation reduziert werden.

`openTrackDurationRange` (lapUtils.js:56) bleibt für den Setup-Screen-Slider unverändert — sie nutzt `computeSpeedScaleFactor` intern nur für die Slider-Range-Berechnung. Diese kann mit einem eigenen internen `ssf`-Aufruf bleiben oder umgebaut werden (nicht zwingend für PR-A2).

---

## Sektion 6 — Migration und Backward-Compatibility

### 6.1 Bestehende Track-Daten

Tracks haben **keine** Speed-Pipeline-relevanten Felder. Race-Behavior-Config und Surface-Classes sind unabhängig. Keine Migration nötig.

### 6.2 localStorage-Keys

| Key | Aktuell | Nach PR-A2 |
|-----|---------|------------|
| `racearena:speedScaleConfig` | Gelesen in RaceScreen + SetupScreen | **Nicht mehr gelesen** — wird zur Waise; kein aktiver Cleanup nötig |
| `racearena:baseSpeedConfig` | Gelesen als MIN/MAX für Spread | **Bleibt** — wird als Spread-Faktor interpretiert |
| `racearena:raceBehaviorConfig` | `runoutZone` genutzt für finishT | **Unverändert** |

**Keine Migration, keine Backwards-Compat-Shims nötig.** Orphan-Key `racearena:speedScaleConfig` schadet nicht.

### 6.3 Race-Behavior-Config-Verbindung

`runoutZone` aus `raceBehaviorConfig` wird zu einem **Input für finishT** anstatt eines Grenzwerts in `openTrackFinishT`. Die Verbindung ändert sich minimal — statt `Math.min(openTrackFinishT(...), 1 - runoutZone)` wird es `1.0 - runoutZone` direkt.

### 6.4 Race-Replays

Es gibt kein Replay-System. `activeRace` in sessionStorage enthält `targetDuration` — dieses Feld bleibt erhalten und ändert seine Bedeutung nicht. Kein Migration-Bedarf.

### 6.5 SurfaceClass-Modifiers

Surface-Classes beeinflussen Trail-Emitter (VRE-System), nicht `baseSpeed`. Kein Overlap.

---

## Sektion 7 — Risiko-Einschätzung

### 7.1 Scope-Größe

- **Betroffene Code-Files:** 10 (7 geändert + 1 gelöscht/stark reduziert + 1 neu + 1 Import-Cleanup)
- **Betroffene Test-Files:** 9 (4 Unit + 5 E2E)
- **Test-Anpassungen:** ~4 Files mit Erwartungs-Änderungen; ~2 Files strukturell umbeschrieben; ~1 neues Test-File
- **Geschätzte LOC-Änderung:** Netto −50 bis −100 LOC (mehr Löschen als Hinzufügen dank Vereinfachung)
- **Kern-Logik-Änderung:** `computeRaceBaseSpeed` ist eine 3-Zeilen-Funktion; der Rest ist Wiring

### 7.2 Risiko-Level: **MEDIUM**

**Begründung:**
- ✅ Core-Formel ist einfach und isolierbar (`computeRaceBaseSpeed`)
- ✅ Kein Schema-Migration-Bedarf
- ✅ `speedMultiplier`-Verhältnisse bleiben erhalten → alle Type-Tests grün
- ✅ Closed-Track-Logic (Lap-Picker) bleibt weitgehend unverändert
- ⚠️ Viele Test-Files müssen Erwartungen anpassen → Risiko für Übersehen einer Assertion
- ⚠️ `SpeedScaleSection.jsx` entfernen erfordert sorgfältigen Dev-Screen-Umbau
- ⚠️ Open-Track-UX-Tests: wenn finishT jetzt bei 0.22 statt 0.95 liegt für 30s-Race, ändern sich Timing-Verhalten in E2E-Tests

Kein CRITICAL oder HIGH: keine Architektur-Entscheidungen die User-Input vor Implementation erfordern (außer der einen zu Closed-Track-Duration, Sektion 8).

### 7.3 CC's Empfehlung

**PR-A2 kann direkt umgesetzt werden** — kein zusätzlicher Konzept-Sprint nötig.

**Voraussetzung:** User beantwortet Q1 (Sektion 8) — ob Closed-Track-optionale-Duration Teil von PR-A2 ist. Falls Ja: Scope wächst um ~1 UI-Komponente und ~10 Tests.

**Empfohlene Sub-Aufteilung falls Scope zu groß:**
1. **PR-A2a:** `computeRaceBaseSpeed` + Open-Track-Fix (finishT = 1-runoutZone, race_baseSpeed aus duration). SpeedScaleSection entfernen. Alle betroffenen Tests anpassen.
2. **PR-A2b (optional):** Closed-Track optionale Duration (wenn Q1 mit Ja beantwortet). Neuer UI-Block unter Lap-Picker.

Alternativ: Alles in eine PR, da Core-Logik klein ist (~200 LOC netto).

---

## Sektion 8 — Offene Fragen für User + Strategie-Claude

### Q1 — Closed-Track: Optionale Wunsch-Dauer in PR-A2?

CAMERA_DIRECTOR.md §7.4 erwähnt "optionale Wunsch-Dauer" für Closed-Tracks. Aktuell gibt es nur den Lap-Picker (1–4 Runden).

**Option A:** PR-A2 betrifft **nur Open-Tracks**. Closed-Track-Duration bleibt wie heute (lapsFromDuration oder explizite Rundenanzahl; race_baseSpeed basiert auf globalem baseSpeed-Default / ssf-Formel).

**Option B:** PR-A2 fügt Closed-Track einen optionalen Duration-Slider hinzu. Lap-Picker bleibt, aber zusätzlich kann eine Ziel-Dauer gesetzt werden → race_baseSpeed daraus berechnet.

**Option C:** Closed-Track bleibt komplett unverändert in PR-A2. Separates Ticket für später.

**Auswirkung auf Scope:** Option A = PR-A2 klein; Option B = PR-A2 medium (+Slider-UI für Closed-Track, +~5 Unit-Tests, +~3 E2E-Tests).

---

### Q2 — SpeedScaleSection: Komplett entfernen oder halten?

Wenn `computeSpeedScaleFactor` aus der Race-Pipeline verschwindet, ist `SpeedScaleSection` im Dev-Screen eine UI ohne Wirkung.

**Option A:** Komplett entfernen — sauberere Dev-Screen-Oberfläche.

**Option B:** Section umbenennen zu "Advanced Speed Tuning" mit `race_baseSpeed`-Multiplikator (ein globaler Offset-Tunable für Power-User). Kein direkter UX-Bedarf heute.

**Option C:** Section als "Legacy Mode" belassen (disabled, Hinweis-Text "replaced by duration-based system"). Schadet nicht, ist aber UI-Cruft.

---

### Q3 — Spread-Faktor: Beibehalt von DEFAULT_BASE_SPEED_CONFIG?

Aktuell: `random[0.00091, 0.00118]` = ±12.9% Spread um den Mittelwert. Dieser Spread bestimmt wie stark Racer gleichen Typs auseinanderliegen.

Unter PR-A2: `spreadFactor = random[MIN, MAX] / BASE_SPEED_MEAN` = ±12.9% als Multiplikator auf `race_baseSpeed`. **Semantik bleibt erhalten, Mechanismus ändert sich.**

`BaseSpeedSection` und `baseSpeedConfig.js` bleiben funktional. Tooltips sollten aber aktualisiert werden ("spread around race base speed" statt "absolute t-speed").

**Frage:** Ist das klar genug, oder sollen MIN/MAX neu als `spreadMin`/`spreadMax` in Prozent ausgedrückt werden? (Architektur-Entscheidung für UX, kein Blocker für PR-A2)

---

### Q4 — Closed-Track race_baseSpeed ohne targetDuration: Was als Basis?

Falls Q1 mit Option A oder C beantwortet: Closed-Track hat keinen Duration-Slider. Was ist der Default für `race_baseSpeed` bei Closed-Tracks?

**Option A:** Beibehalt alter Formel: `r.baseSpeed = random[MIN,MAX] * speedMultiplier / speedScaleFactor`. Für Closed-Tracks funktioniert alles wie heute.

**Option B:** Synthetisch eine "natural duration" aus Streckenlänge berechnen (ähnlich wie `openTrackDurationRange.max`) und daraus `race_baseSpeed` ableiten. Wäre konsistenter aber bricht bei Closed-Tracks das bestehende Verhalten.

**Empfehlung CC:** Option A für PR-A2. Closed-Track-Behavior ist gut (lapsFromDuration funktioniert). Keine Regression einführen ohne Grund.

---

### Q5 — openTrackDurationRange: speedScaleFactor-Abhängigkeit behalten?

`openTrackDurationRange` (lapUtils.js:56) nutzt intern `computeSpeedScaleFactor` um den Slider-Max zu berechnen. Diese Funktion ist **korrekt** — sie zeigt dem User welche Renndauern auf dieser Strecke physikalisch erreichbar sind.

Wenn `computeSpeedScaleFactor` als Public-API entfällt, wird `openTrackDurationRange` entweder:
- Die ssf-Formel intern inlinen (3 Zeilen), oder
- `computeRaceBaseSpeed` rückwärts einsetzen: `maxDuration = finishT / computeRaceBaseSpeed_inverse_...`

Kein Blocker, aber Entscheidung nötig bei der Implementation.

---

## Vorgehen-Zusammenfassung

### Analysierte Files
- `CAMERA_DIRECTOR.md` (§7.1 Mess-Ergebnisse, §7.4 Speed-Pipeline-Architektur, §13.1 R7) ✓
- `client/src/modules/speedScale.js` (vollständig) ✓
- `client/src/modules/storage/defaults.js` (vollständig) ✓
- `client/src/screens/RaceScreen/index.jsx` (Zeilen 170–330 Init, 700–760 rAF-Loop) ✓
- `client/src/screens/SetupScreen/SetupScreen.jsx` (Zeilen 195–306 Speed/Duration-Logik) ✓
- `client/src/modules/camera/lapUtils.js` (vollständig) ✓
- `client/src/modules/baseSpeedConfig.js` (vollständig) ✓
- `client/src/screens/DevScreen/sections/SpeedScaleSection.jsx` (vollständig) ✓
- `client/src/modules/speedScale.test.js`, `lapUtils.test.js`, `baseSpeedConfig.test.js` ✓
- `client/e2e/d9-smoke.spec.js`, `b1617-smoke.spec.js`, `camera-polish-*.spec.js` ✓

### Scope-Übersicht
| Dimension | Wert |
|-----------|------|
| Code-Files betroffen | 10–11 |
| Test-Files betroffen | 9 |
| LOC-Änderung netto | −50 bis −100 LOC |
| Risiko-Level | **MEDIUM** |
| Offene User-Input-Fragen | **5** (Q1 ist entscheidend) |

### Empfehlung
**Direkt PR-A2 umsetzen** — kein zusätzlicher Konzept-Sprint nötig. Core-Logik (`computeRaceBaseSpeed`) ist eine 3-Zeilen-Funktion. Hauptarbeit ist das Updaten der Test-Assertions und das saubere Entfernen von `SpeedScaleSection`.

User muss **Q1** beantworten bevor PR-A2 beginnt: Closed-Track-Duration in PR-A2 oder separate PR? Falls Option A (Open-Track only), ist PR-A2 klar umrissen und niedrig risikoreich.
