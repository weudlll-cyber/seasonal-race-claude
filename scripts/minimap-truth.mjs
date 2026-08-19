// ============================================================
// File:        scripts/minimap-truth.mjs
// Project:     RaceArena — MINIMAP-ONE-SOURCE-1
//
// THE QUESTION: the minimap's band, its edges, its start/finish marks and its unraced tail are one
// ribbon. Are they DRAWN as one? Before MINIMAP-ONE-SOURCE-1 they were not — the band fill and both
// edge outlines walked `getEdgePoints(80)` BY INDEX, while the marks and the tail were built from
// `getPosition(t, +/-0.5)`. Two parameterisations of one ribbon leave a SLIVER between them.
//
// WHAT IT MEASURES, on every shipped track, by DRIVING THE REAL `renderMinimap` with a recording
// context and reading the paths it actually emitted — not by recomputing its arithmetic, which is
// the failure this repo has already paid for six times:
//
//   sliver     the widest gap, in panel px, between the unraced tail's boundary and the band edge
//              polyline it is supposed to lie on. Open tracks only — a closed loop has no tail.
//   seam       the distance, in panel px, between the tail's first cross-section and the finish
//              mark's bar. It is 0.000 by construction when both come from one source, and that is
//              the number that must not move.
//   marks      each mark bar's midpoint and drawn length, in panel px.
//   combined   on a closed track, the centre gap between the two bars of the ONE combined mark.
//
// Usage:  node scripts/minimap-truth.mjs [--json]
// ============================================================

import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { EditorShape } from "../client/src/modules/track-editor/EditorShape.js";
import { renderMinimap } from "../client/src/modules/camera/Minimap.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const JSON_OUT = process.argv.includes("--json");

// The race canvas is a FIXED 1280x720 store, so the minimap's panel is fixed too and every number
// below is in the panel pixels a viewer actually sees.
const CANVAS_W = 1280;
const CANVAS_H = 720;

// The finish the RACE hands the minimap: `st.finishT` is a 0..1 position on an open track and a LAP
// COUNT on a closed one. These are the two shipped shapes of that argument; the minimap normalises
// the second back to the gate at t 0 itself.
//
// The open finish is SWEPT rather than fixed at one value: the sliver's width depends on where the
// tail begins, so a single finish position measures one accident of sampling and not the defect.
// The worst over the sweep is what is reported.
const OPEN_FINISH_SWEEP = [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95];
const CLOSED_FINISH_LAPS = 3;

function loadTracks() {
  const dir = existsSync(join(ROOT, "server/data/tracks"))
    ? join(ROOT, "server/data/tracks")
    : join(ROOT, "server/seeds/tracks");
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")))
    .filter((j) => j.id)
    .sort((a, b) => a.id.localeCompare(b.id));
}

/** Records WHAT was drawn and in WHICH order — the same shape Minimap.test.js uses. */
function makeCtx() {
  const ctx = {
    ops: [],
    _path: [],
    save() {},
    restore() {},
    fillRect() {},
    strokeRect() {},
    beginPath() {
      ctx._path = [];
    },
    moveTo(x, y) {
      ctx._path.push({ x, y });
    },
    lineTo(x, y) {
      ctx._path.push({ x, y });
    },
    closePath() {},
    arc() {},
    fill() {
      ctx.ops.push({ op: "fill", fillStyle: ctx.fillStyle, path: ctx._path.slice() });
    },
    stroke() {
      ctx.ops.push({
        op: "stroke",
        strokeStyle: ctx.strokeStyle,
        lineWidth: ctx.lineWidth,
        path: ctx._path.slice(),
      });
    },
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
  };
  return ctx;
}

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/** Shortest distance from point `p` to the polyline `pts`, segment by segment. */
function distToPolyline(p, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    let t = len2 === 0 ? 0 : ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    const d = Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    if (d < best) best = d;
  }
  return best;
}

/** Area fills with a real outline: the band, and on an open track the unraced tail. */
const areaFills = (ctx) => ctx.ops.filter((o) => o.op === "fill" && o.path.length > 2);
/**
 * The mark BARS. A bar is not one stroke: `drawCheckerBar` emits one 2-point stroke per CELL, and
 * those cells are contiguous — each one starts where the last ended. So the bars are recovered by
 * CONTIGUITY, which is what makes this harness read the checker as the single bar it looks like
 * rather than as four marks. Grouping by colour would work too and would tie the measurement to the
 * palette, which is the one thing about these marks that is allowed to change.
 */
function markBars(ctx) {
  const segs = ctx.ops.filter((o) => o.op === "stroke" && o.path.length === 2);
  const bars = [];
  for (const s of segs) {
    const last = bars[bars.length - 1];
    if (last && dist(last.b, s.path[0]) < 1e-9) {
      last.b = s.path[1];
      last.segs++;
      continue;
    }
    bars.push({ a: s.path[0], b: s.path[1], segs: 1, lineWidth: s.lineWidth });
  }
  return bars;
}

/** The band's two edge outlines: the multi-point strokes. */
const edgeStrokes = (ctx) => ctx.ops.filter((o) => o.op === "stroke" && o.path.length > 2);

/**
 * Splits a band FILL path back into its two sides. The path is written outer-forward then
 * inner-backward, so the halves are equal and the second is reversed.
 */
function fillSides(path) {
  const half = path.length / 2;
  return { outer: path.slice(0, half), inner: path.slice(half).reverse() };
}

/** Splits a tail FILL path the same way: inner-forward then outer-backward. */
function tailSides(path) {
  const half = path.length / 2;
  return { inner: path.slice(0, half), outer: path.slice(half).reverse() };
}

/** One render, one set of numbers. */
function renderOnce(shape, finishT) {
  const ctx = makeCtx();
  const racers = [{ x: 0, y: 0, color: "#f00", index: 0 }];
  renderMinimap(ctx, shape, racers, 0, CANVAS_W, CANVAS_H, null, { startT: 0, finishT });

  const fills = areaFills(ctx);
  const band = fills[0] ?? null;
  const tail = fills[1] ?? null;
  const bars = markBars(ctx);
  const edges = edgeStrokes(ctx);

  const out = {
    finishT,
    bandPathPoints: band ? band.path.length : 0,
    edgeStrokes: edges.length,
    edgePathPoints: edges.map((e) => e.path.length),
    barCount: bars.length,
    tailPathPoints: tail ? tail.path.length : 0,
    bars: bars.map((b) => ({
      midX: (b.a.x + b.b.x) / 2,
      midY: (b.a.y + b.b.y) / 2,
      lenPx: dist(b.a, b.b),
      cells: b.segs,
      lineWidth: b.lineWidth,
    })),
  };

  // The sliver: how far the tail's boundary strays from the band edge polyline it lies on.
  if (tail && band) {
    const b = fillSides(band.path);
    const t = tailSides(tail.path);
    let worst = 0;
    for (const p of t.inner) worst = Math.max(worst, distToPolyline(p, b.inner));
    for (const p of t.outer) worst = Math.max(worst, distToPolyline(p, b.outer));
    out.sliverPx = worst;
  } else {
    out.sliverPx = null;
  }

  // The seam: the tail's first cross-section against the FINISH bar — the last bar drawn on both
  // topologies (open: start then finish; closed: the green plate then the checker). `bandBarAt`
  // writes its inner end first, and so does the tail.
  const finishBar = bars[bars.length - 1];
  if (tail && finishBar) {
    const t = tailSides(tail.path);
    out.seamPx = Math.max(dist(t.inner[0], finishBar.a), dist(t.outer[0], finishBar.b));
  } else {
    out.seamPx = null;
  }

  // The closed-track combined mark: the green plate's centre against the checker's.
  out.combinedGapPx =
    out.bars.length >= 2
      ? Math.hypot(out.bars[0].midX - out.bars[1].midX, out.bars[0].midY - out.bars[1].midY)
      : null;

  // The OTHER sliver, and the one every track has: how far a mark's ENDS land from the band edge
  // they are supposed to span. The green PLATE of the closed-track combined mark is excluded,
  // because `grownBar` pushes its ends out on purpose — and it is identified STRUCTURALLY, as the
  // first of two bars sharing a centre, rather than by its colour or its thickness. Both of those
  // are things about the mark that a later change is allowed to move.
  const isPlate = (i) => i === 0 && bars.length === 2 && out.combinedGapPx < 1e-9;
  if (band) {
    const b = fillSides(band.path);
    let worst = 0;
    bars.forEach((bar, i) => {
      if (isPlate(i)) return;
      worst = Math.max(worst, distToPolyline(bar.a, b.inner), distToPolyline(bar.b, b.outer));
    });
    out.markGapPx = worst;
  } else {
    out.markGapPx = null;
  }

  // The raw geometry, so a later run can say what MOVED rather than only what it is now.
  out.geometry = {
    band: band ? band.path : null,
    edges: edges.map((e) => e.path),
    tail: tail ? tail.path : null,
    barEnds: bars.map((b) => [b.a, b.b]),
  };

  return out;
}

function measure(geo) {
  const shape = new EditorShape(geo);
  const isOpen = shape.isOpen;
  const runs = isOpen
    ? OPEN_FINISH_SWEEP.map((f) => renderOnce(shape, f))
    : [renderOnce(shape, CLOSED_FINISH_LAPS)];

  const worstBy = (key) => {
    let best = null;
    for (const r of runs) if (r[key] != null && (best === null || r[key] > best[key])) best = r;
    return best;
  };

  return {
    track: geo.id,
    isOpen,
    runs,
    worstSliver: worstBy("sliverPx"),
    worstSeam: worstBy("seamPx"),
    worstMarkGap: worstBy("markGapPx"),
    // The marks and the structure are reported from ONE representative render so the numbers are
    // comparable across a change: the last of the sweep on an open track, the only one on a closed.
    ref: runs[runs.length - 1],
  };
}

const rows = loadTracks().map(measure);

// ── What MOVED ───────────────────────────────────────────────────────────────────────────────────
// `--baseline <file.json>` reads an earlier `--json` run and reports, per track, the furthest any
// drawn vertex travelled. That is the difference between "the sliver is 0.000 now" and "the sliver
// is 0.000 now AND here is everything else that shifted to make it so" — the second is the only one
// that can catch a simplification quietly redrawing the picture.
const baselineArg = process.argv.indexOf("--baseline");
if (baselineArg !== -1) {
  const prev = JSON.parse(readFileSync(process.argv[baselineArg + 1], "utf8"));
  const byTrack = new Map(prev.map((r) => [r.track, r]));
  // TWO QUESTIONS, AND THEY HAVE DIFFERENT ANSWERS. `vertex` compares point i to point i, so it
  // reports a re-PARAMETERISATION — the vertices sliding ALONG the same curve — as movement.
  // `outline` is the symmetric point-to-polyline distance: how far the drawn SHAPE moved, which is
  // the only one of the two a viewer can see. Reporting only the first would call a change
  // enormous; reporting only the second would hide that the sampling changed at all.
  const maxShift = (a, b) => {
    if (!a || !b) return a === b ? 0 : NaN;
    if (a.length !== b.length) return NaN;
    let w = 0;
    for (let i = 0; i < a.length; i++) w = Math.max(w, dist(a[i], b[i]));
    return w;
  };
  const outlineShift = (a, b) => {
    if (!a || !b) return a === b ? 0 : NaN;
    let w = 0;
    for (const p of b) w = Math.max(w, distToPolyline(p, a));
    for (const p of a) w = Math.max(w, distToPolyline(p, b));
    return w;
  };
  console.log("MINIMAP-TRUTH — what moved, in panel px");
  console.log("  vertex  = point i against point i: catches a re-parameterisation as well as a move");
  console.log("  outline = symmetric point-to-polyline: how far the drawn SHAPE moved");
  console.log("");
  console.log("                 band            edges            tail           marks");
  console.log("track          vertex  outline  vertex  outline  vertex  outline  vertex  outline");
  for (const r of rows) {
    const p = byTrack.get(r.track);
    if (!p) continue;
    const acc = { band: [0, 0], edges: [0, 0], tail: [0, 0], marks: [0, 0] };
    const bump = (key, a, b) => {
      acc[key][0] = Math.max(acc[key][0], maxShift(a, b));
      acc[key][1] = Math.max(acc[key][1], outlineShift(a, b));
    };
    for (let i = 0; i < r.runs.length; i++) {
      const A = p.runs[i].geometry;
      const B = r.runs[i].geometry;
      bump("band", A.band, B.band);
      for (let e = 0; e < B.edges.length; e++) bump("edges", A.edges[e], B.edges[e]);
      bump("tail", A.tail, B.tail);
      for (let m = 0; m < B.barEnds.length; m++) bump("marks", A.barEnds[m], B.barEnds[m]);
    }
    const g = (v) => (Number.isNaN(v) ? "n/a" : v.toFixed(3)).padStart(8);
    console.log(
      `${r.track.padEnd(15)}${g(acc.band[0])}${g(acc.band[1])}${g(acc.edges[0])}${g(acc.edges[1])}${g(acc.tail[0])}${g(acc.tail[1])}${g(acc.marks[0])}${g(acc.marks[1])}`,
    );
  }
  process.exit(0);
}

if (JSON_OUT) {
  console.log(JSON.stringify(rows, null, 2));
} else {
  const f = (v, d = 3) => (v == null ? "—" : v.toFixed(d));
  console.log("MINIMAP-TRUTH — one ribbon, drawn how many ways?");
  console.log("");
  console.log(
    "track             open  bandPts  edges  bars  tailPts     sliverPx    markGapPx      seamPx  combinedGap",
  );
  for (const r of rows) {
    console.log(
      [
        r.track.padEnd(17),
        (r.isOpen ? "yes" : "no").padEnd(6),
        String(r.ref.bandPathPoints).padStart(7),
        String(r.ref.edgeStrokes).padStart(7),
        String(r.ref.barCount).padStart(6),
        String(r.ref.tailPathPoints).padStart(9),
        f(r.worstSliver?.sliverPx).padStart(13),
        f(r.worstMarkGap?.markGapPx).padStart(13),
        f(r.worstSeam?.seamPx).padStart(12),
        f(r.ref.combinedGapPx).padStart(13),
      ].join(""),
    );
  }
  console.log("");
  console.log("MARK BARS at the reference finish (panel px)");
  for (const r of rows) {
    const m = r.ref.bars
      .map(
        (k, i) =>
          `#${i} mid=(${k.midX.toFixed(3)}, ${k.midY.toFixed(3)}) len=${k.lenPx.toFixed(3)} cells=${k.cells} lw=${k.lineWidth}`,
      )
      .join("   ");
    console.log(`  ${r.track.padEnd(17)}finishT=${r.ref.finishT}  ${m}`);
  }
  const slivers = rows.filter((r) => r.worstSliver).map((r) => r.worstSliver.sliverPx);
  const seams = rows.filter((r) => r.worstSeam).map((r) => r.worstSeam.seamPx);
  const gaps = rows.filter((r) => r.worstMarkGap).map((r) => r.worstMarkGap.markGapPx);
  console.log("");
  console.log(
    `WORST sliver ${Math.max(...slivers).toFixed(3)} px    WORST markGap ${Math.max(...gaps).toFixed(3)} px    WORST seam ${Math.max(...seams).toFixed(3)} px`,
  );
}
