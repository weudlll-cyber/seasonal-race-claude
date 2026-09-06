// ============================================================
// File:        UserManagementSection.jsx
// Path:        client/src/screens/DevScreen/sections/UserManagementSection.jsx
// Project:     RaceArena
// Description: User Management — Dev-Screen section (Phase C step 4).
//              Admin-only ADVANCED section: list, create, role change, TEAM assignment,
//              password reset, and delete race directors via /api/users.
//              Gating is handled by the SECTIONS tier system in DevScreen.jsx;
//              no inline role check needed here.
// ============================================================

import { useState, useEffect } from 'react';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../../services/usersApi.js';
import s from '../DevScreen.module.css';

const ROLES = ['operator', 'admin'];

// The sentinel the Team select uses for "this is a team that does not exist yet". It is not a team
// name and can never collide with one: a real team name is a non-empty trimmed string, and this is
// the only value the select can hold that the server is never sent.
const NEW_TEAM = '__new__';

/**
 * The teams that exist, derived from the users already listed.
 *
 * THIS IS WHY THE FORM IS A PICKER AND NOT A TEXT BOX. A team is the key a later piece will use to
 * decide whose races you can see, so two spellings of one team split it in a way nothing reports —
 * see server/src/auth/teams.js, which is where that reasoning lives and is not repeated here. The
 * admin picks from what exists; typing a name is the deliberate exception, not the default path.
 *
 * No endpoint of its own: GET /api/users already returns every user, so the live teams are already
 * in hand. A /api/teams route would be a second home for a fact this list already carries.
 */
function teamsOf(users) {
  const byKey = new Map();
  for (const u of users) {
    if (!u.team) continue; // a user awaiting the backfill has none
    const key = u.teamNormalized ?? u.team.toLowerCase();
    if (!byKey.has(key)) byKey.set(key, u.team);
  }
  return [...byKey.values()].sort((a, b) => a.localeCompare(b));
}

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
  const [loadError, setLoadError] = useState(null);
  const [mutationError, setMutationError] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  // Add user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('operator');
  // '' until the user list has loaded and a real team can be preselected; NEW_TEAM when the admin
  // is deliberately founding one.
  const [newTeam, setNewTeam] = useState('');
  const [newTeamName, setNewTeamName] = useState('');

  // Inline password reset — stores the id of the user whose form is open
  const [resetForId, setResetForId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');

  async function loadUsers() {
    try {
      const data = await fetchUsers();
      setUsers(data);
      // Preselect a team that EXISTS, so the ordinary act of adding a colleague to the team you
      // already have takes no typing at all. With no teams yet (a store whose users all predate
      // the backfill) the only honest option is founding one.
      setNewTeam((current) => {
        if (current) return current;
        const teams = teamsOf(data);
        return teams.length ? teams[0] : NEW_TEAM;
      });
      setLoadError(null);
    } catch (e) {
      setLoadError(e.message ?? 'Failed to load users');
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

  // Moving a user between teams that ALREADY EXIST. Founding a team is deliberately not possible
  // from this control — it happens once, on the create form, where the admin is already typing.
  async function handleTeamChange(id, team) {
    if (isBusy) return;
    setMutationError(null);
    setIsBusy(true);
    try {
      await updateUser(id, { team });
      await loadUsers();
    } catch (e) {
      setMutationError(e.message ?? 'Failed to update team');
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
    // `allowNewTeam` is the admin's explicit "yes, this really is a new team". Without it the
    // server refuses a team it does not recognise, which is what stops a typo becoming a second
    // team nobody notices.
    const foundingNewTeam = newTeam === NEW_TEAM;
    const team = foundingNewTeam ? newTeamName : newTeam;

    try {
      await createUser({
        username: newUsername,
        password: newPassword,
        role: newRole,
        team,
        allowNewTeam: foundingNewTeam,
      });
      setNewUsername('');
      setNewPassword('');
      setNewRole('operator');
      setNewTeamName('');
      await loadUsers();
    } catch (e) {
      setMutationError(e.message ?? 'Failed to create user');
    } finally {
      setIsBusy(false);
    }
  }

  const teams = teamsOf(users);

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

        {loadError && (
          <p role="alert" style={{ fontSize: '0.78rem', color: '#e63946', marginBottom: '0.5rem' }}>
            {loadError}
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
                {/* A user with no team predates the backfill (scripts/migrate-teams.mjs). It is
                    SHOWN rather than hidden or silently filled in — an admin who can see it is an
                    admin who can fix it, and nothing here is entitled to guess which team the
                    owner meant. */}
                {user.team ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--color-muted)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.team}
                  </span>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#e0a800', whiteSpace: 'nowrap' }}>
                    no team
                  </span>
                )}
                <select
                  aria-label={`Team for ${user.username}`}
                  className={s.select}
                  value={user.team ?? ''}
                  disabled={isBusy || teams.length === 0}
                  onChange={(e) => handleTeamChange(user.id, e.target.value)}
                  style={{ width: 'auto', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                >
                  {!user.team && <option value="">— no team —</option>}
                  {teams.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
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
            <div className={s.formGroup}>
              <label className={s.label} htmlFor="um-team">
                Team
              </label>
              <select
                id="um-team"
                className={s.select}
                value={newTeam}
                onChange={(e) => setNewTeam(e.target.value)}
                aria-label="New user team"
              >
                {teams.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                <option value={NEW_TEAM}>New team…</option>
              </select>
            </div>
          </div>

          {/* Only shown once the admin has said they are founding a team, so the ordinary path —
              adding somebody to the team that already exists — never offers a box to mistype a
              team name into. */}
          {newTeam === NEW_TEAM && (
            <div className={s.formGroup} style={{ marginTop: '0.75rem' }}>
              <label className={s.label} htmlFor="um-new-team">
                New team name
              </label>
              <input
                id="um-new-team"
                className={s.input}
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                autoComplete="off"
                aria-label="New team name"
              />
            </div>
          )}
          <div className={s.btnRow} style={{ marginTop: '1rem' }}>
            <button
              type="submit"
              className={`${s.btn} ${s.btnPrimary}`}
              disabled={isBusy || !newTeam || (newTeam === NEW_TEAM && !newTeamName.trim())}
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
