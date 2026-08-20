// ============================================================
// File:        scripts/diag/endgame-strobe.mjs
// Project:     RaceArena — ENDGAME-REPAIR-1 (report-only, changes nothing)
//
// THE QUESTION: the full-window per-frame table shows single-frame zoom steps of 0.7-2.5 ln at
// ~94% of the race on seven of nine tracks — the picture changing width by up to 12x between two
// frames. WHAT is alternating, and at what period?
//
// IT MEASURES THE LIVE DIRECTOR AND TOUCHES NO CAMERA CODE. `_lineCeiling` is wrapped so its
// return can be recorded beside the delivered width; the wrapper calls through and returns the
// director's own value unchanged.
//
// Usage:
//   node scripts/diag/endgame-strobe.mjs --tracks=ice-track --arm=shipped
//   node scripts/diag/endgame-strobe.mjs                     # every track, both arms, summary only
// ============================================================

import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { resolveIdentity, buildRace, runRace, TRACK_DEFAULT_RACER } from "../lib/raceDriver.mjs";
import { makeConfig, tracksAndSizes } from "./endgame-spec.mjs";

const ROOT = join(import.meta.dirname, "..", "..");
const u = (p) => pathToFileURL(join(ROOT, p)).href;
const { effectiveZoom } = await import(u("client/src/modules/camera/openTrackCamera.js"));
const { OPEN_TRACK_BASE_ZOOM } = await import(u("client/src/modules/camera/projection.js"));
const { resolveNameSet, DEFAULT_NAME_SET } = await import(u("client/src/modules/racerNames.js"));

const CW = 1280;
const CH = 720;
const SEED = 9;
const ARM = (process.argv.find((a) => a.startsWith("--arm=")) ?? "--arm=his").slice(6);
const TRACK_ARG = (process.argv.find((a) => a.startsWith("--tracks=")) ?? "").slice(9);
const TRACE = process.argv.includes("--trace");

function measure(geo, cfg, N) {
  const identity = resolveIdentity({
    racers: N, raceSeed: SEED, racerType: TRACK_DEFAULT_RACER,
    roster: resolveNameSet(DEFAULT_NAME_SET), canvasW: CW, canvasH: CH, note: "ENDGAME-REPAIR-1",
  });
  const race = buildRace(geo, identity, cfg);
  const { shape, st, cd, trackWidthPx } = race;
  const bsX = CW / (geo.worldWidth || CW);
  const effOf = (z) => (shape.isOpen ? effectiveZoom(z, OPEN_TRACK_BASE_ZOOM) : z * bsX);

  // The wrapper: record what the line ceiling answered, return it untouched.
  let lastLine = Infinity;
  const orig = cd._lineCeiling.bind(cd);
  cd._lineCeiling = (...a) => {
    const v = orig(...a);
    if (a.length >= 5) lastLine = v; // only the schedule's own call passes an override slot
    return v;
  };

  const f = [];
  let crossed = false;
  runRace(race, identity, cfg, () => {
    if (st.finishedCount > 0) crossed = true;
    if (crossed) return;
    let maxT = 0;
    for (const r of st.racers) if (r.t > maxT) maxT = r.t;
    const p = st.finishT > 0 ? maxT / st.finishT : 0;
    if (p < 0.9) return;
    const eff = effOf(cd.zoom);
    if (!(eff > 0)) return;
    f.push({
      p,
      w: CW / eff,
      demandFinite: Number.isFinite(lastLine),
      inert: !!cd._runInWidenInert,
      eng: !!cd._runInEngaged,
      afterDL: !!cd._runInAfterDeadline,
      u: cd._runInWidenU ?? 0,
    });
    lastLine = Infinity;
  });
  if (!f.length) return null;

  // A STROBE is a run of frames whose width alternates direction every frame by a PERCEPTIBLE
  // amount. One screen pixel at the frame edge is |d ln w| >= 1/640, the project's own figure.
  const PERC = 2 / CW;
  let strobe = 0;
  let longest = 0;
  let run = 0;
  let worst = 0;
  let worstAt = NaN;
  for (let i = 2; i < f.length; i++) {
    const a = Math.log(f[i - 1].w) - Math.log(f[i - 2].w);
    const b = Math.log(f[i].w) - Math.log(f[i - 1].w);
    const alt = Math.abs(a) > PERC && Math.abs(b) > PERC && a * b < 0;
    if (alt) {
      strobe++;
      run++;
      if (Math.abs(b) > worst) {
        worst = Math.abs(b);
        worstAt = f[i].p;
      }
    } else run = 0;
    if (run > longest) longest = run;
  }
  const flick = (() => {
    let n = 0;
    for (let i = 1; i < f.length; i++) if (f[i].demandFinite !== f[i - 1].demandFinite) n++;
    return n;
  })();
  if (TRACE) {
    console.log(`\nTRACE ${geo.id} arm=${ARM}   p      width  corr   demand  inert  u`);
    for (const x of f) {
      if (x.p < 0.93 || x.p > 0.955) continue;
      console.log(
        `  ${x.p.toFixed(4)} ${Math.round(x.w).toString().padStart(7)} ${(x.w / trackWidthPx).toFixed(2).padStart(6)}   ` +
          `${x.demandFinite ? "finite" : "INF   "}  ${x.inert ? "INERT" : "  -  "}  ${x.u.toFixed(3)}` +
          `${x.afterDL ? "  close" : ""}`
      );
    }
  }
  return {
    track: geo.id, n: N, frames: f.length,
    strobeFrames: strobe, strobeLongest: longest,
    strobeWorstLn: worst, strobeWorstAt: worstAt,
    demandFlips: flick,
    widestCorr: Math.max(...f.map((x) => x.w)) / trackWidthPx,
  };
}

const only = TRACK_ARG ? TRACK_ARG.split(",") : null;
const cfg = makeConfig(ARM);
console.log(`ENDGAME STROBE — arm ${ARM}, seed ${SEED}, window [0.90, crossing]`);
console.log("track              n  frames  strobe%  longest   worstLn  @prog   demandFlips  widest");
for (const { geo, n } of tracksAndSizes(only)) {
  const r = measure(geo, cfg, n);
  if (!r) { console.log(`${geo.id.padEnd(16)} — no window frames`); continue; }
  console.log(
    [
      r.track.padEnd(16),
      String(r.n).padStart(4),
      String(r.frames).padStart(7),
      ((100 * r.strobeFrames) / r.frames).toFixed(0).padStart(8),
      String(r.strobeLongest).padStart(8),
      r.strobeWorstLn.toFixed(4).padStart(10),
      (Number.isFinite(r.strobeWorstAt) ? r.strobeWorstAt.toFixed(3) : "  -  ").padStart(7),
      String(r.demandFlips).padStart(13),
      r.widestCorr.toFixed(1).padStart(8),
    ].join("")
  );
}
