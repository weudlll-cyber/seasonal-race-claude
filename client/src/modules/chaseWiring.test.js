// ============================================================
// File:        chaseWiring.test.js
// Path:        client/src/modules/chaseWiring.test.js
// Project:     RaceArena — CHASE-AFTER-OUTCOME (NIGHT-2026-09-23)
//
// ★★★ WHAT THIS EXISTS FOR, AND IT IS NOT A FORMALITY. A key declared in `defaults.js` and read in
// `raceGovernor.js` is STILL UNREACHABLE until it is copied through the explicit key-by-key list in
// `raceCore.js`. That gap has bitten this project four times in two days:
//   · the gap-brake group keys never reached `createRacePlan` — five sweep arms came back
//     byte-identical and the numbers looked plausible (f2713fcb);
//   · an "ablation" arm that was a second run of another arm wearing its name;
//   · two keys that reached the engine but had no Dev Screen control and no validation rule;
//   · five plan-building sites that omitted them (BLIND-SITE-1's guard).
// Every one of those was found AFTER a measurement had been read. This file is the guard that runs
// BEFORE one: it fails if any of the three chase keys does not arrive at the governor at race time.
//
// ★ IT CHECKS BOTH HALVES OF THE PATH — that `raceCore` COPIES each key into `pulkLeadRotCfg`, and
// that `raceGovernor` READS it. A key copied but never read is exactly as unreachable as one read
// but never copied, and only one of those two mistakes is visible in `defaults.js`.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_RACE_DYNAMICS_CONFIG } from './storage/defaults.js';

// ★ Read from the working directory, not from `import.meta.url`: under vitest that URL is not a
// `file:` URL and `fileURLToPath` throws — which is how the first version of this guard failed for
// a reason that had nothing to do with what it asserts. Vitest runs with cwd = client/.
const modPath = (f) => join(process.cwd(), 'src', 'modules', f);

const KEYS = ['chaseAfterOutcomeEnabled', 'chaseAfterOutcomeSelection', 'chaseAfterOutcomeSlots'];

describe('CHASE-AFTER-OUTCOME — the three keys reach the governor', () => {
  it('★ all three exist in defaults.js, at the SHIPPED values', () => {
    // ★ Shipped ON 2026-09-23 (CHASE-SHIP-1). This used to assert the pre-ship values and read
    // "the defaults are TODAY"; today IS the chase.
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeEnabled).toBe(true);
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeSelection).toBe('gap');
    expect(DEFAULT_RACE_DYNAMICS_CONFIG.chaseAfterOutcomeSlots).toBe(5);
  });

  it('★★ all three are COPIED THROUGH raceCore into the governor config', () => {
    const text = readFileSync(modPath('raceCore.js'), 'utf8');
    const at = text.indexOf('const pulkLeadRotCfg = {');
    expect(at, 'raceCore no longer builds pulkLeadRotCfg — update this guard').toBeGreaterThan(0);
    const block = text.slice(at, text.indexOf('\n  };', at));
    for (const k of KEYS) {
      expect(block, `${k} is MISSING from raceCore's pulkLeadRotCfg copy list`).toContain(`${k}:`);
    }
  });

  it('★ the governor READS all three — copied but never read is equally unreachable', () => {
    const text = readFileSync(modPath('raceGovernor.js'), 'utf8');
    for (const k of KEYS) {
      // `cfg.x` or `cfg?.x` — this is about the READ, not the optional-chaining style.
      const reads = text.includes(`cfg?.${k}`) || text.includes(`cfg.${k}`);
      expect(reads, `raceGovernor never reads ${k}`).toBe(true);
    }
  });
});
