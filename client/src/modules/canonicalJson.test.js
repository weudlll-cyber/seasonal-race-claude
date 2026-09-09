// @vitest-environment node
// SUITE-ENV-SPLIT: no DOM and no browser global, here or in anything this file imports — see the
// note in vitest.config.js. Verified by running it in BOTH environments: same tests, same count.
// ============================================================
// File:        canonicalJson.test.js
// Path:        client/src/modules/canonicalJson.test.js
// Project:     RaceArena — SHARED-CANONICAL-1
//
// THE PROOF THAT MOVING `canonicalJson` INTO `shared/` CHANGED NOTHING IT PRODUCES.
//
// ★ WHY AN EXACT-STRING TEST AND NOT A PROPERTY TEST. Stored content addresses are byte
// comparisons against this exact string (`server/src/races/contentAddress.js`), so an output that
// is merely "equivalent" is not good enough: a different string silently orphans every race already
// stored, and the store's collision check would then throw on content that really is the same race.
// The expectations below are not invented. Every one was CAPTURED FROM THE PRE-MOVE IMPLEMENTATION
// in `client/src/modules/raceConfigWorld.js` and pasted here, so this file compares the function
// before the move against the function after it.
//
// It lives under `client/` rather than beside the module for the reason `nameLimits.test.js`
// already does: `shared/` carries no test runner, and the client's vitest is the one that reaches
// both packages' shared files.
//
// ── WHAT THIS FILE DELIBERATELY DOES NOT DO ─────────────────────────────────────────────────────
// It does not test `hashWorld`, which stayed in `raceConfigWorld.js` and is covered by that
// module's own test. It asserts nothing about whether the canonical form is a GOOD one — only that
// it is the SAME one.
// ============================================================

import { describe, it, expect } from 'vitest';
import { canonicalJson } from '../../../shared/canonicalJson.mjs';

// [name, value, the exact string the PRE-MOVE implementation produced]
const GOLDEN = [
  ['primitive-null', null, 'null'],
  ['primitive-number', 42, '42'],
  ['primitive-negzero', -0, '0'],
  ['primitive-float', 0.1 + 0.2, '0.30000000000000004'],
  ['primitive-string', 'hello', '"hello"'],
  ['primitive-bool', true, 'true'],
  ['empty-object', {}, '{}'],
  ['empty-array', [], '[]'],
  ['key-order-a', { a: 1, b: 2, c: 3 }, '{"a":1,"b":2,"c":3}'],
  ['key-order-b', { c: 3, b: 2, a: 1 }, '{"a":1,"b":2,"c":3}'],
  [
    'nested-order',
    { z: { q: 2, p: 1 }, a: [3, { n: 1, m: 2 }] },
    '{"a":[3,{"m":2,"n":1}],"z":{"p":1,"q":2}}',
  ],
  // Non-ASCII in both keys and values. Deliberately carries no character from the umlaut class
  // that `scripts/check-language-closed.mjs` treats as German — see its UMLAUT pattern. A test
  // fixture is not a reason to add a frozen allowance to that guard's list, and naming the class
  // here rather than spelling it out is the same rule applied to this comment.
  [
    'unicode',
    { é: 1, z: 'ce-cedille-ç', emoji: '🏁', Ω: 2 },
    '{"emoji":"🏁","z":"ce-cedille-ç","é":1,"Ω":2}',
  ],
  // ★ The integer-key quirk, pinned deliberately: NUMERIC ascending, not the lexicographic order
  // the `.sort()` asks for. See the note in the module. If this row ever changes, every stored
  // content address whose config had an integer-like key has moved.
  ['numeric-keys', { 10: 'a', 2: 'b', 1: 'c' }, '{"1":"c","2":"b","10":"a"}'],
  [
    'array-of-objects',
    [
      { b: 1, a: 2 },
      { d: 3, c: 4 },
    ],
    '[{"a":2,"b":1},{"c":4,"d":3}]',
  ],
  [
    'deep',
    { l1: { l2: { l3: { l4: { z: 1, a: 2 } } } } },
    '{"l1":{"l2":{"l3":{"l4":{"a":2,"z":1}}}}}',
  ],
  ['undefined-value', { a: undefined, b: 1 }, '{"b":1}'],
  [
    'nested-array-array',
    [
      [1, 2],
      [3, [4, 5]],
    ],
    '[[1,2],[3,[4,5]]]',
  ],
  [
    'mixed-world-shape',
    {
      schemaVersion: 2,
      track: 'mountainstreet',
      racer: 'boarder',
      racerCount: 40,
      cameraConfig: { zoomMin: 0.5, zoomMax: 2, anchorBias: 0.35 },
      raceDynamicsConfig: { pulkLeaderBrake: 0.15, pulkChallengerBoost: 0.12 },
      racerNames: ['Anna', 'Bo', 'Çi', 'Dov'],
    },
    '{"cameraConfig":{"anchorBias":0.35,"zoomMax":2,"zoomMin":0.5},"raceDynamicsConfig":{"pulkChallengerBoost":0.12,"pulkLeaderBrake":0.15},"racer":"boarder","racerCount":40,"racerNames":["Anna","Bo","Çi","Dov"],"schemaVersion":2,"track":"mountainstreet"}',
  ],
];

describe('canonicalJson produces byte-identical output to the pre-move implementation', () => {
  for (const [name, value, expected] of GOLDEN) {
    it(`★ ${name}`, () => {
      expect(canonicalJson(value)).toBe(expected);
    });
  }
});

describe('the properties the store depends on', () => {
  // Relocated from raceConfigWorld.test.js when the function moved — not a second copy of it.
  it('is key-order independent', () => {
    expect(canonicalJson({ a: 1, b: 2 })).toBe(canonicalJson({ b: 2, a: 1 }));
    expect(canonicalJson({ x: { p: 1, q: 2 } })).toBe(canonicalJson({ x: { q: 2, p: 1 } }));
  });

  it('refuses a circular reference loudly rather than serialising something partial', () => {
    const a = { name: 'a' };
    a.self = a;
    expect(() => canonicalJson(a)).toThrow(/circular reference/);
  });
});
