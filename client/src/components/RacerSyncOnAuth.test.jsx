// ============================================================
// File:        RacerSyncOnAuth.test.jsx
// Path:        client/src/components/RacerSyncOnAuth.test.jsx
// Project:     RaceArena
// Description: Tests for RacerSyncOnAuth (D6a). Mirrors BrandingSyncOnAuth.test.jsx.
//              Covers: load triggered on auth, NOT while loading or unauthenticated.
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
    useAuth.mockReturnValue({ user: MOCK_USER, loading: false });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).toHaveBeenCalledTimes(1);
  });

  it('does NOT call loadServerRacerTypes when user is null (unauthenticated)', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();
  });

  it('does NOT call loadServerRacerTypes while still loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();
  });

  it('does NOT call loadServerRacerTypes while loading even if user is set', () => {
    useAuth.mockReturnValue({ user: MOCK_USER, loading: true });
    render(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();
  });
});

// ── Re-auth ───────────────────────────────────────────────────────────────────

describe('RacerSyncOnAuth — re-auth triggers load again', () => {
  it('calls loadServerRacerTypes again when user changes (e.g. re-login)', () => {
    const { rerender } = render(<RacerSyncOnAuth />);

    useAuth.mockReturnValue({ user: null, loading: false });
    rerender(<RacerSyncOnAuth />);
    expect(loadServerRacerTypes).not.toHaveBeenCalled();

    useAuth.mockReturnValue({ user: MOCK_USER, loading: false });
    act(() => {
      rerender(<RacerSyncOnAuth />);
    });
    expect(loadServerRacerTypes).toHaveBeenCalledTimes(1);
  });
});

// ── Renders nothing ───────────────────────────────────────────────────────────

describe('RacerSyncOnAuth — renders nothing', () => {
  it('returns null — no DOM output', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    const { container } = render(<RacerSyncOnAuth />);
    expect(container.firstChild).toBeNull();
  });
});
