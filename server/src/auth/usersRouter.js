// ============================================================
// File:        usersRouter.js
// Path:        server/src/auth/usersRouter.js
// Project:     RaceArena
// Created:     2026-06-14
// Description: /api/users router — list, create, update, delete race directors (admin-only)
//              Gating is handled by the global requireAdmin guard via ROUTE_POLICY in guards.js.
//              This router contains no inline auth checks — it trusts the guard stack.
// ============================================================

import express from 'express';
import defaultStore, { toSafeUser } from './usersStore.js';

export function createUsersRouter({ store } = {}) {
  store = store ?? defaultStore;

  const router = express.Router();

  // GET / — list all race directors (safe projection, no passwordHash)
  router.get('/', (_req, res) => {
    const users = store.readUsers().map(toSafeUser);
    res.json(users);
  });

  // POST / — create a new race director; delegates entirely to the serialised store.createUser
  router.post('/', async (req, res) => {
    const { username, password, role } = req.body ?? {};
    try {
      const user = await store.createUser({
        username,
        password,
        role,
        createdBy: req.authUser?.username ?? 'api',
      });
      res.status(201).json(user);
    } catch (err) {
      if (err.code === 'USERNAME_TAKEN') {
        return res.status(409).json({ error: 'username already taken' });
      }
      if (['INVALID_USERNAME', 'INVALID_PASSWORD', 'INVALID_ROLE'].includes(err.code)) {
        return res.status(400).json({ error: err.message });
      }
      console.error('[users] createUser failed:', err.code ?? err.message);
      res.status(500).json({ error: 'internal error' });
    }
  });

  // PUT /:id — update role and/or reset password; delegates to store.updateUser
  router.put('/:id', async (req, res) => {
    const { role, password } = req.body ?? {};
    try {
      const user = await store.updateUser(req.params.id, { role, password });
      res.json(user);
    } catch (err) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'user not found' });
      if (err.code === 'LAST_ADMIN') return res.status(409).json({ error: err.message });
      if (['INVALID_ROLE', 'INVALID_PASSWORD', 'EMPTY_UPDATE'].includes(err.code)) {
        return res.status(400).json({ error: err.message });
      }
      console.error('[users] updateUser failed:', err.code ?? err.message);
      res.status(500).json({ error: 'internal error' });
    }
  });

  // DELETE /:id — remove a race director; delegates to store.deleteUser
  router.delete('/:id', async (req, res) => {
    try {
      const user = await store.deleteUser(req.params.id);
      res.json(user);
    } catch (err) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'user not found' });
      if (err.code === 'LAST_ADMIN') return res.status(409).json({ error: err.message });
      console.error('[users] deleteUser failed:', err.code ?? err.message);
      res.status(500).json({ error: 'internal error' });
    }
  });

  return router;
}

export default createUsersRouter();
