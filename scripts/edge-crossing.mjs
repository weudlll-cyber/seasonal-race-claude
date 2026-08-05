// ============================================================
// File:        scripts/edge-crossing.mjs
// Project:     RaceArena — CAMERA-ANCHOR-TRUTH-1 §4b
//
// THE QUESTION: the guarantees compare CENTRE POINTS. A racer whose centre is inside the frame can
// still be DRAWN with half his body outside it. How often does that actually happen to a GUARANTEED
// subject — the anchor, and both contenders in a pair state?
//
// This is a DIAGNOSIS-FIRST measurement with a pre-registered stop: if the before-number is already
// ~0, nothing ships for §4b and that is reported as a refuted hypothesis. `pairGuarantee` already
// takes `_drawnBodyWidthRefPx` as padding and `COMPANY_FRAME_PCT` 0.9 was sized against exactly this
// failure, so the honest prior is that the work is already done and a second margin would be the
// second pair of braces the owner has ruled against.
//
// A subject COUNTS AS CROSSING when its centre is inside the frame but centre ± half a drawn body
// reaches past the frame edge, measured on the real screen axes at the live camera.
//
// Reads the director's own `_framingProbe`, like corridor-truth.mjs, so it measures the live path.
//
// Usage:  node scripts/edge-crossing.mjs
//
// RACE IDENTITY (ONE-DRIVER-1): n=40, raceSeed 5601, camSeed 1439767152, each track's OWN default
// racer type, 60 s. Printed with the results, because a number is only comparable to another number
// from the same identity.
// ============================================================

import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from './lib/raceDriver.mjs';
import { DEFAULT_CAMERA_CONFIG } from '../client/src/modules/storage/defaults.js';

const IDENTITY = resolveIdentity({
  racers: 40,
  raceSeed: 5601,
  cameraSeed: 1439767152,
  racerType: TRACK_DEFAULT_RACER,
  seconds: 60,
  note: 'the CAMERA-ANCHOR-TRUTH-1 measurement context',
});

function measureTrack(geo) {
  const race = buildRace(geo, IDENTITY, DEFAULT_CAMERA_CONFIG);
  const { cd, st, trackWidthPx: TW, displaySize: ds, bodyRef } = race;

  const byState = new Map();
  let checked = 0;
  let crossing = 0;
  let centreOut = 0;
  let worstOverhangPct = 0;
  const halfBody = bodyRef / 2; // world px

  runRace(race, IDENTITY, DEFAULT_CAMERA_CONFIG, () => {
    const p = cd._framingProbe;
    if (!p || !(cd.zoom > 0)) {
      return;
    }
    // Every GUARANTEED subject this frame: the anchor, plus both contenders in a pair state.
    const subs = [p.point, ...(Array.isArray(p.pair) ? p.pair : [])].filter(
      (s) => s && Number.isFinite(s.x) && Number.isFinite(s.y)
    );
    const effX = cd._proj.effX(cd.zoom);
    const effY = cd._proj.effY(cd.zoom);
    for (const s of subs) {
      // World -> screen using the live camera transform (offsets are already screen px).
      const sxPix = s.x * effX + cd.offsetX;
      const syPix = s.y * effY + cd.offsetY;
      const hbX = halfBody * effX;
      const hbY = halfBody * effY;
      const centreIn = sxPix >= 0 && sxPix <= p.frameW && syPix >= 0 && syPix <= p.frameH;
      checked++;
      if (!centreIn) {
        centreOut++;
        continue; // a centre already outside is not the point-vs-nose defect; counted separately
      }
      const over = Math.max(
        0 - (sxPix - hbX),
        sxPix + hbX - p.frameW,
        0 - (syPix - hbY),
        syPix + hbY - p.frameH
      );
      if (over > 0) {
        crossing++;
        const pctOver = (100 * over) / Math.min(p.frameW, p.frameH);
        if (pctOver > worstOverhangPct) worstOverhangPct = pctOver;
        if (!byState.has(cd.state)) byState.set(cd.state, 0);
        byState.set(cd.state, byState.get(cd.state) + 1);
      }
    }
  });

  return {
    id: geo.id,
    checked,
    crossing,
    centreOut,
    crossPct: checked ? (100 * crossing) / checked : 0,
    centreOutPct: checked ? (100 * centreOut) / checked : 0,
    worstOverhangPct,
    byState: [...byState.entries()],
  };
}

const geos = loadTracks();

console.log(
  'EDGE CROSSING — a GUARANTEED subject drawn with part of its body past the frame edge\n'
);
console.log(formatIdentity(IDENTITY));
console.log(
  'track            subject-frames   crossing%   worst overhang (% of short side)   centre-already-out%'
);
let totC = 0;
let totN = 0;
for (const geo of geos) {
  const r = measureTrack(geo);
  totC += r.crossing;
  totN += r.checked;
  console.log(
    `  ${r.id.padEnd(15)} ${String(r.checked).padStart(9)}   ${r.crossPct.toFixed(2).padStart(7)}%   ` +
      `${r.worstOverhangPct.toFixed(2).padStart(10)}%                        ${r.centreOutPct.toFixed(2)}%` +
      (r.byState.length ? `   states: ${r.byState.map(([s, n]) => `${s}=${n}`).join(' ')}` : '')
  );
}
console.log(
  `\n  OVERALL: ${totC} crossing of ${totN} guaranteed-subject frames = ${((100 * totC) / totN).toFixed(3)}%`
);
console.log(
  '  PRE-REGISTERED STOP: if this is ~0, §4b ships NOTHING — pairGuarantee already pads by the\n' +
    '  drawn body and COMPANY_FRAME_PCT 0.9 was sized against this exact failure.'
);
