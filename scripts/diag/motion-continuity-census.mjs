// ============================================================
// File:        scripts/diag/motion-continuity-census.mjs
// Project:     RaceArena — JUDDER-TRUTH-1 (report-only, changes nothing)
//
// WHAT THIS OWNS: the two quantities MOTION-CONTINUITY-1 §1.3 names, measured over a WHOLE race from
// a `viewer-invariants --dump` file, beside the quantity the shipped gate actually grades.
//
// ── WHY IT EXISTS, AND WHY IT IS NOT A NEW IDEA ───────────────────────────────────────────────
//
// The definitions are taken from `reports/evolution/MOTION-CONTINUITY-1.md` §1.3 and are NOT
// re-derived here. That report settled, twice over, that Δoffset is the wrong quantity: the camera
// zooms about the world origin, so the offset must move when the zoom changes, and a large Δoffset
// beside a zoom change says nothing about apparent motion (§1.2).
//
// Nothing already in the tree answers this shape of question over a whole race from a dump:
//   · `judder-census.mjs`      computes the UNIFIED worst-on-canvas point, not the two channels,
//                              and prints only the MAX of the gate's own quantity, not its spread.
//   · `runin-camera-motion.mjs` computes the centre identically but reads a different file shape and
//                              scopes itself to the closing phase.
// So this reads the dump both of them cannot, and computes only what §1.3 defines.
//
// ── THE THREE COLUMNS ─────────────────────────────────────────────────────────────────────────
//
//   dOFF   `hypot(Δox, Δoy)` — THE QUANTITY THE SHIPPED GATE GRADES, against one canvas width.
//          Reported so the bar can be judged against what a real race actually produces.
//   PAN    the camera CENTRE's travel, as a fraction of the visible frame width — §1.3's perceptual
//          unit, because half a frame looks the same whether the frame is 400 or 4,000 world px.
//   ZOOM   `|Δ ln effZoomX|` — log space, because scale is perceived logarithmically.
//
// ★ PAN IS MEASURED ON THE X AXIS ALONE, AND THAT IS A LIMIT OF THE RECORD, NOT A CHOICE. The dump
//   publishes `ez` (`effZoomX`) and no `effZoomY` (`viewerProbe.js:532`), and the centre on Y needs
//   `zoom · axisY`. X is the axis the canvas is widest in and the one §1.3's `visW` normalises by.
//   Stated here rather than left for a reader to infer from a formula.
//
// ★ THE RULE IS LOCAL, so every frame also carries its ratio against the median of the 61-frame
//   window centred on it — a step is only remarkable beside the motion around it.
//
// MEASURE ONLY. Reads JSON, prints tables, exits 0. No bar, no verdict, no threshold.
// ============================================================
import { readFileSync } from "node:fs";

const ARG = (k, d) => {
  const a = process.argv.find((x) => x.startsWith(`--${k}=`));
  return a ? a.slice(k.length + 3) : d;
};
const JSON_IN = ARG("json", null);
if (!JSON_IN) throw new Error("motion-continuity-census: pass --json=<a viewer-invariants --dump file>");
const TOP = Number(ARG("top", 5));

// The gate's own bound, quoted from `viewer-invariants.mjs` rather than restated as a number of its
// own: one canvas width. CW is the fixed store the race is drawn into.
const CW = 1280;

const doc = JSON.parse(readFileSync(JSON_IN, "utf8"));
if (!doc.dumps?.length) throw new Error("motion-continuity-census: that file carries no dumps — run with --dump");

const sorted = (a) => [...a].sort((x, y) => x - y);
const pctl = (a, p) => (a.length ? sorted(a)[Math.min(a.length - 1, Math.floor(a.length * p))] : 0);
const med = (a) => pctl(a, 0.5);

for (const d of doc.dumps) {
  const F = d.frames;
  if (!F || F.length < 3) {
    console.log(`\n${d.track} seed ${d.seed}: ${F?.length ?? 0} frames — skipped`);
    continue;
  }

  const rows = [];
  for (let i = 1; i < F.length; i++) {
    const a = F[i - 1];
    const b = F[i];
    if (!(a.ez > 0) || !(b.ez > 0)) continue;
    // dOFF — exactly what the gate grades.
    const dOff = Math.hypot(b.ox - a.ox, b.oy - a.oy);
    // PAN — §1.3: centre in world px over the visible world width. Both are CW/ez, so the ratio is
    // scale-free and the CW cancels; it is written out rather than pre-cancelled so the formula can
    // be read against the report.
    const cA = (CW / 2 - a.ox) / a.ez;
    const cB = (CW / 2 - b.ox) / b.ez;
    const visW = CW / b.ez;
    rows.push({
      i: b.i,
      ms: b.ms,
      st: b.st,
      dOff,
      pan: Math.abs(cB - cA) / visW,
      zoom: Math.abs(Math.log(b.ez / a.ez)),
    });
  }

  // The LOCAL median each frame is judged against: a 61-frame window centred on it.
  const W = 30;
  for (let k = 0; k < rows.length; k++) {
    const lo = Math.max(0, k - W);
    const hi = Math.min(rows.length, k + W + 1);
    const win = rows.slice(lo, hi);
    const localPan = med(win.map((r) => r.pan));
    rows[k].xLocal = localPan > 0 ? rows[k].pan / localPan : 0;
    // The zoom channel needs its own local reference: its median is 0.00000 almost everywhere, so a
    // ratio against the median would divide by zero on most frames. The p75 of the window is the
    // lowest percentile that is reliably non-zero here; it is named rather than tuned, and it is a
    // REPORTING reference, not a bar.
    const localZoom = pctl(win.map((r) => r.zoom), 0.75);
    rows[k].zLocal = localZoom > 0 ? rows[k].zoom / localZoom : 0;
  }

  const dOffs = rows.map((r) => r.dOff);
  const pans = rows.map((r) => r.pan);
  const zooms = rows.map((r) => r.zoom);
  const maxOff = Math.max(...dOffs);

  console.log(`\n${"=".repeat(100)}`);
  console.log(`${d.track}  seed ${d.seed}  arm ${d.arm}  —  N = ${rows.length} frame steps`);
  console.log("=".repeat(100));
  console.log(`  dOFF  (the gate's quantity, px)  median ${med(dOffs).toFixed(1)}   p99 ${pctl(dOffs, 0.99).toFixed(1)}   max ${maxOff.toFixed(1)}`);
  console.log(`        ★ max is ${((100 * maxOff) / CW).toFixed(1)}% of the ${CW} px bar the gate grades against`);
  console.log(`  PAN   (frame widths, X axis)     median ${med(pans).toFixed(5)}   p99 ${pctl(pans, 0.99).toFixed(5)}   max ${Math.max(...pans).toFixed(5)}`);
  console.log(`  ZOOM  (|Δ ln|)                    median ${med(zooms).toFixed(5)}   p99 ${pctl(zooms, 0.99).toFixed(5)}   max ${Math.max(...zooms).toFixed(5)}`);

  console.log(`\n  THE ${TOP} WORST FRAMES BY PAN AGAINST THEIR OWN LOCAL MEDIAN`);
  console.log(`    frame      s   xLocal      pan     zoom   dOFF  state`);
  for (const r of [...rows].sort((x, y) => y.xLocal - x.xLocal).slice(0, TOP)) {
    console.log(
      `    ${String(r.i).padStart(5)}  ${(r.ms / 1000).toFixed(1).padStart(5)}  ` +
        `${r.xLocal.toFixed(1).padStart(6)}x  ${r.pan.toFixed(5)}  ${r.zoom.toFixed(5)}  ` +
        `${r.dOff.toFixed(0).padStart(5)}  ${r.st}`
    );
  }

  console.log(`\n  THE ${TOP} WORST FRAMES BY ZOOM STEP`);
  console.log(`    frame      s     zoom  zLocal    edgePx      pan   dOFF  state`);
  for (const r of [...rows].sort((x, y) => y.zoom - x.zoom).slice(0, TOP)) {
    // What the step DOES to the picture: a factor on the scale moves the frame own edge by
    // that fraction of half a canvas width. Printed so the log number needs no conversion.
    const edgePx = (Math.exp(r.zoom) - 1) * (CW / 2);
    console.log(
      `    ${String(r.i).padStart(5)}  ${(r.ms / 1000).toFixed(1).padStart(5)}  ` +
        `${r.zoom.toFixed(5)}  ${r.zLocal.toFixed(1).padStart(5)}x  ${edgePx.toFixed(0).padStart(5)} px  ` +
        `${r.pan.toFixed(5)}  ${r.dOff.toFixed(0).padStart(5)}  ${r.st}`
    );
  }
}
