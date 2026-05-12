# RaceArena — Pre-Merge Audit
**Branch:** `feat/per-state-camera-phase-1-foundation`  
**Date:** 2026-05-12  
**Tests at audit:** 1717/1717 ✓ | **Build:** ✓ (447 kB JS gzip: 131 kB)

---

## Executive Summary

| Priorität | Anzahl | Bereiche |
|-----------|--------|---------|
| CRITICAL | 0 | — |
| IMPORTANT | 5 | Toter Code (2×), CORS, Server-Auth, Monolithic Components |
| NICE-TO-HAVE | 9 | Coverage UI-Komponenten, Dependency-Upgrades, JSDoc, Browserslist, Bundle-Split, Magic-Numbers |

**Empfehlung: Branch ist mergebereit.** Kein einziges CRITICAL-Item gefunden. Alle IMPORTANT-Items sind bekannte Scope-Entscheidungen (Phase L = lokaler Dev-Server ohne Auth) oder kleiner toter Code. Folge-Cleanup kann in separaten Commits nach dem Merge erfolgen.

**Geschätzter Aufwand für IMPORTANT-Items:**
- I1 + I2 (toter Code): ~10 min, 1 Commit
- I3 + I4 (CORS/Auth): dokumentiert als Phase 5 — kein Code-Aufwand
- I5 (monolithische Komponenten): mehrere Stunden, optionaler Refactor-Sprint

---

## Sektion 1 — Security

### 1.1 Dependency-Vulnerabilities

```
npm audit client/: 0 vulnerabilities (9 prod + 419 dev deps)
npm audit server/: 0 vulnerabilities (82 prod + 97 dev deps)
```

**Befund:** Kein Handlungsbedarf. Keine bekannten CVEs in der aktuellen Dependency-Kette.

### 1.2 Sensitive Data

- **Keine .env-Dateien** im Repository gefunden.
- `.gitignore` deckt `.env`, `node_modules`, `dist`, `coverage`, `.claude/settings*`, `diagnosis/` und temporäre Backup-Dateien korrekt ab.
- **Kein hardcoded API-Key, Token oder Passwort** in `client/src` oder `server/src` gefunden.
- **localStorage-Nutzung:** Alle Writes laufen über `client/src/modules/storage/storage.js` mit dem `racearena:`-Namespace. Keine sensitiven Daten (keine Credentials, keine persönlichen Daten) werden gespeichert — nur Renn-Konfigurationen.
- **URL-Parameter:** Keine sensitiven Daten in URL-Parametern gefunden.

### 1.3 XSS / Input-Sanitization

- **`dangerouslySetInnerHTML`:** Nicht verwendet. Kein Befund.
- **`innerHTML`:** Nicht direkt gesetzt. Kein Befund.
- **User-Inputs im Frontend:** Track-Namen, Racer-Namen etc. werden als React-State verwaltet und über JSX gerendert — React escaped automatisch. Kein direktes DOM-Injection-Risiko.
- **Server-Validation:** `validateTrackBodyForCreate()` und `validateTrackBodyForUpdate()` in `server/src/routes/tracks.js` prüfen Typen, Pflichtfelder und Hex-Color-Format. `isValidHexColor()` via Regex `/^#[0-9a-fA-F]{6}$/`. Multer begrenzt File-Upload auf 10 MB.

### 1.4 CORS / API-Sicherheit

**`[IMPORTANT — I3]`** Server-App (Phase L) verwendet:
```js
app.use(cors())  // app.js:17 — kein Origin-Filter
```
Alle Origins dürfen auf alle Endpoints zugreifen. Für den Phase-L-Einsatz (Docker auf localhost) akzeptabel. Für Phase 5 (öffentliche Exposition) muss ein Origin-Whitelist konfiguriert werden.

**`[IMPORTANT — I4]`** Kein Authentifizierungs-Middleware vorhanden. Alle CRUD-Endpoints (`POST /api/tracks`, `DELETE /api/tracks/:id`, `POST /api/surface-classes` etc.) sind ohne Auth erreichbar. Laut README und Roadmap ist Auth für Phase 5 (JWT) geplant. Für Phase L (Localhost-only) akzeptiert. **Vor jeder öffentlichen Exposition muss Auth implementiert sein.**

---

## Sektion 2 — Source Hygiene

### 2.1 Toter Code

**`[IMPORTANT — I1]` `client/src/modules/utils/index.js`** — nie importiert, 0% Coverage.

Exportiert `formatLapTime`, `formatRank`, `clamp`, `lerp`. Keine einzige dieser Funktionen wird aus dieser Datei importiert. Die Datei existiert seit Projektstart, wurde aber nie in die codebase integriert. Entweder löschen oder an die Aufruforte integrieren (z.B. `formatLapTime` in ResultScreen).

**`[IMPORTANT — I2]` `client/src/screens/DevScreen/components/SectionContainer.jsx`** — nie importiert, 0% Coverage.

Ein wiederverwendbarer Wrapper-Component (`SectionContainer`) wird in keiner anderen Datei importiert. Alle DevScreen-Sections verwenden ihre eigenen Card-Layouts direkt. Kann gelöscht werden.

### 2.2 Code-Smells

**Monolithische React-Komponenten `[IMPORTANT — I5]`:**

| Komponente | Zeilen | Bewertung |
|-----------|--------|-----------|
| `TrackEditor.jsx` | 1447 | Refactor-Kandidat |
| `RaceScreen/index.jsx` | 1286 | Refactor-Kandidat |
| `RaceTuningSection.jsx` | 965 | Refactor-Kandidat |
| `SetupScreen.jsx` | 742 | Grenzwertig |
| `TrackManager.jsx` | 657 | Grenzwertig |
| `CameraDirector.js` | 1093 | Akzeptabel — State Machine mit vielen States |
| `CameraDiagnosticsHUD.jsx` | 388 | Akzeptabel — legitimes HUD-Debug-Tool |

TrackEditor, RaceScreen und RaceTuningSection sind kandidat für Extraktion von Sub-Komponenten (z.B. die ~100-Zeilen Star-Background-Render-Funktion in RaceScreen). Nicht merge-blockend, aber auf dem Radar für einen späteren Refactor-Sprint.

**`console.*`-Aufrufe in Production-Code:**

Alle 19 `console.warn`/`console.error` Aufrufe sind legitim:
- `[RaceArena]`-präfixierte Warnungen in Error-Boundaries, Storage-Migrations, Track-Loading
- Zwei `console.warn` in CameraDirector für Camera-State-Transition-Logging (HUD-Debug-Feature, by design)
- Kein einziges unnötiges `console.log` (debug-statement)

**Magic Numbers:**

In `client/src/screens/RaceScreen/index.jsx` sind Koordinaten für den Star-Background (Zeilen 673–686) als Literal-Array hardcoded. Das ist bewusst — es handelt sich um Dekordaten, keine Physik-Konstanten. Keine Aktion erforderlich.

### 2.3 Naming-Inkonsistenzen

Kein systematischer Befund. Codebase verwendet konsistent camelCase für JS-Identifiers, SCREAMING_SNAKE_CASE für Modul-Konstanten (z.B. `MAX_STATE_DURATION`, `BATTLE_PULK_THRESHOLD_PX`). Abkürzungen (`tc`, `lf`, `bsX`) sind im Kontext des Camera-Moduls durch JSDoc und Konstanten erklärt.

Einziger Rest-Befund: Datei-Header in `CameraZoomTuningSection.jsx` enthält noch `Etappe 3:` in der Description-Zeile. Kein Code-Smell, nur historische Notiz — kann bereinigt werden.

### 2.4 Auskommentierter Code / Markers

- **Keine TODOs, FIXMEs, HACKs, XXX** in `client/src` oder `server/src` gefunden.
- Kein auskommentierter Code-Block gefunden. Alle `//`-Kommentarblöcke sind Dokumentation (JSDoc, inline-Erklärungen) oder Datei-Header.
- Verhältnis Kommentar/Code: 13,5% (2548 von 18923 Zeilen) — gesund. Der Großteil sind die standardisierten Datei-Header.

---

## Sektion 3 — Test Coverage

### 3.1 Coverage-Report

```
Statements : 64.37%  (3555 / 5522)
Branches   : 55.86%  (1881 / 3367)
Functions  : 61.63%  ( 673 / 1092)
Lines      : 65.88%  (3239 / 4916)
```

**Module mit 0% Coverage (nach Typ bewertet):**

| Datei | Zeilen | Bewertung |
|-------|--------|-----------|
| `modules/utils/index.js` | 26 | IMPORTANT — toter Code (I1) |
| `screens/DevScreen/components/SectionContainer.jsx` | ~50 | IMPORTANT — toter Code (I2) |
| `screens/RaceScreen/index.jsx` | 1286 | NICE-TO-HAVE — Canvas-UI, nicht unit-testbar |
| `screens/RaceScreen/CameraDiagnosticsHUD.jsx` | 388 | NICE-TO-HAVE — Dev-HUD, React-rendered |
| `screens/DevScreen/sections/SystemSettings.jsx` | ~160 | NICE-TO-HAVE — Dev-UI |
| `screens/DevScreen/sections/RaceDefaults.jsx` | ~200 | NICE-TO-HAVE — Dev-UI |
| `screens/DevScreen/sections/CameraStateHudSection.jsx` | ~30 | NICE-TO-HAVE — Dev-UI |

**Module mit < 50% Coverage:**

| Datei | Stmts% | Bewertung |
|-------|--------|-----------|
| `DevScreen/sections/BrandingProfiles.jsx` | 15.62% | NICE-TO-HAVE |
| `DevScreen/sections/PlayerGroupsManager.jsx` | 26.66% | NICE-TO-HAVE |
| `DevScreen/sections/MinSpriteSizePreview.jsx` | 30% | NICE-TO-HAVE |
| `DevScreen/sections/RaceHistory.jsx` | 42.85% | NICE-TO-HAVE |
| `DevScreen/sections/RacerManager.jsx` | 46.15% | NICE-TO-HAVE |

Alle niedrig-gecoverten Module sind Dev-Panel UI-Komponenten ohne Logik-Kern. Fehlende Tests hier sind ein UX-Problem bei Regressions, kein Sicherheitsproblem.

### 3.2 Untested kritische Pfade

| Pfad | Getestet? | Details |
|------|-----------|---------|
| `EditorShape.getPosition()` Interpolation | ✓ JA | 3 Smoothness-Regressions-Tests (Etappe 26) + bestehende Position/Offset-Tests |
| Camera State Machine — alle Transitions | ✓ JA | CameraDirector.test.js: ~700 Zeilen, 90+ Tests über alle States |
| Pulk-Detection `_isPulk()` | ✓ JA | 9 dedizierte Tests in "Etappe 13"-Block |
| Re-Roll-Mechanik | ⚠ TEILWEISE | `rowLayout.js` hat Tests; die Re-Roll-Logik in `RaceScreen/index.jsx` (Canvas) ist nicht direkt testbar |
| Backend-Endpoints | ✓ JA | `server/src/routes/tracks.test.js` + `surfaceClasses.test.js` |
| Schema v5 Migration | ✓ JA | `cameraConfig.test.js` |

### 3.3 Test-Qualität

- **Kein einziger `it.skip`** oder `describe.skip` in der Codebase. Alle Tests laufen.
- **Kein `it.only`** oder `describe.only` vergessen.
- **Snapshot-Tests:** Keine Snapshot-Tests vorhanden — kein Risiko für veraltete Snapshots.
- **Komplexe Tests:** `CameraDirector.test.js` ist mit ~1200 Zeilen groß, aber gut strukturiert in benannte describe-Blöcke. Tests prüfen Verhalten (State-Transitions, Timing, Cooldowns), nicht Implementation.
- **Diagnose-Tests:** `catmullRom.diagnostic.test.js` und `trackCorridor.test.js` enthalten `console.log` — diese sind explizit als Diagnose-Tools angelegt, akzeptabel.

---

## Sektion 4 — Dependencies

### 4.1 Versions-Status

**Client (npm outdated):**

| Package | Aktuell | Latest | Art |
|---------|---------|--------|-----|
| `react` | 18.3.1 | **19.2.6** | Major — breaking changes, kein Upgrade-Druck |
| `react-dom` | 18.3.1 | **19.2.6** | Major — zusammen mit react |
| `react-router-dom` | 6.30.3 | **7.15.0** | Major — neue API (v7 Framework-Mode) |
| `eslint` | 9.39.4 | **10.3.0** | Major — neue flat-config-Breaking-Changes |
| `vite` | 8.0.10 | 8.0.12 | Patch — unkritisch |
| `@playwright/test` | 1.59.1 | 1.60.0 | Minor — update bei Gelegenheit |
| `jsdom` | 29.0.2 | 29.1.1 | Minor — update bei Gelegenheit |

**Server (npm outdated):**

| Package | Aktuell | Latest | Art |
|---------|---------|--------|-----|
| `express` | 4.22.1 | **5.2.1** | Major — Express 5 async error handling |
| `vitest` | 4.1.5 | 4.1.6 | Patch — unkritisch |

**`[NICE-TO-HAVE]`** React 19, react-router v7, ESLint 10 und Express 5 sind alle Major-Upgrades mit potenziell breaking changes. Kein Handlungsbedarf vor diesem Merge, aber ein geplanter Upgrade-Sprint ist sinnvoll.

### 4.2 Bundle-Größe

```
dist/assets/index.js   447.78 kB │ gzip: 131.46 kB
dist/assets/index.css   38.53 kB │ gzip:   7.41 kB
dist/index.html          0.93 kB │ gzip:   0.48 kB
```

Kein Code-Splitting konfiguriert — alles in einem Bundle. Für eine Canvas-Game-App mit ~136 Modulen ist 131 kB gzip akzeptabel. React (runtime + DOM) macht den Großteil aus. Bei weiterem Wachstum könnte Route-Based Code-Splitting (Vite dynamic import) sinnvoll werden.

**`[NICE-TO-HAVE]`** Explizite `build.rollupOptions.output.manualChunks` Konfiguration könnte React vom App-Code trennen und Browser-Caching verbessern.

### 4.3 Dev vs Production

Alle Production-Dependencies korrekt zugeordnet:
- `client/`: `react`, `react-dom`, `react-router-dom` als `dependencies` ✓
- `server/`: `express`, `cors`, `multer` als `dependencies` ✓
- Dev-Tools (`eslint`, `vite`, `vitest`, `playwright`) alle in `devDependencies` ✓

---

## Sektion 5 — Documentation

### 5.1 README.md

`README.md` (Wurzel) ist vorhanden, aktuell und vollständig:
- Tech Stack dokumentiert ✓
- Feature-Liste vollständig ✓
- Getting Started (dev + Docker) ✓
- API-Endpoints für Phase L dokumentiert ✓
- Verweis auf `docs/` für Architecture, Track-Editor-Spec, Roadmap ✓

Kleinigkeit: Der README-Eintrag "Camera Director" in der Feature-Liste erwähnt noch nicht die neuen States `lead-in/lead-out` und die Pulk-Bedingung. **NICE-TO-HAVE.**

### 5.2 Code-Dokumentation

| Modul | JSDoc | Bewertung |
|-------|-------|-----------|
| `CameraDirector.js` | ✓ | Klassen-JSDoc, alle Konstanten kommentiert, `_computeZoomForTargetSize` gut erklärt |
| `EditorShape.js` | ⚠ Teilweise | `getPosition()` Signatur-JSDoc vorhanden, aber der neue Interpolations-Modus ist nicht erwähnt |
| `panTarget.js` | ✓ | `getPanTarget()` vollständig mit JSDoc + Shape-Fallback erklärt |
| `rowLayout.js` | ✓ | `computeSpeedBonus()` mit JSDoc |
| `CameraDirector._isPulk()` | ⚠ | Private Methode, kein JSDoc |

**`[NICE-TO-HAVE]`** `EditorShape.getPosition()` JSDoc sollte einen Satz über lineare Interpolation erhalten (war vorher `Math.round()`-basiert, jetzt interpoliert). Verhindert künftige Verwirrung wenn jemand die alte staircase-Regression debuggt.

### 5.3 Veraltete Inline-Kommentare

- **Etappe-Referenzen:** Ein verbleibender Datei-Header-Kommentar in `CameraZoomTuningSection.jsx:7` (`Etappe 3: per-state cameraStateProfiles accordion`) — historisch, kein Code-Smell, aber bereinigbar.
- **Keine weiteren Etappe-/workaround-Kommentare** in Production-Code gefunden. Alle Etappe-23-Trace-Instrucmentierungen wurden in Etappe 27 vollständig entfernt.

---

## Sektion 6 — Performance

### 6.1 Race-Loop-Performance

Nach den Etappe-27-Cleanups und dem Etappe-26-Fix:

| Operation | Vorher | Jetzt |
|-----------|--------|-------|
| `shape.getPosition()` pro Racer | 2× (displayT + drawX) | 1× |
| `_tangentAngle()` Berechnung | Live (catmullRom-Call) | Precomputed `_angles[]` |
| Sprite EMA (`_displayT`) | Per-Frame loop | Entfernt (Etappe 19) |

Geschätzte Allocations im Hot-Path pro Frame bei 100 Racern:
- `getPosition()` gibt `{ x, y, angle }` zurück → 100 Objekte pro Frame. Geringe GC-Last, da kurzlebig. Optimierbar durch Object-Reuse, aber nicht notwendig auf aktueller Racer-Anzahl.
- Die Race-Loop ist canvas-rAF-basiert — kein virtueller DOM-Overhead im Render-Pfad.

### 6.2 Memory

- **Race-Reset:** Racers-Array wird bei Race-Start neu alloziert; alter State wird durch GC bereinigt. Kein strukturelles Leak.
- **EditorShape:** `_inner[]` und `_outer[]` werden einmalig im Konstruktor alloziert (`n` Samples à 2 Floats). Bei `samples=500`: ~4 kB. Kein Leak.
- **Trail-Buffer:** `trail.push()` in `drawRacers` — Trails werden mit `shift()` begrenzt. Kein unbegrenztes Wachstum.

### 6.3 Render

- Keine `getImageData`/`putImageData` im Hot-Path (teuer).
- `getEdgePoints(80)` wird einmalig beim Race-Start aufgerufen (Zeile 205), nicht per Frame. ✓
- `drawBattleDiagMarkers()` läuft nur wenn `showCameraDiagnostics=true` (Dev-HUD). ✓

---

## Sektion 7 — Browser Compatibility

### 7.1 Browserslist

Kein explizites `browserslist` in `package.json` oder `.browserslistrc`. Vite verwendet Default-Target: moderne Browser mit ES-Modul-Support.

**`[NICE-TO-HAVE]`** Eine explizite `"browserslist": ["> 0.5%", "last 2 versions", "not dead"]` Deklaration in `client/package.json` würde Vite und ESLint-Browser-Plugin konsistent auf dasselbe Target ausrichten.

### 7.2 Features

Alle verwendeten JS-Features sind in modernen Browsern (Chrome 90+, Firefox 90+, Safari 15+, Edge 90+) verfügbar:

| Feature | Support | Risiko |
|---------|---------|--------|
| Optional chaining `?.` | Chrome 80+ | ✓ kein Risiko |
| Nullish coalescing `??` | Chrome 80+ | ✓ kein Risiko |
| `Array.at()` | Chrome 92+ | ✓ kein Risiko |
| Canvas 2D API | Universal | ✓ kein Risiko |
| `localStorage` | Universal | ✓ kein Risiko |
| `fetch` | Chrome 42+ | ✓ kein Risiko |
| ES Modules (native) | Chrome 61+ | ✓ kein Risiko (Vite bundelt für Prod) |

---

## Sektion 8 — Accessibility (Kurzbewertung)

### 8.1 ARIA

58 ARIA-Attribute gefunden. Korrekte Nutzung:
- Modal-Dialog: `role="dialog"`, `aria-modal="true"`, `aria-label` ✓
- InfoTooltip: `role="img"` + `role="tooltip"` ✓
- Input-Labels: `aria-label` auf Slider/Color-Picker ✓

Lücken: Canvas-Elemente (Race-Track, Minimap) haben kein ARIA — für eine Canvas-Game-App ist das unvermeidlich ohne vollständiges a11y-Framework.

### 8.2 Keyboard-Navigation

Setup-Form und Dev-Panel navigierbar via Tab. Canvas-Race selbst ist nicht keyboard-navigierbar — by design (kein spielbarer Modus, nur Zuschauer-View).

### 8.3 Color Contrast

Nicht systematisch geprüft (kein Tool-Lauf). Das Dev-Panel verwendet Dark Theme mit hellen Labels — subjektiv ausreichend. Für öffentliche Exposition sollte ein WCAG-Check (z.B. axe-playwright) ergänzt werden.

---

## Sektion 9 — Build / CI

### 9.1 Build

```
✓ Build erfolgreich (390ms)
dist/assets/index.js  447.78 kB │ gzip: 131.46 kB
```

Keine Warnungen, keine Fehler. Tree-Shaking aktiv (Vite/Rollup Standard).

### 9.2 CI-Pipeline

`.github/workflows/ci.yml` deckt ab:
- ✓ ESLint (Syntax + Rules)
- ✓ Prettier Format-Check
- ✓ Tests mit Coverage (`npm run test:coverage`)
- ✓ Security Audit (`npm audit --audit-level=high`)
- ⚠ Kein Server-Test-Schritt (`server/` wird nicht in CI getestet)
- ⚠ Kein Build-Step in CI (Build könnte brechen ohne CI-Alarm)

**`[NICE-TO-HAVE]`** Zwei fehlende CI-Steps:
1. `cd server && npm test` — Server-Tests laufen lokal, aber nicht in CI
2. `cd client && npm run build` — Build wird nicht verifiziert in CI

### 9.3 Pre-Commit Hooks

`.husky/pre-commit`: `cd client && npx lint-staged`

lint-staged läuft ESLint + Prettier auf staged `.js`/`.jsx` Files. Sauber konfiguriert, hooks sind aktiv (Commits dieser Branch wurden korrekt durch lint-staged verarbeitet). ✓

### 9.4 .gitignore

`.gitignore` deckt vollständig ab:
- `node_modules/`, `.env`, `dist/`, `build/` ✓
- `client/coverage/`, `client/playwright-report/`, `client/test-results/` ✓
- `.claude/projects/`, `.claude/settings*.json` ✓ (kein Leak von Claude-Konfig)
- `server/data/**/*.json.tmp`, `server/data/tracks-backups/` ✓
- `AUDIT.md`, `audit-temp/`, `diagnosis/` ✓ (temporäre Artefakte)

---

## Anhang — Vollständige Item-Liste

### IMPORTANT

| ID | Befund | Datei | Aufwand |
|----|--------|-------|---------|
| I1 | `utils/index.js` ist totes Modul — löschen oder integrieren | `client/src/modules/utils/index.js` | 10 min |
| I2 | `SectionContainer.jsx` nie importiert — löschen | `client/src/screens/DevScreen/components/SectionContainer.jsx` | 5 min |
| I3 | CORS wide-open (`cors()` ohne Origin-Filter) | `server/src/app.js:17` | Phase 5 |
| I4 | Keine Server-Authentication auf CRUD-Endpoints | `server/src/routes/tracks.js` | Phase 5 |
| I5 | Monolithische Komponenten > 700 Zeilen (TrackEditor, RaceScreen, RaceTuningSection) | mehrere | Refactor-Sprint |

### NICE-TO-HAVE

| ID | Befund | Aufwand |
|----|--------|---------|
| N1 | `EditorShape.getPosition()` JSDoc: fehlender Hinweis auf lineare Interpolation | 2 min |
| N2 | `CameraDirector._isPulk()` kein JSDoc | 3 min |
| N3 | `CameraZoomTuningSection.jsx:7` — veralteter `Etappe 3:`-Kommentar im Header | 1 min |
| N4 | Explizites `browserslist` in `client/package.json` | 2 min |
| N5 | CI: Server-Tests + Build-Step ergänzen | 15 min |
| N6 | README: Camera Director — lead-in/lead-out und Pulk-Bedingung erwähnen | 5 min |
| N7 | React 19 / react-router v7 / Express 5 Upgrade-Sprint planen | mittel |
| N8 | Code-Splitting für React-Bundle (Vite manualChunks) | 30 min |
| N9 | WCAG-Check mit axe-playwright wenn App öffentlich wird | — |
