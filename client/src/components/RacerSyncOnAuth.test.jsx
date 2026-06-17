// ============================================================
// File:        RacerSyncOnAuth.test.jsx
// Path:        client/src/components/RacerSyncOnAuth.test.jsx
// Project:     RaceArena
// Description: Tests for RacerSyncOnAuth. Covers: load triggered on auth OR
//              offline-hint; NOT while loading or truly anonymous.
//              L126: offline-hint test is RED against old condition (!loading && user)
//              and GREEN with the fix (!loading && (user || authState==='offline-hint')).
// ============================================================

import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../contexts/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../modules/racer-types/index.js', () => ({ loadServerRacerTypes: vi.fn() }));

import RacerSyncOnAuth from './RacerSyncOnAuth.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { loadServerRacerTypes } from '../modules/racer-types/index.js';

const MOCK_USER = { id: 'u1', username: 'testoperator', role: 'operator' };

beforeEach(() => {
  vi.clearAllMocks();
  loadServerRacerTypes.mockResolvedValue(undefined);
});

// ── Auth-gating ───────────────────────────────────────────────────────────────

describe('RacerSyncOnAuth — auth-gating', () => {
  it('calls loadServerRacerTypes when user is set and not loading', () => {
    useAuth.mockReturnValue({ user: MOCK_USER, loading: false, authState: 'online' });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).toHaveBeenCalledTimes(1);
  });

  it('does NOT call loadServerRacerTypes when anonymous (user null, no offline-hint)', () => {
    useAuth.mockReturnValue({ user: null, loading: false, authState: 'anonymous' });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();
  });

  it('does NOT call loadServerRacerTypes while still loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true, authState: 'anonymous' });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();
  });

  it('does NOT call loadServerRacerTypes while loading even if user is set', () => {
    useAuth.mockReturnValue({ user: MOCK_USER, loading: true, authState: 'online' });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();
  });
});

// ── Re-auth ───────────────────────────────────────────────────────────────────

describe('RacerSyncOnAuth — re-auth triggers load again', () => {
  it('calls loadServerRacerTypes again when user changes (e.g. re-login)', () => {
    const { rerender } = render(<RacerSyncOnAuth />);

    useAuth.mockReturnValue({ user: null, loading: false, authState: 'anonymous' });
    rerender(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();

    useAuth.mockReturnValue({ user: MOCK_USER, loading: false, authState: 'online' });
    act(() => {
      rerender(<RacerSyncOnAuth />);
    });
    expect(loadServerRacerTypes).toHaveBeenCalledTimes(1);
  });
});

// ── Renders nothing ───────────────────────────────────────────────────────────

describe('RacerSyncOnAuth — renders nothing', () => {
  it('returns null — no DOM output', () => {
    useAuth.mockReturnValue({ user: null, loading: false, authState: 'anonymous' });
    const { container } = render(<RacerSyncOnAuth />);
    expect(container.firstChild).toBeNull();
  });
});

// ── Offline-hint gate fix (L126) ──────────────────────────────────────────────
//
// Without the fix: condition was `!loading && user` — offline-hint has user=null
// → loadServerRacerTypes never called → _racersReady stays false → gate hangs.
// With the fix: condition is `!loading && (user || authState === 'offline-hint')`
// → load fires → fetch fails fast → catch → _markRacersReady() → gate resolves.

describe('RacerSyncOnAuth — offline-hint triggers load (L126)', () => {
  it('calls loadServerRacerTypes when authState=offline-hint and user=null', () => {
    // L126: RED against old condition (!loading && user), GREEN with the fix.
    useAuth.mockReturnValue({ user: null, loading: false, authState: 'offline-hint' });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).toHaveBeenCalledTimes(1);
  });

  it('does NOT call loadServerRacerTypes when authState=anonymous (no user, no hint)', () => {
    useAuth.mockReturnValue({ user: null, loading: false, authState: 'anonymous' });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();
  });

  it('calls loadServerRacerTypes when authState=online with user (existing behaviour)', () => {
    useAuth.mockReturnValue({ user: MOCK_USER, loading: false, authState: 'online' });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).toHaveBeenCalledTimes(1);
  });

  it('does NOT call loadServerRacerTypes while loading even in offline-hint', () => {
    useAuth.mockReturnValue({ user: null, loading: true, authState: 'offline-hint' });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();
  });

  it('triggers load on transition from anonymous to offline-hint (gate resolves on reconnect drop)', () => {
    useAuth.mockReturnValue({ user: null, loading: false, authState: 'anonymous' });
    const { rerender } = render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();

    useAuth.mockReturnValue({ user: null, loading: false, authState: 'offline-hint' });
    act(() => {
      rerender(<RacerSyncOnAuth />);
    });
    expect(loadServerRacerTypes).toHaveBeenCalledTimes(1);
  });
});
