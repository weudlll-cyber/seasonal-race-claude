// ============================================================
// File:        surfaceClasses.js
// Path:        server/src/routes/surfaceClasses.js
// Project:     RaceArena
// Description: Surface-class API routes — CRUD for custom classes and
//              default-class overrides.
//
//              Storage model:
//                server/data/surface-classes/<id>.json — one file per entry
//
//              Code defaults live in the frontend (defaults.js) and are NOT
//              stored here. The backend stores only:
//                - Custom classes       (isDefault: false, isOverride: false)
//                - Default overrides    (isOverride: true, id matches a default)
// ============================================================

import express from 'express';
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  renameSync,
  unlinkSync,
  existsSync,
  mkdirSync,
} from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data/surface-classes');

const VALID_GENERATOR_IDS = new Set(['particle', 'cloud', 'splash', 'line']);

// Ensure the data directory exists at startup.
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ── In-memory store ───────────────────────────────────────────────────────────

function loadAll() {
  const map = new Map();
  if (!existsSync(DATA_DIR)) return map;
  for (const file of readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'))) {
    try {
      const cls = JSON.parse(readFileSync(join(DATA_DIR, file), 'utf8'));
      map.set(cls.id, cls);
    } catch {
      console.warn(`[surface-classes] Failed to load ${file}`);
    }
  }
  return map;
}

const classesMap = loadAll();

// ── Helpers ───────────────────────────────────────────────────────────────────

function atomicWriteJson(filePath, data) {
  const tmp = filePath + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  renameSync(tmp, filePath);
}

function filePath(id) {
  return join(DATA_DIR, `${id}.json`);
}

/**
 * Validate required fields for create/update.
 * @returns {string[]} error messages — empty array means valid
 */
function validateBody(body) {
  const errors = [];
  if (!body.id || typeof body.id !== 'string' || !/^[a-z0-9_-]+$/.test(body.id)) {
    errors.push('id must be a non-empty lowercase alphanumeric string (hyphens/underscores allowed)');
  }
  if (!body.label || typeof body.label !== 'string' || !body.label.trim()) {
    errors.push('label is required');
  }
  if (!VALID_GENERATOR_IDS.has(body.generatorId)) {
    errors.push(`generatorId must be one of: ${[...VALID_GENERATOR_IDS].join(', ')}`);
  }
  if (!body.config || typeof body.config !== 'object' || Array.isArray(body.config)) {
    errors.push('config must be a non-array object');
  }
  return errors;
}

// ── Routes ────────────────────────────────────────────────────────────────────

const router = express.Router();

// GET /api/surface-classes — all backend-stored classes (custom + overrides)
router.get('/', (_req, res) => {
  res.json([...classesMap.values()]);
});

// GET /api/surface-classes/:id — single class
router.get('/:id', (req, res) => {
  const cls = classesMap.get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Surface class not found' });
  res.json(cls);
});

// POST /api/surface-classes — create custom class or default override
router.post('/', (req, res) => {
  const errors = validateBody(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const { id } = req.body;
  if (classesMap.has(id)) {
    return res.status(409).json({ error: `Surface class '${id}' already exists` });
  }

  const now = new Date().toISOString();
  const cls = {
    id,
    label: req.body.label.trim(),
    generatorId: req.body.generatorId,
    config: req.body.config,
    isDefault: false,
    // If the caller signals this is an override of a default class, preserve that flag.
    isOverride: req.body.isOverride === true,
    createdAt: now,
    updatedAt: now,
  };

  atomicWriteJson(filePath(id), cls);
  classesMap.set(id, cls);
  res.status(201).json(cls);
});

// PUT /api/surface-classes/:id — idempotent upsert.
// Intentional: if the id does not exist yet the entry is created. This lets
// the VRE editor write a default-class override (e.g. PUT /api/surface-classes/mud
// with isOverride:true) without needing a prior POST, and makes the operation
// safe to retry without checking existence first.
router.put('/:id', (req, res) => {
  const existing = classesMap.get(req.params.id);

  // Body id must match URL id when provided.
  if (req.body.id && req.body.id !== req.params.id) {
    return res.status(400).json({ error: 'id in body must match URL parameter' });
  }

  const bodyToValidate = { ...req.body, id: req.params.id };
  const errors = validateBody(bodyToValidate);
  if (errors.length) return res.status(400).json({ error: errors.join('; ') });

  const now = new Date().toISOString();
  const cls = {
    ...(existing ?? {}),
    id: req.params.id,
    label: req.body.label.trim(),
    generatorId: req.body.generatorId,
    config: req.body.config,
    isDefault: false,
    isOverride: req.body.isOverride === true || (existing?.isOverride ?? false),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  atomicWriteJson(filePath(req.params.id), cls);
  classesMap.set(req.params.id, cls);
  res.json(cls);
});

// DELETE /api/surface-classes/:id — remove custom class or default override
router.delete('/:id', (req, res) => {
  const cls = classesMap.get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'Surface class not found' });

  const jsonPath = filePath(req.params.id);
  if (existsSync(jsonPath)) unlinkSync(jsonPath);
  classesMap.delete(req.params.id);

  res.status(204).send();
});

export default router;
