# RaceArena — Racer Data Model

**Status:** Source-of-truth for W2 refactor. Established 2026-04-25. Updated 2026-04-26: D3.5.1 SpriteRacerType base class merged; D6 rteDefinitions field reserved on SpriteRacerType.

---

## Konzepte

**Racer Type** — ein Sprite-Type mit eigenem Look, Animation, Coats, Stats. Code-definierte Klasse (z.B. `HorseRacerType`, `DuckRacerType`). Aktuell 5 Stück: Horse, Duck, Rocket, Snail, Car. Phase 7: dynamisch erweiterbar via Sprite-Upload im Dev-Panel.

**Track** — eine Renn-Strecke mit Geometry, Background-Image, Effekten, Default-Duration etc. Hat einen **vorgeschlagenen Racer Type** als "Default" — wird beim Setup übernommen, wenn der Spielleiter nichts überschreibt.

**Race** — ein konkretes laufendes Rennen mit einem Track und einem (genau einem) Racer Type. Alle Spieler im Race nutzen denselben Racer Type — keine Mischung. Spieler unterscheiden sich durch Coat (Farbvariante) und Name.

**Player** — eine Person die mitspielt. Hat einen Namen. Bekommt im Race einen Coat zugewiesen. Hat **keinen** eigenen Racer Type — der kommt vom Race.

---

## Beziehungen

```
Track  --(suggests-default)-->  Racer Type
Race   --(uses-exactly-one)-->  Racer Type
Race   --(runs-on)----------->  Track
Race   --(has-many)---------->  Player (jeder bekommt einen Coat)
```

### Was es NICHT gibt

- **Keine harte Track ↔ Racer Type Bindung.** Es ist nur ein Suggestion. River Run "schlägt Duck vor", aber Spielleiter kann Pferd wählen.
- **Kein "Associated Track" am Racer Type.** Das aktuelle Feld in `RacerTypeManager.jsx` ist konzeptionell falsch und wird entfernt. Racer Types sind track-unabhängig.
- **Kein Racer Type am Player.** Player gehört zu einem Race, das Race hat den Type. Player kennt seinen Type erst über das Race.

---

## Setup-Flow (Spielleiter-Sicht)

1. Spielleiter wählt Track (z.B. River Run)
2. Setup zeigt: "Default Racer: 🦆 Duck" — mit Möglichkeit zu ändern
3. Spielleiter belässt Default oder wählt anderen Type (z.B. 🐎 Horse)
4. Spielleiter fügt Player-Namen hinzu
5. Race startet: alle Player bekommen denselben Racer Type, je einen Coat per Hash-Zuweisung

---

## Persistenz

| Storage Key | Inhalt |
|---|---|
| `racearena:tracks` | Array von Tracks. Jeder Track: `id, name, description, geometryId, defaultRacerTypeId, defaultDurationSec, defaultWinners, color, ...` |
| `racearena:racerTypes` | Array von Racer-Type-Cosmetics. Felder: `id, name, emoji, color, isActive` (kein "associatedTrack"). Phase 7: zusätzlich `spriteUrl, frameCount, basePeriodMs, displaySize`. |
| `racearena:trackGeometries:<id>` | Track-Geometry-Records (unverändert von Phase 2.5) |
| `racearena:trackGeometries:index` | Geometry-Index (unverändert) |
| `sessionStorage activeRace` | Race-Setup-Daten für Setup → Race-Screen Übergang. Felder: `trackId, racerTypeId, players[], duration, winners` |

---

## Code-Architektur

### Single Source of Truth: `racerTypeId`

Im gesamten Code wird das Feld `racerTypeId` verwendet. **Nicht** `racerId`, **nicht** `racerType`, **nicht** `type`. Eine Schreibweise.

Werte: `'horse' | 'duck' | 'rocket' | 'snail' | 'car'` (Phase 7: dynamisch erweiterbar).

### SpriteRacerType (D3.5)

`SpriteRacerType` is a config-driven base class. Consumers call `new SpriteRacerType(config)` — no subclassing. Required config fields:

| Field | Typ | Beschreibung |
|---|---|---|
| `id` | string | Unique racer type identifier |
| `spriteUrl` | string | Path to sprite sheet PNG |
| `frameCount` | number | Animation frame count |
| `basePeriodMs` | number | Base animation period at speed 1.0 |
| `displaySize` | number | Bounding box size in px |
| `coats` | `{id, name, tint}[]` | Color variant definitions |
| `trailFactory` | function | `(x, y, speed, angle, frame) => particle[]` |

Optional: `frameWidth/Height` (default 128), `silhouetteScale`, `speedMultiplier`, `baseRotationOffset`, `tintMode` (`'multiply'` or `'mask'`), `maskUrl` (required when `tintMode='mask'`), `fallbackColor`, `rteDefinitions`.

Horse, Duck, and Snail will migrate from handwritten classes to `SpriteRacerType` config objects in D3.5.2.

### Racer Type Registry

`client/src/modules/racer-types/index.js` exportiert:

- `RACER_TYPES` — Map von `racerTypeId` zu Racer-Type-Klasse
- `getRacerType(racerTypeId)` — gibt die Klasse zurück, mit Fallback auf den ersten Type
- `listRacerTypes()` — Array aller registrierten Types
- `COATS_BY_TYPE` — Map von `racerTypeId` zu Coats-Liste (für RaceScreen-Coat-Assignment)

Hinzufügen eines neuen Sprite-Types in Phase 7 = neue Klasse implementieren + im Registry eintragen + (später) UI für Sprite-Upload.

### Track Default Lookup

`SetupScreen` und `TrackManager` lesen aus `localStorage['racearena:tracks']`. Jeder Track hat **genau ein** Feld für den Default Racer: `defaultRacerTypeId`. Kein `racerId`, kein `racerTypeId` als zweites Feld.

### Race Init

RaceScreen liest aus `sessionStorage['activeRace']`:
- `racerTypeId` → bestimmt welche Racer-Klasse für alle Spieler verwendet wird
- `players[]` → bekommen alle denselben Type, jeweils einen Coat per Hash

---

## Racer-Track-Effects (D6 — reserviert)

`SpriteRacerType` speichert ein optionales `rteDefinitions`-Array (Default: `[]`). Es wird akzeptiert, gespeichert und über `getRteDefinitions()` exposiert — aber in der aktuellen Codebase nicht ausgewertet. Phase D6 führt einen `RteManager` in RaceScreen ein, der diese Definitionen ausliest und pro Racer Partikel-Effekte spawnt (z.B. Schlamm-Spray, Wasser-Splash). Schema wird im D6-Spec definiert.

## Phase-7-Vorausschau

Wenn Sprite-Upload kommt:

1. Dev-Panel UI bekommt "+ New Racer Type"-Button
2. User lädt Sprite-Sheet hoch + füllt Metadaten (Name, Frame-Count, Coats)
3. Server speichert Sprite unter `client/public/assets/racers/<custom-id>.png` (oder serverseitiger Storage)
4. `racearena:racerTypes` bekommt einen neuen Eintrag mit `id`, `spriteUrl`, etc.
5. Registry liest dynamisch — keine Code-Klassen mehr für custom Types nötig (nur eine generische `SpriteRacerType`-Basisklasse)

Voraussetzung dafür ist W2 — das Datenmodell muss schon jetzt so gebaut werden dass dynamisches Erweitern möglich ist.

---

## Was W2 bereinigt

| Problem heute | Soll-Zustand |
|---|---|
| `racerId` und `racerTypeId` parallel | Nur `racerTypeId`, eine Schreibweise |
| TrackManager hat zwei Dropdowns | Ein Dropdown: "Default Racer Type" |
| RacerTypeManager hat "Associated Track" | Feld entfernt |
| `COATS_BY_TYPE` hardcoded in RaceScreen | In `racer-types/index.js` registriert |
| `RaceScreen.jsx:103` liest `racerTypeId \|\| 'horse'` | Liest `racerTypeId` aus single source |
| W1-Spread-Flip in SetupScreen | Wird obsolet (kein konfliktierender Default mehr) |

---

## Was W2 NICHT macht

- **Keine UI-Änderungen am Setup-Screen** für Override-Funktionalität (das ist W3 oder eigener Sub-Step). Heute übernimmt Setup nur den Track-Default. W2 stellt sicher dass das funktioniert.
- **Keine Phase-7-Sprite-Upload-Implementierung.** Architektur muss es ermöglichen, aber UI kommt später.
- **Keine Änderungen an Tests jenseits der notwendigen Anpassungen** für Felderumbenennung.

---

## Annahmen die wir prüfen müssen (W2.1 Diagnose)

1. Wird `racerId` an irgendeiner Stelle als "kein Racer-Type, sondern Player-Identifier" verwendet? Falls ja, andere Bedeutung — Vorsicht beim Renaming.
2. Wie genau ist `COATS_BY_TYPE` in RaceScreen verkabelt? Lässt sich das in das Registry verschieben ohne Bruch?
3. Welche Tests prüfen das alte Datenmodell als korrektes Verhalten? Diese Tests werden umgeschrieben, nicht entfernt.
4. Gibt es Sub-Komponenten (z.B. Quick-Test-Flow), die das Datenmodell anders durchsuchen als Setup → Race?

W2.1 beantwortet diese Fragen vor jeder Code-Änderung.
