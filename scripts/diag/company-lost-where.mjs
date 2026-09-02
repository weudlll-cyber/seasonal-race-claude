// AIM-ROOM-LOST-1 — FOLLOW THE NUMBER FROM THE GUARANTEE TO THE DELIVERED PICTURE. MEASURE ONLY.
//
// THE CONTRADICTION THIS RESOLVES. Every ceiling is a lower bound on WIDTH, i.e. an upper bound on
// zoom, and they combine with Math.min — so the SMALLEST zoom, the WIDEST shot, wins. On the frames
// where the company promise is broken, AIM-ROOM-CEILING-1 measured that `state` is the argmin 61% of
// the time. That means the delivered shot is WIDER than the company ceiling asked for. If the
// company ceiling were a true statement about where the racers are, they would then be in frame.
// They are not. Something between the guarantee's arithmetic and the delivered picture loses them.
//
// WHAT THIS RECORDS, on those frames and no others — every step of the chain, end to end:
//   1. what COMPANY asked for   `_framingProbe.ceilings.company` (a zoom)
//   2. what the composition chose `_framingProbe.guaranteed`      (the target zoom)
//   3. what was DELIVERED        `cd.zoom`                        (after the lerp)
//   4. where the guarantee THOUGHT the anchor would sit  `_anchorScreen(...)`
//   5. where the anchor ACTUALLY landed                  leader.x * effX + offsetX
//   6. where each companion landed, and by how much it missed
//   7. THE GUARANTEE'S OWN INTERNALS, recomputed with the product's own `roomFromPointAlong` and
//      `COMPANY_FRAME_PCT` rather than reimplemented: how many candidates it considered, how many it
//      SKIPPED for `room <= 0`, how many survived, and which index of the sorted list it returned.
//
// (7) is there because the function contains two lines that can quietly promise less than asked:
// a `continue` when the anchor is already outside the region in a racer's direction, and a
// `Math.min(need, ceilings.length)` that takes the tightest of whatever survived. Whether either
// fires on these frames is a measurement, not a reading.
//
// READ-ONLY. Drives the real director through the shared harness and reads the delivered frame.
// No engine file is touched and nothing here can move a fingerprint.
//
// Usage:
//   node scripts/diag/company-lost-where.mjs --track=space-sprint --seeds=30 --floor=360 --dump=5
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import {
  resolveIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "../lib/raceDriver.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);
// The product's OWN geometry, imported rather than reimplemented — a harness that measures a COPY
// is the failure this repository has paid for repeatedly.
const { COMPANY_FRAME_PCT } = await import(
  u("client/src/modules/camera/framingRule.js")
);
const { roomFromPointAlong } = await import(
  u("client/src/modules/camera/frameGeometry.js")
);

const arg = (k, d) => {
  const h = process.argv.find((a) => a.startsWith(`--${k}=`));
  return h ? h.slice(k.length + 3) : d;
};
const TRACK = arg("track", "space-sprint");
const N = Number(arg("racers", "20"));
const SEEDS = Number(arg("seeds", "30"));
const FLOOR = Number(arg("floor", "360"));
const DUMP = Number(arg("dump", "5"));
const FROM_U = Number(arg("from", "0.10"));

if (!("leaderAimRoomFloorPx" in DEFAULT_CAMERA_CONFIG) && FLOOR !== 0) {
  process.stderr.write(`REFUSED: no leaderAimRoomFloorPx in this tree; --floor would reach nothing.\n`);
  process.exit(2);
}
const CFG = { ...DEFAULT_CAMERA_CONFIG, leaderAimRoomFloorPx: FLOOR };
const PROMISE = CFG.minRacersVisible;
const TERMS = ["state", "guarantee", "company", "field", "line"];
const geo = new Map(loadTracks().map((g) => [g.id, g])).get(TRACK);
if (!geo) {
  process.stderr.write(`no track ${TRACK}\n`);
  process.exit(1);
}

const f2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : "inf");
const f4 = (v) => (Number.isFinite(v) ? v.toFixed(4) : "inf");

let frames = 0,
  broken = 0,
  dumped = 0;
// Aggregates over ALL broken frames where `state` is the argmin — the population in question.
const agg = {
  travelling: 0, // delivered zoom differs from the composed target
  anchorMoved: 0, // the anchor did not land where the guarantee placed it
  skipped: 0, // the guarantee skipped >=1 candidate for room<=0
  trueWouldWin: 0, // the honest ceiling is tighter than state, so company would win the min
  trueKept: 0,     // promise kept at min(state, honest ceiling)
  anchorNotARacer: 0, // the anchor point is not any racer's position
  cfKept: 0,    // counterfactual frames where the promise WOULD have been kept
  shortList: 0, // fewer survivors than `need`, so it returned the tightest of what existed
  n: 0,
};
const anchorErr = [];
const zoomRatio = [];
const composeErr = []; // intended anchor -> anchor at the TARGET offset (clamp / composition)
const lagPx = [];      // anchor at target offset -> anchor actually delivered (the lerp)
const cfInShot = [];   // counterfactual: in shot if the anchor sat where the guarantee assumed
const anchorToNearest = []; // world distance from the guarantee's anchor to the nearest running racer
const centreDist = [];   // anchor vs _centrelineAt(t) — is the anchor the centreline point?
const trueVsState = [];  // how much wider than the state setting the honest ceiling would be
const trueInShot = [];   // in shot at min(state, honest ceiling)

for (let s = 1; s <= SEEDS && dumped <= DUMP + 2; s++) {
  const identity = resolveIdentity({
    trackId: TRACK,
    raceSeed: s,
    racers: N,
    racerType: TRACK_DEFAULT_RACER,
  });
  const race = buildRace(geo, identity, CFG);
  runRace(race, identity, CFG, ({ cd, st, frame }) => {
    if (cd.state !== "LEADER_ZOOM") return;
    const u0 = st.racers.reduce((m, r) => Math.max(m, r._cleanT ?? r.t), 0);
    if (u0 < FROM_U || u0 > 0.9) return;
    const p = cd._framingProbe;
    if (!p || !p.ceilings || p.scheduled) return;
    const running = st.racers.filter((r) => !r.finished);
    if (running.length < PROMISE) return;

    const effX = cd._proj.effX(cd.zoom),
      effY = cd._proj.effY(cd.zoom);
    const scr = (r) => ({ x: r.x * effX + cd.offsetX, y: r.y * effY + cd.offsetY });
    const onCanvas = (q) => q.x >= 0 && q.x <= p.frameW && q.y >= 0 && q.y <= p.frameH;
    const inShot = running.filter((r) => onCanvas(scr(r))).length;
    frames++;
    if (inShot >= PROMISE) return;
    broken++;

    // Which term is the argmin?
    let best = null;
    for (const k of TERMS) {
      const v = p.ceilings[k];
      if (!Number.isFinite(v)) continue;
      if (best === null || v < p.ceilings[best]) best = k;
    }
    if (best !== "state") return; // the population the contradiction is about
    agg.n++;

    // ── 4/5. THE ANCHOR: intended vs actual ────────────────────────────────────────────────────
    const at = cd._anchorScreen(p.frameW, p.frameH, p.t);
    const anchorWorld = p.point;
    const anchorActual = anchorWorld
      ? { x: anchorWorld.x * effX + cd.offsetX, y: anchorWorld.y * effY + cd.offsetY }
      : null;
    const aErr = anchorActual ? Math.hypot(anchorActual.x - at.x, anchorActual.y - at.y) : NaN;
    if (Number.isFinite(aErr)) {
      anchorErr.push(aErr);
      if (aErr > 1) agg.anchorMoved++;
    }
    // DECOMPOSE THE MISS. Where the anchor WOULD sit if the camera were already at its target
    // offset, against where it actually sits. That separates a pan that has not arrived yet (the
    // lerp lagging) from a pan target that was never going to put the anchor there (a clamp or a
    // shift composed after the guarantee). Same zoom in both, so only the offset differs.
    const anchorAtTarget = anchorWorld
      ? { x: anchorWorld.x * effX + cd.targetOffsetX, y: anchorWorld.y * effY + cd.targetOffsetY }
      : null;
    if (anchorAtTarget) {
      const clampErr = Math.hypot(anchorAtTarget.x - at.x, anchorAtTarget.y - at.y);
      const lagErr = Math.hypot(anchorActual.x - anchorAtTarget.x, anchorActual.y - anchorAtTarget.y);
      composeErr.push(clampErr);
      lagPx.push(lagErr);
    }

    // ── THE COUNTERFACTUAL, and it is the decisive one. Keep the DELIVERED zoom exactly, and move
    // the frame so the anchor sits where the guarantee assumed it would. If the promise is then kept,
    // the companions were lost to the anchor's displacement and to nothing else.
    if (anchorWorld) {
      const offX2 = at.x - anchorWorld.x * effX;
      const offY2 = at.y - anchorWorld.y * effY;
      const inShotIfPlaced = running.filter((r) => {
        const x = r.x * effX + offX2,
          y = r.y * effY + offY2;
        return x >= 0 && x <= p.frameW && y >= 0 && y <= p.frameH;
      }).length;
      cfInShot.push(inShotIfPlaced);
      if (inShotIfPlaced >= PROMISE) agg.cfKept++;
      // IS THE ANCHOR A RACER? `companyGuarantee` computes need = minVisible - 1 "because the anchor
      // itself is one of them". That is only true if the anchor point IS a racer's position. Measure
      // the distance to the nearest running racer rather than assuming it.
      let nearest = Infinity;
      for (const r of running) {
        const d = Math.hypot(r.x - anchorWorld.x, r.y - anchorWorld.y);
        if (d < nearest) nearest = d;
      }
      anchorToNearest.push(nearest);
      if (nearest > 1e-9) agg.anchorNotARacer++;
    }

    // ── 1/2/3. THE ZOOMS ───────────────────────────────────────────────────────────────────────
    const ratio = cd.zoom / p.guaranteed;
    zoomRatio.push(ratio);
    if (Math.abs(ratio - 1) > 1e-6) agg.travelling++;

    // ── 7. THE GUARANTEE'S OWN INTERNALS, recomputed with the product's geometry ───────────────
    const need = Math.floor(PROMISE) - 1;
    const axisX = cd._proj.axisX,
      axisY = cd._proj.axisY;
    let considered = 0,
      skippedRoom = 0;
    const ceilings = [];
    for (const r of running) {
      if (!anchorWorld) break;
      const dx = r.x - anchorWorld.x,
        dy = r.y - anchorWorld.y;
      if (dx === 0 && dy === 0) continue;
      const sx = dx * axisX,
        sy = dy * axisY;
      const needed = Math.hypot(sx, sy);
      if (!(needed > 0)) continue;
      considered++;
      const room = roomFromPointAlong(at.x, at.y, sx, sy, p.frameW, p.frameH, COMPANY_FRAME_PCT);
      if (!(room > 0)) {
        skippedRoom++;
        continue;
      }
      ceilings.push(room / needed);
    }
    ceilings.sort((a, b) => b - a);
    const idx = Math.min(need, ceilings.length) - 1;
    // IS THE ANCHOR THE CENTRELINE POINT? CAMERA-LATERAL-1 replaces subjects.point with
    // `_centrelineAt(headingT)`, and `companyGuarantee` still deducts one "because the anchor itself
    // is one of them". Verify the identity rather than assume it.
    const onCentre = cd._centrelineAt(p.t);
    if (onCentre && anchorWorld) {
      centreDist.push(Math.hypot(onCentre.x - anchorWorld.x, onCentre.y - anchorWorld.y));
    }
    // THE HONEST CEILING: the zoom at which `minVisible` RACERS are in the region, not
    // `minVisible - 1`. One index further down the same sorted list. Nothing is changed by reading it.
    const trueCeil = ceilings.length > need ? ceilings[need] : null;
    if (trueCeil !== null) {
      trueVsState.push(p.ceilings.state / trueCeil);
      if (trueCeil < p.ceilings.state) agg.trueWouldWin++;
      // Counterfactual: deliver min(state, trueCeil) with the anchor where the guarantee assumed.
      const z2 = Math.min(p.ceilings.state, trueCeil);
      const ex = cd._proj.effX(z2), ey = cd._proj.effY(z2);
      const ox = at.x - anchorWorld.x * ex, oy = at.y - anchorWorld.y * ey;
      const n2 = running.filter((r) => {
        const x = r.x * ex + ox, y = r.y * ey + oy;
        return x >= 0 && x <= p.frameW && y >= 0 && y <= p.frameH;
      }).length;
      if (n2 >= PROMISE) agg.trueKept++;
      trueInShot.push(n2);
    }
    if (skippedRoom > 0) agg.skipped++;
    if (ceilings.length < need) agg.shortList++;

    if (dumped < DUMP) {
      dumped++;
      const missing = running
        .map((r) => ({ r, q: scr(r) }))
        .filter((o) => !onCanvas(o.q))
        .map((o) => {
          const outX = o.q.x < 0 ? o.q.x : o.q.x > p.frameW ? o.q.x - p.frameW : 0;
          const outY = o.q.y < 0 ? o.q.y : o.q.y > p.frameH ? o.q.y - p.frameH : 0;
          return { i: o.r.index, x: o.q.x, y: o.q.y, outX, outY };
        })
        .sort((a, b) => Math.hypot(a.outX, a.outY) - Math.hypot(b.outX, b.outY));

      console.log(`\n───────── WORKED FRAME  seed=${s} frame=${frame}  (${TRACK}) ─────────`);
      console.log(`  frame ${p.frameW}x${p.frameH}   running=${running.length}  IN SHOT=${inShot}  promise=${PROMISE}`);
      console.log(`  1. company asked for zoom  = ${f4(p.ceilings.company)}`);
      console.log(`     state    asked for zoom = ${f4(p.ceilings.state)}   <- argmin, the WIDER shot`);
      console.log(`     guarantee/field/line    = ${f4(p.ceilings.guarantee)} / ${f4(p.ceilings.field)} / ${f4(p.ceilings.line)}`);
      console.log(`  2. composed TARGET zoom    = ${f4(p.guaranteed)}`);
      console.log(`  3. DELIVERED zoom          = ${f4(cd.zoom)}   (delivered/target = ${f4(ratio)})`);
      console.log(`  4. anchor INTENDED at      = (${f2(at.x)}, ${f2(at.y)})`);
      console.log(`  5. anchor ACTUALLY at      = ${anchorActual ? `(${f2(anchorActual.x)}, ${f2(anchorActual.y)})` : "n/a"}   miss = ${f2(aErr)} px`);
      console.log(`  7. guarantee internals: considered=${considered}  skipped(room<=0)=${skippedRoom}  survived=${ceilings.length}  need=${need}  returned index ${idx} of ${ceilings.length}`);
      console.log(`     top survivors (zoom at which each sits on the region edge): ${ceilings.slice(0, 6).map(f4).join(", ")}`);
      console.log(`  6. companions OUTSIDE the delivered frame: ${missing.length}`);
      for (const m of missing.slice(0, 6))
        console.log(`       racer ${String(m.i).padStart(2)} at (${f2(m.x)}, ${f2(m.y)})  outside by  x:${f2(m.outX)}  y:${f2(m.outY)}`);
    }
  });
}

const q = (a, pp) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * pp))];
};
console.log(`\n═════════ AGGREGATE over broken frames where STATE is the argmin ═════════`);
console.log(`  ${TRACK}: frames=${frames}  broken=${broken}  of which state-argmin=${agg.n}`);
console.log(`  delivered zoom != target zoom (still travelling):  ${agg.travelling}  (${((100 * agg.travelling) / (agg.n || 1)).toFixed(2)}%)`);
console.log(`     delivered/target  p10=${f4(q(zoomRatio, 0.1))}  p50=${f4(q(zoomRatio, 0.5))}  p90=${f4(q(zoomRatio, 0.9))}`);
console.log(`  anchor missed its intended screen point by >1px:   ${agg.anchorMoved}  (${((100 * agg.anchorMoved) / (agg.n || 1)).toFixed(2)}%)`);
console.log(`     anchor miss px    p50=${f2(q(anchorErr, 0.5))}  p90=${f2(q(anchorErr, 0.9))}  max=${f2(q(anchorErr, 1))}`);
console.log(`  DECOMPOSED — intended -> target-offset (clamp/composition):`);
console.log(`     p50=${f2(q(composeErr, 0.5))}  p90=${f2(q(composeErr, 0.9))}  max=${f2(q(composeErr, 1))}`);
console.log(`  DECOMPOSED — target-offset -> delivered (the pan lerp, i.e. lag):`);
console.log(`     p50=${f2(q(lagPx, 0.5))}  p90=${f2(q(lagPx, 0.9))}  max=${f2(q(lagPx, 1))}`);
console.log(`  COUNTERFACTUAL — anchor placed where the guarantee assumed, SAME delivered zoom:`);
console.log(`     promise KEPT on ${agg.cfKept} of ${agg.n}  (${((100 * agg.cfKept) / (agg.n || 1)).toFixed(2)}%)   in-shot p10=${f2(q(cfInShot, 0.1))} p50=${f2(q(cfInShot, 0.5))}`);
console.log(`  IS THE ANCHOR A RACER? anchor-to-nearest-racer world px:`);
console.log(`     p50=${f2(q(anchorToNearest, 0.5))}  p90=${f2(q(anchorToNearest, 0.9))}   not-a-racer on ${agg.anchorNotARacer} of ${agg.n} (${((100 * agg.anchorNotARacer) / (agg.n || 1)).toFixed(2)}%)`);
console.log(`  ANCHOR vs _centrelineAt(t):  p50=${f2(q(centreDist, 0.5))}  max=${f2(q(centreDist, 1))}   (0 => the anchor IS the centreline point)`);
console.log(`  THE HONEST CEILING (minVisible RACERS, not minVisible-1 companions):`);
console.log(`     state/honest  p50=${f4(q(trueVsState, 0.5))}  p90=${f4(q(trueVsState, 0.9))}   (>1 => shot must widen by that factor)`);
console.log(`     honest ceiling would WIN the min on ${agg.trueWouldWin} of ${agg.n} (${((100 * agg.trueWouldWin) / (agg.n || 1)).toFixed(2)}%)`);
console.log(`     promise KEPT at min(state, honest) on ${agg.trueKept} of ${agg.n} (${((100 * agg.trueKept) / (agg.n || 1)).toFixed(2)}%)  in-shot p50=${f2(q(trueInShot, 0.5))}`);
console.log(`  guarantee SKIPPED >=1 candidate for room<=0:       ${agg.skipped}  (${((100 * agg.skipped) / (agg.n || 1)).toFixed(2)}%)`);
console.log(`  guarantee had FEWER survivors than it needed:      ${agg.shortList}  (${((100 * agg.shortList) / (agg.n || 1)).toFixed(2)}%)`);
