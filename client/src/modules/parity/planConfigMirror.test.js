// ============================================================
// planConfigMirror.test.js — BLIND-SITE-1, the guard for a defect that was invisible for months
//
// THE POINT OF THIS FILE, in one sentence: a harness that builds a race plan without an input the
// browser supplies runs a world no player sees, and nothing in the tree could say so.
//
// WHAT HAPPENED. `createRacePlan` takes its behaviour from one config object. The browser builds
// that object at raceCore.js:257 — it is the reference, because it is what a player runs. FIVE other
// places build their own: the two arms of the parity guard (`browserPlanConfig` / `simPlanConfig` in
// scripts/parity/goldenRunner.mjs), the fairness instrument (scripts/sim-fairness.mjs) and two
// diagnostics under scripts/diag/. Every one of them had silently fallen behind:
//
//   · all five omitted the gap brake's four keys and `trajectoryTransitionDuration`, so
//     `_computeGapLeaderBrake` returned at its guard (racePlanner.js:886) and the mechanism could
//     not run AT ALL — the fairness instrument measured 0 firings and reported "fair" for a race
//     the browser does not run the moment the owner switches that brake on;
//   · four of the five also omitted `pathLengthPx`, the brake's distance unit;
//   · the two diagnostics ALSO omitted COMBO15 fair-arrival (`chaosSteer` / `bandBias`), which is
//     SHIPPED ON — so they printed orders from a pre-COMBO15 race.
//
// Lesson 187 already named this trap for plan FLAGS ("the browser plan config is written twice ...
// a new plan flag must be added to BOTH plus the sim"). It was a prose rule in a document. This is
// the same rule as a test, and it covers plan INPUTS too.
//
// WHY IT READS SOURCE RATHER THAN CALLING THE BUILDERS. Three of the five are module-private
// functions inside CLI scripts that run a race on import; two are in `scripts/`, outside the client
// bundle. Exporting them purely to be asserted on would be machinery added for the test. Reading the
// object literal is enough to catch the whole regression class — a key that stops being passed — and
// it is the same technique `engineInputs.test.js` uses one directory up for the engine-input list.
//
// WHAT THIS DOES NOT CATCH, stated so a green run is not over-read: it compares key NAMES, not the
// values behind them. A builder that passes `gapBrakeAllowedGapPx: 0` still satisfies it. The
// values are guarded where they belong — by the golden hashes and the fingerprints.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..', '..');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');

/**
 * The brace-balanced object literal that starts at or after `from` in `src`.
 * `from` is an index, not a line, so a site can be found by its own text rather than by a line
 * number that the next edit would invalidate.
 */
function literalAt(src, from) {
  const open = src.indexOf('{', from);
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(open, i + 1);
  }
  throw new Error('planConfigMirror: unbalanced object literal');
}

/** Top-level key names of an object literal — depth 1 only, comments and strings stripped. */
function topLevelKeys(literal) {
  const clean = literal
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""');
  let depth = 0;
  let flat = '';
  for (const ch of clean) {
    if (ch === '{' || ch === '[' || ch === '(') {
      depth++;
      if (depth === 1) continue;
    } else if (ch === '}' || ch === ']' || ch === ')') depth--;
    if (depth === 1) flat += ch;
  }
  return flat
    .split(',')
    .map(
      (seg) =>
        seg.match(/^\s*([A-Za-z_$][\w$]*)\s*:/)?.[1] ?? seg.match(/^\s*([A-Za-z_$][\w$]*)\s*$/)?.[1]
    )
    .filter(Boolean);
}

/** ★ THE REFERENCE: the config the BROWSER hands `createRacePlan`. A player runs this one. */
function browserPlanKeys() {
  const src = read('client/src/modules/raceCore.js');
  const call = src.indexOf('createRacePlan(');
  if (call < 0) throw new Error('planConfigMirror: raceCore.js no longer calls createRacePlan');
  // arguments are (planRacers, finishT, durationMs, CONFIG, seed) — CONFIG is the first literal.
  return topLevelKeys(literalAt(src, call));
}

/**
 * The five builders, each found by a text anchor rather than a line number, so an edit above them
 * cannot silently point the check at the wrong place.
 *
 * `via: 'return'` means the anchor is a FUNCTION DECLARATION, whose first `{` is the body — the
 * config is the literal of its `return`. Without that hop the extractor reads the body and finds no
 * keys, which is what the per-site "extracted no keys" assertion below caught while this file was
 * being written. An arrow builder (`=> ({`) and a call argument need no hop.
 */
const SITES = [
  {
    name: 'scripts/parity/goldenRunner.mjs — browserPlanConfig (the parity guard’s browser arm)',
    file: 'scripts/parity/goldenRunner.mjs',
    anchor: 'function browserPlanConfig(',
    via: 'return',
  },
  {
    name: 'scripts/parity/goldenRunner.mjs — simPlanConfig (the arm the parity guards actually run)',
    file: 'scripts/parity/goldenRunner.mjs',
    anchor: 'function simPlanConfig(',
    via: 'return',
  },
  {
    name: 'scripts/sim-fairness.mjs — the fairness instrument',
    file: 'scripts/sim-fairness.mjs',
    anchor: 'const plan = createRacePlan(',
  },
  {
    name: 'scripts/diag/acceptance-orders.mjs',
    file: 'scripts/diag/acceptance-orders.mjs',
    anchor: 'const planConfig = () =>',
  },
  {
    name: 'scripts/diag/micro-divergence.mjs',
    file: 'scripts/diag/micro-divergence.mjs',
    anchor: 'function planConfig()',
    via: 'return',
  },
];

function keysOf(site) {
  const src = read(site.file);
  const first = src.indexOf(site.anchor);
  expect(
    first,
    `planConfigMirror: the anchor "${site.anchor}" is gone from ${site.file}. The builder was ` +
      `renamed or removed — update SITES here rather than deleting the check.`
  ).toBeGreaterThan(-1);
  const second = src.indexOf(site.anchor, first + 1);
  expect(second, `planConfigMirror: "${site.anchor}" appears twice in ${site.file}.`).toBe(-1);
  let from = first + site.anchor.length - 1;
  if (site.via === 'return') {
    from = src.indexOf('return', from);
    expect(
      from,
      `planConfigMirror: ${site.anchor} in ${site.file} no longer returns an object literal.`
    ).toBeGreaterThan(-1);
  }
  return topLevelKeys(literalAt(src, from));
}

describe('every plan-building site receives what the browser supplies', () => {
  const reference = browserPlanKeys();

  it('the reference itself is a plausible plan config, not an empty match', () => {
    // If the extractor silently returned [] every check below would pass vacuously — which is
    // exactly how a guard in this area passed under its own sabotage once before.
    expect(reference.length).toBeGreaterThan(30);
    expect(reference).toContain('gapBrakeEnabled');
    expect(reference).toContain('pathLengthPx');
    expect(reference).toContain('chaosSteer');
  });

  for (const site of SITES) {
    it(`${site.name} omits none of them`, () => {
      const keys = keysOf(site);
      // Same guard as above, per site: an extractor that found nothing must fail loudly.
      expect(keys.length, `planConfigMirror: extracted no keys from ${site.file}`).toBeGreaterThan(
        30
      );
      const missing = reference.filter((k) => !keys.includes(k));
      expect(
        missing,
        missing.length
          ? `${site.file} builds a race plan WITHOUT ${missing.join(', ')}, which the browser ` +
              `passes at raceCore.js (createRacePlan). That harness runs a world no player sees.\n` +
              `Pass the missing input from a value already at that site — do not invent one.`
          : ''
      ).toEqual([]);
    });
  }
});
