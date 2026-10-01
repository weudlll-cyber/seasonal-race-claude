// ============================================================
// File:        raceWorldSetup.js
// Path:        client/src/screens/RaceScreen/raceWorldSetup.js
// Project:     RaceArena — P4-RACESCREEN-SPLIT-1
// Description: Everything the browser race is BUILT FROM, resolved once at race start: the racer
//              type's physics fields (recorded or live), the config world (recorded or read from
//              this host), the race action stage, the config-fingerprint badge and diff, and the
//              parameters `createRaceFromIdentity` takes.
//
// WHAT IT OWNS AND WHY IT IS ITS OWN MODULE. This was ~130 lines at the top of RaceScreen's
// race-init effect, between the scene setup and the engine call, and it answers one question —
// WHICH WORLD IS THIS RACE RUN IN — that has nothing to do with React, the canvas or the frame
// loop. It is the half of the screen that decides physics inputs, which is why it is worth
// reading on its own: RACE-IDENTIFIER-1/-2 (a reproduced race runs the world it recorded, not this
// machine's), RACE-ACTION-CONTROL-1 (the stage comes from the payload) and RACE-PARAMS-2 (the
// derivation itself lives in `modules/raceParams.js`) all meet here.
//
// IT IS STILL THE SCREEN SIDE. It reads this host's storage — the loaders and the racer-type
// override lookup — on purpose: `raceParams.js` deliberately reads no storage and is HANDED the
// answers, and that division is unchanged. "Here" in the comments below means this screen-side
// resolution, as it meant RaceScreen when they were written.
//
// The engine call itself (`createRaceFromIdentity`) stays in RaceScreen — RaceScreen is the
// driver, and `scripts/engine-reach.mjs` finds drivers by that import.
//
// MOVED VERBATIM (P4-RACESCREEN-SPLIT-1): the same loaders in the same order, the same override
// preferences, the same copy-before-mutate, the same `buildRaceCoreParams` call. `shapeRef.current`
// arrives as `shape`. The comments are the ones that sat beside this code in RaceScreen.
// ============================================================

import { loadBaseSpeedConfig } from '../../modules/baseSpeedConfig.js';
import { MIN_LAPS } from '../../modules/durationModel.js';
import { loadRaceBehaviorConfig } from '../../modules/raceBehaviorConfig.js';
import { buildRaceCoreParams } from '../../modules/raceParams.js';
import { loadRowLayoutConfig } from '../../modules/rowLayoutConfig.js';
import { loadRaceDynamicsConfig } from '../../modules/raceDynamicsConfig.js';
import { applyRaceActionStage, normalizeRaceActionStage } from '../../modules/raceActionStage.js';
import { loadFrameTimingConfig } from '../../modules/frameTimingConfig.js';
import { loadAutoScaleConfig } from '../../modules/autoSpriteScale.js';
import { configFingerprintBadge, buildWorldConfig } from '../../modules/exportRaceConfig.js';
import { configDiffWithValues } from '../../modules/camera/cameraMarker.js';
// MIRRORS-BY-REFERENCE (LESSONS L207): fallbacks in this file READ the default instead of copying it.
import { DEFAULT_CONFIG_WORLD } from '../../modules/storage/defaults.js';
import { storageGet, KEYS } from '../../modules/storage/storage.js';

/**
 * Resolve the world a browser race is built from.
 *
 * @param {object} p
 * @param {object} p.raceData          the validated race payload
 * @param {object} p.geometry          the stored track geometry
 * @param {string} p.typeId            the racer type id
 * @param {object} p.racerType         `getRacerType(typeId)` — this host's live type
 * @param {object} p.shape             the EditorShape built from `geometry`
 * @param {boolean} p.isOpenTrack
 * @param {number} p.trackWidthPx
 * @param {number} p.nRacers
 * @param {boolean} p.constSpeedActive the `?constSpeed=1` diagnostic
 * @returns {object} the resolved world: `speedMultiplier`, `raceActionStage`, `dynamicsConfig`,
 *   `frameTimingConfig`, `cfgWorld`, `cfgBadge`, `cfgDiff`, `displaySize`, `racePlanSeed`,
 *   `pathLengthPx`, `displaySizeScale` and `raceCoreParams` (exactly what `createRaceFromIdentity` takes)
 */
export function resolveRaceWorld({
  raceData,
  geometry,
  typeId,
  racerType,
  shape,
  isOpenTrack,
  trackWidthPx,
  nRacers,
  constSpeedActive,
}) {
  // ── ★ RACE-IDENTIFIER-2: THE RACER TYPE IS PART OF THE RACE, AND IT WAS BEING TAKEN FROM THIS
  //    MACHINE. This is the defect the owner hit: he retuned a racer, pasted an identifier, and
  //    got HIS racer at HIS speed under the identifier's name.
  //
  //    `getRacerType` returns the type with THIS host's stored overrides already applied
  //    (`racer-types/index.js:293-300` applies them at boot). The identifier has recorded the
  //    same fields all along — `effectiveRacerTypes`, which `exportRaceConfig.js` builds from
  //    `SIM_TYPE_FIELDS` — and nothing on the race path read them. `speedMultiplier` is a
  //    first-order physics input, so the result was a DIFFERENT RACE under the same identifier,
  //    silently, which is the one outcome this feature exists to prevent.
  //
  //    NOTHING ABOUT THE ENCODING CHANGES HERE. The values were always in the string; this is the
  //    read that was missing. A race with no identifier takes the live type exactly as before.
  const recordedType = raceData.worldConfigOverride?.effectiveRacerTypes?.[typeId] ?? null;
  const typeField = (name) =>
    recordedType && name in recordedType ? recordedType[name] : racerType.config[name];

  const speedMultiplier =
    recordedType && 'speedMultiplier' in recordedType
      ? recordedType.speedMultiplier
      : racerType.getSpeedMultiplier();

  // ── RACE-IDENTIFIER-1: where a REPRODUCED race stops reading this machine ──────────────────
  //
  // Every loader below reads THE HOST'S localStorage, and that is exactly why a seed alone does
  // not repeat a race: two operators on the same seed and the same build get two races, because
  // their stored config differs and nothing on screen says so.
  //
  // When a race was started from a race identifier, the identifier carries the config world it was
  // recorded with, and the payload brings it here. `cfg()` prefers that copy and otherwise reads
  // the host exactly as before — so with no identifier in play this is the same code it replaced,
  // loader for loader, which is why no fingerprint moves.
  const overrideConfigs = raceData.worldConfigOverride?.configs ?? null;
  const cfg = (name, load) => overrideConfigs?.[name] ?? load();

  const baseSpeedConfig = cfg('baseSpeedConfig', loadBaseSpeedConfig);

  // ★ COPIED BEFORE IT IS MUTATED, and the copy is the whole point of the spread.
  //
  // `cfg()` returns the RECORDED config when a race was started from an identifier — the very
  // object that also sits in `cfgWorld` below and, since RACE-SAVE-3, gets stored as the race's
  // world. Writing `isOpen` onto it therefore wrote a derived field INTO THE RECORD: a repeated
  // race was stored with one key its original did not have, so the two were no longer the same
  // race on paper even though they ran identically. Found by the browser test in RACE-HISTORY-4,
  // which compares a repeat's stored world against the original's.
  //
  // `loadRaceBehaviorConfig()` already returns a fresh object each call, so the non-override path
  // never had the problem and is unaffected by the copy.
  const behaviorConfig = { ...cfg('raceBehaviorConfig', loadRaceBehaviorConfig) };
  behaviorConfig.isOpen = isOpenTrack;
  const rowConfig = cfg('rowLayoutConfig', loadRowLayoutConfig);
  // RACE-ACTION-CONTROL-1: the stage this race was STARTED with, read from the race payload rather
  // than from the live Dev Screen setting — so changing the control while a race is on screen
  // cannot change the race on screen, and a replayed payload runs the stage it recorded. A payload
  // from before this change carries no stage and normalises to the shipped one.
  const raceActionStage = normalizeRaceActionStage(raceData.raceActionStage);
  // The stage is applied on TOP of the stored dynamics, and the identifier records the config
  // world AFTER that application (`buildWorldConfig` does the same), so a reproduced race takes
  // the recorded block whole rather than re-applying a stage to it.
  const dynamicsConfig = overrideConfigs?.raceDynamicsConfig
    ? overrideConfigs.raceDynamicsConfig
    : applyRaceActionStage(loadRaceDynamicsConfig(), raceActionStage);
  const frameTimingConfig = cfg('frameTimingConfig', loadFrameTimingConfig);

  // Config-fingerprint badge (fix-plan step 4): short world hash + how many config keys are off the
  // shipped defaults. Race-constant, computed once here; drawn under the seed badge in the loop below.
  // CAMERA-REPRO-1 reuses the SAME world snapshot for the marker's config diff — one gather, so the
  // badge and the marker can never disagree about what this race was configured with.
  // The badge and the camera marker must describe the world the race is ACTUALLY running with,
  // which for a reproduced race is the recorded one.
  const cfgWorld = raceData.worldConfigOverride ?? buildWorldConfig({ raceActionStage });
  const cfgBadge = configFingerprintBadge(cfgWorld);
  const cfgDiff = configDiffWithValues(cfgWorld.configs, DEFAULT_CONFIG_WORLD);

  // Auto-sprite-scale: compute displaySizeScale unless D3.5.5 override exists
  const autoScaleConfig = cfg('autoScaleConfig', loadAutoScaleConfig);
  // RACE-IDENTIFIER-2: the other three SIM fields the identifier records, read the same way.
  // They set the drawn body size, which the START GRID packs on and the avoidance body uses — so
  // a retuned SIZE moves the race exactly as a retuned speed does.
  const displaySize = typeField('displaySize');
  // ── RACE-PARAMS-2: the whole derivation lives in `modules/raceParams.js` now ────────────────
  //
  // ONE-HOME-RACE-PARAMS-1 moved the SPRITE arithmetic there and left the rest standing here —
  // the effective width, the isOpen-stamped behaviour config, the normal speed, and the twenty
  // fields `createRaceFromIdentity` takes. Two harnesses had transcribed all of it and said so in
  // their own headers (`scripts/camera-replay.mjs`, `scripts/parity/goldenRunner.mjs`), which is
  // how transcriptions drift: the copies agree until one is edited, and the thing that would
  // notice is one of the copies.
  //
  // THE OVERRIDE LOOKUP STAYS HERE, exactly as it did: it is a storage read, and the module
  // deliberately reads no storage. It is handed the answer rather than going to find it.
  const rawOverrides = storageGet(KEYS.RACER_TYPE_OVERRIDES, {});
  const typeOverride = rawOverrides[typeId];
  const racePlanSeed = raceData.racePlanSeed ?? 0;
  const pathLengthPx = geometry.pathLengthPx ?? 0;
  // `displaySizeScale` is NOT a `createRaceFromIdentity` field — it is the drawing scale, and the
  // rest goes to the engine untouched. Separated here rather than in the module so the object the
  // engine receives is exactly the object the module built.
  const { displaySizeScale, ...raceCoreParams } = buildRaceCoreParams({
    shape,
    isOpenTrack,
    pathLengthPx,
    trackWidthPx,
    world: {
      baseSpeedConfig,
      raceBehaviorConfig: behaviorConfig,
      rowLayoutConfig: rowConfig,
      raceDynamicsConfig: dynamicsConfig,
      autoScaleConfig,
    },
    racerType: {
      displaySize,
      bodyFillX: typeField('bodyFillX'),
      bodyFillY: typeField('bodyFillY'),
      speedMultiplier,
    },
    nRacers,
    laps: raceData.targetLaps ?? MIN_LAPS,
    requestedSeconds: raceData.targetDurationSec ?? raceData.targetDuration ?? 60,
    racePlanSeed,
    racePlanEnabledFlag: !!raceData.racePlanEnabled,
    hasDisplaySizeOverride:
      !!typeOverride && typeof typeOverride === 'object' && 'displaySize' in typeOverride,
    constSpeedActive,
  });
  return {
    speedMultiplier,
    raceActionStage,
    dynamicsConfig,
    frameTimingConfig,
    cfgWorld,
    cfgBadge,
    cfgDiff,
    displaySize,
    racePlanSeed,
    pathLengthPx,
    displaySizeScale,
    raceCoreParams,
  };
}
