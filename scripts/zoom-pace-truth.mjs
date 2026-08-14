// ============================================================
// File:        scripts/zoom-pace-truth.mjs
// Project:     RaceArena — ZOOM-PACE-1 (DIAGNOSIS ONLY)
//
// THE OWNER, on ice-track seed 9: the zoom goes in slowly, then stands still for a moment, then
// travels very fast. HOW FAR it zooms is right — the varying SPEED is what he objects to. The same
// happens on river-run seed 2814 but is hard to see there because the shot barely closes in at all.
//
// ── WHAT THIS MEASURES, and it changes nothing ─────────────────────────────────────────────────
//
// Frame by frame across the endgame: the delivered zoom, the target it is chasing, the RATE of
// change, and WHICH CEILING IS BINDING. The director already records all of it on `_framingProbe`
// (`ceilings`, `binding`, `guaranteed`, `stateZoom`), so this reads rather than instruments.
//
// THE HYPOTHESIS UNDER TEST, to confirm or refute:
//   (a) THE ARGMIN CORNER. `guaranteed` is a Math.min over ceilings. Where the binding TERM changes,
//       the zoom stays continuous but its RATE jumps — a corner, not a step.
//   (b) THE SET COLLAPSE. The contender set is captured once; as they converge on the line its
//       extent shrinks, its ceiling releases toward Infinity, and the state's own zoom takes over.
//
// They need different repairs, so the report has to say which dominates rather than that both exist.
//
// Usage:
//   node scripts/zoom-pace-truth.mjs --only=ice-track --seeds=9 --arm=on
//   node scripts/zoom-pace-truth.mjs --only=ice-track --seeds=9 --arm=on --frames
// ============================================================

import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  resolveIdentity,
  formatIdentity,
  loadTracks,
  buildRace,
  runRace,
  TRACK_DEFAULT_RACER,
} from "./lib/raceDriver.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;

const { DEFAULT_CAMERA_CONFIG } = await import(
  u("client/src/modules/storage/defaults.js")
);
const { resolveNameSet, DEFAULT_NAME_SET } = await import(
  u("client/src/modules/racerNames.js")
);

const argOf = (n, d) => {
  const hit = process.argv.find((a) => a.startsWith(`--${n}=`));
  return hit ? hit.slice(n.length + 3) : d;
};
const ONLY = argOf("only", null);
const FRAMES = process.argv.includes("--frames");
const SEEDS = argOf("seeds", "9")
  .split(",")
  .map((s) => Number(s.trim()))
  .filter(Number.isFinite);

// `on` is this branch's default; `off` reaches the pre-block composition, which on the OFF arm is
// byte-identical to master — so two arms cover all three questions.
const ARMS = { on: { contenderZoom: true }, off: { contenderZoom: false } };
const ARM = argOf("arm", "on");
const CFG = { ...DEFAULT_CAMERA_CONFIG, ...(ARMS[ARM] ?? {}) };
const ROSTER = resolveNameSet(DEFAULT_NAME_SET);
const N = 20;

const med = (a) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
};

for (const geo of loadTracks({ only: ONLY })) {
  for (const raceSeed of SEEDS) {
    const identity = resolveIdentity({
      racers: N,
      raceSeed,
      racerType: TRACK_DEFAULT_RACER,
      roster: ROSTER,
      note: "ZOOM-PACE-1 diagnosis",
    });
    const race = buildRace(geo, identity, CFG);
    const { cd } = race;
    const trace = [];
    let prevZoom = null;
    let prevTs = null;

    runRace(
      race,
      identity,
      CFG,
      ({ cd: d, st: s, ts }) => {
        const fp = d._framingProbe;
        if (!fp) return;
        let maxT = 0;
        for (const r of s.racers) if (r.t > maxT) maxT = r.t;
        const prog = s.finishT > 0 ? maxT / s.finishT : 0;
        if (prog <= CFG.endgameThreshold) {
          prevZoom = d.zoom;
          prevTs = ts;
          return;
        }
        // RATE in zoom units per second — the quantity his eye is reading.
        const dt = prevTs === null ? 0 : (ts - prevTs) / 1000;
        const rate = dt > 0 && prevZoom !== null ? (d.zoom - prevZoom) / dt : 0;
        // The contender set's own extent, the (b) hypothesis: the widest separation in the pinned
        // set, which is exactly what `contenderGuarantee` sizes on.
        const pair = (fp.pair ?? []).filter(Boolean);
        let extent = 0;
        for (let i = 0; i < pair.length; i++)
          for (let j = i + 1; j < pair.length; j++)
            extent = Math.max(extent, Math.hypot(pair[i].x - pair[j].x, pair[i].y - pair[j].y));
        trace.push({
          ts,
          prog,
          hud: d.hudState,
          zoom: d.zoom,
          target: d.targetZoom,
          rate,
          binding: fp.binding,
          guarantee: fp.ceilings?.guarantee ?? Infinity,
          state: fp.stateZoom,
          nPair: pair.length,
          extent,
          finished: s.finishedCount,
        });
        prevZoom = d.zoom;
        prevTs = ts;
      },
      { slowmo: true },
    );

    if (!trace.length) {
      console.log(`\n${geo.id} seed ${raceSeed} (${ARM}): no endgame frames`);
      continue;
    }

    // ── THE PHASES, SEGMENTED BY WHAT IS BINDING ────────────────────────────────────────────────
    // A run of frames with the same binding term is one phase. That is the segmentation the argmin
    // hypothesis predicts, so using it makes the hypothesis falsifiable: if the rate does NOT change
    // at these boundaries, (a) is refuted.
    const phases = [];
    for (const f of trace) {
      const last = phases[phases.length - 1];
      if (last && last.binding === f.binding) last.rows.push(f);
      else phases.push({ binding: f.binding, rows: [f] });
    }

    console.log(
      `\n${"=".repeat(96)}\n${geo.id} seed ${raceSeed}  ARM=${ARM}  ` +
        `— ${trace.length} endgame frames, zoom ${trace[0].zoom.toFixed(2)} → ${trace[trace.length - 1].zoom.toFixed(2)}`,
    );
    console.log(
      "phase  binding      frames    ms      zoom span        median rate   |rate| max   set  extent",
    );
    for (const [i, p] of phases.entries()) {
      const rows = p.rows;
      const rates = rows.map((r) => r.rate);
      const ms = rows[rows.length - 1].ts - rows[0].ts;
      console.log(
        `${String(i).padStart(4)}   ${p.binding.padEnd(11)} ${String(rows.length).padStart(6)} ` +
          `${String(Math.round(ms)).padStart(6)}   ` +
          `${rows[0].zoom.toFixed(2)} → ${rows[rows.length - 1].zoom.toFixed(2)}   ` +
          `${med(rates).toFixed(3).padStart(11)}   ` +
          `${Math.max(...rates.map(Math.abs)).toFixed(3).padStart(9)}   ` +
          `${String(med(rows.map((r) => r.nPair))).padStart(3)}  ` +
          `${med(rows.map((r) => r.extent)).toFixed(0).padStart(6)}`,
      );
    }

    // ── THE THREE PHASES HE DESCRIBES, found by RATE rather than by binding term ────────────────
    // Segmenting by rate independently of the binding term is what lets the two be compared: if the
    // rate boundaries land on the binding boundaries, (a) explains it.
    const absRates = trace.map((r) => Math.abs(r.rate));
    const hi = med(absRates.filter((r) => r > 0)) * 2.5;
    const lo = med(absRates.filter((r) => r > 0)) * 0.25;
    const band = (r) => (Math.abs(r) >= hi ? "RUSH" : Math.abs(r) <= lo ? "STALL" : "steady");
    const bands = [];
    for (const f of trace) {
      const last = bands[bands.length - 1];
      const b = band(f.rate);
      if (last && last.b === b) last.rows.push(f);
      else bands.push({ b, rows: [f] });
    }
    const notable = bands.filter((x) => x.rows.length >= 4);
    console.log(
      `\nBY RATE (stall ≤ ${lo.toFixed(3)}, rush ≥ ${hi.toFixed(3)} zoom/s), runs of ≥4 frames:`,
    );
    for (const x of notable) {
      const r0 = x.rows[0];
      const r1 = x.rows[x.rows.length - 1];
      const terms = [...new Set(x.rows.map((r) => r.binding))].join("+");
      console.log(
        `  ${x.b.padEnd(7)} ${String(x.rows.length).padStart(4)} frames  ` +
          `${String(Math.round(r1.ts - r0.ts)).padStart(5)} ms  ` +
          `zoom ${r0.zoom.toFixed(2)} → ${r1.zoom.toFixed(2)}  ` +
          `median rate ${med(x.rows.map((r) => r.rate)).toFixed(3).padStart(8)}  binding: ${terms}`,
      );
    }

    // ── HOW MUCH IS THE CORNER, HOW MUCH IS THE COLLAPSE ────────────────────────────────────────
    const switches = phases.length - 1;
    const pfRows = trace.filter((r) => r.hud === "PHOTO_FINISH");
    const extent0 = pfRows.length ? pfRows[0].extent : NaN;
    const extentEnd = pfRows.length ? pfRows[pfRows.length - 1].extent : NaN;
    const relFrames = pfRows.filter((r) => !Number.isFinite(r.guarantee)).length;
    console.log(
      `\nARGMIN CORNERS: the binding term changes ${switches} time(s) in the endgame — ` +
        phases.map((p) => p.binding).join(" → "),
    );
    console.log(
      `SET COLLAPSE: the pinned set's extent goes ${extent0.toFixed(0)} → ${extentEnd.toFixed(0)} world px ` +
        `across the photo finish (${pfRows.length} frames); its ceiling is Infinity on ${relFrames} of them.`,
    );
    if (FRAMES) {
      console.log(
        "\n   ms   prog   hud            zoom   target    rate   binding      guar     state  set  extent  fin",
      );
      for (const f of trace)
        console.log(
          `${String(Math.round(f.ts)).padStart(7)} ${f.prog.toFixed(3)} ${f.hud.padEnd(14)} ` +
            `${f.zoom.toFixed(2).padStart(6)} ${f.target.toFixed(2).padStart(7)} ` +
            `${f.rate.toFixed(3).padStart(7)}  ${f.binding.padEnd(11)} ` +
            `${(Number.isFinite(f.guarantee) ? f.guarantee.toFixed(2) : "inf").padStart(7)} ` +
            `${f.state.toFixed(2).padStart(6)} ${String(f.nPair).padStart(4)} ` +
            `${f.extent.toFixed(0).padStart(6)} ${String(f.finished).padStart(4)}`,
        );
    }
    if (geo.id === (ONLY ?? geo.id)) console.log(`\n${formatIdentity(identity)}`);
  }
}
