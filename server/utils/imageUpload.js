// ============================================================
// File:        imageUpload.js
// Path:        server/utils/imageUpload.js
// Project:     RaceArena
// Description: Shared image upload helper — magic-byte detection, MIME/type
//              constants, and a configurable multer upload factory.
//              Consumed by brands.js (D3). tracks.js retains its own inline
//              copy pending a dedicated cleanup step (SPEC D3 HYGIENE note).
// ============================================================

import multer from 'multer';

export const IMAGE_MIME = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
};

export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Detect image type from magic bytes — ignores the user-supplied Content-Type header.
 * Returns the detected MIME type string, or null if not a recognized image.
 */
export function detectMagicType(buf) {
  if (!buf || buf.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) return 'image/png';
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // WebP: RIFF????WEBP
  if (
    buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
    buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
  ) return 'image/webp';
  return null;
}

/**
 * Creates a configured multer instance with memory storage, a file-size limit,
 * and a MIME-type pre-filter (magic-byte check in the route handler is authoritative).
 * @param {{ maxBytes?: number }} opts
 * @returns {import('multer').Multer}
 */
export function createUpload({ maxBytes = MAX_IMAGE_BYTES } = {}) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxBytes },
    fileFilter(_req, file, cb) {
      if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(Object.assign(new Error('INVALID_TYPE'), { code: 'INVALID_TYPE' }));
      }
    },
  });
}
