// ============================================================
// File:        AuthContext.jsx
// Path:        client/src/contexts/AuthContext.jsx
// Project:     RaceArena
// Created:     2026-06-13
// Description: Auth context — user state, login/logout/setup actions, unauthorized listener
//              MUST be rendered inside <BrowserRouter> (uses useNavigate).
// ============================================================

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as authApi from '../services/authApi.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    const u = await authApi.getMe();
    setUser(u);
    return u;
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  async function login(username, password) {
    await authApi.login(username, password);
    await refresh();
  }

  async function setup(username, password, token) {
    await authApi.setup(username, password, token);
    await refresh();
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      navigate('/login');
    }
  }

  useEffect(() => {
    function onUnauthorized() {
      setUser(null);
      navigate('/login');
    }
    window.addEventListener('racearena:unauthorized', onUnauthorized);
    return () => window.removeEventListener('racearena:unauthorized', onUnauthorized);
  }, [navigate]);

  const value = {
    user,
    loading,
    login,
    logout,
    setup,
    refresh,
    getSetupNeeded: authApi.getSetupNeeded,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
