// ============================================================
// File:        AuthContext.test.jsx
// Path:        client/src/contexts/AuthContext.test.jsx
// Project:     RaceArena
// Description: Tests for AuthContext — authState machine, offline-hint logic,
//              KEYS.LAST_USER mirror, unauthorized/reconnect behaviour.
//              Security invariant: user stays null in offline-hint (never authorises).
// ============================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';

vi.mock('../services/authApi.js', () => ({
  getMe: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setup: vi.fn(),
  getSetupNeeded: vi.fn(),
}));

vi.mock('../modules/storage/storage.js', () => ({
  storageGet: vi.fn().mockReturnValue(null),
  storageSet: vi.fn().mockReturnValue(true),
  storageRemove: vi.fn(),
  KEYS: {
    LAST_USER: 'racearena:lastUser',
    BRANDING: 'racearena:branding',
    ACTIVE_SESSION: 'racearena:activeSession',
  },
  STORAGE_CHANGE_EVENT: 'racearena:storage-change',
}));

import * as authApi from '../services/authApi.js';
import { storageGet, storageSet, storageRemove, KEYS } from '../modules/storage/storage.js';

function Consumer() {
  const { user, loading, authState, offlineUser, login, logout, refresh } = useAuth();
  if (loading) return <div data-testid="status">loading</div>;
  return (
    <div>
      <span data-testid="status">{user ? user.username : 'no-user'}</span>
      <span data-testid="authState">{authState}</span>
      <span data-testid="offlineUser">{offlineUser ? offlineUser.name : 'no-hint'}</span>
      <button onClick={() => login('bob', 'pass')}>login</button>
      <button onClick={logout}>logout</button>
      <button onClick={refresh}>refresh</button>
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
  vi.clearAllMocks();
  storageGet.mockReturnValue(null); // default: no stored hint
  storageSet.mockReturnValue(true);
  authApi.getMe.mockResolvedValue(null); // default: 401 / no session
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── authState machine ─────────────────────────────────────────────────────────

describe('AuthContext — authState machine', () => {
  it('getMe success → authState online, user set, KEYS.LAST_USER written', async () => {
    authApi.getMe.mockResolvedValue({ username: 'alice', role: 'admin' });
    render(<Wrapper />);
    await screen.findByText('alice');
    expect(screen.getByTestId('authState').textContent).toBe('online');
    expect(storageSet).toHaveBeenCalledWith(KEYS.LAST_USER, { name: 'alice', role: 'admin' });
  });

  it('getMe returns null (401) → authState anonymous, user null, hint removed', async () => {
    authApi.getMe.mockResolvedValue(null);
    render(<Wrapper />);
    await screen.findByText('no-user');
    expect(screen.getByTestId('authState').textContent).toBe('anonymous');
    expect(storageRemove).toHaveBeenCalledWith(KEYS.LAST_USER);
  });

  it('network error (no status) + hint stored → authState offline-hint, user stays null', async () => {
    storageGet.mockReturnValue({ name: 'Alice', role: 'admin' });
    authApi.getMe.mockRejectedValue(new Error('Network error')); // no .status
    render(<Wrapper />);
    await screen.findByText('no-user'); // loading resolved
    expect(screen.getByTestId('authState').textContent).toBe('offline-hint');
    expect(screen.getByTestId('offlineUser').textContent).toBe('Alice');
    // SECURITY INVARIANT: user is null even in offline-hint
    expect(screen.getByTestId('status').textContent).toBe('no-user');
  });

  it('network error (no status) WITHOUT hint → authState anonymous', async () => {
    storageGet.mockReturnValue(null); // no hint
    authApi.getMe.mockRejectedValue(new Error('Network error'));
    render(<Wrapper />);
    await screen.findByText('no-user');
    expect(screen.getByTestId('authState').textContent).toBe('anonymous');
  });

  it('5xx error (has status) → authState anonymous (no offline bypass)', async () => {
    storageGet.mockReturnValue({ name: 'Alice', role: 'admin' }); // hint exists but irrelevant
    const err = new Error('Internal Server Error');
    err.status = 500;
    authApi.getMe.mockRejectedValue(err);
    render(<Wrapper />);
    await screen.findByText('no-user');
    expect(screen.getByTestId('authState').textContent).toBe('anonymous');
  });

  it('resolves loading and shows username after mount', async () => {
    authApi.getMe.mockResolvedValue({ username: 'alice', role: 'admin' });
    render(<Wrapper />);
    expect(screen.getByTestId('status').textContent).toBe('loading');
    await screen.findByText('alice');
  });

  it('loading resolves to no-user when getMe returns null', async () => {
    render(<Wrapper />);
    await screen.findByText('no-user');
  });
});

// ── login action ──────────────────────────────────────────────────────────────

describe('AuthContext — login action', () => {
  it('login() calls authApi.login then refresh, updating user and authState', async () => {
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
    expect(screen.getByTestId('authState').textContent).toBe('online');
  });
});

// ── unauthorized event ────────────────────────────────────────────────────────

describe('AuthContext — racearena:unauthorized event', () => {
  it('clears user, sets anonymous, removes hint', async () => {
    authApi.getMe.mockResolvedValue({ username: 'alice', role: 'admin' });
    render(<Wrapper />);
    await screen.findByText('alice');

    act(() => {
      window.dispatchEvent(new CustomEvent('racearena:unauthorized'));
    });

    await screen.findByText('no-user');
    expect(screen.getByTestId('authState').textContent).toBe('anonymous');
    expect(storageRemove).toHaveBeenCalledWith(KEYS.LAST_USER);
  });
});

// ── reconnect (window online event) ──────────────────────────────────────────

describe('AuthContext — reconnect via window online event', () => {
  it('offline-hint + reconnect success → authState online', async () => {
    storageGet.mockReturnValue({ name: 'Alice', role: 'admin' });
    authApi.getMe
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ username: 'alice', role: 'admin' });

    render(<Wrapper />);
    await screen.findByText('no-user');
    expect(screen.getByTestId('authState').textContent).toBe('offline-hint');

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await screen.findByText('alice');
    expect(screen.getByTestId('authState').textContent).toBe('online');
  });

  it('offline-hint + reconnect 401 → anonymous, hint removed', async () => {
    storageGet.mockReturnValue({ name: 'Alice', role: 'admin' });
    authApi.getMe.mockRejectedValueOnce(new Error('Network error')).mockResolvedValueOnce(null); // 401 on reconnect

    render(<Wrapper />);
    await screen.findByText('no-user');
    expect(screen.getByTestId('authState').textContent).toBe('offline-hint');

    storageRemove.mockClear(); // reset call count after initial render

    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.getByTestId('authState').textContent).toBe('anonymous');
    });
    expect(storageRemove).toHaveBeenCalledWith(KEYS.LAST_USER);
  });
});

// ── Race-condition: hard deauth during in-flight runRefresh ───────────────────
//
// L126: WITHOUT the genRef.current += 1 in logout/onUnauthorized, the delayed
// getMe resolution would commit 'online' and overwrite the deauth — these tests
// are RED against the unfixed code and GREEN with the fix.

describe('AuthContext — hard deauth invalidates in-flight runRefresh', () => {
  it('unauthorized event during in-flight initial refresh → state stays anonymous', async () => {
    // getMe never resolves until we call resolveMe manually
    let resolveMe;
    authApi.getMe.mockReturnValue(
      new Promise((resolve) => {
        resolveMe = resolve;
      })
    );

    render(<Wrapper />);
    // Component is loading — runRefresh/getMe is in-flight (gen=1)
    expect(screen.getByTestId('status').textContent).toBe('loading');

    // Hard deauth fires while getMe is still awaiting
    // onUnauthorized: genRef.current += 1 → 2, sets anonymous
    act(() => {
      window.dispatchEvent(new CustomEvent('racearena:unauthorized'));
    });

    // Now resolve the delayed getMe with a valid user
    // WITHOUT the fix: setUser(alice) would run → 'online' overrides the deauth
    // WITH the fix: gen=1 !== genRef.current=2 → guard blocks, state stays anonymous
    await act(async () => {
      resolveMe({ username: 'alice', role: 'admin' });
    });

    // loading is now false (initial load's finally ran); state must be anonymous
    await screen.findByText('no-user');
    expect(screen.getByTestId('authState').textContent).toBe('anonymous');
    expect(screen.getByTestId('status').textContent).toBe('no-user');
  });

  it('logout during in-flight reconnect refresh → state stays anonymous', async () => {
    // Initial load completes successfully → online
    authApi.getMe.mockResolvedValueOnce({ username: 'alice', role: 'admin' });
    authApi.logout.mockResolvedValue();
    render(<Wrapper />);
    await screen.findByText('alice');
    expect(screen.getByTestId('authState').textContent).toBe('online');

    // Start a refresh (via reconnect) with a delayed getMe (gen=2)
    let resolveMe;
    authApi.getMe.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveMe = resolve;
      })
    );
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    // While that getMe is in-flight, user clicks logout
    // logout finally: genRef.current += 1 → 3, sets anonymous
    await act(async () => {
      screen.getByText('logout').click();
    });

    // State is now anonymous from logout
    await screen.findByText('no-user');
    expect(screen.getByTestId('authState').textContent).toBe('anonymous');

    // Resolve the delayed getMe — without the fix this would commit 'online'
    // With the fix: gen=2 !== genRef.current=3 → guard blocks
    await act(async () => {
      resolveMe({ username: 'alice', role: 'admin' });
    });

    // State must remain anonymous — the stale refresh did not overwrite logout
    expect(screen.getByTestId('authState').textContent).toBe('anonymous');
    expect(screen.getByTestId('status').textContent).toBe('no-user');
  });
});
