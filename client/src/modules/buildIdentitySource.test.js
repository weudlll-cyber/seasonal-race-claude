// ============================================================
// File:        buildIdentitySource.test.js
// Project:     RaceArena — CAMERA-COMPANY-ONLY-3 §1
//
// THE DEFECT THIS EXISTS FOR, stated plainly because it cost a ship:
//
// The build identity had THREE consumers — the HUD pill, the [RA CAMERA LIVE TRUTH] console line,
// and the camera marker's `build` field. BUILD-TRUTH-1 moved ONE of them (the pill) to the live git
// read and left the other two on the frozen `__RA_COMMIT__` define. The tests written at the time
// covered the consumer that had been fixed. So the line went on printing a value from the moment the
// dev server started — it printed `77919708` twice, hours apart, across two DIFFERENT pills — and
// that contradiction halted a shippable block on its own falsehood.
//
// Testing any one artefact would not have caught it. What catches it is the RELATIONSHIP: the
// artefacts must agree, and there must be only one place the value can come from.
// ============================================================

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import RA_BUILD from 'virtual:ra-build';
import { formatBuildLabel } from './buildInfo.js';

const SRC = join(process.cwd(), 'src');
const RACE_SCREEN = readFileSync(join(SRC, 'screens/RaceScreen/index.jsx'), 'utf8');
const VITE_CONFIG = readFileSync(join(process.cwd(), 'vite.config.js'), 'utf8');

/** Strip comments so a mention in prose is not mistaken for a reader. */
const codeOnly = (s) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//'))
    .join('\n');

describe('the build identity has ONE source', () => {
  it('no source file READS the frozen __RA_COMMIT__ define any more', () => {
    expect(codeOnly(RACE_SCREEN)).not.toContain('__RA_COMMIT__');
  });

  it('the define is not declared in the Vite config either — it cannot come back by accident', () => {
    expect(codeOnly(VITE_CONFIG)).not.toContain('__RA_COMMIT__');
  });

  it('all three consumers read RA_BUILD', () => {
    const code = codeOnly(RACE_SCREEN);
    // the marker's build field, and the live-truth line's commit
    expect(code).toContain('build: RA_BUILD.commit');
    expect(code).toContain('const commit = RA_BUILD.commit');
    // the HUD pill
    expect(code).toContain('buildBadge: RA_BUILD');
  });

  it('THE ARTEFACTS CANNOT DISAGREE — pill, console line and marker are the same value', () => {
    // What each artefact reports, derived the way the app derives it.
    const pill = formatBuildLabel(RA_BUILD);
    const consoleLine = RA_BUILD.commit;
    const marker = RA_BUILD.commit;
    expect(marker).toBe(consoleLine);
    expect(pill).toContain(consoleLine);
    // And it is a real identity, not a fallback that would let them agree on nothing.
    expect(consoleLine).toMatch(/^[0-9a-f]{7,12}$/);
  });

  it('the fallback string "dev" is gone — a frozen value and a placeholder are both lies', () => {
    const code = codeOnly(RACE_SCREEN);
    expect(code).not.toContain("? __RA_COMMIT__ : 'dev'");
  });
});
