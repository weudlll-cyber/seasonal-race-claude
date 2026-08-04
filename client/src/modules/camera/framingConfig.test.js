// ============================================================
// File:        framingConfig.test.js
// Path:        client/src/modules/camera/framingConfig.test.js
// Project:     RaceArena — CAMERA-HYGIENE-2
//
// WHAT THESE GUARANTEE: that every framing setting's validation BAND behaves as the code says —
// out of range means the DEFAULT, not the nearest legal value, and not the raw number.
//
// WHY THEY ARE WORTH WRITING. Two of these bands had no test at all before this file:
//
//   `referenceCorridorPx` is the unit every other camera setting is measured in. A zero or negative
//   value reaching the director unrejected would make `referenceWidthFor` return 0 and every zoom
//   on every track meaningless — the most load-bearing single number in the camera, and nothing
//   asserted its guard.
//
//   `cameraTransitionGrammar` had tests for its two real values but none for an unknown one, so
//   nothing pinned the deliberate choice that a typo degrades to 'legacy' (the oldest, most
//   forgiving entry path) rather than throwing or silently becoming 'glide'.
//
// And the reject-vs-clamp behaviour is the thing that fooled the CAMERA-HYGIENE-1 control audit
// into reporting a live control as dead, so it is worth having stated somewhere that can fail.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  resolveFramingConfig,
  DEFAULT_CORRIDORS,
  DEFAULT_REFERENCE_CORRIDOR_PX,
  DEFAULT_MIN_RACERS_VISIBLE,
  DEFAULT_INNER_FRAME_PCT,
  ALL_FRAMED_STATES,
} from './framingConfig.js';
import { DEFAULT_CAMERA_CONFIG } from '../storage/defaults.js';

describe('resolveFramingConfig — no config at all', () => {
  const f = resolveFramingConfig(null);

  it('every state gets its shipped corridor default', () => {
    for (const s of ALL_FRAMED_STATES) expect(f.corridorsByState[s]).toBe(DEFAULT_CORRIDORS[s]);
  });

  it('the widest shot is OVERVIEW and the tightest is PHOTO_FINISH', () => {
    // The ordering is the design, not an accident: the establishing shot is the widest and the
    // most dramatic moment in the race is the closest.
    const c = f.corridorsByState;
    expect(c.OVERVIEW).toBeGreaterThan(c.LEADER_ZOOM);
    expect(c.LEADER_ZOOM).toBeGreaterThan(c.BATTLE_ZOOM);
    expect(c.PHOTO_FINISH).toBeLessThan(c.BATTLE_ZOOM);
  });

  it('falls back to the shipped reference corridor, inner frame and company size', () => {
    expect(f.referenceCorridorPx).toBe(DEFAULT_REFERENCE_CORRIDOR_PX);
    expect(f.innerFramePct).toBe(DEFAULT_INNER_FRAME_PCT);
    expect(f.minRacersVisible).toBe(DEFAULT_MIN_RACERS_VISIBLE);
  });

  it("a bare caller gets 'legacy' entry style and dead-centre framing", () => {
    expect(f.transitionGrammar).toBe('legacy');
    expect(f.leaderForwardFrac).toBeNull();
    expect(f.glideDurationMs).toBe(500);
  });

  it('leaves countdownCorridors undefined so the director applies its own clamped fallback', () => {
    expect(f.countdownCorridors).toBeUndefined();
  });
});

describe('resolveFramingConfig — the shipped config', () => {
  // If DEFAULT_CAMERA_CONFIG ever drifts out of a band, the shipped game silently runs on a code
  // fallback instead of the value the owner set. That has happened before, in tooltips.
  const f = resolveFramingConfig(DEFAULT_CAMERA_CONFIG);

  it('every shipped value survives its own validation band', () => {
    expect(f.referenceCorridorPx).toBe(DEFAULT_CAMERA_CONFIG.referenceCorridorPx);
    expect(f.glideDurationMs).toBe(DEFAULT_CAMERA_CONFIG.glideDurationMs);
    expect(f.leaderForwardFrac).toBe(DEFAULT_CAMERA_CONFIG.leaderForwardFrac);
    expect(f.transitionGrammar).toBe(DEFAULT_CAMERA_CONFIG.cameraTransitionGrammar);
    expect(f.minRacersVisible).toBe(DEFAULT_CAMERA_CONFIG.minRacersVisible);
    expect(f.innerFramePct).toBe(DEFAULT_CAMERA_CONFIG.targetInnerFramePct);
  });

  it('every state profile supplies its own corridor width', () => {
    for (const s of ALL_FRAMED_STATES) {
      expect(f.corridorsByState[s]).toBe(
        DEFAULT_CAMERA_CONFIG.cameraStateProfiles[s].visibleCorridors
      );
    }
  });
});

describe('resolveFramingConfig — the bands REJECT, they do not clamp', () => {
  const band = (config) => resolveFramingConfig(config);

  it('referenceCorridorPx: zero, negative and non-numeric all fall back to 300', () => {
    // The unit every other setting is measured in. A 0 here would make referenceWidthFor return 0
    // and every zoom on every track meaningless.
    for (const bad of [0, -50, NaN, Infinity, null, undefined, '300']) {
      expect(band({ referenceCorridorPx: bad }).referenceCorridorPx).toBe(
        DEFAULT_REFERENCE_CORRIDOR_PX
      );
    }
    expect(band({ referenceCorridorPx: 450 }).referenceCorridorPx).toBe(450);
  });

  it('glideDurationMs: 299 and 901 are REJECTED to 500, not pulled to 300 and 900', () => {
    expect(band({ glideDurationMs: 299 }).glideDurationMs).toBe(500);
    expect(band({ glideDurationMs: 901 }).glideDurationMs).toBe(500);
    expect(band({ glideDurationMs: 300 }).glideDurationMs).toBe(300); // inclusive edge
    expect(band({ glideDurationMs: 900 }).glideDurationMs).toBe(900); // inclusive edge
  });

  it('leaderForwardFrac: 0.5 is not forward and 0.81 is off the frame — both mean centred', () => {
    expect(band({ leaderForwardFrac: 0.5 }).leaderForwardFrac).toBeNull();
    expect(band({ leaderForwardFrac: 0.81 }).leaderForwardFrac).toBeNull();
    expect(band({ leaderForwardFrac: 0.51 }).leaderForwardFrac).toBe(0.51);
    expect(band({ leaderForwardFrac: 0.8 }).leaderForwardFrac).toBe(0.8); // inclusive upper edge
  });

  it("cameraTransitionGrammar: an unknown value degrades to 'legacy', it does not become 'glide'", () => {
    // Deliberate: a typo lands on the oldest and most forgiving entry path rather than silently
    // selecting a shipped grammar the author did not ask for.
    expect(band({ cameraTransitionGrammar: 'wibble' }).transitionGrammar).toBe('legacy');
    expect(band({ cameraTransitionGrammar: '' }).transitionGrammar).toBe('legacy');
    expect(band({ cameraTransitionGrammar: 'Glide' }).transitionGrammar).toBe('legacy'); // case matters
    expect(band({ cameraTransitionGrammar: 'glide' }).transitionGrammar).toBe('glide');
    expect(band({ cameraTransitionGrammar: 'cut' }).transitionGrammar).toBe('cut');
  });

  it('visibleCorridors: a zero or negative width falls back to that state own default', () => {
    for (const bad of [0, -1, NaN]) {
      const f = band({ cameraStateProfiles: { LEADER_ZOOM: { visibleCorridors: bad } } });
      expect(f.corridorsByState.LEADER_ZOOM).toBe(DEFAULT_CORRIDORS.LEADER_ZOOM);
    }
  });

  it('one state configured does not disturb the others', () => {
    const f = band({ cameraStateProfiles: { BATTLE_ZOOM: { visibleCorridors: 0.9 } } });
    expect(f.corridorsByState.BATTLE_ZOOM).toBe(0.9);
    expect(f.corridorsByState.LEADER_ZOOM).toBe(DEFAULT_CORRIDORS.LEADER_ZOOM);
    expect(f.corridorsByState.OVERVIEW).toBe(DEFAULT_CORRIDORS.OVERVIEW);
  });

  it('minRacersVisible 0 and 1 pass through — they are how the company guarantee is switched off', () => {
    expect(band({ minRacersVisible: 0 }).minRacersVisible).toBe(0);
    expect(band({ minRacersVisible: 1 }).minRacersVisible).toBe(1);
  });
});
