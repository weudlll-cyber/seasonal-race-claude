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
// ============================================================

import { storageGet, storageSet, KEYS } from './storage/storage.js';
import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';

export { DEFAULT_CAMERA_CONFIG };

// Converts a scalar cameraTransitionSeconds (stored by v3 configs) to the object
// form expected by CameraDirector. Mutates the merged config in-place.
function normalizeCameraTransitionSeconds(config) {
  if (typeof config.cameraTransitionSeconds === 'number') {
    const s = config.cameraTransitionSeconds;
    const def = DEFAULT_CAMERA_CONFIG.cameraTransitionSeconds;
    config.cameraTransitionSeconds = {
      overview: s,
      leader: def.leader,
      battle: def.battle,
      comeback: def.comeback,
    };
  }
}

// Reference canvas height used for converting legacy spritePctOfCanvas → spritePx.
// Dirt-oval uses 720px, so this conversion is lossless for the standard test setup.
const LEGACY_CANVAS_H_REF = 720;

// Divisor for v13→v14 migration: spriteScale = spritePx / SPRITE_SCALE_DIVISOR.
// Equals FALLBACK_REFERENCE_SPRITE_SIZE in CameraDirector so default spritePx=36 → spriteScale=1.0.
const SPRITE_SCALE_DIVISOR = 36;

// Build a cameraStateProfiles object from legacy spritePctOfCanvas / cameraTransitionSeconds
// fields present on a v2/v3 config.  Preserves any user-tuned per-state values.
// Phase fields (leadInDuration, leadOutDuration) always use v5 defaults.
// Outputs spritePx (world pixels) directly — no further conversion needed in migrateV6toV7.
function buildProfilesFromLegacy(config) {
  const sp = config.spritePctOfCanvas ?? {};
  const tc =
    typeof config.cameraTransitionSeconds === 'object'
      ? config.cameraTransitionSeconds
      : DEFAULT_CAMERA_CONFIG.cameraTransitionSeconds;
  const innerFramePct = config.targetInnerFramePct ?? 0.7;
  const globalMax = config.maxStateDuration ?? 4000;
  const globalMin = config.minStateHoldMs ?? 5000;
  const def = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;

  const toPx = (pct, defPx) => (pct != null ? Math.round(pct * LEGACY_CANVAS_H_REF) : defPx);

  return {
    OVERVIEW: {
      spritePx: toPx(sp.overview, def.OVERVIEW.spritePx),
      trackingTC: tc.overview ?? def.OVERVIEW.trackingTC,
      entryTC: tc.overview ?? def.OVERVIEW.entryTC,
      innerFramePct,
      maxStateDuration: globalMax,
      minStateHold: globalMin,
      leadInDuration: def.OVERVIEW.leadInDuration,
      leadOutDuration: def.OVERVIEW.leadOutDuration,
    },
    LEADER_ZOOM: {
      spritePx: toPx(sp.leader, def.LEADER_ZOOM.spritePx),
      trackingTC: tc.leader ?? def.LEADER_ZOOM.trackingTC,
      entryTC: tc.leader ?? def.LEADER_ZOOM.entryTC,
      innerFramePct,
      maxStateDuration: globalMax,
      minStateHold: globalMin,
      leadInDuration: def.LEADER_ZOOM.leadInDuration,
      leadOutDuration: def.LEADER_ZOOM.leadOutDuration,
    },
    BATTLE_ZOOM: {
      spritePx: toPx(sp.battle, def.BATTLE_ZOOM.spritePx),
      trackingTC: tc.battle ?? def.BATTLE_ZOOM.trackingTC,
      entryTC: tc.battle ?? def.BATTLE_ZOOM.entryTC,
      innerFramePct,
      // BATTLE had its own maxStateDuration in v3
      maxStateDuration: config.battleMaxDurationMs ?? 6000,
      minStateHold: globalMin,
      leadInDuration: def.BATTLE_ZOOM.leadInDuration,
      leadOutDuration: def.BATTLE_ZOOM.leadOutDuration,
    },
    COMEBACK_ZOOM: {
      spritePx: toPx(sp.comeback, def.COMEBACK_ZOOM.spritePx),
      trackingTC: tc.comeback ?? def.COMEBACK_ZOOM.trackingTC,
      entryTC: tc.comeback ?? def.COMEBACK_ZOOM.entryTC,
      innerFramePct,
      maxStateDuration: globalMax,
      minStateHold: globalMin,
      leadInDuration: def.COMEBACK_ZOOM.leadInDuration,
      leadOutDuration: def.COMEBACK_ZOOM.leadOutDuration,
    },
  };
}

function migrateV3toV5(config) {
  if (config.cameraStateProfiles) {
    // Already has profiles (shouldn't happen on v3, but guard): migrate to v5 format
    return migrateV4toV5({ ...config, schemaVersion: 4 });
  }
  return {
    ...config,
    cameraStateProfiles: buildProfilesFromLegacy(config),
    entryConvergenceZoom: DEFAULT_CAMERA_CONFIG.entryConvergenceZoom,
    entryConvergencePx: DEFAULT_CAMERA_CONFIG.entryConvergencePx,
    schemaVersion: 5,
  };
}

// v4→v5: preserve non-phase profile fields; reset phase fields to new duration-based defaults.
// spritePct (fraction) is carried forward as-is; migrateV6toV7 will convert it to spritePx.
function migrateV4toV5(config) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = {};
  for (const state of Object.keys(defProfiles)) {
    const old = oldProfiles[state] ?? {};
    newProfiles[state] = {
      spritePct: old.spritePct, // preserved as fraction; migrateV6toV7 converts to spritePx
      trackingTC: old.trackingTC ?? defProfiles[state].trackingTC,
      entryTC: old.entryTC ?? defProfiles[state].entryTC,
      innerFramePct: old.innerFramePct ?? defProfiles[state].innerFramePct,
      maxStateDuration: old.maxStateDuration ?? defProfiles[state].maxStateDuration,
      minStateHold: old.minStateHold ?? defProfiles[state].minStateHold,
      // Phase fields: always reset to new defaults (px → seconds not convertible)
      leadInDuration: defProfiles[state].leadInDuration,
      leadOutDuration: defProfiles[state].leadOutDuration,
    };
  }
  return {
    ...config,
    cameraStateProfiles: newProfiles,
    schemaVersion: 5,
  };
}

// v5→v6: reset leadInDuration to new (reduced) defaults to prevent camera arriving with
// the leader at the viewport edge. All other profile fields (including spritePct) are preserved.
// spritePct is still a fraction here; migrateV6toV7 converts it to spritePx.
function migrateV5toV6(config) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = {};
  for (const state of Object.keys(defProfiles)) {
    const old = oldProfiles[state] ?? {};
    newProfiles[state] = {
      ...old,
      leadInDuration: defProfiles[state].leadInDuration,
    };
  }
  return {
    ...config,
    cameraStateProfiles: newProfiles,
    schemaVersion: 6,
  };
}

// v9→v10: add leadAheadEnabled: false to LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM profiles.
// OVERVIEW is excluded — it never uses lead-ahead (leadInDuration: 0).
function migrateV9toV10(config) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = { ...oldProfiles };
  for (const state of ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM']) {
    const oldState = oldProfiles[state] ?? defProfiles[state];
    newProfiles[state] = {
      ...oldState,
      leadAheadEnabled: oldState.leadAheadEnabled ?? false,
    };
  }
  return { ...config, cameraStateProfiles: newProfiles, schemaVersion: 10 };
}

// v11→v12: add countdownStartZoomSpritePx and countdownDurationMs at their defaults.
// All existing fields pass through unchanged.
function migrateV11toV12(config) {
  return {
    ...config,
    countdownStartZoomSpritePx:
      config.countdownStartZoomSpritePx ?? DEFAULT_CAMERA_CONFIG.countdownStartZoomSpritePx,
    countdownDurationMs: config.countdownDurationMs ?? DEFAULT_CAMERA_CONFIG.countdownDurationMs,
    schemaVersion: 12,
  };
}

// v12→v13: add stateOverlayEnabled and stateOverlayDurationMs at their defaults.
// All existing fields pass through unchanged.
function migrateV12toV13(config) {
  return {
    ...config,
    stateOverlayEnabled: config.stateOverlayEnabled ?? DEFAULT_CAMERA_CONFIG.stateOverlayEnabled,
    stateOverlayDurationMs:
      config.stateOverlayDurationMs ?? DEFAULT_CAMERA_CONFIG.stateOverlayDurationMs,
    schemaVersion: 13,
  };
}

// v10→v11: add leadOutEnabled: false to LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM profiles.
// OVERVIEW is excluded — it has leadOutDuration: 0 so lead-out is never active there.
function migrateV10toV11(config) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = { ...oldProfiles };
  for (const state of ['LEADER_ZOOM', 'BATTLE_ZOOM', 'COMEBACK_ZOOM']) {
    const oldState = oldProfiles[state] ?? defProfiles[state];
    newProfiles[state] = {
      ...oldState,
      leadOutEnabled: oldState.leadOutEnabled ?? false,
    };
  }
  return { ...config, cameraStateProfiles: newProfiles, schemaVersion: 11 };
}

// v8→v9: add overviewOffsetPx to the OVERVIEW profile. All other fields pass through unchanged.
function migrateV8toV9(config) {
  const defOVERVIEW = DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = { ...oldProfiles };
  const oldOVERVIEW = oldProfiles.OVERVIEW ?? {};
  newProfiles.OVERVIEW = {
    ...oldOVERVIEW,
    overviewOffsetPx: oldOVERVIEW.overviewOffsetPx ?? defOVERVIEW.overviewOffsetPx,
  };
  return { ...config, cameraStateProfiles: newProfiles, schemaVersion: 9 };
}

// v7→v8: add transitionTConvergence global and maxEntryDurationMs per state.
// All other fields pass through unchanged — no behavior change for existing tuned configs
// since the new fields are injected at their new defaults.
function migrateV7toV8(config) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = {};
  for (const state of Object.keys(defProfiles)) {
    const old = oldProfiles[state] ?? {};
    newProfiles[state] = {
      ...old,
      maxEntryDurationMs: old.maxEntryDurationMs ?? defProfiles[state].maxEntryDurationMs,
    };
  }
  return {
    ...config,
    cameraStateProfiles: newProfiles,
    transitionTConvergence:
      config.transitionTConvergence ?? DEFAULT_CAMERA_CONFIG.transitionTConvergence,
    schemaVersion: 8,
  };
}

// v6→v7: convert spritePct (fraction of canvas height) to spritePx (world pixels).
// Uses dirt-oval canvas height (720px) as the reference so existing dirt-oval setups are
// visually unchanged. Configs already carrying spritePx (e.g. from buildProfilesFromLegacy)
// are passed through unchanged.
function migrateV6toV7(config) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = {};
  for (const state of Object.keys(defProfiles)) {
    const old = oldProfiles[state] ?? {};
    const { spritePct, ...rest } = old;
    const spritePx =
      old.spritePx != null
        ? old.spritePx
        : spritePct != null
          ? Math.round(spritePct * LEGACY_CANVAS_H_REF)
          : defProfiles[state].spritePx;
    newProfiles[state] = { ...rest, spritePx };
  }
  return { ...config, cameraStateProfiles: newProfiles, schemaVersion: 7 };
}

// v14→v15: add overviewClosedTrackZoom at its default. All other fields pass through unchanged.
function migrateV14toV15(config) {
  return {
    ...config,
    overviewClosedTrackZoom:
      config.overviewClosedTrackZoom ?? DEFAULT_CAMERA_CONFIG.overviewClosedTrackZoom,
    schemaVersion: 15,
  };
}

// v13→v14: replace spritePx (absolute px) with spriteScale (relative factor) in all profiles.
// spritePx wins over spriteScale because intermediate migrations deep-merge DEFAULT_CAMERA_CONFIG
// (which now carries spriteScale) before v13→v14 runs — so a user-stored spritePx alongside an
// injected default spriteScale must still be honoured.
function migrateV13toV14(config) {
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const oldProfiles = config.cameraStateProfiles ?? {};
  const newProfiles = {};
  for (const state of Object.keys(defProfiles)) {
    const old = oldProfiles[state] ?? {};
    const { spritePx, ...rest } = old;
    const spriteScale =
      spritePx != null
        ? spritePx / SPRITE_SCALE_DIVISOR
        : old.spriteScale != null
          ? old.spriteScale
          : defProfiles[state].spriteScale;
    newProfiles[state] = { ...rest, spriteScale };
  }
  return { ...config, cameraStateProfiles: newProfiles, schemaVersion: 14 };
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
    return migrateV14toV15(
      migrateV13toV14(
        migrateV12toV13(
          migrateV11toV12(
            migrateV10toV11(
              migrateV9toV10(
                migrateV8toV9(migrateV7toV8(migrateV6toV7(migrateV5toV6(migrateV3toV5(merged)))))
              )
            )
          )
        )
      )
    );
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
    return migrateV14toV15(
      migrateV13toV14(
        migrateV12toV13(
          migrateV11toV12(
            migrateV10toV11(
              migrateV9toV10(
                migrateV8toV9(migrateV7toV8(migrateV6toV7(migrateV5toV6(migrateV3toV5(merged)))))
              )
            )
          )
        )
      )
    );
  }

  if (stored.schemaVersion === 4) {
    // v4→…→v15: preserve zoom/TC fields, reset phase fields, then full migration chain.
    return migrateV14toV15(
      migrateV13toV14(
        migrateV12toV13(
          migrateV11toV12(
            migrateV10toV11(
              migrateV9toV10(
                migrateV8toV9(
                  migrateV7toV8(
                    migrateV6toV7(
                      migrateV5toV6(migrateV4toV5({ ...DEFAULT_CAMERA_CONFIG, ...stored }))
                    )
                  )
                )
              )
            )
          )
        )
      )
    );
  }

  if (stored.schemaVersion === 5) {
    // v5→…→v15: reset leadInDuration; convert spritePct→spritePx; then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        // Strip spriteScale from defaults so stored spritePct survives into migrateV6toV7.
        const { spriteScale: _defScale, ...defWithout } = defProfiles[state];
        merged.cameraStateProfiles[state] = {
          ...defWithout,
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(
      migrateV13toV14(
        migrateV12toV13(
          migrateV11toV12(
            migrateV10toV11(
              migrateV9toV10(migrateV8toV9(migrateV7toV8(migrateV6toV7(migrateV5toV6(merged)))))
            )
          )
        )
      )
    );
  }

  if (stored.schemaVersion === 6) {
    // v6→…→v15: deep-merge profiles, convert spritePct→spritePx, then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        // Strip spriteScale from defaults so stored spritePct survives into migrateV6toV7.
        const { spriteScale: _defScale, ...defWithout } = defProfiles[state];
        merged.cameraStateProfiles[state] = {
          ...defWithout,
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(
      migrateV13toV14(
        migrateV12toV13(
          migrateV11toV12(
            migrateV10toV11(migrateV9toV10(migrateV8toV9(migrateV7toV8(migrateV6toV7(merged)))))
          )
        )
      )
    );
  }

  if (stored.schemaVersion === 7) {
    // v7→…→v15: deep-merge profiles (preserving user-tuned spritePx), then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        merged.cameraStateProfiles[state] = {
          ...defProfiles[state],
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(
      migrateV13toV14(
        migrateV12toV13(
          migrateV11toV12(migrateV10toV11(migrateV9toV10(migrateV8toV9(migrateV7toV8(merged)))))
        )
      )
    );
  }

  if (stored.schemaVersion === 8) {
    // v8→…→v15: deep-merge profiles, inject overviewOffsetPx, then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        merged.cameraStateProfiles[state] = {
          ...defProfiles[state],
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(
      migrateV13toV14(
        migrateV12toV13(migrateV11toV12(migrateV10toV11(migrateV9toV10(migrateV8toV9(merged)))))
      )
    );
  }

  if (stored.schemaVersion === 9) {
    // v9→…→v15: deep-merge profiles, inject leadAheadEnabled/leadOutEnabled/countdown, then v15.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        merged.cameraStateProfiles[state] = {
          ...defProfiles[state],
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(
      migrateV13toV14(migrateV12toV13(migrateV11toV12(migrateV10toV11(migrateV9toV10(merged)))))
    );
  }

  if (stored.schemaVersion === 10) {
    // v10→…→v15: deep-merge profiles, inject leadOutEnabled/countdown, then v15.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        merged.cameraStateProfiles[state] = {
          ...defProfiles[state],
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(
      migrateV13toV14(migrateV12toV13(migrateV11toV12(migrateV10toV11(merged))))
    );
  }

  if (stored.schemaVersion === 11) {
    // v11→…→v15: deep-merge profiles, inject countdown, then v15.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        merged.cameraStateProfiles[state] = {
          ...defProfiles[state],
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(migrateV13toV14(migrateV12toV13(migrateV11toV12(merged))));
  }

  if (stored.schemaVersion === 12) {
    // v12→v13→v14→v15: deep-merge profiles, inject stateOverlay fields, then v15.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        merged.cameraStateProfiles[state] = {
          ...defProfiles[state],
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(migrateV13toV14(migrateV12toV13(merged)));
  }

  if (stored.schemaVersion === 13) {
    // v13→v14→v15: deep-merge profiles (preserving user-tuned spritePx), then full chain.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        merged.cameraStateProfiles[state] = {
          ...defProfiles[state],
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(migrateV13toV14(merged));
  }

  if (stored.schemaVersion === 14) {
    // v14→v15: merge top-level fields, deep-merge profiles, inject overviewClosedTrackZoom.
    const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
    if (stored.cameraStateProfiles) {
      const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
      merged.cameraStateProfiles = {};
      for (const state of Object.keys(defProfiles)) {
        merged.cameraStateProfiles[state] = {
          ...defProfiles[state],
          ...(stored.cameraStateProfiles[state] ?? {}),
        };
      }
    }
    return migrateV14toV15(merged);
  }

  if (stored.schemaVersion !== 15) return { ...DEFAULT_CAMERA_CONFIG };

  // v15: merge top-level fields, then deep-merge cameraStateProfiles.
  const merged = { ...DEFAULT_CAMERA_CONFIG, ...stored };
  if (stored.cameraStateProfiles) {
    const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
    merged.cameraStateProfiles = {};
    for (const state of Object.keys(defProfiles)) {
      merged.cameraStateProfiles[state] = {
        ...defProfiles[state],
        ...(stored.cameraStateProfiles[state] ?? {}),
      };
    }
  }
  return merged;
}

export function saveCameraConfig(config) {
  return storageSet(KEYS.CAMERA_CONFIG, { ...config, schemaVersion: 15 });
}
