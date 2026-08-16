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

  // ── WHY THE BANDS ARE ASSERTED DIRECTLY BELOW, AND NOT ONLY THROUGH THE RESOLVER ──────────────
  // Four of the six round-trip assertions in the next test CANNOT FAIL any more, and two of them
  // could before MIRRORS-BY-REFERENCE pointed the resolver's fallbacks at the defaults
  // (NIGHT-2026-08-18). `referenceCorridorPx` and `glideDurationMs` fall back to
  // DEFAULT_CAMERA_CONFIG's own value, so a shipped value that leaves its band is replaced by
  // ITSELF and `f.k === DEFAULT.k` still holds — the exact drift this describe block is named
  // after, now invisible to it. `minRacersVisible` and `innerFramePct` have no band at all, so
  // their round trip was always a tautology.
  //
  // The two that survive are the two whose fallback is a DIFFERENT value: `leaderForwardFrac`
  // (falls back to null) and `transitionGrammar` (falls back to 'legacy'). Those stay as they are.
  //
  // The repair is to assert the RULE — the band itself, against the shipped number — which no
  // change to a fallback can defeat. Proven in both directions: with `glideDurationMs` set to 2000
  // this block FAILS, and the round-trip test below still passes.
  it('every shipped value satisfies the band the resolver enforces', () => {
    const c = DEFAULT_CAMERA_CONFIG;

    expect(Number.isFinite(c.referenceCorridorPx)).toBe(true);
    expect(c.referenceCorridorPx).toBeGreaterThan(0);

    expect(Number.isFinite(c.glideDurationMs)).toBe(true);
    expect(c.glideDurationMs).toBeGreaterThanOrEqual(300);
    expect(c.glideDurationMs).toBeLessThanOrEqual(900);

    expect(Number.isFinite(c.leaderForwardFrac)).toBe(true);
    expect(c.leaderForwardFrac).toBeGreaterThan(0.5);
    expect(c.leaderForwardFrac).toBeLessThanOrEqual(0.8);

    expect(['cut', 'glide']).toContain(c.cameraTransitionGrammar);

    // No band in the resolver — `?? ` only — so the rule these two have is EXISTENCE, and that is
    // all this asserts. Stated rather than dressed up as a band that is not there.
    expect(c.minRacersVisible).not.toBeUndefined();
    expect(c.targetInnerFramePct).not.toBeUndefined();

    for (const s of ALL_FRAMED_STATES) {
      const v = c.cameraStateProfiles[s].visibleCorridors;
      expect(Number.isFinite(v)).toBe(true);
      expect(v).toBeGreaterThan(0);
    }
  });

  it('the resolver returns the shipped value rather than a fallback', () => {
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

  // The RULE is reject-to-default, not clamp-to-edge, and naming the default rather than 500 is
  // what makes that the assertion (NIGHT-2026-08-18). It still discriminates: a resolver that
  // clamped would return 300 and 900, which are not the default. What it no longer does is go red
  // on an honest change of the shipped duration, which is the re-blessing habit R7 warns about.
  it('glideDurationMs: 299 and 901 are REJECTED to the shipped default, not pulled to the band edges', () => {
    expect(band({ glideDurationMs: 299 }).glideDurationMs).toBe(
      DEFAULT_CAMERA_CONFIG.glideDurationMs
    );
    expect(band({ glideDurationMs: 901 }).glideDurationMs).toBe(
      DEFAULT_CAMERA_CONFIG.glideDurationMs
    );
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

// ============================================================
// CAMERA-ANCHOR-TRUTH-1 §4c — the two OVERVIEW time constants.
//
// CAMERA_DIRECTOR.md §6 listed the tracking lag as protected by CONVENTION ONLY: "change a
// trackingTC default and no test notices." These are the tests that notice. They are deliberately
// value assertions with the REASON attached, because the reason is the part that was missing from
// the code for both numbers.
// ============================================================
describe('OVERVIEW time constants (CAMERA-ANCHOR-TRUTH-1 §4c)', () => {
  const OVERVIEW = DEFAULT_CAMERA_CONFIG.cameraStateProfiles.OVERVIEW;
  const STATES = Object.keys(DEFAULT_CAMERA_CONFIG.cameraStateProfiles);

  it('OVERVIEW tracks as quickly as every other state — trackingTC 0.25', () => {
    // Measured: at 1.5 the OVERVIEW subject sat a median 13.78 pp of frame from its framed position,
    // 3.65x every other state pooled (3.78 pp). At 0.25 that halves to 6.78 pp.
    expect(OVERVIEW.trackingTC).toBe(0.25);
  });

  it('every state now ships the same trackingTC — there is no slow state left', () => {
    for (const s of STATES) {
      expect(DEFAULT_CAMERA_CONFIG.cameraStateProfiles[s].trackingTC, `${s} trackingTC`).toBe(0.25);
    }
  });

  it('OVERVIEW keeps its SLOW ENTRY on purpose — entryTC 1.5, and this is not an oversight', () => {
    // The lag metric samples the TRACKING phase, so it cannot adjudicate entry: entryTC 0.8 vs 1.5
    // moved the OVERVIEW median by 0.09 pp. The glide into the wide shot is deliberate and stays
    // until an ENTRY-phase instrument exists to argue otherwise. If you are changing this, measure
    // entry convergence first — do not reason from the tracking number.
    expect(OVERVIEW.entryTC).toBe(1.5);
    expect(OVERVIEW.entryTC).toBeGreaterThan(OVERVIEW.trackingTC);
  });

  it('OVERVIEW is the only state whose entry is slower than its tracking', () => {
    for (const s of STATES) {
      const p = DEFAULT_CAMERA_CONFIG.cameraStateProfiles[s];
      if (s === 'OVERVIEW') continue;
      expect(p.entryTC, `${s} entryTC`).toBe(0.8);
    }
  });
});

// ============================================================
// CAMERA-COMPANY-ONLY-3 — the switch is GONE and must not come back as a config key.
//
// It existed for one afternoon so the owner could judge the change with his own eye. He passed it
// (mountainstreet seed 5601, build d2ecc27c) and company-only became simply the behaviour, so the
// key, the Dev Screen control and the OFF branch all went with it — when something loses its value
// in the Dev Portal, the control goes too.
// ============================================================
describe('the company-only switch is gone (CAMERA-COMPANY-ONLY-3)', () => {
  it('no longer exists as a default', () => {
    expect(DEFAULT_CAMERA_CONFIG).not.toHaveProperty('companyOnlyFraming');
  });

  it('is not resolved, even if an old stored config still carries it', () => {
    // The standing rule: unknown keys are ignored. Somebody who flipped the probe on that afternoon
    // has the key in localStorage forever; it must not resurrect a branch that no longer exists.
    const resolved = resolveFramingConfig({ companyOnlyFraming: false });
    expect(resolved).not.toHaveProperty('companyOnlyFraming');
  });
});
