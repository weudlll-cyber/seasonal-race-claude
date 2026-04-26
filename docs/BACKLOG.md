# RaceArena — Backlog

Living list. See ROADMAP.md for phase context and completion status.
Items ranked by urgency within each bucket. ✅ = done, 🔜 = next, ⏳ = waiting on dependency.

---

## Hot — next PR

- 🔜 **D9** — Race-Engine-Speed-Refactor. speedMultiplier wirkt linear auf Race-Speed.
  Explicit Lap/Time-Wahl für Spielleiter. Dynamische Ziellinie für Open-Tracks.
  Auslauf-Verhalten + 2s Result-Delay. Spec im PR-Body.

---

## Ready — spec existiert oder trivial

- ⏳ **D3.5.5** — Speed-UI im Dev-Screen (wartet auf D9-Merge). Zeigt speedMultiplier
  aller 12 Types im RacerManager. Slider + Preview.
- **D3.5.4** — Trail-Tuning: visuelle Nachzieh-Qualität pro Type verfeinern. Unabhängig
  von D9.
- **D10** — Track-Größen-Variabilität + lange Sprint-Tracks. Ermöglicht längere
  Open-Track-Races nach D9. Hebt die 1280px-Beschränkung.

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

- **B-6** (speedMultiplier-Bug) — subsumed by D9. War als separater Fix geplant,
  wird vollständig durch D9-Refactor behoben.

---

## Planned — braucht Spec

### Phase D (Racer-Design-Weiterentwicklung)

- **D3.6** — File-Reorganisation: `racer-types/` → `racer-configs/` (39 Files).
  Trennt Konfiguration von Engine-Code. Eigene kleine PR nach D3.5.5.
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
- **Q-7** — RaceScreen/index.jsx (886 LOC) Split-Refactor. Pre-existing, eigene PR.
- **Q-8** — Watch-List: TrackManager.jsx (346 LOC) und BrandingProfiles.jsx (330 LOC).
  Bei nächster Erweiterung Refactor erwägen.

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

Alle bestehenden Dev-Screen-Felder die ohne Label unklar sind:

- **T-1** — RaceDefaults-Felder
- **T-2** — TrackManager-Felder
- **T-3** — BrandingProfiles-Felder
- **T-4** — SystemSettings-Felder

---

## Reihenfolge nächste Schritte

1. 🔜 **D9** Race-Engine-Speed-Refactor (NÄCHSTER SCHRITT)
2. **D3.5.5** Speed-UI im Dev-Screen (wartet auf D9-Merge)
3. **D10** Track-Längen-Variabilität (wenn User lange Sprint-Tracks designen möchte)
4. **D3.6** File-Reorganisation (`racer-types/` → `racer-configs/`, 39 Files)
5. **D3.5.4** Trail-Tuning
6. **D6**, **D7**, **D8**
7. **Phase B** (B-1 bis B-5 verbleibend)
8. **Phase Q-6**, **Q-7**
9. **Phase V** (Verification-Sprint)
10. **Phase T** (Tooltip-Retrofit)

---

## Parking Lot — Zukunft / unklarer Scope

- Phase 5: Server, Leaderboard, Socket.IO (Architektur geplant, kein Code)
- Phase 7: Custom Sprite-Upload via Dev-Panel; dynamischer SpriteRacerType aus JSON
- i18n (Englisch + Deutsch Basis)
- Multi-Tenant-Isolation (pro-Organizer Track-Sets und Branding)
- Mobile / Tablet Responsive-Tuning
