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
import {
  readFileSync,
  readdirSync,
  unlinkSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  createReadStream,
} from 'fs';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { atomicWriteJson } from '../../utils/atomicWriteJson.js';
import { detectMagicType, IMAGE_MIME, MAX_IMAGE_BYTES, createUpload } from '../../utils/imageUpload.js';
import { BUILTIN_RACER_IDS } from '../constants/builtinRacerIds.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const DATA_DIR = join(__dirname, '../../data/racers');
export const SPRITE_DIR = join(__dirname, '../../data/racer-sprites');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(SPRITE_DIR)) mkdirSync(SPRITE_DIR, { recursive: true });

const upload = createUpload({ maxBytes: MAX_IMAGE_BYTES });

const BUILTIN_SET = new Set(BUILTIN_RACER_IDS);

// ── In-memory store ───────────────────────────────────────────────────────────

export function loadAll(dir = DATA_DIR) {
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      const racer = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      map.set(racer.id, racer);
    } catch {
      console.warn(`[racers] Failed to load ${file} — skipping`);
    }
  }
  return map;
}

const racersMap = loadAll();

// ── Helpers ───────────────────────────────────────────────────────────────────

function filePath(id) {
  return join(DATA_DIR, `${id}.json`);
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
    if (!bodyId || typeof bodyId !== 'string' || !/^[a-z0-9_-]+$/.test(bodyId)) {
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

  const errors = validateBody(req.body, bodyId);
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

  const errors = validateBody(req.body);
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

  if (racer.spriteFile) {
    const spritePath = join(SPRITE_DIR, racer.spriteFile);
    if (existsSync(spritePath)) unlinkSync(spritePath);
  }

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
router.post('/:id/sprite', (req, res, next) => {
  upload.single('sprite')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res
          .status(413)
          .json({ error: `File too large. Maximum ${MAX_IMAGE_BYTES / 1024 / 1024} MB allowed.` });
      }
      if (err.code === 'INVALID_TYPE') {
        return res.status(400).json({ error: 'File type not allowed. Upload PNG, JPEG, or WebP only.' });
      }
      return res.status(400).json({ error: 'File upload failed.' });
    }
    next();
  });
}, (req, res) => {
  const racer = racersMap.get(req.params.id);
  if (!racer) return res.status(404).json({ error: 'Racer not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: sprite)' });

  // Magic-byte check is authoritative — ignores the client-supplied Content-Type header.
  const detectedType = detectMagicType(req.file.buffer);
  if (!detectedType) {
    return res.status(400).json({ error: 'File type not allowed. Upload PNG, JPEG, or WebP only.' });
  }

  const ext = detectedType === 'image/png' ? 'png' : detectedType === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${racer.id}.${ext}`;
  const spritePath = join(SPRITE_DIR, filename);

  // Delete old sprite file if format changed (e.g. jpg → png swap).
  if (racer.spriteFile && racer.spriteFile !== filename) {
    const oldPath = join(SPRITE_DIR, racer.spriteFile);
    if (existsSync(oldPath)) unlinkSync(oldPath);
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

  if (racer.spriteFile) {
    const spritePath = join(SPRITE_DIR, racer.spriteFile);
    if (existsSync(spritePath)) unlinkSync(spritePath);
  }

  const updatedRacer = { ...racer, spriteFile: null, updatedAt: new Date().toISOString() };
  atomicWriteJson(filePath(racer.id), updatedRacer);
  racersMap.set(racer.id, updatedRacer);

  res.status(204).send();
});

export default router;
