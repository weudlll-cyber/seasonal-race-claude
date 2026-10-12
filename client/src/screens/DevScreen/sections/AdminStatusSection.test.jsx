// ============================================================
// File:        AdminStatusSection.test.jsx
// Path:        client/src/screens/DevScreen/sections/AdminStatusSection.test.jsx
// Project:     RaceArena — AUDIT-1 D2 (the admin status box)
// Description: The read-only status box: for an admin it shows the four lines from the server; for
//              an operator it renders nothing and never asks; an unknown release and backups the app
//              cannot see are shown as exactly that; a failed read says so. Its placement and info
//              text are held by the chapter guard (devScreenChapters.guard.test.jsx).
// ============================================================

import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../contexts/AuthContext.jsx', () => ({ useAuth: vi.fn() }));
vi.mock('../../../services/adminStatusApi.js', () => ({ fetchAdminStatus: vi.fn() }));

import { useAuth } from '../../../contexts/AuthContext.jsx';
import { fetchAdminStatus } from '../../../services/adminStatusApi.js';
import AdminStatusSection from './AdminStatusSection.jsx';

const HEALTHY = {
  build: { commit: 'abc1234', branch: 'v1.2', dirty: false },
  backup: { newest: '2026-10-09T03:00:00.000Z', visible: true },
  status: {
    ok: true,
    checks: [
      { name: 'disk', ok: true, detail: 'enough' },
      { name: 'writable', ok: true, detail: 'yes' },
      { name: 'backup', ok: true, detail: 'fresh' },
    ],
  },
  release: {
    newest: 'v1.3',
    current: 'v1.2',
    newer: true,
    checkedAt: '2026-10-09T04:00:00.000Z',
    state: 'ok',
  },
};

const asRole = (role) => useAuth.mockReturnValue({ user: { username: role, role } });
const line = (name) => screen.getByTestId(`admin-status-${name}`).querySelector('td').textContent;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('the admin status box', () => {
  it('renders for an admin with the four lines, read-only', async () => {
    asRole('admin');
    fetchAdminStatus.mockResolvedValue(HEALTHY);
    render(<AdminStatusSection />);
    await waitFor(() => expect(screen.getByTestId('admin-status-build')).toBeTruthy());
    expect(line('build')).toBe('abc1234 on v1.2');
    expect(line('newest-backup')).toBe(new Date(HEALTHY.backup.newest).toLocaleString());
    expect(line('status')).toBe('OK — disk, writable, backup');
    expect(line('newer-release')).toMatch(/^yes — v1\.3 is newer than this build \(v1\.2\)/);
    // read-only: nothing to press, nothing to type
    const box = screen.getByTestId('admin-status-box');
    expect(box.querySelectorAll('button, input, select, textarea')).toHaveLength(0);
    // it carries its control id and an info icon, as every Dev Screen control does
    expect(box.getAttribute('data-control-id')).toBe('AdminStatusSection:admin-status-box');
    expect(box.querySelector('[role="img"]').getAttribute('aria-label')).toMatch(/^Read-only/);
  });

  it('does not render for an operator, and never asks the server', () => {
    asRole('operator');
    const { container } = render(<AdminStatusSection />);
    expect(container.innerHTML).toBe('');
    expect(fetchAdminStatus).not.toHaveBeenCalled();
  });

  it('shows "unknown" and "not visible from the app" exactly as the server reports them', async () => {
    asRole('admin');
    fetchAdminStatus.mockResolvedValue({
      ...HEALTHY,
      build: {
        commit: 'unknown',
        branch: 'unknown',
        reason: 'RA_BUILD_COMMIT and RA_BUILD_BRANCH are unset',
      },
      backup: { newest: null, visible: false },
      status: { ok: true, checks: HEALTHY.status.checks.slice(0, 2) },
      release: { newest: null, current: null, newer: null, checkedAt: 'x', state: 'unknown' },
    });
    render(<AdminStatusSection />);
    await waitFor(() => expect(screen.getByTestId('admin-status-build')).toBeTruthy());
    expect(line('build')).toMatch(/^unknown — RA_BUILD_COMMIT/);
    expect(line('newest-backup')).toBe('not visible from the app');
    expect(line('status')).toBe('OK — disk, writable');
    expect(line('newer-release')).toBe('unknown');
  });

  it('a failed check is FAILED with its reason; a release it cannot compare says so', async () => {
    asRole('admin');
    fetchAdminStatus.mockResolvedValue({
      ...HEALTHY,
      status: {
        ok: false,
        checks: [
          { name: 'disk', ok: false, detail: 'only 3 MB free' },
          { name: 'writable', ok: true, detail: 'yes' },
        ],
      },
      release: { ...HEALTHY.release, current: null, newer: null },
    });
    render(<AdminStatusSection />);
    await waitFor(() => expect(screen.getByTestId('admin-status-status')).toBeTruthy());
    expect(line('status')).toBe('FAILED — disk: only 3 MB free');
    expect(line('newer-release')).toMatch(
      /^newest release is v1\.3; this build's version is not known/
    );
  });

  it('a read that fails says the status could not be read', async () => {
    asRole('admin');
    fetchAdminStatus.mockRejectedValue(new Error('HTTP 500'));
    render(<AdminStatusSection />);
    expect((await screen.findByRole('alert')).textContent).toMatch(/could not be read.*HTTP 500/);
  });
});
