# RaceArena — Racer Data Model

**Status:** Updated 2026-04-26 post D3.5.3 + B-7+B-8+W3 merges.
All 12 racer types are `SpriteRacerType` instances. Code registry is Single Source of Truth.

---

## Konzepte

**Racer Type** — ein Sprite-Type mit eigenem Look, Animation, Coats, Stats. Config-definierte
`SpriteRacerType`-Instanz (z.B. `HorseRacerType`, `DuckRacerType`). Aktuell 12 Stück.
Phase 7: dynamisch erweiterbar via Sprite-Upload im Dev-Panel.

**Track** — eine Renn-Strecke mit Geometry, Background-Image, Effekten, Default-Duration etc.
Hat einen **vorgeschlagenen Racer Type** als "Default" — wird beim Setup übernommen, wenn der
Spielleiter nichts überschreibt.

**Race** — ein konkretes laufendes Rennen mit einem Track und einem (genau einem) Racer Type.
Alle Spieler im Race nutzen denselben Racer Type — keine Mischung. Spieler unterscheiden sich
durch Coat (Farbvariante) und Name.

**Player** — eine Person die mitspielt. Hat einen Namen. Bekommt im Race einen Coat zugewiesen.
Hat **keinen** eigenen Racer Type — der kommt vom Race.

---

## Beziehungen

```
Track  --(suggests-default)-->  Racer Type
Race   --(uses-exactly-one)-->  Racer Type
Race   --(runs-on)----------->  Track
Race   --(has-many)---------->  Player (jeder bekommt einen Coat)
```

### Was es NICHT gibt

- **Keine harte Track ↔ Racer Type Bindung.** Es ist nur eine Suggestion. River Run "schlägt
  Duck vor", aber Spielleiter kann Pferd wählen.
- **Kein "Associated Track" am Racer Type.** Racer Types sind track-unabhängig.
- **Kein Racer Type am Player.** Player gehört zu einem Race, das Race hat den Type.

---

## Setup-Flow (Spielleiter-Sicht)

1. Spielleiter wählt Track (z.B. River Run)
2. Setup zeigt: "Default Racer: 🦆 Duck" — mit Möglichkeit zu ändern (W3 Override-Selector)
3. Spielleiter belässt Default oder wählt anderen Type (z.B. 🐎 Horse)
4. Spielleiter fügt Player-Namen hinzu
5. Race startet: alle Player bekommen denselben Racer Type, je einen Coat per Hash-Zuweisung

---

## 12 Racer Types — Config-Übersicht

| id | Emoji | frameCount | basePeriodMs | displaySize | speedMultiplier | tintMode |
|---|---|---|---|---|---|---|
| `horse` | 🐴 | 8 | 700 | 40 | 1.00 | multiply |
| `duck` | 🦆 | 8 | 700 | 36 | 0.85 | multiply |
| `snail` | 🐌 | 4 | 1500 | 35 | 0.30 | multiply |
| `elephant` | 🐘 | 8 | 800 | 44 | 0.60 | multiply |
| `giraffe` | 🦒 | 8 | 750 | 48 | 0.90 | multiply |
| `snake` | 🐍 | 8 | 600 | 36 | 0.75 | multiply |
| `dragon` | 🐉 | 16 | 700 | 50 | 1.10 | multiply |
| `f1` | 🏎️ | 8 | 400 | 38 | 1.20 | multiply |
| `rocket` | 🚀 | 8 | 500 | 40 | 1.25 | multiply |
| `buggy` | 🚙 | 8 | 500 | 38 | 0.95 | **mask** |
| `motorbike` | 🏍️ | 8 | 500 | 36 | 1.05 | **mask** |
| `plane` | ✈️ | 8 | 600 | 42 | 1.15 | **mask** |

> **speedMultiplier:** Wirkt erst nach D9. Aktuell in Configs gesetzt aber inert in der
> Race-Engine. Nach D9: linearer Multiplikator auf `baseSpeed` pro Racer-Frame.
>
> **tintMode `mask`:** Buggy, Motorbike, Plane verwenden Mask-Tinting via `<sprite>-mask.png`.
> Nur die Maske wird eingefärbt; der Rest des Sprites bleibt unverändert. Alle anderen Types
> verwenden Multiply-Mode (gesamter Sprite wird mit Tint-Farbe multipliziert).

---

## Persistenz — Storage Keys

| Storage Key | Inhalt | Status |
|---|---|---|
| `racearena:tracks` | Array von Tracks. Felder: `id, name, description, geometryId, defaultRacerTypeId, defaultDuration, defaultWinners, color, trackWidth, worldWidth, ...` | Aktiv |
| `racearena:racerTypeOverrides` | Override-Map `{[typeId]: false}` für deaktivierte Types (post B-7). Abwesenheit = aktiv (default). | Aktiv (post B-7) |
| `racearena:racerTypes` | Legacy — nach Migration zu `racerTypeOverrides` leer/entfernt | Legacy/null |
| `racearena:trackGeometries:<id>` | Track-Geometry-Records (Catmull-Rom Spline-Punkte) | Aktiv |
| `racearena:trackGeometries:index` | Geometry-Index | Aktiv |
| `sessionStorage['activeRace']` | Race-Setup-Daten für Setup → Race-Screen Übergang. Felder: `trackId, racerTypeId, racers[], duration, winners, geometryId, worldWidth, timestamp` | Aktiv |
| `sessionStorage['activeRace'].racerTypeId` | **W3 Race-Override:** session-only, zurückgesetzt bei Track-Wechsel. Kein Persist. | Aktiv (post W3) |

---

## Code-Architektur

### Code-Registry als Single Source of Truth (post B-7)

`RACER_TYPES` in `client/src/modules/racer-types/index.js` ist die einzige Wahrheit über alle
12 Types. localStorage speichert **nur Abweichungen** vom Code-Default:

```
Code-Registry (RACER_TYPES)          →  12 Types, immer vollständig
racearena:racerTypeOverrides          →  { snail: false, ... }  (nur was abweicht)
listAllRacerTypes()                   →  Code-Registry + Overrides zusammengeführt
```

### API

| Funktion | Beschreibung |
|---|---|
| `listAllRacerTypes()` | Array aller 12 Types mit `isActive` aus Override-Map aufgelöst |
| `getRacerType(id)` | Einzelner Type-Instance, Fallback auf Horse für unbekannte IDs |
| `getRacerTypeById(id)` | Alias für `getRacerType` — bevorzugt wo ID-Semantik wichtig |
| `listRacerTypes()` | Array aller registrierten Type-IDs |
| `setRacerTypeOverride(id, isActive)` | Override setzen: `false` = deaktiviert, `true` = entfernt Override (zurück zu default aktiv) |
| `resetRacerTypeOverride(id)` | Override entfernen, revertiert zu Code-Default (aktiv) |
| `RACER_TYPE_IDS` | Sortiertes Array aller 12 Type-IDs |
| `RACER_TYPE_LABELS` | Map `{id → "Name Emoji"}` für UI-Anzeige |
| `COATS_BY_TYPE` | Map `{id → coats[]}` für RaceScreen-Coat-Assignment; auto-derived aus Type-Configs |

### SpriteRacerType — Config-Felder

`SpriteRacerType` ist eine config-driven Klasse. Alle 12 Types sind Singleton-Instanzen.
Keine Subklassen. Required config fields:

| Field | Typ | Beschreibung |
|---|---|---|
| `id` | string | Unique racer type identifier |
| `spriteUrl` | string | Path to sprite sheet PNG |
| `frameCount` | number | Animation frame count |
| `basePeriodMs` | number | Base animation period at speed 1.0 |
| `displaySize` | number | Bounding box size in px |
| `coats` | `{id, name, tint}[]` | Color variant definitions |
| `trailFactory` | function | `(x, y, speed, angle, frame) => particle[]` |

Optional: `frameWidth/Height` (default 128), `silhouetteScale`, `speedMultiplier` (default 1.0),
`baseRotationOffset`, `tintMode` (`'multiply'` or `'mask'`), `maskUrl` (required when
`tintMode='mask'`), `fallbackColor`, `rteDefinitions` (D6-reserviert).

### Mask-Tinting (Buggy, Motorbike, Plane)

Mask-Types haben zwei Sprite-Dateien:
- `<type>-<anim>.png` — vollständiger Sprite
- `<type>-<anim>-mask.png` — PNG-Maske, definiert welche Pixel gefärbt werden

Tinting-Algorithmus (`tintSpriteWithMask`):
1. Lade Sprite + Mask via `loadSprite()`
2. Zeichne Sprite auf Offscreen-Canvas
3. Zeichne Mask auf zweitem Offscreen-Canvas
4. Tint-Farbe wird nur auf Maske-Pixel angewendet (Multiply-Mode über Mask)
5. Ergebnis: Chassis/Körper-Farbe veränderbar, Rest des Sprites unverändert

### Track-Default-Lookup

`SetupScreen` und `TrackManager` lesen aus `localStorage['racearena:tracks']`. Jeder Track hat
**genau ein** Feld für den Default Racer: `defaultRacerTypeId`. Fallback-Kette im SetupScreen
für ältere localStorage-Einträge: `defaultRacerTypeId ?? racerTypeId ?? racerId ?? d.defaultRacerTypeId`.

### Race Init

RaceScreen liest aus `sessionStorage['activeRace']`:
- `racerTypeId` → bestimmt welche Racer-Instanz für alle Spieler verwendet wird
- `racers[]` → bekommen alle denselben Type, jeweils einen Coat per djb2-Hash auf Name

---

## Racer-Track-Effects (D6 — reserviert)

`SpriteRacerType` speichert ein optionales `rteDefinitions`-Array (Default: `[]`). Es wird
akzeptiert, gespeichert und über `getRteDefinitions()` exposiert — aber in der aktuellen
Codebase nicht ausgewertet. Phase D6 führt einen `RteManager` in RaceScreen ein, der diese
Definitionen ausliest und pro Racer Partikel-Effekte spawnt. Schema wird im D6-Spec definiert.

---

## Phase-7-Vorausschau

Wenn Sprite-Upload kommt:
1. Dev-Panel UI bekommt "+ New Racer Type"-Button
2. User lädt Sprite-Sheet hoch + füllt Metadaten (Name, Frame-Count, Coats)
3. Server speichert Sprite unter `client/public/assets/racers/<custom-id>.png`
4. `racearena:racerTypes` bekommt einen neuen Eintrag mit dynamischer Config
5. Registry liest dynamisch — keine Code-Klassen mehr für Custom Types nötig
