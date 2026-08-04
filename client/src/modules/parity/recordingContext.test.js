// ============================================================
// File:        recordingContext.test.js
// Project:     RaceArena — RENDER-FINGERPRINT-1
//
// WHAT THESE GUARANTEE: the properties `scripts/render-fingerprint.mjs` rests on. The script's own
// stability and sensitivity proofs test the WHOLE instrument end to end; these test the recorder
// itself, where a defect would be silent — a hash that does not move looks exactly like a picture
// that did not change.
//
// The sprite case is here for a specific reason. The harness records ZERO `drawImage` calls, because
// node has no `Image` and the sprite cache never fills. So nothing in the ten-track run exercises
// image recording at all, and without these tests that path would be dead code that only ships when
// somebody one day runs the fingerprint in a browser.
// ============================================================

import { describe, it, expect } from 'vitest';
import { createRecordingContext } from './recordingContext.js';
import { createHash, hashString } from './hashing.js';

const digestOf = (draw) => {
  const ctx = createRecordingContext();
  draw(ctx);
  return ctx.digest();
};

describe('recordingContext — what moves the digest', () => {
  it('is deterministic: the same calls twice give the same digest', () => {
    const draw = (ctx) => {
      ctx.fillStyle = '#abc';
      ctx.fillRect(1, 2, 3, 4);
      ctx.fillText('hello', 5, 6);
    };
    expect(digestOf(draw)).toBe(digestOf(draw));
  });

  it('a ONE PIXEL move changes it', () => {
    expect(digestOf((c) => c.fillRect(10, 10, 5, 5))).not.toBe(
      digestOf((c) => c.fillRect(11, 10, 5, 5))
    );
  });

  it('ORDER changes it, with every argument identical', () => {
    // The property the whole instrument rests on: two layers swapped is a different picture.
    const a = digestOf((c) => {
      c.fillRect(0, 0, 1, 1);
      c.fillRect(9, 9, 1, 1);
    });
    const b = digestOf((c) => {
      c.fillRect(9, 9, 1, 1);
      c.fillRect(0, 0, 1, 1);
    });
    expect(a).not.toBe(b);
  });

  it('a changed STYLE changes it even when the geometry is identical', () => {
    expect(
      digestOf((c) => {
        c.fillStyle = '#fff';
        c.fillRect(0, 0, 1, 1);
      })
    ).not.toBe(
      digestOf((c) => {
        c.fillStyle = '#000';
        c.fillRect(0, 0, 1, 1);
      })
    );
  });

  it('a dropped call changes it — one fewer name tag is visible', () => {
    expect(
      digestOf((c) => {
        c.fillText('a', 0, 0);
        c.fillText('b', 0, 0);
      })
    ).not.toBe(digestOf((c) => c.fillText('a', 0, 0)));
  });

  it('a changed globalAlpha changes it — this is how the battle darkening is seen', () => {
    expect(
      digestOf((c) => {
        c.globalAlpha = 1;
        c.fillRect(0, 0, 1, 1);
      })
    ).not.toBe(
      digestOf((c) => {
        c.globalAlpha = 0.35;
        c.fillRect(0, 0, 1, 1);
      })
    );
  });

  it('gradients are recorded by their stops, not by object identity', () => {
    const withStops = (stop) => (c) => {
      const g = c.createLinearGradient(0, 0, 10, 10);
      g.addColorStop(0, '#000');
      g.addColorStop(1, stop);
      c.fillStyle = g;
      c.fillRect(0, 0, 10, 10);
    };
    expect(digestOf(withStops('#fff'))).toBe(digestOf(withStops('#fff')));
    expect(digestOf(withStops('#fff'))).not.toBe(digestOf(withStops('#eee')));
  });
});

describe('recordingContext — sprites, which the ten-track harness never reaches', () => {
  it('records a sprite by src, so the same sprite twice reads the same', () => {
    const img = { src: 'horse.png' };
    expect(digestOf((c) => c.drawImage(img, 0, 0, 10, 10))).toBe(
      digestOf((c) => c.drawImage({ src: 'horse.png' }, 0, 0, 10, 10))
    );
  });

  it('a DIFFERENT sprite at the same place changes the digest', () => {
    expect(digestOf((c) => c.drawImage({ src: 'horse.png' }, 0, 0))).not.toBe(
      digestOf((c) => c.drawImage({ src: 'rocket.png' }, 0, 0))
    );
  });

  it('the same sprite at a different SIZE changes the digest', () => {
    expect(digestOf((c) => c.drawImage({ src: 'a.png' }, 0, 0, 10, 10))).not.toBe(
      digestOf((c) => c.drawImage({ src: 'a.png' }, 0, 0, 11, 10))
    );
  });

  it('is blind to the ARTWORK — same src, different pixels, same digest', () => {
    // Stated as a test rather than only in prose, because it is the limitation most likely to be
    // forgotten: redraw a rocket and this instrument says nothing changed. That is correct, and the
    // owner's eye is the instrument for it.
    expect(digestOf((c) => c.drawImage({ src: 'a.png', pixels: 'OLD' }, 0, 0))).toBe(
      digestOf((c) => c.drawImage({ src: 'a.png', pixels: 'NEW' }, 0, 0))
    );
  });
});

describe('recordingContext — what deliberately does NOT move the digest', () => {
  it('measureText is a question, not a mark', () => {
    expect(
      digestOf((c) => {
        c.font = '10px x';
        c.measureText('aaaaaaaa');
        c.fillText('a', 0, 0);
      })
    ).toBe(
      digestOf((c) => {
        c.font = '10px x';
        c.fillText('a', 0, 0);
      })
    );
  });

  it('the synthetic metric is deterministic and grows with length and font size', () => {
    const ctx = createRecordingContext();
    ctx.font = '10px sans-serif';
    const one = ctx.measureText('a').width;
    const two = ctx.measureText('aa').width;
    expect(two).toBeGreaterThan(one);
    ctx.font = '20px sans-serif';
    expect(ctx.measureText('a').width).toBeGreaterThan(one);
    expect(ctx.measureText('a').width).toBe(ctx.measureText('a').width);
  });
});

describe('hashing — the digest under the recorder', () => {
  it('is stable across chunk boundaries: one update or many gives the same value', () => {
    const whole = createHash();
    whole.update('abcdef');
    const split = createHash();
    for (const ch of 'abcdef') split.update(ch);
    expect(split.digest()).toBe(whole.digest());
  });

  it('detects a REORDER of equal-length chunks', () => {
    expect(hashString('abcdef')).not.toBe(hashString('defabc'));
  });

  it('detects a single changed character anywhere in a long stream', () => {
    const base = 'x'.repeat(5000);
    const changed = base.slice(0, 2500) + 'y' + base.slice(2501);
    expect(hashString(changed)).not.toBe(hashString(base));
  });

  it('is 16 hex characters', () => {
    expect(hashString('anything')).toMatch(/^[0-9a-f]{16}$/);
  });
});
