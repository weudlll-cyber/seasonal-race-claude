# docs/internal/

Interne Diagnose- und Analyse-Dokumente. Nicht für die Öffentlichkeit.

## current-config-snapshot.json

Aktueller Snapshot aller `racearena:*` localStorage-Daten des Browsers,
einschließlich Track-Geometrien (`racearena:trackGeometries:*`) und allen
Tuning-Configs (autoScaleConfig, rowLayoutConfig, raceBehaviorConfig, etc.).

### Wozu

Manche Bugs sind nur reproduzierbar wenn man die exakte Browser-Konfiguration
kennt — insbesondere:
- Track-Geometrie-Dimensionen (beeinflusst `getActualTrackWidth()`)
- `autoScaleConfig` (beeinflusst `displaySizeScale` → `spriteSize` → `racersPerRow`)
- `rowLayoutConfig` (beeinflusst Reihen-Abstände und Speed-Bonus)
- `racerTypeOverrides` (beeinflusst displaySize-Overrides)

Ohne diese Daten muss Claude Code von Browser-Console-Outputs auf Zwischenwerte
schließen, was langsam und fehleranfällig ist.

### Wie exportieren

1. Browser öffnen → `http://localhost:3000`
2. Dev Panel → **System** Tab
3. Button **"🔬 Export Diagnostic Snapshot"** klicken
4. Datei wird als `racearena-snapshot-YYYYMMDD-HHmm.json` heruntergeladen
5. Datei umbenennen zu `current-config-snapshot.json`
6. In dieses Verzeichnis legen (`docs/internal/current-config-snapshot.json`)
7. Committen

### Wann aktualisieren

- Immer wenn ein Bug auftaucht der ohne Browser-Daten nicht reproduzierbar ist
- Nach größeren Änderungen an Track-Geometrien oder Tuning-Parametern
- Wenn Claude Code explizit nach einem neuen Snapshot fragt

### Was ist enthalten

Alle `racearena:*` Keys aus localStorage, inkl.:
- `racearena:tracks` — Track-Presets
- `racearena:trackGeometries:<id>` — Geometrie-Daten (inner/outer Splines)
- `racearena:trackGeometries:index` — Geometrie-Index
- `racearena:autoScaleConfig` — Sprite-Skalierungs-Parameter
- `racearena:rowLayoutConfig` — Reihen-Start-Parameter
- `racearena:raceBehaviorConfig` — Force-Pipeline-Parameter
- `racearena:racerTypeOverrides` — Per-Type Overrides
- alle weiteren `racearena:*` Keys

Enthält `_meta.exportedAt` Zeitstempel für Nachvollziehbarkeit.

### Was ist NICHT enthalten

- `sessionStorage['activeRace']` — flüchtiger Race-State, nicht persistent
- Nicht-racearena-Keys aus localStorage

### Datenschutz

Enthält keine persönlichen Daten. Track-Geometrien und Konfigurationen sind
lokale Spieleinstellungen.
