# Cleanup-Audit — PR #98 (Free-Lane Separation + Home-Force-Reduktion)

**Datum:** 2026-05-14  
**Branch:** `claude/free-lane-separation`  
**Scope:** Alle in PR #98 geänderten Files (Code, Tests, DevScreen-UI)

---

## Schritt 2 — Code-Audit PR #98

### `client/src/modules/raceBehavior.js`

**Befund:** Sauber.

- Keine toten Code-Pfade, keine auskommentierten Blöcke.
- Keine ungenutzten Imports (keine Imports, ist pure Funktionsdatei).
- Utility-Funktionen (`normalizeAngle`, `shortestArcDeltaT`, `stablePairBit`, `getSpriteWorldSizePx`, `getTrackWidthPx`, `getPathLengthPx`) sind alle genutzt.
- Magic Numbers: `1e-6` (Zeile 241) ist Standard-Epsilon für Float-Vergleich, kein Erklärungsbedarf. `2166136261` und `16777619` (Zeile 43–44) sind FNV-1a-Konstanten — ausreichend durch Kontext erkennbar.
- Kommentar Zeile 286–289: Architektur-Notiz über Drafting-Cone-Limitation mit Verweis auf Backlog-Item. Kein Zombie-Kommentar — bleibt.
- Kein `console.log`/`console.error`.
- Naming: durchgängig camelCase, keine Inkonsistenzen.

**Fixes nötig:** Keine.

---

### `client/src/modules/raceBehaviorConfig.js`

**Befund:** Sauber.

- Migration-Kommentar Zeile 15 (`LEGACY_START_SPREAD_DEFAULT`) ist korrekt und nötig.
- Validierung deckt alle Config-Felder inkl. `homeForceReductionOnOverlap` (Zeilen 30–31).
- Kein toter Code, keine unbenutzten Imports.

**Fixes nötig:** Keine.

---

### `client/src/modules/storage/defaults.js`

**Befund:** Sauber.

- `homeForceReductionOnOverlap: 0.3` korrekt hinzugefügt mit erklärendem Kommentar.
- `reRollVariationPercent: 58` (aus PR #98-Basis) korrekt.
- Keine Magic Numbers ohne Kontext.

**Fixes nötig:** Keine.

---

### `client/src/screens/DevScreen/sections/RaceTuningSection.jsx`

**Befund:** Zwei Fehler.

#### Fehler 1 — `homeForceReductionOnOverlap` in falschem Block (UX-Bug)

Das Input-Feld für `homeForceReductionOnOverlap` sitzt im `formGrid` von **Block 2 (Start Layout)** (Zeilen 399–421), gehört aber semantisch zu **Block 9 (Home Force)**.

Konsequenz:
- Der „Reset"-Button von Block 2 (`resetStartLayout`) setzt `homeForceReductionOnOverlap` **nicht** zurück (nur `startSpreadRange` und `runoutZone`).
- Der „Reset"-Button von Block 9 (`resetHomeForce`) setzt `homeForceReductionOnOverlap` zurück — aber das Feld steht drei Blöcke weiter oben.
- User sieht das Feld in „Start Layout", drückt dort Reset → Feld bleibt unverändert.

**Fix:** Input von Block 2 nach Block 9 verschieben. `resetHomeForce` deckt es bereits korrekt ab.

#### Fehler 2 — InfoTooltip-Text in Deutsch (App-Language-Convention)

Zeile 405:
```
text="Home-Force-Faktor bei aktivem Overlap. 0.3 = 30% normale Starke wenn Racer uberlappt."
```
Alle anderen InfoTooltips im selben File sind auf Englisch. Dieser Text wurde offenbar im Diagnose-Sprint schnell hinzugefügt und nicht angepasst.

**Fix:** Englischen Text setzen, konsistent mit anderen Tooltips.

---

### `client/src/screens/RaceScreen/index.jsx`

**Befund:** Sauber für PR #98-Scope.

- Geometrie-Metadaten (`spriteWorldSizePx`, `geometricTrackWidthPx`, `pathLengthPx`) werden korrekt an jeden Racer übergeben (Zeilen 368–370).
- `applyRacerBehavior` wird mit vollständigem `behaviorConfig` aufgerufen (Zeile 935).
- Das einzige `console.error` (Zeile 178) ist legitim: kritischer Guard für fehlende `geometryId`.

**Fixes nötig:** Keine.

---

### Test-Files

#### `client/src/modules/raceBehavior.test.js`

**Befund:** Sauber.

- Home-Force-Reduktion Tests (Zeilen 121–180): testen `homeForceReductionOnOverlap` korrekt.
- Free-Lane-Separation Tests (Zeilen 387–487): decken alle 6 Separation-Scenarios ab.
- Keine Ghost-Tests. Alle Tests referenzieren Funktionen/Konstanten die im aktuellen Code existieren.

#### `client/src/screens/DevScreen/sections/RaceTuningSection.test.jsx`

**Befund:** Überwiegend sauber. Ein Genauigkeitsmangel.

- Der Test "renders Block 9: Home Force" prüft `getByLabelText('Home Force Reduction On Overlap')` (Zeile 167).
- **Nach dem Fix** (Verschiebung nach Block 9) bleibt der Test korrekt — er prüft nur ob das Element im DOM vorhanden ist, nicht in welchem Block.
- Die Mocks enthalten `homeForceReductionOnOverlap: 0.3` konsistent mit Defaults.
- Keine Ghost-Tests.

---

## Schritt 4 — Backend-UI-Konsistenz

### Klassifikation aller `DEFAULT_RACE_BEHAVIOR_CONFIG`-Felder

| Feld | UI-Block | Wired? | Klasse |
|------|----------|--------|--------|
| `enabled` | Checkbox (unten) | ✅ | HOT |
| `startSpreadRange` | Block 2 | ✅ | HOT |
| `runoutZone` | Block 2 | ✅ | HOT |
| `homeForceStrength` | Block 9 | ✅ | HOT |
| `homeForceReductionOnOverlap` | Block 2 (falsch) → Block 9 (nach Fix) | ✅ | HOT (misplaced → fixed) |
| `comfortThreshold` | Block 6 | ✅ | HOT |
| `softRepulsionStrength` | Block 6 | ✅ | HOT |
| `avoidanceDistance` | Block 7 | ✅ | HOT |
| `tWeight` | Block 7 | ✅ | HOT |
| `yWeight` | Block 7 | ✅ | HOT |
| `lateralForce` | Block 7 | ✅ | HOT |
| `maxLateral` | Block 7 | ✅ | HOT |
| `speedBrakeYThreshold` | Block 8 | ✅ | HOT |
| `speedBrakeTThreshold` | Block 8 | ✅ | HOT |
| `speedBrakeFactor` | Block 8 | ✅ | HOT |
| `draftingMaxDistance` | Block 5 | ✅ | HOT |
| `draftingConeAngle` | Block 5 | ✅ | HOT |
| `draftingBoost` | Block 5 | ✅ | HOT |

**Ergebnis:** 18/18 Felder HOT. 0 GHOST, 0 MISSING. 1 MISPLACED (wird im gleichen Commit gefixt).

**Hinweis Free-Lane:** Es gibt keinen separaten UI-Tunable für Free-Lane Separation Force — by Design. Die Free-Lane-Logik nutzt `lateralForce` und `maxLateral` aus Block 7 (Soft Avoidance), die bereits HOT sind.

---

## Schritt 7 — Security-Check

_(Wird in separatem Schritt ausgeführt — Ergebnisse werden hier nachgetragen.)_

---

## Monitoring-Metriken

| Metrik | Wert |
|--------|------|
| Geister-Tests entfernt | 0 |
| Geister-UI-Bindings entfernt | 0 |
| Misplaced UI fields gefixt | 1 (homeForceReductionOnOverlap → Block 9) |
| Language-Convention-Fixes | 1 (Tooltip German → English) |
| raceBehavior.js: tote Code-Pfade | 0 |
| Neue Kommentar-Leichen | 0 |
