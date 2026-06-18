// ============================================================
// File:        brands.js
// Path:        server/src/routes/brands.js
// Project:     RaceArena
// Description: Brands API routes — CRUD (operator+) + logo upload/serve/delete +
//              admin promote/export (D3, §3.2 / §5.1 / §8 / §10b).
//
//              Storage model:
//                server/data/brands/<id>.json      — one file per brand record
//                server/data/brand-logos/<filename> — logo image files
//
//              isDefault transitions ONLY via POST /:id/set-default and
//              POST /:id/clear-default (admin-only via ROUTE_POLICY in guards.js).
//              Normal POST always stores isDefault:false.
//              Normal PUT preserves existing.isDefault.
//              DELETE on isDefault:true returns 403.
//
//              Logo handling (E3):
//                Magic bytes are authoritative — client Content-Type is ignored.
//                Filename = <brand.id>.<ext> stored in LOGO_DIR.
//                Old file deleted on format swap (jpg→png).
//                logoFile in the record stores filename only (not base64).
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
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { atomicWriteJson } from '../../utils/atomicWriteJson.js';
import { detectMagicType, IMAGE_MIME, MAX_IMAGE_BYTES, createUpload } from '../../utils/imageUpload.js';
import { attachPromoteExport } from './_defaultPromote.js';
import { DATA_ROOT } from '../dataPaths.js';
import { seedTypeFromSnapshot } from '../seedRuntime.js';
import { isSafeAssetFilename } from '../../utils/isSafeAssetFilename.js';
import { isValidId } from '../../utils/isValidId.js';

export const DATA_DIR = join(DATA_ROOT, 'brands');
const LOGO_DIR = join(DATA_ROOT, 'brand-logos');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(LOGO_DIR)) mkdirSync(LOGO_DIR, { recursive: true });

const NAME_MAX = 100;
const EVENT_NAME_MAX = 100;
const SUBTITLE_MAX = 200;
const SPONSOR_TEXT_MAX = 200;
const LOGO_MAX_HEIGHT_CAP = 500;

// Corner values sourced from client/src/screens/RaceScreen/BrandLogoOverlay.jsx
// CORNER_STYLES — these are the ONLY valid values.
const VALID_CORNERS = new Set(['bottom-right', 'top-right']);

const upload = createUpload({ maxBytes: MAX_IMAGE_BYTES });

// ── In-memory store ───────────────────────────────────────────────────────────

export function loadAll(dir = DATA_DIR) {
  const map = new Map();
  if (!existsSync(dir)) return map;
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
    try {
      const brand = JSON.parse(readFileSync(join(dir, file), 'utf8'));
      map.set(brand.id, brand);
    } catch {
      console.warn(`[brands] Failed to load ${file} — skipping`);
    }
  }
  return map;
}

// Copy missing default snapshots before loading the map.
seedTypeFromSnapshot('brands');
seedTypeFromSnapshot('brand-logos');
const brandsMap = loadAll();

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

  if (!body.eventName || typeof body.eventName !== 'string' || !body.eventName.trim()) {
    errors.push('eventName is required');
  } else if (body.eventName.trim().length > EVENT_NAME_MAX) {
    errors.push(`eventName must be ${EVENT_NAME_MAX} characters or fewer`);
  }

  if (body.subtitle !== undefined && body.subtitle !== null) {
    if (typeof body.subtitle !== 'string') {
      errors.push('subtitle must be a string');
    } else if (body.subtitle.length > SUBTITLE_MAX) {
      errors.push(`subtitle must be ${SUBTITLE_MAX} characters or fewer`);
    }
  }

  if (body.sponsorText !== undefined && body.sponsorText !== null) {
    if (typeof body.sponsorText !== 'string') {
      errors.push('sponsorText must be a string');
    } else if (body.sponsorText.length > SPONSOR_TEXT_MAX) {
      errors.push(`sponsorText must be ${SPONSOR_TEXT_MAX} characters or fewer`);
    }
  }

  if (body.primaryColor !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(body.primaryColor)) {
      errors.push('primaryColor must be a hex color string (#rrggbb)');
    }
  }

  if (body.secondaryColor !== undefined) {
    if (!/^#[0-9a-fA-F]{6}$/.test(body.secondaryColor)) {
      errors.push('secondaryColor must be a hex color string (#rrggbb)');
    }
  }

  if (body.logoOpacity !== undefined) {
    const op = Number(body.logoOpacity);
    if (isNaN(op) || op < 0 || op > 1) {
      errors.push('logoOpacity must be a number between 0 and 1');
    }
  }

  if (body.logoMaxHeight !== undefined) {
    const h = Number(body.logoMaxHeight);
    if (isNaN(h) || h <= 0 || h > LOGO_MAX_HEIGHT_CAP) {
      errors.push(`logoMaxHeight must be a positive number up to ${LOGO_MAX_HEIGHT_CAP}`);
    }
  }

  if (body.logoCorner !== undefined) {
    if (!VALID_CORNERS.has(body.logoCorner)) {
      errors.push(`logoCorner must be one of: ${[...VALID_CORNERS].join(', ')}`);
    }
  }

  return errors;
}

// ── Routes ────────────────────────────────────────────────────────────────────

const router = express.Router();

// GET /api/brands
router.get('/', (_req, res) => {
  res.json([...brandsMap.values()]);
});

// GET /api/brands/:id
router.get('/:id', (req, res) => {
  const brand = brandsMap.get(req.params.id);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  res.json(brand);
});

// POST /api/brands
// isDefault is ALWAYS set to false — body.isDefault is never used (Invariant 2).
router.post('/', (req, res) => {
  const errors = validateBody(req.body);

  let id = req.body.id;
  if (id !== undefined) {
    if (!isValidId(id)) {
      errors.push('id must be a non-empty lowercase alphanumeric string (hyphens/underscores allowed)');
    }
  } else {
    id = randomUUID();
  }

  if (errors.length) return res.status(400).json({ error: errors.join('; '), errors });

  if (brandsMap.has(id)) {
    return res.status(409).json({ error: `Brand '${id}' already exists` });
  }

  const now = new Date().toISOString();
  const brand = {
    id,
    name: req.body.name.trim(),
    eventName: req.body.eventName.trim(),
    subtitle: (req.body.subtitle ?? '').trim(),
    primaryColor: req.body.primaryColor ?? '#000000',
    secondaryColor: req.body.secondaryColor ?? '#ffffff',
    sponsorText: (req.body.sponsorText ?? '').trim(),
    logoFile: null,
    isDefault: false, // Invariant 2: body.isDefault is never read here
    logoMaxHeight: req.body.logoMaxHeight !== undefined ? Number(req.body.logoMaxHeight) : 90,
    logoOpacity: req.body.logoOpacity !== undefined ? Number(req.body.logoOpacity) : 0.9,
    logoCorner: req.body.logoCorner ?? 'bottom-right',
    createdAt: now,
    updatedAt: now,
  };

  atomicWriteJson(filePath(id), brand);
  brandsMap.set(id, brand);
  res.status(201).json(brand);
});

// PUT /api/brands/:id
// existing.isDefault is preserved — body.isDefault is never used (Invariant 2).
router.put('/:id', (req, res) => {
  const existing = brandsMap.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Brand not found' });

  const errors = validateBody(req.body);
  if (errors.length) return res.status(400).json({ error: errors.join('; '), errors });

  const now = new Date().toISOString();
  const brand = {
    ...existing,
    name: req.body.name.trim(),
    eventName: req.body.eventName.trim(),
    subtitle: req.body.subtitle !== undefined ? String(req.body.subtitle).trim() : existing.subtitle,
    primaryColor: req.body.primaryColor ?? existing.primaryColor,
    secondaryColor: req.body.secondaryColor ?? existing.secondaryColor,
    sponsorText: req.body.sponsorText !== undefined ? String(req.body.sponsorText).trim() : existing.sponsorText,
    logoMaxHeight: req.body.logoMaxHeight !== undefined ? Number(req.body.logoMaxHeight) : existing.logoMaxHeight,
    logoOpacity: req.body.logoOpacity !== undefined ? Number(req.body.logoOpacity) : existing.logoOpacity,
    logoCorner: req.body.logoCorner ?? existing.logoCorner,
    isDefault: existing.isDefault, // Invariant 2: body.isDefault is never read here
    updatedAt: now,
  };

  atomicWriteJson(filePath(req.params.id), brand);
  brandsMap.set(req.params.id, brand);
  res.json(brand);
});

// DELETE /api/brands/:id
// Returns 403 if the brand is a default (Invariant 3).
router.delete('/:id', (req, res) => {
  const brand = brandsMap.get(req.params.id);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  if (brand.isDefault) {
    return res.status(403).json({ error: 'Cannot delete a default brand' });
  }

  if (brand.logoFile) {
    const logoPath = join(LOGO_DIR, brand.logoFile);
    if (existsSync(logoPath)) unlinkSync(logoPath);
  }

  const path = filePath(req.params.id);
  if (existsSync(path)) unlinkSync(path);
  brandsMap.delete(req.params.id);
  res.status(204).send();
});

// ── Logo routes ───────────────────────────────────────────────────────────────

// GET /api/brands/:id/logo — serve the logo file
router.get('/:id/logo', (req, res) => {
  const brand = brandsMap.get(req.params.id);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  if (!brand.logoFile) return res.status(404).json({ error: 'No logo' });
  if (!isSafeAssetFilename(brand.logoFile)) return res.status(404).json({ error: 'Logo file missing' });

  const logoPath = join(LOGO_DIR, brand.logoFile);
  if (!existsSync(logoPath)) return res.status(404).json({ error: 'Logo file missing' });

  const ext = extname(brand.logoFile).slice(1).toLowerCase();
  res.setHeader('Content-Type', IMAGE_MIME[ext] || 'application/octet-stream');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const stream = createReadStream(logoPath);
  stream.on('error', () => {
    if (!res.headersSent) res.status(500).json({ error: 'Failed to read logo' });
  });
  stream.pipe(res);
});

// POST /api/brands/:id/logo — upload logo (multipart/form-data, field name: logo)
router.post('/:id/logo', (req, res, next) => {
  upload.single('logo')(req, res, (err) => {
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
  const brand = brandsMap.get(req.params.id);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });
  if (!req.file) return res.status(400).json({ error: 'No file uploaded (field name: logo)' });

  // Magic-byte check is authoritative — ignores the client-supplied Content-Type header.
  const detectedType = detectMagicType(req.file.buffer);
  if (!detectedType) {
    return res.status(400).json({ error: 'File type not allowed. Upload PNG, JPEG, or WebP only.' });
  }

  const ext = detectedType === 'image/png' ? 'png' : detectedType === 'image/webp' ? 'webp' : 'jpg';
  const filename = `${brand.id}.${ext}`;
  const logoPath = join(LOGO_DIR, filename);

  // Delete old logo file if it had a different name (e.g. jpg → png swap).
  if (brand.logoFile && brand.logoFile !== filename) {
    const oldPath = join(LOGO_DIR, brand.logoFile);
    if (existsSync(oldPath)) unlinkSync(oldPath);
  }

  writeFileSync(logoPath, req.file.buffer);

  const updatedBrand = { ...brand, logoFile: filename, updatedAt: new Date().toISOString() };
  atomicWriteJson(filePath(brand.id), updatedBrand);
  brandsMap.set(brand.id, updatedBrand);

  res.json({ logoFile: filename });
});

// DELETE /api/brands/:id/logo — remove logo
router.delete('/:id/logo', (req, res) => {
  const brand = brandsMap.get(req.params.id);
  if (!brand) return res.status(404).json({ error: 'Brand not found' });

  if (brand.logoFile) {
    const logoPath = join(LOGO_DIR, brand.logoFile);
    if (existsSync(logoPath)) unlinkSync(logoPath);
  }

  const updatedBrand = { ...brand, logoFile: null, updatedAt: new Date().toISOString() };
  atomicWriteJson(filePath(brand.id), updatedBrand);
  brandsMap.set(brand.id, updatedBrand);

  res.status(204).send();
});

// ── Admin: promote / demote / export-seed ────────────────────────────────────
// Guarded admin-only via ROUTE_POLICY in guards.js (the CRUD + logo routes above are operator+).

attachPromoteExport(router, {
  getRecord: (id) => brandsMap.get(id),
  saveRecord: (record) => {
    atomicWriteJson(filePath(record.id), record);
    brandsMap.set(record.id, record);
  },
  exportSeed: (_req, res, record) => {
    const seed = { ...record };
    if (record.logoFile) {
      seed._logoAssetRelPath = `server/data/brand-logos/${record.logoFile}`;
    }
    res.json(seed);
  },
});

export default router;
