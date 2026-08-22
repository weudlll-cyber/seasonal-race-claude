// ============================================================
// File:        scripts/diag/camera-curve.mjs
// Project:     RaceArena — CAMERA-CURVE-1 (report-only, changes nothing)
//
// DOES THE CAMERA DRIVE THE CURVE? — the SHAPE of the delivered path against the shape of the
// target's, bend by bend, over a whole race.
//
// ── WHY NOTHING WE HAD COULD ANSWER THIS ─────────────────────────────────────────────────────────
//
// Every camera number in this project is a DISTANCE or a PER-FRAME STEP: the pan's residual, the
// worst single frame, the lag in px. A first-order smoother following a target around a bend cuts
// the corner and then catches up — the delivered path is a CHORD where the target's is an ARC — and
// that is invisible to both. The residual can be small at every instant while the two paths bow
// apart in the middle of the bend, because the residual measures the gap ALONG the chase, not the
// deviation ACROSS it.
//
// So this measures the PERPENDICULAR distance from the delivered centre to the target's own path,
// which is the quantity "it does not look round" describes.
//
// ── WHY THE VIRTUAL CLOCK IS THE RIGHT ARM HERE, and it is a real argument rather than convenience ─
//
// RACE-JUDDER-1 measured the harness delivering 28.6% of frames at two vsyncs. THE OWNER'S MACHINE
// DOES NOT: he reports 1200 frames, p50 16.7 ms, max 17.5 ms, ZERO over 20 ms. A fixed 1/60 s step
// is therefore a BETTER model of his machine than the harness's own real clock is, and it has the
// property the real clock cannot have — it repeats. Dropped frames are excluded for him by his own
// measurement and are not offered here.
//
// ── HOW THE TWO PATHS ARE RECONSTRUCTED ──────────────────────────────────────────────────────────
//
// A world point q sits at screen (ox + q.x·effX, oy + q.y·effY). So the world point AT THE CANVAS
// CENTRE is ((CW/2 − ox)/effX, (CH/2 − oy)/effY) — that is the delivered centre. The target's is the
// same arithmetic with the target's offsets (ox+lagX, oy+lagY) at the TARGET's zoom, because an
// offset belongs to the zoom it was resolved at; mixing them reads a moving zoom as a pan error.
//
// `effY` is not in the dump, so it is recovered from the projection the product itself builds —
// `projectionForTrack(worldW, worldH, isOpen)` — rather than assumed equal to `effX`, which is false
// on every non-square world.
//
// Usage:
//   node scripts/diag/camera-curve.mjs --json=<dump.json>
// ============================================================

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const { projectionForTrack } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/camera/projection.js")).href
);

const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const JSON_IN = ARG("json", null);
if (!JSON_IN) throw new Error("camera-curve: pass --json=<a viewer-invariants --dump file>");
const CW = 1280;
const CH = 720;
// WHERE THE ENDGAME BEGINS IS `endgameThreshold`, read from its one home rather than
// restated (ONE-HOME-THREE-TRUTHS-1). It was a literal 0.95 here and 0.95 in defaults.js.
const { DEFAULT_CAMERA_CONFIG: __CFG } = await import(
  pathToFileURL(join(ROOT, "client/src/modules/storage/defaults.js")).href,
);
const ENDGAME_FROM = __CFG.endgameThreshold;

const doc = JSON.parse(readFileSync(JSON_IN, "utf8"));
if (!doc.dumps?.length) throw new Error("camera-curve: that file carries no dumps — run with --dump");

const q = (a, f) => {
  const b = [...a].sort((x, y) => x - y);
  return b.length ? b[Math.min(b.length - 1, Math.floor(f * b.length))] : NaN;
};

for (const d of doc.dumps) {
  const F = d.frames.filter((f) => f.wMaxX > 0 && f.ez > 0);
  if (F.length < 100) throw new Error(`camera-curve: ${d.track} has only ${F.length} usable frames`);
  const worldW = F[0].wMaxX;
  const worldH = F[0].wMaxY;
  // OPEN or CLOSED is read from the harness own field-size rule (N = closed ? 40 : 100) rather
  // than assumed: the projection differs between them, and getting it wrong would scale every world
  // figure below by a constant nobody would notice.
  const row = doc.rows.find((r) => r.track === d.track && r.seed === d.seed && r.arm === d.arm);
  if (!row) throw new Error(`camera-curve: no row for ${d.track} — cannot tell open from closed`);
  const isOpen = row.n >= 100;
  const proj = projectionForTrack(worldW, worldH, isOpen);
  const ratio = proj.effY(1) / proj.effX(1);

  console.log(`\n${"=".repeat(100)}`);
  console.log(
    `${d.track}  seed ${d.seed}  arm ${d.arm}  —  ${F.length} frames   world ${worldW}x${worldH} ${isOpen?"OPEN":"CLOSED"}   effY/effX ${ratio.toFixed(4)}`
  );
  console.log("=".repeat(100));

  // ── the two paths, in world px ─────────────────────────────────────────────────────────────
  const P = [];
  for (const f of F) {
    const effX = f.ez;
    const effY = f.ez * ratio;
    const dx = (CW / 2 - f.ox) / effX;
    const dy = (CH / 2 - f.oy) / effY;
    let tx = null;
    let ty = null;
    if (f.lagX !== null && f.lagY !== null && f.zoomRatio > 0) {
      const tEffX = effX * f.zoomRatio;
      const tEffY = tEffX * ratio;
      tx = (CW / 2 - (f.ox + f.lagX)) / tEffX;
      ty = (CH / 2 - (f.oy + f.lagY)) / tEffY;
    }
    P.push({ i: f.i, ms: f.ms, p: f.p, t: f.leaderT, dx, dy, tx, ty, st: f.st, b: f.b, ez: f.ez, w: f.w });
  }
  const T = P.filter((r) => r.tx !== null);
  if (T.length < 100) throw new Error("camera-curve: too few frames carry a target to compare against");

  // ── curvature of the TARGET path, which is what the camera is asked to drive ───────────────
  //
  // Measured over a 9-frame span so a single jittery frame cannot invent a bend: the turn in the
  // target's own heading per world px travelled.
  const SPAN = 9;
  for (let k = 0; k < T.length; k++) {
    const a = T[Math.max(0, k - SPAN)];
    const b = T[k];
    const c = T[Math.min(T.length - 1, k + SPAN)];
    const h1 = Math.atan2(b.ty - a.ty, b.tx - a.tx);
    const h2 = Math.atan2(c.ty - b.ty, c.tx - b.tx);
    let turn = h2 - h1;
    while (turn > Math.PI) turn -= 2 * Math.PI;
    while (turn < -Math.PI) turn += 2 * Math.PI;
    const len = Math.hypot(c.tx - a.tx, c.ty - a.ty);
    T[k].turn = turn;
    T[k].curv = len > 1 ? turn / len : 0; // radians per world px, signed
    T[k].tHead = h2;
  }
  // delivered heading, same span
  for (let k = 0; k < T.length; k++) {
    const a = T[Math.max(0, k - SPAN)];
    const c = T[Math.min(T.length - 1, k + SPAN)];
    T[k].dHead = Math.atan2(c.dy - a.dy, c.dx - a.dx);
  }

  // ── perpendicular deviation: delivered centre to the target PATH (not to the target point) ──
  //
  // The distance to the nearest point of the target's trajectory. That is the ACROSS-track error,
  // and it is what a residual cannot see: a camera perfectly on the path but 200 px behind on it
  // scores 0 here, correctly, because the picture is round.
  const W = 45; // frames of the target path searched either side
  for (let k = 0; k < T.length; k++) {
    let best = Infinity;
    let bestSign = 0;
    for (let j = Math.max(0, k - W); j < Math.min(T.length - 1, k + W); j++) {
      const ax = T[j].tx;
      const ay = T[j].ty;
      const bx = T[j + 1].tx;
      const by = T[j + 1].ty;
      const vx = bx - ax;
      const vy = by - ay;
      const L2 = vx * vx + vy * vy;
      if (L2 < 1e-9) continue;
      let u = ((T[k].dx - ax) * vx + (T[k].dy - ay) * vy) / L2;
      u = Math.max(0, Math.min(1, u));
      const px = ax + u * vx;
      const py = ay + u * vy;
      const dist = Math.hypot(T[k].dx - px, T[k].dy - py);
      if (dist < best) {
        best = dist;
        // sign: which side of the target's heading the delivered centre sits on. Negative = INSIDE
        // the turn, i.e. cutting the corner.
        const cross = vx * (T[k].dy - ay) - vy * (T[k].dx - ax);
        bestSign = Math.sign(cross) * Math.sign(T[k].turn || 1);
      }
    }
    T[k].dev = Number.isFinite(best) ? best : 0;
    T[k].side = bestSign; // <0 inside the bend (corner-cutting), >0 outside
    T[k].devFrac = T[k].dev / (CW / T[k].ez); // as a fraction of the visible world width
  }

  // ── segment into bends and straights by curvature ──────────────────────────────────────────
  const CURV_BEND = 0.0004; // rad per world px; below this the course is effectively straight
  const segs = [];
  let cur = null;
  for (const r of T) {
    const isBend = Math.abs(r.curv) > CURV_BEND;
    const dir = isBend ? Math.sign(r.curv) : 0;
    if (!cur || cur.dir !== dir) {
      cur = { dir, rows: [] };
      segs.push(cur);
    }
    cur.rows.push(r);
  }
  const named = segs
    .filter((s) => s.rows.length >= 30)
    .map((s, n) => {
      const rows = s.rows;
      const len = rows.reduce(
        (acc, r, k) => acc + (k ? Math.hypot(r.tx - rows[k - 1].tx, r.ty - rows[k - 1].ty) : 0),
        0
      );
      const peak = rows.reduce((a, b) => (b.dev > a.dev ? b : a), rows[0]);
      const inside = rows.filter((r) => r.side < 0).length / rows.length;
      const dHeadRate = [];
      const tHeadRate = [];
      for (let k = 1; k < rows.length; k++) {
        const dt = (rows[k].ms - rows[k - 1].ms) / 1000;
        if (dt <= 0) continue;
        const dd = Math.abs(((rows[k].dHead - rows[k - 1].dHead + Math.PI) % (2 * Math.PI)) - Math.PI);
        const tt = Math.abs(((rows[k].tHead - rows[k - 1].tHead + Math.PI) % (2 * Math.PI)) - Math.PI);
        dHeadRate.push(dd / dt);
        tHeadRate.push(tt / dt);
      }
      return {
        n,
        kind: s.dir === 0 ? "straight" : s.dir > 0 ? "bend L" : "bend R",
        dir: s.dir,
        from: rows[0].p,
        to: rows[rows.length - 1].p,
        frames: rows.length,
        len,
        curv: rows.reduce((a, r) => a + Math.abs(r.curv), 0) / rows.length,
        maxDev: peak.dev,
        maxDevFrac: peak.devFrac,
        peakAt: (peak.p - rows[0].p) / Math.max(1e-9, rows[rows.length - 1].p - rows[0].p),
        peakP: peak.p,
        inside,
        medDev: q(rows.map((r) => r.dev), 0.5),
        dHead90: q(dHeadRate, 0.9),
        tHead90: q(tHeadRate, 0.9),
        st: peak.st,
      };
    });

  console.log(`\nTHE COURSE, IN RACE ORDER — every segment of 30+ frames`);
  console.log(
    `  ${"#".padStart(3)} ${"kind".padEnd(9)} ${"progress".padEnd(15)} ${"len px".padStart(8)} ${"curv".padStart(9)} ${"maxDev".padStart(8)} ${"of frame".padStart(9)} ${"peak@".padStart(6)} ${"inside".padStart(7)} ${"turn d/t".padStart(11)}`
  );
  for (const s of named)
    console.log(
      `  ${String(s.n).padStart(3)} ${s.kind.padEnd(9)} ${(s.from.toFixed(3) + "-" + s.to.toFixed(3)).padEnd(15)} ${s.len.toFixed(0).padStart(8)} ${s.curv.toFixed(6).padStart(9)} ${s.maxDev.toFixed(0).padStart(8)} ${(100 * s.maxDevFrac).toFixed(1).padStart(8)}% ${(100 * s.peakAt).toFixed(0).padStart(5)}% ${(100 * s.inside).toFixed(0).padStart(6)}% ${(s.dHead90.toFixed(2) + "/" + s.tHead90.toFixed(2)).padStart(11)}`
    );

  const bends = named.filter((s) => s.dir !== 0);
  const straights = named.filter((s) => s.dir === 0);
  console.log(`\nBENDS RANKED BY DEVIATION`);
  for (const s of [...bends].sort((a, b) => b.maxDev - a.maxDev))
    console.log(
      `  #${String(s.n).padStart(3)} ${s.kind}  p ${s.from.toFixed(3)}-${s.to.toFixed(3)}  maxDev ${s.maxDev.toFixed(0)} px = ${(100 * s.maxDevFrac).toFixed(1)}% of frame  inside ${(100 * s.inside).toFixed(0)}%  peak at ${(100 * s.peakAt).toFixed(0)}% through  [${s.st}]`
    );

  console.log(`\nTHE STRAIGHTS, AS THE CONTROL`);
  if (!straights.length) console.log("  none of 30+ frames");
  for (const s of straights)
    console.log(
      `  #${String(s.n).padStart(3)} p ${s.from.toFixed(3)}-${s.to.toFixed(3)}  maxDev ${s.maxDev.toFixed(0)} px = ${(100 * s.maxDevFrac).toFixed(1)}%  median ${s.medDev.toFixed(0)} px`
    );
  const bMax = bends.length ? Math.max(...bends.map((s) => s.maxDev)) : NaN;
  const sMax = straights.length ? Math.max(...straights.map((s) => s.maxDev)) : NaN;
  console.log(
    `  => worst bend ${bMax.toFixed(0)} px vs worst straight ${sMax.toFixed(0)} px  — ratio ${(bMax / sMax).toFixed(2)}x`
  );

  // ── THE FAST MOMENT, outside the endgame ───────────────────────────────────────────────────
  const travel = [];
  for (let k = 1; k < P.length; k++) {
    if (P[k].p >= ENDGAME_FROM) continue;
    const dpx = Math.hypot(P[k].dx - P[k - 1].dx, P[k].dy - P[k - 1].dy);
    travel.push({
      ...P[k],
      worldPerFrame: dpx,
      screenPerFrame: dpx * P[k].ez,
      stChanged: P[k].st !== P[k - 1].st,
      bChanged: P[k].b !== P[k - 1].b,
      zoomRate: Math.abs(Math.log(P[k].ez / P[k - 1].ez)),
    });
  }
  const fast = [...travel].sort((a, b) => b.screenPerFrame - a.screenPerFrame).slice(0, 12);
  console.log(`\nTHE FASTEST DELIVERED TRAVEL OUTSIDE THE ENDGAME (p < ${ENDGAME_FROM}), in SCREEN px/frame`);
  console.log(
    `  ${"ms".padStart(7)} ${"prog".padStart(7)} ${"screen".padStart(8)} ${"world".padStart(8)} ${"dLnZoom".padStart(8)}  state / binding / change`
  );
  for (const f of fast)
    console.log(
      `  ${String(f.ms).padStart(7)} ${f.p.toFixed(4).padStart(7)} ${f.screenPerFrame.toFixed(1).padStart(8)} ${f.worldPerFrame.toFixed(0).padStart(8)} ${f.zoomRate.toFixed(4).padStart(8)}  ${f.st}/${f.b}${f.stChanged ? "  <- STATE" : ""}${f.bChanged ? "  <- binding" : ""}`
    );
  const sp = travel.map((f) => f.screenPerFrame);
  console.log(
    `  distribution: p50 ${q(sp, 0.5).toFixed(1)}  p90 ${q(sp, 0.9).toFixed(1)}  p99 ${q(sp, 0.99).toFixed(1)}  max ${Math.max(...sp).toFixed(1)} screen px/frame`
  );

  // ── the deviation's own distribution, so a bend figure can be read against the race ────────
  const devs = T.map((r) => r.dev);
  const fr = T.map((r) => r.devFrac);
  console.log(`\nDEVIATION ACROSS THE WHOLE RACE`);
  console.log(
    `  world px : p50 ${q(devs, 0.5).toFixed(0)}  p90 ${q(devs, 0.9).toFixed(0)}  p99 ${q(devs, 0.99).toFixed(0)}  max ${Math.max(...devs).toFixed(0)}`
  );
  console.log(
    `  of frame : p50 ${(100 * q(fr, 0.5)).toFixed(1)}%  p90 ${(100 * q(fr, 0.9)).toFixed(1)}%  p99 ${(100 * q(fr, 0.99)).toFixed(1)}%  max ${(100 * Math.max(...fr)).toFixed(1)}%`
  );
}
