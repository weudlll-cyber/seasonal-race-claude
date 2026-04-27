# RaceArena — Backlog

Living list. See ROADMAP.md for phase context and completion status.
Items ranked by urgency within each bucket. ✅ = done, 🔜 = next, ⏳ = waiting on dependency.

---

## Hot — next PR

- 🔜 **D11** — Racer Behavior: Soft Avoidance + Drafting

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

- **B-6** (speedMultiplier-Bug) — subsumed by D9. War als separater Fix geplant,
  vollständig durch D9-Refactor behoben (PR #19).

---

## Planned — braucht Spec

### Phase D (Racer-Design-Weiterentwicklung)

- **D11** — Racer Behavior: Soft Avoidance + Drafting (geplant, nach B-Wave + B-16/B-17)

  Heute überlappen sich Racer ohne Interaktion — visuell unaufgeräumt. User-Beobachtung: stört im Race.

  **Soft Avoidance:** Racer in Nähe verschieben sich sanft, smooth interpoliert.

  **Drafting/Slipstream:** Verfolger im Windschatten bekommen leichten Speed-Boost.

  **Wichtig:** Macht Race-Dramatik aus weil alle Racer in einem Race denselben Type haben
  (gleiche speedMultiplier), Streuung kommt nur aus Random-baseSpeed. Soft Avoidance +
  Drafting heben die Race-Dramatik deutlich.

  Architektur-Vorbedingung: Lane-System von fest auf dynamisch umstellen. Tuning-Werte
  iterativ (evtl. Tuning-UI im D3.5.5-Pattern). Test-Strategie: Smoke-Test + visuelle
  Verifikation primär.

- **D3.6** — File-Reorganisation: `racer-types/` → `racer-configs/` (39 Files).
  Trennt Konfiguration von Engine-Code. Eigene kleine PR.
- **D6** — Racer-Track-Effects (RTE): `rteDefinitions` auf SpriteRacerType ist reserviert.
  Braucht `RteManager` in RaceScreen und Schema-Spec. Per-Racer Partikel-Effekte
  durch Track-Zustand (Schlamm-Spray, Wasser-Splash etc.).
- **D7** — Camera-Director Polish: Smooth Zoom-Transitions, Spread-Handling bei großer
  Speed-Varianz, konfigurierbare Director-Schwellwerte pro Track. Adaptive Zoom und
  clampOffset-Fix wurden in PR #28 (fix/camera-polish) umgesetzt; D7 fokussiert jetzt auf
  Transitions und verbleibende Director-Heuristiken.
- **D8** — Voller Racer-Config-Editor: Coats-Edit-UI, alle Felder, Sprite-Wechsel-UI.
  Baut auf Override-Pattern (B-7) auf.

### Phase B (Wiring-Lücken + UX-Verbesserungen)

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
  Wahrscheinlich Phase D7 (Camera-Director Polish) zugehörig oder eigenes Q-Item.
  Niedrige Priorität — pragmatisch akzeptabel für aktuelle Use-Cases.

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
4. 🔜 **D11** Racer Behavior (Soft Avoidance + Drafting)
5. **D3.5.4** Trail-Tuning
6. **D3.6** File-Reorganisation (`racer-types/` → `racer-configs/`, 39 Files)
7. **D6**, **D8**
8. **Phase Q-6**, **Q-7** (+ Q-9/Q-10 watch)
9. **Phase V** (Verification-Sprint)
10. **Phase T** (Tooltip-Retrofit — nutzt InfoTooltip aus D3.5.5)

---

## Parking Lot — Zukunft / unklarer Scope

- Phase 5: Server, Leaderboard, Socket.IO (Architektur geplant, kein Code)
- Phase 7: Custom Sprite-Upload via Dev-Panel; dynamischer SpriteRacerType aus JSON
- i18n (Englisch + Deutsch Basis) — App-Sprache ist Englisch, Doku kann beides
- Multi-Tenant-Isolation (pro-Organizer Track-Sets und Branding)
- Mobile / Tablet Responsive-Tuning
