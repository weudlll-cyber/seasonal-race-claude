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

/**
 * Analyse per-racer movement for unexpected jumps in pixel position (dx, dy)
 * and path progress (dt) using Method B (rolling-median outlier detection).
 *
 * @param {object[]} frames  Parsed frame entries from the exported JSON.
 *   Each frame must contain an `rc` array of racer snapshots
 *   with fields: n (name), dx, dy, dt.  Frames without `rc` are skipped.
 * @param {object}   [opts]
 * @param {number}   [opts.racer_dx_factor=5]
 *   Flag a frame if |racer.dx| > factor × rolling median of last 10 |dx| values.
 * @param {number}   [opts.racer_dy_factor=5]
 *   Flag a frame if |racer.dy| > factor × rolling median of last 10 |dy| values.
 * @param {number}   [opts.racer_dt_factor=8]
 *   Flag a frame if |racer.dt| > factor × rolling median of last 10 |dt| values.
 *   Higher default because t advances very uniformly; only large deviations matter.
 * @param {number}   [opts.context=5]
 *   Number of frames before/after a flagged frame to include in report.
 * @returns {{ jumps: RacerJumpReport[], summary: string }}
 */
export function analyzeRacerJumps(frames, opts = {}) {
  const dxFactor = opts.racer_dx_factor ?? 5;
  const dyFactor = opts.racer_dy_factor ?? 5;
  const dtFactor = opts.racer_dt_factor ?? 8;
  const context  = opts.context        ?? 5;

  if (!Array.isArray(frames) || frames.length === 0) {
    return { jumps: [], summary: 'No frames to analyse.' };
  }

  // Collect all racer names from rc arrays
  const racerNames = new Set();
  for (const f of frames) {
    if (Array.isArray(f.rc)) {
      for (const r of f.rc) {
        if (r.n != null) racerNames.add(r.n);
      }
    }
  }

  if (racerNames.size === 0) {
    return { jumps: [], summary: 'No racer data (rc) found in frames — log recorded without racer snapshots.' };
  }

  const jumps = [];

  for (const name of racerNames) {
    // Extract frames where this racer appears, preserving global frame index
    const racerEntries = [];
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      const rc = Array.isArray(f.rc) ? f.rc.find((r) => r.n === name) : undefined;
      if (rc) racerEntries.push({ globalIdx: i, fi: f.fi, ts: f.ts, st: f.st, rc });
    }

    for (const axis of ['dx', 'dy', 'dt']) {
      const factor = axis === 'dt' ? dtFactor : axis === 'dx' ? dxFactor : dyFactor;
      const recentAbs = [];

      for (let i = 0; i < racerEntries.length; i++) {
        const entry = racerEntries[i];
        const val    = entry.rc[axis] ?? 0;
        const absVal = Math.abs(val);

        if (recentAbs.length >= 3) {
          const sorted = [...recentAbs].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          if (absVal > factor * Math.max(0.001, median)) {
            // Context: pull from the global frames array
            const ctxStart  = Math.max(0, entry.globalIdx - context);
            const ctxEnd    = Math.min(frames.length - 1, entry.globalIdx + context);
            const ctxFrames = frames.slice(ctxStart, ctxEnd + 1).map((cf) => ({
              fi: cf.fi,
              ts: cf.ts,
              st: cf.st,
              rc: Array.isArray(cf.rc)
                ? cf.rc.find((r) => r.n === name) ?? null
                : null,
            }));

            jumps.push({
              frameIdx:    entry.fi,
              ts:          entry.ts,
              racer:       name,
              axis:        axis.toUpperCase(),
              value:       +val.toFixed(3),
              median:      +median.toFixed(3),
              factor:      +(absVal / Math.max(0.001, median)).toFixed(2),
              state:       entry.st,
              context:     ctxFrames,
              flaggedIndex: entry.globalIdx - ctxStart,
            });
          }
        }

        recentAbs.push(absVal);
        if (recentAbs.length > 10) recentAbs.shift();
      }
    }
  }

  // Sort chronologically, then by racer name
  jumps.sort((a, b) => a.frameIdx - b.frameIdx || a.racer.localeCompare(b.racer));

  const summary =
    jumps.length === 0
      ? `No racer jumps detected in ${frames.length} frames (${racerNames.size} racers).`
      : [
          `Found ${jumps.length} racer jump(s) across ${racerNames.size} racer(s) in ${frames.length} frames.`,
          '',
          'Racer jump summary:',
          ...jumps.map(
            (j, idx) =>
              `  [${idx + 1}] frame #${j.frameIdx}  racer=${j.racer}  axis=${j.axis}` +
              `  val=${j.value}  (${j.factor}×median=${j.median})  state=${j.state}`
          ),
        ].join('\n');

  return { jumps, summary };
}

// ── CLI entry point ───────────────────────────────────────────────────────────

/**
 * Parse --key=value flags from argv, returning a map of key→parsed value.
 * Numeric values are converted; others remain strings.
 */
function parseFlags(argv) {
  const flags = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.+)$/);
    if (m) {
      const num = Number(m[2]);
      flags[m[1]] = Number.isFinite(num) ? num : m[2];
    }
  }
  return flags;
}

function main() {
  const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const flags      = parseFlags(process.argv.slice(2));

  const arg = positional[0];
  if (!arg) {
    console.error('Usage: node scripts/analyze-camera-log.mjs <path-to-log.json> [options]');
    console.error('');
    console.error('Camera jump options:');
    console.error('  --lerp_threshold=8    Method A: lerp residual threshold in px (default 8)');
    console.error('  --median_factor=5     Method B: rolling-median multiplier (default 5)');
    console.error('');
    console.error('Racer jump options:');
    console.error('  --racer_dx_factor=5   ΔX outlier factor per racer (default 5)');
    console.error('  --racer_dy_factor=5   ΔY outlier factor per racer (default 5)');
    console.error('  --racer_dt_factor=8   Δt outlier factor per racer (default 8)');
    console.error('');
    console.error('  --context=5           Context frames around each flagged frame (default 5)');
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

  // ── Camera jump analysis ──────────────────────────────────────────────────
  const { jumps: camJumps, summary: camSummary } = analyzeLog(frames, flags);

  console.log('=== Camera Jump Analysis ===');
  console.log(camSummary);

  if (camJumps.length > 0) {
    console.log('\n=== Detailed Camera Jump Reports ===');
    for (const [idx, j] of camJumps.entries()) {
      console.log(`\n─── Camera Jump ${idx + 1}/${camJumps.length} — frame #${j.frameIdx} ───`);
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
    console.log('\n=== Camera Interpretation Guide ===');
    console.log('• Method A (lerp residual): actual move ≫ expected from lerp formula');
    console.log('  → Likely cause: T-space→pixel-space switch, target snap, or stale prevFocusT');
    console.log('• Method B (median outlier): spike vs. rolling median, no transition');
    console.log('  → Likely cause: single-frame speed-estimate spike or lap-wrap edge case');
    console.log('• Large ΔcamT alongside large Δoffset: may be normal tToWorld() curvature at corners');
    console.log('• lp=entry + ts2=1 + large dox: camera is T-space pinned — check if camT itself jumped');
    console.log('• lp=entry→tracking transition frame: pixel-lerp target may snap; one-frame artefact');
  }

  // ── Racer jump analysis ───────────────────────────────────────────────────
  const hasRacerData = frames.some((f) => Array.isArray(f.rc) && f.rc.length > 0);
  if (!hasRacerData) {
    console.log('\n(No racer data in this log — recorded with an older version of the frame logger.)');
    return;
  }

  console.log('\n=== Racer Jump Analysis ===');
  const { jumps: racerJumps, summary: racerSummary } = analyzeRacerJumps(frames, flags);
  console.log(racerSummary);

  if (racerJumps.length > 0) {
    console.log('\n=== Detailed Racer Jump Reports ===');
    for (const [idx, j] of racerJumps.entries()) {
      console.log(`\n─── Racer Jump ${idx + 1}/${racerJumps.length} — frame #${j.frameIdx} — ${j.racer} ───`);
      console.log(`  Axis:   ${j.axis}   value=${j.value}   factor=${j.factor}×median(${j.median})   state=${j.state}`);
      console.log(`  Context (${j.context.length} frames, flagged=[${j.flaggedIndex}]):`);
      const header = '    fi       ts       st               t         x         y        dx       dy       dt       sp';
      console.log(header);
      for (const [ci, cf] of j.context.entries()) {
        const marker = ci === j.flaggedIndex ? '>>>' : '   ';
        const rc = cf.rc;
        console.log(
          `  ${marker}` +
          String(cf.fi ?? '').padStart(6) +
          String((cf.ts ?? '').toFixed?.(0) ?? '').padStart(9) +
          ` ${String(cf.st ?? '').padEnd(16)}` +
          String((rc?.t  ?? '').toFixed?.(5) ?? 'null').padStart(9) +
          String((rc?.x  ?? '').toFixed?.(1) ?? 'null').padStart(10) +
          String((rc?.y  ?? '').toFixed?.(1) ?? 'null').padStart(10) +
          String((rc?.dx ?? '').toFixed?.(2) ?? 'null').padStart(9) +
          String((rc?.dy ?? '').toFixed?.(2) ?? 'null').padStart(9) +
          String((rc?.dt ?? '').toFixed?.(5) ?? 'null').padStart(9) +
          String((rc?.sp ?? '').toFixed?.(2) ?? 'null').padStart(9)
        );
      }
    }
    console.log('\n=== Racer Interpretation Guide ===');
    console.log('• Large dx/dy spike: racer teleported in pixel space — check getPosition() or t-wrap logic');
    console.log('• Large dt spike: sudden t-value jump — check speed-bonus, re-roll, or constSpeed logic');
    console.log('• Correlate racer jumps with camera state (st) — if camera also jumped, shared cause likely');
    console.log('• Multiple racers same frame: likely a global state change (re-roll, lap-wrap, race-start)');
  }
}

// Run only when invoked directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
