// ============================================================
// File:        SetupAdminScreen.test.jsx
// Path:        client/src/screens/Auth/SetupAdminScreen.test.jsx
// Project:     RaceArena
// Created:     2026-06-14
// Description: Unit tests for SetupAdminScreen
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SetupAdminScreen from './SetupAdminScreen.jsx';

const mockAuthValue = {
  user: null,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
  setup: vi.fn(),
  refresh: vi.fn(),
  getSetupNeeded: vi.fn(),
};

vi.mock('../../contexts/AuthContext.jsx', () => ({
  useAuth: () => mockAuthValue,
}));

function renderSetupAdmin() {
  render(
    <MemoryRouter initialEntries={['/setup-admin']}>
      <Routes>
        <Route path="/setup-admin" element={<SetupAdminScreen />} />
        <Route path="/setup" element={<div data-testid="setup-page" />} />
        <Route path="/login" element={<div data-testid="login-page" />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthValue.setup = vi.fn().mockResolvedValue(undefined);
  mockAuthValue.getSetupNeeded = vi.fn().mockResolvedValue(true);
});

describe('SetupAdminScreen — mount redirect', () => {
  it('redirects to /login when setup is NOT needed (admin already exists)', async () => {
    mockAuthValue.getSetupNeeded = vi.fn().mockResolvedValue(false);
    renderSetupAdmin();
    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeTruthy();
    });
  });

  it('stays on /setup-admin when setup IS needed', async () => {
    mockAuthValue.getSetupNeeded = vi.fn().mockResolvedValue(true);
    renderSetupAdmin();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create the first admin/i })).toBeTruthy();
    });
  });

  it('stays on /setup-admin when getSetupNeeded throws (network error)', async () => {
    mockAuthValue.getSetupNeeded = vi.fn().mockRejectedValue(new Error('net fail'));
    renderSetupAdmin();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /create the first admin/i })).toBeTruthy();
    });
  });
});

describe('SetupAdminScreen — form', () => {
  it('renders username, password, and bootstrap token fields', () => {
    renderSetupAdmin();
    expect(screen.getByLabelText(/username/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByLabelText(/bootstrap token/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /create admin/i })).toBeTruthy();
  });

  it('submit button is disabled when any field is empty', () => {
    renderSetupAdmin();
    const btn = screen.getByRole('button', { name: /create admin/i });
    expect(btn).toBeDisabled();
  });

  it('submit button is enabled when all three fields are filled', async () => {
    renderSetupAdmin();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.change(screen.getByLabelText(/bootstrap token/i), { target: { value: 'TOKEN' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /create admin/i })).not.toBeDisabled();
    });
  });

  it('calls setup(username, password, token) with trimmed username/token and navigates to /setup', async () => {
    renderSetupAdmin();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: '  admin  ' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.change(screen.getByLabelText(/bootstrap token/i), { target: { value: '  TOKEN  ' } });
    fireEvent.click(screen.getByRole('button', { name: /create admin/i }));

    await waitFor(() => {
      expect(mockAuthValue.setup).toHaveBeenCalledWith('admin', 'pass', 'TOKEN');
      expect(screen.getByTestId('setup-page')).toBeTruthy();
    });
  });

  it('shows error message when setup throws and stays on page', async () => {
    mockAuthValue.setup = vi.fn().mockRejectedValue(new Error('invalid token'));
    renderSetupAdmin();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'admin' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.change(screen.getByLabelText(/bootstrap token/i), { target: { value: 'WRONG' } });
    fireEvent.click(screen.getByRole('button', { name: /create admin/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid token/i)).toBeTruthy();
    });
    expect(screen.getByRole('heading', { name: /create the first admin/i })).toBeTruthy();
  });
});
