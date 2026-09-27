// ============================================================
// File:        server/src/routes/uploadBoundsAgreement.audit.test.js
// Project:     RaceArena — DELIVERY-CLEAN-2 arc 1, piece 1.4
// Created:     2026-09-27
//
// ★ WHAT THIS OWNS: keeping the three upload error handlers IN AGREEMENT until the owner's decision
// of 2026-09-27 — merge them into one — is carried out. That merge touches live request handling
// and is commissioned work; this test is the holding measure so the claim "uploads are bounded"
// stays true of all three routes and not just the one somebody last edited.
//
// ★★ AND IT CORRECTS THE FINDING IT COMES FROM. DELIVERY-CLEAN-1's B7 says "the upload
// size-and-type BOUND exists in three copies". Measured at the tree 2026-09-27, that is not right:
// the bound is already single-homed in `server/utils/imageUpload.js` —
//   :21  MAX_IMAGE_BYTES = 10 MB
//   :19  ALLOWED_IMAGE_TYPES = image/jpeg, image/png, image/webp
//   :50  createUpload({ maxBytes = MAX_IMAGE_BYTES })
//   :58  raises code 'INVALID_TYPE'
// and `brands.js`, `racers.js` and `tracks.js` all import it and all call
// `createUpload({ maxBytes: MAX_IMAGE_BYTES })`. **The limit and the type list cannot drift.**
//
// What IS triplicated is the ERROR RESPONSE — the 413/400 status codes and the two message strings
// at `brands.js:314`, `racers.js:281` and `tracks.js:595`. So the real risk is narrower than B7
// states: not that one route accepts a bigger file, but that one route answers a violation
// DIFFERENTLY. That is what this test pins.
//
// ★ WHY IT READS SOURCE TEXT RATHER THAN DRIVING THE ROUTES. Driving them would need three
// multipart uploads against three different stores and would assert the handlers' behaviour one
// route at a time; the property under test is that the three are THE SAME, which is a statement
// about the three together. Reading the blocks compares them directly and fails loudly when one is
// edited alone. The cost is that it is coupled to the text: a harmless reformat reddens it. That is
// deliberate — a reformat of one copy and not the others is exactly the drift this exists to catch,
// and the fix is to make the three agree again or to do the merge.
//
// ★ WHEN THE MERGE HAPPENS, THIS TEST IS EXPECTED TO GO RED AND SHOULD BE DELETED, not repaired:
// once there is one handler there is nothing to keep in agreement. Named here so a future reader
// does not try to preserve it.
// ============================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const UTILS = join(HERE, '..', '..', 'utils', 'imageUpload.js');

/** The three routes that accept an image upload, and the multer field each uses. */
const ROUTES = [
  { file: 'brands.js', field: 'logo' },
  { file: 'racers.js', field: 'sprite' },
  { file: 'tracks.js', field: 'background' },
];

const read = (f) => readFileSync(join(HERE, f), 'utf8');

/**
 * Pull the upload error-handling block out of a route file: from `upload.single('<field>')` to the
 * `next();` that closes it. Returns the block with its own field name removed, so three blocks that
 * differ only by field name compare equal.
 */
function extractHandler(src, field) {
  const start = src.indexOf(`upload.single('${field}')`);
  if (start === -1) return null;
  const end = src.indexOf('next();', start);
  if (end === -1) return null;
  return src.slice(start, end).replace(`'${field}'`, "'<field>'").replace(/\s+/g, ' ').trim();
}

describe('upload bounds — the three routes must agree (DELIVERY-CLEAN-2 arc 1, piece 1.4)', () => {
  it('the bound itself is single-homed in utils/imageUpload.js', () => {
    const utils = readFileSync(UTILS, 'utf8');
    expect(utils).toMatch(/export const MAX_IMAGE_BYTES\s*=/);
    expect(utils).toMatch(/export const ALLOWED_IMAGE_TYPES\s*=/);
    expect(utils).toMatch(/export function createUpload/);
  });

  it('all three routes take the limit from that one home, not a literal of their own', () => {
    for (const { file } of ROUTES) {
      const src = read(file);
      expect(src, `${file} must import MAX_IMAGE_BYTES`).toMatch(/MAX_IMAGE_BYTES/);
      expect(src, `${file} must build its uploader from createUpload`).toMatch(
        /createUpload\(\{\s*maxBytes:\s*MAX_IMAGE_BYTES\s*\}\)/
      );
      // A route that hardcoded its own megabyte figure would defeat the shared bound.
      expect(src, `${file} must not hardcode a byte limit`).not.toMatch(
        /maxBytes:\s*\d+\s*\*\s*1024/
      );
    }
  });

  it('★ the three error handlers are identical apart from the field name', () => {
    const blocks = ROUTES.map(({ file, field }) => {
      const block = extractHandler(read(file), field);
      expect(block, `no upload.single('${field}') handler found in ${file}`).toBeTruthy();
      return { file, block };
    });

    const [first, ...rest] = blocks;
    for (const other of rest) {
      expect(
        other.block,
        `${other.file}'s upload error handler has drifted from ${first.file}'s. ` +
          'Either bring them back into agreement, or do the merge the owner commissioned on ' +
          '2026-09-27 and delete this test.'
      ).toBe(first.block);
    }
  });

  it('every copy still answers 413 for size and 400 for type', () => {
    for (const { file, field } of ROUTES) {
      const block = extractHandler(read(file), field);
      expect(block, `${file}: LIMIT_FILE_SIZE must answer 413`).toMatch(
        /LIMIT_FILE_SIZE[\s\S]*?status\(413\)/
      );
      expect(block, `${file}: INVALID_TYPE must answer 400`).toMatch(
        /INVALID_TYPE[\s\S]*?status\(400\)/
      );
    }
  });
});
