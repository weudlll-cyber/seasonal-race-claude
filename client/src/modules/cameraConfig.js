// ============================================================
// File:        cameraConfig.js
// Path:        client/src/modules/cameraConfig.js
// Project:     RaceArena
// Created:     2026-05-04
// Description: Storage CRUD for camera tuning config.
//              Follows the raceDynamicsConfig.js pattern.
//              Schema v2 migration: old configs (no schemaVersion or schemaVersion≠2)
//              are discarded and replaced with fresh defaults rather than merged.
//              This prevents stale multiplier fields from silently overriding the
//              new spritePctOfCanvas logic.
//              Schema v4 (2026-05-08): introduces per-state cameraStateProfiles.
//              v3→v4 migration builds profiles from legacy spritePctOfCanvas /
//              cameraTransitionSeconds so user-tuned values survive the upgrade.
//              Schema v5 (2026-05-09): replaces pixel-based leadInDistance /
//              followDuration / leadOutDistance with time-based leadInDuration /
//              leadOutDuration (seconds). v4→v5 migration preserves all non-phase
//              profile fields; phase fields reset to new defaults.
//              Schema v6 (2026-05-15): reduces leadInDuration defaults
//              (LEADER/COMEBACK 1.0→0.3, BATTLE 0.5→0.2) to prevent the camera
//              arriving at a position where the leader is near the viewport edge.
//              v5→v6 migration resets leadInDuration to new defaults.
//              Schema v7 (2026-05-15): sprite size expressed in world pixels (spritePx)
//              instead of fraction of canvas height (spritePct). This decouples sprite
//              proportion from canvas resolution, giving identical sprite/track ratios
//              on Open and Closed tracks.
//              v6→v7 migration: spritePx = Math.round(spritePct × 720), using dirt-oval
//              canvas height (720px) as the reference so existing dirt-oval setups are
//              visually unchanged after the upgrade.
//              Schema v8 (2026-05-15): T-space convergence threshold raised from 0.005 to
//              0.03 so the camera can exit entry phase while the leader is moving (steady-
//              state gap ese/lf ≈ 0.026 was above the old threshold). Also adds
//              maxEntryDurationMs per state as a time-based fallback, and the global
//              transitionTConvergence field. v7→v8 migration adds new fields with defaults.
//              Schema v9 (2026-05-15): adds overviewOffsetPx to the OVERVIEW profile. The
//              camera shifts toward the field so the leader appears at the outer viewport
//              edge with the pack behind (radial offset from track center). Default 150 px.
//              v8→v9 migration injects overviewOffsetPx into the existing OVERVIEW profile.
//              Schema v10 (2026-05-15): adds leadAheadEnabled boolean per state (LEADER_ZOOM,
//              BATTLE_ZOOM, COMEBACK_ZOOM). Default false so the user sees centered behavior
//              on upgrade. v9→v10 migration injects leadAheadEnabled: false into those states.
//              Schema v11 (2026-05-15): adds leadOutEnabled boolean per state (LEADER_ZOOM,
//              BATTLE_ZOOM, COMEBACK_ZOOM). Default false — lead-out causes a "camera stops,
//              racer runs away" effect that the entry-phase of the next state already covers.
//              v10→v11 migration injects leadOutEnabled: false into those states.
//              Schema v12 (2026-05-15): adds countdown camera phase config — two new global
//              fields: countdownStartZoomSpritePx (sprite size at countdown start; clamped to
//              min zoom = whole track visible) and countdownDurationMs (countdown duration in ms,
//              default 4000). v11→v12 migration injects both fields at their defaults.
//              Schema v13 (2026-05-16): adds state-overlay narrative text config — two new global
//              fields: stateOverlayEnabled (bool, default true) and stateOverlayDurationMs (int,
//              default 3500ms). v12→v13 migration injects both fields at their defaults.
//              Schema v14 (2026-05-23): replaces spritePx (absolute world pixels) with spriteScale
//              (relative factor) in all cameraStateProfiles. zoom = spriteScale / bsX (closed) or
//              spriteScale / OPEN_BASE (open) — referenceSpriteSize cancels out, making the zoom
//              racer-count-independent (L82). v13→v14 migration: spriteScale = spritePx / 36.
//              Schema v15 (2026-05-26): adds overviewClosedTrackZoom (default 1.3) — zoom multiplier
//              that gives the OVERVIEW camera pan room on closed tracks (mirrors OPEN_TRACK_BASE_ZOOM).
//              v14→v15 migration injects the field at its default.
//              Schema v16 (2026-06-24): adds leaderMinZoomFraction (default 0.6) — world-size-
//              independent LEADER_ZOOM / LEAD_CHANGE zoom-out floor, expressed as a fraction of
//              the leader zoom. v15→v16 migration injects the field at its default.
//              Schema v17 (15b): BATTLE closeness world-px → arc-fraction (scale-independent).
//              Removes battlePulkThresholdPx / battleIsolationThresholdPx; battlePulkThresholdT
//              default 0.12→0.05; adds battleIsolationThresholdT (default 0). v16→v17 migration
//              strips the px fields, migrates the old 0.12 closeness to 0.05, injects the arc knob.
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';
import {
  normalizeCameraTransitionSeconds,
  migrateV3toV5,
  migrateV4toV5,
  migrateV5toV6,
  migrateV6toV7,
  migrateV7toV8,
  migrateV8toV9,
  migrateV9toV10,
  migrateV10toV11,
  migrateV11toV12,
  migrateV12toV13,
  migrateV13toV14,
  migrateV14toV15,
  migrateV15toV16,
  migrateV16toV17,
} from './cameraMigrations.js';

export { DEFAULT_CAMERA_CONFIG };

const MIGRATION_CHAIN = [
  migrateV5toV6,
  migrateV6toV7,
  migrateV7toV8,
  migrateV8toV9,
  migrateV9toV10,
  migrateV10toV11,
  migrateV11toV12,
  migrateV12toV13,
  migrateV13toV14,
  migrateV14toV15,
  migrateV15toV16,
  migrateV16toV17,
];

// Apply migrations to bring a config from `fromVersion` (>=5) up to v17.
function applyMigrationsSinceV5(config, fromVersion) {
  return MIGRATION_CHAIN.slice(Math.max(0, fromVersion - 5)).reduce(
    (cfg, migrate) => migrate(cfg),
    config
  );
}

// Deep-merge stored per-state profile overrides onto the default profiles.
// stripSpriteScale=true drops spriteScale from each default first, so a stored legacy
// spritePct survives into migrateV6toV7 (the v5/v6 load paths require this).
function mergeStateProfiles(storedProfiles, { stripSpriteScale = false } = {}) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const out = {};
  for (const state of Object.keys(defProfiles)) {
    let base = defProfiles[state];
    if (stripSpriteScale) {
      const { spriteScale: _omit, ...rest } = base;
      base = rest;
    }
    out[state] = { ...base, ...(storedProfiles[state] ?? {}) };
  }
  return out;
}

export function loadCameraConfig() {
  const stored = storageGet(KEYS.CAMERA_CONFIG);
  if (!stored || typeof stored !== 'object') return { ...DEFAULT_CAMERA_CONFIG };

  // v2 → v3 migration: rename battleMaxDuration to battleMaxDurationMs
  if (stored.schemaVersion === 2) {
    const patched = { ...stored, schemaVersion: 3 };
    if ('battleMaxDuration' in patched) {
      patched.battleMaxDurationMs = patched.battleMaxDuration;
      delete patched.battleMaxDuration;
    }
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...patched };
    // v2/v3 configs never had cameraStateProfiles; strip the default so
    // migrateV3toV5 always calls buildProfilesFromLegacy instead of short-circuiting.
    delete merged.cameraStateProfiles;
    // Only pass through explicitly stored spritePctOfCanvas keys so that unset keys
    // fall back to DEFAULT_CAMERA_CONFIG.cameraStateProfiles pixel defaults in buildProfilesFromLegacy.
    if (patched.spritePctOfCanvas) {
      merged.spritePctOfCanvas = patched.spritePctOfCanvas;
    } else {
      delete merged.spritePctOfCanvas;
    }
    normalizeCameraTransitionSeconds(merged);
    return applyMigrationsSinceV5(migrateV3toV5(merged), 5);
  }

  if (stored.schemaVersion === 3) {
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    // Strip default profiles so buildProfilesFromLegacy constructs them from legacy fields.
    delete merged.cameraStateProfiles;
    // Only pass through explicitly stored spritePctOfCanvas keys so that unset keys
    // fall back to DEFAULT_CAMERA_CONFIG.cameraStateProfiles pixel defaults in buildProfilesFromLegacy.
    if (stored.spritePctOfCanvas) {
      merged.spritePctOfCanvas = stored.spritePctOfCanvas;
    } else {
      // User never stored spritePctOfCanvas — remove default so buildProfilesFromLegacy
      // falls through to profile defaults for each field.
      delete merged.spritePctOfCanvas;
    }
    normalizeCameraTransitionSeconds(merged);
    return applyMigrationsSinceV5(migrateV3toV5(merged), 5);
  }

  if (stored.schemaVersion === 4) {
    // v4→…→v15: preserve zoom/TC fields, reset phase fields, then full migration chain.
    return applyMigrationsSinceV5(migrateV4toV5({ ...DEFAULT_CAMERA_CONFIG, ...stored }), 5);
  }

  if (stored.schemaVersion === 5) {
    // v5→…→v15: reset leadInDuration; convert spritePct→spritePx; then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles, {
        stripSpriteScale: true,
      });
    }
    return applyMigrationsSinceV5(merged, 5);
  }

  if (stored.schemaVersion === 6) {
    // v6→…→v15: deep-merge profiles, convert spritePct→spritePx, then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles, {
        stripSpriteScale: true,
      });
    }
    return applyMigrationsSinceV5(merged, 6);
  }

  if (stored.schemaVersion === 7) {
    // v7→…→v15: deep-merge profiles (preserving user-tuned spritePx), then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 7);
  }

  if (stored.schemaVersion === 8) {
    // v8→…→v15: deep-merge profiles, inject overviewOffsetPx, then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 8);
  }

  if (stored.schemaVersion === 9) {
    // v9→…→v15: deep-merge profiles, inject leadAheadEnabled/leadOutEnabled/countdown, then v15.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 9);
  }

  if (stored.schemaVersion === 10) {
    // v10→…→v15: deep-merge profiles, inject leadOutEnabled/countdown, then v15.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 10);
  }

  if (stored.schemaVersion === 11) {
    // v11→…→v15: deep-merge profiles, inject countdown, then v15.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 11);
  }

  if (stored.schemaVersion === 12) {
    // v12→v13→v14→v15: deep-merge profiles, inject stateOverlay fields, then v15.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 12);
  }

  if (stored.schemaVersion === 13) {
    // v13→v14→v15: deep-merge profiles (preserving user-tuned spritePx), then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 13);
  }

  if (stored.schemaVersion === 14) {
    // v14→v16: merge top-level fields, deep-merge profiles, inject overviewClosedTrackZoom +
    // leaderMinZoomFraction via the migration chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 14);
  }

  if (stored.schemaVersion === 15) {
    // v15→v16: merge top-level fields, deep-merge profiles, inject leaderMinZoomFraction.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 15);
  }

  if (stored.schemaVersion === 16) {
    // v16→v17 (15b): merge top-level fields, deep-merge profiles, then run the arc-closeness
    // migration (strips battlePulkThresholdPx / battleIsolationThresholdPx, sets arc defaults).
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
    }
    return applyMigrationsSinceV5(merged, 16);
  }

  if (stored.schemaVersion !== 17) return { ...DEFAULT_CAMERA_CONFIG };

  // v17: merge top-level fields, then deep-merge cameraStateProfiles.
  const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
  if (stored.cameraStateProfiles) {
    merged.cameraStateProfiles = mergeStateProfiles(stored.cameraStateProfiles);
  }
  return merged;
}

export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, { ...config, schemaVersion: 17 });
}
