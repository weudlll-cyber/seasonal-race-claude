// RUNIN-CONTENDER-GUARANTEE-1, second pass — TWO QUESTIONS THE FIRST PASS RAISED.
//
// MEASURE ONLY. Same counterfactual as the first pass (zoom about the anchor, anchor screen position
// unchanged); nothing is changed, added or fed back.
//
// QUESTION 1 — WHY ONE OF HIS TWELVE IS NOT FIXED. `pairGuarantee` fits the vector BETWEEN two
// racers. It therefore guarantees the set's SPAN fits the frame's centre chord — NOT that the set is
// IN the frame. A pair running wide TOGETHER has a small span and a large common offset from the
// anchor, and the anchor is the pair's midpoint taken ON THE RACING LINE (`getPanTarget` uses
// `shape.getPosition((r0.t + r1.t) / 2, 0)`), so that common offset is invisible to the guarantee.
// This pass measures it, and measures what an ANCHOR-MEASURED contender ceiling would deliver —
// the same repair CAMERA-ANCHOR-TRUTH-1 already made to `corridorGuarantee`, which took `anchorAt`
// for exactly this reason and which `pairGuarantee` never received.
//
// QUESTION 2 — THE FALLBACK, COMPARED AS A PURE DEMAND. The first pass compared widen-only widths,
// so on every frame where the shipped shot was already the wider one both readings collapsed onto
// it. Here the contender width and the full-road width are each computed as the width that term
// ALONE asks for, which is the comparison the brief wants.
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
const { frameExtentAlong, roomFromPointAlong } = await import(
  u("client/src/modules/camera/frameGeometry.js")
);
const { shortestArcDeltaT } = await import(u("client/src/utils/mathUtils.js"));
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const CHECK_MS = DEFAULT_CAMERA_CONFIG.contentionCheckMs ?? 250;

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const ONLY = arg("track", null);
const RACERS = Number(arg("racers", "20"));
const SEED_FROM = Number(arg("from", "1"));
const SEED_TO = Number(arg("to", "60"));
const OUT = arg("out", "c:/tmp/runin-cg-anchor");

function measure(geo, seed) {
  const identity = resolveIdentity({
    racers: RACERS, raceSeed: seed, racerType: TRACK_DEFAULT_RACER, roster: ROSTER,
    note: "runin-cg-anchor",
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
  const linePt = shape.getPosition(isOpen ? st.finishT : st.finishT % 1, 0);

  const snaps = [];
  let lastSample = null;
  let nextSampleTs = 0;

  runRace(race, identity, DEFAULT_CAMERA_CONFIG, ({ cd: dir, st: state, ts }) => {
    if (!(state.finishT > 0)) return;
    const fp = dir._framingProbe;
    if (!fp || !fp.runInActive) return;
    const racers = state.racers;
    let leader = null;
    let maxT = -Infinity;
    for (const r of racers) if (r.t > maxT) { maxT = r.t; leader = r; }
    if (!leader) return;
    const ordered = [...racers].sort((a, b) => b.t - a.t);
    const pathLen = leader.pathLengthPx ?? 0;
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
    const vLeader = rateOf(leader);
    const msToLine = vLeader > 0 ? ((state.finishT - leader.t) * pathLen) / vLeader : null;
    const pred = [leader.index];
    if (msToLine !== null && msToLine >= 0 && pathLen > 0) {
      for (const r of ordered) {
        if (r.index === leader.index) continue;
        const vR = rateOf(r);
        if (vR === null) continue;
        const gapNow = shortestArcDeltaT(leader.t, r.t) * pathLen;
        const contact = ((leader.drawnBodyLengthPx ?? 0) + (r.drawnBodyLengthPx ?? 0)) / 2;
        if (contact > 0 && gapNow + (vLeader - vR) * msToLine <= contact) pred.push(r.index);
      }
    }
    const h = dir._headingAt(leader.t);
    const hL = h ? Math.hypot(h.x, h.y) : 0;
    const hn = hL > 0 ? { x: h.x / hL, y: h.y / hL } : { x: 1, y: 0 };
    const anchorW = fp.afterLateral ?? fp.anchorPoint ?? { x: leader.x, y: leader.y };
    const n = racers.length;
    const xs = [], ys = [], bmax = [], idx = [];
    for (let i = 0; i < n; i++) {
      const r = racers[i];
      xs.push(r.x ?? 0); ys.push(r.y ?? 0);
      bmax.push(Math.max(r.drawnBodyLengthPx ?? 0, r.drawnBodyWidthPx ?? 0) / 2 || 0);
      idx.push(r.index);
    }
    snaps.push({
      u: dir._runInProgress ?? 0, pred, xs, ys, bmax, idx,
      zShip: dir.zoom ?? 0, oxS: dir.offsetX ?? 0, oyS: dir.offsetY ?? 0,
      ax: anchorW.x, ay: anchorW.y, hnx: hn.x, hny: hn.y,
      fwd: dir._forwardFracNow() ?? 0.5,
      inner: dir._innerFramePct ?? 1, pad: dir._drawnBodyWidthRefPx ?? 0,
    });
  }, { slowmo: true });

  const ranked = st.racers.filter((r) => r.finishRank > 0).sort((a, b) => a.finishRank - b.finishRank);
  if (!ranked.length || !snaps.length) return null;
  const winnerIdx = ranked[0].index;

  const acc = {
    frames: 0, setGE2: 0,
    // Q1 — the common offset the SPAN guarantee cannot see
    sumMaxAnchorOffset: 0, maxAnchorOffset: 0,
    spanOnlyWinnerOff: 0, anchorMeasuredWinnerOff: 0, shippedWinnerOff: 0,
    anchorTighterThanSpan: 0, sumLnAnchorVsSpan: 0,
    // Q2 — the fallback as a PURE demand (frames with a set of >= 2 only)
    sumEmptySole: 0, sumEmptyRoadPure: 0,
    lineInSole: 0, lineInRoadPure: 0, lineInShip: 0,
    roadWiderPure: 0, sumLnRoadVsSolePure: 0,
    sumAcrossSole: 0, sumAcrossRoadPure: 0,
  };

  for (const s of snaps) {
    acc.frames++;
    const pos = new Map();
    for (let i = 0; i < s.idx.length; i++) pos.set(s.idx[i], i);
    const setW = s.pred.includes(winnerIdx) ? s.pred : [...s.pred, winnerIdx];
    const members = setW.map((k) => pos.get(k)).filter((i) => i !== undefined);
    const perp = { x: -s.hny, y: s.hnx };
    const eS = effOf(s.zShip);
    const anchorSX = s.ax * eS.x + s.oxS;
    const anchorSY = s.ay * eS.y + s.oyS;
    const at = { x: anchorSX, y: anchorSY };

    // ── THE SPAN CEILING — what ships today would compute ─────────────────────────────────────
    const spanCeil = contenderGuarantee(
      members.map((i) => ({ x: s.xs[i], y: s.ys[i] })), axisX, axisY, CW, CH, s.inner, s.pad
    );
    // ── THE ANCHOR-MEASURED CEILING — each member against the room the frame ACTUALLY has from
    // where the anchor sits, which is what `corridorGuarantee` was repaired to do.
    let anchorCeil = Infinity;
    let maxOff = 0;
    for (const i of members) {
      const dx = s.xs[i] - s.ax;
      const dy = s.ys[i] - s.ay;
      const off = Math.hypot(dx, dy);
      if (off > maxOff) maxOff = off;
      const vx = dx * axisX;
      const vy = dy * axisY;
      const need = Math.hypot(vx, vy);
      if (!(need > 0)) continue;
      const room = roomFromPointAlong(at.x, at.y, vx, vy, CW, CH, s.inner);
      const withPad = need + s.pad * Math.hypot(axisX, axisY) * 0.5;
      const c = room > 0 ? room / withPad : Infinity;
      if (c < anchorCeil) anchorCeil = c;
    }
    acc.sumMaxAnchorOffset += maxOff;
    if (maxOff > acc.maxAnchorOffset) acc.maxAnchorOffset = maxOff;

    const zSpan = Number.isFinite(spanCeil) ? Math.min(s.zShip, spanCeil) : s.zShip;
    const zAnch = Number.isFinite(anchorCeil) ? Math.min(s.zShip, anchorCeil) : s.zShip;
    if (Number.isFinite(spanCeil) && Number.isFinite(anchorCeil)) {
      if (anchorCeil < spanCeil - 1e-12) acc.anchorTighterThanSpan++;
      acc.sumLnAnchorVsSpan += Math.log(anchorCeil / spanCeil);
    }
    const frameAt = (z) => {
      const e = effOf(z);
      return { e, ox: anchorSX - s.ax * e.x, oy: anchorSY - s.ay * e.y };
    };
    const offAt = (i, f) => {
      const sx = s.xs[i] * f.e.x + f.ox;
      const sy = s.ys[i] * f.e.y + f.oy;
      const rx = s.bmax[i] * f.e.x;
      const ry = s.bmax[i] * f.e.y;
      return sx + rx < 0 || sx - rx > CW || sy + ry < 0 || sy - ry > CH;
    };
    const wi = pos.get(winnerIdx);
    if (wi !== undefined) {
      if (offAt(wi, frameAt(s.zShip))) acc.shippedWinnerOff++;
      if (offAt(wi, frameAt(zSpan))) acc.spanOnlyWinnerOff++;
      if (offAt(wi, frameAt(zAnch))) acc.anchorMeasuredWinnerOff++;
    }

    // ── Q2 — PURE DEMANDS, on frames where the set actually has two or more ──────────────────
    if (members.length >= 2 && Number.isFinite(spanCeil)) {
      acc.setGE2++;
      const zRoadPure = zoomCeilingToFit(
        { x: perp.x * trackWidthPx, y: perp.y * trackWidthPx }, axisX, axisY, CW, CH, 1
      );
      const acrossRoom = (z) => {
        const e = effOf(z);
        const sxv = perp.x * e.x;
        const syv = perp.y * e.y;
        const L = Math.hypot(sxv, syv);
        return L > 0 ? frameExtentAlong(sxv, syv, CW, CH) / L : 0;
      };
      const arSole = acrossRoom(spanCeil);
      const arRoad = Number.isFinite(zRoadPure) ? acrossRoom(zRoadPure) : 0;
      acc.sumAcrossSole += arSole;
      acc.sumAcrossRoadPure += arRoad;
      acc.sumEmptySole += arSole > 0 ? Math.max(0, 1 - trackWidthPx / arSole) : 0;
      acc.sumEmptyRoadPure += arRoad > 0 ? Math.max(0, 1 - trackWidthPx / arRoad) : 0;
      const ptIn = (p, f) => {
        const sx = p.x * f.e.x + f.ox;
        const sy = p.y * f.e.y + f.oy;
        return sx >= 0 && sx <= CW && sy >= 0 && sy <= CH;
      };
      if (linePt) {
        if (ptIn(linePt, frameAt(spanCeil))) acc.lineInSole++;
        if (Number.isFinite(zRoadPure) && ptIn(linePt, frameAt(zRoadPure))) acc.lineInRoadPure++;
        if (ptIn(linePt, frameAt(s.zShip))) acc.lineInShip++;
      }
      if (Number.isFinite(zRoadPure)) {
        if (zRoadPure < spanCeil - 1e-12) acc.roadWiderPure++;
        acc.sumLnRoadVsSolePure += Math.log(zRoadPure / spanCeil);
      }
    }
  }
  return { track: geo.id, seed, racers: RACERS, trackWidthPx: Math.round(trackWidthPx), acc };
}

mkdirSync(OUT, { recursive: true });
const results = [];
for (const geo of loadTracks().filter((g) => !ONLY || g.id === ONLY)) {
  for (let seed = SEED_FROM; seed <= SEED_TO; seed++) {
    try {
      const r = measure(geo, seed);
      if (r) results.push(r);
    } catch (e) {
      results.push({ track: geo.id, seed, racers: RACERS, error: String(e) });
    }
  }
}
const tag = `${ONLY ?? "all"}-${RACERS}-${SEED_FROM}_${SEED_TO}`;
writeFileSync(`${OUT}/${tag}.json`, JSON.stringify(results));
process.stdout.write(`${tag}: races ${results.filter((r) => r.acc).length}\n`);
