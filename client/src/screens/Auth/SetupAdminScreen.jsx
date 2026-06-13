// ============================================================
// File:        SetupAdminScreen.jsx
// Path:        client/src/screens/Auth/SetupAdminScreen.jsx
// Project:     RaceArena
// Created:     2026-06-14
// Description: One-time admin creation page — requires the server bootstrap token
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import styles from './Auth.module.css';

export default function SetupAdminScreen() {
  const { setup, getSetupNeeded } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const needed = await getSetupNeeded();
        if (!cancelled && !needed) navigate('/login', { replace: true });
      } catch {
        // network error — stay on this page
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getSetupNeeded, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);
    try {
      await setup(username.trim(), password, token.trim());
      navigate('/setup', { replace: true });
    } catch (err) {
      setError(err.message || 'Setup failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}>
          Race<span>Arena</span>
        </div>
        <h1 className={styles.title}>Create the first admin</h1>
        <p className={styles.hint}>
          This is a one-time setup. Enter the install bootstrap token (the{' '}
          <code>RA_BOOTSTRAP_TOKEN</code> value set on the server) to create the first administrator
          account.
        </p>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="setup-username">
              Username
            </label>
            <input
              id="setup-username"
              className={styles.input}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className={styles.field} style={{ marginTop: '0.5rem' }}>
            <label className={styles.label} htmlFor="setup-password">
              Password
            </label>
            <input
              id="setup-password"
              className={styles.input}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={styles.field} style={{ marginTop: '0.5rem' }}>
            <label className={styles.label} htmlFor="setup-token">
              Bootstrap token
            </label>
            <input
              id="setup-token"
              className={styles.input}
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
            />
          </div>
          <div className={styles.error} style={{ marginTop: '0.5rem' }}>
            {error}
          </div>
          <button
            className={styles.button}
            type="submit"
            disabled={submitting || !username || !password || !token}
          >
            {submitting ? 'Creating…' : 'Create admin'}
          </button>
        </form>
      </div>
    </div>
  );
}
