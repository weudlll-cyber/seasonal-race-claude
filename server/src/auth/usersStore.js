// ============================================================
// File:        usersStore.js
// Path:        server/src/auth/usersStore.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: Users data store — bcrypt hashing, username normalization, CRUD
// ============================================================

import bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { readFileSync, existsSync, chmodSync } from 'node:fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { atomicWriteJson } from '../../utils/atomicWriteJson.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DEFAULT_USERS_PATH = join(__dirname, '../../data/users.json');

const BCRYPT_COST = 12;

// ── Username normalization ────────────────────────────────────────────────────

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
    return JSON.parse(raw);
  }

  function countUsers() {
    return readUsers().length;
  }

  function findByUsername(rawOrNormalized) {
    const normalized = normalizeUsername(rawOrNormalized);
    return readUsers().find((u) => u.usernameNormalized === normalized) ?? null;
  }

  async function createUser({ username, password, role, createdBy }) {
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
      createdAt: new Date().toISOString(),
      createdBy: createdBy ?? 'setup',
    };

    // NOTE: this read-modify-write is NOT the atomic create-if-none bootstrap guard;
    // the atomic single-admin guard is added in Phase A step 3 (AUTH.md §5).
    users.push(record);
    atomicWriteJson(filePath, users);
    try { chmodSync(filePath, 0o600); } catch {}

    return toSafeUser(record);
  }

  return { readUsers, countUsers, findByUsername, createUser };
}

// Default instance bound to DEFAULT_USERS_PATH
export default createUsersStore();
