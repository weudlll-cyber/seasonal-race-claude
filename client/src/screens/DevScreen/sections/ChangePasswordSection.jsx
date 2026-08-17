// ============================================================
// File:        ChangePasswordSection.jsx
// Path:        client/src/screens/DevScreen/sections/ChangePasswordSection.jsx
// Project:     RaceArena
// Created:     2026-08-19
// Description: SELF-PASSWORD-1 — a logged-in user changes THEIR OWN password.
//
//              WHERE THIS SITS AND WHY: the Dev Screen is the only screen behind a plain
//              ProtectedRoute that an operator can reach and that already carries account
//              affordances — the "Log out" button lives a few lines away in DevScreen.jsx. So the
//              account action goes next to the other account action rather than inventing a
//              settings area, a modal or a navigation concept. It is an `operator` tier section,
//              so it is visible to every logged-in user, which is the whole point.
//
//              The form deliberately reuses Auth.module.css — the same field, label, input, error
//              and button the login and setup screens use — so a user meets the same form in the
//              same shape wherever a password is involved.
// ============================================================

import { useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import styles from '../../Auth/Auth.module.css';

function ChangePasswordSection() {
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  async function handleSubmit(e) {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setDone(false);

    // Confirmation is a typo guard in this form only — the server has no concept of it and no
    // rule was invented for it. The password rule itself is the server's, unchanged.
    if (newPassword !== confirmPassword) {
      setError('The new passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setDone(true);
    } catch (err) {
      // A wrong current password arrives as the login path's own message.
      setError(err.message || 'Password change failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '22rem' }}>
      <p className={styles.hint} style={{ marginTop: 0 }}>
        Changes the password of the account you are signed in as. Your other sessions are signed
        out; this one stays.
      </p>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="cp-current">
          Current password
        </label>
        <input
          id="cp-current"
          className={styles.input}
          type="password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>

      <div className={styles.field} style={{ marginTop: '0.5rem' }}>
        <label className={styles.label} htmlFor="cp-new">
          New password
        </label>
        <input
          id="cp-new"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
      </div>

      <div className={styles.field} style={{ marginTop: '0.5rem' }}>
        <label className={styles.label} htmlFor="cp-confirm">
          Repeat new password
        </label>
        <input
          id="cp-confirm"
          className={styles.input}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      <div className={styles.error} style={{ marginTop: '0.5rem' }} role="status">
        {error}
      </div>
      {done && (
        <div className={styles.hint} role="status">
          Password changed.
        </div>
      )}

      <button
        className={styles.button}
        type="submit"
        disabled={submitting || !currentPassword || !newPassword || !confirmPassword || mismatch}
      >
        {submitting ? 'Changing…' : 'Change password'}
      </button>
    </form>
  );
}

export default ChangePasswordSection;
