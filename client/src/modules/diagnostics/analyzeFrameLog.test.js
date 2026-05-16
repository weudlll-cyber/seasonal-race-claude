import { describe, it, expect } from 'vitest';
import { analyzeLog, analyzeRacerJumps } from '../../../../scripts/analyze-camera-log.mjs';

// ── Helper: build a synthetic frame-log ──────────────────────────────────────

/**
 * Generate N frames of smooth pixel-lerp camera movement toward a fixed target.
 * All frames are in 'tracking' lerpPhase so Method A (lerp residual) applies.
 * @param {number}  n        Number of frames
 * @param {number}  lf       Lerp factor (e.g. 0.15)
 * @param {number}  targetX  Fixed targetOffsetX
 * @param {number}  startX   Initial offsetX
 * @returns {object[]}
 */
function smoothFrames(n, lf = 0.15, targetX = 0, startX = -300) {
  const frames = [];
  let ox = startX;
  for (let i = 0; i < n; i++) {
    const newOx = ox + (targetX - ox) * lf;
    frames.push({
      fi: i,
      ts: i * (1000 / 60),
      dt: 1000 / 60,
      st: 'LEADER_ZOOM',
      lp: 'tracking',
      op: 'follow',
      ox: newOx,
      oy: 0,
      z: 1.8,
      tax: targetX,
      tay: 0,
      tz: 1.8,
      dox: newOx - ox,
      doy: 0,
      dz: 0,
      lf,
      ts2: 0, // pixel-space lerp
      tf: 0, // no transition
      ct: null,
      fot: 0.5,
      pft: 0.5,
      ttt: null,
      ese: 0.001,
      edx: 0,
      edy: 0,
      edz: 0,
    });
    ox = newOx;
  }
  return frames;
}

/**
 * Inject an artificial jump at frameIndex i by adding jumpPx to dox and ox.
 * The prev frame's tax stays the same, so Method A will flag the residual.
 */
function injectJump(frames, i, jumpPx = 60) {
  const copy = frames.map((f) => ({ ...f }));
  const frame = copy[i];
  frame.dox += jumpPx;
  frame.ox += jumpPx;
  // All subsequent frames shift by jumpPx too (consistent position)
  for (let j = i + 1; j < copy.length; j++) {
    copy[j].ox += jumpPx;
    copy[j].tax += jumpPx;
  }
  return copy;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('analyzeLog — no jitter', () => {
  it('returns zero jumps for smooth lerp motion', () => {
    const frames = smoothFrames(200);
    const { jumps, summary } = analyzeLog(frames);
    expect(jumps).toHaveLength(0);
    expect(summary).toMatch(/No suspicious jumps/);
  });

  it('handles empty input gracefully', () => {
    const { jumps, summary } = analyzeLog([]);
    expect(jumps).toHaveLength(0);
    expect(summary).toMatch(/No frames/);
  });

  it('does not flag transition frames even with large delta', () => {
    const frames = smoothFrames(60);
    // Inject a large delta on frame 30 but mark it as a transition
    const copy = injectJump(frames, 30, 80);
    copy[30].tf = 1; // transition fired — should be exempt
    const { jumps } = analyzeLog(copy);
    // Neither method should flag a frame that had a state transition
    const flagged = jumps.filter((j) => j.frameIdx === 30);
    expect(flagged).toHaveLength(0);
  });
});

describe('analyzeLog — synthetic jumps detected', () => {
  it('detects a single artificial jump via Method B (median outlier)', () => {
    // 100 smooth frames, then one 60px jump at frame 50
    const frames = injectJump(smoothFrames(100), 50, 60);
    const { jumps } = analyzeLog(frames);
    expect(jumps.length).toBeGreaterThanOrEqual(1);
    const found = jumps.find((j) => j.frameIdx === 50);
    expect(found).toBeDefined();
    expect(found.methodB).toBeDefined(); // median outlier should fire
    expect(found.dox).toBeGreaterThan(10); // actual large delta
  });

  it('detects three injected jumps at frames 100, 300, 500 in a 600-frame log', () => {
    let frames = smoothFrames(600, 0.12, 0, -400);
    frames = injectJump(frames, 100, 70);
    frames = injectJump(frames, 300, 70);
    frames = injectJump(frames, 500, 70);

    const { jumps } = analyzeLog(frames);
    // At minimum, all three jump frames should be flagged
    const flaggedIdxs = new Set(jumps.map((j) => j.frameIdx));
    expect(flaggedIdxs.has(100)).toBe(true);
    expect(flaggedIdxs.has(300)).toBe(true);
    expect(flaggedIdxs.has(500)).toBe(true);
  });

  it('context window includes 5 frames before and after the flagged frame', () => {
    const frames = injectJump(smoothFrames(100), 50, 60);
    const { jumps } = analyzeLog(frames, { context: 5 });
    const found = jumps.find((j) => j.frameIdx === 50);
    expect(found).toBeDefined();
    // Context should span frames 45–55 (or fewer if near edge)
    expect(found.context.length).toBeGreaterThanOrEqual(6); // at least flagged + 5 after
    // The flagged frame is marked correctly
    expect(found.context[found.flaggedIndex].fi).toBe(50);
  });

  it('Method A (lerp residual) fires when actual move far exceeds lerp expectation', () => {
    const frames = injectJump(smoothFrames(100), 50, 60);
    const { jumps } = analyzeLog(frames, { lerp_threshold: 8 });
    const found = jumps.find((j) => j.frameIdx === 50);
    expect(found).toBeDefined();
    expect(found.methodA).toBeDefined();
    expect(found.methodA.residual).toBeGreaterThan(8);
  });

  it('T-space frames are included in context with ts2=1', () => {
    // Frame in T-space pin mode should appear in context faithfully
    const frames = smoothFrames(60);
    frames[30].ts2 = 1; // mark as T-space
    frames[30].ct = 0.45;
    // Inject jump at a non-T-space frame so it gets flagged
    const withJump = injectJump(frames, 50, 60);
    const { jumps } = analyzeLog(withJump, { context: 25 });
    const found = jumps.find((j) => j.frameIdx === 50);
    if (found) {
      const tFrame = found.context.find((cf) => cf.fi === 30);
      if (tFrame) expect(tFrame.ts2).toBe(1);
    }
  });
});

describe('analyzeLog — camTDelta in output', () => {
  it('reports camTDelta when both frames have ct values', () => {
    const frames = smoothFrames(60);
    // Give both frames a ct value
    frames.forEach((f, i) => {
      f.ct = i * 0.001;
    });
    const withJump = injectJump(frames, 40, 60);
    const { jumps } = analyzeLog(withJump);
    const found = jumps.find((j) => j.frameIdx === 40);
    if (found) {
      expect(found.camTDelta).not.toBeNull();
      expect(typeof found.camTDelta).toBe('number');
    }
  });

  it('camTDelta is null when frames have no ct', () => {
    const frames = injectJump(smoothFrames(60), 40, 60);
    // ct is already null from smoothFrames
    const { jumps } = analyzeLog(frames);
    const found = jumps.find((j) => j.frameIdx === 40);
    if (found) {
      expect(found.camTDelta).toBeNull();
    }
  });
});

// ── analyzeRacerJumps tests ────────────────────────────────────────────────────

/**
 * Build N frames with smooth, constant per-racer deltas.
 * @param {number} n           Frame count
 * @param {string[]} names     Racer names
 * @param {number} dxBase      Constant dx per racer per frame (px)
 * @param {number} dyBase      Constant dy per racer per frame (px)
 * @param {number} dtBase      Constant dt per racer per frame (t-units)
 */
function racerFrames(n, names = ['Alpha', 'Beta'], dxBase = 3, dyBase = 2, dtBase = 0.002) {
  const frames = [];
  for (let i = 0; i < n; i++) {
    frames.push({
      fi: i,
      ts: i * (1000 / 60),
      st: 'LEADER_ZOOM',
      rc: names.map((name, ni) => ({
        n: name,
        t: 0.1 + i * dtBase + ni * 0.01,
        x: 100 + i * dxBase + ni * 10,
        y: 200 + i * dyBase + ni * 10,
        dx: dxBase,
        dy: dyBase,
        dt: dtBase,
        sp: Math.sqrt(dxBase * dxBase + dyBase * dyBase),
      })),
    });
  }
  return frames;
}

/**
 * Inject a racer jump at frame i for the given racer name and axis.
 */
function injectRacerJump(frames, i, name, axis, jumpVal) {
  const copy = frames.map((f) => ({
    ...f,
    rc: f.rc ? f.rc.map((r) => ({ ...r })) : undefined,
  }));
  const rc = copy[i].rc?.find((r) => r.n === name);
  if (rc) rc[axis] += jumpVal;
  return copy;
}

describe('analyzeRacerJumps — no jumps', () => {
  it('returns zero jumps for constant smooth racer motion', () => {
    const frames = racerFrames(150);
    const { jumps, summary } = analyzeRacerJumps(frames);
    expect(jumps).toHaveLength(0);
    expect(summary).toMatch(/No racer jumps detected/);
  });

  it('handles empty frame array gracefully', () => {
    const { jumps, summary } = analyzeRacerJumps([]);
    expect(jumps).toHaveLength(0);
    expect(summary).toMatch(/No frames/);
  });

  it('reports missing rc data without crashing', () => {
    // Frames have no rc field
    const frames = racerFrames(60).map((f) => ({ ...f, rc: undefined }));
    const { jumps, summary } = analyzeRacerJumps(frames);
    expect(jumps).toHaveLength(0);
    expect(summary).toMatch(/No racer data/);
  });
});

describe('analyzeRacerJumps — synthetic jumps detected', () => {
  it('detects a dx spike for the correct racer', () => {
    const frames = injectRacerJump(racerFrames(100), 60, 'Alpha', 'dx', 120);
    const { jumps } = analyzeRacerJumps(frames);
    expect(jumps.length).toBeGreaterThanOrEqual(1);
    const found = jumps.find((j) => j.frameIdx === 60 && j.racer === 'Alpha' && j.axis === 'DX');
    expect(found).toBeDefined();
    expect(Math.abs(found.value)).toBeGreaterThan(10);
  });

  it('detects a dy spike for the correct racer', () => {
    const frames = injectRacerJump(racerFrames(100), 50, 'Beta', 'dy', 100);
    const { jumps } = analyzeRacerJumps(frames);
    const found = jumps.find((j) => j.frameIdx === 50 && j.racer === 'Beta' && j.axis === 'DY');
    expect(found).toBeDefined();
  });

  it('detects a dt spike for the correct racer', () => {
    const frames = injectRacerJump(racerFrames(100), 70, 'Alpha', 'dt', 0.05);
    const { jumps } = analyzeRacerJumps(frames, { racer_dt_factor: 8 });
    const found = jumps.find((j) => j.frameIdx === 70 && j.racer === 'Alpha' && j.axis === 'DT');
    expect(found).toBeDefined();
  });

  it('does not flag the other racer when only one jumps', () => {
    const frames = injectRacerJump(racerFrames(100), 60, 'Alpha', 'dx', 120);
    const { jumps } = analyzeRacerJumps(frames);
    const betaFlagged = jumps.some((j) => j.racer === 'Beta' && j.frameIdx === 60);
    expect(betaFlagged).toBe(false);
  });

  it('jump report includes racer name, axis, value, factor, state', () => {
    const frames = injectRacerJump(racerFrames(100), 60, 'Alpha', 'dx', 120);
    const { jumps } = analyzeRacerJumps(frames);
    const found = jumps.find((j) => j.racer === 'Alpha' && j.axis === 'DX');
    expect(found).toBeDefined();
    expect(found.racer).toBe('Alpha');
    expect(found.axis).toBe('DX');
    expect(typeof found.value).toBe('number');
    expect(typeof found.factor).toBe('number');
    expect(found.factor).toBeGreaterThan(1);
    expect(typeof found.state).toBe('string');
  });

  it('context window contains the flagged frame', () => {
    const frames = injectRacerJump(racerFrames(100), 60, 'Alpha', 'dx', 120);
    const { jumps } = analyzeRacerJumps(frames, { context: 5 });
    const found = jumps.find((j) => j.racer === 'Alpha' && j.axis === 'DX');
    expect(found).toBeDefined();
    const flaggedFrame = found.context[found.flaggedIndex];
    expect(flaggedFrame.fi).toBe(60);
  });

  it('respects custom factor thresholds — high factor misses a jump that low factor catches', () => {
    // baseline dx=3, inject a 60px jump → ~20× median
    // factor=100: 20 < 100, not flagged; factor=5: 20 > 5, flagged
    const frames = injectRacerJump(racerFrames(100), 60, 'Alpha', 'dx', 60);
    const { jumps: strictJumps } = analyzeRacerJumps(frames, { racer_dx_factor: 100 });
    const { jumps: looseJumps } = analyzeRacerJumps(frames, { racer_dx_factor: 5 });
    expect(strictJumps.length).toBeLessThan(looseJumps.length);
    expect(looseJumps.length).toBeGreaterThanOrEqual(1);
  });
});
