// ============================================================
// File:        imageUpload.test.js
// Path:        server/utils/imageUpload.test.js
// Project:     RaceArena
// Description: Unit tests for the shared imageUpload helper.
// ============================================================

import { describe, it, expect } from 'vitest';
import { detectMagicType, ALLOWED_IMAGE_TYPES, IMAGE_MIME, MAX_IMAGE_BYTES } from './imageUpload.js';

describe('detectMagicType', () => {
  it('detects JPEG from FF D8 FF magic bytes', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(detectMagicType(buf)).toBe('image/jpeg');
  });

  it('detects PNG from magic bytes', () => {
    const buf = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(detectMagicType(buf)).toBe('image/png');
  });

  it('detects WebP from RIFF????WEBP magic bytes', () => {
    const buf = Buffer.alloc(12);
    buf[0] = 0x52; buf[1] = 0x49; buf[2] = 0x46; buf[3] = 0x46; // RIFF
    buf[4] = 0x00; buf[5] = 0x00; buf[6] = 0x00; buf[7] = 0x00; // file size
    buf[8] = 0x57; buf[9] = 0x45; buf[10] = 0x42; buf[11] = 0x50; // WEBP
    expect(detectMagicType(buf)).toBe('image/webp');
  });

  it('returns null for plain text content (non-image)', () => {
    const buf = Buffer.from('This is not an image at all.');
    expect(detectMagicType(buf)).toBeNull();
  });

  it('returns null for null input', () => {
    expect(detectMagicType(null)).toBeNull();
  });

  it('returns null for a buffer shorter than 12 bytes', () => {
    expect(detectMagicType(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it('returns null for a GIF (not in allowed set)', () => {
    const buf = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
    expect(detectMagicType(buf)).toBeNull();
  });
});

describe('ALLOWED_IMAGE_TYPES', () => {
  it('contains jpeg, png, and webp', () => {
    expect(ALLOWED_IMAGE_TYPES.has('image/jpeg')).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has('image/png')).toBe(true);
    expect(ALLOWED_IMAGE_TYPES.has('image/webp')).toBe(true);
  });

  it('does not contain gif or bmp', () => {
    expect(ALLOWED_IMAGE_TYPES.has('image/gif')).toBe(false);
    expect(ALLOWED_IMAGE_TYPES.has('image/bmp')).toBe(false);
  });
});

describe('IMAGE_MIME', () => {
  it('maps jpg and jpeg to image/jpeg', () => {
    expect(IMAGE_MIME.jpg).toBe('image/jpeg');
    expect(IMAGE_MIME.jpeg).toBe('image/jpeg');
  });

  it('maps png to image/png', () => {
    expect(IMAGE_MIME.png).toBe('image/png');
  });
});

describe('MAX_IMAGE_BYTES', () => {
  it('is 10 MB', () => {
    expect(MAX_IMAGE_BYTES).toBe(10 * 1024 * 1024);
  });
});
