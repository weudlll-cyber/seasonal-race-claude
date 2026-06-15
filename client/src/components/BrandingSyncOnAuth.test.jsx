// ============================================================
// File:        BrandingSyncOnAuth.test.jsx
// Path:        client/src/components/BrandingSyncOnAuth.test.jsx
// Project:     RaceArena
// Description: Tests for BrandingSyncOnAuth (D4 fix, Ursache 2).
//              Covers: sync runs when user authenticates, NOT while loading or
//              unauthenticated, and re-runs on re-auth (idempotent).
// ============================================================

import { render, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../contexts/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../modules/branding/brandingSync.js', () => ({ syncBrandingMirror: vi.fn() }));

import BrandingSyncOnAuth from './BrandingSyncOnAuth.jsx';
import { useAuth } from '../contexts/AuthContext.jsx';
import { syncBrandingMirror } from '../modules/branding/brandingSync.js';

const MOCK_USER = { id: 'u1', username: 'testoperator', role: 'operator' };

beforeEach(() => {
  vi.clearAllMocks();
  syncBrandingMirror.mockResolvedValue(undefined);
});

// ── Auth-gating (Invariant: no sync without auth) ─────────────────────────────

describe('BrandingSyncOnAuth — auth-gating', () => {
  it('calls syncBrandingMirror when user is set and not loading', () => {
    useAuth.mockReturnValue({ user: MOCK_USER, loading: false });
    render(<BrandingSyncOnAuth />);
    expect(syncBrandingMirror).toHaveBeenCalledTimes(1);
  });

  it('does NOT call syncBrandingMirror when user is null (unauthenticated)', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    render(<BrandingSyncOnAuth />);
    expect(syncBrandingMirror).not.toHaveBeenCalled();
  });

  it('does NOT call syncBrandingMirror while still loading', () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    render(<BrandingSyncOnAuth />);
    expect(syncBrandingMirror).not.toHaveBeenCalled();
  });

  it('does NOT call syncBrandingMirror while loading even if user is set', () => {
    // Race condition: user set but loading still true — guard must hold
    useAuth.mockReturnValue({ user: MOCK_USER, loading: true });
    render(<BrandingSyncOnAuth />);
    expect(syncBrandingMirror).not.toHaveBeenCalled();
  });
});

// ── Re-auth (idempotent) ──────────────────────────────────────────────────────

describe('BrandingSyncOnAuth — re-auth triggers sync again', () => {
  it('calls syncBrandingMirror again when user changes (e.g. re-login)', () => {
    const { rerender } = render(<BrandingSyncOnAuth />);

    // First: unauthenticated
    useAuth.mockReturnValue({ user: null, loading: false });
    rerender(<BrandingSyncOnAuth />);
    expect(syncBrandingMirror).not.toHaveBeenCalled();

    // Then: authenticated
    useAuth.mockReturnValue({ user: MOCK_USER, loading: false });
    act(() => {
      rerender(<BrandingSyncOnAuth />);
    });
    expect(syncBrandingMirror).toHaveBeenCalledTimes(1);
  });
});

// ── Renders nothing ───────────────────────────────────────────────────────────

describe('BrandingSyncOnAuth — renders nothing', () => {
  it('returns null — no DOM output', () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    const { container } = render(<BrandingSyncOnAuth />);
    expect(container.firstChild).toBeNull();
  });
});
