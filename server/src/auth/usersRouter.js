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
import { restampSession } from './restampSession.js';

function createUsersRouter({ store } = {}) {
  store = store ?? defaultStore;

  const router = express.Router();

  // GET / — list all race directors (safe projection, no passwordHash)
  router.get('/', (_req, res) => {
    const users = store.readUsers().map(toSafeUser);
    res.json(users);
  });

  // POST / — create a new race director; delegates entirely to the serialised store.createUser
  router.post('/', async (req, res) => {
    // `team` is taken from the body with NO fallback — a create that names no team is a 400, not a
    // user quietly filed under somebody else's team. `allowNewTeam` is the admin's explicit "yes,
    // this really is a new team"; without it a team that matches nothing is refused (teams.js).
    const { username, password, role, team, allowNewTeam } = req.body ?? {};
    try {
      const user = await store.createUser({
        username,
        password,
        role,
        team,
        allowNewTeam: allowNewTeam === true,
        createdBy: req.authUser?.username ?? 'api',
      });
      res.status(201).json(user);
    } catch (err) {
      if (err.code === 'USERNAME_TAKEN') {
        return res.status(409).json({ error: 'username already taken' });
      }
      // UNKNOWN_TEAM is a 400 carrying the teams that DO exist, so the admin who mistyped one is
      // shown what they meant instead of being told only that they were wrong.
      if (err.code === 'UNKNOWN_TEAM') {
        return res.status(400).json({ error: err.message, knownTeams: err.knownTeams ?? [] });
      }
      if (['INVALID_USERNAME', 'INVALID_PASSWORD', 'INVALID_ROLE', 'INVALID_TEAM'].includes(err.code)) {
        return res.status(400).json({ error: err.message });
      }
      console.error('[users] createUser failed:', err.code ?? err.message);
      res.status(500).json({ error: 'internal error' });
    }
  });

  // PUT /:id — update role and/or reset password; delegates to store.updateUser
  //
  // SESSIONS AND A PASSWORD CHANGE (SESSION-INVALIDATE-1, the owner's contract of 2026-08-19).
  // A password change bumps the record's `sessionEpoch` inside the same serialised write
  // (usersStore.js), and `requireAuth` rejects any session whose stored epoch differs
  // (guards.js). That already ends every session of a user whose password an ADMIN set — there
  // is no separate "remove the sessions" step here, and deliberately so: a second mechanism
  // beside this one would be a second definition of the same rule.
  //
  // The one case it got wrong is a user changing their OWN password: the session making the
  // request predates the bump too, so the requester was logged out for doing the right thing.
  // That single session is re-stamped with the new epoch by `restampSession`, which is the ONE
  // home for that (POST /api/auth/change-password calls the same function). Every OTHER session
  // of that user still carries the old epoch and still dies on its next request.
  router.put('/:id', async (req, res) => {
    const { role, password, team, allowNewTeam } = req.body ?? {};
    const changedOwnPassword = password !== undefined && req.params.id === req.authUser?.id;
    try {
      const user = await store.updateUser(req.params.id, {
        role,
        password,
        team,
        allowNewTeam: allowNewTeam === true,
      });

      if (changedOwnPassword) {
        await restampSession(req, store, req.params.id);
      }

      res.json(user);
    } catch (err) {
      if (err.code === 'NOT_FOUND') return res.status(404).json({ error: 'user not found' });
      if (err.code === 'LAST_ADMIN') return res.status(409).json({ error: err.message });
      if (err.code === 'UNKNOWN_TEAM') {
        return res.status(400).json({ error: err.message, knownTeams: err.knownTeams ?? [] });
      }
      if (['INVALID_ROLE', 'INVALID_PASSWORD', 'INVALID_TEAM', 'EMPTY_UPDATE'].includes(err.code)) {
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
