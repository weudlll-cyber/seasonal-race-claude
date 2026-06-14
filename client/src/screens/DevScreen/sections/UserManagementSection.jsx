// ============================================================
// File:        UserManagementSection.jsx
// Path:        client/src/screens/DevScreen/sections/UserManagementSection.jsx
// Project:     RaceArena
// Description: User Management — Dev-Screen section (Phase C step 4).
//              Admin-only ADVANCED section: list, create, role change,
//              password reset, and delete race directors via /api/users.
//              Gating is handled by the SECTIONS tier system in DevScreen.jsx;
//              no inline role check needed here.
// ============================================================

import { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../../services/usersApi.js';
import s from '../DevScreen.module.css';

const ROLES = ['operator', 'admin'];

function RoleBadge({ role }) {
  const style =
    role === 'admin'
      ? { color: '#e63946', border: '1px solid #e63946', background: 'rgba(230,57,70,0.08)' }
      : { color: 'var(--color-muted)', border: '1px solid #2a2a35' };
  return (
    <span
      style={{
        fontSize: '0.62rem',
        fontWeight: 700,
        padding: '0.1rem 0.4rem',
        borderRadius: 99,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        ...style,
      }}
    >
      {role}
    </span>
  );
}

function UserManagementSection() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  // Add user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('operator');

  // Inline password reset — stores the id of the user whose form is open
  const [resetForId, setResetForId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');

  async function loadUsers() {
    try {
      const data = await fetchUsers();
      setUsers(data);
      setFetchError(null);
    } catch (e) {
      setFetchError(e.message ?? 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  function openResetForm(id) {
    setResetForId(id === resetForId ? null : id);
    setResetPassword('');
    setMutationError(null);
  }

  async function handleRoleChange(id, role) {
    if (isBusy) return;
    setMutationError(null);
    setIsBusy(true);
    try {
      await updateUser(id, { role });
      await loadUsers();
    } catch (e) {
      setMutationError(e.message ?? 'Failed to update role');
    } finally {
      setIsBusy(false);
    }
  }

  async function handlePasswordReset(id) {
    if (isBusy || !resetPassword) return;
    setMutationError(null);
    setIsBusy(true);
    try {
      await updateUser(id, { password: resetPassword });
      setResetForId(null);
      setResetPassword('');
      await loadUsers();
    } catch (e) {
      setMutationError(e.message ?? 'Failed to reset password');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleDelete(id, username) {
    if (isBusy) return;
    if (!window.confirm(`Delete "${username}"? This cannot be undone.`)) return;
    setMutationError(null);
    setIsBusy(true);
    try {
      await deleteUser(id);
      if (resetForId === id) setResetForId(null);
      await loadUsers();
    } catch (e) {
      setMutationError(e.message ?? 'Failed to delete user');
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (isBusy) return;
    setMutationError(null);
    setIsBusy(true);
    try {
      await createUser({ username: newUsername, password: newPassword, role: newRole });
      setNewUsername('');
      setNewPassword('');
      setNewRole('operator');
      await loadUsers();
    } catch (e) {
      setMutationError(e.message ?? 'Failed to create user');
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* ── User list ── */}
      <div className={s.card}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.75rem',
          }}
        >
          <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>
            Race Directors <span className={s.badge}>{users.length}</span>
          </span>
          <button
            className={`${s.btn} ${s.btnGhost}`}
            onClick={loadUsers}
            disabled={isLoading || isBusy}
            style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem' }}
          >
            Refresh
          </button>
        </div>

        {isLoading && users.length === 0 && <p className={s.emptyState}>Loading…</p>}

        {fetchError && (
          <p role="alert" style={{ fontSize: '0.78rem', color: '#e63946', marginBottom: '0.5rem' }}>
            {fetchError}
          </p>
        )}

        {mutationError && (
          <p role="alert" style={{ fontSize: '0.78rem', color: '#e63946', marginBottom: '0.5rem' }}>
            {mutationError}
          </p>
        )}

        <div className={s.rowList}>
          {users.map((user) => (
            <div key={user.id}>
              <div className={s.row}>
                <span style={{ flex: 1, fontWeight: 600, fontSize: '0.85rem' }}>
                  {user.username}
                </span>
                <RoleBadge role={user.role} />
                <select
                  aria-label={`Role for ${user.username}`}
                  className={s.select}
                  value={user.role}
                  disabled={isBusy}
                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                  style={{ width: 'auto', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <button
                  className={`${s.btn} ${s.btnGhost}`}
                  onClick={() => openResetForm(user.id)}
                  disabled={isBusy}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  aria-label={`Reset password for ${user.username}`}
                >
                  Reset Password
                </button>
                <button
                  className={`${s.btn} ${s.btnDanger}`}
                  onClick={() => handleDelete(user.id, user.username)}
                  disabled={isBusy}
                  style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                  aria-label={`Delete ${user.username}`}
                >
                  Delete
                </button>
              </div>

              {resetForId === user.id && (
                <div
                  style={{
                    display: 'flex',
                    gap: '0.5rem',
                    padding: '0.4rem 0.75rem 0.4rem',
                    background: '#0d0d0f',
                    borderRadius: '0 0 6px 6px',
                  }}
                >
                  <input
                    className={s.input}
                    type="password"
                    placeholder="New password"
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    aria-label={`New password for ${user.username}`}
                    style={{ flex: 1 }}
                  />
                  <button
                    className={`${s.btn} ${s.btnPrimary}`}
                    onClick={() => handlePasswordReset(user.id)}
                    disabled={isBusy || !resetPassword}
                    aria-label={`Confirm password reset for ${user.username}`}
                    style={{ fontSize: '0.8rem' }}
                  >
                    Confirm
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Add user form ── */}
      <div className={s.card}>
        <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          Add Race Director
        </div>
        <form onSubmit={handleCreate}>
          <div className={s.formGrid}>
            <div className={s.formGroup}>
              <label className={s.label} htmlFor="um-username">
                Username
              </label>
              <input
                id="um-username"
                className={s.input}
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.label} htmlFor="um-password">
                Password
              </label>
              <input
                id="um-password"
                className={s.input}
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className={s.formGroup}>
              <label className={s.label} htmlFor="um-role">
                Role
              </label>
              <select
                id="um-role"
                className={s.select}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                aria-label="New user role"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className={s.btnRow} style={{ marginTop: '1rem' }}>
            <button
              type="submit"
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={isBusy}
              aria-label="Add user"
            >
              {isBusy ? 'Saving…' : 'Add User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserManagementSection;
