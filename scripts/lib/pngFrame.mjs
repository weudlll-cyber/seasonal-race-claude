// ============================================================
// File:        scripts/lib/pngFrame.mjs
// Project:     RaceArena
// Description: CAMERA-REPRO-1 — the smallest thing that can turn a camera frame into a picture.
//              Pure Node (zlib only): an RGB PNG encoder plus the four primitives a framing view
//              needs (line, circle, rect outline, cross). No sprites, no art — this draws WHERE
//              things are on screen, which is the question a camera frame answers.
//
//              Kept separate from camera-replay.mjs so the replay script reads as replay logic and
//              nothing else.
// ============================================================

import { deflateSync } from 'node:zlib';

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.allocUnsafe(4);
  crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}

/** A drawable RGB surface. */
export class Frame {
  constructor(w, h, bg = [14, 8, 22]) {
    this.w = w;
    this.h = h;
    this.buf = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      this.buf[i * 3] = bg[0];
      this.buf[i * 3 + 1] = bg[1];
      this.buf[i * 3 + 2] = bg[2];
    }
  }

  px(x, y, c) {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 3;
    this.buf[i] = c[0];
    this.buf[i + 1] = c[1];
    this.buf[i + 2] = c[2];
  }

  line(x0, y0, x1, y1, c) {
    // Reject segments that are wildly off-canvas: at high zoom a track edge can project to
    // millions of pixels and Bresenham would walk every one of them.
    const LIMIT = 1e5;
    if (![x0, y0, x1, y1].every((v) => Number.isFinite(v) && Math.abs(v) < LIMIT)) return;
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  circle(cx, cy, r, c) {
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) return;
    const r2 = r * r;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r2) this.px(cx + dx, cy + dy, c);
      }
    }
  }

  rect(x0, y0, x1, y1, c) {
    this.line(x0, y0, x1, y0, c);
    this.line(x1, y0, x1, y1, c);
    this.line(x1, y1, x0, y1, c);
    this.line(x0, y1, x0, y0, c);
  }

  cross(cx, cy, size, c) {
    this.line(cx - size, cy, cx + size, cy, c);
    this.line(cx, cy - size, cx, cy + size, c);
  }

  /** Encode to PNG bytes. */
  toPng() {
    const rowBytes = this.w * 3;
    const raw = Buffer.allocUnsafe(this.h * (rowBytes + 1));
    for (let y = 0; y < this.h; y++) {
      raw[y * (rowBytes + 1)] = 0; // filter: None
      for (let x = 0; x < rowBytes; x++) {
        raw[y * (rowBytes + 1) + 1 + x] = this.buf[y * rowBytes + x];
      }
    }
    const ihdr = Buffer.allocUnsafe(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 2; // colour type: RGB
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;
    return Buffer.concat([
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
      chunk('IHDR', ihdr),
      chunk('IDAT', deflateSync(raw, { level: 6 })),
      chunk('IEND', Buffer.alloc(0)),
    ]);
  }
}
