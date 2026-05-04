# RaceArena — Backlog

Living list. See ROADMAP.md for phase context and completion status.
Items ranked by urgency within each bucket. ✅ = done, 🔜 = next, ⏳ = waiting on dependency.

---

## Phase L — Local Backend

| Item | Status | Beschreibung |
|---|---|---|
| ✅ **L.1** | PR #43 | Backend-Skeleton: `server/` (Express, Port 4000), Dockerfile, docker-compose.yml, `GET /api/health`, Frontend-Config-Hook in `client/src/services/api.js`. |
| ✅ **L.2** | PR #44 | Track-API: `GET /api/tracks`, `GET /api/tracks/:id`, `GET /api/tracks/:id/background`. Weltall migriert aus Snapshot. 12 Backend-Tests. |
| ✅ **L.3** | PR #44 | Frontend-Integration: `trackLoader.js`, `useServerTracks` Hook. SetupScreen + TrackManager + RaceHistory nutzen combined list. Geometry-Caching in localStorage. 14 Tests. |
| ✅ **L.4** | PR #44 | Offline-Cache: `trackCache.js` — Background-Bilder als data-URLs, 3 MB-Limit mit LRU-Eviction, Quota-Guard. `getTrackBackgroundUrl` offline-aware. 6 Tests. |
| ✅ **L.5** | PR #44 | Write-Path: POST/PUT/DELETE + Background-Upload Endpunkte (Server). TrackEditor async-Save zum Server, Retry-UI bei Server-not-reachable. Migration beim ersten Connect (localStorage Custom-Tracks → Server, Marker). Cache-Cleanup: gelöschte Server-Tracks werden aus localStorage+Background-Cache entfernt. TrackManager Edit öffnet TrackEditor (/track-editor?load=), Delete ruft API. Server-Badge entfernt. 10 MB Bild-Limit. +23 Frontend-Tests, +16 Backend-Tests. |
| ✅ **L.6-Bug1** | PR #44 | Edit-Konsistenz: Edit öffnet jetzt für ALLE Track-Typen (Default, Local, Server) das Metadaten-Modal. Im Modal "Edit Geometry" / "Draw Geometry"-Button navigiert zum Track-Editor. +8 Tests. |
| ✅ **L.6-Bug2** | PR #44 | Geometry-Index-Sync: `cacheTrackGeometry` registriert Server-Geometrien jetzt in `racearena:trackGeometries:index` via `registerInIndex`. `removeCachedTrackData` deregistriert via `unregisterFromIndex`. Dadurch erscheinen Server-Geometrien im Modal-Dropdown + "📐 Edit Geometry"-Button korrekt. Edit-Geometry-Button in Button-Row ohne marginLeft:auto. +7 Tests. |
| ✅ **L.6-Bug2-UX** | PR #44 | Edit-Modal UX: Edit-Geometry-Button unter Track-Geometry-Dropdown (nicht in Action-Row). Effects-Anzeige entfernt; Hinweis "Background image and effects are managed in the Track Editor" ergänzt. Action-Row enthält nur noch Save/Cancel. +5 Tests. |
| ✅ **L.6-VIS** | PR #44 | Track-Editor Sichtbarkeits-Verbesserung (Iter 2): A1 — 60% schwarzer Overlay. A2 — Linien Magenta (#FF00FF) statt Hellblau. A3 — Weiße Outline hinter jeder Linie (outline 5–6px, Farbe 3–4px). A4 — Width-Boundaries 1→3, Center-Line + Curves 3→4. A5 — Kontrollpunkte weiß/dunkel unverändert. `drawStaticScene` in `trackEditorDraw.js` (Testbarkeit). +18 Tests. |
| ✅ **L.6-BgBug** | PR #44 | Bild-Upload resettet Strecke: `handleBgUpload` löschte `centerPoints`/`innerPoints`/`outerPoints` wenn Bild-Dimensionen von Editor-Welt abwichen. Fix: Reset-Block + `window.confirm`-Dialog entfernt — Dimensionsänderung übernommen, Strecke bleibt erhalten. +1 Regression-Test. |
| ✅ **L.7-Bug2** | PR #62 | Default-Tracks ohne Geometrie: Alle 5 Default-Tracks (Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit) hatten `geometryId: null` — nie spielbar. Alle 5 Geometrien im Track-Editor gezeichnet und als Server-JSON + Background-Images committed (2026-05-02). Tracks bleiben weiter editierbar. |
| ⏳ **L.8-Hybrid** | planned | Hybrid-Konzept: Default-Tracks sollen "offline-first" funktionieren (ohne Backend). Aktuell sind Default-Tracks Metadaten-only in Code, Server-Tracks vollständig auf Backend. Wenn Backend nicht erreichbar, sind Custom-Tracks nicht spielbar. Diskutiert 2026-04-29. |
| ⏳ **L.9-Status** | planned | Server-Verbindungsstatus sichtbar in UI: Anzeige ob Backend erreichbar ist (grüner/roter Punkt oder ähnliches), damit User weiss warum Custom-Tracks nicht laden. Diskutiert 2026-04-29. |

> ⚠️ **Vor VPS-Deployment Auth nachrüsten!** Aktuell hat jeder Browser-Besucher volle Schreib-Rechte auf alle Tracks (kein Auth auf Write-Endpunkten). Phase 5 muss JWT/Auth vor Go-Live implementieren. |

---

## Hot — next PR

### 1 — Kamera-Phase + RaceScreen-Refactor 🔜 Hot — Konzept ✅ (PR #60) — Implementation startet mit PR-A1

**Konzept-Doku-Sprint vollständig abgeschlossen. PR #60 gemergt 2026-05-03.**
Authoritative Spezifikation in `docs/CAMERA_DIRECTOR.md` (13 Sektionen, alle §13.2-Fragen UI-1–UI-8 beantwortet).

**3 strukturelle Bugs identifiziert** (empirisch aus Code-Analyse):
- **Bug A** (Garden Path P1): OVERVIEW-Pan ist ein No-Op — World-Edge-Clamp forciert offsetX/Y=0 wenn zoom=1 (`CameraDirector.js:178-183`)
- **Bug B** (River Run P2): Zoom-Inversion auf großen Open-Tracks — LEADER_ZOOM zoomt raus statt rein (effZoom=1.5×0.298=0.447 < OVERVIEW=1.5)
- **Bug C** (River Run P3): `openTrackPanTarget` nutzt alle Racer statt Focus-Group — zeigt Pulk-Mitte statt Spitze

**Q-25 Root Cause identifiziert und Lösung beschlossen:**
- `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` in `defaults.js:112` → Fix: `maxScale=10.0`
- Space Sprint bei ~131 px/s (Referenz), Renndauer ~144s
- Open-Tracks: Duration-Slider im Setup-Screen, finishT dynamisch aus Strecken-Physik

**Camera-Regie-Philosophie beschlossen (TENDENZ-LOGIK, nicht Constraint-System):**
LEADER_ZOOM als Default-Tendenz, Spitzengruppen-Duelle triggern BATTLE_ZOOM (minGapInSpitzengruppe),
Sprite-Korridor [min, max] als harte Camera-Constraints, OVERVIEW Random-Jitter [15s–25s].
N=4–100 mitgedacht; Spitzengruppe = clamp(round(N×0.1), 3, 10). Parallelverweis: D7d.

**Sub-PR-Plan (9 PRs):**
- ✅ PR-A1: Q-25-Fix (maxScale=10) + Duration-Slider + finishT für Open-Tracks (2026-05-03)
- ✅ PR-A2-Diagnose: Lese-PR → `docs/SPEED_REFACTOR_ANALYSIS.md` (kein Code-Change) (2026-05-03)
- ✅ PR-A2: Speed-Pipeline-Architektur-Umbau — `computeRaceBaseSpeed`, speedScaleFactor entfernt, Closed-Track Duration-Slider (Model D), SpeedScaleSection entfernt (2026-05-03). **Fix-Commit 2026-05-04:** speedMultiplier-Normalisierung + spreadMinFactor (E1+E2) — Browser-Verifikation ausstehend.
- PR-B: Camera-Bug-Fixes (Bug A+B+C)
- PR-C: RaceScreen-Split (Q-7 Refactor, kein Behavior-Change)
- PR-D: Camera-State-Machine (OVERVIEW Random-Jitter, Spannungs-Stärke-Logik, findBattleCandidate)
- PR-E: Sprite-Korridor [min+max] + Tag-Visibility Iter 1 (B-UX1) + Dev-Panel-Sliders beider Werte
- PR-F: Dev-Panel Camera-Tunables + HUD-Overlay
- PR-G: UI-Bugs (Cancel Race + Fullscreen API)

Vorgehen: PR-A1 → PR-A2-Diagnose → PR-A2 → PR-B → PR-C → PR-D → PR-E → PR-F → PR-G.

---

### TLH — Track Lifecycle Hybrid — TLH-1 ✅ TLH-2 ✅ Track-Delete-Safeguards ✅ → TLH-3 ⏳ zurückgestellt

Drei konzeptionelle Probleme wurden beim Versuch Default-Track-Geometrien zu zeichnen aufgedeckt (User-Browser-Test 2026-05-01, Daten-Verlust-Bug):

1. "Draw Geometry"-Button öffnet blank Track-Editor ohne Preset-Kontext → erstellt neuen unverbundenen Track
2. Backend-PUT ignoriert Client-geometryId (`existing.geometryId` hartcodiert) → Geometrie-Link wird beim Speichern gebrochen
3. Track-Delete löscht assoziierte Geometrie via `removeCachedTrackData` ohne Verwendungs-Prüfung
4. Default-Tracks existieren nur als Code-Konstanten, nicht als Server-Records → UI-Flow für sie funktioniert nicht

**TLH-1 — Backend-Fixes + Migration (Sub-PR 1) ✅**
- ✅ Server-Boot-Migration: 5 Default-Tracks als Server-Records angelegt (idempotent via One-Shot-Marker `.tlh1-defaults-migrated`)
- ✅ PUT `/api/tracks/:id`: `geometryId` vom Client übernehmen wenn im Body vorhanden; sonst `existing.geometryId` behalten
- ✅ DELETE + `removeCachedTrackData`: Geometrie wird NIE automatisch gelöscht — nur Background-Cache
- ✅ Auto-Backup: bei jedem PUT/POST nach `server/data/tracks-backups/YYYY-MM-DD/HH-MM-SS-mmm-<id>.json`
- ✅ atomicWriteJson OneDrive-Fallback: renameSync-Fehler → direktes writeFileSync
- ✅ 10 neue Backend-Tests (geometryId ×3, backup ×3, default-seed ×4), 1 neuer Client-Unit-Test

**TLH-2 — UI-Flow + Cleanup (Sub-PR 2) ✅**
- ✅ Edit-Modal: Geometry-Dropdown durch Status-Anzeige ersetzt ("Geometry: drawn (XX pts)" / "Geometry: not yet drawn" + "Draw/Edit Geometry"-Button)
- ✅ Track-Editor: Two-mode — Load mode (`?load=<id>`) zeigt "Editing: X" ohne Name-Input, New mode zeigt "New Track" mit Name-Input
- ✅ Track-Editor Load-Path: Zwei-Pfad-Load — (1) Geometry-Cache, (2) direkter Server-Track-State für `geometryId: null`-Tracks
- ✅ Track-Editor Save-Path: Load mode → PUT mit geometryId-Generierung bei First-Draw; New mode → POST
- ✅ 17 neue Unit-Tests (12 TrackEditor.loadmode.test.jsx + 5 netto TrackManager.test.jsx)

**TLH-2 Post-Merge Bug-Fixes (Branch-Erweiterung nach Browser-Test)**
- ✅ F2: `hasGeo` las `innerPoints.length` (immer 0 dank `toSummary`-Strip) → jetzt `geometryId != null` + `pointCount` via erweitertem `toSummary`
- ✅ F4: Track-Editor öffnete scrolled to canvas (kein Scroll-Reset bei Navigation) → `window.scrollTo(0,0)` on mount + `scrollIntoView` bei `serverError`
- ✅ F1-revised: Save in Load-Mode war blockiert wenn kein Background → Background nur in New-mode required; Load-mode immer speicherbar
- ✅ Lesson 39 + 40 in LESSONS.md dokumentiert
- ✅ F2-Folge: `autoMaxRacers` in `handleEdit` nutzte `isServer ? track` als EditorShape-Input → crash (TypeError: `undefined.length`) weil `toSummary` `innerPoints` strippt. Fix: immer geometry cache statt server summary. L39 um Audit-Pattern ergänzt.

**Track-Delete-Safeguards (PR #58) ✅**
- ✅ "Remove background"-Button im Track-Editor (neben Background-Upload, erscheint wenn Bild geladen ist)
- ✅ `DELETE /api/tracks/:id/background` Endpoint — entfernt nur das Bild, lässt Track-Record intakt
- ✅ `DELETE /api/tracks/:id` gibt 403 für Default-Tracks (`isDefault: true`) — verhindert versehentliches Löschen
- ✅ `migrateDefaultTracks()` läuft bei jedem Boot (idempotent) — stellt fehlende Default-Records wieder her
- ✅ React key=null Fix in TrackManager Geometrie-Select
- ✅ Background-Image useEffect Race Condition Fix (L43) — cancelled-Flag verhindert stale onerror-Callbacks

**TLH-3 — Code-Fallback + Status-Banner + Export (Sub-PR 3) ⏳ zurückgestellt nach Kamera-Phase**
- Frontend Lade-Reihenfolge: Server → Cache → Code-Bundle (`defaultTracks.js`)
- Code-Bundle initial mit leeren Geometrien (Bootstrap)
- Status-Banner wenn Code-Bundle-Modus aktiv: "Server unavailable — showing default tracks (limited functionality)"
- Export-Button im Dev-Screen: schreibt aktuelle Server-Tracks als JSON-Snapshot (User committet manuell)

> **Reihenfolge wichtig:** TLH-1 macht System sicher (Backup + keine Daten-Verlust-Bugs), TLH-2 macht es benutzbar (korrekter UI-Flow), TLH-3 macht es resilient (Offline-Fallback). TLH-3 wurde nach Kamera-Phase zurückgestellt. Siehe `docs/TRACK_LIFECYCLE.md` für vollständige Spec.

### 1a — Default-Tracks zeichnen ✅ Abgeschlossen 2026-05-02

Alle 5 Geometrien gezeichnet und im Track Editor gespeichert:
- ✅ Dirt Oval
- ✅ River Run
- ✅ Space Sprint
- ✅ Garden Path
- ✅ City Circuit

Zusätzlich: Weltall (Custom-Track) bereits vorhanden.

- **D7d** — 100-Racer-Performance (Spatial-Grid, smarter Camera, LOD) — zurückgestellt hinter Kamera-Phase

---

## Ready — spec existiert, Konzept beschlossen

- **Visual Racer Effects** — Surface-Class-driven trail system. Vier Sub-PRs:
  - ✅ **VRE-1** — Foundation: 4 generator modules (`particle`, `cloud`, `splash`, `line`), 9 default Surface Classes, registry with override-resolution, `/api/surface-classes` Backend-API (CRUD, atomic writes), `surfaceClassLoader.js` cache, `surfaceClassApi.js` service layer. 64 Frontend + 24 Backend Tests. Kein UI, keine Race-Integration.
  - ✅ **VRE-2** — Surface-Class Editor im Dev-Screen. Master-Detail-Layout: Klassenliste mit Default/Modified/Custom-Badges links, animierter Live-Preview-Canvas + Generator-Config-Editor rechts. `SurfaceClassManager.jsx`, `SurfaceClassPreview.jsx`, `useSurfaceClasses.js`. 36 neue Unit-Tests + 31 neue e2e-Tests (Smoke + UX-Verifikation). 1084 Unit + 183 e2e Tests gesamt.
  - ✅ **VRE-3** — Racer/Track-Verknüpfung: `surfaceClasses` auf SpriteRacerType + `getSurfaceClasses()`, alle 12 Racer-Types mit Klassen, surfaceClasses in TUNABLE_FIELDS + CONFIG_SNAPSHOT, `filterRacerTypesForTrack()` in registry.js, surfaceClasses auf DEFAULT_TRACKS + Server-Migration, Pill-Multi-Select UI in RacerEditModal + TrackManager, SetupScreen-Filter + Surface-Hint. 1134 Frontend + 60 Backend Tests. 2 Playwright-Specs (Smoke + UX-Verifikation) geschrieben.
  - ✅ **VRE-4** — Race-Integration: `trailResolver.js` mit `resolveTrailEmitter()`. RaceScreen dispatcht Trail über Emitter pro Racer; Heimat-Trail-Fallback wenn kein Match. `trackSurfaceClasses` in raceData. 14 neue Unit-Tests + Playwright-Specs.

---

## Erledigte Items (Phase-Abschlüsse)

| Item | PR | Beschreibung |
|---|---|---|
| ✅ **D3.5.1** | #13 | SpriteRacerType config-driven base class, tintSpriteWithMask |
| ✅ **D3.5.2** | #15(?) | Horse/Duck/Snail → SpriteRacerType migriert, `_createTrail` entfernt |
| ✅ **D3.5.3** | #16 | 9 neue Racer Types (Elephant, Dragon, Snake, Giraffe, Buggy, Motorbike, Plane, F1, Rocket) |
| ✅ **B-7** | #17 | Dev-Screen UI-Drift: Code-Registry als Single Source of Truth, racerTypeOverrides-Map |
| ✅ **B-8** | #17 | SetupScreen Footer/Pills Emoji-Mapping: aus getRacerType().getEmoji() statt hardcodierter Map |
| ✅ **W3** | #17 | Session-only Racer-Override-Selector im Setup-Track-Tab, filtert deaktivierte Types |
| ✅ **B-9** | #17 | Test-3.1-Filter: Override-Selector zeigt nur aktive Types |
| ✅ **Q-1 bis Q-5** | #17 | Dead-Exports, ungenutzte Imports, TODO-Tags, JSON.parse-Hygiene, File-Headers |
| ✅ **D9** | #19 | Race-Engine-Speed-Refactor: speedMultiplier wirkt auf Race-Speed, explizite Lap/Time-Wahl, dynamische Ziellinie für Open-Tracks, Auslauf-Verhalten, 2s Result-Delay, 22 Playwright e2e Tests. Master `dad3300`. |
| ✅ **D3.5.5** | #21 | Per-Type-Tuning-UI im Dev-Screen: 6 Felder (speedMultiplier, displaySize, basePeriodMs, leaderRingColor, leaderEllipseRx, leaderEllipseRy) live-apply via Edit-Modal. CONFIG_SNAPSHOT, normalizeOverrideMap (Legacy-Migration), InfoTooltip-Komponente. 678 Unit + 36 e2e Tests. Master `2d76bc3`. |
| ✅ **D10** | #23 | Track-Größen-Variabilität + Auto-Sprite-Skalierung + Bild-First-Workflow. worldWidth/worldHeight automatisch aus Bild-Dimensionen (naturalWidth/naturalHeight). Hart-Limit 8000×4096. Image required to save. Dimension-Mismatch-Dialog. TrackEditor Zoom+Pan. trackWidth variabel. Auto-Sprite-Scaling Formel. Alle 8 Anforderungen (A1-A8) erfüllt. Hotfix `13a2dd2` (🏁 Default-Icon). 694 Unit + 75 e2e Tests. Master `13a2dd2`. |
| ✅ **B-Wave** | #25 | UX-Polish-Sweep: B-1 (player-group load StrictMode-Fix), B-3 (winners max 5→20), B-10 (InfoTooltip auto-boundary), B-11 (display-size tooltip), B-12 (maxPlayers konfigurierbar), B-13 (Language-Selector entfernt), B-14 (TrackManager-Hint), B-15 (alle deutschen UI-Strings → Englisch). 694 Unit + 88 e2e Tests. Master `697e081`. |
| ✅ **B-16 + B-17** | #26 | Große Tracks: B-16 CameraDirector adaptive Zoom (zoom = worldW/VIEW_W, max 6), B-17 Track-Speed-Scaling (baseSpeed ÷ pathLengthPx/referencePathLength). pathLengthPx bei Track-Save berechnet + Migration für bestehende Geometrien. SpeedScaleSection im Dev-Screen. 719 Unit + 100 e2e Tests. Master `7cdde15`. |
| ✅ **fix/list-tracks** | #27 | Root-Cause-Fix für Large-Track-Render-Bug: `listTracks()` gab worldWidth/worldHeight nicht zurück → bsX=1.0 → nur ~549px sichtbar auf 6000px-World. A1: 2-Zeilen-Fix in trackStorage.js. A2: Migration-IIFE in storage.js. 723 Unit + 103 e2e Tests. |
| ✅ **fix/camera-polish + Q-14** | #28 | CameraDirector: adaptive zoom (zoom=worldW²/VIEW_W/worldW, clamp 0.15–6), clampOffset 2-anchor-Formel, top-3-Focus. cameraZoomFactor-Invariante (REFERENCE_CAMERA_ZOOM/cam.zoom, nur Closed Tracks). BaseSpeedSection im Dev-Screen: tunable min/max baseSpeed, Spread-Preview, 2-Lap-Gap-Schätzung. Q-14 lapUtils SoT: DEFAULT_BASE_SPEED_CONFIG aus defaults.js, private Konstanten, optionale Params auf openTrackFinishT/estimatedSecondsPerLap. camera-polish-ux-verification.spec.js (31 Tests, permanent). 759 Unit + 157 e2e Tests. Master `750d826`. |
| ✅ **D11** | #30 | Racer Behavior: Soft Avoidance + Drafting. Asymmetric avoidance (trailer yields, leader holds lane) — eliminates symmetric force cancellation in packs. Proximity-scaled force, configurable avoidanceDistance/lateralForce/maxLateral. Speed brake for adjacent racers. Drafting boost for close followers in same lane. World-edge camera clamp (Befund 2, prevents black strips at high zoom). Camera-zoom-aware sprite scaling for open tracks: `computeOpenTrackCameraZoomFactor()` produces identical on-screen size as closed-track reference at any zoom. Pixel-floor logic: `minVisiblePixels` (default 32) ensures sprites never vanish on wide tracks. All 5 params tunable in Dev-Screen. 809 Unit + 183 e2e Tests. Master `d46cab2`. |
| ✅ **D7a** | #33 | Proportional Sprite Scaling + Min-Size-Floor + relative Zoom-Ratios + Label-Skalierung. cameraZoomFactor + REFERENCE_CAMERA_ZOOM entfernt. computeRenderDisplayScale als Single-Source der Render-Pipeline: max(proportionalScreenPx, minTargetScreenPx). CameraDirector: overviewZoom × ratio pro State (LEADER:1.4, BATTLE:1.6, COMEBACK:1.3). Label-Skalierung mit effZoom. Q-15 strukturell adressiert: 4 Skalierungs-Faktoren → 1 Pipeline. 808 Unit + 183 e2e Tests. Master `a49baa0`. |
| ✅ **D7a-Plus** | #35 | Per-Type minTargetScreenPx mit Live-Vorschau. Slider + animierter Canvas-Preview im RacerEditModal. Global-Default-Hint, Modified-Badge, Reset. getEffectiveMinTargetScreenPx() in Render-Pipeline. Scroll-Indikator-Follow-up (Fade-Gradient). CC Smoke-Test Convention: Verifikations-Quellen-Klarstellung. Master `27cba65`. |
| ✅ **D7b** | #37 | Lane-frei: physicalY-System ersetzt currentLaneY/targetLaneY vollständig. physicalY ∈ [-1,+1] (0=Centerline). Home-Force-Spring, anisotrope Avoidance-Distanz (t×tWeight + physicalY×yWeight), Cone-Drafting (Weltkoordinaten), Speed-Brake für Adjacent-Racer, Soft-Repulsion + Hard-Clamp. 13 neue/angepasste tunable Parameter im Dev-Screen. Lane-Code hart entfernt. Unit + e2e Tests aktualisiert. |
| ✅ **D7b-fix B1+B2** | #37 | Folge-Commit auf Branch D7b: B1 — Start-Spread: Racer starten gleichmäßig verteilt über [-startSpreadRange, +startSpreadRange] statt alle bei physicalY=0 (computeStartPhysicalY, neuer Dev-Screen-Parameter). B2 — yDiff=0 Edge-Case: wenn beide Racer gleiche physicalY haben, wird keine Lateral-Force angewendet (prevents alle Trailers fliegen in Richtung +1). |
| ✅ **D7b-fix B3** | #37 | Anti-Stacking (Kraft-Imbalance, war als D11-Befund im Backlog): Avoidance-Forces werden durch sqrt(neighborCount) normalisiert — verhindert Boundary-Clinging bei 20+ Racers wo lineare Force-Akkumulation die restoring forces überwältigte. Neue Defaults: homeForceStrength=0.04 (+122%), softRepulsionStrength=0.10 (+67%), lateralForce=0.010 (−33%). |
| ✅ **D7c** | #39 | Reihen-Start + Speed-Bonus + Track-Capacity. `computeRowLayout` (shuffled, row assignments), `computeRowPhysicalY` (full-spread auch für letzte unvollständige Reihe), `computeSpeedBonus` (Faktor 1.0 = pole-neutral), `computeMaxRacersDefault` (auto-Capacity aus pathLengthPx). Closed tracks: hintere Reihen starten bei negativem t (tPos wraps korrekt). Open tracks: t=0 durch EditorShape-Clamp. `maxRacers` auf Track mit "modified"-Badge. Setup-Screen: Reihen-Hinweis + Capacity-Warnung. Dev-Screen Row-Start-Section: 4 Parameter. 21 Unit + 6 e2e Tests. |
| ✅ **D7c-fix** | #39 | Bug: `trackWidth`-Metadata (140 px, kalibriert für 1280px-Welt) gab `racersPerRow=1` auf großen Welten (6000px) → alle 20 Racer in Einzelreihen → einzelne vertikale Linie. Fix Phase 1: `EditorShape.getActualTrackWidth()` misst echte geometrische Breite (Median, gecached). Fix Phase 2 (D7c-fix-v2): Formel komplett in World-Pixel-Raum: `computeRacersPerRow(geometricTrackWidthPx, spriteWorldSizePx)` = `floor(2×geometricW/spriteWorldSizePx)`. `trackWidth`-Feld komplett aus Track-Datenmodell entfernt — TrackManager-Dropdown (100/140/200/280/360) entfernt, `raceData.trackWidth` und `track.trackWidth` aus allen Callers entfernt, Storage-Migration: alte Einträge ignorieren. `autoSpriteScale` nutzt jetzt `getActualTrackWidth()` statt Metadata. Fix Phase 3 (D7c-fix-v3): Floating-Point-Rundungsfehler in catmullRom-Spline (~10⁻¹³) führte zu `racersPerRow=11` statt 12 wenn Rocket-displaySize-Override (50px) Auto-Scale deaktiviert → `getActualTrackWidth()` rundet Median jetzt per `Math.round()`. |
| ✅ **D7c-Phase4** | #39 | Drei Fixes auf feat/d7c-row-start-with-speed-bonus. (1) **startSpreadRange 0.7→0.95**: Default erhöht; Migration: gespeicherter Wert 0.7 wird beim Laden auf 0.95 aktualisiert. (2) **Formel-Mismatch beheben**: `computeRacersPerRow` erhält jetzt `effectiveWidth = geometricWidth × startSpreadRange` — Packing-Berechnung stimmt jetzt mit der tatsächlichen Racer-Verteilung überein (vorher: Formel nutzte 100% der Streckenbreite, Verteilung aber nur 70%). Angepasst in RaceScreen, TrackManager, SetupScreen. (3) **Open-Track-Layout**: a) Assembly-Bereich — Reihen starten bei `t = (totalRows − rowIndex) × deltaT_per_row` statt negativem t → kein Clamp mehr, alle Reihen innerhalb der Strecke. b) `runoutZone`-Parameter (Default 0.05) — Finish-Linie auf Open-Tracks bei `1.0 − runoutZone` (tunable im Dev-Screen). Kein `openTrackFinishT` mehr in RaceScreen. Setup-Screen zeigt Finish-% aus runoutZone. Migration für startSpreadRange + runoutZone-Validation in loadRaceBehaviorConfig. |

- **B-6** (speedMultiplier-Bug) — subsumed by D9. War als separater Fix geplant,
  vollständig durch D9-Refactor behoben (PR #19).

---

## Planned — braucht Spec

### Phase D (Racer-Design-Weiterentwicklung)

- **D3.6** — File-Reorganisation: `racer-types/` → `racer-configs/` (39 Files).
  Trennt Konfiguration von Engine-Code. Eigene kleine PR.
- **Surface Zones** (Folge-Phase nach Visual Racer Effects) — lokale Surface-Class-Überschreibungen
  innerhalb eines Tracks (z.B. Pfütze auf Asphalt, Schlammloch auf Erde). Track-Editor bekommt
  Zonen-Zeichenwerkzeug; `EditorShape` bekommt `getZonesAtPosition(t, offset) → Zone[]`. Geplant
  sobald Visual Racer Effects abgeschlossen.
  *(Früher als D6 / RTE-Reservierung geführt — `rteDefinitions`-Platz auf SpriteRacerType wird
  durch Surface Classes ersetzt; alter Platzhalter wird in VRE-1 aufgeräumt.)*
- ✅ **D7a** — Proportional Sprite Scaling + Min-Size-Floor + Zoom-Ratios + Label-Skalierung (PR #33, master `a49baa0`)
- ✅ **D7a-Plus** — Per-Type minTargetScreenPx mit Live-Vorschau (PR #35, master `27cba65`)
- ✅ **D7b** — Lane-frei: physicalY ersetzt Lane-System (PR #37)
- ✅ **D7c** — Reihen-Start + Speed-Bonus + Track-Capacity (PR #39)

- 🔜 **D7d** — 100-Racer-Performance
  - Spatial-Grid für O(N) Avoidance-Performance
  - Smartere Camera für Pulk-Übersicht
  - LOD oder ähnliche Strategien für 100 Racer
- **D8** — Voller Racer-Config-Editor: Coats-Edit-UI, alle Felder, Sprite-Wechsel-UI.
  Baut auf Override-Pattern (B-7) auf.

### Phase B (Wiring-Lücken + UX-Verbesserungen)

- **B-UX1** — Name-Tag-Readability (Iteration 1, umzusetzen in PR-E der Kamera-Phase)
  - Spec in `docs/CAMERA_DIRECTOR.md §6.3`
  - Top-N Tags sichtbar (N = `tagVisibleCount`, Default = spitzengruppe = clamp(round(N×0.1), 3, 10))
  - `tagVisibleCount` als Dev-Panel-Slider
  - Kein "eigener Spieler" (Project-Principle 3) — alle Racer gleichberechtigt
  - Alle anderen Racer ohne Tag

- **B-UX1-Iter2** — Name-Tags state-abhängige Strategie (Iteration 2, nach Iteration 1)
  - Spec in `docs/CAMERA_DIRECTOR.md §6.4`
  - OVERVIEW: nur Top-3 oder keine Tags; LEADER_ZOOM: Spitzengruppe prominent;
    BATTLE_ZOOM: beteiligte Racer prominent; Zoom-Out: Anti-Overlap wenn Platz
  - User möchte das explizit umsetzen sobald Iteration 1 stabil läuft
  - Priorität: nach PR-E (Kamera-Phase)

- **B-UX-Pause** — Pause+Resume Race
  - Während laufendem Rennen Pause-Button → rAF-Loop einfrieren, Resume → fortsetzen
  - Explizit NICHT Teil der Kamera-Phase (PR-G implementiert nur Cancel Race mit Confirm-Dialog)
  - Priorität: nach Kamera-Phase

- **B-UX-ManualFocus** — MANUAL_FOCUS: Spielleiter-Klick auf Racer sperrt Camera
  - Canvas-Click-Handler + Hit-Test Racer + neuer MANUAL_FOCUS-State in CameraDirector
  - Lock-UI-Indikator, Unlock-Mechanismus (click empty / button)
  - Aufwand: ~150–200 LOC, neuer Camera-State
  - Priorität: nach Kamera-Phase (zu komplex für diese Phase)

- **B-UX2** — Dev-Screen Cleanup + Hilfe-Screen
  - Dev-Screen ist über D9/D10/D11/D7a/D7b auf 30+ tunable Werte gewachsen.
    User-Befund: „die einzelnen Werte sind schwer einzuordnen, mit Tooltips alleine wenig Mehrwert"
  - Geplant (Spec steht noch aus):
    - Strukturelle Neuordnung: Race-Behavior-Slider zusammen, Visual-Slider zusammen, etc.
    - Hilfe-Modal pro Sektion mit ausführlicheren Erklärungen (mehr als InfoTooltip)
    - Optional: Beginner / Advanced-Trennung (Power-User sehen alles, Standard nur Key-Values)
    - Optional: Visuelle Vorschau-Komponenten in Sektionen wo sinnvoll (analog D7a-Plus)
  - Priorität: mittel-hoch. Soll vor D8 (voller Racer-Config-Editor) angegangen werden,
    damit D8 nicht in eine ungeordnete Dev-Screen-Umgebung gebaut wird.

- **B-UX3** — Detaillierte Variablen-Dokumentation
  - User-Befund: „ich brauche eine Erklärung die mehr aussagt als der Tooltip — was bewirken
    all die Variablen im Dev-Screen wirklich"
  - Geplant (Spec steht noch aus):
    - Pro Sektion ein eigenes Doc-File oder zentrales DEVSCREEN_REFERENCE.md unter docs/
    - Pro Parameter: Name, Typ, Default, Range, Wirkung in einfachen Worten,
      Beispiel-Werte für verschiedene Use-Cases (kleines Race vs. großes Race, etc.)
    - Diagramme/Bilder wo sinnvoll (z.B. comfortThreshold visuell)
    - Cross-References zu ARCHITECTURE.md-Pipeline-Sektionen
  - Priorität: zusammen mit B-UX2 — Hilfe-Screen kann die Doku referenzieren oder einbinden.
    Kann auch als reiner Doku-Sprint vor B-UX2 entstehen, dann nutzt B-UX2 die Inhalte.

- **B-UX4** — Sprite-Größen-System überarbeiten
  - Aktuelles Verhalten: per-Type-Overrides (z.B. `displaySize: 50` für Rocket) sind absolute
    Werte und deaktivieren die Auto-Skalierung vollständig (`displaySizeScale = 1`). Das hat zur
    Folge dass Sprites auf schmalen Strecken zu groß wirken können — und war einer der Faktoren
    die während D7c-Diagnose zu einem falschen `racersPerRow`-Wert führten.
  - Alternative Konzepte (Spec steht noch aus):
    - **(a) Override als Multiplikator** über der Auto-Skalierung (z.B. `displaySizeOverride: 1.25` = 25% größer als Auto)
    - **(b) Gemischter Modus mit Min/Max-Grenzen** — Auto-Scale läuft, Override setzt Ober-/Untergrenze
    - **(c) Komplettes Re-Design des Tunable-Konzepts** — Auto und absoluter Wert als wählbare Modi
  - Aufgekommen während D7c-Diagnose (2026-04-29). Braucht Vision-Diskussion bevor Spec geschrieben wird.
  - Priorität: niedrig. Aktuell kein UX-Blocker — nur bei deliberatem displaySize-Override + großer Strecke sichtbar.

- **B-2** — TrackSelector: Custom-Track-Verhalten bei fehlender Geometry
- **B-4** — Branding Profiles auf Race/Result-Screen anwenden (UI vorhanden, Wiring fehlt)
- **B-5** — System Backup/Restore/Reset: End-to-End verifiziert (UI-only bisher)


### Phase Q (Quality-Hygiene)

**Refactor-Brocken (hohe strukturelle Schuld — werden bei nächsten Phasen angegangen):**

- **RaceScreen/index.jsx splitten** (Q-7) — >1000 LOC. Wird mit der Kamera-Phase angegangen: RaceScreen ist ohnehin Hauptarbeitsgebiet dort. Prerequisite für spätere Race-Features.
- **TrackEditor.jsx splitten** (Q-6) — >1200 LOC. Prerequisite für Surface Zones (Track Editor muss Zonen-Zeichenwerkzeug aufnehmen). Eigene PR vor Surface Zones.
- **Dual-Particle-System konsolidieren** — `dustParticles` (Heimat-Trail, globaler Pool) + `surfaceParticles` (VRE, per-Racer) als separate Render-Pfade. Konsolidierung nach Surface Zones sinnvoll, wenn dritter Emitter-Typ (Zone-Effekte) hinzukommt.
- **Q-19 — TrackEditor.effects.test.jsx flaky** — intermittierend in Full-Suite-Parallel-Run. Root cause: globaler FileReader-Mock-Scope-Konflikt. Fix: Spy-Scope prüfen oder Isolations-Test. Niedrige Priorität, kein Blocker.

- **Q-6** — TrackEditor.jsx Split-Refactor. Pre-existing, eigene PR.
- **Q-7** — RaceScreen/index.jsx Split-Refactor. Nach D9 auf **1032 LOC** gewachsen —
  Priorität für Refactor gestiegen. Pre-existing, eigene PR.
- **Q-8** — Watch-List: TrackManager.jsx (535 LOC) und BrandingProfiles.jsx (330 LOC).
  Bei nächster Erweiterung Refactor erwägen.
- **Q-9** — Watch: `racer-types/index.js` wächst auf 286 LOC — Kandidat für Aufspaltung
  (Override-API vs. Registry vs. Boot-Logik). Kein Problem heute, beobachten.
- **Q-10** — Watch: `RacerEditModal.jsx` bei 302 LOC — bereits 75% der 400-LOC-Schwelle.
  Im Auge behalten bei D8 (voller Config-Editor).
- **Q-26** — Default-Tracks ohne Backgrounds (Erstinstallation)

  Code-Defaults in `defaults.js` haben kein `backgroundImage`-Feld. Bei laufendem Server werden sie
  automatisch ins Backend migriert (`migrateDefaultTracks()` läuft idempotent bei jedem Boot) und
  User-bearbeitete Server-Versionen ersetzen sie vollständig (`loadAllTracks()` filtert Code-Defaults
  heraus wenn Server die gleiche ID liefert).

  **Problem nur bei:** Erstinstallation oder gelöschtem Server-State. Dann sieht User die
  Code-Defaults ohne Backgrounds. Im normalen Betrieb (Server je einmal gestartet) sieht User
  ausschließlich Server-Tracks mit Backgrounds. Verifiziert in PR-A2.8-Diagnose.

  **Lösungs-Vorschlag (wenn gewünscht):** Statische Default-Backgrounds als Code-Assets in
  `client/public/track-backgrounds/<track-id>.png` mit relativen URLs in `defaults.js`. Greift
  nur wenn Server-Tracks fehlen.

  **Aufwand:** Mini-PR, 2–3h inkl. Asset-Erstellung. **Schwere:** Niedrig — betrifft nur
  Erstinstallation.

- **Q-11** — `reader.onerror` fehlt in `handleBgUpload` (TrackEditor.jsx)
  FileReader-Fehler werden stumm geschluckt; nur `img.onerror` fängt Lade-Fehler.
  Defensiv-Hygiene, niedrige Priorität.
- **Q-20** — Track-Editor Load-Mode: Background-Upload ist jetzt optional (F1-revised Fix). Aber wenn ein Load-mode-Track kein Background hat und der User speichert ohne eines hochzuladen, bleibt die Race-Engine ohne Background-Bild. Erwägen: Hinweis-Text "No background — race will show empty canvas" wenn Track in Load-Mode ohne Background gespeichert wird.
- **Q-12** — localStorage-Quota bei großen data-URL-Bildern
  Tracks speichern jetzt data-URLs (1–5 MB möglich für hochauflösende Bilder).
  Kein Quota-Handling implementiert. Info-level, kein akuter Block.
- **Q-16** — CORS Wildcard auf allen Backend-Endpunkten
  `app.use(cors())` ohne Origin-Einschränkung — jeder Browser-Tab kann auf alle API-Write-Endpunkte
  zugreifen (POST/PUT/DELETE Tracks + Surface Classes). Bewusst akzeptiert für Lokal-Betrieb.
  Fix: `cors({ origin: 'http://localhost:3000' })` für Dev, Env-Var für VPS.
  **Priorität: VPS-Phase / Phase 5.** Kein akuter Blocker für Single-User-Lokal-Betrieb.
  *(Deep-Audit 2026-05-01, Severity: HIGH — akzeptiert für local-only)*

- **Q-17** — Fehlende `reader.onerror` Handler in SystemSettings.jsx und TrackEditor.jsx
  `FileReader.onload` Handler sind ohne `onerror`-Pendant. Fehler beim Einlesen (korrupte Datei,
  Berechtigungsproblem) werden stumm ignoriert. Q-11 ist spezifisch für TrackEditor-Hintergrundbilder;
  Q-17 erweitert auf SystemSettings JSON-Import. Niedrige Priorität — kein Datenverlust, nur schlechte
  UX (keine Fehlermeldung bei Import-Fehler).
  *(Deep-Audit 2026-05-01, Severity: LOW)*

- **Q-18** — RaceScreen-Integrations-Test-Infrastruktur
  RaceScreen hat 0 Unit-Tests trotz Kern-Spiellogik (Finish-Detection, Phase-Transitions, Storage-Write).
  Blocker: Canvas + rAF in jsdom erfordert `vi.stubGlobal` + Mock-rAF. Vorschlag: 3 minimale Tests
  (Session-Load → Race-Init, Finish-Detection, sessionStorage-Write bei Race-Ende).
  *(Deep-Audit 2026-05-01, Severity: MEDIUM — in TEST-RaceScreen-Backlog bestätigt)*

- ✅ **Q-19** — TrackEditor.effects.test.jsx flaky — **gefixt PR #55 (2026-05-01)**
  Root cause: `fetch`-Stub aus `trackLoader.test.js` leckte in TrackEditor-Worker via fehlenden
  `vi.unstubAllGlobals()` in `beforeEach`. Fix: `vi.unstubAllGlobals()` in `beforeEach` added.
  *(Entdeckt PR #50, gefixt PR #55)*

- **Q-20** — Server-Test-Backup-Cleanup nicht Crash-resistent (TLH-1)
  `afterAll` in `tracks.test.js` räumt Backup-Files über `rmSync` auf, aber nur bei normalem
  Testlauf-Ende. Bei Ctrl+C / Crash vor `afterAll` bleiben alle Backup-Files im realen
  `server/data/tracks-backups/` liegen. Während TLH-1-Entwicklung wurden ~41 Orphan-Files
  erzeugt. Möglicher Ansatz: `process.on('exit', cleanup)` + `process.on('SIGINT', cleanup)` als
  Guard, oder Tests auf temporäres Verzeichnis umstellen (DATA_DIR Override per Env-Var).
  *(Entdeckt TLH-1 2026-05-01, Severity: LOW)*

- **Q-21** — `.json.tmp`-Orphans bei OneDrive-EPERM-Fallback (TLH-1)
  `atomicWriteJson` schreibt erst `.tmp`, dann `renameSync`. Schlägt `renameSync` fehl (OneDrive
  EPERM), greift Fallback `writeFileSync` auf die Zieldatei — danach soll `unlinkSync(tmp)` die
  `.tmp`-Datei löschen. Schlägt auch das fehl, bleibt eine `.json.tmp`-Datei liegen. `findBackupFiles`
  sucht nach `endsWith('.json')` und findet `.json.tmp` nicht — solche Orphans werden nie aufgeräumt.
  Möglicher Ansatz: Server-Boot-Routine scannt `tracks-backups/` nach `*.json.tmp` und löscht sie,
  oder `findBackupFiles` schließt `.json.tmp` ein.
  *(Entdeckt TLH-1 2026-05-01, Severity: LOW)*

- **Q-22** — TrackEditor Frontend-Draft-Snapshot
  localStorage-Snapshot der gezeichneten Geometrie (Key: `racearena:trackEditor:draft:<serverId>` für
  Load-Mode, `racearena:trackEditor:draft:new` für New-Mode). Wird bei jeder Punkt-Aktion oder alle
  ~30s geschrieben, nach erfolgreichem Server-Save gelöscht. Schützt vor Datenverlust bei stillen
  Server-Fehlern (F3-Szenario aus TLH-2 Browser-Test) oder Browser-Crash. Aufwand: klein (~50 LOC).
  Eigene kleine PR.
  *(Aufgekommen aus TLH-2 Browser-Test 2026-05-02, Severity: MEDIUM)*

- **Q-24** — isDefault-Immutabilität via PUT explizit testen
  Audit ergab: `PUT /api/tracks/:id`-Handler setzt `isDefault: existing.isDefault` explizit und überschreibt damit jeden Client-gesendeten Wert — `isDefault` ist damit de facto immutable via API. Aber es gibt keinen expliziten Backend-Test der dieses Verhalten schützt. Falls jemand den PUT-Handler umstrukturiert, könnte dieser Schutz unbemerkt wegfallen. Eigener Backend-Test-Case: "PUT mit `isDefault: false` auf Default-Track verändert `isDefault` nicht".
  *(Aufgekommen bei Audit im City-Circuit-Bug-Fix 2026-05-02, Severity: LOW)*

- **Q-23** — Two-Step-Save: keine differenzierte Fehlermeldung bei Background-Upload-Fehler
  Track-Save ist zweistufig: Schritt 1 `PUT /api/tracks/:id` (Geometrie), Schritt 2 `POST /api/tracks/:id/background`
  (Bild-File). Wenn Schritt 1 erfolgreich und Schritt 2 fehlschlägt, sieht der User einen generischen
  Save-Fehler — nicht „Geometrie gespeichert, Background nicht". Das Background-File bleibt in diesem
  Fall dauerhaft ohne Upload. Mögliche Lösungen: (a) pro Stufe eigene Fehlermeldung mit „Retry Background"-
  Option, (b) Atomic-Save (rollback Geometrie wenn Background fehlschlägt). Aufwand: klein–mittel.
  *(Aufgekommen 2026-05-02 nach Background-Diagnose dirt-oval, Severity: MEDIUM)*

- ✅ **Q-25** — Open-Track zu schnell / Renndauer zu kurz (PR-A1)
  Root Cause (empirisch widerlegt Canvas-Hypothese): `DEFAULT_SPEED_SCALE_CONFIG.maxScale=4.0` in
  `defaults.js` cappte Space Sprint bei 4.0 statt dem physikalisch korrekten ssf=9.886. Space Sprint
  lief bei 323 px/s statt ~131 px/s und dauerte ~58s statt ~144s.
  Fix: `maxScale=10.0` + Duration-Slider für Open-Tracks + `openTrackFinishT`-Integration in RaceScreen.
  Canvas-Koordinatensystem-Hypothese widerlegt — Space Sprint Geometrie nutzt Welt-Koordinaten 256..5707,
  nicht Canvas-gebunden. *(Behoben in PR-A1, 2026-05-03)*

- **Q-13** — Sprite-Frame-Animation ruckelt bei großen Sprites
  Auf 6000-Tracks werden Sprites sehr groß — Frame-Wechsel wirken ruckartig.
  **Strukturelle Lösung in PR-E der Kamera-Phase:** `maxTargetScreenPx` als oberer Camera-Zoom-Limit
  verhindert dass Camera nah genug ranzoomt um Sprites "Animation-ruckartig" groß werden zu lassen.
  Spec in `docs/CAMERA_DIRECTOR.md §6.2`. Q-13 kann nach PR-E + Browser-Verifikation als erledigt
  markiert werden. Fallback-Lösungen (basePeriodMs-Skalierung, Frame-Interpolation) erst wenn
  maxTargetScreenPx-Kalibrierung nicht ausreicht.

- ✅ **Q-15** — Visual-System Architectural Debt — durch D7a (PR #33) strukturell adressiert.
  4 multiplikative Skalierungs-Faktoren auf eine Pipeline (computeRenderDisplayScale) reduziert.
  cameraZoomFactor + REFERENCE_CAMERA_ZOOM eliminiert. Closed/Open-Track-Math-Pipelines durch
  einheitliche effZoom-basierte Berechnung vereinheitlicht.

### Phase V (Verification-Sprint)

Systematischer Test der noch unverifizierten Bereiche:

- **V-1** — PlayerSetup B-1 Loading-saved-lists-Bug
- **V-2** — TrackSelector B-2 Custom-Track-Verhalten
- **V-3** — Result-Screen Winner-Count B-3 (konfigurierbar?)
- **V-4** — Branding Profiles B-4 (laut alter ROADMAP done, Reality-Check sagt offen)
- **V-5** — System Backup/Restore/Reset B-5 (Datenverlust-Risiko)
- **V-6** — Mehrere Dev-Panel-Sektionen — visuelle Verifikation
- **V-7** — Physics + Collision-Verhalten — Smoke-Test
- **V-8** — localStorage-Persistenz Edge-Cases — Stress-Test
- **V-9** — Fullscreen-Toggle — funktional unverifiziert

### Phase T (Tooltip-Retrofit)

Alle bestehenden Dev-Screen-Felder die ohne Label unklar sind. Nutzt `InfoTooltip`-Komponente
aus D3.5.5.

- **T-1** — RaceDefaults-Felder
- **T-2** — TrackManager-Felder
- **T-3** — BrandingProfiles-Felder
- **T-4** — SystemSettings-Felder

---

## Reihenfolge nächste Schritte

1. ✅ **B-Wave** (B-1, B-3, B-10..B-15) — PR #25, master `697e081`
2. ✅ **B-16 + B-17** — PR #26, master `7cdde15`
3. ✅ **fix/camera-polish + Q-14** — PR #28, master `750d826`
4. ✅ **D11** Racer Behavior — PR #30, master `d46cab2`
5. ✅ **D7a** Proportional Sprites + Zoom + Labels — PR #33, master `a49baa0`
6. ✅ **D7a-Plus** Per-Type Sprite-Mindest-Größe + Live-Vorschau — PR #35, master `27cba65`
7. ✅ **D7b** Lane-frei + physicalY-Avoidance — PR #37
8. ✅ **D7c** Reihen-Start + Speed-Bonus + Track-Capacity — PR #39
9. 🔜 **D7d** — 100-Racer-Performance
10. ✅ **Visual Racer Effects** (VRE-1 → VRE-2 → VRE-3 → VRE-4) — Master `c857a7e`
11. ✅ **Quick-Wins Post-VRE** (Server-vitest v4, Backend-Validation, window.alert, JSON.parse, Doc-Drift)
12. ✅ **Error Boundary** (Deep-Audit HIGH-Finding adressiert — Top-Level React Error Boundary, PR #51)
13. ✅ **Race Track Lights** — Boundary-Linien + Lane-Fill entfernt, ersetzt durch leuchtende Track-Lights. `trackLights`-Feld im Datenmodell, Track-Editor-UI, Server-Migration, `trackLights.js`-Modul mit Animation-Styles (steady / sequence / sync_pulse / random_flash). Cache-Bug (L37) + CSS-Fix im selben PR.
   - **L37-Drift-Risiko (nicht in PR #52 gefixt):** `buildTrackFromEditorState` in `trackEditorSave.js` enthält eine explizite Ausgabe-Feld-Liste — das ist dort intentionell (Form kennt nur eigene Felder), aber neue Editor-Features brauchen explizites Update dieser Funktion. Kein akuter Bug, aber bei künftigen Features daran erinnern.
14. ✅ **TLH-1 — Backend-Fixes + Migration** — geometryId client-authoritative, Delete bewahrt Geometrie, Auto-Backup, Default-Track-Seed-Migration. PR #55.
14b. ✅ **TLH-2 — UI-Flow + Cleanup** — Edit-Modal Geometry-Status-Display, Track-Editor Two-Mode (Load/New), Two-Path-Load, geometryId-First-Draw. PR #56/#57, squash-gemergt.
14c. ✅ **Track-Delete-Safeguards + Background-Race-Condition-Fix** — Remove-Background-Button, DELETE-Background-Endpoint, isDefault-403-Guard, migrateDefaultTracks idempotent, useEffect cancelled-Flag (L43). PR #58, squash-gemergt `fc5690f`.
14a. ✅ **Default-Tracks zeichnen** — Alle 5 Geometrien gezeichnet und gespeichert (2026-05-02): Dirt Oval, River Run, Space Sprint, Garden Path, City Circuit.
14d. ✅ **PR-A2.5 — Visual Race Naturalness** — arc-length-uniform spline resampling (`catmullRomSpline` default) + jitter amplitude ±5% relative (`race_baseSpeed * 0.05`). T-uniform max/min ratio was 1.36–7.72×; after fix ≤1.01×. +28 tests (1314 total). UX-vision "constant pixel velocity" from 2026-05-03 browser test addressed. UX-1…UX-4 (Setup-Screen layout/settings) remain open in UX_FOLLOWUPS.md — planned for B-Wave after Camera-Director phase.
15. 🔜 **Kamera-Phase + RaceScreen-Refactor** — CameraDirector überarbeiten, RaceScreen aufsplitten (Q-7). Konzept-Doku-Sprint zuerst. Q-25 (Strecken-Canvas-Größe) als Parallel-Überlegung im Konzept-Sprint.
16 (verschoben). **TLH-3 — Code-Fallback + Status-Banner + Export** — zurückgestellt nach Kamera-Phase.
16. **Surface Zones** — Folge-Phase nach VRE. TrackEditor-Zonen-Werkzeug, `getZonesAtPosition()`.
17. **B-UX-Phase** — Dev-Screen Cleanup (B-UX2/B-UX3), Hilfe-Modal. Vor D8.
18. **Backup/Export** (B-5) — UI vorhanden, Wiring fehlt.
19. **D3.6** File-Reorganisation (`racer-types/` → `racer-configs/`, 39 Files)
20. **D8** — Voller Racer-Config-Editor (nach B-UX-Phase)
21. **Phase V** (Verification-Sprint)
22. **Phase T** (Tooltip-Retrofit — nutzt InfoTooltip aus D3.5.5)
23. **Phase 5** VPS-Deployment — ⚠️ Auth (JWT) zuerst

---

## Known Limitations — bewusst akzeptiert

- **SEC-2 — Race-State-Manipulation via React DevTools** *(audit-2026-04-29, Severity: High — wird akzeptiert)*
  `g.current.racers` im RaceScreen lebt als mutabler `useRef`. Technisch versierte Gäste können via
  React DevTools / `__reactFiber$` auf Racer-Objekte zugreifen und Felder wie `t`, `baseSpeed`,
  `finished` direkt setzen. `Object.freeze()` schützt nur direkte Properties und ist durch DevTools
  bypassbar. **Client-seitig nicht vollständig behebbar.** Vollständige Absicherung erfordert
  Server-Architektur mit Race-Replay oder kryptographischer Signierung (Phase 5).
  Die anderen drei Security-Findings (SEC-1 r.t-Clamp, SEC-3 sessionStorage-Validation,
  SEC-4 File-Size-Guard) wurden in PR cleanup/security-and-crash-protection adressiert
  (Audit-Bericht: docs/internal/audit-2026-04-29.md).

- **TEST-RaceScreen** — RaceScreen-Integrationstest für `isOpenTrack`-Propagation *(Priorität: niedrig)*
  Erfordert Canvas + `requestAnimationFrame`-Mocking in jsdom. Aktuell kein Test-Infrastruktur für den
  Animations-Loop vorhanden. Wurde als TODO in `RaceScreen/index.jsx` geführt und in Cleanup PR 2/3
  (audit-2026-04-29.md) ins Backlog überführt.

---

## Parking Lot — Zukunft / unklarer Scope

- Phase 5: Server, Leaderboard, Socket.IO (Architektur geplant, kein Code)
- Phase 7: Custom Sprite-Upload via Dev-Panel; dynamischer SpriteRacerType aus JSON
- i18n (Englisch + Deutsch Basis) — App-Sprache ist Englisch, Doku kann beides
- Multi-Tenant-Isolation (pro-Organizer Track-Sets und Branding)
- Mobile / Tablet Responsive-Tuning
