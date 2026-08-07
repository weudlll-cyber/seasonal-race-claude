// ============================================================
// File:        racerRendering.test.js
// Path:        client/src/screens/RaceScreen/drawing/racerRendering.test.js
// Project:     RaceArena — START-FORMATION-1
//
// WHAT THIS GUARDS: the LAYER ORDER inside drawRacers — every sprite, then every name.
//
// R7, the two questions, answered before the file existed:
//   What breaks if I delete it?  Nothing. The order would be unprotected again.
//   What goes unnoticed if it is missing?  Exactly the defect the owner's eye found: a racer
//   painted later covering the name of one painted earlier. The render fingerprint would move,
//   but a fingerprint only says SOMETHING changed — it cannot say the names went back under the
//   sprites, and it moves for a hundred innocent reasons too.
//
// It asserts a PROPERTY, not instances: the LAST sprite is drawn before the FIRST name, whatever
// the field size and whatever the order of the list. Reverting to one interleaved pass fails it on
// the second racer, which is the point.
// ============================================================

import { describe, it, expect } from 'vitest';
import { drawRacers } from './racerRendering.js';
import { PHASE } from '../racePhase.js';

/**
 * A context that records the ORDER of the marks made on it, and nothing else.
 * Only the operations this module actually performs are implemented; anything it starts calling
 * that is missing here will throw, which is the honest failure rather than a silent pass.
 */
function makeRecordingCtx() {
  const log = [];
  const ctx = {
    globalAlpha: 1,
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    shadowBlur: 0,
    shadowColor: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    save() {},
    restore() {},
    translate() {},
    scale() {},
    rotate() {},
    beginPath() {},
    arc() {},
    ellipse() {},
    fill() {},
    stroke() {},
    fillRect() {},
    measureText: (t) => ({ width: String(t).length * 6 }),
    fillText(text) {
      // The name tag is the only text this module draws; the crown is an emoji through the same
      // call, so it is filtered by content rather than by call count.
      if (text !== '\u{1F451}') log.push({ op: 'tag', text, alpha: ctx.globalAlpha });
    },
  };
  return { ctx, log };
}

/** A racer type that records the sprite draw instead of painting one. */
function makeRacerType(log) {
  return {
    config: { displaySize: 40, bodyFillX: 0.5, bodyFillY: 0.9 },
    drawRacer(ctx, x, y, angle, racer) {
      log.push({ op: 'sprite', name: racer.name, alpha: ctx.globalAlpha });
    },
  };
}

function makeState(n, phase = PHASE.RACING) {
  return {
    phase,
    lastTs: 0,
    slowmoTs: 0,
    racers: Array.from({ length: n }, (_, i) => ({
      index: i,
      name: `R${i}`,
      x: i * 10,
      y: 0,
      angle: 0,
      t: i / n,
      trail: [],
    })),
  };
}

/** The shipped call, with the arguments that do not matter to the order pinned to neutral values. */
function draw(ctx, st, racerType, { shown, focusFactor = 0, pulk = null, darkening = 0.4 } = {}) {
  drawRacers(
    ctx,
    st,
    racerType,
    { shown: shown ?? new Set(st.racers.map((r) => r.index)) },
    darkening,
    null, // hudState
    null, // comebackLockedIdx
    focusFactor,
    pulk,
    false, // showRpStartRow
    new Map(),
    1, // effectiveScale
    1, // ezoom
    1, // ezoomY
    12, // tagFontPx
    0, // renderAlpha
    false // interpolationEnabled
  );
}

describe('drawRacers layer order (START-FORMATION-1)', () => {
  it('draws every sprite before any name, so no sprite can cover a name', () => {
    const { ctx, log } = makeRecordingCtx();
    const st = makeState(12);
    draw(ctx, st, makeRacerType(log));

    const lastSprite = log.findLastIndex((e) => e.op === 'sprite');
    const firstTag = log.findIndex((e) => e.op === 'tag');

    expect(log.filter((e) => e.op === 'sprite')).toHaveLength(12);
    expect(log.filter((e) => e.op === 'tag')).toHaveLength(12);
    // THE PROPERTY. Interleaving puts a sprite after the first tag and fails here.
    expect(lastSprite).toBeLessThan(firstTag);
  });

  it('holds when only some racers are labelled — the layout, not this file, decides who', () => {
    const { ctx, log } = makeRecordingCtx();
    const st = makeState(9);
    draw(ctx, st, makeRacerType(log), { shown: new Set([0, 4, 8]) });

    expect(log.filter((e) => e.op === 'sprite')).toHaveLength(9);
    expect(log.filter((e) => e.op === 'tag')).toHaveLength(3);
    expect(log.findLastIndex((e) => e.op === 'sprite')).toBeLessThan(
      log.findIndex((e) => e.op === 'tag')
    );
  });

  it('gives each name its OWN racer’s dimming, not whoever was painted last', () => {
    // The bug the second pass could introduce: globalAlpha survives the sprite loop, so a tag that
    // inherited it would take the LAST racer's dim value instead of its own. Racer 0 is in the
    // battle group and racer 1 is not, so the two must not come out equal.
    const { ctx, log } = makeRecordingCtx();
    const st = makeState(2);
    st.focusFadeProgress = 1;
    draw(ctx, st, makeRacerType(log), {
      focusFactor: 1,
      pulk: [st.racers[0]],
      darkening: 0.4,
    });

    const tags = log.filter((e) => e.op === 'tag');
    expect(tags).toHaveLength(2);
    expect(tags[0].alpha).toBeCloseTo(1, 6); // in the group
    expect(tags[1].alpha).toBeCloseTo(0.6, 6); // dimmed by 0.4
  });
});
