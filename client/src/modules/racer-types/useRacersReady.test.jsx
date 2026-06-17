// ============================================================
// File:        useRacersReady.test.jsx
// Path:        client/src/modules/racer-types/useRacersReady.test.jsx
// Project:     RaceArena
// Description: Tests for useRacersReady hook. Covers lost-update fix (L126):
//              when _markRacersReady() fires between initial render (ready=false)
//              and effect subscription, the effect must sync setReady(true) instead
//              of returning early with local state still false.
// ============================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRacersReady } from './useRacersReady.js';

vi.mock('./index.js', () => ({
  areRacersReady: vi.fn(),
  waitForRacersReady: vi.fn(),
}));

import { areRacersReady, waitForRacersReady } from './index.js';

beforeEach(() => {
  vi.clearAllMocks();
});

// ── Lost-update fix (L126) ────────────────────────────────────────────────────
//
// Scenario: areRacersReady() returns false at useState init time (render), but
// true by the time the effect runs (ready flipped in between — e.g. offline load
// failed fast before the effect subscription was established).
//
// OLD hook: `if (areRacersReady()) return;` — returns without setReady(true),
//   local ready stays false → RacersReadyGate hangs on "Loading racers…".
// NEW hook: `if (areRacersReady()) { setReady(true); return; }` — syncs local
//   state → gate resolves with built-in racers.

describe('useRacersReady — lost-update fix (L126)', () => {
  it('returns true when ready flipped between render and effect (lost-update window)', async () => {
    // First call: useState init → false (not yet ready at render time)
    // All subsequent calls: true (ready flipped before effect ran)
    areRacersReady.mockReturnValueOnce(false).mockReturnValue(true);
    // waitForRacersReady must not be needed — the early-return path handles it.
    waitForRacersReady.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useRacersReady());

    // After effect flush: effect sees areRacersReady()===true → setReady(true) → returns.
    // OLD hook: returns without setReady → result.current stays false (RED).
    // NEW hook: setReady(true) then return → result.current is true (GREEN).
    await act(async () => {});
    expect(result.current).toBe(true);
    // waitForRacersReady must NOT have been called (early-return path, no subscription).
    expect(waitForRacersReady).not.toHaveBeenCalled();
  });
});

// ── Callback path (existing behaviour) ───────────────────────────────────────

describe('useRacersReady — callback path (ready arrives after subscription)', () => {
  it('returns false initially then true when waitForRacersReady resolves', async () => {
    areRacersReady.mockReturnValue(false); // still false at both render and effect time
    let resolveReady;
    waitForRacersReady.mockReturnValue(
      new Promise((resolve) => {
        resolveReady = resolve;
      })
    );

    const { result } = renderHook(() => useRacersReady());
    expect(result.current).toBe(false);

    await act(async () => {
      resolveReady();
    });
    expect(result.current).toBe(true);
  });

  it('returns true immediately when already ready at render time (no subscription)', async () => {
    areRacersReady.mockReturnValue(true); // ready from the start
    waitForRacersReady.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useRacersReady());
    await act(async () => {});
    expect(result.current).toBe(true);
    expect(waitForRacersReady).not.toHaveBeenCalled();
  });
});
