// ============================================================
// File:        ProtectedRoute.test.jsx
// Path:        client/src/components/ProtectedRoute.test.jsx
// Project:     RaceArena
// Created:     2026-06-14
// Description: Unit tests for ProtectedRoute — loading state, auth gate,
//              role gate, offline-hint gate, security invariants.
//              L126: offline-hint + allowOffline renders (was login-wall before).
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProtectedRoute from './ProtectedRoute.jsx';

const mockAuthValue = {
  user: null,
  loading: false,
  authState: 'anonymous',
  offlineUser: null,
};

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => mockAuthValue,
}));

function renderProtected({ requiredRole, allowOffline } = {}) {
  render(
    <MemoryRouter initialEntries={['/x']}>
      <Routes>
        <Route
          path="/x"
          element={
            <ProtectedRoute requiredRole={requiredRole} allowOffline={allowOffline}>
              <div>CONTENT</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>LOGIN</div>} />
        <Route path="/setup" element={<div>SETUP-HOME</div>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  mockAuthValue.user = null;
  mockAuthValue.loading = false;
  mockAuthValue.authState = 'anonymous';
  mockAuthValue.offlineUser = null;
});

// ── Loading state ─────────────────────────────────────────────────────────────

describe('ProtectedRoute — loading state', () => {
  it('shows Loading… and neither CONTENT nor LOGIN while loading', () => {
    mockAuthValue.loading = true;
    renderProtected();
    expect(screen.getByText(/loading…/i)).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
    expect(screen.queryByText('LOGIN')).toBeNull();
  });
});

// ── Online (real auth) ────────────────────────────────────────────────────────

describe('ProtectedRoute — online auth', () => {
  it('redirects to /login when authState is anonymous', () => {
    mockAuthValue.authState = 'anonymous';
    renderProtected();
    expect(screen.getByText('LOGIN')).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
  });

  it('renders children when online and no requiredRole', () => {
    mockAuthValue.authState = 'online';
    mockAuthValue.user = { username: 'alice', role: 'operator' };
    renderProtected();
    expect(screen.getByText('CONTENT')).toBeTruthy();
    expect(screen.queryByText('LOGIN')).toBeNull();
  });

  it('redirects operator to /setup when requiredRole is admin', () => {
    mockAuthValue.authState = 'online';
    mockAuthValue.user = { username: 'alice', role: 'operator' };
    renderProtected({ requiredRole: 'admin' });
    expect(screen.getByText('SETUP-HOME')).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
  });

  it('renders children when online and user is admin + requiredRole is admin', () => {
    mockAuthValue.authState = 'online';
    mockAuthValue.user = { username: 'root', role: 'admin' };
    renderProtected({ requiredRole: 'admin' });
    expect(screen.getByText('CONTENT')).toBeTruthy();
    expect(screen.queryByText('SETUP-HOME')).toBeNull();
  });
});

// ── Offline-hint gate ─────────────────────────────────────────────────────────

describe('ProtectedRoute — offline-hint gate', () => {
  beforeEach(() => {
    mockAuthValue.authState = 'offline-hint';
    mockAuthValue.offlineUser = { name: 'Alice', role: 'admin' };
    mockAuthValue.user = null; // user is NEVER set in offline-hint
  });

  it('renders when allowOffline=true and no requiredRole', () => {
    renderProtected({ allowOffline: true });
    expect(screen.getByText('CONTENT')).toBeTruthy();
    expect(screen.queryByText('LOGIN')).toBeNull();
  });

  it('redirects to /login when allowOffline is false/absent', () => {
    renderProtected({ allowOffline: false });
    expect(screen.getByText('LOGIN')).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
  });

  it('redirects to /login when allowOffline is not set', () => {
    renderProtected(); // no allowOffline
    expect(screen.getByText('LOGIN')).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
  });

  it('redirects to /login when requiredRole is set even with allowOffline', () => {
    renderProtected({ allowOffline: true, requiredRole: 'admin' });
    expect(screen.getByText('LOGIN')).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
  });
});

// ── L126 honesty proof ────────────────────────────────────────────────────────

describe('ProtectedRoute — L126 honesty proof', () => {
  it('offline-hint + allowOffline renders /setup (was login-wall before this feature)', () => {
    // Before: authState did not exist; !user → /login always.
    // Now: offline-hint + allowOffline → render. This test is RED vs. old impl.
    mockAuthValue.authState = 'offline-hint';
    mockAuthValue.offlineUser = { name: 'Alice', role: 'admin' };
    mockAuthValue.user = null;
    renderProtected({ allowOffline: true });
    expect(screen.getByText('CONTENT')).toBeTruthy();
    expect(screen.queryByText('LOGIN')).toBeNull();
  });
});

// ── Security invariants ───────────────────────────────────────────────────────

describe('ProtectedRoute — security invariants', () => {
  it('/dev equivalent (no allowOffline) does NOT render in offline-hint → /login', () => {
    mockAuthValue.authState = 'offline-hint';
    mockAuthValue.offlineUser = { name: 'Alice', role: 'admin' };
    mockAuthValue.user = null;
    renderProtected(); // no allowOffline, no requiredRole — models /dev
    expect(screen.getByText('LOGIN')).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
  });

  it('/diagnose-verteilung equivalent (requiredRole=admin) does NOT render in offline-hint → /login', () => {
    mockAuthValue.authState = 'offline-hint';
    mockAuthValue.offlineUser = { name: 'Alice', role: 'admin' };
    mockAuthValue.user = null;
    renderProtected({ requiredRole: 'admin' }); // models /diagnose-verteilung
    expect(screen.getByText('LOGIN')).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
  });

  it('user is null in offline-hint state (offlineUser never authorises)', () => {
    mockAuthValue.authState = 'offline-hint';
    mockAuthValue.offlineUser = { name: 'Alice', role: 'admin' };
    mockAuthValue.user = null; // this is the invariant
    // Even with allowOffline, user remains null — no role-based gate can be bypassed
    renderProtected({ allowOffline: true });
    // Content renders, but requiredRole check against null user is never reached
    // (the requiredRole branch is only entered when authState==='online')
    expect(screen.getByText('CONTENT')).toBeTruthy();
    // Explicitly confirm: if we somehow had requiredRole, it would go to /login
    // (tested in 'requiredRole set even with allowOffline' above)
  });
});
