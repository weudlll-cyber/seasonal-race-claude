// ============================================================
// File:        DistributionDiagnostics.controls.test.jsx
// Path:        client/src/screens/DistributionDiagnostics/DistributionDiagnostics.controls.test.jsx
// Project:     RaceArena — WEBSITE-EXTRAS-1 follow-up 4
// Description: The diagnostics screen draws no browser control (the owner's decision of
//              2026-11-13): its two menus draw their arrow and opened list dark, and its runtime
//              slider is the app's red one. The screen has no stylesheet; its looks are inline.
// ============================================================

import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DistributionDiagnostics from './DistributionDiagnostics.jsx';

describe('DistributionDiagnostics — no browser-drawn control (follow-up 4, 2026-11-13)', () => {
  it('★ its menus are dark, its slider is the app colour', () => {
    const { container } = render(<DistributionDiagnostics />);
    const menus = container.querySelectorAll('select');
    // The track menu is drawn only when closed tracks are loaded (none here); the racer-type menu always.
    expect(menus.length).toBeGreaterThan(0);
    for (const m of menus) expect(m.style.colorScheme).toBe('dark');
    const slider = container.querySelector('input[type="range"]');
    expect(slider.style.accentColor).toBe('var(--color-primary)');
  });
});
