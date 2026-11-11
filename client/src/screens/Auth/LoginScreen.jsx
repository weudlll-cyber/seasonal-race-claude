// ============================================================
// File:        LoginScreen.jsx
// Path:        client/src/screens/Auth/LoginScreen.jsx
// Project:     RaceArena
// Created:     2026-06-14
// Description: Login page — sign in with username/password; the legal footer fixed to the window's
//              bottom edge (LEGAL-PAGES-1, components/LegalFooter). In website mode
//              (WEBSITE-EMBED-1 piece 3a) the website owns the accounts, so the page offers ONE
//              button instead: "Sign in through Seasonal Entertainment", which goes to
//              <base>/auth/website through the website's proxy. Standalone draws the form as before.
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.jsx';
import LegalFooter from '../../components/LegalFooter/LegalFooter.jsx';
import { BASE_PATH, SITE_MODE } from '../../modules/runtimeMarker.js';
import styles from './Auth.module.css';

/** The page: the website's sign-in in website mode, the password form everywhere else. */
export default function LoginScreen() {
  return SITE_MODE === 'website' ? <WebsiteSignIn /> : <PasswordSignIn />;
}

/**
 * Website mode: one button. A full navigation (not a router link): /auth/website is a server route,
 * answered by the website's proxy with the member's identity, and it redirects back into the app.
 */
function WebsiteSignIn() {
  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.logo}>
          Race<span>Arena</span>
        </div>
        <h1 className={styles.title}>Sign in</h1>
        <a className={styles.button} href={`${BASE_PATH}/auth/website`}>
          Sign in through Seasonal Entertainment
        </a>
      </div>
      <LegalFooter />
    </div>
  );
}

function PasswordSignIn() {
  const { login, getSetupNeeded } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const needed = await getSetupNeeded();
        if (!cancelled && needed) navigate('/setup-admin', { replace: true });
      } catch {
        // network error on check — stay on login page
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
      await login(username.trim(), password);
      navigate('/setup', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
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
        <h1 className={styles.title}>Sign in</h1>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-username">
              Username
            </label>
            <input
              id="login-username"
              className={styles.input}
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className={styles.field} style={{ marginTop: '0.5rem' }}>
            <label className={styles.label} htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className={styles.error} style={{ marginTop: '0.5rem' }}>
            {error}
          </div>
          <button
            className={styles.button}
            type="submit"
            disabled={submitting || !username || !password}
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
      {/* LEGAL-PAGES-1: Source code always; the operator's legal pages when filled in. */}
      <LegalFooter />
    </div>
  );
}
