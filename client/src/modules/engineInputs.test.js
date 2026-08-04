// ============================================================
// engineInputs.test.js — CAMERA-HYGIENE-1, stage 2 of the mint tripwire
//
// THE POINT OF THIS FILE, in one sentence: the mint rule catches what someone remembers, and this
// catches what nobody does.
//
// Stage 1 wrote a rule into the ship ceremony — a block that touches a file under
// client/src/modules/ outside camera/ mints once. A prose rule in a checklist cannot be tested and
// depends on a person reading it on a busy day. This test does not: it reads `raceCore.js`'s own
// import list and fails when it names a module that `ENGINE_INPUT_MODULES` does not, so ADDING AN
// ENGINE INPUT FORCES A DECISION instead of a silence.
//
// The motivating case, recorded so the next reader knows this is not theoretical: `drawnBodyWidthRefPx`
// is computed in a screen file and consumed by `raceBehavior.js` as the avoidance body size. A value
// that moves the race can therefore sit in a "presentation-only" diff and pass both of the checks we
// had. `autoSpriteScale.js` did exactly that in CAMERA-PICTURE-FIXES-1.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { ENGINE_INPUT_MODULES } from './raceConfigWorld.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const raceCoreSrc = readFileSync(join(HERE, 'raceCore.js'), 'utf8');

/** Every module specifier `raceCore.js` imports from, in source order. */
function raceCoreImports() {
  return [...raceCoreSrc.matchAll(/^import[\s\S]*?from '([^']+)';/gm)].map((m) => m[1]);
}

describe('the engine-input module list stays in lock-step with raceCore', () => {
  it('raceCore imports nothing that the list does not name', () => {
    const missing = raceCoreImports().filter((spec) => !ENGINE_INPUT_MODULES.includes(spec));
    expect(
      missing,
      missing.length
        ? `raceCore.js now imports ${missing.join(', ')}, which ENGINE_INPUT_MODULES does not name.\n` +
            `That module's values reach the engine. Add it to the list in raceConfigWorld.js — and\n` +
            `note that a block touching it must MINT (docs/SHIP-CEREMONY.md → THE MINT TRIPWIRE).`
        : ''
    ).toEqual([]);
  });

  it('the list names nothing raceCore has stopped importing', () => {
    const imports = raceCoreImports();
    const stale = ENGINE_INPUT_MODULES.filter((spec) => !imports.includes(spec));
    expect(
      stale,
      stale.length
        ? `ENGINE_INPUT_MODULES still names ${stale.join(', ')} — raceCore no longer imports it.`
        : ''
    ).toEqual([]);
  });

  it('the list is a set — a duplicate entry would hide a real one', () => {
    expect(new Set(ENGINE_INPUT_MODULES).size).toBe(ENGINE_INPUT_MODULES.length);
  });

  // FAILURE PROOF — the test has to be able to fail, and this is the exact shape of the case it
  // exists for: a module reaching the engine that the list has not been told about.
  it('FAILURE PROOF: an unlisted engine import is detected', () => {
    const pretendSrc = raceCoreSrc + "\nimport { thing } from './autoSpriteScale.js';\n";
    const specs = [...pretendSrc.matchAll(/^import[\s\S]*?from '([^']+)';/gm)].map((m) => m[1]);
    const missing = specs.filter((s) => !ENGINE_INPUT_MODULES.includes(s));
    expect(missing).toContain('./autoSpriteScale.js');
  });

  it('and the parser actually reads the real file — not an empty match', () => {
    const imports = raceCoreImports();
    expect(imports.length).toBeGreaterThan(5);
    expect(imports).toContain('./raceBehavior.js'); // the avoidance path, by name
  });
});
