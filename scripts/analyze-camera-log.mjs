#!/usr/bin/env node
// ============================================================
// analyze-camera-log.mjs
// Path:  scripts/analyze-camera-log.mjs
// Usage: node scripts/analyze-camera-log.mjs <path-to-log.json>
//
// Reads a camera frame-log exported by CameraFrameLogHUD and reports:
//   • Frames where the camera position jumped unexpectedly
//   • Two detection methods: reconstructed-lerp expectation, and
//     rolling-median outlier (robust when lerp params vary)
//   • Context: 5 frames before and after each flagged frame
//   • camT delta vs offsetX delta — distinguishes T-space geometry
//     non-linearity (expected) from true position discontinuities
// ============================================================

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

// ── Core analysis (exported so unit tests can import without running CLI) ──

/**
 * Analyse an array of camera log frames for unexpected position jumps.
 *
 * @param {object[]} frames  Parsed frame entries from the exported JSON.
 * @param {object}   [opts]
 * @param {number}   [opts.lerp_threshold=8]
 *   Flag a frame if |actualDeltaX - expectedDeltaX| exceeds this many px.
 *   Expected delta = (targetOffsetX[prev] - offsetX[prev]) × lf[cur].
 * @param {number}   [opts.median_factor=5]
 *   Flag a frame if |deltaOffsetX| > medianFactor × rolling median of the
 *   last 10 absolute deltas AND the frame had no state transition.
 * @param {number}   [opts.context=5]
 *   Number of frames before/after a flagged frame to include in report.
 * @returns {{ jumps: JumpReport[], summary: string }}
 */
export function analyzeLog(frames, opts = {}) {
  const lerpThreshold = opts.lerp_threshold ?? 8;
  const medianFactor  = opts.median_factor  ?? 5;
  const context       = opts.context        ?? 5;

  if (!Array.isArray(frames) || frames.length === 0) {
    return { jumps: [], summary: 'No frames to analyse.' };
  }

  const jumps = [];

  // Rolling window of last 10 |deltaOffsetX| values for median outlier detection.
  // Index 0 = oldest.
  const recentAbs = [];

  for (let i = 0; i < frames.length; i++) {
    const f = frames[i];
    const prev = i > 0 ? frames[i - 1] : null;

    // ── Method A: Reconstructed-lerp expectation ──────────────────────────
    // Expected deltaOffsetX = (prev.tax - prev.ox) × f.lf
    // Only valid when the previous frame used pixel-space lerp (not T-space pin)
    // and no transition fired (transitions may legitimately snap targets).
    let methodA = null;
    if (
      prev &&
      !f.tf &&          // no transition this frame
      !prev.ts2 &&      // previous frame was NOT T-space-pinned
      typeof prev.tax === 'number' &&
      typeof prev.ox  === 'number' &&
      typeof f.lf     === 'number'
    ) {
      const expected = (prev.tax - prev.ox) * f.lf;
      const residual = Math.abs(f.dox - expected);
      if (residual > lerpThreshold) {
        methodA = { expected: +expected.toFixed(3), residual: +residual.toFixed(3) };
      }
    }

    // ── Method B: Rolling-median outlier ─────────────────────────────────
    let methodB = null;
    if (recentAbs.length >= 3) {
      const sorted = [...recentAbs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const absDox = Math.abs(f.dox ?? 0);
      // Only flag if no transition — transitions are allowed to produce large deltas.
      if (!f.tf && absDox > medianFactor * Math.max(1, median)) {
        methodB = {
          absDox: +absDox.toFixed(3),
          median: +median.toFixed(3),
          factor: +(absDox / Math.max(1, median)).toFixed(2),
        };
      }
    }

    // Update rolling window (keep last 10)
    recentAbs.push(Math.abs(f.dox ?? 0));
    if (recentAbs.length > 10) recentAbs.shift();

    if (!methodA && !methodB) continue;

    // ── camT delta for geometry-non-linearity disambiguation ─────────────
    // Large offsetX jump with small camT jump → true discontinuity.
    // Large offsetX jump matching large camT jump → likely tToWorld() curvature.
    const camTDelta =
      prev && typeof f.ct === 'number' && typeof prev.ct === 'number'
        ? +(f.ct - prev.ct).toFixed(6)
        : null;

    // ── Collect context frames ────────────────────────────────────────────
    const ctxStart = Math.max(0, i - context);
    const ctxEnd   = Math.min(frames.length - 1, i + context);
    const ctxFrames = frames.slice(ctxStart, ctxEnd + 1).map((cf) => ({
      fi:  cf.fi,
      ts:  cf.ts,
      st:  cf.st,
      lp:  cf.lp,
      op:  cf.op,
      ox:  typeof cf.ox  === 'number' ? +cf.ox.toFixed(2)  : cf.ox,
      z:   typeof cf.z   === 'number' ? +cf.z.toFixed(4)   : cf.z,
      dox: typeof cf.dox === 'number' ? +cf.dox.toFixed(3) : cf.dox,
      lf:  typeof cf.lf  === 'number' ? +cf.lf.toFixed(4)  : cf.lf,
      ts2: cf.ts2,
      tf:  cf.tf,
      ct:  typeof cf.ct  === 'number' ? +cf.ct.toFixed(5)  : cf.ct,
      fot: typeof cf.fot === 'number' ? +cf.fot.toFixed(5) : cf.fot,
      ese: typeof cf.ese === 'number' ? +cf.ese.toFixed(6) : cf.ese,
    }));

    jumps.push({
      frameIdx:    f.fi,
      arrayIndex:  i,
      ts:          f.ts,
      state:       f.st,
      lerpPhase:   f.lp,
      observerPhase: f.op,
      tSpacePin:   f.ts2 === 1,
      dox:         typeof f.dox === 'number' ? +f.dox.toFixed(3) : f.dox,
      doy:         typeof f.doy === 'number' ? +f.doy.toFixed(3) : f.doy,
      camTDelta,
      methodA,
      methodB,
      context:     ctxFrames,
      flaggedIndex: i - ctxStart, // index within ctxFrames that is the flagged frame
    });
  }

  const summary = jumps.length === 0
    ? `No suspicious jumps detected in ${frames.length} frames.`
    : [
        `Found ${jumps.length} suspicious frame(s) in ${frames.length} total frames.`,
        '',
        'Jump summary:',
        ...jumps.map((j, idx) =>
          `  [${idx + 1}] frame #${j.frameIdx} (ts=${j.ts?.toFixed(0)} ms)` +
          `  state=${j.state} lp=${j.lerpPhase} op=${j.observerPhase}` +
          `  dox=${j.dox} doy=${j.doy}` +
          (j.camTDelta !== null ? `  ΔcamT=${j.camTDelta}` : '') +
          (j.methodA ? `  [A: residual=${j.methodA.residual}px]` : '') +
          (j.methodB ? `  [B: ${j.methodB.factor}×median]` : '')
        ),
      ].join('\n');

  return { jumps, summary };
}

// ── CLI entry point ───────────────────────────────────────────────────────────

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: node scripts/analyze-camera-log.mjs <path-to-log.json>');
    console.error('');
    console.error('Export a log from the race screen (enableFrameLog toggle in DevScreen)');
    console.error('and drop the downloaded file in client/tmp/camera-logs/');
    process.exit(1);
  }

  const filePath = resolve(process.cwd(), arg);
  let raw;
  try {
    raw = readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error(`Cannot read file: ${filePath}\n${e.message}`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    console.error(`Invalid JSON: ${e.message}`);
    process.exit(1);
  }

  const frames = Array.isArray(parsed) ? parsed : parsed.frames;
  if (!Array.isArray(frames)) {
    console.error('Expected JSON to have a "frames" array (or be a bare array).');
    process.exit(1);
  }

  if (parsed.meta) {
    console.log('=== Camera Log Metadata ===');
    console.log(`Exported at:     ${parsed.meta.exportedAt}`);
    console.log(`Total frames:    ${parsed.meta.totalFrames}`);
    console.log(`Buffered frames: ${parsed.meta.bufferedFrames}`);
    console.log(`Ring size:       ${parsed.meta.ringSize}`);
    console.log('');
  }

  const { jumps, summary } = analyzeLog(frames);

  console.log('=== Jump Analysis ===');
  console.log(summary);

  if (jumps.length > 0) {
    console.log('\n=== Detailed Jump Reports ===');
    for (const [idx, j] of jumps.entries()) {
      console.log(`\n─── Jump ${idx + 1}/${jumps.length} — frame #${j.frameIdx} ───`);
      console.log(`  State:        ${j.state} / lerpPhase=${j.lerpPhase} / obs=${j.observerPhase}`);
      console.log(`  deltaOffsetX: ${j.dox} px    deltaOffsetY: ${j.doy} px`);
      if (j.camTDelta !== null) {
        console.log(`  ΔcamT:        ${j.camTDelta}  (large ΔcamT + large Δoffset → track geometry)`);
      }
      if (j.tSpacePin) console.log(`  T-space pin:  YES — offsetX was pinned to camT this frame`);
      if (j.methodA) {
        console.log(`  Method A (lerp residual): expected≈${j.methodA.expected}px, residual=${j.methodA.residual}px`);
      }
      if (j.methodB) {
        console.log(`  Method B (median outlier): |dox|=${j.methodB.absDox}px = ${j.methodB.factor}× median (${j.methodB.median}px)`);
      }
      console.log(`  Context (${j.context.length} frames, flagged=[${j.flaggedIndex}]):`);
      const header = '    fi       ts       st              lp        op          ox       z      dox    lf     ts2 tf  ct       fot     ese';
      console.log(header);
      for (const [ci, cf] of j.context.entries()) {
        const marker = ci === j.flaggedIndex ? '>>>' : '   ';
        console.log(
          `  ${marker}` +
          String(cf.fi ?? '').padStart(6) +
          String((cf.ts ?? '').toFixed?.(0) ?? '').padStart(9) +
          ` ${String(cf.st ?? '').padEnd(15)}` +
          ` ${String(cf.lp ?? '').padEnd(9)}` +
          ` ${String(cf.op ?? '').padEnd(11)}` +
          String((cf.ox ?? '').toFixed?.(1) ?? '').padStart(8) +
          String((cf.z  ?? '').toFixed?.(3) ?? '').padStart(8) +
          String((cf.dox ?? '').toFixed?.(2) ?? '').padStart(7) +
          String((cf.lf ?? '').toFixed?.(4) ?? '').padStart(7) +
          String(cf.ts2 ?? '').padStart(4) +
          String(cf.tf  ?? '').padStart(4) +
          String((cf.ct  ?? '').toFixed?.(4) ?? 'null').padStart(8) +
          String((cf.fot ?? '').toFixed?.(4) ?? 'null').padStart(8) +
          String((cf.ese ?? '').toFixed?.(5) ?? 'null').padStart(9)
        );
      }
    }
    console.log('\n=== Interpretation Guide ===');
    console.log('• Method A (lerp residual): actual move ≫ expected from lerp formula');
    console.log('  → Likely cause: T-space→pixel-space switch, target snap, or stale prevFocusT');
    console.log('• Method B (median outlier): spike vs. rolling median, no transition');
    console.log('  → Likely cause: single-frame speed-estimate spike or lap-wrap edge case');
    console.log('• Large ΔcamT alongside large Δoffset: may be normal tToWorld() curvature at corners');
    console.log('• lp=entry + ts2=1 + large dox: camera is T-space pinned — check if camT itself jumped');
    console.log('• lp=entry→tracking transition frame: pixel-lerp target may snap; one-frame artefact');
  }
}

// Run only when invoked directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
