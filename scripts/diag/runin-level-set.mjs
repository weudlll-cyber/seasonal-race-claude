// RUNIN-LEVEL-SET-1 — the owner's rule of 2026-08-24, measured before anything is built.
//
// THE RULE: any racer at most ONE RACER LENGTH behind the leader ALONG THE TRACK must be in frame,
// however far to the side he is running. The along-track gap decides membership; the across-track
// distance decides nothing about it.
//
// THE UNIT IS READ AT SOURCE AND NOT REDEFINED. `contactLength` is
// `(leader.drawnBodyLengthPx + r.drawnBodyLengthPx) / 2` — CameraDirector.js:2719 in
// `_abreastContenders` and :2611 in `_updateContention`, the same expression at both sites, and
// exactly one body length between two equal racers. No second definition and no config key.
//
// WHAT THE RULE CHANGES ABOUT MEMBERSHIP, precisely: `_abreastContenders` carries TWO conditions —
// (1) within one body length along the track, and (2) ON A FREE LANE, i.e. not laterally close to a
// racer already admitted. **The owner's rule is condition 1 alone.** Condition 2 is an across-track
// test, and he has now said the across-track distance decides nothing about membership. The rule is
// also evaluated LIVE every frame, where the shipped set is captured once at the PHOTO_FINISH
// transition and never re-sorted (:1622).
//
// MEASURE ONLY. It changes no camera code, no default and no key. It drives the real director, reads
// the shot actually composed, and computes beside it what the width would have been. Nothing is fed
// back in.
//
// TWO READINGS OF THE GUARANTEE, because RUNIN-CONTENDER-GUARANTEE-1 showed they are different
// quantities and the difference is the whole of his unfixed case:
//   SPAN    — `contenderGuarantee`, which fits the vectors BETWEEN members. It guarantees the set's
//             extent fits the frame's centre chord. It takes no anchor.
//   PRESENCE — each member measured against the room the frame actually has FROM WHERE THE ANCHOR
//             SITS, via `roomFromPointAlong`. This is what CAMERA-ANCHOR-TRUTH-1 gave
//             `corridorGuarantee` (its `anchorAt` argument) and never gave `pairGuarantee`.
//
// THE COUNTERFACTUAL: zoom about the anchor, anchor SCREEN position unchanged. `anchorScreenPoint`
// takes no zoom, so the anchor's place in frame is a fraction and a heading — both zoom-independent —
// and a width change re-solves the offset exactly as `_applyLeaderForwardBias` does. It omits
// `_applyLateralGuarantee`'s extra shift, which can only help, so every "still off frame" is
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
const { contenderGuarantee } = await import(u("client/src/modules/camera/framingRule.js"));
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
const OUT = arg("out", "c:/tmp/runin-level");
const TRACE = new Set((arg("trace", "") || "").split(",").filter(Boolean));

function measure(geo, seed) {
  const identity = resolveIdentity({
    racers: RACERS, raceSeed: seed, racerType: TRACK_DEFAULT_RACER, roster: ROSTER,
    note: "runin-level-set",
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

    // ── THE OWNER'S RULE: the along-track gap alone, live, every frame ───────────────────────────
    const level = [leader.index];
    for (const r of ordered) {
      if (r.index === leader.index) continue;
      const gapPx = shortestArcDeltaT(leader.t, r.t) * pathLen;
      // THE UNIT, at source: CameraDirector.js:2719. Not redefined here.
      const contactLength = ((leader.drawnBodyLengthPx ?? 0) + (r.drawnBodyLengthPx ?? 0)) / 2;
      if (!(contactLength > 0)) continue;
      if (gapPx <= contactLength) level.push(r.index);
    }
    // The shipped set, for comparison — the director's own method, called read-only.
    const shipSet = (dir._abreastContenders(ordered) ?? ordered.slice(0, 2)).map((r) => r.index);
    // The previous block's predictive reading, for comparison.
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
        const c = ((leader.drawnBodyLengthPx ?? 0) + (r.drawnBodyLengthPx ?? 0)) / 2;
        if (c > 0 && gapNow + (vLeader - vR) * msToLine <= c) pred.push(r.index);
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
      u: dir._runInProgress ?? 0, level, shipSet, pred, xs, ys, bmax, idx,
      zShip: dir.zoom ?? 0, oxS: dir.offsetX ?? 0, oyS: dir.offsetY ?? 0,
      ax: anchorW.x, ay: anchorW.y, hnx: hn.x, hny: hn.y,
      fwd: dir._forwardFracNow() ?? 0.5,
      inner: dir._innerFramePct ?? 1, pad: dir._drawnBodyWidthRefPx ?? 0,
    });
  }, { slowmo: true });

  const ranked = st.racers.filter((r) => r.finishRank > 0).sort((a, b) => a.finishRank - b.finishRank);
  if (!ranked.length || !snaps.length) return null;
  const winnerIdx = ranked[0].index;
  const top5 = new Set(ranked.slice(0, 5).map((r) => r.index));

  const bump = (o, k) => { o[k] = (o[k] ?? 0) + 1; };
  const acc = {
    frames: 0,
    sizeLevel: {}, sizeShip: {}, sizePred: {},
    levelDiffersFromShip: 0, addedVsShip: 0, droppedVsShip: 0,
    winnerInLevel: 0, winnerInShip: 0,
    quarter: [0, 1, 2, 3].map(() => ({ n: 0, sumLevel: 0, sumShip: 0, winLevel: 0 })),
    // (b) width
    widenSpan: 0, widenAnchor: 0, tighterSpan: 0, sameSpan: 0,
    sumLnSpanVsShip: 0, sumLnAnchorVsShip: 0,
    maxLnWiderSpan: 0, maxLnWiderAnchor: 0,
    runsAnchor: 0, runFramesAnchor: 0, maxRunAnchor: 0,
    // (c) why it widens
    widenBecauseSide: 0, widenBecauseBehind: 0,
    sumBindAlongPx: 0, sumBindAcrossPx: 0,
    // (d)/(g) visibility
    winnerOffShip: 0, winnerOffSpan: 0, winnerOffAnchor: 0,
    memberOffShip: 0, memberOffSpan: 0, memberOffAnchor: 0,
    top5OffShip: 0, top5OffAnchor: 0,
    // (e) the finish line
    lineInShip: 0, lineInSpan: 0, lineInAnchor: 0,
    // (f) forward view
    sumAheadShip: 0, sumAheadAnchor: 0, sumFwd: 0,
    sumBodyFracShip: 0, sumBodyFracAnchor: 0,
    // width in world px across the road
    sumAcrossShip: 0, sumAcrossAnchor: 0,
  };
  const series = [];
  let run = 0;

  for (const s of snaps) {
    acc.frames++;
    const pos = new Map();
    for (let i = 0; i < s.idx.length; i++) pos.set(s.idx[i], i);
    const levelSet = s.level.includes(winnerIdx) ? s.level : [...s.level, winnerIdx];
    bump(acc.sizeLevel, s.level.length);
    bump(acc.sizeShip, s.shipSet.length);
    bump(acc.sizePred, s.pred.length);
    const shipS = new Set(s.shipSet);
    const lvlS = new Set(s.level);
    let added = 0, dropped = 0;
    for (const k of lvlS) if (!shipS.has(k)) added++;
    for (const k of shipS) if (!lvlS.has(k)) dropped++;
    acc.addedVsShip += added;
    acc.droppedVsShip += dropped;
    if (added || dropped) acc.levelDiffersFromShip++;
    if (lvlS.has(winnerIdx)) acc.winnerInLevel++;
    if (shipS.has(winnerIdx)) acc.winnerInShip++;
    const q = Math.min(3, Math.floor(s.u * 4));
    acc.quarter[q].n++;
    acc.quarter[q].sumLevel += s.level.length;
    acc.quarter[q].sumShip += s.shipSet.length;
    if (lvlS.has(winnerIdx)) acc.quarter[q].winLevel++;

    const members = levelSet.map((k) => pos.get(k)).filter((i) => i !== undefined);
    const perp = { x: -s.hny, y: s.hnx };
    const eS = effOf(s.zShip);
    const anchorSX = s.ax * eS.x + s.oxS;
    const anchorSY = s.ay * eS.y + s.oyS;

    // ── THE SPAN READING — what the shipped mechanism computes ────────────────────────────────
    const spanCeil = contenderGuarantee(
      members.map((i) => ({ x: s.xs[i], y: s.ys[i] })), axisX, axisY, CW, CH, s.inner, s.pad
    );
    // ── THE PRESENCE READING — each member against the room from where the anchor sits ────────
    let anchorCeil = Infinity;
    let bindI = null;
    for (const i of members) {
      const dx = s.xs[i] - s.ax;
      const dy = s.ys[i] - s.ay;
      const vx = dx * axisX;
      const vy = dy * axisY;
      const need = Math.hypot(vx, vy);
      if (!(need > 0)) continue;
      const room = roomFromPointAlong(anchorSX, anchorSY, vx, vy, CW, CH, s.inner);
      const withPad = need + s.pad * Math.hypot(axisX, axisY) * 0.5;
      const c = room > 0 ? room / withPad : Infinity;
      if (c < anchorCeil) { anchorCeil = c; bindI = i; }
    }

    const zSpan = Number.isFinite(spanCeil) ? Math.min(s.zShip, spanCeil) : s.zShip;
    const zAnch = Number.isFinite(anchorCeil) ? Math.min(s.zShip, anchorCeil) : s.zShip;
    if (s.zShip > 0) {
      if (Number.isFinite(spanCeil)) {
        const ln = Math.log(spanCeil / s.zShip);
        acc.sumLnSpanVsShip += ln;
        if (ln < -1e-9) { acc.widenSpan++; if (-ln > acc.maxLnWiderSpan) acc.maxLnWiderSpan = -ln; }
        else if (ln > 1e-9) acc.tighterSpan++;
        else acc.sameSpan++;
      } else acc.sameSpan++;
      if (Number.isFinite(anchorCeil)) {
        const ln = Math.log(anchorCeil / s.zShip);
        acc.sumLnAnchorVsShip += ln;
        if (ln < -1e-9) { acc.widenAnchor++; if (-ln > acc.maxLnWiderAnchor) acc.maxLnWiderAnchor = -ln; }
      }
    }
    // ── (c) WHEN IT WIDENS, IS THE BINDING MEMBER FAR TO THE SIDE OR FAR BEHIND? ───────────────
    const widening = zAnch < s.zShip - 1e-12;
    if (widening) {
      run++;
      if (bindI !== null) {
        const dx = s.xs[bindI] - s.ax;
        const dy = s.ys[bindI] - s.ay;
        const al = Math.abs(dx * s.hnx + dy * s.hny);
        const ac = Math.abs(dx * perp.x + dy * perp.y);
        acc.sumBindAlongPx += al;
        acc.sumBindAcrossPx += ac;
        if (ac > al) acc.widenBecauseSide++;
        else acc.widenBecauseBehind++;
      }
    } else if (run > 0) {
      acc.runsAnchor++;
      acc.runFramesAnchor += run;
      if (run > acc.maxRunAnchor) acc.maxRunAnchor = run;
      run = 0;
    }

    const frameAt = (z) => {
      const e = effOf(z);
      return { e, ox: anchorSX - s.ax * e.x, oy: anchorSY - s.ay * e.y };
    };
    const fShip = frameAt(s.zShip);
    const fSpan = frameAt(zSpan);
    const fAnch = frameAt(zAnch);
    const offAt = (i, f) => {
      const sx = s.xs[i] * f.e.x + f.ox;
      const sy = s.ys[i] * f.e.y + f.oy;
      const rx = s.bmax[i] * f.e.x;
      const ry = s.bmax[i] * f.e.y;
      return sx + rx < 0 || sx - rx > CW || sy + ry < 0 || sy - ry > CH;
    };
    const wi = pos.get(winnerIdx);
    if (wi !== undefined) {
      if (offAt(wi, fShip)) acc.winnerOffShip++;
      if (offAt(wi, fSpan)) acc.winnerOffSpan++;
      if (offAt(wi, fAnch)) acc.winnerOffAnchor++;
    }
    if (members.some((i) => offAt(i, fShip))) acc.memberOffShip++;
    if (members.some((i) => offAt(i, fSpan))) acc.memberOffSpan++;
    if (members.some((i) => offAt(i, fAnch))) acc.memberOffAnchor++;
    let t5S = false, t5A = false;
    for (let i = 0; i < s.idx.length; i++) {
      if (!top5.has(s.idx[i])) continue;
      if (offAt(i, fShip)) t5S = true;
      if (offAt(i, fAnch)) t5A = true;
    }
    if (t5S) acc.top5OffShip++;
    if (t5A) acc.top5OffAnchor++;

    const ptIn = (p, f) => {
      const sx = p.x * f.e.x + f.ox;
      const sy = p.y * f.e.y + f.oy;
      return sx >= 0 && sx <= CW && sy >= 0 && sy <= CH;
    };
    if (linePt) {
      if (ptIn(linePt, fShip)) acc.lineInShip++;
      if (ptIn(linePt, fSpan)) acc.lineInSpan++;
      if (ptIn(linePt, fAnch)) acc.lineInAnchor++;
    }
    const acrossRoom = (f) => {
      const sxv = perp.x * f.e.x;
      const syv = perp.y * f.e.y;
      const L = Math.hypot(sxv, syv);
      return L > 0 ? frameExtentAlong(sxv, syv, CW, CH) / L : 0;
    };
    acc.sumAcrossShip += acrossRoom(fShip);
    acc.sumAcrossAnchor += acrossRoom(fAnch);
    const aheadWorld = (f) => {
      const hx = s.hnx * f.e.x;
      const hy = s.hny * f.e.y;
      const L = Math.hypot(hx, hy);
      return L > 0 ? (frameExtentAlong(hx, hy, CW, CH) * (1 - s.fwd)) / L : 0;
    };
    acc.sumAheadShip += aheadWorld(fShip);
    acc.sumAheadAnchor += aheadWorld(fAnch);
    acc.sumFwd += s.fwd;
    const li = pos.get(s.level[0]);
    if (li !== undefined) {
      acc.sumBodyFracShip += (s.bmax[li] * 2 * eS.y) / CH;
      acc.sumBodyFracAnchor += (s.bmax[li] * 2 * fAnch.e.y) / CH;
    }

    if (keepTrace) {
      series.push({
        u: +s.u.toFixed(4),
        nLevel: s.level.length, nShip: s.shipSet.length,
        winIn: lvlS.has(winnerIdx) ? 1 : 0,
        zShip: +s.zShip.toFixed(4),
        zSpan: Number.isFinite(spanCeil) ? +spanCeil.toFixed(4) : null,
        zAnch: Number.isFinite(anchorCeil) ? +anchorCeil.toFixed(4) : null,
        wShip: wi !== undefined ? (offAt(wi, fShip) ? 1 : 0) : null,
        wSpan: wi !== undefined ? (offAt(wi, fSpan) ? 1 : 0) : null,
        wAnch: wi !== undefined ? (offAt(wi, fAnch) ? 1 : 0) : null,
        lineShip: linePt ? (ptIn(linePt, fShip) ? 1 : 0) : null,
        lineAnch: linePt ? (ptIn(linePt, fAnch) ? 1 : 0) : null,
        arS: Math.round(acrossRoom(fShip)), arA: Math.round(acrossRoom(fAnch)),
      });
    }
  }
  if (run > 0) {
    acc.runsAnchor++;
    acc.runFramesAnchor += run;
    if (run > acc.maxRunAnchor) acc.maxRunAnchor = run;
  }

  return {
    track: geo.id, seed, racers: RACERS, trackWidthPx: Math.round(trackWidthPx),
    winnerIndex: winnerIdx, acc, series: keepTrace ? series : null,
  };
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
