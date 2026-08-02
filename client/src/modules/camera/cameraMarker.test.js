// ============================================================
// cameraMarker.test.js — CAMERA-REPRO-1 Part D
//
// The marker is an INSTRUMENT: if it loses a field, mangles a line, or round-trips into something
// slightly different, the replay stands in a moment that never happened and says nothing about it.
// So these tests are about the properties the replay path actually depends on:
//   • the line is ONE line and survives a copy/paste round trip
//   • the config diff is lossless — applying it back onto the defaults reproduces the owner's world
//   • the witness fields (leader + t-sum) are really taken from the field, not assumed
//   • the unseeded-race case is flagged rather than silently produced
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  MARKER_PREFIX,
  MARKER_MAX_CHARS,
  buildCameraMarker,
  formatMarkerLine,
  formatMarkerSummary,
  parseMarkerLine,
  isReplayable,
  configDiffWithValues,
  applyConfigDiff,
} from './cameraMarker.js';
import { DEFAULT_CONFIG_WORLD } from '../storage/defaults.js';

const racer = (index, name, t, x, y) => ({ index, name, t, x, y });

function sampleInput(overrides = {}) {
  return {
    raceData: {
      geometryId: 'custom-abc',
      trackName: 'Searound',
      racerTypeId: 'manta',
      targetLaps: 3,
      targetDurationSec: undefined,
      worldWidth: 2048,
      worldHeight: 1152,
      racePlanSeed: 5601,
      racePlanEnabled: true,
      trackSurfaceClasses: ['water'],
    },
    raceState: {
      racers: [
        racer(0, 'Ada', 1.25, 100, 200),
        racer(1, 'Bo', 1.4, 300, 400),
        racer(2, 'Cy', 0.9, 50, 60),
      ],
      raceProgress: 0.47,
      finishT: 3,
    },
    cameraSeed: 123456,
    physicsTs: 41536,
    camMs: 45536,
    frameLogIdx: 812,
    logs: { frame: true, detour: false },
    shot: {
      state: 'LEADER_ZOOM',
      lerpPhase: 'tracking',
      observerPhase: 'follow',
      zoom: 2.431,
      offsetX: -812.44,
      offsetY: -233.19,
      targetZoom: 2.5,
      targetOffsetX: -820,
      targetOffsetY: -230,
      camT: 0.4213,
      effZoomX: 1.5194,
      effZoomY: 1.2811,
      anchor: 'Bo',
    },
    cfg: { fingerprint: 'ded0a126', diff: {}, racerTypeOverrides: {} },
    build: '0c3d44a6',
    at: '2026-08-02T10:22:33.123Z',
    ...overrides,
  };
}

describe('buildCameraMarker', () => {
  it('carries the race identity a replay needs to rebuild the race', () => {
    const m = buildCameraMarker(sampleInput());
    expect(m.v).toBe(1);
    expect(m.race).toMatchObject({
      geo: 'custom-abc',
      n: 3,
      type: 'manta',
      laps: 3,
      ww: 2048,
      wh: 1152,
      seed: 5601,
      plan: true,
    });
    expect(m.race.names).toEqual(['Ada', 'Bo', 'Cy']);
    expect(m.cam.seed).toBe(123456);
  });

  it('anchors the moment on physicsTs — the clock that is deterministic, not the frame index', () => {
    const m = buildCameraMarker(sampleInput());
    expect(m.moment.pts).toBe(41536);
    expect(m.moment.cms).toBe(45536);
    expect(m.moment.fi).toBe(812);
    expect(m.moment.log).toEqual({ frame: true, detour: false });
  });

  it('records the camera AS RENDERED, including BOTH world→screen axis scales', () => {
    const m = buildCameraMarker(sampleInput());
    expect(m.shot.st).toBe('LEADER_ZOOM');
    expect(m.shot.z).toBeCloseTo(2.431, 6);
    expect(m.shot.ox).toBeCloseTo(-812.44, 3);
    // Two scales, not one: a closed track scales X by zoom×bsX and Y by zoom×bsY. Projecting a
    // racer with the X scale on both axes puts it hundreds of pixels off vertically — that is
    // exactly the class of scale confusion the projection refactor was about.
    expect(m.shot.ezx).toBeCloseTo(1.5194, 6);
    expect(m.shot.ezy).toBeCloseTo(1.2811, 6);
    expect(m.shot.ezx).not.toBe(m.shot.ezy);
    expect(m.shot.anchor).toBe('Bo');
  });

  it('derives the witness from the field: leader by t, the t-sum, and every racer t', () => {
    const m = buildCameraMarker(sampleInput());
    expect(m.world.leader).toBe('Bo'); // highest t, not first in the array
    expect(m.world.lt).toBeCloseTo(1.4, 6);
    expect(m.world.tsum).toBeCloseTo(1.25 + 1.4 + 0.9, 6);
    // The per-racer vector is what makes a failed witness diagnosable: an authored plan can pin the
    // leader exactly while the field behind it diverges, and leader+sum alone cannot say who moved.
    expect(m.world.tvec).toEqual([1.25, 1.4, 0.9]);
  });

  it('survives a race state with no racers rather than throwing mid-eye-test', () => {
    const m = buildCameraMarker(sampleInput({ raceState: { racers: [] } }));
    expect(m.race.n).toBe(0);
    expect(m.world.leader).toBeNull();
    expect(m.world.tsum).toBe(0);
    expect(m.world.tvec).toEqual([]);
  });
});

describe('isReplayable', () => {
  it('true for a seeded race', () =>
    expect(isReplayable(buildCameraMarker(sampleInput()))).toBe(true));

  it('false when racePlanSeed is 0 — the race came off an unseeded stream', () => {
    const input = sampleInput();
    input.raceData.racePlanSeed = 0;
    expect(isReplayable(buildCameraMarker(input))).toBe(false);
  });
});

describe('formatMarkerLine / parseMarkerLine', () => {
  it('emits exactly ONE line', () => {
    const line = formatMarkerLine(buildCameraMarker(sampleInput()));
    expect(line.split('\n')).toHaveLength(1);
    expect(line.startsWith(MARKER_PREFIX)).toBe(true);
  });

  it('round-trips every field', () => {
    const m = buildCameraMarker(sampleInput());
    expect(parseMarkerLine(formatMarkerLine(m))).toEqual(m);
  });

  it('round-trips through the mess a copy/paste makes of it', () => {
    const m = buildCameraMarker(sampleInput());
    const line = formatMarkerLine(m);
    const mangled = [
      `  ${line}  `,
      `"${line}"`,
      `[RA CAMERA MARK] summary text\n${line}`,
      `> ${line},`,
    ];
    for (const variant of mangled) expect(parseMarkerLine(variant)).toEqual(m);
  });

  it('drops ONLY the roster when the line would get too long, and records that it did', () => {
    const input = sampleInput();
    input.raceState.racers = Array.from({ length: 400 }, (_, i) =>
      racer(i, `RacerWithAVeryLongName${i}`, i / 1000, i, i)
    );
    const m = buildCameraMarker(input);
    const line = formatMarkerLine(m);
    expect(line.length).toBeLessThanOrEqual(MARKER_MAX_CHARS + 200);
    const parsed = parseMarkerLine(line);
    expect(parsed.race.names).toBeUndefined();
    expect(parsed.race.namesOmitted).toBe(400);
    expect(parsed.world.tvecOmitted ?? parsed.world.tvec.length).toBe(400);
    // everything the replay actually needs is still there
    expect(parsed.race.seed).toBe(5601);
    expect(parsed.moment.pts).toBe(41536);
    expect(parsed.world.tsum).toBeCloseTo(m.world.tsum, 6);
  });

  it('refuses a line that is not a marker instead of returning half of one', () => {
    expect(() => parseMarkerLine('')).toThrow(/empty/);
    expect(() => parseMarkerLine('just some log output')).toThrow(/no RA-MARK1 token/);
    expect(() => parseMarkerLine('RA-MARK1 not json {')).toThrow(/not valid JSON/);
    expect(() => parseMarkerLine('RA-MARK1 {"v":99}')).toThrow(/unsupported marker version/);
  });
});

describe('formatMarkerSummary', () => {
  it('names the moment in one readable line', () => {
    const s = formatMarkerSummary(buildCameraMarker(sampleInput()));
    expect(s).toContain('Searound');
    expect(s).toContain('seed 5601');
    expect(s).toContain('LEADER_ZOOM');
    expect(s).toContain('Bo');
  });

  it('says plainly when the race was unseeded', () => {
    const input = sampleInput();
    input.raceData.racePlanSeed = 0;
    expect(formatMarkerSummary(buildCameraMarker(input))).toContain('UNSEEDED');
  });
});

describe('configDiffWithValues / applyConfigDiff', () => {
  it('is empty when the owner is on shipped defaults', () => {
    expect(configDiffWithValues(DEFAULT_CONFIG_WORLD, DEFAULT_CONFIG_WORLD)).toEqual({});
  });

  it('captures the CHANGED keys with their values, not just their names', () => {
    const current = {
      ...DEFAULT_CONFIG_WORLD,
      cameraConfig: { ...DEFAULT_CONFIG_WORLD.cameraConfig, minRacersVisible: 12 },
      baseSpeedConfig: { ...DEFAULT_CONFIG_WORLD.baseSpeedConfig, normalSpeed: 180 },
    };
    const diff = configDiffWithValues(current, DEFAULT_CONFIG_WORLD);
    expect(diff.cameraConfig.minRacersVisible).toBe(12);
    expect(diff.baseSpeedConfig.normalSpeed).toBe(180);
    expect(Object.keys(diff)).toEqual(expect.arrayContaining(['cameraConfig', 'baseSpeedConfig']));
  });

  it('is lossless: defaults + diff reproduces the world the marker was taken in', () => {
    const current = {
      ...DEFAULT_CONFIG_WORLD,
      cameraConfig: {
        ...DEFAULT_CONFIG_WORLD.cameraConfig,
        minRacersVisible: 12,
        cameraStateProfiles: {
          ...DEFAULT_CONFIG_WORLD.cameraConfig.cameraStateProfiles,
          LEADER_ZOOM: {
            ...DEFAULT_CONFIG_WORLD.cameraConfig.cameraStateProfiles.LEADER_ZOOM,
            spriteScale: 3,
          },
        },
      },
      raceDynamicsConfig: { ...DEFAULT_CONFIG_WORLD.raceDynamicsConfig, reRollIntervalDivisor: 7 },
    };
    const rebuilt = applyConfigDiff(
      DEFAULT_CONFIG_WORLD,
      configDiffWithValues(current, DEFAULT_CONFIG_WORLD)
    );
    for (const block of Object.keys(DEFAULT_CONFIG_WORLD)) {
      expect(JSON.stringify(rebuilt[block])).toBe(JSON.stringify(current[block]));
    }
  });

  it('does not mutate the defaults world it rebuilds from', () => {
    const before = JSON.stringify(DEFAULT_CONFIG_WORLD);
    applyConfigDiff(DEFAULT_CONFIG_WORLD, { cameraConfig: { minRacersVisible: 99 } });
    expect(JSON.stringify(DEFAULT_CONFIG_WORLD)).toBe(before);
  });

  it('survives the full marker round trip — a diff read back off a line still rebuilds the world', () => {
    const current = {
      ...DEFAULT_CONFIG_WORLD,
      cameraConfig: { ...DEFAULT_CONFIG_WORLD.cameraConfig, minRacersVisible: 12 },
    };
    const m = buildCameraMarker(
      sampleInput({
        cfg: {
          fingerprint: 'abc',
          diff: configDiffWithValues(current, DEFAULT_CONFIG_WORLD),
          racerTypeOverrides: {},
        },
      })
    );
    const parsed = parseMarkerLine(formatMarkerLine(m));
    expect(
      applyConfigDiff(DEFAULT_CONFIG_WORLD, parsed.cfg.diff).cameraConfig.minRacersVisible
    ).toBe(12);
  });
});
