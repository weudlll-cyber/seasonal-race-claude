// ============================================================
// File:        racers.js
// Path:        server/src/routes/racers.js
// Project:     RaceArena
// Description: Racers API routes — CRUD (operator+) + sprite upload/serve/delete (D5).
//              User-created configs only; built-in types remain in client RACER_TYPES.
//
//              Storage model:
//                server/data/racers/<id>.json         — one file per racer record
//                server/data/racer-sprites/<filename> — sprite image files
//
//              Sprite handling (E3):
//                Magic bytes are authoritative — client Content-Type is ignored.
//                Filename = <racer.id>.<ext> stored in SPRITE_DIR.
//                Old file deleted on format swap (jpg→png).
//                spriteFile in the record stores filename only (null until upload).
//
//              Built-in ID collision guard (E6):
//                POST/PUT with a built-in racer ID (e.g. "horse") → 400/409.
//                Guard checked against BUILTIN_RACER_IDS constant (one server source).
// ============================================================

import express from 'express';
import { unlinkSync, existsSync, mkdirSync, writeFileSync, createReadStream } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { atomicWriteJson } from '../../utils/atomicWriteJson.js';
import { loadJsonDir, jsonFilePath } from '../../utils/jsonDirStore.js';
import {
  detectMagicType,
  IMAGE_MIME,
  MAX_IMAGE_BYTES,
  createUpload,
  uploadSingleImage,
} from '../../utils/imageUpload.js';
import { isSafeAssetFilename } from '../../utils/isSafeAssetFilename.js';
import { removeStoredAsset } from '../../utils/removeStoredAsset.js';
import { BUILTIN_RACER_IDS } from '../constants/builtinRacerIds.js';
import { isValidId } from '../../utils/isValidId.js';
import { DATA_ROOT } from '../dataPaths.js';
import { unknownFields, unknownFieldsMessage, checkNumber } from '../../utils/recordFields.js';

export const DATA_DIR = join(DATA_ROOT, 'racers');
export const SPRITE_DIR = join(DATA_ROOT, 'racer-sprites');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(SPRITE_DIR)) mkdirSync(SPRITE_DIR, { recursive: true });

const upload = createUpload({ maxBytes: MAX_IMAGE_BYTES });

const BUILTIN_SET = new Set(BUILTIN_RACER_IDS);

// ── In-memory store ───────────────────────────────────────────────────────────

// One home for this loader: `utils/jsonDirStore.js`. It was written out identically in three route
// modules (DELIVERY-CLEAN-3 piece 3); the three bodies were diffed before unifying and had NOT
// drifted. Still exported from here because the tests and `seedRuntime` import it by this name.
export function loadAll(dir = DATA_DIR) {
  return loadJsonDir(dir, 'racers');
}

const racersMap = loadAll();

// ── Helpers ───────────────────────────────────────────────────────────────────

function filePath(id) {
  return jsonFilePath(DATA_DIR, id);
}

/**
 * Validate body fields for create and update.
 * @param {object} body
 * @param {string|null} [bodyId] - id from request body (POST only; null skips id checks)
 * @returns {string[]} error messages — empty array means valid
 */
export function validateBody(body, bodyId = null) {
  const errors = [];

  if (bodyId !== null) {
    if (!isValidId(bodyId)) {
      errors.push('id must contain only lowercase letters, digits, hyphen, or underscore');
    } else if (BUILTIN_SET.has(bodyId)) {
      errors.push(`id "${bodyId}" collides with a built-in racer type — choose a different id`);
    }
  }

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    errors.push('name is required');
  }

  if (!body.emoji || typeof body.emoji !== 'string' || !body.emoji.trim()) {
    errors.push('emoji is required');
  }

  if (body.frameCount == null) {
    errors.push('frameCount is required');
  }

  if (body.basePeriodMs == null) {
    errors.push('basePeriodMs is required');
  }

  if (body.displaySize == null) {
    errors.push('displaySize is required');
  }

  if (!body.trailStyle || typeof body.trailStyle !== 'string') {
    errors.push('trailStyle is required');
  }

  if (!Array.isArray(body.coats) || body.coats.length === 0) {
    errors.push('coats must be a non-empty array');
  }

  if (!body.primaryColor || typeof body.primaryColor !== 'string') {
    errors.push('primaryColor is required');
  }

  return errors;
}

// ── The field allow-list and the number bounds (AUDIT-1 A5M-13, the owner's decision 2026-10-12) ──
//
// The routes below already store only the fields they name, so an extra field was IGNORED here, not
// stored; it is now refused, so a typo is not silently lost. The list: what the Racer Editor sends
// (client/src/screens/RacerEditor/RacerEditor.jsx via serverRacerTypes.js `registerRacerType`),
// the server's own fields, and `spriteDataUrl`/`spriteUrl`, which the client strips or never sends
// but which are allowed in doubt (and ignored). On an update, keys the stored record already has and
// values equal to the stored ones always pass (server/utils/recordFields.js).
const RACER_FIELDS = new Set([
  'id',
  'name',
  'emoji',
  'frameCount',
  'basePeriodMs',
  'displaySize',
  'trailStyle',
  'coats',
  'defaultCoatId',
  'primaryColor',
  'speedMultiplier',
  'baseRotationOffset',
  'surfaceClasses',
  'tintMode',
  'bodyFillX',
  'bodyFillY',
  'frameWidth',
  'frameHeight',
  'spriteFile',
  'spriteUrl',
  'spriteDataUrl',
  'isDefault',
  'createdAt',
  'updatedAt',
]);

// Each at least as wide as the Racer Editor: frames — pills 4/8/16; period — slider 200–2000 ms
// (type defaults 300–1500); display size — slider 16–80; speed — slider 0.3–2.0; rotation —
// slider −π…π; body fill — (0, 1]; frame size — 128 for an editor-built sheet. Stored values load
// unclamped, which the equal-to-stored rule covers. There are no racer seeds.
const RACER_NUMBER_BOUNDS = {
  frameCount: { min: 1, max: 256, integer: true },
  basePeriodMs: { min: 1, max: 60_000 },
  displaySize: { min: 1, max: 1000 },
  speedMultiplier: { min: 0, max: 10 },
  baseRotationOffset: { min: -7, max: 7 },
  bodyFillX: { min: 0, max: 1 },
  bodyFillY: { min: 0, max: 1 },
  frameWidth: { min: 1, max: 10_000 },
  frameHeight: { min: 1, max: 10_000 },
};

/** The allow-list and bound errors for a create (`existing` null) or an update. */
export function validateRacerFields(body, existing = null) {
  const errors = [];
  const unknown = unknownFields(body, RACER_FIELDS, existing);
  if (unknown.length) errors.push(unknownFieldsMessage(unknown, 'A racer'));
  for (const [key, bound] of Object.entries(RACER_NUMBER_BOUNDS)) {
    const err = checkNumber(body, key, bound, existing);
    if (err) errors.push(err);
  }
  return errors;
}

// ── Routes ────────────────────────────────────────────────────────────────────

const router = express.Router();

// GET /api/racers
router.get('/', (_req, res) => {
  res.json([...racersMap.values()]);
});

// GET /api/racers/:id
router.get('/:id', (req, res) => {
  const racer = racersMap.get(req.params.id);
  if (!racer) return res.status(404).json({ error: 'Racer not found' });
  res.json(racer);
});

// POST /api/racers
router.post('/', (req, res) => {
  const hasBodyId = req.body.id !== undefined;
  const bodyId = hasBodyId ? req.body.id : null;

  const errors = [...validateBody(req.body, bodyId), ...validateRacerFields(req.body)];
  if (errors.length) return res.status(400).json({ error: errors.join('; '), errors });

  const id = hasBodyId ? req.body.id : randomUUID();

  if (racersMap.has(id)) {
    return res.status(409).json({ error: `Racer '${id}' already exists` });
  }

  const now = new Date().toISOString();
  const b = req.body;
  const racer = {
    id,
    name: b.name.trim(),
    emoji: b.emoji.trim(),
    frameCount: b.frameCount,
    basePeriodMs: b.basePeriodMs,
    displaySize: b.displaySize,
    trailStyle: b.trailStyle,
    coats: b.coats,
    primaryColor: b.primaryColor,
    ...(b.bodyFillX !== undefined && { bodyFillX: b.bodyFillX }),
    ...(b.bodyFillY !== undefined && { bodyFillY: b.bodyFillY }),
    ...(b.frameWidth !== undefined && { frameWidth: b.frameWidth }),
    ...(b.frameHeight !== undefined && { frameHeight: b.frameHeight }),
    ...(b.tintMode !== undefined && { tintMode: b.tintMode }),
    ...(b.defaultCoatId !== undefined && { defaultCoatId: b.defaultCoatId }),
    ...(b.speedMultiplier !== undefined && { speedMultiplier: b.speedMultiplier }),
    ...(b.baseRotationOffset !== undefined && { baseRotationOffset: b.baseRotationOffset }),
    ...(b.surfaceClasses !== undefined && { surfaceClasses: b.surfaceClasses }),
    spriteFile: null,
    createdAt: now,
    updatedAt: now,
  };

  atomicWriteJson(filePath(id), racer);
  racersMap.set(id, racer);
  res.status(201).json(racer);
});

// PUT /api/racers/:id
router.put('/:id', (req, res) => {
  // Built-in ID collision guard — must precede the 404 check (Inv E6 / L126).
  if (BUILTIN_SET.has(req.params.id)) {
    return res.status(409).json({
      error: `id "${req.params.id}" is a built-in racer type — cannot modify via user store`,
    });
  }

  const existing = racersMap.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Racer not found' });

  const errors = [...validateBody(req.body), ...validateRacerFields(req.body, existing)];
  if (errors.length) return res.status(400).json({ error: errors.join('; '), errors });

  const now = new Date().toISOString();
  const b = req.body;
  const racer = {
    ...existing,
    name: b.name.trim(),
    emoji: b.emoji.trim(),
    frameCount: b.frameCount,
    basePeriodMs: b.basePeriodMs,
    displaySize: b.displaySize,
    trailStyle: b.trailStyle,
    coats: b.coats,
    primaryColor: b.primaryColor,
    ...(b.bodyFillX !== undefined && { bodyFillX: b.bodyFillX }),
    ...(b.bodyFillY !== undefined && { bodyFillY: b.bodyFillY }),
    ...(b.frameWidth !== undefined && { frameWidth: b.frameWidth }),
    ...(b.frameHeight !== undefined && { frameHeight: b.frameHeight }),
    ...(b.tintMode !== undefined && { tintMode: b.tintMode }),
    ...(b.defaultCoatId !== undefined && { defaultCoatId: b.defaultCoatId }),
    ...(b.speedMultiplier !== undefined && { speedMultiplier: b.speedMultiplier }),
    ...(b.baseRotationOffset !== undefined && { baseRotationOffset: b.baseRotationOffset }),
    ...(b.surfaceClasses !== undefined && { surfaceClasses: b.surfaceClasses }),
    updatedAt: now,
  };

  atomicWriteJson(filePath(req.params.id), racer);
  racersMap.set(req.params.id, racer);
  res.json(racer);
});

// DELETE /api/racers/:id
router.delete('/:id', (req, res) => {
  const racer = racersMap.get(req.params.id);
  if (!racer) return res.status(404).json({ error: 'Racer not found' });

  removeStoredAsset(SPRITE_DIR, racer.spriteFile, 'racers', `sprite for "${racer.id}"`);

  const path = filePath(req.params.id);
  if (existsSync(path)) unlinkSync(path);
  racersMap.delete(req.params.id);
  res.status(204).send();
});

// ── Sprite routes ─────────────────────────────────────────────────────────────

// GET /api/racers/:id/sprite — serve the sprite file with nosniff
router.get('/:id/sprite', (req, res) => {
  const racer = racersMap.get(req.params.id);
  if (!racer) return res.status(404).json({ error: 'Racer not found' });
  if (!racer.spriteFile) return res.status(404).json({ error: 'No sprite' });
  if (!isSafeAssetFilename(racer.spriteFile))
    return res.status(404).json({ error: 'Sprite file missing' });

  const spritePath = join(SPRITE_DIR, racer.spriteFile);
  if (!existsSync(spritePath)) return res.status(404).json({ error: 'Sprite file missing' });

  const ext = extname(racer.spriteFile).slice(1).toLowerCase();
  res.setHeader('Content-Type', IMAGE_MIME[ext] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const stream = createReadStream(spritePath);
  stream.on('error', () => {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to read sprite' });
  });
  stream.pipe(res);
});

// POST /api/racers/:id/sprite — upload sprite (multipart/form-data, field name: sprite)
router.post('/:id/sprite', uploadSingleImage(upload, 'sprite'), (req, res) => {
  const racer = racersMap.get(req.params.id);
  if (!racer) return res.status(404).json({ error: 'Racer not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: sprite)' });

  // Magic-byte check is authoritative — ignores the client-supplied Content-Type header.
  const detectedType = detectMagicType(req.file.buffer);
  if (!detectedType) {
    return res
      .status(400)
      .json({ error: 'File type not allowed. Upload PNG, JPEG, or WebP only.' });
  }

  const ext = detectedType === 'image/png' ? 'png' : detectedType === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${racer.id}.${ext}`;
  const spritePath = join(SPRITE_DIR, filename);

  // Delete old sprite file if format changed (e.g. jpg → png swap).
  if (racer.spriteFile !== filename) {
    removeStoredAsset(SPRITE_DIR, racer.spriteFile, 'racers', `sprite for "${racer.id}"`);
  }

  writeFileSync(spritePath, req.file.buffer);

  const updatedRacer = { ...racer, spriteFile: filename, updatedAt: new Date().toISOString() };
  atomicWriteJson(filePath(racer.id), updatedRacer);
  racersMap.set(racer.id, updatedRacer);

  res.json({ spriteFile: filename });
});

// DELETE /api/racers/:id/sprite — remove sprite file and clear spriteFile
router.delete('/:id/sprite', (req, res) => {
  const racer = racersMap.get(req.params.id);
  if (!racer) return res.status(404).json({ error: 'Racer not found' });

  removeStoredAsset(SPRITE_DIR, racer.spriteFile, 'racers', `sprite for "${racer.id}"`);

  const updatedRacer = { ...racer, spriteFile: null, updatedAt: new Date().toISOString() };
  atomicWriteJson(filePath(racer.id), updatedRacer);
  racersMap.set(racer.id, updatedRacer);

  res.status(204).send();
});

export default router;
