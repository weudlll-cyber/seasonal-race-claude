// ============================================================================================
// THE COMMITTED TRACK GEOMETRIES, AND THE WIDTH THE GAME READS OFF THEM.
//
// ── WHAT THIS FILE WAS, AND WHY IT WAS ARMED (CORRIDOR-DIAG-ARMED-1, 2026-08-22) ─────────────
//
// From 2026-05-06 (`d6f4d20e`) until tonight this file held ONE `it()` that printed a table and
// closed with `expect(true).toBe(true)`. It was the only such assertion in the tree. A test that
// cannot fail is not a test (L187), so leaving it was not an option — and it was not deleted,
// because of what the deletion would have cost:
//
//   **NOTHING ELSE IN THE CLIENT SUITE READS THE COMMITTED TRACK GEOMETRIES.** `git grep -l
//   "seeds/tracks" -- 'client/**'` returns this file and one driver script. Every other test that
//   touches `EditorShape` or `computeAutoScaleFactor` builds a SYNTHETIC shape or passes bare
//   numbers — `EditorShape.test.js` and `autoSpriteScale.test.js` both do, thoroughly. So a seed
//   geometry that was corrupted, truncated, or lost its `width` would pass the whole client suite.
//
// So the printing was replaced by the assertions the table existed to let a human make by eye.
// The console table is gone deliberately: it ran on every suite run forever and nobody read it,
// and the numbers it carried are now asserted instead of eyeballed. Each failure message carries
// the offending row, which is the part of the table that was ever worth having.
// ============================================================================================
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { resolve, dirname } from 'path';
import { EditorShape } from '../track-editor/EditorShape.js';
import { computeAutoScaleFactor } from '../autoSpriteScale.js';
import { SAMPLE_TRACKS } from '../../test/fixtures/sampleTracks.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const GEO_DIR = resolve(__dirname, '../../../../server/seeds/tracks'); // Seeds (committed, CI-safe) instead of server/data/** (gitignored) — cf. C2a.

function loadGeo(id) {
  return JSON.parse(readFileSync(resolve(GEO_DIR, `${id}.json`), 'utf-8'));
}

const AUTO_SCALE_CFG = { referenceValue: 23, minScale: 0.65, maxScale: 2.5 };

/** Field sizes spanning what the game is actually played at, smallest first. */
const FIELD_SIZES = [2, 5, 10, 20, 40];

/**
 * Every committed track, measured once. Built at module load so a geometry that will not parse
 * fails the file loudly rather than inside one `it()`.
 */
const MEASURED = SAMPLE_TRACKS.map(({ id }) => {
  const geo = loadGeo(id);
  const shape = new EditorShape(geo);
  return {
    id,
    isOpen: !!shape.isOpen,
    declaredWidth: geo.width,
    measuredWidth: shape.getActualTrackWidth(),
    // THE WIDTH THE GAME ACTUALLY USES. Every shipped call site prefers the stored value and
    // falls back to the spline estimate: SEVENTEEN of them across sixteen files, counted with
    // `git grep -c "width ?? .*getActualTrackWidth()"` — RaceScreen/index.jsx:429,
    // sim-fairness.mjs:4307, scripts/lib/raceDriver.mjs:121 and :147, and thirteen more.
    // The old table here computed auto-scale from `getActualTrackWidth()` UNCONDITIONALLY, so
    // from 2026-05-06 until tonight it printed factors derived from a width the game never reads.
    // That is the most useful thing this file turned up when it was armed, and it is why the
    // scale assertions below use this field.
    gameWidth: geo.width ?? shape.getActualTrackWidth(),
  };
});

describe('the committed track geometries load and measure', () => {
  // IF DELETED: a corrupt, truncated or hand-edited seed geometry passes the entire client suite.
  // WHAT WOULD GO UNNOTICED: `EditorShape` returning NaN or 0 for a real track — which reads
  // downstream as a zero-width corridor, and `computeAutoScaleFactor` answers a zero width with
  // `minScale`, an entirely plausible-looking number. The failure would surface as sprites that
  // are quietly the wrong size, with nothing red anywhere.
  it('every track yields a finite, positive declared AND measured width', () => {
    expect(MEASURED.length, 'the fixture lists no tracks — this file would prove nothing').toBe(10);
    for (const t of MEASURED) {
      expect(
        Number.isFinite(t.declaredWidth),
        `${t.id}: declared width is ${t.declaredWidth}`
      ).toBe(true);
      expect(t.declaredWidth, `${t.id}: declared width is not positive`).toBeGreaterThan(0);
      expect(
        Number.isFinite(t.measuredWidth),
        `${t.id}: measured width is ${t.measuredWidth}`
      ).toBe(true);
      expect(t.measuredWidth, `${t.id}: measured width is not positive`).toBeGreaterThan(0);
    }
  });

  // ── THE ASSUMPTION EVERY CALL SITE IS WRITTEN AROUND ─────────────────────────────────────────
  //
  // `RaceScreen/index.jsx:427` and `sim-fairness.mjs:4306` both carry the same comment: read the
  // stored width first, because `getActualTrackWidth()` measures the median spline cross-section
  // and OVERESTIMATES. Nothing tested that direction against a real track.
  //
  // IF DELETED: the comment stays and the fact it describes can quietly reverse. WHAT WOULD GO
  // UNNOTICED: a change to `getActualTrackWidth`'s sampling that made it estimate LOW — at which
  // point preferring the stored width stops being the conservative choice those call sites think
  // it is, and the fallback path silently narrows the corridor instead of widening it.
  //
  // THIS IS AN EMPIRICAL FACT ABOUT TODAY'S TEN TRACKS, NOT A THEOREM. Nothing structurally stops
  // an author saving `width: 500` on a 200 px corridor. If you added a track and this went red,
  // the thing to re-read is the assumption at those two call sites — not this test.
  it('the spline estimate never falls BELOW the declared width on any committed track', () => {
    for (const t of MEASURED) {
      const ratio = t.measuredWidth / t.declaredWidth;
      expect(
        ratio,
        `${t.id} (${t.isOpen ? 'open' : 'closed'}): measured ${t.measuredWidth} < declared ${t.declaredWidth} — the overestimate assumption at RaceScreen/index.jsx:427 has reversed`
      ).toBeGreaterThanOrEqual(1);
    }
  });

  // ── WHAT THE TABLE'S THREE SCALE COLUMNS EXISTED TO LET A HUMAN CHECK ────────────────────────
  //
  // IF DELETED: nothing asserts that the auto-scale rule points the right way on a real track.
  // WHAT WOULD GO UNNOTICED: an inverted ratio or a sign error in `computeAutoScaleFactor` that
  // made a BIGGER field draw BIGGER sprites — the exact thing the printed s5/s10/s20 columns were
  // there to be read against, and which nobody had read since May.
  //
  // A PROPERTY, not three instances (R7): the whole ordering, on every real track, at once.
  it('auto-scale never grows as the field grows — on every real track', () => {
    for (const t of MEASURED) {
      const scales = FIELD_SIZES.map((n) => computeAutoScaleFactor(t.gameWidth, n, AUTO_SCALE_CFG));
      for (let i = 1; i < scales.length; i++) {
        expect(
          scales[i],
          `${t.id}: ${FIELD_SIZES[i]} racers scale ${scales[i].toFixed(3)} > ${FIELD_SIZES[i - 1]} racers ${scales[i - 1].toFixed(3)} — a larger field draws a LARGER sprite`
        ).toBeLessThanOrEqual(scales[i - 1]);
      }
    }
  });

  // IF DELETED: a real track could sit outside the clamp the config declares. WHAT WOULD GO
  // UNNOTICED: less than the test above — the clamp is applied inside `computeAutoScaleFactor`
  // and `autoSpriteScale.test.js` proves both bounds on synthetic numbers. Its value here is
  // narrow and stated rather than oversold: it is the only place the clamp meets a REAL width.
  it('auto-scale on every real track stays inside the configured clamp', () => {
    for (const t of MEASURED) {
      for (const n of FIELD_SIZES) {
        const s = computeAutoScaleFactor(t.gameWidth, n, AUTO_SCALE_CFG);
        expect(s, `${t.id} @ ${n} racers: ${s} below minScale`).toBeGreaterThanOrEqual(
          AUTO_SCALE_CFG.minScale
        );
        expect(s, `${t.id} @ ${n} racers: ${s} above maxScale`).toBeLessThanOrEqual(
          AUTO_SCALE_CFG.maxScale
        );
      }
    }
  });
});

// CAMERA-PICTURE-FIXES-1 removed a second describe block that lived here: the Block-Z sprite-size
// regression trace. It was a printout of a hypothesis chase about the minimum-sprite FLOOR — which
// side of it each track fell on, and whether the call site passed its arguments in the right order.
// The floor no longer exists, so the trace investigates deleted code and its conclusions ("floor IS
// active in OVERVIEW for both") are now false by construction. Deleted rather than adapted; the
// finding it was chasing is recorded in reports/evolution/.
