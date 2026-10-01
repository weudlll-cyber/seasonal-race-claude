// @vitest-environment node
// SUITE-ENV-SPLIT: no DOM and no browser global, here or in anything this file imports — see the
// note in vitest.config.js. Verified by running it in BOTH environments: same tests, same count.
// ============================================================
// File:        raceActionWiring.test.js
// Path:        client/src/screens/RaceScreen/raceActionWiring.test.js
// Project:     RaceArena — RACE-ACTION-CONTROL-1
//
// WHAT THIS IS FOR, and why it reads SOURCE rather than rendering. The seam that decides which
// action configuration a race actually runs is three lines inside RaceScreen's init effect — an
// effect that needs a canvas, a geometry, a rAF loop and a live race to reach. Rendering all of that
// to assert one config assignment would be a large, slow and flaky test of somebody else's machinery.
//
// The alternative used here is the one `modules/engineInputs.test.js` already established in this
// tree: read the file and hold the SHAPE of the wiring. It cannot tell you the race came out right —
// only the fingerprints and the eye do that — but it can tell you the stage is read from the RACE
// rather than from the live setting, which is the one way this seam can silently lie.
//
// Sabotages recorded in reports/evolution/RACE-ACTION-CONTROL-1.md:
//   1. the engine runs the stage        — sabotage: build the config from the raw loader again
//   2. the stage comes from the PAYLOAD — sabotage: read the stored Dev Screen setting instead
//   3. the HUD world agrees with it     — sabotage: call buildWorldConfig() with no stage
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
// P4-RACESCREEN-SPLIT-1 MOVED THE SEAM, not the contract. The resolution this file holds the shape
// of used to sit inline in RaceScreen's init effect; it is now `resolveRaceWorld` in
// raceWorldSetup.js, and RaceScreen hands its `raceCoreParams` to the engine. Both files are read,
// because what is guarded is THE RACE PATH, and the race path is now two files, not one — the same
// shape `CameraDirector.test.js` adopted when FRAME-INPUTS-1 split its render path. The count
// assertion below (`loadRaceDynamicsConfig()` exactly once) is therefore over BOTH files.
const SCREEN = readFileSync(join(HERE, 'index.jsx'), 'utf8');
const src = [SCREEN, readFileSync(join(HERE, 'raceWorldSetup.js'), 'utf8')].join('\n');

describe('P4-RACESCREEN-SPLIT-1 — the resolved world is the one the engine is handed', () => {
  // Without this the properties below could all hold in raceWorldSetup.js while RaceScreen built
  // its engine parameters some other way — the split would have opened exactly the gap this file
  // exists to close.
  it('RaceScreen resolves the world through resolveRaceWorld and builds the race from its params', () => {
    expect(SCREEN).toMatch(/\}\s*=\s*resolveRaceWorld\(\{/);
    expect(SCREEN).toContain('createRaceFromIdentity(raceCoreParams)');
  });
});

describe('RACE-ACTION-CONTROL-1 — the race path runs the stage the RACE carries', () => {
  // PROPERTY 2 — the decisive one. Reading the live Dev Screen setting here would mean a race
  // already on screen changes when the host touches the control, and a replayed payload would run
  // whatever the machine happens to be set to rather than what it recorded.
  it('derives the stage from the race payload, not from storage', () => {
    expect(src).toMatch(
      /const raceActionStage = normalizeRaceActionStage\(\s*raceData\.raceActionStage\s*\)/
    );
  });

  // PROPERTY 1 — the config the engine is handed must be the stage-applied one.
  //
  // RACE-IDENTIFIER-1 (2026-09-05) put a second author in front of this value, and the assertion
  // follows it rather than being relaxed. A race started from a race identifier runs the config
  // world the identifier RECORDED — the stage was already applied when that world was captured, so
  // re-applying it would be applying it twice. Every other race takes the branch this property has
  // always been about. What is asserted is therefore the SHAPE OF THE FALLBACK: the stage is applied
  // to the loaded dynamics whenever no recorded world is in play.
  //
  // Sabotage for this property is unchanged in spirit — build the config from the raw loader again —
  // and it still fails here, because the raw loader may appear exactly once and only inside the
  // stage call.
  it('hands the engine the stage-applied dynamics config', () => {
    expect(src).toMatch(
      /applyRaceActionStage\(\s*loadRaceDynamicsConfig\(\),\s*raceActionStage\s*\)/
    );
    // And the raw loader is not ALSO used to build a dynamics config that could reach the engine —
    // one author for this value on this path, which is the whole point of the stage.
    expect(src.match(/loadRaceDynamicsConfig\(\)/g)).toHaveLength(1);
  });

  // RACE-IDENTIFIER-1 — the override is a PREFERENCE, never a replacement of the fallback. If the
  // recorded branch stopped being conditional, every ordinary race would run whatever the last
  // payload happened to carry.
  it('prefers a recorded config world only when the race carries one', () => {
    expect(src).toMatch(/overrideConfigs\?\.raceDynamicsConfig/);
    expect(src).toMatch(/raceData\.worldConfigOverride\?\.configs \?\? null/);
  });

  // PROPERTY 3 — the HUD's config badge and the CAMERA-REPRO-1 marker are built from this world.
  // If it were gathered without the stage, a wild race would carry a quiet race's fingerprint and a
  // replay taken from the marker would reproduce the wrong config.
  it('builds the HUD/marker world for the same stage', () => {
    expect(src).toMatch(/buildWorldConfig\(\{\s*raceActionStage\s*\}\)/);
    expect(src).not.toMatch(/buildWorldConfig\(\s*\)/);
    // RACE-IDENTIFIER-1: and a reproduced race's badge and marker describe the world it is ACTUALLY
    // running with — the recorded one — or they would name a config the race is not using.
    expect(src).toMatch(/raceData\.worldConfigOverride \?\? buildWorldConfig\(/);
  });
});
