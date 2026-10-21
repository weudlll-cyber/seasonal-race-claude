// ============================================================
// File:        qrImage.test.js
// Path:        client/src/modules/registration/qrImage.test.js
// Project:     RaceArena — REGISTRATION-1 (follow-up 1)
// Description: The QR code as data and as a picture: the matrix carries a white four-module quiet
//              zone and the standard finder pattern; the PNG is at least 512 px with whole pixels per
//              module; the file is named after the event or the track; copying says false where the
//              browser has no image clipboard. (Drawing the PNG itself needs a real canvas; the
//              browser playthrough decodes a downloaded one.)
// ============================================================

import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  MIN_PNG_PX,
  QUIET_ZONE,
  canCopyImage,
  copyQrImage,
  pngScale,
  qrFileName,
  qrMatrix,
} from './qrImage.js';

const LINK = 'http://localhost:4173/join/Ab3_-xYz0123456789AbCd';

describe('qrMatrix', () => {
  it('a white quiet zone of four modules on every side', () => {
    const { size, dark } = qrMatrix(LINK);
    for (let i = 0; i < size; i++) {
      for (let q = 0; q < QUIET_ZONE; q++) {
        expect(dark(i, q) || dark(q, i) || dark(i, size - 1 - q) || dark(size - 1 - q, i)).toBe(
          false
        );
      }
    }
  });

  it('the finder pattern just inside it: a dark 7 x 7 ring with a light ring and a dark centre', () => {
    const { dark } = qrMatrix(LINK);
    const at = (x, y) => dark(QUIET_ZONE + x, QUIET_ZONE + y);
    expect(at(0, 0) && at(6, 0) && at(0, 6) && at(6, 6)).toBe(true);
    expect(at(1, 1) || at(5, 1) || at(1, 5)).toBe(false);
    expect(at(2, 2) && at(3, 3) && at(4, 4)).toBe(true);
  });
});

describe('the PNG', () => {
  it('is at least 512 px, with whole pixels per module', () => {
    const { size } = qrMatrix(LINK);
    const scale = pngScale(size);
    expect(Number.isInteger(scale)).toBe(true);
    expect(size * scale).toBeGreaterThanOrEqual(MIN_PNG_PX);
    expect(size * (scale - 1)).toBeLessThan(MIN_PNG_PX);
  });

  it('is named after the event, else the track', () => {
    expect(qrFileName('Friday Cup #2', 'Dirt Oval')).toBe('racearena-join-friday-cup-2.png');
    expect(qrFileName(null, 'Dirt Oval')).toBe('racearena-join-dirt-oval.png');
    expect(qrFileName('', '')).toBe('racearena-join-registration.png');
  });
});

describe('copying', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('says false where the browser has no image clipboard', async () => {
    vi.stubGlobal('ClipboardItem', undefined);
    expect(canCopyImage()).toBe(false);
    expect(await copyQrImage(LINK)).toBe(false);
  });
});
