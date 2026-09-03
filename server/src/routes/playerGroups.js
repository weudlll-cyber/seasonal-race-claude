// ============================================================
// File:        playerGroups.js
// Path:        server/src/routes/playerGroups.js
// Project:     RaceArena
// Description: Player-groups API routes — CRUD (operator+) + default seed +
//              admin promote/export (D1, §3.3 / §9 / §10b).
//
//              Storage model:
//                server/data/player-groups/<id>.json — one file per group
//
//              isDefault transitions ONLY via POST /:id/set-default and
//              POST /:id/clear-default (admin-only via ROUTE_POLICY in guards.js).
//              Normal POST always stores isDefault:false.
//              Normal PUT preserves existing.isDefault.
//              DELETE on isDefault:true returns 403.
// ============================================================

import express from 'express';
import { readFileSync, readdirSync, unlinkSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { atomicWriteJson } from '../../utils/atomicWriteJson.js';
import { attachPromoteExport } from './_defaultPromote.js';
import { DATA_ROOT } from '../dataPaths.js';
import { seedTypeFromSnapshot } from '../seedRuntime.js';
import { deliverSeedsOnce } from '../seedDelivery.js';
import { isValidId } from '../../utils/isValidId.js';
import {
  PLAYER_NAME_MAX_LENGTH,
  tooLongNames,
  nameTooLongMessage,
} from '../../../shared/nameLimits.mjs';

export const DATA_DIR = join(DATA_ROOT, 'player-groups');

const NAME_MAX = 100;
// ★ THIS IS A SAVED-GROUP SIZE, NOT A FIELD CAP (MAX-FIELD-1, 2026-09-04). A group of 200 names may
// be SAVED; whether it fits a race is a different question with a different answer (40 on a closed
// track, 100 on an open one, in client defaults.js). Named for what it limits, because `PLAYER_MAX`
// beside `maxPlayersClosed` read as a third opinion about the same thing.
const SAVED_GROUP_MAX_NAMES = 200;
// NAME-LIMIT-1: the limit has ONE home, above both packages, because it must be identical on both
// sides of this HTTP boundary. This route is the ONLY place a name can be enforced for real — a
// client is untrusted and an input attribute is a hint to a browser.
const PLAYER_NAME_MAX = PLAYER_NAME_MAX_LENGTH;

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── In-memory store ───────────────────────────────────────────────────────────

export function loadAll(dir = DATA_DIR) {
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      const group = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      map.set(group.id, group);
    } catch {
      console.warn(`[player-groups] Failed to load ${file} — skipping`);
    }
  }
  return map;
}

// SEED-REDELIVERY-1: versioned delivery first, then the missing-file copy. See tracks.js.
deliverSeedsOnce();
// Copy missing default snapshots before loading the map.
seedTypeFromSnapshot('player-groups');
const groupsMap = loadAll();

// ── Helpers ───────────────────────────────────────────────────────────────────

function filePath(id) {
  return join(DATA_DIR, `${id}.json`);
}

/**
 * Validate body fields for create and update.
 * @returns {string[]} error messages — empty array means valid
 */
export function validateBody(body) {
  const errors = [];

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name is required');
  } else if (body.name.trim().length > NAME_MAX) {
    errors.push(`name must be ${NAME_MAX} characters or fewer`);
  }

  if (!Array.isArray(body.players) || body.players.length === 0) {
    errors.push('players must be a non-empty array');
  } else {
    if (body.players.length > SAVED_GROUP_MAX_NAMES) {
      errors.push(`players must contain at most ${SAVED_GROUP_MAX_NAMES} entries`);
    }
    if (body.players.some((p) => typeof p !== 'string' || !p.trim())) {
      errors.push('all player names must be non-empty strings');
    }
    const overLong = tooLongNames(body.players);
    if (overLong.length > 0) {
      // REJECT, never trim — the shared module's rule, and its reasoning. The message names the
      // offenders because the operator has to know WHICH one to shorten.
      errors.push(nameTooLongMessage(overLong));
    }
  }

  return errors;
}

// ── Routes ────────────────────────────────────────────────────────────────────

const router = express.Router();

// GET /api/player-groups
router.get('/', (_req, res) => {
  res.json([...groupsMap.values()]);
});

// GET /api/player-groups/:id
router.get('/:id', (req, res) => {
  const group = groupsMap.get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Player group not found' });
  res.json(group);
});

// POST /api/player-groups
// isDefault is ALWAYS set to false — body.isDefault is never used (Invariant 2).
router.post('/', (req, res) => {
  const errors = validateBody(req.body);

  let id = req.body.id;
  if (id !== undefined) {
    if (!isValidId(id)) {
      errors.push('id must be a non-empty lowercase alphanumeric string (hyphens/underscores allowed)');
    }
  } else {
    id = randomUUID(); // lowercase hex + hyphens — satisfies isValidId
  }

  if (errors.length) return res.status(400).json({ error: errors.join('; '), errors });

  if (groupsMap.has(id)) {
    return res.status(409).json({ error: `Player group '${id}' already exists` });
  }

  const now = new Date().toISOString();
  const group = {
    id,
    name: req.body.name.trim(),
    players: req.body.players.map((p) => p.trim()),
    isDefault: false, // Invariant 2: body.isDefault is never read here
    createdAt: now,
    updatedAt: now,
  };

  atomicWriteJson(filePath(id), group);
  groupsMap.set(id, group);
  res.status(201).json(group);
});

// PUT /api/player-groups/:id
// existing.isDefault is preserved — body.isDefault is never used (Invariant 2).
router.put('/:id', (req, res) => {
  const existing = groupsMap.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Player group not found' });

  const errors = validateBody(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; '), errors });

  const now = new Date().toISOString();
  const group = {
    ...existing,
    name: req.body.name.trim(),
    players: req.body.players.map((p) => p.trim()),
    isDefault: existing.isDefault, // Invariant 2: body.isDefault is never read here
    updatedAt: now,
  };

  atomicWriteJson(filePath(req.params.id), group);
  groupsMap.set(req.params.id, group);
  res.json(group);
});

// DELETE /api/player-groups/:id
// Returns 403 if the group is a default (Invariant 3).
router.delete('/:id', (req, res) => {
  const group = groupsMap.get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Player group not found' });
  if (group.isDefault) {
    return res.status(403).json({ error: 'Cannot delete a default player group' });
  }
  const path = filePath(req.params.id);
  if (existsSync(path)) unlinkSync(path);
  groupsMap.delete(req.params.id);
  res.status(204).send();
});

// ── Admin: promote / demote / export-seed ────────────────────────────────────
// Guarded admin-only via ROUTE_POLICY in guards.js (the CRUD routes above are operator+).

attachPromoteExport(router, {
  getRecord: (id) => groupsMap.get(id),
  saveRecord: (record) => {
    atomicWriteJson(filePath(record.id), record);
    groupsMap.set(record.id, record);
  },
});

export default router;
