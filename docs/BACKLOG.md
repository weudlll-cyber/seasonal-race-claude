# RaceArena — Backlog

Living list. See ROADMAP.md for phase context and completion status.
Items ranked by urgency within each bucket. ✅ = done, 🔜 = next, ⏳ = waiting on dependency.

---

## Hot — next PR

- 🔜 **D7a-Plus** — Per-Type minTargetScreenPx mit Live-Vorschau (D3.5.5-Pattern)

---

## Ready — spec existiert oder trivial

- **D3.5.4** — Trail-Tuning: visuelle Nachzieh-Qualität pro Type verfeinern. Unabhängig von D10.

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
| ✅ **D7c-fix** | #39 | Bug: `trackWidth`-Metadata (140 px, kalibriert für 1280px-Welt) gab `racersPerRow=1` auf großen Welten (6000px) → alle 20 Racer in Einzelreihen → einzelne vertikale Linie. Fix Phase 1: `EditorShape.getActualTrackWidth()` misst echte geometrische Breite (Median, gecached). Fix Phase 2 (D7c-fix-v2): Formel komplett in World-Pixel-Raum: `computeRacersPerRow(geometricTrackWidthPx, spriteWorldSizePx)` = `floor(2×geometricW/spriteWorldSizePx)`. `trackWidth`-Feld komplett aus Track-Datenmodell entfernt — TrackManager-Dropdown (100/140/200/280/360) entfernt, `raceData.trackWidth` und `track.trackWidth` aus allen Callers entfernt, Storage-Migration: alte Einträge ignorieren. `autoSpriteScale` nutzt jetzt `getActualTrackWidth()` statt Metadata. |

- **B-6** (speedMultiplier-Bug) — subsumed by D9. War als separater Fix geplant,
  vollständig durch D9-Refactor behoben (PR #19).

---

## Planned — braucht Spec

### Phase D (Racer-Design-Weiterentwicklung)

- **D3.6** — File-Reorganisation: `racer-types/` → `racer-configs/` (39 Files).
  Trennt Konfiguration von Engine-Code. Eigene kleine PR.
- **D6** — Racer-Track-Effects (RTE): `rteDefinitions` auf SpriteRacerType ist reserviert.
  Braucht `RteManager` in RaceScreen und Schema-Spec. Per-Racer Partikel-Effekte
  durch Track-Zustand (Schlamm-Spray, Wasser-Splash etc.).
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

- **B-UX1** — Name-Tag-Readability bei dichten Pulks (aus D7b-Browser-Test)
  - Lane-frei erlaubt beliebige Y-Cluster → schwarze Namens-Tags überlappen in dichten Pulks,
    einzelne Namen nicht mehr lesbar
  - Lösungs-Ideen (Spec steht noch aus):
    - Tags bei LEADER_ZOOM / BATTLE_ZOOM ausblenden oder reduzieren
    - Nur Top-N sichtbare Spieler bekommen Tags (Rest kein Tag)
    - Anti-Overlap-Algorithmus: überlappende Tags vertikal stapeln
    - Tags in OVERVIEW-State kleiner, in Zoom-States größer
    - Hover/Click auf Spieler zeigt Namen prominent
  - Priorität: mittel. Race-Lesbarkeit leidet, aber kein Blocker für D7c.
    Empfehlung: nach D7c oder D7d angehen.

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

- **B-1** — PlayerSetup: Laden gespeicherter Gruppen-Listen (Ladebutton vorhanden, Verhalten unklar)
- **B-2** — TrackSelector: Custom-Track-Verhalten bei fehlender Geometry
- **B-3** — Result-Screen Winner-Count konfigurierbar (aktuell hardcoded 3)
- **B-4** — Branding Profiles auf Race/Result-Screen anwenden (UI vorhanden, Wiring fehlt)
- **B-5** — System Backup/Restore/Reset: End-to-End verifiziert (UI-only bisher)
- **B-10** — (reserviert für weitere Items aus letztem Sprint)
- **B-11** — (reserviert)
- **B-12** — (reserviert)
- **B-13** — (reserviert)

- **B-14** — TrackManager-Workflow für neuen Track verwirrend (Schwere: mittel)
  - User findet im "New Track"-Dialog keinen offensichtlichen Bild-Upload
  - "World Dimensions" zeigt "(Choose Geometry)" — User muss erst zum TrackEditor wechseln
    um Geometrie+Bild anzulegen
  - Lösung-Optionen: Link/Button zum TrackEditor direkt aus dem TrackManager-Dialog,
    oder direkter Upload im TrackManager
  - Workflow-Friction beim ersten Track-Anlegen, besonders für neue User

- **B-15** — i18n-Leak: deutsche Strings in englischer UI (Schwere: niedrig)
  - Konkret beobachtet: `(Geometrie wählen)` im TrackManager, `Track-Größe: W×H px`
    im TrackEditor, Confirm-Dialog auf Deutsch
  - **App-Sprach-Entscheidung: Englisch überall** (→ PROJECT-PRINCIPLES.md)
  - Maßnahme: alle deutschen Strings auf Englisch übersetzen + kompletter i18n-Sweep für
    versteckte deutsche Strings. Funktional kein Block, aber unsauber.


### Phase Q (Quality-Hygiene)

- **Q-6** — TrackEditor.jsx Split-Refactor. Pre-existing, eigene PR.
- **Q-7** — RaceScreen/index.jsx Split-Refactor. Nach D9 auf **940 LOC** gewachsen —
  Priorität für Refactor gestiegen. Pre-existing, eigene PR.
- **Q-8** — Watch-List: TrackManager.jsx (346 LOC) und BrandingProfiles.jsx (330 LOC).
  Bei nächster Erweiterung Refactor erwägen.
- **Q-9** — Watch: `racer-types/index.js` wächst auf 286 LOC — Kandidat für Aufspaltung
  (Override-API vs. Registry vs. Boot-Logik). Kein Problem heute, beobachten.
- **Q-10** — Watch: `RacerEditModal.jsx` bei 302 LOC — bereits 75% der 400-LOC-Schwelle.
  Im Auge behalten bei D8 (voller Config-Editor).
- **Q-11** — `reader.onerror` fehlt in `handleBgUpload` (TrackEditor.jsx)
  FileReader-Fehler werden stumm geschluckt; nur `img.onerror` fängt Lade-Fehler.
  Defensiv-Hygiene, niedrige Priorität.
- **Q-12** — localStorage-Quota bei großen data-URL-Bildern
  Tracks speichern jetzt data-URLs (1–5 MB möglich für hochauflösende Bilder).
  Kein Quota-Handling implementiert. Info-level, kein akuter Block.
- **Q-13** — Sprite-Frame-Animation ruckelt bei großen Sprites
  Auf 6000-Tracks mit Camera-Zoom-aware Sprite-Skalierung werden Sprites visuell
  sehr groß. Die Frame-Wechsel der Sprite-Animation (z.B. Pferd 16 Frames Lauf-
  Zyklus, basePeriodMs=800ms) werden dadurch deutlich sichtbar — wirken ruckartig
  statt smooth.
  Mögliche Lösungen:
  - basePeriodMs per Camera-Zoom skalieren (kürzere Period bei großen Sprites)
  - Sprite-Frame-Interpolation (Tweening zwischen Frames, komplexer)
  - Performance-Profiling falls Render-Last das Problem ist
  Wahrscheinlich Phase D7 (Visual Experience Architecture) zugehörig oder eigenes Q-Item.
  Niedrige Priorität — pragmatisch akzeptabel für aktuelle Use-Cases.

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
10. **D3.5.4** Trail-Tuning
11. **D3.6** File-Reorganisation (`racer-types/` → `racer-configs/`, 39 Files)
12. **D6**, **D8**
13. **Phase Q-6**, **Q-7** (+ Q-9/Q-10 watch)
14. **Phase V** (Verification-Sprint)
15. **Phase T** (Tooltip-Retrofit — nutzt InfoTooltip aus D3.5.5)

---

## Parking Lot — Zukunft / unklarer Scope

- Phase 5: Server, Leaderboard, Socket.IO (Architektur geplant, kein Code)
- Phase 7: Custom Sprite-Upload via Dev-Panel; dynamischer SpriteRacerType aus JSON
- i18n (Englisch + Deutsch Basis) — App-Sprache ist Englisch, Doku kann beides
- Multi-Tenant-Isolation (pro-Organizer Track-Sets und Branding)
- Mobile / Tablet Responsive-Tuning
