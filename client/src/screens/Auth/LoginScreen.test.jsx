// ============================================================
// File:        LoginScreen.test.jsx
// Path:        client/src/screens/Auth/LoginScreen.test.jsx
// Project:     RaceArena
// Created:     2026-06-14
// Description: Unit tests for LoginScreen
// ============================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LoginScreen from './LoginScreen.jsx';

// Stub the whole AuthContext module so tests can inject arbitrary values.
// useAuth() reads from this module; the real AuthProvider is not used here.
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

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/setup" element={<div data-testid="setup-page" />} />
        <Route path="/setup-admin" element={<div data-testid="setup-admin-page" />} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAuthValue.login = vi.fn().mockResolvedValue(undefined);
  mockAuthValue.getSetupNeeded = vi.fn().mockResolvedValue(false);
});

describe('LoginScreen — mount redirect', () => {
  it('redirects to /setup-admin when setup is needed', async () => {
    mockAuthValue.getSetupNeeded = vi.fn().mockResolvedValue(true);
    renderLogin();
    await waitFor(() => {
      expect(screen.getByTestId('setup-admin-page')).toBeTruthy();
    });
  });

  it('stays on /login when setup is not needed', async () => {
    mockAuthValue.getSetupNeeded = vi.fn().mockResolvedValue(false);
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeTruthy();
    });
  });

  it('stays on /login when getSetupNeeded throws (network error)', async () => {
    mockAuthValue.getSetupNeeded = vi.fn().mockRejectedValue(new Error('net fail'));
    renderLogin();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /sign in/i })).toBeTruthy();
    });
  });
});

describe('LoginScreen — form', () => {
  it('renders username, password, and submit button', () => {
    renderLogin();
    expect(screen.getByLabelText(/username/i)).toBeTruthy();
    expect(screen.getByLabelText(/password/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeTruthy();
  });

  it('submit button is disabled when fields are empty', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('submit button is enabled when both fields are filled', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
    });
  });

  it('calls login with trimmed username and navigates to /setup on success', async () => {
    renderLogin();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: '  alice  ' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockAuthValue.login).toHaveBeenCalledWith('alice', 'pass');
      expect(screen.getByTestId('setup-page')).toBeTruthy();
    });
  });

  it('shows error message when login throws and stays on page', async () => {
    mockAuthValue.login = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('invalid credentials'), { status: 401 }));
    renderLogin();
    fireEvent.change(screen.getByLabelText(/username/i), { target: { value: 'alice' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeTruthy();
    });
    expect(screen.getByRole('heading', { name: /sign in/i })).toBeTruthy();
  });
});
