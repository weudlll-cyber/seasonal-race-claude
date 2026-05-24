// ============================================================
// File:        CameraStateHUD.test.jsx
// Path:        client/src/screens/RaceScreen/CameraStateHUD.test.jsx
// Project:     RaceArena
// Created:     2026-05-05
// Description: Tests for the CameraStateHUD overlay component.
// ============================================================

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import CameraStateHUD from './CameraStateHUD.jsx';

const STATE_CASES = [
  { state: 'OVERVIEW', label: 'OVERVIEW', tooltip: 'Wide view of the full field' },
  { state: 'LEADER_ZOOM', label: 'FOLLOWING LEADER', tooltip: 'Camera follows the front-runner' },
  { state: 'BATTLE_ZOOM', label: 'BATTLE', tooltip: 'Top racers are neck and neck' },
  { state: 'COMEBACK_ZOOM', label: 'COMEBACK', tooltip: 'Watching a racer fight back' },
  { state: 'LEAD_CHANGE', label: 'LEAD CHANGE', tooltip: 'The leader has changed!' },
  { state: 'FINISH', label: 'FINISH', tooltip: 'A winner has crossed the line!' },
];

describe('CameraStateHUD — label rendering for all 6 states', () => {
  it.each(STATE_CASES)('state $state shows label "$label"', ({ state, label }) => {
    render(<CameraStateHUD camState={state} visible={true} />);
    expect(screen.getByText(label)).toBeTruthy();
  });
});

describe('CameraStateHUD — CSS class per state', () => {
  it.each(STATE_CASES)('state $state has correct CSS class', ({ state }) => {
    render(<CameraStateHUD camState={state} visible={true} />);
    const hud = screen.getByTestId('camera-state-hud');
    const expectedClass = `cam-state-hud--${state.toLowerCase().replace(/_/g, '-')}`;
    expect(hud.classList.contains(expectedClass)).toBe(true);
  });
});

describe('CameraStateHUD — tooltip text', () => {
  it.each(STATE_CASES)('state $state has tooltip "$tooltip"', ({ state, tooltip }) => {
    render(<CameraStateHUD camState={state} visible={true} />);
    const hud = screen.getByTestId('camera-state-hud');
    expect(hud.getAttribute('title')).toBe(tooltip);
  });
});

describe('CameraStateHUD — visibility toggle', () => {
  it('renders nothing when visible=false', () => {
    render(<CameraStateHUD camState="OVERVIEW" visible={false} />);
    expect(screen.queryByTestId('camera-state-hud')).toBeNull();
  });

  it('renders the HUD when visible=true', () => {
    render(<CameraStateHUD camState="OVERVIEW" visible={true} />);
    expect(screen.getByTestId('camera-state-hud')).toBeTruthy();
  });
});

describe('CameraStateHUD — fade transition on state change', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('updates data-state attribute after the fade timeout when camState prop changes', async () => {
    const { rerender } = render(<CameraStateHUD camState="OVERVIEW" visible={true} />);
    expect(screen.getByTestId('camera-state-hud').dataset.state).toBe('OVERVIEW');

    rerender(<CameraStateHUD camState="LEADER_ZOOM" visible={true} />);

    // data-state has NOT updated yet (fade-out phase)
    expect(screen.getByTestId('camera-state-hud').dataset.state).toBe('OVERVIEW');

    // Advance past the 150ms fade-out delay
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(screen.getByTestId('camera-state-hud').dataset.state).toBe('LEADER_ZOOM');
  });
});
