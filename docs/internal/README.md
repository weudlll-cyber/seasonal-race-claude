# docs/internal/

Internal diagnostic and analysis documents. Not for public consumption.

## current-config-snapshot.json

Current snapshot of all `racearena:*` localStorage data from the browser,
including track geometries (`racearena:trackGeometries:*`) and all
tuning configs (autoScaleConfig, rowLayoutConfig, raceBehaviorConfig, etc.).

### Purpose

Some bugs are only reproducible when the exact browser configuration is known — in particular:

- Track geometry dimensions (affects `getActualTrackWidth()`)
- `autoScaleConfig` (affects `displaySizeScale` → `spriteSize` → `racersPerRow`)
- `rowLayoutConfig` (affects row spacing and speed bonus)
- `racerTypeOverrides` (affects displaySize overrides)

Without this data, Claude Code must infer intermediate values from browser console output,
which is slow and error-prone.

### How to export

1. Open browser → `http://localhost:3000`
2. Dev Panel → **System** tab
3. Click button **"🔬 Export Diagnostic Snapshot"**
4. File is downloaded as `racearena-snapshot-YYYYMMDD-HHmm.json`
5. Rename file to `current-config-snapshot.json`
6. Place in this directory (`docs/internal/current-config-snapshot.json`)
7. Commit

### When to update

- Whenever a bug appears that is not reproducible without browser data
- After significant changes to track geometries or tuning parameters
- When Claude Code explicitly requests a new snapshot

### What is included

All `racearena:*` keys from localStorage, including:

- `racearena:tracks` — track presets
- `racearena:trackGeometries:<id>` — geometry data (inner/outer splines)
- `racearena:trackGeometries:index` — geometry index
- `racearena:autoScaleConfig` — sprite scaling parameters
- `racearena:rowLayoutConfig` — row start parameters
- `racearena:raceBehaviorConfig` — force pipeline parameters
- `racearena:racerTypeOverrides` — per-type overrides
- all further `racearena:*` keys

Contains `_meta.exportedAt` timestamp for traceability.

### What is NOT included

- `sessionStorage['activeRace']` — transient race state, not persistent
- Non-racearena keys from localStorage

### Privacy

Contains no personal data. Track geometries and configurations are local game settings.
