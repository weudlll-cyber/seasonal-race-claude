// ============================================================
// File:        usersStore.test.js
// Path:        server/src/auth/usersStore.test.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Unit tests for usersStore — hashing, normalization, CRUD invariants
// ============================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { existsSync, unlinkSync, writeFileSync, statSync, chmodSync } from 'node:fs';

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, chmodSync: vi.fn(actual.chmodSync), statSync: vi.fn(actual.statSync) };
});
import { join } from 'path';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import {
  normalizeUsername,
  hashPassword,
  verifyPassword,
  toSafeUser,
  createUsersStore,
} from './usersStore.js';

function makeTempPath() {
  return join(os.tmpdir(), `users-test-${randomUUID()}.json`);
}

describe('normalizeUsername', () => {
  it('trims and lowercases', () => {
    expect(normalizeUsername('  Alice ')).toBe(normalizeUsername('alice'));
  });

  it('treats NFC-composed and NFD-decomposed accents as equal', () => {
    const nfc = 'José';                    // single NFC codepoint
    const nfd = 'José'.normalize('NFD');   // decomposed: e + U+0301
    expect(normalizeUsername(nfc)).toBe(normalizeUsername(nfd));
  });
});

describe('hashPassword / verifyPassword', () => {
  it('hashes to a bcrypt string distinct from plaintext', async () => {
    const hash = await hashPassword('secret');
    expect(hash).not.toBe('secret');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifyPassword returns true for correct password', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('correct', hash)).toBe(true);
  });

  it('verifyPassword returns false for wrong password', async () => {
    const hash = await hashPassword('correct');
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('verifyPassword returns false for a malformed hash without throwing', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false);
  });

  it('rejects empty password with INVALID_PASSWORD', async () => {
    await expect(hashPassword('')).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });

  it('rejects whitespace-only password with INVALID_PASSWORD', async () => {
    await expect(hashPassword('   ')).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });
});

describe('toSafeUser', () => {
  it('strips passwordHash and returns all other fields', () => {
    const full = {
      id: '1',
      username: 'Alice',
      usernameNormalized: 'alice',
      passwordHash: '$2b$12$abc',
      role: 'admin',
      createdAt: '2026-06-13T00:00:00.000Z',
      createdBy: 'setup',
    };
    const safe = toSafeUser(full);
    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe).toMatchObject({
      id: '1',
      username: 'Alice',
      usernameNormalized: 'alice',
      role: 'admin',
      createdAt: '2026-06-13T00:00:00.000Z',
      createdBy: 'setup',
    });
  });

  it('strips sessionEpoch (internal field must not leak to clients)', () => {
    const full = {
      id: '2',
      username: 'Bob',
      usernameNormalized: 'bob',
      passwordHash: '$2b$12$xyz',
      sessionEpoch: 3,
      role: 'operator',
      createdAt: '2026-06-14T00:00:00.000Z',
      createdBy: 'api',
    };
    const safe = toSafeUser(full);
    expect(safe).not.toHaveProperty('sessionEpoch');
    expect(safe).not.toHaveProperty('passwordHash');
    expect(safe).toMatchObject({ id: '2', username: 'Bob', role: 'operator' });
  });

  it('strips sessionEpoch even when it is 0 (falsy)', () => {
    const full = { id: '3', username: 'Carol', usernameNormalized: 'carol', passwordHash: 'h', sessionEpoch: 0, role: 'admin', createdAt: '', createdBy: '' };
    expect(toSafeUser(full)).not.toHaveProperty('sessionEpoch');
  });
});

describe('createUsersStore', () => {
  let store;
  let tempPath;

  beforeEach(() => {
    tempPath = makeTempPath();
    store = createUsersStore(tempPath);
  });

  afterEach(() => {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    vi.restoreAllMocks();
  });

  it('readUsers returns [] and countUsers returns 0 when file is missing', () => {
    expect(store.readUsers()).toEqual([]);
    expect(store.countUsers()).toBe(0);
  });

  it('createUser persists and readUsers reflects the new record', async () => {
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'Alice', password: 'pass1', role: 'admin' });
    expect(store.countUsers()).toBe(1);
    const users = store.readUsers();
    expect(users[0].username).toBe('Alice');
    expect(users[0].usernameNormalized).toBe('alice');
  });

  it('createUser returned object has required fields and no passwordHash', async () => {
    const user = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: ' Bob ', password: 'pw', role: 'operator', createdBy: 'test' });
    expect(user).toHaveProperty('id');
    expect(user.username).toBe('Bob');              // trimmed display form
    expect(user.usernameNormalized).toBe('bob');
    expect(user.role).toBe('operator');
    expect(user.createdAt).toBeTruthy();
    expect(user.createdBy).toBe('test');
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('createUser defaults createdBy to "setup" when omitted', async () => {
    const user = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'carol', password: 'pw', role: 'operator' });
    expect(user.createdBy).toBe('setup');
  });

  it('findAuthRecordByUsername matches regardless of case and surrounding whitespace', async () => {
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'Alice', password: 'pass', role: 'admin' });
    expect(store.findAuthRecordByUsername('ALICE')).not.toBeNull();
    expect(store.findAuthRecordByUsername('  alice  ')).not.toBeNull();
  });

  it('findAuthRecordByUsername returns null for absent username', () => {
    expect(store.findAuthRecordByUsername('nobody')).toBeNull();
  });

  it('findAuthRecordByUsername returns the full record including passwordHash', async () => {
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'Dave', password: 'pw', role: 'operator' });
    const found = store.findAuthRecordByUsername('dave');
    expect(found).toHaveProperty('passwordHash');
  });

  it('findAuthRecordById returns full record (incl. passwordHash) for existing id', async () => {
    const safeUser = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'Eve', password: 'pw', role: 'operator' });
    const found = store.findAuthRecordById(safeUser.id);
    expect(found).not.toBeNull();
    expect(found.id).toBe(safeUser.id);
    expect(found.username).toBe('Eve');
    expect(found).toHaveProperty('passwordHash');
  });

  it('findAuthRecordById returns null for unknown id', () => {
    expect(store.findAuthRecordById('00000000-0000-0000-0000-000000000000')).toBeNull();
  });

  it('rejects duplicate normalized username with USERNAME_TAKEN and does not write', async () => {
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'Alice', password: 'pw1', role: 'admin' });
    await expect(
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: '  alice  ', password: 'pw2', role: 'operator' })
    ).rejects.toMatchObject({ code: 'USERNAME_TAKEN' });
    expect(store.countUsers()).toBe(1);
  });

  it('rejects invalid role with INVALID_ROLE', async () => {
    await expect(
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'eve', password: 'pw', role: 'superuser' })
    ).rejects.toMatchObject({ code: 'INVALID_ROLE' });
  });

  it('rejects empty username with INVALID_USERNAME', async () => {
    await expect(
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: '   ', password: 'pw', role: 'operator' })
    ).rejects.toMatchObject({ code: 'INVALID_USERNAME' });
  });

  it('rejects empty password with INVALID_PASSWORD', async () => {
    await expect(
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'frank', password: '', role: 'operator' })
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });

  it('rejects whitespace-only password with INVALID_PASSWORD', async () => {
    await expect(
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'grace', password: '   ', role: 'operator' })
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });

  it('persisted hash is a valid bcrypt hash that verifies the original password (SF3)', async () => {
    const plaintext = 'mypassword123';
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'hashtest', password: plaintext, role: 'operator' });
    const record = store.findAuthRecordByUsername('hashtest');
    expect(record.passwordHash).toMatch(/^\$2/);
    expect(record.passwordHash).not.toBe(plaintext);
    expect(await verifyPassword(plaintext, record.passwordHash)).toBe(true);
  });

  it('readUsers throws USERS_STORE_CORRUPT for a JSON object (not array) (SF2)', () => {
    writeFileSync(tempPath, '{"not":"an array"}', 'utf8');
    expect(() => store.readUsers()).toThrow(expect.objectContaining({ code: 'USERS_STORE_CORRUPT' }));
  });

  it('readUsers throws USERS_STORE_CORRUPT for invalid JSON (SF2)', () => {
    writeFileSync(tempPath, 'not valid json!!!', 'utf8');
    expect(() => store.readUsers()).toThrow(expect.objectContaining({ code: 'USERS_STORE_CORRUPT' }));
  });

  it('createUser writes credential file with mode 0o600 (SF1, POSIX only)', async () => {
    if (process.platform === 'win32') return;
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'permtest', password: 'pw', role: 'operator' });
    expect(statSync(tempPath).mode & 0o777).toBe(0o600);
  });

  it('throws USERS_STORE_PERM when chmod fails and file is left insecure (POSIX only)', async () => {
    if (process.platform === 'win32') return;
    chmodSync.mockImplementationOnce(() => { throw new Error('EPERM'); });
    statSync.mockReturnValueOnce({ mode: 0o644 });
    await expect(
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'permfail', password: 'pw', role: 'operator' })
    ).rejects.toMatchObject({ code: 'USERS_STORE_PERM' });
  });

  it('does not throw when chmod fails but file is already 0o600 (POSIX only)', async () => {
    if (process.platform === 'win32') return;
    chmodSync.mockImplementationOnce(() => { throw new Error('EPERM'); });
    statSync.mockReturnValueOnce({ mode: 0o600 });
    const user = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'permsafe', password: 'pw', role: 'operator' });
    expect(user).not.toHaveProperty('passwordHash');
  });
});

describe('createUser — concurrency serialization (C2)', () => {
  let store;
  let tempPath;

  beforeEach(() => {
    tempPath = makeTempPath();
    store = createUsersStore(tempPath);
  });

  afterEach(() => {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    vi.restoreAllMocks();
  });

  it('T1: two concurrent createUser with different usernames — both are persisted', async () => {
    await Promise.all([
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'userA', password: 'passA-123', role: 'operator' }),
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'userB', password: 'passB-456', role: 'operator' }),
    ]);
    expect(store.countUsers()).toBe(2);
    expect(store.findAuthRecordByUsername('usera')).not.toBeNull();
    expect(store.findAuthRecordByUsername('userb')).not.toBeNull();
  });

  it('T2: two concurrent createUser with the same username — exactly one succeeds, one rejects with USERNAME_TAKEN', async () => {
    const results = await Promise.allSettled([
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'dupuser', password: 'pass1-xxx', role: 'operator' }),
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'dupuser', password: 'pass2-xxx', role: 'admin' }),
    ]);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: 'USERNAME_TAKEN' });
    expect(store.countUsers()).toBe(1);
  });

  // T3 guards the lock's reject-handler path: a rejected enqueue() must release
  // the lock so subsequent calls are not deadlocked. Concurrency/TOCTOU is
  // covered by the allSettled-based T1/T2 tests above.
  it('T3: rejected createUser releases the lock — subsequent calls are not deadlocked', async () => {
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'existing', password: 'pass-xyz', role: 'operator' });
    // Cause USERNAME_TAKEN
    await expect(
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'existing', password: 'other-pw', role: 'operator' })
    ).rejects.toMatchObject({ code: 'USERNAME_TAKEN' });
    // Cause INVALID_ROLE
    await expect(
      store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'newuser', password: 'pw', role: 'superuser' })
    ).rejects.toMatchObject({ code: 'INVALID_ROLE' });
    // Next valid call must succeed — no deadlock
    const user = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'fresh', password: 'fresh-pass', role: 'admin' });
    expect(user).toMatchObject({ username: 'fresh', role: 'admin' });
    expect(store.countUsers()).toBe(2);
  });
});

// ── deleteUser ────────────────────────────────────────────────────────────────

describe('deleteUser', () => {
  let store;
  let tempPath;

  beforeEach(() => {
    tempPath = makeTempPath();
    store = createUsersStore(tempPath);
  });

  afterEach(() => {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    vi.restoreAllMocks();
  });

  it('removes the user; subsequent findAuthRecordById returns null', async () => {
    const created = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'todel', password: 'pw', role: 'operator', createdBy: 'test' });
    // Need a second admin so the delete is allowed
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'admin2', password: 'pw2', role: 'admin', createdBy: 'test' });
    // Create another admin so we can delete the first one
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'admin1', password: 'pw1', role: 'admin', createdBy: 'test' });
    await store.deleteUser(created.id);
    expect(store.findAuthRecordById(created.id)).toBeNull();
    expect(store.countUsers()).toBe(2);
  });

  it('returns the safe user record of the deleted entry (no passwordHash)', async () => {
    const a1 = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'da1', password: 'pw', role: 'admin', createdBy: 'test' });
    const a2 = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'da2', password: 'pw', role: 'admin', createdBy: 'test' });
    const result = await store.deleteUser(a2.id);
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.id).toBe(a2.id);
  });

  it('rejects unknown id with NOT_FOUND', async () => {
    await expect(
      store.deleteUser('00000000-0000-0000-0000-000000000000')
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects deleting the only admin with LAST_ADMIN', async () => {
    const admin = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'soleadmin', password: 'pw', role: 'admin', createdBy: 'test' });
    await expect(store.deleteUser(admin.id)).rejects.toMatchObject({ code: 'LAST_ADMIN' });
    expect(store.countUsers()).toBe(1);  // admin still in store
  });

  it('allows deleting an admin when ≥2 admins exist', async () => {
    const a1 = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'adel1', password: 'pw', role: 'admin', createdBy: 'test' });
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'adel2', password: 'pw', role: 'admin', createdBy: 'test' });
    await expect(store.deleteUser(a1.id)).resolves.not.toThrow();
    expect(store.findAuthRecordById(a1.id)).toBeNull();
    expect(store.countUsers()).toBe(1);
  });
});

// ── updateUser ────────────────────────────────────────────────────────────────

describe('updateUser', () => {
  let store;
  let tempPath;

  beforeEach(() => {
    tempPath = makeTempPath();
    store = createUsersStore(tempPath);
  });

  afterEach(() => {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    vi.restoreAllMocks();
  });

  it('role change is persisted and returned without passwordHash', async () => {
    const op = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'uprole', password: 'pw', role: 'operator', createdBy: 'test' });
    const result = await store.updateUser(op.id, { role: 'admin' });
    expect(result.role).toBe('admin');
    expect(result).not.toHaveProperty('passwordHash');
    expect(store.findAuthRecordById(op.id).role).toBe('admin');
  });

  it('rejects demoting the only admin with LAST_ADMIN', async () => {
    const admin = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'soleadm', password: 'pw', role: 'admin', createdBy: 'test' });
    await expect(
      store.updateUser(admin.id, { role: 'operator' })
    ).rejects.toMatchObject({ code: 'LAST_ADMIN' });
    expect(store.findAuthRecordById(admin.id).role).toBe('admin');  // unchanged
  });

  it('allows demoting an admin when ≥2 admins exist', async () => {
    const a1 = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'demote1', password: 'pw', role: 'admin', createdBy: 'test' });
    await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'demote2', password: 'pw', role: 'admin', createdBy: 'test' });
    const result = await store.updateUser(a1.id, { role: 'operator' });
    expect(result.role).toBe('operator');
  });

  it('rejects invalid role with INVALID_ROLE', async () => {
    const op = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'badrole', password: 'pw', role: 'operator', createdBy: 'test' });
    await expect(
      store.updateUser(op.id, { role: 'superuser' })
    ).rejects.toMatchObject({ code: 'INVALID_ROLE' });
  });

  it('password reset: new hash verifies new password; old hash not re-used', async () => {
    const user = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'resetpw', password: 'oldpass', role: 'operator', createdBy: 'test' });
    const oldRecord = store.findAuthRecordById(user.id);
    const oldHash = oldRecord.passwordHash;

    await store.updateUser(user.id, { password: 'newpass-secure' });

    const newRecord = store.findAuthRecordById(user.id);
    expect(newRecord.passwordHash).not.toBe(oldHash);
    expect(await verifyPassword('newpass-secure', newRecord.passwordHash)).toBe(true);
  });

  it('password reset bumps sessionEpoch on the record', async () => {
    const user = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'epochtest', password: 'pw', role: 'operator', createdBy: 'test' });
    const epochBefore = store.findAuthRecordById(user.id).sessionEpoch ?? 0;
    await store.updateUser(user.id, { password: 'newpassword-x' });
    const epochAfter = store.findAuthRecordById(user.id).sessionEpoch ?? 0;
    expect(epochAfter).toBe(epochBefore + 1);
  });

  it('password reset returns safe user without passwordHash', async () => {
    const user = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'safereset', password: 'pw', role: 'operator', createdBy: 'test' });
    const result = await store.updateUser(user.id, { password: 'newpassword-y' });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rejects unknown id with NOT_FOUND', async () => {
    await expect(
      store.updateUser('00000000-0000-0000-0000-000000000000', { role: 'operator' })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('rejects empty update (no role, no password) with EMPTY_UPDATE', async () => {
    const user = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'emptyup', password: 'pw', role: 'operator', createdBy: 'test' });
    await expect(store.updateUser(user.id, {})).rejects.toMatchObject({ code: 'EMPTY_UPDATE' });
  });

  // T3b mirrors T3: guards the lock's reject-handler path for updateUser.
  // Ensures a rejected enqueue() releases the lock (no deadlock after failure).
  // Concurrency/TOCTOU is covered by the allSettled-based tests in the
  // "updateUser + deleteUser — concurrency" suite below.
  it('T3b: rejected updateUser releases the lock — subsequent calls are not deadlocked', async () => {
    const admin = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'noblk', password: 'pw', role: 'admin', createdBy: 'test' });
    // Fail: LAST_ADMIN
    await expect(store.updateUser(admin.id, { role: 'operator' })).rejects.toMatchObject({ code: 'LAST_ADMIN' });
    // Fail: NOT_FOUND
    await expect(store.updateUser('no-such-id', { role: 'operator' })).rejects.toMatchObject({ code: 'NOT_FOUND' });
    // Succeed: role is still admin, so promoting again is fine; use password reset
    const result = await store.updateUser(admin.id, { password: 'newpw-safe' });
    expect(result).toMatchObject({ username: 'noblk' });
  });
});

// ── updateUser + deleteUser — concurrency / TOCTOU (C3b) ─────────────────────

describe('updateUser + deleteUser — concurrency: TOCTOU last-admin protection', () => {
  let store;
  let tempPath;

  beforeEach(() => {
    tempPath = makeTempPath();
    store = createUsersStore(tempPath);
  });

  afterEach(() => {
    if (existsSync(tempPath)) unlinkSync(tempPath);
    vi.restoreAllMocks();
  });

  it('two concurrent role-demotions of two admins: exactly one allowed, ≥1 admin remains', async () => {
    const a1 = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'toctou1', password: 'pw', role: 'admin', createdBy: 'test' });
    const a2 = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'toctou2', password: 'pw', role: 'admin', createdBy: 'test' });

    const results = await Promise.allSettled([
      store.updateUser(a1.id, { role: 'operator' }),
      store.updateUser(a2.id, { role: 'operator' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: 'LAST_ADMIN' });

    const adminsRemaining = store.readUsers().filter((u) => u.role === 'admin');
    expect(adminsRemaining.length).toBeGreaterThanOrEqual(1);
  });

  it('two concurrent deletes of two admins: exactly one allowed, ≥1 admin remains', async () => {
    const a1 = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'dtoctou1', password: 'pw', role: 'admin', createdBy: 'test' });
    const a2 = await store.createUser({ team: 'Seasonal Entertainment', allowNewTeam: true, username: 'dtoctou2', password: 'pw', role: 'admin', createdBy: 'test' });

    const results = await Promise.allSettled([
      store.deleteUser(a1.id),
      store.deleteUser(a2.id),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toMatchObject({ code: 'LAST_ADMIN' });

    const adminsRemaining = store.readUsers().filter((u) => u.role === 'admin');
    expect(adminsRemaining.length).toBeGreaterThanOrEqual(1);
  });
});
