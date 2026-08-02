// ============================================================
// File:        cameraMigrations.js
// Path:        client/src/modules/cameraMigrations.js
// Project:     RaceArena
// Description: Schema migration helpers for cameraConfig.
//              Extracted from cameraConfig.js (Phase 1 refactor).
//              All logic is identical to the original; this is a
//              pure relocation — no behavior change.
// ============================================================

import { DEFAULT_CAMERA_CONFIG } from './storage/defaults.js';

// Reference canvas height used for converting legacy spritePctOfCanvas → spritePx.
// Dirt-oval uses 720px, so this conversion is lossless for the standard test setup.
const LEGACY_CANVAS_H_REF = 720;

// Divisor for v13→v14 migration: spriteScale = spritePx / SPRITE_SCALE_DIVISOR.
// Equals FALLBACK_REFERENCE_SPRITE_SIZE in CameraDirector so default spritePx=36 → spriteScale=1.0.
const SPRITE_SCALE_DIVISOR = 36;

// Converts a scalar cameraTransitionSeconds (stored by v3 configs) to the object
// form expected by CameraDirector. Mutates the merged config in-place.
export function normalizeCameraTransitionSeconds(config) {
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

export function migrateV3toV5(config) {
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
export function migrateV4toV5(config) {
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
export function migrateV5toV6(config) {
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

// v6→v7: convert spritePct (fraction of canvas height) to spritePx (world pixels).
// Uses dirt-oval canvas height (720px) as the reference so existing dirt-oval setups are
// visually unchanged. Configs already carrying spritePx (e.g. from buildProfilesFromLegacy)
// are passed through unchanged.
export function migrateV6toV7(config) {
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

// v7→v8: add transitionTConvergence global and maxEntryDurationMs per state.
// All other fields pass through unchanged — no behavior change for existing tuned configs
// since the new fields are injected at their new defaults.
export function migrateV7toV8(config) {
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

// v8→v9: add overviewOffsetPx to the OVERVIEW profile. All other fields pass through unchanged.
export function migrateV8toV9(config) {
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

// v9→v10: add leadAheadEnabled: false to LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM profiles.
// OVERVIEW is excluded — it never uses lead-ahead (leadInDuration: 0).
export function migrateV9toV10(config) {
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

// v10→v11: add leadOutEnabled: false to LEADER_ZOOM, BATTLE_ZOOM, COMEBACK_ZOOM profiles.
// OVERVIEW is excluded — it has leadOutDuration: 0 so lead-out is never active there.
export function migrateV10toV11(config) {
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

// v11→v12: add countdownStartZoomSpritePx and countdownDurationMs at their defaults.
// All existing fields pass through unchanged.
export function migrateV11toV12(config) {
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
export function migrateV12toV13(config) {
  return {
    ...config,
    stateOverlayEnabled: config.stateOverlayEnabled ?? DEFAULT_CAMERA_CONFIG.stateOverlayEnabled,
    stateOverlayDurationMs:
      config.stateOverlayDurationMs ?? DEFAULT_CAMERA_CONFIG.stateOverlayDurationMs,
    schemaVersion: 13,
  };
}

// v13→v14: replace spritePx (absolute px) with spriteScale (relative factor) in all profiles.
// spritePx wins over spriteScale because intermediate migrations deep-merge DEFAULT_CAMERA_CONFIG
// (which now carries spriteScale) before v13→v14 runs — so a user-stored spritePx alongside an
// injected default spriteScale must still be honoured.
export function migrateV13toV14(config) {
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

// v14→v15: add overviewClosedTrackZoom at its default. All other fields pass through unchanged.
export function migrateV14toV15(config) {
  return {
    ...config,
    overviewClosedTrackZoom:
      config.overviewClosedTrackZoom ?? DEFAULT_CAMERA_CONFIG.overviewClosedTrackZoom,
    schemaVersion: 15,
  };
}

// v15→v16: add leaderMinZoomFraction at its default. All other fields pass through unchanged.
export function migrateV15toV16(config) {
  return {
    ...config,
    leaderMinZoomFraction:
      config.leaderMinZoomFraction ?? DEFAULT_CAMERA_CONFIG.leaderMinZoomFraction,
    schemaVersion: 16,
  };
}

// v16→v17 (15b): BATTLE closeness world-px → arc-fraction. Strip the dead px thresholds
// (battlePulkThresholdPx / battleIsolationThresholdPx), migrate the old 0.12 closeness default
// to the new arc default (0.05) while preserving any non-default user value, and inject the arc
// isolation knob at its default. All other fields pass through unchanged.
export function migrateV16toV17(config) {
  // eslint-disable-next-line no-unused-vars
  const { battlePulkThresholdPx, battleIsolationThresholdPx, ...rest } = config;
  return {
    ...rest,
    battlePulkThresholdT:
      config.battlePulkThresholdT === 0.12
        ? DEFAULT_CAMERA_CONFIG.battlePulkThresholdT
        : (config.battlePulkThresholdT ?? DEFAULT_CAMERA_CONFIG.battlePulkThresholdT),
    battleIsolationThresholdT:
      config.battleIsolationThresholdT ?? DEFAULT_CAMERA_CONFIG.battleIsolationThresholdT,
    schemaVersion: 17,
  };
}

// v17→v18 (CAMERA-ZOOM-UNIT-1): ONE zoom unit — track widths.
//
// Every state's zoom setting becomes `trackWidths` (how many track widths of world are visible
// across the frame). The old per-state `spriteScale` is DROPPED rather than converted, and so is
// OVERVIEW's target-sprite-size input: the owner chose clean round defaults over reproducing the
// previous picture, so a conversion would compute a number nobody wants. Two retired keys go with
// it — `overviewClosedTrackZoom` (dead in code since 2026-06-04, its slider and tooltip still
// claiming otherwise) and `overviewMinEffZoom` (an open-track-only second zoom bound on the same
// surface) — and the countdown's `countdownStartZoomSpritePx` becomes `countdownStartTrackWidths`.
//
// A stored value the owner set on ANY key this block did not touch survives untouched (Lesson 193).
export function migrateV17toV18(config) {
  const {
    // eslint-disable-next-line no-unused-vars
    overviewClosedTrackZoom,
    // eslint-disable-next-line no-unused-vars
    overviewMinEffZoom,

    overviewTargetScreenPx: _ovTargetPx,
    // eslint-disable-next-line no-unused-vars
    countdownStartZoomSpritePx,
    ...rest
  } = config;
  const defProfiles = DEFAULT_CAMERA_CONFIG.cameraStateProfiles;
  const profiles = {};
  for (const state of Object.keys(defProfiles)) {
    // eslint-disable-next-line no-unused-vars
    const { spriteScale, spritePx, ...keep } = config.cameraStateProfiles?.[state] ?? {};
    profiles[state] = {
      ...defProfiles[state],
      ...keep,
      trackWidths: defProfiles[state].trackWidths,
    };
  }
  return {
    ...rest,
    // The render-time sprite floor keeps its own key and its stored value — it is NOT the camera's
    // zoom input any more, and RaceScreen still reads it. See the report.
    overviewTargetScreenPx: _ovTargetPx ?? DEFAULT_CAMERA_CONFIG.overviewTargetScreenPx,
    countdownStartTrackWidths: DEFAULT_CAMERA_CONFIG.countdownStartTrackWidths,
    cameraStateProfiles: profiles,
    schemaVersion: 18,
  };
}
