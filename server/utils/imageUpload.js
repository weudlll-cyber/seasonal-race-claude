// ============================================================
// File:        imageUpload.js
// Path:        server/utils/imageUpload.js
// Project:     RaceArena
// Description: Shared image upload helper — magic-byte detection, MIME/type
//              constants, and a configurable multer upload factory.
//              Consumed by brands.js, racers.js, and tracks.js.
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
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  )
    return 'image/png';
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // WebP: RIFF????WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  )
    return 'image/webp';
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
    // ONE file part and nothing else — all three clients send exactly that (brandApi.js,
    // racerApi.js, trackApi.js). busboy's own defaults leave the field and part counts UNBOUNDED,
    // all held in memory, so a signed-in caller could stream any number of 1 MB text fields
    // alongside an image (AUDIT-1 A5M-04). A breach is answered 400 'File upload failed.' below.
    // No `parts`: every part is a file or a field, so these two bound it — and busboy raises
    // `partsLimit` on REACHING the count, so `parts: 1` would refuse the one legitimate file.
    limits: { fileSize: maxBytes, files: 1, fields: 0, headerPairs: 20 },
    fileFilter(_req, file, cb) {
      if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
        cb(null, true);
      } else {
        cb(Object.assign(new Error('INVALID_TYPE'), { code: 'INVALID_TYPE' }));
      }
    },
  });
}

// ── THE ERROR-TO-RESPONSE MAPPING (DELIVERY-CLEAN-3 piece 2, 2026-09-27) ────────────────────────
//
// ★ WHY IT LIVES HERE. This file already owns the BOUND — `MAX_IMAGE_BYTES`, `ALLOWED_IMAGE_TYPES`
// and the `createUpload` filter that raises `INVALID_TYPE`. What it did NOT own was the answer a
// caller gets when that bound is hit, and so the answer was written out three times, identically,
// in `brands.js`, `racers.js` and `tracks.js`. DELIVERY-CLEAN-1 recorded that as B7 and
// DELIVERY-CLEAN-2 arc 1 pinned the three copies in agreement with a test; the owner decided on
// 2026-09-27 to unify them. This is that unification: the rule that RAISES an error and the rule
// that ANSWERS it now sit together, so neither can drift from the other.
//
// ★ IT IS A MIDDLEWARE FACTORY, NOT AN ERROR HANDLER, and the shape is what the routes already
// used: multer's `.single()` is invoked with an explicit callback so a rejection becomes a response
// instead of reaching Express's default error page. Each route was a 19-line anonymous middleware
// doing exactly this; each is now one call.

/**
 * A middleware accepting ONE image upload on `field`, answering upload failures itself.
 *
 * Behaviour is identical to the three hand-written copies it replaces:
 *   LIMIT_FILE_SIZE -> 413 with the limit named in megabytes
 *   INVALID_TYPE    -> 400 naming the accepted types
 *   anything else   -> 400 'File upload failed.'
 *
 * @param {import('multer').Multer} upload  the configured multer instance (see `createUpload`).
 * @param {string} field                    the multipart field name, e.g. 'logo'.
 * @returns {import('express').RequestHandler}
 */
export function uploadSingleImage(upload, field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({
          error: `File too large. Maximum ${MAX_IMAGE_BYTES / 1024 / 1024} MB allowed.`,
        });
      }
      if (err.code === 'INVALID_TYPE') {
        return res
          .status(400)
          .json({ error: 'File type not allowed. Upload PNG, JPEG, or WebP only.' });
      }
      return res.status(400).json({ error: 'File upload failed.' });
    });
  };
}
