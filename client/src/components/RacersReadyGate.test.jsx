// ============================================================
// File:        RacersReadyGate.test.jsx
// Path:        client/src/components/RacersReadyGate.test.jsx
// Project:     RaceArena
// Description: Tests for RacersReadyGate + useRacersReady hook (D6a).
//
//              Honesty proof (b) — Gate blocks before ready, renders after:
//              RED: gate absent — children always render regardless of ready state.
//              GREEN: gate blocks until useRacersReady returns true.
// ============================================================

import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../modules/racer-types/useRacersReady.js', () => ({ useRacersReady: vi.fn() }));

import RacersReadyGate from './RacersReadyGate.jsx';
import { useRacersReady } from '../modules/racer-types/useRacersReady.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── HONESTY PROOF (b) — Gate blocks Setup/Race until ready (L126) ─────────────
//
// RED: no gate — children always render; GREEN: gate blocks until ready=true.

describe('Honesty proof (b) — RacersReadyGate loading-gate (L126)', () => {
  it('shows "Loading racers…" when not ready — children NOT rendered', () => {
    useRacersReady.mockReturnValue(false);
    const { getByText, queryByText } = render(
      <RacersReadyGate>
        <div>race content</div>
      </RacersReadyGate>
    );
    expect(getByText('Loading racers…')).toBeTruthy();
    expect(queryByText('race content')).toBeNull();
  });

  it('renders children when ready — loading text absent', () => {
    useRacersReady.mockReturnValue(true);
    const { getByText, queryByText } = render(
      <RacersReadyGate>
        <div>race content</div>
      </RacersReadyGate>
    );
    expect(getByText('race content')).toBeTruthy();
    expect(queryByText('Loading racers…')).toBeNull();
  });

  it('transitions from loading to children when ready flips to true', () => {
    useRacersReady.mockReturnValue(false);
    const { getByText, queryByText, rerender } = render(
      <RacersReadyGate>
        <div>race content</div>
      </RacersReadyGate>
    );
    expect(getByText('Loading racers…')).toBeTruthy();

    useRacersReady.mockReturnValue(true);
    act(() => {
      rerender(
        <RacersReadyGate>
          <div>race content</div>
        </RacersReadyGate>
      );
    });
    expect(getByText('race content')).toBeTruthy();
    expect(queryByText('Loading racers…')).toBeNull();
  });
});

// ── useRacersReady hook ───────────────────────────────────────────────────────
// Tested through the gate (mocking the hook directly verifies the gate contract).
// Direct hook tests live separately if deeper coverage is needed.
