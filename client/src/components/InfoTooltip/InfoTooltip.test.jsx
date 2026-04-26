// ============================================================
// File:        InfoTooltip.test.jsx
// Path:        client/src/components/InfoTooltip/InfoTooltip.test.jsx
// Project:     RaceArena
// Created:     2026-04-26
// Description: Tests for the InfoTooltip component
// ============================================================

import { render, screen } from '@testing-library/react';
import { InfoTooltip } from './InfoTooltip.jsx';

describe('InfoTooltip', () => {
  it('renders the icon', () => {
    render(<InfoTooltip text="Help text" />);
    const icon = screen.getByRole('img');
    expect(icon).toBeTruthy();
  });

  it('has aria-label with the tooltip text', () => {
    render(<InfoTooltip text="Some tooltip info" />);
    expect(screen.getByLabelText('Some tooltip info')).toBeTruthy();
  });

  it('has tabIndex=0 for keyboard accessibility', () => {
    render(<InfoTooltip text="Accessible" />);
    const icon = screen.getByRole('img');
    expect(icon.getAttribute('tabindex')).toBe('0');
  });

  it('renders a tooltip span with the correct text', () => {
    render(<InfoTooltip text="My tooltip" />);
    // tooltip span has display:none in CSS — query with hidden:true
    expect(screen.getByRole('tooltip', { hidden: true }).textContent).toBe('My tooltip');
  });

  it('renders without alignRight by default', () => {
    const { container } = render(<InfoTooltip text="x" />);
    // The tip element should not have the tipRight class
    const tip = container.querySelector('[role="tooltip"]');
    // tipRight class is only added when alignRight=true
    expect(tip.className).not.toContain('tipRight');
  });
});
