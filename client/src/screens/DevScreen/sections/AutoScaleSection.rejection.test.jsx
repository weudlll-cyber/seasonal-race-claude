// ============================================================
// File:        AutoScaleSection.rejection.test.jsx
// Path:        client/src/screens/DevScreen/sections/AutoScaleSection.rejection.test.jsx
// Project:     RaceArena — POLISH-2026-09-24B piece 3(f)
// Description: An out-of-range min/max SAYS it was rejected, instead of doing nothing visible.
//
// ★ WHAT THIS IS REALLY GUARDING. The old code was `if (v > config.minScale) set('maxScale', v);`
// — type something invalid and the stored value silently stayed put, indistinguishable from a value
// that was accepted. The assertion that matters is therefore NOT "the value was rejected" (it always
// was) but "the rejection is VISIBLE".
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AutoScaleSection from './AutoScaleSection.jsx';
import { DEFAULT_AUTO_SCALE_CONFIG } from '../../../modules/autoSpriteScale.js';

beforeEach(() => {
  try {
    localStorage.clear();
  } catch {
    /* a blocked store is not this test's subject */
  }
});

// The maximum-scale field, found by its shipped value rather than by position. Read from the
// source of truth so this test does not carry a typed-in number that can drift.
const maxInput = () =>
  screen
    .getAllByRole('spinbutton')
    .find((el) => el.value === String(DEFAULT_AUTO_SCALE_CONFIG.maxScale));

describe('AutoScaleSection — an out-of-range value says so', () => {
  it('shows nothing before anything is typed', () => {
    render(<AutoScaleSection />);
    expect(screen.queryByTestId('autoscale-range-rejection')).toBeNull();
  });

  it('★ a maximum at or below the minimum is REJECTED VISIBLY, not silently', () => {
    render(<AutoScaleSection />);
    const max = maxInput();
    expect(max).toBeTruthy();

    // 0.1 is below the shipped minimum, so the old code ignored it without a word
    fireEvent.change(max, { target: { value: '0.1' } }); // below the shipped minimum

    const notice = screen.getByTestId('autoscale-range-rejection');
    expect(notice.textContent).toMatch(/not applied/i);
    expect(notice.textContent).toMatch(/above the minimum/i);
  });

  it('★ the notice CLEARS once a valid value is accepted', () => {
    render(<AutoScaleSection />);
    const max = maxInput();
    fireEvent.change(max, { target: { value: '0.1' } }); // below the shipped minimum
    expect(screen.queryByTestId('autoscale-range-rejection')).not.toBeNull();

    fireEvent.change(max, { target: { value: '3' } });
    expect(screen.queryByTestId('autoscale-range-rejection')).toBeNull();
  });
});
