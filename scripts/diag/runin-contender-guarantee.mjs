// RUNIN-CONTENDER-GUARANTEE-1 — the SHAPE of the shot "everyone who can still win stays in frame"
// would produce, measured WITHOUT building it.
//
// MEASURE ONLY. It changes no camera code, no default and no rule. It drives the real
// `CameraDirector`, reads the shot the director actually composed, and computes BESIDE it what the
// width would have been under the proposed guarantee. Nothing it computes is fed back in.
//
// TWO PASSES OVER ONE RACE, AND WHY THERE MUST BE TWO. The requirement says "everyone who can still
// win, OR WHO WINS". **The winner is not knowable during the window being measured**: `finishRank`
// is assigned as a racer crosses, and the run-in releases at the FIRST crossing (`_updateRunIn`
// returns Infinity once `finishedCount > 0`), so every frame here sees a field of rank 0. Pass A
// therefore snapshots the frame; pass B runs once the order exists. No race is run twice.
//
// THE COUNTERFACTUAL, stated once because every number below rests on it:
//   **ZOOM ABOUT THE ANCHOR, ANCHOR SCREEN POSITION UNCHANGED.**
// A guarantee WIDENS, it never steers (Lesson 192), and `anchorScreenPoint` takes no zoom — the
// anchor's place IN FRAME is a fraction of the frame and a heading, both zoom-independent. So a
// change of width holds the anchor where it is on screen and re-solves the offset:
//     anchorScreen = anchorWorld * eff(z)  + offset          (the shipped frame, read out)
//     offset'      = anchorScreen - anchorWorld * eff(z')    (the counterfactual)
// That is exactly what `_applyLeaderForwardBias` does with a different `eff`. Its one gap is
// `_applyLateralGuarantee`, which may shift further off the centreline when a guaranteed subject
// needs it — omitted here, and it can only ever help, so every "still off frame" below is
// conservative.
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdirSync, writeFileSync } from "node:fs";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(u("client/src/modules/storage/defaults.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));
const { effectiveZoom, OPEN_TRACK_BASE_ZOOM } = await import(
  u("client/src/modules/camera/openTrackCamera.js")
);
const { contenderGuarantee, zoomCeilingToFit } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const { frameExtentAlong } = await import(u("client/src/modules/camera/frameGeometry.js"));
const { shortestArcDeltaT } = await import(u("client/src/utils/mathUtils.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);

const arg = (k, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${k}=`));
  return hit ? hit.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const RACERS = Number(arg("racers", "20"));
const SEED_FROM = Number(arg("from", "1"));
const SEED_TO = Number(arg("to", "50"));
const OUT = arg("out", "c:/tmp/runin-cg");
/** Races whose per-FRAME series is kept in full — his twelve, plus the worked example. */
const TRACE = new Set((arg("trace", "") || "").split(",").filter(Boolean));

/** The contention watch's own cadence, read from config rather than chosen here. */
const CHECK_MS = DEFAULT_CAMERA_CONFIG.contentionCheckMs ?? 250;
/** Multiples of the tree's OWN contact length. Reported as a curve; nothing here picks one. */
const TOL = [1, 2, 3, 5];
/** "Opposite sides of the road", as fractions of the road width. Reported as a curve. */
const OPP = [0.3, 0.4, 0.5];

function measure(geo, seed) {
  const identity = resolveIdentity({
    racers: RACERS,
    raceSeed: seed,
    racerType: TRACK_DEFAULT_RACER,
    roster: ROSTER,
    note: "runin-contender-guarantee",
  });
  const race = buildRace(geo, identity, DEFAULT_CAMERA_CONFIG);
  const { st, shape, trackWidthPx } = race;
  const CW = identity.canvasW;
  const CH = identity.canvasH;
  const BSX = CW / (geo.worldWidth || 1280);
  const BSY = CH / (geo.worldHeight || 720);
  const isOpen = !geo.closed;
  const axisX = isOpen ? OPEN_TRACK_BASE_ZOOM : BSX;
  const axisY = isOpen ? OPEN_TRACK_BASE_ZOOM : BSY;
  const effOf = (z) =>
    isOpen
      ? { x: effectiveZoom(z, OPEN_TRACK_BASE_ZOOM), y: effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) }
      : { x: z * BSX, y: z * BSY };
  const keepTrace = TRACE.has(`${geo.id}-${RACERS}-${seed}`);

  /** THE FINISH LINE as a world point — for "is the line still findable". */
  const linePt = shape.getPosition(isOpen ? st.finishT : st.finishT % 1, 0);

  // ── PASS A — snapshot every run-in frame ──────────────────────────────────────────────────────
  const snaps = [];
  let lastSample = null;
  let nextSampleTs = 0;

  runRace(
    race,
    identity,
    DEFAULT_CAMERA_CONFIG,
    ({ cd: dir, st: state, ts }) => {
      if (!(state.finishT > 0)) return;
      const fp = dir._framingProbe;
      if (!fp || !fp.runInActive) return;

      const racers = state.racers;
      let leader = null;
      let maxT = -Infinity;
      for (const r of racers)
        if (r.t > maxT) {
          maxT = r.t;
          leader = r;
        }
      if (!leader) return;
      const ordered = [...racers].sort((a, b) => b.t - a.t);
      const pathLen = leader.pathLengthPx ?? 0;

      // THE RATE TRAIL, at the contention watch's own cadence and window.
      if (ts >= nextSampleTs) {
        const m = new Map();
        for (const r of racers) m.set(r.index, r.t);
        lastSample = { ts, cur: m, prev: lastSample?.cur ?? null, prevTs: lastSample?.ts ?? null };
        nextSampleTs = ts + CHECK_MS;
      }
      const rateOf = (r) => {
        if (!lastSample?.prev || !(lastSample.ts > lastSample.prevTs)) return null;
        const p = lastSample.prev.get(r.index);
        const c = lastSample.cur.get(r.index);
        if (p === undefined || c === undefined) return null;
        return ((c - p) * pathLen) / (lastSample.ts - lastSample.prevTs);
      };

      // ── THE SHIPPED RULE: the director's own `_abreastContenders` — one body length along-track
      // NOW plus a free lane. Called read-only; it mutates nothing on the director.
      const setShip = dir._abreastContenders(ordered) ?? ordered.slice(0, 2);

      // ── MY READING (marked as mine in the report): the tree's OWN predictive test from
      // `_updateContention`, applied as an ADMISSION test every frame over the whole field rather
      // than only ever as a release. It introduces no constant — `contactLength`, the cadence and
      // the projection are all the director's.
      const vLeader = rateOf(leader);
      const msToLine = vLeader > 0 ? ((state.finishT - leader.t) * pathLen) / vLeader : null;
      const evaluable = msToLine !== null && msToLine >= 0 && pathLen > 0;
      const predAt = (mult) => {
        if (!evaluable) return null;
        const out = [leader.index];
        for (const r of ordered) {
          if (r.index === leader.index) continue;
          const vR = rateOf(r);
          if (vR === null) continue;
          const gapNow = shortestArcDeltaT(leader.t, r.t) * pathLen;
          const contact = ((leader.drawnBodyLengthPx ?? 0) + (r.drawnBodyLengthPx ?? 0)) / 2;
          if (!(contact > 0)) continue;
          if (gapNow + (vLeader - vR) * msToLine <= contact * mult) out.push(r.index);
        }
        return out;
      };
      const predIdx = predAt(1);
      const tolSizes = {};
      for (const k of TOL) {
        const s = predAt(k);
        tolSizes[k] = s ? s.length : null;
      }

      const h = dir._headingAt(leader.t);
      const hL = h ? Math.hypot(h.x, h.y) : 0;
      const hn = hL > 0 ? { x: h.x / hL, y: h.y / hL } : { x: 1, y: 0 };
      const anchorW = fp.afterLateral ?? fp.anchorPoint ?? { x: leader.x, y: leader.y };

      const n = racers.length;
      const xs = new Array(n);
      const ys = new Array(n);
      const bmax = new Array(n);
      const blen = new Array(n);
      const idx = new Array(n);
      for (let i = 0; i < n; i++) {
        const r = racers[i];
        xs[i] = r.x ?? 0;
        ys[i] = r.y ?? 0;
        bmax[i] = Math.max(r.drawnBodyLengthPx ?? 0, r.drawnBodyWidthPx ?? 0) / 2 || 0;
        blen[i] = r.drawnBodyLengthPx ?? 0;
        idx[i] = r.index;
      }

      snaps.push({
        u: dir._runInProgress ?? 0,
        setShip: setShip.map((r) => r.index),
        setPred: predIdx,
        evaluable,
        tolSizes,
        xs,
        ys,
        bmax,
        blen,
        idx,
        leaderIdx: leader.index,
        zShip: dir.zoom ?? 0,
        oxS: dir.offsetX ?? 0,
        oyS: dir.offsetY ?? 0,
        ax: anchorW.x,
        ay: anchorW.y,
        hnx: hn.x,
        hny: hn.y,
        fwd: dir._forwardFracNow() ?? 0.5,
        inner: dir._innerFramePct ?? 1,
        pad: dir._drawnBodyWidthRefPx ?? 0,
      });
    },
    { slowmo: true }
  );

  const ranked = st.racers
    .filter((r) => r.finishRank > 0)
    .sort((a, b) => a.finishRank - b.finishRank);
  if (!ranked.length || !snaps.length) return null;
  const winnerIdx = ranked[0].index;
  const top5 = new Set(ranked.slice(0, 5).map((r) => r.index));

  // ── PASS B — everything that needed the finishing order ───────────────────────────────────────
  const bump = (h, k) => {
    h[k] = (h[k] ?? 0) + 1;
  };
  const acc = {
    frames: 0,
    notEvaluable: 0,
    sizeShip: {},
    sizePred: {},
    sizePredTol: Object.fromEntries(TOL.map((k) => [k, {}])),
    winnerInShip: 0,
    winnerInPred: 0,
    quarter: [0, 1, 2, 3].map(() => ({ n: 0, sumShip: 0, sumPred: 0, winShip: 0, winPred: 0 })),
    alongBinds: 0,
    acrossBinds: 0,
    sumAlongPx: 0,
    sumAcrossPx: 0,
    maxAlongPx: 0,
    maxAcrossPx: 0,
    wider: 0,
    tighter: 0,
    same: 0,
    sumLnSoleVsShip: 0,
    maxLnWider: 0,
    maxLnTighter: 0,
    sumAcrossRoomShip: 0,
    sumAcrossRoomReq: 0,
    roadHeldShip: 0,
    roadHeldReq: 0,
    levelOpp: Object.fromEntries(OPP.map((k) => [k, 0])),
    levelOppWider: 0,
    sumLevelOppLn: 0,
    levelOppAcrossPx: 0,
    winnerOffShip: 0,
    winnerOffReq: 0,
    top5OffShip: 0,
    top5OffReq: 0,
    setOffShip: 0,
    setOffReq: 0,
    lineInShip: 0,
    lineInReq: 0,
    lineInRoad: 0,
    sumEmptyRoadShip: 0,
    sumEmptyRoadReq: 0,
    sumEmptyRoadRoad: 0,
    roadWiderThanReq: 0,
    sumLnRoadVsReq: 0,
    sumAheadShip: 0,
    sumAheadReq: 0,
    sumFwd: 0,
    sumBodyFracShip: 0,
    sumBodyFracReq: 0,
  };
  const series = [];

  for (const s of snaps) {
    acc.frames++;
    if (!s.evaluable) acc.notEvaluable++;
    const pos = new Map();
    for (let i = 0; i < s.idx.length; i++) pos.set(s.idx[i], i);
    const pt = (i) => ({ x: s.xs[i], y: s.ys[i] });

    // THE SETS, with "or who wins" applied as the requirement words it.
    const shipIdx = s.setShip;
    const predIdx = s.setPred ?? s.setShip;
    const winInShip = shipIdx.includes(winnerIdx);
    const winInPred = predIdx.includes(winnerIdx);
    const setW = winInPred ? predIdx : [...predIdx, winnerIdx];
    bump(acc.sizeShip, shipIdx.length);
    bump(acc.sizePred, predIdx.length);
    for (const k of TOL) if (s.tolSizes[k] !== null) bump(acc.sizePredTol[k], s.tolSizes[k]);
    if (winInShip) acc.winnerInShip++;
    if (winInPred) acc.winnerInPred++;
    const q = Math.min(3, Math.floor(s.u * 4));
    acc.quarter[q].n++;
    acc.quarter[q].sumShip += shipIdx.length;
    acc.quarter[q].sumPred += predIdx.length;
    if (winInShip) acc.quarter[q].winShip++;
    if (winInPred) acc.quarter[q].winPred++;

    // ── BOTH AXES, against the leader's own heading ───────────────────────────────────────────
    const perp = { x: -s.hny, y: s.hnx };
    let maxAlong = 0;
    let maxAcross = 0;
    const oppHit = Object.fromEntries(OPP.map((k) => [k, false]));
    let oppAcross = 0;
    const members = setW.map((k) => pos.get(k)).filter((i) => i !== undefined);
    for (let a = 0; a < members.length; a++) {
      for (let b = a + 1; b < members.length; b++) {
        const i = members[a];
        const j = members[b];
        const dx = s.xs[j] - s.xs[i];
        const dy = s.ys[j] - s.ys[i];
        const al = Math.abs(dx * s.hnx + dy * s.hny);
        const ac = Math.abs(dx * perp.x + dy * perp.y);
        if (al > maxAlong) maxAlong = al;
        if (ac > maxAcross) maxAcross = ac;
        const contact = (s.blen[i] + s.blen[j]) / 2;
        if (contact > 0 && al <= contact) {
          for (const k of OPP)
            if (ac >= trackWidthPx * k) {
              oppHit[k] = true;
              if (ac > oppAcross) oppAcross = ac;
            }
        }
      }
    }
    acc.sumAlongPx += maxAlong;
    acc.sumAcrossPx += maxAcross;
    if (maxAlong > acc.maxAlongPx) acc.maxAlongPx = maxAlong;
    if (maxAcross > acc.maxAcrossPx) acc.maxAcrossPx = maxAcross;

    const zAlong = zoomCeilingToFit(
      { x: s.hnx * (maxAlong + s.pad), y: s.hny * (maxAlong + s.pad) },
      axisX, axisY, CW, CH, s.inner
    );
    const zAcross = zoomCeilingToFit(
      { x: perp.x * (maxAcross + s.pad), y: perp.y * (maxAcross + s.pad) },
      axisX, axisY, CW, CH, s.inner
    );
    if (Number.isFinite(zAlong) || Number.isFinite(zAcross)) {
      if (zAcross < zAlong) acc.acrossBinds++;
      else acc.alongBinds++;
    }

    // ── THE WIDTH IT WOULD DEMAND ─────────────────────────────────────────────────────────────
    const ceiling = contenderGuarantee(members.map(pt), axisX, axisY, CW, CH, s.inner, s.pad);
    const zShip = s.zShip;
    const zReq = Number.isFinite(ceiling) ? Math.min(zShip, ceiling) : zShip; // widen-only
    const zSole = Number.isFinite(ceiling) ? ceiling : zShip; // sole author
    if (zShip > 0 && zSole > 0) {
      const ln = Math.log(zSole / zShip);
      acc.sumLnSoleVsShip += ln;
      if (ln < -1e-9) {
        acc.wider++;
        if (-ln > acc.maxLnWider) acc.maxLnWider = -ln;
      } else if (ln > 1e-9) {
        acc.tighter++;
        if (ln > acc.maxLnTighter) acc.maxLnTighter = ln;
      } else acc.same++;
    }

    // ── THE COUNTERFACTUAL FRAMES ─────────────────────────────────────────────────────────────
    const eS = effOf(zShip);
    const eR = effOf(zReq);
    const anchorSX = s.ax * eS.x + s.oxS;
    const anchorSY = s.ay * eS.y + s.oyS;
    const oxR = anchorSX - s.ax * eR.x;
    const oyR = anchorSY - s.ay * eR.y;
    const zRoadRaw = zoomCeilingToFit(
      { x: perp.x * trackWidthPx, y: perp.y * trackWidthPx },
      axisX, axisY, CW, CH, 1
    );
    const zRoad = Number.isFinite(zRoadRaw) ? Math.min(zShip, zRoadRaw) : zShip;
    const eRoad = effOf(zRoad);
    const oxRd = anchorSX - s.ax * eRoad.x;
    const oyRd = anchorSY - s.ay * eRoad.y;

    const offAt = (i, eff, ox, oy) => {
      const sx = s.xs[i] * eff.x + ox;
      const sy = s.ys[i] * eff.y + oy;
      const rx = s.bmax[i] * eff.x;
      const ry = s.bmax[i] * eff.y;
      return sx + rx < 0 || sx - rx > CW || sy + ry < 0 || sy - ry > CH;
    };
    const wi = pos.get(winnerIdx);
    if (wi !== undefined) {
      if (offAt(wi, eS, s.oxS, s.oyS)) acc.winnerOffShip++;
      if (offAt(wi, eR, oxR, oyR)) acc.winnerOffReq++;
    }
    let t5Ship = false;
    let t5Req = false;
    for (let i = 0; i < s.idx.length; i++) {
      if (!top5.has(s.idx[i])) continue;
      if (offAt(i, eS, s.oxS, s.oyS)) t5Ship = true;
      if (offAt(i, eR, oxR, oyR)) t5Req = true;
    }
    if (t5Ship) acc.top5OffShip++;
    if (t5Req) acc.top5OffReq++;
    if (members.some((i) => offAt(i, eS, s.oxS, s.oyS))) acc.setOffShip++;
    if (members.some((i) => offAt(i, eR, oxR, oyR))) acc.setOffReq++;

    const ptIn = (p, eff, ox, oy) => {
      const sx = p.x * eff.x + ox;
      const sy = p.y * eff.y + oy;
      return sx >= 0 && sx <= CW && sy >= 0 && sy <= CH;
    };
    if (linePt) {
      if (ptIn(linePt, eS, s.oxS, s.oyS)) acc.lineInShip++;
      if (ptIn(linePt, eR, oxR, oyR)) acc.lineInReq++;
      if (ptIn(linePt, eRoad, oxRd, oyRd)) acc.lineInRoad++;
    }
    const acrossRoom = (eff) => {
      const sxv = perp.x * eff.x;
      const syv = perp.y * eff.y;
      const L = Math.hypot(sxv, syv);
      return L > 0 ? frameExtentAlong(sxv, syv, CW, CH) / L : 0;
    };
    const arS = acrossRoom(eS);
    const arR = acrossRoom(eR);
    const arRoad = acrossRoom(eRoad);
    acc.sumAcrossRoomShip += arS;
    acc.sumAcrossRoomReq += arR;
    if (arS >= trackWidthPx) acc.roadHeldShip++;
    if (arR >= trackWidthPx) acc.roadHeldReq++;
    acc.sumEmptyRoadShip += arS > 0 ? Math.max(0, 1 - trackWidthPx / arS) : 0;
    acc.sumEmptyRoadReq += arR > 0 ? Math.max(0, 1 - trackWidthPx / arR) : 0;
    acc.sumEmptyRoadRoad += arRoad > 0 ? Math.max(0, 1 - trackWidthPx / arRoad) : 0;
    if (zRoad < zReq - 1e-12) acc.roadWiderThanReq++;
    if (zRoad > 0 && zReq > 0) acc.sumLnRoadVsReq += Math.log(zRoad / zReq);

    // ── THE FORWARD VIEW, in the run-in's own terms ───────────────────────────────────────────
    const aheadWorld = (eff) => {
      const hx = s.hnx * eff.x;
      const hy = s.hny * eff.y;
      const L = Math.hypot(hx, hy);
      if (!(L > 0)) return 0;
      return (frameExtentAlong(hx, hy, CW, CH) * (1 - s.fwd)) / L;
    };
    acc.sumAheadShip += aheadWorld(eS);
    acc.sumAheadReq += aheadWorld(eR);
    acc.sumFwd += s.fwd;
    const li = pos.get(s.leaderIdx);
    if (li !== undefined) {
      acc.sumBodyFracShip += (s.blen[li] * eS.y) / CH;
      acc.sumBodyFracReq += (s.blen[li] * eR.y) / CH;
    }

    for (const k of OPP) if (oppHit[k]) acc.levelOpp[k]++;
    if (oppHit[0.5]) {
      if (zReq < zShip - 1e-12) acc.levelOppWider++;
      if (zShip > 0 && zSole > 0) acc.sumLevelOppLn += Math.log(zSole / zShip);
      if (oppAcross > acc.levelOppAcrossPx) acc.levelOppAcrossPx = oppAcross;
    }

    if (keepTrace) {
      series.push({
        u: +s.u.toFixed(4),
        nShip: shipIdx.length,
        nPred: predIdx.length,
        winIn: winInPred ? 1 : 0,
        along: Math.round(maxAlong),
        across: Math.round(maxAcross),
        binds: zAcross < zAlong ? "across" : "along",
        zShip: +zShip.toFixed(4),
        zCeil: Number.isFinite(ceiling) ? +ceiling.toFixed(4) : null,
        wOffShip: wi !== undefined ? (offAt(wi, eS, s.oxS, s.oyS) ? 1 : 0) : null,
        wOffReq: wi !== undefined ? (offAt(wi, eR, oxR, oyR) ? 1 : 0) : null,
        arS: Math.round(arS),
        arR: Math.round(arR),
      });
    }
  }

  return {
    track: geo.id || geo.name,
    seed,
    racers: RACERS,
    trackWidthPx: Math.round(trackWidthPx),
    closed: !!geo.closed,
    winnerIndex: winnerIdx,
    acc,
    series: keepTrace ? series : null,
  };
}

mkdirSync(OUT, { recursive: true });
const tracks = loadTracks().filter((g) => !ONLY || (g.id || g.name) === ONLY);
const results = [];
for (const geo of tracks) {
  for (let seed = SEED_FROM; seed <= SEED_TO; seed++) {
    try {
      const r = measure(geo, seed);
      if (r) results.push(r);
    } catch (e) {
      results.push({ track: geo.id || geo.name, seed, racers: RACERS, error: String(e) });
    }
  }
}
const tag = `${ONLY ?? "all"}-${RACERS}-${SEED_FROM}_${SEED_TO}`;
writeFileSync(`${OUT}/${tag}.json`, JSON.stringify(results));
process.stdout.write(`${tag}: races ${results.filter((r) => r.acc).length}\n`);
