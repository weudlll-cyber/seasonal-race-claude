// ============================================================
// File:        UserManagementSection.test.jsx
// Path:        client/src/screens/DevScreen/sections/UserManagementSection.test.jsx
// Project:     RaceArena
// Description: Unit tests for UserManagementSection (Phase C step 4).
//              Covers: list rendering, create user, role change, password reset,
//              delete, and — critically — error surfacing (server errors must be
//              visible in the UI, not silently discarded).
// ============================================================

import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock('../../../services/usersApi.js', () => ({
  fetchUsers: vi.fn(),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}));

import UserManagementSection from './UserManagementSection.jsx';
import { fetchUsers, createUser, updateUser, deleteUser } from '../../../services/usersApi.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Both fixtures carry a team, because every user the server can return does (TEAMS-1). The Team
// select is populated FROM this list, so a fixture without one would leave the form with nothing
// to pick and would be testing a state the product cannot reach.
const TEST_TEAM = 'Seasonal Entertainment';

const ADMIN_USER = {
  id: 'admin-id',
  username: 'testadmin',
  role: 'admin',
  team: TEST_TEAM,
  teamNormalized: 'seasonal entertainment',
  createdAt: '2026-06-14T00:00:00.000Z',
  createdBy: 'setup',
};

const OP_USER = {
  id: 'op-id',
  username: 'alice',
  role: 'operator',
  team: TEST_TEAM,
  teamNormalized: 'seasonal entertainment',
  createdAt: '2026-06-14T00:00:00.000Z',
  createdBy: 'admin',
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  fetchUsers.mockResolvedValue([ADMIN_USER, OP_USER]);
});

// ── List rendering ────────────────────────────────────────────────────────────

describe('UserManagementSection — list rendering', () => {
  it('renders username and role for each user', async () => {
    await act(async () => {
      render(<UserManagementSection />);
    });
    expect(screen.getByText('testadmin')).toBeDefined();
    expect(screen.getByText('alice')).toBeDefined();
  });

  it('does not render passwordHash or sessionEpoch even if present in mock data', async () => {
    fetchUsers.mockResolvedValue([
      { ...ADMIN_USER, passwordHash: '$2b$12$secret', sessionEpoch: 3 },
    ]);
    await act(async () => {
      render(<UserManagementSection />);
    });
    expect(screen.queryByText('$2b$12$secret')).toBeNull();
    expect(screen.queryByText('sessionEpoch')).toBeNull();
    expect(screen.queryByText('3')).toBeNull();
  });

  it('shows a role badge for each user', async () => {
    await act(async () => {
      render(<UserManagementSection />);
    });
    // admin and operator badges rendered via RoleBadge
    expect(screen.getAllByText('admin').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('operator').length).toBeGreaterThanOrEqual(1);
  });
});

// ── Create user ───────────────────────────────────────────────────────────────

describe('UserManagementSection — create user', () => {
  it('calls createUser with form values and refreshes the list', async () => {
    createUser.mockResolvedValue({
      id: 'new-id',
      username: 'bob',
      role: 'operator',
      createdAt: '',
      createdBy: '',
    });

    await act(async () => {
      render(<UserManagementSection />);
    });

    fireEvent.change(document.getElementById('um-username'), { target: { value: 'bob' } });
    fireEvent.change(document.getElementById('um-password'), {
      target: { value: 'bob-pass-123' },
    });
    // role defaults to 'operator'

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add User/i }));
    });

    // The team is NOT typed: it was preselected from the team the listed users are already in,
    // which is the ordinary path — adding a colleague to the team you have.
    expect(createUser).toHaveBeenCalledWith({
      username: 'bob',
      password: 'bob-pass-123',
      role: 'operator',
      team: TEST_TEAM,
      allowNewTeam: false,
    });
    // fetchUsers called on mount + after create
    expect(fetchUsers).toHaveBeenCalledTimes(2);
  });
});

// ── Role change ───────────────────────────────────────────────────────────────

describe('UserManagementSection — role change', () => {
  it('calls updateUser with new role when the role select changes', async () => {
    updateUser.mockResolvedValue({ ...OP_USER, role: 'admin' });
    fetchUsers.mockResolvedValue([OP_USER]);

    await act(async () => {
      render(<UserManagementSection />);
    });

    const roleSelect = screen.getByRole('combobox', { name: /role for alice/i });
    await act(async () => {
      fireEvent.change(roleSelect, { target: { value: 'admin' } });
    });

    expect(updateUser).toHaveBeenCalledWith('op-id', { role: 'admin' });
  });
});

// ── Password reset ────────────────────────────────────────────────────────────

describe('UserManagementSection — password reset', () => {
  it('calls updateUser with new password when reset form submitted', async () => {
    updateUser.mockResolvedValue(ADMIN_USER);
    fetchUsers.mockResolvedValue([ADMIN_USER]);

    await act(async () => {
      render(<UserManagementSection />);
    });

    // Open reset form for testadmin
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /reset password for testadmin/i }));
    });

    // Fill in new password (type="password" — find by aria-label)
    fireEvent.change(screen.getByLabelText(/new password for testadmin/i), {
      target: { value: 'new-pass-456' },
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /confirm password reset for testadmin/i })
      );
    });

    expect(updateUser).toHaveBeenCalledWith('admin-id', { password: 'new-pass-456' });
  });

  it('hides reset form after successful password reset', async () => {
    updateUser.mockResolvedValue(ADMIN_USER);
    fetchUsers.mockResolvedValue([ADMIN_USER]);

    await act(async () => {
      render(<UserManagementSection />);
    });

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: /reset password for testadmin/i }));
    });
    expect(screen.getByLabelText(/new password for testadmin/i)).toBeDefined();

    fireEvent.change(screen.getByLabelText(/new password for testadmin/i), {
      target: { value: 'new-pass-456' },
    });

    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: /confirm password reset for testadmin/i })
      );
    });

    expect(screen.queryByLabelText(/new password for testadmin/i)).toBeNull();
  });
});

// ── Delete ────────────────────────────────────────────────────────────────────

describe('UserManagementSection — delete user', () => {
  it('calls deleteUser after confirm and refreshes list', async () => {
    deleteUser.mockResolvedValue(OP_USER);

    await act(async () => {
      render(<UserManagementSection />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete alice/i }));
    });

    expect(deleteUser).toHaveBeenCalledWith('op-id');
    // fetchUsers called on mount + after delete
    expect(fetchUsers).toHaveBeenCalledTimes(2);
  });

  it('does NOT call deleteUser when user cancels the confirm dialog', async () => {
    window.confirm.mockReturnValue(false);

    await act(async () => {
      render(<UserManagementSection />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete alice/i }));
    });

    expect(deleteUser).not.toHaveBeenCalled();
  });
});

// ── Error surfacing ───────────────────────────────────────────────────────────
// These tests verify Invariant 4: server errors must be shown in the UI.
// The honesty proof runs this describe block with a silenced catch to confirm RED.

describe('UserManagementSection — error surfacing', () => {
  it('shows 409 "Cannot delete the last admin" message visibly in the UI', async () => {
    const err = Object.assign(new Error('Cannot delete the last admin'), { status: 409 });
    deleteUser.mockRejectedValue(err);
    fetchUsers.mockResolvedValue([ADMIN_USER]);

    await act(async () => {
      render(<UserManagementSection />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /delete testadmin/i }));
    });

    const alerts = screen.getAllByRole('alert');
    const errorAlert = alerts.find((el) => el.textContent.includes('Cannot delete the last admin'));
    expect(errorAlert).toBeDefined();
  });

  it('shows 409 "username already taken" message when createUser rejects', async () => {
    fetchUsers.mockResolvedValue([ADMIN_USER]);
    const err = Object.assign(new Error('username already taken'), { status: 409 });
    createUser.mockRejectedValue(err);

    await act(async () => {
      render(<UserManagementSection />);
    });

    fireEvent.change(document.getElementById('um-username'), {
      target: { value: 'testadmin' },
    });
    fireEvent.change(document.getElementById('um-password'), { target: { value: 'pass-123' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add User/i }));
    });

    const alerts = screen.getAllByRole('alert');
    const errorAlert = alerts.find((el) => el.textContent.includes('username already taken'));
    expect(errorAlert).toBeDefined();
  });

  it('shows role-change error message when updateUser rejects', async () => {
    fetchUsers.mockResolvedValue([ADMIN_USER]);
    const err = Object.assign(new Error('Cannot demote the last admin'), { status: 409 });
    updateUser.mockRejectedValue(err);

    await act(async () => {
      render(<UserManagementSection />);
    });

    const roleSelect = screen.getByRole('combobox', { name: /role for testadmin/i });
    await act(async () => {
      fireEvent.change(roleSelect, { target: { value: 'operator' } });
    });

    const alerts = screen.getAllByRole('alert');
    const errorAlert = alerts.find((el) => el.textContent.includes('Cannot demote the last admin'));
    expect(errorAlert).toBeDefined();
  });
});

// ── The team on the create form (TEAMS-1) ─────────────────────────────────────

describe('UserManagementSection — team assignment', () => {
  it('offers the teams that exist rather than a free-text box', async () => {
    await act(async () => {
      render(<UserManagementSection />);
    });

    const select = document.getElementById('um-team');
    const values = [...select.options].map((o) => o.value);
    expect(values).toContain(TEST_TEAM);
    // Nothing to mistype: the new-team input only appears once "New team…" is chosen.
    expect(document.getElementById('um-new-team')).toBeNull();
  });

  it('will not submit a new team with no name — the create is disabled, not silently defaulted', async () => {
    await act(async () => {
      render(<UserManagementSection />);
    });

    fireEvent.change(document.getElementById('um-username'), { target: { value: 'bob' } });
    fireEvent.change(document.getElementById('um-password'), { target: { value: 'bob-pass-123' } });
    fireEvent.change(document.getElementById('um-team'), { target: { value: '__new__' } });

    expect(screen.getByRole('button', { name: /Add User/i }).disabled).toBe(true);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add User/i }));
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('founding a new team sends allowNewTeam — the deliberate second act', async () => {
    createUser.mockResolvedValue({
      id: 'new-id',
      username: 'bob',
      role: 'operator',
      team: 'Other Team',
    });

    await act(async () => {
      render(<UserManagementSection />);
    });

    fireEvent.change(document.getElementById('um-username'), { target: { value: 'bob' } });
    fireEvent.change(document.getElementById('um-password'), { target: { value: 'bob-pass-123' } });
    fireEvent.change(document.getElementById('um-team'), { target: { value: '__new__' } });
    fireEvent.change(document.getElementById('um-new-team'), { target: { value: 'Other Team' } });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Add User/i }));
    });

    expect(createUser).toHaveBeenCalledWith({
      username: 'bob',
      password: 'bob-pass-123',
      role: 'operator',
      team: 'Other Team',
      allowNewTeam: true,
    });
  });

  it('moving a user to another team calls updateUser with just the team', async () => {
    updateUser.mockResolvedValue({ ...OP_USER, team: TEST_TEAM });

    await act(async () => {
      render(<UserManagementSection />);
    });

    await act(async () => {
      fireEvent.change(screen.getByLabelText('Team for alice'), { target: { value: TEST_TEAM } });
    });

    expect(updateUser).toHaveBeenCalledWith('op-id', { team: TEST_TEAM });
  });

  it('shows a user who has no team as such, rather than inventing one', async () => {
    fetchUsers.mockResolvedValue([
      ADMIN_USER,
      { ...OP_USER, team: undefined, teamNormalized: undefined },
    ]);

    await act(async () => {
      render(<UserManagementSection />);
    });

    expect(screen.getByText('no team')).toBeDefined();
  });
});
