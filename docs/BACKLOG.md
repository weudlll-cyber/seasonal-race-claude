# RaceArena — Backlog

Living list. See ROADMAP.md for phase context and completion status.
Items ranked by urgency within each bucket. ✅ = done, 🔜 = next, ⏳ = waiting on dependency.

---

## Hot — next PR

- 🔜 **D10** — Track-Größen-Variabilität + Auto-Sprite-Skalierung. Doc-Sprint ist gemergt.
  Spec bereit (TEIL 2 des Doppel-Auftrags 2026-04-26).

---

## Ready — spec existiert oder trivial

- **D3.5.4** — Trail-Tuning: visuelle Nachzieh-Qualität pro Type verfeinern. Unabhängig
  von D10.

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

- **B-6** (speedMultiplier-Bug) — subsumed by D9. War als separater Fix geplant,
  vollständig durch D9-Refactor behoben (PR #19).

---

## Planned — braucht Spec

### Phase D (Racer-Design-Weiterentwicklung)

- **D10** — Track-Größen-Variabilität + Auto-Sprite-Skalierung (geplant, NÄCHSTE Phase)

  User-Entscheidung: User möchte bald lange Tracks designen.

  **Track-Dimensionen frei wählbar in beide Achsen:**
  - `worldWidth` und `worldHeight` werden pro Track konfigurierbar
  - Hart-Limit: 16000 × 8192 (Browser-GPU-Grenze)
  - Soft-Empfehlung in UI: bis 8000 × 1080 bewährt
  - `worldWidth` existiert schon als Config-Feld, `worldHeight` evtl. neu
  - Code-Sweep: alle hartkodierte 1280/720-Werte und impliziten Annahmen finden

  **TrackEditor mit robustem Zoom + Pan:**
  - Pinch/Mausrad-Zoom + Zoom-to-Cursor
  - Zoom-Level-Anzeige + "Fit to screen"
  - Pan im eingezoomten Zustand
  - Pfad-Punkte präzise bei jedem Zoom-Level editierbar
  - Heute existiert wahrscheinlich Pan/Zoom in Grundzügen — D10 macht es robust

  **trackWidth wird variabel:**
  - Existiert als Config-Feld, heute überall hart auf 140 (Sweep nötig)
  - TrackEditor-UI für trackWidth-Einstellung beim Design

  **Auto-Sprite-Skalierung:**
  - Formel: `auto_factor = clamp((trackWidth / racerCount) / referenceValue, minScale, maxScale)`
  - Auto-Faktor ist Default — Spielleiter-Override aus D3.5.5 gewinnt wenn vorhanden
  - referenceValue, minScale, maxScale via Dev-Screen tunbar (D3.5.5-Pattern)
  - Berechnung beim Race-Start einmal, gecached für Race-Dauer

  **Track-Bild-Standard:** JPEG, max ~2 MB pro Datei empfohlen

  **Test-Strategie:** Smoke-Tests mit 2-3 Beispiel-Tracks unterschiedlicher Größen

- **D11** — Racer Behavior: Soft Avoidance + Drafting (geplant, nach D10)

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
- **D7** — Camera-Director Polish: Schwellwerte konfigurierbar, Zoom-Verhalten bei
  variablen Speeds (D9-Abhängigkeit), Spread-Handling bei großer Speed-Varianz.
- **D8** — Voller Racer-Config-Editor: Coats-Edit-UI, alle Felder, Sprite-Wechsel-UI.
  Baut auf Override-Pattern (B-7) auf.

### Phase B (Wiring-Lücken)

- **B-1** — PlayerSetup: Laden gespeicherter Gruppen-Listen (Ladebutton vorhanden, Verhalten unklar)
- **B-2** — TrackSelector: Custom-Track-Verhalten bei fehlender Geometry
- **B-3** — Result-Screen Winner-Count konfigurierbar (aktuell hardcoded 3)
- **B-4** — Branding Profiles auf Race/Result-Screen anwenden (UI vorhanden, Wiring fehlt)
- **B-5** — System Backup/Restore/Reset: End-to-End verifiziert (UI-only bisher)

### Phase Q (Quality-Hygiene)

- **Q-6** — TrackEditor.jsx (1006 LOC) Split-Refactor. Pre-existing, eigene PR.
- **Q-7** — RaceScreen/index.jsx Split-Refactor. Nach D9 auf **940 LOC** gewachsen —
  Priorität für Refactor gestiegen. Pre-existing, eigene PR.
- **Q-8** — Watch-List: TrackManager.jsx (346 LOC) und BrandingProfiles.jsx (330 LOC).
  Bei nächster Erweiterung Refactor erwägen.
- **Q-9** — Watch: `racer-types/index.js` wächst auf 286 LOC — Kandidat für Aufspaltung
  (Override-API vs. Registry vs. Boot-Logik). Kein Problem heute, beobachten.
- **Q-10** — Watch: `RacerEditModal.jsx` bei 302 LOC — bereits 75% der 400-LOC-Schwelle.
  Im Auge behalten bei D8 (voller Config-Editor).

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

1. 🔜 **D10** Track-Größen-Variabilität + Auto-Sprite-Skalierung (nächster konkreter Schritt)
2. **D11** Racer Behavior (Soft Avoidance + Drafting)
3. **D3.5.4** Trail-Tuning
4. **D3.6** File-Reorganisation (`racer-types/` → `racer-configs/`, 39 Files)
5. **D6**, **D7**, **D8**
6. **Phase B** (B-1 bis B-5 verbleibend)
7. **Phase Q-6**, **Q-7** (+ Q-9/Q-10 watch)
8. **Phase V** (Verification-Sprint)
9. **Phase T** (Tooltip-Retrofit — nutzt InfoTooltip aus D3.5.5)

---

## Parking Lot — Zukunft / unklarer Scope

- Phase 5: Server, Leaderboard, Socket.IO (Architektur geplant, kein Code)
- Phase 7: Custom Sprite-Upload via Dev-Panel; dynamischer SpriteRacerType aus JSON
- i18n (Englisch + Deutsch Basis)
- Multi-Tenant-Isolation (pro-Organizer Track-Sets und Branding)
- Mobile / Tablet Responsive-Tuning
