// ============================================================
// File:        AuthContext.jsx
// Path:        client/src/contexts/AuthContext.jsx
// Project:     RaceArena
// Created:     2026-06-13
// Description: Auth context — user state, login/logout/setup actions, unauthorized listener.
//
//              authState ∈ { 'online' | 'offline-hint' | 'anonymous' }
//              'offline-hint' is a pure UI hint — user stays null, never authorizes anything.
//              Only 'online' (real /me success) sets user and authorizes privileged actions.
//              401 is a hard logout: user=null, authState='anonymous', hint cleared.
//
//              MUST be rendered inside <BrowserRouter> (uses useNavigate).
// ============================================================

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../services/authApi.js';
import { storageGet, storageSet, storageRemove, KEYS } from '../modules/storage/storage.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authState, setAuthState] = useState('anonymous');
  const [offlineUser, setOfflineUser] = useState(null);
  const navigate = useNavigate();

  // Generation guard: each runRefresh call captures its own gen snapshot.
  // Only the most-recent run may commit state (prevents races between concurrent calls).
  const genRef = useRef(0);

  const runRefresh = useCallback(async () => {
    genRef.current += 1;
    const gen = genRef.current;
    try {
      const u = await authApi.getMe();
      if (gen !== genRef.current) return null;
      if (u) {
        setUser(u);
        setAuthState('online');
        setOfflineUser(null);
        storageSet(KEYS.LAST_USER, { name: u.username ?? u.name, role: u.role });
      } else {
        // getMe returns null for 401 — hard deauth
        setUser(null);
        setAuthState('anonymous');
        setOfflineUser(null);
        storageRemove(KEYS.LAST_USER);
      }
      return u;
    } catch (e) {
      if (gen !== genRef.current) return null;
      // Only a true network error (no HTTP status) with a stored hint enables offline-hint.
      // 5xx, CORS, or any error with an HTTP status code → anonymous (no offline bypass).
      const hint = storageGet(KEYS.LAST_USER);
      if (!e?.status && hint) {
        setUser(null);
        setAuthState('offline-hint');
        setOfflineUser(hint);
      } else {
        setUser(null);
        setAuthState('anonymous');
        setOfflineUser(null);
      }
      return null;
    }
  }, []);

  // Initial load — setLoading(false) only once, in finally.
  useEffect(() => {
    (async () => {
      try {
        await runRefresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [runRefresh]);

  // Minimal reconnect: re-probe on network recovery.
  // Upgrades offline-hint → online on success; falls to anonymous on 401.
  useEffect(() => {
    function onOnline() {
      runRefresh();
    }
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [runRefresh]);

  async function login(username, password) {
    await authApi.login(username, password);
    await runRefresh();
  }

  async function setup(username, password, token) {
    await authApi.setup(username, password, token);
    await runRefresh();
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setAuthState('anonymous');
      setOfflineUser(null);
      storageRemove(KEYS.LAST_USER);
      navigate('/login');
    }
  }

  // Hard deauth mid-session (401 from any API call outside /me).
  useEffect(() => {
    function onUnauthorized() {
      setUser(null);
      setAuthState('anonymous');
      setOfflineUser(null);
      storageRemove(KEYS.LAST_USER);
      navigate('/login');
    }
    window.addEventListener('racearena:unauthorized', onUnauthorized);
    return () => window.removeEventListener('racearena:unauthorized', onUnauthorized);
  }, [navigate]);

  const value = {
    user,
    loading,
    authState,
    offlineUser,
    login,
    logout,
    setup,
    refresh: runRefresh,
    getSetupNeeded: authApi.getSetupNeeded,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
