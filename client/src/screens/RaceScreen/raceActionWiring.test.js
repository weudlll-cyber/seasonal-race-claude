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
const src = readFileSync(join(HERE, 'index.jsx'), 'utf8');

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
  it('hands the engine the stage-applied dynamics config', () => {
    expect(src).toMatch(
      /const dynamicsConfig = applyRaceActionStage\(\s*loadRaceDynamicsConfig\(\),\s*raceActionStage\s*\)/
    );
    // And the raw loader is not ALSO used to build a dynamics config that could reach the engine —
    // one author for this value on this path, which is the whole point of the stage.
    expect(src.match(/loadRaceDynamicsConfig\(\)/g)).toHaveLength(1);
  });

  // PROPERTY 3 — the HUD's config badge and the CAMERA-REPRO-1 marker are built from this world.
  // If it were gathered without the stage, a wild race would carry a quiet race's fingerprint and a
  // replay taken from the marker would reproduce the wrong config.
  it('builds the HUD/marker world for the same stage', () => {
    expect(src).toMatch(/buildWorldConfig\(\{\s*raceActionStage\s*\}\)/);
    expect(src).not.toMatch(/buildWorldConfig\(\s*\)/);
  });
});
