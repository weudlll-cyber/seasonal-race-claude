// ============================================================
// File:        authRouter.js
// Path:        server/src/auth/authRouter.js
// Project:     RaceArena
// Created:     2026-06-13
// Description: /api/auth routes — setup, login, logout, me + atomic first-admin bootstrap
// ============================================================

import express from 'express';
import { randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { openSync, closeSync, existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import defaultStore, { verifyPassword, toSafeUser } from './usersStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '../../data');

const DEFAULT_SETUP_MARKER = join(dataDir, 'setup-complete.json');
// Exported so the recovery CLI can reference the same path without duplicating it.
export const SETUP_MARKER_PATH = DEFAULT_SETUP_MARKER;

// Timing-equalization dummy: a real bcrypt hash used in verifyPassword when a username is not
// found, so that a user-miss takes the same wall time as a password-miss (prevents user enumeration
// via timing). The plaintext that produced this hash is irrelevant and never authenticated against.
const DUMMY_HASH = '$2b$12$bZsIjjH3iRDdWBkesqmTUuYehFIs0VBb6IEEfKooA.ki5Ey67uJsS';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Compare two strings in constant time: hash both to 32-byte SHA-256 digests so
// timingSafeEqual receives equal-length buffers regardless of input length.
function constantTimeEqual(a, b) {
  const ha = createHash('sha256').update(String(a)).digest();
  const hb = createHash('sha256').update(String(b)).digest();
  return timingSafeEqual(ha, hb);
}

// ── Router factory ────────────────────────────────────────────────────────────

export function createAuthRouter({ store, setupMarkerPath, getBootstrapToken } = {}) {
  store = store ?? defaultStore;
  setupMarkerPath = setupMarkerPath ?? DEFAULT_SETUP_MARKER;
  getBootstrapToken = getBootstrapToken ?? (() => process.env.RA_BOOTSTRAP_TOKEN);

  const router = express.Router();

  // GET /setup-needed — public, no secrets
  router.get('/setup-needed', (_req, res) => {
    const setupNeeded = !existsSync(setupMarkerPath) && store.countUsers() === 0;
    res.json({ setupNeeded });
  });

  // POST /setup — public, gated by bootstrap token (AUTH.md §5)
  router.post('/setup', async (req, res) => {
    // 1. Fast pre-check: marker already present
    if (existsSync(setupMarkerPath)) {
      return res.status(409).json({ error: 'setup already complete' });
    }

    // 2. Bootstrap-token validation (constant-time)
    const token = req.get('x-bootstrap-token') ?? req.body?.token ?? '';
    const configured = getBootstrapToken();
    if (!configured) {
      console.warn('[auth] RA_BOOTSTRAP_TOKEN not set; setup disabled');
      return res.status(403).json({ error: 'setup not available' });
    }
    if (!constantTimeEqual(token, configured)) {
      return res.status(403).json({ error: 'setup not available' });
    }

    // 3. Body validation (generic — do not reveal which field is missing)
    const { username, password } = req.body ?? {};
    if (!username || !String(username).trim() || !password || !String(password).trim()) {
      return res.status(400).json({ error: 'invalid username or password' });
    }

    // 4. Atomic gate: O_EXCL — exactly one winner across concurrent requests
    let fd = null;
    try {
      fd = openSync(setupMarkerPath, 'wx');
    } catch (e) {
      if (e.code === 'EEXIST') return res.status(409).json({ error: 'setup already complete' });
      console.error('[auth] setup marker open failed:', e.code ?? e.message);
      return res.status(500).json({ error: 'setup failed' });
    }

    // 5. Inside the gate — failures before commit must close fd and unlink marker
    let committed = false;
    try {
      // Paranoid post-gate check: users exist without marker (restore-safety path)
      if (store.countUsers() > 0) {
        closeSync(fd); fd = null;
        try { unlinkSync(setupMarkerPath); } catch {}
        return res.status(409).json({ error: 'setup already complete' });
      }

      const safeAdmin = await store.createUser({ username, password, role: 'admin', createdBy: 'setup' });

      writeFileSync(setupMarkerPath, JSON.stringify({ completedAt: new Date().toISOString(), adminId: safeAdmin.id }));
      closeSync(fd); fd = null;

      // Admin + marker are durably written — setup is committed from this point on.
      committed = true;

      // Auto-login (AUTH.md §4 MUST: regenerate on setup)
      try {
        await new Promise((resolve, reject) => {
          req.session.regenerate((err) => {
            if (err) return reject(err);
            req.session.userId = safeAdmin.id;
            req.session.sessionEpoch = 0;  // new user always starts at epoch 0
            req.session.save((err2) => { if (err2) return reject(err2); resolve(); });
          });
        });
        return res.status(201).json({ username: safeAdmin.username, role: safeAdmin.role });
      } catch (sessErr) {
        // Setup IS committed. Auto-login failed (rare). Do NOT roll back — the admin exists and
        // can log in manually; the client will route to /login on the next 401 from /me.
        console.warn('[auth] setup committed but auto-login failed:', sessErr?.code ?? sessErr?.message);
        if (!res.headersSent) return res.status(201).json({ username: safeAdmin.username, role: safeAdmin.role });
        return;
      }
    } catch (err) {
      if (fd !== null) { try { closeSync(fd); } catch {} }
      if (!committed) { try { unlinkSync(setupMarkerPath); } catch {} }  // only roll back pre-commit
      if (!res.headersSent) {
        if (['INVALID_USERNAME', 'INVALID_PASSWORD', 'INVALID_ROLE'].includes(err.code)) {
          return res.status(400).json({ error: 'invalid username or password' });
        }
        return res.status(500).json({ error: 'setup failed' });
      }
    }
  });

  // POST /login — public, timing-equalized
  router.post('/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    const record = store.findAuthRecordByUsername(username);

    if (!record) {
      await verifyPassword(password, DUMMY_HASH);  // timing equalization — result ignored
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const ok = await verifyPassword(password, record.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    // Regenerate on successful login (AUTH.md §4 MUST: anti session-fixation)
    req.session.regenerate((err) => {
      if (err) return res.status(500).json({ error: 'login failed' });
      req.session.userId = record.id;
      req.session.sessionEpoch = record.sessionEpoch ?? 0;
      req.session.save((err2) => {
        if (err2) return res.status(500).json({ error: 'login failed' });
        res.json({ username: record.username, role: record.role });
      });
    });
  });

  // POST /logout — inline auth (global requireAuth arrives in step 4)
  router.post('/logout', (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'not authenticated' });
    }
    req.session.destroy((err) => {
      if (err) {
        console.error('[auth] session destroy failed on logout:', err.code ?? err.message);
        return res.status(500).json({ error: 'logout failed' });
      }
      res.clearCookie('ra.sid');
      res.json({ ok: true });
    });
  });

  // GET /me — inline auth
  router.get('/me', (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'not authenticated' });
    }
    const record = store.findAuthRecordById(req.session.userId);
    if (!record) {
      // User deleted while session was alive
      req.session.destroy(() => res.status(401).json({ error: 'not authenticated' }));
      return;
    }
    const safe = toSafeUser(record);
    res.json({ username: safe.username, role: safe.role });
  });

  return router;
}

export default createAuthRouter();
