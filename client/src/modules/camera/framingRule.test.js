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
} from './framingRule.js';
import { CameraDirector, CAM_STATE } from './CameraDirector.js';
import { DEFAULT_CAMERA_CONFIG } from '../cameraConfig.js';
import { frameExtentAlong } from './frameGeometry.js';

const W = 1280;
const H = 720;

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
  // The company vector runs FROM the anchor, which sits at the centre, so the room available is the
  // half-extent — the same `reach` the guarantee itself applies. A helper that used the full extent
  // would agree with a guarantee twice as generous as the real one.
  const REACH = 0.5;
  const fits = (r, z, reach = REACH) => {
    const sx = (r.x - anchor.x) * CLOSED.axisX * z;
    const sy = (r.y - anchor.y) * CLOSED.axisY * z;
    return Math.hypot(sx, sy) <= frameExtentAlong(sx, sy, W, H) * reach + 1e-9;
  };
  const g = (racers, n, inner = 1) =>
    companyGuarantee(anchor, racers, n, CLOSED.axisX, CLOSED.axisY, W, H, inner, REACH);

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

  it('respects the inner-frame fraction', () => {
    const field = [at(0, 0), at(400, 0)];
    expect(g(field, 2, 0.7)).toBeCloseTo(g(field, 2, 1) * 0.7, 9);
  });

  it('reach scales the room: a forward-framed subject has more of the frame behind him', () => {
    const field = [at(0, 0), at(400, 0)];
    const centred = companyGuarantee(anchor, field, 2, CLOSED.axisX, CLOSED.axisY, W, H, 1, 0.5);
    const forward = companyGuarantee(anchor, field, 2, CLOSED.axisX, CLOSED.axisY, W, H, 1, 0.66);
    expect(forward).toBeGreaterThan(centred); // more room behind = a tighter shot is allowed
    expect(forward / centred).toBeCloseTo(0.66 / 0.5, 6);
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
      LEADER_ZOOM: { ...DEFAULT_CAMERA_CONFIG.cameraStateProfiles.LEADER_ZOOM, trackWidths: 0.5 },
    },
  });

  it('catches a tight LEADER setting when the shot would go empty', () => {
    const racers = brokenAway();
    const off = settle(mk(tight(0)), racers);
    const on = settle(mk(tight(3)), racers);
    expect(visibleCount(on, racers)).toBeGreaterThanOrEqual(3);
    expect(on.visibleTrackWidths).toBeGreaterThan(off.visibleTrackWidths); // it widened
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
            trackWidths: 6,
          },
        },
      }),
      racers
    );
    expect(wide.visibleTrackWidths).toBeCloseTo(6, 1);
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

  it('turning it off restores the pre-guarantee picture exactly', () => {
    const racers = brokenAway();
    const a = settle(mk({ ...tight(0) }), racers);
    const b = settle(mk({ ...tight(1) }), racers);
    expect(b.targetZoom).toBeCloseTo(a.targetZoom, 9);
  });
});
