// ============================================================
// File:        devControls.styled.test.jsx
// Path:        client/src/screens/DevScreen/devControls.styled.test.jsx
// Project:     RaceArena — WEBSITE-EXTRAS-1 follow-up 4
// Description: No Dev Screen control is browser-drawn (the owner's decision of 2026-11-13): the
//              config export's two buttons are the screen's `.btn`, the shared slider its `.range`,
//              and `.select` and `.input` — which every Dev Screen menu wears — draw their arrow
//              and opened list dark (`color-scheme: dark`). The camera section's own controls are
//              checked in CameraAdvancedSection.test.jsx.
// ============================================================

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import s from './DevScreen.module.css';
import ConfigExportSection from './sections/ConfigExportSection.jsx';
import { RangeSlider } from './components/RangeSlider.jsx';

const HERE = dirname(fileURLToPath(import.meta.url));

/** Every name of a (possibly composed, so space-separated) module class is on the element. */
const carries = (el, cls) => cls.split(' ').every((name) => el.classList.contains(name));

describe('the Dev Screen draws its own controls (follow-up 4, 2026-11-13)', () => {
  it('★ the config export draws no raw button', () => {
    const { container } = render(<ConfigExportSection />);
    expect(carries(screen.getByTestId('export-race-config'), `${s.btn} ${s.btnSecondary}`)).toBe(
      true
    );
    expect(carries(screen.getByRole('button', { name: /refresh/ }), `${s.btn} ${s.btnGhost}`)).toBe(
      true
    );
    for (const button of within(container).getAllByRole('button'))
      expect(button.className, button.textContent).not.toBe('');
  });

  it('the shared slider is the screen’s .range, and still fills its row', () => {
    render(
      <RangeSlider min={0} max={1} step={0.1} value={0.5} onChange={() => {}} ariaLabel="x" />
    );
    const slider = screen.getByLabelText('x');
    expect(carries(slider, s.range)).toBe(true);
    expect(slider.style.flex).toMatch(/^1/);
  });

  it('every Dev Screen menu draws its list dark: .select and .input are color-scheme dark', () => {
    const css = readFileSync(join(HERE, 'DevScreen.module.css'), 'utf8');
    for (const cls of ['select', 'input']) {
      const rule = css.match(new RegExp(`\\n\\.${cls} \\{([^}]*)\\}`));
      expect(rule, cls).not.toBeNull();
      expect(rule[1], cls).toMatch(/color-scheme:\s*dark/);
    }
  });
});
