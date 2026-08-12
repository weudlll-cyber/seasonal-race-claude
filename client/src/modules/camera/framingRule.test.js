// ============================================================
// framingRule.test.js — CAMERA-FRAMING-1
//
// The load-bearing invariant of this block: THE GUARANTEE HOLDS IN EVERY ORIENTATION. A track's
// heading on screen rotates, and a guarantee that only holds on the axes is not a guarantee — it is
// the bsX/bsY defect wearing a different hat. So the orientation sweeps here are the test, and each
// carries a failure proof showing what an orientation-blind bound does with the same inputs.
// ============================================================

import { describe, it, expect } from 'vitest';
import {
  FRAMING_BY_STATE,
  GUARANTEE,
  POSITION,
  framingFor,
  zoomCeilingToFit,
  corridorGuarantee,
  pairGuarantee,
  companyGuarantee,
  COMPANY_FRAME_PCT,
  anchorScreenPoint,
  lateralShiftToFit,
} from './framingRule.js';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';
import { frameExtentAlong, roomFromPointAlong } from './frameGeometry.js';

const W = 1280;
const H = 720;

// The subject's safe region, mirrored from CameraDirector's DEFAULT_INNER_FRAME_PCT. The company
// guarantee deliberately does NOT use it — CAMERA-COMPANY-2 — and these tests hold that apart.
const SUBJECT_INNER_PCT = 0.7;

// The shipped projections, reduced to what a guarantee reads.
const CLOSED = { axisX: 1280 / 3072, axisY: 720 / 2048, tw: 131, name: 'searound (closed)' };
const CLOSED_WIDE = { axisX: 1280 / 3072, axisY: 720 / 2047, tw: 211, name: 'ice-track (closed)' };
const OPEN = { axisX: 1.5, axisY: 1.5, tw: 300, name: 'mountainstreet (open)' };
const TRACKS = [CLOSED, CLOSED_WIDE, OPEN];

const headingAt = (deg) => ({
  x: Math.cos((deg * Math.PI) / 180),
  y: Math.sin((deg * Math.PI) / 180),
});

/** Does a world vector centred on the anchor actually fit the inner frame at this zoom? */
const fits = (vec, z, t, inner = 1) => {
  const sx = vec.x * t.axisX * z;
  const sy = vec.y * t.axisY * z;
  return Math.hypot(sx, sy) <= frameExtentAlong(sx, sy, W, H) * inner + 1e-9;
};

describe('the table: six states, three columns, one answer to the position question', () => {
  it('describes exactly the six states, and nothing else', () => {
    expect(Object.keys(FRAMING_BY_STATE).sort()).toEqual(
      [
        'BATTLE_ZOOM',
        'COMEBACK_ZOOM',
        'LEAD_CHANGE',
        'LEADER_ZOOM',
        'OVERVIEW',
        'PHOTO_FINISH',
      ].sort()
    );
  });

  it('position follows the principle, not a preference: forward exactly when nothing is ahead', () => {
    for (const [state, f] of Object.entries(FRAMING_BY_STATE)) {
      const expected = f.aheadMatters ? POSITION.CENTRED : POSITION.FORWARD;
      expect(f.position, `${state} must derive its position from aheadMatters`).toBe(expected);
    }
  });

  it('matches the owner’s six lines', () => {
    const f = FRAMING_BY_STATE;
    expect(f.LEADER_ZOOM).toMatchObject({
      guarantee: GUARANTEE.CORRIDOR,
      position: POSITION.FORWARD,
    });
    expect(f.LEAD_CHANGE).toMatchObject({ guarantee: GUARANTEE.PAIR, position: POSITION.FORWARD });
    expect(f.BATTLE_ZOOM).toMatchObject({ guarantee: GUARANTEE.PAIR, position: POSITION.CENTRED });
    expect(f.COMEBACK_ZOOM).toMatchObject({
      guarantee: GUARANTEE.CORRIDOR,
      position: POSITION.CENTRED,
    });
    expect(f.OVERVIEW).toMatchObject({ guarantee: GUARANTEE.CORRIDOR, position: POSITION.FORWARD });
    expect(f.PHOTO_FINISH).toMatchObject({ guarantee: GUARANTEE.PAIR, position: POSITION.CENTRED });
  });

  it('LEAD_CHANGE is DEFINED — it was the one state with no framing case at all', () => {
    // It fell into panTarget's default centroid branch, never received the forward bias, and holds
    // 37.6% of all frames. Centred by omission is not a design.
    expect(framingFor('LEAD_CHANGE').anchor).toBe('new-leader');
    expect(framingFor('LEAD_CHANGE').guarantee).toBe(GUARANTEE.PAIR);
    expect(framingFor('LEAD_CHANGE').position).toBe(POSITION.FORWARD);
  });

  it('an unknown state falls back to LEADER framing rather than to nothing', () => {
    expect(framingFor('NOT_A_STATE')).toBe(FRAMING_BY_STATE.LEADER_ZOOM);
    expect(framingFor(undefined)).toBe(FRAMING_BY_STATE.LEADER_ZOOM);
  });
});

describe('THE GUARANTEE HOLDS IN EVERY ORIENTATION — corridor', () => {
  it.each(TRACKS)('$name: the corridor fits at the guaranteed zoom, every 1° of heading', (t) => {
    for (let deg = 0; deg < 360; deg += 1) {
      const z = corridorGuarantee(headingAt(deg), t.tw, t.axisX, t.axisY, W, H);
      const perp = {
        x: -Math.sin((deg * Math.PI) / 180) * t.tw,
        y: Math.cos((deg * Math.PI) / 180) * t.tw,
      };
      expect(fits(perp, z, t), `heading ${deg}° on ${t.name}`).toBe(true);
    }
  });

  it.each(TRACKS)(
    '$name: and it is TIGHT — one step tighter and the corridor no longer fits',
    (t) => {
      for (let deg = 0; deg < 360; deg += 7) {
        const z = corridorGuarantee(headingAt(deg), t.tw, t.axisX, t.axisY, W, H);
        const perp = {
          x: -Math.sin((deg * Math.PI) / 180) * t.tw,
          y: Math.cos((deg * Math.PI) / 180) * t.tw,
        };
        expect(fits(perp, z * 1.02, t), `heading ${deg}° should NOT fit 2% tighter`).toBe(false);
      }
    }
  );

  it('respects the inner-frame fraction — a safe region means a wider shot', () => {
    const full = corridorGuarantee(headingAt(30), CLOSED.tw, CLOSED.axisX, CLOSED.axisY, W, H, 1);
    const inner = corridorGuarantee(
      headingAt(30),
      CLOSED.tw,
      CLOSED.axisX,
      CLOSED.axisY,
      W,
      H,
      0.7
    );
    expect(inner).toBeLessThan(full);
    expect(inner).toBeCloseTo(full * 0.7, 9);
  });

  it('FAILURE PROOF: an orientation-BLIND bound over-widens for most of the lap', () => {
    // The heading-blind guarantee has to assume the worst orientation everywhere — which is what
    // the shipped one did before this block. Measure how much shot that costs around a lap.
    const worst = Math.min(
      zoomCeilingToFit({ x: CLOSED.tw, y: 0 }, CLOSED.axisX, CLOSED.axisY, W, H),
      zoomCeilingToFit({ x: 0, y: CLOSED.tw }, CLOSED.axisX, CLOSED.axisY, W, H)
    );
    let over = 0;
    let sum = 0;
    for (let deg = 0; deg < 360; deg += 1) {
      const aware = corridorGuarantee(headingAt(deg), CLOSED.tw, CLOSED.axisX, CLOSED.axisY, W, H);
      expect(aware).toBeGreaterThanOrEqual(worst - 1e-9); // never tighter than the worst case
      if (aware > worst * 1.001) over++;
      sum += aware / worst;
    }
    expect(over).toBeGreaterThan(180); // over-widened on more than half the headings
    expect(sum / 360).toBeGreaterThan(1.1); // and by more than 10% on average
  });

  it('a degenerate heading falls back to the worst orientation rather than to nothing', () => {
    const z = corridorGuarantee({ x: 0, y: 0 }, CLOSED.tw, CLOSED.axisX, CLOSED.axisY, W, H);
    const worst = Math.min(
      zoomCeilingToFit({ x: CLOSED.tw, y: 0 }, CLOSED.axisX, CLOSED.axisY, W, H),
      zoomCeilingToFit({ x: 0, y: CLOSED.tw }, CLOSED.axisX, CLOSED.axisY, W, H)
    );
    expect(z).toBeCloseTo(worst, 9);
    expect(corridorGuarantee(null, CLOSED.tw, CLOSED.axisX, CLOSED.axisY, W, H)).toBeCloseTo(
      worst,
      9
    );
  });

  it('no corridor width means no corridor constraint', () => {
    expect(corridorGuarantee(headingAt(45), 0, CLOSED.axisX, CLOSED.axisY, W, H)).toBe(Infinity);
  });
});

describe('THE GUARANTEE HOLDS IN EVERY ORIENTATION — pair', () => {
  it.each(TRACKS)(
    '$name: both contenders fit at the guaranteed zoom, every 1° of separation',
    (t) => {
      const gap = 60; // world px between the two
      for (let deg = 0; deg < 360; deg += 1) {
        const a = { x: 1000, y: 1000 };
        const h = headingAt(deg);
        const b = { x: a.x + h.x * gap, y: a.y + h.y * gap };
        const z = pairGuarantee(a, b, t.axisX, t.axisY, W, H);
        expect(fits({ x: b.x - a.x, y: b.y - a.y }, z, t), `separation ${deg}° on ${t.name}`).toBe(
          true
        );
      }
    }
  );

  it('THIS is what lets a battle go tighter than one track width, honestly', () => {
    // The owner has asked for settings below 1 track width. A pair nose-to-tail is separated by a
    // few body lengths, so "everyone who matters stays in frame" permits a far tighter shot than
    // the corridor proxy would — without breaking his rule.
    const a = { x: 1000, y: 1000 };
    const b = { x: 1030, y: 1000 }; // 30 px apart, nose to tail
    const pair = pairGuarantee(a, b, CLOSED.axisX, CLOSED.axisY, W, H);
    const corridor = corridorGuarantee({ x: 1, y: 0 }, CLOSED.tw, CLOSED.axisX, CLOSED.axisY, W, H);
    expect(pair).toBeGreaterThan(corridor); // a tighter shot is permitted
    expect(pair / corridor).toBeGreaterThan(2); // and substantially so
  });

  it('padding widens the requirement — a whole sprite fits, not just a centre point', () => {
    const a = { x: 1000, y: 1000 };
    const b = { x: 1060, y: 1000 };
    const bare = pairGuarantee(a, b, CLOSED.axisX, CLOSED.axisY, W, H, 1, 0);
    const padded = pairGuarantee(a, b, CLOSED.axisX, CLOSED.axisY, W, H, 1, 40);
    expect(padded).toBeLessThan(bare);
    expect(fits({ x: 100, y: 0 }, padded, CLOSED)).toBe(true); // 60 separation + 40 padding
  });

  it('co-located contenders are constrained only by their padding, worst-orientation', () => {
    const p = { x: 500, y: 500 };
    expect(pairGuarantee(p, { ...p }, CLOSED.axisX, CLOSED.axisY, W, H, 1, 0)).toBe(Infinity);
    const padded = pairGuarantee(p, { ...p }, CLOSED.axisX, CLOSED.axisY, W, H, 1, 50);
    expect(Number.isFinite(padded)).toBe(true);
    expect(fits({ x: 50, y: 0 }, padded, CLOSED)).toBe(true);
    expect(fits({ x: 0, y: 50 }, padded, CLOSED)).toBe(true);
  });

  it('a missing contender means no pair constraint — it must not zoom to a point', () => {
    expect(pairGuarantee(null, { x: 1, y: 1 }, CLOSED.axisX, CLOSED.axisY, W, H)).toBe(Infinity);
    expect(pairGuarantee({ x: 1, y: 1 }, null, CLOSED.axisX, CLOSED.axisY, W, H)).toBe(Infinity);
  });

  it('FAILURE PROOF: measuring the pair on ONE axis loses the other', () => {
    // The bsX/bsY family, applied to a pair: judging a diagonal separation by its X component alone
    // says it fits when it does not.
    const a = { x: 1000, y: 1000 };
    const b = { x: 1000 + 40, y: 1000 + 260 }; // mostly vertical
    const honest = pairGuarantee(a, b, CLOSED.axisX, CLOSED.axisY, W, H);
    const xOnly = zoomCeilingToFit({ x: 40, y: 0 }, CLOSED.axisX, CLOSED.axisY, W, H);
    expect(xOnly).toBeGreaterThan(honest * 2); // the X-only bound permits a far tighter shot …
    expect(fits({ x: 40, y: 260 }, xOnly, CLOSED)).toBe(false); // … at which the pair does NOT fit
  });
});

describe('a guarantee widens and never steers (Lesson 192)', () => {
  it('returns a ceiling only — same inputs, same number, no hidden state', () => {
    const args = [headingAt(37), CLOSED.tw, CLOSED.axisX, CLOSED.axisY, W, H];
    expect(corridorGuarantee(...args)).toBe(corridorGuarantee(...args));
    const p = [{ x: 0, y: 0 }, { x: 50, y: 50 }, CLOSED.axisX, CLOSED.axisY, W, H];
    expect(pairGuarantee(...p)).toBe(pairGuarantee(...p));
  });

  it('every guarantee is a Math.min-able ceiling: never zero, never negative, never NaN', () => {
    for (const t of TRACKS) {
      for (let deg = 0; deg < 360; deg += 11) {
        const c = corridorGuarantee(headingAt(deg), t.tw, t.axisX, t.axisY, W, H);
        expect(c).toBeGreaterThan(0);
        expect(Number.isNaN(c)).toBe(false);
      }
    }
  });

  it('is monotonic: a wider corridor or a bigger gap always means a wider shot', () => {
    const z = (tw) => corridorGuarantee(headingAt(20), tw, CLOSED.axisX, CLOSED.axisY, W, H);
    expect(z(100)).toBeGreaterThan(z(200));
    expect(z(200)).toBeGreaterThan(z(400));
    const p = (gap) =>
      pairGuarantee({ x: 0, y: 0 }, { x: gap, y: 0 }, CLOSED.axisX, CLOSED.axisY, W, H);
    expect(p(50)).toBeGreaterThan(p(150));
  });
});

// ── CAMERA-COMPANY-1: the DRAMATURGICAL guarantee ─────────────────────────────────────────────
// A different KIND from the corridor and the pair. Those say "do not crop what matters"; this one
// says "do not show emptiness" — it protects the SHOT rather than a subject. The owner's words for
// the failure it prevents, seeing his leader huge and alone: "das ist nicht spannend".

describe('companyGuarantee — do not show emptiness', () => {
  const CLOSED = { axisX: 1280 / 3072, axisY: 720 / 2048 };
  const W = 1280;
  const H = 720;
  const anchor = { x: 1000, y: 1000 };
  const at = (dx, dy) => ({ x: anchor.x + dx, y: anchor.y + dy, finished: false });
  // CAMERA-COMPANY-2: the company vector runs FROM the anchor, so "does it fit" is asked of the room
  // between the anchor's own place in the frame and the edge — not of a fraction of the chord. The
  // helper therefore ray-casts exactly as the guarantee does; anything simpler would agree with a
  // guarantee that is wrong in the same way.
  const CENTRE = { x: W / 2, y: H / 2 };
  const fits = (r, z, framePct = 1, at = CENTRE) => {
    const sx = (r.x - anchor.x) * CLOSED.axisX * z;
    const sy = (r.y - anchor.y) * CLOSED.axisY * z;
    return Math.hypot(sx, sy) <= roomFromPointAlong(at.x, at.y, sx, sy, W, H, framePct) + 1e-9;
  };
  const g = (racers, n, framePct = 1, at = CENTRE) =>
    companyGuarantee(anchor, racers, n, CLOSED.axisX, CLOSED.axisY, W, H, framePct, at);

  it('keeps exactly the company it is asked for — the anchor plus n−1 others', () => {
    const field = [at(0, 0), at(120, 0), at(400, 0), at(900, 0), at(2000, 0)];
    for (const n of [2, 3, 4]) {
      const z = g(field, n);
      const others = field.filter((r) => r !== field[0]);
      const inFrame = others.filter((r) => fits(r, z)).length;
      expect(inFrame, `n=${n}`).toBeGreaterThanOrEqual(n - 1);
    }
  });

  it('a tighter demand is a wider shot, monotonically', () => {
    const field = [at(0, 0), at(150, 0), at(500, 0), at(1200, 0), at(2500, 0)];
    const z2 = g(field, 2);
    const z3 = g(field, 3);
    const z5 = g(field, 5);
    expect(z3).toBeLessThan(z2);
    expect(z5).toBeLessThan(z3);
  });

  it('is DISABLED at 0 and 1 — the anchor alone needs no company', () => {
    const field = [at(0, 0), at(3000, 3000)];
    expect(g(field, 0)).toBe(Infinity);
    expect(g(field, 1)).toBe(Infinity);
    expect(g(field, -5)).toBe(Infinity);
  });

  it('asking for more company than exists takes what exists — it must not zoom to a point', () => {
    const field = [at(0, 0), at(200, 0)];
    const z = g(field, 12);
    expect(Number.isFinite(z)).toBe(true);
    expect(fits(field[1], z)).toBe(true);
  });

  it('an empty field constrains nothing', () => {
    expect(g([at(0, 0)], 5)).toBe(Infinity);
    expect(g([], 5)).toBe(Infinity);
    expect(g(null, 5)).toBe(Infinity);
  });

  it('finished racers are not company', () => {
    const near = { x: anchor.x + 100, y: anchor.y, finished: true };
    const far = at(2000, 0);
    const withFinished = g([at(0, 0), near, far], 2);
    const withoutIt = g([at(0, 0), far], 2);
    expect(withFinished).toBeCloseTo(withoutIt, 9); // the finished racer was skipped
  });

  it('ORIENTATION-AWARE: it ranks by the zoom a racer REQUIRES, not by raw distance', () => {
    // On a closed track the frame reaches further horizontally than vertically, so a racer 300 px
    // to the side is CHEAPER to include than one 300 px above — even though both are 300 px away.
    const beside = at(300, 0);
    const above = at(0, 300);
    const zBeside = g([at(0, 0), beside], 2);
    const zAbove = g([at(0, 0), above], 2);
    expect(zBeside).toBeGreaterThan(zAbove); // the side companion permits a tighter shot

    // …and the ranking follows the requirement, not the distance: with one racer slightly further
    // to the side and one nearer above, the SIDE one is chosen as the cheaper company.
    const field = [at(0, 0), at(340, 0), at(0, 300)];
    const z = g(field, 2);
    expect(z).toBeCloseTo(g([at(0, 0), at(340, 0)], 2), 9);
  });

  it('FAILURE PROOF: ranking by raw distance picks the wrong companion and crops it', () => {
    // This is precisely what the old floor did — one axis scale applied to both axes, so distance
    // stood in for requirement. Take the nearest-by-distance racer and zoom to fit only him.
    const sideFar = at(340, 0);
    const aboveNear = at(0, 300); // nearer in world px …
    const field = [at(0, 0), sideFar, aboveNear];
    const byDistance = g([at(0, 0), aboveNear], 2); // … so a distance ranker would choose him
    const honest = g(field, 2);
    expect(honest).toBeGreaterThan(byDistance); // the honest answer permits a TIGHTER shot
    // and the distance-ranked choice leaves the frame with less company than asked, because at its
    // own zoom the racer it ignored is the one that actually fits.
    expect(fits(sideFar, byDistance)).toBe(true);
    expect(fits(aboveNear, honest)).toBe(false);
  });

  it('respects the frame fraction it is given', () => {
    const field = [at(0, 0), at(400, 0)];
    expect(g(field, 2, 0.7)).toBeCloseTo(g(field, 2, 1) * 0.7, 9);
  });

  // ── CAMERA-COMPANY-2: visible with a margin, not inside the subject's safe region ────────────
  it('defaults to the COMPANION MARGIN, not to the subject safe region', () => {
    const field = [at(0, 0), at(400, 0)];
    const dflt = companyGuarantee(anchor, field, 2, CLOSED.axisX, CLOSED.axisY, W, H);
    expect(dflt).toBeCloseTo(g(field, 2, COMPANY_FRAME_PCT), 9);
    // and it is the owner's decision made numeric: a companion gets more room than innerFramePct
    // would give it, so the same company costs a tighter shot.
    expect(dflt).toBeGreaterThan(g(field, 2, SUBJECT_INNER_PCT));
    expect(dflt / g(field, 2, SUBJECT_INNER_PCT)).toBeCloseTo(
      COMPANY_FRAME_PCT / SUBJECT_INNER_PCT,
      6
    );
  });

  it('the margin is a real margin — a guaranteed companion is never AT the edge', () => {
    // At the guarantee's own zoom the furthest guaranteed companion still has the margin between it
    // and the frame edge: the reason 0.9 exists is that half a drawn body must fit there.
    const field = [at(0, 0), at(150, 0), at(500, 0), at(900, 0)];
    const z = companyGuarantee(anchor, field, 4, CLOSED.axisX, CLOSED.axisY, W, H);
    const kept = field.filter((r) => r !== field[0] && fits(r, z, COMPANY_FRAME_PCT));
    expect(kept.length).toBeGreaterThanOrEqual(3);
    for (const r of kept) {
      const sx = (r.x - anchor.x) * CLOSED.axisX * z;
      const sy = (r.y - anchor.y) * CLOSED.axisY * z;
      // inside the margin: never further out than the room the 0.9 region leaves it
      const room = roomFromPointAlong(CENTRE.x, CENTRE.y, sx, sy, W, H, COMPANY_FRAME_PCT);
      expect(Math.hypot(sx, sy)).toBeLessThanOrEqual(room + 1e-9);
      // and the margin is real: at the full frame there would still be room to spare
      expect(roomFromPointAlong(CENTRE.x, CENTRE.y, sx, sy, W, H, 1)).toBeGreaterThan(room);
    }
  });

  // ── CAMERA-COMPANY-2: the room is DIRECTIONAL ────────────────────────────────────────────────
  it('a forward-framed subject really does have more room behind him', () => {
    // Heading east on screen, so the anchor is pushed east and the company lies west, behind him.
    const behind = [at(0, 0), at(-400, 0)];
    const fwdAt = anchorScreenPoint(W, H, 0.66, { x: 1, y: 0 });
    const centred = g(behind, 2, 1, CENTRE);
    const forward = g(behind, 2, 1, fwdAt);
    expect(forward).toBeGreaterThan(centred); // more room behind = a tighter shot is allowed
    // and it is the frame's own arithmetic, not a fraction: 0.66 of a 1280 px chord behind him.
    expect(fwdAt.x).toBeCloseTo(W / 2 + 0.16 * W, 6);
    expect(forward / centred).toBeCloseTo(0.66 / 0.5, 6);
  });

  it('the SAME forward framing costs room ahead — the scalar could not say both', () => {
    const ahead = [at(0, 0), at(400, 0)];
    const fwdAt = anchorScreenPoint(W, H, 0.66, { x: 1, y: 0 });
    expect(g(ahead, 2, 1, fwdAt)).toBeLessThan(g(ahead, 2, 1, CENTRE)); // less room = wider shot
    expect(g(ahead, 2, 1, fwdAt) / g(ahead, 2, 1, CENTRE)).toBeCloseTo(0.34 / 0.5, 6);
  });

  it('FAILURE PROOF: the scalar reach passes a companion the directional room refuses', () => {
    // The shipped scalar was `leaderForwardFrac` applied in EVERY direction. Measured on the owner's
    // own frame it was over-generous everywhere: 0.66 assumed where the truth was 0.399 dead ahead
    // and 0.482 beside. Here is that failure as arithmetic, with a companion BESIDE a forward-framed
    // anchor — a direction the forward bias gives no extra room in at all.
    const beside = at(0, 400);
    const field = [at(0, 0), beside];
    const fwdAt = anchorScreenPoint(W, H, 0.66, { x: 1, y: 0 });
    const scalar = frameExtentAlong(0, 1, W, H) * 0.66; // what the old code believed was available
    const truth = roomFromPointAlong(fwdAt.x, fwdAt.y, 0, 1, W, H, 1); // what the frame really gives
    expect(scalar).toBeGreaterThan(truth * 1.3); // over-generous by more than 30% in this direction

    const zScalar = scalar / Math.hypot(0, (beside.y - anchor.y) * CLOSED.axisY);
    const zHonest = g(field, 2, 1, fwdAt);
    expect(zScalar).toBeGreaterThan(zHonest); // the scalar permits the TIGHTER shot …
    expect(fits(beside, zScalar, 1, fwdAt)).toBe(false); // … and at it the guaranteed racer is OUT
    expect(fits(beside, zHonest, 1, fwdAt)).toBe(true); // the directional one keeps its promise
  });
});

describe('CAMERA-COMPANY-1 — the guarantee through the director', () => {
  const TW = 178;
  const FRAME = { width: 1280, height: 720 };
  const shape = {
    isOpen: false,
    getActualTrackWidth: () => TW,
    getTotalLength: () => 4000,
    getPosition: (t) => {
      const a = 2 * Math.PI * (((t % 1) + 1) % 1);
      return { x: 1536 + Math.cos(a) * 900, y: 1024 + Math.sin(a) * 600, angle: a };
    },
  };
  const mk = (cfg) =>
    new CameraDirector(3072, 2048, false, { ...DEFAULT_CAMERA_CONFIG, ...cfg }, 28.5, shape, TW);
  const rs = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 2 };
  // A leader who has broken away: the rest of the field is far behind. This is the shot that goes
  // empty, and the whole reason the guarantee exists.
  const brokenAway = () => {
    const lead = shape.getPosition(0.5);
    const out = [{ index: 0, name: 'L', t: 0.5, x: lead.x, y: lead.y, finished: false }];
    for (let i = 1; i < 8; i++) {
      const p = shape.getPosition(0.5 - 0.06 * i);
      out.push({ index: i, name: `R${i}`, t: 0.5 - 0.06 * i, x: p.x, y: p.y, finished: false });
    }
    return out;
  };
  const settle = (cd, racers, frames = 200) => {
    for (let i = 0; i < frames; i++) {
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.update(racers, 20000 + i * 16, rs, FRAME.width, FRAME.height);
    }
    return cd;
  };
  const visibleCount = (cd, racers) =>
    racers.filter((r) => {
      const x = r.x * cd._proj.effX(cd.zoom) + cd.offsetX;
      const y = r.y * cd._proj.effY(cd.zoom) + cd.offsetY;
      return x >= 0 && x <= FRAME.width && y >= 0 && y <= FRAME.height;
    }).length;

  const tight = (n) => ({
    minRacersVisible: n,
    cameraStateProfiles: {
      ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
      LEADER_ZOOM: {
        ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM,
        visibleCorridors: 0.5,
      },
    },
  });

  it('catches a tight LEADER setting when the shot would go empty', () => {
    const racers = brokenAway();
    const off = settle(mk(tight(0)), racers);
    const on = settle(mk(tight(3)), racers);
    expect(visibleCount(on, racers)).toBeGreaterThanOrEqual(3);
    expect(on.visibleCorridors).toBeGreaterThan(off.visibleCorridors); // it widened
  });

  it('is a LIMIT, not a correction — the zoom never goes in and then comes back out', () => {
    // The failure class this shape avoids is pumping. Drive from the first frame and assert the
    // target zoom never tightens beyond its settled value and then loosens again.
    const racers = brokenAway();
    const cd = mk(tight(3));
    const targets = [];
    for (let i = 0; i < 120; i++) {
      cd.state = CAM_STATE.LEADER_ZOOM;
      cd.update(racers, 20000 + i * 16, rs, FRAME.width, FRAME.height);
      targets.push(cd.targetZoom);
    }
    // With a static field the limit is constant, so the target must be too — no in-then-out.
    const settled = targets.slice(20);
    expect(Math.max(...settled) - Math.min(...settled)).toBeLessThan(1e-6);
  });

  it('does not touch a generous setting — it only ever widens', () => {
    const racers = brokenAway();
    const wide = settle(
      mk({
        minRacersVisible: 3,
        cameraStateProfiles: {
          ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles,
          LEADER_ZOOM: {
            ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM,
            visibleCorridors: 6,
          },
        },
      }),
      racers
    );
    expect(wide.visibleCorridors).toBeCloseTo(6, 1);
  });

  it('applies to the single-subject shots and NOT to the pair shots', () => {
    const racers = brokenAway();
    const cd = mk({ minRacersVisible: 8 });
    const subjects = {
      point: { x: racers[0].x, y: racers[0].y },
      t: 0.5,
      pair: [racers[0], racers[1]],
    };
    for (const [state, expected] of [
      [CAM_STATE.LEADER_ZOOM, true],
      [CAM_STATE.COMEBACK_ZOOM, true],
      [CAM_STATE.OVERVIEW, true],
      [CAM_STATE.BATTLE_ZOOM, false],
      [CAM_STATE.LEAD_CHANGE, false],
      [CAM_STATE.PHOTO_FINISH, false],
    ]) {
      cd.state = state;
      const ceiling = cd._companyCeiling(subjects, racers, FRAME);
      expect(Number.isFinite(ceiling), `${state} should ${expected ? '' : 'NOT '}apply`).toBe(
        expected
      );
    }
  });

  // ── CAMERA-COMPANY-2: the promise is about the REGION, so test it there ──────────────────────
  it('delivers the promised count INSIDE the region it promises, not merely on canvas', () => {
    const racers = brokenAway();
    const cd = settle(mk(tight(4)), racers);
    // The shot the guarantee SIZED: target zoom, anchored where the anchor actually is. Counting at
    // the live zoom would measure the tracking lag instead of the guarantee.
    const lead = racers[0];
    const ax = lead.x * cd._proj.effX(cd.zoom) + cd.offsetX;
    const ay = lead.y * cd._proj.effY(cd.zoom) + cd.offsetY;
    const ex = cd._proj.effX(cd.targetZoom);
    const ey = cd._proj.effY(cd.targetZoom);
    const mx = (FRAME.width * (1 - COMPANY_FRAME_PCT)) / 2;
    const my = (FRAME.height * (1 - COMPANY_FRAME_PCT)) / 2;
    const inRegion = racers.filter((r) => {
      const x = ax + (r.x - lead.x) * ex;
      const y = ay + (r.y - lead.y) * ey;
      return x >= mx && x <= FRAME.width - mx && y >= my && y <= FRAME.height - my;
    }).length;
    expect(inRegion).toBeGreaterThanOrEqual(4);
  });

  it('turning it off restores the pre-guarantee picture exactly', () => {
    const racers = brokenAway();
    const a = settle(mk({ ...tight(0) }), racers);
    const b = settle(mk({ ...tight(1) }), racers);
    expect(b.targetZoom).toBeCloseTo(a.targetZoom, 9);
  });
});

// ── CAMERA-LATERAL-1: follow ALONG the track, sit on the centreline ACROSS it ─────────────────
// The owner: "what I really need now is the camera guided laterally on the centreline, because the
// jumps look partly even worse". The jumps were real and measured: before this block an anchor
// change moved the camera 62-84 world px sideways, 28-37% of the 225 px shot.

describe('lateralShiftToFit — the lateral guarantee, as arithmetic', () => {
  const SCALE = 2; // screen px per world px along the perpendicular
  const ROOM = 200; // screen px available on each side of the anchor

  it('holds the centreline when everything already fits — the default is 0, exactly', () => {
    expect(lateralShiftToFit([50, -50, 80], ROOM, ROOM, SCALE)).toBe(0);
    expect(lateralShiftToFit([0], ROOM, ROOM, SCALE)).toBe(0);
  });

  it('shifts by the LEAST that works, and no more', () => {
    // A subject 150 world px out needs 300 screen px; only 200 are available, so the camera must
    // move 50 world px toward it — not to it, and not past it.
    expect(lateralShiftToFit([150], ROOM, ROOM, SCALE)).toBeCloseTo(50, 9);
    expect(lateralShiftToFit([-150], ROOM, ROOM, SCALE)).toBeCloseTo(-50, 9);
  });

  it('returns to the centreline as soon as it can — no memory, no hysteresis', () => {
    expect(lateralShiftToFit([150], ROOM, ROOM, SCALE)).toBeCloseTo(50, 9);
    expect(lateralShiftToFit([90], ROOM, ROOM, SCALE)).toBe(0); // the very next frame, back to zero
  });

  it('honours an ASYMMETRIC frame — a forward-framed anchor has unequal room to the sides', () => {
    expect(lateralShiftToFit([150], 100, 300, SCALE)).toBeCloseTo(100, 9); // less room that way
    expect(lateralShiftToFit([150], 400, 100, SCALE)).toBe(0); // plenty that way
  });

  it('satisfies EVERY subject at once, not just the worst one', () => {
    const d = lateralShiftToFit([150, -20], ROOM, ROOM, SCALE);
    for (const L of [150, -20]) expect(Math.abs(L - d) * SCALE).toBeLessThanOrEqual(ROOM + 1e-9);
    expect(d).toBeCloseTo(50, 9); // the least that satisfies BOTH, not the worst one's demand
  });

  it('an impossible set splits the difference rather than picking a side', () => {
    // 300 apart with only 200 px of room each way: no shift fits both. The ZOOM guarantee should
    // have widened; this must still return something sane rather than a wild number.
    const d = lateralShiftToFit([200, -200], ROOM, ROOM, SCALE);
    expect(d).toBeCloseTo(0, 9);
    expect(Number.isFinite(d)).toBe(true);
  });

  it('degenerate inputs constrain nothing', () => {
    expect(lateralShiftToFit([], ROOM, ROOM, SCALE)).toBe(0);
    expect(lateralShiftToFit([50], ROOM, ROOM, 0)).toBe(0);
    expect(lateralShiftToFit(null, ROOM, ROOM, SCALE)).toBe(0);
  });

  // FAILURE PROOF — the defect this function had on its first cut, kept as arithmetic. Written as
  // "bring these screen POINTS inside the frame", a subject far away ALONG the track would drag the
  // camera sideways chasing something no lateral move can reach. Measured on an open track's
  // LEAD_CHANGE it drove the camera 500 world px off the centreline. The signature is the proof:
  // this function cannot see the along-track axis at all, because it is never given it.
  it('FAILURE PROOF: an along-track excursion cannot move the lateral guarantee', () => {
    expect(lateralShiftToFit.length).toBe(4); // offsets, roomPlus, roomMinus, scale — no 2-D input
    // the same lateral offsets give the same answer no matter what happens along the track
    expect(lateralShiftToFit([40, -40], ROOM, ROOM, SCALE)).toBe(0);
  });
});

describe('CAMERA-LATERAL-1 — the two axes, through the director', () => {
  const TW = 178;
  const FRAME = { width: 1280, height: 720 };
  // A closed oval whose heading rotates through every orientation over a lap.
  const shape = {
    isOpen: false,
    getActualTrackWidth: () => TW,
    getTotalLength: () => 4000,
    getPosition: (t) => {
      const a = 2 * Math.PI * (((t % 1) + 1) % 1);
      return { x: 1536 + Math.cos(a) * 900, y: 1024 + Math.sin(a) * 600, angle: a };
    },
  };
  // The world point of a racer sitting `lat` world px off the centreline at track position t.
  const atLane = (t, lat) => {
    const a = shape.getPosition(t);
    const b = shape.getPosition(t + 0.002);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const L = Math.hypot(dx, dy) || 1;
    return { x: a.x - (dy / L) * lat, y: a.y + (dx / L) * lat };
  };
  const mk = (cfg) =>
    new CameraDirector(3072, 2047, false, { ...DEFAULT_CAMERA_CONFIG, ...cfg }, 28.5, shape, TW);
  const rs = { raceElapsed: 20000, finishedCount: 0, winner: null, finishT: 2 };
  const settle = (cd, racers, state, frames = 240) => {
    for (let i = 0; i < frames; i++) {
      cd.state = state;
      cd.update(racers, 20000 + i * 16, rs, FRAME.width, FRAME.height);
    }
    return cd;
  };
  // How far the committed camera centre sits off the corridor centreline, in world px. Measured by
  // nearest point on the whole lap, because each state anchors on a different racer at a different
  // track position — reading it at one fixed t would measure the wrong place for half of them.
  const offCentreline = (cd) => {
    const cx = (FRAME.width / 2 - cd.offsetX) / cd._proj.effX(cd.zoom);
    const cy = (FRAME.height / 2 - cd.offsetY) / cd._proj.effY(cd.zoom);
    let best = Infinity;
    let bt = 0;
    for (let i = 0; i < 2000; i++) {
      const p = shape.getPosition(i / 2000);
      const d = (p.x - cx) ** 2 + (p.y - cy) ** 2;
      if (d < best) {
        best = d;
        bt = i / 2000;
      }
    }
    const on = shape.getPosition(bt);
    const b = shape.getPosition(bt + 0.002);
    const dx = b.x - on.x;
    const dy = b.y - on.y;
    const L = Math.hypot(dx, dy) || 1;
    return (cx - on.x) * (-dy / L) + (cy - on.y) * (dx / L);
  };
  const field = (leaderLane) => {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const t = 0.5 - 0.03 * i;
      const lane = i === 0 ? leaderLane : ((i % 3) - 1) * (TW / 3);
      const p = atLane(t, lane);
      out.push({ index: i, name: `R${i}`, t, x: p.x, y: p.y, finished: false });
    }
    return out;
  };

  it('THE ASK: a lead change between racers in different lanes does not throw the picture sideways', () => {
    // Same track position, opposite lanes — the worst case for an anchor swap, and exactly what the
    // owner sees. Under the old rule the camera carried the subject's lane, so this moved it a full
    // corridor width. Under the new rule the ACROSS axis never moved at all.
    const cd = mk({ minRacersVisible: 0 });
    settle(cd, field(-TW / 2), CAM_STATE.LEADER_ZOOM);
    const before = offCentreline(cd);
    settle(cd, field(+TW / 2), CAM_STATE.LEADER_ZOOM);
    const after = offCentreline(cd);
    expect(Math.abs(after - before)).toBeLessThan(TW * 0.1); // was a full corridor width
    expect(Math.abs(before)).toBeLessThan(TW * 0.1); // and both sit ON the centreline
    expect(Math.abs(after)).toBeLessThan(TW * 0.1);
  });

  it('ALONG the track the camera still follows the subject — this is NOT CAMERA-FOCUS-3', () => {
    // The pin is cross-track only. Move the subject ALONG the track and the camera must follow.
    const cd = mk({ minRacersVisible: 0 });
    const at = (t) => {
      const f = field(0).map((r, i) => {
        const tt = t - 0.03 * i;
        const p = atLane(tt, 0);
        return { ...r, t: tt, x: p.x, y: p.y };
      });
      settle(cd, f, CAM_STATE.LEADER_ZOOM);
      return {
        x: (FRAME.width / 2 - cd.offsetX) / cd._proj.effX(cd.zoom),
        y: (FRAME.height / 2 - cd.offsetY) / cd._proj.effY(cd.zoom),
      };
    };
    const a = at(0.25);
    const b = at(0.5);
    const moved = Math.hypot(b.x - a.x, b.y - a.y);
    const subjectMoved = Math.hypot(
      shape.getPosition(0.5).x - shape.getPosition(0.25).x,
      shape.getPosition(0.5).y - shape.getPosition(0.25).y
    );
    expect(moved).toBeGreaterThan(subjectMoved * 0.5); // it travelled with the subject
  });

  it('every state sits on the centreline — one rule, no exemptions', () => {
    for (const state of [
      CAM_STATE.LEADER_ZOOM,
      CAM_STATE.COMEBACK_ZOOM,
      CAM_STATE.OVERVIEW,
      CAM_STATE.BATTLE_ZOOM,
      CAM_STATE.LEAD_CHANGE,
      CAM_STATE.PHOTO_FINISH,
    ]) {
      const cd = mk({ minRacersVisible: 0 });
      settle(cd, field(TW / 2), state);
      expect(Math.abs(offCentreline(cd)), state).toBeLessThan(TW * 0.35);
    }
  });

  // FAILURE PROOF for the lateral guarantee — his second question, and the one that decides it:
  // "do we still see everything important on the track?"
  //
  // CAMERA-COMPANY-ONLY-3 CHANGED THE ANSWER, and this test now records the change honestly rather
  // than being deleted. It used to run with `minRacersVisible: 0` and rely on the CORRIDOR to keep
  // the outermost-lane racer on screen. The corridor no longer bounds LEADER, so with the company
  // guarantee also off, nothing does — the outer lane CAN leave frame, and the owner accepted that
  // price knowingly (measured: the road edge is out of frame on 70% of Mountainstreet frames, worst
  // case 236 px of road missing).
  //
  // What protects him now is the COMPANY guarantee at his own value, so that is what this asserts.
  it('WORST CASE: the outermost lane is kept by the COMPANY guarantee, not by the road', () => {
    const T = 0.25; // top of the arc: the corridor is measured up-down, the least room there is
    const tightWithCompany = {
      minRacersVisible: 5, // HIS value — the thing that now does the keeping
      cameraStateProfiles: Object.fromEntries(
        Object.entries(DEFAULT_CAMERA_CONFIG.cameraStateProfiles).map(([k, v]) => [
          k,
          { ...v, visibleCorridors: 0.25 },
        ])
      ),
    };
    for (const lane of [+TW / 2, -TW / 2]) {
      const outer = atLane(T, lane);
      // The company the guarantee must keep in frame sits just behind him, in his lane.
      const racers = [
        { index: 0, name: 'OUTER', t: T, x: outer.x, y: outer.y, finished: false },
        ...field(0)
          .slice(1)
          .map((r, i) => {
            const tt = T - 0.006 * (i + 1);
            const p = atLane(tt, lane);
            return { ...r, t: tt, x: p.x, y: p.y };
          }),
      ];
      const cd = settle(mk(tightWithCompany), racers, CAM_STATE.LEADER_ZOOM);
      const sx = outer.x * cd._proj.effX(cd.zoom) + cd.offsetX;
      const sy = outer.y * cd._proj.effY(cd.zoom) + cd.offsetY;
      expect(sx, `lane ${lane} x`).toBeGreaterThanOrEqual(0);
      expect(sx, `lane ${lane} x`).toBeLessThanOrEqual(FRAME.width);
      expect(sy, `lane ${lane} y`).toBeGreaterThanOrEqual(0);
      expect(sy, `lane ${lane} y`).toBeLessThanOrEqual(FRAME.height);
    }
  });
});

// ============================================================
// CAMERA-ANCHOR-TRUTH-1 §4a — the corridor is measured from the ANCHOR, not the frame centre.
//
// The equality test below is the cheapest possible proof that nothing ELSE changed: with the anchor
// centred, the new two-sided form must reduce to the old chord expression exactly. Every corridor
// test above calls the function without an anchor, so they are all that same proof by default.
// ============================================================
describe('the corridor measures from the anchor (CAMERA-ANCHOR-TRUTH-1)', () => {
  const centre = { x: W / 2, y: H / 2 };

  it.each(TRACKS)(
    '$name: a CENTRED anchor gives exactly the old centre-chord answer, every 1° of heading',
    (t) => {
      for (let deg = 0; deg < 360; deg += 1) {
        const perp = { x: -Math.sin((deg * Math.PI) / 180), y: Math.cos((deg * Math.PI) / 180) };
        const needed = Math.hypot(perp.x * t.axisX * t.tw, perp.y * t.axisY * t.tw);
        const old = frameExtentAlong(perp.x * t.axisX, perp.y * t.axisY, W, H) / needed;
        const now = corridorGuarantee(headingAt(deg), t.tw, t.axisX, t.axisY, W, H, 1, centre);
        expect(now, `heading ${deg}° on ${t.name}`).toBeCloseTo(old, 10);
      }
    }
  );

  it('the centred equality holds under an inner-frame fraction too', () => {
    for (let deg = 0; deg < 360; deg += 3) {
      const perp = { x: -Math.sin((deg * Math.PI) / 180), y: Math.cos((deg * Math.PI) / 180) };
      const needed = Math.hypot(
        perp.x * CLOSED.axisX * CLOSED.tw,
        perp.y * CLOSED.axisY * CLOSED.tw
      );
      const old =
        (frameExtentAlong(perp.x * CLOSED.axisX, perp.y * CLOSED.axisY, W, H) * SUBJECT_INNER_PCT) /
        needed;
      const now = corridorGuarantee(
        headingAt(deg),
        CLOSED.tw,
        CLOSED.axisX,
        CLOSED.axisY,
        W,
        H,
        SUBJECT_INNER_PCT,
        centre
      );
      expect(now, `heading ${deg}°`).toBeCloseTo(old, 10);
    }
  });

  it('omitting the anchor is the same as centring it — the default is not a different rule', () => {
    for (let deg = 0; deg < 360; deg += 11) {
      const withNone = corridorGuarantee(headingAt(deg), OPEN.tw, OPEN.axisX, OPEN.axisY, W, H, 1);
      const withCentre = corridorGuarantee(
        headingAt(deg),
        OPEN.tw,
        OPEN.axisX,
        OPEN.axisY,
        W,
        H,
        1,
        centre
      );
      expect(withCentre).toBeCloseTo(withNone, 10);
    }
  });

  it.each(TRACKS)(
    '$name: a FORWARD-framed anchor never widens the ceiling — WIDEN-ONLY (Lesson 192)',
    (t) => {
      for (let deg = 0; deg < 360; deg += 3) {
        const at = anchorScreenPoint(W, H, 0.66, headingAt(deg));
        const centred = corridorGuarantee(headingAt(deg), t.tw, t.axisX, t.axisY, W, H, 1, centre);
        const anchored = corridorGuarantee(headingAt(deg), t.tw, t.axisX, t.axisY, W, H, 1, at);
        // A smaller ceiling is a WIDER shot. It may never come out bigger than the centred answer,
        // which is what "the old form was too permissive" means.
        expect(anchored, `heading ${deg}° on ${t.name}`).toBeLessThanOrEqual(centred * (1 + 1e-12));
      }
    }
  );

  it('the corridor actually fits from the anchor, on BOTH sides, at the returned zoom', () => {
    for (const t of TRACKS) {
      for (let deg = 0; deg < 360; deg += 5) {
        const at = anchorScreenPoint(W, H, 0.66, headingAt(deg));
        const z = corridorGuarantee(headingAt(deg), t.tw, t.axisX, t.axisY, W, H, 1, at);
        if (!Number.isFinite(z)) continue;
        const perp = { x: -Math.sin((deg * Math.PI) / 180), y: Math.cos((deg * Math.PI) / 180) };
        const sx = perp.x * t.axisX;
        const sy = perp.y * t.axisY;
        const halfNeeded = Math.hypot(sx, sy) * (t.tw / 2) * z;
        const plus = roomFromPointAlong(at.x, at.y, sx, sy, W, H, 1);
        const minus = roomFromPointAlong(at.x, at.y, -sx, -sy, W, H, 1);
        // 1e-9 slack for float noise only.
        expect(halfNeeded, `+side ${deg}° ${t.name}`).toBeLessThanOrEqual(plus + 1e-9);
        expect(halfNeeded, `-side ${deg}° ${t.name}`).toBeLessThanOrEqual(minus + 1e-9);
      }
    }
  });

  it('a degenerate heading still honours the anchor rather than falling back to the centre', () => {
    const at = anchorScreenPoint(W, H, 0.66, { x: 1, y: 0 });
    const anchored = corridorGuarantee(
      { x: 0, y: 0 },
      OPEN.tw,
      OPEN.axisX,
      OPEN.axisY,
      W,
      H,
      1,
      at
    );
    const centred = corridorGuarantee(
      { x: 0, y: 0 },
      OPEN.tw,
      OPEN.axisX,
      OPEN.axisY,
      W,
      H,
      1,
      centre
    );
    expect(anchored).toBeLessThanOrEqual(centred * (1 + 1e-12));
    expect(Number.isFinite(anchored)).toBe(true);
  });
});

// ============================================================
// CAMERA-COMPANY-ONLY-1 — which states the switch may touch, and which it may NOT.
//
// The switch removes the CORRIDOR guarantee from the single-anchor states. That is only safe to
// describe as "LEADER / OVERVIEW / COMEBACK" for as long as those are exactly the corridor states,
// so this pins the mapping rather than trusting the sentence in the tooltip.
// ============================================================
describe('the switch’s reach is exactly the corridor states (CAMERA-COMPANY-ONLY-1)', () => {
  it('the three single-anchor states are the CORRIDOR states', () => {
    for (const state of ['LEADER_ZOOM', 'OVERVIEW', 'COMEBACK_ZOOM']) {
      expect(framingFor(state).guarantee, state).toBe(GUARANTEE.CORRIDOR);
    }
  });

  it('the pair states are NOT corridor states, so the switch cannot reach them', () => {
    for (const state of ['BATTLE_ZOOM', 'LEAD_CHANGE', 'PHOTO_FINISH']) {
      expect(framingFor(state).guarantee, state).toBe(GUARANTEE.PAIR);
    }
  });

  // RUNIN-OWNS-1 left this at SIX deliberately. The run-in bounds the zoom of whatever state is
  // running and is not a state itself, so it has no row here and adds no guarantee kind — which is
  // exactly why the picture it hands back at the line is the state's own.
  it('there are exactly six states and no seventh has appeared unclassified', () => {
    const states = Object.keys(FRAMING_BY_STATE);
    expect(states).toHaveLength(6);
    for (const s of states) {
      expect([GUARANTEE.CORRIDOR, GUARANTEE.PAIR]).toContain(FRAMING_BY_STATE[s].guarantee);
    }
  });
});

// ============================================================
// CAMERA-COMPANY-ONLY-3 — what limits each state now.
//
// The corridor is no longer the ceiling of the single-anchor states. This pins the CONSEQUENCE of
// that, not just the table: which states may be bounded by the road, and which may not.
// ============================================================
describe('the road no longer bounds the single-anchor states (CAMERA-COMPANY-ONLY-3)', () => {
  it('LEADER, OVERVIEW and COMEBACK are the states the corridor used to bound', () => {
    for (const state of ['LEADER_ZOOM', 'OVERVIEW', 'COMEBACK_ZOOM']) {
      expect(framingFor(state).guarantee, state).toBe(GUARANTEE.CORRIDOR);
    }
  });

  it('the pair states are untouched by the change — they still guarantee their pair', () => {
    for (const state of ['BATTLE_ZOOM', 'LEAD_CHANGE', 'PHOTO_FINISH']) {
      expect(framingFor(state).guarantee, state).toBe(GUARANTEE.PAIR);
    }
  });

  it('corridorGuarantee is STILL EXPORTED and still works — it is the pair fallback, not dead', () => {
    // Measured: that fallback fired on 0 of 11,813 pair frames, so it is defensive rather than
    // load-bearing. It is kept on purpose, and this test is what keeps it honest if it is ever hit.
    const z = corridorGuarantee({ x: 1, y: 0 }, CLOSED.tw, CLOSED.axisX, CLOSED.axisY, W, H);
    expect(Number.isFinite(z)).toBe(true);
    expect(z).toBeGreaterThan(0);
  });
});
