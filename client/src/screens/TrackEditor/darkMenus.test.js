// ============================================================
// File:        darkMenus.test.js
// Path:        client/src/screens/TrackEditor/darkMenus.test.js
// Project:     RaceArena — WEBSITE-EXTRAS-1 follow-up 4
// Description: The editors' menus were styled dark but their arrow and opened list were the
//              browser's, white with the field's light text. Each menu class now says
//              `color-scheme: dark` (the owner's decision of 2026-11-13): the track editor's
//              `.loadSelect` (its load and lights menus), the effect list's `.select` and the
//              racer editor's `.select`.
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it, expect } from 'vitest';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

describe('the editors draw their menus dark (follow-up 4, 2026-11-13)', () => {
  it.each([
    ['screens/TrackEditor/TrackEditor.module.css', 'loadSelect'],
    ['components/EffectConfig/EffectConfig.module.css', 'select'],
    ['screens/RacerEditor/RacerEditor.module.css', 'select'],
  ])('%s .%s is color-scheme dark', (file, cls) => {
    const css = readFileSync(join(SRC, file), 'utf8');
    const rule = css.match(new RegExp(`\\n\\.${cls} \\{([^}]*)\\}`));
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/color-scheme:\s*dark/);
  });
});
