// ============================================================
// File:        uploadErrorResponse.test.js
// Path:        server/src/routes/uploadErrorResponse.test.js
// Project:     RaceArena — DELIVERY-CLEAN-3 piece 2 (P2 / B7)
// Created:     2026-09-27
//
// WHAT THIS OWNS: proving that the three image-upload routes answer a rejected upload with ONE
// response, now that they share one middleware.
//
// ── WHY IT REPLACES A TEST RATHER THAN JOINING ONE ──────────────────────────────────────────────
//
// It supersedes `uploadBoundsAgreement.audit.test.js`, which DELIVERY-CLEAN-2 arc 1 wrote to hold
// the three hand-written copies in agreement until they could be unified. That test compared the
// three handlers AS SOURCE TEXT, and said in its own header that it was expected to go red and be
// deleted the day the merge happened — which is exactly what it did. It is deleted, not repaired:
// once there is one handler there is nothing to keep in agreement.
//
// ★ AND THIS IS STRICTLY BETTER EVIDENCE. The old test proved three pieces of text matched. This
// one DRIVES all three routes and compares what a caller actually receives — status and body — so
// it would catch a divergence the text comparison could not, such as one route wrapped in a
// different error handler.
//
// ── WHAT IS REUSED, NAMED RATHER THAN REBUILT ───────────────────────────────────────────────────
//
// `adminAgent` from `test/authAgent.js` and `createApp` from `src/app.js` — the same pair every
// route test here uses. The magic-byte buffer idea is `brands.test.js`'s.
//
// ★ A NONEXISTENT ENTITY ID IS USED ON PURPOSE. In all three routes the upload middleware runs
// BEFORE the entity lookup (`brands.js:314-317`, `racers.js:281-284`, `tracks.js:595-598`), so a
// rejected upload is answered by the middleware and never reaches the 404. That lets the error
// paths be driven without creating and cleaning up three entities — and it also pins that
// ordering: if a route were reordered to check existence first, these tests would see 404 and fail.
// ============================================================

import { describe, it, expect, beforeAll } from 'vitest';
import { adminAgent } from '../../test/authAgent.js';
import { createApp } from '../app.js';
import { MAX_IMAGE_BYTES } from '../../utils/imageUpload.js';

const app = createApp();
let admin;

beforeAll(async () => {
  admin = await adminAgent(app);
});

/** The three routes that accept an image, and the multipart field each expects. */
const ROUTES = [
  { path: '/api/brands/no-such-id/logo', field: 'logo' },
  { path: '/api/racers/no-such-id/sprite', field: 'sprite' },
  { path: '/api/tracks/no-such-id/background', field: 'background' },
];

/** A buffer one byte over the shared limit — the limit itself is never restated here. */
const OVERSIZED = Buffer.alloc(MAX_IMAGE_BYTES + 1, 0x41);

describe('upload errors — the three routes answer with ONE response (P2)', () => {
  it('★ a file over the limit: every route answers 413 with the same body', async () => {
    const answers = [];
    for (const { path, field } of ROUTES) {
      const res = await admin
        .post(path)
        .attach(field, OVERSIZED, { filename: 'big.jpg', contentType: 'image/jpeg' });
      expect(res.status, `${path} should answer 413`).toBe(413);
      answers.push(JSON.stringify(res.body));
    }
    // The property under test is not "each is 413" but "all three are the SAME".
    expect(new Set(answers).size, `three different bodies: ${answers.join(' | ')}`).toBe(1);
    expect(JSON.parse(answers[0]).error).toMatch(/File too large/);
  });

  it('★ a disallowed type: every route answers 400 with the same body', async () => {
    const answers = [];
    for (const { path, field } of ROUTES) {
      const res = await admin.post(path).attach(field, Buffer.from('not an image'), {
        filename: 'x.txt',
        contentType: 'text/plain',
      });
      expect(res.status, `${path} should answer 400`).toBe(400);
      answers.push(JSON.stringify(res.body));
    }
    expect(new Set(answers).size, `three different bodies: ${answers.join(' | ')}`).toBe(1);
    expect(JSON.parse(answers[0]).error).toMatch(/File type not allowed/);
  });

  // AUDIT-1 A5M-04: anything beyond the ONE file part is refused by the middleware. Unbounded, it
  // would pass through to the entity lookup and answer 404 — which is what makes this distinguishable.
  it('★ a text field beside the image, or a second file: every route answers 400', async () => {
    const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const opts = { filename: 'x.png', contentType: 'image/png' };
    for (const { path, field } of ROUTES) {
      const withField = await admin
        .post(path)
        .field('extra', 'x'.repeat(1000))
        .attach(field, PNG, opts);
      expect(withField.status, `${path} with a text field`).toBe(400);
      expect(withField.body.error).toBe('File upload failed.');
      const twoFiles = await admin.post(path).attach(field, PNG, opts).attach(field, PNG, opts);
      expect(twoFiles.status, `${path} with two files`).toBe(400);
    }
  });

  it('the size message names the limit from the one home, not a hardcoded number', async () => {
    const res = await admin
      .post(ROUTES[0].path)
      .attach(ROUTES[0].field, OVERSIZED, { filename: 'big.jpg', contentType: 'image/jpeg' });
    expect(res.body.error).toContain(`${MAX_IMAGE_BYTES / 1024 / 1024} MB`);
  });
});
