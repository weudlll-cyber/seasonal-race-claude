// ============================================================
// File:        usersStore.js
// Path:        server/src/auth/usersStore.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Users data store — bcrypt hashing, username normalization, CRUD
// ============================================================

import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync, chmodSync, statSync } from 'node:fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { atomicWriteJson } from '../../utils/atomicWriteJson.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_USERS_PATH = process.env.RA_USERS_DB ?? join(__dirname, '../../data/users.json');

const BCRYPT_COST = 12;

// ── Username normalization ────────────────────────────────────────────────────

// NFC is the deliberate canonical form; NFKC was rejected because compatibility folding can merge visually-distinct usernames unexpectedly.
export function normalizeUsername(raw) {
  return String(raw).trim().normalize('NFC').toLowerCase();
}

// ── Password hashing ──────────────────────────────────────────────────────────

export async function hashPassword(plain) {
  if (!plain || !String(plain).trim()) {
    const err = new Error('Password must not be empty');
    err.code = 'INVALID_PASSWORD';
    throw err;
  }
  return bcrypt.hash(plain, BCRYPT_COST);
}

export async function verifyPassword(plain, hash) {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

// ── Safe projection ───────────────────────────────────────────────────────────

export function toSafeUser(user) {
  const { passwordHash: _omit, ...safe } = user;
  return safe;
}

// ── Store factory ─────────────────────────────────────────────────────────────

export function createUsersStore(filePath = DEFAULT_USERS_PATH) {
  function readUsers() {
    if (!existsSync(filePath)) return [];
    const raw = readFileSync(filePath, 'utf8').trim();
    if (!raw) return [];
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const err = new Error('users.json is corrupt or not an array');
      err.code = 'USERS_STORE_CORRUPT';
      throw err;
    }
    if (!Array.isArray(parsed)) {
      const err = new Error('users.json is corrupt or not an array');
      err.code = 'USERS_STORE_CORRUPT';
      throw err;
    }
    return parsed;
  }

  function countUsers() {
    return readUsers().length;
  }

  /** @internal Returns the full auth record INCLUDING passwordHash. Callers that respond
   * to a client MUST pass the result through toSafeUser first. */
  function findAuthRecordByUsername(rawOrNormalized) {
    const normalized = normalizeUsername(rawOrNormalized);
    return readUsers().find((u) => u.usernameNormalized === normalized) ?? null;
  }

  /** @internal Returns the full auth record INCLUDING passwordHash. Callers that respond
   * to a client MUST pass the result through toSafeUser first. */
  function findAuthRecordById(id) {
    return readUsers().find((u) => u.id === id) ?? null;
  }

  // Shared write helper — all three mutating methods use this to apply chmod.
  // POSIX mode bits are a soft no-op on Windows (ACL-based); hardens Linux/Docker deployments.
  function writeUsers(users) {
    atomicWriteJson(filePath, users, { mode: 0o600 });
    try {
      chmodSync(filePath, 0o600);
    } catch {
      // chmod is only load-bearing on the EPERM-overwrite fallback (≈Windows, where mode bits are
      // ACL-based no-ops anyway). On the normal POSIX rename path the file already inherited 0o600
      // from the tmp inode. Only fail loud if the file is ACTUALLY left more permissive than 0o600.
      if (process.platform !== 'win32') {
        const fileMode = statSync(filePath).mode & 0o777;
        if (fileMode & 0o077) {  // any group/other permission bit set
          const err = new Error('users.json could not be secured to 0o600');
          err.code = 'USERS_STORE_PERM';
          throw err;
        }
      }
    }
  }

  // Promise-chain lock: serialises ALL mutating operations (create/update/delete) so concurrent
  // calls cannot interleave, cause lost writes, duplicate usernames, or bypass the last-admin check.
  // The chain always settles to resolved (via the no-op rejection handler) so a failed call never
  // blocks its successors.
  let lockChain = Promise.resolve();

  function enqueue(run) {
    const result = lockChain.then(run);
    lockChain = result.then(
      () => {},
      () => {},
    );
    return result;
  }

  async function createUser({ username, password, role, createdBy }) {
    return enqueue(async function run() {
      if (!username || !String(username).trim()) {
        const err = new Error('Username must not be empty');
        err.code = 'INVALID_USERNAME';
        throw err;
      }
      if (!password || !String(password).trim()) {
        const err = new Error('Password must not be empty');
        err.code = 'INVALID_PASSWORD';
        throw err;
      }
      if (role !== 'operator' && role !== 'admin') {
        const err = new Error('Role must be "operator" or "admin"');
        err.code = 'INVALID_ROLE';
        throw err;
      }

      const usernameNormalized = normalizeUsername(username);
      const users = readUsers();

      if (users.some((u) => u.usernameNormalized === usernameNormalized)) {
        const err = new Error('Username already taken');
        err.code = 'USERNAME_TAKEN';
        throw err;
      }

      const record = {
        id: randomUUID(),
        username: String(username).trim(),  // display form
        usernameNormalized,                 // uniqueness key (NFC + lowercased)
        passwordHash: await hashPassword(password),
        role,
        sessionEpoch: 0,                    // bumped on password reset; login writes this into session
        createdAt: new Date().toISOString(),
        createdBy: createdBy ?? 'setup',
      };

      // NOTE: this read-modify-write is NOT the atomic create-if-none bootstrap guard;
      // the atomic single-admin guard is added in Phase A step 3 (AUTH.md §5).
      users.push(record);
      writeUsers(users);

      return toSafeUser(record);
    });
  }

  async function updateUser(id, { role, password } = {}) {
    return enqueue(async function run() {
      const hasRole = role !== undefined && role !== null;
      const hasPassword = password !== undefined && password !== null && password !== '';

      if (!hasRole && !hasPassword) {
        const err = new Error('updateUser requires at least one of: role, password');
        err.code = 'EMPTY_UPDATE';
        throw err;
      }

      const users = readUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) {
        const err = new Error('User not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const record = { ...users[idx] };

      if (hasRole) {
        if (role !== 'operator' && role !== 'admin') {
          const err = new Error('Role must be "operator" or "admin"');
          err.code = 'INVALID_ROLE';
          throw err;
        }
        // Last-admin guard: demoting the only admin is forbidden (checked inside lock against
        // the freshly read list, so concurrent demotions cannot both pass).
        if (record.role === 'admin' && role === 'operator') {
          const adminCount = users.filter((u) => u.role === 'admin').length;
          if (adminCount <= 1) {
            const err = new Error('Cannot demote the last admin');
            err.code = 'LAST_ADMIN';
            throw err;
          }
        }
        record.role = role;
      }

      if (hasPassword) {
        record.passwordHash = await hashPassword(password);
        // Bump epoch so requireAuth invalidates sessions that predate this reset.
        record.sessionEpoch = (record.sessionEpoch ?? 0) + 1;
      }

      users[idx] = record;
      writeUsers(users);
      return toSafeUser(record);
    });
  }

  async function deleteUser(id) {
    return enqueue(function run() {
      const users = readUsers();
      const idx = users.findIndex((u) => u.id === id);
      if (idx === -1) {
        const err = new Error('User not found');
        err.code = 'NOT_FOUND';
        throw err;
      }

      const record = users[idx];

      // Last-admin guard: deleting the only admin is forbidden (checked inside lock against
      // the freshly read list).
      if (record.role === 'admin') {
        const adminCount = users.filter((u) => u.role === 'admin').length;
        if (adminCount <= 1) {
          const err = new Error('Cannot delete the last admin');
          err.code = 'LAST_ADMIN';
          throw err;
        }
      }

      users.splice(idx, 1);
      writeUsers(users);
      return toSafeUser(record);
    });
  }

  return {
    readUsers,
    countUsers,
    findAuthRecordByUsername,
    findAuthRecordById,
    createUser,
    updateUser,
    deleteUser,
  };
}

// Default instance bound to DEFAULT_USERS_PATH
export default createUsersStore();
