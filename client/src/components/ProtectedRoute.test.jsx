// ============================================================
// File:        ProtectedRoute.test.jsx
// Path:        client/src/components/ProtectedRoute.test.jsx
// Project:     RaceArena
// Created:     2026-06-14
// Description: Unit tests for ProtectedRoute — loading state, auth gate, role gate
// ============================================================

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProtectedRoute from './ProtectedRoute.jsx';

const mockAuthValue = {
  user: null,
  loading: false,
};

vi.mock('../contexts/AuthContext.jsx', () => ({
  useAuth: () => mockAuthValue,
}));

function renderProtected({ requiredRole } = {}) {
  render(
    <MemoryRouter initialEntries={['/x']}>
      <Routes>
        <Route
          path="/x"
          element={
            <ProtectedRoute requiredRole={requiredRole}>
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
});

describe('ProtectedRoute — loading state', () => {
  it('shows Loading… and neither CONTENT nor LOGIN while loading', () => {
    mockAuthValue.loading = true;
    mockAuthValue.user = null;
    renderProtected();
    expect(screen.getByText(/loading…/i)).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
    expect(screen.queryByText('LOGIN')).toBeNull();
  });
});

describe('ProtectedRoute — auth gate', () => {
  it('redirects to /login when user is null', () => {
    mockAuthValue.loading = false;
    mockAuthValue.user = null;
    renderProtected();
    expect(screen.getByText('LOGIN')).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
  });

  it('renders children when user is logged in and no requiredRole is set', () => {
    mockAuthValue.loading = false;
    mockAuthValue.user = { username: 'alice', role: 'operator' };
    renderProtected();
    expect(screen.getByText('CONTENT')).toBeTruthy();
    expect(screen.queryByText('LOGIN')).toBeNull();
  });
});

describe('ProtectedRoute — role gate', () => {
  it('redirects operator to /setup when requiredRole is admin', () => {
    mockAuthValue.loading = false;
    mockAuthValue.user = { username: 'alice', role: 'operator' };
    renderProtected({ requiredRole: 'admin' });
    expect(screen.getByText('SETUP-HOME')).toBeTruthy();
    expect(screen.queryByText('CONTENT')).toBeNull();
  });

  it('renders children when user is admin and requiredRole is admin', () => {
    mockAuthValue.loading = false;
    mockAuthValue.user = { username: 'root', role: 'admin' };
    renderProtected({ requiredRole: 'admin' });
    expect(screen.getByText('CONTENT')).toBeTruthy();
    expect(screen.queryByText('SETUP-HOME')).toBeNull();
  });
});
