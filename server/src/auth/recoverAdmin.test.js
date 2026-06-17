// ============================================================
// File:        recoverAdmin.test.js
// Path:        server/src/auth/recoverAdmin.test.js
// Project:     RaceArena
// Description: Tests for recoverAdmin.js — admin-recovery CLI core (§9a).
//              All paths are temp-isolated (no real server/data/).
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, unlinkSync, readFileSync } from 'node:fs';
import { join } from 'path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { createUsersStore, verifyPassword } from './usersStore.js';
import { promoteOrCreate, rearmSetup } from './recoverAdmin.js';
import { SETUP_MARKER_PATH } from './paths.js';
import { DATA_ROOT } from '../dataPaths.js';

// ── Temp-path helpers ─────────────────────────────────────────────────────────

function makePaths() {
  const id = randomUUID();
  return {
    usersPath: join(os.tmpdir(), `recover-test-users-${id}.json`),
    markerPath: join(os.tmpdir(), `recover-test-marker-${id}.json`),
    auditPath: join(os.tmpdir(), `recover-test-audit-${id}.log`),
  };
}

let paths;
let store;

beforeEach(() => {
  paths = makePaths();
  store = createUsersStore(paths.usersPath);
});

afterEach(() => {
  for (const p of Object.values(paths)) {
    try { if (existsSync(p)) unlinkSync(p); } catch {}
  }
});

// ── promoteOrCreate — existing user ──────────────────────────────────────────

describe('promoteOrCreate — existing operator user', () => {
  it('sets role to admin and verifies new password after promote', async () => {
    await store.createUser({
      username: 'alice',
      password: 'old-pass-123',
      role: 'operator',
      createdBy: 'test',
    });

    const { action, user } = await promoteOrCreate('alice', 'new-pass-456', {
      store,
      auditLogPath: paths.auditPath,
    });

    expect(action).toBe('PROMOTE_RESET');
    expect(user.role).toBe('admin');

    // Verify via raw record (toSafeUser strips the hash — read directly)
    const record = store.findAuthRecordByUsername('alice');
    expect(await verifyPassword('new-pass-456', record.passwordHash)).toBe(true);
    expect(await verifyPassword('old-pass-123', record.passwordHash)).toBe(false);
  });

  it('works when the existing user is already admin (idempotent promote + password reset)', async () => {
    await store.createUser({
      username: 'bob',
      password: 'old-pw',
      role: 'admin',
      createdBy: 'test',
    });

    const { action, user } = await promoteOrCreate('bob', 'fresh-pw-789', {
      store,
      auditLogPath: paths.auditPath,
    });

    expect(action).toBe('PROMOTE_RESET');
    expect(user.role).toBe('admin');
    const record = store.findAuthRecordByUsername('bob');
    expect(await verifyPassword('fresh-pw-789', record.passwordHash)).toBe(true);
  });

  it('bumps sessionEpoch on existing user (old sessions invalidated)', async () => {
    await store.createUser({
      username: 'carol',
      password: 'pw1',
      role: 'operator',
      createdBy: 'test',
    });
    const before = store.findAuthRecordByUsername('carol').sessionEpoch ?? 0;

    await promoteOrCreate('carol', 'pw2', { store, auditLogPath: paths.auditPath });

    const after = store.findAuthRecordByUsername('carol').sessionEpoch ?? 0;
    expect(after).toBeGreaterThan(before);
  });
});

// ── promoteOrCreate — non-existing user ──────────────────────────────────────

describe('promoteOrCreate — non-existing user', () => {
  it('creates a new admin user when the username does not exist', async () => {
    const { action, user } = await promoteOrCreate('newadmin', 'create-pw-111', {
      store,
      auditLogPath: paths.auditPath,
    });

    expect(action).toBe('CREATE_ADMIN');
    expect(user.role).toBe('admin');
    expect(user.username).toBe('newadmin');

    const record = store.findAuthRecordByUsername('newadmin');
    expect(record).not.toBeNull();
    expect(await verifyPassword('create-pw-111', record.passwordHash)).toBe(true);
  });
});

// ── rearmSetup ────────────────────────────────────────────────────────────────

describe('rearmSetup — marker present, no users', () => {
  it('removes the marker and reports setupWillWork: true when no users exist', () => {
    writeFileSync(paths.markerPath, JSON.stringify({ completedAt: new Date().toISOString() }));

    const result = rearmSetup({
      markerPath: paths.markerPath,
      store,
      auditLogPath: paths.auditPath,
    });

    expect(existsSync(paths.markerPath)).toBe(false);
    expect(result.outcome).toBe('marker-removed');
    expect(result.setupWillWork).toBe(true);
    expect(result.userCount).toBe(0);
  });
});

describe('rearmSetup — marker present, users exist', () => {
  it('removes the marker but reports setupWillWork: false when users are present', async () => {
    await store.createUser({ username: 'alice', password: 'pw', role: 'admin', createdBy: 'test' });
    writeFileSync(paths.markerPath, JSON.stringify({ completedAt: new Date().toISOString() }));

    const result = rearmSetup({
      markerPath: paths.markerPath,
      store,
      auditLogPath: paths.auditPath,
    });

    expect(existsSync(paths.markerPath)).toBe(false);
    expect(result.outcome).toBe('marker-removed');
    // /setup will refuse — countUsers() > 0 guard
    expect(result.setupWillWork).toBe(false);
    expect(result.userCount).toBe(1);
  });

  it('setupWillWork is false regardless of marker state when users exist', async () => {
    await store.createUser({ username: 'alice', password: 'pw', role: 'admin', createdBy: 'test' });
    // No marker — still setupWillWork must be false
    const result = rearmSetup({
      markerPath: paths.markerPath,
      store,
      auditLogPath: paths.auditPath,
    });
    expect(result.setupWillWork).toBe(false);
  });
});

describe('rearmSetup — marker already absent', () => {
  it('returns marker-already-absent outcome without error', () => {
    const result = rearmSetup({
      markerPath: paths.markerPath,
      store,
      auditLogPath: paths.auditPath,
    });

    expect(result.outcome).toBe('marker-already-absent');
  });

  it('does not write an audit line when there is no state change', () => {
    rearmSetup({
      markerPath: paths.markerPath,
      store,
      auditLogPath: paths.auditPath,
    });
    // No marker → no state change → no audit entry
    expect(existsSync(paths.auditPath)).toBe(false);
  });
});

// ── Audit log ─────────────────────────────────────────────────────────────────

describe('Audit log — promoteOrCreate', () => {
  it('writes an audit line containing action, username, outcome and timestamp', async () => {
    await promoteOrCreate('alice', 'pw', { store, auditLogPath: paths.auditPath });

    expect(existsSync(paths.auditPath)).toBe(true);
    const line = JSON.parse(readFileSync(paths.auditPath, 'utf8').trim());
    expect(line.action).toMatch(/PROMOTE_RESET|CREATE_ADMIN/);
    expect(line.username).toBe('alice');
    expect(line.outcome).toBe('success');
    expect(typeof line.ts).toBe('string');
  });

  it('audit line NEVER contains a password or bcrypt hash', async () => {
    await promoteOrCreate('alice', 'secret-pw-xyz', { store, auditLogPath: paths.auditPath });
    const content = readFileSync(paths.auditPath, 'utf8');
    expect(content).not.toMatch(/\$2[ab]\$/);          // no bcrypt hash
    expect(content).not.toContain('secret-pw-xyz');    // no plaintext password
    expect(content.toLowerCase()).not.toContain('password'); // no password field
  });
});

describe('Audit log — rearmSetup', () => {
  it('writes an audit line when the marker is removed', () => {
    writeFileSync(paths.markerPath, '{}');
    rearmSetup({ markerPath: paths.markerPath, store, auditLogPath: paths.auditPath });

    const line = JSON.parse(readFileSync(paths.auditPath, 'utf8').trim());
    expect(line.action).toBe('REARM_SETUP');
    expect(line.outcome).toBe('marker-removed');
    expect(line.ts).toBeTruthy();
    // No password data
    expect(JSON.stringify(line).toLowerCase()).not.toContain('password');
  });
});

// ── Error cases ───────────────────────────────────────────────────────────────

// ── paths.js regression — marker path is byte-identical after extraction ──────

describe('SETUP_MARKER_PATH (paths.js) — regression', () => {
  it('resolves to join(DATA_ROOT, setup-complete.json)', () => {
    expect(SETUP_MARKER_PATH).toBe(join(DATA_ROOT, 'setup-complete.json'));
    expect(SETUP_MARKER_PATH).toMatch(/setup-complete\.json$/);
  });
});

// ── promoteOrCreate — error cases ────────────────────────────────────────────

describe('promoteOrCreate — error cases', () => {
  it('throws MISSING_USERNAME when username is empty string', async () => {
    await expect(
      promoteOrCreate('', 'pw', { store, auditLogPath: paths.auditPath })
    ).rejects.toMatchObject({ code: 'MISSING_USERNAME' });
  });

  it('throws MISSING_USERNAME when username is whitespace only', async () => {
    await expect(
      promoteOrCreate('   ', 'pw', { store, auditLogPath: paths.auditPath })
    ).rejects.toMatchObject({ code: 'MISSING_USERNAME' });
  });
});
