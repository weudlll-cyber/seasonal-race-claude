// ============================================================
// File:        usersStore.test.js
// Path:        server/src/auth/usersStore.test.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Unit tests for usersStore — hashing, normalization, CRUD invariants
// ============================================================

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, unlinkSync, writeFileSync, statSync } from 'node:fs';
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
  });

  it('readUsers returns [] and countUsers returns 0 when file is missing', () => {
    expect(store.readUsers()).toEqual([]);
    expect(store.countUsers()).toBe(0);
  });

  it('createUser persists and readUsers reflects the new record', async () => {
    await store.createUser({ username: 'Alice', password: 'pass1', role: 'admin' });
    expect(store.countUsers()).toBe(1);
    const users = store.readUsers();
    expect(users[0].username).toBe('Alice');
    expect(users[0].usernameNormalized).toBe('alice');
  });

  it('createUser returned object has required fields and no passwordHash', async () => {
    const user = await store.createUser({ username: ' Bob ', password: 'pw', role: 'operator', createdBy: 'test' });
    expect(user).toHaveProperty('id');
    expect(user.username).toBe('Bob');              // trimmed display form
    expect(user.usernameNormalized).toBe('bob');
    expect(user.role).toBe('operator');
    expect(user.createdAt).toBeTruthy();
    expect(user.createdBy).toBe('test');
    expect(user).not.toHaveProperty('passwordHash');
  });

  it('createUser defaults createdBy to "setup" when omitted', async () => {
    const user = await store.createUser({ username: 'carol', password: 'pw', role: 'operator' });
    expect(user.createdBy).toBe('setup');
  });

  it('findAuthRecordByUsername matches regardless of case and surrounding whitespace', async () => {
    await store.createUser({ username: 'Alice', password: 'pass', role: 'admin' });
    expect(store.findAuthRecordByUsername('ALICE')).not.toBeNull();
    expect(store.findAuthRecordByUsername('  alice  ')).not.toBeNull();
  });

  it('findAuthRecordByUsername returns null for absent username', () => {
    expect(store.findAuthRecordByUsername('nobody')).toBeNull();
  });

  it('findAuthRecordByUsername returns the full record including passwordHash', async () => {
    await store.createUser({ username: 'Dave', password: 'pw', role: 'operator' });
    const found = store.findAuthRecordByUsername('dave');
    expect(found).toHaveProperty('passwordHash');
  });

  it('rejects duplicate normalized username with USERNAME_TAKEN and does not write', async () => {
    await store.createUser({ username: 'Alice', password: 'pw1', role: 'admin' });
    await expect(
      store.createUser({ username: '  alice  ', password: 'pw2', role: 'operator' })
    ).rejects.toMatchObject({ code: 'USERNAME_TAKEN' });
    expect(store.countUsers()).toBe(1);
  });

  it('rejects invalid role with INVALID_ROLE', async () => {
    await expect(
      store.createUser({ username: 'eve', password: 'pw', role: 'superuser' })
    ).rejects.toMatchObject({ code: 'INVALID_ROLE' });
  });

  it('rejects empty username with INVALID_USERNAME', async () => {
    await expect(
      store.createUser({ username: '   ', password: 'pw', role: 'operator' })
    ).rejects.toMatchObject({ code: 'INVALID_USERNAME' });
  });

  it('rejects empty password with INVALID_PASSWORD', async () => {
    await expect(
      store.createUser({ username: 'frank', password: '', role: 'operator' })
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });

  it('rejects whitespace-only password with INVALID_PASSWORD', async () => {
    await expect(
      store.createUser({ username: 'grace', password: '   ', role: 'operator' })
    ).rejects.toMatchObject({ code: 'INVALID_PASSWORD' });
  });

  it('persisted hash is a valid bcrypt hash that verifies the original password (SF3)', async () => {
    const plaintext = 'mypassword123';
    await store.createUser({ username: 'hashtest', password: plaintext, role: 'operator' });
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
    await store.createUser({ username: 'permtest', password: 'pw', role: 'operator' });
    expect(statSync(tempPath).mode & 0o777).toBe(0o600);
  });
});
