// ============================================================
// File:        hashing.js
// Path:        client/src/modules/parity/hashing.js
// Project:     RaceArena — RENDER-FINGERPRINT-1
//
// WHAT THIS IS FOR: a streaming, environment-independent digest for CHANGE DETECTION — feed it
// strings, get a stable 64-bit hex value. Used by the recording context so a draw-call stream can
// be reduced to one comparable number without holding the whole stream in memory.
//
// WHAT IT IS NOT FOR: anything adversarial. This is FNV-1a on two lanes, not a cryptographic hash;
// it detects accidental change, which is the whole job. Do not use it where somebody might be
// trying to collide it.
//
// WHY NOT `node:crypto`. This module lives under `client/src` and must run unchanged in node, in
// vitest and in a browser. A pure-JS hash has no import that only exists in one of those, and a
// digest that is identical everywhere is the point of the exercise.
// ============================================================

// Two independent FNV-1a lanes, different offset bases, concatenated into 64 bits.
const OFFSET_A = 0x811c9dc5;
const OFFSET_B = 0x01000193;
const PRIME = 0x01000193;

/**
 * A streaming digest. `update()` as often as you like, `digest()` when done.
 * @returns {{update:(s:string)=>void, digest:()=>string}}
 */
export function createHash() {
  let a = OFFSET_A >>> 0;
  let b = OFFSET_B >>> 0;
  let pos = 0; // position in the WHOLE stream, not in this chunk — see the note below
  return {
    update(s) {
      const str = String(s);
      for (let i = 0; i < str.length; i++) {
        const c = str.charCodeAt(i);
        a = Math.imul(a ^ c, PRIME) >>> 0;
        // The second lane mixes the character's position in the whole stream. FNV alone is already
        // order-sensitive; this makes the digest additionally sensitive to WHERE a byte sits, which
        // is cheap insurance for an instrument whose entire job is pinning a sequence. `pos` must
        // therefore run across update() calls — a per-chunk index would make the claim false.
        b = Math.imul(b ^ ((c + pos) & 0xffff), PRIME) >>> 0;
        pos++;
      }
    },
    digest() {
      return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
    },
  };
}

/** One-shot digest of a string. */
export function hashString(s) {
  const h = createHash();
  h.update(s);
  return h.digest();
}
