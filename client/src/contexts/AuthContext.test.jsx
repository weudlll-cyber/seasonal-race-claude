// ============================================================
// File:        AuthContext.test.jsx
// Path:        client/src/contexts/AuthContext.test.jsx
// Project:     RaceArena
// Created:     2026-06-13
// Description: Tests for AuthContext — user state, login action, unauthorized event
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';

vi.mock('../services/authApi.js', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setup: vi.fn(),
  getSetupNeeded: vi.fn(),
}));

import * as authApi from '../services/authApi.js';

function Consumer() {
  const { user, loading, login } = useAuth();
  if (loading) return <div data-testid="status">loading</div>;
  return (
    <div>
      <span data-testid="status">{user ? user.username : 'no-user'}</span>
      <button onClick={() => login('bob', 'pass')}>login</button>
    </div>
  );
}

function Wrapper() {
  return (
    <MemoryRouter>
      <AuthProvider>
        <Consumer />
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.resetAllMocks();
  authApi.getMe.mockResolvedValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AuthContext', () => {
  it('resolves loading and shows username after mount with a known user', async () => {
    authApi.getMe.mockResolvedValue({ username: 'alice', role: 'admin' });
    render(<Wrapper />);
    expect(screen.getByTestId('status').textContent).toBe('loading');
    await screen.findByText('alice');
  });

  it('loading resolves to no-user when getMe returns null', async () => {
    authApi.getMe.mockResolvedValue(null);
    render(<Wrapper />);
    await screen.findByText('no-user');
  });

  it('calling login() calls authApi.login then refresh, updating user', async () => {
    // Initial mount: no user. After login: bob.
    authApi.getMe
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ username: 'bob', role: 'operator' });
    authApi.login.mockResolvedValue({ username: 'bob', role: 'operator' });

    render(<Wrapper />);
    await screen.findByText('no-user');

    await act(async () => {
      screen.getByText('login').click();
    });

    await screen.findByText('bob');
    expect(authApi.login).toHaveBeenCalledWith('bob', 'pass');
  });

  it('racearena:unauthorized event clears user', async () => {
    authApi.getMe.mockResolvedValue({ username: 'alice', role: 'admin' });
    render(<Wrapper />);
    await screen.findByText('alice');

    act(() => {
      window.dispatchEvent(new CustomEvent('racearena:unauthorized'));
    });

    await screen.findByText('no-user');
  });
});
